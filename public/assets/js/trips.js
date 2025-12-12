// Trips Management JavaScript

// Global variables
let liveTrackingMap = null;
let fullScreenMap = null;
let activeTripMarkers = new Map();
let currentTab = 0;
let currentTripId = null;
const API_BASE_URL = 'http://localhost:5000';

$(document).ready(function() {
    // Initialize DataTable
    const tripsTable = $('#tripsTable').DataTable({
        pageLength: 10,
        lengthMenu: [[10, 25, 50, 100], [10, 25, 50, 100]],
        order: [[1, 'desc']],
        columnDefs: [
            { orderable: false, targets: [0, 9] },
            { className: 'dt-center', targets: [0, 8, 9] }
        ],
        language: {
            search: "Search trips:",
            lengthMenu: "Show _MENU_ trips per page",
            info: "Showing _START_ to _END_ of _TOTAL_ trips",
            infoEmpty: "No trips available",
            infoFiltered: "(filtered from _MAX_ total trips)",
            paginate: {
                first: "First",
                last: "Last",
                next: "Next",
                previous: "Previous"
            }
        }
    });
    
    // Initialize live tracking map
    initializeLiveTrackingMap();
    
    // Load real trips data from API
    loadTripsData();
    loadActiveTrips();
    
    // Initialize components if function exists
    if (typeof initializeComponents === 'function') {
        initializeComponents();
    }
    
    // Event Listeners
    $('#createTripBtn').click(openCreateTripModal);
    $('#refreshTrips').click(refreshTripsData);
    $('#exportTrips').click(exportTripsData);
    $('#refreshLiveTracking').click(refreshLiveTracking);
    $('#showAllTrips').click(showAllTripsOnMap);
    
    // Table row click for details
    $('#tripsTableBody').on('click', 'tr', function(e) {
        if (!$(e.target).is('input[type="checkbox"]') && !$(e.target).is('button')) {
            const tripId = $(this).data('trip-id');
            openTripDetails(tripId);
        }
    });
    
    // Status update button click
    $('#updateStatusBtn').click(openStatusUpdateModal);
    $('#saveTripStatusBtn').click(saveTripStatus);
    $('#cancelTripStatusBtn').click(function() {
        closeModal('#tripStatusModal');
    });
    
    // Live tracking button
    $('#trackLiveBtn').click(openLiveTrackingModal);
    
    // Cancel trip button
    $('#cancelTripBtn').click(cancelTrip);
    
    // Send update button
    $('#sendUpdateBtn').click(function() {
        showToast('Sending update to driver...', 'info');
        setTimeout(() => {
            showToast('Update sent successfully', 'success');
        }, 1000);
    });
    
    // Trip form navigation
    const tabs = $('.form-tab');
    const tabContents = $('.tab-content');
    
    tabs.click(function() {
        const tabId = $(this).data('tab');
        activateTab(tabId);
    });
    
    $('#prevTabBtn').click(function() {
        if (currentTab > 0) {
            currentTab--;
            const tabId = $('.form-tab').eq(currentTab).data('tab');
            activateTab(tabId);
        }
    });
    
    $('#nextTabBtn').click(function() {
        if (currentTab < tabs.length - 1) {
            currentTab++;
            const tabId = $('.form-tab').eq(currentTab).data('tab');
            activateTab(tabId);
        }
    });
    
    // Trip status select change
    $('#tripStatusSelect').change(function() {
        const status = $(this).val();
        if (status === 'delayed') {
            $('#delayReasonGroup').show();
            $('#estimatedDelayGroup').show();
        } else {
            $('#delayReasonGroup').hide();
            $('#estimatedDelayGroup').hide();
        }
    });
    
    // Call driver button
    $('#callDriverBtn').click(function() {
        const phone = $('#liveDriverPhone').text();
        if (phone) {
            window.open(`tel:${phone}`, '_blank');
        }
    });
    
    // Send message to driver
    $('#sendMessageBtn').click(function() {
        const message = $('#driverMessage').val().trim();
        if (message) {
            sendDriverMessage(message);
            $('#driverMessage').val('');
        }
    });
    
    // Search functionality
    $('#globalSearch').on('keyup', function() {
        tripsTable.search(this.value).draw();
    });
    
    // Filter by status
    $('.status-filter').click(function() {
        const status = $(this).data('status');
        tripsTable.column(8).search(status).draw();
    });
    
    // Close modals when clicking outside
    $(document).on('click', function(e) {
        if ($(e.target).hasClass('modal')) {
            closeModal($(e.target).attr('id'));
        }
    });
    
    // Esc key to close modals
    $(document).keydown(function(e) {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
    
    // Initialize form date inputs
    const today = new Date().toISOString().split('T')[0];
    $('#tripStartDate').val(today);
    $('#tripArrivalDate').val(today);
    
    // Initialize booking preview
    $('#bookingSelect').change(function() {
        updateBookingPreview($(this).val());
    });
    
    // Submit trip form
    $('#tripForm').submit(function(e) {
        e.preventDefault();
        createTrip();
    });
    
    // Initialize map controls
    $('#zoomIn').click(() => liveTrackingMap.zoomIn());
    $('#zoomOut').click(() => liveTrackingMap.zoomOut());
    $('#centerMap').click(() => liveTrackingMap.setView([40.7128, -74.0060], 5));
    $('#refreshLiveMap').click(refreshLiveMap);
    $('#fullScreenBtn').click(toggleFullScreenMap);
});

function initializeLiveTrackingMap() {
    // Initialize main live tracking map
    liveTrackingMap = L.map('liveTrackingMap').setView([40.7128, -74.0060], 5);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(liveTrackingMap);
    
    // Initialize full screen map
    fullScreenMap = L.map('fullScreenMap').setView([40.7128, -74.0060], 5);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(fullScreenMap);
    
    // Add scale control
    L.control.scale().addTo(liveTrackingMap);
    L.control.scale().addTo(fullScreenMap);
}

function loadTripsData() {
    // Show loading state
    $('#tripsTableBody').html(`
        <tr>
            <td colspan="10" class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2">Loading trips data...</p>
            </td>
        </tr>
    `);
    
    // Fetch trips from API
    $.ajax({
        url: `${API_BASE_URL}/trips`,
        method: 'GET',
        dataType: 'json',
        success: function(trips) {
            populateTripsTable(trips);
        },
        error: function(error) {
            console.error('Error loading trips:', error);
            showToast('Failed to load trips data. Please try again.', 'error');
            // Fallback to sample data if API fails
            loadSampleTripsData();
        }
    });
}

function populateTripsTable(trips) {
    const tableBody = $('#tripsTableBody');
    tableBody.empty();
    
    if (!trips || trips.length === 0) {
        tableBody.html(`
            <tr>
                <td colspan="10" class="text-center py-4">
                    <i class="fas fa-truck fa-2x text-muted mb-3"></i>
                    <p class="text-muted">No trips found</p>
                </td>
            </tr>
        `);
        return;
    }
    
    trips.forEach(trip => {
        const statusClass = getStatusClass(trip.status);
        const statusText = trip.statusText || formatStatusText(trip.status);
        const row = `
            <tr data-trip-id="${trip.id}">
                <td>
                    <input type="checkbox" class="row-checkbox">
                </td>
                <td>${trip.id || 'N/A'}</td>
                <td>${trip.bookingId || 'N/A'}</td>
                <td>${trip.truck || 'N/A'}</td>
                <td>
                    <div class="driver-cell">
                        <i class="fas fa-user-tie"></i>
                        ${trip.driver || 'Unassigned'}
                    </div>
                </td>
                <td>
                    <div class="route-cell">
                        <i class="fas fa-map-marker-alt text-primary"></i>
                        ${trip.route || 'No route specified'}
                    </div>
                </td>
                <td>${formatDate(trip.startTime)}</td>
                <td>${formatDate(trip.eta)}</td>
                <td>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </td>
                <td>
                    <div class="table-actions">
                        <button class="action-btn" title="View Details" onclick="openTripDetails('${trip.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn" title="Track Live" onclick="trackTrip('${trip.id}')">
                            <i class="fas fa-map-marker-alt"></i>
                        </button>
                        <button class="action-btn" title="Update Status" onclick="updateTripStatus('${trip.id}')">
                            <i class="fas fa-sync-alt"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
        tableBody.append(row);
    });
    
    // Update stats
    updateTripStats(trips);
}

function loadActiveTrips() {
    // Fetch active trips from API
    $.ajax({
        url: `${API_BASE_URL}/trips?status=in-progress`,
        method: 'GET',
        dataType: 'json',
        success: function(activeTrips) {
            populateActiveTripsList(activeTrips);
            addTripMarkers(activeTrips);
        },
        error: function(error) {
            console.error('Error loading active trips:', error);
            // Fallback to sample active trips
            loadSampleActiveTrips();
        }
    });
}

function populateActiveTripsList(trips) {
    const activeTripsList = $('#activeTripsList');
    activeTripsList.empty();
    
    if (!trips || trips.length === 0) {
        activeTripsList.html(`
            <div class="text-center py-4">
                <i class="fas fa-truck fa-2x text-muted mb-3"></i>
                <p class="text-muted">No active trips</p>
            </div>
        `);
        return;
    }
    
    trips.forEach(trip => {
        const statusClass = trip.status === 'delayed' ? 'delayed' : 'in-progress';
        const statusText = trip.status === 'delayed' ? 'Delayed' : 'In Progress';
        const tripItem = `
            <div class="active-trip-item" data-trip-id="${trip.id}" onclick="openTripDetails('${trip.id}')">
                <div class="trip-header">
                    <div class="trip-id">${trip.id}</div>
                    <span class="trip-status ${statusClass}">${statusText}</span>
                </div>
                <div class="trip-route">
                    <div class="route-point">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${trip.pickup || 'Pickup location'}</span>
                    </div>
                    <div class="route-divider"></div>
                    <div class="route-point">
                        <i class="fas fa-flag-checkered"></i>
                        <span>${trip.delivery || 'Delivery location'}</span>
                    </div>
                </div>
                <div class="trip-metrics">
                    <div class="metric-item">
                        <i class="fas fa-road"></i>
                        <span>${trip.distance || 'N/A'}</span>
                    </div>
                    <div class="metric-item">
                        <i class="fas fa-clock"></i>
                        <span>ETA: ${trip.eta ? formatDate(trip.eta) : 'N/A'}</span>
                    </div>
                </div>
            </div>
        `;
        activeTripsList.append(tripItem);
    });
}

function addTripMarkers(trips) {
    // Clear existing markers
    activeTripMarkers.forEach(marker => marker.remove());
    activeTripMarkers.clear();
    
    if (!trips || trips.length === 0) return;
    
    // Add markers for active trips
    trips.forEach(trip => {
        if (trip.latitude && trip.longitude) {
            const marker = L.marker([trip.latitude, trip.longitude], {
                icon: L.divIcon({
                    html: `<div class="custom-marker ${trip.status}">
                             <i class="fas fa-truck"></i>
                             <span>${trip.id}</span>
                           </div>`,
                    className: 'custom-div-icon',
                    iconSize: [40, 40]
                })
            }).addTo(liveTrackingMap);
            
            marker.bindPopup(`
                <strong>${trip.id}</strong><br>
                ${trip.pickup || ''} → ${trip.delivery || ''}<br>
                Status: ${trip.status}<br>
                Driver: ${trip.driver || 'Unassigned'}<br>
                ETA: ${trip.eta ? formatDate(trip.eta) : 'N/A'}
            `);
            
            activeTripMarkers.set(trip.id, marker);
        }
    });
}

function openTripDetails(tripId) {
    currentTripId = tripId;
    
    // Fetch trip details from API
    $.ajax({
        url: `${API_BASE_URL}/trips/${tripId}`,
        method: 'GET',
        dataType: 'json',
        success: function(trip) {
            populateTripDetailsModal(trip);
            loadTripUpdates(tripId);
            openModal('#tripDetailsModal');
        },
        error: function(error) {
            console.error('Error loading trip details:', error);
            showToast('Failed to load trip details', 'error');
        }
    });
}

function populateTripDetailsModal(trip) {
    // Update modal with trip details
    $('#detailTripId').text(trip.id || 'N/A');
    $('#detailBookingId').text(trip.bookingId || 'N/A');
    $('#detailCustomerName').text(trip.customerName || 'N/A');
    $('#detailPickupLocation').text(trip.pickup || 'N/A');
    $('#detailPickupTime').text(trip.startTime ? formatDate(trip.startTime) : 'N/A');
    $('#detailDeliveryLocation').text(trip.delivery || 'N/A');
    $('#detailDeliveryTime').text(trip.eta ? formatDate(trip.eta) : 'N/A');
    $('#detailTruckNumber').text(trip.truck || 'N/A');
    $('#detailDriverName').text(trip.driver || 'Unassigned');
    $('#detailDriverPhone').text(trip.driverPhone || 'N/A');
    $('#detailPackageType').text(trip.packageType || 'N/A');
    $('#detailPackageWeight').text(trip.packageWeight || 'N/A');
    $('#detailDistance').text(trip.distance || 'N/A');
    $('#detailFuelUsed').text(trip.fuelUsed || 'N/A');
    $('#detailAvgSpeed').text(trip.avgSpeed || 'N/A');
    $('#detailStops').text(trip.stops || '0');
    $('#detailTripDuration').text(trip.duration || 'N/A');
    
    // Set status
    const statusElement = $('#detailTripStatus');
    const statusText = trip.statusText || formatStatusText(trip.status);
    statusElement.removeClass().addClass('trip-status ' + (trip.status || 'scheduled'));
    statusElement.text(statusText);
}

function openCreateTripModal() {
    currentTab = 0;
    activateTab('booking');
    
    // Load bookings for selection
    loadBookings();
    loadDrivers();
    loadTrucks();
    
    openModal('#createTripModal');
}

function openStatusUpdateModal() {
    if (!currentTripId) return;
    
    // Set current trip ID in modal
    $('#tripStatusSelect').val('in-progress');
    $('#delayReasonGroup').hide();
    $('#estimatedDelayGroup').hide();
    $('#tripStatusNotes').val('');
    $('#delayReason').val('');
    $('#estimatedDelay').val('');
    
    openModal('#tripStatusModal');
}

function openLiveTrackingModal() {
    const tripId = $('#detailTripId').text();
    $('#liveTripId').text(tripId);
    
    // Load live tracking data
    loadLiveTrackingData(tripId);
    
    openModal('#liveTrackingModal');
}

function activateTab(tabId) {
    // Deactivate all tabs
    $('.form-tab').removeClass('active');
    $('.tab-content').removeClass('active');
    
    // Activate selected tab
    $(`.form-tab[data-tab="${tabId}"]`).addClass('active');
    $(`#${tabId}Tab`).addClass('active');
    
    // Update navigation buttons
    const tabIndex = $('.form-tab').toArray().findIndex(tab => $(tab).data('tab') === tabId);
    currentTab = tabIndex;
    
    $('#prevTabBtn').toggle(tabIndex > 0);
    $('#nextTabBtn').toggle(tabIndex < $('.form-tab').length - 1);
    $('#submitTripBtn').toggle(tabIndex === $('.form-tab').length - 1);
}

function refreshTripsData() {
    // Show loading state
    const originalText = $('#refreshTrips').html();
    $('#refreshTrips').html('<i class="fas fa-spinner fa-spin"></i> Refreshing');
    $('#refreshTrips').prop('disabled', true);
    
    // Fetch fresh data from API
    loadTripsData();
    loadActiveTrips();
    
    // Reset button state
    setTimeout(() => {
        $('#refreshTrips').html(originalText);
        $('#refreshTrips').prop('disabled', false);
        showToast('Trips data refreshed successfully', 'success');
    }, 500);
}

function refreshLiveTracking() {
    const originalText = $('#refreshLiveTracking').html();
    $('#refreshLiveTracking').html('<i class="fas fa-spinner fa-spin"></i>');
    $('#refreshLiveTracking').prop('disabled', true);
    
    loadActiveTrips();
    
    setTimeout(() => {
        $('#refreshLiveTracking').html(originalText);
        $('#refreshLiveTracking').prop('disabled', false);
        showToast('Live tracking data updated', 'success');
    }, 800);
}

function refreshLiveMap() {
    if (fullScreenMap) {
        fullScreenMap.invalidateSize();
        showToast('Map refreshed', 'info');
    }
}

function showAllTripsOnMap() {
    if (liveTrackingMap) {
        liveTrackingMap.fitBounds([
            [25, -125], // Southwest coordinates
            [49, -66]   // Northeast coordinates
        ]);
        showToast('Showing all active trips', 'info');
    }
}

function toggleFullScreenMap() {
    const mapContainer = $('#fullScreenMap').parent();
    const button = $('#fullScreenBtn');
    const icon = button.find('i');
    
    if (mapContainer.hasClass('fullscreen')) {
        mapContainer.removeClass('fullscreen');
        button.removeClass('active');
        icon.removeClass('fa-compress').addClass('fa-expand');
    } else {
        mapContainer.addClass('fullscreen');
        button.addClass('active');
        icon.removeClass('fa-expand').addClass('fa-compress');
    }
    
    if (fullScreenMap) {
        setTimeout(() => {
            fullScreenMap.invalidateSize();
        }, 300);
    }
}

function exportTripsData() {
    showToast('Exporting trips data...', 'info');
    
    // Fetch trips data for export
    $.ajax({
        url: `${API_BASE_URL}/trips`,
        method: 'GET',
        dataType: 'json',
        success: function(trips) {
            generateCSVExport(trips);
        },
        error: function(error) {
            console.error('Error exporting trips:', error);
            showToast('Failed to export trips data', 'error');
        }
    });
}

function generateCSVExport(trips) {
    if (!trips || trips.length === 0) {
        showToast('No trips data to export', 'warning');
        return;
    }
    
    // Create CSV content
    let csvContent = "Trip ID,Booking ID,Truck,Driver,Route,Start Time,ETA,Status\n";
    
    trips.forEach(trip => {
        csvContent += `${trip.id || ''},${trip.bookingId || ''},${trip.truck || ''},${trip.driver || ''},${trip.route || ''},${trip.startTime || ''},${trip.eta || ''},${trip.status || ''}\n`;
    });
    
    // Create and download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'trips_export_' + new Date().toISOString().split('T')[0] + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showToast('Trips data exported successfully', 'success');
}

function saveTripStatus() {
    if (!currentTripId) {
        showToast('No trip selected', 'error');
        return;
    }
    
    const newStatus = $('#tripStatusSelect').val();
    const notes = $('#tripStatusNotes').val();
    const delayReason = $('#delayReason').val();
    const estimatedDelay = $('#estimatedDelay').val();
    
    if (!newStatus) {
        showToast('Please select a status', 'error');
        return;
    }
    
    if (newStatus === 'delayed' && !delayReason) {
        showToast('Please select a delay reason', 'error');
        return;
    }
    
    // Prepare update data
    const updateData = {
        status: newStatus,
        statusText: formatStatusText(newStatus),
        notes: notes,
        updatedAt: new Date().toISOString()
    };
    
    if (newStatus === 'delayed') {
        updateData.delayReason = delayReason;
        updateData.estimatedDelay = estimatedDelay;
    }
    
    // Show loading state
    $('#saveTripStatusBtn').html('<i class="fas fa-spinner fa-spin"></i> Updating');
    $('#saveTripStatusBtn').prop('disabled', true);
    
    // Update trip via API
    $.ajax({
        url: `${API_BASE_URL}/trips/${currentTripId}`,
        method: 'PATCH',
        contentType: 'application/json',
        data: JSON.stringify(updateData),
        success: function(updatedTrip) {
            showToast(`Trip status updated to ${newStatus}`, 'success');
            closeModal('#tripStatusModal');
            
            // Reset button state
            $('#saveTripStatusBtn').html('Update Status');
            $('#saveTripStatusBtn').prop('disabled', false);
            
            // Refresh data
            refreshTripsData();
        },
        error: function(error) {
            console.error('Error updating trip status:', error);
            showToast('Failed to update trip status', 'error');
            $('#saveTripStatusBtn').html('Update Status');
            $('#saveTripStatusBtn').prop('disabled', false);
        }
    });
}

function sendDriverMessage(message) {
    if (!message.trim()) {
        showToast('Please enter a message', 'error');
        return;
    }
    
    // Simulate sending message (in real app, this would call an API)
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const messageItem = `
        <div class="update-message">
            <p><strong>You:</strong> ${message}</p>
            <span>${timestamp}</span>
        </div>
    `;
    
    $('#liveUpdatesList').prepend(messageItem);
    showToast('Message sent to driver', 'success');
}

function loadTripUpdates(tripId) {
    // Fetch updates for this trip from API
    $.ajax({
        url: `${API_BASE_URL}/updates?tripId=${tripId}`,
        method: 'GET',
        dataType: 'json',
        success: function(updates) {
            populateTripUpdates(updates);
        },
        error: function(error) {
            console.error('Error loading trip updates:', error);
            // Show default updates if API fails
            loadSampleTripUpdates();
        }
    });
}

function populateTripUpdates(updates) {
    const updatesList = $('#tripUpdates');
    updatesList.empty();
    
    if (!updates || updates.length === 0) {
        updatesList.html(`
            <div class="update-item">
                <p class="text-muted">No updates available</p>
            </div>
        `);
        return;
    }
    
    updates.forEach(update => {
        const updateItem = `
            <div class="update-item ${update.type === 'system' ? 'system' : ''}">
                <h5>${update.title || 'Update'}</h5>
                <p>${update.message || ''}</p>
                <span>${update.time || ''}</span>
            </div>
        `;
        updatesList.append(updateItem);
    });
}

function loadLiveTrackingData(tripId) {
    // Fetch live tracking data from API
    $.ajax({
        url: `${API_BASE_URL}/trips/${tripId}`,
        method: 'GET',
        dataType: 'json',
        success: function(trip) {
            populateLiveTrackingModal(trip);
        },
        error: function(error) {
            console.error('Error loading live tracking data:', error);
            showToast('Failed to load live tracking data', 'error');
        }
    });
}

function populateLiveTrackingModal(trip) {
    // Update live tracking info
    $('#currentSpeed').text(trip.currentSpeed || 'N/A');
    $('#distanceCovered').text(trip.distanceCovered || 'N/A');
    $('#distanceRemaining').text(trip.distanceRemaining || 'N/A');
    $('#liveEta').text(trip.eta ? formatDate(trip.eta) : 'N/A');
    $('#liveDriverName').text(trip.driver || 'Unassigned');
    $('#liveDriverPhone').text(trip.driverPhone || 'N/A');
    
    // Load live updates
    loadLiveUpdates(trip.id);
    
    // Add marker to full screen map
    if (fullScreenMap && trip.latitude && trip.longitude) {
        fullScreenMap.eachLayer((layer) => {
            if (layer instanceof L.Marker) {
                fullScreenMap.removeLayer(layer);
            }
        });
        
        // Add current trip marker
        const marker = L.marker([trip.latitude, trip.longitude], {
            icon: L.divIcon({
                html: `<div class="custom-marker ${trip.status || 'scheduled'}">
                         <i class="fas fa-truck"></i>
                         <span>${trip.id}</span>
                       </div>`,
                className: 'custom-div-icon',
                iconSize: [40, 40]
            })
        }).addTo(fullScreenMap);
        
        marker.bindPopup(`
            <strong>${trip.id}</strong><br>
            ${trip.pickup || ''} → ${trip.delivery || ''}<br>
            Status: ${trip.status}<br>
            Driver: ${trip.driver || 'Unassigned'}<br>
            ETA: ${trip.eta ? formatDate(trip.eta) : 'N/A'}
        `);
        
        fullScreenMap.setView([trip.latitude, trip.longitude], 6);
    }
}

function loadLiveUpdates(tripId) {
    // Fetch live updates from API
    $.ajax({
        url: `${API_BASE_URL}/live-updates?tripId=${tripId}`,
        method: 'GET',
        dataType: 'json',
        success: function(liveUpdates) {
            populateLiveUpdates(liveUpdates);
        },
        error: function(error) {
            console.error('Error loading live updates:', error);
            // Show sample updates if API fails
            loadSampleLiveUpdates();
        }
    });
}

function populateLiveUpdates(updates) {
    const updatesList = $('#liveUpdatesList');
    updatesList.empty();
    
    if (!updates || updates.length === 0) {
        updatesList.html(`
            <div class="update-message text-muted">
                <p>No live updates available</p>
            </div>
        `);
        return;
    }
    
    updates.forEach(update => {
        const updateClass = update.type === 'system' ? 'system' : '';
        const updateItem = `
            <div class="update-message ${updateClass}">
                <p>${update.message || ''}</p>
                <span>${update.time || ''}</span>
            </div>
        `;
        updatesList.append(updateItem);
    });
}

function updateTripStats(trips) {
    if (!trips) {
        // Fetch trips for stats if not provided
        $.ajax({
            url: `${API_BASE_URL}/trips`,
            method: 'GET',
            dataType: 'json',
            success: function(allTrips) {
                calculateStats(allTrips);
            },
            error: function(error) {
                console.error('Error loading stats:', error);
                setDefaultStats();
            }
        });
        return;
    }
    
    calculateStats(trips);
}

function calculateStats(trips) {
    const activeCount = trips.filter(t => t.status === 'in-progress').length;
    const scheduledCount = trips.filter(t => t.status === 'scheduled').length;
    const completedCount = trips.filter(t => t.status === 'completed').length;
    const delayedCount = trips.filter(t => t.status === 'delayed').length;
    
    $('#activeTripsCount').text(activeCount);
    $('#scheduledTrips').text(scheduledCount);
    $('#completedTrips').text(completedCount);
    $('#delayedTrips').text(delayedCount);
    
    // Update badge in sidebar
    $('#tripBadge').text(activeCount + delayedCount);
}

function setDefaultStats() {
    $('#activeTripsCount').text('0');
    $('#scheduledTrips').text('0');
    $('#completedTrips').text('0');
    $('#delayedTrips').text('0');
    $('#tripBadge').text('0');
}

function getStatusClass(status) {
    switch(status) {
        case 'in-progress': return 'status-primary';
        case 'scheduled': return 'status-info';
        case 'completed': return 'status-success';
        case 'delayed': return 'status-warning';
        case 'cancelled': return 'status-danger';
        default: return 'status-secondary';
    }
}

function formatStatusText(status) {
    switch(status) {
        case 'in-progress': return 'In Progress';
        case 'scheduled': return 'Scheduled';
        case 'completed': return 'Completed';
        case 'delayed': return 'Delayed';
        case 'cancelled': return 'Cancelled';
        default: return status || 'Unknown';
    }
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return dateString;
        }
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return dateString;
    }
}

function trackTrip(tripId) {
    openTripDetails(tripId);
    setTimeout(() => {
        $('#trackLiveBtn').click();
    }, 500);
}

function updateTripStatus(tripId) {
    openTripDetails(tripId);
    setTimeout(() => {
        $('#updateStatusBtn').click();
    }, 500);
}

function cancelTrip() {
    if (!currentTripId) return;
    
    if (confirm(`Are you sure you want to cancel trip ${currentTripId}? This action cannot be undone.`)) {
        showToast(`Cancelling trip ${currentTripId}...`, 'info');
        
        // Update trip status via API
        $.ajax({
            url: `${API_BASE_URL}/trips/${currentTripId}`,
            method: 'PATCH',
            contentType: 'application/json',
            data: JSON.stringify({
                status: 'cancelled',
                statusText: 'Cancelled',
                cancelledAt: new Date().toISOString()
            }),
            success: function() {
                showToast(`Trip ${currentTripId} cancelled successfully`, 'success');
                closeModal('#tripDetailsModal');
                refreshTripsData();
            },
            error: function(error) {
                console.error('Error cancelling trip:', error);
                showToast('Failed to cancel trip', 'error');
            }
        });
    }
}

function createTrip() {
    const bookingId = $('#bookingSelect').val();
    const truck = $('#truckSelect').val();
    const driver = $('#driverSelect').val();
    const startDate = $('#tripStartDate').val();
    const startTime = $('#tripStartTime').val();
    const arrivalDate = $('#tripArrivalDate').val();
    const arrivalTime = $('#tripArrivalTime').val();
    
    if (!bookingId || !truck || !driver || !startDate || !startTime || !arrivalDate || !arrivalTime) {
        showToast('Please fill all required fields', 'error');
        return;
    }
    
    // Prepare trip data
    const tripData = {
        id: 'TRP-' + Math.floor(1000 + Math.random() * 9000),
        bookingId: bookingId,
        truck: truck,
        driver: driver,
        startTime: `${startDate}T${startTime}`,
        eta: `${arrivalDate}T${arrivalTime}`,
        status: 'scheduled',
        statusText: 'Scheduled',
        createdAt: new Date().toISOString(),
        route: $('#routePreview').text() || 'Route not specified'
    };
    
    // Show loading state
    $('#submitTripBtn').html('<i class="fas fa-spinner fa-spin"></i> Creating...');
    $('#submitTripBtn').prop('disabled', true);
    
    // Create trip via API
    $.ajax({
        url: `${API_BASE_URL}/trips`,
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(tripData),
        success: function(newTrip) {
            showToast('Trip created successfully!', 'success');
            closeModal('#createTripModal');
            
            // Reset form
            $('#tripForm')[0].reset();
            $('#submitTripBtn').html('<i class="fas fa-check"></i> Create Trip');
            $('#submitTripBtn').prop('disabled', false);
            
            // Refresh data
            refreshTripsData();
        },
        error: function(error) {
            console.error('Error creating trip:', error);
            showToast('Failed to create trip', 'error');
            $('#submitTripBtn').html('<i class="fas fa-check"></i> Create Trip');
            $('#submitTripBtn').prop('disabled', false);
        }
    });
}

function loadBookings() {
    // Fetch bookings from API
    $.ajax({
        url: `${API_BASE_URL}/bookings`,
        method: 'GET',
        dataType: 'json',
        success: function(bookings) {
            populateBookingsSelect(bookings);
        },
        error: function(error) {
            console.error('Error loading bookings:', error);
            populateBookingsSelect([]);
        }
    });
}

function populateBookingsSelect(bookings) {
    const select = $('#bookingSelect');
    select.empty();
    select.append('<option value="">Select a booking</option>');
    
    if (bookings && bookings.length > 0) {
        bookings.forEach(booking => {
            select.append(`<option value="${booking.id}">${booking.id} - ${booking.customerName || 'Customer'}</option>`);
        });
    }
}

function loadDrivers() {
    // Fetch drivers from API
    $.ajax({
        url: `${API_BASE_URL}/drivers`,
        method: 'GET',
        dataType: 'json',
        success: function(drivers) {
            populateDriversSelect(drivers);
        },
        error: function(error) {
            console.error('Error loading drivers:', error);
            populateDriversSelect([]);
        }
    });
}

function populateDriversSelect(drivers) {
    const select = $('#driverSelect');
    select.empty();
    select.append('<option value="">Select a driver</option>');
    
    if (drivers && drivers.length > 0) {
        drivers.forEach(driver => {
            select.append(`<option value="${driver.name}">${driver.name} (${driver.id})</option>`);
        });
    }
}

function loadTrucks() {
    // Fetch trucks from API
    $.ajax({
        url: `${API_BASE_URL}/trucks`,
        method: 'GET',
        dataType: 'json',
        success: function(trucks) {
            populateTrucksSelect(trucks);
        },
        error: function(error) {
            console.error('Error loading trucks:', error);
            populateTrucksSelect([]);
        }
    });
}

function populateTrucksSelect(trucks) {
    const select = $('#truckSelect');
    select.empty();
    select.append('<option value="">Select a truck</option>');
    
    if (trucks && trucks.length > 0) {
        trucks.forEach(truck => {
            select.append(`<option value="${truck.id}">${truck.id} (${truck.type || 'Truck'})</option>`);
        });
    }
}

function updateBookingPreview(bookingId) {
    const preview = $('#bookingPreview');
    
    if (!bookingId) {
        preview.html('<p class="text-muted">Select a booking to preview details</p>');
        return;
    }
    
    // Fetch booking details from API
    $.ajax({
        url: `${API_BASE_URL}/bookings/${bookingId}`,
        method: 'GET',
        dataType: 'json',
        success: function(booking) {
            preview.html(`
                <div class="booking-info-item">
                    <label>Customer:</label>
                    <p>${booking.customerName || 'N/A'}</p>
                </div>
                <div class="booking-info-item">
                    <label>Pickup:</label>
                    <p>${booking.pickupLocation || 'N/A'}</p>
                </div>
                <div class="booking-info-item">
                    <label>Delivery:</label>
                    <p>${booking.deliveryLocation || 'N/A'}</p>
                </div>
                <div class="booking-info-item">
                    <label>Package:</label>
                    <p>${booking.packageType || 'N/A'} ${booking.packageWeight ? `(${booking.packageWeight})` : ''}</p>
                </div>
                <div class="booking-info-item">
                    <label>Amount:</label>
                    <p>${booking.amount || 'N/A'}</p>
                </div>
            `);
        },
        error: function(error) {
            console.error('Error loading booking details:', error);
            preview.html('<p class="text-muted">Unable to load booking details</p>');
        }
    });
}

// Fallback functions for sample data
function loadSampleTripsData() {
    const sampleTrips = [
        {
            id: 'TRP-001',
            bookingId: 'BK-001',
            truck: 'TRK-001 (Box Truck)',
            driver: 'Michael Johnson',
            route: 'New York → Chicago',
            startTime: '2024-06-15 09:00',
            eta: '2024-06-15 14:30',
            status: 'in-progress',
            statusText: 'In Progress'
        },
        {
            id: 'TRP-002',
            bookingId: 'BK-002',
            truck: 'TRK-003 (Refrigerated)',
            driver: 'Robert Brown',
            route: 'Boston → Philadelphia',
            startTime: '2024-06-15 08:30',
            eta: '2024-06-15 16:00',
            status: 'scheduled',
            statusText: 'Scheduled'
        }
    ];
    
    populateTripsTable(sampleTrips);
}

function loadSampleActiveTrips() {
    const sampleActiveTrips = [
        {
            id: 'TRP-001',
            pickup: 'New York, NY',
            delivery: 'Chicago, IL',
            status: 'in-progress',
            distance: '225/350 km',
            eta: '2024-06-15 14:30',
            driver: 'Michael Johnson'
        }
    ];
    
    populateActiveTripsList(sampleActiveTrips);
}

function loadSampleTripUpdates() {
    const updatesList = $('#tripUpdates');
    const sampleUpdates = [
        {
            type: 'system',
            title: 'Trip Started',
            message: 'Truck departed from pickup location',
            time: '09:05 AM'
        },
        {
            type: 'driver',
            title: 'Driver Update',
            message: 'On route, making good time',
            time: '11:30 AM'
        }
    ];
    
    sampleUpdates.forEach(update => {
        const updateItem = `
            <div class="update-item ${update.type === 'system' ? 'system' : ''}">
                <h5>${update.title}</h5>
                <p>${update.message}</p>
                <span>${update.time}</span>
            </div>
        `;
        updatesList.append(updateItem);
    });
}

function loadSampleLiveUpdates() {
    const updatesList = $('#liveUpdatesList');
    const sampleLiveUpdates = [
        {
            type: 'system',
            message: 'Trip started from pickup location',
            time: '09:05 AM'
        },
        {
            type: 'driver',
            message: 'Good road conditions, on schedule',
            time: '10:30 AM'
        }
    ];
    
    sampleLiveUpdates.forEach(update => {
        const updateClass = update.type === 'system' ? 'system' : '';
        const updateItem = `
            <div class="update-message ${updateClass}">
                <p>${update.message}</p>
                <span>${update.time}</span>
            </div>
        `;
        updatesList.append(updateItem);
    });
}

// Modal Functions
function openModal(modalId) {
    $(modalId).addClass('active');
    $('body').addClass('modal-open');
}

function closeModal(modalId) {
    $(modalId).removeClass('active');
    $('body').removeClass('modal-open');
}

function closeAllModals() {
    $('.modal').removeClass('active');
    $('body').removeClass('modal-open');
}

// Toast notification function
function showToast(message, type = 'info') {
    const toast = $(`
        <div class="toast toast-${type}">
            <div class="toast-content">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
                <span>${message}</span>
            </div>
            <button class="toast-close">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `);
    
    $('body').append(toast);
    
    setTimeout(() => {
        toast.addClass('show');
    }, 10);
    
    setTimeout(() => {
        toast.removeClass('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
    
    toast.find('.toast-close').click(function() {
        toast.removeClass('show');
        setTimeout(() => toast.remove(), 300);
    });
}