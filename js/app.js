/**
 * ARQ LAB — Controlador principal de la interfaz
 * Conecta la UI con los motores de cálculo.
 * No contiene lógica de cálculo: solo lectura de entradas, llamadas a motores y renderizado.
 */

'use strict';

/* ════════════════════════════════════════════════════════
   NAVEGACIÓN
════════════════════════════════════════════════════════ */
const NAV_PAGES = {
  home:      'Inicio',
  real:      'Modo Real',
  protected: 'Modo Protegido',
  reversing: 'Reversing',
  exercises: 'Laboratorio',
  theory:    'Teoría y Glosario',
  tests:     'Pruebas',
  about:     'Acerca de',
};

let currentPage = 'home';

function navigateTo(pageId) {
  if (!NAV_PAGES[pageId]) return;
  // Desactivar página actual
  document.querySelector('.page--active')?.classList.remove('page--active');
  document.querySelector('.nav-item--active')?.classList.remove('nav-item--active');
  // Activar nueva página
  const newPage = document.getElementById(`page-${pageId}`);
  const newNav  = document.getElementById(`nav-${pageId}`);
  if (newPage) newPage.classList.add('page--active');
  if (newNav)  { newNav.classList.add('nav-item--active'); newNav.setAttribute('aria-current','page'); }
  document.getElementById('breadcrumbCurrent').textContent = NAV_PAGES[pageId];
  currentPage = pageId;
  closeSidebar();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Delegar clics de navegación en sidebar y tarjetas del dashboard
document.querySelectorAll('[data-page]').forEach(el => {
  el.addEventListener('click', () => navigateTo(el.dataset.page));
  if (el.getAttribute('role') === 'button') {
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') navigateTo(el.dataset.page); });
  }
});

// Menú móvil
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebarOverlay');
const menuBtn = document.getElementById('menuToggle');

function openSidebar()  {
  sidebar.classList.add('sidebar--open');
  overlay.classList.add('sidebar-overlay--visible');
  menuBtn.setAttribute('aria-expanded', 'true');
}
function closeSidebar() {
  sidebar.classList.remove('sidebar--open');
  overlay.classList.remove('sidebar-overlay--visible');
  menuBtn.setAttribute('aria-expanded', 'false');
}
menuBtn.addEventListener('click', () => sidebar.classList.contains('sidebar--open') ? closeSidebar() : openSidebar());
overlay.addEventListener('click', closeSidebar);

/* ════════════════════════════════════════════════════════
   ANIMACIÓN HERO (canvas)
════════════════════════════════════════════════════════ */
(function heroAnim() {
  const canvas = document.getElementById('heroCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  // Respetar preferencia de reducción de movimiento
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Unidades de registro en el microprocesador
  const registers = [
    { name: 'CS', tag: 'CODE',   color: '#3B82F6', y: 16,  val: 0x1000 },
    { name: 'DS', tag: 'DATA',   color: '#22D3EE', y: 56,  val: 0x2000 },
    { name: 'SS', tag: 'STACK',  color: '#A78BFA', y: 96,  val: 0x9000 },
    { name: 'GDT',tag: 'SYSTEM', color: '#34D399', y: 136, val: 0x0010 },
  ];

  // Paquetes de pulsos que viajan por el bus
  const pulses = [
    { regIdx: 0, prog: 0.1, speed: 0.012 },
    { regIdx: 1, prog: 0.5, speed: 0.015 },
    { regIdx: 2, prog: 0.8, speed: 0.011 },
    { regIdx: 3, prog: 0.3, speed: 0.014 }
  ];

  let tick = 0;

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Fondo del chip con gradiente oscuro de laboratorio
    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0, '#0B1220');
    bgGrad.addColorStop(1, '#070C16');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Rejilla de circuito PCB tenue
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.035)';
    ctx.lineWidth = 1;
    for (let x = 12; x < W; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 12; y < H; y += 16) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // Bus de interconexión vertical
    const busX = W - 52;
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(busX, 20);
    ctx.lineTo(busX, 160);
    ctx.stroke();

    registers.forEach((reg, i) => {
      const pulseVal = Math.sin(tick * 0.04 + i * 1.2);
      const isGlowing = pulseVal > 0.6;
      const regW = 68;
      const regH = 28;
      const rx = 12;
      const ry = reg.y;

      // Pista del bus desde el registro hacia el bus principal
      ctx.strokeStyle = isGlowing ? 'rgba(34, 211, 238, 0.45)' : 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(rx + regW, ry + regH / 2);
      ctx.lineTo(busX, ry + regH / 2);
      ctx.stroke();

      // Chip del registro (cuerpo)
      ctx.fillStyle = 'rgba(17, 27, 45, 0.9)';
      roundRect(ctx, rx, ry, regW, regH, 5);
      ctx.fill();

      // Borde del registro con resplandor
      ctx.strokeStyle = reg.color;
      ctx.lineWidth = isGlowing ? 1.8 : 1.2;
      ctx.shadowColor = isGlowing ? reg.color : 'transparent';
      ctx.shadowBlur = isGlowing ? 8 : 0;
      roundRect(ctx, rx, ry, regW, regH, 5);
      ctx.stroke();
      ctx.shadowBlur = 0; // reset

      // Micro-pins del chip
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.fillRect(rx - 3, ry + 6, 3, 3);
      ctx.fillRect(rx - 3, ry + 19, 3, 3);

      // Nombre del registro
      ctx.fillStyle = reg.color;
      ctx.font = '700 11px JetBrains Mono, monospace';
      ctx.fillText(reg.name, rx + 8, ry + 18);

      // Tag diminuto
      ctx.font = '600 7px JetBrains Mono, monospace';
      ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
      ctx.fillText(reg.tag, rx + 32, ry + 12);

      // Valor dinámico simulado
      const dynVal = ((reg.val + (tick >> 3)) & 0xFFFF).toString(16).toUpperCase().padStart(4, '0') + 'h';
      ctx.font = '600 9px JetBrains Mono, monospace';
      ctx.fillStyle = '#EAF2FF';
      ctx.fillText(dynVal, rx + 30, ry + 22);
    });

    // Dibujar paquetes de datos luminosos que viajan por el bus
    pulses.forEach(p => {
      p.prog += p.speed;
      if (p.prog > 1) p.prog = 0;
      const reg = registers[p.regIdx];
      const startX = 80;
      const endX = busX;
      const currentX = startX + (endX - startX) * p.prog;
      const currentY = reg.y + 14;

      ctx.fillStyle = reg.color;
      ctx.shadowColor = reg.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(currentX, currentY, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // Nodo MMU / Unidad de traducción
    const mmuX = 12;
    const mmuY = 175;
    const mmuW = W - 24;
    const mmuH = 26;

    ctx.fillStyle = 'rgba(14, 116, 144, 0.2)';
    roundRect(ctx, mmuX, mmuY, mmuW, mmuH, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.45)';
    ctx.lineWidth = 1;
    roundRect(ctx, mmuX, mmuY, mmuW, mmuH, 6);
    ctx.stroke();

    // Pulso de LED en el nodo de traducción
    const ledGlow = Math.sin(tick * 0.08) > 0;
    ctx.fillStyle = ledGlow ? '#34D399' : 'rgba(52, 211, 153, 0.3)';
    ctx.shadowColor = ledGlow ? '#34D399' : 'transparent';
    ctx.shadowBlur = ledGlow ? 6 : 0;
    ctx.beginPath();
    ctx.arc(mmuX + 12, mmuY + 13, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Texto de bus y dirección dinámica
    const liveAddr = (0x10020 + (tick >> 2)) & 0xFFFFF;
    ctx.font = '600 9px JetBrains Mono, monospace';
    ctx.fillStyle = '#22D3EE';
    ctx.fillText('MMU: PHYS ADDR', mmuX + 22, mmuY + 16);

    ctx.font = '700 10px JetBrains Mono, monospace';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(liveAddr.toString(16).toUpperCase().padStart(5, '0') + 'h', mmuX + mmuW - 55, mmuY + 17);

    tick++;
    if (!prefersReducedMotion) {
      requestAnimationFrame(draw);
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  draw();
})();

/* ════════════════════════════════════════════════════════
   MICROINTERACCIÓN: BOTONES MAGNÉTICOS SUTILES
════════════════════════════════════════════════════════ */
(function setupMagneticButtons() {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const magneticTargets = document.querySelectorAll('.btn--primary, .btn--cyan, .hero .btn');
  magneticTargets.forEach(btn => {
    btn.addEventListener('mousemove', e => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      // Desplazamiento máximo suave de ±3.5px
      const moveX = Math.max(-3.5, Math.min(3.5, x * 0.12));
      const moveY = Math.max(-3.5, Math.min(3.5, y * 0.12));
      btn.style.transform = `translate(${moveX}px, ${moveY}px)`;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
    });
  });
})();

/* ════════════════════════════════════════════════════════
   UTILIDADES DE UI
════════════════════════════════════════════════════════ */
function showMsg(el, type, html) {
  const icons = { success: '✓', error: '✕', warn: '⚠', info: 'ℹ' };
  el.className = `status-msg status-msg--${type} status-msg--visible`;
  el.querySelector('.status-msg__icon').textContent = icons[type] || 'ℹ';
  el.querySelector('.status-msg__body').innerHTML = html;
}
function hideMsg(el) { el.classList.remove('status-msg--visible'); }

function setFieldError(inputEl, errEl, msg) {
  if (msg) {
    inputEl.classList.add('form-input--error');
    inputEl.classList.remove('form-input--success');
    errEl.textContent = msg;
    errEl.classList.add('form-error--visible');
  } else {
    inputEl.classList.remove('form-input--error');
    inputEl.classList.add('form-input--success');
    errEl.textContent = '';
    errEl.classList.remove('form-error--visible');
  }
}

function clearField(inputEl, errEl) {
  inputEl.classList.remove('form-input--error','form-input--success');
  if (errEl) { errEl.textContent = ''; errEl.classList.remove('form-error--visible'); }
}

function parseInput(inputEl, errEl, format) {
  const raw = inputEl.value;
  if (!raw || !raw.trim()) {
    setFieldError(inputEl, errEl, 'Este campo no puede estar vacío.');
    return null;
  }
  try {
    const val = Utils.parseValue(raw, format);
    setFieldError(inputEl, errEl, '');
    return val;
  } catch (e) {
    setFieldError(inputEl, errEl, e.message || 'Valor inválido.');
    return null;
  }
}

/* ════════════════════════════════════════════════════════
   MODO REAL
════════════════════════════════════════════════════════ */
(function setupRealMode() {

  const fmtSel   = document.getElementById('realFmt');
  const modelSel = document.getElementById('realModel');
  const segIn    = document.getElementById('realSeg');
  const offIn    = document.getElementById('realOff');
  const segErr   = document.getElementById('realSegErr');
  const offErr   = document.getElementById('realOffErr');
  const msgEl    = document.getElementById('realStatusMsg');
  const resBody  = document.getElementById('realResultBody');
  const resPanel = document.getElementById('realResultPanel');
  const copyBtn  = document.getElementById('btnRealCopy');
  const diagCard = document.getElementById('realDiagramCard');
  const diagCvs  = document.getElementById('realDiagramCanvas');

  let lastResult = null;
  let stepData   = null;
  let stepIdx    = 0;
  let playTimer  = null;

  // Ejemplos precargados
  document.querySelectorAll('[data-ex-seg]').forEach(btn => {
    btn.addEventListener('click', () => {
      fmtSel.value = 'hex';
      segIn.value = btn.dataset.exSeg;
      offIn.value = btn.dataset.exOff;
      clearField(segIn, segErr);
      clearField(offIn, offErr);
      doCalc();
    });
  });

  // Calcular
  document.getElementById('btnRealCalc').addEventListener('click', doCalc);

  function doCalc() {
    const fmt   = fmtSel.value;
    const model = modelSel.value;
    let hasError = false;

    const seg = parseInput(segIn, segErr, fmt);
    const off = parseInput(offIn, offErr, fmt);
    if (seg === null) hasError = true;
    if (off === null) hasError = true;

    // Validación de rango adicional
    if (seg !== null) {
      try { Utils.assertRange(seg, 0xFFFFn, 'Segmento'); }
      catch(e) { setFieldError(segIn, segErr, e.message); hasError = true; }
    }
    if (off !== null) {
      try { Utils.assertRange(off, 0xFFFFn, 'Offset'); }
      catch(e) { setFieldError(offIn, offErr, e.message); hasError = true; }
    }

    if (hasError) {
      showMsg(msgEl, 'error', 'Corrige los campos marcados antes de calcular.');
      return;
    }

    try {
      lastResult = RealModeEngine.calculate(seg, off, model);
      renderRealResult(lastResult);
      showMsg(msgEl, 'success', `Dirección física calculada correctamente: <strong>${lastResult.finalAddrHex}h</strong>`);
      if (lastResult.warning) showMsg(msgEl, 'warn', lastResult.warning);
      drawRealDiagram(lastResult);
      hideStepper();
    } catch (e) {
      const err = e.field ? e : { field: null, message: e.message };
      if (err.field === 'segmento') setFieldError(segIn, segErr, err.message);
      else if (err.field === 'offset') setFieldError(offIn, offErr, err.message);
      showMsg(msgEl, 'error', err.message);
    }
  }

  function renderRealResult(r) {
    resBody.innerHTML = `
      <div class="highlight-box highlight-box--primary">
        <div class="highlight-box__label">Dirección Física</div>
        <div class="highlight-box__value">${r.finalAddrHex}h</div>
      </div>
      <div class="result-row">
        <div class="result-row__label">Segmento</div>
        <div class="result-row__value">${r.segHex}h <span style="color:var(--color-text-faint);font-size:0.8em">(${Utils.bigIntToDec(r.seg)})</span></div>
      </div>
      <div class="result-row">
        <div class="result-row__label">Offset</div>
        <div class="result-row__value">${r.offsetHex}h <span style="color:var(--color-text-faint);font-size:0.8em">(${Utils.bigIntToDec(r.offset)})</span></div>
      </div>
      <div class="result-row">
        <div class="result-row__label">Segmento × 10h</div>
        <div class="result-row__value" style="color:var(--color-violet-lit)">${r.segHex}h × 10h = ${r.shiftedHex}h</div>
      </div>
      <div class="result-row">
        <div class="result-row__label">+ Offset</div>
        <div class="result-row__value">${r.shiftedHex}h + ${r.offsetHex}h = ${r.physicalArithHex}h</div>
      </div>
      ${r.over20 && r.model === '8086' ? `
      <div class="result-row">
        <div class="result-row__label">Desbordamiento 20b</div>
        <div class="result-row__value result-row__value--warn">${r.physicalArithHex}h AND FFFFFh = ${r.finalAddrHex}h</div>
      </div>` : ''}
      <div class="result-row">
        <div class="result-row__label">Dirección física</div>
        <div class="result-row__value result-row__value--large">${r.finalAddrHex}h <span style="color:var(--color-text-faint);font-size:0.7em">(${r.finalAddrDec})</span></div>
      </div>
      <div class="result-row">
        <div class="result-row__label">Binario (20 bits)</div>
        <div class="result-row__value" style="font-size:0.8rem;letter-spacing:0.08em">${r.finalAddrBin}</div>
      </div>
    `;
    resPanel.style.display = 'block';
    copyBtn.style.display  = 'inline-flex';
  }

  // Copiar resultado
  copyBtn.addEventListener('click', () => {
    if (!lastResult) return;
    const text = `ARQ LAB — Modo Real\nSegmento: ${lastResult.segHex}h\nOffset: ${lastResult.offsetHex}h\nModelo: ${lastResult.model}\n\nCálculo:\n  ${lastResult.segHex}h × 10h = ${lastResult.shiftedHex}h\n  ${lastResult.shiftedHex}h + ${lastResult.offsetHex}h = ${lastResult.physicalArithHex}h\n${lastResult.over20 && lastResult.model === '8086' ? `  Desbordamiento: ${lastResult.physicalArithHex}h AND FFFFFh = ${lastResult.finalAddrHex}h\n` : ''}\nDirección física = ${lastResult.finalAddrHex}h (${lastResult.finalAddrDec})`;
    navigator.clipboard.writeText(text).then(() => showMsg(msgEl, 'success', 'Resultado copiado al portapapeles.'));
  });

  // Limpiar
  document.getElementById('btnRealClear').addEventListener('click', () => {
    segIn.value = '';
    offIn.value = '';
    clearField(segIn, segErr);
    clearField(offIn, offErr);
    resPanel.style.display = 'none';
    copyBtn.style.display  = 'none';
    diagCard.style.display = 'none';
    hideMsg(msgEl);
    hideStepper();
    lastResult = null;
  });

  // ── Diagrama canvas ──
  function drawRealDiagram(r) {
    diagCard.style.display = 'block';
    const canvas = diagCvs;
    canvas.width = canvas.offsetWidth * window.devicePixelRatio || 800;
    canvas.height = 220 * (window.devicePixelRatio || 1);
    const ctx = canvas.getContext('2d');
    ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    const W = canvas.offsetWidth || 800;
    const H = 220;

    ctx.clearRect(0, 0, W, H);

    const blocks = [
      { label: 'Segmento',    val: r.segHex + 'h',         x: 20,        w: 130, color: '#3B82F6', bg: 'rgba(37,99,235,0.12)' },
      { label: '× 16',        val: '= ' + r.shiftedHex + 'h', x: 170,    w: 150, color: '#8B5CF6', bg: 'rgba(124,58,237,0.12)' },
      { label: 'Offset',      val: '+ ' + r.offsetHex + 'h',  x: 340,    w: 130, color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
      { label: 'Dir. física', val: r.finalAddrHex + 'h',   x: W - 180,   w: 160, color: '#06B6D4', bg: 'rgba(6,182,212,0.12)' },
    ];

    // Barras horizontales de memoria proporcional
    const barY = 150, barH = 24, maxW = W - 40;
    const maxAddr = r.model === '8086' ? 0x100000n : (r.physicalArithHex.length <= 5 ? 0x100000n : 0x1100000n);
    function toX(addr) { return 20 + Number((addr * BigInt(maxW)) / maxAddr); }

    // Fondo de rango de memoria
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    roundRectFill(ctx, 20, barY, maxW, barH, 4);

    // Base del segmento (shifted)
    const shiftX = toX(r.shifted);
    ctx.fillStyle = 'rgba(37,99,235,0.35)';
    roundRectFill(ctx, 20, barY, Math.min(shiftX - 20, maxW), barH, 4);

    // Región del segmento (hasta límite ~64KB)
    const segEnd = toX(r.shifted + 0xFFFFn);
    ctx.fillStyle = 'rgba(6,182,212,0.15)';
    roundRectFill(ctx, shiftX, barY, Math.min(segEnd - shiftX, maxW + 20 - shiftX), barH, 4);

    // Marcador de la dirección final
    const finalX = Math.min(toX(r.finalAddr), maxW + 18);
    ctx.fillStyle = '#06B6D4';
    ctx.fillRect(finalX, barY - 6, 2, barH + 12);
    ctx.fillStyle = '#06B6D4';
    ctx.font = `600 10px JetBrains Mono, monospace`;
    ctx.fillText(r.finalAddrHex + 'h', Math.min(finalX + 4, W - 80), barY - 10);

    // Etiquetas
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = '10px Inter, sans-serif';
    ctx.fillText('0h', 20, barY + barH + 16);
    ctx.fillText(Utils.bigIntToHex(maxAddr, 5) + 'h', maxW - 10, barY + barH + 16);

    // Bloques superiores
    blocks.forEach(b => {
      // Fondo
      ctx.fillStyle = b.bg;
      roundRectFill(ctx, b.x, 20, b.w, 80, 8);
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 1.5;
      roundRectStroke(ctx, b.x, 20, b.w, 80, 8);
      // Texto
      ctx.fillStyle = b.color;
      ctx.font = `600 11px Inter, sans-serif`;
      ctx.fillText(b.label, b.x + 10, 42);
      ctx.fillStyle = '#F1F5F9';
      ctx.font = `700 13px JetBrains Mono, monospace`;
      ctx.fillText(b.val, b.x + 10, 72);
    });

    // Flecha entre bloques
    function drawArrow(x1, y, x2) {
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x1, y);
      ctx.lineTo(x2, y);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.beginPath();
      ctx.moveTo(x2, y - 4);
      ctx.lineTo(x2 + 6, y);
      ctx.lineTo(x2, y + 4);
      ctx.fill();
    }
    drawArrow(blocks[0].x + blocks[0].w, 60, blocks[1].x - 4);
    drawArrow(blocks[1].x + blocks[1].w, 60, blocks[2].x - 4);
    drawArrow(blocks[2].x + blocks[2].w, 60, blocks[3].x - 4);

    // Línea vertical desde bloque resultado hasta barra de memoria
    ctx.strokeStyle = 'rgba(6,182,212,0.4)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(blocks[3].x + blocks[3].w / 2, 100);
    ctx.lineTo(finalX, barY);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function roundRectFill(ctx, x, y, w, h, r) {
    if (w <= 0) return;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
  }
  function roundRectStroke(ctx, x, y, w, h, r) {
    if (w <= 0) return;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.stroke();
  }

  // ── Stepper paso a paso ──
  const stepper  = document.getElementById('realStepper');
  const stepBar  = document.getElementById('realStepBar');
  const stepNum  = document.getElementById('realStepNum');
  const stepTitle= document.getElementById('realStepTitle');
  const stepCont = document.getElementById('realStepContent');
  const stepVal  = document.getElementById('realStepValue');
  const btnPrev  = document.getElementById('btnStepRealPrev');
  const btnPlay  = document.getElementById('btnStepRealPlay');
  const btnNext  = document.getElementById('btnStepRealNext');
  const btnReset = document.getElementById('btnStepRealReset');

  document.getElementById('btnRealStep').addEventListener('click', () => {
    // Calcular primero
    doCalc();
    if (!lastResult) return;
    const { steps } = RealModeEngine.getSteps(lastResult.seg, lastResult.offset, lastResult.model);
    stepData = steps;
    stepIdx  = 0;
    stepper.style.display = 'block';
    renderStep();
  });

  document.getElementById('btnRealStepClose').addEventListener('click', hideStepper);
  function hideStepper() {
    stepper.style.display = 'none';
    clearPlay();
  }

  function renderStep() {
    const total = stepData.length;
    const step  = stepData[stepIdx];
    const pct   = Math.round(((stepIdx + 1) / total) * 100);
    stepBar.style.width = pct + '%';
    stepNum.textContent = `Paso ${stepIdx + 1} de ${total}`;
    stepTitle.textContent = step.titulo;
    stepCont.innerHTML = step.descripcion;
    if (step.valor) {
      stepVal.textContent = step.valor + 'h';
      stepVal.style.display = 'inline-block';
    } else {
      stepVal.style.display = 'none';
    }
    btnPrev.disabled = stepIdx === 0;
    btnNext.disabled = stepIdx === total - 1;
  }

  btnPrev.addEventListener('click',  () => { stepIdx = Math.max(0, stepIdx - 1); renderStep(); });
  btnNext.addEventListener('click',  () => { stepIdx = Math.min(stepData.length - 1, stepIdx + 1); renderStep(); });
  btnReset.addEventListener('click', () => { stepIdx = 0; renderStep(); });
  btnPlay.addEventListener('click',  () => {
    if (playTimer) {
      clearPlay();
    } else {
      btnPlay.textContent = '⏸ Pausar';
      playTimer = setInterval(() => {
        if (stepIdx < stepData.length - 1) {
          stepIdx++;
          renderStep();
        } else {
          clearPlay();
        }
      }, 1800);
    }
  });
  function clearPlay() {
    clearInterval(playTimer);
    playTimer = null;
    btnPlay.textContent = '▶ Reproducir';
  }

})();

/* ════════════════════════════════════════════════════════
   MODO PROTEGIDO
════════════════════════════════════════════════════════ */
(function setupProtectedMode() {

  // Tabs
  document.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.toggle('tab-btn--active', b.dataset.tab === tabId);
        b.setAttribute('aria-selected', b.dataset.tab === tabId);
      });
      document.querySelectorAll('.tab-panel').forEach(p => {
        p.classList.toggle('tab-panel--active', p.id === `tab-panel-${tabId}`);
      });
    });
  });

  // Registro DS/CS/SS (modo manual)
  let selectedReg = 'DS';
  document.querySelectorAll('[data-reg]').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedReg = btn.dataset.reg;
      document.querySelectorAll('[data-reg]').forEach(b => {
        b.classList.toggle('reg-btn--active', b.dataset.reg === selectedReg);
        b.setAttribute('aria-pressed', b.dataset.reg === selectedReg);
      });
    });
  });

  const protFmt    = document.getElementById('protFmt');
  const protSelIn  = document.getElementById('protSel');
  const protSelErr = document.getElementById('protSelErr');
  const protDescIn = document.getElementById('protDesc');
  const protDescErr= document.getElementById('protDescErr');
  const protOffIn  = document.getElementById('protOff');
  const protOffErr = document.getElementById('protOffErr');
  const protMsg    = document.getElementById('protStatusMsg');
  const protResPanel = document.getElementById('protResultPanel');
  const protResBody  = document.getElementById('protResultBody');
  const selDecoPanel = document.getElementById('selDecoPanel');
  const selDecoBody  = document.getElementById('selDecoBody');

  // Decodificar solo el selector
  document.getElementById('btnDecodeSel').addEventListener('click', () => {
    const fmt = protFmt.value;
    const raw = protSelIn.value;
    if (!raw.trim()) { setFieldError(protSelIn, protSelErr, 'Campo vacío.'); return; }
    try {
      const val = Utils.parseValue(raw, fmt);
      Utils.assertRange(val, 0xFFFFn, 'Selector');
      const sel = SelectorDecoder.decode(val);
      setFieldError(protSelIn, protSelErr, '');
      selDecoBody.innerHTML = renderSelectorResult(sel);
      selDecoPanel.style.display = 'block';
    } catch(e) {
      setFieldError(protSelIn, protSelErr, e.message || String(e));
      selDecoPanel.style.display = 'none';
    }
  });

  function renderSelectorResult(sel) {
    const nullBadge = sel.isNull ? `<span style="background:rgba(239,68,68,0.15);color:var(--color-error);border-radius:4px;padding:1px 6px;font-size:0.75rem">Selector nulo</span>` : '';
    return `
      <div class="result-row">
        <div class="result-row__label">Selector</div>
        <div class="result-row__value">${sel.rawHex}h ${nullBadge}</div>
      </div>
      <div class="result-row">
        <div class="result-row__label">Binario</div>
        <div class="result-row__value" style="font-size:0.8rem;letter-spacing:0.05em">${sel.rawBin}</div>
      </div>
      <div class="result-row">
        <div class="result-row__label">Índice (bits 15–3)</div>
        <div class="result-row__value">${sel.index} <span style="color:var(--color-text-faint);font-size:0.8em">(${sel.indexHex}h)</span></div>
      </div>
      <div class="result-row">
        <div class="result-row__label">TI (bit 2)</div>
        <div class="result-row__value">${sel.ti} → <strong>${sel.tiDesc}</strong></div>
      </div>
      <div class="result-row">
        <div class="result-row__label">RPL (bits 1–0)</div>
        <div class="result-row__value">${sel.rpl} → <span class="priv-badge priv-badge--${sel.rpl}">PL${sel.rpl}</span> ${sel.rplDesc}</div>
      </div>
      <div class="result-row">
        <div class="result-row__label">Offset en tabla</div>
        <div class="result-row__value">${sel.offset} bytes <span style="color:var(--color-text-faint);font-size:0.8em">(índice × 8)</span></div>
      </div>
    `;
  }

  // Calcular modo manual
  document.getElementById('btnProtCalc').addEventListener('click', doProtCalc);

  // Ejemplos precargados modo protegido
  document.querySelectorAll('[data-prot-sel]').forEach(btn => {
    btn.addEventListener('click', () => {
      protFmt.value = 'hex';
      protSelIn.value = btn.dataset.protSel;
      protDescIn.value = btn.dataset.protDesc;
      protOffIn.value = btn.dataset.protOff;
      const reg = btn.dataset.protReg || 'DS';
      selectedReg = reg;
      document.querySelectorAll('.reg-btn').forEach(b => {
        const active = b.dataset.reg === reg;
        b.classList.toggle('reg-btn--active', active);
        b.setAttribute('aria-pressed', String(active));
      });
      [protSelErr, protDescErr, protOffErr].forEach(e => clearField(null, e));
      doDecodeSel();
      doProtCalc();
    });
  });

  function doProtCalc() {
    const fmt = protFmt.value;
    let hasErr = false;

    // Selector
    let sel;
    const rawSel = protSelIn.value;
    if (!rawSel.trim()) { setFieldError(protSelIn, protSelErr, 'Campo vacío.'); hasErr = true; }
    else {
      try {
        const sv = Utils.parseValue(rawSel, fmt);
        Utils.assertRange(sv, 0xFFFFn, 'Selector');
        sel = SelectorDecoder.decode(sv);
        setFieldError(protSelIn, protSelErr, '');
        selDecoBody.innerHTML = renderSelectorResult(sel);
        selDecoPanel.style.display = 'block';
        if (sel.isNull) {
          setFieldError(protSelIn, protSelErr, 'El selector nulo no puede usarse para acceso ordinario.');
          hasErr = true;
        }
      } catch(e) {
        setFieldError(protSelIn, protSelErr, e.message || String(e));
        hasErr = true;
      }
    }

    // Descriptor
    let desc;
    const rawDesc = protDescIn.value.trim().replace(/\s/g,'').toUpperCase();
    if (!rawDesc) { setFieldError(protDescIn, protDescErr, 'Campo vacío.'); hasErr = true; }
    else if (!/^[0-9A-F]+$/.test(rawDesc)) { setFieldError(protDescIn, protDescErr, 'Solo se admiten caracteres hexadecimales (0–9, A–F).'); hasErr = true; }
    else if (rawDesc.length !== 16) { setFieldError(protDescIn, protDescErr, `El descriptor debe tener 16 dígitos hexadecimales (64 bits). Se introdujeron ${rawDesc.length}.`); hasErr = true; }
    else {
      try {
        desc = DescriptorDecoder.decode(BigInt('0x' + rawDesc));
        setFieldError(protDescIn, protDescErr, '');
      } catch(e) {
        setFieldError(protDescIn, protDescErr, e.message || String(e));
        hasErr = true;
      }
    }

    // Offset
    let off;
    const rawOff = protOffIn.value;
    if (!rawOff.trim()) { setFieldError(protOffIn, protOffErr, 'Campo vacío.'); hasErr = true; }
    else {
      try {
        off = Utils.parseValue(rawOff, 'hex');
        Utils.assertRange(off, 0xFFFFFFFFn, 'Offset');
        setFieldError(protOffIn, protOffErr, '');
      } catch(e) {
        setFieldError(protOffIn, protOffErr, e.message || String(e));
        hasErr = true;
      }
    }

    if (hasErr) { showMsg(protMsg, 'error', 'Corrige los campos marcados.'); return; }

    // Calcular
    try {
      const lr = DescriptorDecoder.calcLinear(desc, off, selectedReg);
      renderProtResult(sel, desc, lr);
      showMsg(protMsg, 'success', `Dirección lineal calculada: <strong>${lr.linearAddrHex}h</strong>`);
    } catch(e) {
      showMsg(protMsg, 'error', e.message || String(e));
    }
  }

  function renderProtResult(sel, desc, lr) {
    const typeBadge = desc.isSystem
      ? `<span style="background:rgba(239,68,68,0.12);color:var(--color-error);border-radius:4px;padding:1px 8px;font-size:0.8rem">Sistema</span>`
      : desc.isCode
        ? `<span style="background:rgba(37,99,235,0.12);color:var(--color-primary-lit);border-radius:4px;padding:1px 8px;font-size:0.8rem">Código</span>`
        : `<span style="background:rgba(6,182,212,0.12);color:var(--color-cyan);border-radius:4px;padding:1px 8px;font-size:0.8rem">Datos</span>`;

    protResBody.innerHTML = `
      <div class="highlight-box">
        <div class="highlight-box__label">Dirección Lineal</div>
        <div class="highlight-box__value">${lr.linearAddrHex}h</div>
      </div>
      <div class="result-row"><div class="result-row__label">Selector analizado</div><div class="result-row__value">${sel.rawHex}h → ${sel.table}, índice ${sel.index}</div></div>
      <div class="result-row"><div class="result-row__label">Base del segmento</div><div class="result-row__value">${desc.base32Hex}h</div></div>
      <div class="result-row"><div class="result-row__label">Límite efectivo</div><div class="result-row__value">${desc.effectiveLimitHex}h <span style="color:var(--color-text-faint);font-size:0.8em">(G=${desc.Gnum})</span></div></div>
      <div class="result-row"><div class="result-row__label">Tipo de segmento</div><div class="result-row__value">${typeBadge} ${desc.typeInfo.name}</div></div>
      <div class="result-row"><div class="result-row__label">DPL</div><div class="result-row__value"><span class="priv-badge priv-badge--${desc.DPLnum}">PL${desc.DPLnum}</span></div></div>
      <div class="result-row"><div class="result-row__label">Presente (P)</div><div class="result-row__value" style="color:var(--color-success)">Sí (P=1)</div></div>
      <div class="result-row"><div class="result-row__label">Registro destino</div><div class="result-row__value">${lr.reg}</div></div>
      <div class="result-row"><div class="result-row__label">Offset</div><div class="result-row__value">${Utils.bigIntToHex(lr.offset, 8)}h</div></div>
      <div class="result-row"><div class="result-row__label">Cálculo</div><div class="result-row__value">${desc.base32Hex}h + ${Utils.bigIntToHex(lr.offset, 8)}h = ${lr.linearAddrHex}h</div></div>
      <div class="result-row"><div class="result-row__label">Dirección lineal</div><div class="result-row__value result-row__value--large">${lr.linearAddrHex}h</div></div>
      <div class="result-row" style="background:rgba(245,158,11,0.05)">
        <div class="result-row__label" style="color:var(--color-warn)">Dirección física</div>
        <div class="result-row__value result-row__value--warn">No determinada (requiere simulador de paginación)</div>
      </div>
    `;
    protResPanel.style.display = 'block';
  }

  document.getElementById('btnProtCopy').addEventListener('click', () => {
    const text = protResBody.innerText;
    navigator.clipboard.writeText(text).then(() => showMsg(protMsg, 'success', 'Copiado al portapapeles.'));
  });

  document.getElementById('btnProtClear').addEventListener('click', () => {
    protSelIn.value = ''; protDescIn.value = ''; protOffIn.value = '';
    [protSelErr, protDescErr, protOffErr].forEach(e => { clearField(null, e); });
    [protSelIn, protDescIn, protOffIn].forEach(i => { if(i) clearField(i, null); });
    protResPanel.style.display = 'none';
    selDecoPanel.style.display = 'none';
    hideMsg(protMsg);
  });

  // ── MODO TABLA GDT ──
  const gdtTableBody = document.getElementById('gdtTableBody');
  let   gdtTableData = [];      // array de { raw64, desc }
  let   isLDT        = false;
  let   selectedReg2 = 'DS';

  document.getElementById('btnSwitchTable').addEventListener('click', () => {
    isLDT = !isLDT;
    document.getElementById('gdtLdtLabel').textContent = isLDT ? 'LDT (Local Descriptor Table)' : 'GDT (Global Descriptor Table)';
    document.getElementById('btnSwitchTable').textContent = isLDT ? 'Cambiar a GDT' : 'Cambiar a LDT';
    renderGdtTable();
  });

  document.getElementById('btnLoadGdtExample').addEventListener('click', () => {
    gdtTableData = [];
    // Entrada 0: descriptor nulo
    gdtTableData.push(buildEntry(0x0000000000000000n));
    // Entrada 1: código 32 bits, base=0, límite=4GB
    gdtTableData.push(buildEntry(0x00CF9A000000FFFFn));
    // Entrada 2: datos 32 bits, base=0, límite=4GB
    gdtTableData.push(buildEntry(0x00CF92000000FFFFn));
    // Entrada 3: código 16 bits (modo real heredado)
    gdtTableData.push(buildEntry(0x00009A000000FFFFn));
    // Entrada 4: datos R/W base=00400000h, límite=10000h
    gdtTableData.push(buildEntry(0x000092004000FFFFn));
    renderGdtTable();
  });

  function buildEntry(raw64) {
    let desc = null;
    try { desc = DescriptorDecoder.decode(raw64); } catch(_) {}
    return { raw64, desc };
  }

  function renderGdtTable() {
    if (!gdtTableData.length) {
      gdtTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--color-text-faint);padding:1.5rem">Tabla vacía.</td></tr>';
      return;
    }
    gdtTableBody.innerHTML = gdtTableData.map((entry, i) => {
      const hex  = Utils.bigIntToHex(entry.raw64, 16);
      const isSys  = entry.desc?.isSystem;
      const isCode = entry.desc?.isCode;
      const tipo = entry.desc
        ? (isSys ? 'Sistema' : isCode ? 'Código' : 'Datos')
        : '—';
      const tipoBadgeClass = isSys ? 'badge--violet' : isCode ? 'badge--cyan' : 'badge--green';
      const isPres = entry.desc?.isPresent;
      const presIcon  = isPres ? '✓' : '✗';
      const presColor = isPres ? 'var(--color-success)' : 'var(--color-error)';
      return `<tr data-gdt-idx="${i}">
        <td><strong>#${i}</strong></td>
        <td style="font-size:0.78rem;font-family:var(--font-mono);color:var(--color-cyan)">${hex}</td>
        <td>
          <span class="badge ${tipoBadgeClass}">${tipo}</span>
          <span style="color:${presColor};font-weight:700;margin-left:6px" title="${isPres ? 'Presente' : 'No presente'}">${presIcon}</span>
        </td>
        <td>
          <button class="btn btn--danger btn--sm btn--icon" onclick="removeGdtEntry(${i})" title="Eliminar entrada ${i}" aria-label="Eliminar entrada ${i}">✕</button>
        </td>
      </tr>`;
    }).join('');
  }

  window.removeGdtEntry = (i) => {
    gdtTableData.splice(i, 1);
    renderGdtTable();
  };

  // Agregar descriptor
  const addModal   = document.getElementById('addDescModal');
  const modalInput = document.getElementById('modalDescHex');
  const modalErr   = document.getElementById('modalDescHexErr');

  document.getElementById('btnAddDesc').addEventListener('click', () => {
    modalInput.value = '';
    clearField(modalInput, modalErr);
    addModal.classList.add('modal-overlay--open');
    setTimeout(() => modalInput.focus(), 100);
  });
  document.getElementById('btnAddDescClose').addEventListener('click', () => addModal.classList.remove('modal-overlay--open'));
  document.getElementById('btnModalDescCancel').addEventListener('click', () => addModal.classList.remove('modal-overlay--open'));
  document.getElementById('btnModalDescConfirm').addEventListener('click', () => {
    const raw = modalInput.value.trim().replace(/\s/g,'').toUpperCase();
    if (raw.length !== 16 || !/^[0-9A-F]+$/.test(raw)) {
      setFieldError(modalInput, modalErr, 'Introduce exactamente 16 dígitos hexadecimales.');
      return;
    }
    gdtTableData.push(buildEntry(BigInt('0x' + raw)));
    renderGdtTable();
    addModal.classList.remove('modal-overlay--open');
  });

  // Registros en modo tabla
  document.querySelectorAll('[data-reg-tbl]').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedReg2 = btn.dataset.regTbl;
      document.querySelectorAll('[data-reg-tbl]').forEach(b => {
        b.classList.toggle('reg-btn--active', b.dataset.regTbl === selectedReg2);
      });
    });
  });

  // Resolver desde tabla
  const tblSelIn  = document.getElementById('tblSel');
  const tblSelErr = document.getElementById('tblSelErr');
  const tblOffIn  = document.getElementById('tblOff');
  const tblOffErr = document.getElementById('tblOffErr');
  const tblMsg    = document.getElementById('tblStatusMsg');
  const tblResPanel = document.getElementById('tblResultPanel');
  const tblResBody  = document.getElementById('tblResultBody');

  document.getElementById('btnTblResolve').addEventListener('click', () => {
    let hasErr = false;
    let sel, off, entry;

    const rawSel = tblSelIn.value;
    if (!rawSel.trim()) { setFieldError(tblSelIn, tblSelErr, 'Campo vacío.'); hasErr = true; }
    else {
      try {
        const sv = Utils.hexToBigInt(rawSel);
        Utils.assertRange(sv, 0xFFFFn, 'Selector');
        sel = SelectorDecoder.decode(sv);
        setFieldError(tblSelIn, tblSelErr, '');
        if (sel.isNull) { setFieldError(tblSelIn, tblSelErr, 'El selector nulo no puede usarse aquí.'); hasErr = true; }
      } catch(e) {
        setFieldError(tblSelIn, tblSelErr, e.message || String(e));
        hasErr = true;
      }
    }

    const rawOff = tblOffIn.value;
    if (!rawOff.trim()) { setFieldError(tblOffIn, tblOffErr, 'Campo vacío.'); hasErr = true; }
    else {
      try {
        off = Utils.parseValue(rawOff, 'hex');
        Utils.assertRange(off, 0xFFFFFFFFn, 'Offset');
        setFieldError(tblOffIn, tblOffErr, '');
      } catch(e) {
        setFieldError(tblOffIn, tblOffErr, e.message || String(e));
        hasErr = true;
      }
    }

    if (hasErr) { showMsg(tblMsg, 'error', 'Corrige los campos.'); return; }

    // Verificar que el selector apunte a la tabla correcta
    const tableIsLDT = sel.ti === 1;
    if (tableIsLDT !== isLDT) {
      showMsg(tblMsg, 'error', `El selector apunta a la ${sel.table}, pero la tabla activa es ${isLDT ? 'LDT' : 'GDT'}. Cambia la tabla activa.`);
      return;
    }

    // Resolver en tabla
    try {
      entry = SelectorDecoder.resolveInTable(sel, gdtTableData.map(e => e.desc));
    } catch(e) {
      showMsg(tblMsg, 'error', e.message || String(e));
      return;
    }

    // Calcular dirección lineal
    try {
      const lr = DescriptorDecoder.calcLinear(entry, off, selectedReg2);
      tblResBody.innerHTML = `
        <div class="highlight-box">
          <div class="highlight-box__label">Dirección Lineal</div>
          <div class="highlight-box__value">${lr.linearAddrHex}h</div>
        </div>
        <div class="result-row"><div class="result-row__label">Selector</div><div class="result-row__value">${sel.rawHex}h → ${sel.table}[${sel.index}]</div></div>
        <div class="result-row"><div class="result-row__label">Base</div><div class="result-row__value">${entry.base32Hex}h</div></div>
        <div class="result-row"><div class="result-row__label">Límite efectivo</div><div class="result-row__value">${entry.effectiveLimitHex}h</div></div>
        <div class="result-row"><div class="result-row__label">Tipo</div><div class="result-row__value">${entry.typeInfo.name}</div></div>
        <div class="result-row"><div class="result-row__label">Registro</div><div class="result-row__value">${selectedReg2}</div></div>
        <div class="result-row"><div class="result-row__label">Offset</div><div class="result-row__value">${Utils.bigIntToHex(off, 8)}h</div></div>
        <div class="result-row"><div class="result-row__label">Dirección lineal</div><div class="result-row__value result-row__value--large">${lr.linearAddrHex}h</div></div>
      `;
      tblResPanel.style.display = 'block';
      showMsg(tblMsg, 'success', `Dirección lineal: <strong>${lr.linearAddrHex}h</strong>`);
    } catch(e) {
      showMsg(tblMsg, 'error', e.message || String(e));
    }
  });

  document.getElementById('btnTblClear').addEventListener('click', () => {
    tblSelIn.value = ''; tblOffIn.value = '';
    clearField(tblSelIn, tblSelErr);
    clearField(tblOffIn, tblOffErr);
    tblResPanel.style.display = 'none';
    hideMsg(tblMsg);
  });

  // ── PAGINACIÓN ──
  const pagMsg    = document.getElementById('pagStatusMsg');
  const pagResPanel = document.getElementById('pagResultPanel');
  const pagResBody  = document.getElementById('pagResultBody');

  // Tabla de páginas de ejemplo fija (didáctica)
  const EXAMPLE_PAGE_DIR = [
    { present: true,  frame: 0x001 },   // VPN 0
    { present: true,  frame: 0x100 },   // VPN 1
    { present: false, frame: 0x000 },   // VPN 2 — no presente
    { present: true,  frame: 0x200 },   // VPN 3
    { present: true,  frame: 0x300 },   // VPN 4
  ];

  document.getElementById('btnPagLoadExample').addEventListener('click', () => {
    document.getElementById('pagLinear').value = '00001A50h';
    document.getElementById('pagPageSize').value = '4096';
  });

  document.getElementById('btnPagCalc').addEventListener('click', () => {
    const rawLin = document.getElementById('pagLinear').value;
    const pgSize = parseInt(document.getElementById('pagPageSize').value);
    const pagLinErr = document.getElementById('pagLinearErr');

    if (!rawLin.trim()) { setFieldError(document.getElementById('pagLinear'), pagLinErr, 'Campo vacío.'); return; }
    let lin;
    try {
      lin = Utils.parseValue(rawLin, 'hex');
      Utils.assertRange(lin, 0xFFFFFFFFn, 'Dirección lineal');
      setFieldError(document.getElementById('pagLinear'), pagLinErr, '');
    } catch(e) {
      setFieldError(document.getElementById('pagLinear'), pagLinErr, e.message);
      return;
    }

    const linN     = Number(lin);
    const pageN    = Math.floor(linN / pgSize);
    const offset   = linN % pgSize;
    const entry    = EXAMPLE_PAGE_DIR[pageN] || null;

    let physHex = '—';
    let statusType = 'warn';
    let statusMsg  = '';

    if (!entry) {
      statusMsg = `La entrada de tabla de páginas #${pageN} no existe en la tabla de ejemplo. Acceso rechazado.`;
    } else if (!entry.present) {
      statusMsg = `La página #${pageN} no está presente en memoria (bit P = 0). Se generaría una excepción de fallo de página.`;
      statusType = 'error';
    } else {
      const phys = entry.frame * pgSize + offset;
      physHex = Utils.bigIntToHex(BigInt(phys), 8);
      statusMsg = `Página #${pageN} → Marco físico ${Utils.bigIntToHex(BigInt(entry.frame), 3)}h. Dirección física = ${physHex}h.`;
      statusType = 'success';
    }

    showMsg(pagMsg, statusType, statusMsg);
    pagResBody.innerHTML = `
      <div class="result-row"><div class="result-row__label">Dirección lineal</div><div class="result-row__value">${Utils.bigIntToHex(lin, 8)}h</div></div>
      <div class="result-row"><div class="result-row__label">Tamaño de página</div><div class="result-row__value">${pgSize} bytes (${Utils.bigIntToHex(BigInt(pgSize), 4)}h)</div></div>
      <div class="result-row"><div class="result-row__label">Número de página</div><div class="result-row__value">${pageN} (${Utils.bigIntToHex(BigInt(pageN), 4)}h)</div></div>
      <div class="result-row"><div class="result-row__label">Offset en página</div><div class="result-row__value">${offset} (${Utils.bigIntToHex(BigInt(offset), 3)}h)</div></div>
      <div class="result-row"><div class="result-row__label">Entrada de tabla</div><div class="result-row__value">${entry ? (entry.present ? `Presente, Marco=${Utils.bigIntToHex(BigInt(entry.frame), 3)}h` : 'No presente (P=0)') : 'No existe'}</div></div>
      <div class="result-row"><div class="result-row__label">Dirección física</div><div class="result-row__value ${statusType === 'success' ? 'result-row__value--success' : 'result-row__value--error'}">${physHex}h</div></div>
    `;
    pagResPanel.style.display = 'block';
  });

})();

/* ════════════════════════════════════════════════════════
   REVERSING
════════════════════════════════════════════════════════ */
(function setupReversing() {

  const binIn      = document.getElementById('revBin');
  const binErr     = document.getElementById('revBinErr');
  const bitCount   = document.getElementById('revBitCount');
  const bitCounter = document.getElementById('revBitCounter');
  const revMsg     = document.getElementById('revStatusMsg');
  const bitCard    = document.getElementById('revBitCard');
  const bitDisplay = document.getElementById('revBitDisplay');
  const revResultSection = document.getElementById('revResultSection');

  // Colores por campo
  const FIELD_COLORS = [
    '#EF4444','#F59E0B','#10B981','#3B82F6','#8B5CF6','#06B6D4',
    '#EC4899','#84CC16','#F97316','#A78BFA','#34D399','#60A5FA',
    '#FB7185','#FBBF24',
  ];

  const FIELDS = [
    { name: 'Base alta',      hi: 63, lo: 56, label: 'base_high',  color: FIELD_COLORS[0]  },
    { name: 'G',              hi: 55, lo: 55, label: 'G',          color: FIELD_COLORS[1]  },
    { name: 'D/B',            hi: 54, lo: 54, label: 'DB',         color: FIELD_COLORS[2]  },
    { name: 'L',              hi: 53, lo: 53, label: 'L',          color: FIELD_COLORS[3]  },
    { name: 'AVL',            hi: 52, lo: 52, label: 'AVL',        color: FIELD_COLORS[4]  },
    { name: 'Límite alto',    hi: 51, lo: 48, label: 'limit_high', color: FIELD_COLORS[5]  },
    { name: 'P',              hi: 47, lo: 47, label: 'P',          color: FIELD_COLORS[6]  },
    { name: 'DPL',            hi: 46, lo: 45, label: 'DPL',        color: FIELD_COLORS[7]  },
    { name: 'S',              hi: 44, lo: 44, label: 'S',          color: FIELD_COLORS[8]  },
    { name: 'Tipo',           hi: 43, lo: 40, label: 'type',       color: FIELD_COLORS[9]  },
    { name: 'Base intermedia',hi: 39, lo: 32, label: 'base_mid',   color: FIELD_COLORS[10] },
    { name: 'Base baja',      hi: 31, lo: 16, label: 'base_low',   color: FIELD_COLORS[11] },
    { name: 'Límite bajo',    hi: 15, lo:  0, label: 'limit_low',  color: FIELD_COLORS[12] },
  ];

  // Actualizar contador de bits en tiempo real
  binIn.addEventListener('input', () => {
    const clean = binIn.value.replace(/[\s\n\r]+/g, '');
    const cnt   = clean.length;
    bitCount.textContent = cnt;
    bitCounter.className = 'bit-counter' + (cnt === 64 ? ' bit-counter--ok' : (cnt > 64 ? ' bit-counter--error' : ' bit-counter--warn'));
    bitDisplay.innerHTML = '';
    bitCard.style.display = 'none';
    revResultSection.style.display = 'none';
  });

  // Cargar ejemplo
  document.getElementById('btnRevLoadEx').addEventListener('click', () => {
    // Descriptor: código 32 bits, base=0, límite=4GB, DPL=0
    binIn.value = '00000000 11001111 10011010 00000000 00000000 00000000 11111111 11111111';
    binIn.dispatchEvent(new Event('input'));
    doRevAnalyze();
  });

  // Limpiar
  document.getElementById('btnRevClear').addEventListener('click', () => {
    binIn.value = '';
    binIn.dispatchEvent(new Event('input'));
    clearField(null, binErr);
    hideMsg(revMsg);
    revResultSection.style.display = 'none';
    document.getElementById('revStepper').style.display = 'none';
  });

  // Analizar
  document.getElementById('btnRevAnalyze').addEventListener('click', doRevAnalyze);

  function doRevAnalyze() {
    const raw = binIn.value;
    const clean = raw.replace(/[\s\n\r]+/g, '');

    // Validaciones
    if (!clean) {
      setFieldError(null, binErr, '');
      binErr.textContent = 'El campo está vacío.';
      binErr.classList.add('form-error--visible');
      showMsg(revMsg, 'error', 'El campo está vacío. Introduce los 64 bits del descriptor.');
      return;
    }
    if (!/^[01]+$/.test(clean)) {
      const badChars = [...new Set(clean.split('').filter(c => c !== '0' && c !== '1'))].join(' ');
      binErr.textContent = `Se encontraron caracteres no binarios: ${badChars}`;
      binErr.classList.add('form-error--visible');
      showMsg(revMsg, 'error', `La entrada contiene caracteres no permitidos: <strong>${badChars}</strong>. Solo se admiten 0 y 1.`);
      return;
    }
    if (clean.length < 64) {
      binErr.textContent = `Faltan ${64 - clean.length} bits. Se requieren exactamente 64.`;
      binErr.classList.add('form-error--visible');
      showMsg(revMsg, 'error', `La entrada tiene ${clean.length} bits. Se requieren exactamente 64.`);
      return;
    }
    if (clean.length > 64) {
      binErr.textContent = `Sobran ${clean.length - 64} bits. Se requieren exactamente 64.`;
      binErr.classList.add('form-error--visible');
      showMsg(revMsg, 'error', `La entrada tiene ${clean.length} bits. Se requieren exactamente 64. Elimina ${clean.length - 64} bit(s).`);
      return;
    }

    binErr.textContent = '';
    binErr.classList.remove('form-error--visible');
    binIn.classList.add('form-input--success');

    try {
      const raw64 = Utils.binToBigInt(clean);
      const desc  = DescriptorDecoder.decode(raw64);
      renderRevBits(clean, desc);
      renderRevResult(desc, clean);
      showMsg(revMsg, 'success', 'Descriptor decodificado correctamente.');
      bitCard.style.display = 'block';
      revResultSection.style.display = 'block';
      window._lastRevDesc = desc;
      window._lastRevBin  = clean;
    } catch(e) {
      showMsg(revMsg, 'error', e.message || String(e));
    }
  }

  function renderRevBits(binStr, desc) {
    bitDisplay.innerHTML = '';
    // Bits del 63 al 0 (binStr[0] = bit 63)
    for (let i = 0; i < 64; i++) {
      const bitPos = 63 - i;  // posición real del bit
      const bitVal = binStr[i]; // carácter '0' o '1'

      // Encontrar campo
      const field = FIELDS.find(f => bitPos >= f.lo && bitPos <= f.hi);
      const color = field ? field.color : '#94A3B8';

      const el = document.createElement('span');
      el.className = `bit-display__bit bit-display__bit--${bitVal}`;
      el.textContent = bitVal;
      el.style.setProperty('--bit-color', color);
      el.title = `Bit ${bitPos}: ${bitVal}${field ? ` (${field.name})` : ''}`;
      el.setAttribute('role', 'img');
      el.setAttribute('aria-label', `Bit ${bitPos}: ${bitVal}${field ? `, campo: ${field.name}` : ''}`);

      if (field) {
        el.style.background = bitVal === '1'
          ? color + '33'
          : color + '0D';
        el.style.borderColor = color + '80';
        el.style.color = color;
        el.addEventListener('click', () => highlightField(field.label));
      }

      bitDisplay.appendChild(el);

      // Separadores entre bytes (cada 8 bits)
      if ((i + 1) % 8 === 0 && i < 63) {
        const sep = document.createElement('span');
        sep.className = 'bit-display__separator';
        sep.textContent = '·';
        bitDisplay.appendChild(sep);
      }
    }
  }

  let activeFieldLabel = null;
  function highlightField(label) {
    if (activeFieldLabel === label) {
      // Desactivar
      activeFieldLabel = null;
      document.querySelectorAll('.bit-display__bit').forEach(b => b.classList.remove('bit-display__bit--highlighted'));
      document.querySelectorAll('#revFieldsBody tr').forEach(r => r.classList.remove('active'));
      document.getElementById('revBitTooltip').classList.remove('status-msg--visible');
      return;
    }
    activeFieldLabel = label;
    const field = FIELDS.find(f => f.label === label);
    if (!field) return;

    // Resaltar en display de bits
    document.querySelectorAll('.bit-display__bit').forEach((el, i) => {
      const bitPos = 63 - i;
      el.classList.toggle('bit-display__bit--highlighted', bitPos >= field.lo && bitPos <= field.hi);
    });

    // Resaltar fila en tabla
    document.querySelectorAll('#revFieldsBody tr').forEach(r => {
      r.classList.toggle('active', r.dataset.field === label);
    });

    // Mostrar tooltip
    const tooltip = document.getElementById('revBitTooltip');
    tooltip.className = 'status-msg status-msg--info status-msg--visible';
    tooltip.innerHTML = `<span class="status-msg__icon">🔍</span><div class="status-msg__body">Campo: <strong>${field.name}</strong> — Bits ${field.hi}:${field.lo} (${field.hi - field.lo + 1} bit${field.hi !== field.lo ? 's' : ''})</div>`;
  }

  function renderRevResult(desc, binStr) {
    // Tipo
    const typeStr = desc.isSystem ? 'Descriptor de sistema' : (desc.isCode ? 'Segmento de código' : 'Segmento de datos');
    const presStr = desc.isPresent ? '✓ Presente' : '✗ No presente (P=0)';
    document.getElementById('revSummaryType').textContent = typeStr + ' · ' + presStr;

    // Campos reconstruidos
    document.getElementById('revSummaryBody').innerHTML = `
      <div class="result-row"><div class="result-row__label">Descriptor (hex)</div><div class="result-row__value">${desc.rawHex}</div></div>
      <div class="result-row"><div class="result-row__label">Base de 32 bits</div><div class="result-row__value">${desc.base32Hex}h</div></div>
      <div class="result-row"><div class="result-row__label">Límite de 20 bits</div><div class="result-row__value">${desc.limit20Hex}h</div></div>
      <div class="result-row"><div class="result-row__label">Límite efectivo (G=${desc.Gnum})</div><div class="result-row__value">${desc.effectiveLimitHex}h (${desc.effectiveLimitDec})</div></div>
      <div class="result-row"><div class="result-row__label">Tipo</div><div class="result-row__value">${desc.typeInfo.name}</div></div>
      <div class="result-row"><div class="result-row__label">S (Descriptor)</div><div class="result-row__value">${desc.Snum} → ${desc.isSystem ? 'Sistema/puerta' : 'Código/Datos'}</div></div>
      <div class="result-row"><div class="result-row__label">DPL</div><div class="result-row__value"><span class="priv-badge priv-badge--${desc.DPLnum}">PL${desc.DPLnum}</span></div></div>
      <div class="result-row"><div class="result-row__label">P (Presente)</div><div class="result-row__value ${desc.isPresent ? '' : 'result-row__value--error'}">${desc.Pnum} → ${presStr}</div></div>
      <div class="result-row"><div class="result-row__label">G (Granularidad)</div><div class="result-row__value">${desc.Gnum} → ${desc.Gnum ? 'Páginas de 4 KiB' : 'Bytes'}</div></div>
      <div class="result-row"><div class="result-row__label">D/B</div><div class="result-row__value">${desc.DBnum} → ${desc.DBnum ? '32 bits' : '16 bits'}</div></div>
      <div class="result-row"><div class="result-row__label">L (64 bits)</div><div class="result-row__value">${desc.Lnum}</div></div>
      <div class="result-row"><div class="result-row__label">AVL</div><div class="result-row__value">${desc.AVLnum}</div></div>
    `;

    // Tabla de campos
    const tbody = document.getElementById('revFieldsBody');
    tbody.innerHTML = FIELDS.map((f, fi) => {
      const raw64 = desc.raw64;
      const bits  = Utils.extractBits(raw64, f.hi, f.lo);
      const bitsN = f.hi - f.lo + 1;
      const binVal = Utils.bigIntToBin(bits, bitsN);
      const hexVal = bitsN <= 4 ? '' : Utils.bigIntToHex(bits, Math.ceil(bitsN / 4));
      const decVal = bits.toString(10);
      const interp = getFieldInterp(f.label, desc);

      return `<tr data-field="${f.label}" onclick="revHighlightFromTable('${f.label}')">
        <td><span class="field-dot" style="background:${f.color}"></span></td>
        <td>${f.name}</td>
        <td style="color:var(--color-text-faint);font-size:0.78rem">${f.hi}${f.hi !== f.lo ? ':' + f.lo : ''}</td>
        <td><code style="font-size:0.78rem">${binVal}</code></td>
        <td><code>${hexVal || decVal}</code></td>
        <td><code>${decVal}</code></td>
        <td style="font-size:0.82rem;color:var(--color-text-muted)">${interp}</td>
      </tr>`;
    }).join('');

    // Explicación en lenguaje sencillo
    buildExplanation(desc);
  }

  window.revHighlightFromTable = (label) => highlightField(label);

  function getFieldInterp(label, desc) {
    switch (label) {
      case 'base_high': return `Bits 24–31 de la base → ${Utils.bigIntToHex(desc.base_high, 2)}h`;
      case 'G': return desc.Gnum ? 'Límite en páginas de 4 KiB' : 'Límite en bytes';
      case 'DB': return desc.DBnum ? 'Operandos/pila de 32 bits' : 'Operandos/pila de 16 bits';
      case 'L': return desc.Lnum ? 'Segmento de 64 bits (IA-32e)' : 'No modo de 64 bits';
      case 'AVL': return 'Disponible para el sistema operativo';
      case 'limit_high': return `Bits 16–19 del límite → ${Utils.bigIntToHex(desc.limit_high, 1)}h`;
      case 'P': return desc.isPresent ? 'Segmento presente en memoria' : '¡No presente! Se generaría excepción';
      case 'DPL': return `Nivel de privilegio ${desc.DPLnum} (PL${desc.DPLnum})`;
      case 'S': return desc.Snum ? 'Descriptor de código/datos' : 'Descriptor de sistema o puerta';
      case 'type': return desc.typeInfo.name;
      case 'base_mid': return `Bits 16–23 de la base → ${Utils.bigIntToHex(desc.base_mid, 2)}h`;
      case 'base_low': return `Bits 0–15 de la base → ${Utils.bigIntToHex(desc.base_low, 4)}h`;
      case 'limit_low': return `Bits 0–15 del límite → ${Utils.bigIntToHex(desc.limit_low, 4)}h`;
      default: return '—';
    }
  }

  function buildExplanation(desc) {
    const el = document.getElementById('revExplainBody');
    const pres = desc.isPresent ? 'está presente en memoria' : '<strong style="color:var(--color-error)">NO está presente en memoria (P=0)</strong>';

    let extra = '';
    if (desc.isSystem) {
      extra = `<p>Este es un <strong>descriptor de sistema</strong> (S=0). Puede corresponder a una puerta de llamada, puerta de interrupción, TSS u otro descriptor especial. No debe cargarse en DS, CS o SS como descriptor ordinario.</p>`;
    } else if (desc.isCode) {
      extra = `<p>El segmento es de <strong>código</strong>. ${desc.allowRead ? 'Permite lectura además de ejecución.' : 'Solo permite ejecución (no se puede leer directamente).'}
      ${desc.isConforming ? 'Es un segmento <strong>conforme</strong>: puede ejecutarse desde niveles de privilegio menores.' : 'No es conforme: solo se puede ejecutar desde el mismo nivel de privilegio o más privilegiado.'}</p>`;
    } else {
      extra = `<p>El segmento es de <strong>datos</strong>. ${desc.allowWrite ? 'Permite lectura y escritura.' : 'Solo permite lectura.'}
      ${desc.isExpandDown ? 'Expansión <strong>hacia abajo</strong>: el offset debe ser MAYOR que el límite.' : 'Expansión <strong>hacia arriba</strong>: el offset debe ser ≤ límite efectivo.'}</p>`;
    }

    el.innerHTML = `
      <p>El descriptor analizado ${pres}. Su base se reconstruye a partir de tres fragmentos: 
      <code>${Utils.bigIntToHex(desc.base_low, 4)}h</code> (bits 31:16), 
      <code>${Utils.bigIntToHex(desc.base_mid, 2)}h</code> (bits 39:32) y 
      <code>${Utils.bigIntToHex(desc.base_high, 2)}h</code> (bits 63:56), 
      formando la base de 32 bits <strong>${desc.base32Hex}h</strong>.</p>
      <p style="margin-top:0.75rem">El límite se obtiene de <code>${Utils.bigIntToHex(desc.limit_low, 4)}h</code> (bits 15:0) y <code>${Utils.bigIntToHex(desc.limit_high, 1)}h</code> (bits 51:48), 
      resultando en el límite de 20 bits <strong>${desc.limit20Hex}h</strong>. 
      Con G=${desc.Gnum}, el límite efectivo es <strong>${desc.effectiveLimitHex}h</strong> 
      ${desc.Gnum ? '(cada unidad equivale a una página de 4 KiB, por lo que el límite máximo es ≈4 GiB)' : '(en bytes, máximo ≈1 MiB)'}.</p>
      ${extra}
      <p style="margin-top:0.75rem">El nivel de privilegio del descriptor (DPL) es <strong>${desc.DPLnum}</strong> 
      (${['Kernel — máximo privilegio', 'Servicios del SO', 'Servicios adicionales', 'Usuario — mínimo privilegio'][desc.DPLnum]}). 
      El atributo D/B indica operandos de <strong>${desc.DBnum ? '32' : '16'} bits</strong>.</p>
    `;
  }

  // Copiar resultado
  document.getElementById('btnRevCopyResult').addEventListener('click', () => {
    if (!window._lastRevDesc) return;
    const d = window._lastRevDesc;
    const text = `ARQ LAB — Reversing de Descriptor\nDescriptor (hex): ${d.rawHex}\nBase 32b: ${d.base32Hex}h\nLímite 20b: ${d.limit20Hex}h\nLímite efectivo: ${d.effectiveLimitHex}h\nTipo: ${d.typeInfo.name}\nS=${d.Snum} DPL=${d.DPLnum} P=${d.Pnum} G=${d.Gnum} D/B=${d.DBnum} L=${d.Lnum} AVL=${d.AVLnum}`;
    navigator.clipboard.writeText(text).then(() => showMsg(revMsg, 'success', 'Resultado copiado al portapapeles.'));
  });

  document.getElementById('btnRevReset').addEventListener('click', () => {
    binIn.value = '';
    binIn.dispatchEvent(new Event('input'));
    revResultSection.style.display = 'none';
    binIn.classList.remove('form-input--success');
    hideMsg(revMsg);
  });

  // ── Stepper reversing ──
  const revStepper = document.getElementById('revStepper');
  const revStepBar = document.getElementById('revStepBar');
  const revStepNum = document.getElementById('revStepNum');
  const revStepTitle = document.getElementById('revStepTitle');
  const revStepContent = document.getElementById('revStepContent');
  const revStepValue   = document.getElementById('revStepValue');
  let revStepData = [];
  let revStepIdx  = 0;
  let revPlayTimer = null;

  document.getElementById('btnRevStep').addEventListener('click', () => {
    doRevAnalyze();
    if (!window._lastRevDesc) return;
    const desc = window._lastRevDesc;
    revStepData = buildRevSteps(desc, window._lastRevBin);
    revStepIdx = 0;
    revStepper.style.display = 'block';
    renderRevStep();
  });

  function buildRevSteps(desc, binStr) {
    return [
      {
        titulo: 'Paso 1 — Leer el descriptor binario',
        desc: `El descriptor introducido tiene <strong>64 bits</strong>. En hexadecimal: <code>${desc.rawHex}</code>.<br>Los bits se leen de izquierda a derecha: bit 63 (MSB) a bit 0 (LSB).`,
        val: desc.rawHex,
      },
      {
        titulo: 'Paso 2 — Extraer la base de 32 bits',
        desc: `La base está fragmentada en tres partes: bits 63:56 (alta), 39:32 (media), 31:16 (baja).<br>Base alta = <code>${Utils.bigIntToHex(desc.base_high, 2)}h</code>, media = <code>${Utils.bigIntToHex(desc.base_mid, 2)}h</code>, baja = <code>${Utils.bigIntToHex(desc.base_low, 4)}h</code><br>Base 32b = <strong>${desc.base32Hex}h</strong>`,
        val: desc.base32Hex,
      },
      {
        titulo: 'Paso 3 — Extraer el límite de 20 bits',
        desc: `Límite bajo (bits 15:0) = <code>${Utils.bigIntToHex(desc.limit_low, 4)}h</code>, límite alto (bits 51:48) = <code>${Utils.bigIntToHex(desc.limit_high, 1)}h</code>.<br>Límite 20b = <strong>${desc.limit20Hex}h</strong>`,
        val: desc.limit20Hex,
      },
      {
        titulo: 'Paso 4 — Calcular el límite efectivo (G)',
        desc: `G = <code>${desc.Gnum}</code>. ${desc.Gnum ? 'G=1: límite × 4096 + 4095 → granularidad de página.' : 'G=0: límite en bytes.'}<br>Límite efectivo = <strong>${desc.effectiveLimitHex}h</strong> (${desc.effectiveLimitDec})`,
        val: desc.effectiveLimitHex,
      },
      {
        titulo: 'Paso 5 — Interpretar el bit S y el tipo',
        desc: `S = <code>${desc.Snum}</code> → ${desc.isSystem ? 'Descriptor de <strong>sistema</strong>.' : 'Descriptor de <strong>código o datos</strong>.'}<br>Tipo = <code>${Utils.bigIntToBin(desc.type, 4)}</code> (${Number(desc.type)}) → <strong>${desc.typeInfo.name}</strong>`,
        val: Number(desc.type).toString(),
      },
      {
        titulo: 'Paso 6 — Privilegio, presencia y granularidad',
        desc: `DPL = <code>${desc.DPLnum}</code> (Nivel de privilegio del descriptor).<br>P = <code>${desc.Pnum}</code> → ${desc.isPresent ? '<strong>Presente</strong>' : '<strong style="color:var(--color-error)">No presente</strong>'}.<br>G = <code>${desc.Gnum}</code>, D/B = <code>${desc.DBnum}</code>, AVL = <code>${desc.AVLnum}</code>, L = <code>${desc.Lnum}</code>`,
        val: `DPL=${desc.DPLnum} P=${desc.Pnum} G=${desc.Gnum}`,
      },
      {
        titulo: 'Paso 7 — Clasificación del descriptor',
        desc: `${desc.isPresent ? '' : '<strong style="color:var(--color-error)">⚠ El segmento no está presente. No puede usarse directamente.</strong><br>'}` +
          (desc.isSystem ? 'Este es un <strong>descriptor de sistema</strong>. Requiere interpretación especial según el tipo de sistema.' :
          desc.isCode ? `<strong>Segmento de código</strong> de ${desc.DBnum ? '32' : '16'} bits con base <code>${desc.base32Hex}h</code> y límite efectivo <code>${desc.effectiveLimitHex}h</code>. ${desc.allowRead ? 'Legible.' : 'Solo ejecución.'} ${desc.isConforming ? 'Conforme.' : 'No conforme.'}` :
          `<strong>Segmento de datos</strong> de ${desc.DBnum ? '32' : '16'} bits con base <code>${desc.base32Hex}h</code> y límite efectivo <code>${desc.effectiveLimitHex}h</code>. ${desc.allowWrite ? 'Lectura/Escritura.' : 'Solo lectura.'} ${desc.isExpandDown ? 'Expansión hacia abajo.' : 'Expansión hacia arriba.'}`),
        val: desc.isSystem ? 'Sistema' : (desc.isCode ? 'Código' : 'Datos'),
      },
    ];
  }

  function renderRevStep() {
    const total = revStepData.length;
    const step  = revStepData[revStepIdx];
    const pct   = Math.round(((revStepIdx + 1) / total) * 100);
    revStepBar.style.width = pct + '%';
    revStepNum.textContent = `Paso ${revStepIdx + 1} de ${total}`;
    revStepTitle.textContent = step.titulo;
    revStepContent.innerHTML = step.desc;
    revStepValue.textContent = step.val;
    revStepValue.style.display = 'inline-block';
    document.getElementById('btnRevStepPrev').disabled = revStepIdx === 0;
    document.getElementById('btnRevStepNext').disabled = revStepIdx === total - 1;
  }

  document.getElementById('btnRevStepPrev').addEventListener('click',  () => { revStepIdx = Math.max(0, revStepIdx - 1); renderRevStep(); });
  document.getElementById('btnRevStepNext').addEventListener('click',  () => { revStepIdx = Math.min(revStepData.length - 1, revStepIdx + 1); renderRevStep(); });
  document.getElementById('btnRevStepReset').addEventListener('click', () => { revStepIdx = 0; renderRevStep(); });
  document.getElementById('btnRevStepClose').addEventListener('click', () => { revStepper.style.display = 'none'; clearInterval(revPlayTimer); });
  document.getElementById('btnRevStepPlay').addEventListener('click', () => {
    if (revPlayTimer) {
      clearInterval(revPlayTimer); revPlayTimer = null;
      document.getElementById('btnRevStepPlay').textContent = '▶ Reproducir';
    } else {
      document.getElementById('btnRevStepPlay').textContent = '⏸ Pausar';
      revPlayTimer = setInterval(() => {
        if (revStepIdx < revStepData.length - 1) { revStepIdx++; renderRevStep(); }
        else { clearInterval(revPlayTimer); revPlayTimer = null; document.getElementById('btnRevStepPlay').textContent = '▶ Reproducir'; }
      }, 2000);
    }
  });

})();

/* ════════════════════════════════════════════════════════
   EJERCICIOS
════════════════════════════════════════════════════════ */
(function setupExercises() {

  let scoreCorrect = 0, scoreWrong = 0, scoreTotal = 0;
  let activeEx  = null;
  let activeCat = 'real';

  const catLabels = {
    real: 'Modo Real', selector: 'Selector', lineal: 'Dirección Lineal',
    descriptor: 'Descriptor', error: 'Identificar Error', reversing: 'Reversing',
  };

  document.querySelectorAll('#exCatBtns [data-cat]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeCat = btn.dataset.cat;
      document.querySelectorAll('#exCatBtns [data-cat]').forEach(b => {
        b.className = b.dataset.cat === activeCat ? 'btn btn--primary btn--sm' : 'btn btn--ghost btn--sm';
      });
      loadExercise();
    });
  });

  document.getElementById('btnNewExercise').addEventListener('click', loadExercise);

  function loadExercise() {
    try {
      activeEx = ExerciseEngine.generate(activeCat);
    } catch(e) {
      document.getElementById('activeExercise').innerHTML = `<div style="color:var(--color-error)">${e.message}</div>`;
      return;
    }

    const catClass = `exercise-card__category--${activeCat}`;
    document.getElementById('activeExercise').innerHTML = `
      <div class="exercise-card__category ${catClass}">${catLabels[activeCat] || activeCat}</div>
      <div class="exercise-card__question">${activeEx.enunciado}</div>
      <div class="exercise-card__answer">
        <input type="text" class="form-input" id="exAnswer"
          placeholder="Tu respuesta..." autocomplete="off"
          aria-label="Respuesta al ejercicio" />
        <button class="btn btn--primary btn--sm" id="btnVerify">✓ Verificar</button>
        <button class="btn btn--ghost btn--sm" id="btnHint">💡 Pista</button>
      </div>
      <div class="exercise-card__feedback" id="exFeedback"></div>
    `;

    document.getElementById('btnVerify').addEventListener('click', verifyAnswer);
    document.getElementById('exAnswer').addEventListener('keydown', e => { if (e.key === 'Enter') verifyAnswer(); });
    document.getElementById('btnHint').addEventListener('click', () => {
      const fb = document.getElementById('exFeedback');
      fb.innerHTML = `<strong>Pista:</strong> ${activeEx.pista}`;
      fb.className = 'exercise-card__feedback exercise-card__feedback--visible';
      fb.style.background = 'rgba(245,158,11,0.08)';
      fb.style.border = '1px solid rgba(245,158,11,0.25)';
      fb.style.color = 'var(--color-warn)';
    });
    document.getElementById('btnNewExercise').style.display = 'inline-flex';
  }

  function verifyAnswer() {
    const input = document.getElementById('exAnswer');
    const answer = input.value;
    if (!answer.trim()) { input.classList.add('form-input--error'); return; }
    input.classList.remove('form-input--error');

    const correct = activeEx.verificar(answer);
    const fb = document.getElementById('exFeedback');
    fb.className = `exercise-card__feedback exercise-card__feedback--visible exercise-card__feedback--${correct ? 'correct' : 'wrong'}`;
    fb.innerHTML = correct
      ? `<strong>✓ ¡Correcto!</strong> ${activeEx.explicacion}`
      : `<strong>✕ Incorrecto.</strong> La respuesta correcta es <strong>${activeEx.respuestaEsperada}</strong>.<br>${activeEx.explicacion}`;

    scoreTotal++;
    if (correct) scoreCorrect++; else scoreWrong++;
    document.getElementById('scoreCorrect').textContent = scoreCorrect;
    document.getElementById('scoreWrong').textContent   = scoreWrong;
    document.getElementById('scoreTotal').textContent   = scoreTotal;
    input.disabled = true;
    document.getElementById('btnVerify').disabled = true;
  }

  document.getElementById('btnResetScore').addEventListener('click', () => {
    scoreCorrect = scoreWrong = scoreTotal = 0;
    document.getElementById('scoreCorrect').textContent = '0';
    document.getElementById('scoreWrong').textContent   = '0';
    document.getElementById('scoreTotal').textContent   = '0';
  });

})();

/* ════════════════════════════════════════════════════════
   TEORÍA — ACORDEONES
════════════════════════════════════════════════════════ */
function toggleTheory(id) {
  const section = document.getElementById(id);
  if (!section) return;
  const isOpen = section.classList.toggle('theory-section--open');
  section.querySelector('.theory-section__header').setAttribute('aria-expanded', isOpen);
}
// Teclado
document.querySelectorAll('.theory-section__header').forEach(h => {
  h.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); h.click(); } });
});

/* ════════════════════════════════════════════════════════
   PRUEBAS AUTOMATIZADAS
════════════════════════════════════════════════════════ */
document.getElementById('btnRunTests').addEventListener('click', () => {
  const report = AutoTests.run();
  // Mostrar resumen
  document.getElementById('testPassed').textContent = report.passed;
  document.getElementById('testFailed').textContent = report.failed;
  document.getElementById('testTotal').textContent  = report.total;
  document.getElementById('testSummary').style.display = 'flex';

  // Renderizar resultados
  const list = document.getElementById('testResultList');
  list.innerHTML = report.results.map(r => `
    <div class="test-result">
      <span class="test-result__badge test-result__badge--${r.status.toLowerCase()}">${r.status}</span>
      <span class="test-result__name">${r.name}</span>
      <span class="test-result__detail">${r.detail}</span>
    </div>
  `).join('');
});

/* ════════════════════════════════════════════════════════
   TOUR / MODAL
════════════════════════════════════════════════════════ */
const tourModal = document.getElementById('tourModal');
document.getElementById('btnTour').addEventListener('click', () => tourModal.classList.add('modal-overlay--open'));
document.getElementById('btnTourAbout').addEventListener('click', () => tourModal.classList.add('modal-overlay--open'));
document.getElementById('btnTourClose').addEventListener('click', () => tourModal.classList.remove('modal-overlay--open'));
document.getElementById('btnTourStart').addEventListener('click', () => {
  tourModal.classList.remove('modal-overlay--open');
  navigateTo('real');
});
tourModal.addEventListener('click', e => { if (e.target === tourModal) tourModal.classList.remove('modal-overlay--open'); });
// Cerrar con Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    tourModal.classList.remove('modal-overlay--open');
    document.getElementById('addDescModal').classList.remove('modal-overlay--open');
  }
});

/* ════════════════════════════════════════════════════════
   INICIALIZACIÓN
════════════════════════════════════════════════════════ */
window.addEventListener('load', () => {
  // Ajustar canvas de diagrama al resize
  window.addEventListener('resize', () => {
    const canvas = document.getElementById('realDiagramCanvas');
    if (canvas && canvas.style.display !== 'none' && window._lastRealResult) {
      // No hay acceso a lastResult desde fuera; simplemente se redibuja al próximo cálculo
    }
  });
  console.log('%c ARQ LAB ', 'background:#1D4ED8;color:#fff;padding:4px 12px;border-radius:4px;font-weight:bold', '— Simulador x86 cargado correctamente.');
  console.log('%c Para ejecutar las pruebas: ', 'color:#10B981', 'navega a la sección Pruebas → Ejecutar todas las pruebas');
});
