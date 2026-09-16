const NUMERIC = new Set([
  'fontWeight',
  'fontSizePct',
  'lineHeight',
  'letterSpacing',
  'maxWidthPct',
  'bottomOffsetPct',
  'outlineWidthPct',
  'boxOpacity'
]);

const UNITS = {
  fontSizePct: '%',
  maxWidthPct: '%',
  bottomOffsetPct: '%',
  outlineWidthPct: '%',
  boxOpacity: '',
  lineHeight: '',
  letterSpacing: 'em'
};

const FIELDS = Object.keys(SR_DEFAULTS);
let settings = { ...SR_DEFAULTS };

// The preview is a fixed-size stand-in for a video frame. Percentages are
// resolved against this virtual height so proportions stay meaningful.
const VIRTUAL_VIDEO_H = 400;

function el(id) {
  return document.getElementById(id);
}

function hexToRgba(hex, alpha) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
  if (!m) return `rgba(0, 0, 0, ${alpha})`;
  const [r, g, b] = m.slice(1).map((h) => parseInt(h, 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function outlineShadow(color, w) {
  if (w <= 0) return 'none';
  return [
    [w, 0], [-w, 0], [0, w], [0, -w],
    [w, w], [w, -w], [-w, w], [-w, -w]
  ]
    .map(([x, y]) => `${x}px ${y}px 0 ${color}`)
    .join(', ');
}

function renderPreview() {
  const t = el('preview-text');
  const px = (pct) => (VIRTUAL_VIDEO_H * pct) / 100;

  t.style.fontFamily = settings.fontFamily;
  t.style.fontWeight = settings.fontWeight;
  t.style.fontSize = `${px(settings.fontSizePct)}px`;
  t.style.lineHeight = settings.lineHeight;
  t.style.letterSpacing = `${settings.letterSpacing}em`;
  t.style.color = settings.color;
  t.style.backgroundColor = hexToRgba(settings.boxColor, settings.boxOpacity);
  t.style.textShadow = outlineShadow(settings.outlineColor, px(settings.outlineWidthPct));
  t.style.opacity = settings.enabled ? '1' : '0.35';
}

function renderControls() {
  for (const key of FIELDS) {
    const input = el(key);
    if (!input) continue;
    if (input.type === 'checkbox') input.checked = settings[key];
    else input.value = settings[key];

    const out = el(`${key}-out`);
    if (out) {
      const unit = UNITS[key] ?? '';
      out.textContent = `${settings[key]}${unit}`;
    }
  }
  renderPreview();
}

let saveTimer = null;
function save() {
  // storage.sync is rate limited (~120 writes/min), so coalesce slider drags.
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => srSaveSettings(settings), 150);
}

function onInput(e) {
  const key = e.target.id;
  if (!FIELDS.includes(key)) return;
  settings[key] =
    e.target.type === 'checkbox'
      ? e.target.checked
      : NUMERIC.has(key)
        ? Number(e.target.value)
        : e.target.value;
  renderControls();
  save();
}

document.addEventListener('input', onInput);
document.addEventListener('change', onInput);

el('reset').addEventListener('click', () => {
  settings = { ...SR_DEFAULTS };
  renderControls();
  save();
});

srLoadSettings().then((s) => {
  settings = s;
  renderControls();
});
