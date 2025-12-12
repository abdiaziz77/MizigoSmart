// Authentication Utility Functions for MizigoSmart
const Auth = {
    // Configuration
    config: {
        sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
        localStorageKeys: {
            currentUser: 'currentUser',
            isLoggedIn: 'isLoggedIn',
            lastLogin: 'lastLogin',
            rememberedEmail: 'rememberedEmail'
        },
        sessionStorageKeys: {
            intendedPage: 'intendedPage'
        }
    },

    // Check if user is logged in
    isLoggedIn: function() {
        const isLoggedIn = localStorage.getItem(this.config.localStorageKeys.isLoggedIn) === 'true';
        const lastLogin = localStorage.getItem(this.config.localStorageKeys.lastLogin);
        
        if (!isLoggedIn || !lastLogin) {
            return false;
        }
        
        // Check if session is expired
        const lastLoginTime = new Date(lastLogin);
        const now = new Date();
        const timeSinceLastLogin = now - lastLoginTime;
        
        if (timeSinceLastLogin > this.config.sessionTimeout) {
            this.clearSession();
            return false;
        }
        
        return true;
    },
    
    // Get current user
    getCurrentUser: function() {
        if (!this.isLoggedIn()) {
            return null;
        }
        
        try {
            const userStr = localStorage.getItem(this.config.localStorageKeys.currentUser);
            return userStr ? JSON.parse(userStr) : null;
        } catch (error) {
            console.error('Error parsing current user:', error);
            this.clearSession();
            return null;
        }
    },
    
    // Check if user is admin
    isAdmin: function() {
        const user = this.getCurrentUser();
        return user && user.role === 'admin';
    },
    
    // Check if user is regular customer
    isCustomer: function() {
        const user = this.getCurrentUser();
        return user && user.role === 'customer';
    },
    
    // Save user session
    saveSession: function(user) {
        if (!user || !user.id) {
            console.error('Invalid user data for session');
            return false;
        }
        
        try {
            localStorage.setItem(this.config.localStorageKeys.currentUser, JSON.stringify(user));
            localStorage.setItem(this.config.localStorageKeys.isLoggedIn, 'true');
            localStorage.setItem(this.config.localStorageKeys.lastLogin, new Date().toISOString());
            return true;
        } catch (error) {
            console.error('Error saving session:', error);
            return false;
        }
    },
    
    // Clear session
    clearSession: function() {
        try {
            localStorage.removeItem(this.config.localStorageKeys.currentUser);
            localStorage.removeItem(this.config.localStorageKeys.isLoggedIn);
            localStorage.removeItem(this.config.localStorageKeys.lastLogin);
            
            // Clear session storage intended page
            sessionStorage.removeItem(this.config.sessionStorageKeys.intendedPage);
            
            return true;
        } catch (error) {
            console.error('Error clearing session:', error);
            return false;
        }
    },
    
    // Redirect to login if not authenticated
    requireAuth: function(redirectUrl = 'login.html') {
        if (!this.isLoggedIn()) {
            // Save the intended page for redirect after login
            sessionStorage.setItem(this.config.sessionStorageKeys.intendedPage, window.location.href);
            
            // Show message if Components is available
            if (window.Components && typeof window.Components.showAlert === 'function') {
                window.Components.showAlert('Please sign in to access this page.', 'info');
            }
            
            setTimeout(() => {
                window.location.href = redirectUrl;
            }, 1500);
            
            return false;
        }
        return true;
    },
    
    // Require admin access
    requireAdmin: function(redirectUrl = 'index.html') {
        if (!this.isAdmin()) {
            // Show message if Components is available
            if (window.Components && typeof window.Components.showAlert === 'function') {
                window.Components.showAlert('Access denied. Admin privileges required.', 'warning');
            }
            
            setTimeout(() => {
                window.location.href = redirectUrl;
            }, 1500);
            
            return false;
        }
        return true;
    },
    
    // Require customer access
    requireCustomer: function(redirectUrl = 'index.html') {
        if (!this.isCustomer()) {
            // Show message if Components is available
            if (window.Components && typeof window.Components.showAlert === 'function') {
                window.Components.showAlert('This page is for customers only.', 'warning');
            }
            
            setTimeout(() => {
                window.location.href = redirectUrl;
            }, 1500);
            
            return false;
        }
        return true;
    },
    
    // Logout function
    logout: function() {
        const user = this.getCurrentUser();
        const userName = user ? user.firstName : 'User';
        
        this.clearSession();
        
        // Show logout message if Components is available
        if (window.Components && typeof window.Components.showAlert === 'function') {
            window.Components.showAlert(`Goodbye, ${userName}! You have been logged out.`, 'info');
        }
        
        // Redirect to home page
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
        
        return true;
    },
    
    // Update navbar based on authentication state
    updateNavbar: function() {
        const currentUser = this.getCurrentUser();
        const isLoggedIn = this.isLoggedIn();
        
        // Find navbar elements with more specific selectors
        const loginLink = document.querySelector('.navbar-actions a[href="login.html"]');
        const signupLink = document.querySelector('.navbar-actions a[href="register.html"]');
        const logoutLink = document.querySelector('#logoutLink');
        const trackLink = document.querySelector('.navbar-menu a[href="track.html"]');
        const bookLink = document.querySelector('.navbar-menu a[href="booking.html"]');
        const getStartedLink = document.querySelector('.hero-cta a[href="register.html"], .navbar-actions a.btn-primary:not([href="register.html"])');
        
        const navbarActions = document.querySelector('.navbar-actions');
        
        if (isLoggedIn && currentUser) {
            // User is logged in
            // Hide login/signup links
            if (loginLink) loginLink.style.display = 'none';
            if (signupLink) signupLink.style.display = 'none';
            
            // Hide "Get Started" buttons
            if (getStartedLink) {
                getStartedLink.style.display = 'none';
            }
            
            // Show/Hide track shipment based on role
            if (trackLink) {
                trackLink.style.display = currentUser.role === 'customer' ? 'block' : 'none';
            }
            
            // Add or update logout button
            if (navbarActions && !logoutLink) {
                const logoutBtn = document.createElement('a');
                logoutBtn.href = "#";
                logoutBtn.id = "logoutLink";
                logoutBtn.className = "btn btn-outline";
                logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
                logoutBtn.title = `Logout (${currentUser.firstName})`;
                navbarActions.appendChild(logoutBtn);
                
                // Add logout event listener
                logoutBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.logout();
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
                    dashboardBtn.title = "Admin Dashboard";
                    
                    // Insert before logout button if it exists
                    const existingLogout = navbarActions.querySelector('#logoutLink');
                    if (existingLogout) {
                        navbarActions.insertBefore(dashboardBtn, existingLogout);
                    } else {
                        navbarActions.appendChild(dashboardBtn);
                    }
                }
            }
            
            // Update user greeting if exists
            const userGreeting = document.querySelector('#userGreeting');
            if (userGreeting) {
                userGreeting.textContent = `Welcome, ${currentUser.firstName}!`;
                userGreeting.style.display = 'block';
            }
            
        } else {
            // User is not logged in
            // Show login/signup links
            if (loginLink) loginLink.style.display = 'block';
            if (signupLink) signupLink.style.display = 'block';
            
            // Show "Get Started" buttons
            if (getStartedLink) {
                getStartedLink.style.display = 'block';
            }
            
            // Hide track shipment for non-logged in users
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
            
            // Hide user greeting
            const userGreeting = document.querySelector('#userGreeting');
            if (userGreeting) {
                userGreeting.style.display = 'none';
            }
        }
        
        // Add user info to booking link if user is logged in
        if (bookLink && isLoggedIn && currentUser) {
            bookLink.title = `Book a shipment as ${currentUser.firstName}`;
        }
    },
    
    // Protect specific pages
    protectPage: function() {
        const currentPage = window.location.pathname;
        
        // Pages that require authentication
        const protectedPages = {
            '/track.html': { require: 'loggedIn', redirect: 'login.html' },
            '/booking.html': { require: 'loggedIn', redirect: 'login.html' },
            '/dashboard.html': { require: 'admin', redirect: 'index.html' },
            '/public/dashboard.html': { require: 'admin', redirect: 'index.html' },
            '/profile.html': { require: 'loggedIn', redirect: 'login.html' }
        };
        
        // Check if current page is protected
        const pageRules = protectedPages[currentPage];
        if (pageRules) {
            switch (pageRules.require) {
                case 'loggedIn':
                    if (!this.isLoggedIn()) {
                        sessionStorage.setItem(this.config.sessionStorageKeys.intendedPage, window.location.href);
                        window.location.href = pageRules.redirect;
                        return false;
                    }
                    break;
                    
                case 'admin':
                    if (!this.isAdmin()) {
                        window.location.href = pageRules.redirect;
                        return false;
                    }
                    break;
                    
                case 'customer':
                    if (!this.isCustomer()) {
                        window.location.href = pageRules.redirect;
                        return false;
                    }
                    break;
            }
        }
        
        return true;
    },
    
    // Initialize authentication on page load
    init: function() {
        // Protect the page if needed
        this.protectPage();
        
        // Update navbar
        this.updateNavbar();
        
        // Add logout event listener if logout button exists
        const logoutLink = document.querySelector('#logoutLink');
        if (logoutLink) {
            logoutLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }
        
        // Add session timeout check
        this.checkSessionTimeout();
        
        // Add user info to page if logged in
        this.displayUserInfo();
    },
    
    // Check for session timeout
    checkSessionTimeout: function() {
        if (this.isLoggedIn()) {
            const lastLogin = localStorage.getItem(this.config.localStorageKeys.lastLogin);
            const lastLoginTime = new Date(lastLogin);
            const now = new Date();
            const timeSinceLastLogin = now - lastLoginTime;
            const timeLeft = this.config.sessionTimeout - timeSinceLastLogin;
            
            // Show warning 5 minutes before timeout
            if (timeLeft < 5 * 60 * 1000 && timeLeft > 0) {
                this.showSessionWarning(timeLeft);
            }
        }
    },
    
    // Show session timeout warning
    showSessionWarning: function(timeLeft) {
        if (window.Components && typeof window.Components.showAlert === 'function') {
            const minutes = Math.ceil(timeLeft / (60 * 1000));
            window.Components.showAlert(
                `Your session will expire in ${minutes} minute${minutes !== 1 ? 's' : ''}. Please save your work.`,
                'warning'
            );
        }
    },
    
    // Display user information on the page
    displayUserInfo: function() {
        const currentUser = this.getCurrentUser();
        
        if (currentUser) {
            // Update any elements with user data
            const userElements = document.querySelectorAll('[data-user-field]');
            userElements.forEach(element => {
                const field = element.getAttribute('data-user-field');
                if (currentUser[field]) {
                    element.textContent = currentUser[field];
                }
            });
            
            // Update any elements with user name
            const nameElements = document.querySelectorAll('[data-user-name]');
            nameElements.forEach(element => {
                element.textContent = currentUser.firstName || 'User';
            });
            
            // Update any elements with user email
            const emailElements = document.querySelectorAll('[data-user-email]');
            emailElements.forEach(element => {
                element.textContent = currentUser.email;
                if (element.tagName === 'A' && element.href.startsWith('mailto:')) {
                    element.href = `mailto:${currentUser.email}`;
                }
            });
        }
    },
    
    // Get user's full name
    getFullName: function() {
        const user = this.getCurrentUser();
        if (user) {
            return `${user.firstName} ${user.lastName}`.trim();
        }
        return null;
    },
    
    // Get user's initials for avatar
    getInitials: function() {
        const user = this.getCurrentUser();
        if (user) {
            const first = user.firstName ? user.firstName.charAt(0).toUpperCase() : '';
            const last = user.lastName ? user.lastName.charAt(0).toUpperCase() : '';
            return first + last;
        }
        return 'U';
    },
    
    // Check if user has permission for a specific action
    hasPermission: function(permission) {
        const user = this.getCurrentUser();
        if (!user) return false;
        
        // Define permission roles
        const permissions = {
            'view_tracking': ['customer', 'admin'],
            'create_booking': ['customer', 'admin'],
            'manage_users': ['admin'],
            'view_reports': ['admin'],
            'manage_shipments': ['admin']
        };
        
        const allowedRoles = permissions[permission] || [];
        return allowedRoles.includes(user.role);
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    Auth.init();
    
    // Add auth-related CSS styles
    const style = document.createElement('style');
    style.textContent = `
        /* Auth-related styles */
        .auth-hidden {
            display: none !important;
        }
        
        .auth-visible {
            display: block !important;
        }
        
        .logged-in-only {
            display: none;
        }
        
        .logged-out-only {
            display: block;
        }
        
        body.logged-in .logged-in-only {
            display: block;
        }
        
        body.logged-in .logged-out-only {
            display: none;
        }
        
        /* User avatar */
        .user-avatar {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background-color: var(--primary);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 14px;
        }
        
        /* User dropdown */
        .user-dropdown {
            position: relative;
            display: inline-block;
        }
        
        .user-dropdown-content {
            display: none;
            position: absolute;
            right: 0;
            top: 100%;
            background-color: white;
            min-width: 200px;
            box-shadow: var(--shadow-lg);
            border-radius: var(--radius);
            z-index: 1000;
            padding: 0.5rem 0;
        }
        
        .user-dropdown:hover .user-dropdown-content {
            display: block;
        }
        
        .user-dropdown-item {
            display: block;
            padding: 0.75rem 1rem;
            color: var(--gray-700);
            text-decoration: none;
            transition: background-color 0.2s;
        }
        
        .user-dropdown-item:hover {
            background-color: var(--gray-100);
            color: var(--primary);
        }
        
        .user-dropdown-divider {
            height: 1px;
            background-color: var(--gray-200);
            margin: 0.5rem 0;
        }
    `;
    document.head.appendChild(style);
    
    // Add logged-in class to body if user is logged in
    if (Auth.isLoggedIn()) {
        document.body.classList.add('logged-in');
    }
});

// Export for use in other files
window.Auth = Auth;