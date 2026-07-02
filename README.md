# Games

## Desert Blade — سيف الصحراء

An original 2D Arabian-fantasy platformer (Arabic UI, RTL). Everything is drawn procedurally
on a single canvas — no sprites — and every sound is synthesized live with the Web Audio API,
including a light generative hijaz-scale music loop. Designed primarily for smartphones in
landscape (touch controls, fullscreen, high-DPI, 60 FPS) but fully playable on desktop.

Feel & systems: coyote time, jump buffering, variable jump height, double jump, shaped gravity
(floaty apex / snappy fall), squash & stretch, hit-stop, a camera with dead zone, look-ahead,
shake and dynamic boss-fight zoom, soft shadows, parallax sunset background, particles with
object pooling, telegraphed enemy and boss attacks, checkpoints, secrets, and a chained-princess
rescue finale.

### Play it

```
cd desert-blade
python3 -m http.server 8080
```

Then open `http://localhost:8080` (it also works opened directly as a file — no build step).

- **Desktop:** arrows / `A`,`D` to move, `Space`/`W`/`↑` to jump (double jump), `X`/`Z` to throw fire,
  `S`/`↓` to climb down or drop through platforms, `Esc` to pause.
- **Mobile:** on-screen touch buttons; landscape only.

### Structure

- `desert-blade/index.html` — page shell + menu/pause/level overlays
- `desert-blade/css/style.css` — overlays, touch controls, rotate-device screen
- `desert-blade/js/` — classic scripts loaded in order (no bundler):
  `config` (canvas/DPI/tuning) → `audio` (synth SFX + music) → `input` → `levels` (ASCII maps)
  → `core` (state + collision) → `particles` → `camera` → `player` → `enemies` → `boss`
  → `render` (background/tiles) → `actors` (procedural characters) → `hud` → `game` (loop + states)

---

# King's Siege

A top-down twin-stick action game for the browser (desktop, mobile and gamepad), inspired by the
gate-defense action seen in mobile ads like *Kingshot* — built stronger and more advanced: full
manual movement + aiming, a dash, three deployable traps (spike, rolling barrel, arrow tower),
an escalating wave/boss system, and a gold upgrade shop between waves.

Bilingual (Arabic / English, with RTL support), works offline, no network calls at runtime.
Rendered with a real WebGL scene (Three.js, vendored) — low-poly toon characters, terrain,
props and traps, with dynamic gate damage tinting — while the HUD/menus stay plain DOM for
crisp, localizable text. Every sound effect is synthesized live with the Web Audio API.

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
- `king-siege/main.js` — game loop, input, simulation (no build step)
- `king-siege/render3d.js` — the Three.js scene: meshes, materials, camera, lighting
- `king-siege/strings.js` — all player-visible text (Arabic/English)
- `king-siege/style.css` — HUD, menus, joystick and action-bar styling
- `king-siege/vendor/` — vendored Three.js (see `THREE_LICENSE`)
