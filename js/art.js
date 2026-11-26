/* Авторский стиль «Звёздная гравюра»: все карты рисуются кодом в SVG. */
(function () {
  'use strict';

  let uid = 0;
  const GOLD = '#e9c97a';
  const LIGHT = '#fbefc8';

  const PALETTE = {
    major: [['#2a1650', '#0c0820'], ['#3a1240', '#110618'], ['#162452', '#080c22'], ['#2b1a5a', '#0e0a24']],
    wands: ['#4a1a12', '#170806', '#ff9a52'],
    cups: ['#0f3247', '#05131d', '#7fd6f0'],
    swords: ['#2c2f4d', '#0b0c18', '#c9cff5'],
    pentacles: ['#173a26', '#06140c', '#b9e39a']
  };
  const MAJOR_ACCENTS = ['#ffd27a', '#ffb36b', '#c7b8ff', '#ffc2d1', '#ff9f80', '#f5d28c', '#ff9fc0',
    '#9fd0ff', '#ffb070', '#b3c4ff', '#ffd27a', '#cfe8ff', '#a6f0d6', '#e0d0ff', '#9ff0e0',
    '#ff7a7a', '#ffb070', '#bfe6ff', '#d7d0ff', '#ffdf70', '#ffc88a', '#a8f0c0'];

  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function hash(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

  const f = n => Math.round(n * 100) / 100;

  function starPts(cx, cy, R, r, n, rot = -90) {
    const pts = [];
    for (let i = 0; i < n * 2; i++) {
      const a = (rot + i * 180 / n) * Math.PI / 180;
      const rr = i % 2 ? r : R;
      pts.push(f(cx + Math.cos(a) * rr) + ',' + f(cy + Math.sin(a) * rr));
    }
    return pts.join(' ');
  }
  const star = (cx, cy, R, r, n, attrs, rot) => `<polygon points="${starPts(cx, cy, R, r, n, rot)}" ${attrs}/>`;

  function rays(cx, cy, r1, r2, n, attrs, off = 0) {
    let s = '';
    for (let i = 0; i < n; i++) {
      const a = (off + i * 360 / n) * Math.PI / 180;
      s += `<line x1="${f(cx + Math.cos(a) * r1)}" y1="${f(cy + Math.sin(a) * r1)}" x2="${f(cx + Math.cos(a) * r2)}" y2="${f(cy + Math.sin(a) * r2)}" ${attrs}/>`;
    }
    return s;
  }
  const spin = (cx, cy, dur, dir = 1) =>
    `<animateTransform attributeName="transform" type="rotate" from="0 ${cx} ${cy}" to="${360 * dir} ${cx} ${cy}" dur="${dur}s" repeatCount="indefinite"/>`;
  const pulse = (attr, vals, dur) => `<animate attributeName="${attr}" values="${vals}" dur="${dur}s" repeatCount="indefinite"/>`;

  /* ---------- символы мастей ---------- */
  function wand(cx, cy, s, c) {
    return `<g transform="translate(${cx} ${cy}) scale(${s / 40})">
      <line x1="0" y1="38" x2="0" y2="-26" stroke="${c}" stroke-width="4" stroke-linecap="round"/>
      <path d="M0,-44 C8,-34 7,-26 0,-22 C-7,-26 -8,-34 0,-44Z" fill="${c}"/>
      <path d="M0,-4 C10,-10 14,-6 16,-2 C10,0 5,-1 0,-4Z" fill="${c}" opacity=".85"/>
      <path d="M0,14 C-10,8 -14,12 -16,16 C-10,18 -5,17 0,14Z" fill="${c}" opacity=".85"/>
      <circle cx="0" cy="38" r="3" fill="${c}"/></g>`;
  }
  function cup(cx, cy, s, c) {
    return `<g transform="translate(${cx} ${cy}) scale(${s / 40})">
      <path d="M-22,-30 L22,-30 C22,-4 12,8 0,8 C-12,8 -22,-4 -22,-30Z" fill="none" stroke="${c}" stroke-width="3.5"/>
      <path d="M-17,-22 C-6,-17 6,-27 17,-22" fill="none" stroke="${c}" stroke-width="2" opacity=".7"/>
      <line x1="0" y1="8" x2="0" y2="28" stroke="${c}" stroke-width="3.5"/>
      <circle cx="0" cy="17" r="3.2" fill="${c}"/>
      <path d="M-15,36 C-10,28 10,28 15,36Z" fill="${c}"/></g>`;
  }
  function sword(cx, cy, s, c) {
    return `<g transform="translate(${cx} ${cy}) scale(${s / 40})">
      <path d="M0,-46 L5,-36 L5,18 L-5,18 L-5,-36Z" fill="none" stroke="${c}" stroke-width="3"/>
      <line x1="0" y1="-38" x2="0" y2="14" stroke="${c}" stroke-width="1.2" opacity=".7"/>
      <path d="M-18,18 Q0,26 18,18 L18,22 Q0,30 -18,22Z" fill="${c}"/>
      <line x1="0" y1="24" x2="0" y2="38" stroke="${c}" stroke-width="4"/>
      <circle cx="0" cy="42" r="4" fill="${c}"/></g>`;
  }
  function pentacle(cx, cy, s, c) {
    return `<g transform="translate(${cx} ${cy}) scale(${s / 40})">
      <circle r="30" fill="none" stroke="${c}" stroke-width="3.5"/>
      <circle r="24" fill="none" stroke="${c}" stroke-width="1" opacity=".6"/>
      ${star(0, 0, 22, 8.4, 5, `fill="none" stroke="${c}" stroke-width="2.4" stroke-linejoin="round"`)}
      <circle r="3" fill="${c}"/></g>`;
  }
  const SUIT_FN = { wands: wand, cups: cup, swords: sword, pentacles: pentacle };

  /* ---------- Старшие Арканы ---------- */
  const S = `fill="none" stroke="${GOLD}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"`;
  const T = `fill="none" stroke="${GOLD}" stroke-width="1.2" stroke-linecap="round"`;
  const FG = `fill="${GOLD}"`;

  function spiral(cx, cy, turns, scale) {
    let d = '';
    for (let i = 0; i <= turns * 40; i++) {
      const t = i / 40 * Math.PI * 2, r = scale * t;
      d += (i ? 'L' : 'M') + f(cx + Math.cos(t) * r) + ',' + f(cy + Math.sin(t) * r);
    }
    return d;
  }
  const lemn = (cx, cy, w) => `M${cx - w},${cy} C${cx - w},${cy - w * .7} ${cx - 4},${cy - w * .7} ${cx},${cy} C${cx + 4},${cy + w * .7} ${cx + w},${cy + w * .7} ${cx + w},${cy} C${cx + w},${cy - w * .7} ${cx + 4},${cy - w * .7} ${cx},${cy} C${cx - 4},${cy + w * .7} ${cx - w},${cy + w * .7} ${cx - w},${cy}Z`;

  function key(x, y, rot) {
    return `<g transform="translate(${x} ${y}) rotate(${rot})"><circle cx="0" cy="-26" r="8" ${S}/><circle cx="0" cy="-26" r="3" ${FG}/>
      <line x1="0" y1="-18" x2="0" y2="26" ${S}/><path d="M0,16 h8 v4 h-8 M0,24 h10 v4 h-10" ${S}/></g>`;
  }
  function tower(x, y, w, h) {
    return `<path d="M${x - w / 2},${y} L${x - w / 2},${y - h} L${x + w / 2},${y - h} L${x + w / 2},${y}" ${S}/>
      <path d="M${x - w / 2 - 2},${y - h} h${w / 4 + 1} v-5 h${w / 4} v5 h${w / 4} v-5 h${w / 4 + 1} v5" ${T}/>
      <rect x="${x - 2}" y="${y - h + 10}" width="4" height="7" ${FG}/>`;
  }

  const MAJOR_ART = [
    // 0 Шут
    a => `<path d="${spiral(100, 165, 3.2, 3.4)}" ${S}/>${star(150, 92, 12, 3, 4, FG)}
      <circle cx="58" cy="95" r="14" ${S}/><circle cx="58" cy="95" r="6" fill="${a}"/>
      <path d="M118,250 L150,232 L160,250" ${S}/><path d="M40,250 L118,250" ${T}/>
      <circle cx="100" cy="165" r="5" fill="${a}">${pulse('r', '4;7;4', 2.5)}</circle>`,
    // I Маг
    a => `<path d="${lemn(100, 92, 28)}" ${S}>${pulse('stroke-opacity', '1;.5;1', 3)}</path>
      <line x1="100" y1="118" x2="100" y2="215" ${S}/><circle cx="100" cy="114" r="6" fill="${a}"/>
      ${rays(100, 114, 12, 20, 8, T)}
      <path d="M58,170 L80,150 M142,170 L120,150" ${T}/>
      <circle cx="46" cy="245" r="10" ${S}/><path d="M76,255 L88,235 L100,255Z" ${S}/>
      <rect x="112" y="236" width="18" height="18" ${S}/><path d="M154,234 v22 M146,242 h16" ${S}/>`,
    // II Жрица
    a => `<rect x="44" y="88" width="16" height="160" ${S}/><rect x="140" y="88" width="16" height="160" ${S}/>
      <rect x="40" y="80" width="24" height="8" ${FG}/><rect x="136" y="80" width="24" height="8" ${FG}/>
      <path d="M100,108 m-30,0 a30,30 0 1,0 60,0 a24,24 0 1,1 -60,0Z" fill="${a}" opacity=".9"/>
      <path d="M68,160 Q84,150 100,160 T132,160 M68,176 Q84,166 100,176 T132,176" ${T}/>
      <rect x="84" y="200" width="32" height="22" rx="3" ${S}/><path d="M90,208 h20 M90,214 h14" ${T}/>
      <circle cx="100" cy="140" r="2.5" ${FG}>${pulse('opacity', '1;.2;1', 2)}</circle>`,
    // III Императрица
    a => { let st = ''; for (let i = 0; i < 12; i++) { const t = (200 + i * 140 / 11) * Math.PI / 180; st += star(100 + Math.cos(t) * 66, 170 + Math.sin(t) * 66, 5, 2, 5, FG); }
      return st + `<circle cx="100" cy="150" r="30" ${S}/><circle cx="100" cy="150" r="16" fill="${a}" opacity=".8"/>
      <path d="M100,180 v44 M80,204 h40" ${S}/>
      <path d="M46,250 Q50,214 58,196 M58,196 l-7,6 M58,206 l-8,6 M56,216 l-8,6 M154,250 Q150,214 142,196 M142,196 l7,6 M142,206 l8,6 M144,216 l8,6" ${T}/>`; },
    // IV Император
    a => `<path d="M100,110 L148,136 L148,196 L100,222 L52,196 L52,136Z" ${S}/>
      <path d="M52,136 L100,162 L148,136 M100,162 V222" ${S}/>
      <path d="M68,108 C50,98 46,76 64,74 C76,74 76,90 66,90" ${S}/><path d="M132,108 C150,98 154,76 136,74 C124,74 124,90 134,90" ${S}/>
      <path d="M84,98 L88,82 L95,92 L100,76 L105,92 L112,82 L116,98Z" fill="${a}"/>
      <path d="M30,250 L60,226 L82,244 L110,218 L170,250" ${T}/>`,
    // V Иерофант
    a => `<line x1="100" y1="80" x2="100" y2="200" ${S}/><path d="M86,96 h28 M80,112 h40 M74,128 h52" ${S}/>
      <circle cx="100" cy="80" r="5" fill="${a}"/>${rays(100, 80, 9, 16, 12, T)}
      ${key(78, 228, -32)}${key(122, 228, 32)}
      <path d="M50,196 Q100,176 150,196" ${T}/>`,
    // VI Влюблённые
    a => `<circle cx="80" cy="182" r="38" ${S}/><circle cx="120" cy="182" r="38" ${S}/>
      <path d="M100,160 C108,150 120,160 100,180 C80,160 92,150 100,160Z" fill="${a}">${pulse('opacity', '1;.55;1', 1.6)}</path>
      <circle cx="100" cy="94" r="14" ${FG}/><g>${rays(100, 94, 19, 28, 16, T)}${spin(100, 94, 30)}</g>
      <path d="M58,100 Q72,82 82,96 M142,100 Q128,82 118,96" ${S}/>
      <path d="M48,244 h104" ${T}/>`,
    // VII Колесница
    a => { let st = ''; for (let i = 0; i < 7; i++) st += star(52 + i * 16, 84, 4, 1.6, 5, FG);
      return st + `<path d="M44,94 Q100,110 156,94" ${T}/>
      <rect x="66" y="118" width="68" height="70" ${S}/><path d="M80,170 L100,132 L120,170" ${S}/><path d="M88,158 h24" ${T}/>
      <g>${['<circle cx="66" cy="222" r="20" ' + S + '/>', rays(66, 222, 0, 20, 6, T)].join('')}${spin(66, 222, 8)}</g>
      <g>${['<circle cx="134" cy="222" r="20" ' + S + '/>', rays(134, 222, 0, 20, 6, T)].join('')}${spin(134, 222, 8)}</g>
      <circle cx="40" cy="160" r="9" fill="${LIGHT}" opacity=".85"/><circle cx="160" cy="160" r="9" fill="#000" stroke="${GOLD}"/>`; },
    // VIII Сила
    a => `<path d="${lemn(100, 86, 22)}" ${S}/>
      ${star(100, 168, 50, 34, 18, `fill="${a}" opacity=".25" stroke="${GOLD}" stroke-width="1.4"`)}
      <circle cx="100" cy="168" r="28" ${S}/><path d="M88,162 h6 M106,162 h6 M94,180 Q100,186 106,180" ${S}/>
      <path d="M48,238 Q100,262 152,238" ${S}/>${[60, 80, 100, 120, 140].map((x, i) => `<circle cx="${x}" cy="${244 + (i === 2 ? 6 : i % 2 ? 4 : 0)}" r="4.5" fill="${a}"/>`).join('')}`,
    // IX Отшельник
    a => `<line x1="56" y1="96" x2="124" y2="250" ${S}/><path d="M118,98 L118,108" ${S}/>
      <path d="M104,108 h28 l6,12 v40 l-6,12 h-28 l-6,-12 v-40Z" ${S}/>
      ${star(118, 140, 15, 9, 6, `fill="${a}"`)}
      <circle cx="118" cy="140" r="30" fill="${a}" opacity=".15">${pulse('r', '24;36;24', 3)}</circle>
      <path d="M30,250 L74,196 L98,226 L130,186 L172,250" ${T}/>`,
    // X Колесо Фортуны
    a => `<g>${spin(100, 165, 40)}<circle cx="100" cy="165" r="66" ${S}/><circle cx="100" cy="165" r="44" ${S}/>
      ${rays(100, 165, 12, 66, 8, T)}${rays(100, 165, 66, 72, 24, T)}
      ${[0, 90, 180, 270].map(d => { const t = d * Math.PI / 180; return `<circle cx="${f(100 + Math.cos(t) * 55)}" cy="${f(165 + Math.sin(t) * 55)}" r="5" fill="${a}"/>`; }).join('')}</g>
      <circle cx="100" cy="165" r="12" fill="${a}"/>`,
    // XI Справедливость
    a => `<line x1="100" y1="76" x2="100" y2="250" ${S}/><path d="M92,250 h16" ${S}/>
      <path d="M86,92 h28" ${S}/><circle cx="100" cy="76" r="5" fill="${a}"/>
      <g><line x1="46" y1="120" x2="154" y2="120" ${S}/>
      <path d="M46,120 L30,178 M46,120 L62,178 M154,120 L138,178 M154,120 L170,178" ${T}/>
      <path d="M26,178 Q46,198 66,178Z" fill="${a}" opacity=".85"/><path d="M134,178 Q154,198 174,178Z" fill="${a}" opacity=".85"/>
      <animateTransform attributeName="transform" type="rotate" values="-4 100 120;4 100 120;-4 100 120" dur="5s" repeatCount="indefinite"/></g>`,
    // XII Повешенный
    a => `<path d="M50,82 h100 M62,82 v-8 M138,82 v-8" ${S}/><line x1="100" y1="82" x2="100" y2="104" ${S}/>
      <line x1="100" y1="104" x2="100" y2="186" ${S}/><path d="M100,128 L124,128 L124,104" ${S}/>
      <path d="M100,186 L80,166 M100,186 L120,166" ${S}/>
      <circle cx="100" cy="204" r="13" ${S}/><circle cx="100" cy="204" r="22" fill="${a}" opacity=".25"/>
      <g>${rays(100, 204, 24, 36, 12, T)}${spin(100, 204, 20, -1)}</g>`,
    // XIII Смерть
    a => `<path d="M30,226 h140" ${S}/>
      <path d="M70,226 a30,30 0 0,1 60,0" fill="${a}" opacity=".85"/><g>${rays(100, 226, 36, 50, 9, T, 180)}</g>
      ${tower(48, 226, 16, 40)}${tower(152, 226, 16, 40)}
      ${[0, 72, 144, 216, 288].map(d => { const t = (d - 90) * Math.PI / 180; return `<circle cx="${f(100 + Math.cos(t) * 14)}" cy="${f(130 + Math.sin(t) * 14)}" r="13" ${S}/>`; }).join('')}
      <circle cx="100" cy="130" r="7" fill="${a}"/><path d="M100,157 v36 M100,176 q12,-10 18,-4" ${S}/>
      <path d="M40,250 Q70,240 100,250 T160,250" ${T}/>`,
    // XIV Умеренность
    a => `<path d="M88,84 h24 v24 h-24Z" ${S}/><path d="M100,88 L109,104 L91,104Z" fill="${a}"/>
      ${cup(64, 138, 22, GOLD)}${cup(136, 196, 22, GOLD)}
      <path d="M72,126 C110,124 120,150 130,182" fill="none" stroke="${a}" stroke-width="2.5" stroke-dasharray="4 6">
        <animate attributeName="stroke-dashoffset" values="20;0" dur="1.2s" repeatCount="indefinite"/></path>
      <path d="M40,250 Q100,226 160,250" ${T}/><circle cx="150" cy="236" r="7" ${S}/>`,
    // XV Дьявол
    a => `<circle cx="100" cy="128" r="40" ${S}/>${star(100, 128, 36, 13.8, 5, `fill="none" stroke="${a}" stroke-width="2.2"`, 90)}
      <path d="M72,94 C60,78 62,62 70,56 M128,94 C140,78 138,62 130,56" ${S}/>
      <rect x="66" y="196" width="68" height="20" ${S}/>
      <path d="M78,216 v10 M122,216 v10" ${S}/><circle cx="72" cy="234" r="8" ${S}/><circle cx="128" cy="234" r="8" ${S}/>
      <circle cx="72" cy="252" r="6" ${FG}/><circle cx="128" cy="252" r="6" ${FG}/>
      <path d="M100,168 C108,176 106,186 100,190 C94,186 92,176 100,168Z" fill="${a}">${pulse('opacity', '1;.4;1', .9)}</path>`,
    // XVI Башня
    a => `<path d="M72,250 L78,118 L122,118 L128,250" ${S}/><path d="M72,250 h56" ${S}/>
      <rect x="92" y="140" width="16" height="22" rx="8" ${S}/><rect x="86" y="190" width="12" height="16" rx="6" ${T}/><rect x="104" y="208" width="12" height="16" rx="6" ${T}/>
      <g transform="rotate(24 130 104)"><path d="M112,110 L114,94 L121,102 L128,88 L135,102 L142,94 L144,110Z" fill="${a}"/></g>
      <path d="M42,64 L72,100 L60,104 L96,140" fill="none" stroke="${LIGHT}" stroke-width="3" stroke-linejoin="round">${pulse('opacity', '1;0;1;1;0;1', 2.2)}</path>
      ${[[50, 140], [150, 150], [40, 190], [160, 196], [56, 228]].map(([x, y]) => `<path d="M${x},${y - 7} l4,7 l-4,7 l-4,-7Z" fill="${a}"/>`).join('')}`,
    // XVII Звезда
    a => { let st = ''; const pos = [[50, 86], [150, 86], [42, 136], [158, 136], [60, 184], [140, 184], [100, 64]];
      pos.forEach(([x, y], i) => st += `<g>${star(x, y, 8, 2.5, 8, FG, 0)}${pulse('opacity', '1;.3;1', 1.5 + i * .3)}</g>`);
      return st + `<g>${star(100, 128, 40, 9, 8, `fill="${a}"`, 0)}${spin(100, 128, 60)}</g>${star(100, 128, 26, 6, 8, `fill="${LIGHT}"`, 22.5)}
      <path d="M30,228 Q50,218 70,228 T110,228 T150,228 T190,228 M30,244 Q50,234 70,244 T110,244 T150,244 T190,244" ${T}/>
      ${cup(72, 206, 13, GOLD)}<path d="M80,196 Q96,200 100,224" ${T}/>`; },
    // XVIII Луна
    a => `<g>${rays(100, 112, 40, 52, 32, T)}${spin(100, 112, 90, -1)}</g>
      <circle cx="100" cy="112" r="36" fill="${a}" opacity=".9"/><circle cx="114" cy="104" r="32" fill="#0b0920" opacity=".9"/>
      ${tower(42, 220, 18, 54)}${tower(158, 220, 18, 54)}
      <path d="M100,252 C80,236 120,222 100,206 C86,196 106,186 100,176" ${S} stroke-dasharray="3 5"/>
      <path d="M30,250 Q100,236 170,250" ${S}/>
      ${[[70, 160], [130, 166], [100, 172]].map(([x, y]) => `<path d="M${x},${y - 6} q4,6 0,10 q-4,-4 0,-10Z" ${FG}/>`).join('')}`,
    // XIX Солнце
    a => { let wr = ''; for (let i = 0; i < 12; i++) { const t = (i * 30 + 15) * Math.PI / 180; const x1 = 100 + Math.cos(t) * 44, y1 = 140 + Math.sin(t) * 44, x2 = 100 + Math.cos(t) * 66, y2 = 140 + Math.sin(t) * 66; wr += `<path d="M${f(x1)},${f(y1)} Q${f((x1 + x2) / 2 + Math.sin(t) * 6)},${f((y1 + y2) / 2 - Math.cos(t) * 6)} ${f(x2)},${f(y2)}" ${T}/>`; }
      return `<g>${rays(100, 140, 42, 70, 12, S)}${wr}${spin(100, 140, 50)}</g>
      <circle cx="100" cy="140" r="36" fill="${a}"/><circle cx="100" cy="140" r="26" fill="none" stroke="#5a2a00" stroke-opacity=".35" stroke-width="2"/>
      <path d="M30,238 h140 M30,238 v14 M170,238 v14" ${S}/>${[52, 100, 148].map(x => `${star(x, 228, 8, 4, 8, FG, 0)}<line x1="${x}" y1="236" x2="${x}" y2="250" ${T}/>`).join('')}`; },
    // XX Суд
    a => `<g>${rays(100, 66, 14, 54, 15, T, 20)}</g>
      <path d="M50,80 L120,140 L128,132 L60,72Z" fill="${a}"/><path d="M118,130 C134,126 142,140 132,150 Z" fill="${a}"/>
      <path d="M78,100 v26 h22 v-26 M89,104 v18 M80,113 h18" ${T}/>
      ${[56, 100, 144].map((x, i) => `<rect x="${x - 14}" y="${214 - i % 2 * 6}" width="28" height="34" rx="3" ${S}/>
        <circle cx="${x}" cy="${200 - i % 2 * 6}" r="8" ${S}><animate attributeName="cy" values="${206 - i % 2 * 6};${196 - i % 2 * 6};${206 - i % 2 * 6}" dur="${3 + i * .5}s" repeatCount="indefinite"/></circle>`).join('')}`,
    // XXI Мир
    a => `<ellipse cx="100" cy="165" rx="46" ry="70" fill="none" stroke="${a}" stroke-width="7" stroke-dasharray="2 5"/>
      <ellipse cx="100" cy="165" rx="38" ry="62" ${T}/>
      <path d="${lemn(100, 94, 10)}" ${S}/><path d="${lemn(100, 236, 10)}" ${S}/>
      <g>${star(100, 165, 22, 8, 8, `fill="${LIGHT}"`, 0)}${spin(100, 165, 24)}</g>
      <circle cx="40" cy="84" r="10" ${S}/><path d="M150,92 L160,74 L170,92Z" ${S}/>
      <rect x="30" y="236" width="18" height="18" ${S}/><path d="M152,236 a10,10 0 1,0 14,14 a12,12 0 0,1 -14,-14Z" ${FG}/>`
  ];

  /* ---------- Раскладка очков младших карт ---------- */
  const PIPS = {
    1: [[0, 0]], 2: [[0, -.6], [0, .6]], 3: [[0, -.72], [0, 0], [0, .72]],
    4: [[-.5, -.5], [.5, -.5], [-.5, .5], [.5, .5]],
    5: [[-.5, -.55], [.5, -.55], [0, 0], [-.5, .55], [.5, .55]],
    6: [[-.5, -.65], [.5, -.65], [-.5, 0], [.5, 0], [-.5, .65], [.5, .65]],
    7: [[-.5, -.7], [.5, -.7], [0, -.35], [-.5, 0], [.5, 0], [-.5, .7], [.5, .7]],
    8: [[-.5, -.72], [.5, -.72], [0, -.36], [-.5, 0], [.5, 0], [0, .36], [-.5, .72], [.5, .72]],
    9: [[-.5, -.78], [.5, -.78], [-.5, -.26], [.5, -.26], [0, 0], [-.5, .26], [.5, .26], [-.5, .78], [.5, .78]],
    10: [[-.5, -.78], [.5, -.78], [0, -.52], [-.5, -.26], [.5, -.26], [-.5, .26], [.5, .26], [0, .52], [-.5, .78], [.5, .78]]
  };

  function crown(type, c, a) {
    const y = 96;
    if (type === 11) return `${star(100, y, 12, 4, 5, `fill="${a}"`)}<circle cx="100" cy="${y}" r="20" fill="none" stroke="${c}" stroke-width="1.4"/>`;
    if (type === 12) return `<path d="M70,${y + 12} Q72,${y - 14} 100,${y - 18} Q128,${y - 14} 130,${y + 12}" fill="none" stroke="${c}" stroke-width="2.4"/>
      <path d="M78,${y - 2} L66,${y - 16} M122,${y - 2} L134,${y - 16} M86,${y - 10} L80,${y - 24} M114,${y - 10} L120,${y - 24}" stroke="${c}" stroke-width="2" stroke-linecap="round"/>
      <path d="M100,${y - 22} l8,10 l-8,10 l-8,-10Z" fill="${a}"/>`;
    if (type === 13) return `<path d="M100,${y + 8} m-24,0 a24,24 0 1,1 48,0" fill="none" stroke="${c}" stroke-width="2.4"/>
      <path d="M100,${y - 18} m-16,0 a16,16 0 1,0 32,0 a12,12 0 1,1 -32,0Z" fill="${a}"/>${star(100, y - 4, 5, 2, 5, `fill="${c}"`)}`;
    return `<path d="M72,${y + 14} L76,${y - 12} L88,${y + 2} L100,${y - 22} L112,${y + 2} L124,${y - 12} L128,${y + 14}Z" fill="none" stroke="${c}" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M72,${y + 20} h56" stroke="${c}" stroke-width="3"/>${[76, 100, 124].map((x, i) => `<circle cx="${x}" cy="${y - (i === 1 ? 26 : 16)}" r="4" fill="${a}"/>`).join('')}`;
  }

  function minorArt(card, accent, rnd) {
    const fn = SUIT_FN[card.suit];
    const r = card.rank;
    if (r === 1) {
      return `<g>${rays(100, 165, 46, 74, 24, `stroke="${accent}" stroke-opacity=".5" stroke-width="1.2"`)}${spin(100, 165, 70)}</g>
        <circle cx="100" cy="165" r="48" fill="${accent}" opacity=".12">${pulse('r', '44;54;44', 4)}</circle>
        <circle cx="100" cy="165" r="56" fill="none" stroke="${GOLD}" stroke-width="1" stroke-dasharray="2 4"/>
        ${fn(100, 165, 54, GOLD)}`;
    }
    if (r <= 10) {
      const pts = PIPS[r], sz = r <= 3 ? 30 : r <= 6 ? 24 : 19;
      let s = `<rect x="38" y="70" width="124" height="190" rx="62" fill="${accent}" opacity=".06"/>`;
      pts.forEach(([x, y], i) => {
        s += `<g>${fn(f(100 + x * 54), f(165 + y * 86), sz, i % 2 ? GOLD : accent)}${pulse('opacity', '1;.75;1', 3 + (rnd() * 2).toFixed(1))}</g>`;
      });
      return s;
    }
    // придворные
    return `<path d="M54,260 L54,120 Q54,70 100,62 Q146,70 146,120 L146,260" fill="${accent}" fill-opacity=".07" stroke="${GOLD}" stroke-width="1.4"/>
      <path d="M62,260 L62,124 Q62,80 100,72 Q138,80 138,124 L138,260" fill="none" stroke="${GOLD}" stroke-width=".8" stroke-dasharray="3 4"/>
      ${crown(r, GOLD, accent)}
      <circle cx="100" cy="182" r="40" fill="${accent}" opacity=".12"/>
      ${fn(100, 184, 44, GOLD)}
      <path d="M70,248 h60" stroke="${GOLD}" stroke-width="1.2"/>`;
  }

  /* ---------- Общая рамка ---------- */
  function sprinkle(rnd, n, color) {
    let s = '';
    for (let i = 0; i < n; i++) {
      const x = 22 + rnd() * 156, y = 52 + rnd() * 230, r = rnd() * 1.3 + .3;
      s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${color}" opacity="${f(.25 + rnd() * .6)}"/>`;
    }
    return s;
  }

  function corner(x, y, sx, sy) {
    return `<path d="M${x},${y + sy * 16} L${x},${y} L${x + sx * 16},${y}" fill="none" stroke="${GOLD}" stroke-width="1.5"/>
      <path d="M${x + sx * 5},${y + sy * 5} l${sx * 4},${sy * -4} l${sx * 4},${sy * 4} l${sx * -4},${sy * 4}Z" fill="${GOLD}"/>`;
  }

  function front(card) {
    const id = 'c' + (++uid);
    const rnd = rng(hash(card.id));
    let c1, c2, accent;
    if (card.arcana === 'major') {
      [c1, c2] = PALETTE.major[card.num % 4];
      accent = MAJOR_ACCENTS[card.num];
    } else {
      [c1, c2, accent] = PALETTE[card.suit];
    }
    const art = card.arcana === 'major' ? MAJOR_ART[card.num](accent) : minorArt(card, accent, rnd);
    const title = card.arcana === 'major' ? card.name : card.name.split(' ')[0];
    const sub = card.arcana === 'major' ? 'Старший Аркан' : card.name.split(' ').slice(1).join(' ');
    const L = title.length;
    const fs = L <= 7 ? 18 : L <= 9 ? 16 : L <= 11 ? 14 : 12;
    const fit = L > 12 ? ' textLength="132" lengthAdjust="spacingAndGlyphs"' : '';
    return `<svg class="card-svg" viewBox="0 0 200 340" xmlns="http://www.w3.org/2000/svg" aria-label="${card.name}">
      <defs>
        <radialGradient id="${id}g" cx="50%" cy="42%" r="75%"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></radialGradient>
        <radialGradient id="${id}h" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="${accent}" stop-opacity=".35"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient>
        <clipPath id="${id}c"><rect x="16" y="54" width="168" height="216"/></clipPath>
      </defs>
      <rect width="200" height="340" rx="14" fill="url(#${id}g)"/>
      ${sprinkle(rnd, 40, LIGHT)}
      <circle cx="100" cy="165" r="92" fill="url(#${id}h)"/>
      <rect x="7" y="7" width="186" height="326" rx="10" fill="none" stroke="${GOLD}" stroke-width="1.6"/>
      <rect x="13" y="13" width="174" height="314" rx="7" fill="none" stroke="${GOLD}" stroke-width=".6" stroke-opacity=".7"/>
      ${corner(18, 18, 1, 1)}${corner(182, 18, -1, 1)}${corner(18, 322, 1, -1)}${corner(182, 322, -1, -1)}
      <text x="100" y="42" text-anchor="middle" font-family="Cormorant Garamond, Georgia, serif" font-size="20" font-weight="700" fill="${GOLD}" letter-spacing="2" style="font-variant-numeric:lining-nums">${card.numeral}</text>
      <path d="M70,50 h60" stroke="${GOLD}" stroke-width=".8"/>
      <g clip-path="url(#${id}c)">${art}</g>
      <path d="M26,274 Q100,266 174,274 L174,312 Q100,304 26,312Z" fill="#000" fill-opacity=".38" stroke="${GOLD}" stroke-width="1"/>
      <text x="100" y="292" text-anchor="middle" font-family="Cormorant Garamond, Georgia, serif" font-size="${fs}" font-weight="700" fill="${LIGHT}" letter-spacing="1"${fit}>${title.toUpperCase()}</text>
      <text x="100" y="302" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-size="6.5" fill="${GOLD}" letter-spacing="2">${sub.toUpperCase()}</text>
      <circle cx="100" cy="320" r="2" fill="${GOLD}"/>
    </svg>`;
  }

  function back() {
    const id = 'b' + (++uid);
    let petals = '';
    for (let i = 0; i < 12; i++) petals += `<ellipse cx="100" cy="132" rx="9" ry="38" transform="rotate(${i * 30} 100 170)" fill="none" stroke="${GOLD}" stroke-width="1"/>`;
    return `<svg class="card-svg" viewBox="0 0 200 340" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="${id}g" cx="50%" cy="50%" r="70%"><stop offset="0" stop-color="#2d1b64"/><stop offset=".6" stop-color="#140c35"/><stop offset="1" stop-color="#07051a"/></radialGradient>
        <pattern id="${id}p" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M8,0 L16,8 L8,16 L0,8Z" fill="none" stroke="${GOLD}" stroke-opacity=".12" stroke-width=".8"/></pattern>
      </defs>
      <rect width="200" height="340" rx="14" fill="url(#${id}g)"/>
      <rect x="10" y="10" width="180" height="320" rx="8" fill="url(#${id}p)"/>
      <rect x="7" y="7" width="186" height="326" rx="10" fill="none" stroke="${GOLD}" stroke-width="1.6"/>
      <rect x="14" y="14" width="172" height="312" rx="7" fill="none" stroke="${GOLD}" stroke-width=".6"/>
      ${corner(20, 20, 1, 1)}${corner(180, 20, -1, 1)}${corner(20, 320, 1, -1)}${corner(180, 320, -1, -1)}
      <circle cx="100" cy="170" r="76" fill="none" stroke="${GOLD}" stroke-width="1.2"/>
      <circle cx="100" cy="170" r="70" fill="none" stroke="${GOLD}" stroke-width=".6" stroke-dasharray="1 4"/>
      ${petals}
      ${star(100, 170, 64, 50, 12, `fill="none" stroke="${GOLD}" stroke-width=".8" stroke-opacity=".6"`)}
      <circle cx="100" cy="170" r="26" fill="#0a0722" stroke="${GOLD}" stroke-width="1.4"/>
      <path d="M80,170 Q100,152 120,170 Q100,188 80,170Z" fill="none" stroke="${GOLD}" stroke-width="1.6"/>
      <circle cx="100" cy="170" r="6" fill="${GOLD}"/>
      ${star(100, 66, 9, 3, 4, `fill="${GOLD}"`)}${star(100, 274, 9, 3, 4, `fill="${GOLD}"`)}
      <path d="M100,40 m-12,0 a12,12 0 1,0 24,0 a9,9 0 1,1 -24,0Z" fill="${GOLD}" opacity=".8"/>
      <path d="M100,300 m-12,0 a12,12 0 1,1 24,0 a9,9 0 1,0 -24,0Z" fill="${GOLD}" opacity=".8"/>
    </svg>`;
  }

  window.Taro = window.Taro || {};
  window.Taro.art = { front, back, symbol: (suit, s, c) => SUIT_FN[suit](0, 0, s, c || GOLD) };
})();
