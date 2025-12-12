// Trucks Management JavaScript

// Global variables
let currentTab = 0;
let currentTruckId = null;
const API_BASE_URL = 'http://localhost:5000';

$(document).ready(function() {
    // Initialize DataTable
    const trucksTable = $('#trucksTable').DataTable({
        pageLength: 10,
        lengthMenu: [[10, 25, 50, 100], [10, 25, 50, 100]],
        order: [[1, 'asc']],
        columnDefs: [
            { orderable: false, targets: [0, 9] },
            { className: 'dt-center', targets: [0, 6, 9] }
        ],
        language: {
            search: "Search trucks:",
            lengthMenu: "Show _MENU_ trucks per page",
            info: "Showing _START_ to _END_ of _TOTAL_ trucks",
            infoEmpty: "No trucks available",
            infoFiltered: "(filtered from _MAX_ total trucks)",
            paginate: {
                first: "First",
                last: "Last",
                next: "Next",
                previous: "Previous"
            }
        }
    });
    
    // Load trucks data from JSON Server
    loadTrucksData();
    loadMaintenanceAlerts();
    loadDrivers();
    
    // Initialize components if function exists
    if (typeof initializeComponents === 'function') {
        initializeComponents();
    }
    
    // Initialize form date inputs
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    $('#maintenanceDate').val(tomorrowStr);
    $('#insuranceExpiry').val(today);
    $('#registrationExpiry').val(today);
    $('#lastServiceDate').val(today);
    
    // Set next service to 3 months from today
    const nextService = new Date();
    nextService.setMonth(nextService.getMonth() + 3);
    $('#nextServiceDate').val(nextService.toISOString().split('T')[0]);
    
    // Event Listeners
    $('#addTruckBtn').click(openAddTruckModal);
    $('#refreshTrucks').click(refreshTrucksData);
    $('#exportTrucks').click(exportTrucksData);
    $('#refreshFleetMap').click(refreshFleetMap);
    $('#filterFleet').click(filterFleet);
    $('#viewAllAlerts').click(viewAllAlerts);
    
    // Table row click for details
    $('#trucksTableBody').on('click', 'tr', function(e) {
        if (!$(e.target).is('input[type="checkbox"]') && !$(e.target).is('button')) {
            const truckId = $(this).data('truck-id');
            openTruckDetails(truckId);
        }
    });
    
    // Truck form navigation
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
    
    // Submit truck form
    $('#truckForm').submit(function(e) {
        e.preventDefault();
        saveTruck();
    });
    
    // Status update button
    $('#updateStatusBtn').click(openStatusUpdateModal);
    $('#saveTruckStatusBtn').click(saveTruckStatus);
    
    // Assign driver button
    $('#assignDriverBtn').click(openAssignDriverModal);
    $('#saveAssignmentBtn').click(saveDriverAssignment);
    
    // Schedule maintenance button
    $('#scheduleMaintenanceBtn').click(openMaintenanceModal);
    $('#scheduleMaintenanceBtn').click(function() {
        // This is the schedule button inside maintenance modal
        saveMaintenance();
    });
    
    // Delete truck button
    $('#deleteTruckBtn').click(deleteTruck);
    
    // Driver select change
    $('#driverSelect').change(function() {
        updateDriverInfo($(this).val());
    });
    
    // Truck status select change
    $('#truckStatusSelect').change(function() {
        const status = $(this).val();
        if (status === 'repair') {
            $('#estimatedRepairGroup').show();
        } else {
            $('#estimatedRepairGroup').hide();
        }
    });
    
    // Search functionality
    $('#globalSearch').on('keyup', function() {
        trucksTable.search(this.value).draw();
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
});

function loadTrucksData() {
    fetch(`${API_BASE_URL}/trucks`)
        .then(response => response.json())
        .then(data => {
            const tableBody = $('#trucksTableBody');
            tableBody.empty();
            
            data.forEach(truck => {
                const statusClass = getStatusClass(truck.status);
                const row = `
                    <tr data-truck-id="${truck.id}">
                        <td>
                            <input type="checkbox" class="row-checkbox">
                        </td>
                        <td>${truck.id}</td>
                        <td>${truck.registration}</td>
                        <td>${truck.type}</td>
                        <td>${truck.model}</td>
                        <td>${truck.capacity}</td>
                        <td>
                            <span class="status-badge ${statusClass}">${truck.statusText}</span>
                        </td>
                        <td>
                            <div class="driver-cell">
                                <i class="fas fa-user-tie"></i>
                                ${truck.driver}
                            </div>
                        </td>
                        <td>
                            <div class="location-cell">
                                <i class="fas fa-map-marker-alt"></i>
                                ${truck.location}
                            </div>
                        </td>
                        <td>
                            <div class="table-actions">
                                <button class="action-btn" title="View Details" onclick="openTruckDetails('${truck.id}')">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="action-btn" title="Edit Truck" onclick="editTruck('${truck.id}')">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="action-btn" title="Track Location" onclick="trackTruck('${truck.id}')">
                                    <i class="fas fa-map-marker-alt"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
                tableBody.append(row);
            });
            
            // Update stats
            updateTruckStats();
        })
        .catch(error => {
            console.error('Error loading trucks:', error);
            showToast('Failed to load trucks data', 'error');
        });
}

function loadMaintenanceAlerts() {
    fetch(`${API_BASE_URL}/maintenanceAlerts`)
        .then(response => response.json())
        .then(data => {
            const alertsList = $('#maintenanceAlerts');
            alertsList.empty();
            
            data.forEach(alert => {
                const alertItem = `
                    <div class="alert-item ${alert.type}">
                        <div class="alert-icon">
                            <i class="fas fa-${alert.type === 'urgent' ? 'exclamation-triangle' : alert.type === 'warning' ? 'exclamation-circle' : 'info-circle'}"></i>
                        </div>
                        <div class="alert-content">
                            <div class="alert-header">
                                <h4>${alert.title}</h4>
                                <span class="alert-time">${alert.time}</span>
                            </div>
                            <p>${alert.message}</p>
                            <div class="alert-truck">
                                <i class="fas fa-truck"></i>
                                <span>Truck: ${alert.truck}</span>
                            </div>
                            <div class="alert-actions">
                                <button class="btn btn-sm btn-outline" onclick="viewAlertDetails(${alert.id})">
                                    View Details
                                </button>
                                <button class="btn btn-sm btn-primary" onclick="scheduleMaintenanceForTruck('${alert.truck}')">
                                    Schedule
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                alertsList.append(alertItem);
            });
        })
        .catch(error => {
            console.error('Error loading maintenance alerts:', error);
            showToast('Failed to load maintenance alerts', 'error');
        });
}

function loadDrivers() {
    fetch(`${API_BASE_URL}/drivers`)
        .then(response => response.json())
        .then(drivers => {
            const driverSelect = $('#driverSelect');
            driverSelect.empty();
            driverSelect.append('<option value="">Select a driver</option>');
            
            drivers.forEach(driver => {
                driverSelect.append(`<option value="${driver.id}">${driver.name} (${driver.license})</option>`);
            });
        })
        .catch(error => {
            console.error('Error loading drivers:', error);
        });
}

function openTruckDetails(truckId) {
    currentTruckId = truckId;
    
    // Load truck details from API
    fetch(`${API_BASE_URL}/trucks/${truckId}`)
        .then(response => response.json())
        .then(truck => {
            // Update modal with truck details
            Object.keys(truck).forEach(key => {
                const element = $(`#detail${key.charAt(0).toUpperCase() + key.slice(1)}`);
                if (element.length) {
                    element.text(truck[key]);
                }
            });
            
            // Set status class
            const statusElement = $('#detailTruckStatus');
            statusElement.removeClass().addClass('truck-status ' + truck.status);
            statusElement.text(truck.status === 'available' ? 'Available' : 
                            truck.status === 'on-trip' ? 'On Trip' : 
                            truck.status === 'maintenance' ? 'Under Maintenance' : 
                            truck.status === 'inactive' ? 'Inactive' : 'Needs Repair');
            
            // Update fuel and health gauges
            $('.fuel-level').css('width', truck.fuelLevel || '75%');
            $('.health-level').css('width', truck.healthScore || '85%');
            
            // Load maintenance history
            loadMaintenanceHistory(truckId);
            
            // Load documents
            loadTruckDocuments(truckId);
            
            // Open modal
            openModal('#truckDetailsModal');
        })
        .catch(error => {
            console.error('Error loading truck details:', error);
            showToast('Failed to load truck details', 'error');
        });
}

function openAddTruckModal() {
    currentTab = 0;
    activateTab('basic');
    $('#formModalTitle').text('Add New Truck');
    $('#truckForm')[0].reset();
    
    // Set default values
    const today = new Date().toISOString().split('T')[0];
    $('#year').val('2022');
    $('#insuranceExpiry').val(today);
    $('#registrationExpiry').val(today);
    $('#lastServiceDate').val(today);
    
    // Generate new truck ID
    fetch(`${API_BASE_URL}/trucks`)
        .then(response => response.json())
        .then(trucks => {
            const maxId = trucks.reduce((max, truck) => {
                const num = parseInt(truck.id.replace('TRK-', ''));
                return num > max ? num : max;
            }, 0);
            const newId = `TRK-${(maxId + 1).toString().padStart(3, '0')}`;
            $('#truckId').val(newId);
        })
        .catch(error => {
            console.error('Error generating truck ID:', error);
            $('#truckId').val('TRK-001');
        });
    
    // Set next service to 3 months from today
    const nextService = new Date();
    nextService.setMonth(nextService.getMonth() + 3);
    $('#nextServiceDate').val(nextService.toISOString().split('T')[0]);
    
    openModal('#truckFormModal');
}

function openStatusUpdateModal() {
    $('#truckStatusSelect').val('available');
    $('#truckStatusNotes').val('');
    $('#estimatedRepairTime').val('');
    $('#estimatedRepairGroup').hide();
    
    openModal('#truckStatusModal');
}

function openAssignDriverModal() {
    $('#driverSelect').val('');
    $('#selectedDriverInfo').html('<p class="text-muted">Select a driver to see details</p>');
    $('#assignmentNotes').val('');
    
    openModal('#assignDriverModal');
}

function openMaintenanceModal() {
    $('#maintenanceType').val('');
    $('#maintenanceDescription').val('');
    $('#serviceProvider').val('');
    $('#estimatedCost').val('');
    
    // Set default date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    $('#maintenanceDate').val(tomorrow.toISOString().split('T')[0]);
    
    openModal('#maintenanceModal');
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
    $('#submitTruckBtn').toggle(tabIndex === $('.form-tab').length - 1);
}

function refreshTrucksData() {
    // Show loading state
    const originalText = $('#refreshTrucks').html();
    $('#refreshTrucks').html('<i class="fas fa-spinner fa-spin"></i> Refreshing');
    $('#refreshTrucks').prop('disabled', true);
    
    // Load data from API
    Promise.all([
        fetch(`${API_BASE_URL}/trucks`).then(r => r.json()),
        fetch(`${API_BASE_URL}/maintenanceAlerts`).then(r => r.json()),
        fetch(`${API_BASE_URL}/drivers`).then(r => r.json())
    ])
    .then(([trucks, alerts, drivers]) => {
        // Update trucks table
        const tableBody = $('#trucksTableBody');
        tableBody.empty();
        
        trucks.forEach(truck => {
            const statusClass = getStatusClass(truck.status);
            const row = `
                <tr data-truck-id="${truck.id}">
                    <td>
                        <input type="checkbox" class="row-checkbox">
                    </td>
                    <td>${truck.id}</td>
                    <td>${truck.registration}</td>
                    <td>${truck.type}</td>
                    <td>${truck.model}</td>
                    <td>${truck.capacity}</td>
                    <td>
                        <span class="status-badge ${statusClass}">${truck.statusText}</span>
                    </td>
                    <td>
                        <div class="driver-cell">
                            <i class="fas fa-user-tie"></i>
                            ${truck.driver}
                        </div>
                    </td>
                    <td>
                        <div class="location-cell">
                            <i class="fas fa-map-marker-alt"></i>
                            ${truck.location}
                        </div>
                    </td>
                    <td>
                        <div class="table-actions">
                            <button class="action-btn" title="View Details" onclick="openTruckDetails('${truck.id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="action-btn" title="Edit Truck" onclick="editTruck('${truck.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn" title="Track Location" onclick="trackTruck('${truck.id}')">
                                <i class="fas fa-map-marker-alt"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            tableBody.append(row);
        });
        
        // Update maintenance alerts
        const alertsList = $('#maintenanceAlerts');
        alertsList.empty();
        
        alerts.forEach(alert => {
            const alertItem = `
                <div class="alert-item ${alert.type}">
                    <div class="alert-icon">
                        <i class="fas fa-${alert.type === 'urgent' ? 'exclamation-triangle' : alert.type === 'warning' ? 'exclamation-circle' : 'info-circle'}"></i>
                    </div>
                    <div class="alert-content">
                        <div class="alert-header">
                            <h4>${alert.title}</h4>
                            <span class="alert-time">${alert.time}</span>
                        </div>
                        <p>${alert.message}</p>
                        <div class="alert-truck">
                            <i class="fas fa-truck"></i>
                            <span>Truck: ${alert.truck}</span>
                        </div>
                        <div class="alert-actions">
                            <button class="btn btn-sm btn-outline" onclick="viewAlertDetails(${alert.id})">
                                View Details
                            </button>
                            <button class="btn btn-sm btn-primary" onclick="scheduleMaintenanceForTruck('${alert.truck}')">
                                Schedule
                            </button>
                        </div>
                    </div>
                </div>
            `;
            alertsList.append(alertItem);
        });
        
        // Update stats
        updateTruckStats();
        
        // Reset button state
        $('#refreshTrucks').html(originalText);
        $('#refreshTrucks').prop('disabled', false);
        showToast('Trucks data refreshed successfully', 'success');
    })
    .catch(error => {
        console.error('Error refreshing data:', error);
        showToast('Failed to refresh data', 'error');
        $('#refreshTrucks').html(originalText);
        $('#refreshTrucks').prop('disabled', false);
    });
}

function refreshFleetMap() {
    showToast('Fleet map refreshed', 'info');
    // In a real app, this would refresh the live map data
}

function filterFleet() {
    showToast('Filter fleet by status, location, or type', 'info');
    // In a real app, this would open a filter panel
}

function viewAllAlerts() {
    showToast('Opening all maintenance alerts...', 'info');
    // In a real app, this would open a dedicated alerts page
}

function exportTrucksData() {
    showToast('Exporting trucks data...', 'info');
    
    fetch(`${API_BASE_URL}/trucks`)
        .then(response => response.json())
        .then(trucks => {
            // Create CSV content
            let csvContent = "Truck ID,Registration,Type,Model,Capacity,Status,Driver,Location\n";
            
            trucks.forEach(truck => {
                csvContent += `${truck.id},${truck.registration},${truck.type},${truck.model},${truck.capacity},${truck.statusText},${truck.driver},${truck.location}\n`;
            });
            
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `trucks_export_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            showToast('Trucks data exported successfully', 'success');
        })
        .catch(error => {
            console.error('Error exporting data:', error);
            showToast('Failed to export data', 'error');
        });
}

function saveTruck() {
    const truckData = {
        id: $('#truckId').val(),
        registration: $('#regNumber').val(),
        make: $('#make').val(),
        model: $('#model').val(),
        year: $('#year').val(),
        color: $('#color').val(),
        truckType: $('#truckType').val(),
        type: $('#truckType option:selected').text(),
        capacity: $('#capacity').val() + ' ' + $('#capacityUnit').val(),
        fuelType: $('#fuelType').val(),
        initialStatus: $('#initialStatus').val(),
        status: $('#initialStatus').val(),
        statusText: $('#initialStatus option:selected').text(),
        driver: 'None',
        location: 'Depot',
        insuranceExpiry: $('#insuranceExpiry').val(),
        registrationExpiry: $('#registrationExpiry').val(),
        lastServiceDate: $('#lastServiceDate').val(),
        nextServiceDate: $('#nextServiceDate').val(),
        dimensions: $('#length').val() + 'm × ' + $('#width').val() + 'm × ' + $('#height').val() + 'm',
        makeModel: $('#make').val() + ' ' + $('#model').val(),
        fuelLevel: '100%',
        mileage: '0 km',
        healthScore: '100%',
        currentDriver: 'None',
        driverContact: 'N/A'
    };
    
    if (!truckData.id || !truckData.registration || !truckData.make || !truckData.model || !truckData.year || !truckData.truckType || !truckData.capacity || !truckData.initialStatus) {
        showToast('Please fill all required fields', 'error');
        return;
    }
    
    // Show loading state
    $('#submitTruckBtn').html('<i class="fas fa-spinner fa-spin"></i> Saving...');
    $('#submitTruckBtn').prop('disabled', true);
    
    // Check if truck exists (for update) or is new (for create)
    fetch(`${API_BASE_URL}/trucks/${truckData.id}`)
        .then(response => {
            const method = response.ok ? 'PUT' : 'POST';
            const url = response.ok ? `${API_BASE_URL}/trucks/${truckData.id}` : `${API_BASE_URL}/trucks`;
            
            return fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(truckData)
            });
        })
        .then(response => response.json())
        .then(data => {
            showToast(`Truck ${truckData.id} saved successfully!`, 'success');
            closeModal('#truckFormModal');
            refreshTrucksData();
        })
        .catch(error => {
            console.error('Error saving truck:', error);
            showToast('Failed to save truck', 'error');
        })
        .finally(() => {
            // Reset button state
            $('#submitTruckBtn').html('<i class="fas fa-check"></i> Save Truck');
            $('#submitTruckBtn').prop('disabled', false);
        });
}

function saveTruckStatus() {
    const newStatus = $('#truckStatusSelect').val();
    const notes = $('#truckStatusNotes').val();
    const estimatedRepairTime = $('#estimatedRepairTime').val();
    
    if (!newStatus) {
        showToast('Please select a status', 'error');
        return;
    }
    
    if (newStatus === 'repair' && !estimatedRepairTime) {
        showToast('Please enter estimated repair time', 'error');
        return;
    }
    
    // Show loading state
    $('#saveTruckStatusBtn').html('<i class="fas fa-spinner fa-spin"></i> Updating');
    $('#saveTruckStatusBtn').prop('disabled', true);
    
    // Get current truck data
    fetch(`${API_BASE_URL}/trucks/${currentTruckId}`)
        .then(response => response.json())
        .then(truck => {
            // Update truck status
            const statusText = $('#truckStatusSelect option:selected').text();
            const updatedTruck = {
                ...truck,
                status: newStatus,
                statusText: statusText
            };
            
            return fetch(`${API_BASE_URL}/trucks/${currentTruckId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedTruck)
            });
        })
        .then(response => response.json())
        .then(data => {
            showToast(`Truck status updated to ${newStatus}`, 'success');
            closeModal('#truckStatusModal');
            refreshTrucksData();
        })
        .catch(error => {
            console.error('Error updating truck status:', error);
            showToast('Failed to update truck status', 'error');
        })
        .finally(() => {
            // Reset button state
            $('#saveTruckStatusBtn').html('Update Status');
            $('#saveTruckStatusBtn').prop('disabled', false);
        });
}

function updateDriverInfo(driverId) {
    const driverInfo = $('#selectedDriverInfo');
    
    if (!driverId) {
        driverInfo.html('<p class="text-muted">Select a driver to see details</p>');
        return;
    }
    
    fetch(`${API_BASE_URL}/drivers/${driverId}`)
        .then(response => response.json())
        .then(driver => {
            driverInfo.html(`
                <div class="driver-details">
                    <div class="driver-avatar">
                        <i class="fas fa-user-circle"></i>
                    </div>
                    <div>
                        <h5>${driver.name}</h5>
                        <p>Phone: ${driver.phone}</p>
                        <p>License: ${driver.license}</p>
                        <p>Status: <span class="status-badge ${driver.status === 'Available' ? 'available' : driver.status === 'On Trip' ? 'on-trip' : 'inactive'}">${driver.status}</span></p>
                    </div>
                </div>
            `);
        })
        .catch(error => {
            console.error('Error loading driver info:', error);
            driverInfo.html('<p class="text-muted">Error loading driver details</p>');
        });
}

function saveDriverAssignment() {
    const driverId = $('#driverSelect').val();
    const notes = $('#assignmentNotes').val();
    
    if (!driverId) {
        showToast('Please select a driver', 'error');
        return;
    }
    
    // Show loading state
    $('#saveAssignmentBtn').html('<i class="fas fa-spinner fa-spin"></i> Assigning...');
    $('#saveAssignmentBtn').prop('disabled', true);
    
    // Get driver details
    fetch(`${API_BASE_URL}/drivers/${driverId}`)
        .then(response => response.json())
        .then(driver => {
            // Get current truck data
            return fetch(`${API_BASE_URL}/trucks/${currentTruckId}`)
                .then(response => response.json())
                .then(truck => {
                    // Update truck with driver info
                    const updatedTruck = {
                        ...truck,
                        driver: driver.name,
                        currentDriver: driver.name,
                        driverContact: driver.phone
                    };
                    
                    return fetch(`${API_BASE_URL}/trucks/${currentTruckId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(updatedTruck)
                    });
                });
        })
        .then(response => response.json())
        .then(data => {
            showToast('Driver assigned successfully', 'success');
            closeModal('#assignDriverModal');
            refreshTrucksData();
        })
        .catch(error => {
            console.error('Error assigning driver:', error);
            showToast('Failed to assign driver', 'error');
        })
        .finally(() => {
            // Reset button state
            $('#saveAssignmentBtn').html('Assign Driver');
            $('#saveAssignmentBtn').prop('disabled', false);
        });
}

function saveMaintenance() {
    const maintenanceData = {
        id: Date.now(), // Generate unique ID
        type: $('#maintenanceType').val(),
        maintenanceDate: $('#maintenanceDate').val(),
        title: $('#maintenanceType option:selected').text(),
        description: $('#maintenanceDescription').val(),
        serviceProvider: $('#serviceProvider').val(),
        estimatedCost: $('#estimatedCost').val(),
        time: 'Today',
        truck: currentTruckId
    };
    
    if (!maintenanceData.type || !maintenanceData.maintenanceDate || !maintenanceData.description) {
        showToast('Please fill all required fields', 'error');
        return;
    }
    
    // Show loading state
    $('#scheduleMaintenanceBtn').html('<i class="fas fa-spinner fa-spin"></i> Scheduling...');
    $('#scheduleMaintenanceBtn').prop('disabled', true);
    
    // Save maintenance alert
    fetch(`${API_BASE_URL}/maintenanceAlerts`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(maintenanceData)
    })
    .then(response => response.json())
    .then(data => {
        showToast('Maintenance scheduled successfully', 'success');
        closeModal('#maintenanceModal');
        loadMaintenanceAlerts();
    })
    .catch(error => {
        console.error('Error scheduling maintenance:', error);
        showToast('Failed to schedule maintenance', 'error');
    })
    .finally(() => {
        // Reset button state
        $('#scheduleMaintenanceBtn').html('Schedule Maintenance');
        $('#scheduleMaintenanceBtn').prop('disabled', false);
    });
}

function deleteTruck() {
    if (!currentTruckId) return;
    
    if (confirm(`Are you sure you want to delete truck ${currentTruckId}? This action cannot be undone.`)) {
        showToast(`Deleting truck ${currentTruckId}...`, 'info');
        
        fetch(`${API_BASE_URL}/trucks/${currentTruckId}`, {
            method: 'DELETE'
        })
        .then(response => {
            if (response.ok) {
                showToast(`Truck ${currentTruckId} deleted successfully`, 'success');
                closeModal('#truckDetailsModal');
                refreshTrucksData();
            } else {
                throw new Error('Failed to delete truck');
            }
        })
        .catch(error => {
            console.error('Error deleting truck:', error);
            showToast('Failed to delete truck', 'error');
        });
    }
}

function loadMaintenanceHistory(truckId) {
    fetch(`${API_BASE_URL}/maintenanceAlerts`)
        .then(response => response.json())
        .then(alerts => {
            const timeline = $('#maintenanceTimeline');
            timeline.empty();
            
            // Filter alerts for this truck
            const truckAlerts = alerts.filter(alert => alert.truck === truckId);
            
            if (truckAlerts.length === 0) {
                timeline.html('<p class="text-muted">No maintenance history found</p>');
                return;
            }
            
            truckAlerts.forEach(alert => {
                const itemElement = `
                    <div class="maintenance-item ${alert.type}">
                        <h5>${alert.title || alert.type}</h5>
                        <p>${alert.description}</p>
                        <div class="maintenance-meta">
                            <span>Date: ${alert.maintenanceDate || alert.time}</span>
                            <span>Provider: ${alert.serviceProvider || 'N/A'}</span>
                        </div>
                    </div>
                `;
                timeline.append(itemElement);
            });
        })
        .catch(error => {
            console.error('Error loading maintenance history:', error);
            $('#maintenanceTimeline').html('<p class="text-muted">Error loading maintenance history</p>');
        });
}

function loadTruckDocuments(truckId) {
    fetch(`${API_BASE_URL}/truckDocuments?truckId=${truckId}`)
        .then(response => response.json())
        .then(documents => {
            const documentsGrid = $('#truckDocuments');
            documentsGrid.empty();
            
            if (documents.length === 0) {
                documentsGrid.html('<p class="text-muted">No documents available</p>');
                return;
            }
            
            documents.forEach(doc => {
                const docElement = `
                    <div class="document-item">
                        <div class="document-icon">
                            <i class="fas fa-file-${doc.type || 'pdf'}"></i>
                        </div>
                        <div class="document-info">
                            <h5>${doc.name}</h5>
                            <p>Uploaded: ${doc.date} • ${doc.size}</p>
                        </div>
                        <div class="document-actions">
                            <button class="action-btn" title="Download" onclick="downloadDocument(${doc.id})">
                                <i class="fas fa-download"></i>
                            </button>
                            <button class="action-btn" title="View" onclick="viewDocument(${doc.id})">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </div>
                `;
                documentsGrid.append(docElement);
            });
        })
        .catch(error => {
            console.error('Error loading documents:', error);
            $('#truckDocuments').html('<p class="text-muted">Error loading documents</p>');
        });
}

function updateTruckStats() {
    fetch(`${API_BASE_URL}/trucks`)
        .then(response => response.json())
        .then(trucks => {
            const total = trucks.length;
            const available = trucks.filter(t => t.status === 'available').length;
            const onTrip = trucks.filter(t => t.status === 'on-trip').length;
            const maintenance = trucks.filter(t => t.status === 'maintenance' || t.status === 'repair').length;
            
            $('#totalTrucksCount').text(total);
            $('#availableTrucks').text(available);
            $('#onTripTrucks').text(onTrip);
            $('#maintenanceTrucks').text(maintenance);
        })
        .catch(error => {
            console.error('Error updating stats:', error);
        });
}

function getStatusClass(status) {
    switch(status) {
        case 'available': return 'available';
        case 'on-trip': return 'on-trip';
        case 'maintenance': return 'maintenance';
        case 'inactive': return 'inactive';
        case 'repair': return 'repair';
        default: return 'inactive';
    }
}

function editTruck(truckId) {
    currentTruckId = truckId;
    $('#formModalTitle').text('Edit Truck');
    
    // Load truck data from API
    fetch(`${API_BASE_URL}/trucks/${truckId}`)
        .then(response => response.json())
        .then(truck => {
            openAddTruckModal();
            
            // Pre-fill form with truck data
            setTimeout(() => {
                $('#truckId').val(truck.id);
                $('#regNumber').val(truck.registration);
                $('#make').val(truck.make);
                $('#model').val(truck.model);
                $('#year').val(truck.year);
                $('#color').val(truck.color);
                $('#truckType').val(truck.truckType);
                
                // Parse capacity (e.g., "5 Tons")
                if (truck.capacity) {
                    const capacityParts = truck.capacity.split(' ');
                    $('#capacity').val(capacityParts[0]);
                    $('#capacityUnit').val(capacityParts[1] || 'Tons');
                }
                
                $('#fuelType').val(truck.fuelType);
                $('#initialStatus').val(truck.initialStatus || truck.status);
                $('#insuranceExpiry').val(truck.insuranceExpiry);
                $('#registrationExpiry').val(truck.registrationExpiry);
                $('#lastServiceDate').val(truck.lastServiceDate);
                $('#nextServiceDate').val(truck.nextServiceDate);
                
                // Parse dimensions
                if (truck.dimensions) {
                    const dimParts = truck.dimensions.split('×');
                    if (dimParts.length === 3) {
                        $('#length').val(dimParts[0].trim().replace('m', ''));
                        $('#width').val(dimParts[1].trim().replace('m', ''));
                        $('#height').val(dimParts[2].trim().replace('m', ''));
                    }
                }
            }, 300);
        })
        .catch(error => {
            console.error('Error loading truck for edit:', error);
            showToast('Failed to load truck data for editing', 'error');
        });
}

function trackTruck(truckId) {
    showToast(`Tracking truck ${truckId}...`, 'info');
    // In a real app, this would open a tracking view
}

function viewAlertDetails(alertId) {
    showToast(`Viewing alert details ${alertId}...`, 'info');
    // In a real app, this would open alert details
}

function scheduleMaintenanceForTruck(truckId) {
    currentTruckId = truckId;
    openMaintenanceModal();
    
    // Pre-fill truck ID in description
    setTimeout(() => {
        $('#maintenanceDescription').val(`Maintenance for truck ${truckId}. `);
    }, 300);
}

function downloadDocument(docId) {
    showToast(`Downloading document ${docId}...`, 'info');
    // In a real app, this would download the document
}

function viewDocument(docId) {
    showToast(`Viewing document ${docId}...`, 'info');
    // In a real app, this would open the document viewer
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