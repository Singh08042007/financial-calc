const routes = [
  { key: 'emi-calc', id: 'route-emi-calc' },
  { key: 'emi-tracker', id: 'route-emi-tracker' },
  { key: 'budget', id: 'route-budget' },
  { key: 'calc', id: 'route-calc' },
];

function setActiveRoute(key) {
  routes.forEach((r) => {
    document.getElementById(r.id).classList.toggle('active', r.key === key);
  });
  document.querySelectorAll('.nav-btn').forEach((b) =>
    b.classList.toggle('active', b.dataset.route === key)
  );
  location.hash = key;
}

document.querySelectorAll('.nav-btn').forEach((btn) =>
  btn.addEventListener('click', () => setActiveRoute(btn.dataset.route))
);

window.addEventListener('hashchange', () => {
  const key = location.hash.replace('#', '') || 'emi-calc';
  const found = routes.find((r) => r.key === key);
  setActiveRoute(found ? found.key : 'emi-calc');
});

// Theme toggle
const THEME_KEY = 'finpilot-theme';
const themeBtn = document.getElementById('btn-theme');
function applyTheme(t) {
  document.documentElement.classList.toggle('theme-light', t === 'light');
}
function getTheme() { return localStorage.getItem(THEME_KEY) || 'dark'; }
function setTheme(t) { localStorage.setItem(THEME_KEY, t); applyTheme(t); }
themeBtn.addEventListener('click', () => setTheme(getTheme() === 'dark' ? 'light' : 'dark'));
applyTheme(getTheme());

// Initial route
setActiveRoute((location.hash || '#emi-calc').replace('#', ''));
