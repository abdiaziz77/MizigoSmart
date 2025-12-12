// Login Page JavaScript
class LoginPage {
    static API_URL = 'http://localhost:5000/users';
    
    static init() {
        this.initDefaultAdminAccount(); // Create default admin if needed
        this.initFormValidation();
        this.initPasswordToggle();
        this.initSocialLogin();
        this.initAdminCredentials();
        this.initDemoAccounts();
        this.initForgotPassword();
        this.initFormSubmission();
        this.checkRememberedUser();
        this.checkExistingSession();
        this.updateNavbarState(); // Initial navbar state update
    }

    static async initDefaultAdminAccount() {
        try {
            // Check if admin account already exists
            const response = await fetch(`${this.API_URL}?email=admin@mizigosmart.com`);
            const adminUsers = await response.json();
            
            if (adminUsers.length === 0) {
                // Create default admin account
                const defaultAdmin = {
                    id: "1",
                    email: "admin@mizigosmart.com",
                    password: "admin123",
                    firstName: "Admin",
                    lastName: "User",
                    name: "Admin User",
                    phone: "+1 (555) 000-0001",
                    yearOfBirth: 1985,
                    role: "admin",
                    newsletter: false,
                    termsAccepted: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    accountStatus: 'active',
                    emailVerified: true,
                    phoneVerified: true,
                    profilePicture: null,
                    shippingAddresses: [],
                    paymentMethods: [],
                    preferences: {
                        notifications: {
                            email: true,
                            sms: true,
                            push: true
                        },
                        theme: 'dark',
                        language: 'en'
                    },
                    lastLogin: null,
                    lastLogout: null
                };
                
                await fetch(this.API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(defaultAdmin)
                });
                
                console.log('Default admin account created successfully');
            }
        } catch (error) {
            console.error('Error creating default admin account:', error);
        }
    }

    static initFormValidation() {
        const form = document.getElementById('loginForm');
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        
        // Real-time validation
        emailInput.addEventListener('blur', () => this.validateEmail());
        emailInput.addEventListener('input', () => this.clearError('email'));
        
        passwordInput.addEventListener('blur', () => this.validatePassword());
        passwordInput.addEventListener('input', () => this.clearError('password'));
    }

    static validateEmail() {
        const email = document.getElementById('email').value.trim();
        
        if (!email) {
            this.showError('email', 'Email is required');
            return false;
        }
        
        if (!this.isValidEmail(email)) {
            this.showError('email', 'Please enter a valid email address');
            return false;
        }
        
        this.clearError('email');
        return true;
    }

    static validatePassword() {
        const password = document.getElementById('password').value;
        
        if (!password) {
            this.showError('password', 'Password is required');
            return false;
        }
        
        if (password.length < 6) {
            this.showError('password', 'Password must be at least 6 characters');
            return false;
        }
        
        this.clearError('password');
        return true;
    }

    static isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    static showError(fieldId, message) {
        const errorElement = document.getElementById(`${fieldId}Error`);
        const inputElement = document.getElementById(fieldId);
        
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
        
        if (inputElement) {
            inputElement.classList.add('error');
        }
    }

    static clearError(fieldId) {
        const errorElement = document.getElementById(`${fieldId}Error`);
        const inputElement = document.getElementById(fieldId);
        
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.style.display = 'none';
        }
        
        if (inputElement) {
            inputElement.classList.remove('error');
        }
    }

    static initPasswordToggle() {
        const toggleButton = document.querySelector('.password-toggle');
        
        if (toggleButton) {
            toggleButton.addEventListener('click', () => {
                const passwordInput = document.getElementById('password');
                const icon = toggleButton.querySelector('i');
                
                if (passwordInput.type === 'password') {
                    passwordInput.type = 'text';
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                } else {
                    passwordInput.type = 'password';
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
            });
        }
    }

    static initSocialLogin() {
        const googleBtn = document.querySelector('.google-btn');
        const facebookBtn = document.querySelector('.facebook-btn');
        
        if (googleBtn) {
            googleBtn.addEventListener('click', () => {
                Components.showAlert('Google login coming soon!', 'info');
            });
        }
        
        if (facebookBtn) {
            facebookBtn.addEventListener('click', () => {
                Components.showAlert('Facebook login coming soon!', 'info');
            });
        }
    }

    static initAdminCredentials() {
        const loadAdminBtn = document.getElementById('loadAdminBtn');
        if (loadAdminBtn) {
            loadAdminBtn.addEventListener('click', () => {
                document.getElementById('email').value = 'admin@mizigosmart.com';
                document.getElementById('password').value = 'admin123';
                document.getElementById('rememberMe').checked = true;
                
                // Clear any errors
                this.clearError('email');
                this.clearError('password');
                
                Components.showAlert('Admin credentials loaded. Click "Sign In" to access the admin dashboard.', 'info');
                
                // Focus on the sign in button
                document.querySelector('button[type="submit"]').focus();
            });
        }
    }

    static initDemoAccounts() {
        const demoAccounts = document.querySelectorAll('.demo-account');
        
        demoAccounts.forEach(account => {
            account.addEventListener('click', async () => {
                const email = account.getAttribute('data-email');
                const password = account.getAttribute('data-password');
                const role = account.querySelector('.demo-role').textContent;
                
                // Skip if trying to load admin demo (admin is a separate account)
                if (email === 'admin@mizigosmart.com') {
                    Components.showAlert('Please use the default admin credentials directly. Email: admin@mizigosmart.com, Password: admin123', 'info');
                    return;
                }
                
                // Set form values
                document.getElementById('email').value = email;
                document.getElementById('password').value = password;
                
                // Clear any errors
                this.clearError('email');
                this.clearError('password');
                
                // Create demo account in JSON Server if it doesn't exist
                try {
                    await this.createDemoAccountIfNeeded(email, password, role);
                    
                    Components.showAlert(`Demo ${role} loaded. Click Sign In to continue.`, 'info');
                    
                    // Focus on the sign in button
                    document.querySelector('button[type="submit"]').focus();
                } catch (error) {
                    Components.showAlert('Error loading demo account', 'warning');
                }
            });
        });
    }

    static async createDemoAccountIfNeeded(email, password, role) {
        try {
            // Check if demo account already exists
            const response = await fetch(`${this.API_URL}?email=${encodeURIComponent(email)}`);
            const users = await response.json();
            
            if (users.length === 0) {
                // Don't create admin accounts via demo (use default admin only)
                if (role.toLowerCase() === 'admin') {
                    Components.showAlert('Admin accounts are pre-configured. Please use admin@mizigosmart.com with password admin123', 'info');
                    return;
                }
                
                // Create demo account for non-admin users
                const demoAccount = {
                    id: `demo_${role}_${Date.now()}`,
                    email: email,
                    password: password,
                    firstName: role.charAt(0).toUpperCase() + role.slice(1),
                    lastName: 'User',
                    name: `${role.charAt(0).toUpperCase() + role.slice(1)} User`,
                    phone: '+1 (555) 123-4567',
                    yearOfBirth: 1990,
                    role: role.toLowerCase(),
                    newsletter: false,
                    termsAccepted: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    accountStatus: 'active',
                    emailVerified: true,
                    phoneVerified: false,
                    profilePicture: null,
                    shippingAddresses: [],
                    paymentMethods: [],
                    preferences: {
                        notifications: {
                            email: true,
                            sms: true,
                            push: true
                        },
                        theme: 'light',
                        language: 'en'
                    },
                    lastLogin: null,
                    lastLogout: null
                };
                
                await fetch(this.API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(demoAccount)
                });
            }
        } catch (error) {
            console.error('Error creating demo account:', error);
        }
    }

    static initForgotPassword() {
        const forgotPasswordLink = document.querySelector('.forgot-password');
        const modal = document.getElementById('forgotPasswordModal');
        const closeBtn = modal.querySelector('.modal-close');
        const cancelBtn = document.getElementById('cancelReset');
        const sendBtn = document.getElementById('sendResetLink');
        
        // Open modal
        if (forgotPasswordLink) {
            forgotPasswordLink.addEventListener('click', (e) => {
                e.preventDefault();
                modal.classList.add('active');
                document.body.style.overflow = 'hidden';
                
                // Pre-fill with current email if available
                const currentEmail = document.getElementById('email').value;
                if (currentEmail) {
                    document.getElementById('resetEmail').value = currentEmail;
                }
            });
        }
        
        // Close modal
        const closeModal = () => {
            modal.classList.remove('active');
            document.body.style.overflow = 'auto';
        };
        
        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        
        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
        
        // Close with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                closeModal();
            }
        });
        
        // Send reset link
        sendBtn.addEventListener('click', async () => {
            const email = document.getElementById('resetEmail').value.trim();
            
            if (!email || !this.isValidEmail(email)) {
                Components.showAlert('Please enter a valid email address', 'warning');
                return;
            }
            
            // Show loading
            const originalText = sendBtn.innerHTML;
            sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
            sendBtn.disabled = true;
            
            try {
                // Check if email exists in database
                const userExists = await this.checkUserExists(email);
                
                if (!userExists) {
                    Components.showAlert('No account found with this email address', 'warning');
                    return;
                }
                
                // In a real app, you would send a password reset email
                // For this demo, we'll simulate it
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                closeModal();
                
                Components.showAlert(`Password reset link has been sent to ${email}. Please check your inbox.`, 'success');
                
                // Clear the email field
                document.getElementById('resetEmail').value = '';
                
            } catch (error) {
                Components.showAlert('An error occurred. Please try again.', 'danger');
            } finally {
                // Restore button state
                sendBtn.innerHTML = originalText;
                sendBtn.disabled = false;
            }
        });
    }

    static initFormSubmission() {
        const form = document.getElementById('loginForm');
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Validate form
            const isEmailValid = this.validateEmail();
            const isPasswordValid = this.validatePassword();
            
            if (!isEmailValid || !isPasswordValid) {
                Components.showAlert('Please fix all errors before submitting', 'danger');
                return;
            }
            
            // Get form data
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const rememberMe = document.getElementById('rememberMe').checked;
            
            // Show loading state
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing In...';
            submitBtn.disabled = true;
            
            try {
                // Attempt login using real JSON Server
                const user = await this.attemptLogin(email, password);
                
                // Save remember me preference
                if (rememberMe) {
                    localStorage.setItem('rememberedEmail', email);
                } else {
                    localStorage.removeItem('rememberedEmail');
                }
                
                // Save user session
                this.saveUserSession(user);
                
                // Show success message
                Components.showAlert(`Welcome back, ${user.firstName}!`, 'success');
                
                // Redirect based on role
                setTimeout(() => {
                    if (user.role === 'admin') {
                        window.location.href = '/public/dashboard.html';
                    } else {
                        // Check if user was trying to access a protected page
                        const intendedPage = sessionStorage.getItem('intendedPage');
                        if (intendedPage) {
                            sessionStorage.removeItem('intendedPage');
                            window.location.href = intendedPage;
                        } else {
                            window.location.href = 'index.html';
                        }
                    }
                }, 1000);
                
            } catch (error) {
                this.showError('password', error.message);
                Components.showAlert(error.message, 'danger');
            } finally {
                // Restore button state
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    static async attemptLogin(email, password) {
        try {
            // Fetch user from JSON Server
            const response = await fetch(`${this.API_URL}?email=${encodeURIComponent(email)}`);
            
            if (!response.ok) {
                throw new Error('Network error. Please check your connection and try again.');
            }
            
            const users = await response.json();
            
            if (users.length === 0) {
                throw new Error('No account found with this email. Please sign up first.');
            }
            
            const user = users[0];
            
            // Verify password (direct comparison since we're storing plain text in JSON Server)
            if (user.password !== password) {
                throw new Error('Incorrect password. Please try again.');
            }
            
            // Check if account is active
            if (user.accountStatus && user.accountStatus !== 'active') {
                throw new Error('This account is not active. Please contact support.');
            }
            
            // Return user data without password for security
            const userData = {
                id: user.id,
                email: user.email,
                firstName: user.firstName || user.name?.split(' ')[0] || 'User',
                lastName: user.lastName || user.name?.split(' ')[1] || '',
                name: user.name || `${user.firstName} ${user.lastName}`,
                phone: user.phone,
                yearOfBirth: user.yearOfBirth,
                role: user.role || 'customer',
                newsletter: user.newsletter || false,
                createdAt: user.createdAt,
                profilePicture: user.profilePicture,
                shippingAddresses: user.shippingAddresses || [],
                paymentMethods: user.paymentMethods || [],
                preferences: user.preferences || {
                    notifications: {
                        email: true,
                        sms: true,
                        push: true
                    },
                    theme: 'light',
                    language: 'en'
                }
            };
            
            // Ensure admin has correct name
            if (user.email === 'admin@mizigosmart.com') {
                userData.firstName = 'Admin';
                userData.lastName = 'User';
                userData.name = 'Admin User';
                userData.role = 'admin';
            }
            
            return userData;
            
        } catch (error) {
            console.error('Login error:', error);
            
            // Check if JSON Server is running
            if (error.message.includes('Network error') || error.message.includes('Failed to fetch')) {
                throw new Error('Cannot connect to server. Please make sure JSON Server is running on http://localhost:5000');
            }
            
            throw error;
        }
    }

    static async checkUserExists(email) {
        try {
            const response = await fetch(`${this.API_URL}?email=${encodeURIComponent(email)}`);
            
            if (!response.ok) {
                return false;
            }
            
            const users = await response.json();
            return users.length > 0;
            
        } catch (error) {
            console.error('Error checking user:', error);
            return false;
        }
    }

    static saveUserSession(user) {
        // Save user session data
        localStorage.setItem('currentUser', JSON.stringify(user));
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('lastLogin', new Date().toISOString());
        
        // Update navbar state
        this.updateNavbarState();
        
        // Update user's last login in database
        this.updateLastLogin(user.id).catch(console.error);
    }

    static async updateLastLogin(userId) {
        try {
            // Fetch current user data
            const response = await fetch(`${this.API_URL}/${userId}`);
            const user = await response.json();
            
            // Update last login timestamp
            const updatedUser = {
                ...user,
                lastLogin: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            // Update in JSON Server
            await fetch(`${this.API_URL}/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedUser)
            });
            
        } catch (error) {
            console.error('Error updating last login:', error);
        }
    }

    static checkRememberedUser() {
        const rememberedEmail = localStorage.getItem('rememberedEmail');
        
        if (rememberedEmail) {
            document.getElementById('email').value = rememberedEmail;
            document.getElementById('rememberMe').checked = true;
        }
    }

    static checkExistingSession() {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        
        if (currentUser && isLoggedIn === 'true') {
            // Check if session is still valid (less than 24 hours old)
            const lastLogin = localStorage.getItem('lastLogin');
            const lastLoginTime = new Date(lastLogin);
            const now = new Date();
            const hoursSinceLastLogin = (now - lastLoginTime) / (1000 * 60 * 60);
            
            if (hoursSinceLastLogin < 24) {
                // User is already logged in, redirect to dashboard
                Components.showAlert(`Welcome back, ${currentUser.firstName}! Redirecting...`, 'info');
                
                setTimeout(() => {
                    if (currentUser.role === 'admin') {
                        window.location.href = '/public/dashboard.html';
                    } else {
                        window.location.href = 'index.html';
                    }
                }, 1500);
            } else {
                // Session expired, clear localStorage
                this.clearSession();
            }
        }
    }

    static clearSession() {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('lastLogin');
        localStorage.removeItem('rememberedEmail');
        this.updateNavbarState();
    }

    static updateNavbarState() {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        
        // Find navbar elements - use more specific selectors
        const loginLink = document.querySelector('a[href="login.html"]');
        const signupLink = document.querySelector('a[href="register.html"]');
        const logoutLink = document.querySelector('#logoutLink');
        const trackLink = document.querySelector('a[href="track.html"]');
        const bookLink = document.querySelector('a[href="booking.html"]');
        const getStartedLink = document.querySelector('a.btn-primary:not([href="register.html"])');
        
        if (isLoggedIn && currentUser) {
            // User is logged in
            if (loginLink) loginLink.style.display = 'none';
            if (signupLink) signupLink.style.display = 'none';
            if (getStartedLink) getStartedLink.style.display = 'none';
            
            // Show track shipment if user is not admin
            if (trackLink) {
                trackLink.style.display = currentUser.role !== 'admin' ? 'block' : 'none';
            }
            
            // Add or update logout button
            const navbarActions = document.querySelector('.navbar-actions');
            if (navbarActions && !logoutLink) {
                const logoutBtn = document.createElement('a');
                logoutBtn.href = "#";
                logoutBtn.id = "logoutLink";
                logoutBtn.className = "btn btn-outline";
                logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
                navbarActions.appendChild(logoutBtn);
                
                // Add logout event listener
                logoutBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.clearSession();
                    window.location.href = 'index.html';
                });
            }
            
            // Add dashboard link for admin
            if (currentUser.role === 'admin') {
                const dashboardLink = document.querySelector('a[href="/public/dashboard.html"]');
                if (!dashboardLink && navbarActions) {
                    const dashboardBtn = document.createElement('a');
                    dashboardBtn.href = "/public/dashboard.html";
                    dashboardBtn.className = "btn btn-outline";
                    dashboardBtn.innerHTML = '<i class="fas fa-tachometer-alt"></i> Dashboard';
                    navbarActions.insertBefore(dashboardBtn, navbarActions.querySelector('#logoutLink'));
                }
            }
        } else {
            // User is not logged in
            if (loginLink) loginLink.style.display = 'block';
            if (signupLink) signupLink.style.display = 'block';
            if (getStartedLink) getStartedLink.style.display = 'block';
            
            // Hide track shipment
            if (trackLink) {
                trackLink.style.display = 'none';
            }
            
            // Remove logout button if exists
            if (logoutLink) {
                logoutLink.remove();
            }
            
            // Remove dashboard link if exists
            const dashboardLink = document.querySelector('a[href="/public/dashboard.html"]');
            if (dashboardLink) {
                dashboardLink.remove();
            }
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    LoginPage.init();
    
    // Add CSS for error states
    const style = document.createElement('style');
    style.textContent = `
        .form-control.error {
            border-color: var(--danger);
            box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
        }
        
        .btn-loading {
            position: relative;
            color: transparent !important;
        }
        
        .btn-loading::after {
            content: '';
            position: absolute;
            width: 20px;
            height: 20px;
            top: 50%;
            left: 50%;
            margin: -10px 0 0 -10px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        }
        
        @keyframes spin {
            to {
                transform: rotate(360deg);
            }
        }
        
        /* Hide elements */
        .navbar-link[style*="display: none"],
        .navbar-actions a[style*="display: none"] {
            display: none !important;
        }
        
        /* Smooth transitions */
        .navbar-link, .navbar-actions a {
            transition: opacity 0.3s ease;
        }
    `;
    document.head.appendChild(style);
});

// Add Components utility if not already defined
if (typeof Components === 'undefined') {
    window.Components = {
        showAlert: function(message, type = 'info') {
            // Create alert element
            const alert = document.createElement('div');
            alert.className = `alert alert-${type}`;
            alert.innerHTML = `
                <div class="alert-content">
                    <i class="fas fa-${this.getAlertIcon(type)}"></i>
                    <span>${message}</span>
                </div>
                <button class="alert-close">&times;</button>
            `;
            
            // Style the alert
            alert.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 1rem 1.5rem;
                background: var(--white);
                border-left: 4px solid var(--${type});
                border-radius: var(--radius);
                box-shadow: var(--shadow-lg);
                display: flex;
                align-items: center;
                justify-content: space-between;
                min-width: 300px;
                max-width: 400px;
                z-index: 9999;
                animation: slideIn 0.3s ease;
            `;
            
            // Add alert-specific styles
            const style = document.createElement('style');
            style.textContent = `
                .alert-content {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    flex: 1;
                }
                
                .alert-content i {
                    color: var(--${type});
                    font-size: 1.25rem;
                }
                
                .alert-close {
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    color: var(--gray-500);
                    cursor: pointer;
                    padding: 0;
                    width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
            `;
            document.head.appendChild(style);
            
            // Add close functionality
            alert.querySelector('.alert-close').addEventListener('click', () => {
                alert.style.animation = 'slideOut 0.3s ease forwards';
                setTimeout(() => {
                    if (alert.parentNode) {
                        alert.parentNode.removeChild(alert);
                    }
                }, 300);
            });
            
            // Auto remove after 5 seconds
            setTimeout(() => {
                if (alert.parentNode) {
                    alert.style.animation = 'slideOut 0.3s ease forwards';
                    setTimeout(() => {
                        if (alert.parentNode) {
                            alert.parentNode.removeChild(alert);
                        }
                    }, 300);
                }
            }, 5000);
            
            // Add slideOut animation
            const slideOutStyle = document.createElement('style');
            slideOutStyle.textContent = `
                @keyframes slideOut {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(slideOutStyle);
            
            document.body.appendChild(alert);
        },
        
        getAlertIcon: function(type) {
            const icons = {
                success: 'check-circle',
                danger: 'exclamation-circle',
                warning: 'exclamation-triangle',
                info: 'info-circle'
            };
            return icons[type] || 'info-circle';
        }
    };
}