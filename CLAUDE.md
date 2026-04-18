# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the project

No build step, no server needed. Open `index.html` directly in a browser (double-click or drag to browser address bar).

## Architecture

Three files, zero dependencies:

- **`index.html`** — structure only; no inline scripts or styles.
- **`style.css`** — all visual logic including state-driven animations. The body class (`state-stopped`, `state-paused`, `state-playing`) is the single source of truth that drives every CSS transition.
- **`app.js`** — single IIFE, no modules. Contains the state machine, audio engine, and all DOM manipulation.

## State machine (app.js)

The player has three states managed by `transition(newState)` in `app.js`:

```
STOPPED ──play──► PLAYING ──pause──► PAUSED
  ▲                  │                  │
  └────────stop───────┘◄────────play────┘
```

`transition()` sets `document.body.className = 'state-{newState}'`, which activates all CSS rules for that state (vinyl spin, tonearm position, label shimmer). Never mutate visual state outside of this function.

## Tonearm geometry

Three constants in `app.js` control the arm sweep:
- `ARM_REST_DEG = 28` — lifted position (stopped)
- `ARM_START_DEG = 3` — over the outer groove (play starts)
- `ARM_END_DEG = 22` — over the inner groove (track ends)

`updateTonearmAngle()` interpolates between `ARM_START_DEG` and `ARM_END_DEG` based on `audio.currentTime / audio.duration`. Called on every `timeupdate` event and on seek.

## Adding tracks

Tracks are defined in the `TRACKS` array in `app.js`. Each entry needs `title`, `artist`, `src` (URL or object URL), and `labelColor` (hex, used to tint the spinning label). Local file uploads prepend to `TRACKS` at index 0 using `URL.createObjectURL`.

## CSS animation pattern

Animations are never toggled with JS — they're always running and controlled via `animation-play-state` through CSS class selectors on `body`. The one exception is `snapVinylReset()`, which temporarily removes the animation to snap the vinyl back to 0° without animating through the remaining rotation.

## Keyboard shortcuts

`Space` play/pause · `←→` ±5 s · `↑↓` volume · `N/P` next/prev track.
