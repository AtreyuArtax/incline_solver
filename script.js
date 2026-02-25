// --- Application State ---
const state = {
  leftAngle: 30,
  leftObjs: [{ id: 'l1', m: 10, mu: 0.2 }],
  flatObjs: [],
  rightAngle: 90,
  rightObjs: [{ id: 'r1', m: 5, mu: 0 }],
  results: null
};

// --- SVG Icons ---
const icons = {
  trash: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`,
  move: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="5 9 2 12 5 15"></polyline><polyline points="9 5 12 2 15 5"></polyline><polyline points="19 9 22 12 19 15"></polyline><polyline points="9 19 12 22 15 19"></polyline><line x1="2" y1="12" x2="22" y2="12"></line><line x1="12" y1="2" x2="12" y2="22"></line></svg>`,
  anchor: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="3"></circle><line x1="12" y1="22" x2="12" y2="8"></line><path d="M5 12H2a10 10 0 0 0 20 0h-3"></path></svg>`,
  arrowRight: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`,
  info: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`
};

// --- DOM Elements ---
const leftSlider = document.getElementById('left-angle-slider');
const rightSlider = document.getElementById('right-angle-slider');
const leftDisplay = document.getElementById('left-angle-display');
const rightDisplay = document.getElementById('right-angle-display');
const leftContainer = document.getElementById('left-objs-container');
const rightContainer = document.getElementById('right-objs-container');
const flatContainer = document.getElementById('flat-objs-container');
const dynamicResults = document.getElementById('dynamic-results');
const canvas = document.getElementById('physics-canvas');
const ctx = canvas.getContext('2d');

// --- Physics Engine ---
function calculatePhysics() {
  const g = 9.81;
  const rad = (deg) => (deg * Math.PI) / 180;

  const thL = rad(state.leftAngle);
  const thR = rad(state.rightAngle);

  let M_L = 0, Fg_L = 0, fk_L = 0;
  state.leftObjs.forEach(obj => {
    M_L += obj.m;
    Fg_L += obj.m * g * Math.sin(thL);
    fk_L += obj.m * g * Math.cos(thL) * obj.mu;
  });

  let M_R = 0, Fg_R = 0, fk_R = 0;
  state.rightObjs.forEach(obj => {
    M_R += obj.m;
    Fg_R += obj.m * g * Math.sin(thR);
    fk_R += obj.m * g * Math.cos(thR) * obj.mu;
  });

  let M_F = 0, fk_F = 0;
  state.flatObjs.forEach(obj => {
    M_F += obj.m;
    fk_F += obj.m * g * obj.mu;
  });

  const M_tot = M_L + M_R + M_F;
  const Fnet_g = Fg_R - Fg_L;

  let a = 0;
  let direction = "Stationary";
  let moving = false;
  let steps = [];

  steps.push(`1. Total Gravity pulling Left side: Σ(m*g*sin(θL)) = ${Fg_L.toFixed(2)} N`);
  steps.push(`2. Total Gravity pulling Right side: Σ(m*g*sin(θR)) = ${Fg_R.toFixed(2)} N`);
  steps.push(`3. Net driving force (gravity only) = |Fg_R - Fg_L| = ${Math.abs(Fnet_g).toFixed(2)} N`);

  const totalFriction = fk_L + fk_R + fk_F;

  if (Fnet_g > 0) {
    steps.push(`4. System tends to pull Right.`);
    const Fnet = Fnet_g - totalFriction;
    if (Fnet > 0) {
      a = Fnet / M_tot;
      direction = "Towards Right Side";
      moving = true;
      steps.push(`5. Max Friction: L=${fk_L.toFixed(2)}N, R=${fk_R.toFixed(2)}N, Flat=${fk_F.toFixed(2)}N`);
      steps.push(`6. Net Force = Fg_R - Fg_L - Σfk = ${Fnet.toFixed(2)} N`);
    } else {
      steps.push(`5. Total Friction (${totalFriction.toFixed(2)} N) counters driving force. Stationary.`);
    }
  } else if (Fnet_g < 0) {
    steps.push(`4. System tends to pull Left.`);
    const Fnet = Math.abs(Fnet_g) - totalFriction;
    if (Fnet > 0) {
      a = Fnet / M_tot;
      direction = "Towards Left Side";
      moving = true;
      steps.push(`5. Max Friction: L=${fk_L.toFixed(2)}N, R=${fk_R.toFixed(2)}N, Flat=${fk_F.toFixed(2)}N`);
      steps.push(`6. Net Force = Fg_L - Fg_R - Σfk = ${Fnet.toFixed(2)} N`);
    } else {
      steps.push(`5. Total Friction (${totalFriction.toFixed(2)} N) counters driving force. Stationary.`);
    }
  } else {
    steps.push(`4. Gravitational forces balance perfectly. Stationary.`);
  }

  if (moving) {
    steps.push(`7. Acceleration (a) = Fnet / M_tot = ${a.toFixed(3)} m/s²`);
  }

  let leftTensions = new Array(state.leftObjs.length).fill(0);
  let rightTensions = new Array(state.rightObjs.length).fill(0);
  let flatTensions = new Array(state.flatObjs.length + 1).fill(0);

  // Accumulate tensions from bottom up for Left/Right, then Flat
  if (moving && direction === "Towards Right Side") {
    // Left side
    let curT = 0;
    for (let i = state.leftObjs.length - 1; i >= 0; i--) {
      const o = state.leftObjs[i];
      curT += o.m * g * Math.sin(thL) + o.m * g * Math.cos(thL) * o.mu + o.m * a;
      leftTensions[i] = curT;
    }
    // Flat side
    flatTensions[0] = curT;
    for (let i = 0; i < state.flatObjs.length; i++) {
      const o = state.flatObjs[i];
      curT += o.m * g * o.mu + o.m * a;
      flatTensions[i + 1] = curT;
    }
    // Right side
    for (let i = 0; i < state.rightObjs.length; i++) {
      const o = state.rightObjs[i];
      curT -= (o.m * g * Math.sin(thR) - o.m * g * Math.cos(thR) * o.mu - o.m * a);
      rightTensions[i] = curT; // This is T above the i-th block
    }
    // Re-calculate rightTensions from bottom up for consistency in display
    let curTR = 0;
    for (let i = state.rightObjs.length - 1; i >= 0; i--) {
      const o = state.rightObjs[i];
      curTR += o.m * g * Math.sin(thR) - o.m * g * Math.cos(thR) * o.mu - o.m * a;
      rightTensions[i] = curTR;
    }
  } else if (moving && direction === "Towards Left Side") {
    // Right side
    let curT = 0;
    for (let i = state.rightObjs.length - 1; i >= 0; i--) {
      const o = state.rightObjs[i];
      curT += o.m * g * Math.sin(thR) + o.m * g * Math.cos(thR) * o.mu + o.m * a;
      rightTensions[i] = curT;
    }
    // Flat side (right to left)
    flatTensions[state.flatObjs.length] = curT;
    for (let i = state.flatObjs.length - 1; i >= 0; i--) {
      const o = state.flatObjs[i];
      curT += o.m * g * o.mu + o.m * a;
      flatTensions[i] = curT;
    }
    // Left side
    let curTL = 0;
    for (let i = state.leftObjs.length - 1; i >= 0; i--) {
      const o = state.leftObjs[i];
      curTL += o.m * g * Math.sin(thL) - o.m * g * Math.cos(thL) * o.mu - o.m * a;
      leftTensions[i] = curTL;
    }
  } else {
    // Stationary
    let curTL = 0;
    for (let i = state.leftObjs.length - 1; i >= 0; i--) { curTL += state.leftObjs[i].m * g * Math.sin(thL); leftTensions[i] = curTL; }
    let curTR = 0;
    for (let i = state.rightObjs.length - 1; i >= 0; i--) { curTR += state.rightObjs[i].m * g * Math.sin(thR); rightTensions[i] = curTR; }
    flatTensions.fill(Math.max(curTL, curTR));
  }

  let mainTension = Math.max(flatTensions[0] || 0, flatTensions[flatTensions.length - 1] || 0);

  state.results = { a, mainTension, leftTensions, rightTensions, flatTensions, direction, steps, moving };
}

// --- Visualization Engine ---
function drawCanvas() {
  const width = canvas.width;
  const height = canvas.height;

  const primary = '#3b82f6';
  const secondary = '#ef4444';
  const flatCol = '#10b981';
  const pulleyCol = '#475569';
  const stringCol = '#94a3b8';
  const surfaceCol = '#cbd5e1';

  ctx.clearRect(0, 0, width, height);

  const flatWidth = 240;
  const cy = 80;
  const R = 24;
  const blockW = 46;
  const blockH = 36;
  const baseD = 80;
  const gap = 30;

  const cxL = (width / 2) - (flatWidth / 2);
  const cxR = (width / 2) + (flatWidth / 2);

  const rad = (deg) => (deg * Math.PI) / 180;
  const th1 = rad(state.leftAngle);
  const th2 = rad(state.rightAngle);

  // Connection points on pulleys
  const TX1 = cxL - R * Math.sin(th1);
  const TY1 = cy - R * Math.cos(th1);
  const TX2 = cxR + R * Math.sin(th2);
  const TY2 = cy - R * Math.cos(th2);

  // Draw Flat Surface
  ctx.lineWidth = 4;
  ctx.strokeStyle = surfaceCol;
  ctx.beginPath();
  ctx.moveTo(cxL, cy - R + (blockH / 2) + 2);
  ctx.lineTo(cxR, cy - R + (blockH / 2) + 2);
  ctx.stroke();

  // Draw Inclines
  if (state.leftAngle < 90) {
    ctx.beginPath();
    const sx = TX1 - (blockH / 2 + 2) * Math.sin(th1);
    const sy = TY1 + (blockH / 2 + 2) * Math.cos(th1);
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx - 500 * Math.cos(th1), sy + 500 * Math.sin(th1));
    ctx.stroke();
  }
  if (state.rightAngle < 90) {
    ctx.beginPath();
    const sx2 = TX2 + (blockH / 2 + 2) * Math.sin(th2);
    const sy2 = TY2 + (blockH / 2 + 2) * Math.cos(th2);
    ctx.moveTo(sx2, sy2);
    ctx.lineTo(sx2 + 500 * Math.cos(th2), sy2 + 500 * Math.sin(th2));
    ctx.stroke();
  }

  // Draw Strings
  ctx.lineWidth = 2;
  ctx.strokeStyle = stringCol;

  // Left string
  const maxDL = baseD + (state.leftObjs.length - 1) * (blockW + gap);
  ctx.beginPath(); ctx.moveTo(TX1, TY1);
  ctx.lineTo(TX1 - maxDL * Math.cos(th1), TY1 + maxDL * Math.sin(th1));
  ctx.stroke();

  // Right string
  const maxDR = baseD + (state.rightObjs.length - 1) * (blockW + gap);
  ctx.beginPath(); ctx.moveTo(TX2, TY2);
  ctx.lineTo(TX2 + maxDR * Math.cos(th2), TY2 + maxDR * Math.sin(th2));
  ctx.stroke();

  // Flat string
  ctx.beginPath();
  ctx.moveTo(cxL, cy - R);
  ctx.lineTo(cxR, cy - R);
  ctx.stroke();

  // Over pulleys
  ctx.beginPath(); ctx.arc(cxL, cy, R, Math.PI + th1, 1.5 * Math.PI); ctx.stroke();
  ctx.beginPath(); ctx.arc(cxR, cy, R, 1.5 * Math.PI, 2 * Math.PI - th2); ctx.stroke();

  // Draw Pulleys
  [cxL, cxR].forEach(cx => {
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = pulleyCol; ctx.fill();
    ctx.strokeStyle = '#334155'; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#cbd5e1'; ctx.fill();
  });

  // Draw Blocks
  const drawBlock = (tx, ty, angle, color, mass, index, isLeft, isFlat) => {
    ctx.save();
    let Bx, By;
    if (isFlat) {
      const dist = (flatWidth / (state.flatObjs.length + 1)) * (index + 1);
      Bx = cxL + dist;
      By = cy - R;
    } else {
      const dist = baseD + index * (blockW + gap);
      Bx = tx + (isLeft ? -dist * Math.cos(angle) : dist * Math.cos(angle));
      By = ty + dist * Math.sin(angle);
    }

    ctx.translate(Bx, By);
    if (!isFlat) ctx.rotate(isLeft ? -angle : angle);

    ctx.fillStyle = color;
    ctx.lineJoin = "round"; ctx.lineWidth = 3; ctx.strokeStyle = '#0f172a';
    ctx.fillRect(-blockW / 2, -blockH / 2, blockW, blockH);
    ctx.strokeRect(-blockW / 2, -blockH / 2, blockW, blockH);

    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(`${mass}kg`, 0, 0);
    ctx.restore();
  };

  state.leftObjs.forEach((o, i) => drawBlock(TX1, TY1, th1, primary, o.m, i, true, false));
  state.rightObjs.forEach((o, i) => drawBlock(TX2, TY2, th2, secondary, o.m, i, false, false));
  state.flatObjs.forEach((o, i) => drawBlock(0, 0, 0, flatCol, o.m, i, false, true));

  // Motion Arrow
  if (state.results && state.results.moving) {
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    if (state.results.direction === "Towards Right Side") {
      const ax = TX2 + (maxDR + 50) * Math.cos(th2);
      const ay = TY2 + (maxDR + 50) * Math.sin(th2);
      ctx.translate(ax, ay); ctx.rotate(th2);
      ctx.moveTo(0, -10); ctx.lineTo(20, 0); ctx.lineTo(0, 10); ctx.fill();
      ctx.resetTransform();
    } else {
      const ax = TX1 - (maxDL + 50) * Math.cos(th1);
      const ay = TY1 + (maxDL + 50) * Math.sin(th1);
      ctx.translate(ax, ay); ctx.rotate(Math.PI - th1);
      ctx.moveTo(0, -10); ctx.lineTo(20, 0); ctx.lineTo(0, 10); ctx.fill();
      ctx.resetTransform();
    }
  }
}

// --- DOM Rendering ---
function renderObjectLists() {
  const createObjHtml = (obj, idx, side, colorClass, disableDelete) => `
        <div class="p-3 bg-slate-50 border border-slate-200 rounded-lg relative">
          <div class="absolute top-3 right-3 flex space-x-2">
            <span class="text-xs font-mono text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">#${idx + 1}</span>
            <button data-action="delete" data-side="${side}" data-id="${obj.id}" ${disableDelete ? 'disabled' : ''} 
                    class="text-slate-400 hover:text-red-500 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors">
              ${icons.trash}
            </button>
          </div>
          <div class="grid grid-cols-2 gap-3 pr-16">
            <div>
              <label class="block text-xs text-slate-500 mb-1">Mass (kg)</label>
              <input type="number" min="0.1" step="0.1" data-side="${side}" data-id="${obj.id}" data-field="m" value="${obj.m}"
                     class="w-full px-2 py-1.5 text-sm bg-white border border-slate-300 rounded focus:ring-2 focus:ring-${colorClass}-500 outline-none">
            </div>
            <div>
              <label class="block text-xs text-slate-500 mb-1">Friction (μ)</label>
              <input type="number" min="0" max="1" step="0.01" data-side="${side}" data-id="${obj.id}" data-field="mu" value="${obj.mu}"
                     class="w-full px-2 py-1.5 text-sm bg-white border border-slate-300 rounded focus:ring-2 focus:ring-${colorClass}-500 outline-none">
            </div>
          </div>
        </div>
      `;

  leftContainer.innerHTML = state.leftObjs.map((obj, idx) => createObjHtml(obj, idx, 'left', 'blue', state.leftObjs.length === 1)).join('');
  rightContainer.innerHTML = state.rightObjs.map((obj, idx) => createObjHtml(obj, idx, 'right', 'red', state.rightObjs.length === 1)).join('');
  flatContainer.innerHTML = state.flatObjs.map((obj, idx) => createObjHtml(obj, idx, 'flat', 'emerald', false)).join('');
}

function renderResults() {
  if (!state.results) {
    dynamicResults.innerHTML = '';
    return;
  }

  const res = state.results;
  let html = '';

  // Main Results Block
  html += `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="p-5 rounded-xl shadow-sm border flex items-center space-x-4 ${res.moving ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-100 border-slate-200'}">
            <div class="p-3 rounded-full shrink-0 ${res.moving ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}">
              ${res.moving ? icons.move : icons.anchor}
            </div>
            <div>
              <p class="text-sm font-medium text-slate-500 uppercase tracking-wider">System Acceleration</p>
              <p class="text-2xl font-bold text-slate-900">${res.a.toFixed(3)} m/s²</p>
              <p class="text-sm font-medium text-slate-600 mt-1">${res.direction}</p>
            </div>
          </div>

          <div class="bg-amber-50 border border-amber-200 p-5 rounded-xl shadow-sm flex items-center space-x-4">
            <div class="p-3 bg-amber-100 rounded-full text-amber-600 shrink-0">
              ${icons.arrowRight}
            </div>
            <div class="grid grid-cols-2 gap-4 w-full">
              <div>
                <p class="text-[10px] font-bold text-amber-700 uppercase tracking-tighter">Left Pulley T</p>
                <p class="text-xl font-bold text-amber-900">${(res.flatTensions[0] || 0).toFixed(2)} N</p>
              </div>
              <div>
                <p class="text-[10px] font-bold text-amber-700 uppercase tracking-tighter">Right Pulley T</p>
                <p class="text-xl font-bold text-amber-900">${(res.flatTensions[res.flatTensions.length - 1] || 0).toFixed(2)} N</p>
              </div>
            </div>
          </div>
        </div>
      `;

  // Intermediate Tensions Block
  if (res.leftTensions.length > 1 || res.rightTensions.length > 1 || state.flatObjs.length > 0) {
    html += `<div class="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                  <h3 class="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3 border-b pb-2">Intermediate String Tensions</h3>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">`;

    if (res.leftTensions.length > 1) {
      html += `<div><h4 class="text-xs font-semibold text-blue-600 mb-2">Left Side Segments (Bottom Up)</h4><ul class="space-y-2">`;
      for (let i = 1; i < res.leftTensions.length; i++) {
        html += `<li class="flex justify-between items-center text-sm bg-slate-50 px-3 py-2 rounded border border-slate-100">
                      <span class="text-slate-600">Between #${i} & #${i + 1}</span>
                      <span class="font-mono font-semibold text-slate-800">${(res.leftTensions[i] || 0).toFixed(2)} N</span>
                     </li>`;
      }
      html += `</ul></div>`;
    }

    if (state.flatObjs.length > 0) {
      html += `<div><h4 class="text-xs font-semibold text-emerald-600 mb-2">Flat Surface Segments (Left to Right)</h4><ul class="space-y-2">`;
      for (let i = 1; i < res.flatTensions.length - 1; i++) {
        html += `<li class="flex justify-between items-center text-sm bg-slate-50 px-3 py-2 rounded border border-slate-100">
                      <span class="text-slate-600">Between #${i} & #${i + 1}</span>
                      <span class="font-mono font-semibold text-slate-800">${(res.flatTensions[i] || 0).toFixed(2)} N</span>
                     </li>`;
      }
      html += `</ul></div>`;
    }

    if (res.rightTensions.length > 1) {
      html += `<div><h4 class="text-xs font-semibold text-red-600 mb-2">Right Side Segments (Bottom Up)</h4><ul class="space-y-2">`;
      for (let i = 1; i < res.rightTensions.length; i++) {
        html += `<li class="flex justify-between items-center text-sm bg-slate-50 px-3 py-2 rounded border border-slate-100">
                      <span class="text-slate-600">Between #${i} & #${i + 1}</span>
                      <span class="font-mono font-semibold text-slate-800">${(res.rightTensions[i] || 0).toFixed(2)} N</span>
                     </li>`;
      }
      html += `</ul></div>`;
    }

    html += `</div>`;
    if (!res.moving) {
      html += `<p class="text-xs text-slate-400 mt-3 italic">*Note: When stationary, nominal tensions are shown assuming friction forces perfectly balance without adding slack.</p>`;
    }
    html += `</div>`;
  }

  // Steps Block
  html += `
        <div class="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 class="text-lg font-semibold text-slate-800 mb-4 flex items-center">
            <span class="mr-2 text-blue-500">${icons.info}</span> Step-by-Step Global Calculation
          </h3>
          <div class="space-y-2 font-mono text-sm">
            ${res.steps.map(step => `<div class="p-3 bg-slate-50 rounded text-slate-700 border border-slate-100">${step}</div>`).join('')}
          </div>
        </div>
      `;

  dynamicResults.innerHTML = html;
}

function updateApp() {
  calculatePhysics();
  drawCanvas();
  renderResults();
}

// --- Event Listeners ---

// Sliders
leftSlider.addEventListener('input', (e) => {
  state.leftAngle = parseInt(e.target.value);
  leftDisplay.textContent = `θ = ${state.leftAngle}°`;
  updateApp();
});

rightSlider.addEventListener('input', (e) => {
  state.rightAngle = parseInt(e.target.value);
  rightDisplay.textContent = `θ = ${state.rightAngle}°`;
  updateApp();
});

// Add Buttons
document.getElementById('add-left-btn').addEventListener('click', () => {
  state.leftObjs.push({ id: Date.now().toString(), m: 5, mu: 0.1 });
  renderObjectLists();
  updateApp();
});

document.getElementById('add-right-btn').addEventListener('click', () => {
  state.rightObjs.push({ id: Date.now().toString(), m: 5, mu: 0.1 });
  renderObjectLists();
  updateApp();
});

document.getElementById('add-flat-btn').addEventListener('click', () => {
  state.flatObjs.push({ id: Date.now().toString(), m: 5, mu: 0.1 });
  renderObjectLists();
  updateApp();
});

// Event Delegation for Inputs & Delete Buttons
const handleListEvents = (e) => {
  const target = e.target;

  // Handle Input changes
  if (target.tagName === 'INPUT' && target.dataset.id) {
    const side = target.dataset.side;
    const id = target.dataset.id;
    const field = target.dataset.field;
    const val = parseFloat(target.value) || 0;

    let list;
    if (side === 'left') list = state.leftObjs;
    else if (side === 'right') list = state.rightObjs;
    else list = state.flatObjs;

    const obj = list.find(o => o.id === id);
    if (obj) obj[field] = val;

    // Update physics and canvas without re-rendering inputs (avoids losing focus)
    updateApp();
  }

  // Handle Delete button clicks
  const btn = target.closest('button[data-action="delete"]');
  if (btn && !btn.disabled) {
    const side = btn.dataset.side;
    const id = btn.dataset.id;

    if (side === 'left') state.leftObjs = state.leftObjs.filter(o => o.id !== id);
    else if (side === 'right') state.rightObjs = state.rightObjs.filter(o => o.id !== id);
    else state.flatObjs = state.flatObjs.filter(o => o.id !== id);

    renderObjectLists();
    updateApp();
  }
};

leftContainer.addEventListener('input', handleListEvents);
leftContainer.addEventListener('click', handleListEvents);
rightContainer.addEventListener('input', handleListEvents);
rightContainer.addEventListener('click', handleListEvents);
flatContainer.addEventListener('input', handleListEvents);
flatContainer.addEventListener('click', handleListEvents);

// --- Initialization ---
renderObjectLists();
updateApp();
