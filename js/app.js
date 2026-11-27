/* Таролог — логика интерфейса и анимаций */
(function () {
  'use strict';
  const { DECK, art, reading } = window.Taro;
  const { SPREADS } = reading;
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const state = {
    spread: SPREADS[1], // Прошлое · Настоящее · Будущее
    run: 0,
    current: null
  };

  const BY_ID = Object.fromEntries(DECK.map(c => [c.id, c]));

  /* ---------------- Тосты ---------------- */
  let toastT;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('show'), 2800);
  }

  /* ---------------- Экраны ---------------- */
  function show(id) {
    $$('.screen').forEach(s => s.classList.toggle('active', s.id === id));
    scrollTo({ top: 0, behavior: 'smooth' });
  }
  $('#home').addEventListener('click', () => { state.run++; stopSpeak(); window.Taro.skyBoost = 0; show('screenAsk'); });

  /* ---------------- Карты ---------------- */
  function cardEl(card, reversed, flipped) {
    const el = document.createElement('div');
    el.className = 'card' + (flipped ? ' flipped' : '');
    el.innerHTML = `<div class="card-inner"><div class="face back">${art.back()}</div>${card ? `<div class="face front ${reversed ? 'rev' : ''}">${art.front(card)}</div>` : ''}</div>`;
    return el;
  }

  function burst(x, y, n = 22, spread = 90) {
    if (reduceMotion) return;
    for (let i = 0; i < n; i++) {
      const s = document.createElement('div');
      s.className = 'spark';
      const size = 3 + Math.random() * 5;
      s.style.cssText = `left:${x}px;top:${y}px;width:${size}px;height:${size}px;` + (Math.random() < .3 ? 'background:#c9b8ff;box-shadow:0 0 10px #8b6cff' : '');
      document.body.appendChild(s);
      const a = Math.random() * Math.PI * 2, d = spread * (.4 + Math.random());
      s.animate([
        { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
        { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d}px)) scale(0)`, opacity: 0 }
      ], { duration: 700 + Math.random() * 700, easing: 'cubic-bezier(.1,.8,.3,1)' }).onfinish = () => s.remove();
    }
  }
  function centerOf(el) { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }

  /* ---------------- Раскладка стола ---------------- */
  function layoutSpread(spread, compact) {
    const box = $('#spread');
    const W = Math.min(box.parentElement.clientWidth, 1000);
    const k = 0.2;
    const maxCw = spread.cols === 1 ? 180 : 150;
    const labelH = 30;
    let cw = Math.min(maxCw, W / (spread.cols + (spread.cols - 1) * k));
    // во время выбора стол и веер должны помещаться на экране
    const fanH = compact ? fanGeometry().zoneH + 20 : 0;
    const availH = innerHeight - 150 - fanH;
    cw = Math.min(cw, (availH - spread.rows * labelH) / (spread.rows * 1.7 + (spread.rows - 1) * .14));
    cw = Math.max(cw, compact ? 56 : 80);
    const gap = cw * k, gapY = cw * .14;
    const totalW = spread.cols * cw + (spread.cols - 1) * gap;
    const offX = (W - totalW) / 2;
    box.style.setProperty('--cw', cw + 'px');
    box.style.width = W + 'px';
    box.style.height = (spread.rows * (cw * 1.7 + labelH) + (spread.rows - 1) * gapY) + 'px';
    $$('#spread .slot').forEach((slot, i) => {
      const p = spread.pos[i];
      slot.style.left = (offX + p.x * (cw + gap)) + 'px';
      slot.style.top = (p.y * (cw * 1.7 + labelH + gapY)) + 'px';
    });
    return cw;
  }

  function buildSlots(spread, compact) {
    state.tableSpread = spread;
    $('#spread').innerHTML = spread.pos.map((p, i) => `<div class="slot" data-i="${i}">
      <div class="slot-frame">${i + 1}</div><div class="slot-label">${p.n}</div></div>`).join('');
    state.compact = !!compact;
    layoutSpread(spread, compact);
  }

  /* ---------------- Веер ---------------- */
  // в веере вся колода — 78 карт, как на настоящем столе
  function fanGeometry() {
    const W = $('#deckZone').parentElement.clientWidth;
    const angle = W < 500 ? 96 : 80;
    const om = 5; // радиус дуги в высотах карты
    const halfA = angle / 2 * Math.PI / 180;
    const widthK = 2 * om * 1.7 * Math.sin(halfA) + 1;
    const fcw = Math.max(28, Math.min(64, (W - 8) / widthK, innerHeight / 16));
    const drop = om * 1.7 * (1 - Math.cos(halfA));
    return { fcw, count: DECK.length, angle, om, zoneH: fcw * (1.7 + .5 + drop + .3) };
  }

  async function shuffleAndFan(token, deckOrder) {
    const zone = $('#deckZone');
    const { fcw, count, angle, om, zoneH } = fanGeometry();
    zone.className = 'deck-zone';
    zone.style.setProperty('--fcw', fcw + 'px');
    zone.style.setProperty('--om', (om * 100) + '%');
    zone.style.height = zoneH + 'px';
    zone.innerHTML = '';
    const cards = [];
    for (let i = 0; i < count; i++) {
      const c = document.createElement('div');
      c.className = 'fan-card';
      c.dataset.k = i;
      c.innerHTML = `<div class="face back">${art.back()}</div>`;
      c.style.zIndex = i;
      zone.appendChild(c);
      cards.push(c);
    }
    // появление колоды
    cards.forEach((c, i) => c.animate([
      { transform: 'translateY(-160px) rotate(-20deg) scale(.6)', opacity: 0 },
      { transform: 'translateY(0) rotate(0) scale(1)', opacity: 1 }
    ], { duration: 700, delay: i * 6, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' }));
    await wait(700 + count * 6);
    if (token !== state.run) return null;

    // тасование: три «рифла» и снятие
    window.Taro.skyBoost = 1;
    const rounds = reduceMotion ? 0 : 3;
    for (let r = 0; r < rounds; r++) {
      const anims = cards.map((c, i) => {
        const dir = i % 2 ? 1 : -1;
        const dx = dir * fcw * (.75 + Math.random() * .25);
        return c.animate([
          { transform: 'translate(0,0) rotate(0)' },
          { transform: `translate(${dx}px, ${-6 - Math.random() * 10}px) rotate(${dir * (8 + Math.random() * 8)}deg)`, offset: .45 },
          { transform: `translate(${dx * .2}px, -2px) rotate(${dir * 2}deg)`, offset: .8 },
          { transform: 'translate(0,0) rotate(0)' }
        ], { duration: 640, delay: i * 3, easing: 'ease-in-out' });
      });
      setTimeout(() => cards.forEach(c => { c.style.zIndex = Math.floor(Math.random() * count); }), 330);
      await Promise.all(anims.map(a => a.finished.catch(() => { })));
      if (token !== state.run) return null;
    }
    window.Taro.skyBoost = 0;
    if (token !== state.run) return null;

    // снятие колоды — делает сам спрашивающий, как в живом гадании
    setStatus('Сними колоду — нажми на неё');
    zone.classList.add('cutting');
    await new Promise(resolve => zone.addEventListener('click', resolve, { once: true }));
    zone.classList.remove('cutting');
    if (token !== state.run) return null;
    const cutAt = 15 + Math.floor(reading.secureRandom() * (count - 30));
    const order = deckOrder.slice(cutAt).concat(deckOrder.slice(0, cutAt));
    setStatus('Колода снята');
    if (!reduceMotion) {
      const top = cards.slice(cutAt);
      await Promise.all(top.map(c => c.animate([
        { transform: 'translate(0,0)' }, { transform: `translate(0, ${-fcw * 1.3}px) rotate(4deg)`, offset: .4 },
        { transform: `translate(${fcw * 1.2}px, ${-fcw * .4}px) rotate(10deg)`, offset: .7 }, { transform: 'translate(0,0)' }
      ], { duration: 900, easing: 'ease-in-out' }).finished.catch(() => { })));
    }
    if (token !== state.run) return null;

    // раскрываем веер
    cards.forEach((c, i) => {
      c.style.zIndex = i;
      c.style.transitionDelay = (i * 8) + 'ms';
      c.style.setProperty('--rot', (-angle / 2 + angle * i / (count - 1)) + 'deg');
    });
    await wait(700 + count * 8);
    cards.forEach(c => { c.style.transitionDelay = '0ms'; });
    return cards.map((el, i) => ({ el, card: order[i] }));
  }

  function flyToSlot(fanEl, slot, cardData, reversed) {
    // start: { x, y, rot, s, vx, vy, fly } — центр карты на экране, поворот, масштаб, скорость взмаха
    const start = fanEl.nodeType ? fanStart(fanEl) : fanEl;
    return new Promise(resolve => {
      const sr = slot.querySelector('.slot-frame').getBoundingClientRect();
      const { w, h } = fanCardSize();
      const sx = start.x - w / 2, sy = start.y - h / 2;
      const tx = sr.left + sr.width / 2 - w / 2, ty = sr.top + sr.height / 2 - h / 2;
      const scale = sr.width / w;
      const fly = start.fly || makeFlyer();
      fly.getAnimations().forEach(a => a.cancel());
      fly.style.transition = 'none';
      let midX, midY, midRot;
      if (start.vx !== undefined) {
        // карта летит по инерции взмаха и заворачивает к своему месту
        midX = sx + Math.max(-260, Math.min(260, start.vx * 160));
        midY = Math.min(sy + Math.max(-320, Math.min(0, start.vy * 160)), ty + 30);
        midRot = start.rot + start.vx * 25;
      } else {
        midX = (sx + tx) / 2 + (Math.random() - .5) * 80;
        midY = Math.min(sy, ty) - 60;
        midRot = start.rot / 2 + 8;
      }
      fly.animate([
        { transform: `translate(${sx}px, ${sy}px) rotate(${start.rot}deg) scale(${start.s})` },
        { transform: `translate(${midX}px, ${midY}px) rotate(${midRot}deg) scale(${(start.s + scale) / 2 * 1.1})`, offset: .5 },
        { transform: `translate(${tx}px, ${ty}px) rotate(0deg) scale(${scale})` }
      ], { duration: reduceMotion ? 10 : (start.vx !== undefined ? 700 : 820), easing: 'cubic-bezier(.3,.1,.25,1)', fill: 'forwards' }).onfinish = () => {
        const el = cardEl(cardData, reversed, false);
        slot.appendChild(el);
        slot.querySelector('.slot-frame').style.visibility = 'hidden';
        fly.remove();
        const [cx, cy] = centerOf(el);
        burst(cx, cy, 12, 60);
        el.animate([{ transform: 'scale(1.06)' }, { transform: 'scale(1)' }], { duration: 300, easing: 'ease-out' });
        resolve(el);
      };
    });
  }

  function fanCardSize() {
    const fcw = parseFloat(getComputedStyle($('#deckZone')).getPropertyValue('--fcw'));
    return { w: fcw, h: fcw * 1.7 };
  }
  function makeFlyer() {
    const { w, h } = fanCardSize();
    const fly = document.createElement('div');
    fly.className = 'flyer';
    fly.style.cssText = `left:0;top:0;width:${w}px;height:${h}px;`;
    fly.innerHTML = `<div class="face back">${art.back()}</div>`;
    document.body.appendChild(fly);
    return fly;
  }
  function fanStart(fanEl) {
    const r = fanEl.getBoundingClientRect();
    fanEl.classList.add('taken');
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, rot: parseFloat(fanEl.style.getPropertyValue('--rot')) || 0, s: 1 };
  }

  /* ---------------- Жест: провести → зажать → взмахнуть ---------------- */
  function pickByGesture(zone, fan, need, onTake, token) {
    return new Promise(resolve => {
      const HOLD_MS = 380;
      let hover = null, pressing = false, holdTimer = 0, held = null, taken = 0, hintShown = false;

      const cardAt = (x, y) => {
        const el = document.elementFromPoint(x, y);
        const c = el && el.closest('.fan-card');
        return c && zone.contains(c) && !c.classList.contains('taken') ? c : null;
      };
      const setHover = el => {
        if (el === hover) return;
        if (hover) hover.classList.remove('hover', 'charging');
        hover = el;
        if (hover) { hover.classList.add('hover'); if (pressing) hover.classList.add('charging'); }
      };
      const armHold = e => {
        clearTimeout(holdTimer);
        if (!hover) return;
        hover.classList.add('charging');
        const target = hover;
        holdTimer = setTimeout(() => { if (pressing && hover === target) grab(target, e.clientX, e.clientY); }, HOLD_MS);
      };

      // вытянуть карту из колоды: она увеличивается и следует за пальцем
      const grab = (el, px, py) => {
        const { w, h } = fanCardSize();
        const start = fanStart(el);
        el.classList.remove('hover', 'charging');
        hover = null;
        const S = Math.min(2.6, Math.max(1.6, 120 / w));
        const lift = h * S * .45; // карта над пальцем, чтобы её было видно
        const fly = makeFlyer();
        fly.classList.add('held');
        held = { el, fly, S, lift, x: px, y: py - lift, rot: 0, samples: [{ t: performance.now(), x: px, y: py }] };
        fly.style.transform = `translate(${start.x - w / 2}px, ${start.y - h / 2}px) rotate(${start.rot}deg) scale(1)`;
        fly.getBoundingClientRect();
        fly.style.transition = 'transform .28s cubic-bezier(.2,1.4,.4,1)';
        place();
        setTimeout(() => { if (held && held.fly === fly) fly.style.transition = 'transform .06s linear'; }, 290);
        if (navigator.vibrate) { try { navigator.vibrate(18); } catch (err) { /* ignore */ } }
        burst(start.x, start.y, 10, 50);
        setStatus('Взмахни картой вверх — она ляжет на стол');
      };
      const place = () => {
        const { w, h } = fanCardSize();
        held.fly.style.transform = `translate(${held.x - w / 2}px, ${held.y - h / 2}px) rotate(${held.rot}deg) scale(${held.S})`;
      };
      function down(e) {
        if (token !== state.run || taken >= need) return;
        pressing = true;
        try { zone.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        setHover(cardAt(e.clientX, e.clientY));
        armHold(e);
        e.preventDefault();
      }
      function move(e) {
        if (held) {
          const tilt = Math.max(-18, Math.min(18, (e.clientX - held.x) * .6));
          held.x = e.clientX; held.y = e.clientY - held.lift; held.rot = tilt;
          held.samples.push({ t: performance.now(), x: e.clientX, y: e.clientY });
          if (held.samples.length > 12) held.samples.shift();
          place();
          return;
        }
        const el = cardAt(e.clientX, e.clientY);
        if (el !== hover) { setHover(el); if (pressing) armHold(e); }
      }
      function up() {
        clearTimeout(holdTimer);
        const wasPressing = pressing;
        pressing = false;
        if (held) {
          const h0 = held;
          const now = performance.now();
          const pts = h0.samples.filter(p => now - p.t < 110);
          let v = { vx: 0, vy: 0 };
          if (pts.length >= 2) { const a = pts[0], b = pts[pts.length - 1], dt = Math.max(16, b.t - a.t); v = { vx: (b.x - a.x) / dt, vy: (b.y - a.y) / dt }; }
          releaseWith(v);
        } else if (wasPressing && hover && !hintShown) {
          hintShown = true;
          toast('Зажми карту, пока она не поднимется, и взмахни вверх');
        }
        if (hover) hover.classList.remove('charging');
      }
      function releaseWith(v) {
        const h0 = held;
        held = null;
        const zoneTop = zone.getBoundingClientRect().top;
        const flick = v.vy < -0.45 || (h0.y + h0.lift < zoneTop - 30 && v.vy < 0.2);
        if (flick && taken < need) {
          taken++;
          h0.fly.classList.remove('held');
          onTake(fan.find(f => f.el === h0.el), { x: h0.x, y: h0.y, rot: h0.rot, s: h0.S, vx: v.vx, vy: Math.min(v.vy, -0.3), fly: h0.fly });
          if (taken >= need) finish();
          else setStatus(`Хорошо. Осталось вытянуть: ${need - taken}`);
        } else {
          // без взмаха карта возвращается в колоду
          const r = h0.el.getBoundingClientRect();
          const { w, h } = fanCardSize();
          const rot = parseFloat(h0.el.style.getPropertyValue('--rot')) || 0;
          h0.fly.style.transition = 'transform .35s cubic-bezier(.4,0,.2,1)';
          h0.fly.style.transform = `translate(${r.left + r.width / 2 - w / 2}px, ${r.top + r.height / 2 - h / 2}px) rotate(${rot}deg) scale(1)`;
          setTimeout(() => { h0.fly.remove(); h0.el.classList.remove('taken'); }, 360);
          setStatus('Не хватило взмаха — зажми карту и резко веди вверх');
        }
      }
      function leave() { if (!pressing && !held) setHover(null); }
      function finish() {
        zone.classList.remove('picking');
        zone.removeEventListener('pointerdown', down);
        zone.removeEventListener('pointermove', move);
        zone.removeEventListener('pointerup', up);
        zone.removeEventListener('pointercancel', up);
        zone.removeEventListener('pointerleave', leave);
        setHover(null);
        resolve();
      }
      zone.oncontextmenu = e => e.preventDefault(); // долгое нажатие не открывает меню
      zone.addEventListener('pointerdown', down);
      zone.addEventListener('pointermove', move);
      zone.addEventListener('pointerup', up);
      zone.addEventListener('pointercancel', up);
      zone.addEventListener('pointerleave', leave);
    });
  }

  /* ---------------- Ход ритуала ---------------- */
  function setStatus(html) {
    const s = $('#status');
    s.style.opacity = 0;
    setTimeout(() => { s.innerHTML = html; s.style.opacity = 1; }, 200);
  }

  async function startReading() {
    const silent = true; // вопрос задаётся мысленно или вслух
    const question = '';
    stopSpeak();
    const token = ++state.run;
    const spread = state.spread;
    const pickSelf = true;
    const allowRev = true;
    const order = reading.shuffled();

    show('screenTable');
    $('#qEcho').textContent = '✦ Держи вопрос в мыслях ✦';
    $('#reading').innerHTML = '';
    buildSlots(spread, true);
    setStatus(silent ? 'Держите вопрос в мыслях — тасую колоду<span class="dots"></span>' : 'Тасую колоду<span class="dots"></span>');

    await wait(400);
    const fan = await shuffleAndFan(token, order);
    if (!fan || token !== state.run) return;

    const draws = [];
    const zone = $('#deckZone');
    const slots = $$('#spread .slot');
    const markNext = () => slots.forEach((s, i) => s.classList.toggle('next', i === draws.length));
    markNext();

    const takeCard = async (item, start) => {
      const posIndex = draws.length;
      const reversed = allowRev && reading.secureRandom() < 0.5;
      const d = { card: item.card, reversed, posIndex };
      draws.push(d);
      markNext();
      d.el = await flyToSlot(start || item.el, slots[posIndex], item.card, reversed);
    };

    const need = spread.pos.length;
    if (pickSelf) {
      setStatus('Проведи по колоде, зажми карту и взмахни ею вверх');
      zone.classList.add('picking');
      const flights = [];
      await pickByGesture(zone, fan, need, (item, start) => flights.push(takeCard(item, start)), token);
      await Promise.all(flights);
    } else {
      setStatus('Колода сама выбирает карты<span class="dots"></span>');
      const avail = fan.slice();
      for (let i = 0; i < need; i++) {
        const k = Math.floor(reading.secureRandom() * avail.length);
        const item = avail.splice(k, 1)[0];
        item.el.classList.add('hover');
        await wait(450);
        if (token !== state.run) return;
        item.el.classList.remove('hover');
        await takeCard(item);
      }
    }
    if (token !== state.run) return;
    slots.forEach(s => s.classList.remove('next'));

    // убрать веер
    fan.forEach((f, i) => {
      if (!f.el.classList.contains('taken')) {
        f.el.animate([{ opacity: 1 }, { transform: `translateY(${60 + Math.random() * 40}px) rotate(${(Math.random() - .5) * 30}deg)`, opacity: 0 }],
          { duration: 600, delay: i * 15, fill: 'forwards', easing: 'ease-in' });
      }
    });
    await wait(700);
    zone.classList.add('gone');
    zone.style.height = '';
    state.compact = false;
    scrollTo({ top: 0, behavior: 'smooth' });
    layoutSpread(spread, false); // карты плавно увеличиваются
    await wait(750);
    if (token !== state.run) return;

    // переворот
    for (const d of draws) {
      setStatus(`Открываю: ${spread.pos[d.posIndex].n.toLowerCase()}`);
      await wait(reduceMotion ? 50 : 520);
      if (token !== state.run) return;
      d.el.classList.add('flipped');
      await wait(reduceMotion ? 50 : 480);
      d.el.classList.add('glow');
      const [cx, cy] = centerOf(d.el);
      burst(cx, cy, 26, 110);
      d.el.addEventListener('click', () => openModal(d, spread));
    }
    if (token !== state.run) return;
    setStatus('Карты открыты. Читаю расклад…');
    await wait(600);

    const result = buildResult(draws, spread, question, silent);
    state.current = result;
    saveHistory(result);
    await renderReading(result, token, true);
    setStatus('');
  }
  $('#go').addEventListener('click', startReading);

  function buildResult(draws, spread, question, silent) {
    const theme = reading.detectTheme(question);
    const items = draws.map(d => ({ id: d.card.id, reversed: d.reversed, posIndex: d.posIndex, ...reading.cardText(d, spread, theme) }));
    const sum = reading.summarize(draws, spread, question, silent);
    return { date: Date.now(), question, silent, spreadId: spread.id, items, summary: sum };
  }

  /* ---------------- Толкование ---------------- */
  async function typeInto(el, text, token) {
    if (reduceMotion) { el.textContent = text; return; }
    el.classList.add('typing');
    for (let i = 0; i <= text.length; i += 3) {
      if (token !== state.run) return;
      if (state.skipTyping) { el.textContent = text; break; }
      el.textContent = text.slice(0, i);
      await wait(14);
    }
    el.textContent = text;
    el.classList.remove('typing');
  }

  async function renderReading(res, token, animate) {
    const spread = SPREADS.find(s => s.id === res.spreadId);
    const box = $('#reading');
    box.innerHTML = '';
    state.skipTyping = !animate;
    res.items.forEach((it, i) => {
      const card = BY_ID[it.id];
      const pos = spread.pos[it.posIndex];
      const div = document.createElement('article');
      div.className = 'r-item';
      div.style.animationDelay = (animate ? i * 180 : 0) + 'ms';
      div.innerHTML = `<div class="r-thumb ${it.reversed ? 'rev' : ''}">${art.front(card)}</div>
        <div><div class="r-pos">${i + 1}. ${pos.n} · ${pos.d}</div>
        <div class="r-name">${card.name}${it.reversed ? '<em>перевёрнута</em>' : ''}</div>
        <div class="chips">${card.keywords.split(',').map(k => `<span>${k.trim()}</span>`).join('')}</div>
        <p class="r-text">${it.base}</p>${it.extra ? `<p class="r-extra">${it.extra}</p>` : ''}</div>`;
      div.addEventListener('click', () => openModal({ card, reversed: it.reversed, posIndex: it.posIndex }, spread));
      box.appendChild(div);
    });
    if (animate) {
      await wait(150);
      box.scrollIntoView({ behavior: 'smooth', block: 'start' });
      await wait(res.items.length * 180 + 600);
    }
    if (token !== state.run) return;

    const s = res.summary;
    const sum = document.createElement('section');
    sum.className = 'summary';
    const vClass = !s.verdict ? '' : /нет/i.test(s.verdict) ? 'neg' : /неясно/i.test(s.verdict) ? 'mid' : '';
    sum.innerHTML = `<h2>Разбор расклада</h2>
      ${s.verdict ? `<div class="verdict ${vClass}">✦ ${s.verdict}</div>` : ''}
      <div class="sum-text">${s.paragraphs.map(() => '<p></p>').join('')}</div>
      <div class="advice" style="opacity:0"><small>Совет карт</small>${s.advice}</div>`;
    box.appendChild(sum);
    sum.addEventListener('click', () => { state.skipTyping = true; });
    const ps = sum.querySelectorAll('.sum-text p');
    for (let i = 0; i < s.paragraphs.length; i++) {
      await typeInto(ps[i], s.paragraphs[i], token);
      if (token !== state.run) return;
    }
    const adv = sum.querySelector('.advice');
    adv.style.opacity = 1;
    if (animate) {
      adv.animate([{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }], { duration: 700, easing: 'ease-out' });
      const [cx, cy] = centerOf(adv);
      burst(cx, cy, 30, 140);
    }

    const actions = document.createElement('div');
    actions.className = 'actions';
    actions.innerHTML = `
      <button class="btn-ghost" id="aSpeak"><svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Озвучить</span></button>
      <button class="btn-ghost" id="aCopy"><svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>Поделиться</button>
      <button class="btn-ghost" id="aNew"><svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>Новый вопрос</button>`;
    box.appendChild(actions);
    const disc = document.createElement('p');
    disc.className = 'disclaimer';
    disc.textContent = 'Расклад — повод для размышления, а не руководство к действию. Важные решения принимайте сами.';
    box.appendChild(disc);
    $('#aSpeak').addEventListener('click', () => speak(res));
    $('#aCopy').addEventListener('click', () => share(res));
    $('#aNew').addEventListener('click', () => { state.run++; stopSpeak(); show('screenAsk'); });
  }

  function plainText(res) {
    const spread = SPREADS.find(s => s.id === res.spreadId);
    const lines = [`🔮 Таролог · ${spread.name}`, res.silent ? 'Вопрос загадан про себя' : `Вопрос: ${res.question}`, ''];
    res.items.forEach((it, i) => {
      const c = BY_ID[it.id];
      lines.push(`${i + 1}. ${spread.pos[it.posIndex].n}: ${c.name}${it.reversed ? ' (перевёрнута)' : ''}`);
      lines.push(it.base);
    });
    lines.push('', 'Разбор:');
    if (res.summary.verdict) lines.push('Ответ: ' + res.summary.verdict);
    lines.push(...res.summary.paragraphs, '', 'Совет: ' + res.summary.advice);
    return lines.join('\n');
  }
  async function share(res) {
    const text = plainText(res);
    if (navigator.share) { try { await navigator.share({ title: 'Мой расклад Таро', text }); return; } catch (e) { if (e.name === 'AbortError') return; } }
    try { await navigator.clipboard.writeText(text); toast('Расклад скопирован'); } catch (e) { toast('Не удалось скопировать'); }
  }

  /* ---------------- Озвучка ---------------- */
  function stopSpeak() {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    const b = $('#aSpeak span'); if (b) b.textContent = 'Озвучить';
  }
  function speak(res) {
    if (!('speechSynthesis' in window)) return toast('Озвучка недоступна в этом браузере');
    if (speechSynthesis.speaking) return stopSpeak();
    const spread = SPREADS.find(s => s.id === res.spreadId);
    const parts = res.items.map(it => `${spread.pos[it.posIndex].n}. ${BY_ID[it.id].name}${it.reversed ? ', в перевёрнутом положении' : ''}. ${it.base}`);
    if (res.summary.verdict) parts.push('Ответ карт: ' + res.summary.verdict + '.');
    parts.push(...res.summary.paragraphs, 'Совет карт: ' + res.summary.advice);
    const voices = speechSynthesis.getVoices().filter(v => /^ru/i.test(v.lang));
    const voice = voices.find(v => /female|milena|алёна|алена|irina|google/i.test(v.name)) || voices[0];
    parts.forEach((p, i) => {
      const u = new SpeechSynthesisUtterance(p);
      u.lang = 'ru-RU'; u.rate = .95; u.pitch = 1;
      if (voice) u.voice = voice;
      if (i === parts.length - 1) u.onend = stopSpeak;
      speechSynthesis.speak(u);
    });
    $('#aSpeak span').textContent = 'Остановить';
  }

  /* ---------------- Модалка карты ---------------- */
  function openModal(d, spread) {
    const { card, reversed } = d;
    const pos = spread.pos[d.posIndex];
    $('#modalCard').className = 'modal-card' + (reversed ? ' rev' : '');
    $('#modalCard').innerHTML = art.front(card);
    const arcana = card.arcana === 'major' ? `Старший Аркан ${card.numeral}` : `Младший Аркан · ${reading.SUITS[card.suit].name} · ${reading.SUITS[card.suit].element}`;
    $('#modalText').innerHTML = `<div class="r-pos">${pos ? pos.n + ' · ' : ''}${arcana}</div>
      <h3>${card.name}</h3>
      <div class="chips">${card.keywords.split(',').map(k => `<span>${k.trim()}</span>`).join('')}</div>
      <h4>${reversed ? 'Перевёрнутое положение — ваша карта' : 'Прямое положение — ваша карта'}</h4>
      <p>${reversed ? card.rev : card.up}</p>
      <h4>${reversed ? 'В прямом положении' : 'В перевёрнутом положении'}</h4>
      <p class="muted">${reversed ? card.up : card.rev}</p>
      <h4>Совет</h4><p><i>${card.advice}</i></p>`;
    $('#modal').classList.add('open');
    $('#modal').setAttribute('aria-hidden', 'false');
  }
  function closeOverlays() {
    $$('.modal, .drawer').forEach(m => { m.classList.remove('open'); m.setAttribute('aria-hidden', 'true'); });
  }
  document.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeOverlays(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeOverlays(); });

  /* ---------------- История ---------------- */
  const HKEY = 'taro.history.v1';
  function loadHistory() { try { return JSON.parse(localStorage.getItem(HKEY)) || []; } catch (e) { return []; } }
  function saveHistory(res) {
    try { const h = loadHistory(); h.unshift(res); localStorage.setItem(HKEY, JSON.stringify(h.slice(0, 30))); } catch (e) { /* ignore */ }
  }
  function renderHistory() {
    const h = loadHistory();
    const list = $('#historyList');
    if (!h.length) { list.innerHTML = '<p class="muted">Здесь будут ваши расклады.</p>'; return; }
    list.innerHTML = h.map((r, i) => {
      const sp = SPREADS.find(s => s.id === r.spreadId);
      const date = new Date(r.date).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
      return `<button class="h-item" data-i="${i}"><b>${r.silent ? '✦ Загадано про себя' : r.question}</b>
        <small>${sp ? sp.name : ''} · ${date}${r.summary.verdict ? ' · ' + r.summary.verdict : ''}</small>
        <div class="h-cards">${r.items.map(it => `<div class="${it.reversed ? 'r-thumb rev' : ''}" style="width:26px;height:44px">${art.front(BY_ID[it.id])}</div>`).join('')}</div></button>`;
    }).join('');
  }
  $('#openHistory').addEventListener('click', () => { renderHistory(); $('#drawer').classList.add('open'); $('#drawer').setAttribute('aria-hidden', 'false'); });
  $('#historyList').addEventListener('click', e => {
    const b = e.target.closest('.h-item');
    if (!b) return;
    const res = loadHistory()[+b.dataset.i];
    closeOverlays();
    reopen(res);
  });
  $('#clearHistory').addEventListener('click', () => { try { localStorage.removeItem(HKEY); } catch (e) { /* ignore */ } renderHistory(); toast('История очищена'); });

  function reopen(res) {
    const token = ++state.run;
    stopSpeak();
    const spread = SPREADS.find(s => s.id === res.spreadId);
    show('screenTable');
    $('#qEcho').textContent = res.silent ? '✦ Вопрос загадан про себя ✦' : '«' + res.question + '»';
    $('#status').textContent = new Date(res.date).toLocaleString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    $('#deckZone').className = 'deck-zone gone';
    $('#deckZone').innerHTML = '';
    buildSlots(spread);
    const slots = $$('#spread .slot');
    res.items.forEach((it, i) => {
      const card = BY_ID[it.id];
      const el = cardEl(card, it.reversed, false);
      slots[it.posIndex].appendChild(el);
      slots[it.posIndex].querySelector('.slot-frame').style.visibility = 'hidden';
      setTimeout(() => el.classList.add('flipped'), 300 + i * 200);
      el.addEventListener('click', () => openModal({ card, reversed: it.reversed, posIndex: it.posIndex }, spread));
    });
    state.current = res;
    renderReading(res, token, false);
  }

  addEventListener('resize', () => {
    if ($('#screenTable').classList.contains('active')) {
      if (state.tableSpread) layoutSpread(state.tableSpread, state.compact);
    }
  });

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { }));
  }
})();
