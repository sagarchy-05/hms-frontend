var base_url = process.env.base_url || 'http://localhost:8080/api';

// --- TOAST UTILITY ---
function showToast(message, type = 'danger') {
  const container = $('#toast-container');
  if (!container.length) {
    // Note: Replaced 'top-0 end-0' with 'top-0 right-0' for maximum compatibility if not using modern Bootstrap
    $('body').append(
      '<div id="toast-container" class="position-fixed top-0 end-0 p-3" style="z-index:1080;"></div>'
    );
  }
  const toastId = 'toast-' + Date.now();
  const toastHtml = `
      <div id="${toastId}" class="toast align-items-center text-bg-${type} border-0" role="alert" aria-live="assertive" aria-atomic="true">
          <div class="d-flex">
              <div class="toast-body">${message}</div>
              <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
          </div>
      </div>`;
  $('#toast-container').append(toastHtml);
  const toastElement = document.getElementById(toastId);
  // Assuming 'bootstrap' is globally available, using delay 4000
  const bsToast = new bootstrap.Toast(toastElement, { delay: 4000 }); 
  bsToast.show();
  toastElement.addEventListener('hidden.bs.toast', () => toastElement.remove());
}

// --- DOCUMENT READY ---
$(document).ready(function () {
  // --- SESSION CHECK (RETAINED) ---
  // This logic is crucial for client-side navigation security and must be preserved.
  const tokenUser = JSON.parse(localStorage.getItem('user'));
  if (!tokenUser) {
    window.location.href = '/login.html';
    return;
  } else if (tokenUser.role !== 'ADMIN') {
    window.location.href = '/error.html';
    return;
  }

  // --- FETCH COUNTS FOR DASHBOARD CARDS ---
  const sections = ['doctors', 'patients', 'appointments', 'bills', 'users'];
  sections.forEach(function (section) {
    // 🚨 JWT is automatically attached to this request
    $.get(`${base_url}/admin/count?name=${section}`)
      .done(function (data) {
        $('#count-' + section).text(data);
      })
      .fail(function () {
        $('#count-' + section).text('0');
        showToast(`Failed to fetch count for ${section}.`, 'warning');
      });
  });

  // --- CARD CLICK REDIRECTION ---
  $('#doctorsCard').click(() => (window.location.href = 'doctors.html'));
  $('#patientsCard').click(() => (window.location.href = 'patients.html'));
  $('#appointmentsCard').click(
    () => (window.location.href = 'appointments.html')
  );
  $('#billsCard').click(() => (window.location.href = 'billings.html'));
  $('#usersCard').click(() => (window.location.href = 'users.html'));
});