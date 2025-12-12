// bookings.js - Bookings Management System with JSON Server

// API Configuration
const API_URL = 'http://localhost:5000/bookings';
const API_ENDPOINTS = {
    USERS: 'http://localhost:5000/users',
    BOOKINGS: 'http://localhost:5000/bookings',
    NOTIFICATIONS: 'http://localhost:5000/notifications'
};

// DOM Elements
const bookingsTableBody = document.getElementById('bookingsTableBody');
const addBookingBtn = document.getElementById('addBookingBtn');
const bookingFormModal = document.getElementById('bookingFormModal');
const bookingDetailsModal = document.getElementById('bookingDetailsModal');
const statusUpdateModal = document.getElementById('statusUpdateModal');
const bulkActionsModal = document.getElementById('bulkActionsModal');
const bookingForm = document.getElementById('bookingForm');
const globalSearch = document.getElementById('globalSearch');
const refreshBookings = document.getElementById('refreshBookings');
const exportBookings = document.getElementById('exportBookings');
const applyFilters = document.getElementById('applyFilters');
const clearFilters = document.getElementById('clearFilters');
const selectAll = document.getElementById('selectAll');
const bulkActionsBtn = document.getElementById('bulkActionsBtn');
const itemsPerPage = document.getElementById('itemsPerPage');

// Navbar Elements
const notificationBtn = document.getElementById('notificationBtn');
const notificationDropdown = document.getElementById('notificationDropdown');
const notificationBadge = notificationBtn?.querySelector('.notification-badge');
const userDropdown = document.getElementById('userDropdown');
const userBtn = userDropdown?.querySelector('.user-btn');
const logoutBtn = document.getElementById('logoutBtn');

// State Variables
let bookings = [];
let filteredBookings = [];
let currentPage = 1;
let itemsPerPageCount = 10;
let selectedBookings = new Set();
let currentBookingId = null;
let isEditing = false;

// Initialize Bookings Page
document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication first
    if (!await checkAuth()) {
        window.location.href = '../login.html';
        return;
    }
    
    initBookingsPage();
    await loadBookings();
    await loadNotifications(); // Load notifications on page load
});

// Check authentication
async function checkAuth() {
    try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        
        if (!currentUser || isLoggedIn !== 'true') {
            showNotification('Please login to access the bookings page', 'warning');
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

// Initialize Bookings Page Components
function initBookingsPage() {
    // Initialize navbar components
    initNavbarComponents();
    
    // Add Booking Button
    addBookingBtn?.addEventListener('click', () => openBookingForm());
    
    // Refresh Button
    refreshBookings?.addEventListener('click', refreshBookingsData);
    
    // Export Button
    exportBookings?.addEventListener('click', exportBookingsData);
    
    // Apply Filters
    applyFilters?.addEventListener('click', applyFiltersToBookings);
    
    // Clear Filters
    clearFilters?.addEventListener('click', clearAllFilters);
    
    // Global Search
    globalSearch?.addEventListener('input', debounce(searchBookings, 300));
    
    // Select All Checkbox
    selectAll?.addEventListener('change', toggleSelectAll);
    
    // Bulk Actions
    bulkActionsBtn?.addEventListener('click', openBulkActionsModal);
    
    // Items Per Page
    itemsPerPage?.addEventListener('change', updateItemsPerPage);
    
    // Form Tabs
    initFormTabs();
    
    // Form Navigation
    initFormNavigation();
    
    // Close modals when clicking outside
    initModalCloseListeners();
    
    // Add session check interval
    setInterval(async () => {
        if (!await checkAuth()) {
            window.location.href = '../login.html';
        }
    }, 300000); // Check every 5 minutes
    
    // Add auto-session expiry check
    checkSessionExpiry();
}

// Initialize Navbar Components
function initNavbarComponents() {
    // Set user name
    setUserName();
    
    // User Dropdown Toggle
    if (userBtn) {
        userBtn.addEventListener('click', toggleUserDropdown);
    }
    
    // Notifications Dropdown Toggle
    if (notificationBtn) {
        notificationBtn.addEventListener('click', toggleNotifications);
    }
    
    // Logout functionality
    initLogout();
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', closeDropdowns);
    
    // Mark all notifications as read button
    const markReadBtn = document.querySelector('.mark-read');
    if (markReadBtn) {
        markReadBtn.addEventListener('click', markAllNotificationsRead);
    }
}

// Toggle User Dropdown
function toggleUserDropdown(e) {
    if (e) e.stopPropagation();
    const dropdownMenu = userDropdown?.querySelector('.dropdown-menu');
    if (dropdownMenu) {
        dropdownMenu.classList.toggle('active');
        // Close notifications if open
        if (notificationDropdown) {
            notificationDropdown.classList.remove('active');
        }
    }
}

// Toggle Notifications Dropdown
function toggleNotifications(e) {
    if (e) e.stopPropagation();
    if (notificationDropdown) {
        notificationDropdown.classList.toggle('active');
        // Close user dropdown if open
        const dropdownMenu = userDropdown?.querySelector('.dropdown-menu');
        if (dropdownMenu) {
            dropdownMenu.classList.remove('active');
        }
    }
}

// Close all dropdowns
function closeDropdowns(e) {
    // Close notifications dropdown
    if (notificationBtn && !notificationBtn.contains(e.target) && 
        notificationDropdown && !notificationDropdown.contains(e.target)) {
        notificationDropdown.classList.remove('active');
    }
    
    // Close user dropdown
    if (userDropdown && !userDropdown.contains(e.target)) {
        const dropdownMenu = userDropdown.querySelector('.dropdown-menu');
        if (dropdownMenu) {
            dropdownMenu.classList.remove('active');
        }
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
        
        const name = currentUser.firstName || currentUser.name || 'User';
        
        if (greetingName) greetingName.textContent = name;
        if (userName) userName.textContent = name;
        if (adminName) adminName.textContent = name;
        
        // Update page title
        document.title = `Bookings | ${name} - MizigoSmart`;
        
    } catch (error) {
        console.error('Error setting user name:', error);
    }
}

// Initialize Logout
function initLogout() {
    // Logout button in dropdown
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Add logout button to navbar if not exists
    const navbarActions = document.querySelector('.navbar-actions');
    if (navbarActions && !document.getElementById('logoutLink')) {
        const logoutLink = document.createElement('a');
        logoutLink.href = "#";
        logoutLink.id = "logoutLink";
        logoutLink.className = "btn btn-outline";
        logoutLink.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
        logoutLink.addEventListener('click', handleLogout);
        navbarActions.appendChild(logoutLink);
    }
}

// Handle Logout
async function handleLogout(e) {
    if (e) e.preventDefault();
    
    // Close any open dropdowns
    const dropdownMenu = userDropdown?.querySelector('.dropdown-menu');
    if (dropdownMenu) dropdownMenu.classList.remove('active');
    if (notificationDropdown) notificationDropdown.classList.remove('active');
    
    // Create custom confirmation modal
    showLogoutConfirmation();
}

// Show Logout Confirmation Modal
function showLogoutConfirmation() {
    // Create modal overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'logout-modal-overlay';
    modalOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        animation: fadeIn 0.2s ease;
    `;
    
    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'logout-modal-content';
    modalContent.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 2rem;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        animation: slideUp 0.3s ease;
    `;
    
    // Modal HTML
    modalContent.innerHTML = `
        <div class="logout-modal-header">
            <h3 style="margin: 0 0 1rem 0; color: #1f2937; font-size: 1.25rem;">
                <i class="fas fa-sign-out-alt" style="color: #ef4444; margin-right: 0.5rem;"></i>
                Confirm Logout
            </h3>
        </div>
        <div class="logout-modal-body">
            <p style="margin: 0 0 1.5rem 0; color: #6b7280; line-height: 1.5;">
                Are you sure you want to logout from your account?
            </p>
        </div>
        <div class="logout-modal-footer" style="display: flex; gap: 0.75rem; justify-content: flex-end;">
            <button class="logout-cancel-btn" style="
                padding: 0.625rem 1.25rem;
                background: #f3f4f6;
                border: 1px solid #d1d5db;
                border-radius: 8px;
                color: #374151;
                cursor: pointer;
                font-weight: 500;
                transition: all 0.2s ease;
            ">
                Cancel
            </button>
            <button class="logout-confirm-btn" style="
                padding: 0.625rem 1.25rem;
                background: #ef4444;
                border: none;
                border-radius: 8px;
                color: white;
                cursor: pointer;
                font-weight: 500;
                transition: all 0.2s ease;
            ">
                <i class="fas fa-sign-out-alt" style="margin-right: 0.5rem;"></i>
                Logout
            </button>
        </div>
    `;
    
    // Append modal to overlay
    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);
    
    // Add styles for animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .logout-cancel-btn:hover {
            background: #e5e7eb !important;
        }
        
        .logout-confirm-btn:hover {
            background: #dc2626 !important;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
        }
    `;
    document.head.appendChild(style);
    
    // Add event listeners
    const cancelBtn = modalOverlay.querySelector('.logout-cancel-btn');
    const confirmBtn = modalOverlay.querySelector('.logout-confirm-btn');
    
    cancelBtn.addEventListener('click', () => {
        modalOverlay.style.animation = 'fadeOut 0.2s ease forwards';
        setTimeout(() => {
            if (modalOverlay.parentNode) {
                modalOverlay.parentNode.removeChild(modalOverlay);
            }
        }, 200);
    });
    
    confirmBtn.addEventListener('click', async () => {
        // Update button state
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging out...';
        confirmBtn.disabled = true;
        cancelBtn.disabled = true;
        
        // Perform logout
        await performLogout();
        
        // Remove modal
        if (modalOverlay.parentNode) {
            modalOverlay.parentNode.removeChild(modalOverlay);
        }
    });
    
    // Close modal when clicking outside
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            modalOverlay.style.animation = 'fadeOut 0.2s ease forwards';
            setTimeout(() => {
                if (modalOverlay.parentNode) {
                    modalOverlay.parentNode.removeChild(modalOverlay);
                }
            }, 200);
        }
    });
    
    // Add fadeOut animation
    const fadeOutStyle = document.createElement('style');
    fadeOutStyle.textContent = `
        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }
    `;
    document.head.appendChild(fadeOutStyle);
}

// Perform the actual logout process
async function performLogout() {
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
            window.location.href = '../login.html';
        }, 1500);
        
    } catch (error) {
        console.error('Error during logout:', error);
        
        // Clear session anyway
        clearSession();
        
        // Redirect to login page
        window.location.href = '../login.html';
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

// Load Notifications
async function loadNotifications() {
    try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        
        if (!currentUser || !notificationDropdown) {
            return;
        }
        
        // Fetch user's notifications
        const response = await fetch(`${API_ENDPOINTS.NOTIFICATIONS}?userId=${currentUser.id}&_sort=createdAt&_order=desc&_limit=10`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch notifications');
        }
        
        const notifications = await response.json();
        const notificationList = notificationDropdown.querySelector('.notification-list');
        
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
            
            if (notificationBadge) {
                notificationBadge.style.display = 'none';
            }
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
            
            // Add click handler to mark as read
            notificationItem.addEventListener('click', () => {
                markNotificationAsRead(notification.id, notificationItem);
            });
            
            notificationList.appendChild(notificationItem);
        });
        
        // Update badge count
        const unreadCount = notifications.filter(n => !n.read).length;
        if (notificationBadge) {
            notificationBadge.textContent = unreadCount;
            notificationBadge.style.display = unreadCount > 0 ? 'flex' : 'none';
        }
        
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

// Format time ago for notifications
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

// Mark notification as read
async function markNotificationAsRead(notificationId, notificationElement) {
    try {
        const response = await fetch(`${API_ENDPOINTS.NOTIFICATIONS}/${notificationId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                read: true,
                updatedAt: new Date().toISOString()
            })
        });
        
        if (response.ok) {
            // Remove unread class
            notificationElement.classList.remove('unread');
            
            // Update badge count
            if (notificationBadge) {
                const currentCount = parseInt(notificationBadge.textContent) || 0;
                const newCount = Math.max(0, currentCount - 1);
                notificationBadge.textContent = newCount;
                notificationBadge.style.display = newCount > 0 ? 'flex' : 'none';
            }
        }
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

// Mark all notifications as read
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
        const unreadNotifications = notificationDropdown?.querySelectorAll('.unread');
        if (unreadNotifications) {
            unreadNotifications.forEach(notification => {
                notification.classList.remove('unread');
            });
        }
        
        if (notificationBadge) {
            notificationBadge.textContent = '0';
            notificationBadge.style.display = 'none';
        }
        
        showNotification('All notifications marked as read', 'success');
        
    } catch (error) {
        console.error('Error marking notifications as read:', error);
        showNotification('Failed to mark notifications as read', 'danger');
    }
}

// Check session expiry
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
            window.location.href = '../login.html';
        }, 2000);
    }
}

// Load Bookings Data from JSON Server
async function loadBookings() {
    try {
        showLoadingState();
        
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        bookings = await response.json();
        
        // Format booking data for display
        bookings = bookings.map(booking => ({
            ...booking,
            id: booking.bookingReference || booking.id,
            customer: booking.userName || booking.pickupName || 'N/A',
            pickup: `${booking.pickupAddress?.town || ''}, ${booking.pickupAddress?.county || ''}`,
            destination: `${booking.deliveryAddress?.town || ''}, ${booking.deliveryAddress?.county || ''}`,
            truckType: booking.shipmentType || 'parcel',
            date: booking.pickupDate ? new Date(booking.pickupDate).toLocaleDateString('en-KE', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
            }) : 'N/A',
            amount: `KES ${booking.amountPaid || booking.estimatedCost || 0}`,
            status: booking.status || 'pending',
            selected: false,
            trackingNumber: booking.trackingNumber,
            createdAt: booking.createdAt,
            updatedAt: booking.updatedAt
        }));
        
        filteredBookings = [...bookings];
        
        updateStats();
        renderBookingsTable();
        setupPagination();
        
    } catch (error) {
        console.error('Error loading bookings:', error);
        showNotification('Failed to load bookings', 'error');
        showEmptyState();
    } finally {
        hideLoadingState();
    }
}

// Update Stats
function updateStats() {
    const total = bookings.length;
    const pending = bookings.filter(b => b.status === 'pending' || b.status === 'pending_payment').length;
    const inProgress = bookings.filter(b => b.status === 'in-transit' || b.status === 'out-for-delivery').length;
    const completed = bookings.filter(b => b.status === 'delivered').length;
    
    document.getElementById('totalBookingsCount').textContent = total;
    document.getElementById('pendingBookings').textContent = pending;
    document.getElementById('inProgressBookings').textContent = inProgress;
    document.getElementById('completedBookings').textContent = completed;
    
    // Update badge in sidebar if exists
    const bookingBadge = document.getElementById('bookingBadge');
    if (bookingBadge) {
        bookingBadge.textContent = total;
    }
}

// Render Bookings Table
function renderBookingsTable() {
    if (!bookingsTableBody) return;
    
    const startIndex = (currentPage - 1) * itemsPerPageCount;
    const endIndex = startIndex + itemsPerPageCount;
    const pageBookings = filteredBookings.slice(startIndex, endIndex);
    
    bookingsTableBody.innerHTML = '';
    
    if (pageBookings.length === 0) {
        showEmptyState();
        return;
    }
    
    pageBookings.forEach(booking => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <input type="checkbox" class="booking-checkbox" 
                       data-id="${booking.id}"
                       ${selectedBookings.has(booking.id) ? 'checked' : ''}>
            </td>
            <td>
                <div class="booking-id-cell">
                    <strong>${booking.id}</strong>
                    ${booking.trackingNumber ? `<br><small class="text-muted">Track: ${booking.trackingNumber}</small>` : ''}
                </div>
            </td>
            <td>${booking.customer}</td>
            <td>${booking.pickup}</td>
            <td>${booking.destination}</td>
            <td>${formatTruckType(booking.truckType)}</td>
            <td>${booking.date}</td>
            <td>${booking.amount}</td>
            <td><span class="status-badge status-${booking.status}">${formatStatus(booking.status)}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn-action btn-view" onclick="viewBookingDetails('${booking.id}')" 
                            title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-action btn-edit" onclick="editBooking('${booking.id}')" 
                            title="Edit Booking">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action btn-delete" onclick="deleteBooking('${booking.id}')" 
                            title="Delete Booking">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        bookingsTableBody.appendChild(row);
    });
    
    // Add event listeners to checkboxes
    document.querySelectorAll('.booking-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', handleBookingSelection);
    });
    
    updateTableInfo();
}

// Format Truck Type (Shipment Type)
function formatTruckType(type) {
    const types = {
        'document': 'Document',
        'parcel': 'Parcel',
        'cargo': 'Cargo',
        'freight': 'Freight',
        'hazardous': 'Hazardous',
        'perishable': 'Perishable'
    };
    return types[type] || type;
}

// Format Status
function formatStatus(status) {
    const statusMap = {
        'pending': 'Pending',
        'pending_payment': 'Pending Payment',
        'paid': 'Paid',
        'processing': 'Processing',
        'in-transit': 'In Transit',
        'out-for-delivery': 'Out for Delivery',
        'delivered': 'Delivered',
        'cancelled': 'Cancelled'
    };
    return statusMap[status] || status;
}

// Update Table Info
function updateTableInfo() {
    const total = filteredBookings.length;
    const start = (currentPage - 1) * itemsPerPageCount + 1;
    const end = Math.min(start + itemsPerPageCount - 1, total);
    
    if (document.getElementById('tableInfo')) {
        document.getElementById('tableInfo').textContent = 
            `Showing ${start}-${end} of ${total} bookings`;
    }
    
    if (document.getElementById('paginationInfo')) {
        const totalPages = Math.ceil(total / itemsPerPageCount);
        document.getElementById('paginationInfo').textContent = 
            `Page ${currentPage} of ${totalPages}`;
    }
    
    updatePaginationButtons();
}

// Setup Pagination
function setupPagination() {
    const totalPages = Math.ceil(filteredBookings.length / itemsPerPageCount);
    renderPageNumbers(totalPages);
    updatePaginationButtons();
    
    // Add event listeners to pagination buttons
    document.getElementById('firstPage')?.addEventListener('click', () => goToPage(1));
    document.getElementById('prevPage')?.addEventListener('click', () => goToPage(currentPage - 1));
    document.getElementById('nextPage')?.addEventListener('click', () => goToPage(currentPage + 1));
    document.getElementById('lastPage')?.addEventListener('click', () => goToPage(totalPages));
}

// Render Page Numbers
function renderPageNumbers(totalPages) {
    const pageNumbersContainer = document.getElementById('pageNumbers');
    if (!pageNumbersContainer) return;
    
    pageNumbersContainer.innerHTML = '';
    
    // Always show first page
    addPageButton(1, pageNumbersContainer);
    
    // Show ellipsis if needed
    if (currentPage > 3) {
        const ellipsis = document.createElement('span');
        ellipsis.textContent = '...';
        pageNumbersContainer.appendChild(ellipsis);
    }
    
    // Show pages around current page
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        addPageButton(i, pageNumbersContainer);
    }
    
    // Show ellipsis if needed
    if (currentPage < totalPages - 2) {
        const ellipsis = document.createElement('span');
        ellipsis.textContent = '...';
        pageNumbersContainer.appendChild(ellipsis);
    }
    
    // Always show last page if there's more than one page
    if (totalPages > 1) {
        addPageButton(totalPages, pageNumbersContainer);
    }
}

function addPageButton(pageNumber, container) {
    const button = document.createElement('button');
    button.className = `page-number ${pageNumber === currentPage ? 'active' : ''}`;
    button.textContent = pageNumber;
    button.addEventListener('click', () => goToPage(pageNumber));
    container.appendChild(button);
}

// Go to Page
function goToPage(page) {
    const totalPages = Math.ceil(filteredBookings.length / itemsPerPageCount);
    
    if (page < 1 || page > totalPages || page === currentPage) return;
    
    currentPage = page;
    renderBookingsTable();
    renderPageNumbers(totalPages);
    updatePaginationButtons();
}

// Update Pagination Buttons
function updatePaginationButtons() {
    const totalPages = Math.ceil(filteredBookings.length / itemsPerPageCount);
    
    const firstPageBtn = document.getElementById('firstPage');
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    const lastPageBtn = document.getElementById('lastPage');
    
    if (firstPageBtn) firstPageBtn.disabled = currentPage === 1;
    if (prevPageBtn) prevPageBtn.disabled = currentPage === 1;
    if (nextPageBtn) nextPageBtn.disabled = currentPage === totalPages;
    if (lastPageBtn) lastPageBtn.disabled = currentPage === totalPages;
}

// Toggle Select All
function toggleSelectAll(e) {
    const isChecked = e.target.checked;
    selectedBookings.clear();
    
    if (isChecked) {
        const startIndex = (currentPage - 1) * itemsPerPageCount;
        const endIndex = startIndex + itemsPerPageCount;
        const pageBookings = filteredBookings.slice(startIndex, endIndex);
        
        pageBookings.forEach(booking => {
            selectedBookings.add(booking.id);
        });
    }
    
    document.querySelectorAll('.booking-checkbox').forEach(checkbox => {
        checkbox.checked = isChecked;
    });
    
    updateBulkActionsButton();
}

// Handle Booking Selection
function handleBookingSelection(e) {
    const bookingId = e.target.dataset.id;
    const isChecked = e.target.checked;
    
    if (isChecked) {
        selectedBookings.add(bookingId);
    } else {
        selectedBookings.delete(bookingId);
    }
    
    // Update select all checkbox
    const allChecked = document.querySelectorAll('.booking-checkbox:checked').length === 
                      document.querySelectorAll('.booking-checkbox').length;
    if (selectAll) selectAll.checked = allChecked;
    
    updateBulkActionsButton();
}

// Update Bulk Actions Button
function updateBulkActionsButton() {
    const bulkBtn = document.getElementById('bulkActionsBtn');
    if (bulkBtn) {
        bulkBtn.disabled = selectedBookings.size === 0;
        bulkBtn.innerHTML = selectedBookings.size === 0 
            ? '<i class="fas fa-cog"></i> Bulk Actions'
            : `<i class="fas fa-cog"></i> Bulk Actions (${selectedBookings.size})`;
    }
}

// Open Bulk Actions Modal
function openBulkActionsModal() {
    if (selectedBookings.size === 0) return;
    
    const modal = document.getElementById('bulkActionsModal');
    const bulkActionSelect = document.getElementById('bulkActionSelect');
    const bulkActionContent = document.getElementById('bulkActionContent');
    const applyBtn = document.getElementById('applyBulkAction');
    
    // Reset form
    bulkActionSelect.value = '';
    bulkActionContent.innerHTML = '';
    applyBtn.disabled = true;
    
    // Show modal
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Handle action selection
    bulkActionSelect.addEventListener('change', function() {
        const action = this.value;
        bulkActionContent.innerHTML = getBulkActionContent(action);
        applyBtn.disabled = !action;
    });
    
    // Apply action
    applyBtn.onclick = () => applyBulkAction(bulkActionSelect.value);
    
    // Cancel action
    document.getElementById('cancelBulkAction').onclick = () => {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    };
}

// Get Bulk Action Content
function getBulkActionContent(action) {
    switch(action) {
        case 'update_status':
            return `
                <div class="bulk-action-field active">
                    <label>New Status</label>
                    <select class="form-select" id="bulkStatus">
                        <option value="pending">Pending</option>
                        <option value="paid">Paid</option>
                        <option value="processing">Processing</option>
                        <option value="in-transit">In Transit</option>
                        <option value="out-for-delivery">Out for Delivery</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>
            `;
        case 'delete':
            return `
                <div class="bulk-action-field active">
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Are you sure you want to delete ${selectedBookings.size} selected bookings? This action cannot be undone.</p>
                    </div>
                </div>
            `;
        default:
            return '';
    }
}

// Apply Bulk Action
async function applyBulkAction(action) {
    const modal = document.getElementById('bulkActionsModal');
    
    try {
        switch(action) {
            case 'update_status':
                const newStatus = document.getElementById('bulkStatus').value;
                await updateBulkStatus(newStatus);
                break;
            case 'delete':
                await deleteBulkBookings();
                break;
        }
        
        showNotification(`Bulk action applied to ${selectedBookings.size} bookings`, 'success');
    } catch (error) {
        console.error('Error applying bulk action:', error);
        showNotification('Failed to apply bulk action', 'error');
    } finally {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Update Bulk Status
async function updateBulkStatus(status) {
    const updates = [];
    
    for (const bookingId of selectedBookings) {
        // Find the original booking data
        const originalBooking = bookings.find(b => b.id === bookingId);
        if (!originalBooking) continue;
        
        // Get the booking ID for JSON Server
        const bookingDbId = bookings.find(b => b.id === bookingId)?.id || bookingId;
        
        // Update via API
        const response = await fetch(`${API_URL}/${bookingDbId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                status: status,
                updatedAt: new Date().toISOString()
            })
        });
        
        if (response.ok) {
            // Update local state
            const booking = bookings.find(b => b.id === bookingId);
            if (booking) {
                booking.status = status;
            }
        }
    }
    
    // Refresh data
    await loadBookings();
    selectedBookings.clear();
    renderBookingsTable();
    updateStats();
}

// Delete Bulk Bookings
async function deleteBulkBookings() {
    if (!confirm(`Are you sure you want to delete ${selectedBookings.size} bookings?`)) {
        return;
    }
    
    try {
        for (const bookingId of selectedBookings) {
            // Get the booking ID for JSON Server
            const bookingDbId = bookings.find(b => b.id === bookingId)?.id || bookingId;
            
            const response = await fetch(`${API_URL}/${bookingDbId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error(`Failed to delete booking ${bookingId}`);
            }
        }
        
        // Refresh data
        await loadBookings();
        selectedBookings.clear();
        renderBookingsTable();
        updateStats();
        setupPagination();
        
    } catch (error) {
        console.error('Error deleting bookings:', error);
        throw error;
    }
}

// View Booking Details
async function viewBookingDetails(bookingId) {
    currentBookingId = bookingId;
    
    try {
        // Find booking in local data first
        let booking = bookings.find(b => b.id === bookingId);
        
        // If not found, fetch from API
        if (!booking) {
            const response = await fetch(`${API_URL}/${bookingId}`);
            if (response.ok) {
                booking = await response.json();
                // Format for display
                booking = {
                    ...booking,
                    id: booking.bookingReference || booking.id,
                    customer: booking.userName || booking.pickupName || 'N/A',
                    pickup: `${booking.pickupAddress?.town || ''}, ${booking.pickupAddress?.county || ''}`,
                    destination: `${booking.deliveryAddress?.town || ''}, ${booking.deliveryAddress?.county || ''}`,
                    truckType: booking.shipmentType || 'parcel',
                    date: booking.pickupDate ? new Date(booking.pickupDate).toLocaleDateString('en-KE', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                    }) : 'N/A',
                    amount: `KES ${booking.amountPaid || booking.estimatedCost || 0}`,
                    status: booking.status || 'pending'
                };
            }
        }
        
        if (!booking) return;
        
        // Update modal with booking details
        updateBookingDetailsModal(booking);
        
        // Show modal
        const modal = document.getElementById('bookingDetailsModal');
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Setup modal buttons
        setupDetailsModalButtons(booking);
        
    } catch (error) {
        console.error('Error loading booking details:', error);
        showNotification('Failed to load booking details', 'error');
    }
}

// Update Booking Details Modal
function updateBookingDetailsModal(booking) {
    // Update basic info
    document.getElementById('detailBookingId').textContent = booking.bookingReference || booking.id;
    document.getElementById('detailBookingAmount').textContent = `KES ${booking.amountPaid || booking.estimatedCost || 0}`;
    
    const statusElement = document.getElementById('detailBookingStatus');
    statusElement.textContent = formatStatus(booking.status);
    statusElement.className = `booking-status status-${booking.status}`;
    
    // Update tracking info
    const trackingElement = document.getElementById('detailTrackingNumber');
    if (trackingElement && booking.trackingNumber) {
        trackingElement.textContent = booking.trackingNumber;
    }
    
    // Update customer info
    document.getElementById('detailCustomerName').textContent = booking.userName || booking.pickupName || 'N/A';
    document.getElementById('detailCustomerPhone').textContent = booking.pickupPhone || booking.pickupContact?.phone || 'N/A';
    document.getElementById('detailCustomerEmail').textContent = booking.userEmail || booking.pickupEmail || 'N/A';
    document.getElementById('detailCustomerCompany').textContent = 'Customer';
    
    // Update pickup info
    document.getElementById('detailPickupAddress').textContent = 
        `${booking.pickupAddress?.street || ''}, ${booking.pickupAddress?.town || ''}, ${booking.pickupAddress?.county || ''}`;
    document.getElementById('detailPickupTime').textContent = 
        booking.pickupDate ? `${new Date(booking.pickupDate).toLocaleDateString('en-KE')} at ${booking.pickupTime || '09:00 AM'}` : 'N/A';
    
    // Update delivery info
    document.getElementById('detailDeliveryAddress').textContent = 
        `${booking.deliveryAddress?.street || ''}, ${booking.deliveryAddress?.town || ''}, ${booking.deliveryAddress?.county || ''}`;
    document.getElementById('detailDeliveryTime').textContent = 
        booking.deliveryDate ? new Date(booking.deliveryDate).toLocaleDateString('en-KE') : 'N/A';
    
    // Update shipment info
    document.getElementById('detailTruckType').textContent = formatTruckType(booking.shipmentType || booking.truckType);
    const weightElement = document.getElementById('detailPackageWeight');
    if (weightElement) {
        weightElement.textContent = `${booking.weight || 0} kg`;
    }
    
    // Update payment info
    const paymentElement = document.getElementById('detailPaymentInfo');
    if (paymentElement) {
        paymentElement.innerHTML = `
            <p><strong>Method:</strong> ${booking.paymentMethod ? booking.paymentMethod.toUpperCase() : 'M-Pesa'}</p>
            <p><strong>Status:</strong> ${booking.paymentStatus || 'pending'}</p>
            ${booking.mpesaTransactionCode ? `<p><strong>Transaction Code:</strong> ${booking.mpesaTransactionCode}</p>` : ''}
        `;
    }
    
    // Update special requirements
    const requirementsElement = document.getElementById('detailSpecialRequirements');
    if (requirementsElement && booking.specialRequirements) {
        const requirements = Array.isArray(booking.specialRequirements) 
            ? booking.specialRequirements
            : [];
        requirementsElement.textContent = requirements.length > 0 
            ? requirements.join(', ')
            : 'None';
    }
}

// Setup Details Modal Buttons
function setupDetailsModalButtons(booking) {
    // Print button
    document.getElementById('printBooking').onclick = () => {
        window.print();
    };
    
    // Track button
    const trackBtn = document.getElementById('trackBooking');
    if (trackBtn && booking.trackingNumber) {
        trackBtn.style.display = 'block';
        trackBtn.onclick = () => {
            window.open(`track.html?tracking=${booking.trackingNumber}`, '_blank');
        };
    } else if (trackBtn) {
        trackBtn.style.display = 'none';
    }
    
    // Update Status button
    document.getElementById('updateStatusBtn').onclick = () => {
        openStatusUpdateModal(booking.id);
    };
    
    // Cancel Booking button
    document.getElementById('cancelBookingBtn').onclick = () => {
        cancelBooking(booking.id);
    };
    
    // Send Invoice button
    const sendInvoiceBtn = document.getElementById('sendInvoice');
    if (sendInvoiceBtn) {
        sendInvoiceBtn.onclick = () => {
            sendInvoice(booking.id);
        };
    }
}

// Send Invoice
async function sendInvoice(bookingId) {
    try {
        // In a real app, this would send an email
        // For now, just show a notification
        showNotification('Invoice sent successfully!', 'success');
    } catch (error) {
        console.error('Error sending invoice:', error);
        showNotification('Failed to send invoice', 'error');
    }
}

// Open Status Update Modal
function openStatusUpdateModal(bookingId) {
    currentBookingId = bookingId;
    
    const modal = document.getElementById('statusUpdateModal');
    const booking = bookings.find(b => b.id === bookingId);
    
    if (booking) {
        document.getElementById('newStatus').value = booking.status;
    }
    
    modal.classList.add('active');
    
    // Save status
    document.getElementById('saveStatusBtn').onclick = async () => {
        const newStatus = document.getElementById('newStatus').value;
        const notes = document.getElementById('statusNotes').value;
        await updateBookingStatus(bookingId, newStatus, notes);
        modal.classList.remove('active');
    };
    
    // Cancel
    document.getElementById('cancelStatusBtn').onclick = () => {
        modal.classList.remove('active');
    };
}

// Update Booking Status
async function updateBookingStatus(bookingId, newStatus, notes) {
    try {
        // Get the booking ID for JSON Server
        const bookingDbId = bookings.find(b => b.id === bookingId)?.id || bookingId;
        
        const response = await fetch(`${API_URL}/${bookingDbId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                status: newStatus,
                updatedAt: new Date().toISOString()
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to update status');
        }
        
        // Update local state
        const booking = bookings.find(b => b.id === bookingId);
        if (booking) {
            booking.status = newStatus;
        }
        
        renderBookingsTable();
        updateStats();
        showNotification('Booking status updated successfully!', 'success');
        
    } catch (error) {
        console.error('Error updating booking status:', error);
        showNotification('Failed to update booking status', 'error');
    }
}

// Cancel Booking
async function cancelBooking(bookingId) {
    if (!confirm('Are you sure you want to cancel this booking?')) {
        return;
    }
    
    try {
        await updateBookingStatus(bookingId, 'cancelled', 'Cancelled by admin');
        
        // Close details modal
        document.getElementById('bookingDetailsModal').classList.remove('active');
        document.body.style.overflow = '';
        
    } catch (error) {
        console.error('Error cancelling booking:', error);
        showNotification('Failed to cancel booking', 'error');
    }
}

// Edit Booking
async function editBooking(bookingId) {
    currentBookingId = bookingId;
    isEditing = true;
    
    try {
        // Find booking in local data first
        let booking = bookings.find(b => b.id === bookingId);
        
        // If not found, fetch from API
        if (!booking) {
            const response = await fetch(`${API_URL}/${bookingId}`);
            if (response.ok) {
                booking = await response.json();
            }
        }
        
        if (!booking) {
            showNotification('Booking not found', 'error');
            return;
        }
        
        // Update form title
        document.getElementById('formModalTitle').textContent = 'Edit Booking';
        
        // Populate form with booking data
        populateBookingForm(booking);
        
        // Open form
        openBookingForm();
        
        // Switch to first tab
        switchFormTab('customer');
        
    } catch (error) {
        console.error('Error loading booking for edit:', error);
        showNotification('Failed to load booking details', 'error');
    }
}

// Populate Booking Form
function populateBookingForm(booking) {
    // Customer Tab
    document.getElementById('customerName').value = booking.userName || booking.pickupName || '';
    document.getElementById('customerPhone').value = booking.pickupPhone || booking.pickupContact?.phone || '';
    document.getElementById('customerEmail').value = booking.userEmail || booking.pickupEmail || '';
    
    // Pickup Tab
    document.getElementById('pickupAddress').value = booking.pickupAddress?.street || '';
    document.getElementById('pickupCounty').value = booking.pickupAddress?.county || '';
    document.getElementById('pickupTown').value = booking.pickupAddress?.town || '';
    if (booking.pickupDate) {
        document.getElementById('pickupDate').value = booking.pickupDate.split('T')[0];
    }
    document.getElementById('pickupTime').value = booking.pickupTime || '09:00';
    document.getElementById('pickupInstructions').value = booking.pickupInstructions || '';
    
    // Delivery Tab
    document.getElementById('deliveryName').value = booking.deliveryName || booking.deliveryContact?.name || '';
    document.getElementById('deliveryPhone').value = booking.deliveryPhone || booking.deliveryContact?.phone || '';
    document.getElementById('deliveryEmail').value = booking.deliveryEmail || '';
    document.getElementById('deliveryAddress').value = booking.deliveryAddress?.street || '';
    document.getElementById('deliveryCounty').value = booking.deliveryAddress?.county || '';
    document.getElementById('deliveryTown').value = booking.deliveryAddress?.town || '';
    if (booking.deliveryDate) {
        document.getElementById('deliveryDate').value = booking.deliveryDate.split('T')[0];
    }
    document.getElementById('deliveryInstructions').value = booking.deliveryInstructions || '';
    
    // Package Tab
    document.getElementById('shipmentType').value = booking.shipmentType || 'parcel';
    document.getElementById('weight').value = booking.weight || 0;
    document.getElementById('length').value = booking.dimensions?.length || 0;
    document.getElementById('width').value = booking.dimensions?.width || 0;
    document.getElementById('height').value = booking.dimensions?.height || 0;
    document.getElementById('value').value = booking.declaredValue || booking.value || 0;
    document.getElementById('description').value = booking.description || '';
    
    // Special requirements checkboxes
    if (booking.specialRequirements) {
        const requirements = Array.isArray(booking.specialRequirements) 
            ? booking.specialRequirements 
            : [];
        document.getElementById('fragile').checked = requirements.includes('fragile');
        document.getElementById('temperature').checked = requirements.includes('temperature');
        document.getElementById('express').checked = requirements.includes('express_delivery');
        document.getElementById('signature').checked = requirements.includes('signature');
    }
    
    // Payment Tab
    document.getElementById('paymentMethod').value = booking.paymentMethod || 'mpesa';
    document.getElementById('paymentStatus').value = booking.paymentStatus || 'pending';
    document.getElementById('bookingStatus').value = booking.status || 'pending';
    document.getElementById('mpesaNumber').value = booking.mpesaNumber || '';
    document.getElementById('mpesaTransactionCode').value = booking.mpesaTransactionCode || '';
    document.getElementById('bookingAmount').value = booking.amountPaid || booking.estimatedCost || 0;
}

// Open Booking Form
function openBookingForm() {
    const modal = document.getElementById('bookingFormModal');
    
    // Reset form if not editing
    if (!isEditing) {
        bookingForm.reset();
        document.getElementById('formModalTitle').textContent = 'Add New Booking';
        currentBookingId = null;
    }
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Initialize Form Tabs
function initFormTabs() {
    const tabs = document.querySelectorAll('.form-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            switchFormTab(tabName);
        });
    });
}

// Switch Form Tab
function switchFormTab(tabName) {
    // Update tabs
    document.querySelectorAll('.form-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.tab === tabName) {
            tab.classList.add('active');
        }
    });
    
    // Update content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
        if (content.id === `${tabName}Tab`) {
            content.classList.add('active');
        }
    });
    
    // Update navigation buttons
    updateFormNavigation(tabName);
}

// Initialize Form Navigation
function initFormNavigation() {
    const nextBtn = document.getElementById('nextTabBtn');
    const prevBtn = document.getElementById('prevTabBtn');
    const submitBtn = document.getElementById('submitBookingBtn');
    
    nextBtn?.addEventListener('click', goToNextTab);
    prevBtn?.addEventListener('click', goToPrevTab);
    submitBtn?.addEventListener('click', submitBookingForm);
}

// Update Form Navigation
function updateFormNavigation(currentTab) {
    const tabs = ['customer', 'pickup', 'delivery', 'package', 'payment'];
    const currentIndex = tabs.indexOf(currentTab);
    const prevBtn = document.getElementById('prevTabBtn');
    const nextBtn = document.getElementById('nextTabBtn');
    const submitBtn = document.getElementById('submitBookingBtn');
    
    // Show/hide previous button
    if (prevBtn) prevBtn.style.display = currentIndex > 0 ? 'inline-flex' : 'none';
    
    // Show next or submit button
    if (currentIndex === tabs.length - 1) {
        if (nextBtn) nextBtn.style.display = 'none';
        if (submitBtn) submitBtn.style.display = 'inline-flex';
    } else {
        if (nextBtn) nextBtn.style.display = 'inline-flex';
        if (submitBtn) submitBtn.style.display = 'none';
    }
}

// Go to Next Tab
function goToNextTab() {
    const tabs = ['customer', 'pickup', 'delivery', 'package', 'payment'];
    const currentTab = document.querySelector('.form-tab.active').dataset.tab;
    const currentIndex = tabs.indexOf(currentTab);
    
    if (currentIndex < tabs.length - 1) {
        switchFormTab(tabs[currentIndex + 1]);
    }
}

// Go to Previous Tab
function goToPrevTab() {
    const tabs = ['customer', 'pickup', 'delivery', 'package', 'payment'];
    const currentTab = document.querySelector('.form-tab.active').dataset.tab;
    const currentIndex = tabs.indexOf(currentTab);
    
    if (currentIndex > 0) {
        switchFormTab(tabs[currentIndex - 1]);
    }
}

// Submit Booking Form
async function submitBookingForm(e) {
    e.preventDefault();
    
    if (!validateBookingForm()) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }
    
    try {
        const formData = getBookingFormData();
        
        if (isEditing) {
            // Update existing booking
            await updateBooking(currentBookingId, formData);
            showNotification('Booking updated successfully!', 'success');
        } else {
            // Create new booking
            await createBooking(formData);
            showNotification('Booking created successfully!', 'success');
        }
        
        // Close modal
        document.getElementById('bookingFormModal').classList.remove('active');
        document.body.style.overflow = '';
        
        // Reset and reload
        isEditing = false;
        await loadBookings();
        
    } catch (error) {
        console.error('Error submitting booking:', error);
        showNotification('Failed to save booking', 'error');
    }
}

// Get Booking Form Data
function getBookingFormData() {
    // Generate tracking number
    const trackingNumber = `MS${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    
    // Generate booking reference
    const bookingReference = `MZ${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    
    // Get current user for createdBy field
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    return {
        // User info
        userName: document.getElementById('customerName').value,
        userEmail: document.getElementById('customerEmail').value,
        
        // Tracking and reference
        trackingNumber: trackingNumber,
        bookingReference: bookingReference,
        
        // Shipment info
        shipmentType: document.getElementById('shipmentType').value,
        weight: parseFloat(document.getElementById('weight').value),
        dimensions: {
            length: parseFloat(document.getElementById('length').value),
            width: parseFloat(document.getElementById('width').value),
            height: parseFloat(document.getElementById('height').value)
        },
        declaredValue: parseFloat(document.getElementById('value').value),
        description: document.getElementById('description').value,
        specialRequirements: getSpecialRequirements(),
        
        // Pickup info
        pickupName: document.getElementById('customerName').value,
        pickupPhone: document.getElementById('customerPhone').value,
        pickupEmail: document.getElementById('customerEmail').value,
        pickupAddress: {
            street: document.getElementById('pickupAddress').value,
            county: document.getElementById('pickupCounty').value,
            town: document.getElementById('pickupTown').value
        },
        pickupDate: document.getElementById('pickupDate').value,
        pickupTime: document.getElementById('pickupTime').value,
        pickupInstructions: document.getElementById('pickupInstructions').value,
        
        // Delivery info
        deliveryName: document.getElementById('deliveryName').value,
        deliveryPhone: document.getElementById('deliveryPhone').value,
        deliveryEmail: document.getElementById('deliveryEmail').value,
        deliveryAddress: {
            street: document.getElementById('deliveryAddress').value,
            county: document.getElementById('deliveryCounty').value,
            town: document.getElementById('deliveryTown').value
        },
        deliveryDate: document.getElementById('deliveryDate').value,
        deliveryInstructions: document.getElementById('deliveryInstructions').value,
        
        // Payment info
        paymentMethod: document.getElementById('paymentMethod').value,
        paymentStatus: document.getElementById('paymentStatus').value,
        mpesaNumber: document.getElementById('mpesaNumber').value,
        mpesaTransactionCode: document.getElementById('mpesaTransactionCode').value,
        estimatedCost: parseFloat(document.getElementById('bookingAmount').value),
        amountPaid: parseFloat(document.getElementById('bookingAmount').value),
        
        // Status
        status: document.getElementById('bookingStatus').value,
        
        // Admin info
        createdBy: currentUser?.id || 'system',
        
        // Timestamps
        createdAt: isEditing ? undefined : new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
}

// Get Special Requirements
function getSpecialRequirements() {
    const requirements = [];
    if (document.getElementById('fragile').checked) requirements.push('fragile');
    if (document.getElementById('temperature').checked) requirements.push('temperature');
    if (document.getElementById('express').checked) requirements.push('express_delivery');
    if (document.getElementById('signature').checked) requirements.push('signature');
    return requirements;
}

// Create Booking
async function createBooking(bookingData) {
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(bookingData)
    });
    
    if (!response.ok) {
        throw new Error('Failed to create booking');
    }
    
    return await response.json();
}

// Update Booking
async function updateBooking(bookingId, bookingData) {
    // Get the booking ID for JSON Server
    const bookingDbId = bookings.find(b => b.id === bookingId)?.id || bookingId;
    
    const response = await fetch(`${API_URL}/${bookingDbId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(bookingData)
    });
    
    if (!response.ok) {
        throw new Error('Failed to update booking');
    }
    
    return await response.json();
}

// Validate Booking Form
function validateBookingForm() {
    const requiredFields = [
        'customerName', 'customerPhone', 'customerEmail',
        'pickupAddress', 'pickupDate', 'pickupTime',
        'deliveryAddress', 'deliveryDate', 'deliveryTime',
        'shipmentType', 'weight', 'value',
        'bookingAmount', 'paymentMethod', 'paymentStatus', 'bookingStatus'
    ];
    
    for (const fieldId of requiredFields) {
        const field = document.getElementById(fieldId);
        if (!field.value.trim()) {
            field.focus();
            return false;
        }
    }
    
    return true;
}

// Delete Booking
async function deleteBooking(bookingId) {
    if (!confirm('Are you sure you want to delete this booking?')) {
        return;
    }
    
    try {
        // Get the booking ID for JSON Server
        const bookingDbId = bookings.find(b => b.id === bookingId)?.id || bookingId;
        
        const response = await fetch(`${API_URL}/${bookingDbId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete booking');
        }
        
        // Remove from local state
        bookings = bookings.filter(booking => booking.id !== bookingId);
        filteredBookings = filteredBookings.filter(booking => booking.id !== bookingId);
        
        renderBookingsTable();
        updateStats();
        setupPagination();
        
        showNotification('Booking deleted successfully!', 'success');
        
    } catch (error) {
        console.error('Error deleting booking:', error);
        showNotification('Failed to delete booking', 'error');
    }
}

// Apply Filters
function applyFiltersToBookings() {
    const statusFilter = Array.from(document.getElementById('statusFilter').selectedOptions)
        .map(option => option.value);
    
    const dateFrom = document.getElementById('dateFrom').value;
    const dateTo = document.getElementById('dateTo').value;
    const customer = document.getElementById('customerFilter').value;
    const truckType = document.getElementById('truckTypeFilter').value;
    const amountFrom = document.getElementById('amountFrom').value;
    const amountTo = document.getElementById('amountTo').value;
    
    filteredBookings = bookings.filter(booking => {
        // Status filter
        if (statusFilter.length > 0 && !statusFilter.includes('all') && 
            !statusFilter.includes(booking.status)) {
            return false;
        }
        
        // Customer filter
        if (customer && !booking.customer.toLowerCase().includes(customer.toLowerCase())) {
            return false;
        }
        
        // Truck type filter
        if (truckType && booking.truckType !== truckType) {
            return false;
        }
        
        // Date filter
        if (dateFrom && booking.createdAt) {
            const bookingDate = new Date(booking.createdAt);
            const filterDate = new Date(dateFrom);
            if (bookingDate < filterDate) return false;
        }
        if (dateTo && booking.createdAt) {
            const bookingDate = new Date(booking.createdAt);
            const filterDate = new Date(dateTo);
            if (bookingDate > filterDate) return false;
        }
        
        // Amount filter
        const amount = parseFloat(booking.amount.replace('KES', '').replace(',', '').trim());
        const amountFromNum = parseFloat(amountFrom);
        const amountToNum = parseFloat(amountTo);
        
        if (amountFrom && !isNaN(amountFromNum) && amount < amountFromNum) {
            return false;
        }
        if (amountTo && !isNaN(amountToNum) && amount > amountToNum) {
            return false;
        }
        
        return true;
    });
    
    currentPage = 1;
    renderBookingsTable();
    setupPagination();
    
    showNotification(`Found ${filteredBookings.length} bookings`, 'info');
}

// Clear All Filters
function clearAllFilters() {
    document.getElementById('statusFilter').value = 'all';
    document.getElementById('dateFrom').value = '';
    document.getElementById('dateTo').value = '';
    document.getElementById('customerFilter').value = '';
    document.getElementById('truckTypeFilter').value = '';
    document.getElementById('amountFrom').value = '';
    document.getElementById('amountTo').value = '';
    
    filteredBookings = [...bookings];
    currentPage = 1;
    renderBookingsTable();
    setupPagination();
}

// Search Bookings
function searchBookings() {
    const searchTerm = globalSearch.value.toLowerCase().trim();
    
    if (!searchTerm) {
        filteredBookings = [...bookings];
    } else {
        filteredBookings = bookings.filter(booking =>
            booking.id.toLowerCase().includes(searchTerm) ||
            booking.customer.toLowerCase().includes(searchTerm) ||
            booking.pickup.toLowerCase().includes(searchTerm) ||
            booking.destination.toLowerCase().includes(searchTerm) ||
            booking.truckType.toLowerCase().includes(searchTerm) ||
            (booking.trackingNumber && booking.trackingNumber.toLowerCase().includes(searchTerm))
        );
    }
    
    currentPage = 1;
    renderBookingsTable();
    setupPagination();
}

// Export Bookings Data
function exportBookingsData() {
    const dataToExport = filteredBookings.map(booking => ({
        'Booking ID': booking.id,
        'Tracking Number': booking.trackingNumber || 'N/A',
        'Customer': booking.customer,
        'Pickup Location': booking.pickup,
        'Destination': booking.destination,
        'Shipment Type': formatTruckType(booking.truckType),
        'Date': booking.date,
        'Amount': booking.amount,
        'Status': formatStatus(booking.status),
        'Created Date': booking.createdAt ? new Date(booking.createdAt).toLocaleDateString('en-KE') : 'N/A',
        'Updated Date': booking.updatedAt ? new Date(booking.updatedAt).toLocaleDateString('en-KE') : 'N/A'
    }));
    
    // Convert to CSV
    const csv = convertToCSV(dataToExport);
    
    // Create download link
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookings-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('Bookings exported successfully!', 'success');
}

// Convert to CSV
function convertToCSV(data) {
    const headers = Object.keys(data[0]);
    const rows = data.map(obj => headers.map(header => `"${obj[header]}"`).join(','));
    return [headers.join(','), ...rows].join('\n');
}

// Refresh Bookings Data
function refreshBookingsData() {
    const refreshBtn = refreshBookings;
    const icon = refreshBtn.querySelector('i');
    
    icon.classList.add('fa-spin');
    refreshBtn.disabled = true;
    
    // Load fresh data
    loadBookings().finally(() => {
        icon.classList.remove('fa-spin');
        refreshBtn.disabled = false;
        showNotification('Bookings refreshed successfully!', 'success');
    });
}

// Update Items Per Page
function updateItemsPerPage(e) {
    itemsPerPageCount = parseInt(e.target.value);
    currentPage = 1;
    renderBookingsTable();
    setupPagination();
}

// Show Loading State
function showLoadingState() {
    if (bookingsTableBody) {
        bookingsTableBody.innerHTML = `
            <tr>
                <td colspan="10">
                    <div class="loading" style="height: 200px;"></div>
                </td>
            </tr>
        `;
    }
}

// Show Empty State
function showEmptyState() {
    if (bookingsTableBody) {
        bookingsTableBody.innerHTML = `
            <tr>
                <td colspan="10">
                    <div class="empty-state">
                        <i class="fas fa-calendar-times"></i>
                        <h4>No Bookings Found</h4>
                        <p>Try adjusting your filters or search criteria</p>
                        <button class="btn btn-primary" onclick="clearAllFilters()">
                            <i class="fas fa-times"></i> Clear Filters
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }
}

// Hide Loading State
function hideLoadingState() {
    // Loading state is removed when rendering table
}

// Initialize Modal Close Listeners
function initModalCloseListeners() {
    // Close modals when clicking close button
    document.querySelectorAll('.modal-close').forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            modal.classList.remove('active');
            document.body.style.overflow = '';
        });
    });
    
    // Close modals when clicking outside
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    });
}

// Debounce function for search
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Show Notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification-toast notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
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
window.viewBookingDetails = viewBookingDetails;
window.editBooking = editBooking;
window.deleteBooking = deleteBooking;
window.clearAllFilters = clearAllFilters;
window.handleLogout = handleLogout;
window.toggleUserDropdown = toggleUserDropdown;
window.toggleNotifications = toggleNotifications;

// Add CSS for bookings page
document.addEventListener('DOMContentLoaded', function() {
    const style = document.createElement('style');
    style.textContent = `
        /* Status badges */
        .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .status-pending {
            background-color: #fef3c7;
            color: #92400e;
            border: 1px solid #fbbf24;
        }
        
        .status-pending_payment {
            background-color: #fef3c7;
            color: #92400e;
            border: 1px solid #fbbf24;
        }
        
        .status-paid {
            background-color: #dbeafe;
            color: #1e40af;
            border: 1px solid #60a5fa;
        }
        
        .status-processing {
            background-color: #dbeafe;
            color: #1e40af;
            border: 1px solid #60a5fa;
        }
        
        .status-in-transit {
            background-color: #f0f9ff;
            color: #0369a1;
            border: 1px solid #7dd3fc;
        }
        
        .status-out-for-delivery {
            background-color: #f0fdf4;
            color: #166534;
            border: 1px solid #86efac;
        }
        
        .status-delivered {
            background-color: #dcfce7;
            color: #166534;
            border: 1px solid #22c55e;
        }
        
        .status-cancelled {
            background-color: #fee2e2;
            color: #991b1b;
            border: 1px solid #fca5a5;
        }
        
        /* Booking ID cell */
        .booking-id-cell {
            line-height: 1.4;
        }
        
        .booking-id-cell small {
            font-size: 11px;
            opacity: 0.7;
        }
        
        /* Action buttons */
        .action-buttons {
            display: flex;
            gap: 5px;
        }
        
        .btn-action {
            width: 32px;
            height: 32px;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: none;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        
        .btn-view {
            background-color: #dbeafe;
            color: #1d4ed8;
        }
        
        .btn-view:hover {
            background-color: #bfdbfe;
        }
        
        .btn-edit {
            background-color: #f0fdf4;
            color: #16a34a;
        }
        
        .btn-edit:hover {
            background-color: #dcfce7;
        }
        
        .btn-delete {
            background-color: #fee2e2;
            color: #dc2626;
        }
        
        .btn-delete:hover {
            background-color: #fecaca;
        }
        
        /* Modal styles */
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 1000;
            align-items: center;
            justify-content: center;
        }
        
        .modal.active {
            display: flex;
        }
        
        .modal-content {
            background: white;
            border-radius: 12px;
            max-width: 800px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
        }
        
        .modal-header {
            padding: 1.5rem;
            border-bottom: 1px solid #e5e7eb;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .modal-body {
            padding: 1.5rem;
        }
        
        /* Form tabs */
        .form-tabs {
            display: flex;
            border-bottom: 1px solid #e5e7eb;
            margin-bottom: 1.5rem;
        }
        
        .form-tab {
            padding: 0.75rem 1.5rem;
            border: none;
            background: none;
            color: #6b7280;
            cursor: pointer;
            position: relative;
        }
        
        .form-tab.active {
            color: #2563eb;
        }
        
        .form-tab.active::after {
            content: '';
            position: absolute;
            bottom: -1px;
            left: 0;
            right: 0;
            height: 2px;
            background: #2563eb;
        }
        
        .tab-content {
            display: none;
        }
        
        .tab-content.active {
            display: block;
        }
        
        /* Loading state */
        .loading {
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .loading::after {
            content: '';
            width: 40px;
            height: 40px;
            border: 3px solid #e5e7eb;
            border-top-color: #2563eb;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        /* Empty state */
        .empty-state {
            text-align: center;
            padding: 3rem 1rem;
            color: #6b7280;
        }
        
        .empty-state i {
            font-size: 48px;
            color: #d1d5db;
            margin-bottom: 1rem;
        }
        
        .empty-state h4 {
            margin: 0 0 0.5rem 0;
            color: #4b5563;
        }
        
        .empty-state p {
            margin: 0 0 1rem 0;
        }
        
        /* Pagination */
        .pagination {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 1rem;
            border-top: 1px solid #e5e7eb;
        }
        
        .pagination-controls {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .page-number {
            width: 32px;
            height: 32px;
            border: 1px solid #e5e7eb;
            background: white;
            border-radius: 6px;
            cursor: pointer;
        }
        
        .page-number.active {
            background: #2563eb;
            color: white;
            border-color: #2563eb;
        }
        
        /* Bulk actions */
        .bulk-actions {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 1rem;
            background: #f9fafb;
            border-top: 1px solid #e5e7eb;
        }
        
        .bulk-action-field {
            margin-bottom: 1rem;
        }
        
        .bulk-action-field.active {
            display: block;
        }
        
        .bulk-action-field:not(.active) {
            display: none;
        }
        
        /* Notification toast */
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
        
        .notification-error {
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
        
        .notification-close {
            background: none;
            border: none;
            color: #6b7280;
            cursor: pointer;
            padding: 0.25rem;
        }
        
        .fade-out {
            animation: fadeOut 0.3s ease forwards;
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
        
        @keyframes fadeOut {
            to {
                opacity: 0;
                transform: translateX(100%);
            }
        }
        
        /* Navbar dropdowns */
        .dropdown-menu {
            display: none;
            position: absolute;
            top: 100%;
            right: 0;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            min-width: 200px;
            z-index: 1000;
            margin-top: 8px;
        }
        
        .dropdown-menu.active {
            display: block;
            animation: slideDown 0.2s ease;
        }
        
        @keyframes slideDown {
            from {
                opacity: 0;
                transform: translateY(-10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .notification-badge {
            position: absolute;
            top: -5px;
            right: -5px;
            background: #ef4444;
            color: white;
            font-size: 11px;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .notification-item {
            padding: 12px 16px;
            border-bottom: 1px solid #e5e7eb;
            cursor: pointer;
            transition: background 0.2s ease;
        }
        
        .notification-item:hover {
            background: #f9fafb;
        }
        
        .notification-item.unread {
            background: #f0f9ff;
        }
        
        .notification-icon {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 12px;
        }
        
        .notification-icon.booking {
            background: #dbeafe;
            color: #1d4ed8;
        }
        
        .notification-icon.trip {
            background: #dcfce7;
            color: #166534;
        }
        
        .notification-icon.payment {
            background: #fef3c7;
            color: #92400e;
        }
        
        .notification-icon.alert {
            background: #fee2e2;
            color: #991b1b;
        }
        
        .notification-icon.info {
            background: #e0e7ff;
            color: #3730a3;
        }
        
        /* Logout confirmation modal */
        .logout-modal-overlay {
            z-index: 99999;
        }
        
        .logout-modal-content {
            max-width: 400px;
            animation: slideUp 0.3s ease;
        }
        
        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        /* Responsive */
        @media (max-width: 1024px) {
            .action-buttons {
                flex-direction: column;
            }
            
            .btn-action {
                width: 28px;
                height: 28px;
            }
        }
        
        @media (max-width: 768px) {
            .modal-content {
                width: 95%;
            }
            
            .form-tabs {
                overflow-x: auto;
            }
            
            .form-tab {
                white-space: nowrap;
            }
            
            .pagination {
                flex-direction: column;
                gap: 1rem;
            }
            
            .dropdown-menu {
                position: fixed;
                top: 70px;
                right: 10px;
                left: 10px;
                width: auto;
            }
            
            .logout-modal-content {
                width: 95%;
                margin: 0 10px;
            }
        }
    `;
    document.head.appendChild(style);
});

// Add keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + N for new booking
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        openBookingForm();
    }
    
    // Ctrl/Cmd + F for focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        globalSearch?.focus();
    }
    
    // Esc to close modals and dropdowns
    if (e.key === 'Escape') {
        // Close modals
        document.querySelectorAll('.modal.active').forEach(modal => {
            modal.classList.remove('active');
        });
        
        // Close dropdowns
        if (notificationDropdown) notificationDropdown.classList.remove('active');
        const dropdownMenu = userDropdown?.querySelector('.dropdown-menu');
        if (dropdownMenu) dropdownMenu.classList.remove('active');
        
        // Close logout confirmation modal
        const logoutModal = document.querySelector('.logout-modal-overlay');
        if (logoutModal && logoutModal.parentNode) {
            logoutModal.parentNode.removeChild(logoutModal);
        }
        
        document.body.style.overflow = '';
    }
    
    // Alt + L to logout
    if (e.altKey && e.key === 'l') {
        e.preventDefault();
        handleLogout(e);
    }
});

// Add periodic notification refresh
setInterval(() => {
    loadNotifications();
}, 30000); // Refresh notifications every 30 seconds