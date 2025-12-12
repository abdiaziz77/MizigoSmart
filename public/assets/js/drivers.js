// drivers.js - MizigoSmart Drivers Management (Updated)

document.addEventListener('DOMContentLoaded', function() {
    // Configuration
    const API_BASE_URL = 'http://localhost:5000';
    const DRIVERS_ENDPOINT = `${API_BASE_URL}/drivers`;
    const TRUCKS_ENDPOINT = `${API_BASE_URL}/trucks`;
    const TRIPS_ENDPOINT = `${API_BASE_URL}/trips`;
    const USERS_ENDPOINT = `${API_BASE_URL}/users`;
    const NOTIFICATIONS_ENDPOINT = `${API_BASE_URL}/notifications`;
    const ASSIGNMENTS_ENDPOINT = `${API_BASE_URL}/assignments`;

    // State management
    let allDrivers = [];
    let allTrucks = [];
    let allTrips = [];
    let currentPage = 1;
    let itemsPerPage = 50;
    let currentDriverId = null;
    let isEditMode = false;
    let selectedDrivers = new Set();
    let currentPhotoFile = null;

    // Initialize the page
    initPage();

    // Main initialization function
    async function initPage() {
        // Check authentication first
        if (!await checkAuth()) {
            window.location.href = '/public/login.html';
            return;
        }
        
        // Load all data
        await loadAllData();
        
        // Set up event listeners
        setupEventListeners();
        
        // Initialize UI
        initializeUI();
        
        // Set user info
        setUserInfo();
    }

    // Check authentication
    async function checkAuth() {
        try {
            const currentUser = localStorage.getItem('currentUser');
            const isLoggedIn = localStorage.getItem('isLoggedIn');
            
            if (!currentUser || isLoggedIn !== 'true') {
                showNotification('Please login to access driver management', 'warning');
                return false;
            }
            
            const user = JSON.parse(currentUser);
            if (user.role !== 'admin') {
                showNotification('Admin privileges required', 'danger');
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('Authentication check failed:', error);
            return false;
        }
    }

    // Load all data
    async function loadAllData() {
        try {
            showLoadingState(true);
            
            // Load all data in parallel
            const [driversRes, trucksRes, tripsRes] = await Promise.allSettled([
                fetch(DRIVERS_ENDPOINT).then(res => res.json()),
                fetch(TRUCKS_ENDPOINT).then(res => res.json()),
                fetch(TRIPS_ENDPOINT).then(res => res.json())
            ]);
            
            // Process drivers
            if (driversRes.status === 'fulfilled') {
                allDrivers = Array.isArray(driversRes.value) ? driversRes.value : driversRes.value.drivers || [];
            } else {
                console.error('Failed to load drivers:', driversRes.reason);
                loadSampleDrivers();
            }
            
            // Process trucks
            if (trucksRes.status === 'fulfilled') {
                allTrucks = Array.isArray(trucksRes.value) ? trucksRes.value : trucksRes.value.trucks || [];
            } else {
                console.error('Failed to load trucks:', trucksRes.reason);
                loadSampleTrucks();
            }
            
            // Process trips
            if (tripsRes.status === 'fulfilled') {
                allTrips = Array.isArray(tripsRes.value) ? tripsRes.value : tripsRes.value.trips || [];
            } else {
                console.error('Failed to load trips:', tripsRes.reason);
                loadSampleTrips();
            }
            
            // Update UI with fetched data
            renderDriverCards();
            renderDriversTable();
            updateTopPerformers();
            updateStatistics();
            updateQuickStats();
            
            // Update badge count
            updateDriverBadge(allDrivers.length);
            
            showSuccessMessage(`Loaded ${allDrivers.length} drivers successfully`);
            
        } catch (error) {
            console.error('Error loading data:', error);
            showErrorMessage(`Failed to load data: ${error.message}. Using sample data.`);
            
            // Fallback to sample data
            loadSampleData();
        } finally {
            showLoadingState(false);
        }
    }

    // Sample data fallback
    function loadSampleData() {
        loadSampleDrivers();
        loadSampleTrucks();
        loadSampleTrips();
    }

    function loadSampleDrivers() {
        allDrivers = [
            {
                id: 'DRV-001',
                driverId: 'DRV-001',
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                phone: '+1234567890',
                licenseNumber: 'DL123456789',
                licenseType: 'class-a',
                status: 'active',
                assignedTruck: 'TRK-001',
                rating: 4.8,
                joinDate: '2023-01-15',
                experienceYears: 5,
                totalTrips: 124,
                successfulDeliveries: 120,
                photoUrl: 'assets/images/driver-avatar.jpg',
                dob: '1985-06-15',
                gender: 'male',
                nationality: 'American',
                address: '123 Main St, New York, NY',
                licenseIssued: '2020-01-15',
                licenseExpiry: '2025-01-15',
                issuingAuthority: 'DMV New York',
                employmentStatus: 'full-time',
                hireDate: '2023-01-15',
                hourlyRate: 25.50,
                emergencyName: 'Jane Doe',
                emergencyPhone: '+1234567891',
                emergencyRelationship: 'spouse',
                emergencyEmail: 'jane.doe@example.com',
                medicalInfo: 'No known allergies',
                insuranceInfo: 'Health Insurance Inc. #HI123456',
                specializations: ['long-haul', 'hazardous'],
                totalMiles: 125000,
                createdAt: '2023-01-15T10:00:00Z',
                updatedAt: '2023-01-15T10:00:00Z'
            },
            {
                id: 'DRV-002',
                driverId: 'DRV-002',
                firstName: 'Jane',
                lastName: 'Smith',
                email: 'jane.smith@example.com',
                phone: '+1234567891',
                licenseNumber: 'DL987654321',
                licenseType: 'class-b',
                status: 'on-trip',
                assignedTruck: 'TRK-002',
                rating: 4.5,
                joinDate: '2023-03-10',
                experienceYears: 3,
                totalTrips: 89,
                successfulDeliveries: 85,
                photoUrl: 'assets/images/driver-avatar.jpg',
                dob: '1990-08-22',
                gender: 'female',
                nationality: 'British',
                address: '456 Oak Ave, London, UK',
                licenseIssued: '2019-03-10',
                licenseExpiry: '2024-03-10',
                issuingAuthority: 'DVLA UK',
                employmentStatus: 'full-time',
                hireDate: '2023-03-10',
                hourlyRate: 23.00,
                emergencyName: 'John Smith',
                emergencyPhone: '+1234567892',
                emergencyRelationship: 'spouse',
                emergencyEmail: 'john.smith@example.com',
                medicalInfo: 'Allergic to penicillin',
                insuranceInfo: 'UK Health #UK789012',
                specializations: ['city', 'refrigerated'],
                totalMiles: 89000,
                createdAt: '2023-03-10T09:00:00Z',
                updatedAt: '2023-03-10T09:00:00Z'
            }
        ];
    }

    function loadSampleTrucks() {
        allTrucks = [
            {
                id: 'TRK-001',
                truckNumber: 'TRK-001',
                make: 'Mercedes-Benz',
                model: 'Actros',
                year: 2022,
                licensePlate: 'MB-ACT-001',
                capacity: '40 tons',
                status: 'active',
                currentDriver: 'DRV-001',
                location: 'New York',
                fuelType: 'Diesel',
                fuelLevel: 85,
                lastMaintenance: '2023-12-01',
                nextMaintenance: '2024-01-01',
                mileage: 45000,
                createdAt: '2022-01-15T10:00:00Z',
                updatedAt: '2022-01-15T10:00:00Z'
            },
            {
                id: 'TRK-002',
                truckNumber: 'TRK-002',
                make: 'Volvo',
                model: 'FH16',
                year: 2021,
                licensePlate: 'VL-FH16-002',
                capacity: '35 tons',
                status: 'active',
                currentDriver: 'DRV-002',
                location: 'Chicago',
                fuelType: 'Diesel',
                fuelLevel: 70,
                lastMaintenance: '2023-11-15',
                nextMaintenance: '2023-12-15',
                mileage: 65000,
                createdAt: '2021-03-10T09:00:00Z',
                updatedAt: '2021-03-10T09:00:00Z'
            },
            {
                id: 'TRK-003',
                truckNumber: 'TRK-003',
                make: 'Scania',
                model: 'R730',
                year: 2023,
                licensePlate: 'SC-R730-003',
                capacity: '45 tons',
                status: 'available',
                currentDriver: null,
                location: 'Los Angeles',
                fuelType: 'Diesel',
                fuelLevel: 90,
                lastMaintenance: '2023-10-20',
                nextMaintenance: '2023-11-20',
                mileage: 25000,
                createdAt: '2023-05-30T14:00:00Z',
                updatedAt: '2023-05-30T14:00:00Z'
            }
        ];
    }

    function loadSampleTrips() {
        allTrips = [
            {
                id: 'TRP-001',
                tripNumber: 'TRP-001',
                driverId: 'DRV-002',
                truckId: 'TRK-002',
                startLocation: 'New York',
                endLocation: 'Chicago',
                startTime: '2023-12-01T08:00:00Z',
                estimatedEndTime: '2023-12-02T18:00:00Z',
                status: 'in-progress',
                distance: 800,
                cargoType: 'Electronics',
                cargoWeight: 15,
                revenue: 2500,
                currentLocation: 'Cleveland, OH',
                progress: 60,
                createdAt: '2023-11-30T14:00:00Z',
                updatedAt: '2023-12-01T14:00:00Z'
            },
            {
                id: 'TRP-002',
                tripNumber: 'TRP-002',
                driverId: 'DRV-001',
                truckId: 'TRK-001',
                startLocation: 'Los Angeles',
                endLocation: 'Seattle',
                startTime: '2023-12-05T06:00:00Z',
                estimatedEndTime: '2023-12-07T20:00:00Z',
                status: 'scheduled',
                distance: 1200,
                cargoType: 'Furniture',
                cargoWeight: 25,
                revenue: 3800,
                currentLocation: null,
                progress: 0,
                createdAt: '2023-12-01T10:00:00Z',
                updatedAt: '2023-12-01T10:00:00Z'
            }
        ];
    }

    // Render driver cards in grid
    function renderDriverCards() {
        const container = document.getElementById('driverCardsGrid');
        if (!container) return;
        
        const driversToShow = allDrivers.slice(0, 6);
        
        container.innerHTML = driversToShow.map(driver => `
            <div class="driver-card" data-driver-id="${driver.id}">
                <div class="driver-card-header">
                    <img src="${getDriverPhoto(driver)}" 
                         alt="${driver.firstName} ${driver.lastName}"
                         class="driver-avatar"
                         onerror="this.onerror=null;this.src='assets/images/driver-avatar.jpg';">
                    <div class="driver-info">
                        <h4>${driver.firstName} ${driver.lastName}</h4>
                        <div class="driver-id">${driver.driverId || driver.id}</div>
                        <span class="driver-status status-${driver.status || 'active'}">
                            ${getStatusText(driver.status)}
                        </span>
                    </div>
                </div>
                <div class="driver-card-body">
                    <div class="driver-detail-item">
                        <i class="fas fa-envelope"></i>
                        <span>${driver.email}</span>
                    </div>
                    <div class="driver-detail-item">
                        <i class="fas fa-phone"></i>
                        <span>${driver.phone}</span>
                    </div>
                    <div class="driver-detail-item">
                        <i class="fas fa-truck"></i>
                        <span>${driver.assignedTruck || 'No truck assigned'}</span>
                    </div>
                    <div class="driver-rating">
                        <div class="rating-stars">
                            ${generateStarRating(driver.rating || 0)}
                        </div>
                        <span class="rating-value">${(driver.rating || 0).toFixed(1)}</span>
                    </div>
                </div>
                <div class="driver-actions">
                    <button class="driver-action-btn" onclick="viewDriverDetails('${driver.id}')">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="driver-action-btn primary" onclick="editDriver('${driver.id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Render drivers table
    function renderDriversTable() {
        const tbody = document.getElementById('driversTableBody');
        if (!tbody) return;
        
        // Calculate pagination
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedDrivers = allDrivers.slice(startIndex, endIndex);
        
        tbody.innerHTML = paginatedDrivers.map(driver => `
            <tr data-driver-id="${driver.id}">
                <td>
                    <input type="checkbox" class="driver-checkbox" value="${driver.id}" 
                           ${selectedDrivers.has(driver.id) ? 'checked' : ''}
                           onchange="toggleDriverSelection('${driver.id}', this.checked)">
                </td>
                <td>${driver.driverId || driver.id}</td>
                <td>
                    <div class="d-flex align-items-center">
                        <img src="${getDriverPhoto(driver)}" 
                             alt="${driver.firstName} ${driver.lastName}"
                             class="driver-avatar me-2"
                             onerror="this.onerror=null;this.src='assets/images/driver-avatar.jpg';">
                        ${driver.firstName} ${driver.lastName}
                    </div>
                </td>
                <td>
                    <div>${driver.phone}</div>
                    <small class="text-muted">${driver.email}</small>
                </td>
                <td>
                    <div>${driver.licenseNumber || 'N/A'}</div>
                    <small class="text-muted">${getLicenseTypeText(driver.licenseType)}</small>
                </td>
                <td>
                    <span class="driver-status-badge status-${driver.status || 'active'}">
                        ${getStatusText(driver.status)}
                    </span>
                </td>
                <td>${driver.assignedTruck || '—'}</td>
                <td>
                    <div class="rating-display">
                        <div class="rating-stars">
                            ${generateStarRating(driver.rating || 0)}
                        </div>
                        <span class="rating-value">${(driver.rating || 0).toFixed(1)}</span>
                    </div>
                </td>
                <td>${formatDate(driver.joinDate)}</td>
                <td>
                    <div class="table-actions-cell">
                        <button class="table-action-btn" onclick="viewDriverDetails('${driver.id}')" 
                                title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="table-action-btn" onclick="editDriver('${driver.id}')" 
                                title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="table-action-btn" onclick="assignTruckToDriver('${driver.id}')" 
                                title="Assign Truck">
                            <i class="fas fa-truck"></i>
                        </button>
                        <button class="table-action-btn" onclick="assignTripToDriver('${driver.id}')" 
                                title="Assign Trip">
                            <i class="fas fa-route"></i>
                        </button>
                        <button class="table-action-btn" onclick="confirmDeleteDriver('${driver.id}')" 
                                title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
        
        updatePaginationInfo();
        updateTableInfo();
    }

    // Update top performers list
    function updateTopPerformers() {
        const container = document.getElementById('topPerformersList');
        if (!container) return;
        
        // Sort by rating and select top 5
        const topPerformers = [...allDrivers]
            .sort((a, b) => (b.rating || 0) - (a.rating || 0))
            .slice(0, 5);
        
        container.innerHTML = topPerformers.map((driver, index) => `
            <div class="performance-item" onclick="viewDriverDetails('${driver.id}')">
                <div class="performance-rank">${index + 1}</div>
                <img src="${getDriverPhoto(driver)}" 
                     alt="${driver.firstName} ${driver.lastName}"
                     class="performance-avatar"
                     onerror="this.onerror=null;this.src='assets/images/driver-avatar.jpg';">
                <div class="performance-info">
                    <div class="performance-name">${driver.firstName} ${driver.lastName}</div>
                    <div class="performance-meta">
                        <span class="performance-rating">
                            <i class="fas fa-star"></i> ${(driver.rating || 0).toFixed(1)}
                        </span>
                        <span>${driver.totalTrips || 0} trips</span>
                    </div>
                </div>
                <div class="performance-value">
                    ${driver.successfulDeliveries || 0}
                </div>
            </div>
        `).join('');
    }

    // Update statistics
    function updateStatistics() {
        const totalDrivers = allDrivers.length;
        const activeDrivers = allDrivers.filter(d => d.status === 'active').length;
        const onTripDrivers = allDrivers.filter(d => d.status === 'on-trip').length;
        const availableDrivers = allDrivers.filter(d => 
            d.status === 'active' && !d.assignedTruck
        ).length;
        
        document.getElementById('totalDrivers').textContent = totalDrivers;
        document.getElementById('activeDrivers').textContent = activeDrivers;
        document.getElementById('onTripDrivers').textContent = onTripDrivers;
        document.getElementById('availableDrivers').textContent = availableDrivers;
    }

    // Update quick stats
    function updateQuickStats() {
        const onDutyCount = document.getElementById('onDutyCount');
        const avgRating = document.getElementById('avgRating');
        const totalMiles = document.getElementById('totalMiles');
        
        if (!onDutyCount || !avgRating || !totalMiles) return;
        
        const onDuty = allDrivers.filter(d => 
            d.status === 'active' || d.status === 'on-trip'
        ).length;
        
        const avgRatingValue = allDrivers.length > 0
            ? allDrivers.reduce((sum, d) => sum + (d.rating || 0), 0) / allDrivers.length
            : 0;
        
        const totalMilesValue = allDrivers.reduce((sum, d) => sum + (d.totalMiles || 0), 0);
        
        onDutyCount.textContent = onDuty;
        avgRating.textContent = avgRatingValue.toFixed(1);
        totalMiles.textContent = Math.round(totalMilesValue / 1000) + 'K';
    }

    // Utility functions
    function getStatusText(status) {
        const statusMap = {
            'active': 'Active',
            'on-trip': 'On Trip',
            'off-duty': 'Off Duty',
            'inactive': 'Inactive',
            'available': 'Available',
            'unavailable': 'Unavailable'
        };
        return statusMap[status] || 'Active';
    }
    
    function getLicenseTypeText(type) {
        const typeMap = {
            'class-a': 'Class A (CDL)',
            'class-b': 'Class B',
            'class-c': 'Class C',
            'heavy': 'Heavy Vehicle',
            'hazardous': 'Hazardous Materials'
        };
        return typeMap[type] || 'N/A';
    }
    
    function generateStarRating(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
        
        let stars = '';
        
        // Full stars
        for (let i = 0; i < fullStars; i++) {
            stars += '<i class="fas fa-star"></i>';
        }
        
        // Half star
        if (hasHalfStar) {
            stars += '<i class="fas fa-star-half-alt"></i>';
        }
        
        // Empty stars
        for (let i = 0; i < emptyStars; i++) {
            stars += '<i class="far fa-star"></i>';
        }
        
        return stars;
    }
    
    function formatDate(dateString) {
        if (!dateString) return '—';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (error) {
            return dateString;
        }
    }
    
    function getDriverPhoto(driver) {
        if (driver.photoUrl && driver.photoUrl.startsWith('data:')) {
            return driver.photoUrl;
        }
        return driver.photoUrl || 'assets/images/driver-avatar.jpg';
    }
    
    function showLoadingState(show) {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = show ? 'flex' : 'none';
        }
    }
    
    function showSuccessMessage(message) {
        const successMsg = document.getElementById('successMessage');
        const successText = document.getElementById('successText');
        
        if (successMsg && successText) {
            successText.textContent = message;
            successMsg.classList.add('show');
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                successMsg.classList.remove('show');
            }, 5000);
        }
    }
    
    function showErrorMessage(message) {
        const errorMsg = document.getElementById('errorMessage');
        const errorText = document.getElementById('errorText');
        
        if (errorMsg && errorText) {
            errorText.textContent = message;
            errorMsg.classList.add('show');
            
            // Auto-hide after 8 seconds
            setTimeout(() => {
                errorMsg.classList.remove('show');
            }, 8000);
        }
    }
    
    function updateDriverBadge(count) {
        const badge = document.getElementById('driverBadge');
        if (badge) {
            badge.textContent = count;
        }
    }
    
    function updatePaginationInfo() {
        const paginationInfo = document.getElementById('paginationInfo');
        const totalPages = Math.ceil(allDrivers.length / itemsPerPage) || 1;
        
        if (paginationInfo) {
            paginationInfo.textContent = `Page ${currentPage} of ${totalPages}`;
        }
        
        // Update page numbers
        const pageNumbers = document.getElementById('pageNumbers');
        if (pageNumbers) {
            let pageHtml = '';
            const maxPagesToShow = 5;
            
            let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
            let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
            
            // Adjust start page if we're near the end
            if (endPage - startPage + 1 < maxPagesToShow) {
                startPage = Math.max(1, endPage - maxPagesToShow + 1);
            }
            
            for (let i = startPage; i <= endPage; i++) {
                pageHtml += `
                    <button class="page-number ${i === currentPage ? 'active' : ''}" 
                            onclick="changePage(${i})">
                        ${i}
                    </button>
                `;
            }
            
            pageNumbers.innerHTML = pageHtml;
            
            // Update button states
            document.getElementById('firstPage').disabled = currentPage === 1;
            document.getElementById('prevPage').disabled = currentPage === 1;
            document.getElementById('nextPage').disabled = currentPage === totalPages;
            document.getElementById('lastPage').disabled = currentPage === totalPages;
        }
    }
    
    function updateTableInfo() {
        const tableInfo = document.getElementById('tableInfo');
        if (tableInfo) {
            const total = allDrivers.length;
            const start = total > 0 ? ((currentPage - 1) * itemsPerPage + 1) : 0;
            const end = Math.min(currentPage * itemsPerPage, total);
            tableInfo.textContent = `Showing ${start}-${end} of ${total} drivers`;
        }
    }

    // Set up event listeners
    function setupEventListeners() {
        // Add driver button
        const addDriverBtn = document.getElementById('addDriverBtn');
        if (addDriverBtn) {
            addDriverBtn.addEventListener('click', openAddDriverModal);
        }
        
        // Export drivers
        const exportBtn = document.getElementById('exportDrivers');
        if (exportBtn) {
            exportBtn.addEventListener('click', exportDrivers);
        }
        
        // Refresh drivers
        const refreshBtn = document.getElementById('refreshDrivers');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', loadAllData);
        }
        
        // Status filter
        const statusFilter = document.getElementById('driverStatusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', filterDriversByStatus);
        }
        
        // Items per page
        const itemsPerPageSelect = document.getElementById('itemsPerPage');
        if (itemsPerPageSelect) {
            itemsPerPageSelect.addEventListener('change', function(e) {
                itemsPerPage = parseInt(e.target.value);
                currentPage = 1;
                renderDriversTable();
            });
        }
        
        // Pagination buttons
        document.getElementById('firstPage')?.addEventListener('click', () => goToPage(1));
        document.getElementById('prevPage')?.addEventListener('click', () => goToPage(currentPage - 1));
        document.getElementById('nextPage')?.addEventListener('click', () => goToPage(currentPage + 1));
        document.getElementById('lastPage')?.addEventListener('click', () => {
            const totalPages = Math.ceil(allDrivers.length / itemsPerPage);
            goToPage(totalPages);
        });
        
        // Global search
        const globalSearch = document.getElementById('globalSearch');
        if (globalSearch) {
            globalSearch.addEventListener('input', debounce(searchDrivers, 300));
        }
        
        // Select all checkbox
        const selectAll = document.getElementById('selectAll');
        if (selectAll) {
            selectAll.addEventListener('change', function() {
                const checkboxes = document.querySelectorAll('.driver-checkbox');
                checkboxes.forEach(cb => {
                    const driverId = cb.value;
                    if (this.checked) {
                        selectedDrivers.add(driverId);
                    } else {
                        selectedDrivers.delete(driverId);
                    }
                    cb.checked = this.checked;
                });
            });
        }
        
        // Form submission
        const driverForm = document.getElementById('driverForm');
        if (driverForm) {
            driverForm.addEventListener('submit', handleDriverFormSubmit);
        }
        
        // Form tabs
        const formTabs = document.querySelectorAll('.form-tab');
        formTabs.forEach(tab => {
            tab.addEventListener('click', function() {
                const tabName = this.getAttribute('data-tab');
                switchTab(tabName);
            });
        });
        
        // Form navigation
        document.getElementById('nextTabBtn')?.addEventListener('click', nextTab);
        document.getElementById('prevTabBtn')?.addEventListener('click', prevTab);
        
        // Photo upload click
        const photoPreview = document.getElementById('photoPreview');
        if (photoPreview) {
            photoPreview.addEventListener('click', () => {
                document.getElementById('driverPhoto').click();
            });
        }
        
        // Photo upload change
        const driverPhoto = document.getElementById('driverPhoto');
        if (driverPhoto) {
            driverPhoto.addEventListener('change', previewDriverPhoto);
        }
        
        // Edit driver button in details modal
        document.getElementById('editDriverBtn')?.addEventListener('click', function() {
            if (currentDriverId) {
                editDriver(currentDriverId);
            }
        });
        
        // Performance period filter
        const performancePeriod = document.getElementById('performancePeriod');
        if (performancePeriod) {
            performancePeriod.addEventListener('change', function() {
                updateTopPerformers();
            });
        }
        
        // Save assignment button
        const saveAssignmentBtn = document.getElementById('saveAssignmentBtn');
        if (saveAssignmentBtn) {
            saveAssignmentBtn.addEventListener('click', handleAssignTruck);
        }
        
        // Confirm delete button
        const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
        if (confirmDeleteBtn) {
            confirmDeleteBtn.addEventListener('click', handleDeleteDriver);
        }
        
        // Bulk actions
        const applyBulkAction = document.getElementById('applyBulkAction');
        if (applyBulkAction) {
            applyBulkAction.addEventListener('click', handleBulkAction);
        }
        
        // Auto-generate ID
        const autoGenerateId = document.getElementById('autoGenerateId');
        if (autoGenerateId) {
            autoGenerateId.addEventListener('click', generateDriverId);
        }
        
        // Rating stars
        const ratingStars = document.querySelectorAll('.rating-stars-select i');
        ratingStars.forEach(star => {
            star.addEventListener('click', function() {
                const rating = parseInt(this.getAttribute('data-rating'));
                setRating(rating);
            });
        });
        
        // License expiry date validation
        const licenseIssued = document.getElementById('licenseIssued');
        const licenseExpiry = document.getElementById('licenseExpiry');
        if (licenseIssued && licenseExpiry) {
            licenseIssued.addEventListener('change', validateLicenseDates);
            licenseExpiry.addEventListener('change', validateLicenseDates);
        }
        
        // Initialize date fields
        initializeDateFields();
    }

    // Initialize UI
    function initializeUI() {
        // Set today's date for date fields
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('dob')?.setAttribute('max', today);
        
        // Initialize rating
        setRating(4.5);
        
        // Update truck dropdown
        updateTruckDropdown();
    }

    // Event handler functions
    function filterDriversByStatus() {
        const status = document.getElementById('driverStatusFilter').value;
        
        if (status) {
            allDrivers = allDrivers.filter(driver => driver.status === status);
        } else {
            // Reset to original drivers list
            loadAllData();
        }
        
        currentPage = 1;
        renderDriversTable();
        updateTopPerformers();
        updateStatistics();
        updateQuickStats();
    }
    
    function goToPage(page) {
        const totalPages = Math.ceil(allDrivers.length / itemsPerPage);
        
        if (page < 1 || page > totalPages) return;
        
        currentPage = page;
        renderDriversTable();
        updatePaginationInfo();
    }
    
    function searchDrivers() {
        const searchTerm = document.getElementById('globalSearch').value.toLowerCase();
        
        if (!searchTerm) {
            loadAllData();
            return;
        }
        
        allDrivers = allDrivers.filter(driver => 
            driver.firstName?.toLowerCase().includes(searchTerm) ||
            driver.lastName?.toLowerCase().includes(searchTerm) ||
            driver.email?.toLowerCase().includes(searchTerm) ||
            driver.phone?.toLowerCase().includes(searchTerm) ||
            driver.driverId?.toLowerCase().includes(searchTerm) ||
            driver.id?.toLowerCase().includes(searchTerm)
        );
        
        currentPage = 1;
        renderDriversTable();
        updateTopPerformers();
        updateStatistics();
        updateQuickStats();
    }
    
    async function handleDriverFormSubmit(e) {
        e.preventDefault();
        
        // Validate form
        if (!validateDriverForm()) {
            return;
        }
        
        // Collect form data
        const driverData = {
            driverId: document.getElementById('driverId').value,
            firstName: document.getElementById('firstName').value,
            lastName: document.getElementById('lastName').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phoneCode').value + document.getElementById('phone').value,
            dob: document.getElementById('dob').value,
            gender: document.getElementById('gender').value,
            nationality: document.getElementById('nationality').value,
            address: document.getElementById('address').value,
            licenseNumber: document.getElementById('licenseNumber').value,
            licenseType: document.getElementById('licenseType').value,
            licenseIssued: document.getElementById('licenseIssued').value,
            licenseExpiry: document.getElementById('licenseExpiry').value,
            issuingAuthority: document.getElementById('issuingAuthority').value,
            employmentStatus: document.getElementById('employmentStatus').value,
            hireDate: document.getElementById('hireDate').value,
            assignedTruck: document.getElementById('assignedTruck').value,
            rating: parseFloat(document.getElementById('initialRating').value),
            experienceYears: parseInt(document.getElementById('experienceYears').value) || 0,
            hourlyRate: parseFloat(document.getElementById('hourlyRate').value) || 0,
            emergencyName: document.getElementById('emergencyName').value,
            emergencyPhone: document.getElementById('emergencyPhone').value,
            emergencyRelationship: document.getElementById('emergencyRelationship').value,
            emergencyEmail: document.getElementById('emergencyEmail').value,
            medicalInfo: document.getElementById('medicalInfo').value,
            insuranceInfo: document.getElementById('insuranceInfo').value,
            status: 'active',
            joinDate: new Date().toISOString().split('T')[0],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Handle photo
        if (currentPhotoFile) {
            const photoDataUrl = await readFileAsDataURL(currentPhotoFile);
            driverData.photoUrl = photoDataUrl;
        }
        
        // Handle specializations
        const specializations = [];
        document.querySelectorAll('input[name="specializations"]:checked').forEach(cb => {
            specializations.push(cb.value);
        });
        driverData.specializations = specializations;
        
        // Save driver
        await saveDriver(driverData);
    }
    
    function validateDriverForm() {
        let isValid = true;
        
        // Clear previous errors
        document.querySelectorAll('.form-group').forEach(group => {
            group.classList.remove('error');
        });
        
        // Validate required fields
        const requiredFields = [
            'driverId', 'firstName', 'lastName', 'email', 'phone',
            'licenseNumber', 'licenseType', 'licenseIssued', 'licenseExpiry',
            'employmentStatus'
        ];
        
        requiredFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (!field || !field.value.trim()) {
                field.parentElement.classList.add('error');
                isValid = false;
            }
        });
        
        // Validate email format
        const email = document.getElementById('email')?.value;
        if (email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                document.getElementById('email').parentElement.classList.add('error');
                isValid = false;
            }
        }
        
        // Validate license dates
        if (!validateLicenseDates()) {
            isValid = false;
        }
        
        return isValid;
    }
    
    function validateLicenseDates() {
        const issued = document.getElementById('licenseIssued').value;
        const expiry = document.getElementById('licenseExpiry').value;
        const expiryHint = document.getElementById('expiryHint');
        
        if (issued && expiry) {
            const issuedDate = new Date(issued);
            const expiryDate = new Date(expiry);
            
            if (expiryDate <= issuedDate) {
                document.getElementById('licenseExpiry').parentElement.classList.add('error');
                if (expiryHint) {
                    expiryHint.textContent = 'Expiry date must be after issued date';
                    expiryHint.style.color = 'var(--danger)';
                }
                return false;
            }
            
            // Check if license is expiring soon (within 30 days)
            const today = new Date();
            const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
            
            if (expiryHint) {
                if (daysUntilExpiry < 0) {
                    expiryHint.textContent = 'License has expired!';
                    expiryHint.style.color = 'var(--danger)';
                } else if (daysUntilExpiry <= 30) {
                    expiryHint.textContent = `License expires in ${daysUntilExpiry} days`;
                    expiryHint.style.color = 'var(--warning)';
                } else {
                    expiryHint.textContent = 'License is valid';
                    expiryHint.style.color = 'var(--success)';
                }
            }
        }
        
        document.getElementById('licenseExpiry').parentElement.classList.remove('error');
        return true;
    }
    
    function switchTab(tabName) {
        // Update active tab
        document.querySelectorAll('.form-tab').forEach(tab => {
            tab.classList.toggle('active', tab.getAttribute('data-tab') === tabName);
        });
        
        // Update active content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === tabName + 'Tab');
        });
        
        // Update navigation buttons
        const prevBtn = document.getElementById('prevTabBtn');
        const nextBtn = document.getElementById('nextTabBtn');
        const submitBtn = document.getElementById('submitDriverBtn');
        
        const tabs = ['personal', 'license', 'employment', 'emergency'];
        const currentIndex = tabs.indexOf(tabName);
        
        if (prevBtn) prevBtn.style.display = currentIndex > 0 ? 'inline-block' : 'none';
        if (nextBtn) nextBtn.style.display = currentIndex < tabs.length - 1 ? 'inline-block' : 'none';
        if (submitBtn) submitBtn.style.display = currentIndex === tabs.length - 1 ? 'inline-block' : 'none';
    }
    
    function nextTab() {
        const currentTab = document.querySelector('.form-tab.active');
        const tabs = Array.from(document.querySelectorAll('.form-tab'));
        const currentIndex = tabs.indexOf(currentTab);
        
        if (currentIndex < tabs.length - 1) {
            const nextTabName = tabs[currentIndex + 1].getAttribute('data-tab');
            switchTab(nextTabName);
        }
    }
    
    function prevTab() {
        const currentTab = document.querySelector('.form-tab.active');
        const tabs = Array.from(document.querySelectorAll('.form-tab'));
        const currentIndex = tabs.indexOf(currentTab);
        
        if (currentIndex > 0) {
            const prevTabName = tabs[currentIndex - 1].getAttribute('data-tab');
            switchTab(prevTabName);
        }
    }
    
    function resetDriverForm() {
        document.getElementById('driverForm').reset();
        currentPhotoFile = null;
        
        // Reset photo preview
        const photoPreview = document.getElementById('photoPreview');
        if (photoPreview) {
            photoPreview.innerHTML = `
                <i class="fas fa-user-circle"></i>
                <p>Click to upload driver photo</p>
                <small>Recommended: 500x500 pixels, JPG or PNG</small>
            `;
        }
        
        // Reset rating
        setRating(4.5);
        
        // Reset to first tab
        switchTab('personal');
        
        // Clear validation errors
        document.querySelectorAll('.form-group').forEach(group => {
            group.classList.remove('error');
        });
    }
    
    function generateDriverId() {
        const prefix = 'DRV-';
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.random().toString(36).substr(2, 3).toUpperCase();
        const driverId = `${prefix}${timestamp}${random}`;
        
        document.getElementById('driverId').value = driverId;
    }
    
    function setRating(rating) {
        // Update stars display
        const stars = document.querySelectorAll('.rating-stars-select i');
        stars.forEach((star, index) => {
            if (index < Math.floor(rating)) {
                star.className = 'fas fa-star';
            } else if (index < rating) {
                star.className = 'fas fa-star-half-alt';
            } else {
                star.className = 'far fa-star';
            }
        });
        
        // Update hidden input
        document.getElementById('initialRating').value = rating;
    }
    
    function updateTruckDropdown() {
        const assignedTruckSelect = document.getElementById('assignedTruck');
        const assignTruckSelect = document.getElementById('assignTruckSelect');
        
        if (assignedTruckSelect) {
            assignedTruckSelect.innerHTML = `
                <option value="">No Truck Assigned</option>
                ${allTrucks.map(truck => `
                    <option value="${truck.truckNumber || truck.id}">
                        ${truck.truckNumber || truck.id} - ${truck.make} ${truck.model}
                    </option>
                `).join('')}
            `;
        }
        
        if (assignTruckSelect) {
            assignTruckSelect.innerHTML = `
                <option value="">Select a truck</option>
                ${allTrucks.filter(truck => truck.status === 'available').map(truck => `
                    <option value="${truck.truckNumber || truck.id}">
                        ${truck.truckNumber || truck.id} - ${truck.make} ${truck.model}
                    </option>
                `).join('')}
            `;
        }
    }
    
    async function handleAssignTruck() {
        const driverId = document.getElementById('assignDriverSelect').value;
        const truckId = document.getElementById('assignTruckSelect').value;
        const assignmentDate = document.getElementById('assignmentDate').value;
        const assignmentDuration = document.getElementById('assignmentDuration').value;
        const notes = document.getElementById('assignmentNotes').value;
        
        if (!driverId || !truckId || !assignmentDate) {
            alert('Please fill in all required fields');
            return;
        }
        
        try {
            // Update driver with assigned truck
            const driver = allDrivers.find(d => d.id === driverId);
            if (driver) {
                driver.assignedTruck = truckId;
                driver.updatedAt = new Date().toISOString();
                
                // Update in API
                await fetch(`${DRIVERS_ENDPOINT}/${driverId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(driver)
                });
                
                // Update truck with assigned driver
                const truck = allTrucks.find(t => t.truckNumber === truckId || t.id === truckId);
                if (truck) {
                    truck.currentDriver = driverId;
                    truck.status = 'assigned';
                    truck.updatedAt = new Date().toISOString();
                    
                    await fetch(`${TRUCKS_ENDPOINT}/${truck.id}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(truck)
                    });
                }
                
                // Create assignment record
                const assignmentData = {
                    driverId,
                    truckId,
                    assignmentDate,
                    assignmentDuration,
                    notes,
                    status: 'active',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                
                await fetch(ASSIGNMENTS_ENDPOINT, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(assignmentData)
                });
                
                showSuccessMessage('Truck assigned successfully!');
                loadAllData();
                closeModal('#assignTruckModal');
            }
        } catch (error) {
            console.error('Error assigning truck:', error);
            showErrorMessage(`Failed to assign truck: ${error.message}`);
        }
    }
    
    async function handleDeleteDriver() {
        if (!currentDriverId) return;
        
        try {
            await fetch(`${DRIVERS_ENDPOINT}/${currentDriverId}`, {
                method: 'DELETE'
            });
            
            showSuccessMessage('Driver deleted successfully!');
            loadAllData();
            closeModal('#deleteModal');
        } catch (error) {
            console.error('Error deleting driver:', error);
            showErrorMessage(`Failed to delete driver: ${error.message}`);
        }
    }
    
    async function handleBulkAction() {
        const action = document.getElementById('bulkAction').value;
        
        if (!action || selectedDrivers.size === 0) {
            alert('Please select drivers and choose an action');
            return;
        }
        
        try {
            const promises = Array.from(selectedDrivers).map(async driverId => {
                const driver = allDrivers.find(d => d.id === driverId);
                if (!driver) return;
                
                let updatedDriver = { ...driver };
                
                switch (action) {
                    case 'activate':
                        updatedDriver.status = 'active';
                        break;
                    case 'deactivate':
                        updatedDriver.status = 'inactive';
                        break;
                    case 'assign':
                        // This would need additional UI for bulk assignment
                        alert('Bulk assignment requires additional information');
                        return;
                    case 'delete':
                        await fetch(`${DRIVERS_ENDPOINT}/${driverId}`, {
                            method: 'DELETE'
                        });
                        return;
                }
                
                updatedDriver.updatedAt = new Date().toISOString();
                
                return fetch(`${DRIVERS_ENDPOINT}/${driverId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(updatedDriver)
                });
            });
            
            await Promise.all(promises);
            
            showSuccessMessage(`Bulk action "${action}" completed successfully!`);
            loadAllData();
            selectedDrivers.clear();
            document.getElementById('selectAll').checked = false;
        } catch (error) {
            console.error('Error performing bulk action:', error);
            showErrorMessage(`Failed to perform bulk action: ${error.message}`);
        }
    }

    // Utility: Debounce function for search
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

    // File reading utility
    function readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // Initialize date fields
    function initializeDateFields() {
        const today = new Date().toISOString().split('T')[0];
        
        // Set max date for DOB (must be at least 18 years ago)
        const dob = document.getElementById('dob');
        if (dob) {
            const minDate = new Date();
            minDate.setFullYear(minDate.getFullYear() - 18);
            dob.setAttribute('max', minDate.toISOString().split('T')[0]);
        }
        
        // Set default values for date fields
        const licenseIssued = document.getElementById('licenseIssued');
        const licenseExpiry = document.getElementById('licenseExpiry');
        const hireDate = document.getElementById('hireDate');
        const assignmentDate = document.getElementById('assignmentDate');
        const scheduleDate = document.getElementById('scheduleDate');
        
        if (licenseIssued) licenseIssued.value = today;
        if (hireDate) hireDate.value = today;
        if (assignmentDate) assignmentDate.value = today;
        if (scheduleDate) scheduleDate.value = today;
        
        // Set license expiry to 5 years from now
        if (licenseExpiry) {
            const expiryDate = new Date();
            expiryDate.setFullYear(expiryDate.getFullYear() + 5);
            licenseExpiry.value = expiryDate.toISOString().split('T')[0];
        }
    }

    // API Functions
    async function saveDriver(driverData) {
        try {
            const url = isEditMode && currentDriverId 
                ? `${DRIVERS_ENDPOINT}/${currentDriverId}`
                : DRIVERS_ENDPOINT;
            
            const method = isEditMode ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(driverData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            showSuccessMessage(
                isEditMode 
                    ? 'Driver updated successfully!' 
                    : 'Driver added successfully!'
            );
            
            // Reload data
            await loadAllData();
            
            // Close modal
            closeModal('#driverFormModal');
            
            return result;
            
        } catch (error) {
            console.error('Error saving driver:', error);
            showErrorMessage(`Failed to save driver: ${error.message}`);
            throw error;
        }
    }

    // Global functions for inline onclick handlers
    window.viewDriverDetails = function(driverId) {
        const driver = allDrivers.find(d => d.id === driverId);
        if (!driver) return;
        
        currentDriverId = driverId;
        
        // Populate details modal
        document.getElementById('driverDetailTitle').textContent = 
            `${driver.firstName} ${driver.lastName} Details`;
        
        const container = document.getElementById('driverDetailsContainer');
        container.innerHTML = `
            <div class="driver-details-header">
                <img src="${getDriverPhoto(driver)}" 
                     alt="${driver.firstName} ${driver.lastName}"
                     class="driver-details-avatar"
                     onerror="this.onerror=null;this.src='assets/images/driver-avatar.jpg';">
                <div class="driver-details-info">
                    <h2>${driver.firstName} ${driver.lastName}</h2>
                    <div class="driver-details-meta">
                        <span><i class="fas fa-id-badge"></i> ${driver.driverId || driver.id}</span>
                        <span><i class="fas fa-phone"></i> ${driver.phone}</span>
                        <span><i class="fas fa-envelope"></i> ${driver.email}</span>
                    </div>
                    <span class="driver-status-badge status-${driver.status || 'active'}">
                        ${getStatusText(driver.status)}
                    </span>
                </div>
            </div>
            
            <div class="driver-details-stats">
                <div class="driver-stat-item">
                    <span class="driver-stat-value">${driver.totalTrips || 0}</span>
                    <span class="driver-stat-label">Total Trips</span>
                </div>
                <div class="driver-stat-item">
                    <span class="driver-stat-value">${driver.successfulDeliveries || 0}</span>
                    <span class="driver-stat-label">Successful</span>
                </div>
                <div class="driver-stat-item">
                    <span class="driver-stat-value">${(driver.rating || 0).toFixed(1)}</span>
                    <span class="driver-stat-label">Rating</span>
                </div>
                <div class="driver-stat-item">
                    <span class="driver-stat-value">${driver.experienceYears || 0}</span>
                    <span class="driver-stat-label">Years Exp.</span>
                </div>
            </div>
            
            <div class="driver-details-tabs">
                <button class="driver-details-tab active" data-tab="personal">Personal</button>
                <button class="driver-details-tab" data-tab="license">License</button>
                <button class="driver-details-tab" data-tab="employment">Employment</button>
            </div>
            
            <div class="driver-details-content active" id="personalDetails">
                <div class="driver-info-grid">
                    <div class="info-item">
                        <div class="info-label">Date of Birth</div>
                        <div class="info-value">${formatDate(driver.dob)}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Gender</div>
                        <div class="info-value">${driver.gender || 'Not specified'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Nationality</div>
                        <div class="info-value">${driver.nationality || 'Not specified'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Address</div>
                        <div class="info-value">${driver.address || 'Not specified'}</div>
                    </div>
                </div>
            </div>
            
            <div class="driver-details-content" id="licenseDetails">
                <div class="driver-info-grid">
                    <div class="info-item">
                        <div class="info-label">License Number</div>
                        <div class="info-value">${driver.licenseNumber || 'N/A'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">License Type</div>
                        <div class="info-value">${getLicenseTypeText(driver.licenseType)}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Issued Date</div>
                        <div class="info-value">${formatDate(driver.licenseIssued)}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Expiry Date</div>
                        <div class="info-value">${formatDate(driver.licenseExpiry)}</div>
                    </div>
                </div>
            </div>
            
            <div class="driver-details-content" id="employmentDetails">
                <div class="driver-info-grid">
                    <div class="info-item">
                        <div class="info-label">Employment Status</div>
                        <div class="info-value">${driver.employmentStatus || 'Not specified'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Join Date</div>
                        <div class="info-value">${formatDate(driver.joinDate)}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Assigned Truck</div>
                        <div class="info-value">${driver.assignedTruck || 'None'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Experience</div>
                        <div class="info-value">${driver.experienceYears || 0} years</div>
                    </div>
                </div>
            </div>
        `;
        
        // Add tab switching functionality
        container.querySelectorAll('.driver-details-tab').forEach(tab => {
            tab.addEventListener('click', function() {
                const tabName = this.getAttribute('data-tab');
                
                // Update active tab
                container.querySelectorAll('.driver-details-tab').forEach(t => {
                    t.classList.remove('active');
                });
                this.classList.add('active');
                
                // Update active content
                container.querySelectorAll('.driver-details-content').forEach(content => {
                    content.classList.remove('active');
                });
                document.getElementById(tabName + 'Details').classList.add('active');
            });
        });
        
        openModal('#driverDetailsModal');
    };
    
    window.editDriver = function(driverId) {
        const driver = allDrivers.find(d => d.id === driverId);
        if (!driver) return;
        
        isEditMode = true;
        currentDriverId = driverId;
        
        // Set modal title
        document.getElementById('formModalTitle').textContent = 'Edit Driver';
        
        // Populate form fields
        document.getElementById('driverId').value = driver.driverId || driver.id;
        document.getElementById('firstName').value = driver.firstName;
        document.getElementById('lastName').value = driver.lastName;
        document.getElementById('email').value = driver.email;
        
        // Parse phone number
        const phone = driver.phone || '';
        if (phone.includes('+')) {
            const codeMatch = phone.match(/^(\+\d+)/);
            if (codeMatch) {
                document.getElementById('phoneCode').value = codeMatch[1];
                document.getElementById('phone').value = phone.replace(codeMatch[1], '');
            }
        } else {
            document.getElementById('phone').value = phone;
        }
        
        document.getElementById('dob').value = driver.dob || '';
        document.getElementById('gender').value = driver.gender || 'male';
        document.getElementById('nationality').value = driver.nationality || '';
        document.getElementById('address').value = driver.address || '';
        
        // License tab
        document.getElementById('licenseNumber').value = driver.licenseNumber || '';
        document.getElementById('licenseType').value = driver.licenseType || '';
        document.getElementById('licenseIssued').value = driver.licenseIssued || '';
        document.getElementById('licenseExpiry').value = driver.licenseExpiry || '';
        document.getElementById('issuingAuthority').value = driver.issuingAuthority || '';
        
        // Employment tab
        document.getElementById('employmentStatus').value = driver.employmentStatus || 'full-time';
        document.getElementById('hireDate').value = driver.hireDate || '';
        document.getElementById('assignedTruck').value = driver.assignedTruck || '';
        setRating(driver.rating || 4.5);
        document.getElementById('experienceYears').value = driver.experienceYears || 0;
        document.getElementById('hourlyRate').value = driver.hourlyRate || '';
        
        // Emergency tab
        document.getElementById('emergencyName').value = driver.emergencyName || '';
        document.getElementById('emergencyPhone').value = driver.emergencyPhone || '';
        document.getElementById('emergencyRelationship').value = driver.emergencyRelationship || '';
        document.getElementById('emergencyEmail').value = driver.emergencyEmail || '';
        document.getElementById('medicalInfo').value = driver.medicalInfo || '';
        document.getElementById('insuranceInfo').value = driver.insuranceInfo || '';
        
        // Specializations
        document.querySelectorAll('input[name="specializations"]').forEach(cb => {
            cb.checked = driver.specializations?.includes(cb.value) || false;
        });
        
        // Update photo preview if available
        const photoPreview = document.getElementById('photoPreview');
        if (photoPreview && driver.photoUrl) {
            photoPreview.innerHTML = `
                <img src="${getDriverPhoto(driver)}" class="driver-photo-preview"
                     onerror="this.onerror=null;this.src='assets/images/driver-avatar.jpg';">
                <p>Click to change photo</p>
                <small>Current driver photo</small>
            `;
        }
        
        // Validate license dates
        validateLicenseDates();
        
        // Open modal
        openModal('#driverFormModal');
    };
    
    window.assignTruckToDriver = function(driverId) {
        const driver = allDrivers.find(d => d.id === driverId);
        if (!driver) return;
        
        // Populate driver select
        const driverSelect = document.getElementById('assignDriverSelect');
        driverSelect.innerHTML = `
            <option value="${driver.id}">${driver.firstName} ${driver.lastName} (${driver.driverId || driver.id})</option>
        `;
        
        // Set default assignment date to today
        document.getElementById('assignmentDate').value = new Date().toISOString().split('T')[0];
        
        // Update truck dropdown
        updateTruckDropdown();
        
        openModal('#assignTruckModal');
    };
    
    window.assignTripToDriver = function(driverId) {
        const driver = allDrivers.find(d => d.id === driverId);
        if (!driver) return;
        
        // This would open a modal for trip assignment
        // For now, we'll show an alert
        alert(`Trip assignment for ${driver.firstName} ${driver.lastName}\n\nThis feature requires trip data from /trips endpoint.`);
        
        // TODO: Implement trip assignment modal
        // 1. Fetch available trips
        // 2. Show trip selection modal
        // 3. Update trip with driver assignment
    };
    
    window.scheduleDriver = function(driverId) {
        const driver = allDrivers.find(d => d.id === driverId);
        if (!driver) return;
        
        document.getElementById('scheduleModalTitle').textContent = 
            `Schedule ${driver.firstName} ${driver.lastName}`;
        
        // Set default schedule date to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        document.getElementById('scheduleDate').value = tomorrow.toISOString().split('T')[0];
        
        openModal('#scheduleModal');
    };
    
    window.previewDriverPhoto = function(event) {
        const input = event.target;
        const preview = document.getElementById('photoPreview');
        
        if (input.files && input.files[0]) {
            currentPhotoFile = input.files[0];
            const reader = new FileReader();
            
            reader.onload = function(e) {
                preview.innerHTML = `
                    <img src="${e.target.result}" class="driver-photo-preview">
                    <p>Click to change photo</p>
                    <small>Photo uploaded successfully</small>
                `;
            };
            
            reader.readAsDataURL(input.files[0]);
        }
    };
    
    window.toggleDriverSelection = function(driverId, isChecked) {
        if (isChecked) {
            selectedDrivers.add(driverId);
        } else {
            selectedDrivers.delete(driverId);
        }
        
        // Update select all checkbox
        const selectAll = document.getElementById('selectAll');
        const allCheckboxes = document.querySelectorAll('.driver-checkbox');
        const allChecked = Array.from(allCheckboxes).every(cb => cb.checked);
        selectAll.checked = allChecked;
        selectAll.indeterminate = !allChecked && selectedDrivers.size > 0;
    };
    
    window.changePage = function(page) {
        goToPage(page);
    };
    
    window.confirmDeleteDriver = function(driverId) {
        const driver = allDrivers.find(d => d.id === driverId);
        if (!driver) return;
        
        currentDriverId = driverId;
        
        document.getElementById('deleteMessage').textContent = 
            `Are you sure you want to delete driver ${driver.firstName} ${driver.lastName} (${driver.driverId || driver.id})? This action cannot be undone.`;
        
        openModal('#deleteModal');
    };
    
    window.exportDrivers = function() {
        // Create CSV content
        const headers = ['Driver ID', 'Name', 'Email', 'Phone', 'License', 'Status', 'Assigned Truck', 'Rating', 'Join Date'];
        const rows = allDrivers.map(driver => [
            driver.driverId || driver.id,
            `"${driver.firstName} ${driver.lastName}"`,
            driver.email,
            driver.phone,
            driver.licenseNumber,
            getStatusText(driver.status),
            driver.assignedTruck || 'None',
            (driver.rating || 0).toFixed(1),
            formatDate(driver.joinDate)
        ]);
        
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');
        
        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `drivers_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showSuccessMessage('Drivers exported successfully!');
    };

    // Modal functions
    window.openModal = function(modalId) {
        const modal = document.querySelector(modalId);
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            setTimeout(() => {
                modal.classList.add('active');
            }, 10);
        }
    };
    
    window.closeModal = function(modalId) {
        const modal = document.querySelector(modalId);
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => {
                modal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }, 300);
        }
    };
    
    function closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
            modal.style.display = 'none';
        });
        document.body.style.overflow = 'auto';
    }

    // Set user info
    function setUserInfo() {
        try {
            const currentUser = JSON.parse(localStorage.getItem('currentUser'));
            if (currentUser) {
                const userName = document.getElementById('userName');
                const adminName = document.getElementById('adminName');
                const greetingName = document.getElementById('greetingName');
                
                const name = currentUser.firstName || currentUser.name || 'Admin';
                
                if (userName) userName.textContent = name;
                if (adminName) adminName.textContent = name;
                if (greetingName) greetingName.textContent = name;
            }
        } catch (error) {
            console.error('Error setting user info:', error);
        }
    }

    // Initialize when DOM is fully loaded
    window.addEventListener('load', initPage);
    
    // Open add driver modal function
    window.openAddDriverModal = function() {
        isEditMode = false;
        currentDriverId = null;
        currentPhotoFile = null;
        
        document.getElementById('formModalTitle').textContent = 'Add New Driver';
        resetDriverForm();
        generateDriverId();
        openModal('#driverFormModal');
    };
});

// Global notification function
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

// Add CSS for notifications if not already added
if (!document.querySelector('#notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
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
    `;
    document.head.appendChild(style);
}