import os
import sys
from pathlib import Path
import numpy as np
import subprocess
import wave

# Portable Paths
ROOT = Path(__file__).resolve().parent.parent
vo_mp3 = ROOT / "vo_ep01.mp3"
vo_wav = ROOT / "temp_vo_44k.wav"
out_wav = ROOT / "audio_ep01_master.wav"
out_mp3 = ROOT / "audio_ep01_master.mp3"
puck_dir = ROOT / "sfx_puckermane"

SR = 44100

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

vo_peak = np.max(np.abs(vo))
if vo_peak > 0:
    vo = vo * (0.88 / vo_peak)

sfx = np.zeros_like(vo)
rng = np.random.default_rng(42)

def load_wav_mono(path, max_dur=None):
    with wave.open(str(path), "rb") as wf:
        n = wf.getnframes()
        x = np.frombuffer(wf.readframes(n), dtype=np.int16).astype(np.float32) / 32768.0
    if max_dur is not None:
        m = min(len(x), int(max_dur * SR))
        x = x[:m].copy()
        fo = min(int(0.06 * SR), len(x) // 2)
        x[-fo:] *= 0.5 * (1.0 + np.cos(np.linspace(0, np.pi, fo))).astype(np.float32)
    pk = np.max(np.abs(x)) + 1e-6
    return x / pk

# Load authentic cleaned @puckermanefacts SFX samples
puck_whoosh_thump = load_wav_mono(puck_dir / "puck_whoosh_thump.wav", 0.33)
puck_air_whoosh   = load_wav_mono(puck_dir / "puck_air_whoosh.wav", 0.31)
puck_step_pop     = load_wav_mono(puck_dir / "puck_step_pop.wav", 0.23)
puck_mech_snap    = load_wav_mono(puck_dir / "puck_mech_snap.wav", 0.34)
puck_heavy_thud   = load_wav_mono(puck_dir / "puck_heavy_thud.wav", 0.38)

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

# Mixing authentic @puckermanefacts clean SFX + contextual foley
add_stereo(sfx, 0.03, puck_whoosh_thump, gain_db=-17.5)
add_stereo(sfx, 0.16, puck_step_pop, gain_db=-18.5)

add_stereo(sfx, 3.55, puck_air_whoosh, gain_db=-17.0)
add_stereo(sfx, 4.45, make_switch_click(), gain_db=-17.5, pan=0.15)
add_stereo(sfx, 5.52, make_ui_tick(660.0), gain_db=-20.0, pan=0.12)
add_stereo(sfx, 5.62, puck_heavy_thud, gain_db=-17.5)
add_stereo(sfx, 5.66, make_electric_spark(0.42), gain_db=-20.0, pan=0.15)

add_stereo(sfx, 7.18, puck_whoosh_thump, gain_db=-17.0)
add_stereo(sfx, 8.85, make_gas_hiss(2.4), gain_db=-25.0, pan=-0.12)
add_stereo(sfx, 11.30, make_switch_click(), gain_db=-16.5, pan=0.20)

add_stereo(sfx, 12.12, puck_air_whoosh, gain_db=-16.8)
add_stereo(sfx, 12.44, puck_step_pop, gain_db=-18.5)
add_stereo(sfx, 13.05, make_ui_tick(680.0), gain_db=-19.5, pan=-0.12)

add_stereo(sfx, 15.68, puck_mech_snap, gain_db=-17.5)
add_stereo(sfx, 17.20, make_switch_click(), gain_db=-17.5, pan=0.15)
add_stereo(sfx, 17.78, make_electric_spark(0.75), gain_db=-17.8, pan=0.15)

add_stereo(sfx, 21.02, puck_whoosh_thump, gain_db=-16.8)
add_stereo(sfx, 21.42, puck_step_pop, gain_db=-18.5)
add_stereo(sfx, 22.05, make_ui_tick(580.0), gain_db=-20.0)

add_stereo(sfx, 24.86, puck_air_whoosh, gain_db=-17.2)
add_stereo(sfx, 25.45, make_gas_hiss(2.8), gain_db=-25.0, pan=-0.1)
add_stereo(sfx, 28.05, puck_air_whoosh, gain_db=-18.0)

add_stereo(sfx, 30.55, puck_whoosh_thump, gain_db=-17.2)
add_stereo(sfx, 31.65, make_switch_click(), gain_db=-17.5, pan=0.15)
add_stereo(sfx, 32.55, make_switch_click(), gain_db=-17.5, pan=0.15)
add_stereo(sfx, 33.35, make_electric_spark(0.58), gain_db=-18.2, pan=0.15)
add_stereo(sfx, 34.50, puck_heavy_thud, gain_db=-18.0)

add_stereo(sfx, 36.30, puck_whoosh_thump, gain_db=-16.8)
add_stereo(sfx, 36.64, puck_step_pop, gain_db=-18.0)

add_stereo(sfx, 39.32, puck_air_whoosh, gain_db=-17.0)
add_stereo(sfx, 39.66, puck_step_pop, gain_db=-18.0)
add_stereo(sfx, 40.25, make_ui_tick(660.0), gain_db=-19.5)

add_stereo(sfx, 43.30, puck_whoosh_thump, gain_db=-17.0)
add_stereo(sfx, 43.65, puck_step_pop, gain_db=-18.0)
add_stereo(sfx, 44.82, puck_mech_snap, gain_db=-16.5, pan=0.12)
add_stereo(sfx, 45.10, make_ui_tick(700.0), gain_db=-19.5)

add_stereo(sfx, 47.15, puck_air_whoosh, gain_db=-16.8)
add_stereo(sfx, 47.48, puck_step_pop, gain_db=-18.0)
add_stereo(sfx, 48.20, make_ui_tick(720.0), gain_db=-19.5, pan=-0.15)
bL, bR = make_breeze_whoosh(2.4)
add_stereo(sfx, 48.75, bL, bR, gain_db=-21.5)

add_stereo(sfx, 52.48, puck_whoosh_thump, gain_db=-17.2)

add_stereo(sfx, 57.05, puck_air_whoosh, gain_db=-17.0)
add_stereo(sfx, 57.40, puck_step_pop, gain_db=-18.0)

vo_mono = 0.5 * (np.abs(vo[:, 0]) + np.abs(vo[:, 1]))
win = int(0.035 * SR)
kernel = np.ones(win, dtype=np.float32) / win
vo_env = np.convolve(vo_mono, kernel, mode="same")
duck_gain = 1.0 - 0.30 * np.minimum(1.0, vo_env / 0.12)
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
    "-c:a", "libmp3lame", "-b:a", "256k", str(out_mp3)
], check=True, stderr=subprocess.DEVNULL)

print("Updated master audio with authentic @puckermanefacts SFX:", out_wav)
