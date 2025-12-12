// Index Page JavaScript
class IndexPage {
    static init() {
        this.initCounterAnimation();
        this.initHeroAnimation();
        this.initScrollAnimations();
    }

    static initCounterAnimation() {
        const statNumbers = document.querySelectorAll('.stat-number');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const statNumber = entry.target;
                    const target = parseInt(statNumber.getAttribute('data-count'));
                    const suffix = statNumber.textContent.includes('%') ? '%' : '+';
                    
                    this.animateCounter(statNumber, target, suffix);
                    observer.unobserve(statNumber);
                }
            });
        }, { threshold: 0.5 });
        
        statNumbers.forEach(stat => observer.observe(stat));
    }

    static animateCounter(element, target, suffix = '') {
        let current = 0;
        const increment = target / 100;
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            element.textContent = Math.floor(current) + suffix;
        }, 20);
    }

    static initHeroAnimation() {
        const heroImage = document.querySelector('.hero-image img');
        if (heroImage) {
            heroImage.style.opacity = '0';
            heroImage.style.transform = 'translateX(50px)';
            
            setTimeout(() => {
                heroImage.style.transition = 'all 1s ease';
                heroImage.style.opacity = '1';
                heroImage.style.transform = 'translateX(0)';
            }, 300);
        }
    }

    static initScrollAnimations() {
        const featureCards = document.querySelectorAll('.feature-card');
        
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
        
        featureCards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(30px)';
            card.style.transition = 'all 0.6s ease';
            observer.observe(card);
        });
    }

    static handleBookingClick() {
        Components.showAlert('Redirecting to booking page...', 'info');
        setTimeout(() => {
            window.location.href = 'booking.html';
        }, 1000);
    }

    static handleTrackClick() {
        const trackingNumber = prompt('Enter your tracking number:');
        if (trackingNumber) {
            Components.showAlert('Searching for shipment...', 'info');
            setTimeout(() => {
                window.location.href = `track.html?tracking=${trackingNumber}`;
            }, 1000);
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    IndexPage.init();
    
    // Add event listeners for hero buttons
    document.querySelector('.btn-primary')?.addEventListener('click', (e) => {
        if (e.target.closest('.hero-actions')) {
            IndexPage.handleBookingClick();
        }
    });
    
    document.querySelector('.btn-outline')?.addEventListener('click', (e) => {
        if (e.target.closest('.hero-actions')) {
            IndexPage.handleTrackClick();
        }
    });
});