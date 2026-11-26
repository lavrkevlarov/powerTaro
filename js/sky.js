/* Живое звёздное небо: мерцание, параллакс, падающие звёзды */
(function () {
  'use strict';
  const cv = document.getElementById('sky');
  const ctx = cv.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W, H, dpr, stars = [], shooting = [], mx = 0, my = 0, tx = 0, ty = 0;

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = cv.width = innerWidth * dpr;
    H = cv.height = innerHeight * dpr;
    cv.style.width = innerWidth + 'px';
    cv.style.height = innerHeight + 'px';
    const n = Math.round(innerWidth * innerHeight / 5200);
    stars = Array.from({ length: n }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: (Math.random() ** 2 * 1.6 + .3) * dpr,
      d: Math.random() * .9 + .1,
      p: Math.random() * Math.PI * 2,
      s: Math.random() * .02 + .005,
      c: Math.random() < .15 ? '255,214,150' : Math.random() < .3 ? '190,200,255' : '255,255,255'
    }));
  }
  addEventListener('resize', resize);
  addEventListener('pointermove', e => { tx = (e.clientX / innerWidth - .5); ty = (e.clientY / innerHeight - .5); });

  window.Taro = window.Taro || {};
  window.Taro.skyBoost = 0; // ускорение звёзд во время тасования

  function frame() {
    mx += (tx - mx) * .04; my += (ty - my) * .04;
    ctx.clearRect(0, 0, W, H);
    const boost = window.Taro.skyBoost;
    for (const s of stars) {
      s.p += s.s * (1 + boost * 4);
      if (boost) { s.y -= s.d * boost * 2 * dpr; if (s.y < 0) s.y += H; }
      const a = .35 + Math.sin(s.p) * .35 + .3;
      const x = s.x - mx * 40 * s.d * dpr, y = s.y - my * 40 * s.d * dpr;
      ctx.beginPath();
      ctx.fillStyle = `rgba(${s.c},${a.toFixed(3)})`;
      ctx.arc(x, y, s.r, 0, 6.283);
      ctx.fill();
      if (s.r > 1.5 * dpr && a > .8) {
        ctx.fillStyle = `rgba(${s.c},.12)`;
        ctx.beginPath(); ctx.arc(x, y, s.r * 4, 0, 6.283); ctx.fill();
      }
    }
    if (Math.random() < .004 + boost * .03) {
      shooting.push({ x: Math.random() * W, y: Math.random() * H * .5, vx: (4 + Math.random() * 4) * dpr, vy: (2 + Math.random() * 2) * dpr, life: 1 });
    }
    shooting = shooting.filter(s => s.life > 0);
    for (const s of shooting) {
      const g = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 18, s.y - s.vy * 18);
      g.addColorStop(0, `rgba(255,240,200,${s.life})`);
      g.addColorStop(1, 'rgba(255,240,200,0)');
      ctx.strokeStyle = g; ctx.lineWidth = 1.6 * dpr;
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * 18, s.y - s.vy * 18); ctx.stroke();
      s.x += s.vx; s.y += s.vy; s.life -= .015;
    }
    if (!reduce) requestAnimationFrame(frame);
  }
  resize();
  frame();
})();
