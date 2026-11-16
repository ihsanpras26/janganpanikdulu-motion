import subprocess
import wave
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
vo_mp3 = ROOT / "vo_ep04.mp3"
vo_outro_mp3 = ROOT / "ElevenLabs_2026-11-13T12_51_02_Senandika - Young, Confident and Clear_pvc_s30_sim75_v4.mp3"
vo_wav = ROOT / "temp_vo_ep04_48k.wav"
vo_outro_wav = ROOT / "temp_vo_outro_ep04_48k.wav"
out_wav = ROOT / "audio_ep04_master.wav"
out_mp3 = ROOT / "audio_ep04_master.mp3"
puck_dir = ROOT / "sfx_puckermane"

SR = 48000
rng = np.random.default_rng(404)


def decode_wav_48k_stereo(src_path, tmp_path):
    subprocess.run([
        "ffmpeg", "-y", "-i", str(src_path),
        "-ar", str(SR), "-ac", "2", "-c:a", "pcm_s16le", str(tmp_path)
    ], check=True, stderr=subprocess.DEVNULL)
    with wave.open(str(tmp_path), "rb") as wf:
        raw = wf.readframes(wf.getnframes())
        audio = np.frombuffer(raw, dtype=np.int16).astype(np.float32).reshape(-1, 2) / 32768.0
    tmp_path.unlink(missing_ok=True)
    return audio


def smooth_fades(x, fade_in_ms=6.0, fade_out_ms=25.0):
    """Apply raised-cosine fade-in and fade-out to eliminate edge clicks."""
    out = x.copy()
    n = len(out)
    if n < 4:
        return out
    fi = min(n // 3, max(1, int(fade_in_ms * 0.001 * SR)))
    fo = min(n // 2, max(1, int(fade_out_ms * 0.001 * SR)))
    in_env = 0.5 * (1.0 - np.cos(np.linspace(0.0, np.pi, fi, dtype=np.float32)))
    out_env = 0.5 * (1.0 + np.cos(np.linspace(0.0, np.pi, fo, dtype=np.float32)))
    if out.ndim == 2:
        out[:fi] *= in_env[:, None]
        out[-fo:] *= out_env[:, None]
    else:
        out[:fi] *= in_env
        out[-fo:] *= out_env
    return out


def fft_eq(x, hp_hz=None, lp_hz=None, hp_order=4, lp_order=4,
           bell_hz=None, bell_db=0.0, bell_q=1.2):
    """Zero-phase smooth Butterworth-magnitude EQ & optional peaking filter via padded RFFT."""
    n = len(x)
    if n < 8:
        return x.astype(np.float32)
    pad = min(SR, max(2048, n // 2))
    n_fft = 1 << int(np.ceil(np.log2(n + pad)))
    freqs = np.fft.rfftfreq(n_fft, 1.0 / SR)
    freqs_safe = np.maximum(freqs, 1.0)

    mag = np.ones_like(freqs, dtype=np.float32)
    if hp_hz is not None and hp_hz > 0:
        mag *= 1.0 / np.sqrt(1.0 + (hp_hz / freqs_safe) ** (2 * hp_order))
        mag[0] = 0.0
    if lp_hz is not None and lp_hz > 0:
        mag *= 1.0 / np.sqrt(1.0 + (freqs_safe / lp_hz) ** (2 * lp_order))
    if bell_hz is not None and abs(bell_db) > 0.01:
        bw = bell_hz / max(0.3, bell_q)
        shape = np.exp(-0.5 * ((freqs_safe - bell_hz) / (0.5 * bw)) ** 2)
        mag *= 10.0 ** ((bell_db * shape) / 20.0)

    if x.ndim == 2:
        out = np.empty_like(x, dtype=np.float32)
        for ch in range(x.shape[1]):
            spec = np.fft.rfft(x[:, ch], n=n_fft)
            out[:, ch] = np.fft.irfft(spec * mag, n=n_fft)[:n]
        return out
    spec = np.fft.rfft(x, n=n_fft)
    return np.fft.irfft(spec * mag, n=n_fft)[:n].astype(np.float32)


def pink_noise(n, seed_rng=None):
    """Generate smooth 1/f pink noise via spectral shaping."""
    r = seed_rng or rng
    white = r.standard_normal(n).astype(np.float32)
    n_fft = 1 << int(np.ceil(np.log2(n)))
    freqs = np.fft.rfftfreq(n_fft, 1.0 / SR)
    scale = 1.0 / np.sqrt(np.maximum(freqs, 25.0))
    scale[0] = 0.0
    spec = np.fft.rfft(white, n=n_fft) * scale
    pink = np.fft.irfft(spec, n=n_fft)[:n]
    pk = np.max(np.abs(pink)) + 1e-6
    return (pink / pk).astype(np.float32)


def moving_rms(x, ms=30.0):
    """Smooth zero-phase Hann-windowed envelope follower."""
    w = max(16, int(ms * 0.001 * SR))
    if w % 2 == 0:
        w += 1
    win = np.hanning(w).astype(np.float32)
    win /= np.sum(win)
    return np.convolve(np.abs(x), win, mode="same").astype(np.float32)


def make_stereo_bed(sig, width=0.35, low_mono_hz=180.0):
    """Create natural decorrelated stereo width while keeping sub/lows mono-compatible."""
    n = len(sig)
    low = fft_eq(sig, lp_hz=low_mono_hz, lp_order=3)
    side_src = pink_noise(n)
    side_src = fft_eq(side_src, hp_hz=low_mono_hz, lp_hz=3200.0, hp_order=3, lp_order=3)
    high = sig - low
    env = moving_rms(np.abs(high), ms=80.0)
    side = side_src * (env / (np.sqrt(np.mean(side_src ** 2)) + 1e-6)) * width
    l = low + high + side
    r = low + high - side
    return np.stack([l, r], axis=1).astype(np.float32)


def norm_peak(x, target=0.95):
    pk = np.max(np.abs(x)) + 1e-6
    return (x * (target / pk)).astype(np.float32)


def load_wav_mono_48k(path, max_dur=None, fade_in_ms=5.0, fade_out_ms=35.0, lp_hz=9200.0):
    tmp = ROOT / f"temp_{path.stem}_ep04_48k.wav"
    subprocess.run([
        "ffmpeg", "-y", "-i", str(path),
        "-ar", str(SR), "-ac", "1", "-c:a", "pcm_s16le", str(tmp)
    ], check=True, stderr=subprocess.DEVNULL)
    with wave.open(str(tmp), "rb") as wf:
        x = np.frombuffer(wf.readframes(wf.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0
    tmp.unlink(missing_ok=True)
    if max_dur is not None:
        m = min(len(x), int(max_dur * SR))
        x = x[:m].copy()
    x = fft_eq(x, hp_hz=45.0, lp_hz=lp_hz, hp_order=2, lp_order=3)
    x = smooth_fades(x, fade_in_ms=fade_in_ms, fade_out_ms=fade_out_ms)
    return norm_peak(x, 1.0)


def add_stereo(buf, start_sec, sig, gain_db=-19.0, pan=0.0):
    """Mix mono or stereo SFX into buf using smooth equal-power panning."""
    idx0 = int(round(start_sec * SR))
    if idx0 >= len(buf) or idx0 < 0:
        return
    n = min(len(sig), len(buf) - idx0)
    if n <= 0:
        return
    amp = 10.0 ** (gain_db / 20.0)
    pan_clamped = float(np.clip(pan, -1.0, 1.0))
    theta = (pan_clamped + 1.0) * (np.pi / 4.0)
    gl = amp * np.cos(theta) * np.sqrt(2.0) * 0.70710678
    gr = amp * np.sin(theta) * np.sqrt(2.0) * 0.70710678
    if sig.ndim == 2:
        buf[idx0:idx0 + n, 0] += sig[:n, 0] * gl
        buf[idx0:idx0 + n, 1] += sig[:n, 1] * gr
    else:
        buf[idx0:idx0 + n, 0] += sig[:n] * gl
        buf[idx0:idx0 + n, 1] += sig[:n] * gr


# ==============================================================================
# 1. VOICEOVER ASSEMBLY & SEAMLESS LEVEL MATCHING
# ==============================================================================
vo_main = decode_wav_48k_stereo(vo_mp3, vo_wav)
vo_main = smooth_fades(vo_main, fade_in_ms=6.0, fade_out_ms=12.0)

outro_start_sec = len(vo_main) / SR
target_total_sec = round(outro_start_sec + 4.19, 2)  # 77.322 + 4.19 = 81.51s
target_total_samples = int(round(target_total_sec * SR))

if vo_outro_mp3.exists():
    vo_o = decode_wav_48k_stereo(vo_outro_mp3, vo_outro_wav)
    vo_o = smooth_fades(vo_o, fade_in_ms=8.0, fade_out_ms=18.0)

    main_active = np.abs(vo_main[:, 0])
    main_rms = float(np.sqrt(np.mean(main_active[main_active > 0.02] ** 2))) if np.any(main_active > 0.02) else 0.1
    o_active = np.abs(vo_o[:, 0])
    o_rms = float(np.sqrt(np.mean(o_active[o_active > 0.02] ** 2))) if np.any(o_active > 0.02) else 0.1

    pk_main = np.max(np.abs(vo_main))
    if pk_main > 0:
        vo_main *= (0.86 / pk_main)
        main_rms *= (0.86 / pk_main)

    if o_rms > 1e-5:
        vo_o *= (main_rms / o_rms)
    pk_o = np.max(np.abs(vo_o))
    if pk_o > 0.86:
        vo_o *= (0.86 / pk_o)

    pause_before = np.zeros((int(round(0.94 * SR)), 2), dtype=np.float32)
    tail_samples = max(int(round(0.74 * SR)), target_total_samples - (len(vo_main) + len(pause_before) + len(vo_o)))
    pause_after = np.zeros((tail_samples, 2), dtype=np.float32)
    vo = np.concatenate([vo_main, pause_before, vo_o, pause_after], axis=0)[:target_total_samples]
else:
    pad = np.zeros((max(0, target_total_samples - len(vo_main)), 2), dtype=np.float32)
    vo = np.concatenate([vo_main, pad], axis=0)[:target_total_samples]

vo = fft_eq(vo, hp_hz=75.0, hp_order=3)
vo_peak = np.max(np.abs(vo))
if vo_peak > 0:
    vo *= (0.86 / vo_peak)

sfx = np.zeros_like(vo)
ambience = np.zeros_like(vo)

# ==============================================================================
# 2. CLEANED @puckermanefacts SAMPLES
# ==============================================================================
puck_whoosh_thump = load_wav_mono_48k(puck_dir / "puck_whoosh_thump.wav", 0.33, fade_in_ms=5.0, fade_out_ms=45.0, lp_hz=8500.0)
puck_air_whoosh = load_wav_mono_48k(puck_dir / "puck_air_whoosh.wav", 0.31, fade_in_ms=6.0, fade_out_ms=45.0, lp_hz=8200.0)
puck_step_pop = load_wav_mono_48k(puck_dir / "puck_step_pop.wav", 0.24, fade_in_ms=4.0, fade_out_ms=40.0, lp_hz=7800.0)
puck_mech_snap = load_wav_mono_48k(puck_dir / "puck_mech_snap.wav", 0.34, fade_in_ms=4.0, fade_out_ms=45.0, lp_hz=7200.0)
puck_heavy_thud = load_wav_mono_48k(puck_dir / "puck_heavy_thud.wav", 0.38, fade_in_ms=5.0, fade_out_ms=50.0, lp_hz=7500.0)


# ==============================================================================
# 3. STUDIO SYNTHESIZED UI & EP04 FOLEY GENERATORS
# ==============================================================================
def make_saas_pill_in(base_freq=540.0, duration=0.26):
    n = int(duration * SR)
    t = np.linspace(0.0, duration, n, endpoint=False, dtype=np.float32)

    air = fft_eq(pink_noise(n), hp_hz=420.0, lp_hz=2600.0, hp_order=3, lp_order=3)
    air_env = (np.maximum(0.0, np.sin(np.pi * np.clip(t / 0.11, 0.0, 1.0))) ** 1.8) * (t < 0.11)
    air_sig = norm_peak(air * air_env, 1.0)

    att1 = 0.5 * (1.0 - np.cos(np.pi * np.clip(t / 0.005, 0.0, 1.0)))
    env1 = np.exp(-t * 22.0) * att1
    f1 = base_freq * (1.0 + 0.14 * np.exp(-t * 75.0))
    p1 = 2.0 * np.pi * np.cumsum(f1) / SR
    tone1 = (np.sin(p1) + 0.16 * np.sin(2.0 * p1) * np.exp(-t * 42.0)) * env1

    t2 = np.maximum(0.0, t - 0.036)
    mask2 = (t >= 0.036).astype(np.float32)
    att2 = 0.5 * (1.0 - np.cos(np.pi * np.clip(t2 / 0.005, 0.0, 1.0)))
    env2 = mask2 * np.exp(-t2 * 19.0) * att2
    f2 = (base_freq * 1.498) * (1.0 + 0.10 * np.exp(-t2 * 80.0))
    p2 = 2.0 * np.pi * np.cumsum(f2) / SR
    tone2 = (np.sin(p2) + 0.14 * np.sin(2.0 * p2) * np.exp(-t2 * 48.0)) * env2

    out = 0.22 * air_sig + 0.72 * tone1 + 0.85 * tone2
    out = fft_eq(out, hp_hz=180.0, lp_hz=5800.0, hp_order=2, lp_order=3)
    return norm_peak(smooth_fades(out, fade_in_ms=4.0, fade_out_ms=40.0), 1.0)


def make_saas_callout_pop(freq=660.0, duration=0.18):
    n = int(duration * SR)
    t = np.linspace(0.0, duration, n, endpoint=False, dtype=np.float32)

    tick_att = 0.5 * (1.0 - np.cos(np.pi * np.clip(t / 0.003, 0.0, 1.0)))
    tick_env = np.exp(-t * 110.0) * tick_att
    tick = np.sin(2.0 * np.pi * 1320.0 * t) * tick_env

    tp = np.maximum(0.0, t - 0.022)
    mp = (t >= 0.022).astype(np.float32)
    f_chirp = freq * (0.82 + 0.34 * (1.0 - np.exp(-tp * 75.0)))
    phase = 2.0 * np.pi * np.cumsum(f_chirp) / SR
    pop_att = 0.5 * (1.0 - np.cos(np.pi * np.clip(tp / 0.0045, 0.0, 1.0)))
    pop_env = mp * np.exp(-tp * 26.0) * pop_att
    pop = (np.sin(phase) + 0.16 * np.sin(2.0 * phase) * np.exp(-tp * 52.0)) * pop_env

    out = 0.28 * tick + 0.92 * pop
    out = fft_eq(out, hp_hz=180.0, lp_hz=5400.0, hp_order=2, lp_order=3)
    return norm_peak(smooth_fades(out, fade_in_ms=3.5, fade_out_ms=35.0), 1.0)


def make_saas_callout_out(freq=520.0, duration=0.12):
    n = int(duration * SR)
    t = np.linspace(0.0, duration, n, endpoint=False, dtype=np.float32)
    f = freq * (1.0 - 0.24 * (1.0 - np.exp(-t * 60.0)))
    phase = 2.0 * np.pi * np.cumsum(f) / SR
    att = 0.5 * (1.0 - np.cos(np.pi * np.clip(t / 0.004, 0.0, 1.0)))
    env = np.exp(-t * 34.0) * att
    out = np.sin(phase) * env
    out = fft_eq(out, hp_hz=160.0, lp_hz=4500.0, hp_order=2, lp_order=3)
    return norm_peak(smooth_fades(out, fade_in_ms=3.5, fade_out_ms=30.0), 1.0)


def make_rope_cinch(duration=0.44):
    """Taut cloth/rope tightening cinch with muted low-mid strain."""
    n = int(duration * SR)
    t = np.linspace(0.0, duration, n, endpoint=False, dtype=np.float32)
    u = t / duration

    tex = fft_eq(pink_noise(n), hp_hz=320.0, lp_hz=2100.0, hp_order=3, lp_order=3)
    tex_env = np.maximum(0.0, np.sin(np.pi * np.clip(u / 0.78, 0.0, 1.0))) ** 1.4
    creak_f = 165.0 + 115.0 * (u ** 0.85)
    ph = 2.0 * np.pi * np.cumsum(creak_f) / SR
    creak = (0.65 * np.sin(ph) + 0.22 * np.sin(2.0 * ph)) * tex_env * np.exp(-t * 5.2)

    tb = np.maximum(0.0, t - 0.22)
    mb = (t >= 0.22).astype(np.float32)
    lock = mb * np.sin(2.0 * np.pi * 118.0 * tb) * np.exp(-tb * 24.0)

    out = 0.55 * norm_peak(tex * tex_env, 1.0) + 0.45 * creak + 0.65 * lock
    out = fft_eq(out, hp_hz=65.0, lp_hz=3200.0, hp_order=2, lp_order=3)
    return norm_peak(smooth_fades(out, fade_in_ms=8.0, fade_out_ms=60.0), 1.0)


def make_heartbeat_lubdub(duration=2.55):
    """Warm deep cardiac lub-dub pulse sequence for S07 (blood pumped by heart)."""
    n = int(duration * SR)
    out = np.zeros(n, dtype=np.float32)
    t_arr = np.linspace(0.0, duration, n, endpoint=False, dtype=np.float32)
    for beat_t in [0.18, 0.98, 1.78]:
        # Lub
        t1 = np.maximum(0.0, t_arr - beat_t)
        m1 = (t_arr >= beat_t).astype(np.float32)
        a1 = 0.5 * (1.0 - np.cos(np.pi * np.clip(t1 / 0.012, 0.0, 1.0)))
        lub = m1 * a1 * np.sin(2.0 * np.pi * 64.0 * t1) * np.exp(-t1 * 18.0)
        # Dub (+0.22s)
        t2 = np.maximum(0.0, t_arr - (beat_t + 0.22))
        m2 = (t_arr >= (beat_t + 0.22)).astype(np.float32)
        a2 = 0.5 * (1.0 - np.cos(np.pi * np.clip(t2 / 0.010, 0.0, 1.0)))
        dub = m2 * a2 * np.sin(2.0 * np.pi * 82.0 * t2) * np.exp(-t2 * 24.0) * 0.72
        out += lub + dub
    out = fft_eq(out, hp_hz=38.0, lp_hz=260.0, hp_order=2, lp_order=4)
    return norm_peak(smooth_fades(out, fade_in_ms=10.0, fade_out_ms=80.0), 1.0)


def make_footstep_panic(duration=0.14):
    """Soft sneaker thud on wet tile terrace."""
    n = int(duration * SR)
    t = np.linspace(0.0, duration, n, endpoint=False, dtype=np.float32)
    att = 0.5 * (1.0 - np.cos(np.pi * np.clip(t / 0.005, 0.0, 1.0)))
    f = 135.0 * np.exp(-t * 24.0) + 52.0
    ph = 2.0 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * att * np.exp(-t * 22.0)
    scuff = fft_eq(pink_noise(n), hp_hz=240.0, lp_hz=1500.0, hp_order=3, lp_order=3) * np.exp(-t * 28.0) * att
    out = 0.75 * body + 0.35 * norm_peak(scuff, 1.0)
    return norm_peak(smooth_fades(out, fade_in_ms=4.0, fade_out_ms=35.0), 1.0)


def make_muscle_squeeze_surge(duration=0.36):
    """Fluid compression upward surge when calf muscle squeezes lymph channel."""
    n = int(duration * SR)
    t = np.linspace(0.0, duration, n, endpoint=False, dtype=np.float32)
    u = t / duration
    f = 175.0 + 290.0 * (u ** 1.15)
    ph = 2.0 * np.pi * np.cumsum(f) / SR
    env = np.maximum(0.0, np.sin(np.pi * u)) ** 1.5
    air = fft_eq(pink_noise(n), hp_hz=280.0, lp_hz=2200.0, hp_order=3, lp_order=3) * env
    out = 0.65 * np.sin(ph) * env + 0.40 * norm_peak(air, 1.0)
    return norm_peak(smooth_fades(out, fade_in_ms=8.0, fade_out_ms=45.0), 1.0)


def make_error_buzz_soft(duration=0.28):
    """Muted editorial two-step downward warning tone (non-harsh)."""
    n = int(duration * SR)
    t = np.linspace(0.0, duration, n, endpoint=False, dtype=np.float32)
    att1 = 0.5 * (1.0 - np.cos(np.pi * np.clip(t / 0.008, 0.0, 1.0)))
    t1 = np.sin(2.0 * np.pi * 310.0 * t) * att1 * np.exp(-t * 16.0) * (t < 0.14)
    ts = np.maximum(0.0, t - 0.11)
    ms = (t >= 0.11).astype(np.float32)
    att2 = 0.5 * (1.0 - np.cos(np.pi * np.clip(ts / 0.008, 0.0, 1.0)))
    t2 = ms * np.sin(2.0 * np.pi * 225.0 * ts) * att2 * np.exp(-ts * 15.0)
    out = fft_eq(0.75 * t1 + 0.85 * t2, hp_hz=110.0, lp_hz=1800.0, hp_order=2, lp_order=3)
    return norm_peak(smooth_fades(out, fade_in_ms=6.0, fade_out_ms=45.0), 1.0)


def make_camera_shutter_soft(duration=0.16):
    """Clean smartphone shutter click for S20 (foto ular dari jauh)."""
    n = int(duration * SR)
    t = np.linspace(0.0, duration, n, endpoint=False, dtype=np.float32)
    c1 = np.sin(2.0 * np.pi * 1480.0 * t) * np.exp(-t * 95.0)
    t2 = np.maximum(0.0, t - 0.045)
    m2 = (t >= 0.045).astype(np.float32)
    c2 = m2 * np.sin(2.0 * np.pi * 1120.0 * t2) * np.exp(-t2 * 85.0)
    noise = fft_eq(pink_noise(n), hp_hz=600.0, lp_hz=4200.0, hp_order=2, lp_order=3) * np.exp(-t * 55.0)
    out = 0.55 * c1 + 0.45 * c2 + 0.30 * norm_peak(noise, 1.0)
    return norm_peak(smooth_fades(out, fade_in_ms=2.5, fade_out_ms=35.0), 1.0)


def make_serum_chime(duration=0.62):
    """Warm clean emerald confirmation triad for hospital antivenom vial."""
    n = int(duration * SR)
    t = np.linspace(0.0, duration, n, endpoint=False, dtype=np.float32)
    notes = [(0.00, 523.25), (0.07, 659.25), (0.14, 783.99)]
    out = np.zeros(n, dtype=np.float32)
    for dt, f in notes:
        tn = np.maximum(0.0, t - dt)
        mn = (t >= dt).astype(np.float32)
        att = 0.5 * (1.0 - np.cos(np.pi * np.clip(tn / 0.010, 0.0, 1.0)))
        out += mn * att * np.sin(2.0 * np.pi * f * tn) * np.exp(-tn * 8.5)
    out = fft_eq(out, hp_hz=180.0, lp_hz=4800.0, hp_order=2, lp_order=3)
    return norm_peak(smooth_fades(out, fade_in_ms=5.0, fade_out_ms=90.0), 1.0)


def make_outro_follow_click(duration=0.45):
    n = int(duration * SR)
    t = np.linspace(0.0, duration, n, endpoint=False, dtype=np.float32)

    att_c = 0.5 * (1.0 - np.cos(np.pi * np.clip(t / 0.0035, 0.0, 1.0)))
    f_click = 440.0 * np.exp(-t * 45.0) + 165.0
    ph_c = 2.0 * np.pi * np.cumsum(f_click) / SR
    click = np.sin(ph_c) * att_c * np.exp(-t * 58.0)

    tc = np.maximum(0.0, t - 0.018)
    mc = (t >= 0.018).astype(np.float32)
    att_b = 0.5 * (1.0 - np.cos(np.pi * np.clip(tc / 0.010, 0.0, 1.0)))
    bloom = mc * att_b * (
        0.65 * np.sin(2.0 * np.pi * 587.33 * tc) * np.exp(-tc * 11.0) +
        0.48 * np.sin(2.0 * np.pi * 880.00 * tc) * np.exp(-tc * 14.0)
    )

    out = 0.58 * click + 0.85 * bloom
    out = fft_eq(out, hp_hz=120.0, lp_hz=4400.0, hp_order=2, lp_order=4)
    return norm_peak(smooth_fades(out, fade_in_ms=4.0, fade_out_ms=85.0), 1.0)


# ==============================================================================
# 4. WET TERRACE & SUBTLE X-RAY ROOM TONE AMBIENCE BED (81.51s)
# ==============================================================================
def build_terrace_ambience_bed(total_samples):
    t = np.arange(total_samples, dtype=np.float32) / SR
    # Higher outdoor rain-terrace sheen in outdoor scenes; tucked low in X-Ray anatomy scenes; 0 in outro
    kf_t = np.array([
        0.00, 11.50, 12.20, 26.10, 26.60, 28.60,
        29.20, 46.40, 47.00, 69.50, 74.50, outro_start_sec,
        outro_start_sec + 0.65, target_total_sec
    ], dtype=np.float32)
    kf_v = np.array([
        0.58, 0.52, 0.18, 0.18, 0.48, 0.45,
        0.18, 0.18, 0.42, 0.35, 0.32, 0.15,
        0.00, 0.00
    ], dtype=np.float32)
    env = np.interp(t, kf_t, kf_v).astype(np.float32)
    w = int(0.14 * SR) | 1
    win = np.hanning(w).astype(np.float32)
    win /= np.sum(win)
    env = np.convolve(env, win, mode="same").astype(np.float32)

    low_air = fft_eq(pink_noise(total_samples), hp_hz=75.0, lp_hz=280.0, hp_order=3, lp_order=3)
    rain_sheen = fft_eq(
        pink_noise(total_samples), hp_hz=520.0, lp_hz=2400.0, hp_order=3, lp_order=4,
        bell_hz=1850.0, bell_db=-4.0, bell_q=1.1
    )
    mono = (0.48 * low_air + 0.52 * rain_sheen) * env
    bed = make_stereo_bed(mono, width=0.36, low_mono_hz=180.0)
    bed = smooth_fades(bed, fade_in_ms=90.0, fade_out_ms=140.0)
    return norm_peak(bed, 1.0)


# Pre-build reusable UI & texture clips
pill_523 = make_saas_pill_in(523.25)
pill_587 = make_saas_pill_in(587.33)
pill_659 = make_saas_pill_in(659.25)
pill_784 = make_saas_pill_in(783.99)
callout_out_520 = make_saas_callout_out(520.0)
callout_out_587 = make_saas_callout_out(587.33)
rope_cinch = make_rope_cinch(0.44)
heartbeat = make_heartbeat_lubdub(2.55)
footstep = make_footstep_panic(0.14)
muscle_surge = make_muscle_squeeze_surge(0.36)
err_buzz = make_error_buzz_soft(0.28)
shutter = make_camera_shutter_soft(0.16)
serum_chime = make_serum_chime(0.62)
outro_click = make_outro_follow_click(0.45)

ambience_bed = build_terrace_ambience_bed(target_total_samples)
add_stereo(ambience, 0.0, ambience_bed, gain_db=-26.0, pan=0.0)

# ==============================================================================
# 5. 25-SCENE SFX CHOREOGRAPHY (EP04 — 81.51s, OUTRO 77.322s)
# ==============================================================================

# S01 (00.00 - 03.75s): Hook Lockup + Snake Terrace
add_stereo(sfx, 0.02, puck_whoosh_thump, gain_db=-18.5)
add_stereo(sfx, 0.06, pill_523, gain_db=-17.2)
add_stereo(sfx, 0.16, puck_step_pop, gain_db=-19.0)

# S02 (03.75 - 06.80s): Tight Rope Push-In -> Risiko Diamputasi
add_stereo(sfx, 3.75, rope_cinch, gain_db=-18.0, pan=0.06)
add_stereo(sfx, 4.15, make_saas_callout_pop(620.0), gain_db=-17.4, pan=-0.10)
add_stereo(sfx, 6.55, callout_out_520, gain_db=-22.5)

# S03 (06.80 - 11.90s): Close-Up Hands Tying Tight Knot
add_stereo(sfx, 6.80, puck_air_whoosh, gain_db=-18.5)
add_stereo(sfx, 7.60, rope_cinch, gain_db=-18.5, pan=-0.06)
add_stereo(sfx, 8.20, make_saas_callout_pop(650.0), gain_db=-17.5, pan=0.10)
add_stereo(sfx, 11.55, callout_out_520, gain_db=-22.5)

# S04 (11.90 - 14.85s): Macro Dive into 3D X-Ray Mode
add_stereo(sfx, 11.90, puck_air_whoosh, gain_db=-17.6)
add_stereo(sfx, 12.10, pill_587, gain_db=-17.6)

# S05 (14.85 - 17.50s): Not Through Blood Vessel (X)
add_stereo(sfx, 14.85, puck_step_pop, gain_db=-18.6)
add_stereo(sfx, 15.10, err_buzz, gain_db=-20.0, pan=0.08)
add_stereo(sfx, 15.30, make_saas_callout_pop(680.0), gain_db=-17.5, pan=-0.10)
add_stereo(sfx, 17.20, callout_out_520, gain_db=-22.5)

# S06 (17.50 - 20.85s): Lymphatic Channel Right Under Skin
add_stereo(sfx, 17.50, puck_air_whoosh, gain_db=-18.4)
add_stereo(sfx, 17.75, pill_659, gain_db=-17.5)
add_stereo(sfx, 18.20, make_saas_callout_pop(720.0), gain_db=-17.4, pan=0.10)
add_stereo(sfx, 20.55, callout_out_587, gain_db=-22.5)

# S07 (20.85 - 23.60s): Heart Pumps Blood
add_stereo(sfx, 20.85, puck_whoosh_thump, gain_db=-18.5)
add_stereo(sfx, 20.95, heartbeat, gain_db=-17.8, pan=-0.08)
add_stereo(sfx, 21.30, make_saas_callout_pop(640.0), gain_db=-17.6, pan=-0.12)
add_stereo(sfx, 23.30, callout_out_520, gain_db=-22.5)

# S08 (23.60 - 26.35s): Lymphatic Has 0 Pump
add_stereo(sfx, 23.60, puck_air_whoosh, gain_db=-18.5)
add_stereo(sfx, 23.80, pill_587, gain_db=-17.5)
add_stereo(sfx, 24.30, make_saas_callout_pop(660.0), gain_db=-17.5, pan=0.10)
add_stereo(sfx, 26.05, callout_out_520, gain_db=-22.5)

# S09 (26.35 - 28.65s): Panic & Running Footsteps
add_stereo(sfx, 26.35, puck_whoosh_thump, gain_db=-18.0)
for ft in [26.60, 27.02, 27.44, 27.86, 28.28]:
    add_stereo(sfx, ft, footstep, gain_db=-19.0, pan=0.06 if int(ft * 10) % 2 == 0 else -0.06)
add_stereo(sfx, 26.90, make_saas_callout_pop(700.0), gain_db=-17.5)
add_stereo(sfx, 28.40, callout_out_520, gain_db=-22.5)

# S10 (28.65 - 31.85s): Calf Muscle Squeezes Venom Upward
add_stereo(sfx, 28.65, puck_air_whoosh, gain_db=-18.0)
add_stereo(sfx, 28.85, pill_659, gain_db=-17.2)
for ms_t in [29.10, 29.85, 30.60, 31.30]:
    add_stereo(sfx, ms_t, muscle_surge, gain_db=-19.5, pan=-0.05)
add_stereo(sfx, 29.35, make_saas_callout_pop(740.0), gain_db=-17.2, pan=0.10)
add_stereo(sfx, 31.55, callout_out_587, gain_db=-22.5)

# S11 (31.85 - 33.85s): Tourniquet Cutaway Cinch
add_stereo(sfx, 31.85, puck_whoosh_thump, gain_db=-18.0)
add_stereo(sfx, 32.05, pill_587, gain_db=-17.4)
add_stereo(sfx, 32.25, rope_cinch, gain_db=-18.2)

# S12 (33.85 - 37.10s): Blood & Oxygen Cut Off
add_stereo(sfx, 33.85, puck_air_whoosh, gain_db=-18.5)
add_stereo(sfx, 34.15, make_saas_callout_pop(650.0), gain_db=-17.4, pan=-0.10)
add_stereo(sfx, 36.80, callout_out_520, gain_db=-22.5)

# S13 (37.10 - 40.35s): Tissue Necrosis & Amputation Threat
add_stereo(sfx, 37.10, puck_heavy_thud, gain_db=-18.5)
add_stereo(sfx, 37.45, make_saas_callout_pop(600.0), gain_db=-17.2, pan=0.10)
add_stereo(sfx, 40.05, callout_out_520, gain_db=-22.5)

# S14 (40.35 - 42.00s): Sucking Wound Myth (X)
add_stereo(sfx, 40.35, puck_air_whoosh, gain_db=-18.5)
add_stereo(sfx, 40.50, pill_587, gain_db=-17.5)
add_stereo(sfx, 40.75, err_buzz, gain_db=-19.8)

# S15 (42.00 - 46.80s): Oral Bacteria Infection
add_stereo(sfx, 42.00, puck_whoosh_thump, gain_db=-18.5)
add_stereo(sfx, 43.90, err_buzz, gain_db=-20.5, pan=0.08)
add_stereo(sfx, 44.15, make_saas_callout_pop(660.0), gain_db=-17.5, pan=0.10)
add_stereo(sfx, 46.45, callout_out_520, gain_db=-22.5)

# S16 (46.80 - 50.45s): Hero Reset — Treat Like Broken Bone
add_stereo(sfx, 46.80, puck_air_whoosh, gain_db=-17.6)
add_stereo(sfx, 46.95, pill_659, gain_db=-16.8)
add_stereo(sfx, 47.05, puck_step_pop, gain_db=-18.5)

# S17 (50.45 - 52.80s): Step 1 — Do Not Move / Walk
add_stereo(sfx, 50.45, pill_587, gain_db=-16.8)
add_stereo(sfx, 50.52, puck_step_pop, gain_db=-18.5)
add_stereo(sfx, 51.05, make_saas_callout_pop(740.0), gain_db=-17.2, pan=-0.10)
add_stereo(sfx, 52.50, callout_out_587, gain_db=-22.5)

# S18 (52.80 - 58.30s): Step 2 — Remove Shoes, Watch, Rings
add_stereo(sfx, 52.80, puck_whoosh_thump, gain_db=-18.2)
add_stereo(sfx, 52.90, pill_659, gain_db=-16.8)
add_stereo(sfx, 52.95, puck_step_pop, gain_db=-18.5)
add_stereo(sfx, 54.40, make_saas_callout_pop(760.0), gain_db=-17.2, pan=0.10)
add_stereo(sfx, 57.95, callout_out_587, gain_db=-22.5)

# S19 (58.30 - 63.05s): Step 3 — Apply Wood/Cardboard Splint
add_stereo(sfx, 58.30, puck_air_whoosh, gain_db=-18.0)
add_stereo(sfx, 58.40, pill_784, gain_db=-16.8)
add_stereo(sfx, 58.45, puck_step_pop, gain_db=-18.5)
add_stereo(sfx, 59.80, puck_mech_snap, gain_db=-19.2)
add_stereo(sfx, 60.20, make_saas_callout_pop(780.0), gain_db=-17.2, pan=-0.10)
add_stereo(sfx, 62.75, callout_out_587, gain_db=-22.5)

# S20 (63.05 - 66.00s): Step 4A — Safe Distance Photo
add_stereo(sfx, 63.05, puck_whoosh_thump, gain_db=-18.2)
add_stereo(sfx, 63.15, pill_659, gain_db=-16.8)
add_stereo(sfx, 63.65, shutter, gain_db=-17.5, pan=0.05)
add_stereo(sfx, 64.05, make_saas_callout_pop(800.0), gain_db=-17.2, pan=0.10)
add_stereo(sfx, 65.70, callout_out_587, gain_db=-22.5)

# S21 (66.00 - 69.95s): Step 4B — Hospital Transport & Antivenom SABU
add_stereo(sfx, 66.00, puck_air_whoosh, gain_db=-18.0)
add_stereo(sfx, 66.65, serum_chime, gain_db=-18.2, pan=0.06)
add_stereo(sfx, 67.25, make_saas_callout_pop(820.0), gain_db=-17.2, pan=-0.08)
add_stereo(sfx, 69.60, callout_out_587, gain_db=-22.5)

# S22 (69.95 - 72.60s): Contrast Payoff A
add_stereo(sfx, 69.95, puck_whoosh_thump, gain_db=-18.2)
add_stereo(sfx, 71.20, err_buzz, gain_db=-21.5)

# S23 (72.60 - 74.55s): Contrast Payoff B
add_stereo(sfx, 72.60, puck_air_whoosh, gain_db=-18.2)
add_stereo(sfx, 72.90, make_saas_callout_pop(700.0), gain_db=-17.5)
add_stereo(sfx, 74.30, callout_out_520, gain_db=-22.5)

# S24 (74.55 - 77.32s): Sign-Off
add_stereo(sfx, 74.55, puck_air_whoosh, gain_db=-18.2)
add_stereo(sfx, 74.75, puck_step_pop, gain_db=-19.0)

# S25 (77.322 - 81.51s): Outro CTA
add_stereo(sfx, outro_start_sec + 0.45, puck_air_whoosh, gain_db=-17.6)
add_stereo(sfx, outro_start_sec + 1.05, pill_587, gain_db=-17.2)
add_stereo(sfx, outro_start_sec + 1.30, puck_step_pop, gain_db=-17.8)
add_stereo(sfx, outro_start_sec + 1.75, pill_659, gain_db=-17.0)
add_stereo(sfx, outro_start_sec + 2.73, outro_click, gain_db=-15.8)


# ==============================================================================
# 6. TRANSPARENT VO SIDECHAIN DUCKING, LIMITER & MASTER EXPORT
# ==============================================================================
def compute_sidechain_gain(vo_stereo, max_duck=0.38, thresh=0.085,
                           lookahead_ms=14.0, attack_ms=18.0, release_ms=165.0):
    n = len(vo_stereo)
    mono_abs = 0.5 * (np.abs(vo_stereo[:, 0]) + np.abs(vo_stereo[:, 1]))

    pre = moving_rms(mono_abs, ms=22.0)
    la_samples = int(lookahead_ms * 0.001 * SR)
    if la_samples > 0 and la_samples < n:
        pre_la = np.concatenate([pre[la_samples:], np.zeros(la_samples, dtype=np.float32)])
        det_in = np.maximum(pre, pre_la)
    else:
        det_in = pre

    step = 48
    ctrl_rate = SR / step
    det_ctrl = det_in[::step]
    a_att = float(np.exp(-1.0 / max(1.0, attack_ms * 0.001 * ctrl_rate)))
    a_rel = float(np.exp(-1.0 / max(1.0, release_ms * 0.001 * ctrl_rate)))
    env_ctrl = np.empty(len(det_ctrl), dtype=np.float32)
    cur = 0.0
    for i, v in enumerate(det_ctrl):
        vf = float(v)
        coeff = a_att if vf > cur else a_rel
        cur = coeff * cur + (1.0 - coeff) * vf
        env_ctrl[i] = cur

    x_ctrl = np.arange(len(det_ctrl), dtype=np.float32) * step
    x_full = np.arange(n, dtype=np.float32)
    env = np.interp(x_full, x_ctrl, env_ctrl).astype(np.float32)

    ratio = np.clip(env / thresh, 0.0, 1.5)
    soft_curve = np.tanh(ratio * 1.15) / np.tanh(1.5 * 1.15)
    return (1.0 - max_duck * soft_curve).astype(np.float32)


duck_sfx = compute_sidechain_gain(vo, max_duck=0.34, thresh=0.085, attack_ms=18.0, release_ms=160.0)
duck_amb = compute_sidechain_gain(vo, max_duck=0.45, thresh=0.070, attack_ms=22.0, release_ms=220.0)

sfx[:, 0] *= duck_sfx
sfx[:, 1] *= duck_sfx
ambience[:, 0] *= duck_amb
ambience[:, 1] *= duck_amb

master = vo + sfx + ambience

ceiling = 0.89
peak = float(np.max(np.abs(master)))
if peak > ceiling:
    thresh_lim = 0.80
    over = np.maximum(0.0, np.abs(master) - thresh_lim)
    headroom = ceiling - thresh_lim
    compressed = thresh_lim + headroom * np.tanh(over / max(headroom, 1e-6))
    master = np.where(np.abs(master) > thresh_lim, np.sign(master) * compressed, master)

master = smooth_fades(master, fade_in_ms=12.0, fade_out_ms=80.0)
if np.isnan(master).any() or np.isinf(master).any():
    raise ValueError("Master audio buffer contains NaN or Inf values!")

master_i16 = np.clip(master * 32767.0, -32768, 32767).astype(np.int16)
with wave.open(str(out_wav), "wb") as wf:
    wf.setnchannels(2)
    wf.setsampwidth(2)
    wf.setframerate(SR)
    wf.writeframes(master_i16.tobytes())

subprocess.run([
    "ffmpeg", "-y", "-i", str(out_wav),
    "-c:a", "libmp3lame", "-b:a", "320k", str(out_mp3)
], check=True, stderr=subprocess.DEVNULL)

print(
    f"Built 48kHz EP04 studio master audio: {out_wav} "
    f"(outro_start_sec={outro_start_sec:.3f}s, total={target_total_sec:.2f}s, peak={np.max(np.abs(master)):.4f})"
)
