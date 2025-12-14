var base_url = process.env.base_url || 'http://localhost:8080/api';

// Days of the week
const daysOfWeek = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];
let dayIndex = 0;

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

// --- CREATE AVAILABILITY ROW (No change needed) ---
function createAvailabilityRow(index) {
  return `
    <div class="availability-row" data-day-index="${index}">
        <div class="form-row align-items-center mb-2">
            <div class="col-md-3">
                <label class="font-weight-bold">Day</label>
                <select class="form-control day-select" data-day-index="${index}" required>
                    <option value="">Select Day</option>
                    ${daysOfWeek
                      .map((day) => `<option value="${day}">${day}</option>`)
                      .join('')}
                </select>
            </div>
            <div class="col-md-8">
                <label class="font-weight-bold">Timing (From - To)</label>
                <div class="form-row">
                    <div class="col-6">
                        <input type="time" class="form-control time-start" data-day-index="${index}" required />
                    </div>
                    <div class="col-6">
                        <input type="time" class="form-control time-end" data-day-index="${index}" required />
                    </div>
                </div>
            </div>
            <div class="col-md-1 text-right">
                <button type="button" class="btn btn-danger btn-sm mt-3 remove-day-btn" title="Remove Day">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    </div>`;
}

function addDay() {
  $('#availability-slots').append(createAvailabilityRow(dayIndex));
  dayIndex++;
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

  // --- INITIALIZE UI ---
  addDay();

  // Add Day Button
  $('#addDayBtn').on('click', addDay);

  // Remove Day Button (delegated)
  $('#availabilityContainer').on('click', '.remove-day-btn', function () {
    if ($('#availability-slots').children().length > 1) {
      $(this).closest('.availability-row').remove();
    } else {
      const $row = $(this).closest('.availability-row');
      $row.find('.day-select').val('');
      $row.find('.time-start').val('');
      $row.find('.time-end').val('');
      showToast(
        "Last availability entry cleared. Click 'Add Availability Day' to add another.",
        'warning'
      );
    }
  });

  // --- FORM SUBMISSION ---
  $('#addDoctorForm').submit(function (e) {
    e.preventDefault();

    const doctorAvailabilities = [];

    $('#availability-slots > .availability-row').each(function () {
      const $row = $(this);
      const day = $row.find('.day-select').val();
      const startTime = $row.find('.time-start').val();
      const endTime = $row.find('.time-end').val();

      if (day && startTime && endTime) {
        doctorAvailabilities.push({
          dayOfWeek: day,
          startTime: startTime,
          endTime: endTime,
        });
      }
    });

    const data = {
      email: $('#doctorEmail').val(),
      password: $('#doctorPassword').val(),
      name: $('#doctorName').val(),
      specialization: $('#doctorSpecialization').val(),
      contactNumber: $('#doctorContact').val(),
      consultationFee: parseFloat($('#doctorFee').val()),
      doctorAvailabilities: doctorAvailabilities,
    };

    // 🚨 JWT is automatically attached to this request
    $.ajax({
      url: `${base_url}/admin/doctors/register`,
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(data),
      success: function () {
        showToast('Doctor registered successfully.', 'success');
        window.location.href = 'doctors.html';
      },
      error: function (xhr) {
        let errorMsg = 'Failed to register doctor. Please check inputs.';
        if (xhr.responseJSON?.message) errorMsg = xhr.responseJSON.message;
        else if (xhr.status === 409)
          errorMsg = 'Failed: A user with this email already exists.';
        else if (xhr.status === 400)
          errorMsg =
            'Failed: Invalid data provided. Check required fields and formats.';
        showToast(errorMsg, 'danger');
        console.error('Registration failed:', xhr.responseText);
      },
    });
  });
});