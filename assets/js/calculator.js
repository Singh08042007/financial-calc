const display = document.getElementById('calc-display');
const keys = document.getElementById('calc-keys');

const layout = [
  '7','8','9','/','4','5','6','*','1','2','3','-','0','.','=','+','C','⌫','(',')'
];

function btn(label, cls='') {
  const b = document.createElement('button'); b.textContent = label; if (cls) b.className = cls; return b;
}

for (const k of layout) {
  const isOp = '/-*+=()'.includes(k) || k === 'C' || k === '⌫';
  const b = btn(k, isOp ? 'op' : '');
  if (k === '=') b.classList.add('equals');
  keys.appendChild(b);
}

function safeEval(expr) {
  // Very simple evaluator for + - * / () and decimals
  // Using Function while constraining characters
  if (!/^[-+*/().\d\s]+$/.test(expr)) throw new Error('Invalid input');
  // eslint-disable-next-line no-new-func
  return Function(`"use strict"; return (${expr})`)();
}

keys.addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  const k = b.textContent;
  if (k === 'C') { display.value = ''; return; }
  if (k === '⌫') { display.value = display.value.slice(0, -1); return; }
  if (k === '=') {
    try { const v = safeEval(display.value || '0'); display.value = String(v); }
    catch { display.value = 'Error'; }
    return;
  }
  display.value += k;
});
