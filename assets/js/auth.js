import { getSession, onAuthChange, signIn, signUp, signOut } from './supabase.js';
import { showAlert, toast } from './notifications.js';

const authStatus = document.getElementById('auth-status');
const signInBtn = document.getElementById('btn-sign-in');
const signOutBtn = document.getElementById('btn-sign-out');
const userMenu = document.getElementById('user-menu');
const authModal = document.getElementById('auth-modal');

signInBtn.addEventListener('click', () => authModal.showModal());
signOutBtn.addEventListener('click', async () => {
  await signOut();
  userMenu.hidden = true;
  signInBtn.hidden = false;
});

document.getElementById('auth-do-signin').addEventListener('click', async (e) => {
  e.preventDefault();
  const emailInput = document.getElementById('auth-email');
  const passwordInput = document.getElementById('auth-password');
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  
  if (!email || !password) {
    await showAlert('Please enter both email and password', 'Missing Information');
    return;
  }
  
  try {
    const result = await signIn(email, password);
    console.log('Sign in result:', result);
    
    if (result.session) {
      authModal.close();
      emailInput.value = '';
      passwordInput.value = '';
      // UI will update automatically via onAuthChange
    } else if (result.user && !result.session) {
      await showAlert('Please confirm your email first. Check your inbox for the confirmation link.', 'Email Not Confirmed');
    } else {
      await showAlert('Sign in failed. Please try again.', 'Sign In Failed');
    }
  } catch (err) {
    console.error('Sign in error:', err);
    if (err.message.includes('Email not confirmed')) {
      await showAlert('Please confirm your email first. Check your inbox for the confirmation link.', 'Email Not Confirmed');
    } else if (err.message.includes('Invalid login credentials')) {
      await showAlert('Wrong email or password. Please try again.', 'Invalid Credentials');
    } else {
      await showAlert(err.message, 'Sign In Error');
    }
  }
});

document.getElementById('auth-do-signup').addEventListener('click', async (e) => {
  e.preventDefault();
  try {
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const result = await signUp(email, password);
    
    // Check if email confirmation is required
    if (result.user && !result.session) {
      await showAlert('Check your email to confirm your account, then sign in.', 'Confirm Email');
    } else if (result.session) {
      toast('Account created and signed in!', 'success');
      authModal.close();
    } else {
      toast('Account created. You can now sign in.', 'success');
    }
  } catch (err) {
    if (err.message.includes('already registered')) {
      await showAlert('This email is already registered. Please sign in instead.', 'Email Already Registered');
    } else {
      await showAlert(err.message, 'Sign Up Error');
    }
  }
});

async function refreshAuthUI(session) {
  const s = session || (await getSession());
  console.log('Auth state:', s);
  
  if (s && s.user) {
    authStatus.textContent = s.user.email;
    signInBtn.hidden = true;
    userMenu.hidden = false;
    document.body.classList.remove('needs-auth');
    console.log('User signed in:', s.user.email);
  } else {
    signInBtn.hidden = false;
    userMenu.hidden = true;
    document.body.classList.add('needs-auth');
    console.log('No user session');
  }
  // Allow feature modules to react
  window.dispatchEvent(new CustomEvent('auth:changed', { detail: s }));
}

onAuthChange((event, session) => {
  console.log('Auth change event:', event, session);
  refreshAuthUI(session);
});
refreshAuthUI();
