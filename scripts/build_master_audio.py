import os
import sys
from pathlib import Path
import numpy as np
import subprocess
import wave

# Portable Paths
ROOT = Path(__file__).resolve().parent.parent
vo_mp3 = ROOT / "vo_ep01.mp3"
vo_wav = ROOT / "temp_vo_48k.wav"
out_wav = ROOT / "audio_ep01_master.wav"
out_mp3 = ROOT / "audio_ep01_master.mp3"
puck_dir = ROOT / "sfx_puckermane"

# Studio Video Broadcast Standard Sample Rate (48 kHz)
SR = 48000

print(f"Loading VO from: {vo_mp3}")
subprocess.run([
    "ffmpeg", "-y", "-i", str(vo_mp3),
    "-ar", str(SR), "-ac", "2", "-c:a", "pcm_s16le", str(vo_wav)
], check=True, stderr=subprocess.DEVNULL)

with wave.open(str(vo_wav), "rb") as wf:
    n_frames = wf.getnframes()
    raw = wf.readframes(n_frames)
    vo = np.frombuffer(raw, dtype=np.int16).astype(np.float32).reshape(-1, 2) / 32768.0

if vo_wav.exists():
    try:
        vo_wav.unlink()
    except Exception:
        pass

# Normalize VO to -1.1 dBFS peak for broadcast clarity
vo_peak = np.max(np.abs(vo))
if vo_peak > 0:
    vo = vo * (0.88 / vo_peak)

sfx = np.zeros_like(vo)
rng = np.random.default_rng(42)

def load_wav_mono_48k(path, max_dur=None):
    tmp = ROOT / f"temp_{path.stem}_48k.wav"
    subprocess.run([
        "ffmpeg", "-y", "-i", str(path),
        "-ar", str(SR), "-ac", "1", "-c:a", "pcm_s16le", str(tmp)
    ], check=True, stderr=subprocess.DEVNULL)
    with wave.open(str(tmp), "rb") as wf:
        n = wf.getnframes()
        x = np.frombuffer(wf.readframes(n), dtype=np.int16).astype(np.float32) / 32768.0
    if tmp.exists():
        try:
            tmp.unlink()
        except Exception:
            pass
    if max_dur is not None:
        m = min(len(x), int(max_dur * SR))
        x = x[:m].copy()
        fo = min(int(0.06 * SR), len(x) // 2)
        x[-fo:] *= 0.5 * (1.0 + np.cos(np.linspace(0, np.pi, fo))).astype(np.float32)
    pk = np.max(np.abs(x)) + 1e-6
    return x / pk

# Load authentic cleaned @puckermanefacts SFX samples resampled to 48kHz
puck_whoosh_thump = load_wav_mono_48k(puck_dir / "puck_whoosh_thump.wav", 0.33)
puck_air_whoosh   = load_wav_mono_48k(puck_dir / "puck_air_whoosh.wav", 0.31)
puck_step_pop     = load_wav_mono_48k(puck_dir / "puck_step_pop.wav", 0.23)
puck_mech_snap    = load_wav_mono_48k(puck_dir / "puck_mech_snap.wav", 0.34)
puck_heavy_thud   = load_wav_mono_48k(puck_dir / "puck_heavy_thud.wav", 0.38)

def add_stereo(buf, start_sec, sig_l, sig_r=None, gain_db=-19.0, pan=0.0):
    if sig_r is None:
        sig_r = sig_l.copy()
    idx0 = int(start_sec * SR)
    if idx0 >= len(buf) or idx0 < 0:
        return
    n = min(len(sig_l), len(buf) - idx0)
    if n <= 0:
        return
    amp = 10.0 ** (gain_db / 20.0)
    gl = amp * np.sqrt(0.5 * (1.0 - pan))
    gr = amp * np.sqrt(0.5 * (1.0 + pan))
    buf[idx0:idx0+n, 0] += sig_l[:n] * gl
    buf[idx0:idx0+n, 1] += sig_r[:n] * gr

def one_pole_lp(x, cutoff_hz):
    rc = 1.0 / (2.0 * np.pi * max(20.0, cutoff_hz))
    dt = 1.0 / SR
    alpha = dt / (rc + dt)
    y = np.zeros_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc += alpha * (x[i] - acc)
        y[i] = acc
    return y

def one_pole_hp(x, cutoff_hz):
    return x - one_pole_lp(x, cutoff_hz)

def make_ui_tick(freq=620.0, duration=0.075):
    n = int(duration * SR)
    t = np.linspace(0, duration, n, endpoint=False)
    f = freq * (1.0 + 0.35 * np.exp(-t * 65.0))
    phase = 2 * np.pi * np.cumsum(f) / SR
    env = np.exp(-t * 42.0) * np.minimum(1.0, t / 0.0025)
    out = np.sin(phase) * env
    return (out / (np.max(np.abs(out)) + 1e-6)).astype(np.float32)

def make_saas_pill_in(base_freq=540.0, duration=0.22):
    """Studio SaaS Motion Graphic Frosted-Glass Pill Entrance (Velvet Air Glide + Dual Harmonic Pluck)"""
    n = int(duration * SR)
    t = np.linspace(0, duration, n, endpoint=False)
    # 1. Silky band-passed air glide on entrance (first 95ms)
    air = rng.standard_normal(n).astype(np.float32)
    air = one_pole_lp(one_pole_hp(air, 480.0), 2200.0)
    air_env = np.sin(np.pi * np.clip(t / 0.095, 0.0, 1.0)) ** 1.6 * (t < 0.095)
    air_sig = air * air_env / (np.max(np.abs(air * air_env)) + 1e-6)
    # 2. Note 1: Warm glass marimba fundamental + octave harmonic
    env1 = np.exp(-t * 28.0) * (np.minimum(1.0, t / 0.0022) ** 2)
    f1 = base_freq * (1.0 + 0.18 * np.exp(-t * 90.0))
    p1 = 2 * np.pi * np.cumsum(f1) / SR
    tone1 = (np.sin(p1) + 0.28 * np.sin(2.0 * p1) * np.exp(-t * 45.0)) * env1
    # 3. Note 2: Perfect-fifth shimmer 32ms later (signature SaaS UI lock-in)
    t2 = np.maximum(0.0, t - 0.032)
    mask2 = (t >= 0.032).astype(np.float32)
    env2 = mask2 * np.exp(-t2 * 24.0) * (np.minimum(1.0, t2 / 0.0022) ** 2)
    f2 = (base_freq * 1.498) * (1.0 + 0.12 * np.exp(-t2 * 95.0))
    p2 = 2 * np.pi * np.cumsum(f2) / SR
    tone2 = (np.sin(p2) + 0.22 * np.sin(2.0 * p2) * np.exp(-t2 * 50.0)) * env2
    out = 0.26 * air_sig + 0.72 * tone1 + 0.85 * tone2
    return (out / (np.max(np.abs(out)) + 1e-6)).astype(np.float32)

def make_saas_callout_pop(freq=680.0, duration=0.14):
    """Tactile SaaS Callout Line-Draw Tick + Frosted Badge Spring Pop"""
    n = int(duration * SR)
    t = np.linspace(0, duration, n, endpoint=False)
    # Subtle SVG anchor dot & line draw tick at t=0
    tick_env = np.exp(-t * 140.0) * np.minimum(1.0, t / 0.0012)
    tick = np.sin(2 * np.pi * 1750.0 * t) * tick_env
    # Upward pitch-chirp glass bubble pop at t=24ms (as badge scales with easeOutBack)
    tp = np.maximum(0.0, t - 0.024)
    mp = (t >= 0.024).astype(np.float32)
    f_chirp = freq * (0.78 + 0.44 * (1.0 - np.exp(-tp * 85.0)))
    phase = 2 * np.pi * np.cumsum(f_chirp) / SR
    pop_env = mp * np.exp(-tp * 34.0) * (np.minimum(1.0, tp / 0.002) ** 2)
    pop = (np.sin(phase) + 0.30 * np.sin(2.0 * phase) * np.exp(-tp * 55.0)) * pop_env
    out = 0.38 * tick + 0.92 * pop
    return (out / (np.max(np.abs(out)) + 1e-6)).astype(np.float32)

def make_saas_callout_out(freq=520.0, duration=0.085):
    """Soft Downward Glass Dismiss Micro-Pop on Overlay Exit"""
    n = int(duration * SR)
    t = np.linspace(0, duration, n, endpoint=False)
    f = freq * (1.0 - 0.26 * (1.0 - np.exp(-t * 70.0)))
    phase = 2 * np.pi * np.cumsum(f) / SR
    env = np.exp(-t * 46.0) * (np.minimum(1.0, t / 0.002) ** 2)
    out = np.sin(phase) * env
    return (out / (np.max(np.abs(out)) + 1e-6)).astype(np.float32)

def make_switch_click():
    n = int(0.085 * SR)
    t = np.linspace(0, 0.085, n, endpoint=False)
    click1 = np.exp(-t * 180.0) * np.sin(2 * np.pi * 2400.0 * t)
    click1 += 0.6 * np.exp(-t * 95.0) * np.sin(2 * np.pi * 820.0 * t)
    t2 = np.maximum(0.0, t - 0.018)
    mask2 = (t >= 0.018).astype(np.float32)
    click2 = mask2 * np.exp(-t2 * 150.0) * np.sin(2 * np.pi * 1850.0 * t2)
    out = click1 + 0.75 * click2
    return (out / (np.max(np.abs(out)) + 1e-6)).astype(np.float32)

def make_electric_spark(duration=0.58):
    n = int(duration * SR)
    t = np.linspace(0, duration, n, endpoint=False)
    buzz = np.sin(2 * np.pi * 100.0 * t) + 0.5 * np.sin(2 * np.pi * 200.0 * t)
    crackle = rng.standard_normal(n).astype(np.float32)
    gates = (rng.random(n) > 0.965).astype(np.float32)
    gates = one_pole_lp(gates, 120.0) * 14.0
    hp_crackle = one_pole_hp(crackle, 2400.0) * gates
    env = np.exp(-t * 3.2) * np.minimum(1.0, t / 0.005)
    out = (0.28 * buzz + 0.85 * hp_crackle) * env
    return (out / (np.max(np.abs(out)) + 1e-6)).astype(np.float32)

def make_gas_hiss(duration=2.8):
    n = int(duration * SR)
    t = np.linspace(0, duration, n, endpoint=False)
    noise = rng.standard_normal(n).astype(np.float32)
    hiss = one_pole_lp(one_pole_hp(noise, 1400.0), 4600.0)
    env = np.minimum(1.0, t / 0.4) * np.minimum(1.0, (duration - t) / 0.5)
    out = hiss * env
    return (out / (np.max(np.abs(out)) + 1e-6)).astype(np.float32)

def make_breeze_whoosh(duration=2.4):
    n = int(duration * SR)
    t = np.linspace(0, duration, n, endpoint=False)
    noiseL = one_pole_lp(one_pole_hp(rng.standard_normal(n).astype(np.float32), 260.0), 1500.0)
    noiseR = one_pole_lp(one_pole_hp(rng.standard_normal(n).astype(np.float32), 260.0), 1500.0)
    env = np.sin(np.pi * (t / duration)) ** 1.3
    return ((noiseL * env / (np.max(np.abs(noiseL)) + 1e-6)).astype(np.float32),
            (noiseR * env / (np.max(np.abs(noiseR)) + 1e-6)).astype(np.float32))

# ==============================================================================
# STUDIO FOLEY, @puckermanefacts SFX & SAAS MOTION OVERLAY UI CHOREOGRAPHY
# ==============================================================================

# S01 (0.00s - 3.60s): Hook Title Lockup & SaaS Pill Entrance ("BAU GAS BOCOR? / JANGAN SENTUH SAKLAR!")
add_stereo(sfx, 0.02, puck_whoosh_thump, gain_db=-17.5)
add_stereo(sfx, 0.06, make_saas_pill_in(523.25), gain_db=-16.2)
add_stereo(sfx, 0.16, puck_step_pop, gain_db=-18.0)
add_stereo(sfx, 3.34, make_saas_callout_out(520.0), gain_db=-21.0)

# S02 (3.60s - 7.55s): Camera Push-In + Switch Spark + Callout ("pemicu ledakan")
add_stereo(sfx, 3.60, puck_air_whoosh, gain_db=-17.2)
add_stereo(sfx, 4.42, make_switch_click(), gain_db=-17.5, pan=0.15)
add_stereo(sfx, 5.45, make_saas_callout_pop(660.0), gain_db=-16.4, pan=0.12)
add_stereo(sfx, 5.48, puck_heavy_thud, gain_db=-17.2)
add_stereo(sfx, 5.52, make_electric_spark(0.45), gain_db=-19.2, pan=0.15)
add_stereo(sfx, 7.05, make_saas_callout_out(540.0), gain_db=-21.5, pan=0.10)

# S03 (7.55s - 12.42s): Dark Kitchen + Gas Leak Hiss + Reflex Switch Press
add_stereo(sfx, 7.55, puck_whoosh_thump, gain_db=-17.0)
add_stereo(sfx, 8.65, make_gas_hiss(2.4), gain_db=-24.8, pan=0.14)
add_stereo(sfx, 9.95, puck_air_whoosh, gain_db=-18.8)
add_stereo(sfx, 11.24, make_switch_click(), gain_db=-16.2, pan=0.20)
add_stereo(sfx, 11.30, make_electric_spark(0.32), gain_db=-19.0, pan=0.20)

# S04 (12.42s - 16.03s): Macro Zoom into Switch + Cutaway Cover + Callout ("2 lempeng tembaga")
add_stereo(sfx, 12.42, puck_air_whoosh, gain_db=-16.8)
add_stereo(sfx, 12.56, make_saas_callout_pop(698.46), gain_db=-16.2, pan=-0.12)
add_stereo(sfx, 12.66, puck_mech_snap, gain_db=-18.0, pan=0.12)
add_stereo(sfx, 15.65, make_saas_callout_out(540.0), gain_db=-21.5, pan=-0.10)

# S05 (16.03s - 21.40s): Copper Plates Collide + 1.000°C Spark Burst + Callout ("percikan 1.000°C")
add_stereo(sfx, 17.12, make_switch_click(), gain_db=-16.8, pan=0.10)
add_stereo(sfx, 17.15, puck_mech_snap, gain_db=-17.8, pan=0.10)
add_stereo(sfx, 17.18, make_electric_spark(0.75), gain_db=-17.2, pan=0.12)
add_stereo(sfx, 17.20, make_saas_callout_pop(740.0), gain_db=-16.0, pan=-0.10)
add_stereo(sfx, 20.88, make_saas_callout_out(560.0), gain_db=-21.2, pan=-0.10)

# S06 (21.40s - 25.20s): Isometric High-Angle + Callout ("mengendap di lantai")
add_stereo(sfx, 21.40, puck_whoosh_thump, gain_db=-16.8)
add_stereo(sfx, 21.55, make_saas_callout_pop(622.25), gain_db=-16.2, pan=0.08)
add_stereo(sfx, 24.80, make_saas_callout_out(493.88), gain_db=-21.5, pan=0.08)

# S07 (25.20s - 30.90s): Gas Pools on Floor & Rises to Switch Level + Callout ("naik ke saklar")
add_stereo(sfx, 25.35, puck_air_whoosh, gain_db=-17.2)
add_stereo(sfx, 25.55, make_gas_hiss(2.8), gain_db=-24.5, pan=0.10)
add_stereo(sfx, 27.60, make_saas_callout_pop(680.0), gain_db=-16.2, pan=-0.08)
add_stereo(sfx, 30.45, make_saas_callout_out(523.25), gain_db=-21.5, pan=-0.08)

# S08 (30.90s - 36.62s): Switch Toggled ON & OFF -> Ignites Gas + Callout ("menyambar gas")
add_stereo(sfx, 30.90, puck_whoosh_thump, gain_db=-17.2)
add_stereo(sfx, 31.05, make_saas_callout_pop(720.0), gain_db=-16.4, pan=-0.10)
add_stereo(sfx, 31.65, make_switch_click(), gain_db=-16.8, pan=0.15)
add_stereo(sfx, 31.70, make_electric_spark(0.35), gain_db=-18.8, pan=0.15)
add_stereo(sfx, 32.55, make_switch_click(), gain_db=-16.8, pan=0.15)
add_stereo(sfx, 32.60, make_electric_spark(0.58), gain_db=-17.8, pan=0.15)
add_stereo(sfx, 33.85, puck_heavy_thud, gain_db=-17.5)
add_stereo(sfx, 36.15, make_saas_callout_out(540.0), gain_db=-21.5)

# S09 (36.62s - 39.65s): Transition to 3 Safety Steps
add_stereo(sfx, 36.62, puck_whoosh_thump, gain_db=-17.0)

# S10 (39.65s - 43.63s): Step 1 Header Pill ("1 Jangan sentuh saklar") + Callout ("jangan disentuh")
add_stereo(sfx, 39.62, puck_air_whoosh, gain_db=-17.0)
add_stereo(sfx, 39.65, make_saas_pill_in(587.33), gain_db=-15.8)
add_stereo(sfx, 39.68, puck_step_pop, gain_db=-17.8)
add_stereo(sfx, 40.02, make_saas_callout_pop(698.46), gain_db=-16.2, pan=0.12)
add_stereo(sfx, 43.25, make_saas_callout_out(523.25), gain_db=-21.2)

# S11 (43.63s - 47.46s): Step 2 Header Pill ("2 Lepas regulator gas") + Callout ("lepas regulator")
add_stereo(sfx, 43.60, puck_whoosh_thump, gain_db=-17.0)
add_stereo(sfx, 43.63, make_saas_pill_in(659.25), gain_db=-15.8)
add_stereo(sfx, 43.66, puck_step_pop, gain_db=-17.8)
add_stereo(sfx, 44.85, puck_mech_snap, gain_db=-16.2, pan=0.12)
add_stereo(sfx, 44.90, make_saas_callout_pop(783.99), gain_db=-16.0, pan=0.10)
add_stereo(sfx, 47.15, make_saas_callout_out(587.33), gain_db=-21.2)

# S12 (47.46s - 52.83s): Step 3 Header Pill ("3 Buka pintu & jendela") + Callout ("pintu & jendela dibuka")
add_stereo(sfx, 47.44, puck_air_whoosh, gain_db=-16.8)
add_stereo(sfx, 47.46, make_saas_pill_in(783.99), gain_db=-15.6)
add_stereo(sfx, 47.50, puck_step_pop, gain_db=-17.8)
add_stereo(sfx, 47.68, puck_mech_snap, gain_db=-18.4, pan=-0.22)
add_stereo(sfx, 47.82, make_saas_callout_pop(880.0), gain_db=-16.0, pan=-0.15)
bL, bR = make_breeze_whoosh(2.4)
add_stereo(sfx, 48.55, bL, bR, gain_db=-21.2)
add_stereo(sfx, 52.45, make_saas_callout_out(659.25), gain_db=-21.0)

# S13 (52.83s - 57.38s): Summary Takeaway
add_stereo(sfx, 52.80, puck_whoosh_thump, gain_db=-17.2)

# S14 (57.38s - 59.56s): Sign-Off ("Jadi... jangan panik dulu.")
add_stereo(sfx, 57.35, puck_air_whoosh, gain_db=-17.2)
add_stereo(sfx, 57.62, puck_step_pop, gain_db=-18.2)
add_stereo(sfx, 58.24, make_saas_pill_in(587.33), gain_db=-17.5)

# Smooth Sidechain Envelope Ducking (keeps VO crystal clear above foley)
vo_mono = 0.5 * (np.abs(vo[:, 0]) + np.abs(vo[:, 1]))
win = int(0.040 * SR)
kernel = np.ones(win, dtype=np.float32) / win
vo_env = np.convolve(vo_mono, kernel, mode="same")
duck_gain = 1.0 - 0.32 * np.minimum(1.0, vo_env / 0.11)
sfx[:, 0] *= duck_gain
sfx[:, 1] *= duck_gain

master = vo + sfx
peak = np.max(np.abs(master))
if peak > 0.96:
    master = master * (0.96 / peak)

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

print("Updated 48kHz studio master audio with authentic @puckermanefacts SFX:", out_wav)
