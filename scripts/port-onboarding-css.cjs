// Port the handover mockup's styles.css into a scoped, brand-only stylesheet.
// Usage: unzip mockups/vendor-registration-v2_Final.zip -d /tmp/mock && node scripts/port-onboarding-css.cjs /tmp/mock/vendor-registration-v2/styles.css src/components/vendor/onboarding/onboarding.css
const fs = require('fs');
const postcss = require('postcss');
const src = fs.readFileSync(process.argv[2], 'utf8');
const root = postcss.parse(src);

// Prototype-only chrome, device frames and the dashboard (not part of registration).
const DROP = /^(html|body|\*|::selection|:focus-visible|::-webkit)|prototype|viewport-canvas|frame-wrapper|frame-label|^\.desktop-frame|^\.mobile-frame$|mobile-notch|notch-camera|body\.mode|toast|vendor-sidebar|sidebar-|brand-logo-row|brand-icon-pot|brand-title|portal-tag|vendor-name|vendor-meta-row|nav-link|nav-icon|nav-badge|nav-coming|footer-action|desktop-canvas|vendor-topbar|breadcrumb|topbar|user-profile|user-avatar|user-info|dashboard-content|status-banner|status-badge|badge-pill|badge-solid|badge-outline|badge-gold|badge-diet|status-text|urgent-alert|alert-|btn-primary-action|btn-secondary-ghost|spotlight|countdown|logistic|course-chips|chips-section|chips-row|dish-chip|diet-indicator|host-contact|btn-prep|metrics-row|metric-|bottom-split|feed-panel|panel-|booking-|date-badge|health-|checklist|check-item|check-icon|services-dashboard|services-hub|services-grid|service-summary|card-top-header|service-icon|service-title|service-sub|service-status|service-body|service-detail|service-footer|mobile-appbar|mobile-title|mobile-scroll|mobile-status|mobile-alert|mobile-spotlight|mobile-event|mobile-metric|mobile-bottom|bottom-tab|tab-badge-pill|prep-|desktop-dashboard|mobile-dashboard|desktop-onboarding-shell|mobile-onboarding-shell|btn-preview-store|status-dot|tier-pill-small|diet-pill-small|btn-preview-storefront/;

const COLOR = [
  [/#fff(fff)?\b/gi, '#FFFFFF'],
  [/#(fffdf9|fffdfb|fafaf8|faf9f6|faf8f5|f7f2eb|f3efe9|fdfbf7|fffdf8|fffdf5|fffbf0|f4f2eb|faf3ea)\b/gi, 'rgba(240, 208, 158, 0.12)'],
  [/#(666|555|777|888|6b7280|4b5563)\b/gi, 'rgba(0, 0, 0, 0.6)'],
  [/#(333|444|374151|111|1e1e1e|0d0d0d|121212)\b/gi, 'rgba(0, 0, 0, 0.85)'],
  [/#(e5e7eb|eee)\b/gi, 'rgba(0, 0, 0, 0.08)'],
  [/#(9b191e|98191d|96171b|981b20|7a1417|dc2626|ef4444|c62828)\b/gi, '#B92025'],
  [/#(fee2e2|fef2f2|fca5a5)\b/gi, 'rgba(185, 32, 37, 0.08)'],
  [/#(b45309|92400e|78350f|5a3800)\b/gi, '#000000'],
  [/#(fde68a|fef3c7|dcfce7)\b/gi, 'rgba(240, 208, 158, 0.6)'],
  [/#(f59e0b|c5a059)\b/gi, '#F0D09E'],
  [/#(059669|16a34a|15803d|0f8a3c)\b/gi, '#000000'],
  [/#(232323|222)\b/gi, '#000000'],
  [/rgba\(\s*(254, 243, 199|245, 158, 11|212, 175, 55|200, 160, 80|200, 150, 40)\s*,/g, 'rgba(240, 208, 158,'],
  [/rgba\(\s*180, 83, 9\s*,/g, 'rgba(185, 32, 37,'],
  [/rgba\(\s*17, 24, 39\s*,/g, 'rgba(0, 0, 0,'],
];
const recolor = (v) => COLOR.reduce((s, [re, to]) => s.replace(re, to), v);

const out = postcss.root();
const pushScoped = (rule, parent, mobile) => {
  const sels = rule.selectors
    .map((s) => s.trim())
    .filter((s) => !DROP.test(s.replace(/^\.mobile-frame\s+/, '').replace(/^\./, '.')) )
    .map((s) => {
      if (s === ':root') return '.vob';
      if (mobile) return '.vob ' + s.replace(/^\.mobile-frame\s+/, '');
      return '.vob ' + s;
    });
  if (!sels.length) return;
  const r = rule.clone({ selectors: sels });
  r.walkDecls((d) => {
    d.value = recolor(d.value);
    if (d.prop === '--color-veg') d.value = '#000000';
    if (d.prop === '--color-nonveg') d.value = '#B92025';
  });
  parent.append(r);
};

const phone = postcss.atRule({ name: 'media', params: '(max-width: 639px)' });
root.each((node) => {
  if (node.type === 'rule') {
    const isMobile = node.selectors.every((s) => s.trim().startsWith('.mobile-frame '));
    if (isMobile) pushScoped(node, phone, true);
    else {
      // split mixed selector lists
      const mob = node.selectors.filter((s) => s.trim().startsWith('.mobile-frame '));
      const rest = node.selectors.filter((s) => !s.trim().startsWith('.mobile-frame '));
      if (rest.length) pushScoped(node.clone({ selectors: rest }), out, false);
      if (mob.length) pushScoped(node.clone({ selectors: mob }), phone, true);
    }
  } else if (node.type === 'atrule' && node.name === 'media') {
    const m = node.clone({ nodes: [] });
    node.each((r) => r.type === 'rule' && pushScoped(r, m, false));
    if (m.nodes.length) out.append(m);
  } else if (node.type === 'atrule' && node.name === 'keyframes') {
    out.append(node.clone({ params: 'vob-' + node.params }));
  }
});
out.append(phone);
let css = out.toString();
// keyframes are namespaced so they don't collide with the site's own
css = css.replace(/animation:\s*([a-zA-Z]+)/g, (m, n) => (['fadeIn', 'slideUp', 'pulseRed', 'toastIn'].includes(n) ? `animation: vob-${n}` : m));
// Extra tokens the mockup references but never defines; all brand-only.
const extra = `.vob {
  --font-display: var(--font-display-stack);
  --font-sans: var(--font-open-sans), system-ui, sans-serif;
  font-family: var(--font-sans);
  color: var(--color-black);
  line-height: 1.5;
}
.vob *, .vob *::before, .vob *::after { box-sizing: border-box; }
/* The prototype relies on browser-default control font size (13.333px);
   Tailwind preflight resets controls to inherit, so restore it. Class rules win. */
.vob button, .vob input, .vob select, .vob textarea { font-size: 13.333px; }
`;
const appCss = `
/* ── App integration (not in the prototype) ───────────────────────────────── */
.vob.vob-shell { display: flex; flex-direction: column; min-height: 60vh; background: var(--bg-page); }
.vob .wizard-body { flex: 1; overflow: visible; }
.vob .vob-footer-slot { position: sticky; bottom: 0; z-index: 40; }
.vob-main.app-page-pad { padding-bottom: 0; }
/* Below lg the site shows a fixed bottom tab bar (~3.5rem tall; --tab-bar-h is a
   looser 4.5rem reserve): dock Back / Continue flush on top of it. */
@media (max-width: 1023px) {
  .vob .vob-footer-slot { bottom: calc(3.5rem + var(--safe-bottom)); }
  .vob.vob-shell { padding-bottom: calc(var(--tab-bar-h) + var(--safe-bottom)); }
}
.vob h1, .vob h2, .vob h3, .vob h4 { font-family: var(--font-sans); margin: 0; }
.vob .step-heading, .vob .modal-title { font-family: var(--font-display); }
.vob .vob-m { display: none; }
.vob .vob-m-flex { display: none !important; }
.vob .vob-diet-pill { background: transparent; border: 1px solid var(--color-black-40); color: var(--color-black); }
.vob .vob-save-error { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 14px; padding: 10px 14px; border: 1px solid var(--color-red-25); background: var(--color-red-05); border-radius: var(--radius-control); color: var(--color-red); font-size: 12px; font-weight: 700; }
.vob .vob-save-error button { background: none; border: none; color: var(--color-red); font-size: 16px; cursor: pointer; min-width: 32px; min-height: 32px; }
.vob .vob-badge { display: inline-flex; align-items: center; gap: 4px; background: var(--color-cream); color: var(--color-red); font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: var(--radius-pill); }
.vob .vob-badge-red { background: var(--color-red); color: var(--color-cream); }
.vob .vob-badge-outline { background: var(--color-red-05); color: var(--color-red); border: 1px solid var(--color-red-25); }
.vob .vob-badge-ink { background: var(--color-black); color: var(--color-cream); }
.vob .vob-field-error { display: block; margin-top: 6px; font-size: 12px; font-weight: 700; color: var(--color-red); }
.vob .vob-footer-center { font-size: 11px; color: var(--color-black-40); }
.vob .vob-modal-eyebrow { display: block; font-size: 11px; font-weight: 800; color: var(--color-red); letter-spacing: 1px; text-transform: uppercase; }
.vob .alert-box.alert-error { padding: 8px 12px; border-radius: var(--radius-control); background: var(--color-red-05); border: 1px solid var(--color-red-25); color: var(--color-red); font-size: 12px; font-weight: 700; }
.vob textarea.form-input { resize: vertical; min-height: 72px; }
.vob .modal-backdrop { position: fixed; }
.vob button:disabled { opacity: 0.55; cursor: not-allowed; }
@media (max-width: 639px) {
  .vob .vob-d { display: none; }
  .vob .vob-m { display: inline; }
  .vob .vob-d-flex { display: none !important; }
  .vob .vob-m-flex { display: flex !important; }
  .vob .vob-footer-center { display: none; }
  /* mockup inline phone styles + 44px touch targets */
  .vob .tier-action-bar { flex-direction: column; align-items: stretch; gap: 8px; }
  .vob .tier-action-bar .btn-tier-proceed, .vob .tier-action-bar .btn-tier-back { width: 100%; text-align: center; margin-left: 0; min-height: 44px; }
  .vob .photo-preview-thumb { width: 70px; height: 55px; }
  .vob .btn-upload-photo, .vob .btn-catalog-action, .vob .course-tab-btn { min-height: 44px; }
  .vob .btn-icon-action, .vob .stepper-btn { min-width: 40px; min-height: 40px; }
  .vob .dish-card { align-items: flex-start; }
  .vob .dish-card-left { flex: 1; }
  .vob .dish-card-actions { flex-direction: column; gap: 6px; }
  .vob .item-chip-editable .btn-chip-action { min-width: 32px; min-height: 32px; }
  /* mockup mobile header inline sizes */
  .vob .btn-vendor-signin { padding: 4px 10px; font-size: 11px; }
  .vob .btn-vendor-signin svg { display: none; }
  .vob .brand-tagline { font-size: 10px; }
  .vob .modal-backdrop { padding: 0; align-items: flex-end; }
  .vob .modal-sheet { max-height: 88dvh; border-bottom-left-radius: 0; border-bottom-right-radius: 0; }
}
`;
const header = `/* Vendor Registration V2 — ported verbatim from the handover prototype
   (mockups/vendor-registration-v2_Final.zip · styles.css), scoped under .vob.
   Off-palette mockup colours are mapped onto the four brand colours (+ alpha)
   per CLAUDE.md. Rules under the prototype's .mobile-frame live in the
   (max-width: 639px) block at the end. Generated by scripts/port-onboarding-css.cjs — regenerate, don’t hand-edit. */
`;
fs.writeFileSync(process.argv[3], header + css.replace(/^\.vob \{/m, '.vob {') + '\n' + extra + appCss);
