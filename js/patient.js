


const loadPatientPageLogic = (patientData) => {
  // patientId is derived from the successfully loaded data
  let patientId = patientData.patientId;
  const data = patientData; // Alias for clarity

  // ================================================================
  // 1. PROFILE SECTION: render read-only view and prefill form
  // ================================================================

  /** Renders the read-only profile view with patient data. */
  const renderProfileInfo = (pData) => {
    if (!$('#patientInfo').length) return;
    
    const infoHtml = $('<div>')
      .append($('<p>').append('<b>Name: </b>').append($('<span>').text(pData.name || '-')))
      .append($('<p>').append('<b>DOB: </b>').append($('<span>').text(pData.dob || '-')))
      .append($('<p>').append('<b>Gender: </b>').append($('<span>').text(pData.gender || '-')))
      .append($('<p>').append('<b>Contact: </b>').append($('<span>').text(pData.contactNumber || '-')))
      .append($('<p>').append('<b>Address: </b>').append($('<span>').text(pData.address || '-')))
      .append($('<p>').append('<b>Medical History: </b>').append($('<span>').text(pData.medicalHistory || '-')));
    $('#patientInfo').empty().append(infoHtml);
  };
  
  /** Prefills the profile edit form fields with patient data. */
  const prefillEditForm = (pData) => {
    if (!$('#name').length) return;

    $('#name').val(pData.name || '');
    $('#dob').val(pData.dob || '');
    $('#gender').val(pData.gender || '');
    $('#contactNumber').val(pData.contactNumber || '');
    $('#address').val(pData.address || '');
    $('#medicalHistory').val(pData.medicalHistory || '');
  };

  renderProfileInfo(data);
  prefillEditForm(data);

  // ================================================================
  // 2. PENDING PAYMENTS: functions to ensure tbody and load bills
  // ================================================================

  /** Returns or creates a <tbody> element for a table. */
  const getTBody = (tableId) => {
    const $table = $(`#${tableId}`);
    let $tbody = $table.find('tbody');
    if ($tbody.length === 0) {
      $tbody = $('<tbody>');
      $table.append($tbody);
    }
    return $tbody;
  };

  /** Fetches bills and renders rows for bills with paymentStatus === 'PENDING'. */
  const loadPendingPayments = () => {
    const pendingBody = getTBody('pendingPaymentsTable');
    if (!pendingBody.length) return;

    // JWT is automatically attached via global prefilter
    $.get(`${base_url}/bills/patient/${patientId}`)
      .done(function (list) {
        pendingBody.empty();
        const colspan = 4;

        if (!Array.isArray(list) || list.length === 0) {
          pendingBody.append(
            `<tr><td colspan="${colspan}" class="text-muted text-center p-4">No pending payments!</td></tr>`
          );
          return;
        }

        list.forEach(function (bill) {
          if (bill.paymentStatus !== 'PENDING') return;
          const row = $('<tr>').addClass('table-danger');

          row.append($('<td>').addClass('text-nowrap').text(bill.billDate || '-'));
          row.append($('<td>').text(bill.description || 'Medical Service Fee'));
          row.append($('<td>').addClass('text-right font-weight-bold').text(`Rs. ${(bill.billAmount || 0).toFixed(2)}`));

          const actionCell = $('<td>').addClass('text-center');
          actionCell.append(
            $('<a>').addClass('btn btn-sm btn-warning')
              .attr('href', `billing.html?billId=${bill.billId}`)
              .html('<i class="fas fa-credit-card mr-1"></i> Pay Now')
          );
          row.append(actionCell);
          pendingBody.append(row);
        });
      })
      .fail(function () {
        pendingBody
          .empty()
          .append(
            '<tr><td colspan="4" class="text-danger text-center p-4">Failed to load payments.</td></tr>'
          );
        showToast('Failed to load pending payments', 'error');
      });
  };

  loadPendingPayments();

  // ================================================================
  // 3. DOM-ready logic: Module init and profile update handling.
  // ================================================================

  $(document).ready(function () {
    // 🚨 REDUNDANT SESSION/ROLE CHECKS REMOVED
    // The global script ensures valid authentication and PATIENT role before calling loadPatientPageLogic.
    
    // Attempt to initialize appointments logic if the separate module is present.
    try {
      if (typeof initAppointments === 'function') initAppointments(patientId);
    } catch (e) {
      /* no-op if module not loaded */
    }

    // 🚨 REDUNDANT PROFILE FETCH REMOVED
    // Profile data is already passed in patientData. The complex synchronous/asynchronous 
    // fetching logic has been removed for efficiency.

    // ================================================================
    // Edit Profile Form Submission: collects form data, sends PUT, updates UI
    // ================================================================

    $(document)
      .off('submit', '#editProfileForm')
      .on('submit', '#editProfileForm', function (e) {
        e.preventDefault();

        const payload = {
          name: $('#name').val(),
          dob: $('#dob').val(),
          gender: $('#gender').val(),
          contactNumber: $('#contactNumber').val(),
          address: $('#address').val(),
          medicalHistory: $('#medicalHistory').val(),
        };

        // JWT is automatically attached via global prefilter
        $.ajax({
          url: `${base_url}/patients/me`,
          method: 'PUT',
          contentType: 'application/json',
          data: JSON.stringify(payload),
        })
          .done(function (resp) {
            showToast('Profile updated successfully!', 'success');

            // Update global state and re-render read-only view with the new data
            const updatedData = resp || { ...data, ...payload };
            window._patientEntity = updatedData;
            if (updatedData.patientId) patientId = updatedData.patientId;
            
            renderProfileInfo(updatedData);

            // Redirect after successful update
            setTimeout(() => {
              window.location = '/patient/dashboard.html';
            }, 1200);
          })
          .fail(function () {
            showToast('Failed to update profile.', 'error');
          });
      });
  });
};

// ================================================================
// UTILITY FUNCTIONS
// ================================================================

/**
 * Shows a Bootstrap-style toast notification.
 */
function showToast(message, type = 'info') {
  let container = document.getElementById('toastContainer');

  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container position-fixed top-0 end-0 p-3';
    document.body.appendChild(container);
  }

  const bgClass =
    {
      success: 'bg-success text-white',
      error: 'bg-danger text-white',
      info: 'bg-info text-white',
      warning: 'bg-warning text-dark',
    }[type] || 'bg-secondary text-white';

  const toast = document.createElement('div');
  toast.className = `toast align-items-center ${bgClass}`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');
  toast.setAttribute('aria-atomic', 'true');
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${message}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  `;

  container.appendChild(toast);
  // NOTE: Assuming Bootstrap 5+ is available for the 'bootstrap.Toast' constructor.
  const bsToast = new bootstrap.Toast(toast, { delay: 3500 });
  bsToast.show();

  toast.addEventListener('hidden.bs.toast', () => toast.remove());
}