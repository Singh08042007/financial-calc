// Supabase initialization using ESM import from CDN and config.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import '../config.js'; // defines global SUPABASE_URL and SUPABASE_ANON_KEY

export const supa = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

export async function getSession() {
  const { data } = await supa.auth.getSession();
  return data.session;
}

export function onAuthChange(cb) {
  return supa.auth.onAuthStateChange((_event, session) => cb(session));
}

export async function signIn(email, password) {
  const { data, error } = await supa.auth.signInWithPassword({ email, password });
  if (error) throw error; return data;
}

export async function signUp(email, password) {
  const { data, error } = await supa.auth.signUp({ email, password });
  if (error) throw error; return data;
}

export async function signOut() { await supa.auth.signOut(); }

// Tables helper wrappers
export const db = {
  // loans table
  async addLoan(payload) {
    const { data, error } = await supa.from('loans').insert(payload).select().single();
    if (error) throw error; return data;
  },
  async listLoans() {
    const { data, error } = await supa.from('loans').select('*').order('created_at', { ascending: false });
    if (error) throw error; return data || [];
  },
  async deleteLoan(id) {
    const { error } = await supa.from('loans').delete().eq('id', id);
    if (error) throw error;
  },
  async addPayment(payload) {
    const { data, error } = await supa.from('loan_payments').insert(payload).select().single();
    if (error) throw error; return data;
  },
  async listPayments(loan_id) {
    const { data, error } = await supa.from('loan_payments').select('*').eq('loan_id', loan_id).order('paid_on');
    if (error) throw error; return data || [];
  },

  // budgets/transactions
  async upsertCategory(name) {
    // First check if category exists
    const { data: existing } = await supa
      .from('budget_categories')
      .select('*')
      .eq('name', name)
      .maybeSingle();
    
    if (existing) return existing;
    
    // If not, create it
    const { data, error } = await supa.from('budget_categories').insert({ name }).select().single();
    if (error) throw error;
    return data;
  },
  async listCategories() {
    const { data, error } = await supa.from('budget_categories').select('*').order('name');
    if (error) throw error; return data || [];
  },
  async addTransaction(payload) {
    const { data, error } = await supa.from('transactions').insert(payload).select().single();
    if (error) throw error; return data;
  },
  async listTransactions(monthStart, monthEnd) {
    const { data, error } = await supa
      .from('transactions')
      .select('*')
      .gte('date', monthStart)
      .lte('date', monthEnd)
      .order('date', { ascending: false });
    if (error) throw error; return data || [];
  },
  async deleteTransaction(id) {
    const { error } = await supa.from('transactions').delete().eq('id', id);
    if (error) throw error;
  },
};
