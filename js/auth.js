var base_url = process.env.base_url || 'http://localhost:8080/api';

const endpoints = {
  login: `${base_url}/auth/login`,
  register: `${base_url}/auth/register`,
  changePassword: `${base_url}/users/change-password`,
};

// =========================================================================
// GLOBAL AJAX PREFILTER (Token Injection) - CORE JWT IMPLEMENTATION
// Attaches the Authorization header to all secured requests.
// =========================================================================
$.ajaxPrefilter(function (options, originalOptions, xhr) {
  const token = localStorage.getItem('authToken');
  
  // Define endpoints that should NOT send a token (public endpoints)
  const isPublicEndpoint = (
    options.url === endpoints.login || 
    options.url === endpoints.register
  );

  if (token && !isPublicEndpoint) {
    // Add the Bearer token to the Authorization header
    xhr.setRequestHeader('Authorization', 'Bearer ' + token);
  }
});

// =========================================================================
// UTILITY FUNCTIONS
// =========================================================================

function showFormMessage(messageId, message, type = 'error', duration = 0) {
  const $messageArea = $(messageId);

  // 1. STOP previous animations, clear content, remove classes, and hide
  $messageArea.stop(true, true).removeClass('success error').hide().empty();

  // 2. Set new content (using .html() to allow for <br> tags) and class
  $messageArea.html(message).addClass(type).fadeIn(300);

  // 3. Set a timeout to clear the message if a duration is specified
  if (duration > 0) {
    setTimeout(() => {
      $messageArea.fadeOut(300, function () {
        $(this).empty().removeClass('success error');
      });
    }, duration);
  }
}

function clearFormMessage(messageId) {
  // STOP previous animations before fading out
  $(messageId)
    .stop(true, true)
    .fadeOut(300, function () {
      $(this).empty().removeClass('success error');
    });
}

// =========================================================================
// DOCUMENT READY - FORM SUBMISSION HANDLERS
// =========================================================================

$(document).ready(function () {
  // -------------------------
  // LOGIN FORM
  // -------------------------
  $('#loginForm').submit(function (e) {
    e.preventDefault();
    clearFormMessage('#login-message');

    // --- Button Loading Start ---
    const $submitBtn = $(this).find('button[type="submit"]');
    const originalHtml = $submitBtn.html();
    $submitBtn.prop('disabled', true).html(
      '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Logging in...'
    );
    // --- Button Loading End ---

    const loginData = {
      email: $('#email').val(),
      password: $('#password').val(),
    };

    $.ajax({
      url: endpoints.login,
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(loginData),
      // 'xhrFields: { withCredentials: true }' REMOVED
      success: function (res) {
        $submitBtn.html('<i class="fas fa-check mr-2"></i> Success!')
            .removeClass('btn-primary').addClass('btn-success');
        
        // 🚨 JWT STORAGE LOGIC
        if (res.access_token) {
            localStorage.setItem('authToken', res.access_token);
            // Save user details (excluding the token) for app state
            const { access_token, ...userWithoutToken } = res;
            localStorage.setItem('user', JSON.stringify(userWithoutToken));
        } else {
            showFormMessage('#login-message', 'Login success but token missing from response.', 'error', 3000);
            $submitBtn.prop('disabled', false).html(originalHtml);
            return;
        }

        showFormMessage(
          '#login-message',
          res.message || 'Login successful!',
          'success',
          1000
        );

        setTimeout(() => {
          switch (res.role) {
            case 'PATIENT':
              window.location = '/patient/dashboard.html';
              break;
            case 'DOCTOR':
              window.location = '/doctor/dashboard.html';
              break;
            case 'ADMIN':
              window.location = '/admin/dashboard.html';
              break;
            default:
              window.location = '/';
          }
        }, 1200);
      },
      error: function (xhr) {
        // --- Revert Button on Error ---
        $submitBtn.prop('disabled', false).html(originalHtml);
        // --- End Revert ---

        const errorMessage =
          xhr.responseJSON?.message ||
          'Login failed. Please check your credentials.';
        showFormMessage('#login-message', errorMessage, 'error');
      },
    });
  });

  // -------------------------
  // REGISTER FORM
  // -------------------------
  $('#registerForm').submit(function (e) {
    e.preventDefault();
    clearFormMessage('#register-message');

    // --- Button Loading Start ---
    const $submitBtn = $(this).find('button[type="submit"]');
    const originalHtml = $submitBtn.html();
    $submitBtn.prop('disabled', true).html(
      '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Creating profile...'
    );
    // --- Button Loading End ---

    const regData = {
      email: $('#email').val(),
      password: $('#password').val(),
      name: $('#name').val(),
      dob: $('#dob').val(),
      gender: $('#gender').val(),
      contactNumber: $('#contactNumber').val(),
      address: $('#address').val(),
      medicalHistory: $('#medicalHistory').val(),
    };

    $.ajax({
      url: endpoints.register,
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(regData),
      // 'xhrFields: { withCredentials: true }' REMOVED
      success: function () {
        // Change button to success state
        $submitBtn.html('<i class="fas fa-check mr-2"></i> Registered!')
            .removeClass('btn-primary').addClass('btn-success');
        
        showFormMessage(
          '#register-message',
          'Registered successfully. Redirecting to login...',
          'success',
          1500
        );
        setTimeout(() => {
          window.location = '/login.html';
        }, 1700);
      },
      error: function (xhr) {
        // --- Revert Button on Error ---
        $submitBtn.prop('disabled', false).html(originalHtml);
        // --- End Revert ---

        const res = xhr.responseJSON;
        if (res && typeof res === 'object' && !res.message) {
          const combinedErrors = Object.values(res).join('<br>');
          showFormMessage('#register-message', combinedErrors, 'error');
        } else {
          const errorMessage =
            res?.message || 'Registration failed. Please check your details.';
          showFormMessage('#register-message', errorMessage, 'error');
        }
      },
    });
  });

  // -------------------------
  // CHANGE PASSWORD FORM
  // -------------------------
  $('#changePasswordForm').submit(function (e) {
    e.preventDefault();
    clearFormMessage('#change-password-message');

    // --- Button Loading Start ---
    const $submitBtn = $(this).find('button[type="submit"]');
    const originalHtml = $submitBtn.html();
    // --- End Button Loading ---

    const newPass = $('#newPassword').val();
    if (newPass !== $('#confirmNewPassword').val()) {
      showFormMessage(
        '#change-password-message',
        'New passwords do not match.',
        'error'
      );
      return; // Don't submit
    }

    // --- Start loading spinner *after* client-side validation
    $submitBtn.prop('disabled', true).html(
      '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...'
    );

    const passData = {
      currentPassword: $('#currentPassword').val(),
      newPassword: newPass,
      confirmNewPassword: $('#confirmNewPassword').val(),
    };

    $.ajax({
      url: endpoints.changePassword,
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(passData),
      // 'xhrFields: { withCredentials: true }' REMOVED
      success: function (res) {
        // Change button to success state
        $submitBtn.html('<i class="fas fa-check mr-2"></i> Password Changed!')
            .removeClass('btn-primary').addClass('btn-success');

        const successMessage =
          res || 'Password changed successfully. Logging out...';
        showFormMessage(
          '#change-password-message',
          successMessage,
          'success',
          1500
        );

        // 🚨 TOKEN CLEANUP: Log out user by removing token and state
        localStorage.removeItem('user');
        localStorage.removeItem('authToken');
        
        setTimeout(() => {
          window.location = '/login.html';
        }, 1700);
      },
      error: function (xhr) {
        // --- Revert Button on Error ---
        $submitBtn.prop('disabled', false).html(originalHtml);
        // --- End Revert ---

        const errorMessage =
          xhr.responseJSON?.message ||
          'Password change failed. Check your current password.';
        showFormMessage('#change-password-message', errorMessage, 'error');
      },
    });
  });

  // -------------------------
  // LOGOUT BUTTON (Client-Side Only)
  // -------------------------
  $('#logoutBtn').click(function () {
    const $this = $(this);
    $this.prop('disabled', true).html(
      '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>'
    );
    
    // 🚨 CLIENT-SIDE LOGOUT ONLY:
    // No AJAX call to a server endpoint is made.
    localStorage.removeItem('user');
    localStorage.removeItem('authToken'); 
    
    // Slight delay for UI effect, then redirect
    setTimeout(() => {
        window.location = '/login.html';
    }, 300); 
  });
});