// DOM Elements
const signupForm = document.getElementById('signupForm');
const successModal = document.getElementById('successModal');
const accountInfo = document.getElementById('accountInfo');

// JSON Server endpoint
const API_URL = 'http://localhost:5000/users';

// Generate year options for birth year select
function populateYearOptions() {
    const yearSelect = document.getElementById('yearOfBirth');
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 100;
    
    for (let year = currentYear; year >= startYear; year--) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    }
}

// Password strength checker
function checkPasswordStrength(password) {
    let strength = 0;
    const strengthBar = document.getElementById('passwordStrength');
    const strengthText = document.getElementById('strengthText');
    
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    
    // Update strength bar
    strengthBar.style.width = (strength * 25) + '%';
    
    // Update strength text and color
    if (strength === 0) {
        strengthBar.style.backgroundColor = '#dc3545';
        strengthText.textContent = 'Very Weak';
        strengthText.style.color = '#dc3545';
    } else if (strength === 1) {
        strengthBar.style.backgroundColor = '#ff6b6b';
        strengthText.textContent = 'Weak';
        strengthText.style.color = '#ff6b6b';
    } else if (strength === 2) {
        strengthBar.style.backgroundColor = '#ffd166';
        strengthText.textContent = 'Fair';
        strengthText.style.color = '#ffd166';
    } else if (strength === 3) {
        strengthBar.style.backgroundColor = '#06d6a0';
        strengthText.textContent = 'Good';
        strengthText.style.color = '#06d6a0';
    } else {
        strengthBar.style.backgroundColor = '#118ab2';
        strengthText.textContent = 'Strong';
        strengthText.style.color = '#118ab2';
    }
    
    // Update password requirements checklist
    const requirements = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password)
    };
    
    for (const [rule, met] of Object.entries(requirements)) {
        const li = document.querySelector(`[data-rule="${rule}"]`);
        if (li) {
            if (met) {
                li.classList.add('requirement-met');
                li.classList.remove('requirement-not-met');
            } else {
                li.classList.add('requirement-not-met');
                li.classList.remove('requirement-met');
            }
        }
    }
    
    return strength;
}

// Form validation
function validateForm() {
    let isValid = true;
    const errors = {};
    
    // Get form values
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const yearOfBirth = document.getElementById('yearOfBirth').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const terms = document.getElementById('terms').checked;
    
    // Clear previous errors
    clearErrors();
    
    // Validate first name
    if (!firstName) {
        errors.firstName = 'First name is required';
        isValid = false;
    } else if (firstName.length < 2) {
        errors.firstName = 'First name must be at least 2 characters';
        isValid = false;
    }
    
    // Validate last name
    if (!lastName) {
        errors.lastName = 'Last name is required';
        isValid = false;
    } else if (lastName.length < 2) {
        errors.lastName = 'Last name must be at least 2 characters';
        isValid = false;
    }
    
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
        errors.email = 'Email is required';
        isValid = false;
    } else if (!emailRegex.test(email)) {
        errors.email = 'Please enter a valid email address';
        isValid = false;
    }
    
    // Validate phone
    const phoneRegex = /^[\+]?[1-9][\d\s\-\(\)\.]{8,}$/;
    if (!phone) {
        errors.phone = 'Phone number is required';
        isValid = false;
    } else if (!phoneRegex.test(phone)) {
        errors.phone = 'Please enter a valid phone number';
        isValid = false;
    }
    
    // Validate year of birth
    if (!yearOfBirth) {
        errors.yearOfBirth = 'Year of birth is required';
        isValid = false;
    } else {
        const year = parseInt(yearOfBirth);
        const currentYear = new Date().getFullYear();
        if (year < 1900 || year > currentYear) {
            errors.yearOfBirth = 'Please enter a valid year';
            isValid = false;
        }
    }
    
    // Validate password
    if (!password) {
        errors.password = 'Password is required';
        isValid = false;
    } else if (password.length < 8) {
        errors.password = 'Password must be at least 8 characters';
        isValid = false;
    } else if (!/[A-Z]/.test(password)) {
        errors.password = 'Password must contain at least one uppercase letter';
        isValid = false;
    } else if (!/[a-z]/.test(password)) {
        errors.password = 'Password must contain at least one lowercase letter';
        isValid = false;
    } else if (!/[0-9]/.test(password)) {
        errors.password = 'Password must contain at least one number';
        isValid = false;
    }
    
    // Validate confirm password
    if (!confirmPassword) {
        errors.confirmPassword = 'Please confirm your password';
        isValid = false;
    } else if (password !== confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
        isValid = false;
    }
    
    // Validate terms
    if (!terms) {
        errors.terms = 'You must agree to the terms and conditions';
        isValid = false;
    }
    
    // Display errors
    Object.keys(errors).forEach(field => {
        const errorElement = document.getElementById(`${field}Error`);
        if (errorElement) {
            errorElement.textContent = errors[field];
            errorElement.style.display = 'block';
        }
    });
    
    return isValid;
}

// Clear error messages
function clearErrors() {
    const errorMessages = document.querySelectorAll('.error-message');
    errorMessages.forEach(error => {
        error.textContent = '';
        error.style.display = 'none';
    });
}

// Check if email already exists
async function checkEmailExists(email) {
    try {
        const response = await fetch(`${API_URL}?email=${encodeURIComponent(email)}`);
        const users = await response.json();
        return users.length > 0;
    } catch (error) {
        console.error('Error checking email:', error);
        return false;
    }
}

// Generate a unique user ID
function generateUserId() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Create user account in JSON Server
async function createUserAccount(userData) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData)
        });
        
        if (!response.ok) {
            throw new Error('Failed to create account');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error creating account:', error);
        throw error;
    }
}

// Show success modal
function showSuccessModal(userData) {
    accountInfo.innerHTML = `
        <div class="info-item">
            <i class="fas fa-user"></i>
            <span>${userData.firstName} ${userData.lastName}</span>
        </div>
        <div class="info-item">
            <i class="fas fa-envelope"></i>
            <span>${userData.email}</span>
        </div>
        <div class="info-item">
            <i class="fas fa-calendar"></i>
            <span>Account created: ${new Date().toLocaleDateString()}</span>
        </div>
    `;
    
    successModal.style.display = 'flex';
    
    // Store user data in localStorage for session management
    localStorage.setItem('currentUser', JSON.stringify(userData));
    localStorage.setItem('isLoggedIn', 'true');
}

// Handle form submission
async function handleSubmit(event) {
    event.preventDefault();
    
    if (!validateForm()) {
        return;
    }
    
    // Get form values
    const formData = {
        id: generateUserId(),
        firstName: document.getElementById('firstName').value.trim(),
        lastName: document.getElementById('lastName').value.trim(),
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        yearOfBirth: parseInt(document.getElementById('yearOfBirth').value),
        password: document.getElementById('password').value,
        newsletter: document.getElementById('newsletter').checked,
        termsAccepted: document.getElementById('terms').checked,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        accountStatus: 'active',
        role: 'user',
        profilePicture: null,
        emailVerified: false,
        phoneVerified: false,
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
        }
    };
    
    // Check if email already exists
    const emailExists = await checkEmailExists(formData.email);
    if (emailExists) {
        document.getElementById('emailError').textContent = 'This email is already registered';
        document.getElementById('emailError').style.display = 'block';
        return;
    }
    
    // Disable submit button and show loading state
    const submitBtn = signupForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';
    submitBtn.disabled = true;
    
    try {
        // Create user account
        const createdUser = await createUserAccount(formData);
        
        // Clear form
        signupForm.reset();
        
        // Show success modal
        showSuccessModal(createdUser);
        
    } catch (error) {
        alert('Error creating account. Please try again.');
        console.error('Signup error:', error);
    } finally {
        // Restore submit button
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Toggle password visibility
function setupPasswordToggles() {
    const toggles = document.querySelectorAll('.password-toggle');
    
    toggles.forEach(toggle => {
        toggle.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const input = document.getElementById(targetId);
            const icon = this.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });
}

// Social signup buttons (placeholder functionality)
function setupSocialSignup() {
    const googleBtn = document.querySelector('.google-btn');
    const facebookBtn = document.querySelector('.facebook-btn');
    
    googleBtn?.addEventListener('click', () => {
        alert('Google signup integration would be implemented here.');
    });
    
    facebookBtn?.addEventListener('click', () => {
        alert('Facebook signup integration would be implemented here.');
    });
}

// Real-time form validation
function setupRealTimeValidation() {
    const inputs = signupForm.querySelectorAll('input, select');
    
    inputs.forEach(input => {
        // Validate on blur
        input.addEventListener('blur', () => {
            validateForm();
        });
        
        // Clear error on focus
        input.addEventListener('focus', () => {
            const fieldName = input.id;
            const errorElement = document.getElementById(`${fieldName}Error`);
            if (errorElement) {
                errorElement.textContent = '';
                errorElement.style.display = 'none';
            }
        });
    });
    
    // Password strength real-time check
    const passwordInput = document.getElementById('password');
    if (passwordInput) {
        passwordInput.addEventListener('input', (e) => {
            checkPasswordStrength(e.target.value);
        });
    }
    
    // Confirm password validation
    const confirmPasswordInput = document.getElementById('confirmPassword');
    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', () => {
            const password = document.getElementById('password').value;
            const confirmPassword = confirmPasswordInput.value;
            
            if (confirmPassword && password !== confirmPassword) {
                document.getElementById('confirmPasswordError').textContent = 'Passwords do not match';
                document.getElementById('confirmPasswordError').style.display = 'block';
            } else {
                document.getElementById('confirmPasswordError').textContent = '';
                document.getElementById('confirmPasswordError').style.display = 'none';
            }
        });
    }
}

// Close modal when clicking outside
window.addEventListener('click', (event) => {
    if (event.target === successModal) {
        successModal.style.display = 'none';
    }
});

// Initialize the application
function init() {
    // Populate year options
    populateYearOptions();
    
    // Setup form submission
    signupForm.addEventListener('submit', handleSubmit);
    
    // Setup password toggles
    setupPasswordToggles();
    
    // Setup social signup buttons
    setupSocialSignup();
    
    // Setup real-time validation
    setupRealTimeValidation();
    
    // Setup enter key to submit form
    signupForm.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && e.target.type !== 'textarea') {
            e.preventDefault();
        }
    });
    
    // Display current year in footer if needed
    document.querySelectorAll('.current-year').forEach(el => {
        el.textContent = new Date().getFullYear();
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', init);