/**
 * filters.js - Canvas filter and image-effect engine.
 * Exposes global: Filters
 */
var Filters = (function () {
  'use strict';

  function op(i) { return i / 100; }

  function offscreen(w, h, deg) {
    var c = document.createElement('canvas');
    c.width = w * 2; c.height = h * 2;
    var ctx = c.getContext('2d');
    ctx.translate(w, h);
    ctx.rotate(deg * Math.PI / 180);
    ctx.translate(-w, -h);
    return { canvas: c, ctx: ctx };
  }

  function stamp(ctx, off, w, h) {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(off.canvas, -w / 2, -h / 2, w * 2, h * 2);
    ctx.restore();
  }

  function crosshatch(ctx, w, h, p) {
    var off = offscreen(w, h, p.angle), c = off.ctx;
    var step = Math.max(4, p.scale);
    c.strokeStyle = 'rgba(0,0,0,' + (op(p.intensity) * 0.85) + ')';
    c.lineWidth = Math.max(0.5, p.scale / 16);
    for (var x = -h * 2; x < w * 3; x += step) {
      c.beginPath(); c.moveTo(x, -h); c.lineTo(x + h * 2, h * 3); c.stroke();
      c.beginPath(); c.moveTo(x + h * 2, -h); c.lineTo(x, h * 3); c.stroke();
    }
    stamp(ctx, off, w, h);
  }

  function dots(ctx, w, h, p) {
    var off = offscreen(w, h, p.angle), c = off.ctx;
    var step = Math.max(4, p.scale), r = step * 0.3;
    c.fillStyle = 'rgba(0,0,0,' + op(p.intensity) + ')';
    for (var y = -h; y < h * 3; y += step)
      for (var x = -w; x < w * 3; x += step) {
        c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
      }
    stamp(ctx, off, w, h);
  }

  function lines(ctx, w, h, p) {
    var off = offscreen(w, h, p.angle), c = off.ctx;
    var step = Math.max(3, p.scale);
    c.strokeStyle = 'rgba(0,0,0,' + (op(p.intensity) * 0.7) + ')';
    c.lineWidth = Math.max(0.5, step / 3);
    for (var y = -h; y < h * 3; y += step) {
      c.beginPath(); c.moveTo(-w, y); c.lineTo(w * 3, y); c.stroke();
    }
    stamp(ctx, off, w, h);
  }

  function weave(ctx, w, h, p) {
    var off = offscreen(w, h, p.angle), c = off.ctx;
    var step = Math.max(4, p.scale), half = step / 2;
    c.strokeStyle = 'rgba(0,0,0,' + (op(p.intensity) * 0.6) + ')';
    c.lineWidth = Math.max(1, step / 4);
    for (var y = -h; y < h * 3; y += step)
      for (var x = -w; x < w * 3; x += step) {
        if (Math.floor(y / step + x / step) % 2 === 0) {
          c.beginPath(); c.moveTo(x, y); c.lineTo(x + half, y); c.stroke();
        } else {
          c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + half); c.stroke();
        }
      }
    stamp(ctx, off, w, h);
  }

  function grain(ctx, w, h, p) {
    var amt = op(p.intensity) * 120;
    var id = ctx.getImageData(0, 0, w, h), d = id.data;
    for (var i = 0; i < d.length; i += 4) {
      var n = (Math.random() - 0.5) * amt;
      d[i]   = Math.min(255, Math.max(0, d[i]   + n));
      d[i+1] = Math.min(255, Math.max(0, d[i+1] + n));
      d[i+2] = Math.min(255, Math.max(0, d[i+2] + n));
    }
    ctx.putImageData(id, 0, 0);
  }

  function hexagons(ctx, w, h, p) {
    var off = offscreen(w, h, p.angle), c = off.ctx;
    var r = Math.max(6, p.scale / 1.5);
    c.strokeStyle = 'rgba(0,0,0,' + (op(p.intensity) * 0.65) + ')';
    c.lineWidth = Math.max(0.5, r / 10);
    var hx = r * 2, hy = Math.sqrt(3) * r;
    for (var row = -3; row < h * 2 / hy + 3; row++)
      for (var col = -3; col < w * 2 / hx + 3; col++) {
        var cx = col * hx * 0.75 - w * 0.5;
        var cy = row * hy + (col % 2 === 0 ? 0 : hy / 2) - h * 0.5;
        c.beginPath();
        for (var i = 0; i < 6; i++) {
          var a = Math.PI / 3 * i;
          if (i === 0) c.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
          else         c.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
        }
        c.closePath(); c.stroke();
      }
    stamp(ctx, off, w, h);
  }

  function circuit(ctx, w, h, p) {
    var off = offscreen(w, h, p.angle), c = off.ctx;
    var step = Math.max(6, p.scale), lw = Math.max(0.5, step / 12);
    c.strokeStyle = 'rgba(0,0,0,' + (op(p.intensity) * 0.7) + ')';
    c.fillStyle   = 'rgba(0,0,0,' + (op(p.intensity) * 0.7) + ')';
    c.lineWidth = lw;
    function rng(x, y) { var s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return s - Math.floor(s); }
    for (var y = -h; y < h * 3; y += step)
      for (var x = -w; x < w * 3; x += step) {
        c.beginPath(); c.arc(x, y, lw * 2, 0, Math.PI * 2); c.fill();
        if (rng(x/step, y/step) > 0.5) { c.beginPath(); c.moveTo(x, y); c.lineTo(x + step, y); c.stroke(); }
        if (rng(x/step+.5, y/step+.5) > 0.5) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + step); c.stroke(); }
      }
    stamp(ctx, off, w, h);
  }

  function applyImageEffects(imageData, opts) {
    var d  = imageData.data;
    var gs = opts.grayscale / 100;
    var ns = opts.noise / 100 * 80;
    var br = opts.brightness / 100;
    var cn = opts.contrast / 100;
    var cf = (259 * (cn * 255 + 255)) / (255 * (259 - cn * 255));
    for (var i = 0; i < d.length; i += 4) {
      var r = d[i], g = d[i+1], b = d[i+2];
      r *= br; g *= br; b *= br;
      r = cf*(r-128)+128; g = cf*(g-128)+128; b = cf*(b-128)+128;
      if (ns > 0) { var n = (Math.random()-0.5)*ns; r+=n; g+=n; b+=n; }
      if (gs > 0) { var lum = 0.299*r+0.587*g+0.114*b; r+=(lum-r)*gs; g+=(lum-g)*gs; b+=(lum-b)*gs; }
      d[i]   = Math.min(255, Math.max(0, r));
      d[i+1] = Math.min(255, Math.max(0, g));
      d[i+2] = Math.min(255, Math.max(0, b));
    }
    return imageData;
  }

  function applyOverlay(ctx, w, h, color, mix) {
    if (!color || color === 'none' || mix === 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = mix / 100;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  var registry = { crosshatch: crosshatch, dots: dots, lines: lines, weave: weave, grain: grain, hexagons: hexagons, circuit: circuit };

  return {
    draw: function(name, ctx, w, h, params) {
      if (registry[name]) registry[name](ctx, w, h, params);
    },
    applyImageEffects: applyImageEffects,
    applyOverlay:      applyOverlay
  };
})();