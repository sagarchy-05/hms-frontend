var base_url = process.env.base_url || 'http://localhost:8080/api';

function showMessage(message, type = 'danger') {
  const box = $('#feedbackBox');
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

  // --- INITIAL LOAD ---
  loadBills();

  // =============================
  // CORE FUNCTIONS
  // =============================

  /**
   * Marks a bill as paid via API call.
   * @param {number|string} billId
   */
  function payBill(billId) {
    // 🚨 JWT is automatically attached to this request
    // Note: $.post may send data as application/x-www-form-urlencoded if no data is explicitly passed,
    // but the authentication header is still managed by the prefilter.
    $.post(`${base_url}/admin/billing/${billId}/pay`)
      .done(() => {
        showMessage(
          `Bill ID ${billId} successfully marked as paid.`,
          'success'
        );
        loadBills();
      })
      .fail((xhr) => {
        let errorMsg = 'Failed to process payment.';
        if (xhr.responseJSON && xhr.responseJSON.message)
          errorMsg = xhr.responseJSON.message;
        showMessage(errorMsg);
      });
  }

  /**
   * Fetches all bills and separates them for display in paid/unpaid tables.
   */
  function loadBills() {
    // 🚨 JWT is automatically attached to this request
    $.get(`${base_url}/admin/billing`)
      .done((data) => {
        const unpaidBills = data.filter(
          (bill) =>
            bill.paymentStatus === 'UNPAID' || bill.paymentStatus === 'PENDING'
        );
        const paidAndCancelledBills = data.filter(
          (bill) =>
            bill.paymentStatus === 'PAID' || bill.paymentStatus === 'CANCELLED'
        );

        renderTable(unpaidBills, '#unpaidTable tbody', 'unpaid');
        renderTable(paidAndCancelledBills, '#paidTable tbody', 'paid');
      })
      .fail((xhr) => {
        let errorMsg = 'Failed to load billing data.';
        if (xhr.responseJSON && xhr.responseJSON.message)
          errorMsg = xhr.responseJSON.message;
        showMessage(errorMsg);
      });
  }

  /**
   * Renders table rows for either the unpaid or paid table. (No change needed)
   * @param {Array} bills - Array of bill objects.
   * @param {string} tbodySelector - Selector for the table body.
   * @param {string} type - 'unpaid' or 'paid'.
   */
  function renderTable(bills, tbodySelector, type) {
    var tbody = $(tbodySelector);
    tbody.empty();

    if (bills.length === 0) {
      tbody.append(
        `<tr><td colspan="5" class="text-center text-muted">No ${type} bills found.</td></tr>`
      );
      return;
    }

    bills.forEach((bill) => {
      let actionsOrStatus = '';

      if (type === 'unpaid') {
        actionsOrStatus = `
                        <td>
                            <button class="btn btn-sm btn-success pay-bill-btn" data-id="${bill.billId}">
                                <i class="bi bi-cash"></i> Pay
                            </button>
                        </td>
                    `;
      } else {
        let statusClass;
        switch (bill.paymentStatus) {
          case 'PAID':
            statusClass = 'badge-success';
            break;
          case 'CANCELLED':
            statusClass = 'badge-danger';
            break;
          default:
            statusClass = 'badge-warning';
        }
        actionsOrStatus = `<td><span class="badge ${statusClass}">${bill.paymentStatus}</span></td>`;
      }

      const row = `
                        <tr>
                            <td>${bill.billId}</td>
                            <td>${bill.appointmentId}</td>
                            <td>${bill.patientName}</td>
                            <td>Rs. ${bill.billAmount.toFixed(2)}</td>
                            ${actionsOrStatus}
                        </tr>
                    `;
      tbody.append(row);
    });
  }

  // =============================
  // EVENT HANDLERS (No change needed)
  // =============================

  // Open Pay Bill Modal
  $(document).on('click', '.pay-bill-btn', function () {
    const billId = $(this).data('id');
    $('#confirmBillId').text(billId);
    $('#confirmPayBtn').data('bill-id', billId);
    $('#payBillConfirmationModal').modal('show');
  });

  // Confirm Pay Bill
  $(document).on('click', '#confirmPayBtn', function () {
    const billId = $(this).data('bill-id');
    $('#payBillConfirmationModal').modal('hide');
    payBill(billId);
  });
});