// About Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Mobile Menu Toggle
    const navbarToggle = document.getElementById('navbarToggle');
    const navbarMenu = document.getElementById('navbarMenu');
    
    if (navbarToggle) {
        navbarToggle.addEventListener('click', function() {
            navbarMenu.classList.toggle('active');
            navbarToggle.innerHTML = navbarMenu.classList.contains('active') 
                ? '<i class="fas fa-times"></i>' 
                : '<i class="fas fa-bars"></i>';
        });
    }
    
    // Testimonial Slider
    const testimonialCards = document.querySelectorAll('.testimonial-card');
    const testimonialDots = document.querySelectorAll('.dot');
    const testimonialPrev = document.querySelector('.testimonial-prev');
    const testimonialNext = document.querySelector('.testimonial-next');
    let currentTestimonial = 0;
    
    function showTestimonial(index) {
        // Hide all testimonials
        testimonialCards.forEach(card => card.classList.remove('active'));
        testimonialDots.forEach(dot => dot.classList.remove('active'));
        
        // Show current testimonial
        testimonialCards[index].classList.add('active');
        testimonialDots[index].classList.add('active');
        currentTestimonial = index;
    }
    
    // Initialize first testimonial
    if (testimonialCards.length > 0) {
        showTestimonial(0);
        
        // Dot click events
        testimonialDots.forEach((dot, index) => {
            dot.addEventListener('click', () => showTestimonial(index));
        });
        
        // Navigation buttons
        if (testimonialPrev) {
            testimonialPrev.addEventListener('click', () => {
                let newIndex = currentTestimonial - 1;
                if (newIndex < 0) newIndex = testimonialCards.length - 1;
                showTestimonial(newIndex);
            });
        }
        
        if (testimonialNext) {
            testimonialNext.addEventListener('click', () => {
                let newIndex = currentTestimonial + 1;
                if (newIndex >= testimonialCards.length) newIndex = 0;
                showTestimonial(newIndex);
            });
        }
        
        // Auto-rotate testimonials
        setInterval(() => {
            let newIndex = currentTestimonial + 1;
            if (newIndex >= testimonialCards.length) newIndex = 0;
            showTestimonial(newIndex);
        }, 5000);
    }
    
    // Animate on scroll
    const animateOnScrollElements = document.querySelectorAll('.animate-on-scroll');
    
    function checkScroll() {
        animateOnScrollElements.forEach(element => {
            const elementPosition = element.getBoundingClientRect().top;
            const screenPosition = window.innerHeight / 1.2;
            
            if (elementPosition < screenPosition) {
                element.classList.add('animated');
            }
        });
    }
    
    // Initial check
    checkScroll();
    
    // Check on scroll
    window.addEventListener('scroll', checkScroll);
    
    // Animated counter for stats
    const counters = document.querySelectorAll('.counter');
    const speed = 200; // The lower the faster
    
    function startCounter(counter) {
        const target = +counter.getAttribute('data-target');
        const count = +counter.innerText;
        const increment = target / speed;
        
        if (count < target) {
            counter.innerText = Math.ceil(count + increment);
            setTimeout(() => startCounter(counter), 10);
        } else {
            counter.innerText = target;
        }
    }
    
    // Start counters when they come into view
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.5
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const counter = entry.target.querySelector('.counter');
                if (counter) {
                    startCounter(counter);
                }
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // Observe all stat items
    document.querySelectorAll('.stat-item').forEach(item => {
        observer.observe(item);
    });
    
    // Team card hover effect enhancement
    const teamCards = document.querySelectorAll('.team-card');
    teamCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-15px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
    
    // Timeline animation
    const timelineItems = document.querySelectorAll('.timeline-item');
    timelineItems.forEach((item, index) => {
        item.style.animationDelay = `${index * 0.2}s`;
    });
    
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Parallax effect for header
    window.addEventListener('scroll', function() {
        const scrolled = window.pageYOffset;
        const header = document.querySelector('.page-header');
        if (header) {
            const rate = scrolled * -0.5;
            header.style.backgroundPosition = `center ${rate}px`;
        }
    });
    
    // Add loading animation for images
    const images = document.querySelectorAll('img');
    images.forEach(img => {
        img.addEventListener('load', function() {
            this.style.opacity = '1';
            this.style.transition = 'opacity 0.5s ease';
        });
        
        // Set initial opacity to 0 for fade-in effect
        img.style.opacity = '0';
    });
});