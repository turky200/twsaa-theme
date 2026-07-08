(function () {
  'use strict';
  /* raqam v5-fix9 */
  var STYLE_ID = 'raqam-header-override';
  var MODIFIED_ATTR = 'data-raqam-header-done';
  var AUTH_ATTR = 'data-raqam-auth-state';
  var MAX_RETRIES = 60;
  var RETRY_MS = 150;
  var retryCount = 0;
  var observer = null;
  var userMenuObserver = null;
  var lockedHeaderHeight = null;
  var userMenuInitDone = false;
  var isFixing = false;
  var syncTimer = null;
  var LANG_ICON_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">' +
    '<circle cx="12" cy="12" r="10"/>' +
    '<path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>' +
    '</svg>';
  function elVisible(el) {
    if (!el || !el.getBoundingClientRect) return false;
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }
  function isMobileView() {
    return window.matchMedia('(max-width: 1023px)').matches;
  }
  function getAuthState(header) {
    if (!header) return 'none';
    var login = document.getElementById('customerLogin');
    if (login && header.contains(login)) return 'guest';
    if (header.querySelector('.s-user-menu-wrapper')) return 'user';
    return 'none';
  }
  function getLeftAccountEl(header) {
    if (!header) return null;
    var login = document.getElementById('customerLogin');
    if (login && header.contains(login)) return login;
    return header.querySelector('.s-user-menu-wrapper');
  }
  function userMenuTogglerEl(wrapper) {
    if (!wrapper) return null;
    var t = wrapper.querySelector('.dropdown-list.s-user-menu-toggler') || wrapper.querySelector('.s-user-menu-toggler');
    if (t) return t;
    if (wrapper.getAttribute('data-raqam-portal-placeholder') === '1') {
      var portal = document.getElementById('raqam-mobile-menu-portal');
      if (portal) return portal.querySelector('.dropdown-list.s-user-menu-toggler[data-raqam-portaled="1"]');
    }
    return null;
  }
  function getMenuTrigger(wrapper) {
    if (!wrapper) return null;
    return wrapper.querySelector('.dropdown-toggle, .s-user-menu-trigger-slot');
  }
  function userMenuIsOpen(wrapper) {
    if (!wrapper) return false;
    var trigger = wrapper.querySelector('.dropdown-toggle, .s-user-menu-trigger-slot');
    var toggler = userMenuTogglerEl(wrapper);
    if (!trigger || !toggler) return false;
    var display = toggler.style.display || window.getComputedStyle(toggler).display;
    return trigger.classList.contains('active') && display !== 'none';
  }
  function isAnyUserMenuOpen() {
    var header = document.getElementById('header');
    if (!header) return false;
    var open = false;
    header.querySelectorAll('.s-user-menu-wrapper').forEach(function (wrapper) {
      if (userMenuIsOpen(wrapper)) open = true;
    });
    return open;
  }
  function headerRowHeight() {
    return isMobileView() ? '76px' : '80px';
  }
  function measureHeaderRowHeight() {
    var header = document.getElementById('header');
    if (!header) return headerRowHeight();
    var row = header.querySelector('.raqam-header-row');
    if (!row) return headerRowHeight();
    var h = row.getBoundingClientRect().height;
    if (h > 0 && h <= 120) return Math.round(h) + 'px';
    return headerRowHeight();
  }
  function lockHeaderHeight(header, lock) {
    if (!header) return;
    var row = header.querySelector('.raqam-header-row');
    var mainnav = document.getElementById('mainnav');
    var inner = mainnav && mainnav.querySelector('.inner:not(.nav-header)');
    var leftZone = row && row.querySelector('.raqam-zone-left');
    var h = lock ? (lockedHeaderHeight || measureHeaderRowHeight()) : headerRowHeight();
    if (lock) {
      if (!lockedHeaderHeight) lockedHeaderHeight = measureHeaderRowHeight();
      h = lockedHeaderHeight;
      header.classList.add('raqam-user-menu-open');
      document.body.classList.add('raqam-user-menu-open');
      if (row) {
        row.style.setProperty('height', h, 'important');
        row.style.setProperty('max-height', h, 'important');
        row.style.setProperty('min-height', h, 'important');
        row.style.setProperty('overflow', 'visible', 'important');
        row.style.setProperty('align-items', 'center', 'important');
      }
      if (inner) {
        inner.style.setProperty('max-height', h, 'important');
        inner.style.setProperty('overflow', 'visible', 'important');
      }
      if (leftZone) {
        leftZone.style.setProperty('overflow', 'visible', 'important');
        leftZone.style.setProperty('align-items', 'center', 'important');
        leftZone.style.setProperty('align-self', 'center', 'important');
        leftZone.style.setProperty('height', 'auto', 'important');
        leftZone.style.setProperty('max-height', h, 'important');
      }
      header.style.setProperty('overflow', 'visible', 'important');
      if (mainnav) mainnav.style.setProperty('overflow', 'visible', 'important');
    } else {
      header.classList.remove('raqam-user-menu-open');
      lockedHeaderHeight = null;
      if (!isAnyUserMenuOpen()) {
        document.body.classList.remove('raqam-user-menu-open');
        header.style.removeProperty('position');
        header.style.removeProperty('z-index');
      }
      if (row) {
        row.style.removeProperty('height');
        row.style.removeProperty('max-height');
        row.style.removeProperty('min-height');
      }
      if (inner) inner.style.removeProperty('max-height');
      header.style.removeProperty('overflow');
      if (mainnav) mainnav.style.removeProperty('overflow');
    }
  }
  function ensureUserMenuBackdrop(show) {
    if (isMobileView()) show = false;
    var bd = document.getElementById('raqam-user-menu-backdrop');
    if (!show) {
      if (bd && bd.parentNode) bd.parentNode.removeChild(bd);
      document.body.classList.remove('raqam-user-menu-backdrop-on');
      return;
    }
    if (bd) { document.body.classList.add('raqam-user-menu-backdrop-on'); return; }
    bd = document.createElement('div');
    bd.id = 'raqam-user-menu-backdrop';
    bd.className = 'raqam-user-menu-backdrop';
    bd.setAttribute('aria-hidden', 'true');
    bd.addEventListener('click', function (e) { if (e.target === bd) sallaCloseUserMenus(); });
    document.body.insertBefore(bd, document.body.firstChild);
    document.body.classList.add('raqam-user-menu-backdrop-on');
  }
  function getMobilePortal() {
    var portal = document.getElementById('raqam-mobile-menu-portal');
    if (!portal) {
      portal = document.createElement('div');
      portal.id = 'raqam-mobile-menu-portal';
      portal.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:100000;';
      document.body.appendChild(portal);
    }
    return portal;
  }
  function restoreMobilePortal(wrapper, toggler) {
    if (!wrapper || !toggler) return;
    if (wrapper.contains(toggler)) {
      toggler.removeAttribute('data-raqam-portaled');
      wrapper.removeAttribute('data-raqam-portal-placeholder');
      return;
    }
    wrapper.appendChild(toggler);
    toggler.removeAttribute('data-raqam-portaled');
    wrapper.removeAttribute('data-raqam-portal-placeholder');
    toggler.style.removeProperty('position');
    toggler.style.removeProperty('top');
    toggler.style.removeProperty('left');
    toggler.style.removeProperty('right');
    toggler.style.removeProperty('width');
    toggler.style.removeProperty('z-index');
    toggler.style.removeProperty('pointer-events');
  }
  function portalMobileMenu(wrapper, toggler, trigger) {
    if (!isMobileView() || !userMenuIsOpen(wrapper)) {
      restoreMobilePortal(wrapper, toggler);
      return;
    }
    if (toggler.parentElement && toggler.parentElement.id === 'raqam-mobile-menu-portal') {
      positionMobileDropdown(toggler, trigger);
      return;
    }
    wrapper.setAttribute('data-raqam-portal-placeholder', '1');
    var portal = getMobilePortal();
    portal.appendChild(toggler);
    toggler.setAttribute('data-raqam-portaled', '1');
    toggler.style.setProperty('pointer-events', 'auto', 'important');
    toggler.style.setProperty('z-index', '100001', 'important');
    positionMobileDropdown(toggler, trigger);
  }
  function restoreAllMobilePortals() {
    var header = document.getElementById('header');
    if (!header) return;
    header.querySelectorAll('.s-user-menu-wrapper').forEach(function (wrapper) {
      restoreMobilePortal(wrapper, userMenuTogglerEl(wrapper));
    });
  }
  function sallaCloseUserMenus() {
    var header = document.getElementById('header');
    if (!header) return;
    header.querySelectorAll('.s-user-menu-wrapper').forEach(function (wrapper) {
      if (!userMenuIsOpen(wrapper)) return;
      var trigger = getMenuTrigger(wrapper);
      var toggler = userMenuTogglerEl(wrapper);
      if (toggler) toggler.style.display = 'none';
      if (trigger) trigger.classList.remove('active');
      restoreMobilePortal(wrapper, toggler);
    });
    ensureUserMenuBackdrop(false);
    scheduleSyncUserMenu();
  }
  function scheduleSyncUserMenu() {
    if (syncTimer) return;
    syncTimer = setTimeout(function () { syncTimer = null; syncUserMenuState(); }, 50);
  }
  function ensureDropdownListVisible(t) {
    if (!t) return;
    ['background:transparent','border:none','box-shadow:none','padding:0','overflow:visible','height:auto','max-height:none','min-height:0'].forEach(function (p) {
      var i = p.indexOf(':');
      t.style.setProperty(p.slice(0, i), p.slice(i + 1), 'important');
    });
    t.querySelectorAll('.s-user-menu-dropdown-list,.s-user-menu-dropdown-item,.s-user-menu-dropdown-item a,.s-user-menu-dropdown-item button').forEach(function (el) {
      el.classList.remove('raqam-hide', 'hidden');
      el.style.removeProperty('height');
      var d = el.tagName === 'A' || el.tagName === 'BUTTON' ? 'flex' : 'block';
      el.style.setProperty('display', d, 'important');
      el.style.setProperty('visibility', 'visible', 'important');
      el.style.setProperty('opacity', '1', 'important');
      el.style.setProperty('overflow', 'visible', 'important');
    });
  }
  function fixDropdownText(toggler) {
    if (!toggler) return;
    var sel = '.s-user-menu-dropdown, .s-user-menu-dropdown-list, .s-user-menu-dropdown-item, ' +
      '.s-user-menu-dropdown-item a, .s-user-menu-dropdown-item button, .s-user-menu-dropdown-item-title, ' +
      '.s-user-menu-dropdown-header-content span, .s-user-menu-dropdown-header-content p';
    toggler.querySelectorAll(sel).forEach(function (el) {
      el.style.setProperty('color', '#fff', 'important');
      el.style.setProperty('-webkit-text-fill-color', '#fff', 'important');
    });
    toggler.querySelectorAll('.s-user-menu-dropdown-item-logout a, .s-user-menu-dropdown-item-logout .s-user-menu-dropdown-item-title').forEach(function (el) {
      el.style.setProperty('color', '#f87171', 'important');
      el.style.setProperty('-webkit-text-fill-color', '#f87171', 'important');
    });
  }
  function bindCloseButtonFallback(wrapper) {
    if (!wrapper) return;
    var closeBtn = wrapper.querySelector('.s-user-menu-dropdown-header-close');
    if (!closeBtn || closeBtn.getAttribute('data-raqam-close-bound') === '1') return;
    closeBtn.setAttribute('data-raqam-close-bound', '1');
    closeBtn.addEventListener('click', function () {
      setTimeout(function () {
        if (!userMenuIsOpen(wrapper)) return;
        var trigger = getMenuTrigger(wrapper);
        var toggler = userMenuTogglerEl(wrapper);
        if (toggler) toggler.style.display = 'none';
        if (trigger) trigger.classList.remove('active');
        scheduleSyncUserMenu();
      }, 0);
    });
  }
  function positionMobileDropdown(toggler, trigger) {
    if (!toggler || !trigger) return;
    var r = trigger.getBoundingClientRect();
    var w = 'min(260px, calc(100vw - 24px))';
    var l = Math.max(12, r.left) + 'px';
    toggler.style.setProperty('position', 'fixed', 'important');
    toggler.style.setProperty('top', (r.bottom + 8) + 'px', 'important');
    toggler.style.setProperty('left', l, 'important');
    toggler.style.setProperty('right', 'auto', 'important');
    toggler.style.setProperty('width', w, 'important');
  }
  function repositionOpenMobileDropdowns() {
    if (!isMobileView()) {
      restoreAllMobilePortals();
      return;
    }
    var h = document.getElementById('header');
    if (!h) return;
    h.querySelectorAll('.s-user-menu-wrapper').forEach(function (w) {
      var toggler = userMenuTogglerEl(w);
      var trigger = getMenuTrigger(w);
      if (!userMenuIsOpen(w)) {
        restoreMobilePortal(w, toggler);
        return;
      }
      portalMobileMenu(w, toggler, trigger);
    });
  }
  function hideOrphanUserLists(header, wrapper) {
    if (!header || !wrapper || !wrapper.parentElement) return;
    wrapper.parentElement.querySelectorAll('ul.s-user-menu-dropdown-list').forEach(function (ul) {
      if (!wrapper.contains(ul)) {
        ul.classList.add('raqam-hide');
        ul.style.display = 'none';
        ul.style.visibility = 'hidden';
        ul.style.height = '0';
        ul.style.overflow = 'hidden';
        ul.style.position = 'absolute';
        ul.style.pointerEvents = 'none';
      }
    });
  }
  function fixUserMenuDropdown(wrapper) {
    if (!wrapper) return;
    var toggler = userMenuTogglerEl(wrapper);
    if (!toggler) return;
    var open = userMenuIsOpen(wrapper);
    var trigger = getMenuTrigger(wrapper);
    var header = document.getElementById('header');
    wrapper.style.setProperty('position', 'relative', 'important');
    wrapper.style.setProperty('overflow', 'visible', 'important');
    wrapper.style.setProperty('flex-shrink', '0', 'important');
    wrapper.style.setProperty('flex-grow', '0', 'important');
    wrapper.style.setProperty('align-self', 'center', 'important');
    wrapper.style.setProperty('height', 'auto', 'important');
    wrapper.style.setProperty('max-height', '52px', 'important');
    wrapper.style.setProperty('min-height', '0', 'important');
    wrapper.style.setProperty('display', 'inline-flex', 'important');
    wrapper.style.setProperty('align-items', 'center', 'important');
    wrapper.style.setProperty('vertical-align', 'middle', 'important');
    wrapper.style.setProperty('box-sizing', 'border-box', 'important');
    if (trigger) {
      trigger.style.setProperty('position', 'relative', 'important');
      trigger.style.setProperty('flex-shrink', '0', 'important');
      trigger.style.setProperty('max-height', '52px', 'important');
      trigger.style.setProperty('display', 'inline-flex', 'important');
      trigger.style.setProperty('align-items', 'center', 'important');
      trigger.style.setProperty('justify-content', 'center', 'important');
    }
    toggler.style.setProperty('float', 'none', 'important');
    toggler.style.setProperty('margin', '0', 'important');
    toggler.style.setProperty('padding', '0', 'important');
    toggler.style.setProperty('transform', 'none', 'important');
    toggler.style.setProperty('box-sizing', 'border-box', 'important');
    toggler.style.setProperty('contain', 'none', 'important');
    toggler.style.setProperty('max-height', 'none', 'important');
    if (!isMobileView()) {
      restoreMobilePortal(wrapper, toggler);
      toggler.style.setProperty('position', 'absolute', 'important');
      toggler.style.setProperty('top', 'calc(100% + 8px)', 'important');
      toggler.style.setProperty('inset-inline-start', '0', 'important');
      toggler.style.setProperty('left', '0', 'important');
      toggler.style.setProperty('right', 'auto', 'important');
      toggler.style.setProperty('width', 'min(280px, 90vw)', 'important');
      toggler.style.setProperty('z-index', '99999', 'important');
    }
    if (open) {
      toggler.style.setProperty('visibility', 'visible', 'important');
      toggler.style.setProperty('pointer-events', 'auto', 'important');
      toggler.style.setProperty('opacity', '1', 'important');
      toggler.style.setProperty('height', 'auto', 'important');
      toggler.style.setProperty('overflow', 'visible', 'important');
      if (isMobileView()) {
        portalMobileMenu(wrapper, toggler, trigger);
        ensureUserMenuBackdrop(false);
      } else {
        ensureUserMenuBackdrop(false);
      }
    } else {
      if (isMobileView()) restoreMobilePortal(wrapper, toggler);
      ensureUserMenuBackdrop(false);
    }
    var panel = toggler.querySelector('.s-user-menu-dropdown');
    if (panel) {
      panel.style.setProperty('position', 'relative', 'important');
      panel.style.setProperty('width', '100%', 'important');
      panel.style.setProperty('margin', '0', 'important');
      panel.style.setProperty('padding', '0', 'important');
      panel.style.setProperty('display', 'block', 'important');
      panel.style.setProperty('box-sizing', 'border-box', 'important');
      panel.style.setProperty('overflow', 'visible', 'important');
      panel.style.setProperty('height', 'auto', 'important');
    }
    ensureDropdownListVisible(toggler);
    fixDropdownText(toggler);
    hideOrphanUserLists(header, wrapper);
    bindCloseButtonFallback(wrapper);
  }
  function initUserMenusOnce() {
    if (userMenuInitDone) return;
    userMenuInitDone = true;
    var header = document.getElementById('header');
    if (!header) return;
    header.querySelectorAll('.s-user-menu-wrapper').forEach(function (wrapper) {
      var trigger = getMenuTrigger(wrapper);
      var toggler = userMenuTogglerEl(wrapper);
      if (!trigger || !toggler) return;
      if (!trigger.classList.contains('active')) {
        toggler.style.display = 'none';
      }
      fixUserMenuDropdown(wrapper);
    });
  }
  function syncUserMenuState() {
    if (isFixing) return;
    isFixing = true;
    try {
    var header = document.getElementById('header');
    if (!header) return;
    header.querySelectorAll('.s-user-menu-wrapper').forEach(fixUserMenuDropdown);
    var open = isAnyUserMenuOpen();
    if (open && !lockedHeaderHeight) lockedHeaderHeight = measureHeaderRowHeight();
    lockHeaderHeight(header, open);
    if (!open) ensureUserMenuBackdrop(false);
    } finally { isFixing = false; }
  }
  function observeUserMenuNodes() {
    var header = document.getElementById('header');
    if (!header || !userMenuObserver) return;
    header.querySelectorAll('.s-user-menu-wrapper').forEach(function (wrapper) {
      if (wrapper.getAttribute('data-raqam-menu-obs') === '1') return;
      wrapper.setAttribute('data-raqam-menu-obs', '1');
      var trigger = getMenuTrigger(wrapper);
      var toggler = userMenuTogglerEl(wrapper);
      if (trigger) {
        userMenuObserver.observe(trigger, { attributes: true, attributeFilter: ['class'] });
      }
      if (toggler) {
        userMenuObserver.observe(toggler, { attributes: true, attributeFilter: ['style'] });
      }
      bindCloseButtonFallback(wrapper);
    });
  }
  function setupUserMenuWatcher() {
    if (document.documentElement.getAttribute('data-raqam-user-menu-watch') === '1') return;
    document.documentElement.setAttribute('data-raqam-user-menu-watch', '1');
    userMenuObserver = new MutationObserver(function (mutations) {
      if (isFixing) return;
      var needsFix = false;
      mutations.forEach(function (m) {
        if (m.type === 'childList') { needsFix = true; return; }
        if (m.type !== 'attributes') return;
        if (m.attributeName === 'style' && m.target.classList && m.target.classList.contains('s-user-menu-toggler')) {
          needsFix = true;
        }
        if (m.attributeName === 'class' && m.target.classList &&
            (m.target.classList.contains('dropdown-toggle') || m.target.classList.contains('s-user-menu-trigger-slot'))) {
          needsFix = true;
        }
      });
      if (needsFix) {
        observeUserMenuNodes();
        scheduleSyncUserMenu();
      }
    });
    var hdr0 = document.getElementById('header');
    if (hdr0) userMenuObserver.observe(hdr0, { childList: true, subtree: true });
    window.addEventListener('resize', function () {
      lockedHeaderHeight = null;
      if (!isMobileView()) restoreAllMobilePortals();
      ensureUserMenuBackdrop(false);
      scheduleSyncUserMenu();
      repositionOpenMobileDropdowns();
    });
    window.addEventListener('scroll', repositionOpenMobileDropdowns, true);
    observeUserMenuNodes();
    initUserMenusOnce();
    syncUserMenuState();
  }
  function menuIsOpen() {
    var b = document.body;
    if (b.classList.contains('mm-ocd-opened')) return true;
    if (b.classList.contains('mm-spn--open') || b.classList.contains('mm-spn--opened') || b.classList.contains('mm-spn--body-open')) return true;
    if (location.hash === '#mobile-menu') return true;
    if (document.querySelector('.mm-ocd.mm-ocd--open, .mm-ocd.mm-ocd--opened, .mm-ocd--open, .mm-ocd--opened')) return true;
    var n = document.getElementById('mobile-menu') || document.querySelector('nav.mobile-menu');
    if (!n) return false;
    if (n.classList.contains('mm-spn--open') || n.classList.contains('mm-spn--opened') || n.classList.contains('mm-spn--main-open')) return true;
    return !!n.closest('.mm-ocd--open, .mm-ocd--opened');
  }
  function closeMobileMenu(opts) {
    opts = opts || {};
    if (!menuIsOpen()) return;
    if (!opts.skipCloseBtn) {
      var closeBtn = document.querySelector('.close-mobile-menu');
      if (closeBtn && elVisible(closeBtn)) {
        closeBtn.click();
        if (!menuIsOpen()) return;
      }
    }
    if (!opts.skipToggle) {
      var toggle = document.querySelector('[data-raqam-menu], a[href="#mobile-menu"]');
      if (toggle) {
        toggle.click();
        if (!menuIsOpen()) return;
      }
    }
    if (!opts.skipBackdrop) {
      var bd = document.querySelector('.mm-ocd__backdrop');
      if (bd) {
        bd.click();
        if (!menuIsOpen()) return;
      }
    }
    document.querySelectorAll('.mm-ocd').forEach(function (ocd) {
      ocd.classList.remove('mm-ocd--open', 'mm-ocd--opened');
    });
    document.body.classList.remove('mm-ocd-opened', 'mm-spn--open', 'mm-spn--opened', 'mm-spn--body-open');
    if (location.hash === '#mobile-menu') {
      if (history.length > 1) history.back();
      else location.hash = '';
    }
  }
  function removeLegacyBackdrop() {
    document.querySelectorAll('.raqam-menu-backdrop').forEach(function (el) {
      if (el.parentNode) el.parentNode.removeChild(el);
    });
  }
  function bindMmOcdBackdrop() {
    if (document.documentElement.getAttribute('data-raqam-mm-ocd') === '1') return;
    document.documentElement.setAttribute('data-raqam-mm-ocd', '1');
    function bindOnce(el, attr, handler) {
      if (!el || el.getAttribute(attr) === '1') return;
      el.setAttribute(attr, '1');
      el.addEventListener('click', handler);
    }
    function bindAll() {
      removeLegacyBackdrop();
      document.querySelectorAll('.mm-ocd__backdrop').forEach(function (el) {
        bindOnce(el, 'data-raqam-bd', function () {
          if (menuIsOpen()) closeMobileMenu({ skipBackdrop: true });
        });
      });
      document.querySelectorAll('.close-mobile-menu').forEach(function (el) {
        bindOnce(el, 'data-raqam-close', function () {
          if (menuIsOpen()) closeMobileMenu({ skipCloseBtn: true, skipBackdrop: true });
        });
      });
    }
    new MutationObserver(bindAll).observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });
    document.addEventListener('click', function (e) {
      if (!menuIsOpen()) return;
      if (document.querySelector('.mm-ocd__backdrop')) return;
      var t = e.target;
      if (!t || !t.closest) return;
      if (t.closest('[data-raqam-menu], a[href="#mobile-menu"], .raqam-right-group')) return;
      if (t.closest('nav.mobile-menu, #mobile-menu, .mm-ocd__content')) return;
      if (t.closest('.s-user-menu-dropdown,.dropdown-list.s-user-menu-toggler,.s-user-menu-wrapper,#raqam-mobile-menu-portal')) return;
      closeMobileMenu();
    }, true);
    bindAll();
  }
  function injectStyles() {
    var style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      document.head.appendChild(style);
    }
    style.textContent = [
      '#header{background:#000!important}',
      '#mainnav .inner,#mainnav .inner.bg-white{background:#000!important;border:none!important;box-shadow:none!important}',
      '#mainnav .inner.nav-header,#header .inner.nav-header{background:#000!important;display:none!important;border:none!important;box-shadow:none!important;min-height:0!important;padding:0!important}',
      '#header .raqam-header-row,#header.raqam-user-menu-open .raqam-header-row{display:flex!important;align-items:center!important;justify-content:space-between!important;direction:ltr!important;width:100%!important;min-height:76px!important;padding:12px 0!important;position:relative!important;box-sizing:border-box!important;overflow:visible!important}',
      '#header .raqam-zone-left{display:flex!important;flex-direction:row!important;align-items:center!important;justify-content:flex-start!important;flex:0 1 auto!important;gap:12px!important;min-width:0!important;overflow:visible!important;position:relative!important;align-self:center!important}',
      '#header .raqam-zone-left > *{flex-shrink:0!important;position:relative!important}',
      '#header .raqam-zone-center{display:flex!important;align-items:center!important;justify-content:center!important;flex:1 1 auto!important;position:absolute!important;left:50%!important;transform:translateX(-50%)!important;pointer-events:none!important;z-index:1!important;max-width:calc(100% - 280px)!important}',
      '#header .raqam-zone-center a,#header .raqam-zone-center .raqam-brand-link{pointer-events:auto!important}',
      '#header .raqam-zone-right{display:flex!important;flex-direction:row!important;align-items:center!important;justify-content:flex-end!important;flex:0 1 auto!important;gap:0!important;min-width:0!important;margin-left:auto!important}',
      '#header .raqam-right-group{display:inline-flex!important;flex-direction:row!important;align-items:center!important;justify-content:flex-end!important;gap:8px!important;flex-shrink:0!important}',
      '#header .raqam-hide{display:none!important}',
      '#header #customerLogin.raqam-login-btn,#header #customerLogin.raqam-login-btn:hover,#header #customerLogin.raqam-login-btn:focus,#header #customerLogin.raqam-login-btn:active{display:inline-flex!important;align-items:center!important;gap:8px!important;flex-shrink:0!important;flex-grow:0!important;background:transparent!important;border:none!important;box-shadow:none!important;border-radius:0!important;padding:0!important;margin:0!important;color:#fff!important;font-size:17px!important;font-weight:500!important;line-height:1!important;text-decoration:none!important;cursor:pointer!important;white-space:nowrap!important;position:relative!important;width:auto!important;transform:none!important;transition:none!important;animation:none!important}',
      '#header .raqam-user-icon{display:inline-flex!important;align-items:center!important;justify-content:center!important;width:auto!important;height:auto!important;border:none!important;color:#fff!important;font-size:18px!important;flex-shrink:0!important}',
      '#header .raqam-user-icon i{font-size:23px!important;line-height:1!important;color:#fff!important}',
      '#header .raqam-login-text{display:none!important;direction:rtl!important;font-size:17px!important;font-weight:500!important;line-height:1!important;color:#fff!important}',
      '#header .s-user-menu-wrapper.raqam-user-menu,#header .raqam-zone-left .s-user-menu-wrapper{display:inline-flex!important;align-items:center!important;justify-content:center!important;padding:0!important;margin:0!important;background:transparent!important;border:none!important;box-shadow:none!important;flex-shrink:0!important;flex-grow:0!important;position:relative!important;overflow:visible!important;z-index:10020!important;align-self:center!important;height:auto!important;max-height:52px!important}',
      '#header .s-user-menu-wrapper .s-user-menu-trigger-slot,#header .s-user-menu-wrapper .dropdown-toggle{display:inline-flex!important;align-items:center!important;justify-content:center!important;background:transparent!important;border:none!important;box-shadow:none!important;padding:0!important;margin:0!important;cursor:pointer!important;position:relative!important;flex-shrink:0!important}',
      '#header .s-user-menu-wrapper .top-links-icon,#header .s-user-menu-wrapper .top-links-account,#header .s-user-menu-wrapper .icon-user,#header .s-user-menu-wrapper i{color:#fff!important;font-size:23px!important;line-height:1!important}',
      '#header .s-user-menu-wrapper .s-user-menu-trigger-avatar-only img{border:2px solid rgba(255,255,255,.35)!important;border-radius:50%!important}',
      '#header .s-user-menu-wrapper .dropdown-list.s-user-menu-toggler{position:absolute!important;top:calc(100% + 8px)!important;inset-inline-start:0!important;inset-inline-end:auto!important;left:0!important;right:auto!important;bottom:auto!important;width:min(280px,90vw)!important;min-width:0!important;max-width:90vw!important;margin:0!important;padding:0!important;float:none!important;transform:none!important;z-index:99999!important;background:transparent!important;border:none!important;box-shadow:none!important;overflow:visible!important;max-height:none!important;height:auto!important;min-height:0!important;contain:none!important}',
      '#header .s-user-menu-wrapper .s-user-menu-trigger-slot.active + .dropdown-list.s-user-menu-toggler,#header .s-user-menu-wrapper .dropdown-toggle.active ~ .dropdown-list.s-user-menu-toggler{visibility:visible!important;pointer-events:auto!important;opacity:1!important}',
      '#header .s-user-menu-dropdown,.s-user-menu-dropdown{background:rgba(30,15,45,.92)!important;backdrop-filter:blur(12px)!important;border:1px solid rgba(168,85,247,.35)!important;border-radius:12px!important;box-shadow:0 8px 32px rgba(0,0,0,.45)!important;padding:0!important;overflow:visible!important;direction:rtl!important;width:100%!important;box-sizing:border-box!important;height:auto!important}',
      '#header .s-user-menu-dropdown-header{display:flex!important;align-items:center!important;gap:12px!important;padding:14px 16px!important;border-bottom:1px solid rgba(168,85,247,.22)!important;background:rgba(54,10,97,.35)!important;position:relative!important}',
      '#header .s-user-menu-dropdown-header img{width:44px!important;height:44px!important;border-radius:50%!important;border:2px solid #a855f7!important;object-fit:cover!important;flex-shrink:0!important}',
      '#header .s-user-menu-dropdown-header-content{display:flex!important;flex-direction:column!important;gap:2px!important;min-width:0!important}',
      '#header .s-user-menu-dropdown-header-content span,#header .s-user-menu-dropdown-header-content p{color:#fff!important;margin:0!important;line-height:1.3!important}',
      '#header .s-user-menu-dropdown-header-content span{font-size:12px!important;opacity:.8!important}',
      '#header .s-user-menu-dropdown-header-content p{font-size:15px!important;font-weight:600!important}',
      '#header .s-user-menu-dropdown-header-close{position:absolute!important;top:10px!important;left:10px!important;background:transparent!important;border:none!important;padding:4px!important;cursor:pointer!important;color:#fff!important}',
      '#header .s-user-menu-dropdown-header-close svg{width:18px!important;height:18px!important;fill:#fff!important}',
      '#header .dropdown-list.s-user-menu-toggler .s-user-menu-dropdown-list,#header .s-user-menu-dropdown-list{list-style:none!important;margin:0!important;padding:8px!important;display:block!important;visibility:visible!important;opacity:1!important;height:auto!important;overflow:visible!important}',
      '#header .s-user-menu-dropdown-item{margin:0!important;padding:0!important;border:none!important;display:block!important;visibility:visible!important;opacity:1!important;height:auto!important;overflow:visible!important}',
      '#header .s-user-menu-dropdown-item a,#header .s-user-menu-dropdown-item button{padding:11px 12px!important;color:#fff!important;background:transparent!important;border:none!important;text-decoration:none!important;font-size:14px!important;font-weight:500!important;display:flex!important;align-items:center!important;gap:10px!important;width:100%!important;border-radius:10px!important;box-sizing:border-box!important;visibility:visible!important;opacity:1!important;height:auto!important;overflow:visible!important}',
      '#header .s-user-menu-dropdown-item-title,#header .s-user-menu-dropdown-item a,#header .s-user-menu-dropdown-item button{color:#fff!important;-webkit-text-fill-color:#fff!important}',
      '#header .s-user-menu-dropdown-item a i,#header .s-user-menu-dropdown-item a [class*=icon]{color:#a855f7!important;font-size:18px!important;flex-shrink:0!important}',
      '#header .s-user-menu-dropdown-item a:hover,#header .s-user-menu-dropdown-item a:focus{background:rgba(168,85,247,.22)!important;color:#fff!important}',
      '#header .s-user-menu-dropdown-item-logout a{color:#fecaca!important}',
      '#header .s-user-menu-dropdown-item-logout a i{color:#f87171!important}',
      '#header .raqam-zone-left > ul.s-user-menu-dropdown-list,#header .raqam-zone-right > ul.s-user-menu-dropdown-list{display:none!important;visibility:hidden!important;height:0!important;overflow:hidden!important;pointer-events:none!important;position:absolute!important}',
      '#header twsaa-cart-summary,#header twsaa-cart-summary.raqam-cart-compact{position:relative!important;top:auto!important;left:auto!important;right:auto!important;bottom:auto!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;flex-shrink:0!important;flex-grow:0!important;width:36px!important;min-width:36px!important;max-width:36px!important;height:36px!important;margin:0!important;padding:0!important;overflow:visible!important;z-index:auto!important;transform:none!important;float:none!important;inset:auto!important}',
      '#header twsaa-cart-summary .s-cart-summary-wrapper{position:relative!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;width:28px!important;height:28px!important;padding:0!important;margin:0!important;text-decoration:none!important;overflow:visible!important;flex-shrink:0!important;box-sizing:content-box!important;top:auto!important;left:auto!important;right:auto!important;transform:none!important}',
      '#header twsaa-cart-summary #s-cart-icon,#header twsaa-cart-summary .header-btn.btn{display:inline-flex!important;align-items:center!important;justify-content:center!important;padding:0!important;margin:0!important;background:transparent!important;border:none!important;position:relative!important}',
      '#header twsaa-cart-summary a,#header twsaa-cart-summary button{color:#fff!important;background:transparent!important;border:none!important}',
      '#header twsaa-cart-summary i,#header twsaa-cart-summary svg,#header twsaa-cart-summary .icon-cart,#header twsaa-cart-summary .s-cart-summary-icon{color:#fff!important;fill:#fff!important;font-size:27px!important;width:27px!important;height:27px!important}',
      '#header twsaa-cart-summary .s-cart-summary-total,#header twsaa-cart-summary .s-cart-summary-content,#header twsaa-cart-summary p.s-cart-summary-content,#header twsaa-cart-summary .sar-icon,#header twsaa-cart-summary slot-fb{display:none!important;width:0!important;height:0!important;overflow:hidden!important;visibility:hidden!important;position:absolute!important;pointer-events:none!important;opacity:0!important}',
      '#header twsaa-cart-summary .s-cart-summary-count{position:absolute!important;top:-6px!important;right:-8px!important;background:#3b82f6!important;color:#fff!important;border-radius:50%!important;min-width:18px!important;height:18px!important;padding:0 4px!important;display:flex!important;align-items:center!important;justify-content:center!important;font-size:10px!important;font-weight:700!important;z-index:2!important;pointer-events:none!important}',
      '#header .raqam-lang-btn{display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:6px!important;background:transparent!important;border:none!important;padding:0!important;margin:0!important;color:#fff!important;cursor:pointer!important}',
      '#header .raqam-lang-icon{display:inline-flex!important;align-items:center!important;justify-content:center!important}',
      '#header .raqam-lang-icon svg{width:23px!important;height:23px!important;color:#fff!important;stroke:#fff!important}',
      '#header .raqam-lang-label{display:none!important;font-size:17px!important;font-weight:500!important;color:#fff!important;direction:rtl!important}',
      '#header .raqam-lang-ar{font-size:17px!important;font-weight:500!important;color:#fff!important}',
      '#header .raqam-lang-label .raqam-lang-sep{opacity:.85!important;margin:0 6px!important}',
      '#header .raqam-lang-flag{display:none!important}',
      '#header .raqam-lang-flag .flag,#header .raqam-lang-flag .iti__flag{display:inline-block!important;width:22px!important;height:15px!important;border-radius:2px!important}',
      '#header .raqam-lang-btn .symbol,#header .raqam-lang-btn .sar-icon{display:none!important}',
      '#header .raqam-zone-center .navbar-brand,#header .raqam-zone-center .raqam-brand-link{display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:12px!important;padding:4px 8px!important;text-decoration:none!important;max-width:100%!important}',
      '#header .raqam-zone-center h2{display:block!important;color:#fff!important;font-size:18px!important;font-weight:600!important;margin:0!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;direction:rtl!important}',
      '#header .raqam-menu-btn{display:inline-flex!important;align-items:center!important;justify-content:center!important;background:transparent!important;border:none!important;padding:0!important;color:#fff!important;cursor:pointer!important;text-decoration:none!important}',
      '#header .raqam-menu-btn i{font-size:31px!important;color:#fff!important}',
      '#header .logo img,#header .logo-light,#header .navbar-brand img{max-height:50px!important;width:auto!important}',
      '#header .search-btn,#header .nav-header,#header .camera-btn,#header .header-buttons{display:none!important}',
      '#header .text-black,#header .da-tm,#header twsaa-cart-summary .text-black,#header twsaa-cart-summary .da-tm,#header .search-btn .text-black,#header .search-btn .da-tm{color:#fff!important}',
      '#header .raqam-zone-left .mburger:not([data-raqam-menu]),#header .raqam-zone-left .search-btn{display:none!important}',
      '#header.raqam-user-menu-open,#header.raqam-user-menu-open #mainnav,#header.raqam-user-menu-open .raqam-header-row,#header.raqam-user-menu-open .raqam-zone-left{overflow:visible!important}',
      '#header.raqam-user-menu-open .raqam-header-row{align-items:center!important;align-self:center!important}',
      '#raqam-mobile-menu-portal{position:fixed!important;inset:0!important;pointer-events:none!important;z-index:100000!important}',
      '#raqam-mobile-menu-portal .dropdown-list.s-user-menu-toggler{position:fixed!important;pointer-events:auto!important;z-index:100001!important;margin:0!important;padding:0!important;background:transparent!important;border:none!important;box-shadow:none!important;overflow:visible!important;visibility:visible!important;opacity:1!important}',
      '#raqam-mobile-menu-portal .s-user-menu-dropdown{background:rgba(20,12,35,.94)!important;backdrop-filter:blur(12px)!important;border:1px solid rgba(139,81,254,.5)!important;border-radius:12px!important;box-shadow:0 4px 20px rgba(0,0,0,.28)!important;padding:0!important;direction:rtl!important;width:100%!important;pointer-events:auto!important}',
      '#raqam-mobile-menu-portal .s-user-menu-dropdown-header{display:flex!important;align-items:center!important;gap:10px!important;padding:10px 12px!important;border-bottom:1px solid rgba(168,85,247,.22)!important;background:rgba(54,10,97,.2)!important;position:relative!important}',
      '#raqam-mobile-menu-portal .s-user-menu-dropdown-header img{width:40px!important;height:40px!important;border-radius:50%!important;border:2px solid #a855f7!important}',
      '#raqam-mobile-menu-portal .s-user-menu-dropdown-header-content span,#raqam-mobile-menu-portal .s-user-menu-dropdown-header-content p,#raqam-mobile-menu-portal .s-user-menu-dropdown-item-title,#raqam-mobile-menu-portal .s-user-menu-dropdown-item a,#raqam-mobile-menu-portal .s-user-menu-dropdown-item button{color:#fff!important;-webkit-text-fill-color:#fff!important}',
      '#raqam-mobile-menu-portal .s-user-menu-dropdown-header-content p{font-size:14px!important;font-weight:600!important}',
      '#raqam-mobile-menu-portal .s-user-menu-dropdown-header-close{position:absolute!important;top:10px!important;left:10px!important;background:transparent!important;border:none!important;cursor:pointer!important;color:#fff!important;pointer-events:auto!important}',
      '#raqam-mobile-menu-portal .s-user-menu-dropdown-list{list-style:none!important;margin:0!important;padding:6px!important;display:block!important;pointer-events:auto!important}',
      '#raqam-mobile-menu-portal .s-user-menu-dropdown-item a,#raqam-mobile-menu-portal .s-user-menu-dropdown-item button{padding:10px 12px!important;background:transparent!important;border:none!important;text-decoration:none!important;font-size:14px!important;display:flex!important;align-items:center!important;gap:10px!important;width:100%!important;border-radius:8px!important;pointer-events:auto!important;cursor:pointer!important;touch-action:manipulation!important}',
      '#raqam-mobile-menu-portal .s-user-menu-dropdown-item a i,#raqam-mobile-menu-portal .s-user-menu-dropdown-item a [class*=icon]{color:#a855f7!important;font-size:16px!important;pointer-events:none!important}',
      '#raqam-mobile-menu-portal .s-user-menu-dropdown-item-logout a{color:#fecaca!important;-webkit-text-fill-color:#fecaca!important}',
      '.raqam-user-menu-backdrop{display:none!important}',
      '@media (max-width:1023px){#header .raqam-lang-btn.raqam-lang-fallback .raqam-lang-flag{display:inline-flex!important}}',
      '@media (min-width:1024px){#header .raqam-header-row,#header.raqam-user-menu-open .raqam-header-row{min-height:80px!important;max-height:80px!important}#header .raqam-zone-left{gap:24px!important}#header #customerLogin.raqam-login-btn{font-size:18px!important}#header .raqam-login-text,#header .raqam-lang-label{display:inline!important;font-size:18px!important}#header .raqam-lang-flag{display:inline-flex!important}#header .raqam-lang-icon{display:none!important}#header .raqam-zone-center{max-width:calc(100% - 420px)!important}#header .raqam-zone-center h2{font-size:20px!important}#header .logo img,#header .logo-light,#header .navbar-brand img{max-height:52px!important}}'
    ].join('\n');
  }
  function fixAllInners(mainnav) {
    if (!mainnav) return;
    mainnav.querySelectorAll('.inner').forEach(function (inner) {
      inner.classList.remove('bg-white');
      inner.style.backgroundColor = '#000';
      if (inner.classList.contains('nav-header')) {
        inner.classList.add('raqam-hide');
        inner.style.display = 'none';
        inner.style.backgroundColor = '#000';
      }
    });
  }
  function fixHeaderColors(header) {
    if (!header) return;
    header.querySelectorAll('.text-black, .da-tm').forEach(function (el) {
      el.classList.remove('text-black', 'da-tm');
      el.classList.add('text-white');
      el.style.color = '#ffffff';
    });
  }
  function hideExtra(header) {
    var searchBtn = header.querySelector('.search-btn');
    if (searchBtn) searchBtn.classList.add('raqam-hide');
    header.querySelectorAll('.nav-header').forEach(function (navHeader) {
      navHeader.classList.add('raqam-hide');
      navHeader.style.display = 'none';
      navHeader.style.backgroundColor = '#000';
    });
    var headerButtons = header.querySelector('.header-buttons');
    if (headerButtons) headerButtons.classList.add('raqam-hide');
    var cartSummary = header.querySelector('twsaa-cart-summary');
    if (cartSummary) {
      cartSummary.querySelectorAll(
        '.s-cart-summary-content, .s-cart-summary-total, .sar-icon, p.s-cart-summary-content'
      ).forEach(function (el) {
        el.classList.add('raqam-hide');
        el.style.display = 'none';
      });
    }
  }
  function setupBrandCenter(centerZone) {
    if (!centerZone) return;
    var brand = centerZone.querySelector('.navbar-brand') || centerZone.querySelector('a');
    if (brand) {
      brand.classList.add('raqam-brand-link');
    }
    var h2 = centerZone.querySelector('h2');
    if (h2) {
      h2.classList.remove('raqam-hide');
      h2.style.color = '#ffffff';
      h2.style.display = '';
    }
  }
  function preserveModalAttrs(fromEl, toEl) {
    if (!fromEl || !toEl) return;
    ['data-toggle', 'data-target', 'data-bs-toggle', 'data-bs-target', 'onclick'].forEach(function (attr) {
      var val = fromEl.getAttribute(attr);
      if (val && !toEl.getAttribute(attr)) toEl.setAttribute(attr, val);
    });
  }
  function styleLogin(loginBtn) {
    if (!loginBtn || loginBtn.getAttribute('data-raqam-login-styled') === '1') return;
    loginBtn.classList.add('raqam-login-btn');
    loginBtn.setAttribute('aria-label', 'تسجيل الدخول');
    loginBtn.innerHTML =
      '<span class="raqam-user-icon" aria-hidden="true"><i class="icon-user"></i></span>' +
      '<span class="raqam-login-text">تسجيل الدخول</span>';
    loginBtn.style.color = '#ffffff';
    loginBtn.style.backgroundColor = 'transparent';
    loginBtn.style.position = 'relative';
    loginBtn.style.display = 'inline-flex';
    loginBtn.style.flexShrink = '0';
    loginBtn.setAttribute('data-raqam-login-styled', '1');
  }
  function styleUserMenu(wrapper) {
    if (!wrapper) return;
    wrapper.classList.add('raqam-user-menu');
    wrapper.classList.remove('raqam-hide', 'p-2');
    wrapper.style.padding = '0';
    wrapper.style.margin = '0';
    wrapper.style.background = 'transparent';
    wrapper.style.display = 'inline-flex';
    wrapper.style.alignItems = 'center';
    wrapper.style.position = 'relative';
    wrapper.style.overflow = 'visible';
    wrapper.style.flexShrink = '0';
    wrapper.setAttribute('data-raqam-user-styled', '1');
    var trigger = wrapper.querySelector('.s-user-menu-trigger-slot, .dropdown-toggle');
    if (trigger) {
      trigger.style.background = 'transparent';
      trigger.style.border = 'none';
      trigger.style.boxShadow = 'none';
      trigger.style.padding = '0';
      trigger.style.margin = '0';
    }
    wrapper.querySelectorAll('.top-links-icon, .top-links-account, .icon-user, i').forEach(function (el) {
      el.style.color = '#ffffff';
    });
  }
  function styleAccountEl(accountEl) {
    if (!accountEl) return;
    if (accountEl.id === 'customerLogin') styleLogin(accountEl);
    else styleUserMenu(accountEl);
  }
  function compactCartSummary(cartSummary) {
    if (!cartSummary) return;
    cartSummary.classList.add('raqam-cart-compact');
    cartSummary.style.position = 'relative';
    cartSummary.style.display = 'inline-flex';
    cartSummary.style.alignItems = 'center';
    cartSummary.style.justifyContent = 'center';
    cartSummary.style.width = '36px';
    cartSummary.style.minWidth = '36px';
    cartSummary.style.maxWidth = '36px';
    cartSummary.style.height = '36px';
    cartSummary.style.margin = '0';
    cartSummary.style.padding = '0';
    cartSummary.style.top = 'auto';
    cartSummary.style.left = 'auto';
    cartSummary.style.right = 'auto';
    cartSummary.style.bottom = 'auto';
    cartSummary.style.transform = 'none';
    cartSummary.style.zIndex = 'auto';
    cartSummary.style.flexShrink = '0';
    cartSummary.style.flexGrow = '0';
    cartSummary.style.float = 'none';
    var wrapper = cartSummary.querySelector('.s-cart-summary-wrapper');
    if (wrapper) {
      wrapper.style.display = 'inline-flex';
      wrapper.style.position = 'relative';
      wrapper.style.alignItems = 'center';
      wrapper.style.justifyContent = 'center';
      wrapper.style.width = '28px';
      wrapper.style.height = '28px';
      wrapper.style.padding = '0';
      wrapper.style.margin = '0';
      wrapper.style.overflow = 'visible';
      wrapper.style.flexShrink = '0';
      wrapper.style.top = 'auto';
      wrapper.style.left = 'auto';
      wrapper.style.right = 'auto';
      wrapper.style.transform = 'none';
    }
    cartSummary.querySelectorAll(
      '.s-cart-summary-content, .s-cart-summary-total, .sar-icon, p.s-cart-summary-content'
    ).forEach(function (el) {
      el.classList.add('raqam-hide');
      el.style.display = 'none';
      el.style.visibility = 'hidden';
      el.style.opacity = '0';
    });
    var iconWrap = cartSummary.querySelector('#s-cart-icon') || cartSummary.querySelector('.header-btn.btn');
    if (iconWrap) {
      iconWrap.style.display = 'inline-flex';
      iconWrap.style.padding = '0';
      iconWrap.style.margin = '0';
      iconWrap.style.position = 'relative';
    }
    cartSummary.querySelectorAll('.text-black, .da-tm').forEach(function (el) {
      el.classList.remove('text-black', 'da-tm');
      el.classList.add('text-white');
      el.style.color = '#ffffff';
    });
    var cartCount = cartSummary.querySelector('.s-cart-summary-count');
    if (cartCount) {
      cartCount.style.position = 'absolute';
      cartCount.style.top = '-6px';
      cartCount.style.right = '-8px';
      cartCount.style.left = 'auto';
      cartCount.style.backgroundColor = '#3b82f6';
      cartCount.style.color = '#ffffff';
      cartCount.style.borderRadius = '50%';
      cartCount.style.minWidth = '18px';
      cartCount.style.height = '18px';
      cartCount.style.display = 'flex';
      cartCount.style.alignItems = 'center';
      cartCount.style.justifyContent = 'center';
      cartCount.style.fontSize = '10px';
      cartCount.style.fontWeight = '700';
      cartCount.style.zIndex = '2';
      cartCount.style.pointerEvents = 'none';
      if (wrapper && cartCount.parentElement !== wrapper) {
        wrapper.appendChild(cartCount);
      }
    }
  }
  function getLangFlagHtml(existingBtn) {
    if (existingBtn) {
      var flag = existingBtn.querySelector('.iti__flag, .flag[class*="iti__"]');
      if (flag) {
        var clone = flag.cloneNode(true);
        clone.classList.add('rounded-sm');
        clone.textContent = '';
        return clone.outerHTML;
      }
    }
    return '<span class="flag iti__flag iti__sa rounded-sm"></span>';
  }
  function getLangBtnInnerHtml(flagHtml) {
    return (
      '<span class="raqam-lang-icon" aria-hidden="true">' + LANG_ICON_SVG + '</span>' +
      '<span class="raqam-lang-label">' +
        '<span class="raqam-lang-ar">العربية</span>' +
        '<span class="raqam-lang-sep" aria-hidden="true">|</span>' +
      '</span>' +
      '<span class="raqam-lang-flag" aria-hidden="true">' + flagHtml + '</span>'
    );
  }
  function needsLangIconUpdate(langBtn) {
    if (!langBtn) return false;
    if (langBtn.getAttribute('data-raqam-lang-icon-v2') !== '1') return true;
    var icon = langBtn.querySelector('.raqam-lang-icon');
    if (!icon) return true;
    if (icon.querySelector('svg')) return false;
    var iTag = icon.querySelector('i');
    if (!iTag) return true;
    return !elVisible(iTag);
  }
  function ensureLangIconVisible(langBtn) {
    if (!langBtn) return;
    if (!isMobileView()) {
      langBtn.classList.remove('raqam-lang-fallback');
      return;
    }
    var icon = langBtn.querySelector('.raqam-lang-icon');
    var svg = icon && icon.querySelector('svg');
    if (svg && elVisible(svg)) {
      langBtn.classList.remove('raqam-lang-fallback');
      return;
    }
    langBtn.classList.add('raqam-lang-fallback');
  }
  function findLangBtn(header) {
    return (
      header.querySelector('[data-raqam-lang]') ||
      header.querySelector('[data-target="#customerLangModal"]') ||
      header.querySelector('[data-bs-target="#customerLangModal"]') ||
      header.querySelector('.header-buttons .lang.btn') ||
      header.querySelector('.header-buttons button.lang') ||
      header.querySelector('button.lang.btn') ||
      header.querySelector('button.lang') ||
      header.querySelector('[aria-label="language"]')
    );
  }
  function ensureRightGroup(rightZone) {
    if (!rightZone) return null;
    var group = rightZone.querySelector('.raqam-right-group');
    if (!group) {
      group = document.createElement('div');
      group.className = 'raqam-right-group';
      rightZone.appendChild(group);
    }
    return group;
  }
  function placeLangInRightGroup(langBtn, rightGroup) {
    if (!langBtn || !rightGroup) return;
    var menuBtn = rightGroup.querySelector('[data-raqam-menu]');
    if (menuBtn) {
      if (langBtn !== menuBtn && langBtn.nextSibling !== menuBtn) {
        rightGroup.insertBefore(langBtn, menuBtn);
      }
    } else if (!rightGroup.contains(langBtn)) {
      rightGroup.appendChild(langBtn);
    }
  }
  function setupLangBtn(header, rightZone) {
    var existing = findLangBtn(header);
    var langBtn;
    var flagHtml = getLangFlagHtml(existing);
    var rightGroup = ensureRightGroup(rightZone);
    if (existing) {
      langBtn = existing;
    } else {
      langBtn = document.createElement('button');
      langBtn.type = 'button';
      langBtn.className = 'lang btn raqam-lang-btn';
      langBtn.setAttribute('aria-label', 'language');
      langBtn.setAttribute('data-toggle', 'modal');
      langBtn.setAttribute('data-target', '#customerLangModal');
    }
    langBtn.setAttribute('data-raqam-lang', '1');
    langBtn.classList.add('raqam-lang-btn');
    if (!langBtn.getAttribute('data-target') && !langBtn.getAttribute('data-bs-target')) {
      langBtn.setAttribute('data-toggle', 'modal');
      langBtn.setAttribute('data-target', '#customerLangModal');
    }
    if (needsLangIconUpdate(langBtn)) {
      langBtn.innerHTML = getLangBtnInnerHtml(flagHtml);
      langBtn.setAttribute('data-raqam-lang-icon-v2', '1');
    }
    placeLangInRightGroup(langBtn, rightGroup);
    requestAnimationFrame(function () {
      ensureLangIconVisible(langBtn);
    });
    return langBtn;
  }
  function findMenuBtn(header) {
    return (
      header.querySelector('[data-raqam-menu]') ||
      header.querySelector('a[href="#mobile-menu"]') ||
      header.querySelector('[data-target="#mobile-menu"]') ||
      header.querySelector('.mburger') ||
      header.querySelector('[aria-label="menu"]')
    );
  }
  function setupMenuBtn(header, rightZone) {
    var existing = findMenuBtn(header);
    var menuBtn;
    var rightGroup = ensureRightGroup(rightZone);
    if (existing) {
      menuBtn = existing;
      if (menuBtn.tagName === 'A' && !menuBtn.getAttribute('href')) {
        menuBtn.setAttribute('href', '#mobile-menu');
      }
    } else {
      menuBtn = document.createElement('a');
      menuBtn.setAttribute('href', '#mobile-menu');
      menuBtn.setAttribute('aria-label', 'menu');
      menuBtn.className = 'mburger mburger--collapse flex raqam-menu-btn';
      menuBtn.innerHTML = '<i class="icon-menu"></i>';
    }
    menuBtn.setAttribute('data-raqam-menu', '1');
    menuBtn.classList.add('raqam-menu-btn');
    menuBtn.style.display = '';
    if (rightGroup && !rightGroup.contains(menuBtn)) {
      rightGroup.appendChild(menuBtn);
    }
    return menuBtn;
  }
  function ensureLeftZoneOrder(leftZone, accountEl, cartSummary) {
    if (!leftZone || !cartSummary) return;
    if (accountEl) {
      accountEl.classList.remove('raqam-hide');
      if (!leftZone.contains(accountEl)) {
        leftZone.insertBefore(accountEl, leftZone.firstChild);
      }
      if (!leftZone.contains(cartSummary)) {
        if (accountEl.nextSibling) {
          leftZone.insertBefore(cartSummary, accountEl.nextSibling);
        } else {
          leftZone.appendChild(cartSummary);
        }
      } else if (cartSummary.previousElementSibling !== accountEl) {
        leftZone.insertBefore(cartSummary, accountEl.nextSibling);
      }
    } else if (!leftZone.contains(cartSummary)) {
      leftZone.insertBefore(cartSummary, leftZone.firstChild);
    }
    leftZone.querySelectorAll('[data-raqam-lang]').forEach(function (lang) {
      lang.classList.add('raqam-hide');
    });
    leftZone.querySelectorAll('.mburger:not([data-raqam-menu]), .search-btn').forEach(function (el) {
      el.classList.add('raqam-hide');
    });
    var header = document.getElementById('header');
    if (header) {
      header.querySelectorAll('.s-user-menu-wrapper').forEach(function (wrapper) {
        if (!leftZone.contains(wrapper)) wrapper.classList.add('raqam-hide');
      });
    }
  }
  function refreshAccountZone(header) {
    if (!header) return;
    var container = header.querySelector('.container .flex.items-stretch.justify-between.relative');
    if (!container) return;
    var leftZone = container.querySelector('.raqam-zone-left');
    if (!leftZone) return;
    var cartSummary = header.querySelector('twsaa-cart-summary');
    if (!cartSummary) return;
    var accountEl = getLeftAccountEl(header);
    if (accountEl) styleAccountEl(accountEl);
    ensureLeftZoneOrder(leftZone, accountEl, cartSummary);
    compactCartSummary(cartSummary);
    fixHeaderColors(header);
    fixAllInners(document.getElementById('mainnav'));
    hideExtra(header);
    header.setAttribute(AUTH_ATTR, getAuthState(header));
    syncUserMenuState();
  }
  function modifyHeader() {
    var header = document.getElementById('header');
    if (!header) return false;
    var mainnav = document.getElementById('mainnav');
    fixAllInners(mainnav);
    var container = header.querySelector('.container .flex.items-stretch.justify-between.relative');
    if (!container) return false;
    var cartSummary = header.querySelector('twsaa-cart-summary');
    if (!cartSummary) return false;
    var accountEl = getLeftAccountEl(header);
    var leftZone = container.querySelector('.raqam-zone-left') ||
      container.querySelector('.flex.items-center.justify-start.w-1\\/3');
    var centerZone = container.querySelector('.raqam-zone-center') ||
      container.querySelector('.flex.items-center.flex-col.justify-center');
    var rightZone = container.querySelector('.raqam-zone-right') ||
      container.querySelector('.flex.items-center.justify-end.w-1\\/3');
    if (!leftZone || !centerZone || !rightZone) return false;
    if (container.getAttribute(MODIFIED_ATTR) === '1') {
      if (accountEl) styleAccountEl(accountEl);
      compactCartSummary(cartSummary);
      ensureLeftZoneOrder(leftZone, accountEl, cartSummary);
      setupBrandCenter(centerZone);
      var langBeforeRetry = findLangBtn(header);
      var menuBtnRetry = setupMenuBtn(header, rightZone);
      var langBtnRetry = setupLangBtn(header, rightZone);
      preserveModalAttrs(langBeforeRetry, langBtnRetry);
      preserveModalAttrs(findMenuBtn(header), menuBtnRetry);
      fixHeaderColors(header);
      hideExtra(header);
      header.setAttribute(AUTH_ATTR, getAuthState(header));
      syncUserMenuState();
      return true;
    }
    var langBefore = findLangBtn(header);
    var menuBefore = findMenuBtn(header);
    container.classList.add('raqam-header-row');
    container.setAttribute(MODIFIED_ATTR, '1');
    leftZone.className = 'raqam-zone-left';
    centerZone.className = 'raqam-zone-center';
    rightZone.className = 'raqam-zone-right';
    leftZone.innerHTML = '';
    rightZone.innerHTML = '';
    if (accountEl) {
      styleAccountEl(accountEl);
      leftZone.appendChild(accountEl);
    }
    leftZone.appendChild(cartSummary);
    compactCartSummary(cartSummary);
    var menuBtn = setupMenuBtn(header, rightZone);
    var langBtn = setupLangBtn(header, rightZone);
    preserveModalAttrs(langBefore, langBtn);
    preserveModalAttrs(menuBefore, menuBtn);
    setupBrandCenter(centerZone);
    fixHeaderColors(header);
    header.querySelectorAll('.mburger:not([data-raqam-menu])').forEach(function (btn) {
      if (!rightZone.contains(btn)) btn.classList.add('raqam-hide');
    });
    header.querySelectorAll('.lang.btn:not([data-raqam-lang]), button.lang:not([data-raqam-lang])').forEach(function (btn) {
      btn.classList.add('raqam-hide');
    });
    hideExtra(header);
    header.setAttribute(MODIFIED_ATTR, '1');
    header.setAttribute(AUTH_ATTR, getAuthState(header));
    syncUserMenuState();
    return true;
  }
  function setupObserver() {
    if (observer) return;
    observer = new MutationObserver(function () {
      if (isFixing) return;
      var header = document.getElementById('header');
      if (!header) return;
      var container = header.querySelector('.container .flex.items-stretch.justify-between.relative');
      if (container && container.getAttribute(MODIFIED_ATTR) !== '1') {
        modifyHeader();
      }
      var userMenu = header.querySelector('.s-user-menu-wrapper');
      var loginGone = !document.getElementById('customerLogin');
      var auth = getAuthState(header);
      var prevAuth = header.getAttribute(AUTH_ATTR);
      if (userMenu || loginGone || (auth !== prevAuth && auth !== 'none')) {
        if (container && container.getAttribute(MODIFIED_ATTR) === '1') {
          refreshAccountZone(header);
        }
      }
      var cartSummary = header.querySelector('twsaa-cart-summary');
      if (cartSummary) {
        if (!cartSummary.classList.contains('raqam-cart-compact')) {
          compactCartSummary(cartSummary);
        } else {
          cartSummary.querySelectorAll('.s-cart-summary-total, .s-cart-summary-content').forEach(function (el) {
            if (!el.classList.contains('raqam-hide')) {
              el.classList.add('raqam-hide');
              el.style.display = 'none';
            }
          });
        }
      }
      var langBtn = header.querySelector('[data-raqam-lang]');
      if (langBtn && needsLangIconUpdate(langBtn)) {
        var rightZone = container && container.querySelector('.raqam-zone-right');
        setupLangBtn(header, rightZone);
      }
      fixAllInners(document.getElementById('mainnav'));
      fixHeaderColors(header);
      
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
  function bindLangResize() {
    if (document.documentElement.getAttribute('data-raqam-lang-resize') === '1') return;
    document.documentElement.setAttribute('data-raqam-lang-resize', '1');
    window.addEventListener('resize', function () {
      var langBtn = document.querySelector('#header [data-raqam-lang]');
      if (langBtn) ensureLangIconVisible(langBtn);
    });
  }
  function init() {
    injectStyles();
    if (modifyHeader()) {
      bindMmOcdBackdrop();
      bindLangResize();
      setupUserMenuWatcher();
      setupObserver();
      syncUserMenuState();
      return;
    }
    if (retryCount < MAX_RETRIES) {
      retryCount += 1;
      setTimeout(init, RETRY_MS);
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();















//نافذة تسجيل الدخول
//نافذة تسجيل الدخول
//نافذة تسجيل الدخول

(function () {
  'use strict';

  var STYLE_ID = 'raqam-login-modal-glass-fix';
  var MODAL_ID = 'customerLoginModal';
  var SCOPE = '#' + MODAL_ID;
  var DONE_ATTR = 'data-raqam-login-glass-done';

  var BG_DARK = '#050508';
  var ACCENT = '#8b51fe';
  var BRAND = '#360a61';
  var GLASS_BG = 'rgba(255, 255, 255, 0.07)';
  var GLASS_BORDER = 'rgba(255, 255, 255, 0.14)';
  var BORDER_PURPLE = 'rgba(139, 81, 254, 0.35)';
  var INPUT_BG = 'rgba(26, 16, 37, 0.65)';
  var INPUT_TEXT = '#ffffff';
  var INPUT_PLACEHOLDER = 'rgba(255, 255, 255, 0.45)';
  var BTN_GRAD = 'linear-gradient(135deg, #360a61 0%, #5b1d8a 45%, #7c3aed 100%)';
  var BTN_GRAD_HOVER = 'linear-gradient(135deg, #4a1178 0%, #6d28d9 45%, #8b5cf6 100%)';

  var REAPPLY_DELAYS = [0, 80, 200, 500, 1000, 2000, 3500];
  var fixTimer = null;

  var INPUT_SELECTORS = [
    '.login-form input.control',
    '.login-form input.s-tel-input-control',
    '.login-form #phone',
    '.login-form #otp',
    '#phone',
    '#otp',
    'input.control',
    'input.s-tel-input-control',
    '.iti input',
    '.iti input.control',
    '.iti input.s-tel-input-control',
    '.s-tel-input input',
    '.login-form input[type="tel"]',
    '.login-form input[type="text"]',
    '.login-form input[type="number"]'
  ].join(', ');

  function scopedInputSelectors() {
    return INPUT_SELECTORS.split(', ').map(function (sel) {
      return SCOPE + ' ' + sel;
    }).join(',\n');
  }

  function getModal() {
    return document.getElementById(MODAL_ID);
  }

  function inject() {
    var style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(style);
    }

    style.textContent = [
      '/* raqam-login-modal-glass */',

      SCOPE + '.s-login-modal,',
      SCOPE + '.twsaa-modal {',
      '  color: #ffffff !important;',
      '}',

      SCOPE + ' .s-modal-overlay {',
      '  background: rgba(5, 5, 8, 0.78) !important;',
      '  backdrop-filter: blur(6px) !important;',
      '  -webkit-backdrop-filter: blur(6px) !important;',
      '}',

      SCOPE + ' .s-modal-body {',
      '  background: ' + GLASS_BG + ' !important;',
      '  backdrop-filter: blur(22px) saturate(1.5) !important;',
      '  -webkit-backdrop-filter: blur(22px) saturate(1.5) !important;',
      '  border: 1px solid ' + BORDER_PURPLE + ' !important;',
      '  border-radius: 18px !important;',
      '  box-shadow: 0 16px 48px rgba(54, 10, 97, 0.45), 0 0 0 1px rgba(139, 81, 254, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;',
      '  color: #ffffff !important;',
      '  overflow: hidden !important;',
      '}',

      SCOPE + ' .s-modal-header {',
      '  background: transparent !important;',
      '  border-bottom: 1px solid rgba(139, 81, 254, 0.2) !important;',
      '  padding-bottom: 12px !important;',
      '}',

      SCOPE + ' .s-modal-title {',
      '  color: #ffffff !important;',
      '  font-weight: 700 !important;',
      '  font-size: 1.15rem !important;',
      '}',

      SCOPE + ' .s-modal-header-inner {',
      '  display: flex !important;',
      '  align-items: center !important;',
      '  gap: 10px !important;',
      '}',

      SCOPE + ' .s-login-modal-header-icon {',
      '  display: inline-flex !important;',
      '  align-items: center !important;',
      '  justify-content: center !important;',
      '  width: 44px !important;',
      '  height: 44px !important;',
      '  min-width: 44px !important;',
      '  flex-shrink: 0 !important;',
      '  margin: 0 0 0 8px !important;',
      '  padding: 0 !important;',
      '  border-radius: 50% !important;',
      '  background: rgba(139, 81, 254, 0.12) !important;',
      '  border: 1.5px solid rgba(139, 81, 254, 0.5) !important;',
      '  box-shadow: 0 0 14px rgba(139, 81, 254, 0.15) !important;',
      '}',

      SCOPE + ' .s-login-modal-header-icon i {',
      '  color: ' + ACCENT + ' !important;',
      '  font-size: 1.15rem !important;',
      '  line-height: 1 !important;',
      '  display: block !important;',
      '  margin: 0 !important;',
      '  padding: 0 !important;',
      '}',

      SCOPE + ' .s-modal-close {',
      '  background: transparent !important;',
      '  border: none !important;',
      '  border-radius: 0 !important;',
      '  color: rgba(255, 255, 255, 0.9) !important;',
      '  width: auto !important;',
      '  height: auto !important;',
      '  min-width: unset !important;',
      '  min-height: unset !important;',
      '  padding: 6px !important;',
      '  margin: 0 !important;',
      '  display: inline-flex !important;',
      '  align-items: center !important;',
      '  justify-content: center !important;',
      '  line-height: 1 !important;',
      '  cursor: pointer !important;',
      '  box-shadow: none !important;',
      '  outline: none !important;',
      '  transition: opacity 0.2s ease, color 0.2s ease !important;',
      '}',

      SCOPE + ' .s-modal-close span {',
      '  display: flex !important;',
      '  align-items: center !important;',
      '  justify-content: center !important;',
      '  line-height: 1 !important;',
      '  color: inherit !important;',
      '}',

      SCOPE + ' .s-modal-close i,',
      SCOPE + ' .s-modal-close .icon-cancel {',
      '  color: inherit !important;',
      '  font-size: 16px !important;',
      '  line-height: 1 !important;',
      '  display: block !important;',
      '  margin: 0 !important;',
      '  padding: 0 !important;',
      '}',

      SCOPE + ' .s-modal-close:hover,',
      SCOPE + ' .s-modal-close:focus {',
      '  background: transparent !important;',
      '  border: none !important;',
      '  box-shadow: none !important;',
      '  color: #ffffff !important;',
      '  opacity: 0.72 !important;',
      '  transform: none !important;',
      '}',

      SCOPE + ' .s-modal-close:hover i,',
      SCOPE + ' .s-modal-close:focus i,',
      SCOPE + ' .s-modal-close:hover .icon-cancel,',
      SCOPE + ' .s-modal-close:focus .icon-cancel {',
      '  color: inherit !important;',
      '}',

      SCOPE + ' .s-login-modal-wrapper,',
      SCOPE + ' .auth-content {',
      '  background: transparent !important;',
      '  color: #ffffff !important;',
      '}',

      SCOPE + ' .s-login-modal-wrapper input,',
      SCOPE + ' .auth-content input {',
      '  color: ' + INPUT_TEXT + ' !important;',
      '  -webkit-text-fill-color: ' + INPUT_TEXT + ' !important;',
      '}',

      SCOPE + ' .s-login-modal-wrapper {',
      '  padding-top: 20px !important;',
      '}',

      SCOPE + ' .s-login-modal-label,',
      SCOPE + ' .login-form label {',
      '  color: rgba(255, 255, 255, 0.92) !important;',
      '  font-weight: 600 !important;',
      '  font-size: 0.9rem !important;',
      '}',

      SCOPE + ' .iti,',
      SCOPE + ' .iti--allow-dropdown,',
      SCOPE + ' .s-tel-input {',
      '  width: 100% !important;',
      '  background: transparent !important;',
      '}',

      SCOPE + ' .iti__flag-container {',
      '  z-index: 2 !important;',
      '}',

      scopedInputSelectors() + ' {',
      '  background: ' + INPUT_BG + ' !important;',
      '  background-color: ' + INPUT_BG + ' !important;',
      '  background-image: none !important;',
      '  border: 1px solid ' + BORDER_PURPLE + ' !important;',
      '  border-radius: 12px !important;',
      '  color: ' + INPUT_TEXT + ' !important;',
      '  -webkit-text-fill-color: ' + INPUT_TEXT + ' !important;',
      '  caret-color: ' + INPUT_TEXT + ' !important;',
      '  padding: 12px 14px !important;',
      '  font-size: 15px !important;',
      '  width: 100% !important;',
      '  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.18) !important;',
      '  transition: border-color 0.2s ease, box-shadow 0.2s ease !important;',
      '}',

      scopedInputSelectors().replace(/,/g, '::placeholder,') + '::placeholder {',
      '  color: ' + INPUT_PLACEHOLDER + ' !important;',
      '  -webkit-text-fill-color: ' + INPUT_PLACEHOLDER + ' !important;',
      '  opacity: 1 !important;',
      '}',

      scopedInputSelectors().replace(/,/g, ':-webkit-autofill,') + ':-webkit-autofill,',
      scopedInputSelectors().replace(/,/g, ':-webkit-autofill:focus,') + ':-webkit-autofill:focus {',
      '  -webkit-text-fill-color: ' + INPUT_TEXT + ' !important;',
      '  caret-color: ' + INPUT_TEXT + ' !important;',
      '  color: ' + INPUT_TEXT + ' !important;',
      '  box-shadow: 0 0 0 1000px ' + INPUT_BG + ' inset !important;',
      '  background: ' + INPUT_BG + ' !important;',
      '  background-color: ' + INPUT_BG + ' !important;',
      '}',

      scopedInputSelectors().replace(/,/g, ':focus,') + ':focus {',
      '  outline: none !important;',
      '  background: ' + INPUT_BG + ' !important;',
      '  background-color: ' + INPUT_BG + ' !important;',
      '  color: ' + INPUT_TEXT + ' !important;',
      '  -webkit-text-fill-color: ' + INPUT_TEXT + ' !important;',
      '  border-color: ' + ACCENT + ' !important;',
      '  box-shadow: 0 0 0 3px rgba(139, 81, 254, 0.28), inset 0 1px 2px rgba(0, 0, 0, 0.18) !important;',
      '}',

      SCOPE + ' .control-error,',
      SCOPE + ' .control-errors {',
      '  color: #fca5a5 !important;',
      '  font-size: 0.82rem !important;',
      '}',

      SCOPE + ' #loginSubmit,',
      SCOPE + ' .s-login-modal-enter-button {',
      '  background: ' + BTN_GRAD + ' !important;',
      '  background-image: ' + BTN_GRAD + ' !important;',
      '  background-color: transparent !important;',
      '  border: none !important;',
      '  border-radius: 12px !important;',
      '  color: #ffffff !important;',
      '  font-weight: 700 !important;',
      '  font-size: 15px !important;',
      '  padding: 13px 18px !important;',
      '  margin-top: 8px !important;',
      '  box-shadow: 0 4px 18px rgba(54, 10, 97, 0.45) !important;',
      '  transition: background 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease !important;',
      '}',

      SCOPE + ' #loginSubmit:hover,',
      SCOPE + ' #loginSubmit:focus,',
      SCOPE + ' .s-login-modal-enter-button:hover,',
      SCOPE + ' .s-login-modal-enter-button:focus {',
      '  background: ' + BTN_GRAD_HOVER + ' !important;',
      '  background-image: ' + BTN_GRAD_HOVER + ' !important;',
      '  color: #ffffff !important;',
      '  box-shadow: 0 6px 22px rgba(139, 81, 254, 0.4) !important;',
      '}',

      SCOPE + ' #loginSubmit .s-button-text {',
      '  color: #ffffff !important;',
      '}',

      SCOPE + ' #otpSubmit,',
      SCOPE + ' .verify-resend {',
      '  background: rgba(139, 81, 254, 0.15) !important;',
      '  border: 1px solid ' + BORDER_PURPLE + ' !important;',
      '  border-radius: 12px !important;',
      '  color: #e9d5ff !important;',
      '  font-weight: 600 !important;',
      '}',

      SCOPE + ' #otpSubmit:hover,',
      SCOPE + ' .verify-resend:hover {',
      '  background: rgba(139, 81, 254, 0.28) !important;',
      '  color: #ffffff !important;',
      '}',

      SCOPE + ' .verify-resend-message {',
      '  color: rgba(255, 255, 255, 0.75) !important;',
      '}',

      SCOPE + ' .verify-resend-message b,',
      SCOPE + ' .s-verify-timer {',
      '  color: ' + ACCENT + ' !important;',
      '}',

      '@media (max-width: 768px) {',
      '  ' + SCOPE + ' .s-modal-body {',
      '    border-radius: 16px !important;',
      '    margin: 12px !important;',
      '    max-width: calc(100vw - 24px) !important;',
      '  }',
      '  ' + scopedInputSelectors() + ' {',
      '    font-size: 16px !important;',
      '  }',
      '  ' + SCOPE + ' #loginSubmit,',
      '  ' + SCOPE + ' .s-login-modal-enter-button {',
      '    padding: 14px 16px !important;',
      '  }',
      '}'
    ].join('\n');
  }

  function applyBtnStyle(btn) {
    if (!btn || btn.getAttribute(DONE_ATTR) === '1') return;
    btn.style.setProperty('background', BTN_GRAD, 'important');
    btn.style.setProperty('background-image', BTN_GRAD, 'important');
    btn.style.setProperty('background-color', 'transparent', 'important');
    btn.style.setProperty('border', 'none', 'important');
    btn.style.setProperty('color', '#ffffff', 'important');
    btn.style.setProperty('box-shadow', '0 4px 18px rgba(54, 10, 97, 0.45)', 'important');
    var text = btn.querySelector('.s-button-text');
    if (text) text.style.setProperty('color', '#ffffff', 'important');
    if (!btn.getAttribute('data-raqam-hover-bound')) {
      btn.setAttribute('data-raqam-hover-bound', '1');
      btn.addEventListener('mouseenter', function () {
        btn.style.setProperty('background', BTN_GRAD_HOVER, 'important');
        btn.style.setProperty('background-image', BTN_GRAD_HOVER, 'important');
      });
      btn.addEventListener('mouseleave', function () {
        btn.style.setProperty('background', BTN_GRAD, 'important');
        btn.style.setProperty('background-image', BTN_GRAD, 'important');
      });
    }
    btn.setAttribute(DONE_ATTR, '1');
  }

  function bindInputListeners(input) {
    if (!input || input.getAttribute('data-raqam-input-bound')) return;
    input.setAttribute('data-raqam-input-bound', '1');
    ['input', 'change', 'focus', 'keyup', 'blur', 'paste'].forEach(function (evt) {
      input.addEventListener(evt, function () {
        applyInputStyle(input);
      });
    });
  }

  function applyInputStyle(input) {
    if (!input || input.type === 'hidden') return;
    input.style.setProperty('background', INPUT_BG, 'important');
    input.style.setProperty('background-color', INPUT_BG, 'important');
    input.style.setProperty('background-image', 'none', 'important');
    input.style.setProperty('border', '1px solid ' + BORDER_PURPLE, 'important');
    input.style.setProperty('border-radius', '12px', 'important');
    input.style.setProperty('color', INPUT_TEXT, 'important');
    input.style.setProperty('-webkit-text-fill-color', INPUT_TEXT, 'important');
    input.style.setProperty('caret-color', INPUT_TEXT, 'important');
    bindInputListeners(input);
  }

  function fixInline() {
    var modal = getModal();
    if (!modal) return;
    modal.querySelectorAll('#loginSubmit, .s-login-modal-enter-button').forEach(applyBtnStyle);
    modal.querySelectorAll(INPUT_SELECTORS).forEach(applyInputStyle);
    modal.querySelectorAll('.iti, .iti--allow-dropdown, .s-tel-input').forEach(function (wrap) {
      wrap.style.setProperty('width', '100%', 'important');
      wrap.style.setProperty('background', 'transparent', 'important');
      var inner = wrap.querySelector('input');
      if (inner) applyInputStyle(inner);
    });
  }

  function scheduleReapply() {
    if (fixTimer) clearTimeout(fixTimer);
    fixTimer = setTimeout(function () {
      fixTimer = null;
      inject();
      fixInline();
    }, 80);
  }

  function init() {
    inject();
    fixInline();
    REAPPLY_DELAYS.forEach(function (ms) {
      setTimeout(function () {
        inject();
        fixInline();
      }, ms);
    });
    if (window.raqamThemeReady) window.raqamThemeReady();

    if (document.body) {
      new MutationObserver(function () {
        scheduleReapply();
      }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
    }

    document.addEventListener('click', function (e) {
      var t = e.target && e.target.closest ? e.target.closest('#customerLogin, .s-user-menu-login-btn') : null;
      if (t) {
        REAPPLY_DELAYS.forEach(function (ms) {
          setTimeout(fixInline, ms);
        });
      }
    }, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();


















//اصلاح اللون الموقع من نصوص وغيرها 

(function () {
  'use strict';

  var STYLE_ID = 'raqam-breadcrumb-white';

  function inject() {
    var css = [
      '/* ── مسار التنقل (breadcrumb) ── */',
      '.breadcrumbs,',
      '.nav-breadcrumb,',
      '.breadcrumbs .breadcrumb,',
      '.nav-breadcrumb .breadcrumb {',
      '  background: transparent !important;',
      '}',

      '.breadcrumbs .breadcrumb-item,',
      '.nav-breadcrumb .breadcrumb-item,',
      '.breadcrumb .breadcrumb-item {',
      '  color: #ffffff !important;',
      '}',

      '.breadcrumbs .breadcrumb-item a,',
      '.nav-breadcrumb .breadcrumb-item a,',
      '.breadcrumb .breadcrumb-item a {',
      '  color: #ffffff !important;',
      '  text-decoration: none !important;',
      '}',

      '.breadcrumbs .breadcrumb-item a:hover,',
      '.nav-breadcrumb .breadcrumb-item a:hover {',
      '  color: #c4b5fd !important;',
      '}',

      '.breadcrumbs .breadcrumb-item.active,',
      '.nav-breadcrumb .breadcrumb-item.active,',
      '.breadcrumb .breadcrumb-item.active {',
      '  color: #e9d5ff !important;',
      '}',

      '.breadcrumbs .breadcrumb-item i,',
      '.nav-breadcrumb .breadcrumb-item i,',
      '.breadcrumb .breadcrumb-item .icon-home {',
      '  color: #ffffff !important;',
      '}',

      '.breadcrumbs .breadcrumb-item + .breadcrumb-item::before,',
      '.nav-breadcrumb .breadcrumb-item + .breadcrumb-item::before,',
      '.breadcrumb .breadcrumb-item + .breadcrumb-item::before {',
      '  color: rgba(255, 255, 255, 0.5) !important;',
      '}'
    ].join('\n');

    var style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(style);
    }
    style.textContent = css;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();














//خلفية 


(function () {
  'use strict';

  var DARK = '#050508';
  var STAR_WHITE = '#ffffff';
  var STAR_PURPLE = '#8b51fe';

  function injectSpaceBg() {
    if (document.querySelector('.final-space-bg')) return;

    var spaceContainer = document.createElement('div');
    spaceContainer.className = 'final-space-bg';
    document.body.insertBefore(spaceContainer, document.body.firstChild);

    var meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', DARK);

    var style = document.createElement('style');
    style.id = 'raqam-space-bg';
    style.textContent = [
      'html {',
      '  height: -webkit-fill-available !important;',
      '  background-color: ' + DARK + ' !important;',
      '  background: ' + DARK + ' !important;',
      '}',

      'body {',
      '  min-height: 100vh !important;',
      '  min-height: 100dvh !important;',
      '  min-height: -webkit-fill-available !important;',
      '  background-color: transparent !important;',
      '  background: transparent !important;',
      '  position: relative !important;',
      '}',

      '#page-wrapper, .main-wrapper, #app, .site-container, main, #header, #mainnav, footer, .s-block {',
      '  position: relative !important;',
      '  z-index: 1 !important;',
      '  background-color: transparent !important;',
      '  background: transparent !important;',
      '}',

      '.final-space-bg {',
      '  position: fixed !important;',
      '  top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important;',
      '  width: 100% !important; height: 100% !important;',
      '  min-height: 100vh !important;',
      '  min-height: 100dvh !important;',
      '  min-height: -webkit-fill-available !important;',
      '  background: radial-gradient(ellipse at bottom, #1b111d 0%, #050508 100%) !important;',
      '  z-index: 0 !important;',
      '  overflow: hidden !important;',
      '  pointer-events: none !important;',
      '}',

      '.single-star {',
      '  position: absolute;',
      '  border-radius: 50%;',
      '  animation: moveStarUp linear infinite;',
      '}',

      '@keyframes moveStarUp {',
      '  from { transform: translateY(100vh); }',
      '  to { transform: translateY(-50px); }',
      '}'
    ].join('\n');
    document.head.appendChild(style);

    for (var i = 0; i < 100; i++) {
      var star = document.createElement('div');
      star.className = 'single-star';
      var size = Math.random() * 3 + 1;
      star.style.width = size + 'px';
      star.style.height = size + 'px';
      star.style.left = Math.random() * 100 + '%';
      star.style.top = Math.random() * 100 + '%';
      star.style.backgroundColor = Math.random() < 0.3 ? STAR_WHITE : STAR_PURPLE;
      var duration = Math.random() * 40 + 20;
      star.style.animationDuration = duration + 's';
      star.style.animationDelay = '-' + (Math.random() * duration) + 's';
      spaceContainer.appendChild(star);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectSpaceBg);
  } else {
    injectSpaceBg();
  }
})();






// اصلاح الخلفية  للمشكلة اخفاء معلومات الحساب بسبب الخلفية

(function () {
  'use strict';

  var STYLE_ID = 'raqam-zindex-fix';

  function inject() {
    var css = [
      '/* إصلاح: قائمة الحساب فوق المحتوى */',

      '#header,',
      '#mainnav,',
      '#mainnav .inner {',
      '  position: relative !important;',
      '  z-index: 9990 !important;',
      '}',

      '#header .dropdown,',
      '#header .dropdown-menu,',
      '#header ul.dropdown-menu,',
      '#header .sub-menu,',
      '#header .s-user-menu,',
      '#header .s-user-menu-dropdown,',
      '#header .header-buttons .dropdown-menu,',
      '#header [class*="dropdown"],',
      '#header twsaa-customer-profile,',
      '#header .customer-profile-dropdown {',
      '  z-index: 99999 !important;',
      '  position: relative !important;',
      '}',

      '/* المحتوى يبقى تحت الهيدر */',
      '#page-wrapper,',
      '.main-wrapper,',
      '.site-container,',
      'main,',
      '#app,',
      '.s-main,',
      '.s-block,',
      '.mySwiper,',
      '.swiper-slide,',
      '.product-entry,',
      '.raqam-product-card {',
      '  z-index: 1 !important;',
      '}',

      '/* الخلفية الفضائية */',
      '.final-space-bg {',
      '  z-index: 0 !important;',
      '}'
    ].join('\n');

    var style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(style);
    }
    style.textContent = css;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();




























// منتجات  



(function () {
  'use strict';

  var STYLE_ID = 'raqam-products-pro';
  var VERSION = 'v5';
  var VERSION_ATTR = 'data-raqam-products-v5';
  var MODIFIED_ATTR = 'data-raqam-products-done';
  var BTN_DONE_ATTR = 'data-raqam-btn-done';
  var MAX_RETRIES = 60;
  var RETRY_MS = 150;
  var retryCount = 0;
  var observer = null;

  /* ══ تحكم الجوال ══ */
  var MOBILE_SLIDES_VISIBLE = 2.5;
  var MOBILE_SLIDE_PADDING = 40;

  var BTN_GRADIENT = 'linear-gradient(135deg, #360a61 0%, #5b1d8a 45%, #7c3aed 100%)';
  var BTN_GRADIENT_HOVER = 'linear-gradient(135deg, #4a1178 0%, #6d28d9 45%, #8b5cf6 100%)';

  function applyButtonInline(btn) {
    if (!btn) return;
    btn.style.setProperty('background', BTN_GRADIENT, 'important');
    btn.style.setProperty('background-image', BTN_GRADIENT, 'important');
    btn.style.setProperty('background-color', 'transparent', 'important');
    btn.style.setProperty('border', 'none', 'important');
    btn.style.setProperty('outline', 'none', 'important');
    btn.style.setProperty('box-shadow', '0 4px 14px rgba(54, 10, 97, 0.4)', 'important');
    btn.style.setProperty('color', '#ffffff', 'important');

    if (!btn.getAttribute('data-raqam-hover-bound')) {
      btn.setAttribute('data-raqam-hover-bound', '1');
      btn.addEventListener('mouseenter', function () {
        btn.style.setProperty('background', BTN_GRADIENT_HOVER, 'important');
        btn.style.setProperty('background-image', BTN_GRADIENT_HOVER, 'important');
        btn.style.setProperty('box-shadow', '0 6px 20px rgba(54, 10, 97, 0.55)', 'important');
        btn.style.setProperty('transform', 'none', 'important');
      });
      btn.addEventListener('mouseleave', function () {
        btn.style.setProperty('background', BTN_GRADIENT, 'important');
        btn.style.setProperty('background-image', BTN_GRADIENT, 'important');
        btn.style.setProperty('box-shadow', '0 4px 14px rgba(54, 10, 97, 0.4)', 'important');
        btn.style.setProperty('transform', 'none', 'important');
      });
    }
  }

  function injectStyles() {
    var mobileSlideW = 'calc((100vw - ' + MOBILE_SLIDE_PADDING + 'px) / ' + MOBILE_SLIDES_VISIBLE + ')';

    var css = [
      '/* raqam-products-pro v5 */',

      '.load-products,',
      '.load-products[class*="grid"],',
      'div[class*="grid-cols"]:has(.product-entry),',
      '.grid:has(.product-entry) {',
      '  gap: 16px !important;',
      '}',

      'div[class*="grid-cols"]:has(.product-entry) .product-entry.raqam-product-card,',
      '.load-products[class*="grid"] .product-entry.raqam-product-card {',
      '  min-width: 0 !important;',
      '}',

      '.swiper-slide:has(.product-entry),',
      '.swiper-slide .product-entry.raqam-product-card {',
      '  min-width: 0 !important;',
      '}',

      '@media (max-width: 767px) {',
      '  .mySwiper .swiper-slide.slide--one-sixth,',
      '  .mySwiper .swiper-slide:has(.product-entry) {',
      '    width: ' + mobileSlideW + ' !important;',
      '    max-width: none !important;',
      '    min-width: 0 !important;',
      '  }',
      '}',

      '@media (min-width: 768px) {',
      '  .swiper-slide:has(.product-entry) {',
      '    width: 280px !important;',
      '    max-width: 300px !important;',
      '    min-width: 0 !important;',
      '  }',
      '}',

      '@media (min-width: 1024px) {',
      '  .swiper-slide:has(.product-entry) {',
      '    width: 300px !important;',
      '    max-width: 320px !important;',
      '  }',
      '}',

      '.s-block h2,',
      '.s-block--best-offers h2,',
      '.s-slider-block__title h2 {',
      '  font-size: 22px !important;',
      '  font-weight: 800 !important;',
      '  color: #ffffff !important;',
      '  background: linear-gradient(90deg, #ffffff 0%, #a855f7 50%, #360a61 100%) !important;',
      '  -webkit-background-clip: text !important;',
      '  background-clip: text !important;',
      '  -webkit-text-fill-color: transparent !important;',
      '  text-shadow: none !important;',
      '  margin-bottom: 4px !important;',
      '}',

      '.s-block--best-offers .s-slider-block__title,',
      '.s-block .s-slider-block__title {',
      '  margin-bottom: 14px !important;',
      '}',

      '.s-block a[href*="products"],',
      '.s-block .s-slider-block__title-left a,',
      '.s-block--best-offers a.text-primary,',
      '.s-block a.text-primary {',
      '  color: #7c3aed !important;',
      '  font-weight: 600 !important;',
      '  text-decoration: none !important;',
      '  transition: color 0.2s ease !important;',
      '}',

      '.s-block a[href*="products"]:hover,',
      '.s-block .s-slider-block__title-left a:hover,',
      '.s-block--best-offers a.text-primary:hover {',
      '  color: #360a61 !important;',
      '}',

      '.product-entry.raqam-product-card,',
      '.product-entry.raqam-product-card.bg-white,',
      '.product-entry.raqam-product-card[class*="bg-"],',
      '.product-entry.product-entry--vertical.raqam-product-card {',
      '  background: transparent !important;',
      '  background-color: transparent !important;',
      '  border: none !important;',
      '  box-shadow: none !important;',
      '  border-radius: 12px !important;',
      '  display: flex !important;',
      '  flex-direction: column !important;',
      '  overflow: visible !important;',
      '  height: 100% !important;',
      '}',

      '.product-entry.raqam-product-card:hover {',
      '  background: transparent !important;',
      '  box-shadow: none !important;',
      '}',

      '.product-entry.raqam-product-card.rounded-none,',
      '.product-entry.raqam-product-card.border-transparent,',
      '.product-entry.raqam-product-card[class*="border-"] {',
      '  border: none !important;',
      '  border-radius: 12px !important;',
      '}',

      '.product-entry.raqam-product-card > a:first-child {',
      '  display: block !important;',
      '  padding: 0 !important;',
      '  margin-bottom: 10px !important;',
      '  text-decoration: none !important;',
      '  flex-shrink: 0 !important;',
      '}',

      '.product-entry.raqam-product-card > a:first-child .relative {',
      '  border-radius: 14px !important;',
      '  overflow: hidden !important;',
      '  background: transparent !important;',
      '  box-shadow: 0 0 20px rgba(168, 85, 247, 0.15), 0 4px 16px rgba(0, 0, 0, 0.2) !important;',
      '  transition: box-shadow 0.25s ease !important;',
      '}',

      '.product-entry.raqam-product-card:hover > a:first-child .relative {',
      '  box-shadow: 0 0 28px rgba(168, 85, 247, 0.28), 0 6px 20px rgba(0, 0, 0, 0.25) !important;',
      '}',

      '.product-entry.raqam-product-card > a:first-child .flex.items-center {',
      '  border-radius: 14px !important;',
      '  overflow: hidden !important;',
      '}',

      '.product-entry.raqam-product-card img.aspect-square,',
      '.product-entry.raqam-product-card > a:first-child img {',
      '  width: 100% !important;',
      '  aspect-ratio: 1 / 1 !important;',
      '  object-fit: contain !important;',
      '  display: block !important;',
      '  border-radius: 14px !important;',
      '}',

      '.product-entry.raqam-product-card .promo-title {',
      '  z-index: 3 !important;',
      '  border-radius: 0 0 12px 0 !important;',
      '}',

      '.product-entry.raqam-product-card .donating-wrap {',
      '  display: flex !important;',
      '  flex-direction: column !important;',
      '  flex: 1 1 auto !important;',
      '  height: auto !important;',
      '  padding: 4px 4px 8px !important;',
      '  background: transparent !important;',
      '}',

      '.product-entry.raqam-product-card .title-wrapper {',
      '  text-align: center !important;',
      '  margin-bottom: 6px !important;',
      '}',

      '.product-entry.raqam-product-card .product-entry__title,',
      '.product-entry.raqam-product-card .product-entry__title a {',
      '  color: #ffffff !important;',
      '  font-size: 15px !important;',
      '  font-weight: 700 !important;',
      '  line-height: 1.45 !important;',
      '  text-decoration: none !important;',
      '  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.45) !important;',
      '}',

      '.product-entry.raqam-product-card .s-product-card-content-subtitle {',
      '  color: #c4b5fd !important;',
      '  font-size: 12px !important;',
      '  margin-top: 3px !important;',
      '}',

      '.product-entry.raqam-product-card .price-wrapper {',
      '  display: flex !important;',
      '  justify-content: center !important;',
      '  align-items: center !important;',
      '  flex-wrap: wrap !important;',
      '  gap: 6px 10px !important;',
      '  width: 100% !important;',
      '  margin: 8px 0 10px !important;',
      '}',

      '.product-entry.raqam-product-card .on-sale {',
      '  display: flex !important;',
      '  justify-content: center !important;',
      '  align-items: center !important;',
      '  flex-wrap: wrap !important;',
      '  gap: 6px 10px !important;',
      '  width: 100% !important;',
      '}',

      '.product-entry.raqam-product-card .on-sale .regular-price {',
      '  color: #ef4444 !important;',
      '  text-decoration: line-through !important;',
      '  font-size: 14px !important;',
      '  font-weight: 400 !important;',
      '}',

      '.product-entry.raqam-product-card .on-sale .special-price {',
      '  color: #ffffff !important;',
      '  font-weight: 700 !important;',
      '  font-size: 18px !important;',
      '  text-shadow: 0 1px 6px rgba(0, 0, 0, 0.35) !important;',
      '}',

      '.product-entry.raqam-product-card .price-wrapper > .regular-price {',
      '  color: #ffffff !important;',
      '  font-weight: 700 !important;',
      '  font-size: 18px !important;',
      '  text-decoration: none !important;',
      '  text-shadow: 0 1px 6px rgba(0, 0, 0, 0.35) !important;',
      '}',
      
     '.product-entry.raqam-product-card .on-sale .price,',
      '.product-entry.raqam-product-card .on-sale .price.d-flex,',
      '.product-entry.raqam-product-card .on-sale span.price,',
      '.product-entry.raqam-product-card .price-wrapper .price {',
      '  color: #ffffff !important;',
      '  font-weight: 700 !important;',
      '  font-size: 18px !important;',
      '  text-decoration: none !important;',
      '  text-shadow: 0 1px 6px rgba(0, 0, 0, 0.35) !important;',
      '}',

      '.product-entry.raqam-product-card .on-sale .price .sar-icon,',
      '.product-entry.raqam-product-card .on-sale span.price img.sar-icon,',
      '.product-entry.raqam-product-card .on-sale .special-price .sar-icon,',
      '.product-entry.raqam-product-card .price-wrapper .price .sar-icon,',
      '.product-entry.raqam-product-card .price-wrapper > .regular-price .sar-icon,',
      '.product-entry.raqam-product-card .price-wrapper .sar-icon {',
      '  filter: brightness(0) invert(1) !important;',
      '  -webkit-filter: brightness(0) invert(1) !important;',
      '  opacity: 1 !important;',
      '  vertical-align: middle !important;',
      '}',

      '.product-entry.raqam-product-card .on-sale .regular-price .sar-icon {',
      '  filter: brightness(0) saturate(100%) invert(27%) sepia(95%) saturate(5000%) hue-rotate(350deg) !important;',
      '  -webkit-filter: brightness(0) saturate(100%) invert(27%) sepia(95%) saturate(5000%) hue-rotate(350deg) !important;',
      '  opacity: 0.9 !important;',
      '}',

      '.product-entry.raqam-product-card .product-footer {',
      '  display: flex !important;',
      '  width: 100% !important;',
      '  margin-top: auto !important;',
      '  padding-top: 6px !important;',
      '  justify-content: stretch !important;',
      '}',

      '.product-entry.raqam-product-card .cart-wish-wrap,',
      '.product-entry.raqam-product-card .cart-wish-wrap form,',
      '.product-entry.raqam-product-card [id^="addToCart-"] {',
      '  width: 100% !important;',
      '  display: block !important;',
      '}',

      '.product-entry.raqam-product-card button.addToCart,',
      '.product-entry.raqam-product-card button.addToCart.s-button-outline,',
      '.product-entry.raqam-product-card button.addToCart.s-button-primary-outline,',
      '.product-entry.raqam-product-card button.addToCart.s-button-btn {',
      '  width: 100% !important;',
      '  display: flex !important;',
      '  align-items: center !important;',
      '  justify-content: center !important;',
      '  background: linear-gradient(135deg, #360a61 0%, #5b1d8a 45%, #7c3aed 100%) !important;',
      '  background-image: linear-gradient(135deg, #360a61 0%, #5b1d8a 45%, #7c3aed 100%) !important;',
      '  background-color: transparent !important;',
      '  border: none !important;',
      '  outline: none !important;',
      '  color: #ffffff !important;',
      '  border-radius: 10px !important;',
      '  padding: 12px 16px !important;',
      '  font-size: 15px !important;',
      '  font-weight: 700 !important;',
      '  line-height: 1.3 !important;',
      '  cursor: pointer !important;',
      '  box-shadow: 0 4px 14px rgba(54, 10, 97, 0.4) !important;',
      '  transform: none !important;',
      '  scale: 1 !important;',
      '  transition: background 0.2s ease, box-shadow 0.2s ease !important;',
      '  animation: none !important;',
      '}',

      '.product-entry.raqam-product-card button.addToCart:hover,',
      '.product-entry.raqam-product-card button.addToCart:focus,',
      '.product-entry.raqam-product-card button.addToCart:active,',
      '.product-entry.raqam-product-card button.addToCart.s-button-outline:hover,',
      '.product-entry.raqam-product-card button.addToCart.s-button-primary-outline:hover {',
      '  background: linear-gradient(135deg, #4a1178 0%, #6d28d9 45%, #8b5cf6 100%) !important;',
      '  background-image: linear-gradient(135deg, #4a1178 0%, #6d28d9 45%, #8b5cf6 100%) !important;',
      '  background-color: transparent !important;',
      '  color: #ffffff !important;',
      '  border: none !important;',
      '  outline: none !important;',
      '  transform: none !important;',
      '  scale: 1 !important;',
      '  animation: none !important;',
      '  box-shadow: 0 6px 20px rgba(54, 10, 97, 0.55) !important;',
      '}',

      '.product-entry.raqam-product-card button.addToCart .s-button-text,',
      '.product-entry.raqam-product-card button.addToCart .s-button-text p {',
      '  color: #ffffff !important;',
      '  font-size: 15px !important;',
      '  font-weight: 700 !important;',
      '  margin: 0 !important;',
      '  transform: none !important;',
      '  animation: none !important;',
      '}',

      '.product-entry.raqam-product-card button.addToCart .flex-center {',
      '  justify-content: center !important;',
      '  gap: 4px !important;',
      '}',

      '.product-entry.raqam-product-card button.addToCart .icon-cart {',
      '  display: none !important;',
      '}',

      '.swiper-slide .product-entry.raqam-product-card {',
      '  height: 100% !important;',
      '}',

      '.swiper-slide {',
      '  height: auto !important;',
      '}',

      '.product-entry.raqam-product-card.angel_anime {',
      '  animation: none !important;',
      '}',

      /* ── جوال: 2.5 منتج + محتوى متناسق ── */
      '@media (max-width: 767px) {',
      '  .mySwiper .swiper-slide .raqam-product-card > a:first-child {',
      '    margin-bottom: 6px !important;',
      '  }',
      '  .mySwiper .swiper-slide .raqam-product-card > a:first-child .relative,',
      '  .mySwiper .swiper-slide .raqam-product-card img.aspect-square {',
      '    border-radius: 10px !important;',
      '  }',
      '  .mySwiper .swiper-slide .raqam-product-card .donating-wrap {',
      '    padding: 2px 2px 4px !important;',
      '  }',
      '  .mySwiper .swiper-slide .raqam-product-card .title-wrapper {',
      '    margin-bottom: 4px !important;',
      '  }',
      '  .mySwiper .swiper-slide .raqam-product-card .product-entry__title,',
      '  .mySwiper .swiper-slide .raqam-product-card .product-entry__title a {',
      '    font-size: 11px !important;',
      '    line-height: 1.35 !important;',
      '    font-weight: 600 !important;',
      '  }',
      '  .mySwiper .swiper-slide .raqam-product-card .s-product-card-content-subtitle {',
      '    font-size: 9px !important;',
      '  }',
      '  .mySwiper .swiper-slide .raqam-product-card .price-wrapper,',
      '  .mySwiper .swiper-slide .raqam-product-card .on-sale {',
      '    gap: 3px 5px !important;',
      '    margin: 3px 0 5px !important;',
      '  }',
      '  .mySwiper .swiper-slide .raqam-product-card .on-sale .special-price,',
      '  .mySwiper .swiper-slide .raqam-product-card .price-wrapper > .regular-price {',
      '    font-size: 13px !important;',
      '    font-weight: 700 !important;',
      '  }',
      '  .mySwiper .swiper-slide .raqam-product-card .on-sale .regular-price {',
      '    font-size: 10px !important;',
      '  }',
      '  .mySwiper .swiper-slide .raqam-product-card .product-footer {',
      '    padding-top: 2px !important;',
      '  }',
      '  .mySwiper .swiper-slide .raqam-product-card button.addToCart,',
      '  .mySwiper .swiper-slide .raqam-product-card button.addToCart.s-button-btn {',
      '    padding: 6px 8px !important;',
      '    font-size: 10px !important;',
      '    font-weight: 600 !important;',
      '    border-radius: 7px !important;',
      '    line-height: 1.2 !important;',
      '    min-height: 0 !important;',
      '    height: auto !important;',
      '    box-shadow: 0 2px 8px rgba(54, 10, 97, 0.35) !important;',
      '  }',
      '  .mySwiper .swiper-slide .raqam-product-card button.addToCart .s-button-text,',
      '  .mySwiper .swiper-slide .raqam-product-card button.addToCart .s-button-text p {',
      '    font-size: 10px !important;',
      '    font-weight: 600 !important;',
      '    white-space: nowrap !important;',
      '  }',
      '  .mySwiper .swiper-slide .raqam-product-card button.addToCart .flex-center {',
      '    gap: 2px !important;',
      '  }',
      '  .mySwiper .swiper-slide .raqam-product-card .on-sale .price .sar-icon,',
      '  .mySwiper .swiper-slide .raqam-product-card .on-sale span.price img.sar-icon,',
      '  .mySwiper .swiper-slide .raqam-product-card .price-wrapper .sar-icon {',
      '    filter: brightness(0) invert(1) !important;',
      '    -webkit-filter: brightness(0) invert(1) !important;',
      '    transform: scale(0.85) !important;',
      '  }',
      '}'
    ].join('\n');

    var style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(style);
    }
    style.textContent = css;
  }

  function enhanceButton(btn) {
    if (!btn) return;

    var textEl = btn.querySelector('.s-button-text p') ||
      btn.querySelector('.s-button-text');

    if (textEl) {
      var isMobile = (window.innerWidth || 999) <= 767;
      if (isMobile) {
        textEl.textContent = '+ أضف';
      } else {
        var txt = (textEl.textContent || '').replace(/\s+/g, ' ').trim();
        if (txt.indexOf('+') === -1) {
          textEl.textContent = '+ أضف للسلة';
        }
      }
    }

    applyButtonInline(btn);
    btn.setAttribute(BTN_DONE_ATTR, '1');
  }

  function processCard(card) {
    if (!card) return;

    var currentVer = card.getAttribute(VERSION_ATTR);
    var needsUpdate = currentVer !== VERSION;

    if (!needsUpdate && card.getAttribute(MODIFIED_ATTR)) return;

    card.classList.add('raqam-product-card');

    var btn = card.querySelector('button.addToCart');
    if (btn) {
      if (needsUpdate) btn.removeAttribute(BTN_DONE_ATTR);
      enhanceButton(btn);
    }

    card.setAttribute(MODIFIED_ATTR, '1');
    card.setAttribute(VERSION_ATTR, VERSION);
  }

  function enhanceAll() {
    injectStyles();

    var cards = document.querySelectorAll('.product-entry');
    for (var i = 0; i < cards.length; i++) {
      processCard(cards[i]);
    }
  }

  function init() {
    enhanceAll();

    if (!observer && document.body) {
      observer = new MutationObserver(function () {
        injectStyles();
        enhanceAll();
      });
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  }

  function tryInit() {
    injectStyles();

    if (document.querySelector('.product-entry')) {
      init();
      return;
    }

    retryCount++;
    if (retryCount < MAX_RETRIES) {
      setTimeout(tryInit, RETRY_MS);
    } else {
      init();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInit);
  } else {
    tryInit();
  }
})();










































//اراء العملاء - الرئيسية

(function () {
  'use strict';

  var STYLE_ID = 'raqam-testimonials-pro';
  var ACCENT = '#8b51fe';
  var BRAND = '#360a61';

  /* خلفية زجاجية فخمة */
  var GLASS_BG = 'rgba(54, 10, 97, 0.14)';
  var GLASS_BG_HOVER = 'rgba(54, 10, 97, 0.22)';

  function injectStyles() {
    var style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      document.head.appendChild(style);
    }

    style.textContent = [
      '/* ── سلايدر آراء العملاء ── */',
      'twsaa-slider.myReviewSwiper,',
      '.myReviewSwiper {',
      '  position: relative !important;',
      '  z-index: 1 !important;',
      '}',

      '.myReviewSwiper .s-slider-block__display-all {',
      '  color: ' + ACCENT + ' !important;',
      '  font-weight: 600 !important;',
      '  text-decoration: none !important;',
      '}',
      '.myReviewSwiper .s-slider-block__display-all:hover {',
      '  color: #c4b5fd !important;',
      '}',

      '.myReviewSwiper .s-slider-nav-arrow,',
      '.myReviewSwiper .s-slider-prev,',
      '.myReviewSwiper .s-slider-next {',
      '  color: ' + ACCENT + ' !important;',
      '}',
      '.myReviewSwiper .s-slider-nav-arrow svg,',
      '.myReviewSwiper .s-slider-button-icon svg {',
      '  fill: ' + ACCENT + ' !important;',
      '}',

      '/* ── بطاقة زجاجية فخمة شفافة ── */',
      '.myReviewSwiper .swiper-slide .da-bgg,',
      '.myReviewSwiper .swiper-slide .bg-white.da-bgg,',
      '.myReviewSwiper .swiper-slide > .flex.rounded-lg {',
      '  background: ' + GLASS_BG + ' !important;',
      '  background-color: ' + GLASS_BG + ' !important;',
      '  backdrop-filter: blur(22px) saturate(1.7) brightness(1.08) !important;',
      '  -webkit-backdrop-filter: blur(22px) saturate(1.7) brightness(1.08) !important;',
      '  border: 1px solid rgba(139, 81, 254, 0.32) !important;',
      '  border-radius: 16px !important;',
      '  box-shadow:',
      '    0 8px 32px rgba(54, 10, 97, 0.28),',
      '    0 0 0 1px rgba(255, 255, 255, 0.04) inset,',
      '    inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;',
      '  transition: background 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease !important;',
      '}',
      '.myReviewSwiper .swiper-slide .da-bgg:hover,',
      '.myReviewSwiper .swiper-slide > .flex.rounded-lg:hover {',
      '  background: ' + GLASS_BG_HOVER + ' !important;',
      '  background-color: ' + GLASS_BG_HOVER + ' !important;',
      '  border-color: rgba(139, 81, 254, 0.55) !important;',
      '  box-shadow:',
      '    0 12px 40px rgba(139, 81, 254, 0.22),',
      '    0 0 24px rgba(54, 10, 97, 0.35),',
      '    inset 0 1px 0 rgba(255, 255, 255, 0.14) !important;',
      '}',

      '/* ── الصورة ── */',
      '.myReviewSwiper .testimonial__avatar {',
      '  border: 2px solid ' + ACCENT + ' !important;',
      '  box-shadow: 0 0 20px rgba(139, 81, 254, 0.4) !important;',
      '  transition: box-shadow 0.3s ease, transform 0.3s ease !important;',
      '}',
      '.myReviewSwiper .testimonial__avatar:hover {',
      '  box-shadow: 0 0 28px rgba(139, 81, 254, 0.55) !important;',
      '  transform: scale(1.05) !important;',
      '}',

      '/* ── الاسم ── */',
      '.myReviewSwiper .s-testimonials--slider--img h4,',
      '.myReviewSwiper h4.da-tm {',
      '  color: #ffffff !important;',
      '  font-size: 17px !important;',
      '  font-weight: 700 !important;',
      '}',

      '/* ── النجوم ── */',
      '.myReviewSwiper .testimonial__rating .icon-star2,',
      '.myReviewSwiper .s-rating-stars-wrapper i {',
      '  color: #ffd700 !important;',
      '  filter: drop-shadow(0 1px 2px rgba(255, 215, 0, 0.35)) !important;',
      '}',

      '/* ── نص الرأي ── */',
      '.myReviewSwiper .swiper-slide p.da-tm,',
      '.myReviewSwiper p.text-base.da-tm {',
      '  color: #e9d5ff !important;',
      '  font-size: 15px !important;',
      '  line-height: 1.75 !important;',
      '  text-align: center !important;',
      '}',

      '/* ── أيقونة الاقتباس ── */',
      '.myReviewSwiper .testimonial__icon {',
      '  color: ' + ACCENT + ' !important;',
      '  opacity: 0.15 !important;',
      '}'
    ].join('\n');
  }

  function fixCards() {
    var cards = document.querySelectorAll('.myReviewSwiper .swiper-slide .da-bgg, .myReviewSwiper .swiper-slide .bg-white');
    for (var i = 0; i < cards.length; i++) {
      cards[i].style.setProperty('background', GLASS_BG, 'important');
      cards[i].style.setProperty('background-color', GLASS_BG, 'important');
      cards[i].style.setProperty('backdrop-filter', 'blur(22px) saturate(1.7) brightness(1.08)', 'important');
      cards[i].style.setProperty('-webkit-backdrop-filter', 'blur(22px) saturate(1.7) brightness(1.08)', 'important');
    }
  }

  function init() {
    injectStyles();
    fixCards();
    if (window.raqamThemeReady) window.raqamThemeReady();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  new MutationObserver(function () {
    injectStyles();
    fixCards();
  }).observe(document.body, { childList: true, subtree: true });
})();












//اراء العملاء خيار الكل
//اراء العملاء - الصفحة

(function () {
  'use strict';

  var STYLE_ID = 'raqam-testimonials-glass';
  var DONE_ATTR = 'data-raqam-testimonials-glass-done';

  var ACCENT = '#8b51fe';
  var GLASS_BG = 'rgba(255, 255, 255, 0.07)';
  var GLASS_BG_HOVER = 'rgba(255, 255, 255, 0.11)';
  var BORDER_PURPLE = 'rgba(139, 81, 254, 0.35)';
  var STAR_GOLD = '#FFD700';

  var CARD_PARTS = [
    '#load_data > div:has(.testimonial__avatar)',
    '#load_data > div:has(.testimonial__avatar) .flex.h-full.bg-white.da-bgg.rounded-lg',
    '.products-container:not(:has(.myReviewSwiper)) > div:has(.testimonial__avatar)',
    '.products-container:not(:has(.myReviewSwiper)) > div:has(.testimonial__avatar) .flex.h-full.bg-white.da-bgg.rounded-lg'
  ];

  var CARD = CARD_PARTS.join(', ');
  var CARD_HOVER = CARD_PARTS.map(function (part) {
    return part + ':hover';
  }).join(', ');

  var GRID_PARTS = [
    '#load_data.products-container',
    '#load_data.gird-view.grid',
    '.products-container.gird-view.grid:not(:has(.myReviewSwiper))',
    '.products-container.grid:not(:has(.myReviewSwiper))'
  ];

  var GRID = GRID_PARTS.join(', ');

  var FIX_INLINE_PARTS = [
    '#load_data > div:has(.testimonial__avatar) .da-bgg',
    '#load_data > div:has(.testimonial__avatar) .bg-white',
    '.products-container:not(:has(.myReviewSwiper)) > div:has(.testimonial__avatar) .da-bgg',
    '.products-container:not(:has(.myReviewSwiper)) > div:has(.testimonial__avatar) .bg-white'
  ];

  var FIX_INLINE_SEL = FIX_INLINE_PARTS.join(', ');

  function cardChild(suffix) {
    return CARD_PARTS.map(function (part) {
      return part + ' ' + suffix;
    }).join(', ');
  }

  function isInSwiper(el) {
    return el && el.closest('.myReviewSwiper');
  }

  function isPageTestimonialCard(el) {
    if (!el || !el.querySelector('.testimonial__avatar')) return false;
    if (isInSwiper(el)) return false;
    if (el.closest('#load_data')) return true;
    var container = el.closest('.products-container');
    return container && !container.querySelector('.myReviewSwiper');
  }

  function inject() {
    var style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(style);
    }

    style.textContent = [
      '/* raqam-testimonials-glass — صفحة عرض الكل فقط */',

      '/* ── رأس صفحة آراء العملاء ── */',
      'body:has(#load_data) .nav-header.bg-gray-100,',
      'body:has(#load_data) .nav-header.da-bgg {',
      '  background: rgba(5, 5, 8, 0.55) !important;',
      '  background-color: rgba(5, 5, 8, 0.55) !important;',
      '  backdrop-filter: blur(18px) saturate(1.4) !important;',
      '  -webkit-backdrop-filter: blur(18px) saturate(1.4) !important;',
      '  border-bottom: 1px solid ' + BORDER_PURPLE + ' !important;',
      '  box-shadow: 0 4px 24px rgba(54, 10, 97, 0.25) !important;',
      '}',

      'body:has(#load_data) .nav-header.bg-gray-100 .nav-title h1,',
      'body:has(#load_data) .nav-header .nav-title h1,',
      'body:has(#load_data) .nav-header h1,',
      'body:has(#load_data) .nav-header .da-tm {',
      '  color: #ffffff !important;',
      '  -webkit-text-fill-color: #ffffff !important;',
      '  font-weight: 700 !important;',
      '}',

      'body:has(#load_data) .product-group-heading,',
      'body:has(#load_data) .nav-header .product-group-heading {',
      '  color: rgba(255, 255, 255, 0.85) !important;',
      '  -webkit-text-fill-color: rgba(255, 255, 255, 0.85) !important;',
      '}',

      '/* ── شبكة البطاقات ── */',
      GRID + ' {',
      '  gap: 20px !important;',
      '  row-gap: 20px !important;',
      '  column-gap: 20px !important;',
      '}',

      '/* ── بطاقة زجاجية ── */',
      CARD + ' {',
      '  background: ' + GLASS_BG + ' !important;',
      '  background-color: ' + GLASS_BG + ' !important;',
      '  backdrop-filter: blur(22px) saturate(1.6) brightness(1.05) !important;',
      '  -webkit-backdrop-filter: blur(22px) saturate(1.6) brightness(1.05) !important;',
      '  border: 1px solid ' + BORDER_PURPLE + ' !important;',
      '  border-radius: 16px !important;',
      '  box-shadow:',
      '    0 8px 32px rgba(54, 10, 97, 0.28),',
      '    0 0 0 1px rgba(255, 255, 255, 0.04) inset,',
      '    inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;',
      '  color: #ffffff !important;',
      '  transition:',
      '    background 0.35s ease,',
      '    border-color 0.35s ease,',
      '    box-shadow 0.35s ease !important;',
      '}',

      CARD_HOVER + ' {',
      '  background: ' + GLASS_BG_HOVER + ' !important;',
      '  background-color: ' + GLASS_BG_HOVER + ' !important;',
      '  border-color: rgba(139, 81, 254, 0.55) !important;',
      '  box-shadow:',
      '    0 12px 40px rgba(139, 81, 254, 0.22),',
      '    0 0 24px rgba(54, 10, 97, 0.35),',
      '    inset 0 1px 0 rgba(255, 255, 255, 0.14) !important;',
      '}',

      '/* ── الصورة الرمزية ── */',
      cardChild('.testimonial__avatar') + ' {',
      '  border: 2px solid ' + ACCENT + ' !important;',
      '  border-radius: 50% !important;',
      '  box-shadow: 0 0 20px rgba(139, 81, 254, 0.4) !important;',
      '  transition: box-shadow 0.3s ease, transform 0.3s ease !important;',
      '}',

      CARD_HOVER + ' ' + '.testimonial__avatar,',
      cardChild('.testimonial__avatar:hover') + ' {',
      '  box-shadow: 0 0 28px rgba(139, 81, 254, 0.55) !important;',
      '  transform: scale(1.05) !important;',
      '}',

      '/* ── الاسم ── */',
      cardChild('h4.da-tm') + ',',
      cardChild('.s-testimonials--slider--img h4') + ' {',
      '  color: #ffffff !important;',
      '  -webkit-text-fill-color: #ffffff !important;',
      '  font-size: 17px !important;',
      '  font-weight: 700 !important;',
      '}',

      '/* ── النجوم ── */',
      cardChild('.testimonial__rating .icon-star2') + ',',
      cardChild('.testimonial__rating salla-rating-stars .icon-star2') + ',',
      cardChild('.s-rating-stars-wrapper i') + ',',
      cardChild('salla-rating-stars .icon-star2') + ' {',
      '  color: ' + STAR_GOLD + ' !important;',
      '  fill: ' + STAR_GOLD + ' !important;',
      '  filter: drop-shadow(0 1px 2px rgba(255, 215, 0, 0.35)) !important;',
      '}',

      '/* ── نص الرأي ── */',
      cardChild('p.da-tm') + ',',
      cardChild('p.text-base.da-tm') + ' {',
      '  color: rgba(255, 255, 255, 0.9) !important;',
      '  -webkit-text-fill-color: rgba(255, 255, 255, 0.9) !important;',
      '  font-size: 15px !important;',
      '  line-height: 1.75 !important;',
      '  text-align: center !important;',
      '}',

      '/* ── أيقونة الاقتباس ── */',
      cardChild('.testimonial__icon.icon-quote') + ',',
      cardChild('.testimonial__icon') + ' {',
      '  color: ' + ACCENT + ' !important;',
      '  opacity: 0.18 !important;',
      '}',

      '@media (max-width: 768px) {',
      '  ' + GRID + ' {',
      '    gap: 16px !important;',
      '    row-gap: 16px !important;',
      '    column-gap: 16px !important;',
      '  }',
      '  ' + cardChild('h4.da-tm') + ' {',
      '    font-size: 16px !important;',
      '  }',
      '  ' + cardChild('p.da-tm') + ' {',
      '    font-size: 14px !important;',
      '  }',
      '}'
    ].join('\n');
  }

  function applyCardStyle(card) {
    if (!card || card.getAttribute(DONE_ATTR) === '1') return;
    if (isInSwiper(card)) return;
    card.style.setProperty('background', GLASS_BG, 'important');
    card.style.setProperty('background-color', GLASS_BG, 'important');
    card.style.setProperty('backdrop-filter', 'blur(22px) saturate(1.6) brightness(1.05)', 'important');
    card.style.setProperty('-webkit-backdrop-filter', 'blur(22px) saturate(1.6) brightness(1.05)', 'important');
    card.style.setProperty('border', '1px solid ' + BORDER_PURPLE, 'important');
    card.style.setProperty('border-radius', '16px', 'important');
    card.setAttribute(DONE_ATTR, '1');
  }

  function fixInline() {
    document.querySelectorAll(FIX_INLINE_SEL).forEach(function (el) {
      if (!isInSwiper(el)) applyCardStyle(el);
    });

    document.querySelectorAll(CARD).forEach(function (card) {
      if (isPageTestimonialCard(card)) {
        applyCardStyle(card);
      }
    });

    if (document.getElementById('load_data')) {
      document.querySelectorAll('.nav-header.bg-gray-100, .nav-header.da-bgg').forEach(function (nav) {
        if (isInSwiper(nav)) return;
        nav.style.setProperty('background', 'rgba(5, 5, 8, 0.55)', 'important');
        nav.style.setProperty('background-color', 'rgba(5, 5, 8, 0.55)', 'important');
      });
    }
  }

  var fixTimer = null;

  function scheduleReapply() {
    if (fixTimer) clearTimeout(fixTimer);
    fixTimer = setTimeout(function () {
      fixTimer = null;
      inject();
      fixInline();
    }, 80);
  }

  function init() {
    inject();
    fixInline();
    if (window.raqamThemeReady) window.raqamThemeReady();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  if (document.body) {
    new MutationObserver(function () {
      scheduleReapply();
    }).observe(document.body, {
      childList: true,
      subtree: true
    });
  } else {
    document.addEventListener('DOMContentLoaded', function () {
      new MutationObserver(function () {
        scheduleReapply();
      }).observe(document.body, {
        childList: true,
        subtree: true
      });
    });
  }
})();






















//الفوتر

(function () {
  'use strict';

  var STYLE_ID = 'raqam-footer-white';

  function injectFooterStyles() {
    var style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      document.head.appendChild(style);
    }

    style.textContent = [
      '/* ── فوتر أبيض ── */',
      'footer,',
      'footer .footer-middle,',
      'footer .footer-container,',
      'footer .footer-middle.footer-container {',
      '  color: #ffffff !important;',
      '}',

      'footer .footer-middle p,',
      'footer .footer-middle .da-tm,',
      'footer .footer-middle p.da-tm,',
      'footer .footer-middle span.da-tm,',
      'footer .footer-middle h3,',
      'footer .footer-middle h3.title,',
      'footer .footer-middle .title,',
      'footer .footer-middle a,',
      'footer .footer-middle .social-label,',
      'footer .footer-middle .text-btn,',
      'footer .footer-middle .contact-links a,',
      'footer .footer-middle .social-icon,',
      'footer .footer-middle .social-icon i,',
      'footer .footer-middle .social-icon svg,',
      'footer .footer-middle .contact-links i,',
      'footer .footer-middle .contact-links svg,',
      'footer .footer-vat p,',
      'footer .footer-vat span,',
      'footer .footer-vat .da-tm,',
      'footer .footer-vat .text-text-grey {',
      '  color: #ffffff !important;',
      '  fill: #ffffff !important;',
      '}',

      'footer .footer-middle a:hover,',
      'footer .footer-middle .social-icon:hover,',
      'footer .footer-middle .contact-links a:hover {',
      '  color: #e9d5ff !important;',
      '  opacity: 0.9 !important;',
      '}',

      'footer .footer-middle .social-label.bubble,',
      'footer .footer-middle .bubble {',
      '  color: #ffffff !important;',
      '  background-color: rgba(54, 10, 97, 0.85) !important;',
      '}',

      'footer .footer-middle .da-brdr {',
      '  border-color: rgba(255, 255, 255, 0.15) !important;',
      '}'
    ].join('\n');
  }

  function init() {
    injectFooterStyles();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  new MutationObserver(injectFooterStyles).observe(document.body, {
    childList: true,
    subtree: true
  });
})();


















//أيقونات تواصل الفوتر

(function () {
  'use strict';

  var STYLE_ID = 'raqam-footer-contact-icons';

  var WHATSAPP = '#25D366';
  var TELEGRAM = '#2AABEE';
  var EMAIL = '#8b51fe';

  var SCOPE_PARTS = [
    'footer .footer-middle .contact-links',
    'footer .contact-links',
    '.contact-links'
  ];

  var SCOPE = SCOPE_PARTS.join(', ');

  function linkSel(suffix) {
    return SCOPE_PARTS.map(function (part) {
      return part + ' a' + suffix;
    }).join(', ');
  }

  function iconSel(suffix) {
    return SCOPE_PARTS.map(function (part) {
      return [
        part + ' a > i.icon-whatsapp2' + suffix,
        part + ' a > i.icon-mail' + suffix,
        part + ' a > svg.fa-telegram' + suffix
      ].join(', ');
    }).join(', ');
  }

  var LINK = linkSel('');
  var ICON = iconSel('');

  var WA_ICON = linkSel('[href*="wa.me"] > i.icon-whatsapp2') + ', ' +
    SCOPE_PARTS.map(function (part) {
      return part + ' a:has(.icon-whatsapp2) > i.icon-whatsapp2';
    }).join(', ');

  var TG_ICON = linkSel('[href*="t.me"] > svg.fa-telegram') + ', ' +
    SCOPE_PARTS.map(function (part) {
      return part + ' a:has(svg.fa-telegram) > svg.fa-telegram';
    }).join(', ');

  var EM_ICON = linkSel('[href^="mailto:"] > i.icon-mail') + ', ' +
    SCOPE_PARTS.map(function (part) {
      return part + ' a:has(.icon-mail) > i.icon-mail';
    }).join(', ');

  var WA_HOVER = linkSel('[href*="wa.me"]:hover > i.icon-whatsapp2') + ', ' +
    SCOPE_PARTS.map(function (part) {
      return part + ' a:has(.icon-whatsapp2):hover > i.icon-whatsapp2';
    }).join(', ');

  var TG_HOVER = linkSel('[href*="t.me"]:hover > svg.fa-telegram') + ', ' +
    SCOPE_PARTS.map(function (part) {
      return part + ' a:has(svg.fa-telegram):hover > svg.fa-telegram';
    }).join(', ');

  var EM_HOVER = linkSel('[href^="mailto:"]:hover > i.icon-mail') + ', ' +
    SCOPE_PARTS.map(function (part) {
      return part + ' a:has(.icon-mail):hover > i.icon-mail';
    }).join(', ');

  function inject() {
    var style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(style);
    }

    style.textContent = [
      '/* raqam-footer-contact-icons */',

      SCOPE + ' {',
      '  display: flex !important;',
      '  flex-direction: row !important;',
      '  flex-wrap: nowrap !important;',
      '  align-items: flex-start !important;',
      '  justify-content: center !important;',
      '  gap: 24px !important;',
      '  max-width: none !important;',
      '  width: 100% !important;',
      '}',

      LINK + ' {',
      '  display: flex !important;',
      '  flex-direction: column !important;',
      '  align-items: center !important;',
      '  justify-content: flex-start !important;',
      '  flex: 0 0 auto !important;',
      '  min-width: 56px !important;',
      '  width: auto !important;',
      '  gap: 8px !important;',
      '  padding: 0 !important;',
      '  margin: 0 !important;',
      '  position: static !important;',
      '  background: transparent !important;',
      '  background-color: transparent !important;',
      '  border: none !important;',
      '  border-radius: 0 !important;',
      '  box-shadow: none !important;',
      '  outline: none !important;',
      '  text-decoration: none !important;',
      '  color: rgba(255, 255, 255, 0.85) !important;',
      '  font-size: 0.8125rem !important;',
      '  line-height: 1.2 !important;',
      '  text-align: center !important;',
      '  white-space: nowrap !important;',
      '  letter-spacing: 0.01em !important;',
      '  transition: color 0.25s ease !important;',
      '  -webkit-tap-highlight-color: transparent !important;',
      '}',

      linkSel('::before') + ',',
      linkSel('::after') + ' {',
      '  display: none !important;',
      '  content: none !important;',
      '}',

      ICON + ' {',
      '  display: flex !important;',
      '  align-items: center !important;',
      '  justify-content: center !important;',
      '  flex-shrink: 0 !important;',
      '  position: static !important;',
      '  width: 44px !important;',
      '  height: 44px !important;',
      '  margin: 0 !important;',
      '  padding: 0 !important;',
      '  border: none !important;',
      '  border-radius: 50% !important;',
      '  font-size: 1.2rem !important;',
      '  line-height: 1 !important;',
      '  transform: none !important;',
      '  box-shadow: none !important;',
      '  transition:',
      '    transform 0.25s ease,',
      '    box-shadow 0.25s ease !important;',
      '}',

      iconSel('::before') + ',',
      iconSel('::after') + ' {',
      '  position: static !important;',
      '  transform: none !important;',
      '  margin: 0 !important;',
      '  top: auto !important;',
      '  left: auto !important;',
      '  right: auto !important;',
      '  bottom: auto !important;',
      '}',

      linkSel(' > svg.fa-telegram') + ' {',
      '  width: 44px !important;',
      '  height: 44px !important;',
      '  padding: 10px !important;',
      '  box-sizing: border-box !important;',
      '}',

      WA_ICON + ' {',
      '  background-color: ' + WHATSAPP + ' !important;',
      '  color: #ffffff !important;',
      '  fill: #ffffff !important;',
      '}',

      TG_ICON + ' {',
      '  background-color: ' + TELEGRAM + ' !important;',
      '  color: #ffffff !important;',
      '  fill: currentColor !important;',
      '}',

      EM_ICON + ' {',
      '  background-color: ' + EMAIL + ' !important;',
      '  color: #ffffff !important;',
      '  fill: #ffffff !important;',
      '}',

      LINK + ':hover {',
      '  color: rgba(255, 255, 255, 0.95) !important;',
      '  opacity: 1 !important;',
      '  background: transparent !important;',
      '  border: none !important;',
      '  box-shadow: none !important;',
      '}',

      WA_HOVER + ' {',
      '  color: #ffffff !important;',
      '  fill: #ffffff !important;',
      '  transform: scale(1.08) !important;',
      '  box-shadow: 0 0 16px rgba(37, 211, 102, 0.55) !important;',
      '}',

      TG_HOVER + ' {',
      '  color: #ffffff !important;',
      '  fill: currentColor !important;',
      '  transform: scale(1.08) !important;',
      '  box-shadow: 0 0 16px rgba(42, 171, 238, 0.55) !important;',
      '}',

      EM_HOVER + ' {',
      '  color: #ffffff !important;',
      '  fill: #ffffff !important;',
      '  transform: scale(1.08) !important;',
      '  box-shadow: 0 0 16px rgba(139, 81, 254, 0.55) !important;',
      '}',

      LINK + ':focus,',
      LINK + ':focus-visible {',
      '  outline: none !important;',
      '  border: none !important;',
      '  box-shadow: none !important;',
      '}',

      'footer .footer-middle .contact-links a:hover {',
      '  color: rgba(255, 255, 255, 0.95) !important;',
      '  opacity: 1 !important;',
      '  background: transparent !important;',
      '  border: none !important;',
      '  box-shadow: none !important;',
      '}',

      '@media (max-width: 480px) {',
      '  ' + SCOPE + ' {',
      '    gap: 20px !important;',
      '  }',
      '  ' + ICON + ' {',
      '    width: 42px !important;',
      '    height: 42px !important;',
      '    font-size: 1.1rem !important;',
      '  }',
      '  ' + linkSel(' > svg.fa-telegram') + ' {',
      '    width: 42px !important;',
      '    height: 42px !important;',
      '    padding: 9px !important;',
      '  }',
      '  ' + LINK + ' {',
      '    font-size: 0.75rem !important;',
      '  }',
      '}'
    ].join('\n');
  }

  function init() {
    inject();
    if (window.raqamThemeReady) window.raqamThemeReady();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  if (document.body) {
    new MutationObserver(inject).observe(document.body, {
      childList: true,
      subtree: true
    });
  } else {
    document.addEventListener('DOMContentLoaded', function () {
      new MutationObserver(inject).observe(document.body, {
        childList: true,
        subtree: true
      });
    });
  }
})();





















































// صفحة المنتج ازرار وخلفية وتنسيق 




(function () {
  'use strict';

  var STYLE_ID = 'raqam-product-page-glass';
  var SHADOW_STYLE_ID = 'raqam-reviews-shadow-v15';
  var BTN_GRAD = 'linear-gradient(135deg, #360a61 0%, #5b1d8a 45%, #7c3aed 100%)';

  var GLASS_BG = 'rgba(255, 255, 255, 0.07)';
  var GLASS_BORDER = 'rgba(255, 255, 255, 0.14)';
  var GLASS_INNER = 'rgba(255, 255, 255, 0.05)';
  var GLASS_CARD = 'rgba(255, 255, 255, 0.06)';
  var BORDER_PURPLE = 'rgba(139, 81, 254, 0.22)';
  var FILTER_GLASS_BG = 'rgba(26, 16, 37, 0.75)';
  var FILTER_GLASS_BORDER = 'rgba(139, 81, 254, 0.35)';
  var QTY_GLASS_BG = 'rgba(26, 16, 37, 0.65)';
  var QTY_BORDER = 'rgba(139, 81, 254, 0.4)';
  var QTY_DESKTOP_BG = 'rgba(255,255,255,0.08)';

  var FILTER_LABELS = { latest: 'الأحدث', oldest: 'الأقدم' };
  var FILTER_DONE = 'data-raqam-v13';
  var filterEventsBound = false;

  var REAPPLY_DELAYS = [0, 100, 300, 600, 1000, 2000, 4000, 6000];
  var fixTimer = null;
  var filterFixTimer = null;
  var qtyResizeTimer = null;
  var qtyResizeBound = false;

  var QTY_WRAP_INLINE = [
    'display', 'align-items', 'flex-wrap', 'gap', 'width', 'max-width',
    'background', 'border', 'border-radius', 'overflow', 'padding', 'margin', 'box-shadow'
  ];
  var QTY_BTN_INLINE = [
    'display', 'align-items', 'justify-content', 'flex', 'width', 'min-width', 'max-width',
    'height', 'min-height', 'padding', 'margin', 'background', 'border', 'border-radius',
    'outline', 'box-shadow', 'color', '-webkit-text-fill-color', 'font-size', 'font-weight', 'line-height'
  ];
  var QTY_INP_INLINE = [
    'display', 'flex', 'width', 'min-width', 'max-width', 'height', 'padding', 'margin',
    'background', 'border', 'border-radius', 'outline', 'box-shadow', 'color',
    '-webkit-text-fill-color', 'text-align', 'font-weight', 'line-height', 'font-size'
  ];

  function isMobileQty() {
    return window.matchMedia('(max-width: 768px)').matches;
  }

  function clearInlineProps(el, props) {
    for (var i = 0; i < props.length; i++) {
      el.style.removeProperty(props[i]);
    }
  }

  function inject() {
    var css = [
      '/* raqam-product-page-glass v15 */',

      '.main-content.w-full,',
      '.main-content.md\\:w-1\\/2 {',
      '  background: ' + GLASS_BG + ' !important;',
      '  backdrop-filter: blur(22px) saturate(1.6) brightness(1.05) !important;',
      '  -webkit-backdrop-filter: blur(22px) saturate(1.6) brightness(1.05) !important;',
      '  border: 1px solid ' + GLASS_BORDER + ' !important;',
      '  border-radius: 18px !important;',
      '  padding: 20px 22px 24px !important;',
      '  box-shadow: 0 8px 40px rgba(54, 10, 97, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.12) !important;',
      '  margin-top: 12px !important; margin-bottom: 16px !important; overflow: hidden !important;',
      '}',

      '.main-content h1.da-tm { color: #fff !important; font-weight: 700 !important; }',
      '.main-content .product-entry__sub-title,',
      '.main-content h3.text-gray-400 { color: #c4b5fd !important; }',
      '.main-content a.text-gray-500,',
      '.main-content .mb-3 a { color: #a855f7 !important; }',
      '.main-content .short__description,',
      '.main-content #more-details,',
      '.main-content .short__description p,',
      '.main-content .short__description li,',
      '.main-content .short__description h4 { color: #f3f4f6 !important; }',
      '.main-content .short__description a { color: #a855f7 !important; word-break: break-all !important; }',

      '.main-content .short__description::after,',
      '.main-content .short__description::before,',
      '.main-content #more-details::after,',
      '.main-content #more-details::before { display: none !important; content: none !important; }',

      '.main-content [data-show-more],',
      '.main-content [data-show-more="true"] {',
      '  position: relative !important; width: 100% !important; max-width: 100% !important;',
      '  margin: 0 !important; padding: 14px 0 6px !important; left: 0 !important; right: 0 !important;',
      '  transform: none !important; display: flex !important; justify-content: center !important;',
      '  background: linear-gradient(to top, rgba(12,10,20,0.55) 0%, rgba(12,10,20,0) 85%) !important;',
      '}',

      '.main-content [data-show-more] .btn,',
      '.main-content [data-show-more] .btn-primary {',
      '  background: ' + BTN_GRAD + ' !important; border: none !important; color: #fff !important;',
      '  border-radius: 10px !important; padding: 8px 20px !important;',
      '  box-shadow: 0 4px 14px rgba(54,10,97,0.35) !important; margin: 0 auto !important;',
      '}',

      '.main-content .discountPercentage,',
      '.discountPercentage {',
      '  color: #ffffff !important; -webkit-text-fill-color: #ffffff !important;',
      '}',

      '.main-content .price .regular-price { color: #ef4444 !important; text-decoration: line-through !important; }',
      '.main-content .price .special-price { color: #fff !important; font-weight: 700 !important; font-size: 22px !important; }',
      '.main-content .price .special-price .sar-icon { filter: brightness(0) invert(1) !important; }',
      '.main-content .price .regular-price .sar-icon { filter: brightness(0) saturate(100%) invert(27%) sepia(95%) saturate(5000%) hue-rotate(350deg) !important; }',

      '.main-content .sold.details,',
      '.main-content .details__wrapper {',
      '  background: ' + GLASS_INNER + ' !important; border: 1px solid rgba(255,255,255,0.08) !important;',
      '  border-radius: 12px !important; padding: 10px 14px !important;',
      '}',
      '.main-content .details__title,',
      '.main-content .details__title span,',
      '.main-content .details__action span { color: #fff !important; }',

      '.main-content .customizable.details,',
      '.main-content .s-product-options-wrapper,',
      '.main-content .s-product-options,',
      '.main-content .s-product-options-option-container {',
      '  background: ' + GLASS_INNER + ' !important; border: 1px solid rgba(139,81,254,0.2) !important;',
      '  border-radius: 12px !important; padding: 14px !important; margin-bottom: 12px !important;',
      '}',

      '.main-content .s-product-options label { color: #fff !important; }',
      '.main-content .s-product-options input,',
      '.main-content .s-product-options-option input {',
      '  background: rgba(255,255,255,0.06) !important; border: 1px solid rgba(139,81,254,0.3) !important;',
      '  border-radius: 10px !important; color: #fff !important; padding: 10px 12px !important;',
      '}',

      '.main-content .sticky-product-bar,',
      '.main-content .sticky-product-bar.bg-white {',
      '  background: ' + GLASS_INNER + ' !important; border: 1px solid rgba(139,81,254,0.25) !important; border-radius: 14px !important;',
      '}',

      '/* ── v15: كمية سطح المكتب — بسيط v13 ── */',
      '.main-content .s-quantity-input-input,',
      '.main-content .s-quantity-input-button,',
      '.main-content .sticky-product-bar .s-quantity-input-input,',
      '.main-content .sticky-product-bar .s-quantity-input-button,',
      '.main-content .cartButtons .s-quantity-input-input,',
      '.main-content .cartButtons .s-quantity-input-button {',
      '  background: ' + QTY_DESKTOP_BG + ' !important;',
      '  color: #fff !important;',
      '  -webkit-text-fill-color: #fff !important;',
      '}',

      '.main-content .cartButtons .s-button-solid.s-button-primary {',
      '  background: ' + BTN_GRAD + ' !important; border: none !important; color: #fff !important; border-radius: 10px !important;',
      '}',

      '.main-content .cartButtons .s-button-text { color: #fff !important; }',
      '.main-content .s-quick-buy-button.s-button-outline {',
      '  background: rgba(139,81,254,0.08) !important; border: 1px solid rgba(139,81,254,0.45) !important; color: #fff !important;',
      '}',

      '/* ══ التقييمات ══ */',

      '.main-content #product-tabs,',
      '.main-content .s-product-tabs { background: transparent !important; border: none !important; margin-top: 16px !important; }',

      '.main-content #product-tabs .nav-tabs {',
      '  background: ' + GLASS_INNER + ' !important; border: 1px solid ' + BORDER_PURPLE + ' !important;',
      '  border-radius: 14px 14px 0 0 !important; border-bottom: none !important; padding: 8px 12px !important;',
      '}',

      '.main-content .nav-tabs .nav-link { color: #c4b5fd !important; background: transparent !important; border: none !important; font-weight: 600 !important; }',
      '.main-content .nav-tabs .nav-link.active { color: #fff !important; background: rgba(139,81,254,0.25) !important; border-radius: 8px !important; }',

      '.main-content #product-tabs .tab-content,',
      '.main-content #nav-tabContent {',
      '  background: ' + GLASS_INNER + ' !important; border: 1px solid ' + BORDER_PURPLE + ' !important;',
      '  border-top: none !important; border-radius: 0 0 16px 16px !important; padding: 0 !important;',
      '}',

      '.main-content #nav-comments,',
      '.main-content .comments-wrapper { background: transparent !important; color: #fff !important; padding: 20px 18px !important; }',

      '.main-content .ask-form,',
      '.main-content #comment_form {',
      '  background: ' + GLASS_CARD + ' !important; border: 1px solid rgba(139,81,254,0.2) !important;',
      '  border-radius: 14px !important; padding: 16px !important; margin-bottom: 20px !important;',
      '}',

      '.main-content .ask-form .stars .icon-star2 { color: #ffd700 !important; font-size: 24px !important; }',

      '.main-content .s-comment-form-wrapper { position: relative !important; margin-top: 12px !important; }',

      '.main-content .s-comment-form-input,',
      '.main-content #ask_textarea {',
      '  background: rgba(255,255,255,0.05) !important; border: 1px solid rgba(139,81,254,0.3) !important;',
      '  border-radius: 12px !important; color: #fff !important;',
      '  padding: 14px 16px 52px 16px !important; min-height: 95px !important; width: 100% !important;',
      '}',

      '.main-content .s-comment-form-input::placeholder { color: rgba(196,181,253,0.6) !important; }',
      '.main-content .s-comment-form-action { position: absolute !important; bottom: 10px !important; left: 10px !important; }',

      '.main-content #ask_button {',
      '  background: ' + BTN_GRAD + ' !important; background-image: ' + BTN_GRAD + ' !important;',
      '  border: none !important; outline: none !important; color: #fff !important;',
      '  border-radius: 8px !important; padding: 7px 18px !important;',
      '  font-size: 13px !important; font-weight: 600 !important; box-shadow: none !important;',
      '}',

      '.main-content #ask_button .s-button-text { color: #fff !important; }',

      '/* ── فلتر مخصص v13 ── */',
      '.main-content .comments-wrapper .s-comments-sort-wrapper,',
      '.main-content .comments-wrapper .s-reviews-header,',
      '.main-content .comments-wrapper [class*="sort"],',
      '.main-content .comments-wrapper [class*="reviews-header"],',
      '.main-content .comments-wrapper div:has(#comments-filter),',
      '.main-content .comments-wrapper div:has(.raqam-filter-wrap),',
      '.main-content .comments-wrapper .flex:has(#comments-filter),',
      '.main-content .comments-wrapper .flex:has(.raqam-filter-wrap),',
      '.main-content #nav-comments .s-comments-sort-wrapper,',
      '.main-content #nav-comments [class*="sort"],',
      '.main-content #nav-comments div:has(#comments-filter),',
      '.main-content #nav-comments div:has(.raqam-filter-wrap) {',
      '  display: flex !important; align-items: center !important; flex-wrap: wrap !important;',
      '  justify-content: flex-start !important; align-content: flex-start !important;',
      '  gap: 10px !important; column-gap: 10px !important; row-gap: 8px !important;',
      '  margin-bottom: 16px !important; width: 100% !important; text-align: start !important;',
      '  overflow: visible !important;',
      '}',

      '.main-content #comments-filter.raqam-filter-native,',
      '.main-content .s-comments-sort-input.raqam-filter-native {',
      '  position: absolute !important; opacity: 0 !important; width: 1px !important; height: 1px !important;',
      '  padding: 0 !important; margin: 0 !important; border: none !important;',
      '  pointer-events: none !important; clip: rect(0,0,0,0) !important; overflow: hidden !important;',
      '}',

      '.raqam-filter-wrap {',
      '  display: inline-flex !important; flex-direction: column !important;',
      '  position: relative !important; align-self: flex-start !important;',
      '  overflow: visible !important; z-index: 20 !important;',
      '}',

      '.raqam-filter-row {',
      '  display: flex !important; align-items: center !important; flex-wrap: wrap !important;',
      '  gap: 10px !important; justify-content: flex-start !important; overflow: visible !important;',
      '}',

      '.raqam-filter-label {',
      '  color: #d8b4fe !important; font-size: 13px !important; font-weight: 700 !important;',
      '  margin: 0 !important; white-space: nowrap !important;',
      '}',

      '.raqam-filter-trigger-wrap {',
      '  position: relative !important; display: inline-block !important;',
      '  overflow: visible !important; z-index: 10 !important;',
      '}',

      '.raqam-filter-trigger {',
      '  display: inline-flex !important; align-items: center !important; justify-content: space-between !important;',
      '  gap: 8px !important; padding: 6px 12px !important;',
      '  min-width: 108px !important; max-width: 150px !important; height: auto !important;',
      '  line-height: 1.3 !important; box-sizing: border-box !important;',
      '  background: ' + FILTER_GLASS_BG + ' !important;',
      '  backdrop-filter: blur(16px) saturate(1.4) !important;',
      '  -webkit-backdrop-filter: blur(16px) saturate(1.4) !important;',
      '  border: 1px solid ' + FILTER_GLASS_BORDER + ' !important;',
      '  border-radius: 10px !important; color: #ffffff !important;',
      '  font-size: 13px !important; font-weight: 600 !important; cursor: pointer !important;',
      '  outline: none !important; box-shadow: 0 2px 10px rgba(54,10,97,0.22) !important;',
      '  transition: border-color 0.2s, box-shadow 0.2s !important;',
      '  pointer-events: auto !important; touch-action: manipulation !important;',
      '  -webkit-tap-highlight-color: transparent !important;',
      '}',

      '.raqam-filter-trigger:hover,',
      '.raqam-filter-trigger[aria-expanded="true"] {',
      '  border-color: rgba(167, 139, 250, 0.55) !important;',
      '  box-shadow: 0 4px 16px rgba(124,58,237,0.28) !important;',
      '}',

      '.raqam-filter-value { flex: 1 1 auto !important; text-align: start !important; pointer-events: none !important; }',
      '.raqam-filter-arrow {',
      '  font-size: 10px !important; opacity: 0.75 !important; line-height: 1 !important;',
      '  transition: transform 0.2s !important; pointer-events: none !important;',
      '}',

      '.raqam-filter-trigger[aria-expanded="true"] .raqam-filter-arrow { transform: rotate(180deg) !important; }',

      '.raqam-filter-menu {',
      '  display: none !important; position: absolute !important; top: calc(100% + 4px) !important;',
      '  inset-inline-start: 0 !important; min-width: 100% !important; z-index: 999999 !important;',
      '  background: rgba(26, 16, 37, 0.92) !important;',
      '  backdrop-filter: blur(18px) saturate(1.5) !important;',
      '  -webkit-backdrop-filter: blur(18px) saturate(1.5) !important;',
      '  border: 1px solid rgba(139, 81, 254, 0.38) !important;',
      '  border-radius: 12px !important; padding: 4px !important;',
      '  box-shadow: 0 8px 28px rgba(54,10,97,0.4) !important; overflow: visible !important;',
      '  pointer-events: auto !important;',
      '}',

      '.raqam-filter-menu.is-open { display: block !important; }',

      '.raqam-filter-option {',
      '  display: block !important; width: 100% !important; text-align: start !important;',
      '  padding: 8px 12px !important; border: none !important; border-radius: 8px !important;',
      '  background: transparent !important; color: #ffffff !important;',
      '  font-size: 13px !important; font-weight: 600 !important; cursor: pointer !important;',
      '  line-height: 1.35 !important; transition: background 0.15s !important;',
      '  pointer-events: auto !important; touch-action: manipulation !important;',
      '  -webkit-tap-highlight-color: transparent !important;',
      '}',

      '.raqam-filter-option:hover,',
      '.raqam-filter-option.is-selected {',
      '  background: rgba(91, 29, 138, 0.85) !important; color: #ffffff !important;',
      '}',

      '.main-content .comments-wrapper h3,',
      '.main-content .comments-wrapper h4,',
      '.main-content .comments-wrapper .s-reviews-header span,',
      '.main-content .comments-wrapper .s-reviews-header div { color: #ffffff !important; font-weight: 700 !important; }',

      '.main-content .comments-wrapper .flex-1.rounded-xl.bg-gray-200.bg-opacity-20,',
      '.main-content #nav-comments .flex-1.rounded-xl.bg-gray-200.bg-opacity-20,',
      '.main-content .comments-wrapper .flex-1.rounded-xl.shadow-sm,',
      '.main-content #nav-comments .flex-1.rounded-xl.shadow-sm {',
      '  background: ' + GLASS_CARD + ' !important; background-color: ' + GLASS_CARD + ' !important;',
      '  border: 1px solid rgba(139,81,254,0.22) !important; border-radius: 14px !important;',
      '  margin-bottom: 12px !important;',
      '}',

      '.main-content .comments-wrapper .s-reviews-list > div,',
      '.main-content .comments-wrapper .s-reviews-list > li,',
      '.main-content .comments-wrapper [class*="comment-item"],',
      '.main-content .comments-wrapper [class*="review-item"],',
      '.main-content .comments-wrapper .comment-item,',
      '.main-content .comments-wrapper .s-comment-item,',
      '.main-content .comments-wrapper .bg-gray-50,',
      '.main-content .comments-wrapper .bg-white,',
      '.main-content .comments-wrapper .da-bgg {',
      '  background: ' + GLASS_CARD + ' !important; background-color: ' + GLASS_CARD + ' !important;',
      '  border: 1px solid rgba(139,81,254,0.22) !important; border-radius: 14px !important;',
      '  padding: 16px 18px !important; margin-bottom: 12px !important; color: #ffffff !important;',
      '}',

      '.main-content .comments-wrapper .s-reviews-list h5,',
      '.main-content .comments-wrapper .s-reviews-list .font-bold,',
      '.main-content .comments-wrapper .comment-author { color: #ffffff !important; font-weight: 700 !important; }',

      '.main-content .comments-wrapper .prose.prose-sm.max-w-none.text-gray-500.da-tm,',
      '.main-content .comments-wrapper .prose.prose-sm.max-w-none.text-gray-500.da-tm p,',
      '.main-content #nav-comments .prose.prose-sm.max-w-none.text-gray-500.da-tm,',
      '.main-content #nav-comments .prose.prose-sm.max-w-none.text-gray-500.da-tm p,',
      '.main-content .comments-wrapper .prose.text-gray-500.da-tm,',
      '.main-content .comments-wrapper .prose.text-gray-500.da-tm p,',
      '.main-content #nav-comments .prose.text-gray-500.da-tm,',
      '.main-content #nav-comments .prose.text-gray-500.da-tm p,',
      '.main-content .comments-wrapper .s-reviews-list .prose,',
      '.main-content .comments-wrapper .s-reviews-list .prose p,',
      '.main-content .comments-wrapper .s-reviews-list [class*="comment"] p,',
      '.main-content .comments-wrapper [class*="comment-body"],',
      '.main-content .comments-wrapper [class*="comment-content"],',
      '.main-content .comments-wrapper .comment-body,',
      '.main-content .comments-wrapper .s-comment-content,',
      '.main-content .comments-wrapper .s-reviews-list p {',
      '  color: #ffffff !important; -webkit-text-fill-color: #ffffff !important;',
      '  font-size: 14px !important; line-height: 1.75 !important;',
      '}',

      '.main-content .comments-wrapper .s-reviews-list time,',
      '.main-content .comments-wrapper .s-reviews-list .comment-date,',
      '.main-content .comments-wrapper .s-reviews-list [class*="date"],',
      '.main-content .comments-wrapper .s-reviews-list .text-muted {',
      '  color: rgba(196,181,253,0.75) !important; -webkit-text-fill-color: rgba(196,181,253,0.75) !important;',
      '  font-size: 12px !important;',
      '}',

      '.main-content .comments-wrapper .icon-star2,',
      '.main-content .comments-wrapper [class*="star"] { color: #ffd700 !important; -webkit-text-fill-color: #ffd700 !important; }',

      '.main-content .comments-wrapper .verified,',
      '.main-content .comments-wrapper .badge {',
      '  background: rgba(255,215,0,0.12) !important; color: #ffd700 !important;',
      '  border: 1px solid rgba(255,215,0,0.3) !important; border-radius: 8px !important;',
      '}',

      '.main-content .comments-wrapper salla-infinite-scroll,',
      '.main-content #nav-comments salla-infinite-scroll,',
      '.main-content .comments-wrapper .s-infinite-scroll-container,',
      '.main-content #nav-comments .s-infinite-scroll-container { display: block !important; text-align: center !important; }',

      '#load-more, a#load-more, #load-more.s-infinite-scroll-btn, a#load-more.s-infinite-scroll-btn,',
      '.main-content #load-more, .main-content a#load-more,',
      '.main-content .comments-wrapper #load-more, .main-content #nav-comments #load-more,',
      '.main-content a.s-infinite-scroll-btn.s-button-primary,',
      '.main-content .comments-wrapper a.s-infinite-scroll-btn.s-button-primary,',
      '.main-content #nav-comments a.s-infinite-scroll-btn.s-button-primary,',
      '.main-content .s-infinite-scroll-btn.s-button-primary,',
      '.main-content .comments-wrapper .s-infinite-scroll-btn.s-button-btn.s-button-primary,',
      '.main-content #nav-comments .s-infinite-scroll-btn.s-button-btn.s-button-primary {',
      '  display: inline-flex !important; align-items: center !important; justify-content: center !important;',
      '  width: fit-content !important; min-width: unset !important; max-width: none !important;',
      '  margin: 16px auto 8px !important;',
      '  background: ' + BTN_GRAD + ' !important; background-image: ' + BTN_GRAD + ' !important;',
      '  background-color: #360a61 !important;',
      '  border: none !important; border-width: 0 !important; outline: none !important;',
      '  box-shadow: none !important; border-radius: 8px !important;',
      '  color: #ffffff !important; -webkit-text-fill-color: #ffffff !important;',
      '  font-weight: 600 !important; font-size: 13px !important;',
      '  padding: 7px 18px !important; text-decoration: none !important; cursor: pointer !important;',
      '}',

      '#load-more .s-button-text, #load-more .s-infinite-scroll-btn-text,',
      'a#load-more .s-button-text, a#load-more .s-infinite-scroll-btn-text,',
      '.main-content #load-more .s-button-text, .main-content #load-more .s-infinite-scroll-btn-text,',
      '.main-content a.s-infinite-scroll-btn.s-button-primary .s-button-text,',
      '.main-content a.s-infinite-scroll-btn.s-button-primary .s-infinite-scroll-btn-text {',
      '  color: #ffffff !important; -webkit-text-fill-color: #ffffff !important;',
      '  font-size: 13px !important; font-weight: 600 !important;',
      '}',

      '/* ══ جوال — كمية v14 مضغوطة ══ */',
      '@media (max-width: 768px) {',

      '  .main-content .s-quantity-input,',
      '  .main-content salla-quantity-input,',
      '  .main-content .sticky-product-bar .s-quantity-input,',
      '  .main-content .cartButtons .s-quantity-input {',
      '    display: inline-flex !important; align-items: stretch !important; flex-wrap: nowrap !important;',
      '    flex-direction: row !important; gap: 0 !important; column-gap: 0 !important;',
      '    width: fit-content !important; max-width: none !important; min-width: 0 !important;',
      '    background: ' + QTY_GLASS_BG + ' !important;',
      '    backdrop-filter: blur(14px) saturate(1.4) !important;',
      '    -webkit-backdrop-filter: blur(14px) saturate(1.4) !important;',
      '    border: 1px solid ' + QTY_BORDER + ' !important;',
      '    border-radius: 12px !important; overflow: hidden !important;',
      '    box-shadow: 0 2px 12px rgba(54,10,97,0.22) !important;',
      '    padding: 0 !important; margin: 0 !important; flex-shrink: 0 !important;',
      '  }',

      '  .main-content salla-quantity-input { display: inline-flex !important; width: fit-content !important; }',
      '  .main-content salla-quantity-input .s-quantity-input { width: auto !important; }',

      '  .main-content .s-quantity-input > *,',
      '  .main-content .sticky-product-bar .s-quantity-input > *,',
      '  .main-content .cartButtons .s-quantity-input > * { margin: 0 !important; }',

      '  .main-content .s-quantity-input-button,',
      '  .main-content .sticky-product-bar .s-quantity-input-button,',
      '  .main-content .cartButtons .s-quantity-input-button {',
      '    display: inline-flex !important; align-items: center !important; justify-content: center !important;',
      '    flex: 0 0 34px !important; width: 34px !important; min-width: 34px !important; max-width: 34px !important;',
      '    height: 34px !important; min-height: 34px !important; padding: 0 !important; margin: 0 !important;',
      '    background: transparent !important; background-color: transparent !important;',
      '    border: none !important; border-radius: 0 !important; outline: none !important; box-shadow: none !important;',
      '    color: #ffffff !important; -webkit-text-fill-color: #ffffff !important;',
      '    font-size: 16px !important; font-weight: 600 !important; line-height: 1 !important;',
      '    cursor: pointer !important; touch-action: manipulation !important;',
      '    -webkit-tap-highlight-color: transparent !important; transition: background 0.15s !important;',
      '  }',

      '  .main-content .s-quantity-input-button:hover,',
      '  .main-content .s-quantity-input-button:active,',
      '  .main-content .sticky-product-bar .s-quantity-input-button:hover,',
      '  .main-content .cartButtons .s-quantity-input-button:hover {',
      '    background: rgba(139,81,254,0.28) !important; color: #ffffff !important;',
      '  }',

      '  .main-content .s-quantity-input-button:first-of-type {',
      '    border-inline-end: 1px solid rgba(139,81,254,0.22) !important;',
      '  }',

      '  .main-content .s-quantity-input-button:last-of-type {',
      '    border-inline-start: 1px solid rgba(139,81,254,0.22) !important;',
      '  }',

      '  .main-content .s-quantity-input-input,',
      '  .main-content .sticky-product-bar .s-quantity-input-input,',
      '  .main-content .cartButtons .s-quantity-input-input {',
      '    display: block !important; flex: 0 0 38px !important;',
      '    width: 38px !important; min-width: 38px !important; max-width: 38px !important;',
      '    height: 34px !important; padding: 0 !important; margin: 0 !important;',
      '    background: transparent !important; background-color: transparent !important;',
      '    border: none !important; border-radius: 0 !important; outline: none !important; box-shadow: none !important;',
      '    color: #ffffff !important; -webkit-text-fill-color: #ffffff !important;',
      '    font-size: 14px !important; font-weight: 700 !important; text-align: center !important;',
      '    line-height: 34px !important; -moz-appearance: textfield !important;',
      '  }',

      '  .main-content .s-quantity-input-input::-webkit-outer-spin-button,',
      '  .main-content .s-quantity-input-input::-webkit-inner-spin-button {',
      '    -webkit-appearance: none !important; margin: 0 !important;',
      '  }',

      '  .main-content .comments-wrapper, .main-content #nav-comments { padding: 12px 10px !important; }',

      '  .main-content .comments-wrapper .s-comments-sort-wrapper,',
      '  .main-content .comments-wrapper [class*="sort"],',
      '  .main-content .comments-wrapper [class*="reviews-header"],',
      '  .main-content .comments-wrapper div:has(#comments-filter),',
      '  .main-content .comments-wrapper div:has(.raqam-filter-wrap),',
      '  .main-content .comments-wrapper .flex:has(#comments-filter),',
      '  .main-content #nav-comments .s-comments-sort-wrapper,',
      '  .main-content #nav-comments [class*="sort"],',
      '  .main-content #nav-comments div:has(#comments-filter),',
      '  .main-content #nav-comments div:has(.raqam-filter-wrap) {',
      '    justify-content: flex-start !important; align-items: center !important;',
      '    align-content: flex-start !important; text-align: start !important;',
      '    width: 100% !important; margin-bottom: 10px !important; gap: 8px !important;',
      '    overflow: visible !important;',
      '  }',

      '  .raqam-filter-wrap { align-self: flex-start !important; width: auto !important; }',
      '  .raqam-filter-trigger { min-width: 100px !important; max-width: 140px !important; }',

      '  .main-content .comments-wrapper .s-reviews-list {',
      '    display: flex !important; flex-direction: column !important; gap: 8px !important;',
      '  }',

      '  .main-content .comments-wrapper .s-reviews-list > div,',
      '  .main-content .comments-wrapper .s-reviews-list > li,',
      '  .main-content .comments-wrapper [class*="comment-item"],',
      '  .main-content .comments-wrapper [class*="review-item"] {',
      '    display: flex !important; flex-direction: row !important; align-items: flex-start !important;',
      '    gap: 8px !important; padding: 0 !important; margin-bottom: 8px !important;',
      '    background: transparent !important; border: none !important; box-shadow: none !important;',
      '  }',

      '  .main-content .comments-wrapper .s-reviews-list img,',
      '  .main-content .comments-wrapper [class*="avatar"] img,',
      '  .main-content .comments-wrapper .rounded-full img {',
      '    width: 36px !important; height: 36px !important; min-width: 36px !important;',
      '    max-width: 36px !important; flex-shrink: 0 !important; border-radius: 50% !important;',
      '  }',

      '  .main-content .comments-wrapper .rounded-full,',
      '  .main-content .comments-wrapper [class*="avatar"] {',
      '    width: 36px !important; height: 36px !important; min-width: 36px !important;',
      '    flex-shrink: 0 !important; margin-top: 2px !important;',
      '  }',

      '  .main-content .comments-wrapper .flex-1.rounded-xl,',
      '  .main-content #nav-comments .flex-1.rounded-xl {',
      '    padding: 8px 10px !important; margin-bottom: 0 !important;',
      '    flex: 1 1 auto !important; min-width: 0 !important; border-radius: 12px !important;',
      '  }',

      '  .main-content .comments-wrapper .flex-1.rounded-xl > .flex.flex-col { gap: 2px !important; margin-bottom: 4px !important; }',

      '  .main-content .comments-wrapper .flex-1 .flex.justify-between.items-center {',
      '    display: flex !important; flex-wrap: wrap !important; align-items: center !important;',
      '    gap: 4px 6px !important; margin-bottom: 2px !important; width: 100% !important;',
      '  }',

      '  .main-content .comments-wrapper .flex-1 h3.text-sm.da-tm,',
      '  .main-content .comments-wrapper .flex-1 h3.text-sm {',
      '    font-size: 12px !important; font-weight: 700 !important; margin: 0 !important;',
      '    line-height: 1.3 !important; flex: 1 1 auto !important; min-width: 0 !important;',
      '  }',

      '  .main-content .comments-wrapper .flex-1 .flex.justify-between > div:last-child {',
      '    display: flex !important; flex-direction: row !important; flex-wrap: wrap !important;',
      '    align-items: center !important; justify-content: flex-end !important; gap: 4px 6px !important;',
      '    flex: 0 1 auto !important; max-width: 55% !important;',
      '  }',

      '  .main-content .comments-wrapper .flex-1 .flex.justify-between span,',
      '  .main-content .comments-wrapper .flex-1 .icon-check-circle {',
      '    font-size: 10px !important; line-height: 1.2 !important; white-space: nowrap !important;',
      '  }',

      '  .main-content .comments-wrapper .flex-1 p.text-gray-400,',
      '  .main-content .comments-wrapper .flex-1 .text-gray-400.da-ts {',
      '    font-size: 10px !important; margin: 0 !important; line-height: 1.2 !important;',
      '    white-space: nowrap !important; color: rgba(196,181,253,0.75) !important;',
      '  }',

      '  .main-content .comments-wrapper .comment__rating {',
      '    margin-bottom: 2px !important; line-height: 1 !important; font-size: 10px !important;',
      '    display: flex !important; align-items: center !important; gap: 1px !important;',
      '  }',

      '  .main-content .comments-wrapper .comment__rating .icon-star2 {',
      '    font-size: 11px !important; width: 11px !important; height: 11px !important;',
      '  }',

      '  .main-content .comments-wrapper .flex-1 .prose.prose-sm,',
      '  .main-content .comments-wrapper .prose.prose-sm.max-w-none.text-gray-500.da-tm {',
      '    margin-top: 2px !important; padding-top: 0 !important;',
      '  }',

      '  .main-content .comments-wrapper .flex-1 .prose.prose-sm p,',
      '  .main-content .comments-wrapper .prose.prose-sm.max-w-none.text-gray-500.da-tm p {',
      '    font-size: 12px !important; line-height: 1.45 !important; margin: 0 !important;',
      '  }',

      '  .main-content .ask-form, .main-content #comment_form { padding: 12px !important; margin-bottom: 12px !important; }',

      '}'
    ].join('\n');

    var style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(style);
    }
    style.textContent = css;
  }

  function getShadowCSS() {
    return [
      '#load-more, a#load-more, .s-infinite-scroll-btn, .s-infinite-scroll-btn.s-button-primary,',
      'a.s-infinite-scroll-btn.s-button-btn.s-button-primary,',
      'button, .s-button-element, .s-button-btn, a.s-button-btn,',
      '.s-button-outline, .s-button-primary-outline,',
      '[class*="load-more"], [class*="infinite"] {',
      '  background: ' + BTN_GRAD + ' !important;',
      '  background-image: ' + BTN_GRAD + ' !important;',
      '  background-color: #360a61 !important;',
      '  border: none !important; outline: none !important; box-shadow: none !important;',
      '  color: #fff !important; -webkit-text-fill-color: #fff !important;',
      '  border-radius: 8px !important; padding: 7px 18px !important;',
      '  font-size: 13px !important; font-weight: 600 !important;',
      '  min-width: unset !important; width: fit-content !important; text-decoration: none !important;',
      '}',
      '#load-more .s-button-text, #load-more .s-infinite-scroll-btn-text,',
      '.s-infinite-scroll-btn .s-button-text, .s-infinite-scroll-btn-text,',
      'button span, .s-button-text {',
      '  color: #fff !important; -webkit-text-fill-color: #fff !important;',
      '  font-size: 13px !important; font-weight: 600 !important;',
      '}',
      '.prose.prose-sm.max-w-none.text-gray-500.da-tm,',
      '.prose.prose-sm.max-w-none.text-gray-500.da-tm p,',
      '.prose.text-gray-500.da-tm, .prose.text-gray-500.da-tm p {',
      '  color: #ffffff !important; -webkit-text-fill-color: #ffffff !important;',
      '}'
    ].join('\n');
  }

  function injectShadowStyles(root) {
    if (!root) return;
    var s = root.getElementById(SHADOW_STYLE_ID);
    if (!s) {
      s = document.createElement('style');
      s.id = SHADOW_STYLE_ID;
      root.appendChild(s);
    }
    s.textContent = getShadowCSS();
  }

  function walkRoots(node, fn) {
    if (!node) return;
    fn(node);
    var kids = node.querySelectorAll ? node.querySelectorAll('*') : [];
    for (var i = 0; i < kids.length; i++) {
      if (kids[i].shadowRoot) {
        fn(kids[i].shadowRoot);
        walkRoots(kids[i].shadowRoot, fn);
      }
    }
  }

  function applyAskButtonStyle(el) {
    el.style.setProperty('background', BTN_GRAD, 'important');
    el.style.setProperty('background-image', BTN_GRAD, 'important');
    el.style.setProperty('background-color', '#360a61', 'important');
    el.style.setProperty('color', '#ffffff', 'important');
    el.style.setProperty('-webkit-text-fill-color', '#ffffff', 'important');
    el.style.setProperty('border', 'none', 'important');
    el.style.setProperty('outline', 'none', 'important');
    el.style.setProperty('box-shadow', 'none', 'important');
    el.style.setProperty('border-radius', '8px', 'important');
    el.style.setProperty('padding', '7px 18px', 'important');
    el.style.setProperty('font-size', '13px', 'important');
    el.style.setProperty('font-weight', '600', 'important');
    el.style.setProperty('min-width', 'unset', 'important');
    el.style.setProperty('width', 'fit-content', 'important');
    el.style.setProperty('text-decoration', 'none', 'important');
    el.style.setProperty('display', 'inline-flex', 'important');
    var kids = el.querySelectorAll('.s-button-text, .s-infinite-scroll-btn-text, span, p');
    for (var i = 0; i < kids.length; i++) {
      kids[i].style.setProperty('color', '#ffffff', 'important');
      kids[i].style.setProperty('-webkit-text-fill-color', '#ffffff', 'important');
      kids[i].style.setProperty('font-size', '13px', 'important');
      kids[i].style.setProperty('font-weight', '600', 'important');
    }
  }

  function fixQuantityInputMobile() {
    document.querySelectorAll(
      '.main-content .s-quantity-input, .main-content salla-quantity-input, ' +
      '.main-content .sticky-product-bar .s-quantity-input, .main-content .cartButtons .s-quantity-input'
    ).forEach(function (wrap) {
      wrap.style.setProperty('display', 'inline-flex', 'important');
      wrap.style.setProperty('align-items', 'stretch', 'important');
      wrap.style.setProperty('flex-wrap', 'nowrap', 'important');
      wrap.style.setProperty('gap', '0', 'important');
      wrap.style.setProperty('width', 'fit-content', 'important');
      wrap.style.setProperty('max-width', 'none', 'important');
      wrap.style.setProperty('background', QTY_GLASS_BG, 'important');
      wrap.style.setProperty('border', '1px solid ' + QTY_BORDER, 'important');
      wrap.style.setProperty('border-radius', '12px', 'important');
      wrap.style.setProperty('overflow', 'hidden', 'important');
      wrap.style.setProperty('padding', '0', 'important');
      wrap.style.setProperty('margin', '0', 'important');
      wrap.style.setProperty('box-shadow', 'none', 'important');
    });

    document.querySelectorAll(
      '.main-content .s-quantity-input-button, ' +
      '.main-content .sticky-product-bar .s-quantity-input-button, ' +
      '.main-content .cartButtons .s-quantity-input-button'
    ).forEach(function (btn) {
      btn.style.setProperty('display', 'inline-flex', 'important');
      btn.style.setProperty('align-items', 'center', 'important');
      btn.style.setProperty('justify-content', 'center', 'important');
      btn.style.setProperty('flex', '0 0 34px', 'important');
      btn.style.setProperty('width', '34px', 'important');
      btn.style.setProperty('min-width', '34px', 'important');
      btn.style.setProperty('max-width', '34px', 'important');
      btn.style.setProperty('height', '34px', 'important');
      btn.style.setProperty('padding', '0', 'important');
      btn.style.setProperty('margin', '0', 'important');
      btn.style.setProperty('background', 'transparent', 'important');
      btn.style.setProperty('border', 'none', 'important');
      btn.style.setProperty('border-radius', '0', 'important');
      btn.style.setProperty('outline', 'none', 'important');
      btn.style.setProperty('box-shadow', 'none', 'important');
      btn.style.setProperty('color', '#ffffff', 'important');
    });

    document.querySelectorAll(
      '.main-content .s-quantity-input-input, ' +
      '.main-content .sticky-product-bar .s-quantity-input-input, ' +
      '.main-content .cartButtons .s-quantity-input-input'
    ).forEach(function (inp) {
      inp.style.setProperty('display', 'block', 'important');
      inp.style.setProperty('flex', '0 0 38px', 'important');
      inp.style.setProperty('width', '38px', 'important');
      inp.style.setProperty('min-width', '38px', 'important');
      inp.style.setProperty('max-width', '38px', 'important');
      inp.style.setProperty('height', '34px', 'important');
      inp.style.setProperty('padding', '0', 'important');
      inp.style.setProperty('margin', '0', 'important');
      inp.style.setProperty('background', 'transparent', 'important');
      inp.style.setProperty('border', 'none', 'important');
      inp.style.setProperty('border-radius', '0', 'important');
      inp.style.setProperty('outline', 'none', 'important');
      inp.style.setProperty('box-shadow', 'none', 'important');
      inp.style.setProperty('color', '#ffffff', 'important');
      inp.style.setProperty('-webkit-text-fill-color', '#ffffff', 'important');
      inp.style.setProperty('text-align', 'center', 'important');
      inp.style.setProperty('font-weight', '700', 'important');
    });
  }

  function fixQuantityInputDesktop() {
    document.querySelectorAll(
      '.main-content .s-quantity-input, .main-content salla-quantity-input, ' +
      '.main-content .sticky-product-bar .s-quantity-input, .main-content .cartButtons .s-quantity-input'
    ).forEach(function (wrap) {
      clearInlineProps(wrap, QTY_WRAP_INLINE);
    });

    document.querySelectorAll(
      '.main-content .s-quantity-input-button, ' +
      '.main-content .sticky-product-bar .s-quantity-input-button, ' +
      '.main-content .cartButtons .s-quantity-input-button'
    ).forEach(function (btn) {
      clearInlineProps(btn, QTY_BTN_INLINE);
      btn.style.setProperty('background', QTY_DESKTOP_BG, 'important');
      btn.style.setProperty('color', '#ffffff', 'important');
      btn.style.setProperty('-webkit-text-fill-color', '#ffffff', 'important');
    });

    document.querySelectorAll(
      '.main-content .s-quantity-input-input, ' +
      '.main-content .sticky-product-bar .s-quantity-input-input, ' +
      '.main-content .cartButtons .s-quantity-input-input'
    ).forEach(function (inp) {
      clearInlineProps(inp, QTY_INP_INLINE);
      inp.style.setProperty('background', QTY_DESKTOP_BG, 'important');
      inp.style.setProperty('color', '#ffffff', 'important');
      inp.style.setProperty('-webkit-text-fill-color', '#ffffff', 'important');
    });
  }

  function fixQuantityInput() {
    if (isMobileQty()) {
      fixQuantityInputMobile();
    } else {
      fixQuantityInputDesktop();
    }
  }

  function bindQtyResize() {
    if (qtyResizeBound) return;
    qtyResizeBound = true;
    window.addEventListener('resize', function () {
      if (qtyResizeTimer) clearTimeout(qtyResizeTimer);
      qtyResizeTimer = setTimeout(function () {
        qtyResizeTimer = null;
        fixQuantityInput();
      }, 100);
    });
  }

  function getFilterLabel(value) {
    var v = (value || '').toLowerCase();
    return FILTER_LABELS[v] || value || '';
  }

  function dispatchSelectChange(select) {
    var evt;
    if (typeof Event === 'function') {
      evt = new Event('change', { bubbles: true });
    } else {
      evt = document.createEvent('Event');
      evt.initEvent('change', true, true);
    }
    select.dispatchEvent(evt);
  }

  function closeAllFilterMenus() {
    document.querySelectorAll('.raqam-filter-menu.is-open').forEach(function (menu) {
      menu.classList.remove('is-open');
      var tw = menu.parentElement;
      if (tw) {
        var trigger = tw.querySelector('.raqam-filter-trigger');
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  function handleOutsideFilterClick(e) {
    if (e.target && e.target.closest && e.target.closest('.raqam-filter-wrap')) return;
    closeAllFilterMenus();
  }

  function bindFilterEvents() {
    if (filterEventsBound) return;
    filterEventsBound = true;
    document.addEventListener('click', handleOutsideFilterClick);
    document.addEventListener('touchend', handleOutsideFilterClick, { passive: true });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeAllFilterMenus();
    });
  }

  function stopEvent(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
  }

  function hideDuplicateRankingLabels() {
    document.querySelectorAll(
      'label[for="comments-filter"], .s-comments-sort-label, ' +
      '.main-content .comments-wrapper [class*="sort"] label, ' +
      '.main-content .comments-wrapper [class*="sort"] > span, ' +
      '.main-content .comments-wrapper [class*="sort"] > p, ' +
      '.main-content #nav-comments [class*="sort"] label, ' +
      '.main-content #nav-comments [class*="sort"] > span'
    ).forEach(function (el) {
      if (el.classList.contains('raqam-filter-label')) return;
      var t = (el.textContent || '').trim();
      if (/^ranking$/i.test(t) || t === 'الترتيب') {
        el.style.setProperty('display', 'none', 'important');
      }
    });
  }

  function translateSelectOptions(select) {
    for (var i = 0; i < select.options.length; i++) {
      var v = (select.options[i].value || '').toLowerCase();
      if (FILTER_LABELS[v]) select.options[i].textContent = FILTER_LABELS[v];
    }
  }

  function syncCustomFilter(select) {
    var wrap = select.closest('.raqam-filter-wrap');
    if (!wrap) return;
    var trigger = wrap.querySelector('.raqam-filter-trigger');
    var valSpan = trigger && trigger.querySelector('.raqam-filter-value');
    if (valSpan) valSpan.textContent = getFilterLabel(select.value);
    wrap.querySelectorAll('.raqam-filter-option').forEach(function (opt) {
      opt.classList.toggle('is-selected', opt.getAttribute('data-value') === select.value);
    });
  }

  function attachFilterTrigger(trigger, menu, select, valSpan) {
    function toggleMenu(e) {
      stopEvent(e);
      var isOpen = menu.classList.contains('is-open');
      document.querySelectorAll('.raqam-filter-menu.is-open').forEach(function (m) {
        if (m !== menu) {
          m.classList.remove('is-open');
          var tw = m.parentElement;
          if (tw) {
            var t = tw.querySelector('.raqam-filter-trigger');
            if (t) t.setAttribute('aria-expanded', 'false');
          }
        }
      });
      if (isOpen) {
        menu.classList.remove('is-open');
        trigger.setAttribute('aria-expanded', 'false');
      } else {
        menu.classList.add('is-open');
        trigger.setAttribute('aria-expanded', 'true');
      }
    }

    trigger.addEventListener('click', toggleMenu);
    trigger.addEventListener('touchend', toggleMenu);
  }

  function attachFilterOption(btn, menu, select, valSpan) {
    var touchHandled = false;

    function pickOption(e) {
      stopEvent(e);
      if (e.type === 'click' && touchHandled) {
        touchHandled = false;
        return;
      }
      if (e.type === 'touchend') touchHandled = true;

      var newVal = btn.getAttribute('data-value');
      if (select.value !== newVal) {
        select.value = newVal;
        dispatchSelectChange(select);
      }
      menu.querySelectorAll('.raqam-filter-option').forEach(function (o) {
        o.classList.toggle('is-selected', o.getAttribute('data-value') === select.value);
      });
      valSpan.textContent = getFilterLabel(select.value);
      closeAllFilterMenus();

      if (e.type === 'touchend') {
        setTimeout(function () { touchHandled = false; }, 350);
      }
    }

    btn.addEventListener('click', pickOption);
    btn.addEventListener('touchend', pickOption);
  }

  function buildCustomFilter(select) {
    if (!select || !select.parentNode) return;

    if (select.getAttribute(FILTER_DONE) === '1' && select.closest('.raqam-filter-wrap')) {
      syncCustomFilter(select);
      return;
    }

    var staleWrap = select.closest('.raqam-filter-wrap');
    if (staleWrap && select.getAttribute(FILTER_DONE) !== '1') {
      var p = staleWrap.parentNode;
      if (p) {
        p.insertBefore(select, staleWrap);
        staleWrap.remove();
      }
    }

    hideDuplicateRankingLabels();
    translateSelectOptions(select);

    var parent = select.parentNode;
    var wrap = document.createElement('div');
    wrap.className = 'raqam-filter-wrap';

    var row = document.createElement('div');
    row.className = 'raqam-filter-row';

    var labelEl = document.createElement('span');
    labelEl.className = 'raqam-filter-label';
    labelEl.textContent = 'الترتيب';

    var triggerWrap = document.createElement('div');
    triggerWrap.className = 'raqam-filter-trigger-wrap';

    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'raqam-filter-trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');

    var valSpan = document.createElement('span');
    valSpan.className = 'raqam-filter-value';
    valSpan.textContent = getFilterLabel(select.value);

    var arrow = document.createElement('span');
    arrow.className = 'raqam-filter-arrow';
    arrow.textContent = '\u25BE';

    trigger.appendChild(valSpan);
    trigger.appendChild(arrow);

    var menu = document.createElement('div');
    menu.className = 'raqam-filter-menu';
    menu.setAttribute('role', 'listbox');

    for (var j = 0; j < select.options.length; j++) {
      var opt = select.options[j];
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'raqam-filter-option';
      btn.setAttribute('role', 'option');
      btn.setAttribute('data-value', opt.value);
      btn.textContent = getFilterLabel(opt.value);
      if (select.value === opt.value) btn.classList.add('is-selected');
      attachFilterOption(btn, menu, select, valSpan);
      menu.appendChild(btn);
    }

    attachFilterTrigger(trigger, menu, select, valSpan);

    triggerWrap.appendChild(trigger);
    triggerWrap.appendChild(menu);

    row.appendChild(labelEl);
    row.appendChild(triggerWrap);
    wrap.appendChild(row);

    select.classList.add('raqam-filter-native');
    select.setAttribute('tabindex', '-1');
    select.setAttribute('aria-hidden', 'true');

    parent.insertBefore(wrap, select);
    wrap.appendChild(select);

    select.setAttribute(FILTER_DONE, '1');
  }

  function fixCustomFilter() {
    if (filterFixTimer) clearTimeout(filterFixTimer);
    filterFixTimer = setTimeout(function () {
      filterFixTimer = null;
      document.querySelectorAll('#comments-filter, .s-comments-sort-input').forEach(function (sel) {
        if (sel.id === 'comments-filter' || sel.classList.contains('s-comments-sort-input')) {
          buildCustomFilter(sel);
        }
      });
      hideDuplicateRankingLabels();
    }, 80);
  }

  function isLoadMoreEl(el) {
    if (!el || el.id === 'ask_button') return false;
    if (el.id === 'load-more') return true;
    if (el.classList && el.classList.contains('s-infinite-scroll-btn')) return true;
    var tag = (el.tagName || '').toLowerCase();
    if (tag !== 'button' && tag !== 'a' && !el.classList.contains('s-button-element')) return false;
    var txt = (el.textContent || '').trim();
    if (txt.indexOf('تحميل') !== -1 || txt.indexOf('المزيد') !== -1 || txt.indexOf('Load') !== -1 || txt.indexOf('More') !== -1) return true;
    var cls = el.className || '';
    if (typeof cls !== 'string') cls = '';
    return /infinite|load-more|load_more/i.test(cls);
  }

  function isDateEl(el) {
    if (!el || !el.closest) return false;
    return !!(el.closest('time, .comment-date, [class*="date"]') ||
      el.classList.contains('comment-date') ||
      (el.tagName && el.tagName.toLowerCase() === 'time'));
  }

  function paintCommentText(el) {
    if (isDateEl(el)) return;
    el.style.setProperty('color', '#ffffff', 'important');
    el.style.setProperty('-webkit-text-fill-color', '#ffffff', 'important');
  }

  function fixProseText() {
    document.querySelectorAll(
      '.prose.prose-sm.max-w-none.text-gray-500.da-tm, ' +
      '.prose.prose-sm.max-w-none.text-gray-500.da-tm p, ' +
      '.main-content .comments-wrapper .prose.prose-sm.max-w-none.text-gray-500.da-tm, ' +
      '.main-content .comments-wrapper .prose.prose-sm.max-w-none.text-gray-500.da-tm p, ' +
      '.main-content #nav-comments .prose.prose-sm.max-w-none.text-gray-500.da-tm, ' +
      '.main-content #nav-comments .prose.prose-sm.max-w-none.text-gray-500.da-tm p'
    ).forEach(paintCommentText);
  }

  function fixLoadMoreButtons() {
    document.querySelectorAll(
      '#load-more, a#load-more, a.s-infinite-scroll-btn.s-button-primary, .s-infinite-scroll-btn.s-button-primary'
    ).forEach(applyAskButtonStyle);

    var roots = document.querySelectorAll(
      '.main-content .comments-wrapper, .main-content #nav-comments, salla-infinite-scroll, salla-comments'
    );
    roots.forEach(function (root) {
      walkRoots(root, function (subRoot) {
        injectShadowStyles(subRoot);
        subRoot.querySelectorAll(
          '#load-more, a#load-more, a.s-infinite-scroll-btn, .s-infinite-scroll-btn.s-button-primary, ' +
          'button, a.s-button-btn, .s-button-element, [class*="load-more"], [class*="infinite"]'
        ).forEach(function (el) {
          if (isLoadMoreEl(el)) applyAskButtonStyle(el);
        });
        subRoot.querySelectorAll(
          '.prose.prose-sm.max-w-none.text-gray-500.da-tm, .prose.prose-sm.max-w-none.text-gray-500.da-tm p'
        ).forEach(paintCommentText);
      });
      if (root.shadowRoot) {
        injectShadowStyles(root.shadowRoot);
        root.shadowRoot.querySelectorAll(
          '#load-more, a#load-more, a.s-infinite-scroll-btn, .s-infinite-scroll-btn.s-button-primary, button, a'
        ).forEach(function (el) {
          if (isLoadMoreEl(el)) applyAskButtonStyle(el);
        });
        root.shadowRoot.querySelectorAll(
          '.prose.prose-sm.max-w-none.text-gray-500.da-tm, .prose.prose-sm.max-w-none.text-gray-500.da-tm p'
        ).forEach(paintCommentText);
      }
    });
  }

  function fixInline() {
    document.querySelectorAll('.main-content .sticky-product-bar.bg-white').forEach(function (el) {
      el.style.setProperty('background', GLASS_INNER, 'important');
    });

    document.querySelectorAll('.main-content .cartButtons .s-button-solid.s-button-primary').forEach(function (btn) {
      btn.style.setProperty('background', BTN_GRAD, 'important');
      btn.style.setProperty('color', '#ffffff', 'important');
    });

    document.querySelectorAll('.main-content #ask_button').forEach(applyAskButtonStyle);

    document.querySelectorAll('.main-content .discountPercentage, .discountPercentage').forEach(function (el) {
      el.style.setProperty('color', '#ffffff', 'important');
      el.style.setProperty('-webkit-text-fill-color', '#ffffff', 'important');
    });

    document.querySelectorAll('.main-content .comments-wrapper .bg-white, .main-content .comments-wrapper .da-bgg').forEach(function (el) {
      el.style.setProperty('background', GLASS_CARD, 'important');
      el.style.setProperty('color', '#ffffff', 'important');
    });

    document.querySelectorAll('.main-content .comments-wrapper .flex-1.rounded-xl.bg-gray-200.bg-opacity-20').forEach(function (el) {
      el.style.setProperty('background', GLASS_CARD, 'important');
      el.style.setProperty('border', '1px solid rgba(139,81,254,0.22)', 'important');
      el.style.setProperty('border-radius', '14px', 'important');
    });

    fixQuantityInput();
    fixCustomFilter();
    fixProseText();
    fixLoadMoreButtons();
  }

  function scheduleReapply() {
    if (fixTimer) clearTimeout(fixTimer);
    fixTimer = setTimeout(function () {
      fixTimer = null;
      fixInline();
    }, 60);
  }

  function init() {
    bindFilterEvents();
    bindQtyResize();
    inject();
    fixInline();
    REAPPLY_DELAYS.forEach(function (ms) {
      setTimeout(function () { inject(); fixInline(); }, ms);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  new MutationObserver(function () {
    inject();
    scheduleReapply();
  }).observe(document.body, { childList: true, subtree: true });
})();














//صفحة السلة


(function () {
  'use strict';

  var STYLE_ID = 'raqam-cart-page-glass';
  var BTN_GRAD = 'linear-gradient(135deg, #360a61 0%, #5b1d8a 45%, #7c3aed 100%)';

  var GLASS_BG = 'rgba(255, 255, 255, 0.07)';
  var GLASS_BORDER = 'rgba(255, 255, 255, 0.14)';
  var GLASS_INNER = 'rgba(255, 255, 255, 0.05)';
  var GLASS_CARD = 'rgba(255, 255, 255, 0.06)';
  var BORDER_PURPLE = 'rgba(139, 81, 254, 0.22)';
  var QTY_GLASS_BG = 'rgba(26, 16, 37, 0.65)';
  var QTY_BORDER = 'rgba(139, 81, 254, 0.4)';

  var SCOPE = '.main-container-wrapper';
  var QTY_SEL = SCOPE + ' .cart-item .s-quantity-input, ' +
    SCOPE + ' .cart-item twsaa-quantity-input, ' +
    SCOPE + ' .main-content .cart-item .s-quantity-input, ' +
    SCOPE + ' .main-content .cart-item twsaa-quantity-input';
  var QTY_BTN_SEL = SCOPE + ' .cart-item .s-quantity-input-button, ' +
    SCOPE + ' .main-content .cart-item .s-quantity-input-button';
  var QTY_INP_SEL = SCOPE + ' .cart-item .s-quantity-input-input, ' +
    SCOPE + ' .main-content .cart-item .s-quantity-input-input';
  var QTY_WRAP_SEL = SCOPE + ' .cart-item .s-quantity-input-container, ' +
    SCOPE + ' .main-content .cart-item .s-quantity-input-container';

  var REAPPLY_DELAYS = [0, 80, 200, 500, 1000, 2000, 4000, 6000, 8000, 10000];
  var fixTimer = null;
  var qtyBurstTimer = null;
  var qtyBurstCount = 0;
  var qtyResizeBound = false;

  var QTY_BTN_INLINE = [
    'display', 'align-items', 'justify-content', 'flex', 'width', 'min-width', 'max-width',
    'height', 'min-height', 'padding', 'margin', 'background', 'background-color', 'border',
    'border-radius', 'outline', 'box-shadow', 'color', '-webkit-text-fill-color',
    'font-size', 'font-weight', 'line-height'
  ];
  var QTY_INP_INLINE = [
    'display', 'flex', 'width', 'min-width', 'max-width', 'height', 'padding', 'margin',
    'background', 'background-color', 'border', 'border-radius', 'outline', 'box-shadow',
    'color', '-webkit-text-fill-color', 'text-align', 'font-weight', 'line-height', 'font-size'
  ];
  var QTY_WRAP_INLINE = [
    'display', 'align-items', 'flex-wrap', 'gap', 'width', 'max-width', 'min-width',
    'background', 'background-color', 'border', 'border-radius', 'overflow', 'padding',
    'margin', 'box-shadow', 'flex-direction'
  ];

  function isCartPage() {
    var p = (location.pathname || '').toLowerCase();
    return p.indexOf('/cart') !== -1;
  }

  function clearInlineProps(el, props) {
    for (var i = 0; i < props.length; i++) {
      el.style.removeProperty(props[i]);
    }
  }

  function inject() {
    var css = [
      '/* raqam-cart-page-glass v2 */',

      SCOPE + ' .nav-header.bg-gray-100,',
      SCOPE + ' .nav-header.da-bgg {',
      '  background: ' + GLASS_BG + ' !important;',
      '  background-color: ' + GLASS_BG + ' !important;',
      '  backdrop-filter: blur(22px) saturate(1.6) brightness(1.05) !important;',
      '  -webkit-backdrop-filter: blur(22px) saturate(1.6) brightness(1.05) !important;',
      '  border-bottom: 1px solid ' + BORDER_PURPLE + ' !important;',
      '  box-shadow: 0 4px 24px rgba(54, 10, 97, 0.2) !important;',
      '}',

      SCOPE + ' .nav-header h1,',
      SCOPE + ' .nav-header .da-tm {',
      '  color: #ffffff !important;',
      '  -webkit-text-fill-color: #ffffff !important;',
      '  font-weight: 700 !important;',
      '}',

      SCOPE + ' .breadcrumb,',
      SCOPE + ' .nav-breadcrumb {',
      '  background: transparent !important;',
      '}',

      SCOPE + ' .breadcrumb-item,',
      SCOPE + ' .breadcrumb-item a,',
      SCOPE + ' .breadcrumb-item .icon-home {',
      '  color: #c4b5fd !important;',
      '  -webkit-text-fill-color: #c4b5fd !important;',
      '}',

      SCOPE + ' .breadcrumb-item a:hover {',
      '  color: #a855f7 !important;',
      '}',

      SCOPE + ' .breadcrumb-item.active {',
      '  color: #ffffff !important;',
      '  -webkit-text-fill-color: #ffffff !important;',
      '}',

      SCOPE + ' twsaa-conditional-offer.bg-white,',
      SCOPE + ' twsaa-conditional-offer.s-conditional-offer-container,',
      SCOPE + ' .s-conditional-offer-container.bg-white {',
      '  display: block !important;',
      '  background: ' + GLASS_CARD + ' !important;',
      '  background-color: ' + GLASS_CARD + ' !important;',
      '  backdrop-filter: blur(20px) saturate(1.5) !important;',
      '  -webkit-backdrop-filter: blur(20px) saturate(1.5) !important;',
      '  border: 1px solid ' + BORDER_PURPLE + ' !important;',
      '  border-radius: 16px !important;',
      '  box-shadow: 0 8px 32px rgba(54, 10, 97, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;',
      '}',

      SCOPE + ' .s-conditional-offer-title,',
      SCOPE + ' .s-conditional-offer-title-wrapper {',
      '  color: #ffffff !important;',
      '  -webkit-text-fill-color: #ffffff !important;',
      '  font-weight: 700 !important;',
      '}',

      SCOPE + ' .s-conditional-offer-checkpoint-label,',
      SCOPE + ' .s-conditional-offer-checkpoint-label.active,',
      SCOPE + ' .s-conditional-offer-progress-bar,',
      SCOPE + ' .s-conditional-offer-progress-container {',
      '  color: #e9d5ff !important;',
      '  -webkit-text-fill-color: #e9d5ff !important;',
      '}',

      SCOPE + ' section.cart-item.bg-white,',
      SCOPE + ' .cart-item.da-bgg {',
      '  background: ' + GLASS_CARD + ' !important;',
      '  background-color: ' + GLASS_CARD + ' !important;',
      '  backdrop-filter: blur(20px) saturate(1.5) !important;',
      '  -webkit-backdrop-filter: blur(20px) saturate(1.5) !important;',
      '  border: 1px solid ' + BORDER_PURPLE + ' !important;',
      '  border-radius: 16px !important;',
      '  box-shadow: 0 6px 28px rgba(54, 10, 97, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;',
      '  color: #ffffff !important;',
      '}',

      SCOPE + ' .cart-item h4,',
      SCOPE + ' .cart-item h5,',
      SCOPE + ' .cart-item .da-tm,',
      SCOPE + ' .cart-item b.da-tm,',
      SCOPE + ' .cart-item .font-primary {',
      '  color: #ffffff !important;',
      '  -webkit-text-fill-color: #ffffff !important;',
      '}',

      SCOPE + ' .cart-item a.font-primary:hover {',
      '  color: #a855f7 !important;',
      '}',

      SCOPE + ' .cart-item .text-gray-500,',
      SCOPE + ' .cart-item .text-gray-400,',
      SCOPE + ' .cart-item .da-ts {',
      '  color: #c4b5fd !important;',
      '  -webkit-text-fill-color: #c4b5fd !important;',
      '}',

      SCOPE + ' .cart-item .item-regular-price,',
      SCOPE + ' .cart-item .line-through {',
      '  color: #f87171 !important;',
      '  -webkit-text-fill-color: #f87171 !important;',
      '  text-decoration: line-through !important;',
      '}',

      SCOPE + ' .cart-item .item-price,',
      SCOPE + ' .cart-item .text-red-400,',
      SCOPE + ' .cart-item .item-total,',
      SCOPE + ' .cart-item .text-primary {',
      '  color: #ffffff !important;',
      '  -webkit-text-fill-color: #ffffff !important;',
      '  font-weight: 700 !important;',
      '}',

      SCOPE + ' .cart-item .border-gray-200,',
      SCOPE + ' .cart-item .border-t {',
      '  border-color: rgba(139, 81, 254, 0.25) !important;',
      '}',

      SCOPE + ' .s-cart-item-offers-box {',
      '  background: rgba(34, 197, 94, 0.1) !important;',
      '  border: 1px solid rgba(34, 197, 94, 0.35) !important;',
      '  border-radius: 10px !important;',
      '  padding: 8px 10px !important;',
      '}',

      SCOPE + ' .s-cart-item-offers-title,',
      SCOPE + ' .s-cart-item-offers-icon,',
      SCOPE + ' .s-cart-item-offers-icon i {',
      '  color: #86efac !important;',
      '  -webkit-text-fill-color: #86efac !important;',
      '}',

      '/* v2: الشريط الجانبي — صندوق خارجي فقط */',

      SCOPE + ' .sticky > .shadow-default.bg-white.da-bgg,',
      SCOPE + ' .sticky > .shadow-default.da-bgg {',
      '  background: ' + GLASS_CARD + ' !important;',
      '  background-color: ' + GLASS_CARD + ' !important;',
      '  backdrop-filter: blur(20px) saturate(1.5) !important;',
      '  -webkit-backdrop-filter: blur(20px) saturate(1.5) !important;',
      '  border: 1px solid ' + BORDER_PURPLE + ' !important;',
      '  border-radius: 16px !important;',
      '  box-shadow: 0 8px 32px rgba(54, 10, 97, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;',
      '  color: #ffffff !important;',
      '  padding: 20px 24px !important;',
      '  margin-bottom: 20px !important;',
      '}',

      SCOPE + ' .sticky .shadow-default .shadow-default.bg-white,',
      SCOPE + ' .sticky .shadow-default .shadow-default.da-bgg,',
      SCOPE + ' .sticky .shadow-default > .shadow-default {',
      '  background: transparent !important;',
      '  background-color: transparent !important;',
      '  backdrop-filter: none !important;',
      '  -webkit-backdrop-filter: none !important;',
      '  border: none !important;',
      '  border-radius: 0 !important;',
      '  box-shadow: none !important;',
      '  padding: 0 !important;',
      '  margin: 0 !important;',
      '  margin-bottom: 0 !important;',
      '}',

      SCOPE + ' .shadow-default h4,',
      SCOPE + ' .shadow-default h5,',
      SCOPE + ' .shadow-default .da-tm,',
      SCOPE + ' .shadow-default span,',
      SCOPE + ' .shadow-default b {',
      '  color: #ffffff !important;',
      '  -webkit-text-fill-color: #ffffff !important;',
      '}',

      SCOPE + ' .shadow-default .text-primary,',
      SCOPE + ' #sub-total,',
      SCOPE + ' #total-discount b,',
      SCOPE + ' [data-cart-total] {',
      '  color: #e9d5ff !important;',
      '  -webkit-text-fill-color: #e9d5ff !important;',
      '  font-weight: 700 !important;',
      '}',

      SCOPE + ' .sar-icon,',
      SCOPE + ' img.sar-icon {',
      '  filter: brightness(0) invert(1) !important;',
      '}',

      SCOPE + ' .cart-item .item-regular-price .sar-icon {',
      '  filter: brightness(0) saturate(100%) invert(27%) sepia(95%) saturate(5000%) hue-rotate(350deg) !important;',
      '}',

      SCOPE + ' .cart-submit-wrap,',
      SCOPE + ' .cart-submit-wrap > a {',
      '  display: block !important;',
      '  width: 100% !important;',
      '  text-decoration: none !important;',
      '}',

      '/* v2: أزرار الإتمام بعد تسجيل الدخول */',

      SCOPE + ' .btn--coupon,',
      SCOPE + ' .cart-submit-wrap .btn--coupon,',
      SCOPE + ' .cart-submit-wrap .btn--checkout,',
      SCOPE + ' .cart-submit-wrap .s-button-primary,',
      SCOPE + ' .cart-submit-wrap a.btn-primary,',
      SCOPE + ' .cart-submit-wrap .btn.btn-primary,',
      SCOPE + ' .cart-submit-wrap .btn-lg.btn-primary,',
      SCOPE + ' .cart-submit-wrap a.btn.btn-lg,',
      SCOPE + ' .sticky .s-button-solid.s-button-primary,',
      SCOPE + ' .sticky a.s-button-btn.s-button-primary {',
      '  display: flex !important;',
      '  align-items: center !important;',
      '  justify-content: center !important;',
      '  width: 100% !important;',
      '  background: ' + BTN_GRAD + ' !important;',
      '  background-image: ' + BTN_GRAD + ' !important;',
      '  background-color: #360a61 !important;',
      '  border: none !important;',
      '  outline: none !important;',
      '  color: #ffffff !important;',
      '  -webkit-text-fill-color: #ffffff !important;',
      '  border-radius: 12px !important;',
      '  padding: 12px 20px !important;',
      '  font-size: 14px !important;',
      '  font-weight: 600 !important;',
      '  box-shadow: 0 4px 16px rgba(54, 10, 97, 0.35) !important;',
      '  cursor: pointer !important;',
      '  text-align: center !important;',
      '  text-decoration: none !important;',
      '}',

      SCOPE + ' .btn--coupon .s-button-text,',
      SCOPE + ' .cart-submit-wrap .s-button-text,',
      SCOPE + ' .cart-submit-wrap a.btn-primary,',
      SCOPE + ' .cart-submit-wrap .btn.btn-primary {',
      '  color: #ffffff !important;',
      '  -webkit-text-fill-color: #ffffff !important;',
      '}',

      '/* v2: زر الأمنيات */',

      SCOPE + ' .btn--wishlist,',
      SCOPE + ' .btn--wishlist.s-button-outline,',
      SCOPE + ' .btn--wishlist.s-button-light-outline,',
      SCOPE + ' .cart-item .btn--wishlist {',
      '  display: inline-flex !important;',
      '  align-items: center !important;',
      '  justify-content: center !important;',
      '  background: rgba(139, 81, 254, 0.08) !important;',
      '  background-color: rgba(139, 81, 254, 0.08) !important;',
      '  backdrop-filter: blur(12px) saturate(1.3) !important;',
      '  -webkit-backdrop-filter: blur(12px) saturate(1.3) !important;',
      '  border: 1px solid rgba(139, 81, 254, 0.45) !important;',
      '  color: #ffffff !important;',
      '  -webkit-text-fill-color: #ffffff !important;',
      '  border-radius: 10px !important;',
      '  padding: 8px 14px !important;',
      '  font-size: 13px !important;',
      '  font-weight: 600 !important;',
      '  box-shadow: 0 2px 10px rgba(54, 10, 97, 0.2) !important;',
      '  text-decoration: none !important;',
      '  cursor: pointer !important;',
      '  transition: border-color 0.2s, background 0.2s, box-shadow 0.2s !important;',
      '}',

      SCOPE + ' .btn--wishlist:hover,',
      SCOPE + ' .btn--wishlist:active,',
      SCOPE + ' .cart-item .btn--wishlist:hover {',
      '  background: rgba(91, 29, 138, 0.35) !important;',
      '  background-color: rgba(91, 29, 138, 0.35) !important;',
      '  border-color: rgba(167, 139, 250, 0.65) !important;',
      '  box-shadow: 0 4px 14px rgba(124, 58, 237, 0.28) !important;',
      '  color: #ffffff !important;',
      '  -webkit-text-fill-color: #ffffff !important;',
      '}',

      SCOPE + ' .btn--wishlist .s-button-text,',
      SCOPE + ' .btn--wishlist span {',
      '  color: #ffffff !important;',
      '  -webkit-text-fill-color: #ffffff !important;',
      '}',

      SCOPE + ' .btn--delete.s-button-danger,',
      SCOPE + ' .cart-item .btn--delete {',
      '  background: rgba(220, 38, 38, 0.88) !important;',
      '  background-color: rgba(220, 38, 38, 0.88) !important;',
      '  border: 1px solid rgba(252, 165, 165, 0.45) !important;',
      '  color: #ffffff !important;',
      '  -webkit-text-fill-color: #ffffff !important;',
      '  border-radius: 8px !important;',
      '  box-shadow: 0 2px 8px rgba(220, 38, 38, 0.3) !important;',
      '}',

      SCOPE + ' .btn--delete .s-button-text,',
      SCOPE + ' .btn--delete .icon-cancel,',
      SCOPE + ' .btn--delete .fix-align {',
      '  color: #ffffff !important;',
      '  -webkit-text-fill-color: #ffffff !important;',
      '}',

      SCOPE + ' coupon-component,',
      SCOPE + ' .coupon-form,',
      SCOPE + ' .s-coupon-input-wrapper {',
      '  background: transparent !important;',
      '}',

      SCOPE + ' .coupon-form input,',
      SCOPE + ' .s-coupon-input,',
      SCOPE + ' input[name*="coupon"] {',
      '  background: ' + GLASS_INNER + ' !important;',
      '  border: 1px solid rgba(139, 81, 254, 0.35) !important;',
      '  border-radius: 10px !important;',
      '  color: #ffffff !important;',
      '  padding: 10px 12px !important;',
      '}',

      SCOPE + ' .coupon-form input::placeholder {',
      '  color: rgba(196, 181, 253, 0.6) !important;',
      '}',

      '/* v2: كمية — أولوية أعلى من v15 product page */',

      SCOPE + ' .cart-item .s-quantity-input,',
      SCOPE + ' .cart-item twsaa-quantity-input,',
      SCOPE + ' .main-content .cart-item .s-quantity-input,',
      SCOPE + ' .main-content .cart-item twsaa-quantity-input,',
      SCOPE + ' .cart-item .s-quantity-input-container {',
      '  display: inline-flex !important;',
      '  align-items: stretch !important;',
      '  flex-wrap: nowrap !important;',
      '  flex-direction: row !important;',
      '  gap: 0 !important;',
      '  column-gap: 0 !important;',
      '  width: fit-content !important;',
      '  max-width: none !important;',
      '  min-width: 0 !important;',
      '  background: ' + QTY_GLASS_BG + ' !important;',
      '  background-color: ' + QTY_GLASS_BG + ' !important;',
      '  backdrop-filter: blur(14px) saturate(1.4) !important;',
      '  -webkit-backdrop-filter: blur(14px) saturate(1.4) !important;',
      '  border: 1px solid ' + QTY_BORDER + ' !important;',
      '  border-radius: 12px !important;',
      '  overflow: hidden !important;',
      '  box-shadow: 0 2px 12px rgba(54, 10, 97, 0.22) !important;',
      '  padding: 0 !important;',
      '  margin: 0 !important;',
      '}',

      SCOPE + ' .cart-item twsaa-quantity-input,',
      SCOPE + ' .main-content .cart-item twsaa-quantity-input {',
      '  display: inline-flex !important;',
      '  width: fit-content !important;',
      '}',

      SCOPE + ' .cart-item .s-quantity-input > *,',
      SCOPE + ' .main-content .cart-item .s-quantity-input > * {',
      '  margin: 0 !important;',
      '}',

      SCOPE + ' .cart-item .s-quantity-input-button,',
      SCOPE + ' .main-content .cart-item .s-quantity-input-button,',
      SCOPE + ' .cart-item .s-quantity-input-decrease-button,',
      SCOPE + ' .cart-item .s-quantity-input-increase-button {',
      '  display: inline-flex !important;',
      '  align-items: center !important;',
      '  justify-content: center !important;',
      '  flex: 0 0 34px !important;',
      '  width: 34px !important;',
      '  min-width: 34px !important;',
      '  max-width: 34px !important;',
      '  height: 34px !important;',
      '  min-height: 34px !important;',
      '  padding: 0 !important;',
      '  margin: 0 !important;',
      '  background: transparent !important;',
      '  background-color: transparent !important;',
      '  border: none !important;',
      '  border-radius: 0 !important;',
      '  outline: none !important;',
      '  box-shadow: none !important;',
      '  color: #ffffff !important;',
      '  -webkit-text-fill-color: #ffffff !important;',
      '  font-size: 16px !important;',
      '  font-weight: 600 !important;',
      '  line-height: 1 !important;',
      '  cursor: pointer !important;',
      '}',

      SCOPE + ' .cart-item .s-quantity-input-button:hover,',
      SCOPE + ' .cart-item .s-quantity-input-button:active,',
      SCOPE + ' .main-content .cart-item .s-quantity-input-button:hover {',
      '  background: rgba(139, 81, 254, 0.28) !important;',
      '  background-color: rgba(139, 81, 254, 0.28) !important;',
      '  color: #ffffff !important;',
      '}',

      SCOPE + ' .cart-item .s-quantity-input-decrease-button,',
      SCOPE + ' .main-content .cart-item .s-quantity-input-decrease-button {',
      '  border-inline-end: 1px solid rgba(139, 81, 254, 0.22) !important;',
      '}',

      SCOPE + ' .cart-item .s-quantity-input-increase-button,',
      SCOPE + ' .main-content .cart-item .s-quantity-input-increase-button {',
      '  border-inline-start: 1px solid rgba(139, 81, 254, 0.22) !important;',
      '}',

      SCOPE + ' .cart-item .s-quantity-input-input,',
      SCOPE + ' .main-content .cart-item .s-quantity-input-input {',
      '  display: block !important;',
      '  flex: 0 0 38px !important;',
      '  width: 38px !important;',
      '  min-width: 38px !important;',
      '  max-width: 38px !important;',
      '  height: 34px !important;',
      '  padding: 0 !important;',
      '  margin: 0 !important;',
      '  background: transparent !important;',
      '  background-color: transparent !important;',
      '  border: none !important;',
      '  border-radius: 0 !important;',
      '  outline: none !important;',
      '  box-shadow: none !important;',
      '  color: #ffffff !important;',
      '  -webkit-text-fill-color: #ffffff !important;',
      '  font-size: 14px !important;',
      '  font-weight: 700 !important;',
      '  text-align: center !important;',
      '  line-height: 34px !important;',
      '  -moz-appearance: textfield !important;',
      '}',

      SCOPE + ' .cart-item .s-quantity-input-input::-webkit-outer-spin-button,',
      SCOPE + ' .cart-item .s-quantity-input-input::-webkit-inner-spin-button {',
      '  -webkit-appearance: none !important;',
      '  margin: 0 !important;',
      '}',

      SCOPE + ' .empty-cart,',
      SCOPE + ' .s-cart-empty {',
      '  background: ' + GLASS_CARD + ' !important;',
      '  border: 1px solid ' + BORDER_PURPLE + ' !important;',
      '  border-radius: 16px !important;',
      '  color: #ffffff !important;',
      '  padding: 32px 24px !important;',
      '}',

      SCOPE + ' .empty-cart .s-button-primary,',
      SCOPE + ' .s-cart-empty .s-button-primary {',
      '  background: ' + BTN_GRAD + ' !important;',
      '  color: #ffffff !important;',
      '  border: none !important;',
      '  border-radius: 12px !important;',
      '}'
    ].join('\n');

    var style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(style);
    }
    style.textContent = css;
  }

  function applyPrimaryBtnStyle(el) {
    if (!el) return;
    el.style.setProperty('background', BTN_GRAD, 'important');
    el.style.setProperty('background-image', BTN_GRAD, 'important');
    el.style.setProperty('background-color', '#360a61', 'important');
    el.style.setProperty('color', '#ffffff', 'important');
    el.style.setProperty('-webkit-text-fill-color', '#ffffff', 'important');
    el.style.setProperty('border', 'none', 'important');
    el.style.setProperty('outline', 'none', 'important');
    el.style.setProperty('box-shadow', '0 4px 16px rgba(54, 10, 97, 0.35)', 'important');
    el.style.setProperty('border-radius', '12px', 'important');
    el.style.setProperty('display', 'flex', 'important');
    el.style.setProperty('align-items', 'center', 'important');
    el.style.setProperty('justify-content', 'center', 'important');
    el.style.setProperty('width', '100%', 'important');
    el.style.setProperty('padding', '12px 20px', 'important');
    el.style.setProperty('font-size', '14px', 'important');
    el.style.setProperty('font-weight', '600', 'important');
    el.style.setProperty('text-align', 'center', 'important');
    el.style.setProperty('text-decoration', 'none', 'important');
    el.style.setProperty('cursor', 'pointer', 'important');
    var kids = el.querySelectorAll('.s-button-text, span, p');
    for (var i = 0; i < kids.length; i++) {
      kids[i].style.setProperty('color', '#ffffff', 'important');
      kids[i].style.setProperty('-webkit-text-fill-color', '#ffffff', 'important');
    }
  }

  function applyWishlistBtnStyle(el) {
    if (!el) return;
    el.style.setProperty('background', 'rgba(139, 81, 254, 0.08)', 'important');
    el.style.setProperty('background-color', 'rgba(139, 81, 254, 0.08)', 'important');
    el.style.setProperty('border', '1px solid rgba(139, 81, 254, 0.45)', 'important');
    el.style.setProperty('color', '#ffffff', 'important');
    el.style.setProperty('-webkit-text-fill-color', '#ffffff', 'important');
    el.style.setProperty('border-radius', '10px', 'important');
    el.style.setProperty('box-shadow', '0 2px 10px rgba(54, 10, 97, 0.2)', 'important');
    el.style.setProperty('outline', 'none', 'important');
    var kids = el.querySelectorAll('.s-button-text, span');
    for (var i = 0; i < kids.length; i++) {
      kids[i].style.setProperty('color', '#ffffff', 'important');
      kids[i].style.setProperty('-webkit-text-fill-color', '#ffffff', 'important');
    }
  }

  function fixGlassBg(el) {
    if (!el) return;
    el.style.setProperty('background', GLASS_CARD, 'important');
    el.style.setProperty('background-color', GLASS_CARD, 'important');
    el.style.setProperty('color', '#ffffff', 'important');
  }

  function fixNavHeader(el) {
    if (!el) return;
    el.style.setProperty('background', GLASS_BG, 'important');
    el.style.setProperty('background-color', GLASS_BG, 'important');
  }

  function fixNestedSidebar() {
    document.querySelectorAll(
      SCOPE + ' .sticky .shadow-default .shadow-default'
    ).forEach(function (inner) {
      inner.style.setProperty('background', 'transparent', 'important');
      inner.style.setProperty('background-color', 'transparent', 'important');
      inner.style.setProperty('border', 'none', 'important');
      inner.style.setProperty('box-shadow', 'none', 'important');
      inner.style.setProperty('border-radius', '0', 'important');
      inner.style.setProperty('padding', '0', 'important');
      inner.style.setProperty('margin', '0', 'important');
      inner.style.setProperty('margin-bottom', '0', 'important');
    });

    document.querySelectorAll(
      SCOPE + ' .sticky > .shadow-default.bg-white, ' +
      SCOPE + ' .sticky > .shadow-default.da-bgg'
    ).forEach(fixGlassBg);
  }

  function fixQuantityInput() {
    document.querySelectorAll(QTY_SEL).forEach(function (wrap) {
      clearInlineProps(wrap, QTY_WRAP_INLINE);
      wrap.style.setProperty('display', 'inline-flex', 'important');
      wrap.style.setProperty('align-items', 'stretch', 'important');
      wrap.style.setProperty('flex-wrap', 'nowrap', 'important');
      wrap.style.setProperty('flex-direction', 'row', 'important');
      wrap.style.setProperty('gap', '0', 'important');
      wrap.style.setProperty('column-gap', '0', 'important');
      wrap.style.setProperty('width', 'fit-content', 'important');
      wrap.style.setProperty('max-width', 'none', 'important');
      wrap.style.setProperty('min-width', '0', 'important');
      wrap.style.setProperty('background', QTY_GLASS_BG, 'important');
      wrap.style.setProperty('background-color', QTY_GLASS_BG, 'important');
      wrap.style.setProperty('border', '1px solid ' + QTY_BORDER, 'important');
      wrap.style.setProperty('border-radius', '12px', 'important');
      wrap.style.setProperty('overflow', 'hidden', 'important');
      wrap.style.setProperty('padding', '0', 'important');
      wrap.style.setProperty('margin', '0', 'important');
      wrap.style.setProperty('box-shadow', '0 2px 12px rgba(54, 10, 97, 0.22)', 'important');
    });

    document.querySelectorAll(QTY_WRAP_SEL).forEach(function (wrap) {
      clearInlineProps(wrap, QTY_WRAP_INLINE);
      wrap.style.setProperty('display', 'inline-flex', 'important');
      wrap.style.setProperty('background', 'transparent', 'important');
      wrap.style.setProperty('background-color', 'transparent', 'important');
      wrap.style.setProperty('border', 'none', 'important');
      wrap.style.setProperty('padding', '0', 'important');
      wrap.style.setProperty('margin', '0', 'important');
      wrap.style.setProperty('box-shadow', 'none', 'important');
      wrap.style.setProperty('border-radius', '0', 'important');
      wrap.style.setProperty('overflow', 'visible', 'important');
    });

    document.querySelectorAll(QTY_BTN_SEL).forEach(function (btn) {
      clearInlineProps(btn, QTY_BTN_INLINE);
      btn.style.setProperty('display', 'inline-flex', 'important');
      btn.style.setProperty('align-items', 'center', 'important');
      btn.style.setProperty('justify-content', 'center', 'important');
      btn.style.setProperty('flex', '0 0 34px', 'important');
      btn.style.setProperty('width', '34px', 'important');
      btn.style.setProperty('min-width', '34px', 'important');
      btn.style.setProperty('max-width', '34px', 'important');
      btn.style.setProperty('height', '34px', 'important');
      btn.style.setProperty('min-height', '34px', 'important');
      btn.style.setProperty('padding', '0', 'important');
      btn.style.setProperty('margin', '0', 'important');
      btn.style.setProperty('background', 'transparent', 'important');
      btn.style.setProperty('background-color', 'transparent', 'important');
      btn.style.setProperty('border', 'none', 'important');
      btn.style.setProperty('border-radius', '0', 'important');
      btn.style.setProperty('outline', 'none', 'important');
      btn.style.setProperty('box-shadow', 'none', 'important');
      btn.style.setProperty('color', '#ffffff', 'important');
      btn.style.setProperty('-webkit-text-fill-color', '#ffffff', 'important');
      btn.style.setProperty('font-size', '16px', 'important');
      btn.style.setProperty('font-weight', '600', 'important');
      btn.style.setProperty('line-height', '1', 'important');
      if (btn.classList.contains('s-quantity-input-decrease-button')) {
        btn.style.setProperty('border-inline-end', '1px solid rgba(139, 81, 254, 0.22)', 'important');
        btn.style.setProperty('border-inline-start', 'none', 'important');
      }
      if (btn.classList.contains('s-quantity-input-increase-button')) {
        btn.style.setProperty('border-inline-start', '1px solid rgba(139, 81, 254, 0.22)', 'important');
        btn.style.setProperty('border-inline-end', 'none', 'important');
      }
    });

    document.querySelectorAll(QTY_INP_SEL).forEach(function (inp) {
      clearInlineProps(inp, QTY_INP_INLINE);
      inp.style.setProperty('display', 'block', 'important');
      inp.style.setProperty('flex', '0 0 38px', 'important');
      inp.style.setProperty('width', '38px', 'important');
      inp.style.setProperty('min-width', '38px', 'important');
      inp.style.setProperty('max-width', '38px', 'important');
      inp.style.setProperty('height', '34px', 'important');
      inp.style.setProperty('padding', '0', 'important');
      inp.style.setProperty('margin', '0', 'important');
      inp.style.setProperty('background', 'transparent', 'important');
      inp.style.setProperty('background-color', 'transparent', 'important');
      inp.style.setProperty('border', 'none', 'important');
      inp.style.setProperty('border-radius', '0', 'important');
      inp.style.setProperty('outline', 'none', 'important');
      inp.style.setProperty('box-shadow', 'none', 'important');
      inp.style.setProperty('color', '#ffffff', 'important');
      inp.style.setProperty('-webkit-text-fill-color', '#ffffff', 'important');
      inp.style.setProperty('text-align', 'center', 'important');
      inp.style.setProperty('font-weight', '700', 'important');
      inp.style.setProperty('line-height', '34px', 'important');
    });
  }

  function fixInline() {
    document.querySelectorAll(
      SCOPE + ' .nav-header.bg-gray-100, ' + SCOPE + ' .nav-header.da-bgg'
    ).forEach(fixNavHeader);

    document.querySelectorAll(
      SCOPE + ' .bg-white, ' + SCOPE + ' .da-bgg, ' + SCOPE + ' .bg-gray-100'
    ).forEach(function (el) {
      if (el.closest('.nav-header')) {
        fixNavHeader(el);
        return;
      }
      if (el.closest(SCOPE + ' .sticky .shadow-default .shadow-default')) {
        el.style.setProperty('background', 'transparent', 'important');
        el.style.setProperty('background-color', 'transparent', 'important');
        return;
      }
      if (
        el.classList.contains('cart-item') ||
        el.classList.contains('s-conditional-offer-container') ||
        el.tagName === 'TWSAA-CONDITIONAL-OFFER'
      ) {
        fixGlassBg(el);
      }
      if (
        el.classList.contains('shadow-default') &&
        el.classList.contains('da-bgg') &&
        el.parentElement &&
        el.parentElement.classList.contains('sticky')
      ) {
        fixGlassBg(el);
      }
    });

    fixNestedSidebar();

    document.querySelectorAll(
      SCOPE + ' .btn--coupon, ' +
      SCOPE + ' .cart-submit-wrap .btn--checkout, ' +
      SCOPE + ' .cart-submit-wrap .s-button-primary, ' +
      SCOPE + ' .cart-submit-wrap a.btn-primary, ' +
      SCOPE + ' .cart-submit-wrap .btn.btn-primary, ' +
      SCOPE + ' .cart-submit-wrap .btn-lg.btn-primary, ' +
      SCOPE + ' .sticky .s-button-solid.s-button-primary, ' +
      SCOPE + ' .sticky a.s-button-btn.s-button-primary'
    ).forEach(applyPrimaryBtnStyle);

    document.querySelectorAll(
      SCOPE + ' .btn--wishlist, ' + SCOPE + ' .cart-item .btn--wishlist'
    ).forEach(applyWishlistBtnStyle);

    fixQuantityInput();
  }

  function scheduleReapply() {
    if (fixTimer) clearTimeout(fixTimer);
    fixTimer = setTimeout(function () {
      fixTimer = null;
      fixInline();
      setTimeout(fixQuantityInput, 80);
      setTimeout(fixQuantityInput, 200);
    }, 80);
  }

  function startQtyBurst() {
    if (qtyBurstTimer) return;
    qtyBurstCount = 0;
    qtyBurstTimer = setInterval(function () {
      if (!isCartPage()) {
        clearInterval(qtyBurstTimer);
        qtyBurstTimer = null;
        return;
      }
      fixQuantityInput();
      qtyBurstCount++;
      if (qtyBurstCount >= 24) {
        clearInterval(qtyBurstTimer);
        qtyBurstTimer = null;
      }
    }, 500);
  }

  function bindQtyResize() {
    if (qtyResizeBound) return;
    qtyResizeBound = true;
    window.addEventListener('resize', function () {
      if (!isCartPage()) return;
      setTimeout(fixQuantityInput, 50);
      setTimeout(fixQuantityInput, 200);
    });
  }

  function init() {
    if (!isCartPage()) return;
    bindQtyResize();
    inject();
    fixInline();
    startQtyBurst();
    REAPPLY_DELAYS.forEach(function (ms) {
      setTimeout(function () {
        if (!isCartPage()) return;
        inject();
        fixInline();
      }, ms);
    });
  }

  if (!isCartPage()) return;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  new MutationObserver(function () {
    if (!isCartPage()) return;
    inject();
    scheduleReapply();
  }).observe(document.body, { childList: true, subtree: true });
})();

































//صفحة الاشعارات

(function () {
  'use strict';

  var STYLE_ID = 'raqam-account-notifications-glass';
  var BODY_CLASS = 'raqam-account-notifications-glass';
  var DONE_ATTR = 'data-raqam-notifications-glass-done';

  var BG_DARK = '#050508';
  var ACCENT = '#8b51fe';
  var BRAND = '#360a61';
  var GLASS_BG = 'rgba(255, 255, 255, 0.07)';
  var GLASS_BG_HOVER = 'rgba(255, 255, 255, 0.11)';
  var GLASS_CARD = 'rgba(255, 255, 255, 0.06)';
  var GLASS_ROW = 'rgba(255, 255, 255, 0.05)';
  var BORDER_PURPLE = 'rgba(139, 81, 254, 0.35)';
  var NAV_GLASS = 'rgba(5, 5, 8, 0.55)';

  var SCOPE = 'body.' + BODY_CLASS + ' .main-container-wrapper';
  var REAPPLY_DELAYS = [0, 80, 200, 500, 1000, 2000];

  var FIX_INLINE_SEL = [
    '.nav-header.bg-gray-100',
    '.nav-header.da-bgg',
    'nav.sidebar.bg-white',
    'nav.sidebar.da-bgs',
    '.sidebar.bg-white',
    '.sidebar.da-bgs',
    '.main-content.bg-white',
    '.main-content.da-bgg',
    '.list-container.bg-white',
    '.list-container.da-bgg',
    '.s-table__tr.bg-white',
    '.s-table__tr.da-bgg'
  ].join(', ');

  var ROW_SEL = '.list-container .s-table__tr, .main-content .s-table__tr, twsaa-infinite-scroll .s-table__tr';

  var fixTimer = null;
  var observer = null;

  function isNotificationsPage() {
    var p = (location.pathname || '').toLowerCase();
    if (p.indexOf('/customer/account/notifications') !== -1) return true;

    var wrapper = document.querySelector('.main-container-wrapper');
    if (!wrapper) return false;

    var sidebar = wrapper.querySelector('nav.sidebar, .sidebar');
    if (!sidebar || !sidebar.querySelector('.s-user-menu-inline, .s-user-menu-dropdown-item')) {
      return false;
    }

    var h1 = wrapper.querySelector('.nav-header h1.da-tm, .nav-header h1');
    if (h1) {
      var title = (h1.textContent || '').replace(/\s+/g, ' ').trim();
      if (title.indexOf('الاشعارات') !== -1 || title.indexOf('الإشعارات') !== -1) return true;
    }

    return !!wrapper.querySelector(
      '.s-user-menu-dropdown-item.active a[href*="/notifications"], ' +
      'a[href*="/customer/account/notifications"].active'
    );
  }

  function shouldRun() {
    return isNotificationsPage();
  }

  function setBodyClass(on) {
    if (!document.body) return;
    if (on) {
      document.body.classList.add(BODY_CLASS);
    } else {
      document.body.classList.remove(BODY_CLASS);
    }
  }

  function inject() {
    if (!shouldRun()) return;

    var style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(style);
    }

    style.textContent = [
      '/* raqam-account-notifications-glass — صفحة الاشعارات */',

      '/* ── رأس الصفحة ── */',
      SCOPE + ' .nav-header.bg-gray-100,',
      SCOPE + ' .nav-header.da-bgg {',
      '  background: ' + NAV_GLASS + ' !important;',
      '  background-color: ' + NAV_GLASS + ' !important;',
      '  backdrop-filter: blur(18px) saturate(1.4) !important;',
      '  -webkit-backdrop-filter: blur(18px) saturate(1.4) !important;',
      '  border-bottom: 1px solid ' + BORDER_PURPLE + ' !important;',
      '  box-shadow: 0 4px 24px rgba(54, 10, 97, 0.25) !important;',
      '}',

      SCOPE + ' .nav-header h1,',
      SCOPE + ' .nav-header h1.da-tm,',
      SCOPE + ' .nav-header .da-tm {',
      '  color: #ffffff !important;',
      '  -webkit-text-fill-color: #ffffff !important;',
      '  font-weight: 700 !important;',
      '}',

      SCOPE + ' .nav-header .profile-photo,',
      SCOPE + ' .profile-photo {',
      '  border: 2px solid ' + ACCENT + ' !important;',
      '  border-radius: 50% !important;',
      '  box-shadow: 0 0 20px rgba(139, 81, 254, 0.4) !important;',
      '  object-fit: cover !important;',
      '}',

      '/* ── مسار التنقل ── */',
      SCOPE + ' .breadcrumbs,',
      SCOPE + ' .nav-breadcrumb,',
      SCOPE + ' .breadcrumbs .breadcrumb,',
      SCOPE + ' .nav-breadcrumb .breadcrumb {',
      '  background: transparent !important;',
      '}',

      SCOPE + ' .breadcrumb-item,',
      SCOPE + ' .breadcrumb-item a,',
      SCOPE + ' .breadcrumb-item .icon-home,',
      SCOPE + ' .breadcrumb-item i {',
      '  color: #ffffff !important;',
      '  -webkit-text-fill-color: #ffffff !important;',
      '  text-decoration: none !important;',
      '}',

      SCOPE + ' .breadcrumb-item a:hover {',
      '  color: #c4b5fd !important;',
      '  -webkit-text-fill-color: #c4b5fd !important;',
      '}',

      SCOPE + ' .breadcrumb-item.active {',
      '  color: ' + ACCENT + ' !important;',
      '  -webkit-text-fill-color: ' + ACCENT + ' !important;',
      '}',

      SCOPE + ' .breadcrumb-item + .breadcrumb-item::before {',
      '  color: rgba(255, 255, 255, 0.45) !important;',
      '}',

      '/* ── الشريط الجانبي ── */',
      SCOPE + ' nav.sidebar.bg-white,',
      SCOPE + ' nav.sidebar.da-bgs,',
      SCOPE + ' .sidebar.bg-white,',
      SCOPE + ' .sidebar.da-bgs {',
      '  background: ' + GLASS_BG + ' !important;',
      '  background-color: ' + GLASS_BG + ' !important;',
      '  backdrop-filter: blur(22px) saturate(1.6) brightness(1.05) !important;',
      '  -webkit-backdrop-filter: blur(22px) saturate(1.6) brightness(1.05) !important;',
      '  border: 1px solid ' + BORDER_PURPLE + ' !important;',
      '  border-radius: 16px !important;',
      '  box-shadow:',
      '    0 8px 32px rgba(54, 10, 97, 0.28),',
      '    inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;',
      '  color: #ffffff !important;',
      '}',

      SCOPE + ' nav.sidebar .s-user-menu-inline,',
      SCOPE + ' .sidebar .s-user-menu-inline {',
      '  background: transparent !important;',
      '}',

      SCOPE + ' nav.sidebar .s-user-menu-dropdown-item,',
      SCOPE + ' .sidebar .s-user-menu-dropdown-item {',
      '  margin: 2px 0 !important;',
      '  border: none !important;',
      '}',

      SCOPE + ' nav.sidebar .s-user-menu-dropdown-item a,',
      SCOPE + ' nav.sidebar .s-user-menu-dropdown-item button,',
      SCOPE + ' .sidebar .s-user-menu-dropdown-item a,',
      SCOPE + ' .sidebar .s-user-menu-dropdown-item button {',
      '  color: #ffffff !important;',
      '  -webkit-text-fill-color: #ffffff !important;',
      '  background: transparent !important;',
      '  border: none !important;',
      '  border-radius: 12px !important;',
      '  text-decoration: none !important;',
      '  transition:',
      '    background 0.25s ease,',
      '    box-shadow 0.25s ease,',
      '    color 0.25s ease !important;',
      '}',

      SCOPE + ' nav.sidebar .s-user-menu-dropdown-item-title,',
      SCOPE + ' .sidebar .s-user-menu-dropdown-item-title {',
      '  color: #ffffff !important;',
      '  -webkit-text-fill-color: #ffffff !important;',
      '}',

      SCOPE + ' nav.sidebar .s-user-menu-dropdown-item a i,',
      SCOPE + ' nav.sidebar .s-user-menu-dropdown-item a [class*="icon"],',
      SCOPE + ' .sidebar .s-user-menu-dropdown-item a i,',
      SCOPE + ' .sidebar .s-user-menu-dropdown-item a [class*="icon"] {',
      '  color: ' + ACCENT + ' !important;',
      '  -webkit-text-fill-color: ' + ACCENT + ' !important;',
      '}',

      SCOPE + ' nav.sidebar .s-user-menu-dropdown-item a:hover,',
      SCOPE + ' nav.sidebar .s-user-menu-dropdown-item a:focus,',
      SCOPE + ' nav.sidebar .s-user-menu-dropdown-item button:hover,',
      SCOPE + ' .sidebar .s-user-menu-dropdown-item a:hover,',
      SCOPE + ' .sidebar .s-user-menu-dropdown-item a:focus {',
      '  background: rgba(139, 81, 254, 0.18) !important;',
      '  box-shadow: 0 0 18px rgba(139, 81, 254, 0.22) !important;',
      '  color: #ffffff !important;',
      '}',

      SCOPE + ' nav.sidebar .s-user-menu-dropdown-item a[href*="/customer/account/notifications"],',
      SCOPE + ' nav.sidebar .s-user-menu-dropdown-item.active a,',
      SCOPE + ' .sidebar .s-user-menu-dropdown-item a[href*="/customer/account/notifications"],',
      SCOPE + ' .sidebar .s-user-menu-dropdown-item.active a {',
      '  background: rgba(139, 81, 254, 0.25) !important;',
      '  box-shadow:',
      '    0 0 22px rgba(139, 81, 254, 0.35),',
      '    inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;',
      '  color: #ffffff !important;',
      '}',

      SCOPE + ' nav.sidebar .s-user-menu-dropdown-item-logout a,',
      SCOPE + ' .sidebar .s-user-menu-dropdown-item-logout a {',
      '  color: #fecaca !important;',
      '  -webkit-text-fill-color: #fecaca !important;',
      '}',

      '/* ── المحتوى الرئيسي ── */',
      SCOPE + ' .main-content {',
      '  background: ' + GLASS_BG + ' !important;',
      '  background-color: ' + GLASS_BG + ' !important;',
      '  backdrop-filter: blur(22px) saturate(1.6) brightness(1.05) !important;',
      '  -webkit-backdrop-filter: blur(22px) saturate(1.6) brightness(1.05) !important;',
      '  border: 1px solid ' + BORDER_PURPLE + ' !important;',
      '  border-radius: 16px !important;',
      '  box-shadow:',
      '    0 8px 32px rgba(54, 10, 97, 0.28),',
      '    inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;',
      '  color: #ffffff !important;',
      '}',

      SCOPE + ' .main-content h1,',
      SCOPE + ' .main-content h2,',
      SCOPE + ' .main-content h3,',
      SCOPE + ' .main-content h4,',
      SCOPE + ' .main-content .da-tm {',
      '  color: #ffffff !important;',
      '  -webkit-text-fill-color: #ffffff !important;',
      '}',

      SCOPE + ' .main-content .text-gray-400,',
      SCOPE + ' .main-content .text-gray-500,',
      SCOPE + ' .main-content .da-ts {',
      '  color: #c4b5fd !important;',
      '  -webkit-text-fill-color: #c4b5fd !important;',
      '}',

      SCOPE + ' twsaa-infinite-scroll,',
      SCOPE + ' .list-container {',
      '  background: transparent !important;',
      '  color: #ffffff !important;',
      '}',

      SCOPE + ' .list-container .s-table__tr,',
      SCOPE + ' .main-content .s-table__tr,',
      SCOPE + ' twsaa-infinite-scroll .s-table__tr {',
      '  background: ' + GLASS_ROW + ' !important;',
      '  background-color: ' + GLASS_ROW + ' !important;',
      '  border-bottom: 1px solid rgba(139, 81, 254, 0.2) !important;',
      '  color: #ffffff !important;',
      '  transition: background 0.25s ease, box-shadow 0.25s ease !important;',
      '}',

      SCOPE + ' .list-container .s-table__tr:hover,',
      SCOPE + ' .main-content .s-table__tr:hover,',
      SCOPE + ' twsaa-infinite-scroll .s-table__tr:hover {',
      '  background: ' + GLASS_BG_HOVER + ' !important;',
      '  background-color: ' + GLASS_BG_HOVER + ' !important;',
      '  box-shadow: inset 0 0 0 1px rgba(139, 81, 254, 0.25) !important;',
      '}',

      SCOPE + ' .s-table__tr a {',
      '  color: ' + ACCENT + ' !important;',
      '  -webkit-text-fill-color: ' + ACCENT + ' !important;',
      '}',

      SCOPE + ' .s-table__tr a:hover {',
      '  color: #c4b5fd !important;',
      '}',

      SCOPE + ' .s-infinite-scroll-btn,',
      SCOPE + ' a.s-infinite-scroll-btn,',
      SCOPE + ' #load-more.s-infinite-scroll-btn {',
      '  background: linear-gradient(135deg, ' + BRAND + ' 0%, #5b1d8a 45%, #7c3aed 100%) !important;',
      '  border: none !important;',
      '  border-radius: 12px !important;',
      '  color: #ffffff !important;',
      '  box-shadow: 0 4px 18px rgba(54, 10, 97, 0.45) !important;',
      '}',

      SCOPE + ' .s-infinite-scroll-btn .s-button-text,',
      SCOPE + ' .s-infinite-scroll-btn .s-infinite-scroll-btn-text {',
      '  color: #ffffff !important;',
      '  -webkit-text-fill-color: #ffffff !important;',
      '}',

      SCOPE + ' .s-empty-state,',
      SCOPE + ' .empty-state {',
      '  color: rgba(255, 255, 255, 0.75) !important;',
      '}',

      '@media (max-width: 768px) {',
      '  ' + SCOPE + ' nav.sidebar,',
      '  ' + SCOPE + ' .sidebar {',
      '    border-radius: 14px !important;',
      '    margin-bottom: 16px !important;',
      '  }',
      '  ' + SCOPE + ' .main-content {',
      '    border-radius: 14px !important;',
      '  }',
      '  ' + SCOPE + ' .nav-header h1 {',
      '    font-size: 1.15rem !important;',
      '  }',
      '}'
    ].join('\n');
  }

  function fixNavHeader(el) {
    if (!el) return;
    el.style.setProperty('background', NAV_GLASS, 'important');
    el.style.setProperty('background-color', NAV_GLASS, 'important');
  }

  function fixGlassCard(el) {
    if (!el) return;
    el.style.setProperty('background', GLASS_CARD, 'important');
    el.style.setProperty('background-color', GLASS_CARD, 'important');
    el.style.setProperty('color', '#ffffff', 'important');
  }

  function fixSidebar(el) {
    if (!el) return;
    el.style.setProperty('background', GLASS_BG, 'important');
    el.style.setProperty('background-color', GLASS_BG, 'important');
    el.style.setProperty('backdrop-filter', 'blur(22px) saturate(1.6) brightness(1.05)', 'important');
    el.style.setProperty('-webkit-backdrop-filter', 'blur(22px) saturate(1.6) brightness(1.05)', 'important');
    el.style.setProperty('border', '1px solid ' + BORDER_PURPLE, 'important');
    el.style.setProperty('border-radius', '16px', 'important');
    el.style.setProperty('color', '#ffffff', 'important');
  }

  function fixMainContent(el) {
    if (!el) return;
    el.style.setProperty('background', GLASS_BG, 'important');
    el.style.setProperty('background-color', GLASS_BG, 'important');
    el.style.setProperty('backdrop-filter', 'blur(22px) saturate(1.6) brightness(1.05)', 'important');
    el.style.setProperty('-webkit-backdrop-filter', 'blur(22px) saturate(1.6) brightness(1.05)', 'important');
    el.style.setProperty('border', '1px solid ' + BORDER_PURPLE, 'important');
    el.style.setProperty('border-radius', '16px', 'important');
    el.style.setProperty('color', '#ffffff', 'important');
  }

  function applyRowStyle(row) {
    if (!row || row.getAttribute(DONE_ATTR) === '1') return;
    row.style.setProperty('background', GLASS_ROW, 'important');
    row.style.setProperty('background-color', GLASS_ROW, 'important');
    row.style.setProperty('color', '#ffffff', 'important');
    row.setAttribute(DONE_ATTR, '1');
  }

  function getRoot() {
    return document.querySelector('.main-container-wrapper');
  }

  function fixInline() {
    if (!shouldRun()) return;

    var root = getRoot();
    if (!root) return;

    root.querySelectorAll(FIX_INLINE_SEL).forEach(function (el) {
      if (el.closest('.nav-header')) {
        fixNavHeader(el);
        return;
      }
      if (el.matches('nav.sidebar, .sidebar')) {
        fixSidebar(el);
        return;
      }
      if (el.classList.contains('main-content')) {
        fixMainContent(el);
        return;
      }
      if (el.classList.contains('s-table__tr')) {
        applyRowStyle(el);
        return;
      }
      if (el.closest('nav.sidebar, .sidebar')) {
        fixGlassCard(el);
        return;
      }
      if (el.closest('.main-content')) {
        fixGlassCard(el);
        return;
      }
      fixGlassCard(el);
    });

    root.querySelectorAll('.nav-header.bg-gray-100, .nav-header.da-bgg').forEach(fixNavHeader);
    root.querySelectorAll('nav.sidebar.bg-white, nav.sidebar.da-bgs, .sidebar.bg-white, .sidebar.da-bgs').forEach(fixSidebar);
    root.querySelectorAll('.main-content').forEach(fixMainContent);
    root.querySelectorAll(ROW_SEL).forEach(applyRowStyle);

    root.querySelectorAll('.profile-photo').forEach(function (img) {
      img.style.setProperty('border', '2px solid ' + ACCENT, 'important');
      img.style.setProperty('border-radius', '50%', 'important');
      img.style.setProperty('box-shadow', '0 0 20px rgba(139, 81, 254, 0.4)', 'important');
    });
  }

  function scheduleReapply() {
    if (fixTimer) clearTimeout(fixTimer);
    fixTimer = setTimeout(function () {
      fixTimer = null;
      if (!shouldRun()) {
        setBodyClass(false);
        return;
      }
      setBodyClass(true);
      inject();
      fixInline();
    }, 80);
  }

  function bindObserver() {
    if (observer || !document.body) return;
    observer = new MutationObserver(function () {
      scheduleReapply();
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  function init() {
    if (!shouldRun()) return;
    setBodyClass(true);
    inject();
    fixInline();
    bindObserver();

    REAPPLY_DELAYS.forEach(function (ms) {
      setTimeout(function () {
        if (!shouldRun()) return;
        setBodyClass(true);
        inject();
        fixInline();
      }, ms);
    });

    if (window.raqamThemeReady) window.raqamThemeReady();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
































//صفحة الطلبات

(function () {
  'use strict';

  var STYLE_ID = 'raqam-account-orders-glass';
  var BODY_CLASS = 'raqam-account-orders-page';
  var DONE_ATTR = 'data-raqam-orders-glass-done';

  var BG_DARK = '#050508';
  var ACCENT = '#8b51fe';
  var BRAND = '#360a61';
  var GLASS_BG = 'rgba(255, 255, 255, 0.07)';
  var GLASS_BG_HOVER = 'rgba(255, 255, 255, 0.11)';
  var GLASS_CARD = 'rgba(255, 255, 255, 0.06)';
  var GLASS_ROW = 'rgba(255, 255, 255, 0.05)';
  var GLASS_ROW_ALT = 'rgba(255, 255, 255, 0.03)';
  var BORDER_PURPLE = 'rgba(139, 81, 254, 0.35)';
  var NAV_GLASS = 'rgba(5, 5, 8, 0.55)';
  var TABLE_HEAD_BG = 'rgba(54, 10, 97, 0.55)';

  var SCOPE = 'body.' + BODY_CLASS + ' .main-container-wrapper';
  var REAPPLY_DELAYS = [0, 80, 200, 500, 1000, 2000];

  var FIX_INLINE_SEL = [
    '.nav-header.bg-gray-100',
    '.nav-header.da-bgg',
    'nav.sidebar.bg-white',
    'nav.sidebar.da-bgs',
    '.sidebar.bg-white',
    '.sidebar.da-bgs',
    '.main-content.bg-white',
    '.main-content.da-bgg',
    '.account-items-list.bg-white',
    '.account-items-list.da-bgg',
    '.account-table-content.bg-white',
    '.account-table-content.da-bgg',
    '.list-container.bg-white',
    '.list-container.da-bgg',
    'table.s-table',
    'table.s-table.bg-white',
    'table.s-table.da-bgg',
    'tbody.list-container tr.bg-white',
    'tbody.list-container tr.da-bgg',
    '.s-table__tr.bg-white',
    '.s-table__tr.da-bgg'
  ].join(', ');

  var ROW_SEL = [
    'tbody.list-container tr',
    '.account-table-content tbody tr',
    '.list-container tr',
    '.main-content table.s-table tbody tr',
    'twsaa-infinite-scroll .s-table__tr',
    '.list-container .s-table__tr',
    '.main-content .s-table__tr'
  ].join(', ');

  var fixTimer = null;
  var observer = null;

  function isOrdersPage() {
    var p = (location.pathname || '').toLowerCase();
    if (p.indexOf('/customer/account/orders') !== -1) return true;

    var wrapper = document.querySelector('.main-container-wrapper');
    if (!wrapper) return false;

    var sidebar = wrapper.querySelector('nav.sidebar, .sidebar');
    if (!sidebar || !sidebar.querySelector('.s-user-menu-inline, .s-user-menu-dropdown-item')) {
      return false;
    }

    var h1 = wrapper.querySelector('.nav-header h1.da-tm, .nav-header h1');
    if (h1) {
      var title = (h1.textContent || '').replace(/\s+/g, ' ').trim();
      if (title.indexOf('طلبات العملاء') !== -1) return true;
    }

    var crumb = wrapper.querySelector('.breadcrumb-item.active');
    if (crumb) {
      var crumbText = (crumb.textContent || '').replace(/\s+/g, ' ').trim();
      if (crumbText.indexOf('الطلبات') !== -1) return true;
    }

    return !!wrapper.querySelector(
      '.s-user-menu-dropdown-item.active a[href*="/orders"], ' +
      'a[href*="/customer/account/orders"].active, ' +
      'a[href*="customer/account/orders"].active'
    );
  }

  function shouldRun() {
    return isOrdersPage();
  }

  function setBodyClass(on) {
    if (!document.body) return;
    if (on) {
      document.body.classList.add(BODY_CLASS);
    } else {
      document.body.classList.remove(BODY_CLASS);
    }
  }

  function inject() {
    if (!shouldRun()) return;

    var style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(style);
    }

    style.textContent = [
      '/* raqam-account-orders-glass — صفحة الطلبات */',

      '/* ── رأس الصفحة ── */',
      SCOPE + ' .nav-header.bg-gray-100,',
      SCOPE + ' .nav-header.da-bgg {',
      '  background: ' + NAV_GLASS + ' !important;',
      '  background-color: ' + NAV_GLASS + ' !important;',
      '  backdrop-filter: blur(18px) saturate(1.4) !important;',
      '  -webkit-backdrop-filter: blur(18px) saturate(1.4) !important;',
      '  border-bottom: 1px solid ' + BORDER_PURPLE + ' !important;',
      '  box-shadow: 0 4px 24px rgba(54, 10, 97, 0.25) !important;',
      '}',

      SCOPE + ' .nav-header h1,',
      SCOPE + ' .nav-header h1.da-tm,',
      SCOPE + ' .nav-header .da-tm {',
      '  color: #ffffff !important;',
      '  -webkit-text-fill-color: #ffffff !important;',
      '  font-weight: 700 !important;',
      '}',

      SCOPE + ' .nav-header .profile-photo,',
      SCOPE + ' .profile-photo {',
      '  border: 2px solid ' + ACCENT + ' !important;',
      '  border-radius: 50% !important;',
      '  box-shadow: 0 0 20px rgba(139, 81, 254, 0.4) !important;',
      '  object-fit: cover !important;',
      '}',

      '/* ── مسار التنقل ── */',
      SCOPE + ' .breadcrumbs,',
      SCOPE + ' .nav-breadcrumb,',
      SCOPE + ' .breadcrumbs .breadcrumb,',
      SCOPE + ' .nav-breadcrumb .breadcrumb {',
      '  background: transparent !important;',
      '}',

      SCOPE + ' .breadcrumb-item,',
      SCOPE + ' .breadcrumb-item a,',
      SCOPE + ' .breadcrumb-item .icon-home,',
      SCOPE + ' .breadcrumb-item i {',
      '  color: #ffffff !important;',
      '  -webkit-text-fill-color: #ffffff !important;',
      '  text-decoration: none !important;',
      '}',

      SCOPE + ' .breadcrumb-item a:hover {',
      '  color: #c4b5fd !important;',
      '  -webkit-text-fill-color: #c4b5fd !important;',
      '}',

      SCOPE + ' .breadcrumb-item.active {',
      '  color: ' + ACCENT + ' !important;',
      '  -webkit-text-fill-color: ' + ACCENT + ' !important;',
      '}',

      SCOPE + ' .breadcrumb-item + .breadcrumb-item::before {',
      '  color: rgba(255, 255, 255, 0.45) !important;',
      '}',

      '/* ── الشريط الجانبي ── */',
      SCOPE + ' nav.sidebar.bg-white,',
      SCOPE + ' nav.sidebar.da-bgs,',
      SCOPE + ' .sidebar.bg-white,',
      SCOPE + ' .sidebar.da-bgs {',
      '  background: ' + GLASS_BG + ' !important;',
      '  background-color: ' + GLASS_BG + ' !important;',
      '  backdrop-filter: blur(22px) saturate(1.6) brightness(1.05) !important;',
      '  -webkit-backdrop-filter: blur(22px) saturate(1.6) brightness(1.05) !important;',
      '  border: 1px solid ' + BORDER_PURPLE + ' !important;',
      '  border-radius: 16px !important;',
      '  box-shadow:',
      '    0 8px 32px rgba(54, 10, 97, 0.28),',
      '    inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;',
      '  color: #ffffff !important;',
      '}',

      SCOPE + ' nav.sidebar .s-user-menu-inline,',
      SCOPE + ' .sidebar .s-user-menu-inline {',
      '  background: transparent !important;',
      '}',

      SCOPE + ' nav.sidebar .s-user-menu-dropdown-item,',
      SCOPE + ' .sidebar .s-user-menu-dropdown-item {',
      '  margin: 2px 0 !important;',
      '  border: none !important;',
      '}',

      SCOPE + ' nav.sidebar .s-user-menu-dropdown-item a,',
      SCOPE + ' nav.sidebar .s-user-menu-dropdown-item button,',
      SCOPE + ' .sidebar .s-user-menu-dropdown-item a,',
      SCOPE + ' .sidebar .s-user-menu-dropdown-item button {',
      '  color: #ffffff !important;',
      '  -webkit-text-fill-color: #ffffff !important;',
      '  background: transparent !important;',
      '  border: none !important;',
      '  border-radius: 12px !important;',
      '  text-decoration: none !important;',
      '  transition:',
      '    background 0.25s ease,',
      '    box-shadow 0.25s ease,',
      '    color 0.25s ease !important;',
      '}',

      SCOPE + ' nav.sidebar .s-user-menu-dropdown-item-title,',
      SCOPE + ' .sidebar .s-user-menu-dropdown-item-title {',
      '  color: #ffffff !important;',
      '  -webkit-text-fill-color: #ffffff !important;',
      '}',

      SCOPE + ' nav.sidebar .s-user-menu-dropdown-item a i,',
      SCOPE + ' nav.sidebar .s-user-menu-dropdown-item a [class*="icon"],',
      SCOPE + ' .sidebar .s-user-menu-dropdown-item a i,',
      SCOPE + ' .sidebar .s-user-menu-dropdown-item a [class*="icon"] {',
      '  color: ' + ACCENT + ' !important;',
      '  -webkit-text-fill-color: ' + ACCENT + ' !important;',
      '}',

      SCOPE + ' nav.sidebar .s-user-menu-dropdown-item a:hover,',
      SCOPE + ' nav.sidebar .s-user-menu-dropdown-item a:focus,',
      SCOPE + ' nav.sidebar .s-user-menu-dropdown-item button:hover,',
      SCOPE + ' .sidebar .s-user-menu-dropdown-item a:hover,',
      SCOPE + ' .sidebar .s-user-menu-dropdown-item a:focus {',
      '  background: rgba(139, 81, 254, 0.18) !important;',
      '  box-shadow: 0 0 18px rgba(139, 81, 254, 0.22) !important;',
      '  color: #ffffff !important;',
      '}',

      SCOPE + ' nav.sidebar .s-user-menu-dropdown-item a[href*="customer/account/orders"],',
      SCOPE + ' nav.sidebar .s-user-menu-dropdown-item a[href*="/customer/account/orders"],',
      SCOPE + ' nav.sidebar .s-user-menu-dropdown-item.active a[href*="orders"],',
      SCOPE + ' .sidebar .s-user-menu-dropdown-item a[href*="customer/account/orders"],',
      SCOPE + ' .sidebar .s-user-menu-dropdown-item a[href*="/customer/account/orders"],',
      SCOPE + ' .sidebar .s-user-menu-dropdown-item.active a[href*="orders"] {',
      '  background: rgba(139, 81, 254, 0.25) !important;',
      '  box-shadow:',
      '    0 0 22px rgba(139, 81, 254, 0.35),',
      '    inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;',
      '  color: #ffffff !important;',
      '}',

      SCOPE + ' nav.sidebar .s-user-menu-dropdown-item-logout a,',
      SCOPE + ' .sidebar .s-user-menu-dropdown-item-logout a {',
      '  color: #fecaca !important;',
      '  -webkit-text-fill-color: #fecaca !important;',
      '}',

      '/* ── المحتوى الرئيسي ── */',
      SCOPE + ' .main-content {',
      '  background: ' + GLASS_BG + ' !important;',
      '  background-color: ' + GLASS_BG + ' !important;',
      '  backdrop-filter: blur(22px) saturate(1.6) brightness(1.05) !important;',
      '  -webkit-backdrop-filter: blur(22px) saturate(1.6) brightness(1.05) !important;',
      '  border: 1px solid ' + BORDER_PURPLE + ' !important;',
      '  border-radius: 16px !important;',
      '  box-shadow:',
      '    0 8px 32px rgba(54, 10, 97, 0.28),',
      '    inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;',
      '  color: #ffffff !important;',
      '}',

      SCOPE + ' .main-content h1,',
      SCOPE + ' .main-content h2,',
      SCOPE + ' .main-content h3,',
      SCOPE + ' .main-content h4,',
      SCOPE + ' .main-content .da-tm {',
      '  color: #ffffff !important;',
      '  -webkit-text-fill-color: #ffffff !important;',
      '}',

      SCOPE + ' .main-content .text-gray-400,',
      SCOPE + ' .main-content .text-gray-500,',
      SCOPE + ' .main-content .da-ts {',
      '  color: #c4b5fd !important;',
      '  -webkit-text-fill-color: #c4b5fd !important;',
      '}',

      '/* ── قائمة الطلبات والجدول ── */',
      SCOPE + ' .account-items-list,',
      SCOPE + ' .account-table-content {',
      '  background: ' + GLASS_CARD + ' !important;',
      '  background-color: ' + GLASS_CARD + ' !important;',
      '  backdrop-filter: blur(16px) saturate(1.4) !important;',
      '  -webkit-backdrop-filter: blur(16px) saturate(1.4) !important;',
      '  border: 1px solid ' + BORDER_PURPLE + ' !important;',
      '  border-radius: 14px !important;',
      '  color: #ffffff !important;',
      '  overflow: hidden !important;',
      '}',

      SCOPE + ' table.s-table {',
      '  background: transparent !important;',
      '  border-collapse: separate !important;',
      '  border-spacing: 0 !important;',
      '  width: 100% !important;',
      '  color: #ffffff !important;',
      '}',

      SCOPE + ' table.s-table thead tr {',
      '  background: ' + TABLE_HEAD_BG + ' !important;',
      '  background-color: ' + TABLE_HEAD_BG + ' !important;',
      '}',

      SCOPE + ' table.s-table thead th,',
      SCOPE + ' table.s-table th {',
      '  color: #ffffff !important;',
      '  -webkit-text-fill-color: #ffffff !important;',
      '  background: transparent !important;',
      '  border-bottom: 2px solid ' + ACCENT + ' !important;',
      '  font-weight: 600 !important;',
      '  padding: 14px 16px !important;',
      '}',

      SCOPE + ' table.s-table tbody.list-container,',
      SCOPE + ' twsaa-infinite-scroll,',
      SCOPE + ' .list-container {',
      '  background: transparent !important;',
      '  color: #ffffff !important;',
      '}',

      SCOPE + ' table.s-table tbody.list-container tr,',
      SCOPE + ' .account-table-content tbody tr,',
      SCOPE + ' .list-container tr,',
      SCOPE + ' .main-content table.s-table tbody tr,',
      SCOPE + ' twsaa-infinite-scroll .s-table__tr,',
      SCOPE + ' .list-container .s-table__tr,',
      SCOPE + ' .main-content .s-table__tr {',
      '  background: ' + GLASS_ROW + ' !important;',
      '  background-color: ' + GLASS_ROW + ' !important;',
      '  border-bottom: 1px solid rgba(139, 81, 254, 0.2) !important;',
      '  color: #ffffff !important;',
      '  transition: background 0.25s ease, box-shadow 0.25s ease !important;',
      '}',

      SCOPE + ' table.s-table tbody.list-container tr:nth-child(even),',
      SCOPE + ' .account-table-content tbody tr:nth-child(even),',
      SCOPE + ' .list-container tr:nth-child(even),',
      SCOPE + ' twsaa-infinite-scroll .s-table__tr:nth-child(even) {',
      '  background: ' + GLASS_ROW_ALT + ' !important;',
      '  background-color: ' + GLASS_ROW_ALT + ' !important;',
      '}',

      SCOPE + ' table.s-table tbody.list-container tr:hover,',
      SCOPE + ' .account-table-content tbody tr:hover,',
      SCOPE + ' .list-container tr:hover,',
      SCOPE + ' .main-content table.s-table tbody tr:hover,',
      SCOPE + ' twsaa-infinite-scroll .s-table__tr:hover,',
      SCOPE + ' .list-container .s-table__tr:hover,',
      SCOPE + ' .main-content .s-table__tr:hover {',
      '  background: rgba(139, 81, 254, 0.14) !important;',
      '  background-color: rgba(139, 81, 254, 0.14) !important;',
      '  box-shadow: inset 0 0 0 1px rgba(139, 81, 254, 0.3) !important;',
      '}',

      SCOPE + ' table.s-table td,',
      SCOPE + ' table.s-table tbody td {',
      '  color: #ffffff !important;',
      '  -webkit-text-fill-color: #ffffff !important;',
      '  background: transparent !important;',
      '  border-color: rgba(139, 81, 254, 0.15) !important;',
      '  padding: 12px 16px !important;',
      '  vertical-align: middle !important;',
      '}',

      SCOPE + ' table.s-table td a,',
      SCOPE + ' .s-table__tr a {',
      '  color: ' + ACCENT + ' !important;',
      '  -webkit-text-fill-color: ' + ACCENT + ' !important;',
      '  text-decoration: none !important;',
      '}',

      SCOPE + ' table.s-table td a:hover,',
      SCOPE + ' .s-table__tr a:hover {',
      '  color: #c4b5fd !important;',
      '  -webkit-text-fill-color: #c4b5fd !important;',
      '}',

      '/* ── شارات الحالة ── */',
      SCOPE + ' .s-badge,',
      SCOPE + ' .badge,',
      SCOPE + ' .status-badge,',
      SCOPE + ' [class*="order-status"],',
      SCOPE + ' [class*="status-badge"],',
      SCOPE + ' table.s-table td .badge,',
      SCOPE + ' table.s-table td .s-badge {',
      '  display: inline-flex !important;',
      '  align-items: center !important;',
      '  padding: 4px 12px !important;',
      '  border-radius: 20px !important;',
      '  font-size: 0.8rem !important;',
      '  font-weight: 600 !important;',
      '  border: 1px solid rgba(139, 81, 254, 0.4) !important;',
      '  background: rgba(139, 81, 254, 0.18) !important;',
      '  color: #e9d5ff !important;',
      '  -webkit-text-fill-color: #e9d5ff !important;',
      '}',

      SCOPE + ' .badge-success,',
      SCOPE + ' .s-badge-success,',
      SCOPE + ' [class*="status-completed"],',
      SCOPE + ' [class*="status-delivered"],',
      SCOPE + ' [class*="status-done"],',
      SCOPE + ' .text-green-600,',
      SCOPE + ' .text-success {',
      '  background: rgba(34, 197, 94, 0.18) !important;',
      '  border-color: rgba(34, 197, 94, 0.45) !important;',
      '  color: #86efac !important;',
      '  -webkit-text-fill-color: #86efac !important;',
      '}',

      SCOPE + ' .badge-warning,',
      SCOPE + ' .s-badge-warning,',
      SCOPE + ' [class*="status-pending"],',
      SCOPE + ' [class*="status-processing"],',
      SCOPE + ' [class*="status-waiting"],',
      SCOPE + ' .text-yellow-600,',
      SCOPE + ' .text-warning {',
      '  background: rgba(234, 179, 8, 0.18) !important;',
      '  border-color: rgba(234, 179, 8, 0.45) !important;',
      '  color: #fde68a !important;',
      '  -webkit-text-fill-color: #fde68a !important;',
      '}',

      SCOPE + ' .badge-danger,',
      SCOPE + ' .s-badge-danger,',
      SCOPE + ' [class*="status-cancelled"],',
      SCOPE + ' [class*="status-canceled"],',
      SCOPE + ' [class*="status-failed"],',
      SCOPE + ' [class*="status-rejected"],',
      SCOPE + ' .text-red-600,',
      SCOPE + ' .text-danger {',
      '  background: rgba(239, 68, 68, 0.18) !important;',
      '  border-color: rgba(239, 68, 68, 0.45) !important;',
      '  color: #fca5a5 !important;',
      '  -webkit-text-fill-color: #fca5a5 !important;',
      '}',

      SCOPE + ' .badge-info,',
      SCOPE + ' .s-badge-info,',
      SCOPE + ' [class*="status-shipped"],',
      SCOPE + ' [class*="status-shipping"],',
      SCOPE + ' .text-blue-600,',
      SCOPE + ' .text-info {',
      '  background: rgba(59, 130, 246, 0.18) !important;',
      '  border-color: rgba(59, 130, 246, 0.45) !important;',
      '  color: #93c5fd !important;',
      '  -webkit-text-fill-color: #93c5fd !important;',
      '}',

      '/* ── أزرار الإجراءات ── */',
      SCOPE + ' table.s-table .btn,',
      SCOPE + ' table.s-table a.btn,',
      SCOPE + ' table.s-table button.btn,',
      SCOPE + ' .s-table__tr .btn,',
      SCOPE + ' .s-table__tr a.btn,',
      SCOPE + ' .s-table__tr button.btn,',
      SCOPE + ' .main-content .btn-outline,',
      SCOPE + ' .main-content a.btn-outline {',
      '  background: transparent !important;',
      '  border: 1px solid ' + ACCENT + ' !important;',
      '  border-radius: 10px !important;',
      '  color: ' + ACCENT + ' !important;',
      '  -webkit-text-fill-color: ' + ACCENT + ' !important;',
      '  padding: 6px 14px !important;',
      '  font-weight: 600 !important;',
      '  transition: background 0.25s ease, box-shadow 0.25s ease, color 0.25s ease !important;',
      '}',

      SCOPE + ' table.s-table .btn:hover,',
      SCOPE + ' table.s-table a.btn:hover,',
      SCOPE + ' table.s-table button.btn:hover,',
      SCOPE + ' .s-table__tr .btn:hover,',
      SCOPE + ' .main-content .btn-primary,',
      SCOPE + ' .main-content a.btn-primary,',
      SCOPE + ' .main-content button.btn-primary {',
      '  background: linear-gradient(135deg, ' + BRAND + ' 0%, #5b1d8a 45%, #7c3aed 100%) !important;',
      '  border: none !important;',
      '  color: #ffffff !important;',
      '  -webkit-text-fill-color: #ffffff !important;',
      '  box-shadow: 0 4px 14px rgba(54, 10, 97, 0.4) !important;',
      '}',

      SCOPE + ' .s-infinite-scroll-btn,',
      SCOPE + ' a.s-infinite-scroll-btn,',
      SCOPE + ' #load-more.s-infinite-scroll-btn {',
      '  background: linear-gradient(135deg, ' + BRAND + ' 0%, #5b1d8a 45%, #7c3aed 100%) !important;',
      '  border: none !important;',
      '  border-radius: 12px !important;',
      '  color: #ffffff !important;',
      '  box-shadow: 0 4px 18px rgba(54, 10, 97, 0.45) !important;',
      '}',

      SCOPE + ' .s-infinite-scroll-btn .s-button-text,',
      SCOPE + ' .s-infinite-scroll-btn .s-infinite-scroll-btn-text {',
      '  color: #ffffff !important;',
      '  -webkit-text-fill-color: #ffffff !important;',
      '}',

      '/* ── حالة فارغة ── */',
      SCOPE + ' .s-empty-state,',
      SCOPE + ' .empty-state,',
      SCOPE + ' .account-items-list:empty,',
      SCOPE + ' .main-content .text-center {',
      '  color: rgba(255, 255, 255, 0.75) !important;',
      '  -webkit-text-fill-color: rgba(255, 255, 255, 0.75) !important;',
      '}',

      SCOPE + ' .account-table-content tbody:empty::after,',
      SCOPE + ' table.s-table tbody.list-container:empty::after {',
      '  content: "" !important;',
      '  display: block !important;',
      '}',

      SCOPE + ' .main-content td[colspan],',
      SCOPE + ' table.s-table tbody tr:only-child td {',
      '  text-align: center !important;',
      '  color: rgba(255, 255, 255, 0.7) !important;',
      '  -webkit-text-fill-color: rgba(255, 255, 255, 0.7) !important;',
      '  padding: 40px 20px !important;',
      '}',

      '/* ── الترقيم ── */',
      SCOPE + ' .pagination {',
      '  background: transparent !important;',
      '  border: none !important;',
      '  margin-top: 20px !important;',
      '  display: flex !important;',
      '  justify-content: center !important;',
      '  gap: 6px !important;',
      '  flex-wrap: wrap !important;',
      '}',

      SCOPE + ' .pagination a,',
      SCOPE + ' .pagination .page-link,',
      SCOPE + ' .pagination .page-item a,',
      SCOPE + ' .pagination li a {',
      '  color: ' + ACCENT + ' !important;',
      '  -webkit-text-fill-color: ' + ACCENT + ' !important;',
      '  background: rgba(139, 81, 254, 0.12) !important;',
      '  border: 1px solid rgba(139, 81, 254, 0.35) !important;',
      '  border-radius: 10px !important;',
      '  padding: 8px 14px !important;',
      '  text-decoration: none !important;',
      '  transition: background 0.2s ease, box-shadow 0.2s ease !important;',
      '}',

      SCOPE + ' .pagination a:hover,',
      SCOPE + ' .pagination .page-link:hover,',
      SCOPE + ' .pagination .page-item a:hover {',
      '  background: rgba(139, 81, 254, 0.28) !important;',
      '  box-shadow: 0 0 14px rgba(139, 81, 254, 0.3) !important;',
      '  color: #ffffff !important;',
      '  -webkit-text-fill-color: #ffffff !important;',
      '}',

      SCOPE + ' .pagination .active a,',
      SCOPE + ' .pagination .page-item.active .page-link,',
      SCOPE + ' .pagination .page-item.active a {',
      '  background: linear-gradient(135deg, ' + BRAND + ' 0%, #7c3aed 100%) !important;',
      '  border-color: ' + ACCENT + ' !important;',
      '  color: #ffffff !important;',
      '  -webkit-text-fill-color: #ffffff !important;',
      '  box-shadow: 0 4px 14px rgba(54, 10, 97, 0.4) !important;',
      '}',

      SCOPE + ' .pagination .disabled a,',
      SCOPE + ' .pagination .page-item.disabled .page-link {',
      '  color: rgba(255, 255, 255, 0.35) !important;',
      '  -webkit-text-fill-color: rgba(255, 255, 255, 0.35) !important;',
      '  background: rgba(255, 255, 255, 0.04) !important;',
      '  border-color: rgba(255, 255, 255, 0.1) !important;',
      '  pointer-events: none !important;',
      '}',

      '@media (max-width: 768px) {',
      '  ' + SCOPE + ' nav.sidebar,',
      '  ' + SCOPE + ' .sidebar {',
      '    border-radius: 14px !important;',
      '    margin-bottom: 16px !important;',
      '  }',
      '  ' + SCOPE + ' .main-content {',
      '    border-radius: 14px !important;',
      '  }',
      '  ' + SCOPE + ' .nav-header h1 {',
      '    font-size: 1.15rem !important;',
      '  }',
      '  ' + SCOPE + ' table.s-table thead th,',
      '  ' + SCOPE + ' table.s-table td {',
      '    padding: 10px 12px !important;',
      '    font-size: 0.85rem !important;',
      '  }',
      '  ' + SCOPE + ' .account-items-list,',
      '  ' + SCOPE + ' .account-table-content {',
      '    border-radius: 12px !important;',
      '    overflow-x: auto !important;',
      '  }',
      '}'
    ].join('\n');
  }

  function fixNavHeader(el) {
    if (!el) return;
    el.style.setProperty('background', NAV_GLASS, 'important');
    el.style.setProperty('background-color', NAV_GLASS, 'important');
  }

  function fixGlassCard(el) {
    if (!el) return;
    el.style.setProperty('background', GLASS_CARD, 'important');
    el.style.setProperty('background-color', GLASS_CARD, 'important');
    el.style.setProperty('color', '#ffffff', 'important');
  }

  function fixSidebar(el) {
    if (!el) return;
    el.style.setProperty('background', GLASS_BG, 'important');
    el.style.setProperty('background-color', GLASS_BG, 'important');
    el.style.setProperty('backdrop-filter', 'blur(22px) saturate(1.6) brightness(1.05)', 'important');
    el.style.setProperty('-webkit-backdrop-filter', 'blur(22px) saturate(1.6) brightness(1.05)', 'important');
    el.style.setProperty('border', '1px solid ' + BORDER_PURPLE, 'important');
    el.style.setProperty('border-radius', '16px', 'important');
    el.style.setProperty('color', '#ffffff', 'important');
  }

  function fixMainContent(el) {
    if (!el) return;
    el.style.setProperty('background', GLASS_BG, 'important');
    el.style.setProperty('background-color', GLASS_BG, 'important');
    el.style.setProperty('backdrop-filter', 'blur(22px) saturate(1.6) brightness(1.05)', 'important');
    el.style.setProperty('-webkit-backdrop-filter', 'blur(22px) saturate(1.6) brightness(1.05)', 'important');
    el.style.setProperty('border', '1px solid ' + BORDER_PURPLE, 'important');
    el.style.setProperty('border-radius', '16px', 'important');
    el.style.setProperty('color', '#ffffff', 'important');
  }

  function fixTableContainer(el) {
    if (!el) return;
    el.style.setProperty('background', GLASS_CARD, 'important');
    el.style.setProperty('background-color', GLASS_CARD, 'important');
    el.style.setProperty('color', '#ffffff', 'important');
  }

  function applyRowStyle(row, index) {
    if (!row || row.getAttribute(DONE_ATTR) === '1') return;
    var bg = (index % 2 === 1) ? GLASS_ROW_ALT : GLASS_ROW;
    row.style.setProperty('background', bg, 'important');
    row.style.setProperty('background-color', bg, 'important');
    row.style.setProperty('color', '#ffffff', 'important');
    row.setAttribute(DONE_ATTR, '1');
  }

  function getRoot() {
    return document.querySelector('.main-container-wrapper');
  }

  function fixInline() {
    if (!shouldRun()) return;

    var root = getRoot();
    if (!root) return;

    root.querySelectorAll(FIX_INLINE_SEL).forEach(function (el) {
      if (el.closest('.nav-header')) {
        fixNavHeader(el);
        return;
      }
      if (el.matches('nav.sidebar, .sidebar')) {
        fixSidebar(el);
        return;
      }
      if (el.classList.contains('main-content')) {
        fixMainContent(el);
        return;
      }
      if (el.matches('.account-items-list, .account-table-content')) {
        fixTableContainer(el);
        return;
      }
      if (el.matches('table.s-table')) {
        el.style.setProperty('background', 'transparent', 'important');
        el.style.setProperty('color', '#ffffff', 'important');
        return;
      }
      if (el.matches('tbody.list-container tr, .s-table__tr')) {
        return;
      }
      if (el.closest('nav.sidebar, .sidebar')) {
        fixGlassCard(el);
        return;
      }
      if (el.closest('.main-content')) {
        fixGlassCard(el);
        return;
      }
      fixGlassCard(el);
    });

    root.querySelectorAll('.nav-header.bg-gray-100, .nav-header.da-bgg').forEach(fixNavHeader);
    root.querySelectorAll('nav.sidebar.bg-white, nav.sidebar.da-bgs, .sidebar.bg-white, .sidebar.da-bgs').forEach(fixSidebar);
    root.querySelectorAll('.main-content').forEach(fixMainContent);
    root.querySelectorAll('.account-items-list, .account-table-content').forEach(fixTableContainer);

    root.querySelectorAll('table.s-table thead tr').forEach(function (tr) {
      tr.style.setProperty('background', TABLE_HEAD_BG, 'important');
      tr.style.setProperty('background-color', TABLE_HEAD_BG, 'important');
    });

    root.querySelectorAll('table.s-table thead th, table.s-table th').forEach(function (th) {
      th.style.setProperty('color', '#ffffff', 'important');
      th.style.setProperty('border-bottom', '2px solid ' + ACCENT, 'important');
      th.style.setProperty('background', 'transparent', 'important');
    });

    root.querySelectorAll(ROW_SEL).forEach(function (row, index) {
      applyRowStyle(row, index);
    });

    root.querySelectorAll('table.s-table td, table.s-table tbody td').forEach(function (td) {
      td.style.setProperty('color', '#ffffff', 'important');
      td.style.setProperty('background', 'transparent', 'important');
    });

    root.querySelectorAll('.profile-photo').forEach(function (img) {
      img.style.setProperty('border', '2px solid ' + ACCENT, 'important');
      img.style.setProperty('border-radius', '50%', 'important');
      img.style.setProperty('box-shadow', '0 0 20px rgba(139, 81, 254, 0.4)', 'important');
    });
  }

  function scheduleReapply() {
    if (fixTimer) clearTimeout(fixTimer);
    fixTimer = setTimeout(function () {
      fixTimer = null;
      if (!shouldRun()) {
        setBodyClass(false);
        return;
      }
      setBodyClass(true);
      inject();
      fixInline();
    }, 80);
  }

  function bindObserver() {
    if (observer || !document.body) return;
    observer = new MutationObserver(function () {
      scheduleReapply();
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  function init() {
    if (!shouldRun()) return;
    setBodyClass(true);
    inject();
    fixInline();
    bindObserver();

    REAPPLY_DELAYS.forEach(function (ms) {
      setTimeout(function () {
        if (!shouldRun()) return;
        setBodyClass(true);
        inject();
        fixInline();
      }, ms);
    });

    if (window.raqamThemeReady) window.raqamThemeReady();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();























//صفحات حساب العميل - موحّد
//صفحات حساب العميل - موحّد
//
// يغطي جميع مسارات /customer/account/* :
//   notifications, orders, profile, addresses, reviews, wishlist, downloadable-products, wallet
//
// ── ترحيل ──
// يمكنك استخدام هذا الملف الواحد بدلاً من:
//   raqam-account-notifications-glass.js
//   raqam-account-orders-glass.js
//   + 6 ملفات منفصلة للصفحات الأخرى
// احذف الملفات القديمة من تجميع TWSAA JS بعد التأكد من عمل الصفحات.

(function () {
  'use strict';

  var STYLE_ID = 'raqam-account-pages-glass';
  var BODY_CLASS = 'raqam-account-page';
  var DONE_ATTR = 'data-raqam-account-glass-done';

  var ACCENT = '#8b51fe';
  var BRAND = '#360a61';
  var GLASS_BG = 'rgba(255, 255, 255, 0.07)';
  var GLASS_BG_HOVER = 'rgba(255, 255, 255, 0.11)';
  var GLASS_CARD = 'rgba(255, 255, 255, 0.06)';
  var GLASS_ROW = 'rgba(255, 255, 255, 0.05)';
  var GLASS_ROW_ALT = 'rgba(255, 255, 255, 0.03)';
  var BORDER_PURPLE = 'rgba(139, 81, 254, 0.35)';
  var NAV_GLASS = 'rgba(5, 5, 8, 0.55)';
  var TABLE_HEAD_BG = 'rgba(54, 10, 97, 0.55)';
  var INPUT_BG = 'rgba(26, 16, 37, 0.65)';
  var PROFILE_DATE_CAL_SVG = 'url("data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>'
  ) + '")';
  var BTN_GRAD = 'linear-gradient(135deg, #360a61 0%, #5b1d8a 45%, #7c3aed 100%)';
  var SCOPE = 'body.' + BODY_CLASS + ' .main-container-wrapper';
  var REAPPLY_DELAYS = [0, 80, 200, 500, 1000, 2000];

  function pageScope(pageClass) {
    return 'body.' + BODY_CLASS + '.' + pageClass + ' .main-container-wrapper';
  }

  var PAGES = {
    notifications: {
      path: '/customer/account/notifications',
      class: 'raqam-ac-notifications',
      titles: ['الاشعارات', 'الإشعارات']
    },
    orders: {
      path: '/customer/account/orders',
      class: 'raqam-ac-orders',
      titles: ['طلبات العملاء', 'الطلبات']
    },
    profile: {
      path: '/customer/account/profile',
      class: 'raqam-ac-profile',
      titles: ['الملف الشخصي', 'حسابي']
    },
    addresses: {
      path: '/customer/account/addresses',
      class: 'raqam-ac-addresses',
      titles: ['العنوان', 'العناوين']
    },
    reviews: {
      path: '/customer/account/reviews',
      class: 'raqam-ac-reviews',
      titles: ['التقييمات', 'مراجعاتي']
    },
    wishlist: {
      path: '/customer/account/wishlist',
      class: 'raqam-ac-wishlist',
      titles: ['قائمة الامنيات', 'قائمة الأمنيات', 'المفضلة']
    },
    downloadable: {
      path: '/customer/account/downloadable-products',
      class: 'raqam-ac-downloadable',
      titles: ['المنتجات القابلة للتحميل', 'التحميلات']
    },
    wallet: {
      path: '/customer/account/wallet',
      class: 'raqam-ac-wallet',
      titles: ['المحفظة', 'رصيد المحفظة']
    }
  };

  var PAGE_CLASS_LIST = Object.keys(PAGES).map(function (k) {
    return PAGES[k].class;
  });

  var FIX_INLINE_SEL = [
    '.nav-header.bg-gray-100',
    '.nav-header.da-bgg',
    'nav.sidebar.bg-white',
    'nav.sidebar.da-bgs',
    '.sidebar.bg-white',
    '.sidebar.da-bgs',
    '.main-content.bg-white',
    '.main-content.da-bgg',
    '.account-items-list.bg-white',
    '.account-items-list.da-bgg',
    '.account-table-content.bg-white',
    '.account-table-content.da-bgg',
    '.list-container.bg-white',
    '.list-container.da-bgg',
    'table.s-table',
    'table.s-table.bg-white',
    'table.s-table.da-bgg',
    'tbody.list-container tr.bg-white',
    'tbody.list-container tr.da-bgg',
    '.s-table__tr.bg-white',
    '.s-table__tr.da-bgg',
    '.address-card.bg-white',
    '.address-card.da-bgg',
    '.product-entry--wishlist.bg-white',
    '.product-entry--wishlist.da-bgg'
  ].join(', ');

  var ROW_SEL = [
    'tbody.list-container tr',
    '.account-table-content tbody tr',
    '.list-container tr',
    '.main-content table.s-table tbody tr',
    'twsaa-infinite-scroll .s-table__tr',
    '.list-container .s-table__tr',
    '.main-content .s-table__tr'
  ].join(', ');

  var currentPage = null;
  var fixTimer = null;
  var observer = null;

  function titleMatches(title, list) {
    if (!title || !list) return false;
    for (var i = 0; i < list.length; i++) {
      if (title.indexOf(list[i]) !== -1) return true;
    }
    return false;
  }

  function detectPageFromPath() {
    var p = (location.pathname || '').toLowerCase();
    var keys = Object.keys(PAGES);
    for (var i = 0; i < keys.length; i++) {
      if (p.indexOf(PAGES[keys[i]].path) !== -1) return PAGES[keys[i]];
    }
    return null;
  }

  function detectPageFromDom() {
    var wrapper = document.querySelector('.main-container-wrapper');
    if (!wrapper) return null;

    var sidebar = wrapper.querySelector('nav.sidebar, .sidebar');
    if (!sidebar || !sidebar.querySelector('.s-user-menu-inline, .s-user-menu-dropdown-item')) {
      return null;
    }

    var activeLink = wrapper.querySelector(
      '.s-user-menu-dropdown-item.active a[href*="/customer/account/"]'
    );
    if (activeLink) {
      var href = (activeLink.getAttribute('href') || '').toLowerCase();
      var keys = Object.keys(PAGES);
      for (var i = 0; i < keys.length; i++) {
        if (href.indexOf(PAGES[keys[i]].path) !== -1) return PAGES[keys[i]];
      }
    }

    var h1 = wrapper.querySelector('.nav-header h1.da-tm, .nav-header h1');
    if (h1) {
      var h1Text = (h1.textContent || '').replace(/\s+/g, ' ').trim();
      var keys2 = Object.keys(PAGES);
      for (var j = 0; j < keys2.length; j++) {
        if (titleMatches(h1Text, PAGES[keys2[j]].titles)) return PAGES[keys2[j]];
      }
    }

    var crumb = wrapper.querySelector('.breadcrumb-item.active');
    if (crumb) {
      var crumbText = (crumb.textContent || '').replace(/\s+/g, ' ').trim();
      var keys3 = Object.keys(PAGES);
      for (var k = 0; k < keys3.length; k++) {
        if (titleMatches(crumbText, PAGES[keys3[k]].titles)) return PAGES[keys3[k]];
      }
    }

    if ((location.pathname || '').toLowerCase().indexOf('/customer/account') !== -1) {
      return PAGES.profile;
    }

    return null;
  }

  function resolvePage() {
    return detectPageFromPath() || detectPageFromDom();
  }

  function shouldRun() {
    return !!resolvePage();
  }

  function setBodyClass(on, page) {
    if (!document.body) return;
    PAGE_CLASS_LIST.forEach(function (c) {
      document.body.classList.remove(c);
    });
    if (on && page) {
      document.body.classList.add(BODY_CLASS);
      document.body.classList.add(page.class);
    } else {
      document.body.classList.remove(BODY_CLASS);
    }
  }

  function sidebarActiveRule(activePath) {
    var path = activePath || '';
    return [
      SCOPE + ' nav.sidebar .s-user-menu-dropdown-item.active a,',
      SCOPE + ' .sidebar .s-user-menu-dropdown-item.active a,',
      SCOPE + ' nav.sidebar .s-user-menu-dropdown-item a[href*="' + path + '"],',
      SCOPE + ' .sidebar .s-user-menu-dropdown-item a[href*="' + path + '"] {',
      '  background: rgba(139, 81, 254, 0.25) !important;',
      '  box-shadow:',
      '    0 0 22px rgba(139, 81, 254, 0.35),',
      '    inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;',
      '  color: #ffffff !important;',
      '}'
    ].join('\n');
  }

  function buildSharedCss(activePath) {
    return [
      '/* raqam-account-pages-glass — تخطيط مشترك */',

      '/* ── رأس الصفحة ── */',
      SCOPE + ' .nav-header.bg-gray-100,',
      SCOPE + ' .nav-header.da-bgg {',
      '  background: ' + NAV_GLASS + ' !important;',
      '  background-color: ' + NAV_GLASS + ' !important;',
      '  backdrop-filter: blur(18px) saturate(1.4) !important;',
      '  -webkit-backdrop-filter: blur(18px) saturate(1.4) !important;',
      '  border-bottom: 1px solid ' + BORDER_PURPLE + ' !important;',
      '  box-shadow: 0 4px 24px rgba(54, 10, 97, 0.25) !important;',
      '}',

      SCOPE + ' .nav-header h1,',
      SCOPE + ' .nav-header h1.da-tm,',
      SCOPE + ' .nav-header .da-tm {',
      '  color: #ffffff !important;',
      '  -webkit-text-fill-color: #ffffff !important;',
      '  font-weight: 700 !important;',
      '}',

      SCOPE + ' .nav-header .profile-photo,',
      SCOPE + ' .profile-photo {',
      '  border: 2px solid ' + ACCENT + ' !important;',
      '  border-radius: 50% !important;',
      '  box-shadow: 0 0 20px rgba(139, 81, 254, 0.4) !important;',
      '  object-fit: cover !important;',
      '}',

      '/* ── مسار التنقل ── */',
      SCOPE + ' .breadcrumbs,',
      SCOPE + ' .nav-breadcrumb,',
      SCOPE + ' .breadcrumbs .breadcrumb,',
      SCOPE + ' .nav-breadcrumb .breadcrumb {',
      '  background: transparent !important;',
      '}',

      SCOPE + ' .breadcrumb-item,',
      SCOPE + ' .breadcrumb-item a,',
      SCOPE + ' .breadcrumb-item .icon-home,',
      SCOPE + ' .breadcrumb-item i {',
      '  color: #ffffff !important;',
      '  -webkit-text-fill-color: #ffffff !important;',
      '  text-decoration: none !important;',
      '}',

      SCOPE + ' .breadcrumb-item a:hover {',
      '  color: #c4b5fd !important;',
      '  -webkit-text-fill-color: #c4b5fd !important;',
      '}',

      SCOPE + ' .breadcrumb-item.active {',
      '  color: ' + ACCENT + ' !important;',
      '  -webkit-text-fill-color: ' + ACCENT + ' !important;',
      '}',

      SCOPE + ' .breadcrumb-item + .breadcrumb-item::before {',
      '  color: rgba(255, 255, 255, 0.45) !important;',
      '}',

      '/* ── الشريط الجانبي ── */',
      SCOPE + ' nav.sidebar.bg-white,',
      SCOPE + ' nav.sidebar.da-bgs,',
      SCOPE + ' .sidebar.bg-white,',
      SCOPE + ' .sidebar.da-bgs {',
      '  background: ' + GLASS_BG + ' !important;',
      '  background-color: ' + GLASS_BG + ' !important;',
      '  backdrop-filter: blur(22px) saturate(1.6) brightness(1.05) !important;',
      '  -webkit-backdrop-filter: blur(22px) saturate(1.6) brightness(1.05) !important;',
      '  border: 1px solid ' + BORDER_PURPLE + ' !important;',
      '  border-radius: 16px !important;',
      '  box-shadow:',
      '    0 8px 32px rgba(54, 10, 97, 0.28),',
      '    inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;',
      '  color: #ffffff !important;',
      '}',

      SCOPE + ' nav.sidebar .s-user-menu-inline,',
      SCOPE + ' .sidebar .s-user-menu-inline {',
      '  background: transparent !important;',
      '}',

      SCOPE + ' nav.sidebar .s-user-menu-dropdown-item,',
      SCOPE + ' .sidebar .s-user-menu-dropdown-item {',
      '  margin: 2px 0 !important;',
      '  border: none !important;',
      '}',

      SCOPE + ' nav.sidebar .s-user-menu-dropdown-item a,',
      SCOPE + ' nav.sidebar .s-user-menu-dropdown-item button,',
      SCOPE + ' .sidebar .s-user-menu-dropdown-item a,',
      SCOPE + ' .sidebar .s-user-menu-dropdown-item button {',
      '  color: #ffffff !important;',
      '  -webkit-text-fill-color: #ffffff !important;',
      '  background: transparent !important;',
      '  border: none !important;',
      '  border-radius: 12px !important;',
      '  text-decoration: none !important;',
      '  transition:',
      '    background 0.25s ease,',
      '    box-shadow 0.25s ease,',
      '    color 0.25s ease !important;',
      '}',

      SCOPE + ' nav.sidebar .s-user-menu-dropdown-item-title,',
      SCOPE + ' .sidebar .s-user-menu-dropdown-item-title {',
      '  color: #ffffff !important;',
      '  -webkit-text-fill-color: #ffffff !important;',
      '}',

      SCOPE + ' nav.sidebar .s-user-menu-dropdown-item a i,',
      SCOPE + ' nav.sidebar .s-user-menu-dropdown-item a [class*="icon"],',
      SCOPE + ' .sidebar .s-user-menu-dropdown-item a i,',
      SCOPE + ' .sidebar .s-user-menu-dropdown-item a [class*="icon"] {',
      '  color: ' + ACCENT + ' !important;',
      '  -webkit-text-fill-color: ' + ACCENT + ' !important;',
      '}',

      SCOPE + ' nav.sidebar .s-user-menu-dropdown-item a:hover,',
      SCOPE + ' nav.sidebar .s-user-menu-dropdown-item a:focus,',
      SCOPE + ' nav.sidebar .s-user-menu-dropdown-item button:hover,',
      SCOPE + ' .sidebar .s-user-menu-dropdown-item a:hover,',
      SCOPE + ' .sidebar .s-user-menu-dropdown-item a:focus {',
      '  background: rgba(139, 81, 254, 0.18) !important;',
      '  box-shadow: 0 0 18px rgba(139, 81, 254, 0.22) !important;',
      '  color: #ffffff !important;',
      '}',

      sidebarActiveRule(activePath),

      SCOPE + ' nav.sidebar .s-user-menu-dropdown-item-logout a,',
      SCOPE + ' .sidebar .s-user-menu-dropdown-item-logout a {',
      '  color: #fecaca !important;',
      '  -webkit-text-fill-color: #fecaca !important;',
      '}',

      '/* ── المحتوى الرئيسي ── */',
      SCOPE + ' .main-content {',
      '  background: ' + GLASS_BG + ' !important;',
      '  background-color: ' + GLASS_BG + ' !important;',
      '  backdrop-filter: blur(22px) saturate(1.6) brightness(1.05) !important;',
      '  -webkit-backdrop-filter: blur(22px) saturate(1.6) brightness(1.05) !important;',
      '  border: 1px solid ' + BORDER_PURPLE + ' !important;',
      '  border-radius: 16px !important;',
      '  box-shadow:',
      '    0 8px 32px rgba(54, 10, 97, 0.28),',
      '    inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;',
      '  color: #ffffff !important;',
      '}',

      SCOPE + ' .main-content h1,',
      SCOPE + ' .main-content h2,',
      SCOPE + ' .main-content h3,',
      SCOPE + ' .main-content h4,',
      SCOPE + ' .main-content .da-tm {',
      '  color: #ffffff !important;',
      '  -webkit-text-fill-color: #ffffff !important;',
      '}',

      SCOPE + ' .main-content .text-gray-400,',
      SCOPE + ' .main-content .text-gray-500,',
      SCOPE + ' .main-content .da-ts {',
      '  color: #c4b5fd !important;',
      '  -webkit-text-fill-color: #c4b5fd !important;',
      '}',

      SCOPE + ' .s-infinite-scroll-btn,',
      SCOPE + ' a.s-infinite-scroll-btn,',
      SCOPE + ' #load-more.s-infinite-scroll-btn {',
      '  background: ' + BTN_GRAD + ' !important;',
      '  border: none !important;',
      '  border-radius: 12px !important;',
      '  color: #ffffff !important;',
      '  box-shadow: 0 4px 18px rgba(54, 10, 97, 0.45) !important;',
      '}',

      SCOPE + ' .s-infinite-scroll-btn .s-button-text,',
      SCOPE + ' .s-infinite-scroll-btn .s-infinite-scroll-btn-text {',
      '  color: #ffffff !important;',
      '  -webkit-text-fill-color: #ffffff !important;',
      '}',

      '@media (max-width: 768px) {',
      '  ' + SCOPE + ' nav.sidebar,',
      '  ' + SCOPE + ' .sidebar {',
      '    border-radius: 14px !important;',
      '    margin-bottom: 16px !important;',
      '  }',
      '  ' + SCOPE + ' .main-content {',
      '    border-radius: 14px !important;',
      '  }',
      '  ' + SCOPE + ' .nav-header h1 {',
      '    font-size: 1.15rem !important;',
      '  }',
      '}'
    ].join('\n');
  }

  function buildListRowCss() {
    return [
      '/* ── صفوف القائمة (إشعارات) ── */',
      SCOPE + ' twsaa-infinite-scroll,',
      SCOPE + ' .list-container {',
      '  background: transparent !important;',
      '  color: #ffffff !important;',
      '}',

      SCOPE + ' .list-container .s-table__tr,',
      SCOPE + ' .main-content .s-table__tr,',
      SCOPE + ' twsaa-infinite-scroll .s-table__tr {',
      '  background: ' + GLASS_ROW + ' !important;',
      '  background-color: ' + GLASS_ROW + ' !important;',
      '  border-bottom: 1px solid rgba(139, 81, 254, 0.2) !important;',
      '  color: #ffffff !important;',
      '  transition: background 0.25s ease, box-shadow 0.25s ease !important;',
      '}',

      SCOPE + ' .list-container .s-table__tr:hover,',
      SCOPE + ' .main-content .s-table__tr:hover,',
      SCOPE + ' twsaa-infinite-scroll .s-table__tr:hover {',
      '  background: ' + GLASS_BG_HOVER + ' !important;',
      '  background-color: ' + GLASS_BG_HOVER + ' !important;',
      '  box-shadow: inset 0 0 0 1px rgba(139, 81, 254, 0.25) !important;',
      '}',

      SCOPE + ' .s-table__tr a {',
      '  color: ' + ACCENT + ' !important;',
      '  -webkit-text-fill-color: ' + ACCENT + ' !important;',
      '}',

      SCOPE + ' .s-table__tr a:hover {',
      '  color: #c4b5fd !important;',
      '}',

      SCOPE + ' .s-empty-state,',
      SCOPE + ' .empty-state {',
      '  color: rgba(255, 255, 255, 0.75) !important;',
      '}'
    ].join('\n');
  }

  function buildTableCss() {
    return [
      '/* ── جداول الحساب (طلبات / تحميل / محفظة) ── */',
      SCOPE + ' .account-items-list,',
      SCOPE + ' .account-table-content {',
      '  background: ' + GLASS_CARD + ' !important;',
      '  background-color: ' + GLASS_CARD + ' !important;',
      '  backdrop-filter: blur(16px) saturate(1.4) !important;',
      '  -webkit-backdrop-filter: blur(16px) saturate(1.4) !important;',
      '  border: 1px solid ' + BORDER_PURPLE + ' !important;',
      '  border-radius: 14px !important;',
      '  color: #ffffff !important;',
      '  overflow: hidden !important;',
      '}',

      SCOPE + ' table.s-table {',
      '  background: transparent !important;',
      '  border-collapse: separate !important;',
      '  border-spacing: 0 !important;',
      '  width: 100% !important;',
      '  color: #ffffff !important;',
      '}',

      SCOPE + ' table.s-table thead tr {',
      '  background: ' + TABLE_HEAD_BG + ' !important;',
      '  background-color: ' + TABLE_HEAD_BG + ' !important;',
      '}',

      SCOPE + ' table.s-table thead th,',
      SCOPE + ' table.s-table th {',
      '  color: #ffffff !important;',
      '  -webkit-text-fill-color: #ffffff !important;',
      '  background: transparent !important;',
      '  border-bottom: 2px solid ' + ACCENT + ' !important;',
      '  font-weight: 600 !important;',
      '  padding: 14px 16px !important;',
      '}',

      SCOPE + ' table.s-table tbody.list-container,',
      SCOPE + ' twsaa-infinite-scroll,',
      SCOPE + ' .list-container {',
      '  background: transparent !important;',
      '  color: #ffffff !important;',
      '}',

      SCOPE + ' table.s-table tbody.list-container tr,',
      SCOPE + ' .account-table-content tbody tr,',
      SCOPE + ' .list-container tr,',
      SCOPE + ' .main-content table.s-table tbody tr,',
      SCOPE + ' twsaa-infinite-scroll .s-table__tr,',
      SCOPE + ' .list-container .s-table__tr,',
      SCOPE + ' .main-content .s-table__tr {',
      '  background: ' + GLASS_ROW + ' !important;',
      '  background-color: ' + GLASS_ROW + ' !important;',
      '  border-bottom: 1px solid rgba(139, 81, 254, 0.2) !important;',
      '  color: #ffffff !important;',
      '  transition: background 0.25s ease, box-shadow 0.25s ease !important;',
      '}',

      SCOPE + ' table.s-table tbody.list-container tr:nth-child(even),',
      SCOPE + ' .account-table-content tbody tr:nth-child(even),',
      SCOPE + ' .list-container tr:nth-child(even),',
      SCOPE + ' twsaa-infinite-scroll .s-table__tr:nth-child(even) {',
      '  background: ' + GLASS_ROW_ALT + ' !important;',
      '  background-color: ' + GLASS_ROW_ALT + ' !important;',
      '}',

      SCOPE + ' table.s-table tbody.list-container tr:hover,',
      SCOPE + ' .account-table-content tbody tr:hover,',
      SCOPE + ' .list-container tr:hover,',
      SCOPE + ' .main-content table.s-table tbody tr:hover,',
      SCOPE + ' twsaa-infinite-scroll .s-table__tr:hover,',
      SCOPE + ' .list-container .s-table__tr:hover,',
      SCOPE + ' .main-content .s-table__tr:hover {',
      '  background: rgba(139, 81, 254, 0.14) !important;',
      '  background-color: rgba(139, 81, 254, 0.14) !important;',
      '  box-shadow: inset 0 0 0 1px rgba(139, 81, 254, 0.3) !important;',
      '}',

      SCOPE + ' table.s-table td,',
      SCOPE + ' table.s-table tbody td {',
      '  color: #ffffff !important;',
      '  -webkit-text-fill-color: #ffffff !important;',
      '  background: transparent !important;',
      '  border-color: rgba(139, 81, 254, 0.15) !important;',
      '  padding: 12px 16px !important;',
      '  vertical-align: middle !important;',
      '}',

      SCOPE + ' table.s-table td a,',
      SCOPE + ' .s-table__tr a {',
      '  color: ' + ACCENT + ' !important;',
      '  -webkit-text-fill-color: ' + ACCENT + ' !important;',
      '  text-decoration: none !important;',
      '}',

      SCOPE + ' table.s-table td a:hover,',
      SCOPE + ' .s-table__tr a:hover {',
      '  color: #c4b5fd !important;',
      '  -webkit-text-fill-color: #c4b5fd !important;',
      '}',

      SCOPE + ' .s-badge,',
      SCOPE + ' .badge,',
      SCOPE + ' .status-badge,',
      SCOPE + ' [class*="order-status"],',
      SCOPE + ' [class*="status-badge"],',
      SCOPE + ' table.s-table td .badge,',
      SCOPE + ' table.s-table td .s-badge {',
      '  display: inline-flex !important;',
      '  align-items: center !important;',
      '  padding: 4px 12px !important;',
      '  border-radius: 20px !important;',
      '  font-size: 0.8rem !important;',
      '  font-weight: 600 !important;',
      '  border: 1px solid rgba(139, 81, 254, 0.4) !important;',
      '  background: rgba(139, 81, 254, 0.18) !important;',
      '  color: #e9d5ff !important;',
      '  -webkit-text-fill-color: #e9d5ff !important;',
      '}',

      SCOPE + ' .badge-success,',
      SCOPE + ' .s-badge-success,',
      SCOPE + ' [class*="status-completed"],',
      SCOPE + ' [class*="status-delivered"],',
      SCOPE + ' [class*="status-done"],',
      SCOPE + ' .text-green-600,',
      SCOPE + ' .text-success {',
      '  background: rgba(34, 197, 94, 0.18) !important;',
      '  border-color: rgba(34, 197, 94, 0.45) !important;',
      '  color: #86efac !important;',
      '  -webkit-text-fill-color: #86efac !important;',
      '}',

      SCOPE + ' .badge-warning,',
      SCOPE + ' .s-badge-warning,',
      SCOPE + ' [class*="status-pending"],',
      SCOPE + ' [class*="status-processing"],',
      SCOPE + ' [class*="status-waiting"],',
      SCOPE + ' .text-yellow-600,',
      SCOPE + ' .text-warning {',
      '  background: rgba(234, 179, 8, 0.18) !important;',
      '  border-color: rgba(234, 179, 8, 0.45) !important;',
      '  color: #fde68a !important;',
      '  -webkit-text-fill-color: #fde68a !important;',
      '}',

      SCOPE + ' .badge-danger,',
      SCOPE + ' .s-badge-danger,',
      SCOPE + ' [class*="status-cancelled"],',
      SCOPE + ' [class*="status-canceled"],',
      SCOPE + ' [class*="status-failed"],',
      SCOPE + ' [class*="status-rejected"],',
      SCOPE + ' .text-red-600,',
      SCOPE + ' .text-danger {',
      '  background: rgba(239, 68, 68, 0.18) !important;',
      '  border-color: rgba(239, 68, 68, 0.45) !important;',
      '  color: #fca5a5 !important;',
      '  -webkit-text-fill-color: #fca5a5 !important;',
      '}',

      SCOPE + ' .badge-info,',
      SCOPE + ' .s-badge-info,',
      SCOPE + ' [class*="status-shipped"],',
      SCOPE + ' [class*="status-shipping"],',
      SCOPE + ' .text-blue-600,',
      SCOPE + ' .text-info {',
      '  background: rgba(59, 130, 246, 0.18) !important;',
      '  border-color: rgba(59, 130, 246, 0.45) !important;',
      '  color: #93c5fd !important;',
      '  -webkit-text-fill-color: #93c5fd !important;',
      '}',

      SCOPE + ' table.s-table .btn,',
      SCOPE + ' table.s-table a.btn,',
      SCOPE + ' table.s-table button.btn,',
      SCOPE + ' .s-table__tr .btn,',
      SCOPE + ' .main-content .btn-outline,',
      SCOPE + ' .main-content a.btn-outline {',
      '  background: transparent !important;',
      '  border: 1px solid ' + ACCENT + ' !important;',
      '  border-radius: 10px !important;',
      '  color: ' + ACCENT + ' !important;',
      '  -webkit-text-fill-color: ' + ACCENT + ' !important;',
      '  padding: 6px 14px !important;',
      '  font-weight: 600 !important;',
      '  transition: background 0.25s ease, box-shadow 0.25s ease, color 0.25s ease !important;',
      '}',

      SCOPE + ' table.s-table .btn:hover,',
      SCOPE + ' .main-content .btn-primary,',
      SCOPE + ' .main-content a.btn-primary,',
      SCOPE + ' .main-content button.btn-primary {',
      '  background: ' + BTN_GRAD + ' !important;',
      '  border: none !important;',
      '  color: #ffffff !important;',
      '  -webkit-text-fill-color: #ffffff !important;',
      '  box-shadow: 0 4px 14px rgba(54, 10, 97, 0.4) !important;',
      '}',

      SCOPE + ' .s-empty-state,',
      SCOPE + ' .empty-state,',
      SCOPE + ' .main-content .text-center {',
      '  color: rgba(255, 255, 255, 0.75) !important;',
      '  -webkit-text-fill-color: rgba(255, 255, 255, 0.75) !important;',
      '}',

      SCOPE + ' .main-content td[colspan],',
      SCOPE + ' table.s-table tbody tr:only-child td {',
      '  text-align: center !important;',
      '  color: rgba(255, 255, 255, 0.7) !important;',
      '  -webkit-text-fill-color: rgba(255, 255, 255, 0.7) !important;',
      '  padding: 40px 20px !important;',
      '}',

      SCOPE + ' .pagination {',
      '  background: transparent !important;',
      '  border: none !important;',
      '  margin-top: 20px !important;',
      '  display: flex !important;',
      '  justify-content: center !important;',
      '  gap: 6px !important;',
      '  flex-wrap: wrap !important;',
      '}',

      SCOPE + ' .pagination a,',
      SCOPE + ' .pagination .page-link,',
      SCOPE + ' .pagination .page-item a {',
      '  color: ' + ACCENT + ' !important;',
      '  -webkit-text-fill-color: ' + ACCENT + ' !important;',
      '  background: rgba(139, 81, 254, 0.12) !important;',
      '  border: 1px solid rgba(139, 81, 254, 0.35) !important;',
      '  border-radius: 10px !important;',
      '  padding: 8px 14px !important;',
      '  text-decoration: none !important;',
      '}',

      SCOPE + ' .pagination a:hover {',
      '  background: rgba(139, 81, 254, 0.28) !important;',
      '  color: #ffffff !important;',
      '}',

      SCOPE + ' .pagination .active a,',
      SCOPE + ' .pagination .page-item.active .page-link,',
      SCOPE + ' .pagination .page-item.active a {',
      '  background: linear-gradient(135deg, ' + BRAND + ' 0%, #7c3aed 100%) !important;',
      '  border-color: ' + ACCENT + ' !important;',
      '  color: #ffffff !important;',
      '}',

      SCOPE + ' .pagination .disabled a,',
      SCOPE + ' .pagination .page-item.disabled .page-link {',
      '  color: rgba(255, 255, 255, 0.35) !important;',
      '  background: rgba(255, 255, 255, 0.04) !important;',
      '  pointer-events: none !important;',
      '}',

      '@media (max-width: 768px) {',
      '  ' + SCOPE + ' table.s-table thead th,',
      '  ' + SCOPE + ' table.s-table td {',
      '    padding: 10px 12px !important;',
      '    font-size: 0.85rem !important;',
      '  }',
      '  ' + SCOPE + ' .account-items-list,',
      '  ' + SCOPE + ' .account-table-content {',
      '    border-radius: 12px !important;',
      '    overflow-x: auto !important;',
      '  }',
      '}'
    ].join('\n');
  }

  function buildProfileCss() {
    var PS = pageScope('raqam-ac-profile');
    return [
      '/* ── صفحة الملف الشخصي ── */',
      SCOPE + ' .form--user-profile {',
      '  background: transparent !important;',
      '  color: #ffffff !important;',
      '}',

      SCOPE + ' .form--user-profile .profile-field-item,',
      SCOPE + ' .form--user-profile .form-group {',
      '  margin-bottom: 18px !important;',
      '}',

      SCOPE + ' .form--user-profile .grid,',
      SCOPE + ' .form--user-profile form > .grid {',
      '  display: grid !important;',
      '  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;',
      '  gap: 16px 20px !important;',
      '}',

      SCOPE + ' .form--user-profile label,',
      SCOPE + ' .form--user-profile .form-label,',
      SCOPE + ' .profile-field-item label {',
      '  color: #ffffff !important;',
      '  -webkit-text-fill-color: #ffffff !important;',
      '  font-weight: 600 !important;',
      '  margin-bottom: 8px !important;',
      '  display: block !important;',
      '}',

      SCOPE + ' .form--user-profile .form-input,',
      SCOPE + ' .form--user-profile input.form-input,',
      SCOPE + ' .form--user-profile input.control,',
      SCOPE + ' .form--user-profile select.form-input,',
      SCOPE + ' .form--user-profile textarea.form-input,',
      SCOPE + ' .profile-field-item .form-input,',
      SCOPE + ' .profile-field-item input,',
      SCOPE + ' .profile-field-item select,',
      SCOPE + ' .profile-field-item textarea {',
      '  background: ' + INPUT_BG + ' !important;',
      '  background-color: ' + INPUT_BG + ' !important;',
      '  color: #ffffff !important;',
      '  -webkit-text-fill-color: #ffffff !important;',
      '  border: 1px solid ' + BORDER_PURPLE + ' !important;',
      '  border-radius: 12px !important;',
      '  padding: 12px 16px !important;',
      '  width: 100% !important;',
      '  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.2) !important;',
      '  transition: border-color 0.2s ease, box-shadow 0.2s ease !important;',
      '}',

      SCOPE + ' .form--user-profile .form-input::placeholder,',
      SCOPE + ' .profile-field-item input::placeholder {',
      '  color: rgba(255, 255, 255, 0.45) !important;',
      '}',

      SCOPE + ' .form--user-profile .form-input:focus,',
      SCOPE + ' .profile-field-item input:focus,',
      SCOPE + ' .profile-field-item select:focus,',
      SCOPE + ' .profile-field-item textarea:focus {',
      '  outline: none !important;',
      '  border-color: ' + ACCENT + ' !important;',
      '  box-shadow:',
      '    0 0 0 3px rgba(139, 81, 254, 0.25),',
      '    inset 0 1px 2px rgba(0, 0, 0, 0.2) !important;',
      '}',

      PS + ' #datepicker[type="date"],',
      PS + ' input[name="date_of_birth"][type="date"] {',
      '  position: relative !important;',
      '  -webkit-appearance: none !important;',
      '  appearance: none !important;',
      '  color-scheme: dark !important;',
      '  background-color: ' + INPUT_BG + ' !important;',
      '  background-image: ' + PROFILE_DATE_CAL_SVG + ' !important;',
      '  background-repeat: no-repeat !important;',
      '  background-position: left 12px center !important;',
      '  background-size: 22px 22px !important;',
      '  padding-left: 40px !important;',
      '}',

      PS + ' #datepicker[type="date"]::-webkit-calendar-picker-indicator,',
      PS + ' input[name="date_of_birth"][type="date"]::-webkit-calendar-picker-indicator {',
      '  opacity: 0 !important;',
      '  position: absolute !important;',
      '  left: 12px !important;',
      '  width: 22px !important;',
      '  height: 22px !important;',
      '  cursor: pointer !important;',
      '}',

      PS + ' .profile-field-item:has(#datepicker) img,',
      PS + ' .profile-field-item:has([name="date_of_birth"]) img,',
      PS + ' #datepicker + img,',
      PS + ' #datepicker ~ img,',
      PS + ' input[name="date_of_birth"] + img,',
      PS + ' input[name="date_of_birth"] ~ img,',
      PS + ' .ui-datepicker-trigger,',
      PS + ' .profile-field-item:has(#datepicker) .ui-datepicker-trigger,',
      PS + ' .profile-field-item:has(#datepicker) [class*="calendar"] img,',
      PS + ' .profile-field-item:has(#datepicker) i,',
      PS + ' .profile-field-item:has(#datepicker) [class*="icon-calendar"],',
      PS + ' .profile-field-item:has(#datepicker) [class*="calendar"]:not(img),',
      PS + ' #datepicker + button,',
      PS + ' #datepicker ~ button,',
      PS + ' #datepicker + .input-group-addon,',
      PS + ' #datepicker ~ .input-group-addon,',
      PS + ' #datepicker + .input-group-append,',
      PS + ' #datepicker ~ .input-group-append,',
      PS + ' #datepicker + .input-group-prepend,',
      PS + ' #datepicker ~ .input-group-prepend,',
      PS + ' #datepicker + .add-on,',
      PS + ' #datepicker ~ .add-on,',
      PS + ' input[name="date_of_birth"] + button,',
      PS + ' input[name="date_of_birth"] ~ button {',
      '  display: none !important;',
      '}',

      SCOPE + ' .form--user-profile s-button-primary,',
      SCOPE + ' .form--user-profile .s-button-primary,',
      SCOPE + ' .form--user-profile button.s-button-primary,',
      SCOPE + ' .form--user-profile [type="submit"] {',
      '  background: ' + BTN_GRAD + ' !important;',
      '  border: none !important;',
      '  border-radius: 12px !important;',
      '  color: #ffffff !important;',
      '  -webkit-text-fill-color: #ffffff !important;',
      '  padding: 12px 28px !important;',
      '  font-weight: 700 !important;',
      '  box-shadow: 0 4px 18px rgba(54, 10, 97, 0.45) !important;',
      '  cursor: pointer !important;',
      '  margin-top: 8px !important;',
      '}',

      SCOPE + ' .form--user-profile .s-button-text {',
      '  color: #ffffff !important;',
      '  -webkit-text-fill-color: #ffffff !important;',
      '}',

      '@media (max-width: 768px) {',
      '  ' + SCOPE + ' .form--user-profile .grid,',
      '  ' + SCOPE + ' .form--user-profile form > .grid {',
      '    grid-template-columns: 1fr !important;',
      '  }',
      '}'
    ].join('\n');
  }

  function buildAddressesCss() {
    return [
      '/* ── صفحة العناوين ── */',
      SCOPE + ' .address-card {',
      '  background: ' + GLASS_CARD + ' !important;',
      '  background-color: ' + GLASS_CARD + ' !important;',
      '  backdrop-filter: blur(16px) saturate(1.4) !important;',
      '  -webkit-backdrop-filter: blur(16px) saturate(1.4) !important;',
      '  border: 1px solid ' + BORDER_PURPLE + ' !important;',
      '  border-radius: 14px !important;',
      '  color: #ffffff !important;',
      '  padding: 20px !important;',
      '  transition: background 0.25s ease, box-shadow 0.25s ease !important;',
      '}',

      SCOPE + ' .address-card:hover {',
      '  background: ' + GLASS_BG_HOVER + ' !important;',
      '  box-shadow: 0 4px 20px rgba(139, 81, 254, 0.2) !important;',
      '}',

      SCOPE + ' .address-card h3,',
      SCOPE + ' .address-card h4,',
      SCOPE + ' .address-card .address-title {',
      '  color: #ffffff !important;',
      '  -webkit-text-fill-color: #ffffff !important;',
      '}',

      SCOPE + ' .address-card p,',
      SCOPE + ' .address-card span,',
      SCOPE + ' .address-card .text-gray-500 {',
      '  color: #c4b5fd !important;',
      '  -webkit-text-fill-color: #c4b5fd !important;',
      '}',

      SCOPE + ' .main-content .grid.gap-3 {',
      '  gap: 16px !important;',
      '}',

      SCOPE + ' .main-content .grid.gap-3:empty,',
      SCOPE + ' .main-content .grid.gap-3 .empty {',
      '  display: flex !important;',
      '  align-items: center !important;',
      '  justify-content: center !important;',
      '  min-height: 120px !important;',
      '  color: rgba(255, 255, 255, 0.65) !important;',
      '  -webkit-text-fill-color: rgba(255, 255, 255, 0.65) !important;',
      '  text-align: center !important;',
      '}',

      SCOPE + ' .main-content .btn-primary,',
      SCOPE + ' .main-content a.btn-primary,',
      SCOPE + ' .main-content s-button-primary,',
      SCOPE + ' .main-content .s-button-primary {',
      '  background: ' + BTN_GRAD + ' !important;',
      '  border: none !important;',
      '  border-radius: 12px !important;',
      '  color: #ffffff !important;',
      '  box-shadow: 0 4px 14px rgba(54, 10, 97, 0.4) !important;',
      '}'
    ].join('\n');
  }

  function buildEmptyStateCss() {
    return [
      '/* ── حالة فارغة (تقييمات / أمنيات) ── */',
      SCOPE + ' .main-content .empty,',
      SCOPE + ' .main-content .s-empty-state {',
      '  display: flex !important;',
      '  flex-direction: column !important;',
      '  align-items: center !important;',
      '  justify-content: center !important;',
      '  text-align: center !important;',
      '  min-height: 180px !important;',
      '  padding: 40px 24px !important;',
      '  color: rgba(255, 255, 255, 0.65) !important;',
      '  -webkit-text-fill-color: rgba(255, 255, 255, 0.65) !important;',
      '  background: ' + GLASS_CARD + ' !important;',
      '  border: 1px dashed rgba(139, 81, 254, 0.3) !important;',
      '  border-radius: 14px !important;',
      '}',

      SCOPE + ' .main-content .empty p,',
      SCOPE + ' .main-content .empty span,',
      SCOPE + ' .main-content .empty h3 {',
      '  color: rgba(255, 255, 255, 0.7) !important;',
      '  -webkit-text-fill-color: rgba(255, 255, 255, 0.7) !important;',
      '}',

      SCOPE + ' .main-content .grid {',
      '  gap: 16px !important;',
      '}'
    ].join('\n');
  }

  function buildWishlistCss() {
    return [
      buildEmptyStateCss(),

      '/* ── صفحة قائمة الأمنيات ── */',
      pageScope('raqam-ac-wishlist') + ' .product-entry--wishlist {',
      '  background: ' + GLASS_CARD + ' !important;',
      '  background-color: ' + GLASS_CARD + ' !important;',
      '  backdrop-filter: blur(16px) saturate(1.4) !important;',
      '  -webkit-backdrop-filter: blur(16px) saturate(1.4) !important;',
      '  border: 1px solid ' + BORDER_PURPLE + ' !important;',
      '  border-radius: 14px !important;',
      '  color: #ffffff !important;',
      '  overflow: hidden !important;',
      '  transition: background 0.25s ease, box-shadow 0.25s ease !important;',
      '}',

      pageScope('raqam-ac-wishlist') + ' .product-entry--wishlist:hover {',
      '  background: ' + GLASS_BG_HOVER + ' !important;',
      '  box-shadow: 0 6px 24px rgba(139, 81, 254, 0.22) !important;',
      '}',

      pageScope('raqam-ac-wishlist') + ' .product-entry--wishlist a {',
      '  color: #ffffff !important;',
      '  text-decoration: none !important;',
      '}',

      pageScope('raqam-ac-wishlist') + ' .product-entry--wishlist .product-title,',
      pageScope('raqam-ac-wishlist') + ' .product-entry--wishlist h3 {',
      '  color: #ffffff !important;',
      '}',

      pageScope('raqam-ac-wishlist') + ' .product-entry--wishlist .product-price,',
      pageScope('raqam-ac-wishlist') + ' .product-entry--wishlist .price {',
      '  color: ' + ACCENT + ' !important;',
      '  font-weight: 700 !important;',
      '}'
    ].join('\n');
  }

  function buildWalletCss() {
    return [
      buildTableCss(),

      '/* ── صفحة المحفظة ── */',
      pageScope('raqam-ac-wallet') + ' .address-card,',
      pageScope('raqam-ac-wallet') + ' .product-entry--wishlist {',
      '  background: linear-gradient(135deg, rgba(54, 10, 97, 0.55) 0%, rgba(139, 81, 254, 0.22) 100%) !important;',
      '  backdrop-filter: blur(18px) saturate(1.5) !important;',
      '  -webkit-backdrop-filter: blur(18px) saturate(1.5) !important;',
      '  border: 1px solid ' + BORDER_PURPLE + ' !important;',
      '  border-radius: 16px !important;',
      '  color: #ffffff !important;',
      '  padding: 24px !important;',
      '  margin-bottom: 20px !important;',
      '  box-shadow: 0 8px 28px rgba(54, 10, 97, 0.35) !important;',
      '}',

      pageScope('raqam-ac-wallet') + ' .icon-bag-dollar,',
      pageScope('raqam-ac-wallet') + ' [class*="icon-bag-dollar"],',
      pageScope('raqam-ac-wallet') + ' .product-entry--wishlist i {',
      '  color: ' + ACCENT + ' !important;',
      '  font-size: 2rem !important;',
      '}',

      pageScope('raqam-ac-wallet') + ' .product-entry--wishlist .price,',
      pageScope('raqam-ac-wallet') + ' .product-entry--wishlist h2,',
      pageScope('raqam-ac-wallet') + ' .product-entry--wishlist h3 {',
      '  color: #ffffff !important;',
      '  font-weight: 700 !important;',
      '}',

      pageScope('raqam-ac-wallet') + ' .address-card p,',
      pageScope('raqam-ac-wallet') + ' .address-card span {',
      '  color: #c4b5fd !important;',
      '}'
    ].join('\n');
  }

  function buildPageCss(page) {
    if (!page) return '';
    if (page === PAGES.notifications) return buildListRowCss();
    if (page === PAGES.orders) return buildTableCss();
    if (page === PAGES.profile) return buildProfileCss();
    if (page === PAGES.addresses) return buildAddressesCss();
    if (page === PAGES.reviews) return buildEmptyStateCss();
    if (page === PAGES.wishlist) return buildWishlistCss();
    if (page === PAGES.downloadable) return buildTableCss();
    if (page === PAGES.wallet) return buildWalletCss();
    return '';
  }

  function inject() {
    currentPage = resolvePage();
    if (!currentPage) return;

    var style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(style);
    }

    style.textContent = [
      buildSharedCss(currentPage.path),
      buildPageCss(currentPage)
    ].join('\n\n');
  }

  function fixNavHeader(el) {
    if (!el) return;
    el.style.setProperty('background', NAV_GLASS, 'important');
    el.style.setProperty('background-color', NAV_GLASS, 'important');
  }

  function fixGlassCard(el) {
    if (!el) return;
    el.style.setProperty('background', GLASS_CARD, 'important');
    el.style.setProperty('background-color', GLASS_CARD, 'important');
    el.style.setProperty('color', '#ffffff', 'important');
  }

  function fixSidebar(el) {
    if (!el) return;
    el.style.setProperty('background', GLASS_BG, 'important');
    el.style.setProperty('background-color', GLASS_BG, 'important');
    el.style.setProperty('backdrop-filter', 'blur(22px) saturate(1.6) brightness(1.05)', 'important');
    el.style.setProperty('-webkit-backdrop-filter', 'blur(22px) saturate(1.6) brightness(1.05)', 'important');
    el.style.setProperty('border', '1px solid ' + BORDER_PURPLE, 'important');
    el.style.setProperty('border-radius', '16px', 'important');
    el.style.setProperty('color', '#ffffff', 'important');
  }

  function fixMainContent(el) {
    if (!el) return;
    el.style.setProperty('background', GLASS_BG, 'important');
    el.style.setProperty('background-color', GLASS_BG, 'important');
    el.style.setProperty('backdrop-filter', 'blur(22px) saturate(1.6) brightness(1.05)', 'important');
    el.style.setProperty('-webkit-backdrop-filter', 'blur(22px) saturate(1.6) brightness(1.05)', 'important');
    el.style.setProperty('border', '1px solid ' + BORDER_PURPLE, 'important');
    el.style.setProperty('border-radius', '16px', 'important');
    el.style.setProperty('color', '#ffffff', 'important');
  }

  function fixTableContainer(el) {
    if (!el) return;
    el.style.setProperty('background', GLASS_CARD, 'important');
    el.style.setProperty('background-color', GLASS_CARD, 'important');
    el.style.setProperty('color', '#ffffff', 'important');
  }

  function styleProfileDateIconEl(el) {
    if (!el || el.nodeType !== 1) return;
    el.style.setProperty('display', 'none', 'important');
  }

  function applyProfileDateInputStyle(dateInput) {
    if (!dateInput) return;
    dateInput.style.setProperty('position', 'relative', 'important');
    dateInput.style.setProperty('-webkit-appearance', 'none', 'important');
    dateInput.style.setProperty('appearance', 'none', 'important');
    dateInput.style.setProperty('color-scheme', 'dark', 'important');
    dateInput.style.setProperty('background-color', INPUT_BG, 'important');
    dateInput.style.setProperty('background-image', PROFILE_DATE_CAL_SVG, 'important');
    dateInput.style.setProperty('background-repeat', 'no-repeat', 'important');
    dateInput.style.setProperty('background-position', 'left 12px center', 'important');
    dateInput.style.setProperty('background-size', '22px 22px', 'important');
    dateInput.style.setProperty('padding-left', '40px', 'important');
  }

  function fixProfileDateIcons(root) {
    if (!currentPage || currentPage !== PAGES.profile) return;
    var dateInput = root.querySelector('#datepicker, input[name="date_of_birth"]');
    if (!dateInput) return;

    applyProfileDateInputStyle(dateInput);

    var field = dateInput.closest('.profile-field-item') || dateInput.parentElement;
    if (!field) return;

    field.querySelectorAll(
      'img, i, [class*="calendar"], .ui-datepicker-trigger, .input-group-addon, .add-on, .input-group-append, .input-group-prepend, button'
    ).forEach(function (el) {
      if (el === dateInput || dateInput.contains(el)) return;
      styleProfileDateIconEl(el);
    });

    var sibling = dateInput.nextElementSibling;
    while (sibling) {
      styleProfileDateIconEl(sibling);
      sibling = sibling.nextElementSibling;
    }
  }

  function fixProfileInputs(root) {
    if (!currentPage || currentPage !== PAGES.profile) return;
    root.querySelectorAll(
      '.form--user-profile .form-input, .form--user-profile input[type="date"], .form--user-profile #datepicker, .profile-field-item input, .profile-field-item select, .profile-field-item textarea'
    ).forEach(function (el) {
      var isProfileDate = el.type === 'date' &&
        (el.id === 'datepicker' || el.name === 'date_of_birth');
      if (!isProfileDate) {
        el.style.setProperty('background', INPUT_BG, 'important');
        el.style.setProperty('background-color', INPUT_BG, 'important');
      }
      el.style.setProperty('color', '#ffffff', 'important');
      el.style.setProperty('border', '1px solid ' + BORDER_PURPLE, 'important');
    });
    fixProfileDateIcons(root);
  }

  function applyRowStyle(row, index) {
    if (!row || row.getAttribute(DONE_ATTR) === '1') return;
    var useAlt = currentPage === PAGES.orders ||
      currentPage === PAGES.downloadable ||
      currentPage === PAGES.wallet;
    var bg = (useAlt && index % 2 === 1) ? GLASS_ROW_ALT : GLASS_ROW;
    row.style.setProperty('background', bg, 'important');
    row.style.setProperty('background-color', bg, 'important');
    row.style.setProperty('color', '#ffffff', 'important');
    row.setAttribute(DONE_ATTR, '1');
  }

  function getRoot() {
    return document.querySelector('.main-container-wrapper');
  }

  function fixInline() {
    currentPage = resolvePage();
    if (!currentPage) return;

    var root = getRoot();
    if (!root) return;

    root.querySelectorAll(FIX_INLINE_SEL).forEach(function (el) {
      if (el.closest('.nav-header')) {
        fixNavHeader(el);
        return;
      }
      if (el.matches('nav.sidebar, .sidebar')) {
        fixSidebar(el);
        return;
      }
      if (el.classList.contains('main-content')) {
        fixMainContent(el);
        return;
      }
      if (el.matches('.account-items-list, .account-table-content')) {
        fixTableContainer(el);
        return;
      }
      if (el.matches('table.s-table')) {
        el.style.setProperty('background', 'transparent', 'important');
        el.style.setProperty('color', '#ffffff', 'important');
        return;
      }
      if (el.matches('.address-card, .product-entry--wishlist')) {
        fixGlassCard(el);
        return;
      }
      if (el.matches('tbody.list-container tr, .s-table__tr')) {
        return;
      }
      if (el.closest('nav.sidebar, .sidebar')) {
        fixGlassCard(el);
        return;
      }
      if (el.closest('.main-content')) {
        fixGlassCard(el);
        return;
      }
      fixGlassCard(el);
    });

    root.querySelectorAll('.nav-header.bg-gray-100, .nav-header.da-bgg').forEach(fixNavHeader);
    root.querySelectorAll('nav.sidebar.bg-white, nav.sidebar.da-bgs, .sidebar.bg-white, .sidebar.da-bgs').forEach(fixSidebar);
    root.querySelectorAll('.main-content').forEach(fixMainContent);
    root.querySelectorAll('.account-items-list, .account-table-content').forEach(fixTableContainer);

    root.querySelectorAll('table.s-table thead tr').forEach(function (tr) {
      tr.style.setProperty('background', TABLE_HEAD_BG, 'important');
      tr.style.setProperty('background-color', TABLE_HEAD_BG, 'important');
    });

    root.querySelectorAll('table.s-table thead th, table.s-table th').forEach(function (th) {
      th.style.setProperty('color', '#ffffff', 'important');
      th.style.setProperty('border-bottom', '2px solid ' + ACCENT, 'important');
      th.style.setProperty('background', 'transparent', 'important');
    });

    root.querySelectorAll(ROW_SEL).forEach(function (row, index) {
      applyRowStyle(row, index);
    });

    root.querySelectorAll('table.s-table td, table.s-table tbody td').forEach(function (td) {
      td.style.setProperty('color', '#ffffff', 'important');
      td.style.setProperty('background', 'transparent', 'important');
    });

    root.querySelectorAll('.profile-photo').forEach(function (img) {
      img.style.setProperty('border', '2px solid ' + ACCENT, 'important');
      img.style.setProperty('border-radius', '50%', 'important');
      img.style.setProperty('box-shadow', '0 0 20px rgba(139, 81, 254, 0.4)', 'important');
    });

    fixProfileInputs(root);
  }

  function scheduleReapply() {
    if (fixTimer) clearTimeout(fixTimer);
    fixTimer = setTimeout(function () {
      fixTimer = null;
      currentPage = resolvePage();
      if (!currentPage) {
        setBodyClass(false);
        return;
      }
      setBodyClass(true, currentPage);
      inject();
      fixInline();
    }, 80);
  }

  function bindObserver() {
    if (observer || !document.body) return;
    observer = new MutationObserver(function () {
      scheduleReapply();
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  function init() {
    currentPage = resolvePage();
    if (!currentPage) return;
    setBodyClass(true, currentPage);
    inject();
    fixInline();
    bindObserver();

    REAPPLY_DELAYS.forEach(function (ms) {
      setTimeout(function () {
        currentPage = resolvePage();
        if (!currentPage) return;
        setBodyClass(true, currentPage);
        inject();
        fixInline();
      }, ms);
    });

    if (window.raqamThemeReady) window.raqamThemeReady();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
