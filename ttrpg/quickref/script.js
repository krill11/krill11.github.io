// Supabase Configuration
// TODO: Replace with your actual Supabase URL and API key
const SUPABASE_URL = 'https://jnamtuorbmyibugpltmt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuYW10dW9yYm15aWJ1Z3BsdG10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMzY0NDUsImV4cCI6MjA3MzcxMjQ0NX0.TTYRPe9oy2NJMnXIsBXSb811Cl-WfxNn8zhqkb77_S0';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global variables
let allItems = [];
let filteredItems = [];

// DOM elements
const searchInput = document.getElementById('search-input');
const tableBody = document.getElementById('table-body');
const resultsCount = document.getElementById('results-count');
const loading = document.getElementById('loading');
const noResults = document.getElementById('no-results');
const itemsTable = document.getElementById('items-table');
const addItemBtn = document.getElementById('add-item-btn');
const addItemModal = document.getElementById('add-item-modal');
const addItemForm = document.getElementById('add-item-form');
const closeModal = document.querySelector('.close-modal');
const cancelAdd = document.getElementById('cancel-add');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    loadItems();
    setupSearch();
    setupModal();
});

// Load items from both JSON file and Supabase
async function loadItems() {
    try {
        // Load base items from JSON file
        const response = await fetch('./items.json');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data || !data.items || !Array.isArray(data.items)) {
            throw new Error('Invalid data format');
        }
        
        let baseItems = data.items;
        
        // Load custom items from Supabase
        let customItems = [];
        try {
            if (SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
                const { data: supabaseItems, error } = await supabase
                    .from('items')
                    .select('*');
                
                if (error) {
                    console.warn('Supabase error:', error.message);
                } else {
                    customItems = supabaseItems || [];
                    console.log(`Loaded ${customItems.length} custom items from Supabase`);
                }
            }
        } catch (supabaseError) {
            console.warn('Supabase connection failed:', supabaseError);
        }
        
        // Combine base items and custom items
        allItems = [...baseItems, ...customItems];
        filteredItems = [...allItems];
        
        console.log(`Loaded ${allItems.length} items total (${baseItems.length} base + ${customItems.length} custom)`);
        
        renderItems();
        updateResultsCount();
        hideLoading();
        
    } catch (error) {
        console.error('Error loading items:', error);
        showError(`Failed to load items: ${error.message}. Please refresh the page.`);
    }
}

// Render items in the table with grouping
function renderItems() {
    if (filteredItems.length === 0) {
        showNoResults();
        return;
    }
    
    hideNoResults();
    
    // Group items by category
    const groupedItems = groupItemsByCategory(filteredItems);
    
    let html = '';
    
    // Render each group
    Object.keys(groupedItems).forEach(category => {
        const items = groupedItems[category];
        
        // Add group header
        html += `
            <tr class="group-header">
                <td colspan="5">
                    <div class="group-title">
                        <span class="group-icon">${getCategoryIcon(category)}</span>
                        <span class="group-name">${category}</span>
                        <span class="group-count">(${items.length})</span>
                    </div>
                </td>
            </tr>
        `;
        
        // Add items in the group
        items.forEach(item => {
            html += `
                <tr class="group-item">
                    <td class="icon-col">
                        <span class="item-icon">${item.icon || '📦'}</span>
                    </td>
                    <td class="name-col">
                        <div class="item-name">${item.name}</div>
                    </td>
                    <td class="category-col">
                        <div class="item-category">${item.category}</div>
                        ${item.subcategory ? `<div class="item-subcategory">${item.subcategory}</div>` : ''}
                    </td>
                    <td class="stats-col">
                        <div class="item-stats">
                            ${generateStatsHTML(item)}
                        </div>
                    </td>
                    <td class="details-col">
                        <div class="item-details">
                            ${generateDetailsHTML(item)}
                        </div>
                    </td>
                </tr>
            `;
        });
    });
    
    tableBody.innerHTML = html;
}

// Group items by their main category
function groupItemsByCategory(items) {
    const groups = {};
    
    items.forEach(item => {
        const category = item.category;
        if (!groups[category]) {
            groups[category] = [];
        }
        groups[category].push(item);
    });
    
    // Sort groups by a predefined order for better organization
    const categoryOrder = [
        'Weapons',
        'Armor', 
        'Chems / Medical',
        'Utility / Augmentations',
        'Ammo',
        'Cosmetics'
    ];
    
    const sortedGroups = {};
    categoryOrder.forEach(category => {
        if (groups[category]) {
            sortedGroups[category] = groups[category];
        }
    });
    
    // Add any remaining categories not in the predefined order
    Object.keys(groups).forEach(category => {
        if (!sortedGroups[category]) {
            sortedGroups[category] = groups[category];
        }
    });
    
    return sortedGroups;
}

// Get appropriate icon for each category
function getCategoryIcon(category) {
    const iconMap = {
        'Weapons': '⚔️',
        'Armor': '🛡️',
        'Chems / Medical': '💊',
        'Utility / Augmentations': '⚙️',
        'Ammo': '🔋',
        'Cosmetics': '🎨'
    };
    
    return iconMap[category] || '📦';
}

// Generate stats HTML based on item type
function generateStatsHTML(item) {
    let stats = [];
    
    // Weapon stats
    if (item.damage) {
        stats.push(`<div class="stat-line"><span class="stat-label">DMG:</span><span class="stat-value">${item.damage}</span></div>`);
    }
    
    if (item.range) {
        stats.push(`<div class="stat-line"><span class="stat-label">Range:</span><span class="stat-value">${item.range}</span></div>`);
    }
    
    // Armor stats
    if (item.ac) {
        stats.push(`<div class="stat-line"><span class="stat-label">AC:</span><span class="stat-value">${item.ac}</span></div>`);
    }
    
    if (item.sp) {
        stats.push(`<div class="stat-line"><span class="stat-label">SP:</span><span class="stat-value">${item.sp}</span></div>`);
    }
    
    // Type
    if (item.type) {
        stats.push(`<div class="stat-line"><span class="stat-label">Type:</span><span class="stat-value">${item.type}</span></div>`);
    }
    
    return stats.length > 0 ? stats.join('') : '<span class="stat-value">—</span>';
}

// Generate details HTML
function generateDetailsHTML(item) {
    let details = [];
    
    // Effect/Description
    if (item.effect) {
        details.push(`<div class="detail-line"><span class="detail-label">Effect:</span> ${item.effect}</div>`);
    }
    
    // Duration
    if (item.duration) {
        details.push(`<div class="detail-line"><span class="detail-label">Duration:</span> ${item.duration}</div>`);
    }
    
    // Addiction chance
    if (item.addiction) {
        details.push(`<div class="detail-line"><span class="detail-label">Addiction:</span> <span class="addiction-warning">${item.addiction} chance</span></div>`);
    }
    
    // Special notes
    if (item.special) {
        details.push(`<div class="detail-line"><span class="detail-label">Special:</span> ${item.special}</div>`);
    }
    
    return details.length > 0 ? details.join('') : '<span>—</span>';
}

// Setup search functionality
function setupSearch() {
    searchInput.addEventListener('input', handleSearch);
    searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            clearSearch();
        }
    });
}

// Handle search input
function handleSearch() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    if (searchTerm === '') {
        filteredItems = [...allItems];
    } else {
        filteredItems = allItems.filter(item => 
            item.name.toLowerCase().includes(searchTerm) ||
            item.category.toLowerCase().includes(searchTerm) ||
            (item.subcategory && item.subcategory.toLowerCase().includes(searchTerm)) ||
            (item.effect && item.effect.toLowerCase().includes(searchTerm))
        );
    }
    
    renderItems();
    updateResultsCount();
}

// Clear search
function clearSearch() {
    searchInput.value = '';
    filteredItems = [...allItems];
    renderItems();
    updateResultsCount();
    searchInput.focus();
}

// Update results count
function updateResultsCount() {
    const count = filteredItems.length;
    const total = allItems.length;
    
    if (searchInput.value.trim() === '') {
        resultsCount.textContent = `${total} items`;
    } else {
        resultsCount.textContent = `${count} of ${total} items`;
    }
}

// Show/hide loading state
function hideLoading() {
    loading.style.display = 'none';
    itemsTable.style.display = 'table';
}

function showLoading() {
    loading.style.display = 'block';
    itemsTable.style.display = 'none';
    noResults.style.display = 'none';
}

// Show/hide no results state
function showNoResults() {
    noResults.style.display = 'block';
    itemsTable.style.display = 'none';
}

function hideNoResults() {
    noResults.style.display = 'none';
    itemsTable.style.display = 'table';
}

// Show error message
function showError(message) {
    hideLoading();
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.cssText = `
        text-align: center;
        padding: 60px 20px;
        color: #e53e3e;
        background: rgba(229, 62, 62, 0.05);
        border: 2px solid rgba(229, 62, 62, 0.2);
        border-radius: 12px;
        margin: 20px 0;
    `;
    errorDiv.innerHTML = `
        <div style="font-size: 3rem; margin-bottom: 20px;">⚠️</div>
        <h3 style="font-size: 1.5rem; margin-bottom: 10px; color: #1a202c;">Error Loading Items</h3>
        <p>${message}</p>
    `;
    
    document.querySelector('.container').appendChild(errorDiv);
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Focus search with Ctrl/Cmd + K
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInput.focus();
        searchInput.select();
    }
    
    // Clear search with Ctrl/Cmd + /
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        clearSearch();
    }
});

// Add subtle scroll animations
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
        rootMargin: '0px 0px -20px 0px'
    });

    // Observe table rows for animation
    const animateRows = () => {
        document.querySelectorAll('.items-table tbody tr').forEach((row, index) => {
            row.style.opacity = '0';
            row.style.transform = 'translateY(20px)';
            row.style.transition = `opacity 0.4s ease ${index * 0.05}s, transform 0.4s ease ${index * 0.05}s`;
            observer.observe(row);
        });
    };

    // Re-animate when items change
    const originalRenderItems = renderItems;
    renderItems = function() {
        originalRenderItems();
        setTimeout(animateRows, 50);
    };
}

// Initialize scroll animations
document.addEventListener('DOMContentLoaded', addScrollAnimations);

// Add search input focus ring enhancement
searchInput.addEventListener('focus', function() {
    this.parentElement.style.transform = 'scale(1.02)';
});

searchInput.addEventListener('blur', function() {
    this.parentElement.style.transform = 'scale(1)';
});

// Add smooth scrolling to top when searching
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Scroll to top when search results change significantly
let lastResultCount = 0;
const originalUpdateResultsCount = updateResultsCount;
updateResultsCount = function() {
    originalUpdateResultsCount();
    
    const currentCount = filteredItems.length;
    if (Math.abs(currentCount - lastResultCount) > 10) {
        scrollToTop();
    }
    lastResultCount = currentCount;
};

// Modal Setup
function setupModal() {
    // Open modal
    addItemBtn.addEventListener('click', openAddItemModal);
    
    // Close modal
    closeModal.addEventListener('click', closeAddItemModal);
    cancelAdd.addEventListener('click', closeAddItemModal);
    
    // Close modal when clicking outside
    addItemModal.addEventListener('click', function(e) {
        if (e.target === addItemModal) {
            closeAddItemModal();
        }
    });
    
    // Handle form submission
    addItemForm.addEventListener('submit', handleAddItem);
    
    // Close modal with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && addItemModal.style.display === 'flex') {
            closeAddItemModal();
        }
    });
}

function openAddItemModal() {
    addItemModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    // Focus first input
    document.getElementById('item-name').focus();
}

function closeAddItemModal() {
    addItemModal.style.display = 'none';
    document.body.style.overflow = 'auto';
    addItemForm.reset();
}

// Handle adding new item
async function handleAddItem(e) {
    e.preventDefault();
    
    const formData = new FormData(addItemForm);
    const newItem = {
        name: document.getElementById('item-name').value,
        category: document.getElementById('item-category').value,
        subcategory: document.getElementById('item-subcategory').value || null,
        icon: document.getElementById('item-icon').value || '📦',
        damage: document.getElementById('item-damage').value || null,
        range: document.getElementById('item-range').value || null,
        ac: document.getElementById('item-ac').value || null,
        sp: document.getElementById('item-sp').value || null,
        type: document.getElementById('item-type').value || null,
        effect: document.getElementById('item-effect').value || null,
        duration: document.getElementById('item-duration').value || null,
        addiction: document.getElementById('item-addiction').value || null,
        special: document.getElementById('item-special').value || null
    };
    
    // Remove null/empty values
    Object.keys(newItem).forEach(key => {
        if (newItem[key] === null || newItem[key] === '') {
            delete newItem[key];
        }
    });
    
    try {
        // Add to Supabase if configured
        if (SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
            const { data, error } = await supabase
                .from('items')
                .insert([newItem])
                .select();
            
            if (error) {
                throw new Error(`Supabase error: ${error.message}`);
            }
            
            console.log('Item added to Supabase:', data[0]);
            
            // Add the returned item (with ID) to our local array
            allItems.push(data[0]);
        } else {
            // If Supabase not configured, just add to local array with temporary ID
            newItem.id = Date.now(); // Temporary ID
            allItems.push(newItem);
            console.log('Item added locally (Supabase not configured)');
        }
        
        // Update the display
        filteredItems = [...allItems];
        renderItems();
        updateResultsCount();
        closeAddItemModal();
        
        // Show success message
        showSuccessMessage('Item added successfully!');
        
    } catch (error) {
        console.error('Error adding item:', error);
        showErrorMessage(`Failed to add item: ${error.message}`);
    }
}

// Success/Error messages
function showSuccessMessage(message) {
    showNotification(message, 'success');
}

function showErrorMessage(message) {
    showNotification(message, 'error');
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        color: white;
        z-index: 1001;
        font-weight: 500;
        background: ${type === 'success' ? '#48bb78' : '#e53e3e'};
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}
