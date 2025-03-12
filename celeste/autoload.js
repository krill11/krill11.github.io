// Function to automatically load required files
async function autoLoadFiles() {
    try {
        // Load wasm.pak
        const wasmResponse = await fetch('wasm.pak');
        if (!wasmResponse.ok) {
            throw new Error(`Failed to load wasm.pak: ${wasmResponse.status}`);
        }
        const wasmBlob = await wasmResponse.blob();
        const wasmFile = new File([wasmBlob], 'wasm.pak');

        // Load english.txt
        const englishResponse = await fetch('english.txt');
        if (!englishResponse.ok) {
            throw new Error(`Failed to load english.txt: ${englishResponse.status}`);
        }
        const englishBlob = await englishResponse.blob();
        const englishFile = new File([englishBlob], 'english.txt');

        // Create custom events to simulate file selection
        const wasmEvent = new CustomEvent('fileSelected', { detail: { file: wasmFile, type: 'wasm' } });
        const englishEvent = new CustomEvent('fileSelected', { detail: { file: englishFile, type: 'english' } });

        // Dispatch events in sequence
        window.dispatchEvent(wasmEvent);
        window.dispatchEvent(englishEvent);
    } catch (error) {
        console.error('Error loading files:', error);
    }
}

// Start loading files when the page is ready
document.addEventListener('DOMContentLoaded', autoLoadFiles); 