<div align="center">

#  Fish and Chips 

Mobile web remote for joseph — a pleco catfish-shaped LED light in my room, running WLED on an ESP32 over WiFi.

**Live at : (https://prachidpatel.github.io/fish-and-chips/)**

---

## How it works

</div>

1. Connect to the same local WiFi as joseph
2. Connect him to your local network (optional) 
3. Pick a preset or paint a pattern
4. MQTT message fires -> WLED picks it up -> joseph changes color

Can be used from any device, especially designed with mobile in mind.
<div align="center">

##  Features 

</div>

- **Mood presets** — happy, neutral, sad, angry, livid, and a few others
- **Time presets** — good morning and good evening, plus a good night button that sets the evening lights and hands off to the [sleep tracker demo](https://prachidpatel.github.io/fish-and-chips-sleep-tracker/)
- **Pixel painter** — draw a custom pattern directly onto the LED grid and push it live. Press-drag to paint with a brush, eraser mode, a custom color picker, and a word-drawer that renders text across the LEDs (best-effort — they aren't a grid)
- **Hot & cold** — a two-phone hide-and-seek game: one person hides a light on joseph, the other hunts it down with red-hot → purple-cold hints. Game state syncs live over MQTT
- **Snake** — yes there is a snake game on the fish
- **Dot map export** — download a numbered SVG of all 50 LED positions for mapping and debugging
- **LED calibration** — settings drawer walks each LED through red → blue → green so you can note the wiring order

<div align="center">

##  Setup 

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

##  Stack 

</div>

- ESP32 + WLED
- MQTT via EMQX over WiFi
- HTML / CSS / JavaScript

<div align="center">

##  Dev tools

</div>

- **`dot-editor.html`** — fine-tune LED positions on the pleco outline and export the updated `LED_POSITIONS` map
- **`netlify/functions/trigger.js`** — remote preset API: `GET /trigger?token=<secret>&preset=<n>` fires a preset over MQTT without opening the app (needs `TRIGGER_SECRET` set wherever it's hosted; `netlify.toml` wires up the redirect)
- **`stabilize.py`** — video stabilization helper used when filming LED calibration runs

<div align="center">

##  How Joseph Was Built 

![Joseph, from cardboard to fish](images/joseph-build.webp)

Cardboard to fish — every LED is individually mapped to the site, so I can repaint or animate him whenever I want.

</div>
