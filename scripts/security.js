/**
 * security.js - View-only protection layer. Loaded first.
 * Export is allowed ONLY through the official Export PNG button.
 */
(function () {
  'use strict';

  /* 1. Disable right-click */
  document.addEventListener('contextmenu', function(e) { e.preventDefault(); });

  /* 2. Block keyboard shortcuts */
  document.addEventListener('keydown', function(e) {
    var mod = e.ctrlKey || e.metaKey;
    if (mod && e.code === 'KeyS') { e.preventDefault(); return; }
    if (mod && e.code === 'KeyU') { e.preventDefault(); return; }
    if (mod && e.code === 'KeyP') { e.preventDefault(); return; }
    if (mod && e.shiftKey && (e.code === 'KeyI' || e.code === 'KeyJ' || e.code === 'KeyC')) { e.preventDefault(); return; }
    if (e.key === 'F12') { e.preventDefault(); return; }
  });

  /* 3. Block print / Save as PDF */
  window.addEventListener('beforeprint', function(e) {
    e.preventDefault();
    document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;font-size:18px;color:#555;text-align:center;padding:40px;">Printing is disabled for this application.</div>';
  });

  /* 4. Disable canvas drag */
  document.addEventListener('dragstart', function(e) {
    if (e.target.tagName === 'CANVAS' || e.target.tagName === 'IMG') e.preventDefault();
  });

  /* 5. Disable text selection */
  document.addEventListener('selectstart', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    e.preventDefault();
  });

  /* 6. DevTools detection */
  var THRESHOLD = 160;
  var devOpen = false;
  function checkDevTools() {
    var w = window.outerWidth - window.innerWidth;
    var h = window.outerHeight - window.innerHeight;
    var open = w > THRESHOLD || h > THRESHOLD;
    if (open && !devOpen) { devOpen = true; showDevWarning(); }
    else if (!open) { devOpen = false; }
  }
  function showDevWarning() {
    var el = document.createElement('div');
    el.id = 'tl-devwarn';
    el.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.92);display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:sans-serif;color:#fff;text-align:center;padding:40px;';
    el.innerHTML = '<div style="font-size:48px;margin-bottom:16px;">&#128274;</div><h2 style="font-size:22px;margin-bottom:10px;">Developer Tools Detected</h2><p style="color:#aaa;max-width:360px;font-size:14px;line-height:1.6;">Please close DevTools to continue using TextureLab.</p>';
    document.body.appendChild(el);
    var t = setInterval(function() {
      var w2 = window.outerWidth - window.innerWidth;
      var h2 = window.outerHeight - window.innerHeight;
      if (w2 <= THRESHOLD && h2 <= THRESHOLD) {
        var warn = document.getElementById('tl-devwarn');
        if (warn) warn.remove();
        devOpen = false;
        clearInterval(t);
      }
    }, 500);
  }
  setInterval(checkDevTools, 1000);

  /* 7. Patch canvas export — blocked by default, unlocked via exportCanvas() */
  var _toDataURL = HTMLCanvasElement.prototype.toDataURL;
  var _toBlob    = HTMLCanvasElement.prototype.toBlob;

  HTMLCanvasElement.prototype.toDataURL = function() {
    if (this._allowExport) return _toDataURL.apply(this, arguments);
    console.warn('[TextureLab] Canvas export is disabled.');
    return 'data:,';
  };
  HTMLCanvasElement.prototype.toBlob = function(cb) {
    var args = Array.prototype.slice.call(arguments, 1);
    if (this._allowExport) return _toBlob.apply(this, arguments);
    console.warn('[TextureLab] Canvas export is disabled.');
    cb(null);
  };

  /* 8. Controlled export helper — used by app.js download button only */
  window.__textureLab = {
    exportCanvas: function(canvas) {
      return new Promise(function(resolve) {
        canvas._allowExport = true;
        _toBlob.call(canvas, function(blob) {
          canvas._allowExport = false;
          resolve(blob);
        }, 'image/png');
      });
    }
  };

  /* 9. Console notice */
  console.log('%c TextureLab ', 'background:#7c6dfa;color:#fff;font-size:14px;font-weight:bold;padding:4px 12px;border-radius:4px;');
  console.log('%cUse the Export PNG button to save your result.', 'color:#aaa;font-size:12px;');

})();