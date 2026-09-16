(() => {
  const platform = srDetectPlatform();
  if (!platform) return;

  const STYLE_ID = 'sr-injected-style';
  const STAMP = 'data-sr-v';

  let settings = { ...SR_DEFAULTS };
  let version = 0; // bumped on every settings change; used to invalidate stamps
  let video = null;

  // ---------------------------------------------------------------- helpers

  const sel = (list) => list.join(', ');

  function hexToRgba(hex, alpha) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
    if (!m) return `rgba(0, 0, 0, ${alpha})`;
    const [r, g, b] = m.slice(1).map((h) => parseInt(h, 16));
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // 8-direction text-shadow. Cheaper and far better supported than
  // -webkit-text-stroke + paint-order, and it never eats into the glyph.
  function outlineShadow(color) {
    const w = 'var(--sr-ow)';
    const n = 'calc(var(--sr-ow) * -1)';
    return [
      [w, 0], [n, 0], [0, w], [0, n],
      [w, w], [w, n], [n, w], [n, n]
    ]
      .map(([x, y]) => `${x} ${y} 0 ${color}`)
      .join(', ');
  }

  // ------------------------------------------------------------------- CSS

  function buildCss(s) {
    if (!s.enabled) return '';

    const box = hexToRgba(s.boxColor, s.boxOpacity);
    const outline = s.outlineWidthPct > 0 ? outlineShadow(s.outlineColor) : 'none';

    return `
/* Take over layout rather than half-constraining it. The players position cue
   windows with inline px coordinates computed against the container's full
   width; changing the container's width without neutralising those coordinates
   makes cues drift sideways and clip. So: bottom-centre with flexbox, and strip
   the inline positioning off the cue window below. Column direction matters —
   some players emit one window per line, and a flex row would lay them out
   side by side. */
${sel(platform.container)} {
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: flex-end !important;
  transform: none !important;
  overflow: visible !important;
  box-sizing: border-box !important;
  padding-bottom: var(--sr-offset) !important;
}

${sel(platform.window)} {
  position: static !important;
  transform: none !important;
  left: auto !important;
  right: auto !important;
  top: auto !important;
  bottom: auto !important;
  margin: 0 !important;
  width: auto !important;
  max-width: var(--sr-maxw) !important;
  text-align: center !important;
  background-color: ${box} !important;
  /* Wrap instead of overflowing. The players set nowrap/pre on cue text, so
     max-width alone cannot break a long line — it just spills past the edge.
     pre-wrap rather than normal, so cues that encode their own line breaks as
     "\\n" instead of <br> keep them. */
  white-space: pre-wrap !important;
  overflow-wrap: break-word !important;
  word-break: normal !important;
}

${sel(platform.text)} {
  font-family: ${s.fontFamily} !important;
  font-weight: ${s.fontWeight} !important;
  font-size: var(--sr-fs) !important;
  line-height: ${s.lineHeight} !important;
  letter-spacing: ${s.letterSpacing}em !important;
  color: ${s.color} !important;
  background-color: ${box} !important;
  text-shadow: ${outline} !important;
  -webkit-text-stroke: 0 !important;
  white-space: pre-wrap !important;
  overflow-wrap: break-word !important;
}

/* Bonus: native <track> cues, used by some players and by <video> fallbacks. */
video::cue {
  font-family: ${s.fontFamily};
  font-size: var(--sr-fs);
  color: ${s.color};
  background-color: ${box};
}
`;
  }

  function applyCss() {
    let el = document.getElementById(STYLE_ID);
    if (!el) {
      el = document.createElement('style');
      el.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(el);
    }
    el.textContent = buildCss(settings);
  }

  // --------------------------------------------------------------- sizing
  // Everything user-facing is a % of video height, resolved to px here so the
  // subtitles scale identically windowed and fullscreen.

  function applyMetrics() {
    const root = document.documentElement;
    const h = video ? video.clientHeight : window.innerHeight;
    const w = video ? video.clientWidth : window.innerWidth;
    const px = (pct) => `${((h * pct) / 100).toFixed(2)}px`;

    root.style.setProperty('--sr-fs', px(settings.fontSizePct));
    root.style.setProperty('--sr-ow', px(settings.outlineWidthPct));
    root.style.setProperty('--sr-offset', px(settings.bottomOffsetPct));
    root.style.setProperty('--sr-maxw', `${((w * settings.maxWidthPct) / 100).toFixed(2)}px`);
  }

  const resizeObserver = new ResizeObserver(applyMetrics);

  function bindVideo() {
    const found = document.querySelector('video');
    if (found === video) return;
    if (video) resizeObserver.unobserve(video);
    video = found;
    if (video) resizeObserver.observe(video);
    applyMetrics();
  }

  // ---------------------------------------------------- inline-style defence
  // Stylesheet !important beats plain inline styles, so CSS alone covers most
  // cases. Prime Video (and Netflix, when the account has a caption style set)
  // writes `!important` inline, which only an equally-important inline value
  // can beat. Re-stamp cue elements as they appear.

  const ENFORCE = () => ({
    'font-family': settings.fontFamily,
    'font-size': 'var(--sr-fs)',
    'font-weight': String(settings.fontWeight),
    'line-height': String(settings.lineHeight),
    color: settings.color,
    'background-color': hexToRgba(settings.boxColor, settings.boxOpacity),
    'text-shadow':
      settings.outlineWidthPct > 0 ? outlineShadow(settings.outlineColor) : 'none',
    'white-space': 'pre-wrap',
    'overflow-wrap': 'break-word'
  });

  function stamp(el) {
    if (!settings.enabled) return;
    if (el.getAttribute(STAMP) === String(version)) return; // already ours -> no loop
    el.setAttribute(STAMP, String(version));
    const props = ENFORCE();
    for (const [k, v] of Object.entries(props)) el.style.setProperty(k, v, 'important');
  }

  function stampAll(root = document) {
    if (!root.querySelectorAll) return;
    root.querySelectorAll(sel(platform.text)).forEach(stamp);
  }

  const domObserver = new MutationObserver((records) => {
    let sawNodes = false;
    for (const r of records) {
      if (r.type === 'childList' && r.addedNodes.length) {
        sawNodes = true;
        r.addedNodes.forEach((n) => {
          if (n.nodeType !== 1) return;
          if (n.matches && n.matches(sel(platform.text))) stamp(n);
          stampAll(n);
        });
      } else if (r.type === 'attributes' && r.target.nodeType === 1) {
        if (r.target.matches(sel(platform.text))) {
          r.target.removeAttribute(STAMP); // player overwrote us — reapply
          stamp(r.target);
        }
      }
    }
    if (sawNodes) bindVideo(); // SPA navigation swaps the <video> element
  });

  // ------------------------------------------------------------------- boot

  async function refresh() {
    settings = await srLoadSettings();
    version++;
    applyCss();
    applyMetrics();
    stampAll();
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes[SR_STORAGE_KEY]) refresh();
  });

  window.addEventListener('resize', applyMetrics);
  document.addEventListener('fullscreenchange', () => {
    // Fullscreen re-lays-out the player; metrics are stale for a frame or two.
    requestAnimationFrame(applyMetrics);
    setTimeout(applyMetrics, 300);
  });

  refresh().then(() => {
    bindVideo();
    domObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style']
    });
  });
})();
