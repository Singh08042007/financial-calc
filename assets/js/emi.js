import { db } from './supabase.js';
import { showAlert, showPrompt, showConfirm, toast } from './notifications.js';

const fmtCurrency = (x) => (isNaN(x) ? '—' : x.toLocaleString(undefined, { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }));
const byId = (id) => document.getElementById(id);

// Elements
const principalEl = byId('emi-principal');
const rateEl = byId('emi-rate');
const monthsEl = byId('emi-months');
const startEl = byId('emi-start');
const calcBtn = byId('emi-calc-btn');
const saveLoanBtn = byId('emi-save-loan');

const monthlyOut = byId('emi-monthly');
const interestOut = byId('emi-interest');
const totalOut = byId('emi-total');
const tableBody = document.querySelector('#emi-table tbody');

const loansTableBody = document.querySelector('#loans-table tbody');
const loanModal = document.getElementById('loan-modal');
const loanAddOpen = document.getElementById('loan-add-open');

// Helpers
function calcEMI(P, annualRate, n) {
  const r = (annualRate / 12) / 100;
  if (r === 0) {
    const emi = P / n; return { emi, totalInterest: 0, totalPayment: P };
  }
  const pow = Math.pow(1 + r, n);
  const emi = (P * r * pow) / (pow - 1);
  const totalPayment = emi * n;
  const totalInterest = totalPayment - P;
  return { emi, totalInterest, totalPayment };
}

function schedule(P, annualRate, n, startDate) {
  const r = (annualRate / 12) / 100;
  const { emi } = calcEMI(P, annualRate, n);
  const rows = [];
  let balance = P;
  let d = startDate ? new Date(startDate) : new Date();
  for (let i = 1; i <= n; i++) {
    const interest = balance * r;
    const principal = Math.min(balance, emi - interest);
    balance = Math.max(0, balance - principal);
    const due = new Date(d);
    rows.push({ i, due, emi, principal, interest, balance });
    d.setMonth(d.getMonth() + 1);
  }
  return rows;
}

function renderSchedule(rows) {
  tableBody.innerHTML = rows.map((r) => `
    <tr>
      <td>${r.i}</td>
      <td>${r.due.toISOString().slice(0,10)}</td>
      <td>${fmtCurrency(r.emi)}</td>
      <td>${fmtCurrency(r.principal)}</td>
      <td>${fmtCurrency(r.interest)}</td>
      <td>${fmtCurrency(r.balance)}</td>
    </tr>`).join('');
}

function computeAndRender() {
  const P = parseFloat(principalEl.value) || 0;
  const rate = parseFloat(rateEl.value) || 0;
  const n = parseInt(monthsEl.value, 10) || 0;
  if (!P || !n) return;
  const { emi, totalInterest, totalPayment } = calcEMI(P, rate, n);
  monthlyOut.textContent = fmtCurrency(emi);
  interestOut.textContent = fmtCurrency(totalInterest);
  totalOut.textContent = fmtCurrency(totalPayment);
  const rows = schedule(P, rate, n, startEl.value);
  renderSchedule(rows);
}

calcBtn.addEventListener('click', (e) => { e.preventDefault(); computeAndRender(); });
['input', 'change'].forEach((evt) => {
  principalEl.addEventListener(evt, computeAndRender);
  rateEl.addEventListener(evt, computeAndRender);
  monthsEl.addEventListener(evt, computeAndRender);
  startEl.addEventListener(evt, computeAndRender);
});
computeAndRender();
// Default start date to today if empty
if (!startEl.value) startEl.value = new Date().toISOString().slice(0,10);

// Save loan from calculator
saveLoanBtn.addEventListener('click', async () => {
  const name = await showPrompt('Enter a name for this loan:', '', 'Save Loan');
  if (!name) return;
  const P = parseFloat(principalEl.value) || 0;
  const rate = parseFloat(rateEl.value) || 0;
  const n = parseInt(monthsEl.value, 10) || 0;
  const start = startEl.value || new Date().toISOString().slice(0,10);
  const { emi } = calcEMI(P, rate, n);
  try {
    await db.addLoan({ name, principal: P, annual_rate: rate, months: n, start_date: start, monthly_emi: emi });
    await loadLoans();
    toast('Loan saved successfully!', 'success');
  } catch (err) { await showAlert(err.message, 'Error Saving Loan'); }
});

// Loans UI
loanAddOpen.addEventListener('click', () => loanModal.showModal());
document.getElementById('loan-save').addEventListener('click', async (e) => {
  e.preventDefault();
  const name = document.getElementById('loan-name').value.trim();
  const principal = parseFloat(document.getElementById('loan-principal').value);
  const annual_rate = parseFloat(document.getElementById('loan-rate').value);
  const months = parseInt(document.getElementById('loan-months').value, 10);
  const start_date = document.getElementById('loan-start').value;
  if (!name || !principal || !months || !start_date) return;
  const { emi } = calcEMI(principal, annual_rate, months);
  try {
    await db.addLoan({ name, principal, annual_rate, months, start_date, monthly_emi: emi });
    loanModal.close();
    await loadLoans();
  } catch (err) { await showAlert(err.message, 'Error Adding Loan'); }
});

async function loadLoans() {
  try {
    const loans = await db.listLoans();
    loansTableBody.innerHTML = '';
    let totalMonthlyEmi = 0;
    for (const L of loans) {
      const payments = await db.listPayments(L.id);
      const nextDue = await computeNextDue(L.start_date, L.months, L.id, payments);
      const remaining = await computeRemaining(L, payments);
      if (remaining > 1) totalMonthlyEmi += (Number(L.monthly_emi) || 0);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${L.name}</td>
        <td>${fmtCurrency(L.monthly_emi)}</td>
        <td>${nextDue ?? '—'}</td>
        <td>${fmtCurrency(remaining)}</td>
        <td>${remaining <= 1 ? 'Paid' : 'Active'}</td>
        <td>
          <button class="btn" data-action="pay" data-id="${L.id}">Pay EMI</button>
          <button class="btn" data-action="del" data-id="${L.id}">Delete</button>
        </td>`;
      loansTableBody.appendChild(tr);
    }
    const totalEl = document.getElementById('total-monthly-emi');
    if (totalEl) totalEl.textContent = fmtCurrency(totalMonthlyEmi);
  } catch (err) { console.error(err); }
}

function addMonths(dateStr, m) {
  const d = new Date(dateStr); d.setMonth(d.getMonth() + m); return d.toISOString().slice(0,10);
}

async function computeNextDue(start_date, months, loan_id, payments) {
  // Calculate next due date based on number of payments made
  const paymentCount = payments.length;
  
  // If all payments are done, no next due
  if (paymentCount >= months) return null;
  
  // Next due is start_date + (paymentCount) months
  const start = new Date(start_date);
  const nextDue = new Date(start);
  nextDue.setMonth(start.getMonth() + paymentCount);
  
  return nextDue.toISOString().slice(0, 10);
}

async function computeRemaining(L, payments = null) {
  const r = (L.annual_rate / 12) / 100;
  const n = L.months;
  const P = L.principal;
  if (!payments) payments = await db.listPayments(L.id);
  const k = payments.length; // number of EMIs paid (approx)
  if (r === 0) {
    const base = Math.max(0, P - (P / n) * k);
    const extra = payments.reduce((s, p) => s + (p.amount - (P / n)), 0);
    return Math.max(0, base - extra);
  }
  const pow = Math.pow(1 + r, n);
  const powk = Math.pow(1 + r, k);
  const balance = P * (pow - powk) / (pow - 1);
  const emi = L.monthly_emi;
  const extra = payments.reduce((s, p) => s + (p.amount - emi), 0);
  return Math.max(0, balance - extra);
}

loansTableBody.addEventListener('click', async (e) => {
  const btn = e.target.closest('button'); if (!btn) return;
  const id = btn.dataset.id; const action = btn.dataset.action;
  if (action === 'del') {
    if (await showConfirm('Are you sure you want to delete this loan? This cannot be undone.', 'Delete Loan')) {
      await db.deleteLoan(id);
      toast('Loan deleted', 'success');
      await loadLoans();
    }
  } else if (action === 'pay') {
    const loans = await db.listLoans();
    const loan = loans.find((x) => x.id === id);
    if (!loan) return;
    
    // Get loan owner's profile
    const profile = await db.getUserProfile(loan.user_id);
    const borrowerUPI = profile?.upi_id || 'No UPI ID found';
    const borrowerEmail = profile?.user_id || 'Unknown';
    
    // Show custom payment modal
    const paymentModal = document.getElementById('payment-modal');
    const paymentAmountDisplay = document.getElementById('payment-emi-amount');
    const paymentAmountInput = document.getElementById('payment-amount');
    const borrowerNameEl = document.getElementById('payment-borrower-name');
    const borrowerUPIEl = document.getElementById('payment-borrower-upi');
    
    paymentAmountDisplay.textContent = fmtCurrency(loan.monthly_emi);
    paymentAmountInput.value = loan.monthly_emi.toFixed(2);
    borrowerNameEl.textContent = loan.name || 'Loan Owner';
    borrowerUPIEl.textContent = borrowerUPI;
    
    // Copy UPI button
    document.getElementById('copy-upi').onclick = () => {
      navigator.clipboard.writeText(borrowerUPI);
      toast('UPI ID copied to clipboard!', 'success');
    };
    
    // Store loan ID for confirmation
    paymentModal.dataset.loanId = id;
    paymentModal.showModal();
  }
});

// Payment confirmation
document.getElementById('payment-confirm').addEventListener('click', async (e) => {
  e.preventDefault();
  const paymentModal = document.getElementById('payment-modal');
  const loanId = paymentModal.dataset.loanId;
  const amount = parseFloat(document.getElementById('payment-amount').value);
  
  if (!amount || amount <= 0) {
    await showAlert('Please enter a valid payment amount', 'Invalid Amount');
    return;
  }
  
  try {
    const paid_on = new Date().toISOString().slice(0, 10);
    await db.addPayment({ loan_id: loanId, amount, paid_on });
    paymentModal.close();
    toast('Payment recorded successfully!', 'success');
    await loadLoans();
  } catch (err) {
    await showAlert(err.message, 'Error Recording Payment');
  }
});

// React to auth change
window.addEventListener('auth:changed', () => { loadLoans(); });
