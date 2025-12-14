(function (window, $) {
  function initAppointments(patientId) {
    if (!patientId) return;

    // --- Helper to get or create table body ---
    const getTBody = (tableId) => {
      const $table = $(`#${tableId}`);
      let $tbody = $table.find('tbody');
      if ($tbody.length === 0) {
        $tbody = $('<tbody>');
        $table.append($tbody);
      }
      return $tbody;
    };

    // ================================================================
    // 1. APPOINTMENTS SECTION: Upcoming & Completed Appointments
    // ================================================================

    if (
      $('#upcomingAppointments').length ||
      $('#completedAppointments').length
    ) {
      // 🚨 JWT is automatically attached
      $.get(`${base_url}/appointments/patient/${patientId}`)
        .done(function (list) {
          const upcomingBody = getTBody('upcomingAppointments');
          const completedBody = getTBody('completedAppointments');
          upcomingBody.empty();
          completedBody.empty();

          if (!Array.isArray(list) || list.length === 0) {
            upcomingBody.append(
              '<tr><td colspan="5" class="text-muted text-center p-4">No upcoming appointments</td></tr>'
            );
            completedBody.append(
              '<tr><td colspan="5" class="text-muted text-center p-4">No past appointments</td></tr>'
            );
            return;
          }

          list.forEach(function (a) {
            const row = $('<tr>');
            const statusBadge = `<span class="badge-status status-${(
              a.status || 'DEFAULT'
            ).toUpperCase()}">${a.status || '-'}</span>`;

            row.append(
              $('<td>')
                .addClass('text-nowrap')
                .text(a.appointmentDate || '-')
            );
            row.append(
              $('<td>')
                .addClass('text-nowrap')
                .text(a.timeSlot || '-')
            );
            row.append($('<td>').text(a.doctorName || '-'));
            row.append($('<td>').addClass('text-center').html(statusBadge));

            if (a.status === 'COMPLETED' || a.status === 'CANCELLED') {
              // Completed/Cancelled appointments go to the 'Past' table
              row.append(
                $('<td>').text(
                  a.remarks || (a.status === 'CANCELLED' ? 'Cancelled' : '-')
                )
              );
              completedBody.append(row);
            } else {
              // Upcoming appointments go to the 'Upcoming' table
              const actionCell = $('<td>').addClass('text-center');
              const apptDate = a.appointmentDate ? new Date(a.appointmentDate) : null;
              // Normalize dates to midnight for comparison
              const apptDateMidnight = apptDate ? apptDate.setHours(0, 0, 0, 0) : 0;
              const nowMidnight = new Date().setHours(0, 0, 0, 0);

              if (apptDate && apptDateMidnight >= nowMidnight) {
                actionCell.append(
                  $('<button>')
                    .addClass('btn btn-sm btn-info edit-appointment me-2')
                    .attr('data-id', a.appointmentId)
                    .text('Edit')
                );
                actionCell.append(
                  $('<button>')
                    .addClass('btn btn-sm btn-danger cancel-appointment')
                    .attr('data-id', a.appointmentId)
                    .text('Cancel')
                );
              } else {
                actionCell.text('-'); // Past but un-completed appointments
              }
              row.append(actionCell);
              upcomingBody.append(row);
            }
          });
        })
        .fail(function () {
          // Assuming showToast is globally available from the main script
          if (typeof showToast === 'function') {
            showToast('Failed to load appointments.', 'error');
          }
        });
    }

    // ================================================================
    // 2. EVENT HANDLERS: Edit & Cancel Appointment Logic
    // ================================================================

    $(document)
      .off('click', '.edit-appointment')
      .on('click', '.edit-appointment', function () {
        // Navigates to the booking page with the appointment ID for rescheduling
        window.location =
          'book_appointment.html?appointmentId=' + $(this).data('id');
      });

    // Wires up the "Cancel" button to show the confirmation modal
    $(document)
      .off('click', '.cancel-appointment')
      .on('click', '.cancel-appointment', function () {
        $('#confirmCancelButton').data('id', $(this).data('id'));
        $('#cancelConfirmModal').modal('show');
      });

    // Logic for confirming and executing the cancellation
    $('#confirmCancelButton')
      .off('click')
      .on('click', function () {
        const id = $(this).data('id');
        const $button = $(this);
        $button
          .prop('disabled', true)
          .html('<i class="fas fa-spinner fa-spin mr-2"></i> Cancelling...');

        // 🚨 JWT is automatically attached
        $.ajax({ url: `${base_url}/appointments/${id}/cancel`, method: 'PUT' })
          .done(function () {
            $('#cancelConfirmModal').modal('hide');
            if (typeof showToast === 'function') {
              showToast('Appointment cancelled successfully', 'success');
            }
            // Reloads the page to update the appointment lists
            location.reload();
          })
          .fail(function () {
            $('#cancelConfirmModal').modal('hide');
            if (typeof showToast === 'function') {
              showToast('Failed to cancel appointment', 'error');
            }
            $button.prop('disabled', false).text('Confirm Cancel');
          });
      });

    // ================================================================
    // 3. BILLING PAGE: Loads and displays all patient bills
    // ================================================================

    /** Creates a colored badge for payment status. */
    function renderStatusBadge(status) {
      const displayStatus = status || 'N/A';
      const statusClass = 'status-' + displayStatus.toUpperCase();
      // NOTE: This assumes CSS classes like .status-PENDING, .status-PAID, etc., are defined.
      return $('<span>')
        .addClass('badge-status')
        .addClass(statusClass)
        .text(displayStatus);
    }

    if ($('#billsTable').length) {
      // 🚨 JWT is automatically attached
      $.get(`${base_url}/bills/patient/${patientId}`)
        .done(function (bills) {
          const tbody = $('#billsTable tbody');
          if (tbody.length === 0) return; // Defensive check
          tbody.empty();

          if (!Array.isArray(bills) || bills.length === 0) {
            tbody.append(
              '<tr><td colspan="6" class="text-center text-muted p-4">No bills found.</td></tr>'
            );
            return;
          }

          // Sorts pending bills first, then by date descending
          bills.sort((a, b) => {
            if (a.paymentStatus === 'PENDING' && b.paymentStatus !== 'PENDING')
              return -1;
            if (a.paymentStatus !== 'PENDING' && b.paymentStatus === 'PENDING')
              return 1;
            return new Date(b.billDate) - new Date(a.billDate);
          });

          bills.forEach(function (b) {
            const row = $('<tr>');
            if (b.paymentStatus === 'PENDING') row.addClass('table-warning');
            row.append($('<td>').text(b.billId));
            row.append($('<td>').text(b.appointmentId || '-'));
            row.append($('<td>').text(b.billDate || '-'));
            row.append($('<td>').text(`Rs. ${(b.billAmount || 0).toFixed(2)}`));
            row.append($('<td>').append(renderStatusBadge(b.paymentStatus)));

            const actionCell = $('<td>');
            if (b.paymentStatus === 'PENDING') {
              actionCell.append(
                $('<button>')
                  .addClass('btn btn-sm btn-pay pay-bill')
                  .attr('data-id', b.billId)
                  .attr('data-amount', (b.billAmount || 0).toFixed(2))
                  .text('Pay')
              );
            } else {
              actionCell.text('-');
            }
            row.append(actionCell);
            tbody.append(row);
          });
        })
        .fail(function () {
          if (typeof showToast === 'function') {
            showToast('Failed to load bills.', 'error');
          }
        });
    }

    // ================================================================
    // 4. PAYMENT MODAL: Trigger payment flow
    // ================================================================

    // Wires up the "Pay" buttons to show the confirmation modal
    $(document)
      .off('click', '.pay-bill')
      .on('click', '.pay-bill', function () {
        const billId = $(this).data('id');
        const billAmount = $(this).data('amount');
        $('#confirmPayButton').data('id', billId);
        $('#billIdDisplay').text(billId);
        $('#billAmountDisplay').text(`Rs. ${billAmount}`);
        $('#payConfirmModal').modal('show');
      });

    // Logic for confirming and executing the payment
    $(document)
      .off('click', '#confirmPayButton')
      .on('click', '#confirmPayButton', function () {
        const id = $(this).data('id');
        $('#payConfirmModal').modal('hide');

        // 🚨 JWT is automatically attached
        $.ajax({ url: `${base_url}/bills/${id}/pay`, method: 'PUT' })
          .done(function () {
            if (typeof showToast === 'function') {
              showToast('Payment successful', 'success');
            }
            location.reload();
          })
          .fail(function () {
            if (typeof showToast === 'function') {
              showToast('Payment failed. Please try again.', 'error');
            }
            location.reload();
          });
      });

    // ================================================================
    // 5. BOOKING PAGE: Logic for booking or rescheduling appointments
    // ================================================================

    if ($('#bookForm').length) {
      let selectedDoctor = null;
      let availableDays = [];
      let doctorMap = {};
      let selectedSlot = null;
      const dayMap = [
        'SUNDAY',
        'MONDAY',
        'TUESDAY',
        'WEDNESDAY',
        'THURSDAY',
        'FRIDAY',
        'SATURDAY',
      ];

      function setupDatePicker() {
        // Destroy existing datepicker to reinitialize options
        $('#appointmentDate').datepicker('destroy'); 
        $('#appointmentDate').datepicker({
          format: 'yyyy-mm-dd',
          startDate: new Date(),
          autoclose: true,
          todayHighlight: true,
          beforeShowDay: function (date) {
            const dayName = dayMap[date.getDay()];
            // Disable dates that the selected doctor is not available
            return availableDays.includes(dayName)
              ? { enabled: true, classes: 'available-day' }
              : { enabled: false, classes: 'disabled-day' };
          },
        });

        // Event: When a date is selected, fetch available time slots
        $('#appointmentDate')
          .off('changeDate')
          .on('changeDate', function (e) {
            const date = e.format('yyyy-mm-dd');
            const dayOfWeek = dayMap[new Date(date).getDay()];
            if (!availableDays.includes(dayOfWeek)) return;

            // 🚨 JWT is automatically attached
            $.get(
              `${base_url}/appointments/slots/${selectedDoctor}?date=${date}`,
              function (slots) {
                let html = '';
                slots.forEach(function (s) {
                  html += `<button type="button" class="btn btn-outline-primary slot-btn m-1" data-slot="${s}">${s}</button>`;
                });
                $('#timeSlot').html(html);

                // Event: Handle selection of a time slot
                $('#timeSlot')
                  .off('click', '.slot-btn')
                  .on('click', '.slot-btn', function () {
                    $('.slot-btn').removeClass('active');
                    $(this).addClass('active');
                    selectedSlot = $(this).data('slot');
                  });
              }
            );
          });
      }

      // Handler for Doctor Search Button
      $('#searchDoctorBtn').click(function () {
        const keyword = $('#doctorSearch').val();
        // 🚨 JWT is automatically attached
        $.get(`${base_url}/patients/find-doctor?keyword=${keyword}`, function (doctors) {
          const doctorList = $('#doctorList');
          doctorList.empty();
          doctorMap = {};

          doctors.forEach(function (d) {
            doctorMap[d.doctorId] = d;
            const fee =
              d.consultationFee != null ? `₹${d.consultationFee}` : '—';
            
            // Build the UI card for each doctor
            const card = $('<div>')
              .addClass('doctor-card p-3 mb-2 border rounded')
              .attr('data-doctor-id', d.doctorId);
            const header = $('<div>').addClass(
              'd-flex justify-content-between align-items-center'
            );
            const info = $('<div>');
            info.append($('<h5>').addClass('mb-1').text(d.name));
            info.append(
              $('<small>')
                .addClass('text-muted')
                .text(`${d.specialization} • Fee: ${fee}`)
            );
            const radioContainer = $('<div>').append(
              $('<input>').attr({
                type: 'radio',
                name: 'doctor',
                value: d.doctorId,
              })
            );
            header.append(info).append(radioContainer);
            card.append(header);
            
            if (d.availabilities && d.availabilities.length) {
              const days = d.availabilities.map((a) => a.dayOfWeek).join(', ');
              card.append(
                $('<div>')
                  .addClass('mt-2 text-muted')
                  .text(`Available: ${days}`)
              );
            }
            doctorList.append(card);
          });

          // Event: when doctor is selected, update availability and date picker
          doctorList
            .off('change', 'input[name="doctor"]')
            .on('change', 'input[name="doctor"]', function () {
              const newDoctorId = $(this).val();
              // Clear date/slot if changing doctors
              if (selectedDoctor && newDoctorId !== selectedDoctor) {
                $('#appointmentDate').val('');
                $('#timeSlot').empty();
                selectedSlot = null;
              }

              selectedDoctor = newDoctorId;
              const doctor = doctorMap[selectedDoctor];
              availableDays = (doctor.availabilities || []).map(
                (a) => a.dayOfWeek
              );
              $('#appointmentDetails').show();
              setupDatePicker();
            });

          // Allow clicking the card (not just radio) to select the doctor
          doctorList
            .off('click', '.doctor-card')
            .on('click', '.doctor-card', function () {
              const radio = $(this).find('input[name="doctor"]');
              radio.prop('checked', true).trigger('change');
            });
        });
      });

      // Handle form submission for booking or rescheduling
      $('#bookForm').submit(function (e) {
        e.preventDefault();
        const params = new URLSearchParams(window.location.search);
        const appointId = params.get('appointmentId');
        
        const data = {
          patientId: patientId,
          doctorId: selectedDoctor,
          appointmentDate: $('#appointmentDate').val(),
          timeSlot: selectedSlot,
          reason: $('#reason').val(),
        };

        if (!selectedDoctor || !data.appointmentDate || !data.timeSlot) {
          if (typeof showToast === 'function') {
            showToast('Please select doctor, date, and time slot.', 'warning');
          }
          return;
        }

        // Determine if this is a new booking (POST) or a reschedule (PUT)
        const request = appointId
          ? {
              url: `${base_url}/appointments/${appointId}/reschedule`,
              method: 'PUT',
            }
          : { url: `${base_url}/appointments`, method: 'POST' };

        // 🚨 JWT is automatically attached
        $.ajax({
          ...request,
          contentType: 'application/json',
          data: JSON.stringify(data),
        })
          .done(function () {
            if (typeof showToast === 'function') {
              showToast('Appointment saved successfully!', 'success');
            }
            window.location = 'appointments.html'; // Redirect to the appointments list
          })
          .fail(function () {
            if (typeof showToast === 'function') {
              showToast('Failed to save appointment.', 'error');
            }
          });
      });

      // Reschedule mode: prefill data when editing an existing appointment
      const params = new URLSearchParams(window.location.search);
      if (params.get('appointmentId')) {
        const id = params.get('appointmentId');
        // 🚨 Fetch appointment details. JWT is automatically attached.
        $.get(`${base_url}/appointments/${id}`, function (a) {
          selectedDoctor = a.doctorId;
          $('#doctorList').html('');
          $('#appointmentDetails').show();
          $('#reason').val(a.reason);

          // Helper: loads doctor's available days and UI for display
          const loadDoctorAvailability = function (doctor) {
            availableDays = (doctor.availabilities || []).map(
              (av) => av.dayOfWeek
            );
            const fee =
              doctor.consultationFee != null
                ? `₹${doctor.consultationFee}`
                : '—';

            // Display selected doctor in a read-only fashion
            const card = $('<div>')
              .addClass('doctor-card p-3 mb-2 border rounded bg-light')
              .attr('data-doctor-id', doctor.doctorId);
            const header = $('<div>').addClass(
              'd-flex justify-content-between align-items-center'
            );
            const info = $('<div>');
            info.append($('<h5>').addClass('mb-1').text(doctor.name));
            info.append(
              $('<small>')
                .addClass('text-muted')
                .text(`${doctor.specialization} • Fee: ${fee}`)
            );
            
            // Note: Radio button is set to checked but hidden/disabled for reschedule clarity
            const radioContainer = $('<div>').append(
              $('<input>').attr({
                type: 'radio',
                name: 'doctor',
                value: doctor.doctorId,
                checked: true,
                disabled: true, // Prevent changing doctor during reschedule flow
              })
            );
            header.append(info).append(radioContainer);
            card.append(header);

            if (doctor.availabilities && doctor.availabilities.length) {
              const days = doctor.availabilities
                .map((av) => av.dayOfWeek)
                .join(', ');
              card.append(
                $('<div>')
                  .addClass('mt-2 text-muted')
                  .text(`Available: ${days}`)
              );
            }
            $('#doctorList').empty().append(card);

            // Setup date picker based on the loaded doctor's availability
            setupDatePicker();
            $('#appointmentDate').datepicker('setDate', a.appointmentDate);

            // Load time slots for the preselected doctor/date
            // 🚨 JWT is automatically attached
            $.get(
              `${base_url}/appointments/slots/${a.doctorId}?date=${a.appointmentDate}`,
              function (slots) {
                let html = '';
                slots.forEach(function (s) {
                  const activeClass = s === a.timeSlot ? 'active' : '';
                  html += `<button type="button" class="btn btn-outline-primary slot-btn m-1 ${activeClass}" data-slot="${s}">${s}</button>`;
                });
                $('#timeSlot').html(html);
                selectedSlot = a.timeSlot;
              }
            );
          };

          // Fetch doctor details to load availability for reschedule
          if (doctorMap[selectedDoctor]) {
            loadDoctorAvailability(doctorMap[selectedDoctor]);
          } else {
            // 🚨 JWT is automatically attached
            $.get(`${base_url}/doctors/${selectedDoctor}`, function (doctor) {
              doctorMap[doctor.doctorId] = doctor;
              loadDoctorAvailability(doctor);
            });
          }
        });
      }
    }
  }

  // expose globally so the main patient script can call it
  window.initAppointments = initAppointments;
})(window, jQuery);