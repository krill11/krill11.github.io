document.addEventListener('DOMContentLoaded', async () => {
    const gallery = document.getElementById('card-gallery');
    const MAX_CARDS = 16;
    
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

function generateCardHTML(card) {
    return `
        ${card.background_art ? `<img src="${card.background_art}" alt="Background" class="card-background">` : ''}
        <div class="card-header">
            <div class="header-left">
                <img src="${card.team_logo}" alt="Team Logo" class="team-logo">
                <h2 class="robot-name">${card.name}</h2>
            </div>
            <span class="solo-score">${card.solo_score}</span>
        </div>
        <img src="${card.image}" alt="${card.name}" class="robot-image">
        <div class="card-content">
            <div class="abilities">
                ${card.abilities.map(ability => `
                    <span class="ability">${ability}</span>
                `).join('')}
            </div>
            <p class="description">${card.description}</p>
        </div>
    `;
}

function showCardDetails(card) {
    console.log('Full card data:', card);
    const overlay = document.getElementById('card-overlay');
    if (!overlay) {
        console.error('Overlay element not found');
        return;
    }

    const overlayCard = overlay.querySelector('.overlay-card');
    const overlayContent = overlay.querySelector('.overlay-content');
    
    if (!overlayCard || !overlayContent) {
        console.error('Overlay child elements not found:', {
            overlayCard: !!overlayCard,
            overlayContent: !!overlayContent
        });
        return;
    }
    
    // Show the basic card info
    overlayCard.innerHTML = generateCardHTML(card);
    
    // Update detailed info
    const specs = card.detailed_specs || 'No specifications available';
    const achievements = card.achievements || 'No achievements listed';
    const facts = card.fun_facts || 'No fun facts available';
    
    console.log('Setting details:', { specs, achievements, facts });
    
    // Get all elements first and check if they exist
    const elements = {
        detailedSpecs: overlay.querySelector('.detailed-specs'),
        achievements: overlay.querySelector('.achievements'),
        funFacts: overlay.querySelector('.fun-facts')
    };

    // Log which elements were found
    console.log('Found elements:', {
        detailedSpecs: !!elements.detailedSpecs,
        achievements: !!elements.achievements,
        funFacts: !!elements.funFacts
    });

    // Only update elements that exist
    if (elements.detailedSpecs) elements.detailedSpecs.textContent = specs;
    if (elements.achievements) elements.achievements.textContent = achievements;
    if (elements.funFacts) elements.funFacts.textContent = facts;
    
    // Apply card's font color to all text in the overlay
    try {
        overlayContent.style.color = card.font_color;
    } catch (error) {
        console.error('Error setting overlay color:', error);
    }
    
    // Show overlay
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
} 