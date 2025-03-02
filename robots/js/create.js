document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('card-form');
    const addAbilityBtn = document.getElementById('add-ability');
    const abilitiesContainer = document.getElementById('abilities-container');
    const previewCard = document.getElementById('preview-card');

    // Handle image uploads and previews
    const robotImageInput = document.getElementById('robotImage');
    const teamLogoInput = document.getElementById('teamLogo');
    const robotImagePreview = document.getElementById('robotImagePreview');
    const teamLogoPreview = document.getElementById('teamLogoPreview');

    let robotImageData = '';
    let teamLogoData = '';

    // Add new image upload handlers
    const backgroundArtInput = document.getElementById('backgroundArt');
    const backgroundArtPreview = document.getElementById('backgroundArtPreview');
    let backgroundArtData = '';

    // Function to handle file selection and create preview
    async function handleImageUpload(file, previewElement) {
        if (!file) {
            previewElement.style.display = 'none';
            return '';
        }

        // Add file validation
        if (!file.type.startsWith('image/')) {
            throw new Error('Please upload only image files');
        }

        // Check file size
        const MAX_SIZE = 5 * 1024 * 1024; // 5MB
        if (file.size > MAX_SIZE) {
            throw new Error('File size must be less than 5MB');
        }

        try {
            // Create an image element to load the file
            const img = new Image();
            const imageUrl = URL.createObjectURL(file);
            
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = imageUrl;
            });

            // Set maximum dimensions
            const MAX_WIDTH = 1200;
            const MAX_HEIGHT = 1200;
            
            // Calculate new dimensions while maintaining aspect ratio
            let width = img.width;
            let height = img.height;
            
            if (width > MAX_WIDTH) {
                height = Math.round(height * (MAX_WIDTH / width));
                width = MAX_WIDTH;
            }
            if (height > MAX_HEIGHT) {
                width = Math.round(width * (MAX_HEIGHT / height));
                height = MAX_HEIGHT;
            }

            // Create canvas and resize image
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            
            // Use better quality settings
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            // Clear canvas with transparency if PNG
            if (file.type === 'image/png') {
                ctx.clearRect(0, 0, width, height);
            }
            
            ctx.drawImage(img, 0, 0, width, height);

            // Convert to blob with appropriate format
            const blob = await new Promise(resolve => {
                if (file.type === 'image/png') {
                    canvas.toBlob(resolve, 'image/png'); // Keep PNG format for transparency
                } else {
                    canvas.toBlob(resolve, 'image/jpeg', 0.85); // Use JPEG for other images
                }
            });

            // Clean up
            URL.revokeObjectURL(imageUrl);

            // Upload to Supabase Storage
            const { data, error } = await supabase.storage
                .from('cards')
                .upload(`${Date.now()}-${file.name}`, blob);

            if (error) throw error;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('cards')
                .getPublicUrl(data.path);

            // Show preview
            previewElement.src = URL.createObjectURL(blob);
            previewElement.style.display = 'block';

            return publicUrl;
        } catch (error) {
            console.error('Error processing image:', error);
            throw error;
        }
    }

    robotImageInput.addEventListener('change', async (e) => {
        try {
            robotImageData = await handleImageUpload(e.target.files[0], robotImagePreview);
            updatePreview();
        } catch (error) {
            alert(error.message);
        }
    });

    teamLogoInput.addEventListener('change', async (e) => {
        try {
            teamLogoData = await handleImageUpload(e.target.files[0], teamLogoPreview);
            updatePreview();
        } catch (error) {
            alert(error.message);
        }
    });

    backgroundArtInput.addEventListener('change', async (e) => {
        try {
            backgroundArtData = await handleImageUpload(e.target.files[0], backgroundArtPreview);
            updatePreview();
        } catch (error) {
            alert(error.message);
        }
    });

    // Add ability input field
    addAbilityBtn.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'ability-input';
        abilitiesContainer.insertBefore(input, addAbilityBtn);
    });

    // Preview card as user types
    form.addEventListener('input', (e) => {
        if (e.target.type !== 'file') {
            updatePreview();
        }
    });

    // Handle form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
            // Check rate limit first
            await checkRateLimit();
            
            if (!robotImageData || !teamLogoData) {
                alert('Please upload both a robot image and team logo');
                return;
            }

            const card = {
                name: document.getElementById('robotName').value,
                image: robotImageData,
                team_logo: teamLogoData,
                background_art: backgroundArtData || null,
                solo_score: parseInt(document.getElementById('soloScore').value),
                background: document.getElementById('background').value,
                font_color: document.getElementById('fontColor').value,
                description: document.getElementById('description').value,
                abilities: Array.from(document.querySelectorAll('.ability-input'))
                    .map(input => input.value)
                    .filter(value => value.trim() !== ''),
                is_holographic: document.getElementById('isHolographic').checked,
                font_family: document.getElementById('fontFamily').value,
                detailed_specs: document.getElementById('detailedSpecs').value,
                achievements: document.getElementById('achievements').value,
                fun_facts: document.getElementById('funFacts').value,
            };
            console.log('Saving card with details:', card);

            // Save to Supabase
            const { error } = await supabase
                .from('cards')
                .insert([card]);

            if (error) {
                console.error('Detailed error:', error);
                throw error;
            }

            // Redirect to homepage
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Error saving card:', error);
            alert(`Error saving card: ${error.message}`);
        }
    });

    function updatePreview() {
        const card = {
            name: document.getElementById('robotName').value,
            image: robotImageData || 'data:image/svg+xml;base64,PHN2Zy8+',
            team_logo: teamLogoData || 'data:image/svg+xml;base64,PHN2Zy8+',
            background_art: backgroundArtData || '',
            solo_score: document.getElementById('soloScore').value,
            background: document.getElementById('background').value,
            font_color: document.getElementById('fontColor').value,
            description: document.getElementById('description').value,
            abilities: Array.from(document.querySelectorAll('.ability-input'))
                .map(input => input.value)
                .filter(value => value.trim() !== ''),
            is_holographic: document.getElementById('isHolographic').checked,
            font_family: document.getElementById('fontFamily').value,
        };

        previewCard.innerHTML = generateCardHTML(card);
        previewCard.style.backgroundColor = card.background;
        previewCard.style.color = card.font_color;
        previewCard.style.fontFamily = card.font_family;
        if (card.is_holographic) {
            previewCard.classList.add('holographic');
        } else {
            previewCard.classList.remove('holographic');
        }
    }
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

async function checkRateLimit() {
    const { data: uploads, error } = await supabase
        .from('cards')
        .select('created_at')
        .gte('created_at', new Date(Date.now() - RATE_LIMIT_MINUTES * 60000).toISOString());

    if (uploads?.length >= MAX_UPLOADS_PER_WINDOW) {
        throw new Error(`Please wait ${RATE_LIMIT_MINUTES} minutes before creating another card`);
    }
} 