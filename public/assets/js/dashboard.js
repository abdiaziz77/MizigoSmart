// dashboard.js - Admin Dashboard Functionality

// API Endpoints
const API_ENDPOINTS = {
    USERS: 'http://localhost:5000/users',
    TRUCKS: 'http://localhost:5000/trucks',
    DRIVERS: 'http://localhost:5000/drivers',
    BOOKINGS: 'http://localhost:5000/bookings',
    TRIPS: 'http://localhost:5000/trips',
    CUSTOMERS: 'http://localhost:5000/customers',
    ANALYTICS: 'http://localhost:5000/analytics',
    NOTIFICATIONS: 'http://localhost:5000/notifications'
};

// DOM Elements
const adminSidebar = document.getElementById('adminSidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const navbarToggle = document.getElementById('navbarToggle');
const notificationBtn = document.getElementById('notificationBtn');
const notificationDropdown = document.getElementById('notificationDropdown');
const userDropdown = document.getElementById('userDropdown');
const logoutBtn = document.getElementById('logoutBtn');
const adminLogoutBtn = document.getElementById('adminLogoutBtn');
const quickBookingBtn = document.getElementById('quickBooking');
const quickBookingModal = document.getElementById('quickBookingModal');
const cancelQuickBooking = document.getElementById('cancelQuickBooking');
const quickBookingForm = document.getElementById('quickBookingForm');
const refreshDashboard = document.getElementById('refreshDashboard');
const markReadBtn = document.querySelector('.mark-read');
const recentBookingsTable = document.getElementById('recentBookingsTable');
const activityTimeline = document.getElementById('activityTimeline');
const actionButtons = document.querySelectorAll('.action-btn');

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication first
    if (!await checkAuth()) {
        window.location.href = '/public/login.html';
        return;
    }
    
    initDashboard();
    await loadStats();
    await loadRecentBookings();
    await loadActivityTimeline();
    await loadNotifications();
    initCharts();
});

// Check authentication
async function checkAuth() {
    try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        
        if (!currentUser || isLoggedIn !== 'true') {
            showNotification('Please login to access the dashboard', 'warning');
            return false;
        }
        
        // Check if user is admin
        if (currentUser.role !== 'admin') {
            showNotification('Access denied. Admin privileges required.', 'danger');
            
            // Redirect non-admin users to homepage
            setTimeout(() => {
                window.location.href = '../index.html';
            }, 2000);
            return false;
        }
        
        // Verify user exists in database
        const response = await fetch(`${API_ENDPOINTS.USERS}/${currentUser.id}`);
        
        if (!response.ok) {
            showNotification('User not found in database', 'danger');
            clearSession();
            return false;
        }
        
        const user = await response.json();
        
        // Check if user is active
        if (user.accountStatus && user.accountStatus !== 'active') {
            showNotification('Account is not active. Please contact support.', 'danger');
            clearSession();
            return false;
        }
        
        // Update session with latest user data
        localStorage.setItem('currentUser', JSON.stringify(user));
        
        return true;
        
    } catch (error) {
        console.error('Auth check error:', error);
        
        // Check if JSON Server is running
        if (error.message.includes('Network error') || error.message.includes('Failed to fetch')) {
            showNotification('Cannot connect to server. Please make sure JSON Server is running.', 'danger');
        } else {
            showNotification('Authentication error. Please login again.', 'danger');
        }
        
        clearSession();
        return false;
    }
}

// Clear session data (sync with login.js)
function clearSession() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('lastLogin');
    localStorage.removeItem('rememberedEmail');
    
    // Update navbar state if possible
    try {
        if (typeof LoginPage !== 'undefined' && typeof LoginPage.updateNavbarState === 'function') {
            LoginPage.updateNavbarState();
        }
    } catch (error) {
        console.error('Error updating navbar state:', error);
    }
}

// Initialize Dashboard Components
function initDashboard() {
    // Sidebar Toggle
    sidebarToggle?.addEventListener('click', toggleSidebar);
    navbarToggle?.addEventListener('click', toggleSidebar);

    // Notifications Dropdown
    notificationBtn?.addEventListener('click', toggleNotifications);
    
    // User Dropdown
    const userBtn = userDropdown?.querySelector('.user-btn');
    userBtn?.addEventListener('click', toggleUserDropdown);
    
    // Logout Buttons
    logoutBtn?.addEventListener('click', handleLogout);
    adminLogoutBtn?.addEventListener('click', handleLogout);
    
    // Quick Booking Modal
    quickBookingBtn?.addEventListener('click', () => openModal('quickBookingModal'));
    cancelQuickBooking?.addEventListener('click', () => closeModal('quickBookingModal'));
    
    // Quick Booking Form
    quickBookingForm?.addEventListener('submit', handleQuickBooking);
    
    // Refresh Dashboard
    refreshDashboard?.addEventListener('click', refreshDashboardData);
    
    // Mark all notifications as read
    markReadBtn?.addEventListener('click', markAllNotificationsRead);
    
    // Quick Actions
    actionButtons.forEach(btn => {
        btn.addEventListener('click', handleQuickAction);
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', closeDropdowns);
    
    // Set admin/user name
    setUserName();
    
    // Load user preferences
    loadUserPreferences();
    
    // Add session check interval
    setInterval(async () => {
        if (!await checkAuth()) {
            window.location.href = '/public/login.html';
        }
    }, 300000); // Check every 5 minutes
}

// Toggle Sidebar
function toggleSidebar() {
    adminSidebar.classList.toggle('active');
}

// Toggle Notifications Dropdown
function toggleNotifications(e) {
    e.stopPropagation();
    notificationDropdown.classList.toggle('active');
    userDropdown.querySelector('.dropdown-menu')?.classList.remove('active');
}

// Toggle User Dropdown
function toggleUserDropdown(e) {
    e.stopPropagation();
    const dropdownMenu = userDropdown.querySelector('.dropdown-menu');
    dropdownMenu.classList.toggle('active');
    notificationDropdown.classList.remove('active');
}

// Close all dropdowns
function closeDropdowns(e) {
    if (!notificationBtn?.contains(e.target) && !notificationDropdown?.contains(e.target)) {
        notificationDropdown?.classList.remove('active');
    }
    
    if (!userDropdown?.contains(e.target)) {
        userDropdown?.querySelector('.dropdown-menu')?.classList.remove('active');
    }
}

// Open Modal
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

// Close Modal
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Handle Quick Booking
async function handleQuickBooking(e) {
    e.preventDefault();
    
    try {
        const form = e.target;
        const formData = new FormData(form);
        const bookingData = Object.fromEntries(formData.entries());
        
        // Get current user
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        
        // Validate form data
        if (!bookingData.customerName || !bookingData.customerEmail || !bookingData.pickupAddress || !bookingData.deliveryAddress) {
            showNotification('Please fill in all required fields', 'warning');
            return;
        }
        
        // Generate unique ID
        const bookingId = `BK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Prepare booking object
        const newBooking = {
            id: bookingId,
            bookingNumber: bookingId,
            customerName: bookingData.customerName,
            customerEmail: bookingData.customerEmail,
            customerPhone: bookingData.customerPhone,
            pickupAddress: bookingData.pickupAddress,
            deliveryAddress: bookingData.deliveryAddress,
            shipmentType: bookingData.shipmentType || 'general',
            weight: parseFloat(bookingData.weight) || 0,
            dimensions: bookingData.dimensions || 'N/A',
            pickupDate: bookingData.pickupDate || new Date().toISOString().split('T')[0],
            deliveryDate: bookingData.deliveryDate || '',
            status: 'pending',
            amount: parseFloat(bookingData.amount) || 0,
            paymentStatus: 'pending',
            createdBy: currentUser?.id || 'system',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            notes: bookingData.notes || '',
            documents: []
        };
        
        // Save to JSON Server
        const response = await fetch(API_ENDPOINTS.BOOKINGS, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(newBooking)
        });
        
        if (!response.ok) {
            throw new Error('Failed to create booking');
        }
        
        // Create notification for new booking
        await createNotification({
            title: 'New Booking Created',
            message: `Booking ${bookingId} created for ${bookingData.customerName}`,
            type: 'booking',
            userId: currentUser?.id,
            read: false,
            createdAt: new Date().toISOString()
        });
        
        // Show success message
        showNotification('Booking created successfully!', 'success');
        
        // Reset form and close modal
        form.reset();
        closeModal('quickBookingModal');
        
        // Refresh data
        await loadRecentBookings();
        await updateStats();
        await loadNotifications();
        
    } catch (error) {
        console.error('Error creating booking:', error);
        showNotification('Failed to create booking: ' + error.message, 'danger');
    }
}

// Handle Logout (Sync with login.js)
async function handleLogout(e) {
    e.preventDefault();
    
    // Show confirmation modal instead of alert
    if (confirm('Are you sure you want to logout?')) {
        try {
            const currentUser = JSON.parse(localStorage.getItem('currentUser'));
            
            if (currentUser) {
                // Show loading state
                showNotification('Logging out...', 'info');
                
                // Update last logout time in database
                await updateUserLastLogout(currentUser.id);
            }
            
            // Clear session data
            clearSession();
            
            // Show success message
            showNotification('Logged out successfully', 'success');
            
            // Redirect to login page after a delay
            setTimeout(() => {
                window.location.href = '/public/login.html';
            }, 1500);
            
        } catch (error) {
            console.error('Error during logout:', error);
            
            // Clear session anyway
            clearSession();
            
            // Redirect to login page
            window.location.href = '/public/login.html';
        }
    }
}

// Update user's last logout time
async function updateUserLastLogout(userId) {
    try {
        // Fetch current user data
        const response = await fetch(`${API_ENDPOINTS.USERS}/${userId}`);
        
        if (!response.ok) {
            return;
        }
        
        const user = await response.json();
        
        // Update last logout timestamp
        const updatedUser = {
            ...user,
            lastLogout: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Update in JSON Server
        await fetch(`${API_ENDPOINTS.USERS}/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatedUser)
        });
        
        console.log('User logout time updated');
        
    } catch (error) {
        console.error('Error updating logout time:', error);
    }
}

// Refresh Dashboard Data
async function refreshDashboardData() {
    const refreshBtn = refreshDashboard;
    const icon = refreshBtn.querySelector('i');
    
    // Add spinning animation
    icon.classList.add('fa-spin');
    refreshBtn.disabled = true;
    
    try {
        // Load all data
        await Promise.all([
            loadStats(),
            loadRecentBookings(),
            loadActivityTimeline(),
            loadNotifications(),
            initCharts()
        ]);
        
        showNotification('Dashboard refreshed successfully!', 'success');
        
    } catch (error) {
        console.error('Error refreshing dashboard:', error);
        showNotification('Failed to refresh dashboard', 'danger');
    } finally {
        // Remove spinning animation
        icon.classList.remove('fa-spin');
        refreshBtn.disabled = false;
    }
}

// Mark All Notifications as Read
async function markAllNotificationsRead() {
    try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        
        if (!currentUser) {
            return;
        }
        
        // Fetch user's unread notifications
        const response = await fetch(`${API_ENDPOINTS.NOTIFICATIONS}?userId=${currentUser.id}&read=false`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch notifications');
        }
        
        const notifications = await response.json();
        
        if (notifications.length === 0) {
            showNotification('No unread notifications', 'info');
            return;
        }
        
        // Mark all as read
        const updatePromises = notifications.map(notification => {
            return fetch(`${API_ENDPOINTS.NOTIFICATIONS}/${notification.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    read: true,
                    updatedAt: new Date().toISOString()
                })
            });
        });
        
        await Promise.all(updatePromises);
        
        // Update UI
        const unreadNotifications = notificationDropdown.querySelectorAll('.unread');
        const notificationBadge = notificationBtn.querySelector('.notification-badge');
        
        unreadNotifications.forEach(notification => {
            notification.classList.remove('unread');
        });
        
        notificationBadge.textContent = '0';
        notificationBadge.style.display = 'none';
        
        showNotification('All notifications marked as read', 'success');
        
    } catch (error) {
        console.error('Error marking notifications as read:', error);
        showNotification('Failed to mark notifications as read', 'danger');
    }
}

// Load Dashboard Stats
async function loadStats() {
    try {
        // Fetch data from all endpoints
        const [bookingsRes, trucksRes, driversRes, customersRes] = await Promise.all([
            fetch(API_ENDPOINTS.BOOKINGS),
            fetch(API_ENDPOINTS.TRUCKS),
            fetch(API_ENDPOINTS.DRIVERS),
            fetch(API_ENDPOINTS.CUSTOMERS)
        ]);
        
        if (!bookingsRes.ok || !trucksRes.ok || !driversRes.ok || !customersRes.ok) {
            throw new Error('Failed to fetch stats data');
        }
        
        const bookings = await bookingsRes.json();
        const trucks = await trucksRes.json();
        const drivers = await driversRes.json();
        const customers = await customersRes.json();
        
        // Calculate revenue (sum of all booking amounts)
        const revenue = bookings.reduce((sum, booking) => sum + (booking.amount || 0), 0);
        
        // Filter active trucks and drivers
        const activeTrucks = trucks.filter(truck => truck.status === 'active').length;
        const availableDrivers = drivers.filter(driver => driver.status === 'available').length;
        
        // Update DOM elements
        document.getElementById('revenueAmount').textContent = `$${revenue.toLocaleString()}`;
        document.getElementById('totalBookings').textContent = bookings.length;
        document.getElementById('activeTrucks').textContent = activeTrucks;
        document.getElementById('availableDrivers').textContent = availableDrivers;
        
        // Update badges
        document.getElementById('bookingBadge').textContent = bookings.length;
        
        // Calculate active trips
        const tripsResponse = await fetch(`${API_ENDPOINTS.TRIPS}?status=in_progress`);
        if (tripsResponse.ok) {
            const activeTrips = await tripsResponse.json();
            document.getElementById('tripBadge').textContent = activeTrips.length || 0;
        }
        
    } catch (error) {
        console.error('Error loading stats:', error);
        showNotification('Failed to load dashboard stats', 'danger');
        
        // Set default values
        document.getElementById('revenueAmount').textContent = '$0';
        document.getElementById('totalBookings').textContent = '0';
        document.getElementById('activeTrucks').textContent = '0';
        document.getElementById('availableDrivers').textContent = '0';
    }
}

// Update stats after booking creation
async function updateStats() {
    try {
        // Fetch latest bookings count
        const response = await fetch(API_ENDPOINTS.BOOKINGS);
        
        if (!response.ok) {
            return;
        }
        
        const bookings = await response.json();
        
        // Update count
        const currentCount = parseInt(document.getElementById('totalBookings').textContent);
        const newCount = bookings.length;
        
        if (newCount > currentCount) {
            document.getElementById('totalBookings').textContent = newCount;
            document.getElementById('bookingBadge').textContent = newCount;
        }
        
    } catch (error) {
        console.error('Error updating stats:', error);
    }
}

// Load Recent Bookings
async function loadRecentBookings() {
    try {
        const response = await fetch(`${API_ENDPOINTS.BOOKINGS}?_sort=createdAt&_order=desc&_limit=5`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch bookings');
        }
        
        const bookings = await response.json();
        
        // Clear existing rows
        recentBookingsTable.innerHTML = '';
        
        if (bookings.length === 0) {
            recentBookingsTable.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-gray-500">No bookings found</td>
                </tr>
            `;
            return;
        }
        
        // Add new rows
        bookings.forEach(booking => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${booking.bookingNumber || booking.id}</td>
                <td>${booking.customerName || 'N/A'}</td>
                <td>${booking.pickupAddress?.split(',')[0] || 'N/A'}</td>
                <td>${booking.deliveryAddress?.split(',')[0] || 'N/A'}</td>
                <td><span class="status-badge status-${getStatusClass(booking.status)}">${booking.status || 'pending'}</span></td>
                <td><button class="btn btn-sm btn-outline" onclick="viewBooking('${booking.id}')">View</button></td>
            `;
            recentBookingsTable.appendChild(row);
        });
        
    } catch (error) {
        console.error('Error loading recent bookings:', error);
        recentBookingsTable.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-danger">Failed to load bookings</td>
            </tr>
        `;
    }
}

// Get CSS class for status
function getStatusClass(status) {
    const statusMap = {
        'confirmed': 'confirmed',
        'pending': 'pending',
        'in_transit': 'in-transit',
        'in progress': 'in-transit',
        'delivered': 'delivered',
        'completed': 'delivered',
        'cancelled': 'cancelled'
    };
    
    return statusMap[status?.toLowerCase()] || 'default';
}

// Load Activity Timeline
async function loadActivityTimeline() {
    try {
        // Fetch recent activities (bookings, trips, etc.)
        const [bookingsRes, tripsRes] = await Promise.all([
            fetch(`${API_ENDPOINTS.BOOKINGS}?_sort=createdAt&_order=desc&_limit=3`),
            fetch(`${API_ENDPOINTS.TRIPS}?_sort=createdAt&_order=desc&_limit=2`)
        ]);
        
        if (!bookingsRes.ok || !tripsRes.ok) {
            throw new Error('Failed to fetch activities');
        }
        
        const bookings = await bookingsRes.json();
        const trips = await tripsRes.json();
        
        // Clear existing activities
        activityTimeline.innerHTML = '';
        
        // Process bookings as activities
        bookings.forEach(booking => {
            const activityItem = document.createElement('div');
            activityItem.className = 'activity-item';
            
            activityItem.innerHTML = `
                <div class="activity-icon booking">
                    <i class="fas fa-calendar-check"></i>
                </div>
                <div class="activity-content">
                    <h4>New Booking Created</h4>
                    <p>${booking.bookingNumber || booking.id} - ${booking.customerName || 'Customer'}</p>
                    <span class="activity-time">${formatTimeAgo(booking.createdAt)}</span>
                </div>
            `;
            
            activityTimeline.appendChild(activityItem);
        });
        
        // Process trips as activities
        trips.forEach(trip => {
            const activityItem = document.createElement('div');
            activityItem.className = 'activity-item';
            
            activityItem.innerHTML = `
                <div class="activity-icon trip">
                    <i class="fas fa-truck"></i>
                </div>
                <div class="activity-content">
                    <h4>Trip ${trip.status === 'in_progress' ? 'Started' : 'Updated'}</h4>
                    <p>Trip ${trip.tripNumber || trip.id} - ${trip.status || 'N/A'}</p>
                    <span class="activity-time">${formatTimeAgo(trip.createdAt)}</span>
                </div>
            `;
            
            activityTimeline.appendChild(activityItem);
        });
        
        // Add system activity if no data
        if (bookings.length === 0 && trips.length === 0) {
            activityTimeline.innerHTML = `
                <div class="activity-item">
                    <div class="activity-icon system">
                        <i class="fas fa-info-circle"></i>
                    </div>
                    <div class="activity-content">
                        <h4>Welcome to Dashboard</h4>
                        <p>No recent activities found</p>
                        <span class="activity-time">Just now</span>
                    </div>
                </div>
            `;
        }
        
    } catch (error) {
        console.error('Error loading activity timeline:', error);
        activityTimeline.innerHTML = '<p class="text-center text-danger">Failed to load activities</p>';
    }
}

// Format time ago
function formatTimeAgo(timestamp) {
    if (!timestamp) return 'Recently';
    
    const date = new Date(timestamp);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
}

// Load Notifications
async function loadNotifications() {
    try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        
        if (!currentUser) {
            return;
        }
        
        // Fetch user's notifications
        const response = await fetch(`${API_ENDPOINTS.NOTIFICATIONS}?userId=${currentUser.id}&_sort=createdAt&_order=desc&_limit=5`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch notifications');
        }
        
        const notifications = await response.json();
        const notificationList = notificationDropdown.querySelector('.notification-list');
        const notificationBadge = notificationBtn.querySelector('.notification-badge');
        
        if (!notificationList) {
            return;
        }
        
        // Clear existing notifications
        notificationList.innerHTML = '';
        
        if (notifications.length === 0) {
            notificationList.innerHTML = `
                <div class="notification-item">
                    <div class="notification-content">
                        <p class="notification-message">No notifications</p>
                        <span class="notification-time">All caught up!</span>
                    </div>
                </div>
            `;
            
            notificationBadge.style.display = 'none';
            return;
        }
        
        // Add notifications
        notifications.forEach(notification => {
            const notificationItem = document.createElement('div');
            notificationItem.className = `notification-item ${notification.read ? '' : 'unread'}`;
            
            let iconClass = 'info';
            let icon = 'info-circle';
            
            switch(notification.type) {
                case 'booking':
                    iconClass = 'booking';
                    icon = 'calendar-check';
                    break;
                case 'trip':
                    iconClass = 'trip';
                    icon = 'truck';
                    break;
                case 'payment':
                    iconClass = 'payment';
                    icon = 'dollar-sign';
                    break;
                case 'alert':
                    iconClass = 'alert';
                    icon = 'exclamation-circle';
                    break;
            }
            
            notificationItem.innerHTML = `
                <div class="notification-icon ${iconClass}">
                    <i class="fas fa-${icon}"></i>
                </div>
                <div class="notification-content">
                    <h4 class="notification-title">${notification.title || 'Notification'}</h4>
                    <p class="notification-message">${notification.message || ''}</p>
                    <span class="notification-time">${formatTimeAgo(notification.createdAt)}</span>
                </div>
            `;
            
            notificationList.appendChild(notificationItem);
        });
        
        // Update badge count
        const unreadCount = notifications.filter(n => !n.read).length;
        notificationBadge.textContent = unreadCount;
        notificationBadge.style.display = unreadCount > 0 ? 'flex' : 'none';
        
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

// Create notification
async function createNotification(notificationData) {
    try {
        const response = await fetch(API_ENDPOINTS.NOTIFICATIONS, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(notificationData)
        });
        
        if (!response.ok) {
            throw new Error('Failed to create notification');
        }
        
        return await response.json();
        
    } catch (error) {
        console.error('Error creating notification:', error);
        return null;
    }
}

// Handle Quick Actions
function handleQuickAction(e) {
    const action = e.currentTarget.dataset.action;
    
    switch(action) {
        case 'add-booking':
            openModal('quickBookingModal');
            break;
            
        case 'add-driver':
            window.location.href = 'drivers.html?action=add';
            break;
            
        case 'add-truck':
            window.location.href = 'trucks.html?action=add';
            break;
            
        case 'generate-report':
            generateReport();
            break;
            
        case 'send-notification':
            sendNotification();
            break;
            
        case 'backup-data':
            backupData();
            break;
            
        default:
            console.log('Action not implemented:', action);
    }
}

// Generate Report
async function generateReport() {
    try {
        showNotification('Generating report...', 'info');
        
        // Fetch all data for report
        const [bookings, trucks, drivers, customers, trips] = await Promise.all([
            fetch(API_ENDPOINTS.BOOKINGS).then(res => res.json()),
            fetch(API_ENDPOINTS.TRUCKS).then(res => res.json()),
            fetch(API_ENDPOINTS.DRIVERS).then(res => res.json()),
            fetch(API_ENDPOINTS.CUSTOMERS).then(res => res.json()),
            fetch(API_ENDPOINTS.TRIPS).then(res => res.json())
        ]);
        
        // Create report data
        const reportData = {
            generatedAt: new Date().toISOString(),
            generatedBy: JSON.parse(localStorage.getItem('currentUser'))?.email || 'admin',
            summary: {
                totalBookings: bookings.length,
                totalTrucks: trucks.length,
                totalDrivers: drivers.length,
                totalCustomers: customers.length,
                totalTrips: trips.length,
                activeTrucks: trucks.filter(t => t.status === 'active').length,
                availableDrivers: drivers.filter(d => d.status === 'available').length,
                totalRevenue: bookings.reduce((sum, b) => sum + (b.amount || 0), 0)
            },
            bookings: bookings.map(b => ({
                id: b.id,
                customer: b.customerName,
                status: b.status,
                amount: b.amount,
                createdAt: b.createdAt
            })).slice(0, 20), // Limit to 20 bookings for readability
            recentTrips: trips.slice(0, 10)
        };
        
        // Create downloadable file
        const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dashboard-report-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification('Report generated successfully!', 'success');
        
    } catch (error) {
        console.error('Error generating report:', error);
        showNotification('Failed to generate report', 'danger');
    }
}

// Send Notification
async function sendNotification() {
    const message = prompt('Enter notification message:');
    if (!message) return;
    
    try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        
        const notification = await createNotification({
            title: 'Admin Notification',
            message: message,
            type: 'alert',
            userId: currentUser?.id,
            read: false,
            createdAt: new Date().toISOString()
        });
        
        if (notification) {
            showNotification('Notification sent!', 'success');
            await loadNotifications();
        }
        
    } catch (error) {
        console.error('Error sending notification:', error);
        showNotification('Failed to send notification', 'danger');
    }
}

// Backup Data
async function backupData() {
    try {
        showNotification('Backing up data...', 'info');
        
        // Fetch all data
        const [users, bookings, trucks, drivers, customers, trips, notifications] = await Promise.all([
            fetch(API_ENDPOINTS.USERS).then(res => res.json()),
            fetch(API_ENDPOINTS.BOOKINGS).then(res => res.json()),
            fetch(API_ENDPOINTS.TRUCKS).then(res => res.json()),
            fetch(API_ENDPOINTS.DRIVERS).then(res => res.json()),
            fetch(API_ENDPOINTS.CUSTOMERS).then(res => res.json()),
            fetch(API_ENDPOINTS.TRIPS).then(res => res.json()),
            fetch(API_ENDPOINTS.NOTIFICATIONS).then(res => res.json())
        ]);
        
        const backupData = {
            timestamp: new Date().toISOString(),
            generatedBy: JSON.parse(localStorage.getItem('currentUser'))?.email || 'admin',
            data: {
                users,
                bookings,
                trucks,
                drivers,
                customers,
                trips,
                notifications
            }
        };
        
        // Save to localStorage as backup
        localStorage.setItem('lastBackup', JSON.stringify(backupData));
        
        // Also create downloadable file
        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification('Data backed up successfully!', 'success');
        
    } catch (error) {
        console.error('Error backing up data:', error);
        showNotification('Failed to backup data', 'danger');
    }
}

// Initialize Charts
async function initCharts() {
    try {
        // Fetch bookings for analytics
        const response = await fetch(API_ENDPOINTS.BOOKINGS);
        
        if (!response.ok) {
            await generateChartData();
            return;
        }
        
        const bookings = await response.json();
        
        // Generate monthly revenue data
        const monthlyRevenue = {};
        const statusCount = {};
        
        bookings.forEach(booking => {
            // Monthly revenue
            if (booking.createdAt && booking.amount) {
                const month = new Date(booking.createdAt).toLocaleString('default', { month: 'short' });
                monthlyRevenue[month] = (monthlyRevenue[month] || 0) + booking.amount;
            }
            
            // Status count
            const status = booking.status || 'pending';
            statusCount[status] = (statusCount[status] || 0) + 1;
        });
        
        // Revenue Chart
        const revenueCtx = document.getElementById('revenueChart');
        if (revenueCtx) {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
            const revenueData = months.map(month => monthlyRevenue[month] || 0);
            
            new Chart(revenueCtx, {
                type: 'line',
                data: {
                    labels: months,
                    datasets: [{
                        label: 'Revenue',
                        data: revenueData,
                        borderColor: 'rgb(37, 99, 235)',
                        backgroundColor: 'rgba(37, 99, 235, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            callbacks: {
                                label: function(context) {
                                    return `$${context.parsed.y.toLocaleString()}`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return '$' + value.toLocaleString();
                                }
                            }
                        }
                    }
                }
            });
        }
        
        // Booking Chart
        const bookingCtx = document.getElementById('bookingChart');
        if (bookingCtx) {
            const statusLabels = ['Confirmed', 'Pending', 'In Transit', 'Delivered', 'Cancelled'];
            const statusData = statusLabels.map(label => {
                const key = label.toLowerCase().replace(' ', '_');
                return statusCount[key] || 0;
            });
            
            new Chart(bookingCtx, {
                type: 'doughnut',
                data: {
                    labels: statusLabels,
                    datasets: [{
                        data: statusData,
                        backgroundColor: [
                            'rgba(37, 99, 235, 0.8)',
                            'rgba(245, 158, 11, 0.8)',
                            'rgba(16, 185, 129, 0.8)',
                            'rgba(139, 92, 246, 0.8)',
                            'rgba(239, 68, 68, 0.8)'
                        ],
                        borderWidth: 1,
                        borderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                padding: 20,
                                usePointStyle: true
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = Math.round((context.parsed / total) * 100);
                                    return `${context.label}: ${context.parsed} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        }
        
    } catch (error) {
        console.error('Error initializing charts:', error);
        await generateChartData();
    }
}

// Set User Name
function setUserName() {
    try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        
        if (!currentUser) {
            return;
        }
        
        const greetingName = document.getElementById('greetingName');
        const userName = document.getElementById('userName');
        const adminName = document.getElementById('adminName');
        
        const name = currentUser.firstName || currentUser.name || 'Admin';
        
        if (greetingName) greetingName.textContent = name;
        if (userName) userName.textContent = name;
        if (adminName) adminName.textContent = name;
        
        // Set page title
        document.title = `Dashboard | ${name} - MizigoSmart`;
        
    } catch (error) {
        console.error('Error setting user name:', error);
    }
}

// Load user preferences
async function loadUserPreferences() {
    try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        
        if (!currentUser?.preferences) {
            return;
        }
        
        // Apply theme preference
        if (currentUser.preferences.theme === 'dark') {
            document.body.classList.add('dark-theme');
        }
        
        // Apply language preference (if implemented)
        if (currentUser.preferences.language) {
            // Could implement language switching here
        }
        
    } catch (error) {
        console.error('Error loading preferences:', error);
    }
}

// View Booking Details
function viewBooking(bookingId) {
    window.location.href = `booking-details.html?id=${bookingId}`;
}

// Show Notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification-toast notification-${type}`;
    
    let icon = 'info-circle';
    switch(type) {
        case 'success': icon = 'check-circle'; break;
        case 'danger': icon = 'exclamation-circle'; break;
        case 'warning': icon = 'exclamation-triangle'; break;
    }
    
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${icon}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add to body
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);
    
    // Close button handler
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    });
}

// Make functions available globally
window.viewBooking = viewBooking;
window.openModal = openModal;
window.closeModal = closeModal;
window.checkAuth = checkAuth;

// Add event listener for period select changes
document.querySelectorAll('.chart-period').forEach(select => {
    select.addEventListener('change', async function() {
        try {
            // Reinitialize charts with new period
            await initCharts();
            showNotification(`Chart period updated to ${this.value}`, 'success');
        } catch (error) {
            console.error('Error updating chart period:', error);
        }
    });
});

// Add keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + R to refresh
    if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        refreshDashboardData();
    }
    
    // Esc to close modals
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(modal => {
            modal.classList.remove('active');
        });
        document.body.style.overflow = '';
    }
    
    // Alt + L to logout
    if (e.altKey && e.key === 'l') {
        e.preventDefault();
        handleLogout(e);
    }
});

// Add CSS for notifications and status badges
const additionalStyles = `
    .notification-toast {
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border-radius: 8px;
        padding: 1rem;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        z-index: 9999;
        animation: slideIn 0.3s ease;
        max-width: 350px;
    }
    
    .notification-success {
        border-left: 4px solid #10b981;
    }
    
    .notification-danger {
        border-left: 4px solid #ef4444;
    }
    
    .notification-warning {
        border-left: 4px solid #f59e0b;
    }
    
    .notification-info {
        border-left: 4px solid #3b82f6;
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }
    
    .notification-content i {
        font-size: 1.25rem;
    }
    
    .notification-success .notification-content i {
        color: #10b981;
    }
    
    .notification-danger .notification-content i {
        color: #ef4444;
    }
    
    .notification-warning .notification-content i {
        color: #f59e0b;
    }
    
    .notification-info .notification-content i {
        color: #3b82f6;
    }
    
    .notification-close {
        background: none;
        border: none;
        color: #6b7280;
        cursor: pointer;
        padding: 0.25rem;
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
    
    .fade-out {
        animation: fadeOut 0.3s ease forwards;
    }
    
    @keyframes fadeOut {
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }
    
    .status-badge {
        display: inline-block;
        padding: 0.25rem 0.75rem;
        border-radius: 2rem;
        font-size: 0.75rem;
        font-weight: 500;
    }
    
    .status-confirmed {
        background: rgba(37, 99, 235, 0.1);
        color: rgb(37, 99, 235);
    }
    
    .status-pending {
        background: rgba(245, 158, 11, 0.1);
        color: rgb(245, 158, 11);
    }
    
    .status-in-transit {
        background: rgba(16, 185, 129, 0.1);
        color: rgb(16, 185, 129);
    }
    
    .status-delivered {
        background: rgba(139, 92, 246, 0.1);
        color: rgb(139, 92, 246);
    }
    
    .status-cancelled {
        background: rgba(239, 68, 68, 0.1);
        color: rgb(239, 68, 68);
    }
    
    .status-default {
        background: rgba(107, 114, 128, 0.1);
        color: rgb(107, 114, 128);
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
    
    /* Auth modal styles */
    .auth-modal {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 10000;
        align-items: center;
        justify-content: center;
    }
    
    .auth-modal.active {
        display: flex;
    }
    
    .auth-modal-content {
        background: white;
        padding: 2rem;
        border-radius: 8px;
        max-width: 400px;
        width: 90%;
        text-align: center;
    }
    
    .auth-modal-content h3 {
        margin-bottom: 1rem;
        color: #ef4444;
    }
    
    .auth-modal-content .btn {
        margin-top: 1rem;
    }
`;

// Inject styles
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);

// Add auto-session expiry check
function checkSessionExpiry() {
    const lastLogin = localStorage.getItem('lastLogin');
    if (!lastLogin) return;
    
    const lastLoginTime = new Date(lastLogin);
    const now = new Date();
    const hoursSinceLastLogin = (now - lastLoginTime) / (1000 * 60 * 60);
    
    // Show warning after 23 hours
    if (hoursSinceLastLogin > 23 && hoursSinceLastLogin < 24) {
        showNotification('Your session will expire in 1 hour. Please save your work.', 'warning');
    }
    
    // Auto-logout after 24 hours
    if (hoursSinceLastLogin >= 24) {
        showNotification('Session expired. Please login again.', 'warning');
        setTimeout(() => {
            clearSession();
            window.location.href = '/public/login.html';
        }, 2000);
    }
}

// Check session expiry every minute
setInterval(checkSessionExpiry, 60000);

// Initial session expiry check
checkSessionExpiry();