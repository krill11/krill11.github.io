document.addEventListener('DOMContentLoaded', async () => {
    const gallery = document.getElementById('card-gallery');
    const MAX_CARDS = 1000;
    
    // Fetch all cards from Supabase
    const { data: allCards, error } = await supabase
        .from('cards')
        .select('*');

    if (error) {
        console.error('Error fetching cards:', error);
        return;
    }

    // Randomly shuffle and limit to MAX_CARDS
    const cards = allCards
        .sort(() => Math.random() - 0.5)
        .slice(0, MAX_CARDS);

    cards.forEach(card => {
        const cardElement = document.createElement('div');
        cardElement.className = 'robot-card';
        if (card.is_holographic) {
            cardElement.classList.add('holographic');
        }
        cardElement.style.backgroundColor = card.background;
        cardElement.style.color = card.font_color;
        
        // Replace SF Pro with system font
        const fontFamily = card.font_family === "'SF Pro Display', -apple-system" 
            ? "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
            : card.font_family;
        
        cardElement.style.fontFamily = fontFamily;
        cardElement.innerHTML = generateCardHTML(card);
        gallery.appendChild(cardElement);

        // Add tilt effect
        cardElement.addEventListener('mousemove', (e) => {
            const rect = cardElement.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            const tiltX = (mouseY / rect.height - 0.5) * 10;
            const tiltY = (mouseX / rect.width - 0.5) * 10;
            
            cardElement.style.transform = `perspective(1000px) rotateX(${-tiltX}deg) rotateY(${tiltY}deg)`;
        });

        cardElement.addEventListener('mouseleave', () => {
            cardElement.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
        });

        // Add click handler for card
        cardElement.addEventListener('click', () => {
            console.log('Card clicked:', card.name);
            showCardDetails(card);
        });
    });

    // Add overlay close handlers
    const overlay = document.getElementById('card-overlay');
    overlay.addEventListener('click', (e) => {
        // Close if clicking the dark overlay background, not the content
        if (e.target === overlay) {
            overlay.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    });
});

// Function to generate card HTML
function generateCardHTML(card) {
    return `
        ${card.background_art ? `<img src="${card.background_art}" alt="Background" class="card-background">` : ''}
        <div class="card-header">
            <div class="header-left">
                ${card.team_logo ? `<img src="${card.team_logo}" alt="Team Logo" class="team-logo">` : ''}
                <h2 class="robot-name">${card.name}</h2>
            </div>
            <span class="solo-score">${card.solo_score}</span>
        </div>
        ${card.image ? `<img src="${card.image}" alt="${card.name}" class="robot-image">` : ''}
        <div class="card-content">
            <div class="abilities">
                ${Array.isArray(card.abilities) ? card.abilities.map(ability => `
                    <span class="ability">${ability}</span>
                `).join('') : ''}
            </div>
            <p class="description">${card.description}</p>
        </div>
    `;
}

// Function to show card details in overlay
function showCardDetails(card) {
    const overlay = document.getElementById('card-overlay');
    const overlayCard = overlay.querySelector('.overlay-card');
    const overlayContent = overlay.querySelector('.overlay-content');
    
    // Show the basic card info
    overlayCard.innerHTML = generateCardHTML(card);
    
    // Apply card styles
    overlayCard.style.backgroundColor = card.background || '#000000';
    overlayCard.style.color = card.font_color || '#ffffff';
    overlayCard.style.fontFamily = card.font_family || 'system-ui';
    if (card.is_holographic) {
        overlayCard.classList.add('holographic');
    }
    
    // Update detailed info
    const elements = {
        detailedSpecs: overlay.querySelector('.detailed-specs'),
        achievements: overlay.querySelector('.achievements'),
        funFacts: overlay.querySelector('.fun-facts')
    };

    if (elements.detailedSpecs) elements.detailedSpecs.textContent = card.detailed_specs || 'No specifications available';
    if (elements.achievements) elements.achievements.textContent = card.achievements || 'No achievements listed';
    if (elements.funFacts) elements.funFacts.textContent = card.fun_facts || 'No fun facts available';
    
    // Apply card's font color to overlay content
    overlayContent.style.color = card.font_color || '#ffffff';
    
    // Show overlay
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// Function to shuffle array
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Function to create a card element
function createCardElement(cardData) {
    const card = document.createElement('div');
    card.className = 'robot-card';
    card.setAttribute('data-card-id', cardData.id);
    
    if (cardData.is_holographic) {
        card.classList.add('holographic');
    }

    // Set inline styles for card-specific colors
    card.style.backgroundColor = cardData.background || '#000000';
    card.style.color = cardData.font_color || '#ffffff';
    card.style.fontFamily = cardData.font_family || 'system-ui';

    // Set card content
    card.innerHTML = generateCardHTML(cardData);
    
    // Add tilt effect
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const tiltX = (mouseY / rect.height - 0.5) * 10;
        const tiltY = (mouseX / rect.width - 0.5) * 10;
        
        card.style.transform = `perspective(1000px) rotateX(${-tiltX}deg) rotateY(${tiltY}deg)`;
    });

    card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
    });

    // Add click handler for overlay
    card.addEventListener('click', () => showCardDetails(cardData));
    
    return card;
}

// Function to load and display all cards
async function displayCards() {
    const gallery = document.getElementById('card-gallery');
    gallery.innerHTML = '<div class="loading">Loading cards...</div>';

    try {
        // Load all cards using the card-data-handler
        let cards = await loadAllCards();
        
        // Clear loading message
        gallery.innerHTML = '';

        // Process images and ensure abilities are arrays for all cards
        for (let card of cards) {
            // Ensure abilities is an array
            if (!Array.isArray(card.abilities)) {
                try {
                    card.abilities = typeof card.abilities === 'string' ? 
                        JSON.parse(card.abilities) : [];
                    if (!Array.isArray(card.abilities)) {
                        card.abilities = [];
                    }
                } catch {
                    card.abilities = [];
                }
            }

            // Process images
            card.image = await loadCardImage(card.image);
            card.team_logo = await loadCardImage(card.team_logo);
            card.background_art = await loadCardImage(card.background_art);
            
            // Create and append card element
            const cardElement = createCardElement(card);
            gallery.appendChild(cardElement);
        }

    } catch (error) {
        console.error('Error displaying cards:', error);
        gallery.innerHTML = '<div class="error">Error loading cards. Please try again later.</div>';
    }
}

// Initialize the gallery when the page loads
document.addEventListener('DOMContentLoaded', displayCards); 