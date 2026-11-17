/* ELGS: page-local behaviour. The engine is untouched; everything bespoke
   lives here and reads the engine's published state. */
(function () {
  'use strict';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  window.__sc = ScrollCraft.mount(document);   // the handle the verification scripts read

  // The spacer is sized once at mount. Re-measure when the window and the
  // fonts have settled (worldflight.md 7b).
  function relayout() { dispatchEvent(new Event('resize')); }
  addEventListener('load', relayout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);

  // ---- the track, in the same units the weights are written in -----------
  var segs = $$('[data-sc-segment]');
  var legs = [], run = 0;
  segs.forEach(function (s) {
    var w = parseFloat(s.getAttribute('data-sc-w')) || 1.3;
    legs.push({ c0: run, w: w, label: s.getAttribute('data-sc-waypoint') });
    run += w;
  });
  var total = run;
  function trackT() { return Math.max(0, Math.min(total, scrollY / Math.max(innerHeight, 1))); }

  // ---- the route: a map you can jump around in ---------------------------
  var links = $$('[data-route]');
  var here = $('.route__here');
  var toggle = $('.route__toggle');
  function goTo(i) {
    var L = legs[i];
    var t = i === 0 ? 0 : i === legs.length - 1 ? total + 1 : L.c0 + L.w * 0.5;
    scrollTo({ top: Math.round(t * innerHeight), behavior: reduce ? 'auto' : 'smooth' });
  }
  links.forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      goTo(+a.getAttribute('data-route'));
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
    });
  });
  if (toggle) toggle.addEventListener('click', function () {
    toggle.setAttribute('aria-expanded', String(toggle.getAttribute('aria-expanded') !== 'true'));
  });
  addEventListener('sc:waypoint', function (e) {
    var k = e.detail.index;
    $$('.route__list a').forEach(function (a) { a.setAttribute('aria-current', String(+a.getAttribute('data-route') === k)); });
    if (here) here.textContent = e.detail.label;
  });
  var skip = $('.skip');
  if (skip) skip.addEventListener('click', function (e) {
    e.preventDefault(); goTo(legs.length - 1);
    var b = $('.finale .btn'); if (b) setTimeout(function () { b.focus({ preventScroll: true }); }, reduce ? 0 : 700);
  });

  // ---- plates follow their blocks ----------------------------------------
  var pairs = $$('[data-sc-copy]').map(function (c) {
    var p = c.previousElementSibling;
    return { copy: c, plate: p && p.classList.contains('plate') ? p : null, last: '' };
  });

  // ---- the open book: gift translator and the ledger of sources ----------
  var TUITION = 300;                       // published monthly cap
  var out = $('.gift__out');
  function words(n) {
    if (n >= 12) return 'a full year of one seminarian’s tuition, every year.';
    return n + (n === 1 ? ' month' : ' months') + ' of one seminarian’s tuition, every year.';
  }
  $$('input[name="gift"]').forEach(function (r) {
    r.addEventListener('change', function () {
      var amt = +r.value, months = Math.round(amt * 12 / TUITION);
      out.innerHTML = '<b>$' + amt + ' a month</b> equals ' + words(months);
    });
  });
  var bookToggle = $('.book__toggle'), book = $('.book');
  var bookTouched = false, wide = matchMedia('(min-width: 861px)');
  function setBook(open) {
    book.toggleAttribute('data-open', open);
    bookToggle.setAttribute('aria-expanded', String(open));
  }
  bookToggle.addEventListener('click', function () { bookTouched = true; setBook(!book.hasAttribute('data-open')); });
  // The guide opens by itself on the two legs that speak to donors (the record
  // and the door), on wide screens only, and never overrides the visitor.
  addEventListener('sc:waypoint', function (e) {
    if (bookTouched || !wide.matches) return;
    setBook(e.detail.index >= 6);
  });

  var entries = $$('.ledger li');
  var countEl = $('.book__count'), countB = $('.book__count b'), ledgerBtn = $('.book__ledger');
  var passed = 0;
  function stamp(t) {
    var n = 0;
    entries.forEach(function (li) {
      var L = legs[+li.getAttribute('data-leg')];
      var on = li.classList.contains('is-passed') || t >= L.c0 + L.w * 0.3 || (L.c0 === 0);
      if (on) { li.classList.add('is-passed'); n++; }
    });
    if (n !== passed) {
      passed = n;
      countB.textContent = String(n);
      ledgerBtn.setAttribute('aria-label', 'Sources you can check: ' + n + ' of ' + entries.length + ' passed so far. Open the list.');
      countEl.classList.remove('is-stamped'); void countEl.offsetWidth; countEl.classList.add('is-stamped');
    }
  }

  // ---- one frame loop for the page-local reads ---------------------------
  function frame() {
    for (var i = 0; i < pairs.length; i++) {
      var p = pairs[i]; if (!p.plate) continue;
      var o = p.copy.style.opacity || '0';
      if (o !== p.last) { p.plate.style.opacity = o; p.last = o; }
    }
    stamp(trackT());
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // ---- keyboard: a focused control inside a faded block comes into view --
  var copies = $$('[data-sc-copy]');
  function midOf(block) {
    var spec = (block.getAttribute('data-sc-window') || '').trim();
    if (spec === 'hero') return 0;
    if (spec === 'finale') return total + 1;
    var n = spec.split(/\s+/).map(parseFloat);
    return ((n[0] + n[1]) / 2) * total;
  }
  document.addEventListener('focusin', function (e) {
    var block = e.target.closest && e.target.closest('[data-sc-copy]');
    if (!block || parseFloat(block.style.opacity || '0') > 0.85) return;
    scrollTo({ top: Math.round(midOf(block) * innerHeight), behavior: 'instant' });
  });

  // ---- "what are you already doing": the answer carries into the form ----
  var answer = $('.fit__answer'), doing = '';
  $$('input[name="fit"]').forEach(function (r) {
    r.addEventListener('change', function () {
      doing = r.value;
      var s = doing.charAt(0).toUpperCase() + doing.slice(1);
      answer.textContent = s + '? Then use that in your program. Your mentor team builds learning experiences around it.';
    });
  });

  // ---- sheets -------------------------------------------------------------
  $$('[data-open]').forEach(function (b) {
    b.addEventListener('click', function () {
      var d = document.getElementById(b.getAttribute('data-open'));
      if (!d) return;
      if (d.id === 'talk' && doing) {
        var m = d.querySelector('textarea[name="Message"]');
        if (m && !m.value) m.value = 'I am currently ' + doing + '.';
      }
      if (d.showModal) d.showModal(); else d.setAttribute('open', '');
    });
  });
  $$('dialog.sheet').forEach(function (d) {
    d.addEventListener('click', function (e) { if (e.target === d) d.close(); });   // click on the backdrop
  });

  // ---- the student form: composes an email, claims nothing more ----------
  var form = $('#talk-form'), status = $('.talk__status');
  if (form) form.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = new FormData(form), lines = [];
    f.forEach(function (v, k) { if (String(v).trim()) lines.push(k + ': ' + String(v).trim()); });
    var href = 'mailto:Team@ELGS.org?subject=' + encodeURIComponent('Request for information: ' + (f.get('Name') || '')) +
               '&body=' + encodeURIComponent(lines.join('\n'));
    location.href = href;
    status.hidden = false;
    status.textContent = 'Your email app should now be open with this message addressed to Team@ELGS.org. It is not sent until you press send there. If nothing opened, write to Team@ELGS.org or call +1 508-622-5533.';
  });
})();
