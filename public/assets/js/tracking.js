// Tracking Page JavaScript
class TrackingPage {
    static API_URL = 'http://localhost:5000/bookings';
    static map = null;
    static marker = null;
    static route = null;

    static init() {
        this.initTrackingSearch();
        this.initExampleTrackingNumbers();
        this.initSearchOptions();
        this.initTrackingActions();
        this.initFAQ();
        this.loadRecentShipments();
        this.initMap();
    }

    static initTrackingSearch() {
        const trackBtn = document.getElementById('trackBtn');
        const trackingInput = document.getElementById('trackingNumber');
        
        if (trackBtn) {
            trackBtn.addEventListener('click', () => this.trackShipment());
        }
        
        if (trackingInput) {
            trackingInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.trackShipment();
                }
            });
            
            // Focus input on page load
            trackingInput.focus();
        }
    }

    static initExampleTrackingNumbers() {
        const exampleNumbers = document.querySelectorAll('.example-number');
        
        exampleNumbers.forEach(example => {
            example.addEventListener('click', () => {
                const number = example.getAttribute('data-number');
                document.getElementById('trackingNumber').value = number;
                this.trackShipment();
            });
        });
    }

    static initSearchOptions() {
        const optionButtons = document.querySelectorAll('.option-btn');
        
        optionButtons.forEach(button => {
            button.addEventListener('click', () => {
                const option = button.getAttribute('data-option');
                this.handleSearchOption(option);
            });
        });
    }

    static handleSearchOption(option) {
        const trackingInput = document.getElementById('trackingNumber');
        
        if (!trackingInput) return;
        
        switch(option) {
            case 'recent':
                this.showRecentShipmentsModal();
                break;
            case 'reference':
                this.showAlert('Please enter your booking reference number', 'info');
                trackingInput.placeholder = 'Enter booking reference (e.g., MZ123456)';
                trackingInput.focus();
                break;
            case 'phone':
                this.showAlert('Please enter your phone number', 'info');
                trackingInput.placeholder = 'Enter phone number (07XXXXXXXX)';
                trackingInput.focus();
                break;
        }
    }

    static async trackShipment() {
        const trackingInput = document.getElementById('trackingNumber');
        if (!trackingInput) return;
        
        const trackingNumber = trackingInput.value.trim().toUpperCase();
        
        if (!trackingNumber) {
            this.showAlert('Please enter a tracking number', 'warning');
            trackingInput.focus();
            return;
        }
        
        // Validate tracking number format (MS prefix)
        if (!this.validateTrackingNumber(trackingNumber)) {
            this.showAlert('Invalid tracking number format. Tracking numbers start with "MS" followed by numbers.', 'danger');
            return;
        }
        
        // Show loading state
        const trackBtn = document.getElementById('trackBtn');
        if (trackBtn) {
            const originalText = trackBtn.innerHTML;
            trackBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Tracking...';
            trackBtn.disabled = true;
        }
        
        try {
            // Fetch tracking data from JSON Server
            const shipmentData = await this.fetchTrackingData(trackingNumber);
            
            if (!shipmentData) {
                throw new Error('Tracking number not found');
            }
            
            // Save to recent shipments
            this.saveToRecentShipments(shipmentData);
            
            // Display results
            this.displayTrackingResults(shipmentData);
            
            // Update recent shipments list
            this.loadRecentShipments();
            
            // Scroll to results
            const trackResults = document.getElementById('trackResults');
            if (trackResults) {
                trackResults.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
            
        } catch (error) {
            console.error('Tracking error:', error);
            this.showAlert(error.message || 'Tracking number not found. Please check and try again.', 'danger');
        } finally {
            // Restore button state
            if (trackBtn) {
                trackBtn.innerHTML = '<i class="fas fa-search"></i> Track Shipment';
                trackBtn.disabled = false;
            }
        }
    }

    static validateTrackingNumber(number) {
        // Validate MS prefix format (MS followed by numbers)
        const regex = /^MS\d{8,12}$/;
        return regex.test(number);
    }

    static async fetchTrackingData(trackingNumber) {
        try {
            // Try to fetch from JSON Server API
            const response = await fetch(`${this.API_URL}?trackingNumber=${trackingNumber}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const bookings = await response.json();
            
            if (bookings.length === 0) {
                // Try booking reference search
                const refResponse = await fetch(`${this.API_URL}?bookingReference=${trackingNumber}`);
                if (refResponse.ok) {
                    const refBookings = await refResponse.json();
                    if (refBookings.length > 0) {
                        return this.convertBookingToTrackingData(refBookings[0]);
                    }
                }
                return null;
            }
            
            // Convert booking to tracking data
            return this.convertBookingToTrackingData(bookings[0]);
            
        } catch (error) {
            console.error('Error fetching tracking data:', error);
            
            // Fallback to local storage for demo
            const bookings = JSON.parse(localStorage.getItem('mizigosmart_bookings') || '[]');
            const booking = bookings.find(b => 
                b.trackingNumber === trackingNumber || 
                b.bookingReference === trackingNumber
            );
            
            if (booking) {
                return this.convertBookingToTrackingData(booking);
            }
            
            // Generate demo data for testing if nothing found
            return this.generateDemoTrackingData(trackingNumber);
        }
    }

    static convertBookingToTrackingData(booking) {
        // Determine status based on booking data
        let status = booking.status || 'pending';
        
        // Calculate timeline based on dates and status
        const timeline = this.generateTimelineFromBooking(booking, status);
        
        // Generate current location based on status
        const currentLocation = this.generateCurrentLocation(status, booking);
        
        // Calculate distance covered
        const distanceCovered = this.calculateDistanceFromBooking(booking, status);
        
        return {
            trackingNumber: booking.trackingNumber,
            bookingReference: booking.bookingReference,
            status: status,
            estimatedDelivery: booking.deliveryDate || booking.estimatedDelivery,
            timeline: timeline,
            shipmentDetails: {
                type: booking.shipmentType || 'parcel',
                weight: `${booking.weight || 0} kg`,
                dimensions: booking.dimensions ? 
                    `${booking.dimensions.length || 0} × ${booking.dimensions.width || 0} × ${booking.dimensions.height || 0} cm` : 
                    'Not specified',
                value: `KES ${(booking.declaredValue || booking.value || 0).toLocaleString()}`,
                description: booking.description || 'No description',
                specialRequirements: booking.specialRequirements ? 
                    booking.specialRequirements.map(req => req.charAt(0).toUpperCase() + req.slice(1)).join(', ') : 
                    'None'
            },
            deliveryInfo: {
                recipient: booking.deliveryContact?.name || booking.deliveryName || 'Not specified',
                address: booking.deliveryAddress ? 
                    `${booking.deliveryAddress.street || ''}, ${booking.deliveryAddress.town || ''}, ${booking.deliveryAddress.county || ''}` : 
                    'Not specified',
                contact: booking.deliveryContact?.phone || booking.deliveryPhone || 'Not specified',
                instructions: booking.deliveryInstructions || 'No special instructions'
            },
            pickupInfo: {
                name: booking.pickupContact?.name || booking.pickupName || 'Not specified',
                address: booking.pickupAddress ? 
                    `${booking.pickupAddress.street || ''}, ${booking.pickupAddress.town || ''}, ${booking.pickupAddress.county || ''}` : 
                    'Not specified',
                contact: booking.pickupContact?.phone || booking.pickupPhone || 'Not specified',
                instructions: booking.pickupInstructions || 'No special instructions'
            },
            currentLocation: currentLocation,
            distanceCovered: distanceCovered,
            pickupLocation: {
                address: booking.pickupAddress ? 
                    `${booking.pickupAddress.town || ''}, ${booking.pickupAddress.county || ''}` : 
                    'Not specified',
                coordinates: this.getCoordinatesForCounty(booking.pickupAddress?.county)
            },
            deliveryLocation: {
                address: booking.deliveryAddress ? 
                    `${booking.deliveryAddress.town || ''}, ${booking.deliveryAddress.county || ''}` : 
                    'Not specified',
                coordinates: this.getCoordinatesForCounty(booking.deliveryAddress?.county)
            },
            paymentInfo: {
                amountPaid: booking.amountPaid || booking.estimatedCost || 0,
                paymentMethod: booking.paymentMethod || 'mpesa',
                paymentStatus: booking.paymentStatus || 'pending',
                mpesaTransactionCode: booking.mpesaTransactionCode || 'Not available'
            },
            createdAt: booking.createdAt,
            updatedAt: booking.updatedAt
        };
    }

    static generateTimelineFromBooking(booking, status) {
        const timeline = [];
        const now = new Date();
        
        // Booking created
        if (booking.createdAt) {
            const bookingDate = new Date(booking.createdAt);
            timeline.push({
                time: bookingDate.toLocaleString('en-KE'),
                event: 'Shipment Booked',
                location: 'Online System',
                completed: true,
                icon: 'fas fa-calendar-check'
            });
        }
        
        // Payment processed
        if (booking.paymentStatus === 'completed' || booking.status === 'paid') {
            const paymentDate = booking.createdAt ? 
                new Date(new Date(booking.createdAt).getTime() + 30 * 60 * 1000) : // 30 mins after booking
                new Date(now.getTime() - 24 * 60 * 60 * 1000);
            
            timeline.push({
                time: paymentDate.toLocaleString('en-KE'),
                event: 'Payment Processed',
                location: 'M-Pesa',
                completed: true,
                icon: 'fas fa-credit-card'
            });
        }
        
        // Processing
        if (status !== 'pending') {
            const processingDate = booking.pickupDate ? 
                new Date(new Date(booking.pickupDate).getTime() - 12 * 60 * 60 * 1000) : 
                new Date(now.getTime() - 12 * 60 * 60 * 1000);
            
            timeline.push({
                time: processingDate.toLocaleString('en-KE'),
                event: 'Processing',
                location: 'Local Facility',
                completed: true,
                icon: 'fas fa-cogs'
            });
        }
        
        // Pickup scheduled
        if (booking.pickupDate) {
            const pickupDate = new Date(booking.pickupDate);
            timeline.push({
                time: `${pickupDate.toLocaleDateString('en-KE')} at ${booking.pickupTime || '09:00'}`,
                event: 'Pickup Scheduled',
                location: booking.pickupAddress?.town || 'Pickup Location',
                completed: status === 'in-transit' || status === 'out-for-delivery' || status === 'delivered',
                current: status === 'processing',
                icon: 'fas fa-truck-pickup'
            });
        }
        
        // In transit
        if (status === 'in-transit' || status === 'out-for-delivery' || status === 'delivered') {
            const transitDate = booking.pickupDate ? 
                new Date(new Date(booking.pickupDate).getTime() + 2 * 60 * 60 * 1000) : // 2 hours after pickup
                new Date(now.getTime() - 6 * 60 * 60 * 1000);
            
            timeline.push({
                time: transitDate.toLocaleString('en-KE'),
                event: 'In Transit',
                location: 'Regional Hub',
                completed: status === 'out-for-delivery' || status === 'delivered',
                current: status === 'in-transit',
                icon: 'fas fa-truck-moving'
            });
        }
        
        // Out for delivery
        if (status === 'out-for-delivery' || status === 'delivered') {
            const deliveryDate = booking.deliveryDate ? 
                new Date(new Date(booking.deliveryDate).getTime() - 2 * 60 * 60 * 1000) : 
                new Date(now.getTime() - 2 * 60 * 60 * 1000);
            
            timeline.push({
                time: deliveryDate.toLocaleString('en-KE'),
                event: 'Out for Delivery',
                location: 'Local Facility',
                completed: status === 'delivered',
                current: status === 'out-for-delivery',
                icon: 'fas fa-shipping-fast'
            });
        }
        
        // Delivered
        if (status === 'delivered') {
            const deliveredDate = booking.deliveryDate ? 
                new Date(booking.deliveryDate) : 
                new Date(now.getTime() - 1 * 60 * 60 * 1000);
            
            timeline.push({
                time: deliveredDate.toLocaleString('en-KE'),
                event: 'Delivered',
                location: booking.deliveryAddress?.town || 'Delivery Address',
                completed: true,
                icon: 'fas fa-check-circle'
            });
        }
        
        return timeline;
    }

    static generateCurrentLocation(status, booking) {
        switch(status) {
            case 'pending':
            case 'pending_payment':
                return `Awaiting payment confirmation at ${booking.pickupAddress?.town || 'pickup location'}`;
            case 'processing':
            case 'paid':
                return `Processing at ${booking.pickupAddress?.county || 'local'} facility`;
            case 'in-transit':
                return `In transit from ${booking.pickupAddress?.county || 'pickup'} to ${booking.deliveryAddress?.county || 'delivery'}`;
            case 'out-for-delivery':
                return `On delivery vehicle near ${booking.deliveryAddress?.town || 'delivery area'}`;
            case 'delivered':
                return `Successfully delivered to ${booking.deliveryAddress?.town || 'destination'}`;
            default:
                return 'Location information updating...';
        }
    }

    static calculateDistanceFromBooking(booking, status) {
        // Get counties and calculate approximate distance
        const pickupCounty = booking.pickupAddress?.county;
        const deliveryCounty = booking.deliveryAddress?.county;
        
        // Default distances (in km)
        const distances = {
            'pending': '0 km',
            'pending_payment': '0 km',
            'processing': '5 km',
            'paid': '5 km',
            'in-transit': '250 km', // Half way
            'out-for-delivery': '10 km',
            'delivered': '500 km' // Full distance
        };
        
        return distances[status] || '0 km';
    }

    static getCoordinatesForCounty(countyName) {
        // County coordinates in Kenya (approximate)
        const countyCoordinates = {
            'Nairobi': [-1.2921, 36.8219],
            'Mombasa': [-4.0435, 39.6682],
            'Kisumu': [-0.1022, 34.7617],
            'Nakuru': [-0.3031, 36.0800],
            'Eldoret': [0.5143, 35.2698],
            'Thika': [-1.0395, 37.0891],
            'Malindi': [-3.2176, 40.1168],
            'Kitale': [1.0157, 34.9899],
            'Kakamega': [0.2827, 34.7519],
            'Kisii': [-0.6773, 34.7796],
            'Nyeri': [-0.4201, 36.9476],
            'Meru': [0.0515, 37.6456],
            'Embu': [-0.5390, 37.4574],
            'Machakos': [-1.5177, 37.2634],
            'Kiambu': [-1.1714, 36.8355],
            'Muranga': [-0.7845, 37.0407],
            'Nyandarua': [-0.3573, 36.4631],
            'Nandi': [0.2067, 35.1260],
            'Bungoma': [0.5695, 34.5584],
            'Busia': [0.4608, 34.1115],
            'Siaya': [0.0616, 34.2879],
            'Homa Bay': [-0.5313, 34.4570],
            'Migori': [-1.0634, 34.4731],
            'Vihiga': [0.0765, 34.7198],
            'Bomet': [-0.7810, 35.3416],
            'Kericho': [-0.3671, 35.2831],
            'Kilifi': [-3.6362, 39.8496],
            'Kwale': [-4.1816, 39.4606],
            'Lamu': [-2.2696, 40.9006],
            'Taita Taveta': [-3.3959, 38.3570],
            'Garissa': [-0.4532, 39.6461],
            'Wajir': [1.7472, 40.0573],
            'Mandera': [3.9366, 41.8771],
            'Marsabit': [2.3348, 37.9909],
            'Isiolo': [0.3547, 37.5820],
            'Tharaka Nithi': [-0.2962, 37.6520],
            'Kitui': [-1.3670, 38.0102],
            'Makueni': [-1.8039, 37.6210],
            'Kirinyaga': [-0.4992, 37.2787],
            'Turkana': [3.3122, 35.5658],
            'West Pokot': [1.2384, 35.1119],
            'Samburu': [1.2155, 36.9541],
            'Trans Nzoia': [1.0567, 34.9503],
            'Uasin Gishu': [0.5143, 35.2698],
            'Elgeyo Marakwet': [0.5190, 35.5720],
            'Baringo': [0.4667, 35.9667],
            'Laikipia': [0.2046, 36.8308],
            'Narok': [-1.0919, 35.8741],
            'Kajiado': [-1.8524, 36.7768],
            'Nyamira': [-0.5667, 34.9500]
        };
        
        return countyCoordinates[countyName] || [-1.2921, 36.8219]; // Default to Nairobi
    }

    static generateDemoTrackingData(trackingNumber) {
        const statuses = ['pending', 'processing', 'in-transit', 'out-for-delivery', 'delivered'];
        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
        
        const now = new Date();
        const pickupDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
        const deliveryDate = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000); // 2 days from now
        
        const timeline = this.generateTimelineFromBooking({
            createdAt: pickupDate.toISOString(),
            pickupDate: pickupDate.toISOString(),
            deliveryDate: deliveryDate.toISOString(),
            pickupAddress: { county: 'Nairobi', town: 'Nairobi CBD' },
            deliveryAddress: { county: 'Mombasa', town: 'Mombasa Island' }
        }, randomStatus);
        
        const currentLocation = this.generateCurrentLocation(randomStatus, {
            pickupAddress: { county: 'Nairobi', town: 'Nairobi' },
            deliveryAddress: { county: 'Mombasa', town: 'Mombasa' }
        });
        
        const distanceCovered = this.calculateDistanceFromBooking({}, randomStatus);
        
        return {
            trackingNumber: trackingNumber,
            status: randomStatus,
            estimatedDelivery: deliveryDate.toISOString().split('T')[0],
            timeline: timeline,
            shipmentDetails: {
                type: 'Parcel',
                weight: '5.5 kg',
                dimensions: '30 × 25 × 15 cm',
                value: 'KES 15,000',
                description: 'Electronics / Documents',
                specialRequirements: 'Fragile'
            },
            deliveryInfo: {
                recipient: 'John Kamau',
                address: 'Mombasa Road, Mombasa Island',
                contact: '0712345678',
                instructions: 'Leave with security'
            },
            pickupInfo: {
                name: 'Jane Muthoni',
                address: 'Westlands, Nairobi',
                contact: '0723456789',
                instructions: 'Call before pickup'
            },
            currentLocation: currentLocation,
            distanceCovered: distanceCovered,
            pickupLocation: {
                address: 'Nairobi, Kenya',
                coordinates: [-1.2921, 36.8219]
            },
            deliveryLocation: {
                address: 'Mombasa, Kenya',
                coordinates: [-4.0435, 39.6682]
            },
            paymentInfo: {
                amountPaid: 2500,
                paymentMethod: 'mpesa',
                paymentStatus: 'completed',
                mpesaTransactionCode: 'ABC123XYZ'
            }
        };
    }

    static saveToRecentShipments(shipmentData) {
        let recentShipments = JSON.parse(localStorage.getItem('mizigosmart_recent_shipments') || '[]');
        
        // Remove if already exists
        recentShipments = recentShipments.filter(s => s.trackingNumber !== shipmentData.trackingNumber);
        
        // Add to beginning
        recentShipments.unshift({
            trackingNumber: shipmentData.trackingNumber,
            status: shipmentData.status,
            estimatedDelivery: shipmentData.estimatedDelivery,
            lastTracked: new Date().toISOString(),
            deliveryInfo: shipmentData.deliveryInfo,
            pickupInfo: shipmentData.pickupInfo,
            shipmentDetails: shipmentData.shipmentDetails
        });
        
        // Keep only last 10
        recentShipments = recentShipments.slice(0, 10);
        
        localStorage.setItem('mizigosmart_recent_shipments', JSON.stringify(recentShipments));
    }

    static loadRecentShipments() {
        const container = document.getElementById('recentShipmentsContainer');
        if (!container) return;
        
        const recentShipments = JSON.parse(localStorage.getItem('mizigosmart_recent_shipments') || '[]');
        
        if (recentShipments.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <h3>No Recent Shipments</h3>
                    <p>Track a shipment to see it here</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        
        recentShipments.forEach(shipment => {
            const statusText = shipment.status.replace(/_/g, ' ');
            const formattedDate = new Date(shipment.estimatedDelivery).toLocaleDateString('en-KE', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
            });
            
            html += `
                <div class="shipment-card" data-tracking="${shipment.trackingNumber}">
                    <div class="shipment-header">
                        <div class="shipment-number">${shipment.trackingNumber}</div>
                        <span class="shipment-status status-badge ${shipment.status}">
                            ${statusText}
                        </span>
                    </div>
                    <div class="shipment-details-row">
                        <div class="shipment-item">
                            <span class="shipment-label">From</span>
                            <span class="shipment-value">${shipment.pickupInfo?.town || shipment.pickupInfo?.county || 'N/A'}</span>
                        </div>
                        <div class="shipment-item">
                            <span class="shipment-label">To</span>
                            <span class="shipment-value">${shipment.deliveryInfo?.town || shipment.deliveryInfo?.county || 'N/A'}</span>
                        </div>
                        <div class="shipment-item">
                            <span class="shipment-label">Delivery</span>
                            <span class="shipment-value">${formattedDate}</span>
                        </div>
                    </div>
                    <div class="shipment-actions">
                        <button class="btn btn-sm btn-outline track-again-btn" data-tracking="${shipment.trackingNumber}">
                            <i class="fas fa-search"></i> Track Again
                        </button>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        
        // Add event listeners to track again buttons
        document.querySelectorAll('.track-again-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const trackingNumber = btn.getAttribute('data-tracking');
                document.getElementById('trackingNumber').value = trackingNumber;
                this.trackShipment();
            });
        });
        
        // Add event listeners to shipment cards
        document.querySelectorAll('.shipment-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.track-again-btn')) {
                    const trackingNumber = card.getAttribute('data-tracking');
                    document.getElementById('trackingNumber').value = trackingNumber;
                    this.trackShipment();
                }
            });
        });
    }

    static displayTrackingResults(shipmentData) {
        // Show results section
        const resultsSection = document.getElementById('trackResults');
        if (resultsSection) {
            resultsSection.style.display = 'block';
        }
        
        // Update tracking header
        const displayTracking = document.getElementById('displayTrackingNumber');
        if (displayTracking) {
            displayTracking.textContent = shipmentData.trackingNumber;
        }
        
        const shipmentStatus = document.getElementById('shipmentStatus');
        if (shipmentStatus) {
            const statusText = shipmentData.status.replace(/_/g, ' ');
            shipmentStatus.textContent = statusText;
            shipmentStatus.className = `status-badge ${shipmentData.status}`;
        }
        
        // Format estimated delivery date
        const estimatedDelivery = document.getElementById('estimatedDelivery');
        if (estimatedDelivery && shipmentData.estimatedDelivery) {
            const deliveryDate = new Date(shipmentData.estimatedDelivery);
            const formattedDate = deliveryDate.toLocaleDateString('en-KE', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            estimatedDelivery.textContent = formattedDate;
        }
        
        // Update timeline
        this.updateTimeline(shipmentData.timeline);
        
        // Update shipment details
        this.updateShipmentDetails(shipmentData);
        
        // Update delivery information
        const deliveryRecipient = document.getElementById('deliveryRecipient');
        const deliveryAddress = document.getElementById('deliveryAddress');
        const deliveryContact = document.getElementById('deliveryContact');
        const deliveryInstructions = document.getElementById('deliveryInstructions');
        
        if (deliveryRecipient) deliveryRecipient.textContent = shipmentData.deliveryInfo.recipient;
        if (deliveryAddress) deliveryAddress.textContent = shipmentData.deliveryInfo.address;
        if (deliveryContact) deliveryContact.textContent = shipmentData.deliveryInfo.contact;
        if (deliveryInstructions) deliveryInstructions.textContent = shipmentData.deliveryInfo.instructions;
        
        // Update pickup information
        const pickupName = document.getElementById('pickupName');
        const pickupAddress = document.getElementById('pickupAddress');
        const pickupContact = document.getElementById('pickupContact');
        const pickupInstructions = document.getElementById('pickupInstructions');
        const pickupDateTime = document.getElementById('pickupDateTime');
        
        if (pickupName) pickupName.textContent = shipmentData.pickupInfo.name;
        if (pickupAddress) pickupAddress.textContent = shipmentData.pickupInfo.address;
        if (pickupContact) pickupContact.textContent = shipmentData.pickupInfo.contact;
        if (pickupInstructions) pickupInstructions.textContent = shipmentData.pickupInfo.instructions;
        
        // Update pickup date and time
        if (pickupDateTime && shipmentData.timeline) {
            const pickupEvent = shipmentData.timeline.find(event => event.event === 'Pickup Scheduled');
            if (pickupEvent) {
                pickupDateTime.textContent = pickupEvent.time;
            }
        }
        
        // Update payment information
        const paymentAmount = document.getElementById('paymentAmount');
        const paymentMethod = document.getElementById('paymentMethod');
        const paymentStatus = document.getElementById('paymentStatus');
        const mpesaCode = document.getElementById('mpesaCode');
        
        if (paymentAmount) paymentAmount.textContent = `KES ${shipmentData.paymentInfo.amountPaid.toLocaleString()}`;
        if (paymentMethod) paymentMethod.textContent = shipmentData.paymentInfo.paymentMethod.toUpperCase();
        if (paymentStatus) {
            paymentStatus.textContent = shipmentData.paymentInfo.paymentStatus;
            paymentStatus.className = `status-badge ${shipmentData.paymentInfo.paymentStatus}`;
        }
        if (mpesaCode) mpesaCode.textContent = shipmentData.paymentInfo.mpesaTransactionCode;
        
        // Update map info
        const currentLocation = document.getElementById('currentLocation');
        const distanceCovered = document.getElementById('distanceCovered');
        
        if (currentLocation) currentLocation.textContent = shipmentData.currentLocation;
        if (distanceCovered) distanceCovered.textContent = shipmentData.distanceCovered;
        
        // Update map
        this.updateMap(shipmentData);
    }

    static updateTimeline(timeline) {
        const container = document.getElementById('timelineContainer');
        if (!container) return;
        
        let html = '';
        
        timeline.forEach((item, index) => {
            const isLast = index === timeline.length - 1;
            let itemClass = 'timeline-item';
            if (item.completed) itemClass += ' completed';
            if (item.current) itemClass += ' current';
            
            const icon = item.icon || 'fas fa-circle';
            
            html += `
                <div class="${itemClass}">
                    <div class="timeline-icon">
                        <i class="${icon}"></i>
                    </div>
                    <div class="timeline-content">
                        <div class="timeline-time">${item.time}</div>
                        <div class="timeline-event">${item.event}</div>
                        <div class="timeline-location">
                            <i class="fas fa-map-marker-alt"></i>
                            ${item.location}
                        </div>
                    </div>
                    ${!isLast ? '<div class="timeline-connector"></div>' : ''}
                </div>
            `;
        });
        
        container.innerHTML = html;
    }

    static updateShipmentDetails(shipmentData) {
        const container = document.getElementById('shipmentDetails');
        if (!container) return;
        
        const details = shipmentData.shipmentDetails;
        
        const html = `
            <div class="detail-item">
                <span class="detail-label">Shipment Type</span>
                <span class="detail-value">${details.type}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Weight</span>
                <span class="detail-value">${details.weight}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Dimensions</span>
                <span class="detail-value">${details.dimensions}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Declared Value</span>
                <span class="detail-value">${details.value}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Description</span>
                <span class="detail-value">${details.description}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Special Requirements</span>
                <span class="detail-value">${details.specialRequirements}</span>
            </div>
        `;
        
        container.innerHTML = html;
    }

    static initMap() {
        // Initialize map with placeholder
        const mapContainer = document.getElementById('mapContainer');
        if (!mapContainer) return;
        
        // Create placeholder if Leaflet fails
        if (typeof L === 'undefined') {
            mapContainer.innerHTML = `
                <div class="map-placeholder">
                    <i class="fas fa-map-marked-alt"></i>
                    <p>Interactive map unavailable. Please check your connection.</p>
                </div>
            `;
            return;
        }
        
        // Set up initial map view (center of Kenya)
        this.map = L.map('mapContainer').setView([-1.2921, 36.8219], 6);
        
        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18
        }).addTo(this.map);
        
        // Add scale control
        L.control.scale().addTo(this.map);
    }

    static updateMap(shipmentData) {
        if (!this.map) return;
        
        // Clear existing markers and route
        if (this.marker) {
            this.map.removeLayer(this.marker);
        }
        if (this.route) {
            this.map.removeLayer(this.route);
        }
        
        // Get coordinates for pickup and delivery
        const pickupCoords = shipmentData.pickupLocation?.coordinates || this.getCoordinatesForCounty('Nairobi');
        const deliveryCoords = shipmentData.deliveryLocation?.coordinates || this.getCoordinatesForCounty('Mombasa');
        
        // Add pickup marker
        const pickupMarker = L.marker(pickupCoords, {
            icon: L.divIcon({
                className: 'pickup-marker',
                html: '<i class="fas fa-map-pin" style="color: #006600;"></i>',
                iconSize: [30, 30],
                iconAnchor: [15, 30]
            })
        }).addTo(this.map)
          .bindPopup(`
              <strong>Pickup Location</strong><br>
              ${shipmentData.pickupInfo?.address || 'N/A'}<br>
              <small>${shipmentData.pickupInfo?.name || ''}</small>
          `);
        
        // Add delivery marker
        const deliveryMarker = L.marker(deliveryCoords, {
            icon: L.divIcon({
                className: 'delivery-marker',
                html: '<i class="fas fa-flag-checkered" style="color: #BB0000;"></i>',
                iconSize: [30, 30],
                iconAnchor: [15, 30]
            })
        }).addTo(this.map)
          .bindPopup(`
              <strong>Delivery Location</strong><br>
              ${shipmentData.deliveryInfo?.address || 'N/A'}<br>
              <small>${shipmentData.deliveryInfo?.recipient || ''}</small>
          `);
        
        // Add current location marker based on status
        let currentCoords;
        switch(shipmentData.status) {
            case 'pending':
            case 'pending_payment':
            case 'processing':
            case 'paid':
                currentCoords = pickupCoords;
                break;
            case 'in-transit':
                // Calculate point along the route based on progress
                const progress = 0.6; // 60% along the route
                currentCoords = [
                    pickupCoords[0] + (deliveryCoords[0] - pickupCoords[0]) * progress,
                    pickupCoords[1] + (deliveryCoords[1] - pickupCoords[1]) * progress
                ];
                break;
            case 'out-for-delivery':
                // Near delivery location
                currentCoords = [
                    deliveryCoords[0] + 0.05,
                    deliveryCoords[1] + 0.05
                ];
                break;
            case 'delivered':
                currentCoords = deliveryCoords;
                break;
            default:
                currentCoords = pickupCoords;
        }
        
        // Add current location marker
        this.marker = L.marker(currentCoords, {
            icon: L.divIcon({
                className: 'current-location-marker',
                html: '<i class="fas fa-truck" style="color: #2563eb;"></i>',
                iconSize: [40, 40],
                iconAnchor: [20, 40]
            })
        }).addTo(this.map)
          .bindPopup(`
              <strong>Current Location</strong><br>
              ${shipmentData.currentLocation}<br>
              <small>Distance covered: ${shipmentData.distanceCovered}</small>
          `);
        
        // Add route line (from pickup to current location)
        this.route = L.polyline([pickupCoords, currentCoords, deliveryCoords], {
            color: '#006600',
            weight: 3,
            opacity: 0.7,
            dashArray: '10, 5'
        }).addTo(this.map);
        
        // Fit map to show all markers
        const bounds = L.latLngBounds([pickupCoords, currentCoords, deliveryCoords]);
        this.map.fitBounds(bounds, { padding: [50, 50] });
        
        // Add custom CSS for markers
        const style = document.createElement('style');
        style.textContent = `
            .pickup-marker, .delivery-marker, .current-location-marker {
                background: none;
                border: none;
            }
            .pickup-marker i, .delivery-marker i, .current-location-marker i {
                font-size: 24px;
                text-shadow: 0 2px 4px rgba(0,0,0,0.3);
            }
            .current-location-marker i {
                animation: pulse 2s infinite;
            }
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); }
            }
        `;
        document.head.appendChild(style);
    }

    static initTrackingActions() {
        // Print tracking
        const printTracking = document.getElementById('printTracking');
        if (printTracking) {
            printTracking.addEventListener('click', () => {
                this.printTrackingDetails();
            });
        }
        
        // Share tracking
        const shareTracking = document.getElementById('shareTracking');
        if (shareTracking) {
            shareTracking.addEventListener('click', () => {
                this.shareTrackingDetails();
            });
        }
        
        // Track another
        const newTracking = document.getElementById('newTracking');
        if (newTracking) {
            newTracking.addEventListener('click', () => {
                const trackResults = document.getElementById('trackResults');
                if (trackResults) {
                    trackResults.style.display = 'none';
                }
                
                const trackingInput = document.getElementById('trackingNumber');
                if (trackingInput) {
                    trackingInput.value = '';
                    trackingInput.focus();
                }
                
                // Scroll to search section
                const searchSection = document.querySelector('.track-search-section');
                if (searchSection) {
                    searchSection.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        }
        
        // Quick actions
        const quickActions = ['updateDelivery', 'requestHold', 'contactDriver', 'reportIssue'];
        quickActions.forEach(actionId => {
            const element = document.getElementById(actionId);
            if (element) {
                element.addEventListener('click', () => {
                    this.showAlert(`${actionId.replace(/([A-Z])/g, ' $1')} feature coming soon!`, 'info');
                });
            }
        });
    }

    static printTrackingDetails() {
        const trackingNumber = document.getElementById('displayTrackingNumber')?.textContent || 'N/A';
        const status = document.getElementById('shipmentStatus')?.textContent || 'N/A';
        const deliveryDate = document.getElementById('estimatedDelivery')?.textContent || 'N/A';
        const currentLocation = document.getElementById('currentLocation')?.textContent || 'N/A';
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Tracking Details - ${trackingNumber}</title>
                    <style>
                        body { 
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                            padding: 20px; 
                            background: #f5f5f5;
                        }
                        .receipt-container {
                            max-width: 600px;
                            margin: 0 auto;
                            background: white;
                            border-radius: 10px;
                            padding: 30px;
                            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                        }
                        .header {
                            text-align: center;
                            margin-bottom: 30px;
                            padding-bottom: 20px;
                            border-bottom: 2px solid #006600;
                        }
                        .header h1 {
                            color: #006600;
                            margin: 0 0 10px 0;
                        }
                        .header h2 {
                            color: #666;
                            margin: 0;
                            font-weight: normal;
                        }
                        .info-section {
                            margin: 20px 0;
                            padding: 15px;
                            background: #f9f9f9;
                            border-radius: 5px;
                        }
                        .info-item {
                            display: flex;
                            justify-content: space-between;
                            margin: 10px 0;
                            padding: 8px 0;
                            border-bottom: 1px dashed #ddd;
                        }
                        .info-item:last-child {
                            border-bottom: none;
                        }
                        .label {
                            font-weight: 600;
                            color: #333;
                        }
                        .value {
                            color: #006600;
                            font-weight: 500;
                        }
                        .status {
                            display: inline-block;
                            padding: 5px 15px;
                            border-radius: 20px;
                            background: #006600;
                            color: white;
                            font-weight: bold;
                            text-transform: uppercase;
                        }
                        .footer {
                            text-align: center;
                            margin-top: 30px;
                            padding-top: 20px;
                            border-top: 1px solid #ddd;
                            color: #666;
                            font-size: 12px;
                        }
                        @media print {
                            body { background: white; }
                            .receipt-container { box-shadow: none; }
                        }
                    </style>
                </head>
                <body>
                    <div class="receipt-container">
                        <div class="header">
                            <h1>MZIGOSMART KENYA</h1>
                            <h2>Shipment Tracking Receipt</h2>
                        </div>
                        
                        <div class="info-section">
                            <div class="info-item">
                                <span class="label">Tracking Number:</span>
                                <span class="value">${trackingNumber}</span>
                            </div>
                            <div class="info-item">
                                <span class="label">Status:</span>
                                <span class="status">${status}</span>
                            </div>
                            <div class="info-item">
                                <span class="label">Estimated Delivery:</span>
                                <span class="value">${deliveryDate}</span>
                            </div>
                            <div class="info-item">
                                <span class="label">Current Location:</span>
                                <span class="value">${currentLocation}</span>
                            </div>
                        </div>
                        
                        <div class="footer">
                            <p>Printed on ${new Date().toLocaleString('en-KE')}</p>
                            <p>Customer Service: 0700 000 000 | Email: support@mshipo.co.ke</p>
                            <p>Thank you for choosing MSHIPO Kenya!</p>
                        </div>
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    }

    static shareTrackingDetails() {
        const trackingNumber = document.getElementById('displayTrackingNumber')?.textContent || '';
        const shareUrl = `${window.location.origin}${window.location.pathname}?tracking=${trackingNumber}`;
        
        if (navigator.share) {
            navigator.share({
                title: `Track Shipment ${trackingNumber}`,
                text: `Track your MZIGOSMART Kenya shipment: ${trackingNumber}`,
                url: shareUrl
            });
        } else {
            // Fallback to clipboard
            navigator.clipboard.writeText(shareUrl).then(() => {
                this.showAlert('Tracking link copied to clipboard!', 'success');
            }).catch(() => {
                prompt('Copy this link to share:', shareUrl);
            });
        }
    }

    static initFAQ() {
        const faqItems = document.querySelectorAll('.faq-item');
        
        faqItems.forEach(item => {
            const question = item.querySelector('.faq-question');
            
            if (question) {
                question.addEventListener('click', () => {
                    // Close other items
                    faqItems.forEach(otherItem => {
                        if (otherItem !== item) {
                            otherItem.classList.remove('active');
                        }
                    });
                    
                    // Toggle current item
                    item.classList.toggle('active');
                });
            }
        });
    }

    static showRecentShipmentsModal() {
        const recentShipments = JSON.parse(localStorage.getItem('mizigosmart_recent_shipments') || '[]');
        
        if (recentShipments.length === 0) {
            this.showAlert('No recent shipments found', 'info');
            return;
        }
        
        let modalHtml = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Recent Shipments</h3>
                    <button class="modal-close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="recent-list">
        `;
        
        recentShipments.forEach(shipment => {
            const statusText = shipment.status.replace(/_/g, ' ');
            const formattedDate = new Date(shipment.lastTracked).toLocaleDateString('en-KE', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            modalHtml += `
                <div class="recent-item" data-tracking="${shipment.trackingNumber}">
                    <div class="recent-header">
                        <span class="recent-number">${shipment.trackingNumber}</span>
                        <span class="recent-status status-badge ${shipment.status}">${statusText}</span>
                    </div>
                    <div class="recent-details">
                        <span>${shipment.deliveryInfo.recipient}</span>
                        <span>•</span>
                        <span>Last tracked: ${formattedDate}</span>
                    </div>
                    <button class="btn btn-sm btn-outline recent-track-btn" data-tracking="${shipment.trackingNumber}">
                        <i class="fas fa-search"></i> Track
                    </button>
                </div>
            `;
        });
        
        modalHtml += `
                    </div>
                </div>
            </div>
        `;
        
        const modal = document.createElement('div');
        modal.className = 'recent-modal';
        modal.innerHTML = modalHtml;
        document.body.appendChild(modal);
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .recent-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                z-index: 2000;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 1rem;
                animation: fadeIn 0.3s ease;
            }
            
            .recent-modal .modal-content {
                background: white;
                border-radius: 10px;
                max-width: 500px;
                width: 100%;
                max-height: 80vh;
                overflow-y: auto;
                animation: slideUp 0.4s ease;
            }
            
            .modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 1.5rem;
                border-bottom: 1px solid #e0e0e0;
            }
            
            .modal-header h3 {
                margin: 0;
                color: #333;
            }
            
            .modal-close {
                background: none;
                border: none;
                font-size: 1.25rem;
                color: #666;
                cursor: pointer;
                padding: 0.5rem;
            }
            
            .modal-close:hover {
                color: #333;
            }
            
            .modal-body {
                padding: 1.5rem;
            }
            
            .recent-list {
                display: flex;
                flex-direction: column;
                gap: 1rem;
            }
            
            .recent-item {
                background: #f9f9f9;
                padding: 1rem;
                border-radius: 8px;
                border: 1px solid #e0e0e0;
                position: relative;
            }
            
            .recent-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 0.5rem;
            }
            
            .recent-number {
                font-family: monospace;
                font-weight: 600;
                color: #333;
            }
            
            .recent-details {
                display: flex;
                gap: 0.5rem;
                align-items: center;
                margin-bottom: 0.75rem;
                font-size: 0.875rem;
                color: #666;
                flex-wrap: wrap;
            }
            
            .recent-track-btn {
                position: absolute;
                bottom: 1rem;
                right: 1rem;
            }
        `;
        document.head.appendChild(style);
        
        // Close modal
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
            style.remove();
        });
        
        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                style.remove();
            }
        });
        
        // Track buttons
        modal.querySelectorAll('.recent-track-btn, .recent-item').forEach(element => {
            element.addEventListener('click', (e) => {
                if (e.target.closest('.recent-track-btn')) {
                    e.stopPropagation();
                }
                const trackingNumber = element.getAttribute('data-tracking');
                document.getElementById('trackingNumber').value = trackingNumber;
                modal.remove();
                style.remove();
                this.trackShipment();
            });
        });
    }

    static showAlert(message, type = 'info') {
        // Simple alert function
        alert(`${type.toUpperCase()}: ${message}`);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    TrackingPage.init();
    
    // Check for tracking number in URL
    const urlParams = new URLSearchParams(window.location.search);
    const trackingParam = urlParams.get('tracking');
    
    if (trackingParam) {
        document.getElementById('trackingNumber').value = trackingParam;
        TrackingPage.trackShipment();
    }
});

// Add CSS for tracking page
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
        
        .status-badge.pending,
        .status-badge.pending_payment {
            background-color: #fef3c7;
            color: #92400e;
            border: 1px solid #fbbf24;
        }
        
        .status-badge.processing,
        .status-badge.paid {
            background-color: #dbeafe;
            color: #1e40af;
            border: 1px solid #60a5fa;
        }
        
        .status-badge.in-transit {
            background-color: #f0f9ff;
            color: #0369a1;
            border: 1px solid #7dd3fc;
        }
        
        .status-badge.out-for-delivery {
            background-color: #f0fdf4;
            color: #166534;
            border: 1px solid #86efac;
        }
        
        .status-badge.delivered {
            background-color: #dcfce7;
            color: #166534;
            border: 1px solid #22c55e;
        }
        
        .status-badge.completed {
            background-color: #dcfce7;
            color: #166534;
            border: 1px solid #22c55e;
        }
        
        /* Timeline styling */
        .timeline-item {
            display: flex;
            margin-bottom: 20px;
            position: relative;
        }
        
        .timeline-item.completed .timeline-icon {
            background-color: #22c55e;
            color: white;
        }
        
        .timeline-item.current .timeline-icon {
            background-color: #3b82f6;
            color: white;
            animation: pulse 2s infinite;
        }
        
        .timeline-icon {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: #e5e7eb;
            color: #6b7280;
            margin-right: 15px;
            flex-shrink: 0;
            z-index: 2;
        }
        
        .timeline-content {
            flex: 1;
        }
        
        .timeline-time {
            font-size: 12px;
            color: #6b7280;
            margin-bottom: 4px;
        }
        
        .timeline-event {
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 4px;
        }
        
        .timeline-location {
            font-size: 14px;
            color: #4b5563;
        }
        
        .timeline-location i {
            margin-right: 5px;
            color: #9ca3af;
        }
        
        .timeline-connector {
            position: absolute;
            left: 20px;
            top: 40px;
            bottom: -20px;
            width: 2px;
            background-color: #e5e7eb;
            z-index: 1;
        }
        
        .timeline-item:last-child .timeline-connector {
            display: none;
        }
        
        /* Shipment card styling */
        .shipment-card {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
            transition: all 0.3s ease;
            cursor: pointer;
        }
        
        .shipment-card:hover {
            border-color: #3b82f6;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            transform: translateY(-2px);
        }
        
        .shipment-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        
        .shipment-number {
            font-family: 'Courier New', monospace;
            font-weight: 600;
            color: #1f2937;
        }
        
        .shipment-details-row {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 10px;
            margin-bottom: 15px;
        }
        
        .shipment-item {
            display: flex;
            flex-direction: column;
        }
        
        .shipment-label {
            font-size: 12px;
            color: #6b7280;
            margin-bottom: 2px;
        }
        
        .shipment-value {
            font-weight: 500;
            color: #1f2937;
        }
        
        .shipment-actions {
            display: flex;
            justify-content: flex-end;
        }
        
        /* Empty state */
        .empty-state {
            text-align: center;
            padding: 40px 20px;
            color: #6b7280;
        }
        
        .empty-state i {
            font-size: 48px;
            color: #d1d5db;
            margin-bottom: 15px;
        }
        
        .empty-state h3 {
            margin: 0 0 10px 0;
            color: #4b5563;
        }
        
        .empty-state p {
            margin: 0;
        }
        
        /* Detail items */
        .detail-item {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #e5e7eb;
        }
        
        .detail-item:last-child {
            border-bottom: none;
        }
        
        .detail-label {
            font-weight: 500;
            color: #4b5563;
        }
        
        .detail-value {
            color: #1f2937;
            text-align: right;
        }
        
        /* Map placeholder */
        .map-placeholder {
            width: 100%;
            height: 300px;
            background: #f3f4f6;
            border-radius: 8px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: #6b7280;
        }
        
        .map-placeholder i {
            font-size: 48px;
            margin-bottom: 15px;
            color: #9ca3af;
        }
        
        /* Animation */
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
        
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }
        
        /* Responsive */
        @media (max-width: 768px) {
            .shipment-details-row {
                grid-template-columns: 1fr;
            }
            
            .timeline-item {
                flex-direction: column;
            }
            
            .timeline-icon {
                margin-right: 0;
                margin-bottom: 10px;
            }
            
            .timeline-connector {
                left: 20px;
                top: 40px;
                bottom: -40px;
            }
        }
    `;
    document.head.appendChild(style);
});

// Export for use in console
window.TrackingPage = TrackingPage;