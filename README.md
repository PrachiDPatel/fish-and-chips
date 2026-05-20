# Fish and Chips

Mobile web remote for joseph — a pleco catfish-shaped LED light in my room, running WLED on an ESP32 over WiFi.

## Features

- **Mood presets** — reef glow, deep sea, storm, and a few others
- **Pixel painter** — draw a custom pattern directly onto the LED grid and push it live
- **Snake** — yes there is a snake game on the fish

Built mobile-first, meant to be used from your phone while lying in bed. Commands publish over MQTT to the ESP32.

## How it works

1. Connect to the same WiFi as joseph
2. Pick a preset or paint a pattern
3. MQTT message fires → WLED picks it up → joseph changes color

## Setup

This repo is a template — the real broker URL and WLED topic are not committed.

1. Open `Pleco-v2.html` locally
2. Fill in the `CONFIG` block at the top of the script:
   ```js
   const BROKER = 'wss://your-broker.com:8084/mqtt';
   const TOPIC  = 'wled/your-device-id/api';
   ```
3. Open the file directly in your browser — no server needed

Keep your filled-in copy local and never push it.

## Stack

- ESP32 + WLED
- MQTT over WiFi
- HTML / CSS / JavaScript
