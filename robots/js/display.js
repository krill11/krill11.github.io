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
        cardElement.style.fontFamily = card.font_family || "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
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