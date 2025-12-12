// users.js - User Management with CRUD Operations

// Global variables
let currentTab = 0;
let currentUserId = null;
let usersData = [];
let selectedUsers = new Set();
const apiBaseUrl = 'http://localhost:5000';

// Helper function to show/hide loading
function showLoading(show) {
    if (show) {
        // Create loading overlay if it doesn't exist
        if ($('.loading-overlay').length === 0) {
            $('body').append(`
                <div class="loading-overlay" style="
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(255, 255, 255, 0.8);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 9999;
                    display: none;
                ">
                    <div class="spinner" style="
                        width: 50px;
                        height: 50px;
                        border: 5px solid #f3f3f3;
                        border-top: 5px solid #4361ee;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                    "></div>
                    <style>
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                    </style>
                </div>
            `);
        }
        $('.loading-overlay').show();
    } else {
        $('.loading-overlay').hide();
    }
}

// Helper function to show toast notifications
function showToast(message, type = 'info') {
    // Remove any existing toasts
    $('.toast').remove();
    
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    
    const colors = {
        success: '#06d6a0',
        error: '#ef476f',
        warning: '#ffd166',
        info: '#118ab2'
    };
    
    const toast = $(`
        <div class="toast toast-${type}" style="
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            border-left: 4px solid ${colors[type]};
            border-radius: 8px;
            padding: 15px 20px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            gap: 10px;
            z-index: 9999;
            min-width: 300px;
            animation: slideIn 0.3s ease;
        ">
            <i class="fas fa-${icons[type]}" style="color: ${colors[type]}; font-size: 18px;"></i>
            <span style="flex: 1; font-size: 14px;">${message}</span>
            <button class="toast-close" onclick="$(this).parent().remove()" style="
                background: none;
                border: none;
                color: #999;
                cursor: pointer;
                padding: 4px;
            ">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `);
    
    $('body').append(toast);
    
    setTimeout(() => {
        toast.fadeOut(300, function() {
            $(this).remove();
        });
    }, 5000);
}

// Helper function to show success message
function showSuccessMessage(message) {
    const successMessage = $('#successMessage');
    successMessage.find('#successText').text(message);
    successMessage.addClass('show');
    
    setTimeout(() => {
        successMessage.removeClass('show');
    }, 3000);
}

// Initialize DataTables
function initializeDataTable() {
    const table = $('#usersTable').DataTable({
        pageLength: 10,
        lengthMenu: [[10, 25, 50, 100], [10, 25, 50, 100]],
        order: [[1, 'asc']],
        columnDefs: [
            { orderable: false, targets: [0, 9] },
            { className: 'dt-center', targets: [0, 5, 9] }
        ],
        language: {
            search: "Search users:",
            lengthMenu: "Show _MENU_ users per page",
            info: "Showing _START_ to _END_ of _TOTAL_ users",
            infoEmpty: "No users available",
            infoFiltered: "(filtered from _MAX_ total users)",
            paginate: {
                first: "First",
                last: "Last",
                next: "Next",
                previous: "Previous"
            }
        },
        drawCallback: function(settings) {
            updateTableInfo();
            updatePagination();
            updateSelectedCount();
        }
    });
    
    return table;
}

// Fetch all users from API
async function fetchUsers() {
    try {
        showLoading(true);
        const response = await fetch(`${apiBaseUrl}/users`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        usersData = data;
        
        updateUsersTable();
        updateUserStats();
        updateUserBadge();
        loadRolesDistribution();
        
        return data;
    } catch (error) {
        console.error('Error fetching users:', error);
        showToast('Error loading users. Please check if JSON server is running.', 'error');
        throw error;
    } finally {
        showLoading(false);
    }
}

// Update users table with fetched data
function updateUsersTable() {
    const tableBody = $('#usersTableBody');
    tableBody.empty();
    
    if (usersData.length === 0) {
        const noDataRow = `
            <tr>
                <td colspan="10" style="text-align: center; padding: 40px;">
                    <i class="fas fa-users" style="font-size: 48px; color: #ddd; margin-bottom: 15px;"></i>
                    <h4 style="color: #666; margin-bottom: 10px;">No Users Found</h4>
                    <p style="color: #999;">Click "Add New User" to create your first user</p>
                </td>
            </tr>
        `;
        tableBody.append(noDataRow);
        return;
    }
    
    usersData.forEach(user => {
        const statusClass = getStatusClass(user.status);
        const roleClass = getRoleClass(user.role);
        
        const row = `
            <tr data-user-id="${user.id}">
                <td>
                    <input type="checkbox" class="row-checkbox" value="${user.id}">
                </td>
                <td>${user.id}</td>
                <td>
                    <div class="user-name-cell">
                        <strong>${user.firstName} ${user.lastName}</strong>
                        ${user.username ? `<small>@${user.username}</small>` : ''}
                    </div>
                </td>
                <td>${user.email}</td>
                <td>
                    <span class="role-badge ${roleClass}">${capitalizeFirst(user.role)}</span>
                </td>
                <td>
                    <span class="user-status-badge ${statusClass}">${capitalizeFirst(user.status)}</span>
                </td>
                <td>${user.phone || 'N/A'}</td>
                <td>${formatDate(user.registrationDate || user.createdAt)}</td>
                <td>${formatDateTime(user.lastLogin)}</td>
                <td>
                    <div class="table-actions-cell">
                        <button class="table-action-btn" title="View Details" onclick="viewUserDetails('${user.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="table-action-btn" title="Edit User" onclick="editUser('${user.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="table-action-btn" title="Send Message" onclick="sendMessageToUser('${user.id}')">
                            <i class="fas fa-envelope"></i>
                        </button>
                        <button class="table-action-btn ${user.status === 'active' ? 'btn-danger' : 'btn-success'}" 
                                title="${user.status === 'active' ? 'Deactivate' : 'Activate'}" 
                                onclick="toggleUserStatus('${user.id}')">
                            <i class="fas fa-${user.status === 'active' ? 'user-slash' : 'user-check'}"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
        tableBody.append(row);
    });
    
    $('#usersTable').DataTable().draw();
    updateSelectAllCheckbox();
}

// Create a new user
async function createUser(userData) {
    try {
        showLoading(true);
        
        // Ensure user has an ID
        if (!userData.id) {
            userData.id = generateUserId();
        }
        
        // Set timestamps
        const now = new Date().toISOString();
        userData.createdAt = now;
        userData.updatedAt = now;
        
        const response = await fetch(`${apiBaseUrl}/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to create user');
        }
        
        const newUser = await response.json();
        usersData.unshift(newUser);
        
        updateUsersTable();
        updateUserStats();
        updateUserBadge();
        loadRolesDistribution();
        
        showSuccessMessage(`User ${newUser.firstName} ${newUser.lastName} created successfully!`);
        showToast('User created successfully!', 'success');
        
        return newUser;
    } catch (error) {
        console.error('Error creating user:', error);
        showToast(`Error creating user: ${error.message}`, 'error');
        throw error;
    } finally {
        showLoading(false);
    }
}

// Update existing user
async function updateUser(userId, userData) {
    try {
        showLoading(true);
        
        // Update timestamp
        userData.updatedAt = new Date().toISOString();
        
        const response = await fetch(`${apiBaseUrl}/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to update user');
        }
        
        const updatedUser = await response.json();
        
        // Update in local array
        const index = usersData.findIndex(u => u.id == userId);
        if (index !== -1) {
            usersData[index] = updatedUser;
        }
        
        updateUsersTable();
        showSuccessMessage(`User ${updatedUser.firstName} ${updatedUser.lastName} updated successfully!`);
        showToast('User updated successfully!', 'success');
        
        return updatedUser;
    } catch (error) {
        console.error('Error updating user:', error);
        showToast(`Error updating user: ${error.message}`, 'error');
        throw error;
    } finally {
        showLoading(false);
    }
}

// Delete user
async function deleteUser(userId) {
    try {
        showLoading(true);
        
        const response = await fetch(`${apiBaseUrl}/users/${userId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to delete user');
        }
        
        // Remove from local array
        const index = usersData.findIndex(u => u.id == userId);
        if (index !== -1) {
            const deletedUser = usersData[index];
            usersData.splice(index, 1);
            
            updateUsersTable();
            updateUserStats();
            updateUserBadge();
            loadRolesDistribution();
            
            showToast(`User ${deletedUser.firstName} ${deletedUser.lastName} deleted successfully!`, 'success');
        }
        
    } catch (error) {
        console.error('Error deleting user:', error);
        showToast(`Error deleting user: ${error.message}`, 'error');
        throw error;
    } finally {
        showLoading(false);
    }
}

// Update user status
async function updateUserStatus(userId, status) {
    try {
        showLoading(true);
        
        // First get the current user
        const response = await fetch(`${apiBaseUrl}/users/${userId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch user');
        }
        
        const user = await response.json();
        
        // Update status and timestamp
        user.status = status;
        user.updatedAt = new Date().toISOString();
        
        // Send update request
        const updateResponse = await fetch(`${apiBaseUrl}/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(user)
        });
        
        if (!updateResponse.ok) {
            const errorData = await updateResponse.json();
            throw new Error(errorData.message || 'Failed to update user status');
        }
        
        const updatedUser = await updateResponse.json();
        
        // Update in local array
        const index = usersData.findIndex(u => u.id == userId);
        if (index !== -1) {
            usersData[index] = updatedUser;
        }
        
        updateUsersTable();
        showToast(`User status updated to ${status}`, 'success');
        
        return updatedUser;
    } catch (error) {
        console.error('Error updating user status:', error);
        showToast(`Error updating user status: ${error.message}`, 'error');
        throw error;
    } finally {
        showLoading(false);
    }
}

// Form handling functions
function openAddUserModal() {
    currentTab = 0;
    activateTab('basic');
    $('#formModalTitle').text('Add New User');
    $('#userForm')[0].reset();
    clearErrors();
    
    // Initialize form
    $('#userId').val(generateUserId());
    $('#gender').val('male');
    $('#accountType').val('personal');
    $('#userRole').val('customer');
    $('#accountStatus').val('active');
    $('#notificationFrequency').val('daily');
    
    // Set default permissions
    setDefaultPermissions('customer');
    
    openModal('#userFormModal');
}

function validateAndSaveUser() {
    // Basic validation
    const requiredFields = ['firstName', 'lastName', 'email', 'username'];
    let isValid = true;
    
    requiredFields.forEach(fieldId => {
        const value = $(`#${fieldId}`).val().trim();
        if (!value) {
            $(`#${fieldId}`).addClass('error');
            isValid = false;
        }
    });
    
    // Email validation
    const email = $('#email').val();
    if (email && !validateEmail(email)) {
        $('#email').addClass('error');
        $('#emailError').text('Please enter a valid email address').show();
        isValid = false;
    }
    
    // Password validation (only for new users)
    if (!currentUserId) {
        const password = $('#password').val();
        const confirmPassword = $('#confirmPassword').val();
        
        if (!password) {
            $('#password').addClass('error');
            isValid = false;
        }
        
        if (password && password.length < 6) {
            $('#password').addClass('error');
            $('#passwordError').text('Password must be at least 6 characters').show();
            isValid = false;
        }
        
        if (password !== confirmPassword) {
            $('#confirmPassword').addClass('error');
            $('#confirmPasswordError').text('Passwords do not match').show();
            isValid = false;
        }
    }
    
    if (!isValid) {
        showToast('Please fill in all required fields correctly', 'error');
        return;
    }
    
    // Prepare user data
    const userData = {
        id: $('#userId').val(),
        firstName: $('#firstName').val(),
        lastName: $('#lastName').val(),
        email: $('#email').val(),
        phone: $('#phone').val(),
        dob: $('#dob').val(),
        gender: $('#gender').val(),
        nationality: $('#nationality').val(),
        address: $('#address').val(),
        username: $('#username').val(),
        role: $('#userRole').val(),
        status: $('#accountStatus').val(),
        accountType: $('#accountType').val()
    };
    
    // Only include password for new users
    if (!currentUserId) {
        userData.password = $('#password').val();
    }
    
    // Show loading state on submit button
    $('#submitUserBtn').html('<i class="fas fa-spinner fa-spin"></i> Saving...');
    $('#submitUserBtn').prop('disabled', true);
    
    if (currentUserId) {
        // Update existing user
        updateUser(currentUserId, userData)
            .then(() => {
                closeModal('#userFormModal');
                currentUserId = null;
            })
            .catch(() => {
                // Keep modal open on error
            })
            .finally(() => {
                $('#submitUserBtn').html('<i class="fas fa-check"></i> Save User');
                $('#submitUserBtn').prop('disabled', false);
            });
    } else {
        // Create new user
        createUser(userData)
            .then(() => {
                closeModal('#userFormModal');
            })
            .catch(() => {
                // Keep modal open on error
            })
            .finally(() => {
                $('#submitUserBtn').html('<i class="fas fa-check"></i> Save User');
                $('#submitUserBtn').prop('disabled', false);
            });
    }
}

function editUser(userId) {
    const user = usersData.find(u => u.id == userId);
    if (!user) {
        showToast('User not found', 'error');
        return;
    }
    
    currentTab = 0;
    currentUserId = userId;
    activateTab('basic');
    
    $('#formModalTitle').text(`Edit User - ${user.firstName} ${user.lastName}`);
    $('#userForm')[0].reset();
    clearErrors();
    
    // Populate form
    $('#userId').val(user.id);
    $('#firstName').val(user.firstName);
    $('#lastName').val(user.lastName);
    $('#email').val(user.email);
    $('#phone').val(user.phone || '');
    $('#dob').val(user.dob || '');
    $('#gender').val(user.gender || '');
    $('#nationality').val(user.nationality || '');
    $('#address').val(user.address || '');
    $('#username').val(user.username || '');
    $('#accountType').val(user.accountType || 'personal');
    $('#userRole').val(user.role || 'customer');
    $('#accountStatus').val(user.status || 'active');
    
    openModal('#userFormModal');
}

function viewUserDetails(userId) {
    const user = usersData.find(u => u.id == userId);
    if (!user) {
        showToast('User not found', 'error');
        return;
    }
    
    $('#userDetailTitle').text(`User Details - ${user.firstName} ${user.lastName}`);
    $('#editUserBtn').data('user-id', userId);
    $('#deactivateUserBtn').data('user-id', userId);
    
    const statusClass = getStatusClass(user.status);
    const roleClass = getRoleClass(user.role);
    
    const detailsHtml = `
        <div class="user-details-header">
            <div class="user-details-avatar">
                <i class="fas fa-user-circle"></i>
            </div>
            <div class="user-details-info">
                <h2>${user.firstName} ${user.lastName}</h2>
                <div class="user-details-meta">
                    <span><i class="fas fa-id-card"></i> ${user.id}</span>
                    <span><i class="fas fa-envelope"></i> ${user.email}</span>
                    <span><i class="fas fa-phone"></i> ${user.phone || 'N/A'}</span>
                </div>
                <span class="role-badge ${roleClass}">${capitalizeFirst(user.role)}</span>
                <span class="user-status-badge ${statusClass}">${capitalizeFirst(user.status)}</span>
            </div>
        </div>
        
        <div class="user-details-tabs">
            <button class="user-details-tab active" data-tab="profile">Profile</button>
            <button class="user-details-tab" data-tab="activity">Activity</button>
            <button class="user-details-tab" data-tab="security">Security</button>
        </div>
        
        <div class="user-details-content active" id="profileDetails">
            <div class="user-info-grid">
                <div class="info-item">
                    <div class="info-label">Username</div>
                    <div class="info-value">${user.username ? '@' + user.username : 'N/A'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Account Type</div>
                    <div class="info-value">${capitalizeFirst(user.accountType)}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Date of Birth</div>
                    <div class="info-value">${formatDate(user.dob)}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Gender</div>
                    <div class="info-value">${capitalizeFirst(user.gender)}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Nationality</div>
                    <div class="info-value">${user.nationality || 'N/A'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Address</div>
                    <div class="info-value">${user.address || 'N/A'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Registration Date</div>
                    <div class="info-value">${formatDate(user.registrationDate || user.createdAt)}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Last Login</div>
                    <div class="info-value">${formatDateTime(user.lastLogin)}</div>
                </div>
            </div>
        </div>
        
        <div class="user-details-content" id="activityDetails">
            <div class="user-info-grid">
                <div class="info-item">
                    <div class="info-label">Total Logins</div>
                    <div class="info-value">${user.loginCount || 'N/A'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Last IP Address</div>
                    <div class="info-value">${user.lastIp || 'N/A'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Browser</div>
                    <div class="info-value">${user.browser || 'N/A'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Device</div>
                    <div class="info-value">${user.device || 'N/A'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Session Duration</div>
                    <div class="info-value">${user.avgSessionDuration || 'N/A'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Failed Attempts</div>
                    <div class="info-value">${user.failedAttempts || '0'}</div>
                </div>
            </div>
        </div>
        
        <div class="user-details-content" id="securityDetails">
            <div class="user-info-grid">
                <div class="info-item">
                    <div class="info-label">Email Verified</div>
                    <div class="info-value">${user.emailVerified ? 'Yes' : 'No'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Two-Factor Auth</div>
                    <div class="info-value">${user.twoFactorEnabled ? 'Enabled' : 'Disabled'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Password Last Changed</div>
                    <div class="info-value">${user.passwordChangedAt ? formatDate(user.passwordChangedAt) : 'N/A'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Account Created</div>
                    <div class="info-value">${formatDate(user.createdAt)}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Last Updated</div>
                    <div class="info-value">${formatDate(user.updatedAt)}</div>
                </div>
            </div>
        </div>
    `;
    
    $('#userDetailsContainer').html(detailsHtml);
    
    // Add tab switching functionality
    $('.user-details-tab').click(function() {
        const tabId = $(this).data('tab');
        $('.user-details-tab').removeClass('active');
        $(this).addClass('active');
        $('.user-details-content').removeClass('active');
        $(`#${tabId}Details`).addClass('active');
    });
    
    // Edit button functionality
    $('#editUserBtn').off('click').click(function() {
        const userId = $(this).data('user-id');
        closeModal('#userDetailsModal');
        editUser(userId);
    });
    
    // Deactivate button functionality
    $('#deactivateUserBtn').off('click').click(function() {
        const userId = $(this).data('user-id');
        const user = usersData.find(u => u.id == userId);
        if (user) {
            const action = user.status === 'active' ? 'deactivate' : 'activate';
            if (confirm(`Are you sure you want to ${action} this user?`)) {
                const newStatus = user.status === 'active' ? 'inactive' : 'active';
                toggleUserStatus(userId, newStatus);
                closeModal('#userDetailsModal');
            }
        }
    });
    
    openModal('#userDetailsModal');
}

function toggleUserStatus(userId, newStatus = null) {
    const user = usersData.find(u => u.id == userId);
    if (!user) return;
    
    const action = newStatus || (user.status === 'active' ? 'inactive' : 'active');
    
    if (confirm(`Are you sure you want to ${action} this user?`)) {
        updateUserStatus(userId, action)
            .then(() => {
                showToast(`User ${action}d successfully`, 'success');
            })
            .catch(error => {
                showToast(`Failed to update user status: ${error.message}`, 'error');
            });
    }
}

// Bulk operations
function openBulkActionsModal() {
    if (selectedUsers.size === 0) {
        showToast('Please select users to perform bulk actions', 'warning');
        return;
    }
    
    $('#selectedUsersCount').text(selectedUsers.size);
    $('#bulkAction').val('');
    $('#bulkActionDetails').empty().removeClass('active');
    
    openModal('#bulkActionsModal');
}

function executeBulkAction() {
    const action = $('#bulkAction').val();
    
    if (!action) {
        showToast('Please select an action', 'error');
        return;
    }
    
    switch(action) {
        case 'activate':
            bulkActivateUsers();
            break;
        case 'deactivate':
            bulkDeactivateUsers();
            break;
        case 'delete':
            bulkDeleteUsers();
            break;
        case 'change-role':
            bulkChangeRole();
            break;
        default:
            showToast('Action not implemented yet', 'warning');
    }
    
    closeModal('#bulkActionsModal');
}

async function bulkActivateUsers() {
    try {
        showLoading(true);
        const promises = Array.from(selectedUsers).map(userId => 
            updateUserStatus(userId, 'active')
        );
        
        await Promise.all(promises);
        selectedUsers.clear();
        showToast(`${promises.length} users activated`, 'success');
    } catch (error) {
        showToast(`Error activating users: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

async function bulkDeactivateUsers() {
    try {
        showLoading(true);
        const promises = Array.from(selectedUsers).map(userId => 
            updateUserStatus(userId, 'inactive')
        );
        
        await Promise.all(promises);
        selectedUsers.clear();
        showToast(`${promises.length} users deactivated`, 'success');
    } catch (error) {
        showToast(`Error deactivating users: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

async function bulkDeleteUsers() {
    if (!confirm(`Are you sure you want to delete ${selectedUsers.size} users? This action cannot be undone.`)) {
        return;
    }
    
    try {
        showLoading(true);
        const promises = Array.from(selectedUsers).map(userId => 
            deleteUser(userId)
        );
        
        await Promise.all(promises);
        selectedUsers.clear();
        showToast(`${promises.length} users deleted`, 'success');
    } catch (error) {
        showToast(`Error deleting users: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

async function bulkChangeRole() {
    const newRole = $('#newRole').val();
    if (!newRole) {
        showToast('Please select a new role', 'error');
        return;
    }
    
    try {
        showLoading(true);
        const promises = Array.from(selectedUsers).map(async (userId) => {
            // Get current user
            const response = await fetch(`${apiBaseUrl}/users/${userId}`);
            if (!response.ok) throw new Error('Failed to fetch user');
            const user = await response.json();
            
            // Update role
            user.role = newRole;
            user.updatedAt = new Date().toISOString();
            
            // Save updated user
            const updateResponse = await fetch(`${apiBaseUrl}/users/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(user)
            });
            
            if (!updateResponse.ok) throw new Error('Failed to update user role');
            return updateResponse.json();
        });
        
        await Promise.all(promises);
        
        // Refresh users data
        await fetchUsers();
        selectedUsers.clear();
        showToast(`${promises.length} users role changed to ${newRole}`, 'success');
    } catch (error) {
        showToast(`Error changing roles: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

// Helper functions
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function clearErrors() {
    $('.form-group').removeClass('error');
    $('.error-message').hide();
}

function activateTab(tabId) {
    $('.form-tab').removeClass('active');
    $(`.form-tab[data-tab="${tabId}"]`).addClass('active');
    
    $('.tab-content').removeClass('active');
    $(`#${tabId}Tab`).addClass('active');
    
    const tabs = $('.form-tab');
    currentTab = tabs.index($(`.form-tab[data-tab="${tabId}"]`));
    
    $('#prevTabBtn').prop('disabled', currentTab === 0);
    
    if (currentTab === tabs.length - 1) {
        $('#nextTabBtn').prop('disabled', true);
        $('#submitUserBtn').show();
    } else {
        $('#nextTabBtn').prop('disabled', false);
        $('#submitUserBtn').hide();
    }
}

function setDefaultPermissions(role) {
    // Reset all permissions
    $('.permission-category input[type="checkbox"]').prop('checked', false);
    
    // Set default permissions based on role
    switch(role) {
        case 'admin':
            $('.permission-category input[type="checkbox"]').prop('checked', true);
            break;
        case 'manager':
            $('#permDashboardView, #permDashboardExport, #permBookingView, #permBookingCreate, #permBookingEdit, #permTruckView, #permTruckCreate, #permTruckEdit, #permUserView, #permUserEdit, #permReportView, #permReportExport, #permAnalyticsView').prop('checked', true);
            break;
        case 'customer':
            $('#permDashboardView, #permBookingView, #permBookingCreate, #permBookingEdit').prop('checked', true);
            break;
        case 'driver':
            $('#permDashboardView, #permBookingView, #permTruckView').prop('checked', true);
            break;
        case 'viewer':
            $('#permDashboardView, #permBookingView, #permTruckView, #permReportView, #permAnalyticsView').prop('checked', true);
            break;
    }
}

function updateUserStats() {
    const stats = {
        total: usersData.length,
        active: usersData.filter(u => u.status === 'active').length,
        new: usersData.filter(u => {
            const regDate = new Date(u.registrationDate || u.createdAt);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return regDate > weekAgo;
        }).length,
        pending: usersData.filter(u => u.status === 'pending').length
    };
    
    $('#totalUsers').text(stats.total);
    $('#activeUsers').text(stats.active);
    $('#newUsers').text(stats.new);
    $('#pendingUsers').text(stats.pending);
}

function updateUserBadge() {
    $('#userBadge').text(usersData.length);
}

function loadRolesDistribution() {
    const distribution = $('#rolesDistribution');
    distribution.empty();
    
    if (usersData.length === 0) {
        distribution.html(`
            <div style="text-align: center; padding: 40px; color: #999;">
                <i class="fas fa-chart-pie" style="font-size: 48px; margin-bottom: 15px;"></i>
                <p>No user data available</p>
            </div>
        `);
        return;
    }
    
    // Calculate distribution from actual data
    const rolesCount = {};
    usersData.forEach(user => {
        const role = user.role || 'customer';
        rolesCount[role] = (rolesCount[role] || 0) + 1;
    });
    
    const totalUsers = usersData.length;
    
    // Define role colors and icons
    const roleConfig = {
        admin: { color: 'admin', icon: 'crown' },
        manager: { color: 'manager', icon: 'user-tie' },
        customer: { color: 'customer', icon: 'user' },
        driver: { color: 'driver', icon: 'truck' },
        viewer: { color: 'viewer', icon: 'eye' }
    };
    
    Object.keys(rolesCount).forEach(role => {
        const count = rolesCount[role];
        const percentage = totalUsers > 0 ? Math.round((count / totalUsers) * 100 * 10) / 10 : 0;
        const config = roleConfig[role] || { color: 'customer', icon: 'user' };
        
        const roleItem = `
            <div class="role-item ${config.color}">
                <div class="role-info">
                    <div class="role-icon">
                        <i class="fas fa-${config.icon}"></i>
                    </div>
                    <div class="role-details">
                        <h4>${capitalizeFirst(role)}</h4>
                        <p>${count} users</p>
                    </div>
                </div>
                <div class="role-stats">
                    <span class="role-count">${percentage}%</span>
                    <span class="role-percentage">of total users</span>
                </div>
            </div>
        `;
        distribution.append(roleItem);
    });
}

function loadActivity() {
    // This would fetch from an API endpoint in a real app
    // For now, showing recent user activities
    const activityList = $('#activityList');
    activityList.empty();
    
    if (usersData.length === 0) {
        activityList.html(`
            <div style="text-align: center; padding: 40px; color: #999;">
                <i class="fas fa-history" style="font-size: 48px; margin-bottom: 15px;"></i>
                <p>No recent activity</p>
            </div>
        `);
        return;
    }
    
    // Show recent user activities (last 3 users)
    const recentUsers = usersData
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 3);
    
    recentUsers.forEach(user => {
        const activityItem = `
            <div class="activity-item register">
                <div class="activity-icon">
                    <i class="fas fa-user-plus"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-header">
                        <h4>New User Registration</h4>
                        <span class="activity-time">${formatDate(user.createdAt)}</span>
                    </div>
                    <p>${user.firstName} ${user.lastName} registered as ${user.role}</p>
                    <div class="activity-user">
                        <i class="fas fa-user"></i>
                        ${user.email}
                    </div>
                </div>
            </div>
        `;
        activityList.append(activityItem);
    });
}

function sendMessageToUser(userId) {
    const user = usersData.find(u => u.id == userId);
    if (!user) {
        showToast('User not found', 'error');
        return;
    }
    
    // Open email modal
    $('#emailRecipients').html(`
        <div class="recipient-tag">
            ${user.firstName} ${user.lastName} &lt;${user.email}&gt;
            <button onclick="$(this).parent().remove()"><i class="fas fa-times"></i></button>
        </div>
    `);
    $('#emailSubject').val('');
    $('#emailContent').val('');
    
    openModal('#sendEmailModal');
}

function togglePassword(fieldId) {
    const field = $('#' + fieldId);
    const type = field.attr('type') === 'password' ? 'text' : 'password';
    field.attr('type', type);
    field.siblings('.password-toggle').find('i').toggleClass('fa-eye fa-eye-slash');
}

function previewUserPhoto(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            $('#photoPreview').html(`
                <img src="${e.target.result}" class="user-photo-preview" alt="User Photo">
                <p>Photo uploaded successfully</p>
                <small>Click to change photo</small>
            `);
        };
        reader.readAsDataURL(file);
    }
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
        return 'N/A';
    }
}

function formatDateTime(dateTimeString) {
    if (!dateTimeString) return 'Never';
    try {
        const date = new Date(dateTimeString);
        return date.toLocaleString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return 'Never';
    }
}

function capitalizeFirst(string) {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function getStatusClass(status) {
    const statusClasses = {
        'active': 'status-active',
        'inactive': 'status-inactive',
        'pending': 'status-pending',
        'suspended': 'status-suspended'
    };
    return statusClasses[status] || 'status-unknown';
}

function getRoleClass(role) {
    const roleClasses = {
        'admin': 'role-admin',
        'manager': 'role-manager',
        'customer': 'role-customer',
        'driver': 'role-driver',
        'viewer': 'role-viewer'
    };
    return roleClasses[role] || 'role-unknown';
}

function getActivityIcon(type) {
    const icons = {
        'login': 'sign-in-alt',
        'register': 'user-plus',
        'update': 'edit',
        'security': 'shield-alt'
    };
    return icons[type] || 'info-circle';
}

function generateUserId() {
    if (usersData.length === 0) return 'USR-001';
    
    const existingIds = usersData.map(u => u.id).filter(id => id && id.startsWith('USR-'));
    if (existingIds.length === 0) return 'USR-001';
    
    const lastNumber = Math.max(...existingIds.map(id => {
        const match = id.match(/USR-(\d+)/);
        return match ? parseInt(match[1]) : 0;
    }));
    
    return `USR-${String(lastNumber + 1).padStart(3, '0')}`;
}

function toggleSelectAll() {
    const isChecked = $('#selectAll').prop('checked');
    $('.row-checkbox').prop('checked', isChecked);
    
    selectedUsers.clear();
    if (isChecked) {
        $('.row-checkbox').each(function() {
            selectedUsers.add($(this).val());
        });
    }
    
    updateSelectedCount();
}

function updateSelectAllCheckbox() {
    const allChecked = $('.row-checkbox').length === $('.row-checkbox:checked').length;
    $('#selectAll').prop('checked', allChecked);
}

function updateSelectedCount() {
    $('#selectedUsersCount').text(selectedUsers.size);
}

function updateTableInfo() {
    const table = $('#usersTable').DataTable();
    const info = table.page.info();
    
    const start = info.start + 1;
    const end = info.end;
    const total = info.recordsTotal;
    
    $('#tableInfo').text(`Showing ${start} to ${end} of ${total} users`);
}

function updatePagination() {
    const table = $('#usersTable').DataTable();
    const info = table.page.info();
    
    $('#firstPage').prop('disabled', info.page === 0);
    $('#prevPage').prop('disabled', info.page === 0);
    $('#nextPage').prop('disabled', info.page === info.pages - 1);
    $('#lastPage').prop('disabled', info.page === info.pages - 1);
    
    // Update page numbers
    const pageNumbers = $('#pageNumbers');
    pageNumbers.empty();
    
    const startPage = Math.max(0, info.page - 2);
    const endPage = Math.min(info.pages - 1, info.page + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = $(`
            <button class="page-number ${i === info.page ? 'active' : ''}" data-page="${i}">
                ${i + 1}
            </button>
        `);
        pageBtn.click(function() {
            table.page(i).draw('page');
            updatePagination();
        });
        pageNumbers.append(pageBtn);
    }
    
    $('#paginationInfo').text(`Page ${info.page + 1} of ${info.pages}`);
}

function openModal(modalSelector) {
    $(modalSelector).addClass('active');
    $('body').addClass('modal-open');
}

function closeModal(modalSelector) {
    $(modalSelector).removeClass('active');
    $('body').removeClass('modal-open');
}

function closeAllModals() {
    $('.modal.active').removeClass('active');
    $('body').removeClass('modal-open');
}

function refreshUsersData() {
    $('#refreshUsers').html('<i class="fas fa-spinner fa-spin"></i> Refreshing...');
    fetchUsers().finally(() => {
        $('#refreshUsers').html('<i class="fas fa-sync-alt"></i> Refresh');
    });
}

function exportUsersData() {
    if (usersData.length === 0) {
        showToast('No users to export', 'warning');
        return;
    }
    
    // Convert users data to CSV
    const headers = ['ID', 'First Name', 'Last Name', 'Email', 'Role', 'Status', 'Phone', 'Registration Date', 'Last Login'];
    const csvRows = [];
    
    // Add header row
    csvRows.push(headers.join(','));
    
    // Add data rows
    usersData.forEach(user => {
        const row = [
            user.id,
            user.firstName,
            user.lastName,
            user.email,
            user.role,
            user.status,
            user.phone || '',
            formatDate(user.registrationDate || user.createdAt),
            formatDateTime(user.lastLogin)
        ].map(field => `"${field}"`).join(',');
        
        csvRows.push(row);
    });
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    
    if (navigator.msSaveBlob) { // IE 10+
        navigator.msSaveBlob(blob, `users_export_${new Date().toISOString().slice(0,10)}.csv`);
    } else {
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", `users_export_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    showToast('Users exported successfully!', 'success');
}

function sendBulkEmail() {
    const subject = $('#emailSubject').val();
    const content = $('#emailContent').val();
    
    if (!subject || !content) {
        showToast('Please fill in subject and content', 'error');
        return;
    }
    
    showToast('Email sent successfully (demo)', 'success');
    closeModal('#sendEmailModal');
}

// Initialize everything when document is ready
$(document).ready(function() {
    // Initialize DataTable
    initializeDataTable();
    
    // Load initial data
    fetchUsers().then(() => {
        loadActivity();
    }).catch(error => {
        console.error('Failed to load initial data:', error);
    });
    
    // Event Listeners
    $('#addUserBtn').click(openAddUserModal);
    $('#refreshUsers').click(refreshUsersData);
    $('#exportUsers').click(exportUsersData);
    $('#selectAll').click(toggleSelectAll);
    
    // Form navigation
    const tabs = $('.form-tab');
    
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
    
    // Submit user form
    $('#userForm').submit(function(e) {
        e.preventDefault();
        validateAndSaveUser();
    });
    
    // Real-time validation
    $('#firstName, #lastName, #email, #phone, #username, #password, #confirmPassword').on('input', function() {
        $(this).removeClass('error');
        $(this).siblings('.error-message').hide();
    });
    
    // Search functionality
    $('#globalSearch').on('keyup', function() {
        const table = $('#usersTable').DataTable();
        table.search(this.value).draw();
    });
    
    // Status filter
    $('#userStatusFilter').change(function() {
        const table = $('#usersTable').DataTable();
        const status = $(this).val();
        if (status) {
            table.column(5).search(status).draw();
        } else {
            table.column(5).search('').draw();
        }
    });
    
    // Role filter
    $('#userRoleFilter').change(function() {
        const table = $('#usersTable').DataTable();
        const role = $(this).val();
        if (role) {
            table.column(4).search(role).draw();
        } else {
            table.column(4).search('').draw();
        }
    });
    
    // Row checkbox selection
    $(document).on('change', '.row-checkbox', function() {
        const userId = $(this).val();
        if ($(this).is(':checked')) {
            selectedUsers.add(userId);
        } else {
            selectedUsers.delete(userId);
        }
        updateSelectedCount();
        updateSelectAllCheckbox();
    });
    
    // Bulk actions
    $('#bulkAction').change(function() {
        const action = $(this).val();
        const details = $('#bulkActionDetails');
        details.empty().removeClass('active');
        
        if (action === 'change-role') {
            details.html(`
                <div class="form-group">
                    <label>New Role</label>
                    <select id="newRole" class="form-select">
                        <option value="admin">Administrator</option>
                        <option value="manager">Manager</option>
                        <option value="customer">Customer</option>
                        <option value="driver">Driver</option>
                        <option value="viewer">Viewer</option>
                    </select>
                </div>
            `).addClass('active');
        }
    });
    
    // Close modals when clicking outside
    $(document).on('click', function(e) {
        if ($(e.target).hasClass('modal')) {
            closeModal(`#${$(e.target).attr('id')}`);
        }
    });
    
    // Esc key to close modals
    $(document).keydown(function(e) {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
    
    // Logout
    $('#adminLogoutBtn').click(function(e) {
        e.preventDefault();
        if (confirm('Are you sure you want to logout?')) {
            showToast('Logging out...', 'info');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
        }
    });
    
    // Role change event
    $('#userRole').change(function() {
        const role = $(this).val();
        setDefaultPermissions(role);
    });
});