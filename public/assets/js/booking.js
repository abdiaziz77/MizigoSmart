// Kenya-specific booking system with M-Pesa integration
class KenyaBookingPage {
    static API_URL = 'http://localhost:5000/bookings';
    static USERS_API_URL = 'http://localhost:5000/users';
    static currentStep = 1;
    static totalSteps = 4;
    static bookingData = {};
    static trackingNumber = '';
    static bookingReference = '';
    
    // County distances from Nairobi (km) for pricing calculation
    static countyDistances = {
        'Nairobi': 0,
        'Mombasa': 485,
        'Kisumu': 265,
        'Nakuru': 160,
        'Eldoret': 310,
        'Thika': 45,
        'Malindi': 560,
        'Kitale': 380,
        'Kakamega': 335,
        'Kisii': 280,
        'Nyeri': 150,
        'Meru': 230,
        'Embu': 120,
        'Machakos': 65,
        'Kiambu': 20,
        'Muranga': 85,
        'Nyandarua': 120,
        'Nandi': 260,
        'Bungoma': 380,
        'Busia': 405,
        'Siaya': 330,
        'Homa Bay': 300,
        'Migori': 320,
        'Vihiga': 340,
        'Bomet': 250,
        'Kericho': 220,
        'Kilifi': 500,
        'Kwale': 520,
        'Lamu': 620,
        'Taita Taveta': 320,
        'Garissa': 370,
        'Wajir': 600,
        'Mandera': 800,
        'Marsabit': 550,
        'Isiolo': 280,
        'Tharaka Nithi': 200,
        'Kitui': 150,
        'Makueni': 180,
        'Kirinyaga': 140,
        'Turkana': 680,
        'West Pokot': 450,
        'Samburu': 320,
        'Trans Nzoia': 370,
        'Uasin Gishu': 300,
        'Elgeyo Marakwet': 280,
        'Baringo': 250,
        'Laikipia': 180,
        'Narok': 140,
        'Kajiado': 70,
        'Nyamira': 290
    };
    
    // Pricing in KES
    static pricing = {
        baseRates: {
            'document': 200,
            'parcel': 500,
            'cargo': 1500,
            'freight': 3500,
            'hazardous': 4500,
            'perishable': 3000
        },
        weightRate: 50, // KES per kg
        distanceRate: 15, // KES per km
        insuranceRate: 0.01, // 1% of declared value
        expressSurcharge: 0.5, // 50% surcharge for express checkbox
        deliveryOptions: {
            'standard': 500,
            'express': 1200,
            'overnight': 2500
        },
        specialRequirements: {
            'fragile': 300,
            'temperature': 800,
            'signature': 100
        }
    };
    
    static init() {
        // Check authentication and update UI
        this.checkAuthentication();
        
        // Initialize the booking form
        this.initBookingForm();
        this.initStepNavigation();
        this.initFormValidation();
        this.initPriceCalculator();
        this.initSuccessModal();
        
        // Set minimum dates for pickup and delivery
        this.setMinDates();
        
        // Generate initial booking reference for M-Pesa
        this.generateBookingReference();
        
        console.log('Kenya booking page initialized');
    }
    
    // Check authentication and update UI accordingly
    static async checkAuthentication() {
        try {
            if (await this.isUserLoggedIn()) {
                this.enableForm();
                await this.prefillUserData();
                this.updateNavbar();
                console.log('User is logged in');
            } else {
                this.disableForm();
                this.showLoginPrompt();
                console.log('User is not logged in');
            }
        } catch (error) {
            console.error('Authentication check error:', error);
            this.disableForm();
        }
    }
    
    static async isUserLoggedIn() {
        try {
            // Check if user data exists in localStorage
            const userStr = localStorage.getItem('currentUser');
            if (!userStr) return false;
            
            const user = JSON.parse(userStr);
            if (!user || !user.id) return false;
            
            // Verify user exists in database
            const response = await fetch(`${this.USERS_API_URL}/${user.id}`);
            if (!response.ok) return false;
            
            const dbUser = await response.json();
            return dbUser && dbUser.id === user.id;
        } catch (error) {
            console.error('Error checking login status:', error);
            return false;
        }
    }
    
    static async getCurrentUser() {
        try {
            const userStr = localStorage.getItem('currentUser');
            if (!userStr) return null;
            
            const user = JSON.parse(userStr);
            if (!user || !user.id) return null;
            
            // Get fresh data from database
            const response = await fetch(`${this.USERS_API_URL}/${user.id}`);
            if (!response.ok) return null;
            
            return await response.json();
        } catch (error) {
            console.error('Error getting current user:', error);
            return null;
        }
    }
    
    static enableForm() {
        const form = document.getElementById('bookingForm');
        if (!form) return;
        
        form.querySelectorAll('input, select, textarea, button').forEach(element => {
            element.disabled = false;
        });
        
        const loginPrompt = document.querySelector('.login-prompt');
        if (loginPrompt) {
            loginPrompt.remove();
        }
    }
    
    static disableForm() {
        const form = document.getElementById('bookingForm');
        if (!form) return;
        
        form.querySelectorAll('input, select, textarea, button').forEach(element => {
            element.disabled = true;
            if (element.type !== 'submit') {
                element.placeholder = 'Please login to book a shipment';
            }
        });
        
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login to Book';
            submitBtn.disabled = false;
        }
    }
    
    static showLoginPrompt() {
        if (document.querySelector('.login-prompt')) return;
        
        const form = document.getElementById('bookingForm');
        if (!form) return;
        
        const loginPrompt = document.createElement('div');
        loginPrompt.className = 'login-prompt alert alert-warning';
        loginPrompt.style.marginBottom = '2rem';
        loginPrompt.style.padding = '1rem';
        loginPrompt.style.borderRadius = 'var(--radius)';
        loginPrompt.style.backgroundColor = 'var(--warning-light)';
        loginPrompt.style.borderLeft = '4px solid var(--warning)';
        
        loginPrompt.innerHTML = `
            <div style="display: flex; align-items: center; gap: 1rem;">
                <i class="fas fa-info-circle" style="color: var(--warning); font-size: 1.5rem;"></i>
                <div>
                    <h4 style="margin: 0 0 0.5rem 0; color: var(--warning-dark);">Login Required</h4>
                    <p style="margin: 0; color: var(--gray-700);">
                        You need to login or create an account to book shipments. 
                        <a href="login.html" style="color: var(--primary); font-weight: 600; text-decoration: none;">
                            Click here to login
                        </a> or 
                        <a href="register.html" style="color: var(--primary); font-weight: 600; text-decoration: none;">
                            create a new account
                        </a>.
                    </p>
                </div>
            </div>
        `;
        
        form.insertBefore(loginPrompt, form.firstChild);
    }
    
    static updateNavbar() {
        this.getCurrentUser().then(currentUser => {
            const navbarActions = document.querySelector('.navbar-actions');
            if (navbarActions) {
                const loginLink = navbarActions.querySelector('a[href="login.html"]');
                const signupLink = navbarActions.querySelector('a[href="register.html"]');
                
                if (loginLink) loginLink.style.display = 'none';
                if (signupLink) signupLink.style.display = 'none';
                
                let logoutLink = document.querySelector('#logoutLink');
                if (!logoutLink) {
                    logoutLink = document.createElement('a');
                    logoutLink.href = "#";
                    logoutLink.id = "logoutLink";
                    logoutLink.className = "btn btn-outline";
                    logoutLink.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
                    navbarActions.appendChild(logoutLink);
                    
                    logoutLink.addEventListener('click', (e) => {
                        e.preventDefault();
                        this.logout();
                    });
                }
                
                const bookLink = document.querySelector('a[href="booking.html"]');
                if (bookLink && currentUser) {
                    bookLink.title = `Book a shipment as ${currentUser.firstName}`;
                }
            }
            
            const trackLink = document.querySelector('a[href="track.html"]');
            if (trackLink) {
                if (currentUser && currentUser.role !== 'admin') {
                    trackLink.style.display = 'block';
                } else if (!currentUser) {
                    trackLink.style.display = 'none';
                }
            }
        });
    }
    
    static logout() {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('lastLogin');
        
        if (window.Components && typeof window.Components.showAlert === 'function') {
            window.Components.showAlert('You have been logged out successfully.', 'info');
        }
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    }
    
    static initBookingForm() {
        const form = document.getElementById('bookingForm');
        if (!form) {
            console.error('Booking form not found');
            return;
        }
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (!(await this.isUserLoggedIn())) {
                sessionStorage.setItem('intendedPage', window.location.href);
                
                if (window.Components && typeof window.Components.showAlert === 'function') {
                    window.Components.showAlert('Please login to book shipments.', 'info');
                }
                
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1500);
                return;
            }
            
            await this.submitBooking();
        });
        
        this.initFormDataCollection();
    }
    
    static initStepNavigation() {
        document.querySelectorAll('.next-step').forEach(button => {
            button.addEventListener('click', async (e) => {
                if (!(await this.isUserLoggedIn())) {
                    this.showLoginRequiredAlert();
                    return;
                }
                
                const nextStepId = button.getAttribute('data-next');
                this.goToStep(nextStepId);
            });
        });
        
        document.querySelectorAll('.prev-step').forEach(button => {
            button.addEventListener('click', (e) => {
                const prevStepId = button.getAttribute('data-prev');
                this.goToStep(prevStepId);
            });
        });
    }
    
    static showLoginRequiredAlert() {
        if (window.Components && typeof window.Components.showAlert === 'function') {
            window.Components.showAlert('Please login to continue with booking.', 'warning');
        } else {
            alert('Please login to continue with booking.');
        }
        
        setTimeout(() => {
            sessionStorage.setItem('intendedPage', window.location.href);
            window.location.href = 'login.html';
        }, 2000);
    }
    
    static goToStep(stepId) {
        if (!this.validateCurrentStep()) {
            return;
        }
        
        document.querySelectorAll('.form-step').forEach(step => {
            step.classList.remove('active');
        });
        
        const targetStep = document.getElementById(stepId);
        if (targetStep) {
            targetStep.classList.add('active');
            this.currentStep = parseInt(stepId.replace('step', ''));
            
            if (stepId === 'step4') {
                this.updateReviewSection();
                this.updatePriceEstimate();
                this.updateMpesaDetails();
            }
            
            targetStep.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
    
    static validateCurrentStep() {
        const currentStep = document.querySelector('.form-step.active');
        if (!currentStep) return true;
        
        const requiredFields = currentStep.querySelectorAll('[required]');
        let isValid = true;
        
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                isValid = false;
                this.showFieldError(field, 'This field is required');
            } else {
                this.clearFieldError(field);
            }
            
            if (field.type === 'email' && field.value.trim()) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(field.value.trim())) {
                    isValid = false;
                    this.showFieldError(field, 'Please enter a valid email address');
                }
            }
            
            if (field.type === 'tel' && field.value.trim()) {
                const phoneRegex = /^[0-9]{10}$/;
                const cleanPhone = field.value.replace(/\D/g, '');
                if (!phoneRegex.test(cleanPhone) || !cleanPhone.startsWith('07')) {
                    isValid = false;
                    this.showFieldError(field, 'Please enter a valid Safaricom number (07XXXXXXXX)');
                }
            }
        });
        
        if (!isValid) {
            if (window.Components && typeof window.Components.showAlert === 'function') {
                window.Components.showAlert('Please fill all required fields correctly before proceeding.', 'warning');
            }
        }
        
        return isValid;
    }
    
    static showFieldError(field, message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        errorDiv.textContent = message;
        errorDiv.style.color = 'var(--danger)';
        errorDiv.style.fontSize = '0.875rem';
        errorDiv.style.marginTop = '0.25rem';
        
        this.clearFieldError(field);
        
        field.parentNode.appendChild(errorDiv);
        field.classList.add('error');
    }
    
    static clearFieldError(field) {
        const existingError = field.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
        field.classList.remove('error');
    }
    
    static initFormValidation() {
        document.querySelectorAll('[required]').forEach(field => {
            field.addEventListener('blur', () => {
                if (!field.value.trim()) {
                    this.showFieldError(field, 'This field is required');
                } else {
                    this.clearFieldError(field);
                }
            });
            
            field.addEventListener('input', () => {
                if (field.value.trim()) {
                    this.clearFieldError(field);
                }
            });
        });
        
        document.querySelectorAll('input[type="email"]').forEach(field => {
            field.addEventListener('blur', () => {
                if (field.value.trim()) {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(field.value.trim())) {
                        this.showFieldError(field, 'Please enter a valid email address');
                    }
                }
            });
        });
        
        document.querySelectorAll('input[type="tel"]').forEach(field => {
            field.addEventListener('blur', () => {
                if (field.value.trim()) {
                    const phoneRegex = /^[0-9]{10}$/;
                    const cleanPhone = field.value.replace(/\D/g, '');
                    if (!phoneRegex.test(cleanPhone) || !cleanPhone.startsWith('07')) {
                        this.showFieldError(field, 'Please enter a valid Safaricom number (07XXXXXXXX)');
                    }
                }
            });
        });
    }
    
    static initFormDataCollection() {
        document.querySelectorAll('#bookingForm input, #bookingForm select, #bookingForm textarea').forEach(element => {
            element.addEventListener('change', () => {
                this.collectFormData();
                this.updatePriceEstimate();
            });
            
            element.addEventListener('input', () => {
                this.collectFormData();
                this.updatePriceEstimate();
            });
        });
    }
    
    static async collectFormData() {
        const form = document.getElementById('bookingForm');
        if (!form) return;
        
        const formData = new FormData(form);
        this.bookingData = Object.fromEntries(formData);
        
        if (await this.isUserLoggedIn()) {
            const currentUser = await this.getCurrentUser();
            if (currentUser) {
                this.bookingData.userId = currentUser.id;
                this.bookingData.userEmail = currentUser.email;
                this.bookingData.userName = `${currentUser.firstName} ${currentUser.lastName}`;
            }
        }
        
        this.bookingData.specialRequirements = [];
        if (document.getElementById('fragile').checked) this.bookingData.specialRequirements.push('fragile');
        if (document.getElementById('temperature').checked) this.bookingData.specialRequirements.push('temperature');
        if (document.getElementById('express').checked) this.bookingData.specialRequirements.push('express_delivery');
        if (document.getElementById('signature').checked) this.bookingData.specialRequirements.push('signature');
        
        this.bookingData.dimensions = {
            length: document.getElementById('length').value,
            width: document.getElementById('width').value,
            height: document.getElementById('height').value
        };
        
        this.bookingData.pickupAddress = {
            street: document.getElementById('pickupAddress').value,
            county: document.getElementById('pickupCounty').value,
            town: document.getElementById('pickupTown').value
        };
        
        this.bookingData.deliveryAddress = {
            street: document.getElementById('deliveryAddress').value,
            county: document.getElementById('deliveryCounty').value,
            town: document.getElementById('deliveryTown').value
        };
        
        this.bookingData.createdAt = new Date().toISOString();
        this.bookingData.updatedAt = new Date().toISOString();
        
        if (!this.bookingData.trackingNumber) {
            this.bookingData.trackingNumber = this.generateTrackingNumber();
        }
        
        console.log('Form data collected:', this.bookingData);
    }
    
    static generateTrackingNumber() {
        const prefix = 'MS';
        const timestamp = Date.now().toString().slice(-8);
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        return `${prefix}${timestamp}${random}`;
    }
    
    static generateBookingReference() {
        const prefix = 'MZ';
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        this.bookingReference = `${prefix}${timestamp}${random}`;
        return this.bookingReference;
    }
    
    static async prefillUserData() {
        const currentUser = await this.getCurrentUser();
        if (!currentUser) return;
        
        document.getElementById('pickupName').value = `${currentUser.firstName} ${currentUser.lastName}`;
        document.getElementById('pickupEmail').value = currentUser.email;
        document.getElementById('pickupPhone').value = currentUser.phone || '';
        document.getElementById('mpesaNumber').value = currentUser.phone || '';
        
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        document.getElementById('pickupDate').valueAsDate = tomorrow;
        
        const deliveryDate = new Date(tomorrow);
        deliveryDate.setDate(deliveryDate.getDate() + 3);
        document.getElementById('deliveryDate').valueAsDate = deliveryDate;
        
        console.log('User data prefilled for:', currentUser.email);
    }
    
    static setMinDates() {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const formatDate = (date) => {
            return date.toISOString().split('T')[0];
        };
        
        document.getElementById('pickupDate').min = formatDate(tomorrow);
        document.getElementById('deliveryDate').min = formatDate(tomorrow);
    }
    
    static initPriceCalculator() {
        document.querySelectorAll('#bookingForm input, #bookingForm select').forEach(element => {
            element.addEventListener('change', () => {
                this.updatePriceEstimate();
            });
            
            element.addEventListener('input', () => {
                if (element.id === 'weight' || element.id === 'value' || 
                    element.id === 'pickupCounty' || element.id === 'deliveryCounty') {
                    this.updatePriceEstimate();
                }
            });
        });
        
        this.updatePriceEstimate();
    }
    
    static updatePriceEstimate() {
        // Collect form values
        const weight = parseFloat(document.getElementById('weight').value) || 0;
        const declaredValue = parseFloat(document.getElementById('value').value) || 0;
        const shipmentType = document.getElementById('shipmentType').value;
        const pickupCounty = document.getElementById('pickupCounty').value;
        const deliveryCounty = document.getElementById('deliveryCounty').value;
        const isExpress = document.getElementById('express').checked;
        const deliveryOption = document.querySelector('input[name="deliveryOption"]:checked')?.value || 'standard';
        const isFragile = document.getElementById('fragile').checked;
        const isTemperature = document.getElementById('temperature').checked;
        const isSignature = document.getElementById('signature').checked;
        
        // Calculate base rate
        let baseRate = this.pricing.baseRates[shipmentType] || this.pricing.baseRates.parcel;
        
        // Calculate weight surcharge
        let weightSurcharge = weight * this.pricing.weightRate;
        
        // Calculate distance charge
        let distanceCharge = 0;
        if (pickupCounty && deliveryCounty && this.countyDistances[pickupCounty] !== undefined && 
            this.countyDistances[deliveryCounty] !== undefined) {
            const distance = Math.abs(this.countyDistances[deliveryCounty] - this.countyDistances[pickupCounty]);
            distanceCharge = distance * this.pricing.distanceRate;
        }
        
        // Calculate insurance fee
        let insuranceFee = Math.max(declaredValue * this.pricing.insuranceRate, 100);
        
        // Calculate express fee
        let expressFee = isExpress ? baseRate * this.pricing.expressSurcharge : 0;
        
        // Calculate delivery option fee
        let deliveryFee = this.pricing.deliveryOptions[deliveryOption] || 0;
        
        // Calculate special requirements fees
        let specialFees = 0;
        if (isFragile) specialFees += this.pricing.specialRequirements.fragile;
        if (isTemperature) specialFees += this.pricing.specialRequirements.temperature;
        if (isSignature) specialFees += this.pricing.specialRequirements.signature;
        
        // Calculate total
        const estimatedTotal = baseRate + weightSurcharge + distanceCharge + insuranceFee + expressFee + deliveryFee + specialFees;
        
        // Update display with KES
        document.getElementById('baseRate').textContent = `KES ${baseRate.toLocaleString()}`;
        document.getElementById('weightSurcharge').textContent = `KES ${weightSurcharge.toLocaleString()}`;
        document.getElementById('distanceCharge').textContent = `KES ${distanceCharge.toLocaleString()}`;
        document.getElementById('insuranceFee').textContent = `KES ${insuranceFee.toLocaleString()}`;
        document.getElementById('expressFee').textContent = `KES ${expressFee.toLocaleString()}`;
        document.getElementById('deliveryFee').textContent = `KES ${deliveryFee.toLocaleString()}`;
        document.getElementById('estimatedTotal').textContent = `KES ${estimatedTotal.toLocaleString()}`;
        
        // Store in booking data
        this.bookingData.estimatedCost = estimatedTotal;
        this.bookingData.costBreakdown = {
            baseRate,
            weightSurcharge,
            distanceCharge,
            insuranceFee,
            expressFee,
            deliveryFee,
            specialFees
        };
    }
    
    static updateMpesaDetails() {
        const totalCost = this.bookingData.estimatedCost || 0;
        const mpesaAccount = this.bookingReference || this.generateBookingReference();
        
        document.getElementById('mpesaTotal').textContent = `KES ${totalCost.toLocaleString()}`;
        document.getElementById('mpesaAmount').textContent = `KES ${totalCost.toLocaleString()}`;
        document.getElementById('mpesaAccount').textContent = mpesaAccount;
    }
    
    static updateReviewSection() {
        // Shipment details
        const shipmentDetails = document.getElementById('reviewShipment');
        if (shipmentDetails) {
            const type = document.getElementById('shipmentType').value || 'Not specified';
            const weight = document.getElementById('weight').value || '0';
            const desc = document.getElementById('description').value || 'No description';
            const value = document.getElementById('value').value || '0';
            
            shipmentDetails.innerHTML = `
                <p><strong>Type:</strong> ${type.charAt(0).toUpperCase() + type.slice(1)}</p>
                <p><strong>Weight:</strong> ${weight} kg</p>
                <p><strong>Dimensions:</strong> ${document.getElementById('length').value || '0'} × ${document.getElementById('width').value || '0'} × ${document.getElementById('height').value || '0'} cm</p>
                <p><strong>Value:</strong> KES ${parseInt(value).toLocaleString()}</p>
                <p><strong>Description:</strong> ${desc}</p>
            `;
        }
        
        // Pickup details
        const pickupDetails = document.getElementById('reviewPickup');
        if (pickupDetails) {
            pickupDetails.innerHTML = `
                <p><strong>Name:</strong> ${document.getElementById('pickupName').value || 'Not specified'}</p>
                <p><strong>Phone:</strong> ${document.getElementById('pickupPhone').value || 'Not specified'}</p>
                <p><strong>Email:</strong> ${document.getElementById('pickupEmail').value || 'Not specified'}</p>
                <p><strong>Address:</strong> ${document.getElementById('pickupAddress').value || 'Not specified'}</p>
                <p><strong>County:</strong> ${document.getElementById('pickupCounty').value || 'Not specified'}</p>
                <p><strong>Town:</strong> ${document.getElementById('pickupTown').value || 'Not specified'}</p>
                <p><strong>Date:</strong> ${document.getElementById('pickupDate').value || 'Not specified'}</p>
                <p><strong>Time:</strong> ${document.getElementById('pickupTime').value || 'Not specified'}</p>
            `;
        }
        
        // Delivery details
        const deliveryDetails = document.getElementById('reviewDelivery');
        if (deliveryDetails) {
            deliveryDetails.innerHTML = `
                <p><strong>Recipient:</strong> ${document.getElementById('deliveryName').value || 'Not specified'}</p>
                <p><strong>Phone:</strong> ${document.getElementById('deliveryPhone').value || 'Not specified'}</p>
                <p><strong>Email:</strong> ${document.getElementById('deliveryEmail').value || 'Not specified'}</p>
                <p><strong>Address:</strong> ${document.getElementById('deliveryAddress').value || 'Not specified'}</p>
                <p><strong>County:</strong> ${document.getElementById('deliveryCounty').value || 'Not specified'}</p>
                <p><strong>Town:</strong> ${document.getElementById('deliveryTown').value || 'Not specified'}</p>
                <p><strong>Date:</strong> ${document.getElementById('deliveryDate').value || 'Not specified'}</p>
            `;
        }
        
        // Cost summary
        const costSummary = document.getElementById('costSummary');
        if (costSummary) {
            const baseRate = parseFloat(document.getElementById('baseRate').textContent.replace('KES', '').replace(/,/g, '')) || 0;
            const weightSurcharge = parseFloat(document.getElementById('weightSurcharge').textContent.replace('KES', '').replace(/,/g, '')) || 0;
            const distanceCharge = parseFloat(document.getElementById('distanceCharge').textContent.replace('KES', '').replace(/,/g, '')) || 0;
            const insuranceFee = parseFloat(document.getElementById('insuranceFee').textContent.replace('KES', '').replace(/,/g, '')) || 0;
            const expressFee = parseFloat(document.getElementById('expressFee').textContent.replace('KES', '').replace(/,/g, '')) || 0;
            const deliveryFee = parseFloat(document.getElementById('deliveryFee').textContent.replace('KES', '').replace(/,/g, '')) || 0;
            const total = baseRate + weightSurcharge + distanceCharge + insuranceFee + expressFee + deliveryFee;
            
            costSummary.innerHTML = `
                <div class="cost-item">
                    <span>Base Rate:</span>
                    <span>KES ${baseRate.toLocaleString()}</span>
                </div>
                <div class="cost-item">
                    <span>Weight Surcharge:</span>
                    <span>KES ${weightSurcharge.toLocaleString()}</span>
                </div>
                <div class="cost-item">
                    <span>Distance Charge:</span>
                    <span>KES ${distanceCharge.toLocaleString()}</span>
                </div>
                <div class="cost-item">
                    <span>Insurance:</span>
                    <span>KES ${insuranceFee.toLocaleString()}</span>
                </div>
                <div class="cost-item">
                    <span>Express Fee:</span>
                    <span>KES ${expressFee.toLocaleString()}</span>
                </div>
                <div class="cost-item">
                    <span>Delivery Option:</span>
                    <span>KES ${deliveryFee.toLocaleString()}</span>
                </div>
                <div class="cost-total">
                    <strong>Estimated Total:</strong>
                    <strong>KES ${total.toLocaleString()}</strong>
                </div>
            `;
        }
        
        // Update M-Pesa details
        this.updateMpesaDetails();
    }
    
    static initSuccessModal() {
        const printBtn = document.getElementById('printConfirmation');
        const newBookingBtn = document.getElementById('newBooking');
        const printReceiptBtn = document.getElementById('printReceipt');
        
        if (printBtn) {
            printBtn.addEventListener('click', () => {
                window.print();
            });
        }
        
        if (newBookingBtn) {
            newBookingBtn.addEventListener('click', () => {
                location.reload();
            });
        }
        
        if (printReceiptBtn) {
            printReceiptBtn.addEventListener('click', () => {
                this.printReceipt();
            });
        }
    }
    
    static async submitBooking() {
        if (!(await this.isUserLoggedIn())) {
            this.showLoginRequiredAlert();
            return;
        }
        
        // Validate terms acceptance
        const termsCheckbox = document.getElementById('terms');
        if (!termsCheckbox || !termsCheckbox.checked) {
            if (window.Components && typeof window.Components.showAlert === 'function') {
                window.Components.showAlert('Please accept the Terms & Conditions to proceed.', 'warning');
            }
            termsCheckbox.focus();
            return;
        }
        
        // Validate M-Pesa confirmation
        const mpesaConfirmed = document.getElementById('mpesaConfirmed');
        if (!mpesaConfirmed || !mpesaConfirmed.checked) {
            if (window.Components && typeof window.Components.showAlert === 'function') {
                window.Components.showAlert('Please confirm that you have completed the M-Pesa payment.', 'warning');
            }
            mpesaConfirmed.focus();
            return;
        }
        
        // Validate M-Pesa transaction code
        const transactionCode = document.getElementById('transactionCode').value.trim();
        if (!transactionCode) {
            if (window.Components && typeof window.Components.showAlert === 'function') {
                window.Components.showAlert('Please enter your M-Pesa transaction code.', 'warning');
            }
            document.getElementById('transactionCode').focus();
            return;
        }
        
        await this.collectFormData();
        
        if (!this.validateCurrentStep()) {
            if (window.Components && typeof window.Components.showAlert === 'function') {
                window.Components.showAlert('Please fill all required fields correctly.', 'warning');
            }
            return;
        }
        
        const submitBtn = document.querySelector('#bookingForm button[type="submit"]');
        if (!submitBtn) return;
        
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        submitBtn.disabled = true;
        
        try {
            const currentUser = await this.getCurrentUser();
            
            const bookingPayload = {
                userId: currentUser.id,
                userEmail: currentUser.email,
                userName: `${currentUser.firstName} ${currentUser.lastName}`,
                trackingNumber: this.bookingData.trackingNumber,
                bookingReference: this.bookingReference,
                shipmentType: this.bookingData.shipmentType,
                weight: parseFloat(this.bookingData.weight),
                dimensions: this.bookingData.dimensions,
                declaredValue: parseFloat(this.bookingData.value),
                description: this.bookingData.description,
                specialRequirements: this.bookingData.specialRequirements,
                
                // Pickup details
                pickupContact: {
                    name: this.bookingData.pickupName,
                    phone: this.bookingData.pickupPhone,
                    email: this.bookingData.pickupEmail
                },
                pickupAddress: this.bookingData.pickupAddress,
                pickupDate: this.bookingData.pickupDate,
                pickupTime: this.bookingData.pickupTime,
                pickupInstructions: this.bookingData.pickupInstructions,
                
                // Delivery details
                deliveryContact: {
                    name: this.bookingData.deliveryName,
                    phone: this.bookingData.deliveryPhone,
                    email: this.bookingData.deliveryEmail
                },
                deliveryAddress: this.bookingData.deliveryAddress,
                deliveryDate: this.bookingData.deliveryDate,
                deliveryInstructions: this.bookingData.deliveryInstructions,
                deliveryOption: this.bookingData.deliveryOption,
                
                // Payment details
                paymentMethod: 'mpesa',
                mpesaNumber: this.bookingData.mpesaNumber,
                mpesaTransactionCode: this.bookingData.transactionCode,
                estimatedCost: this.bookingData.estimatedCost,
                costBreakdown: this.bookingData.costBreakdown,
                
                // Status and timestamps
                status: 'paid',
                paymentStatus: 'completed',
                amountPaid: this.bookingData.estimatedCost,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            console.log('Submitting booking:', bookingPayload);
            
            // Make API call to JSON Server
            const response = await fetch(this.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(bookingPayload)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const createdBooking = await response.json();
            console.log('Booking created successfully:', createdBooking);
            
            // Show success modal with receipt
            this.showSuccessModal(createdBooking);
            
        } catch (error) {
            console.error('Error creating booking:', error);
            
            if (window.Components && typeof window.Components.showAlert === 'function') {
                window.Components.showAlert(`Failed to create booking: ${error.message}`, 'danger');
            } else {
                alert(`Failed to create booking: ${error.message}`);
            }
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }
    
    static showSuccessModal(bookingData) {
        const modal = document.getElementById('successModal');
        const confirmationDiv = document.getElementById('bookingConfirmation');
        
        if (!modal || !confirmationDiv) return;
        
        // Format dates
        const pickupDate = bookingData.pickupDate ? new Date(bookingData.pickupDate) : new Date();
        const deliveryDate = bookingData.deliveryDate ? new Date(bookingData.deliveryDate) : new Date();
        
        confirmationDiv.innerHTML = `
            <div class="confirmation-detail">
                <strong>Tracking Number:</strong>
                <span class="tracking-number">${bookingData.trackingNumber}</span>
            </div>
            <div class="confirmation-detail">
                <strong>Booking Reference:</strong>
                <span>${bookingData.bookingReference}</span>
            </div>
            <div class="confirmation-detail">
                <strong>Status:</strong>
                <span class="status-badge status-paid">${bookingData.status}</span>
            </div>
            <div class="confirmation-detail">
                <strong>Amount Paid:</strong>
                <span class="kes-amount">KES ${bookingData.amountPaid?.toLocaleString() || bookingData.estimatedCost?.toLocaleString() || '0'}</span>
            </div>
            <div class="confirmation-detail">
                <strong>Payment Method:</strong>
                <span>M-Pesa</span>
            </div>
            <div class="confirmation-detail">
                <strong>Pickup Date:</strong>
                <span>${pickupDate.toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            <div class="confirmation-detail">
                <strong>Pickup Time:</strong>
                <span>${bookingData.pickupTime || '09:00 AM'}</span>
            </div>
            <div class="confirmation-detail">
                <strong>Delivery Date:</strong>
                <span>${deliveryDate.toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            <div class="confirmation-note">
                <p><i class="fas fa-info-circle"></i> A confirmation SMS has been sent to ${bookingData.mpesaNumber}</p>
                <p><i class="fas fa-info-circle"></i> You can track your shipment using the tracking number above</p>
            </div>
        `;
        
        // Store booking data for receipt printing
        this.lastBookingData = bookingData;
        
        modal.classList.add('active');
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                modal.classList.remove('active');
            }
        });
    }
    
    static printReceipt() {
        if (!this.lastBookingData) {
            alert('No booking data available for receipt');
            return;
        }
        
        const booking = this.lastBookingData;
        const currentUser = this.getCurrentUser();
        
        // Create receipt window
        const receiptWindow = window.open('', '_blank', 'width=600,height=800');
        
        if (!receiptWindow) {
            alert('Please allow popups to print receipt');
            return;
        }
        
        // Format dates
        const now = new Date();
        const pickupDate = booking.pickupDate ? new Date(booking.pickupDate) : new Date();
        const deliveryDate = booking.deliveryDate ? new Date(booking.deliveryDate) : new Date();
        
        receiptWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Shipping Receipt - ${booking.bookingReference}</title>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap');
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                        font-family: 'Poppins', Arial, sans-serif;
                    }
                    body {
                        padding: 20px;
                        background: #f5f5f5;
                        color: #333;
                    }
                    .receipt-container {
                        max-width: 500px;
                        margin: 0 auto;
                        background: white;
                        border-radius: 10px;
                        box-shadow: 0 0 20px rgba(0,0,0,0.1);
                        overflow: hidden;
                    }
                    .receipt-header {
                        background: linear-gradient(135deg, #006600 0%, #000000 50%, #BB0000 100%);
                        color: white;
                        padding: 25px;
                        text-align: center;
                    }
                    .receipt-header h1 {
                        font-size: 28px;
                        font-weight: 600;
                        margin-bottom: 5px;
                    }
                    .receipt-header h2 {
                        font-size: 20px;
                        font-weight: 400;
                        opacity: 0.9;
                    }
                    .receipt-content {
                        padding: 25px;
                    }
                    .section {
                        margin-bottom: 25px;
                        padding-bottom: 20px;
                        border-bottom: 2px dashed #e0e0e0;
                    }
                    .section:last-child {
                        border-bottom: none;
                    }
                    .section-title {
                        font-size: 18px;
                        font-weight: 600;
                        color: #006600;
                        margin-bottom: 15px;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    }
                    .section-title i {
                        font-size: 20px;
                    }
                    .detail-row {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 10px;
                        padding: 8px 0;
                    }
                    .detail-row:nth-child(even) {
                        background: #f9f9f9;
                        border-radius: 5px;
                        padding: 8px 10px;
                    }
                    .detail-label {
                        font-weight: 500;
                        color: #555;
                    }
                    .detail-value {
                        font-weight: 600;
                        text-align: right;
                        color: #333;
                    }
                    .highlight {
                        color: #006600;
                        font-weight: 700;
                    }
                    .amount {
                        color: #006600;
                        font-weight: 700;
                        font-size: 18px;
                    }
                    .status-badge {
                        background: #006600;
                        color: white;
                        padding: 5px 15px;
                        border-radius: 20px;
                        font-size: 14px;
                        font-weight: 600;
                        text-transform: uppercase;
                    }
                    .tracking-number {
                        font-family: 'Courier New', monospace;
                        font-size: 20px;
                        font-weight: 700;
                        letter-spacing: 2px;
                        color: #006600;
                    }
                    .receipt-footer {
                        padding: 20px;
                        text-align: center;
                        background: #f5f5f5;
                        border-top: 2px dashed #ddd;
                        font-size: 14px;
                        color: #666;
                    }
                    .receipt-footer p {
                        margin: 5px 0;
                    }
                    .print-btn {
                        display: block;
                        width: 200px;
                        margin: 20px auto;
                        padding: 12px 20px;
                        background: #006600;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        font-size: 16px;
                        font-weight: 600;
                        cursor: pointer;
                        text-align: center;
                        text-decoration: none;
                    }
                    .print-btn:hover {
                        background: #004d00;
                    }
                    @media print {
                        body {
                            background: white;
                            padding: 0;
                        }
                        .print-btn {
                            display: none;
                        }
                        .receipt-container {
                            box-shadow: none;
                            border: 1px solid #ddd;
                        }
                    }
                </style>
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
            </head>
            <body>
                <div class="receipt-container">
                    <div class="receipt-header">
                        <h1><i class="fas fa-shipping-fast"></i> MSHIPO KENYA</h1>
                        <h2>Official Shipping Receipt</h2>
                    </div>
                    
                    <div class="receipt-content">
                        <div class="section">
                            <h3 class="section-title"><i class="fas fa-receipt"></i> Receipt Details</h3>
                            <div class="detail-row">
                                <span class="detail-label">Receipt No:</span>
                                <span class="detail-value tracking-number">${booking.bookingReference}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Date & Time:</span>
                                <span class="detail-value">${now.toLocaleDateString('en-KE')} ${now.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Status:</span>
                                <span class="detail-value">
                                    <span class="status-badge">${booking.status}</span>
                                </span>
                            </div>
                        </div>
                        
                        <div class="section">
                            <h3 class="section-title"><i class="fas fa-user"></i> Customer Information</h3>
                            <div class="detail-row">
                                <span class="detail-label">Customer Name:</span>
                                <span class="detail-value">${booking.userName || booking.pickupContact?.name || 'N/A'}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Phone:</span>
                                <span class="detail-value">${booking.mpesaNumber || booking.pickupContact?.phone || 'N/A'}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Email:</span>
                                <span class="detail-value">${booking.userEmail || booking.pickupContact?.email || 'N/A'}</span>
                            </div>
                        </div>
                        
                        <div class="section">
                            <h3 class="section-title"><i class="fas fa-box"></i> Shipment Details</h3>
                            <div class="detail-row">
                                <span class="detail-label">Tracking No:</span>
                                <span class="detail-value tracking-number">${booking.trackingNumber}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Shipment Type:</span>
                                <span class="detail-value">${booking.shipmentType?.charAt(0).toUpperCase() + booking.shipmentType?.slice(1) || 'Parcel'}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Weight:</span>
                                <span class="detail-value">${booking.weight} kg</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Description:</span>
                                <span class="detail-value">${booking.description || 'No description'}</span>
                            </div>
                        </div>
                        
                        <div class="section">
                            <h3 class="section-title"><i class="fas fa-map-marker-alt"></i> Route Details</h3>
                            <div class="detail-row">
                                <span class="detail-label">Pickup From:</span>
                                <span class="detail-value">${booking.pickupAddress?.town || ''}, ${booking.pickupAddress?.county || ''}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Pickup Date/Time:</span>
                                <span class="detail-value">${pickupDate.toLocaleDateString('en-KE')} at ${booking.pickupTime || '09:00 AM'}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Deliver To:</span>
                                <span class="detail-value">${booking.deliveryAddress?.town || ''}, ${booking.deliveryAddress?.county || ''}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Delivery Date:</span>
                                <span class="detail-value">${deliveryDate.toLocaleDateString('en-KE')}</span>
                            </div>
                        </div>
                        
                        <div class="section">
                            <h3 class="section-title"><i class="fas fa-credit-card"></i> Payment Details</h3>
                            <div class="detail-row">
                                <span class="detail-label">Payment Method:</span>
                                <span class="detail-value">M-Pesa (Safaricom)</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">M-Pesa Number:</span>
                                <span class="detail-value">${booking.mpesaNumber || 'N/A'}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Transaction Code:</span>
                                <span class="detail-value">${booking.mpesaTransactionCode || 'N/A'}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Amount Paid:</span>
                                <span class="detail-value amount">KES ${booking.amountPaid?.toLocaleString() || booking.estimatedCost?.toLocaleString() || '0'}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Payment Status:</span>
                                <span class="detail-value">
                                    <span class="status-badge">${booking.paymentStatus || 'completed'}</span>
                                </span>
                            </div>
                        </div>
                        
                        <div class="section">
                            <h3 class="section-title"><i class="fas fa-file-invoice-dollar"></i> Cost Breakdown</h3>
                            <div class="detail-row">
                                <span class="detail-label">Base Rate:</span>
                                <span class="detail-value">KES ${booking.costBreakdown?.baseRate?.toLocaleString() || '0'}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Weight Surcharge:</span>
                                <span class="detail-value">KES ${booking.costBreakdown?.weightSurcharge?.toLocaleString() || '0'}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Distance Charge:</span>
                                <span class="detail-value">KES ${booking.costBreakdown?.distanceCharge?.toLocaleString() || '0'}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Insurance:</span>
                                <span class="detail-value">KES ${booking.costBreakdown?.insuranceFee?.toLocaleString() || '0'}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Express Fee:</span>
                                <span class="detail-value">KES ${booking.costBreakdown?.expressFee?.toLocaleString() || '0'}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Special Requirements:</span>
                                <span class="detail-value">KES ${booking.costBreakdown?.specialFees?.toLocaleString() || '0'}</span>
                            </div>
                            <div class="detail-row" style="background: #006600; color: white; border-radius: 5px; padding: 12px 15px; margin-top: 10px;">
                                <span class="detail-label" style="color: white; font-size: 18px;">TOTAL AMOUNT:</span>
                                <span class="detail-value" style="color: white; font-size: 20px; font-weight: 700;">
                                    KES ${booking.amountPaid?.toLocaleString() || booking.estimatedCost?.toLocaleString() || '0'}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="receipt-footer">
                        <p><i class="fas fa-phone"></i> Customer Service: 0700 000 000</p>
                        <p><i class="fas fa-envelope"></i> Email: support@mshipo.co.ke</p>
                        <p><i class="fas fa-globe"></i> Website: www.mshipo.co.ke</p>
                        <p style="margin-top: 15px; font-size: 12px; color: #999;">
                            Thank you for choosing MSHIPO Kenya. Keep this receipt for reference.
                        </p>
                        <p style="font-size: 12px; color: #999; margin-top: 5px;">
                            Receipt ID: ${booking.bookingReference} | Printed: ${now.toLocaleString()}
                        </p>
                    </div>
                    
                    <button class="print-btn" onclick="window.print()">
                        <i class="fas fa-print"></i> Print Receipt
                    </button>
                </div>
                
                <script>
                    // Auto-print after 1 second
                    setTimeout(() => {
                        window.print();
                    }, 1000);
                </script>
            </body>
            </html>
        `);
        
        receiptWindow.document.close();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    KenyaBookingPage.init();
    
    // Add custom CSS for booking page
    const style = document.createElement('style');
    style.textContent = `
        /* Step indicators */
        .step-indicator {
            display: flex;
            justify-content: space-between;
            margin-bottom: 2rem;
            position: relative;
        }
        
        .step-indicator::before {
            content: '';
            position: absolute;
            top: 15px;
            left: 0;
            right: 0;
            height: 2px;
            background: var(--gray-200);
            z-index: 1;
        }
        
        .step {
            position: relative;
            z-index: 2;
            background: white;
            padding: 0 1rem;
        }
        
        .step-number {
            width: 30px;
            height: 30px;
            border-radius: 50%;
            background: var(--gray-200);
            color: var(--gray-600);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            margin: 0 auto 0.5rem;
        }
        
        .step.active .step-number {
            background: var(--primary);
            color: white;
        }
        
        .step-label {
            font-size: 0.875rem;
            color: var(--gray-600);
            text-align: center;
        }
        
        .step.active .step-label {
            color: var(--primary);
            font-weight: 600;
        }
        
        /* M-Pesa specific styling */
        .mpesa-steps li {
            line-height: 1.8;
        }
        
        .mpesa-steps strong {
            background: var(--gray-100);
            padding: 0.1rem 0.4rem;
            border-radius: 4px;
            font-family: monospace;
        }
        
        /* Disabled form styling */
        .form-control:disabled {
            background-color: var(--gray-100);
            cursor: not-allowed;
            opacity: 0.7;
        }
        
        .form-control:disabled::placeholder {
            color: var(--gray-500);
        }
        
        /* Animation for modal */
        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(-10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        /* Currency formatting */
        .kes-amount {
            font-family: 'Courier New', monospace;
            font-weight: bold;
            color: var(--success);
        }
        
        /* Kenya flag colors */
        .kenya-flag {
            color: #000000;
        }
        
        .kenya-flag-red {
            color: #BB0000;
        }
        
        .kenya-flag-green {
            color: #006600;
        }
        
        /* Status badges */
        .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .status-paid {
            background-color: #d4edda;
            color: #155724;
        }
        
        .status-pending_payment {
            background-color: #fff3cd;
            color: #856404;
        }
        
        /* Print receipt button */
        .print-receipt-btn {
            margin-top: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
            background: var(--success);
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: var(--radius);
            font-weight: 600;
            cursor: pointer;
            transition: background 0.3s;
        }
        
        .print-receipt-btn:hover {
            background: #006600;
        }
    `;
    document.head.appendChild(style);
    
    // Add print receipt button to modal if it doesn't exist
    setTimeout(() => {
        const modalActions = document.querySelector('.modal-actions');
        if (modalActions && !document.getElementById('printReceipt')) {
            const printReceiptBtn = document.createElement('button');
            printReceiptBtn.id = 'printReceipt';
            printReceiptBtn.className = 'btn btn-success print-receipt-btn';
            printReceiptBtn.innerHTML = '<i class="fas fa-receipt"></i> Print Receipt';
            modalActions.appendChild(printReceiptBtn);
            
            printReceiptBtn.addEventListener('click', () => {
                KenyaBookingPage.printReceipt();
            });
        }
    }, 1000);
});

// Export for use in console if needed
window.KenyaBookingPage = KenyaBookingPage;