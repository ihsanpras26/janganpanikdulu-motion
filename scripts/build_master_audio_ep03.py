import subprocess
import wave
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
vo_mp3 = ROOT / "vo_ep03.mp3"
vo_outro_mp3 = ROOT / "ElevenLabs_2026-11-13T12_51_02_Senandika - Young, Confident and Clear_pvc_s30_sim75_v4.mp3"
vo_wav = ROOT / "temp_vo_ep03_48k.wav"
vo_outro_wav = ROOT / "temp_vo_outro_ep03_48k.wav"
out_wav = ROOT / "audio_ep03_master.wav"
out_mp3 = ROOT / "audio_ep03_master.mp3"
puck_dir = ROOT / "sfx_puckermane"

SR = 48000
rng = np.random.default_rng(303)


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


def make_stereo_bed(sig, width=0.35, low_mono_hz=180.0):
    """Create natural decorrelated stereo width while keeping sub/lows mono-compatible."""
    n = len(sig)
    low = fft_eq(sig, lp_hz=low_mono_hz, lp_order=3)
    side_src = pink_noise(n)
    side_src = fft_eq(side_src, hp_hz=low_mono_hz, lp_hz=3200.0, hp_order=3, lp_order=3)
    # Match RMS envelope of side_src to high portion of sig
    high = sig - low
    env = moving_rms(np.abs(high), ms=80.0)
    side = side_src * (env / (np.sqrt(np.mean(side_src ** 2)) + 1e-6)) * width
    l = low + high + side
    r = low + high - side
    return np.stack([l, r], axis=1).astype(np.float32)


def moving_rms(x, ms=30.0):
    """Smooth zero-phase Hann-windowed envelope follower."""
    w = max(16, int(ms * 0.001 * SR))
    if w % 2 == 0:
        w += 1
    win = np.hanning(w).astype(np.float32)
    win /= np.sum(win)
    return np.convolve(np.abs(x), win, mode="same").astype(np.float32)


def norm_peak(x, target=0.95):
    pk = np.max(np.abs(x)) + 1e-6
    return (x * (target / pk)).astype(np.float32)


def load_wav_mono_48k(path, max_dur=None, fade_in_ms=5.0, fade_out_ms=35.0, lp_hz=9200.0):
    tmp = ROOT / f"temp_{path.stem}_ep03_48k.wav"
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
target_total_sec = round(outro_start_sec + 4.19, 2)  # 75.311 + 4.19 = 79.50s
target_total_samples = int(round(target_total_sec * SR))

if vo_outro_mp3.exists():
    vo_o = decode_wav_48k_stereo(vo_outro_mp3, vo_outro_wav)
    vo_o = smooth_fades(vo_o, fade_in_ms=8.0, fade_out_ms=18.0)

    # Match outro VO active RMS loudness smoothly to main VO active RMS
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

# Gentle warm presence polish on VO (clean low-cut <75 Hz to remove sub rumble)
vo = fft_eq(vo, hp_hz=75.0, hp_order=3)
vo_peak = np.max(np.abs(vo))
if vo_peak > 0:
    vo *= (0.86 / vo_peak)

sfx = np.zeros_like(vo)
ambience = np.zeros_like(vo)

# ==============================================================================
# 2. CLEANED @puckermanefacts SAMPLES (Warm LP + Smooth Cosine Fades)
# ==============================================================================
puck_whoosh_thump = load_wav_mono_48k(puck_dir / "puck_whoosh_thump.wav", 0.33, fade_in_ms=5.0, fade_out_ms=45.0, lp_hz=8500.0)
puck_air_whoosh = load_wav_mono_48k(puck_dir / "puck_air_whoosh.wav", 0.31, fade_in_ms=6.0, fade_out_ms=45.0, lp_hz=8200.0)
puck_step_pop = load_wav_mono_48k(puck_dir / "puck_step_pop.wav", 0.24, fade_in_ms=4.0, fade_out_ms=40.0, lp_hz=7800.0)
puck_mech_snap = load_wav_mono_48k(puck_dir / "puck_mech_snap.wav", 0.34, fade_in_ms=4.0, fade_out_ms=45.0, lp_hz=7200.0)
puck_heavy_thud = load_wav_mono_48k(puck_dir / "puck_heavy_thud.wav", 0.38, fade_in_ms=5.0, fade_out_ms=50.0, lp_hz=7500.0)


# ==============================================================================
# 3. STUDIO SYNTHESIZED UI & MECHANICAL TEXTURE GENERATORS
# ==============================================================================
def make_saas_pill_in(base_freq=540.0, duration=0.26):
    """Warm frosted-glass UI pill entrance with soft cosine attack & airy release."""
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
    """Soft tactile glass-badge spring pop with warm damped wood-tick."""
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
    """Velvety downward glass dismiss micro-pop."""
    n = int(duration * SR)
    t = np.linspace(0.0, duration, n, endpoint=False, dtype=np.float32)
    f = freq * (1.0 - 0.24 * (1.0 - np.exp(-t * 60.0)))
    phase = 2.0 * np.pi * np.cumsum(f) / SR
    att = 0.5 * (1.0 - np.cos(np.pi * np.clip(t / 0.004, 0.0, 1.0)))
    env = np.exp(-t * 34.0) * att
    out = np.sin(phase) * env
    out = fft_eq(out, hp_hz=160.0, lp_hz=4500.0, hp_order=2, lp_order=3)
    return norm_peak(smooth_fades(out, fade_in_ms=3.5, fade_out_ms=30.0), 1.0)


def make_scooter_hum(duration=4.2, rpm_start=68.0, rpm_end=84.0):
    """Warm, muted 4-stroke scooter engine purr (zero harsh buzz)."""
    n = int(duration * SR)
    t = np.linspace(0.0, duration, n, endpoint=False, dtype=np.float32)
    u = t / duration
    # Smooth cosine-interpolated pitch contour
    f0 = rpm_start + (rpm_end - rpm_start) * (0.5 - 0.5 * np.cos(np.pi * u))
    p = 2.0 * np.pi * np.cumsum(f0) / SR

    # Soft fundamental + gentle warm 2nd harmonic + tiny 3rd + air intake flutter
    eng = 0.78 * np.sin(p) + 0.24 * np.sin(2.0 * p) + 0.06 * np.sin(3.0 * p)
    eng = fft_eq(eng, hp_hz=55.0, lp_hz=360.0, hp_order=2, lp_order=4)

    intake = fft_eq(pink_noise(n), hp_hz=160.0, lp_hz=720.0, hp_order=3, lp_order=3) * 0.22
    out = eng + intake
    return norm_peak(smooth_fades(out, fade_in_ms=320.0, fade_out_ms=420.0), 1.0)


def make_disc_heat_shimmer(duration=3.6):
    """Warm 300C+ glowing steel thermal shimmer (no piercing whistle)."""
    n = int(duration * SR)
    t = np.linspace(0.0, duration, n, endpoint=False, dtype=np.float32)

    # Layer 1: Warm thermal sizzle bed (carved gently around 2.3 kHz for VO clarity)
    sizzle = fft_eq(
        pink_noise(n), hp_hz=820.0, lp_hz=3800.0, hp_order=3, lp_order=4,
        bell_hz=2300.0, bell_db=-3.5, bell_q=1.1
    )

    # Layer 2: Organic detuned radiant heat shimmer (soft breathing LFOs)
    lfo1 = 0.55 + 0.45 * np.sin(2.0 * np.pi * 3.2 * t)
    lfo2 = 0.55 + 0.45 * np.sin(2.0 * np.pi * 4.7 * t + 1.1)
    shimmer_l = (
        0.50 * np.sin(2.0 * np.pi * 1180.0 * t) * lfo1 +
        0.35 * np.sin(2.0 * np.pi * 1640.0 * t) * lfo2
    )
    shimmer_r = (
        0.50 * np.sin(2.0 * np.pi * 1192.0 * t + 0.4) * lfo2 +
        0.35 * np.sin(2.0 * np.pi * 1628.0 * t + 0.7) * lfo1
    )
    shimmer = np.stack([shimmer_l, shimmer_r], axis=1).astype(np.float32)
    shimmer = fft_eq(shimmer, hp_hz=750.0, lp_hz=2800.0, hp_order=2, lp_order=4)

    bed_stereo = make_stereo_bed(sizzle, width=0.38, low_mono_hz=600.0)
    out = 0.80 * bed_stereo + 0.22 * shimmer
    return norm_peak(smooth_fades(out, fade_in_ms=420.0, fade_out_ms=520.0), 1.0)


def make_vapor_boil(duration=2.6):
    """Organic boiling brake fluid bubbles + warm simmering hydraulic hiss."""
    n = int(duration * SR)
    t = np.linspace(0.0, duration, n, endpoint=False, dtype=np.float32)

    # Warm simmering fluid base (tucked cleanly below harshness)
    hiss = fft_eq(
        pink_noise(n), hp_hz=420.0, lp_hz=2800.0, hp_order=3, lp_order=4,
        bell_hz=2100.0, bell_db=-3.0, bell_q=1.1
    )
    simmer_env = 0.75 + 0.25 * np.sin(np.pi * (t / duration))
    buf = make_stereo_bed(hiss * simmer_env, width=0.32, low_mono_hz=350.0) * 0.48

    # Staggered organic upward-chirping fluid bubbles
    num_bubbles = max(14, int(duration * 15))
    for _ in range(num_bubbles):
        b_dur = float(rng.uniform(0.030, 0.068))
        bn = int(b_dur * SR)
        t0 = float(rng.uniform(0.08, max(0.12, duration - b_dur - 0.10)))
        idx0 = int(t0 * SR)
        if idx0 + bn >= n:
            continue
        tb = np.linspace(0.0, b_dur, bn, endpoint=False, dtype=np.float32)
        f_start = float(rng.uniform(250.0, 740.0))
        f_sweep = f_start * (1.0 + 0.65 * (tb / b_dur) ** 1.3)
        ph = 2.0 * np.pi * np.cumsum(f_sweep) / SR
        b_env = np.maximum(0.0, np.sin(np.pi * (tb / b_dur))) ** 1.5
        amp = float(rng.uniform(0.28, 0.62))
        bub = np.sin(ph) * b_env * amp
        pan = float(rng.uniform(-0.22, 0.22))
        theta = (pan + 1.0) * (np.pi / 4.0)
        buf[idx0:idx0 + bn, 0] += bub * np.cos(theta)
        buf[idx0:idx0 + bn, 1] += bub * np.sin(theta)

    buf = fft_eq(buf, hp_hz=200.0, lp_hz=3200.0, hp_order=2, lp_order=3)
    return norm_peak(smooth_fades(buf, fade_in_ms=260.0, fade_out_ms=360.0), 1.0)


def make_lever_ngempos_press(duration=0.42):
    """Soft, spongy, hollow 'ngempos' brake lever squeeze (zero hydraulic resistance)."""
    n = int(duration * SR)
    t = np.linspace(0.0, duration, n, endpoint=False, dtype=np.float32)

    # 1. Soft lubricated pivot air-slide
    slide = fft_eq(pink_noise(n), hp_hz=260.0, lp_hz=1250.0, hp_order=3, lp_order=3)
    slide_env = (np.maximum(0.0, np.sin(np.pi * np.clip(t / 0.14, 0.0, 1.0))) ** 1.6) * (t < 0.14)
    slide_sig = norm_peak(slide * slide_env, 1.0)

    # 2. Hollow spongy air-pocket squish (low-mid damped pitch drop)
    ts = np.maximum(0.0, t - 0.04)
    ms = (t >= 0.04).astype(np.float32)
    f_sq = 195.0 - 95.0 * (1.0 - np.exp(-ts * 16.0))
    ph_sq = 2.0 * np.pi * np.cumsum(f_sq) / SR
    att_sq = 0.5 * (1.0 - np.cos(np.pi * np.clip(ts / 0.014, 0.0, 1.0)))
    squish = np.sin(ph_sq) * ms * att_sq * np.exp(-ts * 11.5)

    # 3. Muted rubber-grip bottom-out thump at ~0.16s (no harsh click)
    tb = np.maximum(0.0, t - 0.15)
    mb = (t >= 0.15).astype(np.float32)
    f_th = 115.0 * np.exp(-tb * 18.0) + 54.0
    ph_th = 2.0 * np.pi * np.cumsum(f_th) / SR
    att_th = 0.5 * (1.0 - np.cos(np.pi * np.clip(tb / 0.008, 0.0, 1.0)))
    thump = np.sin(ph_th) * mb * att_th * np.exp(-tb * 16.0)

    out = 0.35 * slide_sig + 0.55 * squish + 0.70 * thump
    out = fft_eq(out, hp_hz=45.0, lp_hz=2200.0, hp_order=2, lp_order=3)
    return norm_peak(smooth_fades(out, fade_in_ms=8.0, fade_out_ms=65.0), 1.0)


def make_cvt_clutch_event(mode="disengage", duration=0.52):
    """Warm metallic CVT centrifugal clutch disengage (release) or engage (grip)."""
    n = int(duration * SR)
    t = np.linspace(0.0, duration, n, endpoint=False, dtype=np.float32)
    u = t / duration

    if mode == "disengage":
        # Soft mechanical unlatch + downward centrifugal whir
        att = 0.5 * (1.0 - np.cos(np.pi * np.clip(t / 0.010, 0.0, 1.0)))
        latch = (
            0.60 * np.sin(2.0 * np.pi * 265.0 * t) * np.exp(-t * 18.0) +
            0.35 * np.sin(2.0 * np.pi * 530.0 * t) * np.exp(-t * 24.0)
        ) * att
        f_whir = 380.0 - 210.0 * (u ** 0.75)
        ph = 2.0 * np.pi * np.cumsum(f_whir) / SR
        whir_env = (np.maximum(0.0, np.sin(np.pi * np.clip(u / 0.85, 0.0, 1.0))) ** 1.4) * (u < 0.85)
        whir = (0.75 * np.sin(ph) + 0.20 * np.sin(2.0 * ph)) * whir_env
        air = fft_eq(pink_noise(n), hp_hz=320.0, lp_hz=1750.0, hp_order=3, lp_order=3) * whir_env * 0.45
        out = 0.72 * latch + 0.42 * whir + air
    else:
        # Rising shoe-spin lock-in + damped bell-grip thrum
        f_whir = 185.0 + 165.0 * (1.0 - np.exp(-t * 7.5))
        ph = 2.0 * np.pi * np.cumsum(f_whir) / SR
        whir_env = (np.maximum(0.0, np.sin(np.pi * np.clip(u / 0.70, 0.0, 1.0))) ** 1.2) * (u < 0.70)
        whir = (0.75 * np.sin(ph) + 0.18 * np.sin(2.0 * ph)) * whir_env
        tl = np.maximum(0.0, t - 0.14)
        ml = (t >= 0.14).astype(np.float32)
        att_l = 0.5 * (1.0 - np.cos(np.pi * np.clip(tl / 0.010, 0.0, 1.0)))
        lock = ml * att_l * (
            0.65 * np.sin(2.0 * np.pi * 155.0 * tl) * np.exp(-tl * 13.0) +
            0.35 * np.sin(2.0 * np.pi * 310.0 * tl) * np.exp(-tl * 18.0)
        )
        air = fft_eq(pink_noise(n), hp_hz=240.0, lp_hz=1450.0, hp_order=3, lp_order=3) * whir_env * 0.35
        out = 0.42 * whir + 0.75 * lock + air

    out = fft_eq(out, hp_hz=65.0, lp_hz=3200.0, hp_order=2, lp_order=4)
    return norm_peak(smooth_fades(out, fade_in_ms=10.0, fade_out_ms=80.0), 1.0)


def make_brake_pump_pulse(pitch_hz=195.0, duration=0.22):
    """Soft, damped rhythmic front/rear brake lever pump pulse for Step 2."""
    n = int(duration * SR)
    t = np.linspace(0.0, duration, n, endpoint=False, dtype=np.float32)
    att = 0.5 * (1.0 - np.cos(np.pi * np.clip(t / 0.012, 0.0, 1.0)))
    f = pitch_hz * (1.0 - 0.25 * (1.0 - np.exp(-t * 22.0)))
    ph = 2.0 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * att * np.exp(-t * 20.0)
    air = fft_eq(pink_noise(n), hp_hz=320.0, lp_hz=1600.0, hp_order=3, lp_order=3)
    air *= (np.maximum(0.0, np.sin(np.pi * np.clip(t / 0.13, 0.0, 1.0))) ** 1.6) * (t < 0.13)
    out = 0.75 * body + 0.35 * norm_peak(air, 1.0)
    out = fft_eq(out, hp_hz=70.0, lp_hz=2600.0, hp_order=2, lp_order=3)
    return norm_peak(smooth_fades(out, fade_in_ms=8.0, fade_out_ms=45.0), 1.0)


def make_passing_doppler_breeze(duration=1.15, direction=1):
    """Silky passing-vehicle aerodynamic doppler breeze with smooth stereo sweep."""
    n = int(duration * SR)
    t = np.linspace(0.0, duration, n, endpoint=False, dtype=np.float32)
    u = t / duration

    # Bell-shaped aerodynamic pass envelope
    env = (np.maximum(0.0, np.sin(np.pi * u)) ** 2.1).astype(np.float32)

    # Low-mid tire & air body + higher breeze layer crossfading downward (doppler)
    p1 = fft_eq(pink_noise(n), hp_hz=85.0, lp_hz=520.0, hp_order=3, lp_order=3)
    p2 = fft_eq(pink_noise(n), hp_hz=260.0, lp_hz=1550.0, hp_order=3, lp_order=4)
    bright_env = (1.0 - 0.72 * (u ** 1.15)) * env
    body_env = (0.55 + 0.45 * np.sin(np.pi * u)) * env

    # Subtle doppler pitch-drop air tone
    f_dop = 285.0 * (1.0 - 0.48 * (0.5 - 0.5 * np.cos(np.pi * u)))
    ph = 2.0 * np.pi * np.cumsum(f_dop) / SR
    dop_tone = np.sin(ph) * env * 0.14

    mono = p1 * body_env * 0.75 + p2 * bright_env * 0.55 + dop_tone
    mono = fft_eq(mono, hp_hz=80.0, lp_hz=1850.0, hp_order=2, lp_order=4)

    pan = direction * (0.48 - 0.96 * u)
    theta = (pan + 1.0) * (np.pi / 4.0)
    stereo = np.stack([mono * np.cos(theta), mono * np.sin(theta)], axis=1).astype(np.float32)
    return norm_peak(smooth_fades(stereo, fade_in_ms=140.0, fade_out_ms=220.0), 1.0)


def make_grassy_gravel_stop(duration=4.00):
    """Organic grassy/gravel deceleration texture for S12 (62.5s - 66.5s)."""
    n = int(duration * SR)
    t = np.linspace(0.0, duration, n, endpoint=False, dtype=np.float32)
    u = t / duration

    # Deceleration curve: strong entry as bike steers onto shoulder, gently stops by ~85% of clip
    decel = np.clip(1.0 - (u / 0.88) ** 1.35, 0.0, 1.0)
    att = 0.5 * (1.0 - np.cos(np.pi * np.clip(t / 0.35, 0.0, 1.0)))
    master_env = (decel ** 1.1) * att

    # Layer 1: Soft low earth/tire-on-gravel rolling rumble
    rumble = fft_eq(pink_noise(n), hp_hz=60.0, lp_hz=260.0, hp_order=2, lp_order=3) * master_env * 0.62

    # Layer 2: Soft grassy brush & leaf swish
    grass = fft_eq(
        pink_noise(n), hp_hz=720.0, lp_hz=2700.0, hp_order=3, lp_order=4,
        bell_hz=2000.0, bell_db=-3.0, bell_q=1.1
    ) * (master_env * (0.75 + 0.25 * np.sin(2.0 * np.pi * 1.4 * t))) * 0.38

    buf = make_stereo_bed(rumble + grass, width=0.40, low_mono_hz=180.0)

    # Layer 3: Decelerating individual gravel/pebble crunch grains (spacing widens as bike slows)
    grain_noise = fft_eq(pink_noise(n), hp_hz=380.0, lp_hz=2200.0, hp_order=3, lp_order=4)
    cursor_sec = 0.12
    while cursor_sec < duration * 0.86:
        progress = cursor_sec / (duration * 0.86)
        g_dur = float(rng.uniform(0.022, 0.055)) * (1.0 + 0.5 * progress)
        gn = int(g_dur * SR)
        idx0 = int(cursor_sec * SR)
        if idx0 + gn < n:
            g_env = np.hanning(gn).astype(np.float32)
            g_amp = float(rng.uniform(0.22, 0.55)) * (1.0 - progress * 0.82)
            grain = grain_noise[idx0:idx0 + gn] * g_env * g_amp
            pan = float(rng.uniform(-0.28, 0.12))  # Slightly left toward escape lane
            theta = (pan + 1.0) * (np.pi / 4.0)
            buf[idx0:idx0 + gn, 0] += grain * np.cos(theta)
            buf[idx0:idx0 + gn, 1] += grain * np.sin(theta)
        # Step interval increases as scooter decelerates
        cursor_sec += float(rng.uniform(0.018, 0.042)) * (1.0 + 3.2 * (progress ** 1.6))

    buf = fft_eq(buf, hp_hz=55.0, lp_hz=3100.0, hp_order=2, lp_order=3)
    return norm_peak(smooth_fades(buf, fade_in_ms=320.0, fade_out_ms=650.0), 1.0)


def make_outro_follow_click(duration=0.45):
    """Silky studio badge/follow button click + warm harmonic confirmation bloom."""
    n = int(duration * SR)
    t = np.linspace(0.0, duration, n, endpoint=False, dtype=np.float32)

    # 1. Soft-touch rounded cursor click (no sharp transient spike)
    att_c = 0.5 * (1.0 - np.cos(np.pi * np.clip(t / 0.0035, 0.0, 1.0)))
    f_click = 440.0 * np.exp(-t * 45.0) + 165.0
    ph_c = 2.0 * np.pi * np.cumsum(f_click) / SR
    click = np.sin(ph_c) * att_c * np.exp(-t * 58.0)

    # 2. Warm frosted confirmation chime bloom (D5 -> A5 gentle fifth)
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
# 4. COHESIVE DOWNHILL WIND & ROAD AMBIENCE BED (Synced to ep03.html roadSpeed)
# ==============================================================================
def build_downhill_ambience_bed(total_samples):
    t = np.arange(total_samples, dtype=np.float32) / SR
    # Piecewise roadSpeed & closeness profile matching ep03.html S01-S15
    kf_t = np.array([
        0.00, 4.60, 5.90, 9.55, 10.18,
        16.16, 17.20, 32.50, 33.00, 38.70,
        39.70, 43.80, 44.34, 48.45, 49.40,
        55.31, 56.20, 61.48, 62.35, 65.25,
        72.60, 75.31, 76.10, target_total_sec
    ], dtype=np.float32)
    kf_v = np.array([
        0.52, 0.52, 0.92, 0.92, 0.54,
        0.52, 0.34, 0.34, 0.45, 0.48,
        0.96, 0.96, 0.52, 0.52, 0.38,
        0.38, 0.30, 0.30, 0.28, 0.08,
        0.07, 0.06, 0.00, 0.00
    ], dtype=np.float32)
    speed_env = np.interp(t, kf_t, kf_v).astype(np.float32)
    # Smooth envelope corners with 120ms Hann window
    w = int(0.12 * SR) | 1
    win = np.hanning(w).astype(np.float32)
    win /= np.sum(win)
    speed_env = np.convolve(speed_env, win, mode="same").astype(np.float32)

    low_road = fft_eq(pink_noise(total_samples), hp_hz=72.0, lp_hz=260.0, hp_order=3, lp_order=3)
    wind_air = fft_eq(
        pink_noise(total_samples), hp_hz=190.0, lp_hz=1180.0, hp_order=3, lp_order=4,
        bell_hz=1950.0, bell_db=-3.5, bell_q=1.0
    )
    mono_bed = (0.45 * low_road + 0.65 * wind_air) * speed_env
    stereo_bed = make_stereo_bed(mono_bed, width=0.38, low_mono_hz=170.0)
    stereo_bed = smooth_fades(stereo_bed, fade_in_ms=80.0, fade_out_ms=120.0)
    return norm_peak(stereo_bed, 1.0)


# Pre-build reusable UI & texture clips
pill_523 = make_saas_pill_in(523.25)
pill_587 = make_saas_pill_in(587.33)
pill_659 = make_saas_pill_in(659.25)
pill_784 = make_saas_pill_in(783.99)
callout_out_520 = make_saas_callout_out(520.0)
callout_out_540 = make_saas_callout_out(540.0)
callout_out_587 = make_saas_callout_out(587.33)
callout_out_659 = make_saas_callout_out(659.25)
lever_ngempos = make_lever_ngempos_press(0.42)
cvt_disengage = make_cvt_clutch_event("disengage", 0.54)
cvt_engage = make_cvt_clutch_event("engage", 0.52)
pump_r = make_brake_pump_pulse(210.0, 0.22)
pump_l = make_brake_pump_pulse(185.0, 0.22)
doppler_lr = make_passing_doppler_breeze(1.15, direction=1)
doppler_rl = make_passing_doppler_breeze(1.10, direction=-1)
outro_click = make_outro_follow_click(0.45)

# Add cohesive downhill wind/ambience bed
ambience_bed = build_downhill_ambience_bed(target_total_samples)
add_stereo(ambience, 0.0, ambience_bed, gain_db=-24.5, pan=0.0)

# ==============================================================================
# 5. SCENE-LOCKED STUDIO SFX CHOREOGRAPHY (EP03 — 79.50s, OUTRO 75.31s)
# ==============================================================================

# S01 (0.00s - 4.65s): Hook Lockup + Mio Downhill Purr + Passing Car Breeze
add_stereo(sfx, 0.02, puck_whoosh_thump, gain_db=-18.5)
add_stereo(sfx, 0.06, pill_523, gain_db=-17.2)
add_stereo(sfx, 0.16, puck_step_pop, gain_db=-19.0)
add_stereo(sfx, 0.30, make_scooter_hum(4.25, 66.0, 82.0), gain_db=-24.5, pan=-0.06)
add_stereo(sfx, 1.85, doppler_lr, gain_db=-25.5)
add_stereo(sfx, 4.25, callout_out_520, gain_db=-22.0)

# S02 (4.65s - 10.18s): Engine Off Acceleration + Passing Car Breeze
add_stereo(sfx, 4.65, puck_air_whoosh, gain_db=-18.0)
add_stereo(sfx, 5.20, puck_mech_snap, gain_db=-18.2, pan=0.08)
add_stereo(sfx, 5.75, make_saas_callout_pop(650.0), gain_db=-17.2, pan=-0.10)
add_stereo(sfx, 7.20, doppler_rl, gain_db=-25.0)
add_stereo(sfx, 9.75, callout_out_540, gain_db=-22.5)

# S03 (10.18s - 16.16s): Continuous Brake Hold -> Sudden Lever Bottoms Out at 13.45s
add_stereo(sfx, 10.18, puck_whoosh_thump, gain_db=-18.0)
add_stereo(sfx, 11.20, make_disc_heat_shimmer(3.4), gain_db=-25.5, pan=0.08)
add_stereo(sfx, 13.45, lever_ngempos, gain_db=-18.5, pan=0.10)
add_stereo(sfx, 13.62, make_saas_callout_pop(620.0), gain_db=-17.4, pan=0.10)
add_stereo(sfx, 15.75, callout_out_520, gain_db=-22.5)

# S04 (16.16s - 22.30s): Disc Overheat 300C+ Shimmer
add_stereo(sfx, 16.16, puck_air_whoosh, gain_db=-17.8)
add_stereo(sfx, 16.35, pill_587, gain_db=-17.5)
add_stereo(sfx, 17.35, make_disc_heat_shimmer(4.5), gain_db=-22.8, pan=-0.06)
add_stereo(sfx, 17.65, make_saas_callout_pop(698.46), gain_db=-17.0, pan=-0.12)
add_stereo(sfx, 21.90, callout_out_540, gain_db=-22.5)

# S05 (22.30s - 27.17s): Heat Transfers to Caliper & Brake Fluid Begins Simmering
add_stereo(sfx, 22.30, puck_whoosh_thump, gain_db=-18.2)
add_stereo(sfx, 23.85, make_saas_callout_pop(650.0), gain_db=-17.2, pan=0.10)
add_stereo(sfx, 24.30, make_vapor_boil(2.7), gain_db=-23.0, pan=0.04)
add_stereo(sfx, 26.80, callout_out_520, gain_db=-22.5)

# S06 (27.17s - 33.00s): Beat 6A Vapor Lock Bubbles -> Beat 6B Brake Lever Ngempos at 29.75s
add_stereo(sfx, 27.17, puck_air_whoosh, gain_db=-18.0)
add_stereo(sfx, 27.30, pill_659, gain_db=-17.5)
add_stereo(sfx, 27.32, make_vapor_boil(2.65), gain_db=-19.5)
add_stereo(sfx, 27.45, make_saas_callout_pop(720.0), gain_db=-17.0, pan=-0.10)
# Beat 6B (29.75s): Whip-tilt to Right Brake Lever squeezing repeatedly with zero resistance ("ngempos")
add_stereo(sfx, 29.75, puck_air_whoosh, gain_db=-19.8, pan=-0.08)
add_stereo(sfx, 29.75, lever_ngempos, gain_db=-17.2, pan=0.10)
add_stereo(sfx, 30.34, lever_ngempos, gain_db=-19.0, pan=0.10)
add_stereo(sfx, 30.92, lever_ngempos, gain_db=-19.6, pan=0.10)
add_stereo(sfx, 31.50, lever_ngempos, gain_db=-20.4, pan=0.10)
add_stereo(sfx, 32.55, callout_out_540, gain_db=-22.2)

# S07 (33.00s - 38.72s): CVT Centrifugal Clutch Disengages at 34.80s
add_stereo(sfx, 33.00, puck_whoosh_thump, gain_db=-17.8)
add_stereo(sfx, 34.80, cvt_disengage, gain_db=-17.0, pan=-0.10)
add_stereo(sfx, 34.95, make_saas_callout_pop(700.0), gain_db=-17.2, pan=-0.12)
add_stereo(sfx, 38.35, callout_out_540, gain_db=-22.2)

# S08 (38.72s - 44.34s): 0% Engine Brake Freewheel + Passing Vehicle Doppler Breeze
add_stereo(sfx, 38.72, puck_air_whoosh, gain_db=-18.0)
add_stereo(sfx, 38.80, pill_659, gain_db=-17.5)
add_stereo(sfx, 39.05, make_saas_callout_pop(740.0), gain_db=-17.0, pan=0.10)
add_stereo(sfx, 41.15, doppler_lr, gain_db=-24.5)
add_stereo(sfx, 43.80, callout_out_540, gain_db=-22.2)

# S09 (44.34s - 48.45s): Calm Transition to 3 Safety Steps
add_stereo(sfx, 44.34, puck_whoosh_thump, gain_db=-18.0)
add_stereo(sfx, 45.85, doppler_rl, gain_db=-26.0)

# S10 (48.45s - 55.31s): Step 1 Keep Engine On + CVT Clutch Engages at 51.80s
add_stereo(sfx, 48.42, puck_air_whoosh, gain_db=-18.0)
add_stereo(sfx, 48.45, pill_587, gain_db=-16.8)
add_stereo(sfx, 48.48, puck_step_pop, gain_db=-18.8)
add_stereo(sfx, 49.40, make_scooter_hum(5.4, 76.0, 58.0), gain_db=-24.2)
add_stereo(sfx, 51.80, cvt_engage, gain_db=-17.2, pan=0.08)
add_stereo(sfx, 51.95, make_saas_callout_pop(698.46), gain_db=-17.2, pan=0.12)
add_stereo(sfx, 54.90, callout_out_520, gain_db=-22.2)

# S11 (55.31s - 61.48s): Step 2 Alternate Front & Rear Brake Lever Pumping
add_stereo(sfx, 55.28, puck_whoosh_thump, gain_db=-18.0)
add_stereo(sfx, 55.31, pill_659, gain_db=-16.8)
add_stereo(sfx, 55.35, puck_step_pop, gain_db=-18.8)
for k in range(7):
    t_pump = 56.10 + k * 0.66
    is_right = (k % 2 == 0)
    add_stereo(sfx, t_pump, pump_r if is_right else pump_l, gain_db=-20.5, pan=(-0.14 if is_right else 0.14))
add_stereo(sfx, 61.05, callout_out_587, gain_db=-22.2)

# S12 (61.48s - 67.44s): Step 3 Steer to Escape Ramp / Grassy Shoulder + Braking Stop (62.5s - 66.5s)
add_stereo(sfx, 61.45, puck_air_whoosh, gain_db=-17.8)
add_stereo(sfx, 61.48, pill_784, gain_db=-16.6)
add_stereo(sfx, 61.52, puck_step_pop, gain_db=-18.8)
add_stereo(sfx, 62.50, make_grassy_gravel_stop(4.00), gain_db=-19.2)
add_stereo(sfx, 63.10, make_saas_callout_pop(820.0), gain_db=-17.2, pan=-0.12)
add_stereo(sfx, 67.05, callout_out_659, gain_db=-22.0)

# S13 (67.44s - 72.62s): Contrast Payoff (Parked Caliper Breakdown)
add_stereo(sfx, 67.44, puck_whoosh_thump, gain_db=-18.2)
add_stereo(sfx, 67.85, make_saas_callout_pop(680.0), gain_db=-17.6, pan=-0.08)
add_stereo(sfx, 68.20, make_vapor_boil(2.4), gain_db=-26.5, pan=-0.06)
add_stereo(sfx, 72.10, callout_out_540, gain_db=-22.5)

# S14 (72.62s - 75.31s): Sign-Off
add_stereo(sfx, 72.62, puck_air_whoosh, gain_db=-18.2)
add_stereo(sfx, 72.82, puck_step_pop, gain_db=-19.2)

# S15 (75.31s - 79.50s): Outro CTA + Silky Badge / Follow Click
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
    """Lookahead asymmetric attack/release envelope follower for transparent VO ducking."""
    n = len(vo_stereo)
    mono_abs = 0.5 * (np.abs(vo_stereo[:, 0]) + np.abs(vo_stereo[:, 1]))

    # Smooth detector + lookahead shift, decimated to 1 kHz (48-sample blocks) for instant execution
    pre = moving_rms(mono_abs, ms=22.0)
    la_samples = int(lookahead_ms * 0.001 * SR)
    if la_samples > 0 and la_samples < n:
        pre_la = np.concatenate([pre[la_samples:], np.zeros(la_samples, dtype=np.float32)])
        det_in = np.maximum(pre, pre_la)
    else:
        det_in = pre

    step = 48  # 1 kHz control rate
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

    # Soft-knee compression curve
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

# Soft-knee safety limiter ceiling at -1.0 dBFS (~0.891) so true peak stays cleanly < -0.5 dBTP
ceiling = 0.89
peak = float(np.max(np.abs(master)))
if peak > ceiling:
    # Gentle soft-clip knee only above 0.80, preserving transients smoothly
    thresh_lim = 0.80
    over = np.maximum(0.0, np.abs(master) - thresh_lim)
    headroom = ceiling - thresh_lim
    compressed = thresh_lim + headroom * np.tanh(over / max(headroom, 1e-6))
    master = np.where(np.abs(master) > thresh_lim, np.sign(master) * compressed, master)

# Final safety fade-in/out at boundaries
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
    f"Built 48kHz EP03 studio master audio: {out_wav} "
    f"(outro_start_sec={outro_start_sec:.3f}s, total={target_total_sec:.2f}s, peak={np.max(np.abs(master)):.4f})"
)
