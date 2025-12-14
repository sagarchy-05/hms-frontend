var base_url = process.env.base_url || 'http://localhost:8080/api';

$(document).ready(function () {
  if ($('#billsTable').length && window.location.pathname.includes('/admin/')) {
    // 🚨 JWT is automatically attached to this request
    $.get(`${base_url}/admin/billing`)
      .done(function (bills) {
        const tbody = $('#billsTable tbody').empty();

        if (!Array.isArray(bills) || bills.length === 0) {
          tbody.html(
            `<tr><td colspan="6" class="text-center py-4 text-muted">No bills found.</td></tr>`
          );
          return;
        }

        bills.forEach(function (b) {
          // Clean up status mapping logic (assuming PENDING for UNPAID is desired)
          const statusClass = b.paymentStatus === 'UNPAID' ? 'status-PENDING' : 'status-PAID';
          
          let row = `<tr>
              <td>${b.billId || '-'}</td>
              <td>${b.appointmentId || '-'}</td>
              <td>${b.billDate || '-'}</td>
              <td>Rs. ${(b.billAmount || 0).toFixed(2)}</td>
              <td>
                <span class="badge-status ${statusClass}">${b.paymentStatus || '-'}</span>
              </td>
              <td>`;

          if (b.paymentStatus === 'UNPAID') {
            row += `<button class="btn btn-sm btn-pay pay-bill" data-id="${b.billId}" data-amount="${(b.billAmount || 0).toFixed(2)}">Pay</button>`;
          }

          row += '</td></tr>';
          tbody.append(row);
        });
      })
      .fail(function () {
        $('#billsTable tbody').html(
          `<tr><td colspan="6" class="text-center text-danger">Failed to load bills.</td></tr>`
        );
      });
  }

  // -------------------------
  // HANDLE BILL PAYMENT WITH MODAL
  // -------------------------

  // Event to show the confirmation modal
  $(document).on('click', '.pay-bill', function () {
    const billId = $(this).data('id');
    const billAmount = $(this).data('amount');

    $('#billIdDisplay').text(billId);
    $('#billAmountDisplay').text(`Rs. ${billAmount}`);
    $('#confirmPayButton').data('id', billId);

    // Hide any previous error message
    $('#payConfirmModal .modal-body .text-danger').remove();

    $('#payConfirmModal').modal('show');
  });

  // Confirm payment button in modal
  $('#confirmPayButton').click(function () {
    const id = $(this).data('id');

    let modalBody = $('#payConfirmModal .modal-body');
    modalBody.find('.text-danger').remove();

    if (!id) {
      modalBody.append('<p class="text-danger mt-2">No bill selected.</p>');
      return;
    }

    // 🚨 JWT is automatically attached. Removed redundant 'xhrFields: { withCredentials: true }'.
    $.ajax({
      url: `${base_url}/admin/billing/${id}/pay`,
      method: 'POST',
    })
      .done(function () {
        $('#payConfirmModal').modal('hide');
        location.reload();
      })
      .fail(function () {
        modalBody.append(
          '<p class="text-danger mt-2">Failed to process payment. Please try again.</p>'
        );
      });
  });
});