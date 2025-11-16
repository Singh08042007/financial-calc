import { db } from './supabase.js';
import { showAlert, showPrompt, showConfirm, toast } from './notifications.js';

const summaryEl = document.getElementById('budget-summary');
const txnTableBody = document.querySelector('#txn-table tbody');
const txnModal = document.getElementById('txn-modal');

const txnAddOpen = document.getElementById('txn-add-open');
txnAddOpen.addEventListener('click', async () => {
  await ensureCategories();
  // Set today's date by default
  const dateInput = document.getElementById('txn-date');
  if (!dateInput.value) dateInput.value = new Date().toISOString().slice(0, 10);
  txnModal.showModal();
});

document.getElementById('budget-add-cat').addEventListener('click', async () => {
  const name = await showPrompt('Enter category name:', '', 'Add Category');
  if (!name) return;
  try {
    await db.upsertCategory(name.trim());
    await ensureCategories();
    toast('Category saved', 'success');
  } catch (e) {
    await showAlert(e.message, 'Error Saving Category');
  }
});

document.getElementById('txn-save').addEventListener('click', async (e) => {
  e.preventDefault();
  const date = document.getElementById('txn-date').value;
  const type = document.getElementById('txn-type').value;
  const category = document.getElementById('txn-category').value.trim();
  const note = document.getElementById('txn-note').value.trim();
  const amount = parseFloat(document.getElementById('txn-amount').value);
  if (!date || !category || !amount) return;
  try {
    await db.upsertCategory(category);
    await db.addTransaction({ date, type, category, note, amount });
    txnModal.close();
    await refreshMonth();
    toast('Transaction added', 'success');
  } catch (e) {
    await showAlert(e.message, 'Error Adding Transaction');
  }
});

txnTableBody.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-id]'); if (!btn) return;
  if (await showConfirm('Delete this transaction?', 'Confirm Delete')) {
    await db.deleteTransaction(btn.dataset.id);
    toast('Transaction deleted', 'success');
    await refreshMonth();
  }
});

async function ensureCategories() {
  const list = await db.listCategories();
  const dl = document.getElementById('cat-list');
  dl.innerHTML = list.map((c) => `<option value="${c.name}"></option>`).join('');
}

function monthBounds(date = new Date()) {
  const y = date.getFullYear(), m = date.getMonth();
  const start = new Date(y, m, 1).toISOString().slice(0,10);
  const end = new Date(y, m + 1, 0).toISOString().slice(0,10);
  return { start, end };
}

const money = (n) => n.toLocaleString(undefined, { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });

async function refreshMonth() {
  const { start, end } = monthBounds();
  const txns = await db.listTransactions(start, end);
  const income = txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const net = income - expense;

  // by category breakdown
  const byCat = {};
  for (const t of txns) {
    const key = `${t.type}:${t.category}`;
    byCat[key] = (byCat[key] || 0) + t.amount;
  }

  summaryEl.innerHTML = `
    <div class="results">
      <div class="stat"><span>Income</span><strong>${money(income)}</strong></div>
      <div class="stat"><span>Expense</span><strong>${money(expense)}</strong></div>
      <div class="stat"><span>Net</span><strong>${money(net)}</strong></div>
    </div>
    <div class="scroll" style="max-height:240px">
      <table class="table"><thead><tr><th>Type</th><th>Category</th><th>Amount</th></tr></thead>
      <tbody>
        ${Object.entries(byCat).map(([k,v]) => {
          const [type, category] = k.split(':');
          return `<tr><td>${type}</td><td>${category}</td><td>${money(v)}</td></tr>`;
        }).join('')}
      </tbody></table>
    </div>`;

  txnTableBody.innerHTML = txns.map((t) => `
    <tr>
      <td>${t.date}</td><td>${t.type}</td><td>${t.category}</td><td>${t.note || ''}</td><td>${money(t.amount)}</td>
      <td><button class="btn" data-id="${t.id}">Delete</button></td>
    </tr>`).join('');
}

window.addEventListener('auth:changed', async () => { await ensureCategories(); await refreshMonth(); });
