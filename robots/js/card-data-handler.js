// Function to check if a file exists locally
async function checkFileExists(filePath) {
    try {
        console.log('Checking if file exists:', filePath);
        const response = await fetch(filePath);
        const exists = response.ok;
        console.log(`File ${filePath} exists: ${exists}`);
        return exists;
    } catch (error) {
        console.log(`Error checking file ${filePath}:`, error);
        return false;
    }
}

// Function to get the local file path from a Supabase URL
function getLocalFilePath(supabaseUrl) {
    try {
        const url = new URL(supabaseUrl);
        const pathParts = url.pathname.split('/');
        const fileName = pathParts[pathParts.length - 1];
        // Remove any URL encoding from filename
        const decodedFileName = decodeURIComponent(fileName);
        // Use absolute path from domain root
        return `/robots/files/${decodedFileName}`;
    } catch (error) {
        console.log('Error getting local path:', error);
        return null;
    }
}

// Function to load image from either local files or Supabase
async function loadCardImage(supabaseUrl) {
    if (!supabaseUrl) return null;
    
    const localPath = getLocalFilePath(supabaseUrl);
    console.log('Trying local path:', localPath);
    
    if (localPath) {
        // Try with absolute path from domain root
        if (await checkFileExists(localPath)) {
            console.log(`✅ Loading image from local file: ${localPath}`);
            return localPath;
        }
    }
    
    console.log(`❌ Falling back to Supabase URL: ${supabaseUrl}`);
    return supabaseUrl;
}

// Function to load card data
async function loadCardData(cardId) {
    try {
        // First try to load from local CSV
        const response = await fetch('/robots/files/cards_rows.csv');
        if (response.ok) {
            console.log('Loading cards data from local CSV file');
            const csvText = await response.text();
            const rows = csvText.split('\n').map(row => {
                // Parse CSV, handling quoted values that may contain commas
                const values = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
                if (values) {
                    return values.map(val => val.replace(/^"|"$/g, ''));
                }
                return [];
            });
            
            // Find headers
            const headers = rows[0];
            
            // Find the card data
            const cardRow = rows.find(row => row[headers.indexOf('id')] === cardId);
            
            if (cardRow) {
                console.log(`Found card ${cardId} in local CSV`);
                const cardData = {};
                headers.forEach((header, index) => {
                    if (header === 'abilities') {
                        try {
                            const parsed = JSON.parse(cardRow[index]);
                            cardData[header] = Array.isArray(parsed) ? parsed : [];
                        } catch {
                            cardData[header] = [];
                        }
                    } else {
                        cardData[header] = cardRow[index];
                    }
                });
                
                // Load images from local files if available
                cardData.image = await loadCardImage(cardData.image);
                cardData.team_logo = await loadCardImage(cardData.team_logo);
                cardData.background_art = await loadCardImage(cardData.background_art);
                
                return cardData;
            }
        }
        
        // Fallback to Supabase if local load fails
        console.log(`Loading card ${cardId} from Supabase`);
        const { data, error } = await supabase
            .from('cards')
            .select('*')
            .eq('id', cardId)
            .single();
            
        if (error) throw error;
        return data;
        
    } catch (error) {
        console.error('Error loading card data:', error);
        return null;
    }
}

// Function to load all cards
async function loadAllCards() {
    try {
        // Try to load CSV with absolute path
        const csvPath = '/robots/files/cards_rows.csv';
        console.log('Trying to load CSV from:', csvPath);
        
        const response = await fetch(csvPath);
        
        if (response.ok) {
            console.log('✅ Successfully loaded CSV from:', csvPath);
            const csvText = await response.text();
            const rows = csvText.split('\n').map(row => {
                // Parse CSV, handling quoted values that may contain commas
                const values = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
                if (values) {
                    return values.map(val => val.replace(/^"|"$/g, ''));
                }
                return [];
            });
            
            // Find headers
            const headers = rows[0];
            console.log('CSV Headers:', headers);
            
            // Process all rows except header
            const cards = [];
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (row && row.length === headers.length) {
                    const cardData = {};
                    headers.forEach((header, index) => {
                        if (header === 'abilities') {
                            try {
                                const parsed = JSON.parse(row[index]);
                                cardData[header] = Array.isArray(parsed) ? parsed : [];
                            } catch {
                                cardData[header] = [];
                            }
                        } else {
                            cardData[header] = row[index];
                        }
                    });
                    cards.push(cardData);
                }
            }
            
            console.log(`Found ${cards.length} cards in CSV`);
            
            // Process images for all cards
            console.log('Processing card images...');
            for (const card of cards) {
                card.image = await loadCardImage(card.image);
                card.team_logo = await loadCardImage(card.team_logo);
                card.background_art = await loadCardImage(card.background_art);
            }
            
            console.log('✅ Successfully loaded all cards from CSV');
            return cards;
        }
        
        // Fallback to Supabase if local load fails
        console.log('❌ Failed to load CSV locally, falling back to Supabase');
        const { data, error } = await supabase
            .from('cards')
            .select('*');
            
        if (error) throw error;
        return data;
        
    } catch (error) {
        console.error('Error loading cards:', error);
        return [];
    }
}

// Make functions available globally
window.loadCardData = loadAllCards;
window.loadAllCards = loadAllCards; 