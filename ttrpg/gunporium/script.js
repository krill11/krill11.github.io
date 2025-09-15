// Shopping Cart Functionality
let cart = JSON.parse(localStorage.getItem('gunporium-cart')) || [];

// Initialize cart display on page load
document.addEventListener('DOMContentLoaded', function() {
    updateCartDisplay();
    updateCartCount();
});

// Add item to cart
function addToCart(name, damage, range, price, category) {
    const existingItem = cart.find(item => item.name === name);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            name: name,
            damage: damage,
            range: range,
            price: price,
            category: category,
            quantity: 1,
            id: Date.now() + Math.random()
        });
    }
    
    saveCart();
    updateCartDisplay();
    updateCartCount();
    
    // Show brief feedback
    showAddToCartFeedback(name);
}

// Remove item from cart
function removeFromCart(itemId) {
    cart = cart.filter(item => item.id !== itemId);
    saveCart();
    updateCartDisplay();
    updateCartCount();
}

// Update item quantity
function updateQuantity(itemId, change) {
    const item = cart.find(item => item.id === itemId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(itemId);
        } else {
            saveCart();
            updateCartDisplay();
            updateCartCount();
        }
    }
}

// Save cart to localStorage
function saveCart() {
    localStorage.setItem('gunporium-cart', JSON.stringify(cart));
}

// Update cart count in header
function updateCartCount() {
    const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
    document.getElementById('cart-count').textContent = cartCount;
}

// Update cart display in sidebar
function updateCartDisplay() {
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');
    const checkoutBtn = document.getElementById('checkout-btn');
    
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<div class="empty-cart">Your cart is empty<br>Start shopping to add items!</div>';
        cartTotal.textContent = '0';
        checkoutBtn.disabled = true;
        return;
    }
    
    let html = '';
    let total = 0;
    
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        
        html += `
            <div class="cart-item">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">${item.price.toLocaleString()} caps each</div>
                    ${item.damage ? `<div class="cart-item-stats">${item.damage} DMG • ${item.range}ft</div>` : ''}
                </div>
                <div class="cart-item-controls">
                    <button class="quantity-btn" onclick="updateQuantity(${item.id}, -1)">-</button>
                    <span class="quantity">${item.quantity}</span>
                    <button class="quantity-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
                    <button class="remove-item" onclick="removeFromCart(${item.id})">Remove</button>
                </div>
            </div>
        `;
    });
    
    cartItemsContainer.innerHTML = html;
    cartTotal.textContent = total.toLocaleString();
    checkoutBtn.disabled = false;
}

// Toggle cart sidebar
function toggleCart() {
    const cartSidebar = document.getElementById('cart-sidebar');
    const cartOverlay = document.getElementById('cart-overlay');
    
    cartSidebar.classList.toggle('open');
    cartOverlay.classList.toggle('open');
    
    // Prevent body scroll when cart is open
    if (cartSidebar.classList.contains('open')) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = '';
    }
}

// Checkout function
function checkout() {
    if (cart.length === 0) return;
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Show checkout confirmation
    const confirmation = confirm(`Complete your purchase for ${total.toLocaleString()} caps?\n\nThank you for shopping at Crazy Bill's Gunporium!`);
    
    if (confirmation) {
        // Clear cart
        cart = [];
        saveCart();
        updateCartDisplay();
        updateCartCount();
        
        // Close cart
        toggleCart();
        
        // Show success message
        showCheckoutSuccess(total);
    }
}

// Show add to cart feedback
function showAddToCartFeedback(itemName) {
    // Create temporary notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #28a745 0%, #34ce57 100%);
        color: white;
        padding: 15px 20px;
        border-radius: 6px;
        font-family: 'Crimson Text', serif;
        font-weight: 600;
        z-index: 10000;
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;
    notification.textContent = `${itemName} added to cart!`;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after delay
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 2000);
}

// Show checkout success message
function showCheckoutSuccess(total) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #8b4513 0%, #a0522d 100%);
        color: #f5f2e8;
        padding: 30px;
        border-radius: 12px;
        font-family: 'Crimson Text', serif;
        font-weight: 600;
        font-size: 1.2rem;
        z-index: 10000;
        box-shadow: 0 8px 20px rgba(0,0,0,0.4);
        text-align: center;
        border: 3px solid #b8860b;
        max-width: 400px;
        width: 90%;
    `;
    
    notification.innerHTML = `
        <div style="font-family: 'Playfair Display', serif; font-size: 1.5rem; font-weight: 700; margin-bottom: 15px;">
            Purchase Complete!
        </div>
        <div style="margin-bottom: 15px;">
            Total: ${total.toLocaleString()} caps
        </div>
        <div style="font-style: italic; opacity: 0.9;">
            Thank you for shopping at Crazy Bill's Gunporium!<br>
            Your order will be ready for pickup.
        </div>
    `;
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0,0,0,0.7);
        z-index: 9999;
    `;
    
    document.body.appendChild(overlay);
    document.body.appendChild(notification);
    
    // Remove after delay
    setTimeout(() => {
        document.body.removeChild(notification);
        document.body.removeChild(overlay);
    }, 4000);
    
    // Allow clicking to dismiss
    overlay.addEventListener('click', () => {
        if (document.body.contains(notification)) {
            document.body.removeChild(notification);
            document.body.removeChild(overlay);
        }
    });
}

// Smooth scrolling for navigation links
document.addEventListener('DOMContentLoaded', function() {
    const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                const offsetTop = targetElement.offsetTop - 100; // Account for fixed header
                
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });
});

// Close cart when clicking outside
document.addEventListener('click', function(e) {
    const cartSidebar = document.getElementById('cart-sidebar');
    const cartBtn = document.querySelector('.cart-btn');
    
    if (cartSidebar.classList.contains('open') && 
        !cartSidebar.contains(e.target) && 
        !cartBtn.contains(e.target)) {
        // Don't close if clicking on cart controls
        if (!e.target.closest('.cart-item-controls')) {
            toggleCart();
        }
    }
});

// Keyboard accessibility
document.addEventListener('keydown', function(e) {
    const cartSidebar = document.getElementById('cart-sidebar');
    
    // Close cart with Escape key
    if (e.key === 'Escape' && cartSidebar.classList.contains('open')) {
        toggleCart();
    }
});

// Add loading states to buttons
function addLoadingState(button) {
    const originalText = button.textContent;
    button.textContent = 'Adding...';
    button.disabled = true;
    
    setTimeout(() => {
        button.textContent = originalText;
        button.disabled = false;
    }, 500);
}

// Enhanced add to cart with loading state
const originalAddToCart = addToCart;
addToCart = function(name, damage, range, price, category) {
    const button = event.target;
    addLoadingState(button);
    
    setTimeout(() => {
        originalAddToCart(name, damage, range, price, category);
    }, 300);
};

// Add subtle animations on scroll
function addScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    // Observe all product cards
    document.querySelectorAll('.product-card').forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(card);
    });
}

// Initialize scroll animations when page loads
document.addEventListener('DOMContentLoaded', addScrollAnimations);
