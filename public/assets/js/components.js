// Components JavaScript
class Components {
    static init() {
        this.initNavbar();
        this.initSidebar();
        this.initAuth();
    }

    static initNavbar() {
        // Mobile menu toggle
        const navbarToggle = document.querySelector('.navbar-toggle');
        const navbarMenu = document.querySelector('.navbar-menu');
        
        if (navbarToggle && navbarMenu) {
            navbarToggle.addEventListener('click', () => {
                navbarMenu.classList.toggle('active');
            });
        }

        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.navbar') && navbarMenu) {
                navbarMenu.classList.remove('active');
            }
        });

        // Set active nav link
        this.setActiveNavLink();
    }

    static initSidebar() {
        const sidebarToggle = document.querySelector('.sidebar-toggle');
        const sidebar = document.querySelector('.sidebar');
        
        if (sidebarToggle && sidebar) {
            sidebarToggle.addEventListener('click', () => {
                sidebar.classList.toggle('active');
            });
        }

        // Set active sidebar link
        this.setActiveSidebarLink();
    }

    static initAuth() {
        // Check if user is logged in
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        
        // Update UI based on auth state
        this.updateAuthUI(currentUser);
    }

    static setActiveNavLink() {
        const currentPage = window.location.pathname.split('/').pop();
        const navLinks = document.querySelectorAll('.navbar-link');
        
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href === currentPage) {
                link.classList.add('active');
            }
        });
    }

    static setActiveSidebarLink() {
        const currentPage = window.location.pathname.split('/').pop();
        const sidebarLinks = document.querySelectorAll('.sidebar-link');
        
        sidebarLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href === currentPage) {
                link.classList.add('active');
            }
        });
    }

    static updateAuthUI(user) {
        const loginBtn = document.querySelector('.btn-outline');
        const getStartedBtn = document.querySelector('.btn-primary');
        const userMenu = document.getElementById('userMenu');
        
        if (user) {
            // User is logged in
            if (loginBtn) loginBtn.style.display = 'none';
            if (getStartedBtn) getStartedBtn.textContent = 'Dashboard';
            if (getStartedBtn) getStartedBtn.href = 'dashboard.html';
            
            if (userMenu) {
                userMenu.style.display = 'block';
                userMenu.querySelector('.user-name').textContent = user.name;
            }
        } else {
            // User is not logged in
            if (loginBtn) loginBtn.style.display = 'block';
            if (getStartedBtn) getStartedBtn.textContent = 'Get Started';
            if (getStartedBtn) getStartedBtn.href = 'register.html';
            
            if (userMenu) {
                userMenu.style.display = 'none';
            }
        }
    }

    static showAlert(message, type = 'info') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.innerHTML = `
            <div class="d-flex justify-between align-center">
                <span>${message}</span>
                <button class="btn btn-sm" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        document.body.insertBefore(alertDiv, document.body.firstChild);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }

    static confirmDialog(message, callback) {
        const dialog = document.createElement('div');
        dialog.className = 'modal';
        dialog.innerHTML = `
            <div class="modal-content">
                <h3>Confirm Action</h3>
                <p>${message}</p>
                <div class="modal-actions">
                    <button class="btn btn-outline" id="cancelBtn">Cancel</button>
                    <button class="btn btn-danger" id="confirmBtn">Confirm</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        document.getElementById('cancelBtn').onclick = () => {
            dialog.remove();
        };
        
        document.getElementById('confirmBtn').onclick = () => {
            callback();
            dialog.remove();
        };
    }

    static formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    static formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }
}

// Initialize components when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    Components.init();
});

// API Service
class ApiService {
    static BASE_URL = 'http://localhost:3000/api';
    
    static async request(endpoint, method = 'GET', data = null) {
        const url = `${this.BASE_URL}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json'
        };
        
        // Add auth token if available
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (currentUser && currentUser.token) {
            headers['Authorization'] = `Bearer ${currentUser.token}`;
        }
        
        const config = {
            method,
            headers,
            body: data ? JSON.stringify(data) : null
        };
        
        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        }
    }
    
    // Auth endpoints
    static async login(email, password) {
        return this.request('/auth/login', 'POST', { email, password });
    }
    
    static async register(userData) {
        return this.request('/auth/register', 'POST', userData);
    }
    
    static async logout() {
        localStorage.removeItem('currentUser');
    }
    
    // Truck endpoints
    static async getTrucks() {
        return this.request('/trucks');
    }
    
    static async createTruck(truck) {
        return this.request('/trucks', 'POST', truck);
    }
    
    static async updateTruck(id, truck) {
        return this.request(`/trucks/${id}`, 'PUT', truck);
    }
    
    static async deleteTruck(id) {
        return this.request(`/trucks/${id}`, 'DELETE');
    }
    
    // Driver endpoints
    static async getDrivers() {
        return this.request('/drivers');
    }
    
    static async createDriver(driver) {
        return this.request('/drivers', 'POST', driver);
    }
    
    // Booking endpoints
    static async getBookings() {
        return this.request('/bookings');
    }
    
    static async createBooking(booking) {
        return this.request('/bookings', 'POST', booking);
    }
    
    static async updateBooking(id, booking) {
        return this.request(`/bookings/${id}`, 'PUT', booking);
    }
    
    // Trip endpoints
    static async getTrips() {
        return this.request('/trips');
    }
    
    static async trackShipment(trackingNumber) {
        return this.request(`/trips?trackingNumber=${trackingNumber}`);
    }
    
    // Analytics endpoints
    static async getAnalytics() {
        return this.request('/analytics');
    }
}