// Single source of truth for settings. Sizes that must track the player are
// stored as a percentage of *video height*, never px — the player is resized
// constantly (windowed, theatre, fullscreen) and px would drift.
const SR_DEFAULTS = {
  enabled: true,

  fontFamily: 'system-ui, "Segoe UI", Arial, sans-serif',
  fontWeight: 600,
  fontSizePct: 4.5, // % of video height
  lineHeight: 1.3,
  letterSpacing: 0, // em

  color: '#ffffff',

  outlineColor: '#000000',
  outlineWidthPct: 0.25, // % of video height

  boxColor: '#000000',
  boxOpacity: 0, // 0..1

  bottomOffsetPct: 0, // % of video height to lift subs off the bottom edge
  maxWidthPct: 80 // % of video width
};

const SR_STORAGE_KEY = 'settings';

// False when popup.html is opened directly as a file:// page rather than from
// the toolbar icon — handy for previewing the UI without a reload.
const SR_HAS_STORAGE =
  typeof chrome !== 'undefined' && !!(chrome.storage && chrome.storage.sync);

function srLoadSettings() {
  if (!SR_HAS_STORAGE) return Promise.resolve({ ...SR_DEFAULTS });
  return new Promise((resolve) => {
    chrome.storage.sync.get(SR_STORAGE_KEY, (data) => {
      resolve({ ...SR_DEFAULTS, ...(data && data[SR_STORAGE_KEY]) });
    });
  });
}

function srSaveSettings(settings) {
  if (!SR_HAS_STORAGE) return;
  chrome.storage.sync.set({ [SR_STORAGE_KEY]: settings });
}
