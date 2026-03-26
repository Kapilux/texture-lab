/**
 * app.js - UI state, events, and render loop.
 * Depends on: security.js, filters.js
 */
(function () {
  'use strict';

  /* ── State ── */
  var state = {
    image: null, filter: 'none',
    intensity: 50, scale: 20, angle: 0, zoom: 100,
    grayscale: 0, noise: 0, brightness: 100, contrast: 100,
    overlayColor: 'none', overlayMix: 0
  };
  var rafPending = false;

  /* ── DOM ── */
  var uploadZone  = document.getElementById('upload-zone');
  var fileInput   = document.getElementById('file-input');
  var btnBrowse   = document.getElementById('btn-browse');
  var previewArea = document.getElementById('preview-area');
  var canvasOrig  = document.getElementById('canvas-original');
  var canvasPrev  = document.getElementById('canvas-preview');
  var ctxOrig     = canvasOrig.getContext('2d');
  var ctxPrev     = canvasPrev.getContext('2d', { willReadFrequently: true });
  var btnReset    = document.getElementById('btn-reset');
  var btnDownload = document.getElementById('btn-download');
  var statusDot   = document.getElementById('status-dot');
  var statusText  = document.getElementById('status-text');
  var statusDims  = document.getElementById('status-dims');
  var statusBadge = document.getElementById('status-filter-badge');

  /* ── Slider definitions ── */
  var sliderDefs = [
    { id:'sl-intensity', valId:'val-intensity', key:'intensity',   fmt:function(v){return v;} },
    { id:'sl-scale',     valId:'val-scale',     key:'scale',       fmt:function(v){return v;} },
    { id:'sl-angle',     valId:'val-angle',     key:'angle',       fmt:function(v){return v+'deg';} },
    { id:'sl-zoom',      valId:'val-zoom',      key:'zoom',        fmt:function(v){return (v/100).toFixed(1)+'x';} },
    { id:'sl-grayscale', valId:'val-grayscale', key:'grayscale',   fmt:function(v){return v+'%';} },
    { id:'sl-noise',     valId:'val-noise',     key:'noise',       fmt:function(v){return v;} },
    { id:'sl-brightness',valId:'val-brightness',key:'brightness',  fmt:function(v){return v+'%';} },
    { id:'sl-contrast',  valId:'val-contrast',  key:'contrast',    fmt:function(v){return v+'%';} },
    { id:'sl-overlay',   valId:'val-overlay',   key:'overlayMix',  fmt:function(v){return v+'%';} }
  ];

  /* ── Helpers ── */
  function fillTrack(el) {
    var pct = ((el.value - el.min) / (el.max - el.min)) * 100;
    el.style.setProperty('--pct', pct + '%');
  }

  function scheduleRender() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(render);
  }

  /* ── Render ── */
  function render() {
    rafPending = false;
    if (!state.image) return;
    var w = canvasPrev.width, h = canvasPrev.height;
    ctxPrev.clearRect(0, 0, w, h);
    var z = state.zoom / 100, dw = w * z, dh = h * z;
    ctxPrev.drawImage(state.image, (w - dw) / 2, (h - dh) / 2, dw, dh);
    if (state.grayscale > 0 || state.noise > 0 || state.brightness !== 100 || state.contrast !== 100) {
      var id = ctxPrev.getImageData(0, 0, w, h);
      Filters.applyImageEffects(id, { grayscale: state.grayscale, noise: state.noise, brightness: state.brightness, contrast: state.contrast });
      ctxPrev.putImageData(id, 0, 0);
    }
    if (state.filter !== 'none') {
      Filters.draw(state.filter, ctxPrev, w, h, { intensity: state.intensity, scale: state.scale, angle: state.angle });
    }
    if (state.overlayColor !== 'none' && state.overlayMix > 0) {
      Filters.applyOverlay(ctxPrev, w, h, state.overlayColor, state.overlayMix);
    }
  }

  /* ── Load image ── */
  function loadFile(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please select an image file.'); return; }
    var reader = new FileReader();
    reader.onload = function(e) {
      var img = new Image();
      img.onload = function() {
        state.image = img;
        var sidebarW = 280, headerH = 58;
        var MAX_W = (window.innerWidth - sidebarW - 60) / 2 - 32;
        var MAX_H = window.innerHeight - headerH - 80;
        var ratio = Math.min(1, MAX_W / img.width, MAX_H / img.height);
        var w = Math.round(img.width * ratio), h = Math.round(img.height * ratio);
        canvasOrig.width = canvasPrev.width = w;
        canvasOrig.height = canvasPrev.height = h;
        ctxOrig.drawImage(img, 0, 0, w, h);
        uploadZone.style.display = 'none';
        previewArea.style.display = 'flex';
        btnReset.disabled = false;
        btnDownload.disabled = false;
        statusDot.classList.add('active');
        statusText.textContent = img.width + ' x ' + img.height + ' px';
        statusDims.textContent = img.width + ' x ' + img.height;
        scheduleRender();
      };
      img.onerror = function() { alert('Could not load image.'); };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  /* ── Upload events ── */
  btnBrowse.addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); fileInput.click(); });
  uploadZone.addEventListener('click', function(e) { if (e.target !== btnBrowse) fileInput.click(); });
  fileInput.addEventListener('change', function(e) { loadFile(e.target.files[0]); e.target.value = ''; });
  uploadZone.addEventListener('dragover', function(e) { e.preventDefault(); uploadZone.classList.add('drag-over'); });
  uploadZone.addEventListener('dragleave', function() { uploadZone.classList.remove('drag-over'); });
  uploadZone.addEventListener('drop', function(e) { e.preventDefault(); uploadZone.classList.remove('drag-over'); loadFile(e.dataTransfer.files[0]); });

  /* ── Filter buttons ── */
  document.getElementById('filter-grid').addEventListener('click', function(e) {
    var btn = e.target.closest('.filter-btn');
    if (!btn) return;
    document.querySelectorAll('.filter-btn').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    state.filter = btn.dataset.filter;
    if (state.filter === 'none') { statusBadge.classList.remove('visible'); }
    else { statusBadge.textContent = state.filter; statusBadge.classList.add('visible'); }
    scheduleRender();
  });

  /* ── Sliders ── */
  sliderDefs.forEach(function(def) {
    var el    = document.getElementById(def.id);
    var valEl = document.getElementById(def.valId);
    fillTrack(el);
    el.addEventListener('input', function() {
      var v = parseFloat(el.value);
      valEl.textContent = def.fmt(v);
      state[def.key] = v;
      fillTrack(el);
      scheduleRender();
    });
  });

  /* ── Color swatches ── */
  document.getElementById('color-swatches').addEventListener('click', function(e) {
    var sw = e.target.closest('.swatch');
    if (!sw) return;
    document.querySelectorAll('.swatch').forEach(function(s) { s.classList.remove('active'); });
    sw.classList.add('active');
    state.overlayColor = sw.dataset.color;
    scheduleRender();
  });

  /* ── Reset ── */
  btnReset.addEventListener('click', function() {
    state.filter = 'none'; state.intensity = 50; state.scale = 20; state.angle = 0; state.zoom = 100;
    state.grayscale = 0; state.noise = 0; state.brightness = 100; state.contrast = 100;
    state.overlayColor = 'none'; state.overlayMix = 0;

    document.querySelectorAll('.filter-btn').forEach(function(b) {
      b.classList.toggle('active', b.dataset.filter === 'none');
    });

    sliderDefs.forEach(function(def) {
      var el = document.getElementById(def.id);
      el.value = el.defaultValue;
      document.getElementById(def.valId).textContent = def.fmt(parseFloat(el.defaultValue));
      fillTrack(el);
    });

    document.querySelectorAll('.swatch').forEach(function(s, i) {
      s.classList.toggle('active', i === 0);
    });

    statusBadge.classList.remove('visible');
    scheduleRender();
  });

  /* ── Export PNG ── */
  btnDownload.addEventListener('click', function() {
    if (!state.image) return;
    window.__textureLab.exportCanvas(canvasPrev).then(function(blob) {
      if (!blob) return;
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'texturelab-' + Date.now() + '.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
    });
  });

  /* ── Upload zone border animation ── */
  var uzBorder = document.getElementById('uz-border');
  uploadZone.addEventListener('mouseenter', function() {
    uzBorder.classList.remove('blinking', 'resetting');
    void uzBorder.getBoundingClientRect();
    uzBorder.classList.add('blinking');
  });
  uploadZone.addEventListener('mouseleave', function() {
    uzBorder.classList.remove('blinking', 'resetting');
    void uzBorder.getBoundingClientRect();
    uzBorder.classList.add('resetting');
  });

  /* ── Size SVG border rect ── */
  function sizeUzBorder() {
    var svg = document.getElementById('uz-svg');
    uzBorder.setAttribute('width', svg.clientWidth - 3);
    uzBorder.setAttribute('height', svg.clientHeight - 3);
  }
  window.addEventListener('resize', sizeUzBorder);
  setTimeout(sizeUzBorder, 50);

})();