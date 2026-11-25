// Cena 3D do topo: robô aspirador limpando um piso de madeira.
// O scroll (0 a 1) controla a câmera e as etapas: topo, mapeia, aspira, volta para a base.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const BG = 0x12110f;
const R = 0.6;                 // raio do robô (unidades da cena)
const DUST = { w: 11, h: 8.4, cx: 0, cz: 0.1, res: 512 };
const DOCK = { x: 0, z: -3.75 };
const PARK = { x: 0, z: -3.75 + 0.14 + R + 0.03 };
const APPROACH = { x: 0, z: -2.1 };

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (t) => t * t * (3 - 2 * t);
const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));
// 0 fora, 1 entre b e c, rampas suaves em a-b e c-d
const bump = (p, a, b, c, d) => (p <= a || p >= d) ? 0 : p < b ? smooth((p - a) / (b - a)) : p <= c ? 1 : smooth(1 - (p - c) / (d - c));

/* ---------- Texturas feitas em canvas ---------- */
function woodTexture(renderer) {
  const S = 1024, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const rnd = mulberry(7);
  const planks = 8, ph = S / planks;
  for (let i = 0; i < planks; i++) {
    let x = -rnd() * 500;
    while (x < S) {
      const len = 380 + rnd() * 520;
      const hue = 28 + rnd() * 6, sat = 30 + rnd() * 10, lit = 30 + rnd() * 9;
      g.fillStyle = `hsl(${hue} ${sat}% ${lit}%)`;
      g.fillRect(x, i * ph, len, ph);
      // veios
      for (let k = 0; k < 26; k++) {
        const y0 = i * ph + rnd() * ph;
        g.strokeStyle = `hsla(${hue - 4} ${sat + 8}% ${lit - 10 - rnd() * 8}% / ${0.12 + rnd() * 0.22})`;
        g.lineWidth = 0.6 + rnd() * 1.6;
        g.beginPath();
        const amp = 1 + rnd() * 3, f = 0.004 + rnd() * 0.01, ph0 = rnd() * 6;
        for (let xx = x; xx <= x + len; xx += 8) {
          const yy = y0 + Math.sin(xx * f + ph0) * amp;
          xx === x ? g.moveTo(xx, yy) : g.lineTo(xx, yy);
        }
        g.stroke();
      }
      // junta de topo
      g.fillStyle = 'rgba(10,7,4,.75)';
      g.fillRect(x, i * ph, 2, ph);
      x += len;
    }
    g.fillStyle = 'rgba(8,6,4,.85)';
    g.fillRect(0, i * ph, S, 2.5);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}

function dustTexture() {
  const W = 1024, H = Math.round(1024 * DUST.h / DUST.w);
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const rnd = mulberry(21);
  // véu fosco (o chão "sujo" fica sem brilho)
  g.fillStyle = 'rgba(190,178,156,0.13)';
  g.fillRect(0, 0, W, H);
  for (let i = 0; i < 9000; i++) {
    const a = 0.18 + rnd() * 0.4, r = 0.4 + rnd() * rnd() * 1.4;
    g.fillStyle = `rgba(${210 + rnd() * 30},${200 + rnd() * 28},${178 + rnd() * 30},${a})`;
    g.beginPath(); g.arc(rnd() * W, rnd() * H, r, 0, 6.283); g.fill();
  }
  // fios de cabelo / pelo de pet
  for (let i = 0; i < 70; i++) {
    g.strokeStyle = `rgba(${rnd() < .5 ? '40,30,24' : '200,190,170'},${0.35 + rnd() * 0.35})`;
    g.lineWidth = 0.8;
    g.beginPath();
    const x = rnd() * W, y = rnd() * H, l = 10 + rnd() * 26, a = rnd() * 6.28;
    g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a + 1) * l * .6, y + Math.sin(a + 1) * l * .6, x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  // borda suave
  g.globalCompositeOperation = 'destination-in';
  const grd = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, W * 0.52);
  grd.addColorStop(0, 'rgba(0,0,0,1)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, W, H);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function softDiscTexture(inner = 'rgba(0,0,0,0.55)') {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, inner);
  grd.addColorStop(0.55, inner.replace(/[\d.]+\)$/, '0.35)'));
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

function mulberry(a) {
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

/* ---------- Robô ---------- */
function buildRobot() {
  const robot = new THREE.Group();
  const white = new THREE.MeshPhysicalMaterial({ color: 0xf2f1ee, roughness: 0.38, clearcoat: 0.7, clearcoatRoughness: 0.25 });
  const gloss = new THREE.MeshPhysicalMaterial({ color: 0xf7f7f5, roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.06 });
  const grey = new THREE.MeshStandardMaterial({ color: 0xc9c7c2, roughness: 0.5 });
  const dark = new THREE.MeshPhysicalMaterial({ color: 0x0c0c0d, roughness: 0.12, clearcoat: 1 });
  const orange = new THREE.MeshStandardMaterial({ color: 0xff6a13, emissive: 0xff5200, emissiveIntensity: 0.35, roughness: 0.4 });
  const silver = new THREE.MeshStandardMaterial({ color: 0xd9dadd, metalness: 0.7, roughness: 0.25 });

  const clearance = 0.025, bodyH = 0.17;
  const top = clearance + bodyH;

  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.985, R * 0.94, 0.035, 96), grey);
  skirt.position.y = clearance + 0.0175;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(R, R * 0.99, bodyH - 0.03, 96), white);
  body.position.y = clearance + 0.035 + (bodyH - 0.035) / 2;
  // para-choque: metade da frente (+z)
  const bumper = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.008, R + 0.008, 0.095, 96, 1, true, -Math.PI * 0.55, Math.PI * 1.1),
    new THREE.MeshStandardMaterial({ color: 0xe4e3df, roughness: 0.45, side: THREE.DoubleSide }));
  bumper.position.y = clearance + 0.085;
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.9, R * 0.92, 0.014, 96), gloss);
  lid.position.y = top + 0.004;
  const seam = new THREE.Mesh(new THREE.TorusGeometry(R * 0.915, 0.005, 8, 120), grey);
  seam.rotation.x = Math.PI / 2; seam.position.y = top + 0.006;
  const lidLine = new THREE.Mesh(new THREE.BoxGeometry(R * 1.78, 0.002, 0.004), grey);
  lidLine.position.set(0, top + 0.0115, -0.02);
  // janela do sensor frontal
  const win = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.034, 0.03, 3, 0.012), dark);
  win.position.set(0, clearance + 0.1, R - 0.004);
  // botões (pílula)
  const pill = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.06, 6, 16), silver);
  pill.rotation.x = Math.PI / 2; pill.scale.set(1, 1, 0.28);
  pill.position.set(0, top + 0.014, R * 0.52);

  // torre do LiDAR
  const lidar = new THREE.Group();
  lidar.position.set(0, top + 0.01, -R * 0.34);
  const lBase = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.16, 0.022, 64), white);
  lBase.position.y = 0.011;
  const spin = new THREE.Group();
  spin.position.y = 0.022;
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.034, 64), orange);
  ring.position.y = 0.017;
  spin.add(ring);
  for (let i = 0; i < 2; i++) {
    const slit = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.026, 0.02), dark);
    slit.position.set(Math.sin(i * Math.PI) * 0.128, 0.017, Math.cos(i * Math.PI) * 0.128);
    slit.rotation.y = i * Math.PI;
    spin.add(slit);
  }
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.158, 0.032, 64), gloss);
  cap.position.y = 0.022 + 0.034 + 0.016;
  const capTop = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.006, 64), white);
  capTop.position.y = cap.position.y + 0.019;
  lidar.add(lBase, spin, cap, capTop);

  // escovas laterais
  const brushes = [];
  const bristle = new THREE.MeshStandardMaterial({ color: 0xe9e6df, roughness: 0.7 });
  for (const side of [-1, 1]) {
    const b = new THREE.Group();
    b.position.set(side * R * 0.6, 0.012, R * 0.6);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.012, 16), grey);
    b.add(hub);
    for (let k = 0; k < 3; k++) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.005, 0.21), bristle);
      arm.position.z = 0.105;
      const holder = new THREE.Group();
      holder.rotation.y = k * (Math.PI * 2 / 3);
      holder.add(arm);
      b.add(holder);
    }
    b.userData.dir = side;
    brushes.push(b);
    robot.add(b);
  }

  [skirt, body, bumper, lid, seam, lidLine, win, pill, lBase, ring, cap, capTop].forEach((m) => { m.castShadow = true; });
  robot.add(skirt, body, bumper, lid, seam, lidLine, win, pill, lidar);
  robot.userData = { spin, brushes };
  return robot;
}

function buildDock() {
  const dock = new THREE.Group();
  const white = new THREE.MeshPhysicalMaterial({ color: 0xefeeea, roughness: 0.35, clearcoat: 0.6 });
  const grey = new THREE.MeshStandardMaterial({ color: 0x8d8a84, roughness: 0.6 });
  const tower = new THREE.Mesh(new RoundedBoxGeometry(0.78, 0.42, 0.26, 4, 0.06), white);
  tower.position.y = 0.21;
  const plate = new THREE.Mesh(new RoundedBoxGeometry(0.72, 0.02, 0.34, 2, 0.008), grey);
  plate.position.set(0, 0.01, 0.28);
  const led = new THREE.Mesh(new THREE.CircleGeometry(0.012, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  led.position.set(0, 0.34, 0.131);
  const contacts = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.012, 0.02), new THREE.MeshStandardMaterial({ color: 0xc9a24b, metalness: 1, roughness: 0.3 }));
  contacts.position.set(0, 0.05, 0.135);
  tower.castShadow = true; plate.receiveShadow = true;
  dock.add(tower, plate, led, contacts);
  dock.position.set(DOCK.x, 0, DOCK.z);
  dock.userData.led = led;
  return dock;
}

/* ---------- Mapa do LiDAR: pontos nas paredes de um cômodo ---------- */
function buildScanMap() {
  const rnd = mulberry(5);
  const outline = [
    [-5.6, -4.3], [5.6, -4.3], [5.6, 1.0], [4.4, 1.0], [4.4, 1.9], [5.6, 1.9], [5.6, 3.9],
    [1.6, 3.9], [1.6, 4.0], [0.3, 4.0], [0.3, 3.9], [-3.2, 3.9], [-3.2, 2.6], [-5.6, 2.6], [-5.6, -4.3],
  ];
  const pts = [];
  for (let i = 0; i < outline.length - 1; i++) {
    const [x1, z1] = outline[i], [x2, z2] = outline[i + 1];
    const len = Math.hypot(x2 - x1, z2 - z1), n = Math.ceil(len / 0.035);
    for (let k = 0; k < n; k++) {
      if (rnd() < 0.08) continue;
      const t = k / n;
      pts.push({ x: x1 + (x2 - x1) * t + (rnd() - .5) * 0.03, z: z1 + (z2 - z1) * t + (rnd() - .5) * 0.03 });
    }
  }
  // móveis: sofá e rack, vistos como contorno
  const boxes = [[-5.4, -1.6, 0.9, 2.6], [3.7, -4.1, 1.7, 0.45]];
  for (const [x, z, w, d] of boxes) {
    const per = [[x, z], [x + w, z], [x + w, z + d], [x, z + d], [x, z]];
    for (let i = 0; i < 4; i++) {
      const [x1, z1] = per[i], [x2, z2] = per[i + 1];
      const n = Math.ceil(Math.hypot(x2 - x1, z2 - z1) / 0.04);
      for (let k = 0; k < n; k++) { const t = k / n; pts.push({ x: x1 + (x2 - x1) * t, z: z1 + (z2 - z1) * t }); }
    }
  }
  // ordena pelo ângulo a partir do centro: a revelação parece uma varredura
  pts.sort((a, b) => Math.atan2(a.z, a.x) - Math.atan2(b.z, b.x));
  const arr = new Float32Array(pts.length * 3);
  pts.forEach((p, i) => { arr[i * 3] = p.x; arr[i * 3 + 1] = 0.02; arr[i * 3 + 2] = p.z; });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  const mat = new THREE.PointsMaterial({ color: 0xe2b85c, size: 0.05, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
  const points = new THREE.Points(geo, mat);
  points.userData.count = pts.length;
  return points;
}

/* ---------- Trajeto em faixas (como o robô real limpa) ---------- */
function buildPath() {
  const rows = [], xs = 3.9;
  for (let z = -1.95; z <= 2.7; z += 0.78) rows.push(z);
  const wps = [];
  rows.forEach((z, i) => {
    const a = i % 2 ? xs : -xs, b = -a;
    wps.push({ x: a, z }, { x: b, z });
  });
  return wps.concat(wps.slice(1, -1).reverse());
}

export function createStage(canvas, { reduced = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setClearColor(BG, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(BG, 9, 22);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.32;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);

  // luz de estúdio: foco quente de cima, contra-luz fria, preenchimento baixo
  const key = new THREE.SpotLight(0xffe9d2, 150, 40, Math.PI / 5.2, 0.95, 1.6);
  key.position.set(1.5, 11, 3.5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 6;
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0xe6ddd0, 0.4);
  rim.position.set(-6, 4, -7);
  scene.add(rim);
  scene.add(new THREE.HemisphereLight(0xfff4e6, 0x2a2219, 0.12));

  // chão
  const wood = woodTexture(renderer);
  wood.repeat.set(40 / 2.4, 40 / 2.4);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ map: wood, roughness: 0.42, metalness: 0 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // poeira + máscara de limpeza (branco = sujo, preto = limpo)
  const mask = document.createElement('canvas');
  mask.width = DUST.res; mask.height = Math.round(DUST.res * DUST.h / DUST.w);
  const mctx = mask.getContext('2d');
  mctx.fillStyle = '#fff'; mctx.fillRect(0, 0, mask.width, mask.height);
  const maskTex = new THREE.CanvasTexture(mask);
  const dust = new THREE.Mesh(new THREE.PlaneGeometry(DUST.w, DUST.h), new THREE.MeshStandardMaterial({
    map: dustTexture(), alphaMap: maskTex, transparent: true, roughness: 1, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -1,
  }));
  dust.rotation.x = -Math.PI / 2;
  dust.position.set(DUST.cx, 0.002, DUST.cz);
  dust.receiveShadow = true;
  scene.add(dust);

  const robot = buildRobot();
  scene.add(robot);
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(R * 2.6, R * 2.6), new THREE.MeshBasicMaterial({ map: softDiscTexture(), transparent: true, depthWrite: false }));
  contact.rotation.x = -Math.PI / 2; contact.position.y = 0.004;
  scene.add(contact);

  const dock = buildDock();
  scene.add(dock);

  const scan = buildScanMap();
  scene.add(scan);
  const pulses = [0, 0.5].map((phase) => {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.97, 1, 128), new THREE.MeshBasicMaterial({ color: 0xe2b85c, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2; m.position.y = 0.01; m.userData.phase = phase;
    scene.add(m);
    return m;
  });

  // partículas de sujeira que o robô puxa
  const N = 220;
  const crumbs = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.014, 0), new THREE.MeshStandardMaterial({ color: 0xb9ad98, roughness: 0.9 }), N);
  crumbs.castShadow = false;
  const crumbState = [];
  const rnd = mulberry(99);
  const spawn = (c, far = true) => {
    for (let tries = 0; tries < 20; tries++) {
      c.x = (rnd() - 0.5) * 8.6; c.z = -2.2 + rnd() * 5.2;
      if (!far || Math.hypot(c.x - bot.x, c.z - bot.z) > 2.2) break;
    }
    c.s = 0.45 + rnd() * rnd() * 1.2; c.grow = far ? 0 : 1; c.suck = 0; c.y = 0.012;
  };
  const dummy = new THREE.Object3D();
  scene.add(crumbs);

  // estado do robô
  const path = buildPath();
  const bot = { x: path[0].x, z: path[0].z, th: Math.PI / 2, wi: 1, mode: 'clean', phase: 'path', moving: false, speed: 0.95 };
  for (let i = 0; i < N; i++) { const c = {}; spawn(c, false); crumbState.push(c); }

  let progress = 0, targetProgress = 0;
  let redust = 0;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

  function nearestWp() {
    let best = 0, bd = Infinity;
    path.forEach((p, i) => { const d = Math.hypot(p.x - bot.x, p.z - bot.z); if (d < bd) { bd = d; best = i; } });
    return best;
  }

  function driveTo(tx, tz, dt, reverse = false) {
    const dx = tx - bot.x, dz = tz - bot.z, dist = Math.hypot(dx, dz);
    if (dist < 0.015) { bot.moving = false; return true; }
    let desired = Math.atan2(dx, dz);
    if (reverse) desired = wrapAngle(desired + Math.PI);
    const diff = wrapAngle(desired - bot.th);
    if (Math.abs(diff) > 0.02) {
      bot.th += Math.sign(diff) * Math.min(Math.abs(diff), 2.6 * dt);
      bot.moving = false;
      return false;
    }
    bot.th = desired;
    const sp = bot.mode === 'home' ? 1.7 : bot.speed;
    const step = Math.min(dist, sp * dt * (reverse ? 0.5 : 1));
    bot.x += dx / dist * step; bot.z += dz / dist * step;
    bot.moving = true;
    return false;
  }
  function turnTo(angle, dt) {
    const diff = wrapAngle(angle - bot.th);
    if (Math.abs(diff) < 0.01) { bot.th = angle; return true; }
    bot.th += Math.sign(diff) * Math.min(Math.abs(diff), 2.4 * dt);
    return false;
  }

  function updateBot(dt) {
    const wantHome = progress > 0.75;
    if (wantHome && bot.mode === 'clean') { bot.mode = 'home'; bot.phase = 'approach'; }
    if (!wantHome && bot.mode === 'home') { bot.mode = 'clean'; bot.phase = 'leave'; }

    if (bot.mode === 'home') {
      if (bot.phase === 'approach' && driveTo(APPROACH.x, APPROACH.z, dt)) bot.phase = 'turn';
      else if (bot.phase === 'turn' && turnTo(0, dt)) bot.phase = 'reverse';
      else if (bot.phase === 'reverse' && driveTo(PARK.x, PARK.z, dt, true)) bot.phase = 'parked';
      if (bot.phase === 'parked') bot.moving = false;
    } else {
      if (bot.phase === 'leave') {
        if (bot.z < APPROACH.z - 0.05) { driveTo(APPROACH.x, APPROACH.z, dt); }
        else { bot.phase = 'path'; bot.wi = nearestWp(); }
      } else {
        const wp = path[bot.wi];
        if (driveTo(wp.x, wp.z, dt)) {
          bot.wi = (bot.wi + 1) % path.length;
          if (bot.wi === 0 || bot.wi === path.length / 2) redust = 2.5;
        }
      }
    }
  }

  function cleanUnder() {
    const u = (bot.x - (DUST.cx - DUST.w / 2)) / DUST.w * mask.width;
    const v = (bot.z - (DUST.cz - DUST.h / 2)) / DUST.h * mask.height;
    const rpx = (R * 0.98) / DUST.w * mask.width;
    const g = mctx.createRadialGradient(u, v, rpx * 0.55, u, v, rpx);
    g.addColorStop(0, 'rgba(0,0,0,0.9)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    mctx.fillStyle = g;
    mctx.beginPath(); mctx.arc(u, v, rpx, 0, 6.283); mctx.fill();
  }

  function updateCrumbs(dt) {
    const fx = Math.sin(bot.th), fz = Math.cos(bot.th);
    for (let i = 0; i < N; i++) {
      const c = crumbState[i];
      if (c.grow < 1) c.grow = Math.min(1, c.grow + dt * 0.6);
      const dx = bot.x - c.x, dz = bot.z - c.z, d = Math.hypot(dx, dz);
      const ahead = (-dx * fx - dz * fz) > -0.2; // na frente ou do lado
      if (!c.suck && d < R + 0.22 && (ahead || d < R)) c.suck = 0.0001;
      if (c.suck) {
        c.suck += dt * 3.2;
        const k = Math.min(1, dt * 9);
        c.x += dx * k; c.z += dz * k;
        c.y = 0.012 + Math.sin(c.suck * Math.PI) * 0.03;
        if (c.suck >= 1 || d < R * 0.55) spawn(c, true);
      }
      dummy.position.set(c.x, c.y, c.z);
      const s = c.s * c.grow * (c.suck ? 1 - c.suck * 0.7 : 1);
      dummy.scale.setScalar(s);
      dummy.rotation.set(i, i * 2, 0);
      dummy.updateMatrix();
      crumbs.setMatrixAt(i, dummy.matrix);
    }
    crumbs.instanceMatrix.needsUpdate = true;
  }

  // câmera: quadros-chave (alvo e deslocamento) por etapa
  const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const K = {
    hero: { t: v3(0, 0.05, 0), o: v3(3.4, 2.7, 4.6), track: 0.8 },
    map: { t: v3(0, 0, -0.1), o: v3(0.01, 25.5, 3.8), track: 0 },
    mapNarrow: { t: v3(1.9, 0, -0.1), o: v3(4.6, 52, 0.01), track: 0 },
    follow: { t: v3(0, 0.1, 0), o: v3(2.0, 1.35, 2.75), track: 1 },
    dock: { t: v3(0, 0.18, -3.15), o: v3(2.4, 1.45, 3.1), track: 0 },
  };
  const keys = [[0, 'hero'], [0.1, 'hero'], [0.28, 'map'], [0.44, 'map'], [0.56, 'follow'], [0.7, 'follow'], [0.84, 'dock'], [1, 'dock']];
  const tmpT = new THREE.Vector3(), tmpO = new THREE.Vector3(), aT = new THREE.Vector3(), aO = new THREE.Vector3(), bT = new THREE.Vector3(), bO = new THREE.Vector3();
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
  let firstCam = true;
  let layout = { narrow: false, aspect: 1 };

  function frameFor(name, outT, outO) {
    const f = K[name === 'map' && layout.narrow ? 'mapNarrow' : name];
    outT.copy(f.t); outO.copy(f.o);
    if (f.track) { outT.x += bot.x * f.track; outT.z += bot.z * f.track; }
    const k = layout.narrow ? ({ hero: 1.35, map: 1, follow: 2.2, dock: 2.1 })[name] : 1;
    outO.multiplyScalar(k);
  }

  function updateCamera(dt) {
    let i = 0;
    while (i < keys.length - 2 && progress > keys[i + 1][0]) i++;
    const [p0, n0] = keys[i], [p1, n1] = keys[i + 1];
    const t = smooth(clamp((progress - p0) / Math.max(1e-4, p1 - p0), 0, 1));
    frameFor(n0, aT, aO); frameFor(n1, bT, bO);
    tmpT.lerpVectors(aT, bT, t);
    tmpO.lerpVectors(aO, bO, t);
    // parallax do mouse, só no topo
    const par = 1 - clamp(progress / 0.12, 0, 1);
    pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 3);
    pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 3);
    tmpO.x += pointer.x * 0.5 * par; tmpO.y += -pointer.y * 0.3 * par;
    const wantPos = tmpT.clone().add(tmpO);
    if (firstCam) { camPos.copy(wantPos); camLook.copy(tmpT); firstCam = false; }
    const s = Math.min(1, dt * 5);
    camPos.lerp(wantPos, s); camLook.lerp(tmpT, s);
    camera.position.copy(camPos);
    camera.lookAt(camLook);
    const dist = camPos.distanceTo(camLook);
    scene.fog.near = dist * 1.1; scene.fog.far = dist * 2.6;
  }

  function updateFx(time) {
    const wMap = bump(progress, 0.18, 0.3, 0.46, 0.56);
    const n = scan.userData.count;
    const reveal = clamp((progress - 0.2) / 0.2, 0, 1);
    scan.geometry.setDrawRange(0, Math.floor(n * reveal));
    scan.material.opacity = wMap * 0.95;
    scan.material.size = layout.narrow ? 0.16 : 0.06;
    for (const p of pulses) {
      const t = ((time * 0.55) + p.userData.phase) % 1;
      p.position.set(bot.x, 0.01, bot.z);
      p.scale.setScalar(0.3 + t * 6.5);
      p.material.opacity = (1 - t) * (1 - t) * 0.8 * (0.15 + wMap * 0.85) * (progress < 0.75 ? 1 : 0);
    }
    dock.userData.led.material.color.setHSL(0.11, 0.7, bot.phase === 'parked' ? 0.55 + Math.sin(time * 3) * 0.15 : 0.92);
  }

  function update(dt, time) {
    progress += (targetProgress - progress) * Math.min(1, dt * 6);
    updateBot(dt);
    robot.position.set(bot.x, 0, bot.z);
    robot.rotation.y = bot.th;
    contact.position.set(bot.x, 0.004, bot.z);
    const { spin, brushes } = robot.userData;
    spin.rotation.y += dt * 9;
    const active = bot.phase !== 'parked';
    for (const b of brushes) b.rotation.y += dt * (active ? 16 : 0) * b.userData.dir;
    if (active) cleanUnder();
    if (redust > 0) {
      redust -= dt;
      mctx.globalAlpha = 0.012;
      mctx.fillStyle = '#fff';
      mctx.fillRect(0, 0, mask.width, mask.height);
      mctx.globalAlpha = 1;
    }
    maskTex.needsUpdate = true;
    updateCrumbs(dt);
    updateCamera(dt);
    updateFx(time);
  }

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    const narrow = w < 900;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, narrow ? 1.6 : 1.75));
    renderer.setSize(w, h, false);
    layout.narrow = narrow;
    if (narrow) {
      // texto em cima, robô na metade de baixo
      const fh = h * 1.5;
      camera.aspect = w / fh;
      camera.fov = 34;
      camera.setViewOffset(w, fh, 0, 0, w, h);
    } else {
      // texto à esquerda, robô à direita
      const fw = w * 1.42;
      camera.aspect = fw / h;
      camera.fov = 30;
      camera.setViewOffset(fw, h, 0, 0, w, h);
    }
    camera.updateProjectionMatrix();
  }

  // adianta a simulação para já começar com rastro limpo
  progress = 0;
  for (let i = 0; i < 60 * 9; i++) { updateBot(1 / 60); cleanUnder(); }
  bot.wi = bot.wi % path.length;

  const clock = new THREE.Clock();
  let raf = 0, running = false;
  function loop() {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05);
    update(dt, clock.elapsedTime);
    renderer.render(scene, camera);
  }

  resize();
  if (reduced) { update(1 / 60, 0); renderer.render(scene, camera); }

  return {
    setProgress(p) { targetProgress = clamp(p, 0, 1); if (reduced) { progress = targetProgress; } },
    warp(sec) { for (let i = 0; i < sec * 60; i++) update(1 / 60, clock.elapsedTime + i / 60); renderer.render(scene, camera); },
    setPointer(x, y) { pointer.tx = x; pointer.ty = y; },
    resize() { resize(); if (reduced || !running) renderer.render(scene, camera); },
    start() { if (running || reduced) return; running = true; clock.getDelta(); loop(); },
    stop() { running = false; cancelAnimationFrame(raf); },
  };
}
