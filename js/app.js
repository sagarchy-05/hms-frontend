var base_url = process.env.base_url || 'http://localhost:8080/api';

$.ajaxPrefilter(function (options, originalOptions, xhr) {
  const token = localStorage.getItem('authToken');
  
  if (token) {
    xhr.setRequestHeader('Authorization', 'Bearer ' + token);
  }
});

// ----------------------------------------------------
// Navbar Rendering (Improved structure)
// ----------------------------------------------------

// Utility to create Nav Item HTML
const navItem = (href, text, isBtn = false, btnClass = '') => {
    const className = isBtn 
        ? `nav-link btn btn-outline-light btn-sm ms-lg-2 mt-2 mt-lg-0 ${btnClass}` 
        : 'nav-link px-3';
    
    // Use window.location.origin for correct root URL
    const fullHref = href.startsWith('/') ? `${window.location.origin}${href}` : href;

    return `<li class="nav-item"><a class="${className}" href="${fullHref}">${text}</a></li>`;
};

// Define menu structure to reduce repetition in renderNavbar
const menuMap = {
    // Standard public links
    PUBLIC: [
        { href: "/#hero", text: "Home" },
        { href: "/#about", text: "About" },
        { href: "/#services", text: "Services" },
        { href: "/#departments", text: "Departments" },
        { href: "/#testimonials", text: "Testimonials" },
        { href: "/#contact", text: "Contact" }
    ],
    // PATIENT links
    PATIENT: [
        { href: "/patient/dashboard.html", text: "Dashboard" },
        { href: "/patient/appointments.html", text: "Appointments" },
        { href: "/patient/billing.html", text: "Billing" }
    ],
    // DOCTOR links
    DOCTOR: [
        { href: "/doctor/dashboard.html", text: "Dashboard" },
        { href: "/doctor/appointments.html", text: "Appointments" }
    ],
    // ADMIN links
    ADMIN: [
        { href: "/admin/dashboard.html", text: "Dashboard" },
        { href: "/admin/patients.html", text: "Patients" },
        { href: "/admin/doctors.html", text: "Doctors" },
        { href: "/admin/appointments.html", text: "Appointments" },
        { href: "/admin/billings.html", text: "Billing" },
        { href: "/admin/users.html", text: "Users" }
    ]
};


/**
 * Renders the navbar based on the user's role.
 * @param {string | null} role - The user's role (PATIENT, DOCTOR, ADMIN) or null for public.
 * @param {string} userName - Optional user name to display.
 */
function renderNavbar(role, userName = '') {
    const origin = window.location.origin;

    let navContent = '';
    const menuLinks = menuMap[role] || menuMap.PUBLIC;

    menuLinks.forEach(link => {
        navContent += navItem(link.href, link.text);
    });

    // -------------------------
    // Right-side buttons (login/logout)
    // -------------------------
    let rightSideButtons = '';
    if (!role) {
        // Public buttons
        rightSideButtons += navItem('/login.html', 'Login');
        rightSideButtons += navItem('/register.html', 'Register', true, 'font-weight-bold');
    } else {
        // Authenticated buttons
        rightSideButtons += navItem('/change_password.html', 'Change Password');
        // We use id="logoutBtn" for the handler below
        rightSideButtons += `<li class="nav-item"><a class="nav-link ms-lg-2 mt-2 mt-lg-0" href="#" id="logoutBtn">Logout</a></li>`;
    }

    // The rest of the HTML structure remains the same
    const navHTML = `
      <style>
        /* [INLINE STYLES REMAINS UNCHANGED] */
        :root { --primary-color: #10b981; --primary-dark: #059669; }
        .bg-primary { background-color: var(--primary-color) !important; }
        .text-primary { color: var(--primary-color) !important; }
        .navbar-nav .nav-link { color: #fff !important; font-weight: 500; padding: 0.6rem 1rem !important; border-radius: 0.5rem; transition: all 0.3s ease; }
        .navbar-nav .nav-link:hover, .navbar-nav .nav-link.active { background-color: var(--primary-dark); color: #fff !important; text-shadow: 0 0 5px rgba(255,255,255,0.2); }
        .navbar-brand { font-weight: 700 !important; letter-spacing: 0.5px; color: #fff !important; transition: color 0.3s ease; }
        .navbar-brand:hover { color: #ccfffa !important; }
        #logoutBtn { background-color: #fff !important; color: var(--primary-color) !important; border-color: #fff !important; font-weight: bold; border-radius: 0.5rem; padding: 0.5rem 1rem !important; }
        #logoutBtn:hover { background-color: #f0f0f0 !important; color: var(--primary-dark) !important; }
        .navbar-toggler { border: 1px solid rgba(255,255,255,0.5); padding: 0.25rem 0.5rem; border-radius: 0.5rem; }
        .navbar-toggler-icon { filter: brightness(0) invert(1); }
      </style>
      <nav class="navbar navbar-expand-lg navbar-dark bg-primary shadow-lg py-3">
        <div class="container-fluid container-lg">
          <a class="navbar-brand me-4" href="${origin}/index.html" style="font-size:1.4rem;">Jeevan Hospital</a>
          <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarContent"
            aria-controls="navbarContent" aria-expanded="false" aria-label="Toggle navigation">
            <span class="navbar-toggler-icon"></span>
          </button>
          <div class="collapse navbar-collapse" id="navbarContent">
            <ul class="navbar-nav mx-auto mb-2 mb-lg-0">
              ${navContent}
            </ul>
            <ul class="navbar-nav ms-auto mb-2 mb-lg-0 align-items-lg-center">
              ${rightSideButtons}
            </ul>
          </div>
        </div>
      </nav>
    `;

    // Inject navbar if the container exists
    const navbarContainer = document.getElementById('navbar');
    if (navbarContainer) navbarContainer.innerHTML = navHTML;
}

// ----------------------------------------------------
// Authentication Check & Role Dispatcher (Simplified)
// ----------------------------------------------------

// Helper function to check for protected path
function isProtectedPath() {
    const protectedPaths = ['/patient/', '/doctor/', '/admin/'];
    const currentPath = window.location.pathname;
    return protectedPaths.some((path) => currentPath.includes(path)) &&
           !currentPath.includes('/login.html') &&
           !currentPath.includes('/register.html');
}

/**
 * Executes the main authentication check and page setup.
 */
function initAuthenticationAndLoadData() {
    $.ajax({
        url: `${base_url}/users/me`,
        method: 'GET',
        success: function (userData) {
            // Success: User is authenticated.
            
            // 🚨 CHANGE 3: The backend should now return the user's name (or a default)
            const userName = userData.name || userData.email.split('@')[0];
            renderNavbar(userData.role, userName); 

            // Load role-specific entity and trigger page logic if defined
            if (userData.role === 'PATIENT') {
                $.get(`${base_url}/patients/me`)
                    .done((data) => {
                        window._patientEntity = data;
                        $(document).trigger('patientEntityReady', [data]);
                        if (typeof loadPatientPageLogic === 'function')
                            loadPatientPageLogic(data);
                    })
                    .fail(() => console.error('Could not load patient entity data.'));
            } else if (userData.role === 'DOCTOR') {
                $.get(`${base_url}/doctors/me`)
                    .done((data) => {
                        window._doctorEntity = data;
                        $(document).trigger('doctorEntityReady', [data]);
                        if (typeof loadDoctorPageLogic === 'function')
                            loadDoctorPageLogic(data);
                    })
                    .fail(() => console.error('Could not load doctor entity data.'));
            } else if (userData.role === 'ADMIN') {
                if (typeof loadAdminPageLogic === 'function')
                    loadAdminPageLogic(userData);
            }
        },
        error: function (xhr) {
            // Error: User is unauthenticated or token is expired/invalid.
            renderNavbar(null);

            // Redirect unauthorized users away from protected paths
            if (isProtectedPath()) {
                window.location.href = '/login.html';
            }
        }
    });
}

// Start the whole process
initAuthenticationAndLoadData();


// ----------------------------------------------------
// 🚨 CHANGE 4: LOGOUT HANDLER (Client-Side Only)
// Removed the AJAX call to the server.
// ----------------------------------------------------
$(document).on('click', '#logoutBtn', function (e) {
    e.preventDefault();
    
    // Perform cleanup
    localStorage.removeItem('authToken');
    localStorage.removeItem('user'); 
    
    // Disable button and redirect
    const $this = $(this);
    $this.prop('disabled', true).html('Logging out...');

    setTimeout(() => {
        window.location.href = '/login.html';
    }, 300);
});


// ----------------------------------------------------
// Custom Confirmation Modal (Remains unchanged)
// ----------------------------------------------------
let confirmCallback;

function showCustomConfirm(message, callback) {
  confirmCallback = callback;
  $('#customConfirmMessage').text(message);
  $('#customConfirmModal').modal('show');
}

$(function () {
  // User clicks "Yes" in the modal
  $('#customConfirmYes')
    .off('click')
    .on('click', function () {
      $('#customConfirmModal').modal('hide');
      if (confirmCallback) {
        confirmCallback(true);
        confirmCallback = null;
      }
    });

  // Reset callback if modal is closed without confirming
  $('#customConfirmModal').on('hidden.bs.modal', function () {
    confirmCallback = null;
  });
});