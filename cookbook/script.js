document.addEventListener('DOMContentLoaded', () => {
    const carouselContainer = document.getElementById('carousel-container');
    const recipeContent = document.getElementById('recipe-content');
    const searchInput = document.getElementById('recipe-search');
    const searchResults = document.getElementById('search-results');
    const recipeDisplay = document.getElementById('recipe-display');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    
    let activeIndex = 0;
    let startY = 0;
    let isDragging = false;
    let isAnimating = false;
    let recipeCards = [];
    
    // Dark mode toggle
    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        
        // Save preference to localStorage
        if (document.body.classList.contains('dark-theme')) {
            localStorage.setItem('theme', 'dark');
        } else {
            localStorage.setItem('theme', 'light');
        }
    });
    
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.remove('dark-theme');
    } else {
        // Either savedTheme is 'dark' or null (first visit)
        document.body.classList.add('dark-theme');
        localStorage.setItem('theme', 'dark');
    }

    // Allow mouse wheel scrolling in recipe content
    recipeContent.addEventListener('wheel', (e) => {
        // Check if content is scrollable
        const isScrollable = recipeContent.scrollHeight > recipeContent.clientHeight;
        
        if (isScrollable) {
            e.stopPropagation(); // Prevent event from bubbling up to carousel
        }
    });

    // Initialize the carousel with recipe cards
    function initializeCarousel() {
        // Clear any existing cards first
        carouselContainer.innerHTML = '';
        
        recipes.forEach((recipe, index) => {
            const card = document.createElement('div');
            card.classList.add('recipe-card');
            card.dataset.id = recipe.id;
            card.dataset.index = index;
            card.innerHTML = `
                <div class="card-emoji">${recipe.emoji}</div>
                <div class="card-content">
                    <h3 class="card-title">${recipe.title}</h3>
                    <p class="card-description">${recipe.description}</p>
                </div>
            `;
            carouselContainer.appendChild(card);
            
            // Add click event to show recipe
            card.addEventListener('click', () => {
                if (card.classList.contains('active') || isAnimating) {
                    return; // Already active or animation in progress
                }
                
                const targetIndex = parseInt(card.dataset.index);
                
                // Determine which way to rotate based on which card was clicked
                if (card.classList.contains('prev-1') || card.classList.contains('prev-2')) {
                    moveUp();
                } else if (card.classList.contains('next-1') || card.classList.contains('next-2')) {
                    moveDown();
                }
            });
        });
        
        // Store reference to all recipe cards
        recipeCards = Array.from(document.querySelectorAll('.recipe-card'));
        
        // Set initial active card
        setActiveCard(0);
    }

    // Update the carousel display based on the active index
    function updateCarouselDisplay() {
        const cards = Array.from(document.querySelectorAll('.recipe-card'));
        const totalCards = cards.length;
        
        if (totalCards === 0) return;
        
        // Remove all position classes first
        cards.forEach(card => {
            card.classList.remove('active', 'prev-1', 'prev-2', 'prev-3', 'next-1', 'next-2', 'next-3', 'pulse');
            card.style.transform = ''; // Reset any inline transforms
        });
        
        // Calculate indices with modulo for infinite looping
        const mod = (n, m) => ((n % m) + m) % m; // Proper modulo function
        const activeCardIndex = mod(activeIndex, totalCards);
        const prev1Index = mod(activeIndex - 1, totalCards);
        const prev2Index = mod(activeIndex - 2, totalCards);
        const prev3Index = mod(activeIndex - 3, totalCards);
        const next1Index = mod(activeIndex + 1, totalCards);
        const next2Index = mod(activeIndex + 2, totalCards);
        const next3Index = mod(activeIndex + 3, totalCards);
        
        // Apply classes based on position
        cards[activeCardIndex].classList.add('active');
        cards[prev1Index].classList.add('prev-1');
        cards[prev2Index].classList.add('prev-2'); 
        cards[prev3Index].classList.add('prev-3');
        cards[next1Index].classList.add('next-1');
        cards[next2Index].classList.add('next-2');
        cards[next3Index].classList.add('next-3');
        
        // Display the active recipe
        displayRecipe(recipes[activeCardIndex]);
        
        // Activate the recipe display
        recipeDisplay.classList.add('active');
    }

    // Move to previous recipe (up)
    function moveUp() {
        if (isAnimating) return;
        isAnimating = true;
        
        setActiveCard(activeIndex - 1);
        
        // Reset animation flag after transition completes
        setTimeout(() => {
            isAnimating = false;
        }, 400); // Match this with the CSS transition time
    }
    
    // Move to next recipe (down)
    function moveDown() {
        if (isAnimating) return;
        isAnimating = true;
        
        setActiveCard(activeIndex + 1);
        
        // Reset animation flag after transition completes
        setTimeout(() => {
            isAnimating = false;
        }, 400); // Match this with the CSS transition time
    }

    // Set a card as active
    function setActiveCard(index) {
        const totalCards = recipes.length;
        
        // Ensure we're always in bounds with modulo
        activeIndex = ((index % totalCards) + totalCards) % totalCards;
        
        updateCarouselDisplay();
    }
    
    // Activate connection between card and recipe
    function activateConnection() {
        recipeDisplay.classList.add('active');
    }
    
    // Deactivate connection between card and recipe
    function deactivateConnection() {
        recipeDisplay.classList.remove('active');
    }

    // Scroll to specific recipe by index with animation
    function scrollToRecipeByIndex(index) {
        if (isAnimating) return;
        
        // Calculate how many steps to move
        const totalCards = recipes.length;
        const targetIndex = ((index % totalCards) + totalCards) % totalCards;
        
        // Determine shortest path (clockwise or counterclockwise)
        if (activeIndex === targetIndex) {
            // Already at the target card, just pulse it
            const activeCard = document.querySelector('.recipe-card.active');
            activeCard.classList.add('pulse');
            return;
        } else {
            const clockwiseSteps = (targetIndex - activeIndex + totalCards) % totalCards;
            const counterClockwiseSteps = (activeIndex - targetIndex + totalCards) % totalCards;
            
            isAnimating = true;
            
            if (clockwiseSteps <= counterClockwiseSteps) {
                // Move down (clockwise)
                animateToCardExact(targetIndex, 'down');
            } else {
                // Move up (counterclockwise)
                animateToCardExact(targetIndex, 'up');
            }
        }
    }
    
    // Animate directly to target card with smooth transitions
    function animateToCardExact(targetIndex, direction) {
        // Set the target index directly
        activeIndex = targetIndex;
        updateCarouselDisplay();
        
        // Add pulse effect after a short delay
        setTimeout(() => {
            const activeCard = document.querySelector('.recipe-card.active');
            activeCard.classList.add('pulse');
            isAnimating = false;
        }, 500);
    }

    // Display recipe details
    function displayRecipe(recipe) {
        recipeContent.innerHTML = `
            <h2>${recipe.title}</h2>
            <div class="recipe-ingredients">
                <h3>Ingredients</h3>
                <ul>
                    ${recipe.ingredients.map(ingredient => `<li>${ingredient}</li>`).join('')}
                </ul>
            </div>
            <div class="recipe-instructions">
                <h3>Instructions</h3>
                <ol>
                    ${recipe.instructions.map(step => `<li>${step}</li>`).join('')}
                </ol>
            </div>
        `;
    }

    // Handle search input
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        
        if (searchTerm.length < 2) {
            searchResults.classList.remove('active');
            searchResults.innerHTML = '';
            return;
        }
        
        // Filter recipes based on search term
        const matchedRecipes = recipes.filter(recipe => 
            recipe.title.toLowerCase().includes(searchTerm) || 
            recipe.description.toLowerCase().includes(searchTerm) ||
            recipe.ingredients.some(ingredient => ingredient.toLowerCase().includes(searchTerm))
        );
        
        // Display search results
        if (matchedRecipes.length > 0) {
            searchResults.innerHTML = matchedRecipes.map(recipe => `
                <div class="search-result-item" data-index="${recipes.findIndex(r => r.id === recipe.id)}">
                    <span class="item-emoji">${recipe.emoji}</span>
                    <span class="item-title">${recipe.title}</span>
                </div>
            `).join('');
            
            // Add click events to search results
            const resultItems = searchResults.querySelectorAll('.search-result-item');
            resultItems.forEach(item => {
                item.addEventListener('click', () => {
                    const targetIndex = parseInt(item.dataset.index);
                    scrollToRecipeByIndex(targetIndex);
                    searchResults.classList.remove('active');
                    searchInput.value = '';
                });
            });
            
            searchResults.classList.add('active');
        } else {
            searchResults.innerHTML = '<div class="search-result-item">No recipes found</div>';
            searchResults.classList.add('active');
        }
    });
    
    // Close search results when clicking elsewhere
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.classList.remove('active');
        }
    });

    // Handle mouse wheel for scrolling through recipes
    carouselContainer.addEventListener('wheel', (e) => {
        // Prevent default scroll behavior
        e.preventDefault();
        
        if (e.deltaY > 0) {
            // Scroll down, move to next recipe
            moveDown();
        } else {
            // Scroll up, move to previous recipe
            moveUp();
        }
    });

    // Handle touch/drag events for mobile
    carouselContainer.addEventListener('touchstart', (e) => {
        startY = e.touches[0].clientY;
        isDragging = true;
        e.preventDefault();
    }, { passive: false });

    carouselContainer.addEventListener('touchmove', (e) => {
        if (!isDragging || isAnimating) return;
        
        const currentY = e.touches[0].clientY;
        const diffY = currentY - startY;
        
        // If significant drag detected, change recipe
        if (Math.abs(diffY) > 30) {
            if (diffY > 0) {
                // Drag down, move to previous recipe
                moveUp();
            } else {
                // Drag up, move to next recipe
                moveDown();
            }
            isDragging = false;
            startY = currentY;
        }
        
        e.preventDefault();
    }, { passive: false });

    carouselContainer.addEventListener('touchend', () => {
        isDragging = false;
    });

    // Add keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowUp') {
            moveUp();
            e.preventDefault();
        } else if (e.key === 'ArrowDown') {
            moveDown();
            e.preventDefault();
        }
    });

    // Prevent default scroll behavior on the page
    document.addEventListener('wheel', (e) => {
        e.preventDefault();
    }, { passive: false });

    // Initialize the carousel
    initializeCarousel();
}); 