---
title: "EP03 — Rem Motor Matic Blong di Turunan? Jangan Matikan Mesin!"
episode: 3
topic: "Penanganan Rem Motor Matic Blong Akibat Vapor Lock di Turunan Curam"
pillar: "Pilar B — Darurat Jalan Raya & Kendaraan"
mascot: "[[02-Mascot-Bible-Mas-Raka|Mas Raka]]"
palette: "[[01-Brand-Identity-Orange-Blue|Option 2: White × Deep Indigo #261A66 × Solid Orange #EF5F18]]"
playbook: "[[07-Scriptwriting-DNA-Playbook]]"
status: in-production
---

# EP03 — Rem Motor Matic Blong di Turunan? Jangan Matikan Mesin! (SCRIPT & PRODUCTION KIT)

## 1. Naskah Utama Terkunci (`75,31 Detik` VO + `4,19 Detik` Outro = `79,50 Detik` | 14 Kalimat Lugas)

```text
Kenapa saat rem motor matic blong di turunan, kamu nggak boleh langsung mematikan mesin?
Karena mematikan mesin justru bikin motor meluncur makin kencang tanpa pengereman mesin.
Misalnya lagi lewat turunan panjang, tuas rem ditahan terus, lalu tiba-tiba rem terasa kosong.

Menahan rem terus-menerus bikin piringan cakram cepat panas sampai di atas 300 derajat Celsius.
Panas ekstrem ini merambat ke kaliper dan bikin minyak rem di dalam selang mendidih.
Minyak yang mendidih berubah jadi gelembung uap, sehingga saat tuas ditekan rem langsung ngempos.
Kalau kamu panik lalu mematikan mesin, kampas kopling sentrifugal di CVT otomatis terlepas.
Akibatnya, efek pengereman mesin langsung hilang total dan roda belakang berputar bebas.

Kalau rem matic mulai terasa blong di turunan, lakukan 3 langkah ini:
Pertama, biarkan mesin tetap menyala dan jangan tarik gas sama sekali supaya putaran mesin tetap menahan laju motor.
Kedua, tekan lalu lepas tuas rem depan dan belakang secara bergantian supaya kaliper sempat mendingin.
Ketiga, arahkan motor ke jalur penyelamat, tanjakan kecil, atau tepi jalan berumput untuk berhenti.

Jadi yang bikin rem matic blong bukan kabelnya putus, tapi minyak rem yang mendidih.
Jadi... jangan panik dulu.
```

---

## 2. Kit ElevenLabs Voiceover (Persona Mas Raka)

```text
[curious, engaging] Kenapa saat rem motor matic blong di turunan, kamu nggak boleh langsung mematikan mesin?
[serious, punchy] Karena mematikan mesin, justru bikin motor meluncur makin kencang tanpa pengereman mesin.
[conversational] Misalnya lagi lewat turunan panjang, tuas rem ditahan terus, lalu tiba-tiba rem terasa kosong.

[clear, informative] Menahan rem terus-menerus, bikin piringan cakram cepat panas sampai di atas tiga ratus derajat Celsius.
Panas ekstrem ini merambat ke kaliper, dan bikin minyak rem di dalam selang mendidih.
[emphatic] Minyak yang mendidih berubah jadi gelembung uap, sehingga saat tuas ditekan, rem langsung ngempos.
[firm] Kalau kamu panik lalu mematikan mesin, kampas kopling sentrifugal di CVT otomatis terlepas.
Akibatnya, efek pengereman mesin langsung hilang total, dan roda belakang berputar bebas.

[calm, authoritative] Kalau rem matic mulai terasa blong di turunan, lakukan tiga langkah ini.
Pertama, biarkan mesin tetap menyala, dan jangan tarik gas sama sekali supaya putaran mesin tetap menahan laju motor.
Kedua, tekan lalu lepas tuas rem depan dan belakang secara bergantian, supaya kaliper sempat mendingin.
Ketiga, arahkan motor ke jalur penyelamat, tanjakan kecil, atau tepi jalan berumput untuk berhenti.

[thoughtful] Jadi yang bikin rem matic blong bukan kabelnya putus, tapi minyak rem yang mendidih.
[warm, calm smile] Jadi... jangan panik dulu.
```

---

## 3. Rencana Storyboard 15 Beat (`1080x1920` | Yamaha Mio Smile Merah + Cutaway Kaliper & CVT)

| Kalimat | Rentang Waktu | Beat | Visual 3D Three.js (Yamaha Mio Smile Merah + Cutaway Rem & CVT) | UI Overlay (`#hook-card`, `#step-tracker`, Callout) |
| :--- | :--- | :--- | :--- | :--- |
| **01** | `00.00 - 04.65s` | **Hook** | Sudut 3/4 depan-samping jalan turunan pegunungan: Mas Raka memakai helm *half-face* visor terbuka di atas Yamaha Mio Smile merah, tangan kiri refleks mau memutar kunci kontak ke `OFF`. | `#hook-card`: `REM MATIC BLONG?` + Pill `JANGAN MATIKAN MESIN!` |
| **02** | `04.65 - 10.18s` | **Hook Payoff** | Simulasi kunci kontak `OFF`: panah vektor percepatan oranye (`#EF5F18`) mendorong motor meluncur makin kencang di turunan. | Callout oranye: `meluncur makin kencang` |
| **03** | `10.18 - 16.16s` | **Micro-Scenario** | *Over-The-Shoulder (OTS) Cockpit Close-Up*: jari kanan menahan tuas rem depan terus-menerus hingga tiba-tiba tuas tertarik mentok ke grip gas. | Subtitle Karaoke Highlight: `tuas rem ditahan terus` -> `rem terasa kosong` |
| **04** | `16.16 - 22.30s` | **Science 1 (Cakram 300°C+)** | *Low Macro Push-In* ke roda depan: piringan cakram berlubang ventilasi berubah merah membara akibat gesekan kampas terus-menerus. | Top Sub-Pill Metrik: `Suhu cakram: 300°C+` + Callout `cakram 300°C+` |
| **05** | `22.30 - 27.17s` | **Science 2 (Kaliper & Selang)** | *3D Cross-Section Cutaway* pada kaliper dan selang rem hidrolik: rambatan panas dari kampas masuk ke cairan minyak rem di dalam selang. | Callout oranye: `minyak rem mendidih` |
| **06** | `27.17 - 33.00s` | **Science 3 (Vapor Lock)** | Di dalam selang yang terbelah muncul gelembung uap (*vapor lock*); saat tuas ditekan, piston hanya memampatkan uap sehingga kampas gagal menjepit cakram. | Top Sub-Pill Metrik: `Vapor lock: gelembung uap` + Callout `rem langsung ngempos` |
| **07** | `33.00 - 38.72s` | **Science 4 (Cutaway CVT)** | *Low-Angle Whip-Pan* ke bak CVT sisi kiri belakang (*X-Ray Cutaway*): saat mesin `OFF`, 3 sepatu kampas kopling sentrifugal menguncup terlepas dari mangkuk kopling. | Callout oranye: `kopling CVT terlepas` |
| **08** | `38.72 - 44.34s` | **Science 5 (Mesin Hilang)** | Mangkuk kopling dan roda belakang berputar bebas tanpa tahanan mesin sama sekali. | Top Sub-Pill Metrik: `Pengereman mesin: hilang total` + Callout `roda berputar bebas` |
| **09** | `44.34 - 48.45s` | **Transisi Solusi** | Kamera kembali ke sudut 3/4 stabil; ekspresi Mas Raka tenang dan fokus (`focused`) mengendalikan stang. | `#step-tracker` siap masuk |
| **10** | `48.45 - 55.31s` | **Langkah 1** | *Close-up* kunci kontak tetap `ON`, pergelangan tangan kanan melepas selongsong gas penuh, dan kopling CVT tetap menempel menahan roda belakang. | Step Pill `1`: `Mesin tetap nyala & lepas gas` (`bar 1 on`) + Callout hijau `pengereman mesin aktif` |
| **11** | `55.31 - 61.48s` | **Langkah 2** | *Handlebar Rhythm Shot*: jari kanan dan kiri Mas Raka menekan lalu melepas tuas rem depan dan belakang secara bergantian; warna merah panas di cakram mereda. | Step Pill `2`: `Tekan-lepas rem bergantian` (`bar 2 on`) + Callout hijau `kaliper sempat mendingin` |
| **12** | `61.48 - 67.44s` | **Langkah 3** | *Wide Tracking Shot*: Mas Raka mengarahkan Mio Smile merah masuk ke jalur penyelamat berpasir/berumput di tepi turunan hingga berhenti aman. | Step Pill `3`: `Arahkan ke jalur penyelamat` (`bar 3 on`) + Callout hijau `berhenti bertahap` |
| **13** | `67.44 - 72.62s` | **Contrast Payoff** | Visualisasi kontras kaliper & selang rem hidrolik yang kembali dingin dan normal. | Subtitle Karaoke Highlight: `bukan kabelnya putus` vs `minyak rem yang mendidih` |
| **14** | `72.62 - 75.31s` | **Sign-Off** | Mas Raka berdiri tenang di samping Yamaha Mio Smile merah di tepi jalan, tersenyum hangat (`calm/smile`) dan mengangguk. | Pill Sign-Off: `Jadi... jangan panik dulu.` |
| **15** | `75.31 - 79.50s` | **Outro CTA (`4,19s`)** | Jeda nafas `0,45s` + Silky Triple Circle Wipe (`#EF5F18` -> `#261A66` -> `#FFFFFF`) memunculkan **Separated Circle Badge** + **Mas Raka Pop-Out Rise**. | **Unified Profile Action Bar** (`@janganpanikdulu`): klik taktil `+ Ikuti` -> `✓ Mengikuti` |
