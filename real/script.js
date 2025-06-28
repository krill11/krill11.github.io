// Jazz Real Books - Interactive Features
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the website
    initializeAnimations();
    initializeInteractions();
    initializeAccessibility();
    
    console.log('🎷 Jazz Real Books website loaded successfully!');
});

// Initialize loading animations
function initializeAnimations() {
    // Animate book cards on scroll
    const bookCards = document.querySelectorAll('.book-card');
    
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const cardObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    bookCards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        cardObserver.observe(card);
    });
}

// Initialize interactive features
function initializeInteractions() {
    // Add click feedback for instrument buttons
    const instrumentBtns = document.querySelectorAll('.instrument-btn:not(.disabled)');
    
    instrumentBtns.forEach(btn => {
        // Add ripple effect on click
        btn.addEventListener('click', function(e) {
            createRippleEffect(e, this);
        });
        
        // Add hover sound effect (visual feedback)
        btn.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px) scale(1.02)';
        });
        
        btn.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
    
    // Handle vocal button interactions
    const vocalBtn = document.querySelector('.vocal-btn');
    if (vocalBtn) {
        vocalBtn.addEventListener('click', function(e) {
            createRippleEffect(e, this);
        });
    }
    
    // Add keyboard navigation
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Tab') {
            document.body.classList.add('keyboard-navigation');
        }
    });
    
    document.addEventListener('mousedown', function() {
        document.body.classList.remove('keyboard-navigation');
    });
}

// Create ripple effect for button clicks
function createRippleEffect(event, element) {
    const ripple = document.createElement('span');
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    ripple.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        left: ${x}px;
        top: ${y}px;
        background: radial-gradient(circle, rgba(243, 156, 18, 0.4), transparent);
        border-radius: 50%;
        transform: scale(0);
        animation: ripple 0.6s ease-out;
        pointer-events: none;
        z-index: 10;
    `;
    
    element.appendChild(ripple);
    
    // Remove ripple after animation
    setTimeout(() => {
        ripple.remove();
    }, 600);
}

// Initialize accessibility features
function initializeAccessibility() {
    // Add ARIA labels and roles
    const instrumentBtns = document.querySelectorAll('.instrument-btn');
    instrumentBtns.forEach(btn => {
        if (btn.classList.contains('disabled')) {
            btn.setAttribute('aria-disabled', 'true');
            btn.setAttribute('tabindex', '-1');
        } else {
            btn.setAttribute('role', 'button');
            btn.setAttribute('aria-label', `Open ${btn.querySelector('.key').textContent} version`);
        }
    });
    
    // Add focus indicators for keyboard navigation
    const focusableElements = document.querySelectorAll('a, button, [tabindex="0"]');
    focusableElements.forEach(element => {
        element.addEventListener('focus', function() {
            this.style.outline = '3px solid #3498db';
            this.style.outlineOffset = '2px';
        });
        
        element.addEventListener('blur', function() {
            this.style.outline = 'none';
        });
    });
}

// Add CSS animation for ripple effect
const style = document.createElement('style');
style.textContent = `
    @keyframes ripple {
        to {
            transform: scale(2);
            opacity: 0;
        }
    }
    
    .keyboard-navigation *:focus {
        outline: 3px solid #3498db !important;
        outline-offset: 2px !important;
    }
    
    .instrument-btn, .vocal-btn {
        position: relative;
        overflow: hidden;
    }
`;
document.head.appendChild(style);

// Smooth scroll behavior for any internal links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Add a subtle parallax effect to the header
window.addEventListener('scroll', function() {
    const scrolled = window.pageYOffset;
    const header = document.querySelector('.logo-section');
    if (header) {
        const rate = scrolled * -0.3;
        header.style.transform = `translateY(${rate}px)`;
    }
});

// Error handling for PDF links
document.querySelectorAll('a[href$=".pdf"]').forEach(link => {
    link.addEventListener('click', function(e) {
        // Add loading state
        this.style.opacity = '0.7';
        this.style.pointerEvents = 'none';
        
        // Reset after a short delay
        setTimeout(() => {
            this.style.opacity = '1';
            this.style.pointerEvents = 'auto';
        }, 1000);
    });
    
    // Handle potential errors (though we can't catch PDF loading errors directly)
    link.addEventListener('error', function() {
        console.warn('PDF might not be available:', this.href);
    });
});

// Add a theme toggle feature (optional enhancement)
function addThemeToggle() {
    const toggleButton = document.createElement('button');
    toggleButton.innerHTML = '🌙';
    toggleButton.className = 'theme-toggle';
    toggleButton.setAttribute('aria-label', 'Toggle dark mode');
    
    toggleButton.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        width: 50px;
        height: 50px;
        border-radius: 50%;
        border: none;
        background: var(--primary-bg);
        box-shadow: 
            8px 8px 16px var(--shadow-dark),
            -8px -8px 16px var(--shadow-light);
        cursor: pointer;
        font-size: 1.5rem;
        z-index: 1000;
        transition: var(--transition);
    `;
    
    document.body.appendChild(toggleButton);
    
    toggleButton.addEventListener('click', function() {
        document.body.classList.toggle('dark-theme');
        this.innerHTML = document.body.classList.contains('dark-theme') ? '☀️' : '🌙';
    });
}

// Initialize theme toggle (commented out by default)
// addThemeToggle(); 