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

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    loadItems();
    setupSearch();
});

// Load items from JSON
async function loadItems() {
    try {
        const response = await fetch('./items.json');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data || !data.items || !Array.isArray(data.items)) {
            throw new Error('Invalid data format');
        }
        
        allItems = data.items;
        filteredItems = [...allItems];
        
        console.log(`Loaded ${allItems.length} items successfully`);
        
        renderItems();
        updateResultsCount();
        hideLoading();
        
    } catch (error) {
        console.error('Error loading items:', error);
        showError(`Failed to load items: ${error.message}. Please refresh the page.`);
    }
}

// Render items in the table
function renderItems() {
    if (filteredItems.length === 0) {
        showNoResults();
        return;
    }
    
    hideNoResults();
    
    const html = filteredItems.map(item => `
        <tr>
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
    `).join('');
    
    tableBody.innerHTML = html;
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
