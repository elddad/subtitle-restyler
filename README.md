# Subtitle Restyler

A Manifest V3 Chrome extension that restyles subtitles on Netflix, Disney+ and
Prime Video: font, size, weight, colour, outline, background box, line width and
vertical position.

## Install

1. Download **`subtitle-restyler-<version>.zip`** from the
   [latest release](../../releases/latest) and extract it to a folder you'll
   keep (Chrome loads it from there — don't delete it afterwards).
   *Alternatively:* green **Code** button → **Download ZIP** and extract.
2. Open `chrome://extensions` and turn on **Developer mode** (top right)
3. Click **Load unpacked** and select the extracted folder — the one that
   contains `manifest.json`
4. Pin the extension, open a title, turn subtitles on in the player, then click
   the extension icon

To update: replace the folder's contents with the new release and press the
reload arrow on the extension's card in `chrome://extensions`.

Settings apply live while a video plays — no page reload needed.

## Build

```powershell
pwsh -File build.ps1
```

Produces `dist/` (loose files) and `build/subtitle-restyler-<version>.zip`
(Chrome Web Store upload / release asset) from the same source.

## How it works

All three services render subtitles as **ordinary DOM elements with inline
styles**, not as `<track>`/`::cue` text. That is the whole reason this is
possible without touching the video pipeline (which is DRM-protected and off
limits).

Three layers, in order of how much they can break:

| Layer | File | Purpose |
| --- | --- | --- |
| Injected stylesheet | `src/content.js` → `buildCss` | Does ~90% of the work. A rule with `!important` in a stylesheet beats a plain inline style, which is what the players usually write. |
| CSS custom properties | `src/content.js` → `applyMetrics` | Resolves "% of video height" into px. A `ResizeObserver` on the `<video>` keeps them correct across windowed / theatre / fullscreen. |
| MutationObserver | `src/content.js` → `stamp` | Last resort. Prime Video (and Netflix with an account-level caption style set) writes `!important` **inline**, which only an equally-important inline value can beat. Cue elements get re-stamped as they appear. |

Sizes are stored as a percentage of video height, never px. Players resize
constantly and px values drift badly between windowed and fullscreen.

### Why the extension owns the cue layout

All three players position cue windows with **inline pixel coordinates computed
against the container's full width**. That makes partial geometry overrides
actively harmful: constrain the container's width and the cue keeps its old
horizontal offset inside a narrower box, so it drifts right and clips on the
left — worse in fullscreen, because the error scales with player width.

So the container is converted to a flex column, bottom-centred, and the cue
window's inline `left` / `top` / `transform` are all reset to `auto` / `none`.
Vertical position is then plain `padding-bottom` on the container. Column
direction is deliberate: some players emit one cue window per line, and a flex
row would lay them out side by side.

The tradeoff: this discards player-chosen cue placement, so cues that were
deliberately moved to the top of the frame (to avoid covering on-screen text)
will now sit at the bottom with everything else.

## When it breaks

The class names in `src/platforms.js` are the fragile part — all three services
ship obfuscated, versioned class names and rotate them without notice. If
styling silently stops applying:

1. Open the player with subtitles on
2. Devtools → inspect the subtitle text
3. Walk up the tree and identify the three roles: `container` (full-bleed
   overlay), `window` (per-cue box), `text` (the element holding the glyphs)
4. Update that platform's entry in `src/platforms.js` — nothing else changes

Prefer attribute selectors (`[class*="captions"]`) over exact class names where
the class looks hashed; they survive rotation better.

## Known limits

- **Image-based subtitles** (some Prime Video and Disney+ tracks, especially
  forced/foreign-language subs) are bitmaps. CSS cannot restyle them; only
  size and position can be affected.
- **Shadow DOM**: if a player moves its subtitle renderer into a *closed*
  shadow root, an injected stylesheet stops reaching it. Open roots can be
  handled by injecting into `element.shadowRoot`.
- The `*://*.amazon.com/*` match is deliberately broad because Prime Video is
  served under regional Amazon domains. Add `amazon.co.uk`, `amazon.de` etc. to
  `manifest.json` as needed — Chrome Web Store review will ask you to justify
  broad host permissions.

## Ideas worth adding

- Bundled fonts via `web_accessible_resources` + an injected `@font-face`
- Per-platform setting profiles (Netflix's default subs are larger than Prime's)
- A keyboard shortcut to nudge vertical position mid-scene (`commands` API)
- Dual subtitles — this needs a full re-render: hide the native cues, read their
  text, and draw your own overlay inside the fullscreen element

## Contributing

Commits must use a GitHub no-reply email so personal addresses never end up in
public history. Enable the guard hooks once after cloning:

```bash
git config core.hooksPath .githooks
```

`pre-commit` refuses a commit whose author or committer email isn't
`*@users.noreply.github.com`; `pre-push` re-checks every outgoing commit, which
also catches commits made with `--no-verify`.
