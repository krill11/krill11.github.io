// Function to automatically load and decrypt required files
async function autoLoadFiles() {
    try {
        // Load data.data
        const dataResponse = await fetch('https://github.com/MercuryWorkshop/celeste-wasm/releases/download/v0.9/data.data');
        const dataBlob = await dataResponse.blob();
        const dataFile = new File([dataBlob], 'data.data');

        // Load wasm.pak
        const wasmResponse = await fetch('wasm.pak');
        const wasmBlob = await wasmResponse.blob();
        const wasmFile = new File([wasmBlob], 'wasm.pak');

        // Load english.txt
        const englishResponse = await fetch('english.txt');
        const englishBlob = await englishResponse.blob();
        const englishFile = new File([englishBlob], 'english.txt');

        // Create custom events to simulate file selection
        const dataEvent = new CustomEvent('fileSelected', { detail: { file: dataFile, type: 'data' } });
        const wasmEvent = new CustomEvent('fileSelected', { detail: { file: wasmFile, type: 'wasm' } });
        const englishEvent = new CustomEvent('fileSelected', { detail: { file: englishFile, type: 'english' } });

        // Dispatch events in sequence
        window.dispatchEvent(dataEvent);
        window.dispatchEvent(wasmEvent);
        window.dispatchEvent(englishEvent);
    } catch (error) {
        console.error('Error loading files:', error);
    }
}

// Start loading files when the page is ready
document.addEventListener('DOMContentLoaded', autoLoadFiles); 