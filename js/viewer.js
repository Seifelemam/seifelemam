/* ==========================================================================
   VIEWER — accessible photo gallery / information panel.
   Used by the world map (a place with its photos) and by the culture galleries.
   App.Viewer.open({ title, kicker, sub, text, photos:[{src,alt,caption}], start, siblings, onSibling, backLabel })
   Keyboard: Esc closes, arrow keys browse. Touch: swipe. Focus stays inside while open.
   ========================================================================== */
(function () {
  'use strict';
  var A = window.App; if (!A) return;
  var el = A.el, t = A.t, icon = A.icon;
  var root, stage, img, vid, ph, phText, capEl, countEl, prevB, nextB, kickerEl, titleEl, subEl, textEl, tripEl, thumbsEl, hintEl, closeB, backB;
  var cur = null, idx = 0, lastFocus = null, sx = 0, sy = 0, tracking = false;

  function build() {
    if (root) return;
    img = el('img', { class: 'viewer__img', alt: '', decoding: 'async' });
    vid = el('video', { class: 'viewer__vid', controls: '', playsinline: '', preload: 'metadata', hidden: true });
    ph = el('div', { class: 'viewer__ph ph' }, [icon('i-camera'), phText = el('span')]);
    capEl = el('p', { class: 'viewer__cap' });
    countEl = el('span', { class: 'viewer__count', 'aria-live': 'polite' });
    prevB = el('button', { type: 'button', class: 'viewer__nav viewer__nav--prev' }, icon('i-chev'));
    nextB = el('button', { type: 'button', class: 'viewer__nav viewer__nav--next' }, icon('i-chev'));
    stage = el('div', { class: 'viewer__stage' }, [img, vid, ph, prevB, nextB, capEl, countEl]);

    kickerEl = el('p', { class: 'viewer__kicker' });
    titleEl = el('h3', { class: 'viewer__title', id: 'viewer-title' });
    subEl = el('p', { class: 'viewer__sub' });
    textEl = el('p', { class: 'viewer__text' });
    tripEl = el('div', { class: 'viewer__trip' });
    thumbsEl = el('div', { class: 'viewer__thumbs', role: 'group' });
    hintEl = el('p', { class: 'viewer__hint' });
    closeB = el('button', { type: 'button', class: 'viewer__close' }, icon('i-close'));
    backB = el('button', { type: 'button', class: 'btn btn--line viewer__back' });
    var side = el('aside', { class: 'viewer__side' }, [closeB, kickerEl, titleEl, subEl, textEl, tripEl, thumbsEl, hintEl, backB]);

    root = el('div', { class: 'viewer', id: 'viewer', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'viewer-title', hidden: true },
      el('div', { class: 'viewer__panel' }, [stage, side]));
    document.body.appendChild(root);

    closeB.addEventListener('click', close); backB.addEventListener('click', close);
    root.addEventListener('click', function (e) { if (e.target === root) close(); });
    prevB.addEventListener('click', function () { go(idx - 1); });
    nextB.addEventListener('click', function () { go(idx + 1); });
    img.addEventListener('load', function () { img.classList.remove('is-loading'); });
    img.addEventListener('error', function () { img.hidden = true; ph.hidden = false; phText.textContent = capEl.textContent; });
    document.addEventListener('keydown', onKey);
    stage.addEventListener('pointerdown', function (e) { if (e.target.closest('button, video')) return; tracking = true; sx = e.clientX; sy = e.clientY; });
    stage.addEventListener('pointerup', function (e) {
      if (!tracking) return; tracking = false;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        var rtl = document.documentElement.dir === 'rtl';
        go(idx + ((dx < 0) !== rtl ? 1 : -1));
      }
    });
    stage.addEventListener('pointercancel', function () { tracking = false; });
  }

  function labels() {
    prevB.setAttribute('aria-label', t('jr.v.prev')); nextB.setAttribute('aria-label', t('jr.v.next'));
    closeB.setAttribute('aria-label', t('jr.v.close'));
    root.setAttribute('aria-label', t('jr.v.label'));
    hintEl.textContent = t('jr.v.swipe');
  }

  function show() {
    var photos = cur.photos, n = photos.length;
    var many = n > 1;
    prevB.hidden = nextB.hidden = !many; thumbsEl.hidden = !many; hintEl.hidden = !many; countEl.hidden = !n;
    if (!n) {
      img.hidden = true; stopVideo(); ph.hidden = false; capEl.hidden = true;
      phText.textContent = cur.emptyNote || t('jr.nophotos');
      return;
    }
    var p = photos[idx];
    ph.hidden = true; capEl.hidden = !p.caption;
    stage.classList.toggle('is-vid', !!p.video);
    if (p.video) {
      img.hidden = true; vid.hidden = false;
      vid.poster = p.poster || ''; vid.setAttribute('aria-label', p.caption || ''); vid.src = p.src;
    } else {
      stopVideo(); img.hidden = false;
      img.classList.add('is-loading'); img.alt = p.alt || p.caption || ''; img.src = p.src;
    }
    capEl.textContent = p.caption || '';
    countEl.textContent = n > 1 ? t('jr.v.of', { i: idx + 1, n: n }) : '';
    Array.prototype.forEach.call(thumbsEl.children, function (b, i) { b.setAttribute('aria-current', i === idx ? 'true' : 'false'); });
    /* warm the neighbours */
    [idx - 1, idx + 1].forEach(function (k) { if (photos[k] && !photos[k].video) { var pre = new Image(); pre.src = photos[k].src; } });
  }
  function stopVideo() { if (!vid) return; try { vid.pause(); } catch (e) {} vid.hidden = true; vid.removeAttribute('src'); vid.removeAttribute('poster'); try { vid.load(); } catch (e) {} }
  function go(i) {
    var n = cur.photos.length; if (n < 2) return;
    idx = (i + n) % n; show();
  }

  function fill(o) {
    cur = o; idx = Math.max(0, Math.min(o.start || 0, (o.photos || []).length - 1)); cur.photos = o.photos || [];
    kickerEl.textContent = o.kicker || ''; kickerEl.hidden = !o.kicker;
    titleEl.textContent = o.title || '';
    subEl.textContent = o.sub || ''; subEl.hidden = !o.sub;
    textEl.textContent = o.text || ''; textEl.hidden = !o.text;
    backB.textContent = o.backLabel || t('jr.v.close');
    A.clear(tripEl);
    if (o.siblings && o.siblings.length > 1) {
      tripEl.hidden = false;
      tripEl.appendChild(el('p', { class: 'viewer__triplabel', text: o.tripLabel || '' }));
      var row = el('div', { class: 'viewer__tripbtns' });
      o.siblings.forEach(function (s) {
        var b = el('button', { type: 'button', 'aria-current': s.active ? 'true' : 'false', text: s.label });
        b.addEventListener('click', function () { if (o.onSibling) o.onSibling(s.id); });
        row.appendChild(b);
      });
      tripEl.appendChild(row);
    } else tripEl.hidden = true;
    A.clear(thumbsEl);
    cur.photos.forEach(function (p, i) {
      var b = el('button', { type: 'button', 'aria-label': t('jr.v.of', { i: i + 1, n: cur.photos.length }) + (p.caption ? ': ' + p.caption : '') }, p.video ? el('span', { class: 'viewer__vthumb' }, p.poster ? el('img', { src: p.poster, alt: '', loading: 'lazy' }) : icon('i-play')) : el('img', { src: p.src, alt: '', loading: 'lazy' }));
      if (p.video) b.setAttribute('data-video', '');
      b.addEventListener('click', function () { go(i); });
      thumbsEl.appendChild(b);
    });
    labels(); show();
  }

  function focusables() {
    return Array.prototype.filter.call(root.querySelectorAll('button:not([hidden]), [href], [tabindex]:not([tabindex="-1"])'), function (n) { return !n.disabled && n.offsetParent !== null; });
  }
  function onKey(e) {
    if (!root || root.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && !(e.target && e.target.tagName === 'VIDEO')) {
      var rtl = document.documentElement.dir === 'rtl';
      go(idx + ((e.key === 'ArrowRight') !== rtl ? 1 : -1)); e.preventDefault();
    } else if (e.key === 'Tab') {
      var f = focusables(); if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      else if (!root.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    }
  }

  function open(o) {
    build();
    var wasOpen = !root.hidden;
    if (!wasOpen) lastFocus = document.activeElement;
    fill(o);
    root.hidden = false;
    if (!wasOpen) {
      document.documentElement.classList.add('viewer-open');
      var page = document.getElementById('page'); if (page) page.setAttribute('inert', '');
      requestAnimationFrame(function () { root.classList.add('is-open'); closeB.focus(); });
    }
    if (o.onOpen) o.onOpen();
  }
  function close() {
    if (!root || root.hidden) return;
    stopVideo(); root.classList.remove('is-open'); root.hidden = true;
    document.documentElement.classList.remove('viewer-open');
    var page = document.getElementById('page'); if (page) page.removeAttribute('inert');
    var cb = cur && cur.onClose; cur = null;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
    if (cb) cb();
  }

  A.Viewer = { open: open, close: close, isOpen: function () { return !!root && !root.hidden; }, relabel: function () { if (root && !root.hidden) labels(); } };
  A.onLang(function () { if (A.Viewer.isOpen()) labels(); });
})();
