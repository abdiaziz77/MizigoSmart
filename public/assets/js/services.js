// Services Page JavaScript
class ServicesPage {
    static init() {
        this.initServiceCards();
        this.initServiceModal();
        this.initScrollAnimation();
        this.initPricingCards();
        this.initProcessAnimation();
        this.initIndustryCards();
    }

    static initServiceCards() {
        const serviceCards = document.querySelectorAll('.service-card');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry, index) => {
                if (entry.isIntersecting) {
                    setTimeout(() => {
                        entry.target.style.opacity = '1';
                        entry.target.style.transform = 'translateY(0)';
                    }, index * 100);
                }
            });
        }, { threshold: 0.1 });
        
        serviceCards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(30px)';
            card.style.transition = 'all 0.6s ease';
            observer.observe(card);
        });
    }

    static initServiceModal() {
        const modal = document.getElementById('serviceModal');
        const closeBtn = modal.querySelector('.modal-close');
        const detailsLinks = document.querySelectorAll('.service-details-link');
        
        // Service details data
        const serviceDetails = {
            'freight-details': {
                title: 'Freight Shipping',
                description: 'Our freight shipping services provide reliable and cost-effective transportation solutions for businesses of all sizes. We handle everything from small parcels to full truckload shipments with precision and care.',
                features: [
                    'Less Than Truckload (LTL) & Full Truckload (FTL) options',
                    'Temperature-controlled transportation',
                    'Hazardous materials handling with certified carriers',
                    'International shipping with customs clearance',
                    'Real-time cargo tracking and monitoring',
                    'Insurance coverage for all shipments',
                    'White-glove delivery services'
                ],
                benefits: [
                    'Reduce shipping costs by up to 30%',
                    'Improve delivery reliability by 95%',
                    'Access to extensive carrier network',
                    'Automated documentation processing',
                    '24/7 shipment monitoring'
                ]
            },
            'warehouse-details': {
                title: 'Warehouse Storage',
                description: 'Secure and scalable warehouse solutions with advanced inventory management. Our facilities are equipped with state-of-the-art technology to ensure your goods are stored safely and efficiently.',
                features: [
                    'Climate-controlled storage facilities',
                    'Real-time inventory tracking system',
                    'Pick, pack, and ship services',
                    '24/7 security with CCTV monitoring',
                    'Cross-docking capabilities',
                    'E-commerce fulfillment center',
                    'Barcode scanning and RFID technology'
                ],
                benefits: [
                    'Reduce storage costs by 25%',
                    'Improve inventory accuracy to 99.9%',
                    'Faster order processing times',
                    'Scalable storage solutions',
                    'Integrated inventory management'
                ]
            },
            'scm-details': {
                title: 'Supply Chain Management',
                description: 'End-to-end supply chain optimization with real-time visibility and analytics. We help you streamline operations, reduce costs, and improve efficiency across your entire supply chain.',
                features: [
                    'Inventory optimization and demand forecasting',
                    'Vendor and supplier management',
                    'Order management system integration',
                    'Performance analytics and KPI tracking',
                    'Risk management and contingency planning',
                    'Sustainable supply chain solutions',
                    'Custom reporting and dashboard'
                ],
                benefits: [
                    'Reduce supply chain costs by 20%',
                    'Improve on-time delivery by 30%',
                    'Enhanced supply chain visibility',
                    'Better demand planning accuracy',
                    'Reduced inventory carrying costs'
                ]
            },
            'lastmile-details': {
                title: 'Last Mile Delivery',
                description: 'Efficient final delivery solutions ensuring customer satisfaction and on-time delivery. Our last-mile delivery network covers urban and rural areas with reliable service.',
                features: [
                    'Same-day and next-day delivery options',
                    'Weekend and after-hours delivery',
                    'Installation and assembly services',
                    'Returns and reverse logistics',
                    'Proof of delivery with digital signatures',
                    'Route optimization for efficiency',
                    'Customer notification system'
                ],
                benefits: [
                    'Improve customer satisfaction scores',
                    'Reduce delivery costs by 15%',
                    'Increase delivery success rate',
                    'Real-time delivery tracking',
                    'Flexible delivery time windows'
                ]
            },
            'route-details': {
                title: 'Route Optimization',
                description: 'AI-powered route planning to reduce delivery times and fuel consumption. Our advanced algorithms analyze multiple factors to create the most efficient routes.',
                features: [
                    'Real-time traffic data integration',
                    'Multi-stop route optimization',
                    'Fuel efficiency calculations',
                    'Driver and vehicle allocation',
                    'Weather condition considerations',
                    'Delivery time window management',
                    'Historical data analysis'
                ],
                benefits: [
                    'Reduce fuel consumption by 20%',
                    'Increase delivery capacity by 25%',
                    'Reduce driver overtime by 30%',
                    'Improve on-time delivery performance',
                    'Lower carbon footprint'
                ]
            },
            'analytics-details': {
                title: 'Logistics Analytics',
                description: 'Advanced analytics and reporting to drive data-driven decisions and improvements. Transform your logistics data into actionable insights.',
                features: [
                    'Custom performance dashboards',
                    'Cost analysis and optimization',
                    'Predictive analytics and forecasting',
                    'Custom report generation',
                    'Real-time KPI monitoring',
                    'Benchmarking against industry standards',
                    'Data visualization tools'
                ],
                benefits: [
                    'Identify cost-saving opportunities',
                    'Improve decision-making with data insights',
                    'Monitor and improve performance',
                    'Forecast demand accurately',
                    'Optimize resource allocation'
                ]
            }
        };

        // Open modal when clicking learn more
        detailsLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const serviceId = link.getAttribute('href').replace('#', '');
                const details = serviceDetails[serviceId];
                
                if (details) {
                    this.openServiceModal(details);
                }
            });
        });

        // Close modal
        closeBtn.addEventListener('click', () => {
            this.closeServiceModal();
        });

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeServiceModal();
            }
        });

        // Close modal with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                this.closeServiceModal();
            }
        });
    }

    static openServiceModal(details) {
        const modal = document.getElementById('serviceModal');
        const modalBody = document.getElementById('modalBody');
        
        modalBody.innerHTML = `
            <div class="service-modal-content">
                <h2>${details.title}</h2>
                <p class="modal-description">${details.description}</p>
                
                <div class="modal-section">
                    <h3>Key Features</h3>
                    <ul class="modal-features">
                        ${details.features.map(feature => `<li><i class="fas fa-check"></i> ${feature}</li>`).join('')}
                    </ul>
                </div>
                
                <div class="modal-section">
                    <h3>Business Benefits</h3>
                    <ul class="modal-benefits">
                        ${details.benefits.map(benefit => `<li><i class="fas fa-chart-line"></i> ${benefit}</li>`).join('')}
                    </ul>
                </div>
                
                <div class="modal-actions">
                    <a href="booking.html" class="btn btn-primary">Book This Service</a>
                    <a href="contact.html" class="btn btn-outline">Contact Sales</a>
                </div>
            </div>
        `;
        
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    static closeServiceModal() {
        const modal = document.getElementById('serviceModal');
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }

    static initScrollAnimation() {
        const scrollLink = document.querySelector('.scroll-link');
        
        if (scrollLink) {
            scrollLink.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = scrollLink.getAttribute('href');
                const targetElement = document.querySelector(targetId);
                
                if (targetElement) {
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        }
    }

    static initPricingCards() {
        const pricingCards = document.querySelectorAll('.pricing-card');
        
        pricingCards.forEach(card => {
            card.addEventListener('mouseenter', () => {
                if (!card.classList.contains('featured')) {
                    card.style.transform = 'translateY(-10px)';
                }
            });
            
            card.addEventListener('mouseleave', () => {
                if (!card.classList.contains('featured')) {
                    card.style.transform = 'translateY(0)';
                } else {
                    card.style.transform = 'scale(1.05)';
                }
            });
            
            // Animate on scroll
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.style.opacity = '1';
                        entry.target.style.transform = entry.target.classList.contains('featured') 
                            ? 'scale(1.05)' 
                            : 'translateY(0)';
                    }
                });
            }, { threshold: 0.2 });
            
            card.style.opacity = '0';
            card.style.transform = 'translateY(30px)';
            card.style.transition = 'all 0.6s ease';
            
            if (card.classList.contains('featured')) {
                card.style.transform = 'scale(0.95)';
            }
            
            observer.observe(card);
        });
    }

    static initProcessAnimation() {
        const processSteps = document.querySelectorAll('.process-step');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry, index) => {
                if (entry.isIntersecting) {
                    setTimeout(() => {
                        entry.target.style.opacity = '1';
                        entry.target.style.transform = 'scale(1)';
                    }, index * 200);
                }
            });
        }, { threshold: 0.3 });
        
        processSteps.forEach((step, index) => {
            step.style.opacity = '0';
            step.style.transform = 'scale(0.9)';
            step.style.transition = 'all 0.6s ease';
            observer.observe(step);
        });
    }

    static initIndustryCards() {
        const industryCards = document.querySelectorAll('.industry-card');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry, index) => {
                if (entry.isIntersecting) {
                    setTimeout(() => {
                        entry.target.style.opacity = '1';
                        entry.target.style.transform = 'translateY(0) rotate(0)';
                    }, index * 50);
                }
            });
        }, { threshold: 0.1 });
        
        industryCards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px) rotate(2deg)';
            card.style.transition = 'all 0.4s ease';
            observer.observe(card);
        });
    }

    static handleGetConsultation() {
        Components.showAlert('Redirecting to contact page...', 'info');
        setTimeout(() => {
            window.location.href = 'contact.html';
        }, 1000);
    }

    static handleBookNow() {
        Components.showAlert('Redirecting to booking page...', 'info');
        setTimeout(() => {
            window.location.href = 'booking.html';
        }, 1000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    ServicesPage.init();
    
    // Add event listeners for CTA buttons
    document.querySelector('.btn-primary')?.addEventListener('click', (e) => {
        if (e.target.closest('.services-cta')) {
            ServicesPage.handleGetConsultation();
        }
    });
    
    document.querySelector('.btn-outline')?.addEventListener('click', (e) => {
        if (e.target.closest('.services-cta')) {
            ServicesPage.handleBookNow();
        }
    });
    
    // Add CSS for modal content
    const style = document.createElement('style');
    style.textContent = `
        .service-modal-content {
            padding: 1rem;
        }
        
        .service-modal-content h2 {
            font-size: 2rem;
            margin-bottom: 1.5rem;
            color: var(--gray-900);
        }
        
        .modal-description {
            font-size: 1.125rem;
            color: var(--gray-600);
            line-height: 1.7;
            margin-bottom: 2rem;
        }
        
        .modal-section {
            margin-bottom: 2rem;
        }
        
        .modal-section h3 {
            font-size: 1.25rem;
            margin-bottom: 1rem;
            color: var(--gray-900);
        }
        
        .modal-features,
        .modal-benefits {
            list-style: none;
            padding-left: 0;
        }
        
        .modal-features li,
        .modal-benefits li {
            display: flex;
            align-items: flex-start;
            gap: 0.75rem;
            margin-bottom: 0.75rem;
            color: var(--gray-700);
        }
        
        .modal-features i {
            color: var(--success);
            margin-top: 0.25rem;
        }
        
        .modal-benefits i {
            color: var(--primary);
            margin-top: 0.25rem;
        }
        
        .modal-actions {
            display: flex;
            gap: 1rem;
            margin-top: 2.5rem;
            flex-wrap: wrap;
        }
        
        @media (max-width: 768px) {
            .modal-actions {
                flex-direction: column;
            }
            
            .modal-actions .btn {
                width: 100%;
            }
        }
    `;
    document.head.appendChild(style);
});