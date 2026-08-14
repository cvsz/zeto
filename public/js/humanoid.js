(() => {
  'use strict';

  const canvas = document.getElementById('humanoid-canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  let points = [];
  let state = null;
  let frame = 0;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seedPoints(rect.width, rect.height);
  }

  function insideHead(x, y) {
    // Side-profile-inspired silhouette assembled from overlapping ellipses.
    const skull = ((x + 0.08) / 0.58) ** 2 + ((y + 0.12) / 0.72) ** 2 < 1;
    const face = ((x - 0.38) / 0.34) ** 2 + ((y + 0.03) / 0.52) ** 2 < 1;
    const neck = x > -0.55 && x < -0.05 && y > 0.35 && y < 1.0 && (x + 0.28) > (y - 0.86) * 0.33;
    const jawCut = y > 0.30 && x > 0.12 && x < 0.58 && y > 0.92 - x * 0.8;
    const rearCut = x < -0.42 && y > 0.33 && y < 0.83;
    return (skull || face || neck) && !jawCut && !rearCut;
  }

  function seedPoints(width, height) {
    const count = Math.round(Math.min(4200, Math.max(1700, width * height / 175)));
    const next = [];
    for (let i = 0; i < count; i += 1) {
      let x;
      let y;
      let tries = 0;
      do {
        x = Math.random() * 2 - 1;
        y = Math.random() * 2 - 1;
        tries += 1;
      } while (!insideHead(x, y) && tries < 100);
      if (tries >= 100) continue;
      next.push({
        x,
        y,
        z: Math.random(),
        phase: Math.random() * Math.PI * 2,
        size: 0.35 + Math.random() * 1.65,
      });
    }
    points = next;
  }

  function paletteForPoint(p) {
    const activity = (Math.sin(p.phase + frame * 0.012) + 1) / 2;
    if (p.x > 0.05 && p.y < 0.18 && p.y > -0.45 && p.z > 0.5) {
      return `rgba(227,196,134,${0.18 + activity * 0.72})`;
    }
    return `rgba(55,203,255,${0.13 + activity * 0.76})`;
  }

  function render() {
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    ctx.fillStyle = '#03070c';
    ctx.fillRect(0, 0, width, height);

    const cx = width * 0.44;
    const cy = height * 0.49;
    const scale = Math.min(width * 0.37, height * 0.43);
    const load = state?.neural?.load || 0;
    const confidence = state?.neural?.confidence || 0;

    for (const p of points) {
      const wobble = Math.sin(frame * 0.01 + p.phase) * (0.6 + load * 0.012);
      const perspective = 0.84 + p.z * 0.24;
      const px = cx + p.x * scale * perspective + wobble;
      const py = cy + p.y * scale + Math.cos(frame * 0.008 + p.phase) * 0.45;
      ctx.beginPath();
      ctx.fillStyle = paletteForPoint(p);
      ctx.arc(px, py, p.size * (0.65 + p.z * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }

    // Neural core.
    const coreX = cx + scale * 0.20;
    const coreY = cy - scale * 0.12;
    const core = ctx.createRadialGradient(coreX, coreY, 1, coreX, coreY, 48);
    core.addColorStop(0, `rgba(246,220,162,${0.45 + confidence / 200})`);
    core.addColorStop(0.18, 'rgba(78,211,255,.35)');
    core.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = core;
    ctx.fillRect(coreX - 50, coreY - 50, 100, 100);

    // Base emitter / neck energy node.
    const baseX = cx - scale * 0.05;
    const baseY = cy + scale * 0.79;
    const glow = ctx.createRadialGradient(baseX, baseY, 0, baseX, baseY, 58);
    glow.addColorStop(0, 'rgba(95,226,255,.98)');
    glow.addColorStop(.18, 'rgba(0,169,236,.62)');
    glow.addColorStop(1, 'rgba(0,169,236,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(baseX - 60, baseY - 60, 120, 120);

    // Concentric voice / control waves.
    ctx.lineWidth = 1;
    for (let r = 0; r < 5; r += 1) {
      ctx.beginPath();
      ctx.strokeStyle = `rgba(66,204,255,${0.24 - r * 0.035})`;
      ctx.arc(cx - scale * 0.42, cy + scale * 0.48, 38 + r * 17 + Math.sin(frame * .02 + r) * 3, Math.PI * 1.08, Math.PI * 1.78);
      ctx.stroke();
    }

    frame += 1;
    requestAnimationFrame(render);
  }

  function fmtUptime(seconds) {
    const s = Number(seconds) || 0;
    const days = Math.floor(s / 86400);
    const hours = Math.floor((s % 86400) / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function renderState(data) {
    state = data;
    setText('identity-state', `${data.identity.state} / ${data.identity.product}`);
    setText('mode', data.identity.mode);
    setText('focus', `FOCUS: ${data.neural.focus}`);
    setText('confidence', `${data.neural.confidence}%`);
    setText('load', `${data.neural.load}%`);
    setText('alert', data.neural.alertLevel.toUpperCase());
    setText('queued', data.factory.queued);
    setText('pending', data.factory.pending);
    setText('approval', data.factory.awaitingApproval);
    setText('schedules', data.factory.enabledSchedules);
    setText('published', data.factory.publishedRecent);
    setText('failed', data.factory.failedRecent);
    setText('runtime-node', data.runtime.node);
    setText('runtime-uptime', fmtUptime(data.runtime.uptimeSeconds));
    setText('runtime-scheduler', data.runtime.scheduler?.running === false ? 'PAUSED' : 'ACTIVE');
    setText('updated', new Date(data.generatedAt).toLocaleTimeString());

    const list = document.getElementById('module-list');
    list.innerHTML = data.modules.map(module => `
      <div class="module">
        <span class="module-id">${module.id}</span>
        <span class="module-name">${module.name}</span>
        <span class="module-state ${module.state}">${module.state}</span>
      </div>
    `).join('');
  }

  async function refreshState() {
    const pill = document.getElementById('connection-pill');
    const token = localStorage.getItem('zeto_token') || localStorage.getItem('zfbauto_token');
    if (!token) {
      pill.textContent = 'AUTH REQUIRED';
      pill.className = 'pill offline';
      return;
    }

    try {
      const response = await fetch('/v1/humanoid/state', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (response.status === 401) throw new Error('Session expired');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      renderState(payload.data);
      pill.textContent = 'LIVE';
      pill.className = 'pill online';
    } catch (error) {
      pill.textContent = 'OFFLINE';
      pill.className = 'pill offline';
      setText('identity-state', error.message.toUpperCase());
    }
  }

  window.addEventListener('resize', resize, { passive: true });
  resize();
  render();
  refreshState();
  window.setInterval(refreshState, 3000);
})();
