// Function to check if a file exists locally
async function checkFileExists(filePath) {
    try {
        const response = await fetch(filePath, { method: 'HEAD' });
        return response.ok;
    } catch (error) {
        return false;
    }
}

// Function to get the local file path from a Supabase URL
function getLocalFilePath(supabaseUrl) {
    try {
        const url = new URL(supabaseUrl);
        const pathParts = url.pathname.split('/');
        const fileName = pathParts[pathParts.length - 1];
        return `files/${fileName}`;
    } catch (error) {
        return null;
    }
}

// Function to load image from either local files or Supabase
async function loadCardImage(supabaseUrl) {
    if (!supabaseUrl) return null;
    
    const localPath = getLocalFilePath(supabaseUrl);
    if (localPath && await checkFileExists(localPath)) {
        console.log(`Loading image from local file: ${localPath}`);
        return localPath;
    }
    console.log(`Loading image from Supabase: ${supabaseUrl}`);
    return supabaseUrl;
}

// Function to load card data
async function loadCardData(cardId) {
    try {
        // First try to load from local CSV
        const response = await fetch('files/cards_rows.csv');
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
                            cardData[header] = JSON.parse(cardRow[index]);
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
        // First try to load from local CSV
        const response = await fetch('files/cards_rows.csv');
        if (response.ok) {
            console.log('Loading all cards from local CSV file');
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
            
            // Process all rows except header
            const cards = [];
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (row.length === headers.length) {
                    const cardData = {};
                    headers.forEach((header, index) => {
                        if (header === 'abilities') {
                            try {
                                cardData[header] = JSON.parse(row[index]);
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
            
            console.log(`Loaded ${cards.length} cards from local CSV`);
            return cards;
        }
        
        // Fallback to Supabase if local load fails
        console.log('Loading all cards from Supabase');
        const { data, error } = await supabase
            .from('cards')
            .select('*');
            
        if (error) throw error;
        return data;
        
    } catch (error) {
        console.error('Error loading all cards:', error);
        return [];
    }
}

// Make functions available globally
window.loadCardData = loadCardData;
window.loadAllCards = loadAllCards; 