<div align="center">

# 🐟 Fish and Chips 🐟

Mobile web remote for joseph — a pleco catfish-shaped LED light in my room, running WLED on an ESP32 over WiFi.

**[→ Try it live](https://prachidpatel.github.io/fish-and-chips/)**

---

## How it works

</div>

1. Connect to the same WiFi as joseph
2. Pick a preset or paint a pattern
3. MQTT message fires → WLED picks it up → joseph changes color

Built mobile-first, meant to be used from your phone while lying in bed.

<div align="center">

## 🎮 Features 🎮

</div>

- **Mood presets** — reef glow, deep sea, storm, and a few others
- **Pixel painter** — draw a custom pattern directly onto the LED grid and push it live
- **Snake** — yes there is a snake game on the fish

<div align="center">

## 🔧 Setup 🔧

</div>

This repo is a template — the real broker URL and WLED topic are not committed.

1. Open `index.html` locally
2. Fill in the `CONFIG` block at the top of the script:
   ```js
   const BROKER = 'wss://your-broker.com:8084/mqtt';
   const TOPIC  = 'wled/your-device-id/api';
   ```
3. Open the file directly in your browser — no server needed

Keep your filled-in copy local and never push it.

<div align="center">

## 💻 Stack 💻

</div>

- ESP32 + WLED
- MQTT over WiFi
- HTML / CSS / JavaScript
