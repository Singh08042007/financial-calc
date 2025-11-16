// Animated background: gently moving particles with parallax
const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');
let width = (canvas.width = window.innerWidth);
let height = (canvas.height = window.innerHeight);

const DPR = Math.min(window.devicePixelRatio || 1, 2);
canvas.width = width * DPR;
canvas.height = height * DPR;
ctx.scale(DPR, DPR);

const particles = Array.from({ length: 80 }, () => ({
  x: Math.random() * width,
  y: Math.random() * height,
  r: Math.random() * 2 + 0.5,
  vx: (Math.random() - 0.5) * 0.2,
  vy: (Math.random() - 0.5) * 0.2,
  h: Math.random() * 360,
}));

let mouse = { x: width / 2, y: height / 3 };
window.addEventListener('mousemove', (e) => {
  mouse = { x: e.clientX, y: e.clientY };
});

function tick() {
  ctx.clearRect(0, 0, width, height);
  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    if (p.x < -50) p.x = width + 50;
    if (p.y < -50) p.y = height + 50;
    if (p.x > width + 50) p.x = -50;
    if (p.y > height + 50) p.y = -50;

    const dx = p.x - mouse.x;
    const dy = p.y - mouse.y;
    const dist = Math.hypot(dx, dy);
    const alpha = Math.max(0, 1 - dist / 300);

    ctx.beginPath();
    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 8);
    grad.addColorStop(0, `hsla(${p.h}, 100%, 70%, ${0.6 * alpha})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.arc(p.x, p.y, p.r * 8, 0, Math.PI * 2);
    ctx.fill();
  }
  requestAnimationFrame(tick);
}

function onResize() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
  canvas.width = width * DPR;
  canvas.height = height * DPR;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(DPR, DPR);
}

window.addEventListener('resize', onResize);
tick();
