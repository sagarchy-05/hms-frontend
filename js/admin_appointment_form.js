var base_url = process.env.base_url || 'http://localhost:8080/api';

// --- GLOBAL STATE (No change needed) ---
let selectedPatientId = null;
let selectedDoctorId = null;
let selectedTimeSlot = null;
let myCalendar = null;

let currentDoctorResults = [];
let currentPatientResults = [];
let doctorAvailabilityDays = [];

const dayOfWeekMap = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};

// --- UTILITY FUNCTIONS (No change needed) ---
function showMessage(message, type = 'danger') {
  const box = $('#messageBox');
  box.empty();
  box.html(`
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                <span aria-hidden="true">&times;</span>
            </button>
        </div>
    `);
}

const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
};

// --- FETCH TIME SLOTS ---
const fetchTimeSlots = (doctorId, date, preselectSlot = null) => {
  selectedTimeSlot = null;
  $('#timeSlotSelection')
    .empty()
    .append(
      '<p class="text-muted m-auto" id="slotMessage">Loading slots...</p>'
    );
  $('#timeSlot').val('');

  if (!doctorId || !date) return;

  // 🚨 JWT is automatically attached to this request
  $.get(`${base_url}/appointments/slots/${doctorId}`, { date })
    .done((slots) => {
      $('#timeSlotSelection').empty();
      if (slots.length === 0) {
        $('#timeSlotSelection').append(
          '<p class="text-danger m-auto">No free slots available.</p>'
        );
        return;
      }
      slots.forEach((slot) => {
        const slotCard = $(`
                        <div class="time-slot-card col-auto" data-slot="${slot}">
                            ${slot}
                        </div>
                    `);
        if (preselectSlot === slot) {
          slotCard.addClass('selected');
          selectedTimeSlot = slot;
          $('#timeSlot').val(slot);
        }
        $('#timeSlotSelection').append(slotCard);
      });

      // Time slot click handler
      $('.time-slot-card').on('click', function () {
        $('.time-slot-card').removeClass('selected');
        $(this).addClass('selected');
        selectedTimeSlot = $(this).data('slot');
        $('#timeSlot').val(selectedTimeSlot);
      });
    })
    .fail((xhr) => {
      console.error('Time Slots API failed:', xhr);
      $('#timeSlotSelection')
        .empty()
        .append('<p class="text-danger m-auto">Failed to load slots.</p>');
      let errorMsg =
        xhr.responseJSON?.message || 'Check if backend API is running.';
      showMessage(errorMsg);
    });
};

// --- RENDER CARDS (No change needed) ---
const renderCards = (data, containerSelector, type) => {
  const isPatient = type === 'patient';
  const idKey = isPatient ? 'patientId' : 'doctorId';
  const icon = isPatient ? 'fas fa-user' : 'fas fa-user-md';

  $(containerSelector).empty();
  if (!data.length) {
    $(containerSelector).html(
      '<p class="col-12 text-muted p-3">No results found.</p>'
    );
    return;
  }

  data.forEach((item) => {
    const id = item[idKey];
    const name = item.name;
    const isSelected =
      (isPatient && selectedPatientId == id) ||
      (!isPatient && selectedDoctorId == id);

    let detailHtml = '';
    if (isPatient) {
      detailHtml = `<small class="text-muted d-block">${
        item.email || 'No Email'
      }</small>`;
      detailHtml += `<small class="text-secondary d-block">Contact: ${
        item.contactNumber || 'N/A'
      }</small>`;
    } else {
      detailHtml = `<small class="text-muted d-block">${
        item.specialization || 'General'
      }</small>`;
      detailHtml += `<small class="text-secondary d-block font-weight-bold">Fee: Rs. ${(
        item.consultationFee || 0
      ).toFixed(2)}</small>`;
    }

    const card = $(`
                <div class="col-lg-3 col-md-4 col-sm-6 mb-3">
                    <div class="selection-card ${
                      isSelected ? 'selected' : ''
                    }" data-id="${id}">
                        <i class="${icon} mb-2" style="font-size:1.5rem;color:var(--primary-color);"></i>
                        <h6 class="mb-1">${name}</h6>
                        ${detailHtml}
                    </div>
                </div>
            `);

    card.find('.selection-card').on('click', function () {
      $(`${containerSelector} .selection-card`).removeClass('selected');
      $(this).addClass('selected');

      if (isPatient) {
        selectedPatientId = id;
        $('#patientId').val(id);
      } else {
        selectedDoctorId = id;
        $('#doctorId').val(id);

        // Map doctor availability to day indices
        const selectedDoctor = currentDoctorResults.find(
          (d) => d.doctorId == id
        );
        doctorAvailabilityDays =
          selectedDoctor?.availabilities
            ?.map((a) => dayOfWeekMap[a.dayOfWeek])
            .filter((d) => d !== undefined) || [];

        initializeFlatpickr(true);
        $('#appointmentDate').prop('disabled', false).val('');
        $('#timeSlotSelection')
          .empty()
          .append(
            '<p class="text-muted m-auto" id="slotMessage">Select a Date.</p>'
          );
        selectedTimeSlot = null;
      }
    });

    $(containerSelector).append(card);
  });
};

// --- SEARCH (DEBOUNCE) ---
const searchPatients = debounce((query) => {
  if (query.length < 2) {
    $('#patientSelectionArea').html(
      '<p class="col-12 text-muted p-3">Start typing to see patient results.</p>'
    );
    return;
  }
  // 🚨 JWT is automatically attached to this request
  $.get(`${base_url}/patients`, { keyword: query }).done((patients) => {
    currentPatientResults = patients;
    renderCards(patients, '#patientSelectionArea', 'patient');
  });
}, 300);

const searchDoctors = debounce((query) => {
  if (query.length < 2) {
    $('#doctorSelectionArea').html(
      '<p class="col-12 text-muted p-3">Start typing to see doctor results.</p>'
    );
    return;
  }
  // 🚨 JWT is automatically attached to this request
  $.get(`${base_url}/doctors`, { keyword: query }).done((doctors) => {
    currentDoctorResults = doctors;
    renderCards(doctors, '#doctorSelectionArea', 'doctor');
  });
}, 300);

// --- FLATPICKR CALENDAR (No change needed) ---
const initializeFlatpickr = (forceReInit = false) => {
  const appointmentDateInput = document.getElementById('appointmentDate');
  if (myCalendar && !forceReInit) return;
  if (myCalendar) myCalendar.destroy();

  const disableUnavailableDays = (date) => {
    if (!selectedDoctorId) return false;
    return !doctorAvailabilityDays.includes(date.getDay());
  };

  myCalendar = flatpickr(appointmentDateInput, {
    dateFormat: 'Y-m-d',
    minDate: 'today',
    disable: [disableUnavailableDays],
    onChange: (selectedDates, dateStr) => {
      if (dateStr && selectedDoctorId) {
        selectedTimeSlot = null;
        $('#timeSlot').val('');
        fetchTimeSlots(selectedDoctorId, dateStr);
      }
    },
  });

  if (!selectedDoctorId) {
    $('#appointmentDate').prop('disabled', true);
  }
};

// --- EDIT MODE ---
const handleEditPrefill = () => {
  const params = new URLSearchParams(window.location.search);
  const editId = params.get('editId');
  if (!editId) return;

  $('#headerText').text(`Edit Appointment (ID: ${editId})`);
  $('#submitButton')
    .text('Update Appointment')
    .removeClass('btn-custom')
    .addClass('btn-primary');

  // 🚨 JWT is automatically attached to this request
  $.get(`${base_url}/admin/appointments/${editId}`)
    .done((a) => {
      $('#appointmentId').val(a.appointmentId);
      selectedPatientId = a.patientId;
      selectedDoctorId = a.doctorId;

      $('#patientSearch').val(a.patientName);
      searchPatients(a.patientName);
      $('#doctorSearch').val(a.doctorName);
      searchDoctors(a.doctorName);

      setTimeout(() => {
        const prefilledDoctor = currentDoctorResults.find(
          (d) => d.doctorId == a.doctorId
        );
        doctorAvailabilityDays =
          prefilledDoctor?.availabilities
            ?.map((av) => dayOfWeekMap[av.dayOfWeek])
            .filter((d) => d !== undefined) || [];

        initializeFlatpickr(true);

        // Manually trigger click to set global state variables and card selection
        $(
          `#patientSelectionArea .selection-card[data-id="${a.patientId}"]`
        ).trigger('click');
        $(
          `#doctorSelectionArea .selection-card[data-id="${a.doctorId}"]`
        ).trigger('click');

        $('#appointmentReason').val(a.reason);
        myCalendar.setDate(a.appointmentDate, true);
        fetchTimeSlots(a.doctorId, a.appointmentDate, a.timeSlot);
      }, 500);
    })
    .fail((xhr) => {
      showMessage(
        xhr.responseJSON?.message || 'Failed to load appointment details.',
        'danger'
      );
      setTimeout(
        () => (window.location.href = '/admin/appointments.html'),
        3000
      );
    });
};

// --- DOCUMENT READY ---
$(document).ready(function () {
  const tokenUser = JSON.parse(localStorage.getItem('user'));
  // --- SESSION CHECK (Client-side JWT check) ---
  if (!tokenUser) window.location.href = '/login.html';
  if (tokenUser.role !== 'ADMIN') window.location.href = '/error.html';

  initializeFlatpickr(false);
  handleEditPrefill();

  $('#patientSearch').on('input', function () {
    searchPatients($(this).val());
  });
  $('#doctorSearch').on('input', function () {
    searchDoctors($(this).val());
  });

  $('#appointmentForm').submit(function (e) {
    e.preventDefault();
    if (!selectedPatientId || !selectedDoctorId || !selectedTimeSlot) {
      showMessage(
        'Please select a patient, a doctor, and an available time slot.',
        'warning'
      );
      return;
    }

    const appointment = {
      patientId: selectedPatientId,
      doctorId: selectedDoctorId,
      appointmentDate: $('#appointmentDate').val(),
      timeSlot: selectedTimeSlot,
      reason: $('#appointmentReason').val(),
    };

    const editId = $('#appointmentId').val();
    const apiURL = editId
      ? `${base_url}/appointments/${editId}/reschedule`
      : `${base_url}/appointments`;
    const method = editId ? 'PUT' : 'POST';

    // 🚨 JWT is automatically attached to this request
    $.ajax({
      url: apiURL,
      method: method,
      contentType: 'application/json',
      data: JSON.stringify(appointment),
    })
      .done(() => {
        showMessage(
          `Appointment ${
            editId ? 'updated' : 'booked'
          } successfully! Redirecting...`,
          'success'
        );
        setTimeout(
          () => (window.location.href = '/admin/appointments.html'),
          1500
        );
      })
      .fail((xhr) => {
        showMessage(
          xhr.responseJSON?.message ||
            `Failed to ${editId ? 'update' : 'book'} appointment.`,
          'danger'
        );
      });
  });
});