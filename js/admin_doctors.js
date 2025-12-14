

// Global variables for delete modal
let doctorToDeleteId = null;
let doctorToDeleteName = null;

// --- TOAST UTILITY (No change needed) ---
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

// --- DELETE DOCTOR ---
function deleteDoctor() {
  if (!doctorToDeleteId) return;

  // 🚨 JWT is automatically attached to this request
  $.ajax({
    url: `${base_url}/admin/doctors/${doctorToDeleteId}`,
    method: 'DELETE',
  })
    .done(() => {
      showToast(
        `Doctor ${doctorToDeleteName} (ID: ${doctorToDeleteId}) deleted successfully.`,
        'success'
      );
      $('#deleteConfirmationModal').modal('hide');
      loadDoctors();
    })
    .fail((xhr) => {
      let errorMsg = 'Failed to delete doctor.';
      if (xhr.status === 404) errorMsg = 'Doctor not found.';
      else if (xhr.responseJSON?.message) errorMsg = xhr.responseJSON.message;
      showToast(errorMsg, 'danger');
      $('#deleteConfirmationModal').modal('hide');
    });
}

// --- LOAD DOCTORS ---
function loadDoctors() {
  // 🚨 JWT is automatically attached to this request
  $.get(`${base_url}/admin/doctors`)
    .done((data) => {
      if (!data || data.length === 0) {
        $('#doctorsTableBody').html(
          `<tr><td colspan="7" class="text-muted p-4">No doctors found.</td></tr>`
        );
        return;
      }

      const rows = data
        .map(
          (d) => `
                <tr>
                    <td>${d.doctorId}</td>
                    <td>${d.name}</td>
                    <td>${d.specialization}</td>
                    <td>${d.contactNumber}</td>
                    <td>Rs. ${d.consultationFee.toFixed(2)}</td>
                    <td>
                        <button class="btn btn-sm btn-custom editDoctorBtn" data-id="${
                          d.doctorId
                        }">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-sm btn-danger deleteDoctorBtn" data-id="${
                          d.doctorId
                        }" data-name="${d.name}">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </td>
                </tr>
            `
        )
        .join('');

      $('#doctorsTableBody').html(rows);
    })
    .fail(() => {
      $('#doctorsTableBody').html(
        `<tr><td colspan="7" class="text-danger p-4">Failed to load doctors.</td></tr>`
      );
    });
}

// --- GENERATE AVAILABILITY UI (No change needed) ---
function generateAvailabilityUI(container, availabilities) {
  const days = [
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
    'SUNDAY',
  ];
  const availabilityMap = {};
  availabilities.forEach((a) => {
    if (!availabilityMap[a.dayOfWeek]) {
      availabilityMap[a.dayOfWeek] = {
        startTime: a.startTime,
        endTime: a.endTime,
      };
    }
  });

  const html = days
    .map((day) => {
      const av = availabilityMap[day];
      const checked = av ? 'checked' : '';
      const start = av ? av.startTime.substring(0, 5) : '';
      const end = av ? av.endTime.substring(0, 5) : '';

      return `
        <div class="form-row align-items-center mb-3 p-2 border rounded bg-light">
            <div class="col-md-3">
                <div class="form-check">
                    <input type="checkbox" class="form-check-input day-check" id="edit-${day}" data-day="${day}" ${checked}>
                    <label class="form-check-label font-weight-bold" for="edit-${day}">${day}</label>
                </div>
            </div>
            <div class="col-md-4">
                <input type="time" class="form-control start-time" placeholder="Start Time" data-day="${day}" value="${start}" ${
          checked ? '' : 'disabled'
        } required>
            </div>
            <div class="col-md-4">
                <input type="time" class="form-control end-time" placeholder="End Time" data-day="${day}" value="${end}" ${
          checked ? '' : 'disabled'
        } required>
            </div>
        </div>`;
    })
    .join('');

  $(container).html(html);
}

// --- DOCUMENT READY ---
$(document).ready(function () {
  // --- SESSION CHECK (Client-side JWT check) ---
  const tokenUser = JSON.parse(localStorage.getItem('user'));
  if (!tokenUser) {
    window.location.href = '/login.html';
    return;
  } else if (tokenUser.role !== 'ADMIN') {
    window.location.href = '/error.html';
    return;
  }

  // Initial load
  loadDoctors();

  // Redirect to add doctor page
  $('#addDoctorBtn').click(
    () => (window.location.href = '/admin/doctor_form.html')
  );

  // Delete doctor button
  $(document).on('click', '.deleteDoctorBtn', function () {
    doctorToDeleteId = $(this).data('id');
    doctorToDeleteName = $(this).data('name');

    $('#deleteModalBodyText').html(
      `You are about to permanently delete <strong>${doctorToDeleteName}</strong> (ID: ${doctorToDeleteId}). This action cannot be undone.`
    );
    $('#deleteConfirmationModal').modal('show');
  });

  // Confirm delete
  $('#confirmDeleteBtn').on('click', deleteDoctor);

  // Edit doctor button
  $(document).on('click', '.editDoctorBtn', function () {
    const id = $(this).data('id');

    // 🚨 JWT is automatically attached to this request
    $.get(`${base_url}/admin/doctors/${id}`)
      .done((doc) => {
        $('#editDoctorId').val(doc.doctorId);
        $('#editDoctorName').val(doc.name);
        $('#editDoctorSpecialization').val(doc.specialization);
        $('#editDoctorContact').val(doc.contactNumber);
        $('#editDoctorFee').val(doc.consultationFee);
        generateAvailabilityUI(
          '#editAvailabilityContainer',
          doc.availabilities || []
        );
        $('#editDoctorModal').modal('show');
      })
      .fail(() =>
        showToast('Failed to load doctor details for editing.', 'danger')
      );
  });

  // Toggle time inputs when day checkbox changes (No change needed)
  $(document).on('change', '.day-check', function () {
    const row = $(this).closest('.form-row');
    const isChecked = $(this).is(':checked');
    const timeInputs = row.find('.start-time, .end-time');
    timeInputs.prop('disabled', !isChecked);
    if (!isChecked) timeInputs.val('');
  });

  // Save edited doctor
  $('#editDoctorForm').submit(function (e) {
    e.preventDefault();

    const feeValue = $('#editDoctorFee').val();
    if (!feeValue) {
      showToast('Consultation Fee is required.', 'danger');
      return;
    }
    const parsedFee = parseFloat(feeValue);
    if (isNaN(parsedFee) || parsedFee < 0) {
      showToast(
        'Consultation Fee must be a valid non-negative number.',
        'danger'
      );
      return;
    }

    const doctorAvailabilities = [];
    let validationFailed = false;

    $('#editAvailabilityContainer .day-check:checked').each(function () {
      const day = $(this).data('day');
      const row = $(this).closest('.form-row');
      const start = row.find('.start-time').val();
      const end = row.find('.end-time').val();
      if (start && end) {
        doctorAvailabilities.push({
          dayOfWeek: day,
          startTime: start,
          endTime: end,
        });
      } else {
        showToast(
          `Please provide both start and end times for ${day}.`,
          'danger'
        );
        validationFailed = true;
        return false;
      }
    });

    if (validationFailed) return;

    const id = $('#editDoctorId').val();
    const updatedDoctor = {
      name: $('#editDoctorName').val(),
      specialization: $('#editDoctorSpecialization').val(),
      contactNumber: $('#editDoctorContact').val(),
      consultationFee: parsedFee,
      doctorAvailabilities: doctorAvailabilities,
    };

    // 🚨 JWT is automatically attached to this request
    $.ajax({
      url: `${base_url}/admin/doctors/${id}`,
      method: 'PUT',
      contentType: 'application/json',
      data: JSON.stringify(updatedDoctor),
    })
      .done(() => {
        showToast('Doctor updated successfully!', 'success');
        $('#editDoctorModal').modal('hide');
        loadDoctors();
      })
      .fail((xhr) => {
        let errorMsg = 'Failed to update doctor.';
        if (xhr.responseJSON) {
          if (xhr.responseJSON.message) errorMsg = xhr.responseJSON.message;
          else if (
            xhr.responseJSON.error === 'Bad Request' &&
            xhr.responseJSON.details
          ) {
            errorMsg =
              'Validation Error: ' + xhr.responseJSON.details.join(', ');
          }
        }
        showToast(errorMsg, 'danger');
        console.error('Update failed:', xhr.responseText);
      });
  });
});