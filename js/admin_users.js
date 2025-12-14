var base_url = process.env.base_url || 'http://localhost:8080/api';

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

// --- MAIN LOGIC ---

$(document).ready(function () {
  // --------------------------
  // Session validation (Client-side JWT check)
  // --------------------------
  const tokenUser = JSON.parse(localStorage.getItem('user'));
  if (!tokenUser) {
    window.location.href = '/login.html';
    return;
  } else if (tokenUser.role !== 'ADMIN') {
    window.location.href = '/error.html';
    return;
  }

  loadUsers(); // Initial fetch of users

  // --------------------------
  // Load users from backend
  // --------------------------
  function loadUsers() {
    // 🚨 JWT is automatically attached to this request
    $.get(`${base_url}/admin/users`)
      .done(function (data) {
        const tbody = $('#usersTable tbody');
        tbody.empty();

        if (data.length === 0) {
          tbody.append(
            '<tr><td colspan="4" class="text-center text-muted">No users found.</td></tr>'
          );
          return;
        }

        data.forEach(function (user) {
          let roleClass = 'badge-secondary';
          if (user.role === 'ADMIN') roleClass = 'badge-admin';
          else if (user.role === 'DOCTOR') roleClass = 'badge-doctor';
          else if (user.role === 'PATIENT') roleClass = 'badge-patient';

          const row = `
                                    <tr>
                                        <td>${user.userId}</td>
                                        <td>${user.email}</td>
                                        <td><span class="badge ${roleClass}">${user.role}</span></td>
                                        <td>
                                            <button class="btn btn-sm btn-info edit-user-btn mr-1" data-id="${user.userId}">Edit</button>
                                            <button class="btn btn-sm btn-warning reset-password-btn mr-1" data-id="${user.userId}">Reset Password</button>
                                            <button class="btn btn-sm btn-danger delete-user-btn" data-id="${user.userId}">Delete</button>
                                        </td>
                                    </tr>`;
          tbody.append(row);
        });
      })
      .fail(function () {
        showToast(
          'Failed to load user data. Please check the backend.',
          'danger'
        );
      });
  }

  // --------------------------
  // Add Admin
  // --------------------------
  $('#addAdminForm').submit(function (e) {
    e.preventDefault();
    const email = $('#adminEmail').val();
    const password = $('#adminPassword').val();

    // 🚨 JWT is automatically attached to this request
    $.ajax({
      url: `${base_url}/admin/register`,
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({ email, password }),
      success: function () {
        $('#addAdminModal').modal('hide');
        showToast('New Admin user registered successfully.', 'success');
        loadUsers();
        $('#addAdminForm')[0].reset();
      },
      error: function (xhr) {
        let msg = xhr.responseJSON?.message || 'Failed to add Admin user.';
        showToast(msg, 'danger');
      },
    });
  });

  // --------------------------
  // Edit User
  // --------------------------
  $(document).on('click', '.edit-user-btn', function () {
    const userId = $(this).data('id');

    // 🚨 JWT is automatically attached to this request
    $.get(`${base_url}/admin/users/${userId}`)
      .done(function (user) {
        $('#editUserId').val(user.userId);
        $('#editUserEmail').val(user.email);
        $('#editUserRole').val(user.role);
        $('#editUserModal').modal('show');
      })
      .fail(function (xhr) {
        const msg =
          xhr.status === 500
            ? `Failed to fetch Admin details (ID: ${userId}). Check server logs.`
            : `Could not fetch user details (ID: ${userId}). Status: ${xhr.status}`;
        showToast(msg, 'danger');
      });
  });

  $('#editUserForm').submit(function (e) {
    e.preventDefault();
    const userId = $('#editUserId').val();
    const email = $('#editUserEmail').val();
    const role = $('#editUserRole').val();

    // 🚨 JWT is automatically attached to this request
    $.ajax({
      url: `${base_url}/admin/users/${userId}/identity`,
      type: 'PUT',
      contentType: 'application/json',
      data: JSON.stringify({ email, role }),
      success: function () {
        $('#editUserModal').modal('hide');
        showToast(`User ID ${userId} updated successfully.`, 'success');
        loadUsers();
      },
      error: function (xhr) {
        const msg = xhr.responseJSON?.message || 'Failed to update user.';
        showToast(msg, 'danger');
      },
    });
  });

  // --------------------------
  // Reset Password
  // --------------------------
  $(document).on('click', '.reset-password-btn', function () {
    const userId = $(this).data('id');
    $('#resetUserId').val(userId);
    $('#newPassword').val('');
    $('#resetPasswordModal').modal('show');
  });

  $('#resetPasswordForm').submit(function (e) {
    e.preventDefault();
    const userId = $('#resetUserId').val();
    const newPassword = $('#newPassword').val();

    // 🚨 CHANGED: Using $.ajax explicitly to set JSON content type (server best practice)
    // 🚨 JWT is automatically attached to this request
    $.ajax({
        url: `${base_url}/admin/users/${userId}/reset-password`,
        type: 'POST',
        contentType: 'application/json', // Ensure data is sent as JSON
        data: JSON.stringify({ password: newPassword }),
    })
      .done(function () {
        $('#resetPasswordModal').modal('hide');
        showToast(
          `Password for User ID ${userId} has been reset successfully.`,
          'success'
        );
        $('#resetPasswordForm')[0].reset();
      })
      .fail(function (xhr) {
        const msg = xhr.responseJSON?.message || 'Failed to reset password.';
        showToast(msg, 'danger');
      });
  });

  // --------------------------
  // Delete User
  // --------------------------
  $(document).on('click', '.delete-user-btn', function () {
    const userId = $(this).data('id');
    $('#deleteUserId').val(userId);
    $('#deleteUserModal').modal('show');
  });

  $('#confirmDeleteUserBtn').click(function () {
    const userId = $('#deleteUserId').val();
    $('#deleteUserModal').modal('hide');

    // 🚨 JWT is automatically attached to this request
    $.ajax({
      url: `${base_url}/admin/users/${userId}`,
      type: 'DELETE',
      success: function () {
        showToast(`User ID ${userId} deleted successfully.`, 'success');
        loadUsers();
      },
      error: function (xhr) {
        const msg = xhr.responseJSON?.message || 'Failed to delete user.';
        showToast(msg, 'danger');
      },
    });
  });
});