// Analytics Dashboard Functionality

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

// Global variables
let charts = {};
let currentDateRange = '30';
let analyticsData = {};

// Initialize Analytics Dashboard
document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication first
    if (!await checkAuth()) {
        window.location.href = 'login.html';
        return;
    }
    
    initAnalytics();
    await loadAnalyticsData();
    await initAllCharts();
    await loadAnalyticsTables();
    await loadNotifications();
});

// Check authentication
async function checkAuth() {
    try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        
        if (!currentUser || isLoggedIn !== 'true') {
            return false;
        }
        
        return true;
        
    } catch (error) {
        console.error('Auth check error:', error);
        return false;
    }
}

// Initialize Analytics Components
function initAnalytics() {
    // Sidebar Toggle
    const sidebarToggle = document.getElementById('sidebarToggle');
    const navbarToggle = document.getElementById('navbarToggle');
    const adminSidebar = document.getElementById('adminSidebar');
    
    sidebarToggle?.addEventListener('click', () => {
        adminSidebar.classList.toggle('active');
    });
    
    navbarToggle?.addEventListener('click', () => {
        adminSidebar.classList.toggle('active');
    });

    // Notifications Dropdown
    const notificationBtn = document.getElementById('notificationBtn');
    const notificationDropdown = document.getElementById('notificationDropdown');
    const markReadBtn = notificationDropdown?.querySelector('.mark-read');
    
    notificationBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        notificationDropdown.classList.toggle('active');
    });
    
    markReadBtn?.addEventListener('click', markAllNotificationsRead);

    // User Dropdown
    const userDropdown = document.getElementById('userDropdown');
    const userBtn = userDropdown?.querySelector('.user-btn');
    const adminLogoutBtn = document.getElementById('adminLogoutBtn');
    
    userBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        const dropdownMenu = userDropdown.querySelector('.dropdown-menu');
        dropdownMenu.classList.toggle('active');
        notificationDropdown.classList.remove('active');
    });
    
    adminLogoutBtn?.addEventListener('click', handleLogout);

    // Close dropdowns when clicking outside
    document.addEventListener('click', () => {
        notificationDropdown?.classList.remove('active');
        userDropdown?.querySelector('.dropdown-menu')?.classList.remove('active');
    });

    // Filters
    const dateRangeSelect = document.getElementById('dateRange');
    const applyFiltersBtn = document.getElementById('applyFilters');
    const metricsSelect = document.getElementById('metricsSelect');
    const customDateRange = document.getElementById('customDateRange');
    
    dateRangeSelect.addEventListener('change', function() {
        if (this.value === 'custom') {
            customDateRange.style.display = 'flex';
        } else {
            customDateRange.style.display = 'none';
        }
    });
    
    applyFiltersBtn.addEventListener('click', async function() {
        await applyFilters();
    });
    
    metricsSelect.addEventListener('change', async function() {
        await updateChartsVisibility();
    });

    // Search
    const searchInput = document.getElementById('searchAnalytics');
    searchInput.addEventListener('input', debounce(handleSearch, 300));

    // Export buttons
    const exportAnalyticsBtn = document.getElementById('exportAnalytics');
    const exportRevenueBtn = document.getElementById('exportRevenue');
    const exportCustomersBtn = document.getElementById('exportCustomers');
    const exportTrucksBtn = document.getElementById('exportTrucks');
    
    exportAnalyticsBtn.addEventListener('click', exportFullReport);
    exportRevenueBtn.addEventListener('click', () => exportTable('revenue'));
    exportCustomersBtn.addEventListener('click', () => exportTable('customers'));
    exportTrucksBtn.addEventListener('click', () => exportTable('trucks'));

    // Refresh button
    const refreshBtn = document.getElementById('refreshAnalytics');
    refreshBtn.addEventListener('click', refreshAnalytics);

    // Help and Feedback links
    const helpLink = document.getElementById('helpLink');
    const feedbackLink = document.getElementById('feedbackLink');
    
    helpLink.addEventListener('click', showHelp);
    feedbackLink.addEventListener('click', showFeedback);

    // Chart type controls
    document.querySelectorAll('.chart-control-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const chartName = this.dataset.chart;
            const chartType = this.dataset.type;
            changeChartType(chartName, chartType);
        });
    });

    // Set user name
    setUserName();
}

// Set User Name
function setUserName() {
    try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (!currentUser) return;
        
        const userName = document.getElementById('userName');
        const adminName = document.getElementById('adminName');
        
        const name = currentUser.firstName || currentUser.name || 'User';
        if (userName) userName.textContent = name;
        if (adminName) adminName.textContent = name;
        
    } catch (error) {
        console.error('Error setting user name:', error);
    }
}

// Load Analytics Data
async function loadAnalyticsData() {
    try {
        // Show loading state
        showLoading(true);
        
        // Fetch all data
        const [bookings, trucks, drivers, customers, trips, analyticsRes] = await Promise.all([
            fetch(API_ENDPOINTS.BOOKINGS).then(res => res.json()),
            fetch(API_ENDPOINTS.TRUCKS).then(res => res.json()),
            fetch(API_ENDPOINTS.DRIVERS).then(res => res.json()),
            fetch(API_ENDPOINTS.CUSTOMERS).then(res => res.json()),
            fetch(API_ENDPOINTS.TRIPS).then(res => res.json()),
            fetch(API_ENDPOINTS.ANALYTICS).then(res => res.ok ? res.json() : [])
        ]);
        
        // Store data
        analyticsData = {
            bookings,
            trucks,
            drivers,
            customers,
            trips,
            analytics: analyticsRes
        };
        
        // Update KPIs
        await updateKPIs();
        
        // Update last updated time
        document.getElementById('lastUpdated').textContent = new Date().toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
    } catch (error) {
        console.error('Error loading analytics data:', error);
        showNotification('Failed to load analytics data', 'danger');
    } finally {
        showLoading(false);
    }
}

// Show/hide loading state
function showLoading(show) {
    const loadingOverlay = document.querySelector('.loading-overlay') || createLoadingOverlay();
    
    if (show) {
        loadingOverlay.style.display = 'flex';
    } else {
        loadingOverlay.style.display = 'none';
    }
}

function createLoadingOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <p>Loading analytics data...</p>
        </div>
    `;
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(255, 255, 255, 0.9);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    `;
    
    const spinnerStyle = document.createElement('style');
    spinnerStyle.textContent = `
        .loading-spinner {
            text-align: center;
        }
        .spinner {
            width: 50px;
            height: 50px;
            border: 5px solid #f3f3f3;
            border-top: 5px solid #3498db;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(spinnerStyle);
    document.body.appendChild(overlay);
    
    return overlay;
}

// Update KPIs
async function updateKPIs() {
    const { bookings, trucks, drivers, customers, trips } = analyticsData;
    
    // Calculate KPIs
    const totalRevenue = bookings.reduce((sum, booking) => sum + (booking.amount || 0), 0);
    const totalBookings = bookings.length;
    const avgBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;
    
    // Calculate trends (simplified - in real app, compare with previous period)
    const revenueTrend = calculateTrend(totalRevenue, 120000); // Example comparison
    const bookingsTrend = calculateTrend(totalBookings, 150); // Example comparison
    const avgTrend = calculateTrend(avgBookingValue, 850); // Example comparison
    
    // Update DOM
    document.getElementById('kpiRevenue').textContent = `$${totalRevenue.toLocaleString()}`;
    document.getElementById('kpiBookings').textContent = totalBookings.toLocaleString();
    document.getElementById('kpiAvgBooking').textContent = `$${avgBookingValue.toFixed(2)}`;
    
    // Update trends
    updateTrendElement('kpiRevenueChange', revenueTrend);
    updateTrendElement('kpiBookingsChange', bookingsTrend);
    updateTrendElement('kpiAvgBookingChange', avgTrend);
    
    // Customer satisfaction (simulated)
    const satisfaction = 92.5; // This would come from customer feedback data
    const satisfactionTrend = calculateTrend(satisfaction, 90);
    document.getElementById('kpiSatisfaction').textContent = `${satisfaction}%`;
    updateTrendElement('kpiSatisfactionChange', satisfactionTrend, '%');
}

function calculateTrend(current, previous) {
    if (previous === 0) return { value: 100, direction: 'positive' };
    const change = ((current - previous) / previous) * 100;
    return {
        value: Math.abs(change),
        direction: change >= 0 ? 'positive' : 'negative'
    };
}

function updateTrendElement(elementId, trend, suffix = '') {
    const element = document.getElementById(elementId);
    const trendSpan = element.querySelector('.trend');
    
    trendSpan.textContent = `${trend.direction === 'positive' ? '+' : '-'}${trend.value.toFixed(1)}${suffix}`;
    trendSpan.className = `trend ${trend.direction}`;
}

// Initialize all charts
async function initAllCharts() {
    // Revenue Trend Chart
    initRevenueChart();
    
    // Booking Sources Chart
    initBookingSourcesChart();
    
    // Routes Chart
    initRoutesChart();
    
    // Utilization Chart
    initUtilizationChart();
    
    // Driver Performance Chart
    initDriverChart();
}

// Revenue Trend Chart
function initRevenueChart() {
    const ctx = document.getElementById('revenueTrendChart');
    if (!ctx) return;
    
    // Generate sample data based on bookings
    const { bookings } = analyticsData;
    const monthlyData = generateMonthlyRevenueData(bookings);
    
    charts.revenue = new Chart(ctx, {
        type: 'line',
        data: {
            labels: monthlyData.labels,
            datasets: [{
                label: 'Revenue',
                data: monthlyData.revenue,
                borderColor: 'rgb(37, 99, 235)',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: 'rgb(37, 99, 235)',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
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
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: 'var(--gray-600)'
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        color: 'var(--gray-600)',
                        callback: function(value) {
                            return '$' + value.toLocaleString();
                        }
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}

// Booking Sources Chart
function initBookingSourcesChart() {
    const ctx = document.getElementById('bookingSourcesChart');
    if (!ctx) return;
    
    // Sample data - in real app, this would come from analytics
    const sourcesData = {
        labels: ['Website', 'Mobile App', 'Phone', 'Email', 'Partner'],
        data: [45, 30, 15, 5, 5],
        colors: [
            'rgba(37, 99, 235, 0.8)',
            'rgba(16, 185, 129, 0.8)',
            'rgba(245, 158, 11, 0.8)',
            'rgba(139, 92, 246, 0.8)',
            'rgba(239, 68, 68, 0.8)'
        ]
    };
    
    charts.bookingSources = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: sourcesData.labels,
            datasets: [{
                data: sourcesData.data,
                backgroundColor: sourcesData.colors,
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
                        usePointStyle: true,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.label}: ${context.parsed}%`;
                        }
                    }
                }
            },
            cutout: '70%'
        }
    });
}

// Routes Chart
function initRoutesChart() {
    const ctx = document.getElementById('routesChart');
    if (!ctx) return;
    
    // Sample data for top routes
    const routesData = {
        labels: ['NY → CHI', 'LA → SEA', 'MIA → ATL', 'DAL → DEN', 'SFO → PHX'],
        trips: [45, 38, 32, 28, 22],
        revenue: [125000, 98000, 85000, 72000, 58000]
    };
    
    charts.routes = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: routesData.labels,
            datasets: [{
                label: 'Number of Trips',
                data: routesData.trips,
                backgroundColor: 'rgba(37, 99, 235, 0.7)',
                borderColor: 'rgb(37, 99, 235)',
                borderWidth: 1,
                yAxisID: 'y'
            }, {
                label: 'Revenue ($)',
                data: routesData.revenue,
                backgroundColor: 'rgba(16, 185, 129, 0.7)',
                borderColor: 'rgb(16, 185, 129)',
                borderWidth: 1,
                yAxisID: 'y1'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Number of Trips'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Revenue ($)'
                    },
                    grid: {
                        drawOnChartArea: false
                    },
                    ticks: {
                        callback: function(value) {
                            return '$' + (value / 1000) + 'k';
                        }
                    }
                }
            }
        }
    });
}

// Utilization Chart
function initUtilizationChart() {
    const ctx = document.getElementById('utilizationChart');
    if (!ctx) return;
    
    // Sample utilization data
    const utilizationData = {
        labels: ['TRK-001', 'TRK-002', 'TRK-003', 'TRK-004', 'TRK-005'],
        utilization: [92, 88, 95, 76, 40],
        colors: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444']
    };
    
    charts.utilization = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: utilizationData.labels,
            datasets: [{
                data: utilizationData.utilization,
                backgroundColor: utilizationData.colors,
                borderWidth: 0,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Utilization: ${context.parsed.y}%`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            }
        }
    });
}

// Driver Performance Chart
function initDriverChart() {
    const ctx = document.getElementById('driverChart');
    if (!ctx) return;
    
    // Sample driver performance data
    const driverData = {
        labels: ['Driver A', 'Driver B', 'Driver C', 'Driver D', 'Driver E'],
        trips: [42, 38, 35, 32, 28],
        rating: [4.8, 4.7, 4.9, 4.6, 4.5]
    };
    
    charts.driver = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Trips Completed', 'On-time Delivery', 'Customer Rating', 'Safety Score', 'Fuel Efficiency'],
            datasets: [{
                label: 'Top Driver',
                data: [95, 92, 98, 90, 88],
                borderColor: 'rgb(37, 99, 235)',
                backgroundColor: 'rgba(37, 99, 235, 0.2)',
                pointBackgroundColor: 'rgb(37, 99, 235)',
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }, {
                label: 'Average Driver',
                data: [75, 78, 82, 85, 80],
                borderColor: 'rgb(16, 185, 129)',
                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                pointBackgroundColor: 'rgb(16, 185, 129)',
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                }
            },
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            }
        }
    });
}

// Change chart type
function changeChartType(chartName, type) {
    if (charts[chartName]) {
        // Update button states
        document.querySelectorAll(`[data-chart="${chartName}"]`).forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === type);
        });
        
        // Change chart type
        charts[chartName].config.type = type;
        charts[chartName].update();
    }
}

// Update charts visibility based on metrics filter
async function updateChartsVisibility() {
    const metrics = document.getElementById('metricsSelect').value;
    const chartContainers = document.querySelectorAll('.chart-card');
    
    chartContainers.forEach(container => {
        if (metrics === 'all') {
            container.style.display = 'block';
        } else {
            const chartTitle = container.querySelector('h3').textContent.toLowerCase();
            if (
                (metrics === 'revenue' && chartTitle.includes('revenue')) ||
                (metrics === 'bookings' && chartTitle.includes('booking')) ||
                (metrics === 'performance' && (chartTitle.includes('route') || chartTitle.includes('utilization') || chartTitle.includes('driver')))
            ) {
                container.style.display = 'block';
            } else {
                container.style.display = 'none';
            }
        }
    });
}

// Generate monthly revenue data
function generateMonthlyRevenueData(bookings) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const revenueByMonth = {};
    
    // Initialize all months with 0
    months.forEach(month => {
        revenueByMonth[month] = 0;
    });
    
    // Calculate revenue per month
    bookings.forEach(booking => {
        if (booking.createdAt && booking.amount) {
            const date = new Date(booking.createdAt);
            const month = months[date.getMonth()];
            revenueByMonth[month] += booking.amount;
        }
    });
    
    return {
        labels: months,
        revenue: months.map(month => revenueByMonth[month])
    };
}

// Load analytics tables
async function loadAnalyticsTables() {
    await loadRevenueTable();
    await loadCustomersTable();
    await loadTrucksTable();
}

// Load revenue table
async function loadRevenueTable() {
    const { bookings } = analyticsData;
    const tableBody = document.querySelector('#revenueTable tbody');
    tableBody.innerHTML = '';
    
    // Group bookings by month
    const monthlyRevenue = {};
    bookings.forEach(booking => {
        if (booking.createdAt) {
            const date = new Date(booking.createdAt);
            const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            const monthName = date.toLocaleString('default', { month: 'long' });
            
            if (!monthlyRevenue[monthKey]) {
                monthlyRevenue[monthKey] = {
                    month: monthName,
                    bookings: 0,
                    revenue: 0
                };
            }
            
            monthlyRevenue[monthKey].bookings++;
            monthlyRevenue[monthKey].revenue += booking.amount || 0;
        }
    });
    
    // Convert to array and sort by month
    const monthlyData = Object.values(monthlyRevenue).sort((a, b) => {
        return new Date(b.month + ' 1') - new Date(a.month + ' 1');
    });
    
    // Calculate growth (simplified)
    monthlyData.forEach((month, index) => {
        const prevMonth = monthlyData[index + 1];
        const growth = prevMonth ? ((month.revenue - prevMonth.revenue) / prevMonth.revenue * 100) : 0;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${month.month}</td>
            <td>${month.bookings}</td>
            <td>$${month.revenue.toLocaleString()}</td>
            <td>$${Math.round(month.revenue / month.bookings).toLocaleString()}</td>
            <td>
                <span class="trend ${growth >= 0 ? 'positive' : 'negative'}">
                    ${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%
                </span>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// Load customers table
async function loadCustomersTable() {
    const { customers, bookings } = analyticsData;
    const tableBody = document.querySelector('#customersTable tbody');
    tableBody.innerHTML = '';
    
    // Calculate customer stats
    const customerStats = {};
    
    bookings.forEach(booking => {
        const customerEmail = booking.customerEmail;
        if (!customerEmail) return;
        
        if (!customerStats[customerEmail]) {
            customerStats[customerEmail] = {
                name: booking.customerName || 'Unknown',
                bookings: 0,
                totalSpent: 0,
                lastBooking: null
            };
        }
        
        customerStats[customerEmail].bookings++;
        customerStats[customerEmail].totalSpent += booking.amount || 0;
        
        const bookingDate = new Date(booking.createdAt);
        if (!customerStats[customerEmail].lastBooking || 
            bookingDate > customerStats[customerEmail].lastBooking) {
            customerStats[customerEmail].lastBooking = bookingDate;
        }
    });
    
    // Convert to array and sort by total spent
    const topCustomers = Object.values(customerStats)
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 10); // Top 10 customers
    
    topCustomers.forEach(customer => {
        const status = customer.bookings > 5 ? 'VIP' : 
                      customer.bookings > 2 ? 'Regular' : 'New';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${customer.name}</td>
            <td>${customer.bookings}</td>
            <td>$${customer.totalSpent.toLocaleString()}</td>
            <td>${customer.lastBooking ? customer.lastBooking.toLocaleDateString() : 'N/A'}</td>
            <td><span class="badge badge-${status === 'VIP' ? 'primary' : status === 'Regular' ? 'success' : 'warning'}">${status}</span></td>
        `;
        tableBody.appendChild(row);
    });
}

// Load trucks table
async function loadTrucksTable() {
    const { trucks, trips } = analyticsData;
    const tableBody = document.querySelector('#trucksTable tbody');
    tableBody.innerHTML = '';
    
    // Calculate truck stats
    const truckStats = {};
    
    trucks.forEach(truck => {
        truckStats[truck.id] = {
            id: truck.id || truck.truckNumber || 'N/A',
            trips: 0,
            revenue: 0,
            status: truck.status || 'unknown'
        };
    });
    
    trips.forEach(trip => {
        if (trip.truckId && truckStats[trip.truckId]) {
            truckStats[trip.truckId].trips++;
            truckStats[trip.truckId].revenue += trip.revenue || 0;
        }
    });
    
    // Calculate utilization (simplified)
    Object.values(truckStats).forEach(truck => {
        truck.utilization = Math.min(100, (truck.trips * 10) + Math.random() * 30);
    });
    
    // Convert to array and sort by revenue
    const topTrucks = Object.values(truckStats)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10); // Top 10 trucks
    
    topTrucks.forEach(truck => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${truck.id}</td>
            <td>${truck.trips}</td>
            <td>
                <div class="progress-bar" style="height: 6px; margin-bottom: 5px;">
                    <div class="progress-fill" style="width: ${truck.utilization}%"></div>
                </div>
                ${truck.utilization.toFixed(1)}%
            </td>
            <td>$${truck.revenue.toLocaleString()}</td>
            <td>
                <span class="badge badge-${truck.status === 'active' ? 'success' : 
                                           truck.status === 'maintenance' ? 'warning' : 
                                           truck.status === 'inactive' ? 'danger' : 'secondary'}">
                    ${truck.status}
                </span>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// Apply filters
async function applyFilters() {
    showLoading(true);
    
    try {
        const dateRange = document.getElementById('dateRange').value;
        currentDateRange = dateRange;
        
        // In a real app, you would filter the data based on date range
        // For now, we'll just reload the data and update charts
        
        await loadAnalyticsData();
        
        // Update all charts with filtered data
        Object.keys(charts).forEach(chartName => {
            if (charts[chartName]) {
                charts[chartName].destroy();
            }
        });
        
        await initAllCharts();
        
        showNotification('Filters applied successfully', 'success');
        
    } catch (error) {
        console.error('Error applying filters:', error);
        showNotification('Failed to apply filters', 'danger');
    } finally {
        showLoading(false);
    }
}

// Handle search
function handleSearch(event) {
    const searchTerm = event.target.value.toLowerCase();
    
    // Search in tables
    const tables = [
        document.getElementById('revenueTable'),
        document.getElementById('customersTable'),
        document.getElementById('trucksTable')
    ];
    
    tables.forEach(table => {
        if (!table) return;
        
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    });
    
    // Search in insights
    const insights = document.querySelectorAll('.insight-item');
    insights.forEach(insight => {
        const text = insight.textContent.toLowerCase();
        insight.style.display = text.includes(searchTerm) ? '' : 'none';
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

// Export functions
async function exportFullReport() {
    try {
        showNotification('Generating full report...', 'info');
        
        // Create report data
        const reportData = {
            title: 'MizigoSmart Analytics Report',
            generatedAt: new Date().toISOString(),
            filters: {
                dateRange: currentDateRange
            },
            kpis: {
                revenue: document.getElementById('kpiRevenue').textContent,
                bookings: document.getElementById('kpiBookings').textContent,
                avgBooking: document.getElementById('kpiAvgBooking').textContent,
                satisfaction: document.getElementById('kpiSatisfaction').textContent
            },
            insights: await generateInsightsReport()
        };
        
        // Create downloadable file
        const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-report-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification('Report exported successfully!', 'success');
        
    } catch (error) {
        console.error('Error exporting report:', error);
        showNotification('Failed to export report', 'danger');
    }
}

async function exportTable(tableType) {
    try {
        let data = [];
        let filename = '';
        
        switch (tableType) {
            case 'revenue':
                const revenueRows = document.querySelectorAll('#revenueTable tbody tr');
                data = Array.from(revenueRows).map(row => ({
                    month: row.cells[0].textContent,
                    bookings: row.cells[1].textContent,
                    revenue: row.cells[2].textContent,
                    avgBooking: row.cells[3].textContent,
                    growth: row.cells[4].textContent
                }));
                filename = 'revenue-report';
                break;
                
            case 'customers':
                const customerRows = document.querySelectorAll('#customersTable tbody tr');
                data = Array.from(customerRows).map(row => ({
                    customer: row.cells[0].textContent,
                    bookings: row.cells[1].textContent,
                    totalSpent: row.cells[2].textContent,
                    lastBooking: row.cells[3].textContent,
                    status: row.cells[4].textContent
                }));
                filename = 'customers-report';
                break;
                
            case 'trucks':
                const truckRows = document.querySelectorAll('#trucksTable tbody tr');
                data = Array.from(truckRows).map(row => ({
                    truckId: row.cells[0].textContent,
                    trips: row.cells[1].textContent,
                    utilization: row.cells[2].textContent,
                    revenue: row.cells[3].textContent,
                    status: row.cells[4].textContent
                }));
                filename = 'trucks-report';
                break;
        }
        
        // Create CSV content
        const headers = Object.keys(data[0] || {});
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(header => row[header]).join(','))
        ].join('\n');
        
        // Create downloadable file
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification(`${tableType} table exported successfully!`, 'success');
        
    } catch (error) {
        console.error('Error exporting table:', error);
        showNotification('Failed to export table', 'danger');
    }
}

async function generateInsightsReport() {
    const insights = document.querySelectorAll('.insight-item');
    return Array.from(insights).map(insight => ({
        type: insight.classList.contains('positive') ? 'positive' :
              insight.classList.contains('warning') ? 'warning' :
              insight.classList.contains('info') ? 'info' : 'recommendation',
        title: insight.querySelector('h4').textContent,
        description: insight.querySelector('p').textContent
    }));
}

// Refresh analytics
async function refreshAnalytics() {
    const refreshBtn = document.getElementById('refreshAnalytics');
    const icon = refreshBtn.querySelector('i');
    
    // Add spinning animation
    icon.classList.add('fa-spin');
    refreshBtn.disabled = true;
    
    try {
        await loadAnalyticsData();
        showNotification('Analytics refreshed successfully!', 'success');
    } catch (error) {
        console.error('Error refreshing analytics:', error);
        showNotification('Failed to refresh analytics', 'danger');
    } finally {
        // Remove spinning animation
        icon.classList.remove('fa-spin');
        refreshBtn.disabled = false;
    }
}

// Show help modal
function showHelp(e) {
    e.preventDefault();
    alert('Analytics Dashboard Help:\n\n' +
          '1. Use filters to adjust date range and metrics\n' +
          '2. Click on chart type buttons to switch between line and bar charts\n' +
          '3. Hover over charts to see detailed values\n' +
          '4. Export individual tables or full reports\n' +
          '5. Use search to find specific data\n\n' +
          'For more help, contact support@mizigosmart.com');
}

// Show feedback modal
function showFeedback(e) {
    e.preventDefault();
    const feedback = prompt('Please share your feedback about the analytics dashboard:');
    if (feedback) {
        showNotification('Thank you for your feedback!', 'success');
        // In a real app, you would send this feedback to your server
    }
}

// Load notifications
async function loadNotifications() {
    try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (!currentUser) return;
        
        const response = await fetch(`${API_ENDPOINTS.NOTIFICATIONS}?userId=${currentUser.id}&_sort=createdAt&_order=desc&_limit=5`);
        
        if (!response.ok) return;
        
        const notifications = await response.json();
        const notificationList = document.querySelector('.notification-list');
        const notificationBadge = document.querySelector('.notification-badge');
        
        if (!notificationList || !notificationBadge) return;
        
        notificationList.innerHTML = '';
        
        if (notifications.length === 0) {
            notificationList.innerHTML = '<div class="notification-item"><p>No notifications</p></div>';
            notificationBadge.style.display = 'none';
            return;
        }
        
        notifications.forEach(notification => {
            const item = document.createElement('div');
            item.className = `notification-item ${notification.read ? '' : 'unread'}`;
            item.innerHTML = `
                <i class="fas fa-${getNotificationIcon(notification.type)}"></i>
                <div>
                    <p>${notification.title || 'Notification'}</p>
                    <span>${formatTimeAgo(notification.createdAt)}</span>
                </div>
            `;
            notificationList.appendChild(item);
        });
        
        const unreadCount = notifications.filter(n => !n.read).length;
        notificationBadge.textContent = unreadCount;
        notificationBadge.style.display = unreadCount > 0 ? 'flex' : 'none';
        
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

function getNotificationIcon(type) {
    const icons = {
        'booking': 'calendar-check',
        'trip': 'truck',
        'payment': 'dollar-sign',
        'alert': 'exclamation-circle',
        'default': 'info-circle'
    };
    return icons[type] || icons.default;
}

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

// Mark all notifications as read
async function markAllNotificationsRead() {
    try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (!currentUser) return;
        
        const response = await fetch(`${API_ENDPOINTS.NOTIFICATIONS}?userId=${currentUser.id}&read=false`);
        
        if (!response.ok) return;
        
        const notifications = await response.json();
        
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
        document.querySelectorAll('.notification-item.unread').forEach(item => {
            item.classList.remove('unread');
        });
        
        const notificationBadge = document.querySelector('.notification-badge');
        notificationBadge.textContent = '0';
        notificationBadge.style.display = 'none';
        
        showNotification('All notifications marked as read', 'success');
        
    } catch (error) {
        console.error('Error marking notifications as read:', error);
    }
}

// Handle logout
function handleLogout(e) {
    e.preventDefault();
    
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('isLoggedIn');
        window.location.href = 'login.html';
    }
}

// Show notification
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

// Add CSS for notifications
const notificationStyles = `
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
`;

// Inject styles
const styleSheet = document.createElement('style');
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);