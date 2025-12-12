// Contact Page JavaScript
class ContactPage {
    static init() {
        this.initFormValidation();
        this.initFileUpload();
        this.initLiveChat();
        this.initFormSubmission();
        this.initContactMethodIcons();
        this.initQuickLinks();
    }

    static initFormValidation() {
        const form = document.getElementById('contactForm');
        
        // Required fields
        const requiredFields = [
            'contactFirstName',
            'contactLastName',
            'contactEmail',
            'inquiryType',
            'contactSubject',
            'contactMessage'
        ];
        
        requiredFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('blur', () => this.validateField(fieldId));
                field.addEventListener('input', () => this.clearError(fieldId));
            }
        });
        
        // Email validation
        const emailField = document.getElementById('contactEmail');
        if (emailField) {
            emailField.addEventListener('blur', () => this.validateEmail());
        }
        
        // Phone validation (optional)
        const phoneField = document.getElementById('contactPhone');
        if (phoneField) {
            phoneField.addEventListener('blur', () => this.validatePhone());
        }
    }

    static validateField(fieldId) {
        const field = document.getElementById(fieldId);
        const value = field.value.trim();
        const errorElement = document.getElementById(`${fieldId}Error`);
        
        if (!value) {
            this.showError(fieldId, 'This field is required');
            return false;
        }
        
        // Special validation for message length
        if (fieldId === 'contactMessage' && value.length > 2000) {
            this.showError(fieldId, 'Message must be less than 2000 characters');
            return false;
        }
        
        this.clearError(fieldId);
        return true;
    }

    static validateEmail() {
        const email = document.getElementById('contactEmail').value.trim();
        const errorElement = document.getElementById('emailError');
        
        if (!email) {
            this.showError('contactEmail', 'Email is required');
            return false;
        }
        
        if (!this.isValidEmail(email)) {
            this.showError('contactEmail', 'Please enter a valid email address');
            return false;
        }
        
        this.clearError('contactEmail');
        return true;
    }

    static validatePhone() {
        const phone = document.getElementById('contactPhone').value.trim();
        const errorElement = document.getElementById('phoneError');
        
        // Phone is optional, but if provided, validate it
        if (phone && !this.isValidPhone(phone)) {
            this.showError('contactPhone', 'Please enter a valid phone number');
            return false;
        }
        
        this.clearError('contactPhone');
        return true;
    }

    static isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    static isValidPhone(phone) {
        // Basic phone validation - accepts various formats
        const re = /^[\+]?[1-9][\d]{0,15}$/;
        return re.test(phone.replace(/[\s\-\(\)]/g, ''));
    }

    static showError(fieldId, message) {
        const errorElement = document.getElementById(`${fieldId}Error`);
        const inputElement = document.getElementById(fieldId);
        
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
        
        if (inputElement) {
            inputElement.classList.add('error');
        }
    }

    static clearError(fieldId) {
        const errorElement = document.getElementById(`${fieldId}Error`);
        const inputElement = document.getElementById(fieldId);
        
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.style.display = 'none';
        }
        
        if (inputElement) {
            inputElement.classList.remove('error');
        }
    }

    static initFileUpload() {
        const fileInput = document.getElementById('attachment');
        const filePreview = document.getElementById('filePreview');
        
        if (!fileInput || !filePreview) return;
        
        fileInput.addEventListener('change', (e) => {
            const files = e.target.files;
            
            if (files.length === 0) {
                filePreview.classList.remove('active');
                return;
            }
            
            let previewHTML = '';
            let totalSize = 0;
            const maxSize = 10 * 1024 * 1024; // 10MB
            
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                totalSize += file.size;
                
                if (totalSize > maxSize) {
                    Components.showAlert('Total file size exceeds 10MB limit', 'danger');
                    fileInput.value = '';
                    filePreview.classList.remove('active');
                    return;
                }
                
                const fileSize = this.formatFileSize(file.size);
                const fileName = file.name.length > 30 ? file.name.substring(0, 27) + '...' : file.name;
                const fileType = this.getFileType(file.name);
                
                previewHTML += `
                    <div class="file-item" data-index="${i}">
                        <div class="file-info">
                            <i class="fas ${fileType.icon} file-icon"></i>
                            <div>
                                <div class="file-name">${fileName}</div>
                                <div class="file-size">${fileSize}</div>
                            </div>
                        </div>
                        <button type="button" class="remove-file" data-index="${i}">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `;
            }
            
            filePreview.innerHTML = previewHTML;
            filePreview.classList.add('active');
            
            // Add remove functionality
            filePreview.querySelectorAll('.remove-file').forEach(button => {
                button.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const index = parseInt(button.getAttribute('data-index'));
                    this.removeFile(index, fileInput);
                });
            });
        });
        
        // Drag and drop functionality
        const fileLabel = document.querySelector('.file-label');
        if (fileLabel) {
            fileLabel.addEventListener('dragover', (e) => {
                e.preventDefault();
                fileLabel.style.borderColor = 'var(--primary)';
                fileLabel.style.background = 'rgba(37, 99, 235, 0.1)';
            });
            
            fileLabel.addEventListener('dragleave', (e) => {
                e.preventDefault();
                fileLabel.style.borderColor = '';
                fileLabel.style.background = '';
            });
            
            fileLabel.addEventListener('drop', (e) => {
                e.preventDefault();
                fileLabel.style.borderColor = '';
                fileLabel.style.background = '';
                
                if (e.dataTransfer.files.length) {
                    fileInput.files = e.dataTransfer.files;
                    fileInput.dispatchEvent(new Event('change'));
                }
            });
        }
    }

    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    static getFileType(filename) {
        const extension = filename.split('.').pop().toLowerCase();
        
        const fileTypes = {
            pdf: { icon: 'fa-file-pdf', color: '#f40' },
            doc: { icon: 'fa-file-word', color: '#2b579a' },
            docx: { icon: 'fa-file-word', color: '#2b579a' },
            jpg: { icon: 'fa-file-image', color: '#ff6b6b' },
            jpeg: { icon: 'fa-file-image', color: '#ff6b6b' },
            png: { icon: 'fa-file-image', color: '#4ecdc4' },
            txt: { icon: 'fa-file-alt', color: '#555' },
            zip: { icon: 'fa-file-archive', color: '#ff9f43' }
        };
        
        return fileTypes[extension] || { icon: 'fa-file', color: '#666' };
    }

    static removeFile(index, fileInput) {
        const dt = new DataTransfer();
        const files = fileInput.files;
        
        for (let i = 0; i < files.length; i++) {
            if (i !== index) {
                dt.items.add(files[i]);
            }
        }
        
        fileInput.files = dt.files;
        fileInput.dispatchEvent(new Event('change'));
    }

    static initLiveChat() {
        const startChatBtn = document.querySelector('.start-chat-btn');
        const chatLauncher = document.getElementById('chatLauncher');
        const chatWidget = document.getElementById('chatWidget');
        const chatToggle = chatWidget.querySelector('.chat-toggle');
        const sendChatBtn = document.getElementById('sendChat');
        const chatInput = document.getElementById('chatInput');
        const chatMessages = document.getElementById('chatMessages');
        
        // Open chat widget
        const openChat = () => {
            chatWidget.classList.add('active');
            chatLauncher.style.display = 'none';
            chatInput.focus();
        };
        
        // Close chat widget
        const closeChat = () => {
            chatWidget.classList.remove('active');
            chatLauncher.style.display = 'flex';
        };
        
        // Start chat from button
        if (startChatBtn) {
            startChatBtn.addEventListener('click', openChat);
        }
        
        // Toggle chat with launcher
        chatLauncher.addEventListener('click', openChat);
        
        // Close chat with toggle button
        chatToggle.addEventListener('click', closeChat);
        
        // Send chat message
        sendChatBtn.addEventListener('click', () => {
            this.sendChatMessage(chatInput, chatMessages);
        });
        
        // Send on Enter key
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendChatMessage(chatInput, chatMessages);
            }
        });
        
        // Auto-response messages
        this.autoResponses = [
            "I can help you with tracking your shipments.",
            "Our support team is available 24/7 for emergencies.",
            "You can book a shipment through our online booking form.",
            "For billing inquiries, please contact billing@mizigosmart.com.",
            "Check our FAQ section for quick answers to common questions."
        ];
    }

    static sendChatMessage(input, messagesContainer) {
        const message = input.value.trim();
        
        if (!message) return;
        
        // Add user message
        this.addChatMessage(message, 'user', messagesContainer);
        input.value = '';
        
        // Simulate typing delay
        setTimeout(() => {
            // Add bot response
            const randomResponse = this.autoResponses[Math.floor(Math.random() * this.autoResponses.length)];
            this.addChatMessage(randomResponse, 'bot', messagesContainer);
        }, 1000);
    }

    static addChatMessage(message, sender, container) {
        const messageElement = document.createElement('div');
        messageElement.className = `chat-message ${sender}`;
        
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        messageElement.innerHTML = `
            <div class="message-content">
                <p>${message}</p>
                <span class="message-time">${time}</span>
            </div>
        `;
        
        container.appendChild(messageElement);
        container.scrollTop = container.scrollHeight;
    }

    static initContactMethodIcons() {
        // Add interactive effects to contact method cards
        const contactMethods = document.querySelectorAll('.contact-method');
        
        contactMethods.forEach(method => {
            method.addEventListener('mouseenter', () => {
                const icon = method.querySelector('.method-icon');
                icon.style.transform = 'scale(1.1) rotate(5deg)';
            });
            
            method.addEventListener('mouseleave', () => {
                const icon = method.querySelector('.method-icon');
                icon.style.transform = 'scale(1) rotate(0)';
            });
        });
    }

    static initQuickLinks() {
        // Add smooth scrolling for internal links
        const quickLinks = document.querySelectorAll('.quick-option[href^="#"]');
        
        quickLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                const targetId = link.getAttribute('href');
                if (targetId.startsWith('#')) {
                    e.preventDefault();
                    const targetElement = document.querySelector(targetId);
                    if (targetElement) {
                        targetElement.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });
                    }
                }
            });
        });
    }

    static initFormSubmission() {
        const form = document.getElementById('contactForm');
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Validate all required fields
            const requiredFields = [
                'contactFirstName',
                'contactLastName',
                'contactEmail',
                'inquiryType',
                'contactSubject',
                'contactMessage'
            ];
            
            let isValid = true;
            
            requiredFields.forEach(fieldId => {
                if (!this.validateField(fieldId)) {
                    isValid = false;
                }
            });
            
            if (!this.validateEmail()) {
                isValid = false;
            }
            
            if (!this.validatePhone()) {
                isValid = false;
            }
            
            if (!isValid) {
                Components.showAlert('Please fix all errors before submitting', 'danger');
                return;
            }
            
            // Collect form data
            const formData = this.collectFormData();
            
            // Show loading state
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
            submitBtn.disabled = true;
            
            try {
                // Simulate API call
                await this.sendContactForm(formData);
                
                // Show success modal
                this.showSuccessModal(formData);
                
                // Reset form
                setTimeout(() => {
                    form.reset();
                    document.getElementById('filePreview').classList.remove('active');
                    document.getElementById('filePreview').innerHTML = '';
                }, 1000);
                
            } catch (error) {
                Components.showAlert('Failed to send message. Please try again.', 'danger');
                console.error('Contact form error:', error);
            } finally {
                // Restore button state
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    static collectFormData() {
        const inquiryType = document.getElementById('inquiryType');
        const contactMethod = document.querySelector('input[name="contactMethod"]:checked');
        
        return {
            firstName: document.getElementById('contactFirstName').value.trim(),
            lastName: document.getElementById('contactLastName').value.trim(),
            email: document.getElementById('contactEmail').value.trim(),
            phone: document.getElementById('contactPhone').value.trim() || 'Not provided',
            company: document.getElementById('companyName').value.trim() || 'Not provided',
            inquiryType: inquiryType.options[inquiryType.selectedIndex]?.text || 'Not specified',
            subject: document.getElementById('contactSubject').value.trim(),
            message: document.getElementById('contactMessage').value.trim(),
            preferredMethod: contactMethod?.value || 'email',
            files: document.getElementById('attachment').files.length,
            timestamp: new Date().toISOString()
        };
    }

    static async sendContactForm(formData) {
        // Simulate API call with delay
        return new Promise((resolve) => {
            setTimeout(() => {
                // Save contact submission to localStorage for demo purposes
                const submissions = JSON.parse(localStorage.getItem('mizigosmart_contacts') || '[]');
                submissions.push({
                    ...formData,
                    id: Date.now(),
                    status: 'new',
                    read: false
                });
                localStorage.setItem('mizigosmart_contacts', JSON.stringify(submissions));
                
                console.log('Contact form submitted:', formData);
                resolve();
            }, 1500);
        });
    }

    static showSuccessModal(formData) {
        const modal = document.getElementById('successModal');
        const messageSummary = document.getElementById('messageSummary');
        const closeBtn = document.getElementById('closeModal');
        
        // Format inquiry type
        const inquiryTypeMap = {
            'general': 'General Inquiry',
            'support': 'Technical Support',
            'sales': 'Sales Question',
            'billing': 'Billing Inquiry',
            'partnership': 'Partnership Opportunity',
            'feedback': 'Feedback & Suggestions',
            'other': 'Other'
        };
        
        const inquiryTypeText = inquiryTypeMap[formData.inquiryType] || formData.inquiryType;
        
        // Format preferred contact method
        const contactMethodMap = {
            'email': 'Email',
            'phone': 'Phone Call',
            'both': 'Email & Phone Call'
        };
        
        const contactMethodText = contactMethodMap[formData.preferredMethod] || 'Email';
        
        messageSummary.innerHTML = `
            <div class="summary-item">
                <span class="summary-label">Name:</span>
                <span class="summary-value">${formData.firstName} ${formData.lastName}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">Email:</span>
                <span class="summary-value">${formData.email}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">Inquiry Type:</span>
                <span class="summary-value">${inquiryTypeText}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">Subject:</span>
                <span class="summary-value">${formData.subject}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">Contact Method:</span>
                <span class="summary-value">${contactMethodText}</span>
            </div>
        `;
        
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Close modal
        closeBtn.addEventListener('click', () => {
            modal.classList.remove('active');
            document.body.style.overflow = 'auto';
        });
        
        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
                document.body.style.overflow = 'auto';
            }
        });
        
        // Close with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                modal.classList.remove('active');
                document.body.style.overflow = 'auto';
            }
        });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    ContactPage.init();
    
    // Add CSS for error states
    const style = document.createElement('style');
    style.textContent = `
        .form-control.error {
            border-color: var(--danger);
            box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
        }
        
        .method-icon {
            transition: transform 0.3s ease;
        }
    `;
    document.head.appendChild(style);
});