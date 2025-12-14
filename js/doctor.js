var base_url = process.env.base_url || 'http://localhost:8080/api';

// --- Helper Functions for Formatting & Small DOM Helpers ---

/**
 * Formats ISO date/time string to a friendly 'MMM DD, YYYY' representation.
 */
function formatDate(dateString) {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch (e) {
    return (dateString && dateString.split && dateString.split('T')[0]) || '-';
  }
}

/**
 * Returns an HTML anchor linking to a patient details page.
 */
function createPatientLink(patientId, patientName) {
  return `<a href="patient_details.html?patientId=${patientId}" class="text-primary">${
    patientName || 'N/A'
  }</a>`;
}

// --- Core handler invoked when a doctor entity is ready ---

/**
 * Main processor function called by the global script after successful authentication.
 * @param {object} data - The doctor entity data fetched from /doctors/me.
 */
function processDoctorEntity(data) {
  if (!data) return;

  // Populate the doctor profile section when present.
  if ($('#doctorInfo').length) {
    $('#doctorInfo').html(
      '<b>Name:</b> ' +
        (data.name || '-') + // Ensure safe access
        '<br><b>Specialization:</b> ' +
        (data.specialization || '-') +
        '<br><b>Contact:</b> ' +
        (data.contactNumber || '-') +
        '<br><b>Fee:</b> ' +
        (data.consultationFee != null ? data.consultationFee : '-')
    );
  }

  // When appointment-related tables exist on the page, request and render the doctor's appointments.
  if (
    $('#appointmentsTable').length ||
    $('#upcomingAppointments').length ||
    $('#pastAppointments').length
  ) {
    try {
      // loadDoctorAppointments is defined later in the file.
      loadDoctorAppointments(data.doctorId);
    } catch (e) {
      console.error('Appointment loader unavailable', e);
    }
  }

  // When on patient_details.html and a patientId query param exists,
  // this fetch populates the #patientDetails block with the patient's profile.
  if ($('#patientDetails').length) {
    const params = new URLSearchParams(window.location.search);
    const pid = params.get('patientId');
    if (pid) {
      // 🚨 JWT is automatically attached to this request
      $.get(`${base_url}/patients/${pid}`)
        .done(function (patient) {
          $('#patientDetails').html(
            '<b>Name:</b> ' +
              (patient.name || '-') +
              '<br><b>DOB:</b> ' +
              (patient.dob || '-') +
              '<br><b>Gender:</b> ' +
              (patient.gender || '-') +
              '<br><b>Contact:</b> ' +
              (patient.contactNumber || '-') +
              '<br><b>Address:</b> ' +
              (patient.address || '-') +
              '<br><b>History:</b> ' +
              (patient.medicalHistory || '-')
          );
        })
        .fail(function (xhr) {
          console.error('Failed to load patient details', xhr);
          $('#patientDetails').html(
            '<div class="text-danger">Failed to load patient details</div>'
          );
        });
    }
  }
}

// Expose the processor for legacy scripts/global loader logic.
window.loadDoctorPageLogic = processDoctorEntity;

// --- Standalone Page Initialization (CLEANED UP) ---

// 🚨 REDUNDANT BLOCK REMOVED/SIMPLIFIED
// The global script (initAuthenticationAndLoadData) handles all authentication, role checking, 
// fetching of /doctors/me, and calling processDoctorEntity(). 
// This document.ready block is no longer necessary for bootstrap.

// ============================================================================
// APPOINTMENTS LOGIC (Unchanged, as it correctly uses the doctorId)
// ============================================================================

/**
 * Fetches appointments for a doctor and renders them into tables.
 */
function loadDoctorAppointments(doctorId) {
  // 🚨 JWT is automatically attached to this request
  $.get(`${base_url}/appointments/doctor/${doctorId}`)
    .done(function (list) {
      // Ensure modal exists before any action wiring.
      ensureUpdateModal();

      const upcomingTbl = $('#upcomingAppointments');
      const pastTbl = $('#pastAppointments');
      const mainTbl = $('#appointmentsTable');

      const upBody = upcomingTbl.find('tbody').empty();
      const pastBody = pastTbl.find('tbody').empty();
      const mainBody = mainTbl.find('tbody').empty();

      list.sort(
        (a, b) => new Date(a.appointmentDate) - new Date(b.appointmentDate)
      );

      list.forEach(function (a) {
        const isUpcomingStatus =
          a.status === 'CONFIRMED' || a.status === 'SCHEDULED';
        const isPastStatus =
          a.status === 'COMPLETED' || a.status === 'CANCELLED';

        const patientLink = createPatientLink(a.patientId, a.patientName);
        const dateCell = $('<td>').text(formatDate(a.appointmentDate));
        const timeCell = $('<td>').text(a.timeSlot || '-');
        const patientCell = $('<td>').html(patientLink);
        const reasonCell = $('<td>').text(a.reason || 'N/A');
        const statusCell = $('<td>').text(a.status || '-');

        // Render into the main dashboard table (smaller summary).
        if (isUpcomingStatus && mainTbl.length) {
          const row = $('<tr>');
          row.append(
            dateCell.clone(),
            timeCell.clone(),
            patientCell.clone(),
            reasonCell.clone(),
            statusCell.clone()
          );
          mainBody.append(row);
        }

        // Render into the upcoming appointments list with an action button.
        if (isUpcomingStatus && upcomingTbl.length) {
          const row = $('<tr>');
          row.append(
            dateCell.clone(),
            timeCell.clone(),
            patientCell.clone(),
            reasonCell.clone(),
            statusCell.clone()
          );

          const actionCell = $('<td>');
          const btn = $('<button>')
            .addClass('btn btn-sm btn-success update-appointment')
            .attr({
              'data-id': a.appointmentId,
              'data-remarks': a.remarks || '',
            })
            .text('Complete');
          actionCell.append(btn);
          row.append(actionCell);
          upBody.append(row);
        }

        // Render into the past appointments table (with remarks column).
        else if (isPastStatus && pastTbl.length) {
          const row = $('<tr>');
          row.append(
            dateCell.clone(),
            timeCell.clone(),
            patientCell.clone(),
            reasonCell.clone(),
            statusCell.clone()
          );
          row.append($('<td>').text(a.remarks || '—'));
          pastBody.append(row);
        }
      });

      const noDataRow = (cols) =>
        `<tr><td colspan="${cols}" class="text-center py-4 text-gray-400">No appointments.</td></tr>`;

      if (mainTbl.length && mainBody.is(':empty')) mainBody.html(noDataRow(5));
      if (upcomingTbl.length && upBody.is(':empty')) upBody.html(noDataRow(6));
      if (pastTbl.length && pastBody.is(':empty')) pastBody.html(noDataRow(6));

      // Event delegation for update buttons:
      $(document)
        .off('click', '.update-appointment')
        .on('click', '.update-appointment', function () {
          const id = $(this).data('id');
          const remarks = $(this).data('remarks') || '';

          $('#updateAppointmentModal').data('appointment-id', id);
          $('#updateStatus').val('COMPLETED').prop('disabled', true);
          $('#updateRemarks').val(remarks);
          $('#updateAppointmentModal').modal('show');
        });
    })
    .fail(function (xhr) {
      console.error('Failed to load appointments', xhr);
      const errMsg =
        '<tr><td colspan="6" class="text-danger text-center">ERROR: Failed to load data.</td></tr>';
      $(
        '#upcomingAppointments tbody, #pastAppointments tbody, #appointmentsTable tbody'
      ).html(errMsg);
    });
}

/**
 * Ensures the appointment "Complete" modal exists in the DOM and wires its save handler.
 */
function ensureUpdateModal() {
  if ($('#updateAppointmentModal').length) return;

  const modal = `
    <div class="modal fade" id="updateAppointmentModal" tabindex="-1" role="dialog" aria-hidden="true">
      <div class="modal-dialog" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Complete Appointment and Add Remarks</h5>
            <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
          </div>
          <div class="modal-body">
            <div class="form-group">
                <label for="updateStatus">Status</label>
                <input type="text" id="updateStatus" class="form-control" value="COMPLETED" disabled>
            </div>
            <div class="form-group">
              <label for="updateRemarks">Remarks/Consultation Notes</label>
              <textarea id="updateRemarks" class="form-control" rows="3" placeholder="Enter consultation findings, diagnosis, and next steps..."></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
            <button type="button" class="btn btn-success" id="saveUpdateBtn">Save Notes & Complete Appointment</button>
          </div>
        </div>
      </div>
    </div>`;
  $('body').append(modal);

  // Handler for the modal's Save button:
  $(document)
    .off('click', '#saveUpdateBtn')
    .on('click', '#saveUpdateBtn', function () {
      const id = $('#updateAppointmentModal').data('appointment-id');
      const status = 'COMPLETED';
      const remarks = $('#updateRemarks').val().trim();

      if (remarks.length < 5) {
        window.alert(
          'Please provide detailed remarks (at least 5 characters) before completing the appointment.'
        );
        return;
      }

      // 🚨 JWT is automatically attached to this request
      $.ajax({
        url: `${base_url}/appointments/${id}/status?status=${status}&remarks=${encodeURIComponent(
          remarks
        )}`,
        method: 'PUT',
      })
        .done(function () {
          $('#updateAppointmentModal').modal('hide');
          location.reload(); // Reload to show the appointment in the updated category
        })
        .fail(function (xhr) {
          window.alert(
            'Failed to update appointment: ' +
              (xhr.responseJSON?.message || 'Unknown error')
          );
          console.error('Update appointment failed', xhr);
        });
    });
}

// --- Event wiring for compatibility (RETAINED FOR INTER-MODULE COMMUNICATION) ---
// This ensures that if another part of the application triggers 'doctorEntityReady',
// the UI still updates.

$(document).on('doctorEntityReady', function (evt, data) {
  try {
    processDoctorEntity(data || window._doctorEntity);
  } catch (e) {
    console.error('Error handling doctorEntityReady', e);
  }
});

// If a doctor entity was fetched earlier (window._doctorEntity), ensure the page initializes now.
// This is a safety catch for potential race conditions.
if (window._doctorEntity) {
  try {
    processDoctorEntity(window._doctorEntity);
  } catch (e) {
    console.error('Error processing preloaded doctor entity', e);
  }
}