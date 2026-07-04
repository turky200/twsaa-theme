const fs = require('fs');
const vm = require('vm');
const path = require('path');

const jsPath = path.join(__dirname, '../../../raqam-store/dstory-fetched.js');
const outPath = path.join(__dirname, '../assets/css/_phase3-append.css');
const js = fs.readFileSync(jsPath, 'utf8');

const cartVars = {
  SCOPE: 'body.raqam-theme .raqam-cart-page',
  GLASS_BG: 'var(--raqam-glass-bg)',
  GLASS_BORDER: 'var(--raqam-glass-border)',
  GLASS_INNER: 'rgba(255, 255, 255, 0.05)',
  GLASS_CARD: 'var(--raqam-glass-card)',
  BORDER_PURPLE: 'var(--raqam-border-purple-soft)',
  QTY_GLASS_BG: 'var(--raqam-input-bg)',
  QTY_BORDER: 'rgba(139, 81, 254, 0.4)',
  BTN_GRAD: 'var(--raqam-btn-grad)',
};

function replaceVars(s, vars) {
  let out = s;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(k).join(v);
  }
  return out;
}

const parts = js.split("var STYLE_ID = 'raqam-cart-page-glass'");
const cartPart = parts[1].split('var STYLE_ID')[0];

function extractCartCss() {
  const injectStart = cartPart.indexOf('function inject()');
  const injectEnd = cartPart.indexOf('function applyPrimaryBtnStyle');
  let injectBody = cartPart.slice(injectStart, injectEnd);
  injectBody = injectBody.replace(
    /var style = document\.getElementById\(STYLE_ID\);[\s\S]*?style\.textContent = css;/,
    'return css;'
  );
  const decls = Object.entries(cartVars)
    .map(([k, v]) => 'var ' + k + ' = ' + JSON.stringify(v) + ';')
    .join('\n');
  return vm.runInNewContext(decls + '\n' + injectBody + '\ninject();');
}

const cartCss = extractCartCss();

const accStart = js.indexOf("var STYLE_ID = 'raqam-account-pages-glass'");
const accEnd = js.indexOf('})();', accStart);
const accBlock = js.slice(accStart, accEnd);
const accScope = 'body.raqam-theme.raqam-account-page';

const accVars = {
  STYLE_ID: 'raqam-account-pages-glass',
  BODY_CLASS: 'raqam-account-page',
  ACCENT: 'var(--raqam-accent)',
  BRAND: 'var(--raqam-brand)',
  GLASS_BG: 'var(--raqam-glass-bg)',
  GLASS_BG_HOVER: 'var(--raqam-glass-bg-hover)',
  GLASS_CARD: 'var(--raqam-glass-card)',
  GLASS_ROW: 'var(--raqam-glass-row)',
  GLASS_ROW_ALT: 'rgba(255, 255, 255, 0.03)',
  BORDER_PURPLE: 'var(--raqam-border-purple)',
  NAV_GLASS: 'var(--raqam-nav-glass)',
  TABLE_HEAD_BG: 'rgba(54, 10, 97, 0.55)',
  INPUT_BG: 'var(--raqam-input-bg)',
  BTN_GRAD: 'var(--raqam-btn-grad)',
  SCOPE: accScope,
  PROFILE_DATE_CAL_SVG:
    'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2722%27 height=%2722%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23ffffff%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Crect x=%273%27 y=%274%27 width=%2718%27 height=%2718%27 rx=%272%27 ry=%272%27/%3E%3Cline x1=%2716%27 y1=%272%27 x2=%2716%27 y2=%276%27/%3E%3Cline x1=%278%27 y1=%272%27 x2=%278%27 y2=%276%27/%3E%3Cline x1=%273%27 y1=%2710%27 x2=%2721%27 y2=%2710%27/%3E%3C/svg%3E")',
};

function extractFn(name) {
  const startNeedle = 'function ' + name + '(';
  const start = accBlock.indexOf(startNeedle);
  if (start === -1) throw new Error('fn not found: ' + name);
  let i = accBlock.indexOf('{', start);
  let depth = 0;
  let end = i;
  for (; end < accBlock.length; end++) {
    const ch = accBlock[end];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        end++;
        break;
      }
    }
  }
  return accBlock.slice(start, end);
}

const fnNames = [
  'sidebarActiveRule',
  'buildSharedCss',
  'buildListRowCss',
  'buildTableCss',
  'buildProfileCss',
  'buildAddressesCss',
  'buildEmptyStateCss',
  'buildWishlistCss',
  'buildWalletCss',
];

const decls = Object.entries(accVars)
  .map(([k, v]) => 'var ' + k + ' = ' + JSON.stringify(v) + ';')
  .join('\n');

const script =
  decls +
  '\nfunction pageScope(pc){return ' +
  JSON.stringify(accScope) +
  ' + "." + pc;}\n' +
  fnNames.map(extractFn).join('\n') +
  '\nvar shared = buildSharedCss("/customer/account/notifications");\n' +
  'var list = buildListRowCss();\n' +
  'var table = buildTableCss();\n' +
  'var profile = buildProfileCss();\n' +
  'var addresses = buildAddressesCss();\n' +
  'var empty = buildEmptyStateCss();\n' +
  'var wishlist = buildWishlistCss();\n' +
  'var wallet = buildWalletCss();\n' +
  'JSON.stringify({shared,list,table,profile,addresses,empty,wishlist,wallet});';

const partsAcc = JSON.parse(vm.runInNewContext(script));
const accountCss = [
  partsAcc.shared,
  partsAcc.list,
  partsAcc.table,
  partsAcc.profile,
  partsAcc.addresses,
  partsAcc.empty,
  partsAcc.wishlist,
  partsAcc.wallet,
].join('\n\n');

const skyCart = `
/* sky-theme cart selectors */
body.raqam-theme .raqam-cart-page section.cart,
body.raqam-theme .raqam-cart-page .cart-content {
    color: var(--raqam-text) !important;
}

body.raqam-theme .raqam-cart-page .cart-item-list .item {
    background: var(--raqam-glass-card) !important;
    backdrop-filter: blur(20px) saturate(1.5) !important;
    -webkit-backdrop-filter: blur(20px) saturate(1.5) !important;
    border: 1px solid var(--raqam-border-purple-soft) !important;
    border-radius: var(--raqam-radius-xl) !important;
    box-shadow: 0 6px 28px rgba(54, 10, 97, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;
    color: var(--raqam-text) !important;
    padding: 16px !important;
    margin-bottom: 16px !important;
}

body.raqam-theme .raqam-cart-page .item-title a,
body.raqam-theme .raqam-cart-page .item-details .price {
    color: var(--raqam-text) !important;
}

body.raqam-theme .raqam-cart-page .item-options {
    color: var(--raqam-text-purple) !important;
}

body.raqam-theme .raqam-cart-page .quantity.control-group {
    display: inline-flex !important;
    align-items: stretch !important;
    background: var(--raqam-input-bg) !important;
    border: 1px solid rgba(139, 81, 254, 0.4) !important;
    border-radius: var(--raqam-radius-md) !important;
    overflow: hidden !important;
}

body.raqam-theme .raqam-cart-page .quantity .decrease,
body.raqam-theme .raqam-cart-page .quantity .increase {
    background: transparent !important;
    border: none !important;
    color: var(--raqam-text) !important;
    width: 34px !important;
    min-width: 34px !important;
    cursor: pointer !important;
}

body.raqam-theme .raqam-cart-page .quantity .qtyBox {
    background: transparent !important;
    border: none !important;
    color: var(--raqam-text) !important;
    text-align: center !important;
    width: 48px !important;
}

body.raqam-theme .raqam-cart-page .order-summary {
    background: var(--raqam-glass-card) !important;
    backdrop-filter: blur(20px) saturate(1.5) !important;
    -webkit-backdrop-filter: blur(20px) saturate(1.5) !important;
    border: 1px solid var(--raqam-border-purple-soft) !important;
    border-radius: var(--raqam-radius-xl) !important;
    padding: 20px 24px !important;
    color: var(--raqam-text) !important;
    margin-top: 20px !important;
}

body.raqam-theme .raqam-cart-page .order-summary h3,
body.raqam-theme .raqam-cart-page .order-summary label {
    color: var(--raqam-text) !important;
}

body.raqam-theme .raqam-cart-page .payable-amount label {
    color: var(--raqam-text-lavender) !important;
    font-weight: 700 !important;
}

body.raqam-theme .raqam-cart-page .coupon-container,
body.raqam-theme .raqam-cart-page .shadow-default.bg-white {
    background: var(--raqam-glass-card) !important;
    border: 1px solid var(--raqam-border-purple-soft) !important;
    border-radius: var(--raqam-radius-xl) !important;
    color: var(--raqam-text) !important;
}

body.raqam-theme .raqam-cart-page .btn-primary,
body.raqam-theme .raqam-cart-page .btn.btn-lg.btn-primary {
    background: var(--raqam-btn-grad) !important;
    border: none !important;
    color: var(--raqam-text) !important;
    border-radius: var(--raqam-radius-md) !important;
    box-shadow: var(--raqam-shadow-btn) !important;
}

body.raqam-theme .raqam-cart-page .btn-black {
    background: var(--raqam-btn-grad) !important;
    border: none !important;
    color: var(--raqam-text) !important;
}

body.raqam-theme .raqam-cart-page .discount-control input.control {
    background: rgba(255, 255, 255, 0.05) !important;
    border: 1px solid var(--raqam-border-purple) !important;
    border-radius: 10px !important;
    color: var(--raqam-text) !important;
}
`;

const skyAccount = `
/* sky-theme account layout adapters */
body.raqam-theme.raqam-account-page .account-content {
    display: flex !important;
    gap: 20px !important;
    flex-wrap: wrap !important;
}

body.raqam-theme.raqam-account-page .account-content > .sidebar {
    background: var(--raqam-glass-bg) !important;
    backdrop-filter: blur(22px) saturate(1.6) brightness(1.05) !important;
    -webkit-backdrop-filter: blur(22px) saturate(1.6) brightness(1.05) !important;
    border: 1px solid var(--raqam-border-purple) !important;
    border-radius: var(--raqam-radius-xl) !important;
    box-shadow: 0 8px 32px rgba(54, 10, 97, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;
    color: var(--raqam-text) !important;
    padding: 12px !important;
}

body.raqam-theme.raqam-account-page .sidebar .menu-item a {
    color: var(--raqam-text) !important;
    text-decoration: none !important;
    display: block !important;
    padding: 10px 14px !important;
    border-radius: var(--raqam-radius-md) !important;
    transition: background 0.25s ease !important;
}

body.raqam-theme.raqam-account-page .sidebar .menu-item a:hover {
    background: rgba(139, 81, 254, 0.18) !important;
}

body.raqam-theme.raqam-account-page .account-layout {
    flex: 1 !important;
    min-width: 0 !important;
    background: var(--raqam-glass-bg) !important;
    backdrop-filter: blur(22px) saturate(1.6) brightness(1.05) !important;
    -webkit-backdrop-filter: blur(22px) saturate(1.6) brightness(1.05) !important;
    border: 1px solid var(--raqam-border-purple) !important;
    border-radius: var(--raqam-radius-xl) !important;
    box-shadow: 0 8px 32px rgba(54, 10, 97, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;
    color: var(--raqam-text) !important;
    padding: 20px !important;
}

body.raqam-theme.raqam-account-page .account-heading {
    color: var(--raqam-text) !important;
    font-weight: 700 !important;
}

body.raqam-theme.raqam-account-page .horizontal-rule {
    border-color: rgba(139, 81, 254, 0.25) !important;
}

body.raqam-theme.raqam-account-page .notification-item {
    display: flex !important;
    background: var(--raqam-glass-row) !important;
    border-bottom: 1px solid rgba(139, 81, 254, 0.2) !important;
    color: var(--raqam-text) !important;
    padding: 14px 16px !important;
    text-decoration: none !important;
    transition: background 0.25s ease !important;
}

body.raqam-theme.raqam-account-page .notification-item:hover {
    background: var(--raqam-glass-bg-hover) !important;
}

body.raqam-theme.raqam-account-page .notification-item h4,
body.raqam-theme.raqam-account-page .notification-item p {
    color: var(--raqam-text) !important;
}

body.raqam-theme.raqam-account-page table.table thead tr {
    background: rgba(54, 10, 97, 0.55) !important;
}

body.raqam-theme.raqam-account-page table.table th,
body.raqam-theme.raqam-account-page table.table td {
    color: var(--raqam-text) !important;
    border-color: rgba(139, 81, 254, 0.15) !important;
}

body.raqam-theme.raqam-account-page table.table tbody tr:nth-child(even) {
    background: rgba(255, 255, 255, 0.03) !important;
}

body.raqam-theme.raqam-account-page table.table tbody tr:hover {
    background: rgba(139, 81, 254, 0.14) !important;
}

body.raqam-theme.raqam-account-page .badge {
    border-radius: 20px !important;
    font-weight: 600 !important;
}

body.raqam-theme.raqam-account-page .btn-primary {
    background: var(--raqam-btn-grad) !important;
    border: none !important;
    color: var(--raqam-text) !important;
    border-radius: var(--raqam-radius-md) !important;
}
`;

const header21 =
  '\n\n/* ═══════════════════════════════════════════════════════════════\n   21. CART PAGE — raqam-cart-page-glass v2\n   ═══════════════════════════════════════════════════════════════ */\n\n';
const header22 =
  '\n\n/* ═══════════════════════════════════════════════════════════════\n   22. ACCOUNT PAGES — raqam-account-pages-glass (8 paths unified)\n   ═══════════════════════════════════════════════════════════════ */\n\n';

const out = header21 + cartCss + skyCart + header22 + accountCss + skyAccount;
fs.writeFileSync(outPath, out);
console.log('Written', out.length, 'chars to', outPath);
