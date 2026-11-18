import subprocess
import wave
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
vo_mp3 = ROOT / "vo_ep05.mp3"
vo_wav = ROOT / "temp_vo_ep05_48k.wav"
out_wav = ROOT / "audio_ep05_master.wav"
out_mp3 = ROOT / "audio_ep05_master.mp3"
puck_dir = ROOT / "sfx_puckermane"

SR = 48000
rng = np.random.default_rng(505)


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
    tmp = ROOT / f"temp_{path.stem}_ep05_48k.wav"
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
# 1. VOICEOVER ASSEMBLY (F4 CTA ALREADY IN MAIN VO -> NO DUPLICATE VO IN OUTRO)
# ==============================================================================
vo_main = decode_wav_48k_stereo(vo_mp3, vo_wav)
vo_main = smooth_fades(vo_main, fade_in_ms=6.0, fade_out_ms=14.0)

outro_start_sec = len(vo_main) / SR  # 93.466s
target_total_sec = round(outro_start_sec + 4.19, 2)  # 97.66s
target_total_samples = int(round(target_total_sec * SR))

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
# 3. STUDIO SYNTHESIZED UI & EP05 ENGINE/WATER FOLEY GENERATORS
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


def make_starter_click_stall(duration=0.48):
    """Tactile switch click followed by brief stalled electric starter crank."""
    n = int(duration * SR)
    t = np.linspace(0.0, duration, n, endpoint=False, dtype=np.float32)
    att = 0.5 * (1.0 - np.cos(np.pi * np.clip(t / 0.003, 0.0, 1.0)))
    click = att * np.sin(2.0 * np.pi * 1180.0 * t) * np.exp(-t * 95.0)
    tm = np.maximum(0.0, t - 0.035)
    mm = (t >= 0.035).astype(np.float32)
    freq = 145.0 * np.exp(-tm * 2.2) + 55.0
    ph = 2.0 * np.pi * np.cumsum(freq) / SR
    whine = mm * (0.65 * np.sin(ph) + 0.35 * np.sin(2.0 * ph)) * np.exp(-tm * 5.8)
    lock_thud = (t >= 0.34).astype(np.float32) * np.sin(2.0 * np.pi * 88.0 * np.maximum(0.0, t - 0.34)) * np.exp(-np.maximum(0.0, t - 0.34) * 32.0)
    out = 0.65 * click + 0.72 * whine + 0.85 * lock_thud
    out = fft_eq(out, hp_hz=55.0, lp_hz=4200.0, hp_order=2, lp_order=3)
    return norm_peak(smooth_fades(out, fade_in_ms=3.0, fade_out_ms=55.0), 1.0)


def make_water_suction(duration=1.10):
    """Filtered rushing water suction into airbox intake hose."""
    n = int(duration * SR)
    t = np.linspace(0.0, duration, n, endpoint=False, dtype=np.float32)
    u = t / duration
    env = np.maximum(0.0, np.sin(np.pi * u)) ** 1.15
    noise = fft_eq(pink_noise(n), hp_hz=280.0, lp_hz=2400.0, hp_order=3, lp_order=3)
    gurgle = 0.5 + 0.5 * np.sin(2.0 * np.pi * (8.5 + 4.5 * u) * t)
    sub_gulp = np.sin(2.0 * np.pi * (120.0 + 95.0 * u) * t) * 0.25
    out = (norm_peak(noise, 1.0) * (0.55 + 0.45 * gurgle) + sub_gulp) * env
    out = fft_eq(out, hp_hz=110.0, lp_hz=3200.0, hp_order=2, lp_order=3)
    return norm_peak(smooth_fades(out, fade_in_ms=25.0, fade_out_ms=90.0), 1.0)


def make_water_hammer_impact(duration=0.68):
    """Violent hydro-lock piston slap against incompressible water + steel rod buckle."""
    n = int(duration * SR)
    t = np.linspace(0.0, duration, n, endpoint=False, dtype=np.float32)
    att = 0.5 * (1.0 - np.cos(np.pi * np.clip(t / 0.0025, 0.0, 1.0)))
    f_sub = 175.0 * np.exp(-t * 28.0) + 46.0
    ph_sub = 2.0 * np.pi * np.cumsum(f_sub) / SR
    slam = att * np.sin(ph_sub) * np.exp(-t * 10.5)

    # Metallic rod strain ring
    ring = att * (
        0.55 * np.sin(2.0 * np.pi * 620.0 * t) * np.exp(-t * 15.0) +
        0.38 * np.sin(2.0 * np.pi * 985.0 * t) * np.exp(-t * 22.0)
    )
    crack = fft_eq(pink_noise(n), hp_hz=650.0, lp_hz=5400.0, hp_order=2, lp_order=3) * np.exp(-t * 42.0)
    out = 0.92 * slam + 0.48 * ring + 0.55 * norm_peak(crack, 1.0)
    out = fft_eq(out, hp_hz=36.0, lp_hz=6500.0, hp_order=2, lp_order=3)
    return norm_peak(smooth_fades(out, fade_in_ms=2.5, fade_out_ms=95.0), 1.0)


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


def make_water_eject_spray(duration=0.72):
    """Crisp upward water spurt out of open spark plug port."""
    n = int(duration * SR)
    t = np.linspace(0.0, duration, n, endpoint=False, dtype=np.float32)
    env = np.maximum(0.0, np.sin(np.pi * (t / duration))) ** 1.35
    burst = fft_eq(pink_noise(n), hp_hz=520.0, lp_hz=4600.0, hp_order=3, lp_order=3)
    pulse = 0.55 + 0.45 * np.maximum(0.0, np.sin(2.0 * np.pi * 7.0 * t))
    out = norm_peak(burst, 1.0) * env * pulse
    return norm_peak(smooth_fades(out, fade_in_ms=10.0, fade_out_ms=75.0), 1.0)


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
# 4. FLOODED STREET RAIN & X-RAY ROOM TONE AMBIENCE BED (97.66s)
# ==============================================================================
def build_flood_ambience_bed(total_samples):
    t = np.arange(total_samples, dtype=np.float32) / SR
    kf_t = np.array([
        0.00, 5.00, 10.80, 26.00, 26.50, 55.10,
        55.60, 72.50, 79.50, outro_start_sec,
        outro_start_sec + 0.65, target_total_sec
    ], dtype=np.float32)
    kf_v = np.array([
        0.58, 0.52, 0.55, 0.52, 0.16, 0.16,
        0.42, 0.36, 0.25, 0.15,
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


pill_523 = make_saas_pill_in(523.25)
pill_587 = make_saas_pill_in(587.33)
pill_659 = make_saas_pill_in(659.25)
pill_784 = make_saas_pill_in(783.99)
callout_out_520 = make_saas_callout_out(520.0)
callout_out_587 = make_saas_callout_out(587.33)
starter_stall = make_starter_click_stall(0.48)
water_suction = make_water_suction(1.10)
water_hammer = make_water_hammer_impact(0.68)
err_buzz = make_error_buzz_soft(0.28)
water_eject = make_water_eject_spray(0.72)
outro_click = make_outro_follow_click(0.45)

ambience_bed = build_flood_ambience_bed(target_total_samples)
add_stereo(ambience, 0.0, ambience_bed, gain_db=-26.0, pan=0.0)

# ==============================================================================
# 5. 22-SCENE SFX CHOREOGRAPHY (EP05 — 97.66s, OUTRO 93.466s)
# ==============================================================================

# S01 (00.00 - 05.05s): Hook Lockup — "MOGOK DI BANJIR? JANGAN PENCET STARTER!"
add_stereo(sfx, 0.02, puck_whoosh_thump, gain_db=-18.5)
add_stereo(sfx, 0.06, pill_523, gain_db=-17.2)
add_stereo(sfx, 3.80, puck_mech_snap, gain_db=-20.0)

# S02 (05.05 - 10.85s): Stakes — Setang Seher Bengkok & Mesin Jebol
add_stereo(sfx, 5.10, starter_stall, gain_db=-18.5, pan=0.06)
add_stereo(sfx, 5.75, water_hammer, gain_db=-17.5)
add_stereo(sfx, 6.20, make_saas_callout_pop(620.0), gain_db=-17.5, pan=-0.10)
add_stereo(sfx, 10.50, callout_out_520, gain_db=-22.5)

# S03 (10.85 - 16.52s): Micro-Scenario — Setengah Roda, Mesin Mati, Jempol Refleks
add_stereo(sfx, 10.85, puck_air_whoosh, gain_db=-18.5)
add_stereo(sfx, 15.10, starter_stall, gain_db=-18.2, pan=-0.06)
add_stereo(sfx, 15.65, make_saas_callout_pop(650.0), gain_db=-17.5, pan=0.10)
add_stereo(sfx, 16.25, callout_out_520, gain_db=-22.5)

# S04 (16.52 - 21.70s): Box Filter Udara Rendah (Sejajar Setengah Ban)
add_stereo(sfx, 16.52, puck_whoosh_thump, gain_db=-18.5)
add_stereo(sfx, 17.85, make_saas_callout_pop(660.0), gain_db=-17.6, pan=-0.08)
add_stereo(sfx, 21.40, callout_out_520, gain_db=-22.5)

# S05 (21.70 - 26.20s): Hisapan Mesin Menyedot Air ke Ruang Bakar
add_stereo(sfx, 21.70, puck_air_whoosh, gain_db=-18.4)
add_stereo(sfx, 22.85, water_suction, gain_db=-18.2, pan=0.04)
add_stereo(sfx, 23.40, make_saas_callout_pop(690.0), gain_db=-17.5, pan=0.10)
add_stereo(sfx, 25.90, callout_out_520, gain_db=-22.5)

# S06 (26.20 - 33.08s): INTERRUPT ~0:26 (F5) -> 3D X-Ray Cutaway Kompresi 110cc 10:1
add_stereo(sfx, 26.20, puck_whoosh_thump, gain_db=-16.8)
add_stereo(sfx, 26.32, pill_587, gain_db=-16.8)
add_stereo(sfx, 31.10, make_saas_callout_pop(700.0), gain_db=-17.5, pan=-0.10)
add_stereo(sfx, 32.80, callout_out_587, gain_db=-22.5)

# S07 (33.08 - 37.24s): Ruang Sisa TMA Cuma 12 mL
add_stereo(sfx, 33.08, puck_air_whoosh, gain_db=-18.0)
add_stereo(sfx, 33.25, pill_659, gain_db=-17.2)
add_stereo(sfx, 35.10, make_saas_callout_pop(730.0), gain_db=-17.4, pan=0.10)
add_stereo(sfx, 36.95, callout_out_587, gain_db=-22.5)

# S08 (37.24 - 39.32s): Scale Shock — Kurang dari 1 Sendok Makan
add_stereo(sfx, 37.24, puck_step_pop, gain_db=-17.6)
add_stereo(sfx, 37.38, pill_784, gain_db=-17.0)
add_stereo(sfx, 37.75, make_saas_callout_pop(780.0), gain_db=-17.2, pan=-0.08)
add_stereo(sfx, 39.05, callout_out_587, gain_db=-22.5)

# S09 (39.32 - 44.32s): Split-View Fisika — Gas Mudah Dimampatkan vs Air Tidak Bisa Ditekan
add_stereo(sfx, 39.32, puck_air_whoosh, gain_db=-18.0)
add_stereo(sfx, 39.50, pill_659, gain_db=-17.4)
add_stereo(sfx, 42.15, err_buzz, gain_db=-20.5, pan=0.12)
add_stereo(sfx, 42.45, make_saas_callout_pop(680.0), gain_db=-17.4, pan=0.10)
add_stereo(sfx, 44.05, callout_out_520, gain_db=-22.5)

# S10 (44.32 - 50.22s): Water Hammer Impact — Piston Menghantam Air Sekeras Beton
add_stereo(sfx, 44.32, puck_whoosh_thump, gain_db=-18.0)
add_stereo(sfx, 47.45, puck_heavy_thud, gain_db=-16.5)
add_stereo(sfx, 47.50, water_hammer, gain_db=-16.0)
add_stereo(sfx, 47.95, make_saas_callout_pop(620.0), gain_db=-17.2, pan=-0.10)
add_stereo(sfx, 49.95, callout_out_520, gain_db=-22.5)

# S11 (50.22 - 55.28s): F3 Fix — Tenaga Berbalik Menekan Setang Seher Bengkok / Jebol Blok
add_stereo(sfx, 50.22, puck_air_whoosh, gain_db=-18.2)
add_stereo(sfx, 51.35, water_hammer, gain_db=-17.0, pan=0.05)
add_stereo(sfx, 52.85, puck_heavy_thud, gain_db=-17.5)
add_stereo(sfx, 51.80, make_saas_callout_pop(600.0), gain_db=-17.2, pan=0.10)
add_stereo(sfx, 55.00, callout_out_520, gain_db=-22.5)

# S12 (55.28 - 59.35s): Hero Reset — Lakukan 3 Langkah Ini
add_stereo(sfx, 55.28, puck_air_whoosh, gain_db=-17.6)
add_stereo(sfx, 55.45, pill_659, gain_db=-16.8)
add_stereo(sfx, 55.55, puck_step_pop, gain_db=-18.5)

# S13A (59.35 - 62.50s): Langkah 1A — Jangan Pencet Starter atau Injak Engkol
add_stereo(sfx, 59.35, pill_587, gain_db=-16.8)
add_stereo(sfx, 59.42, puck_step_pop, gain_db=-18.2)
add_stereo(sfx, 60.20, err_buzz, gain_db=-20.5)
add_stereo(sfx, 60.50, make_saas_callout_pop(720.0), gain_db=-17.2, pan=-0.10)
add_stereo(sfx, 62.25, callout_out_587, gain_db=-22.5)

# S13B (62.50 - 65.10s): Langkah 1B — Matikan Kontak & Dorong ke Tempat Kering
add_stereo(sfx, 62.50, puck_mech_snap, gain_db=-18.5)
add_stereo(sfx, 63.10, make_saas_callout_pop(760.0), gain_db=-17.2, pan=0.10)
add_stereo(sfx, 64.85, callout_out_587, gain_db=-22.5)

# S14A (65.10 - 67.80s): Langkah 2A — Cek Filter Udara & Warna Oli
add_stereo(sfx, 65.10, puck_whoosh_thump, gain_db=-18.0)
add_stereo(sfx, 65.20, pill_659, gain_db=-16.8)
add_stereo(sfx, 65.28, puck_step_pop, gain_db=-18.4)
add_stereo(sfx, 65.70, puck_mech_snap, gain_db=-19.5)

# S14B (67.80 - 72.70s): Langkah 2B — Perbandingan Oli Normal vs Oli Keruh Kopi Susu (F6)
add_stereo(sfx, 67.80, puck_air_whoosh, gain_db=-18.0)
add_stereo(sfx, 68.15, make_saas_callout_pop(780.0), gain_db=-17.4, pan=-0.12)
add_stereo(sfx, 69.50, make_saas_callout_pop(650.0), gain_db=-17.2, pan=0.12)
add_stereo(sfx, 70.95, err_buzz, gain_db=-20.2, pan=0.10)
add_stereo(sfx, 72.40, callout_out_520, gain_db=-22.5)

# S15A (72.70 - 75.90s): Langkah 3A — Lepas Busi Buang Air dari Ruang Bakar
add_stereo(sfx, 72.70, puck_air_whoosh, gain_db=-18.0)
add_stereo(sfx, 72.80, pill_784, gain_db=-16.8)
add_stereo(sfx, 72.88, puck_step_pop, gain_db=-18.4)
add_stereo(sfx, 73.60, puck_mech_snap, gain_db=-19.2)
add_stereo(sfx, 74.20, water_eject, gain_db=-18.0)
add_stereo(sfx, 74.35, make_saas_callout_pop(780.0), gain_db=-17.2, pan=-0.08)
add_stereo(sfx, 75.65, callout_out_587, gain_db=-22.5)

# S15B (75.90 - 79.50s): Langkah 3B — Bawa ke Bengkel Kuras Oli & Keringkan CVT
add_stereo(sfx, 75.90, puck_whoosh_thump, gain_db=-18.2)
add_stereo(sfx, 76.60, make_saas_callout_pop(800.0), gain_db=-17.2, pan=0.10)
add_stereo(sfx, 79.20, callout_out_587, gain_db=-22.5)

# S16A-B (79.50 - 85.72s): Contrast Payoff — Bukan Air Banjirnya, Tapi Tombol Starter Saat Panik
add_stereo(sfx, 79.50, puck_whoosh_thump, gain_db=-18.2)
add_stereo(sfx, 83.05, puck_air_whoosh, gain_db=-18.2)
add_stereo(sfx, 83.35, make_saas_callout_pop(690.0), gain_db=-17.4)
add_stereo(sfx, 85.45, callout_out_520, gain_db=-22.5)

# S17 (85.72 - 90.88s): F4 CTA — Pernah Mogok di Banjir? Ceritain di Komen & Subscribe
add_stereo(sfx, 85.72, puck_air_whoosh, gain_db=-18.2)
add_stereo(sfx, 85.85, pill_659, gain_db=-17.4)
add_stereo(sfx, 88.20, puck_step_pop, gain_db=-18.8)

# S18 (90.88 - 93.47s): Sign-Off — "Jadi... jangan panik dulu."
add_stereo(sfx, 90.88, puck_air_whoosh, gain_db=-18.2)
add_stereo(sfx, 91.05, puck_step_pop, gain_db=-19.0)

# S19 (93.466 - 97.66s): Outro Triple Wipe + "+ Ikuti" Click SFX Only
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
    f"Built 48kHz EP05 studio master audio: {out_wav} "
    f"(outro_start_sec={outro_start_sec:.3f}s, total={target_total_sec:.2f}s, peak={np.max(np.abs(master)):.4f})"
)
