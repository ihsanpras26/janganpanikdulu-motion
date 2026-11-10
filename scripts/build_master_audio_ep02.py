import os
import sys
from pathlib import Path
import numpy as np
import subprocess
import wave

# Portable Paths
ROOT = Path(__file__).resolve().parent.parent
vo_mp3 = ROOT / "vo_ep02.mp3"
vo_wav = ROOT / "temp_vo_ep02_48k.wav"
out_wav = ROOT / "audio_ep02_master.wav"
out_mp3 = ROOT / "audio_ep02_master.mp3"
puck_dir = ROOT / "sfx_puckermane"

# Studio Video Broadcast Standard Sample Rate (48 kHz)
SR = 48000

print(f"Loading EP02 VO from: {vo_mp3}")
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
rng = np.random.default_rng(102)

def load_wav_mono_48k(path, max_dur=None):
    tmp = ROOT / f"temp_{path.stem}_ep02_48k.wav"
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

def make_saas_pill_in(base_freq=540.0, duration=0.22):
    """Studio SaaS Motion Graphic Frosted-Glass Pill Entrance"""
    n = int(duration * SR)
    t = np.linspace(0, duration, n, endpoint=False)
    air = rng.standard_normal(n).astype(np.float32)
    air = one_pole_lp(one_pole_hp(air, 480.0), 2200.0)
    air_env = np.sin(np.pi * np.clip(t / 0.095, 0.0, 1.0)) ** 1.6 * (t < 0.095)
    air_sig = air * air_env / (np.max(np.abs(air * air_env)) + 1e-6)
    env1 = np.exp(-t * 28.0) * (np.minimum(1.0, t / 0.0022) ** 2)
    f1 = base_freq * (1.0 + 0.18 * np.exp(-t * 90.0))
    p1 = 2 * np.pi * np.cumsum(f1) / SR
    tone1 = (np.sin(p1) + 0.28 * np.sin(2.0 * p1) * np.exp(-t * 45.0)) * env1
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
    tick_env = np.exp(-t * 140.0) * np.minimum(1.0, t / 0.0012)
    tick = np.sin(2 * np.pi * 1750.0 * t) * tick_env
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

def make_oil_sizzle(duration=2.4):
    """Crisp Hot Frying Oil Sizzle & Crackle"""
    n = int(duration * SR)
    t = np.linspace(0, duration, n, endpoint=False)
    noise = rng.standard_normal(n).astype(np.float32)
    sizzle = one_pole_lp(one_pole_hp(noise, 1800.0), 6800.0)
    sparks = (rng.random(n) > 0.985).astype(np.float32)
    sparks = one_pole_hp(one_pole_lp(sparks, 450.0) * rng.standard_normal(n).astype(np.float32), 2600.0) * 6.0
    env = np.minimum(1.0, t / 0.25) * np.minimum(1.0, (duration - t) / 0.35)
    out = (0.55 * sizzle + 0.45 * sparks) * env
    return (out / (np.max(np.abs(out)) + 1e-6)).astype(np.float32)

def make_water_splash(duration=0.45):
    """Gayung Water Pour & Splash onto Hot Pan"""
    n = int(duration * SR)
    t = np.linspace(0, duration, n, endpoint=False)
    noise = rng.standard_normal(n).astype(np.float32)
    band = one_pole_lp(one_pole_hp(noise, 550.0), 3400.0)
    env = np.exp(-t * 7.5) * np.minimum(1.0, t / 0.015)
    out = band * env
    return (out / (np.max(np.abs(out)) + 1e-6)).astype(np.float32)

def make_fireball_whoosh(duration=1.05):
    """1.700x Steam Explosion & Grease Fireball Roar"""
    n = int(duration * SR)
    t = np.linspace(0, duration, n, endpoint=False)
    noise = rng.standard_normal(n).astype(np.float32)
    roar = one_pole_lp(one_pole_hp(noise, 90.0), 780.0)
    sub = np.sin(2 * np.pi * (95.0 * np.exp(-t * 3.8) + 38.0) * t) * np.exp(-t * 5.2)
    crackle = one_pole_hp(noise, 2400.0) * np.exp(-t * 3.5) * 0.35
    env = np.minimum(1.0, t / 0.025) * np.exp(-t * 2.6)
    out = (0.75 * roar + 0.55 * sub + crackle) * env
    return (out / (np.max(np.abs(out)) + 1e-6)).astype(np.float32)

def make_steam_boil_burst(duration=0.85):
    """Underwater Rapid Steam Bubble Expansion at 300C Pan Bottom"""
    n = int(duration * SR)
    t = np.linspace(0, duration, n, endpoint=False)
    f_sweep = 140.0 + 520.0 * (t / duration) ** 1.7
    phase = 2 * np.pi * np.cumsum(f_sweep) / SR
    bub = np.sin(phase) * (0.5 + 0.5 * np.sin(2 * np.pi * 26.0 * t))
    hiss = one_pole_lp(one_pole_hp(rng.standard_normal(n).astype(np.float32), 900.0), 4200.0)
    env = np.sin(np.pi * (t / duration)) ** 0.85
    out = (0.55 * bub + 0.65 * hiss) * env
    return (out / (np.max(np.abs(out)) + 1e-6)).astype(np.float32)

def make_lid_clank(duration=0.38):
    """Metallic Pan Lid Sliding & Sealing Wok Rim"""
    n = int(duration * SR)
    t = np.linspace(0, duration, n, endpoint=False)
    slide = one_pole_lp(one_pole_hp(rng.standard_normal(n).astype(np.float32), 800.0), 3200.0)
    slide_env = np.exp(-t * 14.0) * (t < 0.14)
    tc = np.maximum(0.0, t - 0.11)
    mc = (t >= 0.11).astype(np.float32)
    clank = mc * (
        0.65 * np.sin(2 * np.pi * 420.0 * tc) * np.exp(-tc * 28.0) +
        0.45 * np.sin(2 * np.pi * 1180.0 * tc) * np.exp(-tc * 42.0) +
        0.35 * np.sin(2 * np.pi * 2150.0 * tc) * np.exp(-tc * 65.0)
    )
    out = 0.40 * slide * slide_env + 0.90 * clank
    return (out / (np.max(np.abs(out)) + 1e-6)).astype(np.float32)

# ==============================================================================
# STUDIO FOLEY, @puckermanefacts SFX & SAAS MOTION OVERLAY UI CHOREOGRAPHY (EP02)
# ==============================================================================

# S01 (0.00s - 4.45s): Hook Title Lockup ("WAJAN KEBAKARAN? / JANGAN SIRAM AIR!") + Wok Fire Sizzle
add_stereo(sfx, 0.02, puck_whoosh_thump, gain_db=-17.5)
add_stereo(sfx, 0.06, make_saas_pill_in(523.25), gain_db=-16.2)
add_stereo(sfx, 0.16, puck_step_pop, gain_db=-18.0)
add_stereo(sfx, 0.45, make_oil_sizzle(3.2), gain_db=-24.5, pan=-0.10)
add_stereo(sfx, 4.02, make_saas_callout_out(520.0), gain_db=-21.0)

# S02 (4.45s - 8.65s): "Karena segayung air justru bikin apinya meledak ke seluruh dapur."
add_stereo(sfx, 4.45, puck_air_whoosh, gain_db=-17.2)
add_stereo(sfx, 5.55, make_water_splash(0.38), gain_db=-18.5, pan=0.08)
add_stereo(sfx, 5.82, make_fireball_whoosh(1.10), gain_db=-16.8, pan=-0.05)
add_stereo(sfx, 5.85, puck_heavy_thud, gain_db=-17.0)
add_stereo(sfx, 5.90, make_saas_callout_pop(660.0), gain_db=-16.2, pan=-0.12)
add_stereo(sfx, 8.20, make_saas_callout_out(540.0), gain_db=-21.5, pan=-0.10)

# S03 (8.65s - 14.90s): Micro-Scenario — Goreng Makanan, Minyak Kepanasan Menyala Api, Tangan Refleks Menyiram Air
add_stereo(sfx, 8.65, puck_whoosh_thump, gain_db=-17.0)
add_stereo(sfx, 8.95, make_oil_sizzle(3.5), gain_db=-23.5, pan=-0.08)
add_stereo(sfx, 11.45, puck_air_whoosh, gain_db=-18.2)
add_stereo(sfx, 13.45, make_water_splash(0.40), gain_db=-17.8, pan=0.12)
add_stereo(sfx, 13.72, make_fireball_whoosh(0.95), gain_db=-17.2, pan=-0.06)

# S04 (14.90s - 19.45s): Macro Cutaway Wajan — Minyak Goreng Terbakar Suhunya 300 Derajat
add_stereo(sfx, 14.90, puck_air_whoosh, gain_db=-16.8)
add_stereo(sfx, 15.10, puck_mech_snap, gain_db=-18.0, pan=-0.10)
add_stereo(sfx, 16.55, make_saas_callout_pop(698.46), gain_db=-16.0, pan=-0.12)
add_stereo(sfx, 16.60, make_oil_sizzle(2.2), gain_db=-24.8, pan=-0.08)
add_stereo(sfx, 19.12, make_saas_callout_out(540.0), gain_db=-21.5, pan=-0.10)

# S05 (19.45s - 23.70s): "Masalahnya, air lebih berat daripada minyak, dan tidak bisa menyatu."
add_stereo(sfx, 19.45, puck_whoosh_thump, gain_db=-17.2)
add_stereo(sfx, 20.45, make_saas_callout_pop(640.0), gain_db=-16.2, pan=0.10)
add_stereo(sfx, 23.38, make_saas_callout_out(520.0), gain_db=-21.5, pan=0.10)

# S06 (23.70s - 28.70s): "Saat disiram, air langsung tenggelam menembus minyak ke dasar wajan yang sangat panas."
add_stereo(sfx, 23.70, puck_air_whoosh, gain_db=-17.0)
add_stereo(sfx, 24.10, make_water_splash(0.42), gain_db=-18.2, pan=0.05)
add_stereo(sfx, 25.85, make_saas_callout_pop(720.0), gain_db=-16.0, pan=-0.10)
add_stereo(sfx, 28.45, make_saas_callout_out(540.0), gain_db=-21.2, pan=-0.10)

# S07 (28.70s - 33.60s): "Dalam sekejap, air mendidih jadi uap dan mengembang 1.700 kali lipat."
add_stereo(sfx, 28.70, puck_whoosh_thump, gain_db=-16.8)
add_stereo(sfx, 29.85, make_steam_boil_burst(1.10), gain_db=-17.5, pan=0.0)
add_stereo(sfx, 31.10, make_saas_callout_pop(760.0), gain_db=-15.8, pan=0.10)
add_stereo(sfx, 31.15, puck_heavy_thud, gain_db=-17.2)
add_stereo(sfx, 33.28, make_saas_callout_out(560.0), gain_db=-21.2)

# S08 (33.60s - 38.45s): "Ledakan uap dari dasar wajan ini langsung melontarkan minyak menyala ke udara."
add_stereo(sfx, 33.60, puck_air_whoosh, gain_db=-17.0)
add_stereo(sfx, 35.10, make_fireball_whoosh(1.25), gain_db=-16.5, pan=0.0)
add_stereo(sfx, 35.15, puck_heavy_thud, gain_db=-16.8)
add_stereo(sfx, 35.55, make_saas_callout_pop(740.0), gain_db=-16.2, pan=-0.12)
add_stereo(sfx, 38.05, make_saas_callout_out(540.0), gain_db=-21.5)

# S09 (38.45s - 41.85s): Transition to 3 Safety Steps ("Kalau wajan di kompor terbakar, lakukan 3 langkah ini.")
add_stereo(sfx, 38.45, puck_whoosh_thump, gain_db=-17.0)

# S10 (41.85s - 46.30s): Step 1 Header Pill ("1 Jangan siram air & angkat") + Callout ("jangan disiram air")
add_stereo(sfx, 41.82, puck_air_whoosh, gain_db=-17.0)
add_stereo(sfx, 41.85, make_saas_pill_in(587.33), gain_db=-15.8)
add_stereo(sfx, 41.88, puck_step_pop, gain_db=-17.8)
add_stereo(sfx, 42.55, make_saas_callout_pop(698.46), gain_db=-16.2, pan=0.12)
add_stereo(sfx, 45.95, make_saas_callout_out(523.25), gain_db=-21.2)

# S11 (46.30s - 50.32s): Step 2 Header Pill ("2 Matikan knop kompor") + Knob Click + Callout ("matikan knop kompor")
add_stereo(sfx, 46.28, puck_whoosh_thump, gain_db=-17.0)
add_stereo(sfx, 46.32, make_saas_pill_in(659.25), gain_db=-15.8)
add_stereo(sfx, 46.36, puck_step_pop, gain_db=-17.8)
add_stereo(sfx, 47.45, puck_mech_snap, gain_db=-16.0, pan=-0.08)
add_stereo(sfx, 47.52, make_saas_callout_pop(783.99), gain_db=-16.0, pan=-0.10)
add_stereo(sfx, 50.00, make_saas_callout_out(587.33), gain_db=-21.2)

# S12 (50.32s - 57.20s): Step 3 Header Pill ("3 Tutup rapat pakai tutup panci") + Lid Seal Clank + Callout ("tutup rapat wajan")
add_stereo(sfx, 50.30, puck_air_whoosh, gain_db=-16.8)
add_stereo(sfx, 50.34, make_saas_pill_in(783.99), gain_db=-15.6)
add_stereo(sfx, 50.38, puck_step_pop, gain_db=-17.8)
add_stereo(sfx, 51.55, make_lid_clank(), gain_db=-16.4, pan=-0.08)
add_stereo(sfx, 51.75, make_saas_callout_pop(880.0), gain_db=-16.0, pan=-0.12)
add_stereo(sfx, 56.85, make_saas_callout_out(659.25), gain_db=-21.0)

# S13 (57.20s - 62.95s): Summary Takeaway ("Jadi yang bikin api menyembur ke seluruh dapur bukan minyaknya...")
add_stereo(sfx, 57.20, puck_whoosh_thump, gain_db=-17.2)

# S14 (62.95s - 65.41s): Sign-Off ("Jadi... jangan panik dulu.")
add_stereo(sfx, 62.95, puck_air_whoosh, gain_db=-17.2)
add_stereo(sfx, 63.15, puck_step_pop, gain_db=-18.2)
add_stereo(sfx, 63.92, make_saas_pill_in(587.33), gain_db=-17.5)

# Smooth Sidechain Envelope Ducking (keeps VO crystal clear above foley)
vo_mono = 0.5 * (np.abs(vo[:, 0]) + np.abs(vo[:, 1]))
win = int(0.040 * SR)
kernel = np.ones(win, dtype=np.float32) / win
vo_env = np.convolve(vo_mono, kernel, mode="same")
duck_gain = 1.0 - 0.34 * np.minimum(1.0, vo_env / 0.11)
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

print("Built 48kHz EP02 studio master audio:", out_wav)
