// Custom notification system replacing alert/prompt/confirm with themed modals

// Create notification container
const notifContainer = document.createElement('div');
notifContainer.id = 'notif-container';
document.body.appendChild(notifContainer);

// Toast notifications (replaces simple alerts)
export function toast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  notifContainer.appendChild(toast);
  
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Custom alert modal
export function showAlert(message, title = '') {
  return new Promise((resolve) => {
    const modal = document.createElement('dialog');
    modal.className = 'custom-dialog';
    modal.innerHTML = `
      <div class="card dialog-card">
        ${title ? `<h3>${title}</h3>` : ''}
        <p class="dialog-message">${message}</p>
        <div class="dialog-actions">
          <button class="btn primary dialog-btn-ok">OK</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.showModal();
    
    const handleClose = () => {
      modal.close();
      modal.remove();
      resolve();
    };
    
    modal.querySelector('.dialog-btn-ok').onclick = handleClose;
    modal.onclick = (e) => { if (e.target === modal) handleClose(); };
  });
}

// Custom confirm modal
export function showConfirm(message, title = 'Confirm') {
  return new Promise((resolve) => {
    const modal = document.createElement('dialog');
    modal.className = 'custom-dialog';
    modal.innerHTML = `
      <div class="card dialog-card">
        <h3>${title}</h3>
        <p class="dialog-message">${message}</p>
        <div class="dialog-actions">
          <button class="btn primary dialog-btn-yes">Yes</button>
          <button class="btn dialog-btn-no">No</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.showModal();
    
    const handleClose = (result) => {
      modal.close();
      modal.remove();
      resolve(result);
    };
    
    modal.querySelector('.dialog-btn-yes').onclick = () => handleClose(true);
    modal.querySelector('.dialog-btn-no').onclick = () => handleClose(false);
    modal.onclick = (e) => { if (e.target === modal) handleClose(false); };
  });
}

// Custom prompt modal
export function showPrompt(message, defaultValue = '', title = '') {
  return new Promise((resolve) => {
    const modal = document.createElement('dialog');
    modal.className = 'custom-dialog';
    modal.innerHTML = `
      <div class="card dialog-card">
        ${title ? `<h3>${title}</h3>` : ''}
        <p class="dialog-message">${message}</p>
        <input type="text" class="dialog-input" value="${defaultValue}" />
        <div class="dialog-actions">
          <button class="btn primary dialog-btn-ok">OK</button>
          <button class="btn dialog-btn-cancel">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.showModal();
    
    const input = modal.querySelector('.dialog-input');
    input.focus();
    input.select();
    
    const handleClose = (result) => {
      modal.close();
      modal.remove();
      resolve(result);
    };
    
    modal.querySelector('.dialog-btn-ok').onclick = () => handleClose(input.value.trim());
    modal.querySelector('.dialog-btn-cancel').onclick = () => handleClose(null);
    modal.onclick = (e) => { if (e.target === modal) handleClose(null); };
    input.onkeydown = (e) => { if (e.key === 'Enter') handleClose(input.value.trim()); };
  });
}
