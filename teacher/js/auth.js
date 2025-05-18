// src/teacher/js/auth.js
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const loginView = document.getElementById('login-view');
    const dashboardView = document.getElementById('dashboard-view');
    const logoutButton = document.getElementById('logout-button');

    // Check auth state
    auth.onAuthStateChanged(user => {
        if (user) {
            document.body.classList.remove('login-page-body'); // For specific login page styling
            loginView.classList.add('d-none');
            dashboardView.classList.remove('d-none');
            if (window.initDashboardApp) {
                 window.initDashboardApp();
            } else {
                console.warn("initDashboardApp function not found. Dashboard might not initialize correctly.");
            }
        } else {
            document.body.classList.add('login-page-body'); // For specific login page styling
            loginView.classList.remove('d-none');
            dashboardView.classList.add('d-none');
            // Reset logout button state if it was changed
            logoutButton.innerHTML = 'Logout';
            logoutButton.disabled = false;
        }
    });

    // Login
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            loginError.textContent = '';

            const loginButton = loginForm.querySelector('button[type="submit"]');
            const spinner = loginButton.querySelector('.spinner-border');
            
            if(spinner) spinner.classList.remove('d-none');
            loginButton.disabled = true;
            const originalButtonText = loginButton.childNodes[0].nodeValue; // "Login " text
            loginButton.childNodes[0].nodeValue = "Logging in... ";


            auth.signInWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    console.log("Logged in:", userCredential.user);
                    // auth.onAuthStateChanged will handle view switching and app init
                    // No need to manually reset button here, view will change
                })
                .catch((error) => {
                    loginError.textContent = error.message;
                    console.error("Login error:", error);
                    if(spinner) spinner.classList.add('d-none');
                    loginButton.disabled = false;
                    loginButton.childNodes[0].nodeValue = originalButtonText;
                });
        });
    } else {
        console.error("Login form not found.");
    }

    // Logout
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            const originalButtonHTML = logoutButton.innerHTML;
            logoutButton.innerHTML = 'Logging out... <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
            logoutButton.disabled = true;

            auth.signOut().then(() => {
                console.log("Logged out");
                // auth.onAuthStateChanged will handle view switching and reset button via else block
            }).catch((error) => {
                console.error("Logout error:", error);
                alert("Logout failed: " + error.message);
                logoutButton.innerHTML = originalButtonHTML; // Reset on error
                logoutButton.disabled = false;
            });
        });
    } else {
        console.error("Logout button not found.");
    }
});