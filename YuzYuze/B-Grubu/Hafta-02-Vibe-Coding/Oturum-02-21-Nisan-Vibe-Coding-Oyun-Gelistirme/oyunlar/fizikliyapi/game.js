/* Fizikli Yapı — Köprü İnşa Oyunu
   Matter.js + Vanilla JS
*/
(() => {
  const { Engine, World, Bodies, Body, Constraint, Composite, Events, Vector } = Matter;

  // ---------- Sabitler & Seviyeler ----------
  const LEVELS = [
    { title: "Küçük Geçit",     gap: 280, weight: 40,  weightSize: 40 },
    { title: "Dar Boğaz",       gap: 340, weight: 70,  weightSize: 44 },
    { title: "Orta Vadi",       gap: 400, weight: 95,  weightSize: 48 },
    { title: "Nehir Kıyısı",    gap: 460, weight: 120, weightSize: 52 },
    { title: "Geniş Geçit",     gap: 520, weight: 150, weightSize: 56 },
    { title: "Derin Vadi",      gap: 580, weight: 190, weightSize: 60 },
    { title: "Büyük Uçurum",    gap: 640, weight: 230, weightSize: 64 },
    { title: "Mega Geçiş",      gap: 700, weight: 280, weightSize: 68 },
    { title: "Kanyon",          gap: 760, weight: 340, weightSize: 74 },
    { title: "Sonsuz Köprü",    gap: 840, weight: 420, weightSize: 80 },
  ];

  const BRIDGE_Y_RATIO = 0.55;   // platform üst yüzeyi canvas.height * bu oran
  const PLATFORM_DEPTH = 600;    // platformun aşağıya doğru kalınlığı
  const POINT_RADIUS = 7;
  const SNAP_RADIUS = 18;
  const MIN_BEAM_LEN = 15;
  const BEAM_THICKNESS = 8;
  const BEAM_STIFFNESS = 0.9;
  const BEAM_DAMPING = 0.08;
  const BREAK_THRESHOLD = 28;    // constraint bu kadar gerilirse kopar
  const WIN_HOLD_SECONDS = 3;
  const WIN_VELOCITY_MAX = 0.6;

  // ---------- DOM ----------
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const stage = document.getElementById('stage');
  const overlay = document.getElementById('overlay');
  const statusEl = document.getElementById('status');
  const modeText = document.getElementById('modeText');
  const levelNumEl = document.getElementById('levelNum');
  const levelTitleEl = document.getElementById('levelTitle');
  const statGap = document.getElementById('statGap');
  const statWeight = document.getElementById('statWeight');
  const levelsGrid = document.getElementById('levelsGrid');
  const btnTest = document.getElementById('btnTest');
  const btnReset = document.getElementById('btnReset');
  const btnStop = document.getElementById('btnStop');
  const btnPrev = document.getElementById('btnPrev');
  const btnNext = document.getElementById('btnNext');

  // ---------- Durum ----------
  const state = {
    currentLevel: 0,
    completed: loadCompleted(),
    mode: 'edit',              // 'edit' | 'testing'
    points: [],                // {id, x, y, anchor, body?}
    beams: [],                 // {id, a, b, body?, cA?, cB?, broken?}
    nextPointId: 1,
    nextBeamId: 1,
    // çizim etkileşimi
    hoveredPoint: null,
    dragStart: null,           // {pointId, x, y}
    mouse: { x: 0, y: 0 },
    // test durumu
    engine: null,
    weight: null,
    ground: null,
    leftPlatform: null,
    rightPlatform: null,
    testStartTime: 0,
    stableSince: 0,
    lastWeightY: 0,
    finished: false,
  };

  // ---------- Boyutlandırma ----------
  function resize() {
    const rect = stage.getBoundingClientRect();
    canvas.width  = Math.floor(rect.width  * devicePixelRatio);
    canvas.height = Math.floor(rect.height * devicePixelRatio);
    canvas.style.width  = rect.width  + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }
  window.addEventListener('resize', () => { resize(); loadLevel(state.currentLevel); });

  function cw() { return canvas.width / devicePixelRatio; }
  function ch() { return canvas.height / devicePixelRatio; }

  // ---------- Seviye Yükleme ----------
  function loadCompleted() {
    try { return JSON.parse(localStorage.getItem('fy_done') || '[]'); }
    catch { return []; }
  }
  function saveCompleted() {
    localStorage.setItem('fy_done', JSON.stringify(state.completed));
  }
  function markCompleted(idx) {
    if (!state.completed.includes(idx)) { state.completed.push(idx); saveCompleted(); renderLevelsGrid(); }
  }

  function loadLevel(idx) {
    state.currentLevel = idx;
    const lvl = LEVELS[idx];
    levelNumEl.textContent = idx+1;
    levelTitleEl.textContent = lvl.title;
    statGap.textContent = lvl.gap + ' px';
    statWeight.textContent = lvl.weight + ' kg';

    stopTest();
    state.points = [];
    state.beams = [];

    const bridgeY = ch() * BRIDGE_Y_RATIO;
    const cxv = cw() / 2;
    const leftAnchorX  = cxv - lvl.gap / 2;
    const rightAnchorX = cxv + lvl.gap / 2;

    addAnchor(leftAnchorX,  bridgeY);
    addAnchor(leftAnchorX - 40, bridgeY);
    addAnchor(rightAnchorX, bridgeY);
    addAnchor(rightAnchorX + 40, bridgeY);

    renderLevelsGrid();
    setStatus('Yapını çiz, sonra Test Et.', '');
    draw();
  }

  function addAnchor(x, y) {
    state.points.push({ id: state.nextPointId++, x, y, anchor: true });
  }

  function renderLevelsGrid() {
    levelsGrid.innerHTML = '';
    LEVELS.forEach((lvl, i) => {
      const el = document.createElement('div');
      el.className = 'level-dot';
      if (state.completed.includes(i)) el.classList.add('done');
      if (i === state.currentLevel) el.classList.add('current');
      el.textContent = i+1;
      el.title = `${lvl.title} — boşluk ${lvl.gap}px, ağırlık ${lvl.weight}kg`;
      el.onclick = () => loadLevel(i);
      levelsGrid.appendChild(el);
    });
  }

  // ---------- Yardımcılar ----------
  function dist(x1,y1,x2,y2) { return Math.hypot(x2-x1, y2-y1); }
  function findPointAt(x, y, radius = SNAP_RADIUS) {
    let best = null, bestD = radius;
    for (const p of state.points) {
      const d = dist(p.x, p.y, x, y);
      if (d < bestD) { best = p; bestD = d; }
    }
    return best;
  }
  function getPoint(id) { return state.points.find(p => p.id === id); }
  function beamExists(aId, bId) {
    return state.beams.some(b => (b.a===aId&&b.b===bId) || (b.a===bId&&b.b===aId));
  }

  // ---------- Etkileşim ----------
  function canvasPos(ev) {
    const rect = canvas.getBoundingClientRect();
    return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
  }

  canvas.addEventListener('mousemove', ev => {
    const { x, y } = canvasPos(ev);
    state.mouse = { x, y };
    if (state.mode === 'edit') {
      state.hoveredPoint = findPointAt(x, y);
    }
    draw();
  });

  canvas.addEventListener('mousedown', ev => {
    if (state.mode !== 'edit') return;
    if (ev.button === 2) return;  // right click handled elsewhere
    const { x, y } = canvasPos(ev);
    const hit = findPointAt(x, y);
    if (hit) {
      state.dragStart = { pointId: hit.id, x: hit.x, y: hit.y };
    } else {
      // eklemeden önce boşluğun içine (havaya) atılmış mı kontrol etmeye gerek yok; her yere nokta ekle
      const p = { id: state.nextPointId++, x, y, anchor: false };
      state.points.push(p);
      state.dragStart = { pointId: p.id, x: p.x, y: p.y };
    }
    draw();
  });

  window.addEventListener('mouseup', ev => {
    if (state.mode !== 'edit' || !state.dragStart) return;
    const { x, y } = canvasPos(ev);
    const from = getPoint(state.dragStart.pointId);
    const endHit = findPointAt(x, y);

    if (endHit && endHit.id !== from.id) {
      if (!beamExists(from.id, endHit.id) && dist(from.x,from.y,endHit.x,endHit.y) >= MIN_BEAM_LEN) {
        state.beams.push({ id: state.nextBeamId++, a: from.id, b: endHit.id });
      }
    } else if (!endHit && dist(from.x,from.y,x,y) >= MIN_BEAM_LEN) {
      // yeni bir serbest uç noktası oluştur ve ona bağla
      const p = { id: state.nextPointId++, x, y, anchor: false };
      state.points.push(p);
      state.beams.push({ id: state.nextBeamId++, a: from.id, b: p.id });
    } else {
      // sadece nokta ekle (zaten eklenmiş) — bir şey yapma
    }
    state.dragStart = null;
    draw();
  });

  canvas.addEventListener('contextmenu', ev => {
    ev.preventDefault();
    if (state.mode !== 'edit') return;
    const { x, y } = canvasPos(ev);
    const hit = findPointAt(x, y);
    if (hit && !hit.anchor) {
      state.beams = state.beams.filter(b => b.a !== hit.id && b.b !== hit.id);
      state.points = state.points.filter(p => p.id !== hit.id);
      draw();
      return;
    }
    // çubuk silme: çizgiye yakın mı?
    const beamHit = findBeamAt(x, y);
    if (beamHit) {
      state.beams = state.beams.filter(b => b.id !== beamHit.id);
      // yalnız kalan serbest nokta kalsın, kullanıcı elle silsin
      draw();
    }
  });

  function findBeamAt(x, y) {
    const tol = 7;
    for (const b of state.beams) {
      const pa = getPoint(b.a), pb = getPoint(b.b);
      if (!pa || !pb) continue;
      const d = pointSegDist(x, y, pa.x, pa.y, pb.x, pb.y);
      if (d < tol) return b;
    }
    return null;
  }
  function pointSegDist(px, py, x1, y1, x2, y2) {
    const dx = x2-x1, dy = y2-y1;
    const l2 = dx*dx + dy*dy;
    if (l2 === 0) return Math.hypot(px-x1, py-y1);
    let t = ((px-x1)*dx + (py-y1)*dy) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1+t*dx), py - (y1+t*dy));
  }

  document.addEventListener('keydown', ev => {
    if (ev.code === 'Space' && state.mode === 'edit') {
      ev.preventDefault();
      startTest();
    }
  });

  // ---------- Çizim (Render) ----------
  function draw() {
    const W = cw(), H = ch();
    ctx.clearRect(0, 0, W, H);

    const bridgeY = H * BRIDGE_Y_RATIO;
    const lvl = LEVELS[state.currentLevel];
    const gap = lvl.gap;
    const cxv = W / 2;
    const leftEdge = cxv - gap/2;
    const rightEdge = cxv + gap/2;

    // platformlar
    drawPlatform(0, bridgeY, leftEdge, H - bridgeY);
    drawPlatform(rightEdge, bridgeY, W - rightEdge, H - bridgeY);

    // boşluk zemin çizgisi
    ctx.strokeStyle = 'rgba(255,180,84,0.25)';
    ctx.setLineDash([6,6]);
    ctx.beginPath();
    ctx.moveTo(leftEdge, bridgeY);
    ctx.lineTo(rightEdge, bridgeY);
    ctx.stroke();
    ctx.setLineDash([]);

    // ağırlık hedef belirteci (test modunda yoksa)
    if (state.mode === 'edit') {
      drawWeightIndicator(cxv, 60, lvl.weightSize, lvl.weight);
    }

    // beamler
    if (state.mode === 'edit') {
      for (const b of state.beams) drawBeamEdit(b);
      // lastik çizgisi
      if (state.dragStart) {
        const from = getPoint(state.dragStart.pointId);
        const snap = findPointAt(state.mouse.x, state.mouse.y);
        const tx = snap ? snap.x : state.mouse.x;
        const ty = snap ? snap.y : state.mouse.y;
        ctx.strokeStyle = 'rgba(255,180,84,0.7)';
        ctx.lineWidth = 4;
        ctx.setLineDash([4,6]);
        ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(tx, ty); ctx.stroke();
        ctx.setLineDash([]);
      }
      // noktalar
      for (const p of state.points) drawPointEdit(p);
    } else {
      // test modunda: fizik body'lerinden
      for (const b of state.beams) drawBeamPhysics(b);
      for (const p of state.points) drawPointPhysics(p);
      if (state.weight) drawWeightBody(state.weight, lvl);
    }
  }

  function drawPlatform(x, y, w, h) {
    const grad = ctx.createLinearGradient(0, y, 0, y + h);
    grad.addColorStop(0, '#3a4856');
    grad.addColorStop(1, '#1f2832');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);
    // üst kenar
    ctx.fillStyle = '#566475';
    ctx.fillRect(x, y, w, 3);
    // yatay çizgi deseni
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 1;
    for (let i = y + 20; i < y + h; i += 20) {
      ctx.beginPath(); ctx.moveTo(x, i); ctx.lineTo(x + w, i); ctx.stroke();
    }
  }

  function drawWeightIndicator(x, y, size, kg) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = '#ff6b6b';
    ctx.setLineDash([4,4]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, 5);
    ctx.lineTo(x, y - size/2 - 5);
    ctx.stroke();
    ctx.setLineDash([]);
    // ok
    ctx.beginPath();
    ctx.moveTo(x-6, y - size/2 - 12);
    ctx.lineTo(x, y - size/2 - 5);
    ctx.lineTo(x+6, y - size/2 - 12);
    ctx.stroke();
    // ağırlık ikonu
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#ff6b6b';
    ctx.fillRect(x - size/2, y - size/2, size, size);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(kg + 'kg', x, y);
    ctx.restore();
  }

  function drawBeamEdit(b) {
    const pa = getPoint(b.a), pb = getPoint(b.b);
    if (!pa || !pb) return;
    ctx.strokeStyle = '#c48a4a';
    ctx.lineCap = 'round';
    ctx.lineWidth = BEAM_THICKNESS;
    ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
    // çekirdek
    ctx.strokeStyle = '#e0a262';
    ctx.lineWidth = BEAM_THICKNESS - 4;
    ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
  }

  function drawPointEdit(p) {
    const isHover = state.hoveredPoint && state.hoveredPoint.id === p.id;
    ctx.save();
    if (p.anchor) {
      ctx.fillStyle = '#8f9ba8';
      ctx.strokeStyle = '#c7d0da';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.rect(p.x - POINT_RADIUS, p.y - POINT_RADIUS, POINT_RADIUS*2, POINT_RADIUS*2);
      ctx.fill(); ctx.stroke();
    } else {
      ctx.fillStyle = isHover ? '#ffd89b' : '#ffb454';
      ctx.strokeStyle = '#1a1000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, POINT_RADIUS, 0, Math.PI*2);
      ctx.fill(); ctx.stroke();
    }
    if (isHover) {
      ctx.strokeStyle = 'rgba(89,194,255,0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, POINT_RADIUS + 5, 0, Math.PI*2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawBeamPhysics(b) {
    if (!b.body) return;
    const len = b.body.bounds.max.x - b.body.bounds.min.x; // yaklaşık yok; doğrudan hesaplayalım
    // beam uzunluğunu points'tan al (değişmez)
    const pa = getPoint(b.a), pb = getPoint(b.b);
    const origLen = dist(pa.x, pa.y, pb.x, pb.y);
    const cx = b.body.position.x, cy = b.body.position.y;
    const ang = b.body.angle;
    const dx = Math.cos(ang) * origLen / 2;
    const dy = Math.sin(ang) * origLen / 2;
    const ax = cx - dx, ay = cy - dy;
    const bx = cx + dx, by = cy + dy;

    ctx.strokeStyle = b.broken ? '#665246' : '#c48a4a';
    ctx.lineCap = 'round';
    ctx.globalAlpha = b.broken ? 0.55 : 1;
    ctx.lineWidth = BEAM_THICKNESS;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    ctx.strokeStyle = b.broken ? '#8a7060' : '#e0a262';
    ctx.lineWidth = BEAM_THICKNESS - 4;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function drawPointPhysics(p) {
    const pos = getPointPos(p.id);
    if (!pos) return;
    if (p.anchor) {
      ctx.fillStyle = '#8f9ba8';
      ctx.fillRect(pos.x - POINT_RADIUS, pos.y - POINT_RADIUS, POINT_RADIUS*2, POINT_RADIUS*2);
    } else {
      ctx.fillStyle = '#ffb454';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, POINT_RADIUS - 2, 0, Math.PI*2);
      ctx.fill();
    }
  }

  function getPointPos(id) {
    const p = getPoint(id);
    if (!p) return null;
    if (state.mode === 'edit') return { x: p.x, y: p.y };
    if (p.anchor) return { x: p.x, y: p.y };
    if (p.body) return { x: p.body.position.x, y: p.body.position.y };
    return { x: p.x, y: p.y };
  }

  function drawWeightBody(body, lvl) {
    const s = lvl.weightSize;
    ctx.save();
    ctx.translate(body.position.x, body.position.y);
    ctx.rotate(body.angle);
    ctx.fillStyle = '#ff6b6b';
    ctx.strokeStyle = '#8a2828';
    ctx.lineWidth = 3;
    ctx.fillRect(-s/2, -s/2, s, s);
    ctx.strokeRect(-s/2, -s/2, s, s);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(lvl.weight + 'kg', 0, 0);
    ctx.restore();
  }

  // ---------- Fizik ----------
  function startTest() {
    if (state.mode === 'testing') return;
    if (state.beams.length === 0) {
      setStatus('Önce en az bir çubuk çiz!', 'lose');
      return;
    }
    clearOverlay();
    state.mode = 'testing';
    stage.classList.add('testing');
    modeText.textContent = 'Test';
    btnTest.disabled = true;
    btnStop.disabled = false;
    btnReset.disabled = true;
    btnPrev.disabled = true;
    btnNext.disabled = true;

    const lvl = LEVELS[state.currentLevel];
    const W = cw(), H = ch();
    const bridgeY = H * BRIDGE_Y_RATIO;
    const cxv = W / 2;

    const engine = Engine.create();
    engine.gravity.y = 1.0;
    state.engine = engine;

    // platformlar (statik)
    const leftW = cxv - lvl.gap/2;
    const rightW = W - (cxv + lvl.gap/2);
    const leftX = leftW / 2;
    const rightX = (cxv + lvl.gap/2) + rightW/2;
    const platY = bridgeY + (H - bridgeY) / 2;
    const platH = H - bridgeY;

    state.leftPlatform = Bodies.rectangle(leftX, platY, leftW, platH, {
      isStatic: true,
      collisionFilter: { category: 0x0001, mask: 0xFFFF }
    });
    state.rightPlatform = Bodies.rectangle(rightX, platY, rightW, platH, {
      isStatic: true,
      collisionFilter: { category: 0x0001, mask: 0xFFFF }
    });
    // "off-screen" yakalayıcı (sadece test bitirme için lazım değil ama tampon)
    state.ground = Bodies.rectangle(cxv, H + 400, W * 3, 100, {
      isStatic: true, isSensor: true,
      collisionFilter: { category: 0x0001, mask: 0x0000 }
    });

    World.add(engine.world, [state.leftPlatform, state.rightPlatform, state.ground]);

    // nokta body'leri (serbest noktalar için)
    for (const p of state.points) {
      if (!p.anchor) {
        p.body = Bodies.circle(p.x, p.y, 4, {
          density: 0.0005,
          frictionAir: 0.02,
          collisionFilter: { category: 0x0004, mask: 0x0000 }, // hiçbir şeyle çarpışma
          render: { visible: false }
        });
        World.add(engine.world, p.body);
      }
    }

    // çubuk body'leri + constraints
    for (const b of state.beams) {
      const pa = getPoint(b.a), pb = getPoint(b.b);
      const ax = pa.x, ay = pa.y, bx = pb.x, by = pb.y;
      const midx = (ax+bx)/2, midy = (ay+by)/2;
      const len = dist(ax,ay,bx,by);
      const angle = Math.atan2(by-ay, bx-ax);

      b.body = Bodies.rectangle(midx, midy, len, BEAM_THICKNESS, {
        angle,
        density: 0.002,
        frictionAir: 0.02,
        chamfer: { radius: 2 },
        collisionFilter: { category: 0x0002, mask: 0x0001 | 0x0008 }, // platform + ağırlık
        render: { visible: false }
      });
      World.add(engine.world, b.body);

      // uçlar local koordinatlarda (-len/2, 0) ve (len/2, 0)
      const localA = { x: -len/2, y: 0 };
      const localB = { x:  len/2, y: 0 };

      b.cA = makeConstraint(b.body, localA, pa);
      b.cB = makeConstraint(b.body, localB, pb);
      World.add(engine.world, [b.cA, b.cB]);
      b.broken = false;
    }

    // ağırlık
    const wSize = lvl.weightSize;
    const wMass = lvl.weight; // direkt mass olarak kullanacağız
    state.weight = Bodies.rectangle(cxv, 40, wSize, wSize, {
      density: 0.001,
      friction: 0.6,
      frictionAir: 0.001,
      restitution: 0.05,
      collisionFilter: { category: 0x0008, mask: 0x0001 | 0x0002 }
    });
    Body.setMass(state.weight, wMass);
    World.add(engine.world, state.weight);

    state.testStartTime = performance.now();
    state.stableSince = 0;
    state.finished = false;
    setStatus('Test çalışıyor… yapın dayanacak mı?', 'running');
  }

  function makeConstraint(body, localPoint, attachPoint) {
    // attachPoint: state.points içindeki nokta
    if (attachPoint.anchor) {
      return Constraint.create({
        bodyA: body,
        pointA: localPoint,
        pointB: { x: attachPoint.x, y: attachPoint.y },
        length: 0,
        stiffness: BEAM_STIFFNESS,
        damping: BEAM_DAMPING,
      });
    } else {
      return Constraint.create({
        bodyA: body,
        pointA: localPoint,
        bodyB: attachPoint.body,
        pointB: { x: 0, y: 0 },
        length: 0,
        stiffness: BEAM_STIFFNESS,
        damping: BEAM_DAMPING,
      });
    }
  }

  function stopTest() {
    if (state.mode !== 'testing' && !state.engine) {
      state.mode = 'edit';
      stage.classList.remove('testing');
      modeText.textContent = 'Çizim';
      btnTest.disabled = false;
      btnStop.disabled = true;
      btnReset.disabled = false;
      btnPrev.disabled = false;
      btnNext.disabled = false;
      return;
    }
    if (state.engine) {
      World.clear(state.engine.world, false);
      Engine.clear(state.engine);
      state.engine = null;
    }
    for (const p of state.points) p.body = null;
    for (const b of state.beams) { b.body = null; b.cA = null; b.cB = null; b.broken = false; }
    state.weight = null;
    state.mode = 'edit';
    stage.classList.remove('testing');
    modeText.textContent = 'Çizim';
    btnTest.disabled = false;
    btnStop.disabled = true;
    btnReset.disabled = false;
    btnPrev.disabled = false;
    btnNext.disabled = false;
    draw();
  }

  // Constraint'in dünyadaki iki ucu arasındaki mesafe (kopma kontrolü)
  function constraintStretch(c) {
    const aWorld = c.bodyA
      ? Vector.add(c.bodyA.position, Vector.rotate(c.pointA, c.bodyA.angle))
      : c.pointA;
    const bWorld = c.bodyB
      ? Vector.add(c.bodyB.position, Vector.rotate(c.pointB, c.bodyB.angle))
      : c.pointB;
    return Vector.magnitude(Vector.sub(aWorld, bWorld));
  }

  function breakConstraint(beam, which) {
    const c = which === 'A' ? beam.cA : beam.cB;
    if (!c) return;
    Composite.remove(state.engine.world, c);
    if (which === 'A') beam.cA = null; else beam.cB = null;
    if (!beam.cA && !beam.cB) beam.broken = true;
    else beam.broken = true; // tek uç kopsa bile "zayıflamış" say
  }

  // ---------- Ana Döngü ----------
  function tick() {
    if (state.mode === 'testing' && state.engine) {
      Engine.update(state.engine, 1000/60);

      // constraint kopma kontrolü
      for (const b of state.beams) {
        if (b.cA && constraintStretch(b.cA) > BREAK_THRESHOLD) breakConstraint(b, 'A');
        if (b.cB && constraintStretch(b.cB) > BREAK_THRESHOLD) breakConstraint(b, 'B');
      }

      checkWinLose();
    }
    draw();
    requestAnimationFrame(tick);
  }

  function checkWinLose() {
    if (state.finished || !state.weight) return;
    const W = cw(), H = ch();

    // kaybetme: ağırlık ekrandan düştü
    if (state.weight.position.y > H + 200) {
      endTest(false, 'Yapı çöktü! Ağırlık düştü.');
      return;
    }

    // kazanma: ağırlık yavaşlamış ve ekranda duruyor, köprü seviyesinin çok altına düşmemiş
    const bridgeY = H * BRIDGE_Y_RATIO;
    const vy = state.weight.velocity.y;
    const vx = state.weight.velocity.x;
    const speed = Math.hypot(vx, vy);
    const now = performance.now();
    const elapsed = (now - state.testStartTime) / 1000;

    const settled = speed < WIN_VELOCITY_MAX &&
                    state.weight.position.y < bridgeY + 150;

    if (settled) {
      if (!state.stableSince) state.stableSince = now;
      const held = (now - state.stableSince) / 1000;
      setStatus(`Dayanıyor… ${held.toFixed(1)}/${WIN_HOLD_SECONDS}s`, 'running');
      if (held >= WIN_HOLD_SECONDS) {
        endTest(true, 'Başardın! Yapı dayandı!');
      }
    } else {
      state.stableSince = 0;
      if (elapsed > 1) {
        setStatus(`Test çalışıyor… hız ${speed.toFixed(2)}`, 'running');
      }
    }
  }

  function endTest(won, msg) {
    if (state.finished) return;
    state.finished = true;
    setStatus(msg, won ? 'win' : 'lose');
    if (won) markCompleted(state.currentLevel);
    showToast(won, msg);
  }

  // ---------- Status / Overlay ----------
  function setStatus(msg, cls) {
    statusEl.textContent = msg;
    statusEl.className = '';
    if (cls) statusEl.classList.add(cls);
  }

  function clearOverlay() { overlay.innerHTML = ''; }
  function showToast(won, msg) {
    clearOverlay();
    const div = document.createElement('div');
    div.className = 'toast ' + (won ? 'win' : 'lose');
    div.innerHTML = `
      ${won ? '✓ TAMAMLANDI' : '✗ BAŞARISIZ'}
      <small>${msg}</small>
    `;
    const btns = document.createElement('div');
    btns.style.cssText = 'display:flex; gap:8px; margin-top:14px; justify-content:center;';
    const retry = document.createElement('button');
    retry.textContent = 'Tekrar Dene';
    retry.onclick = () => { stopTest(); clearOverlay(); };
    btns.appendChild(retry);
    if (won && state.currentLevel < LEVELS.length - 1) {
      const next = document.createElement('button');
      next.className = 'primary';
      next.textContent = 'Sonraki Seviye →';
      next.onclick = () => { stopTest(); clearOverlay(); loadLevel(state.currentLevel + 1); };
      btns.appendChild(next);
    }
    div.appendChild(btns);
    overlay.appendChild(div);
  }

  // ---------- Butonlar ----------
  btnTest.onclick = () => startTest();
  btnStop.onclick = () => { stopTest(); clearOverlay(); setStatus('Çizim moduna dönüldü.', ''); };
  btnReset.onclick = () => {
    state.points = state.points.filter(p => p.anchor);
    state.beams = [];
    clearOverlay();
    setStatus('Çizim sıfırlandı.', '');
    draw();
  };
  btnPrev.onclick = () => { if (state.currentLevel > 0) loadLevel(state.currentLevel - 1); };
  btnNext.onclick = () => { if (state.currentLevel < LEVELS.length - 1) loadLevel(state.currentLevel + 1); };

  // ---------- Başlat ----------
  resize();
  loadLevel(0);
  requestAnimationFrame(tick);
})();
