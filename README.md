# King's Siege

A top-down twin-stick action game for the browser (desktop, mobile and gamepad), inspired by the
gate-defense action seen in mobile ads like *Kingshot* — built stronger and more advanced: full
manual movement + aiming, a dash, three deployable traps (spike, rolling barrel, arrow tower),
an escalating wave/boss system, and a gold upgrade shop between waves.

Bilingual (Arabic / English, with RTL support), works offline, no external assets or network
calls — every sprite is hand-drawn vector art on `<canvas>` and every sound effect is synthesized
with the Web Audio API.

## Play it

```
cd king-siege
python3 -m http.server 8080
```

Then open `http://localhost:8080` in a browser (or on your phone via your machine's LAN IP).
Append `?dev=1` to the URL to show the FPS/debug overlay.

- **Desktop:** move with `WASD`/arrows, aim with the mouse, dash with `Space`, traps with `1`/`2`/`3`.
- **Mobile:** left-side virtual joystick to move, right-side to aim, buttons at the bottom for
  dash and traps.
- **Gamepad:** left stick to move, right stick to aim, face buttons for dash and traps.

## Structure

- `king-siege/index.html` — page shell + HUD/menu overlays
- `king-siege/main.js` — game loop, input, simulation, rendering (single module, no build step)
- `king-siege/strings.js` — all player-visible text (Arabic/English)
- `king-siege/style.css` — HUD, menus, joystick and action-bar styling
