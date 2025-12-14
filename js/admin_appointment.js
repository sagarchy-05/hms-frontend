

function cancelAppointment(id) {
  $.ajax({
    url: `${base_url}/admin/appointments/${id}/cancel`,
    method: 'POST',
  })
    .done(() => {
      console.log(`Appointment ${id} cancelled successfully.`);
      // Note: The original code suppresses toast/message feedback here, 
      // relying on console and modal dismissal. Consider adding a toast notification.
      $('#cancelConfirmModal').modal('hide');
      loadAppointments();
    })
    .fail((xhr) => {
      let errorMsg = 'Failed to cancel appointment. Check server logs.';
      if (xhr.responseJSON && xhr.responseJSON.message) {
        errorMsg = xhr.responseJSON.message;
      }
      console.error('Cancellation Error:', errorMsg, xhr);
      $('#cancelConfirmModal').modal('hide');
      // If a showToast utility existed, it would be called here.
    });
}

// --- LOAD APPOINTMENTS ---
/**
 * Fetches all appointments and renders upcoming and past tables.
 */
function loadAppointments() {
  console.log(
    'Loading appointments from:',
    `${base_url}/admin/appointments`
  );

  $('#upcomingTableBody, #pastTableBody').html(
    `<tr><td colspan="7" class="p-4 text-muted">Loading...</td></tr>`
  );

  // 🚨 JWT is automatically attached to this request
  $.get(`${base_url}/admin/appointments`)
    .done((appointments) => {
      console.log('Appointments loaded:', appointments);

      const upcoming = appointments.filter((a) => a.status === 'CONFIRMED');
      const past = appointments.filter((a) => a.status !== 'CONFIRMED');

      const generateRow = (a, isUpcoming) => {
        const dateAndTime = `${a.appointmentDate} ${a.timeSlot || ''}`;
        let actionsOrRemarks;

        if (isUpcoming) {
          actionsOrRemarks = `
            <button class="btn btn-sm btn-primary editAppointmentBtn" data-id="${a.appointmentId}">
                <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-danger cancelAppointmentBtn ml-1" data-id="${a.appointmentId}">
                <i class="fas fa-times"></i> Cancel
            </button>`;
        } else {
          actionsOrRemarks =
            a.remarks && a.remarks.trim() !== '' ? a.remarks : 'N/A';
        }

        const statusClass = `status-${a.status}`;

        return `
          <tr>
            <td>${a.appointmentId}</td>
            <td>${a.patientName || 'N/A'}</td>
            <td>${a.doctorName || 'N/A'} (${a.specialization || '-'})</td>
            <td>${dateAndTime}</td>
            <td>${a.reason || '-'}</td>
            <td><span class="badge-status ${statusClass}">${
              a.status
            }</span></td>
            <td>${actionsOrRemarks}</td>
          </tr>`;
      };

      $('#upcomingTableBody').html(
        upcoming.length
          ? upcoming.map((a) => generateRow(a, true)).join('')
          : `<tr><td colspan="7" class="p-4 text-muted">No upcoming appointments.</td></tr>`
      );

      $('#pastTableBody').html(
        past.length
          ? past.map((a) => generateRow(a, false)).join('')
          : `<tr><td colspan="7" class="p-4 text-muted">No past appointments.</td></tr>`
      );
    })
    .fail((xhr) => {
      console.error('Failed to load appointments. XHR:', xhr);
      $('#upcomingTableBody, #pastTableBody').html(
        `<tr><td colspan="7" class="p-4 text-danger font-weight-bold">Failed to load appointments. (Status: ${
          xhr.status || 'N/A'
        })</td></tr>`
      );
    });
}

// --- DOCUMENT READY ---
$(document).ready(function () {
  const tokenUser = JSON.parse(localStorage.getItem('user'));

  // --- SESSION CHECK (Client-side JWT check) ---
  if (!tokenUser) window.location.href = '/login.html';
  if (tokenUser.role !== 'ADMIN') window.location.href = '/error.html';

  loadAppointments();

  // Book Appointment Button
  $('#bookAppointmentBtn')
    .off('click')
    .on('click', () => {
      window.location.href = '/admin/appointment_form.html';
    });

  // Edit Appointment Button (delegated)
  $(document)
    .off('click', '.editAppointmentBtn')
    .on('click', '.editAppointmentBtn', function () {
      const id = $(this).data('id');
      window.location.href = `/admin/appointment_form.html?editId=${id}`;
    });

  // Cancel Appointment Button (delegated)
  $(document)
    .off('click', '.cancelAppointmentBtn')
    .on('click', '.cancelAppointmentBtn', function () {
      $('#cancelAppointmentId').val($(this).data('id'));
      $('#cancelConfirmModal').modal('show');
    });

  // Confirm Cancel
  $('#confirmCancelBtn')
    .off('click')
    .on('click', function () {
      const id = $('#cancelAppointmentId').val();
      cancelAppointment(id);
    });
});