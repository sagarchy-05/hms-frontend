var base_url = process.env.base_url || 'http://localhost:8080/api';

// Global variables to hold patient info for delete modal
let patientToDeleteId = null;
let patientToDeleteName = null;

// --- UTILITY FUNCTIONS ---

/**
 * Shows a toast notification instead of default alerts
 * @param {string} message - Message to display
 * @param {string} type - Bootstrap color type ('success', 'danger', etc.)
 */
function showToast(message, type = 'danger') {
  const container = $('#toast-container');
  if (!container.length) {
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
  const bsToast = new bootstrap.Toast(toastElement, { delay: 4000 });
  bsToast.show();

  toastElement.addEventListener('hidden.bs.toast', () => toastElement.remove());
}

// --- LOAD PATIENTS ---
function loadPatients() {
  // 🚨 JWT is automatically attached to this request
  $.get(`${base_url}/admin/patients`)
    .done((patients) => {
      if (!patients || patients.length === 0) {
        $('#patientsTableBody').html(
          `<tr><td colspan="7" class="p-4 text-muted">No patients found.</td></tr>`
        );
        return;
      }

      const rows = patients
        .map(
          (p) => `
                <tr>
                    <td>${p.patientId}</td>
                    <td>${p.name}</td>
                    <td>${p.dob}</td>
                    <td>${p.gender}</td>
                    <td>${p.contactNumber}</td>
                    <td>${p.address}</td>
                    <td>
                        <button class="btn btn-sm btn-custom editPatientBtn" data-id="${p.patientId}">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-sm btn-danger deletePatientBtn" data-id="${p.patientId}" data-name="${p.name}">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </td>
                </tr>`
        )
        .join('');

      $('#patientsTableBody').html(rows);
    })
    .fail(() => {
      $('#patientsTableBody').html(
        `<tr><td colspan="7" class="p-4 text-danger">Failed to load patients.</td></tr>`
      );
    });
}

// --- DELETE PATIENT ---
function deletePatient() {
  if (!patientToDeleteId) return;

  // 🚨 JWT is automatically attached to this request
  $.ajax({
    url: `${base_url}/admin/patients/${patientToDeleteId}`,
    method: 'DELETE',
  })
    .done(() => {
      showToast(
        `Patient ${patientToDeleteName} (ID: ${patientToDeleteId}) deleted successfully.`,
        'success'
      );
      $('#deleteConfirmationModal').modal('hide');
      loadPatients();
    })
    .fail((xhr) => {
      let errorMsg = 'Failed to delete patient.';
      if (xhr.status === 404) errorMsg = 'Patient not found.';
      else if (xhr.responseJSON?.message) errorMsg = xhr.responseJSON.message;
      showToast(errorMsg, 'danger');
      $('#deleteConfirmationModal').modal('hide');
    });
}

// --- INITIALIZATION ---
$(document).ready(function () {
  // Session validation (Client-side JWT check)
  const tokenUser = JSON.parse(localStorage.getItem('user'));
  if (!tokenUser) {
    window.location.href = '/login.html';
    return;
  } else if (tokenUser.role !== 'ADMIN') {
    window.location.href = '/error.html';
    return;
  }

  // Restrict DOB to today or earlier
  const today = new Date();
  const maxDate = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  $('#patientDob').attr('max', maxDate);

  // Load patients after session verification
  // 🚨 This call is redundant if the tokenUser check above is reliable, but it uses an endpoint 
  // that will rely on JWT (via prefilter) and re-check role on the server, ensuring security.
  $.get(`${base_url}/users/me`)
    .done((user) => {
      // Re-verify role after server roundtrip
      if (user.role !== 'ADMIN') {
        window.location.href = '/login.html';
        return;
      }
      loadPatients();
    })
    .fail(() => (window.location.href = '/login.html'));

  // --- EVENT HANDLERS ---

  // Add Patient modal
  $('#addPatientBtn').click(() => {
    $('#patientModalLabel').text('Add Patient');
    $('#patientForm')[0].reset();
    $('#patientId').val('');
    $('#patientEmail').prop('required', true).prop('disabled', false);
    $('#patientPassword').prop('required', true).prop('disabled', false);
    $('#emailPassFields').show();
    $('#patientModal').modal('show');
  });

  // Delete Patient button
  $(document).on('click', '.deletePatientBtn', function () {
    patientToDeleteId = $(this).data('id');
    patientToDeleteName = $(this).data('name');
    $('#deleteModalBodyText').html(
      `Patient Name: <strong>${patientToDeleteName}</strong> (ID: ${patientToDeleteId})`
    );
    $('#deleteConfirmationModal').modal('show');
  });

  // Confirm delete
  $('#confirmDeleteBtn').on('click', deletePatient);

  // Edit Patient button
  $(document).on('click', '.editPatientBtn', function () {
    const id = $(this).data('id');
    // 🚨 JWT is automatically attached to this request
    $.get(`${base_url}/admin/patients/${id}`)
      .done((p) => {
        $('#patientModalLabel').text('Edit Patient');
        $('#patientId').val(p.patientId);
        $('#patientName').val(p.name);
        $('#patientDob').val(p.dob);
        $('#patientGender').val(p.gender);
        $('#patientContact').val(p.contactNumber);
        $('#patientAddress').val(p.address);
        $('#patientHistory').val(p.medicalHistory);
        $('#emailPassFields').hide();
        $('#patientEmail').prop('required', false).prop('disabled', true);
        $('#patientPassword').prop('required', false).prop('disabled', true);
        $('#patientModal').modal('show');
      })
      .fail(() =>
        showToast('Failed to load patient details for editing.', 'danger')
      );
  });

  // Submit form (Add or Edit)
  $('#patientForm').submit(function (e) {
    e.preventDefault();
    const id = $('#patientId').val();
    const isEdit = !!id;

    const patient = {
      name: $('#patientName').val(),
      dob: $('#patientDob').val(),
      gender: $('#patientGender').val(),
      contactNumber: $('#patientContact').val(),
      address: $('#patientAddress').val(),
      medicalHistory: $('#patientHistory').val(),
    };

    if (!isEdit) {
      patient.email = $('#patientEmail').val();
      patient.password = $('#patientPassword').val();
    }

    if (isEdit) {
      // Edit (PUT) request
      // 🚨 JWT is automatically attached to this request
      $.ajax({
        url: `${base_url}/admin/patients/${id}`,
        method: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify(patient),
      })
        .done(() => {
          showToast('Patient updated successfully!', 'success');
          $('#patientModal').modal('hide');
          loadPatients();
        })
        .fail((xhr) => {
          let errorMsg =
            xhr.responseJSON?.message || 'Failed to update patient.';
          showToast(errorMsg, 'danger');
        });
    } else {
      // Add (POST) request
      // 🚨 JWT is automatically attached to this request
      $.ajax({
        url: `${base_url}/admin/patients/register`,
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(patient),
      })
        .done(() => {
          showToast('Patient added successfully!', 'success');
          $('#patientModal').modal('hide');
          loadPatients();
        })
        .fail((xhr) => {
          let errorMsg = 'Failed to add patient.';
          if (xhr.status === 409)
            errorMsg = 'A user with this email already exists.';
          else if (xhr.status === 400)
            errorMsg = 'Please check all required fields.';
          else if (xhr.responseJSON?.message)
            errorMsg = xhr.responseJSON.message;
          showToast(errorMsg, 'danger');
        });
    }
  });
});