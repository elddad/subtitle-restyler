// Per-platform DOM adapters.
//
// Each platform renders subtitles as three nested things:
//   container -> the full-bleed overlay that positions the cue block
//   window    -> the per-cue box (this is what gets a background colour)
//   text      -> the actual glyph-bearing element (font, colour, outline)
//
// These class names are NOT stable. All three services ship obfuscated /
// versioned class names and rotate them. Re-verify with devtools if styling
// stops applying; see README "When it breaks".
const SR_PLATFORMS = [
  {
    id: 'netflix',
    match: (h) => h.endsWith('netflix.com'),
    container: ['.player-timedtext'],
    window: ['.player-timedtext-text-container'],
    text: ['.player-timedtext-text-container span']
  },
  {
    id: 'disneyplus',
    match: (h) => h.endsWith('disneyplus.com'),
    container: ['.dss-subtitle-renderer-wrapper', '.dss-subtitle-renderer'],
    window: ['.dss-subtitle-renderer-cue-window'],
    text: ['.dss-subtitle-renderer-line', '.dss-subtitle-renderer-cue-window span']
  },
  {
    id: 'prime',
    match: (h) => h.endsWith('primevideo.com') || h.includes('amazon.'),
    container: ['.atvwebplayersdk-captions-overlay', '.webPlayerSDKCaptions'],
    window: ['.atvwebplayersdk-captions-overlay > div'],
    text: ['.atvwebplayersdk-captions-text', '.atvwebplayersdk-captions-overlay span']
  }
];

function srDetectPlatform(hostname = location.hostname) {
  return SR_PLATFORMS.find((p) => p.match(hostname)) || null;
}
