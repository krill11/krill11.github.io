let pdfDoc = null;
let pageNum = parseInt(localStorage.getItem('920london_page')) || 1;
let scale = parseFloat(localStorage.getItem('920london_scale')) || 1.0;
let isWidthFit = localStorage.getItem('920london_width_fit') === 'true' || false;
let isPageFit = localStorage.getItem('920london_page_fit') !== 'false';  // default true if not set
const canvas = document.querySelector('#pdf-render');
const ctx = canvas.getContext('2d');

// Create second canvas for two-page spread
const canvas2 = document.createElement('canvas');
const ctx2 = canvas2.getContext('2d');
canvas.parentElement.appendChild(canvas2);
canvas2.style.marginLeft = '10px';

// Save current state
function saveState() {
    localStorage.setItem('920london_page', pageNum);
    localStorage.setItem('920london_scale', scale);
    localStorage.setItem('920london_width_fit', isWidthFit);
    localStorage.setItem('920london_page_fit', isPageFit);
}

// Load the PDF
pdfjsLib.getDocument('920London.pdf').promise.then(pdfDoc_ => {
    pdfDoc = pdfDoc_;
    document.querySelector('#page-count').textContent = pdfDoc.numPages;
    
    // Ensure saved page number is valid
    if (pageNum > pdfDoc.numPages) {
        pageNum = 1;
        saveState();
    }
    
    renderPages(pageNum);
    updateFitButtons(); // Update buttons to match restored state
}).catch(error => {
    console.error('Error loading PDF:', error);
    alert('Error loading PDF. Please check if the file exists and try again.');
});

// Calculate scale for fitting width
function calculateWidthScale(viewport1, viewport2 = null) {
    const containerWidth = canvas.parentElement.clientWidth - 50; // Account for padding and gap
    if (viewport2) {
        return containerWidth / (viewport1.width * 2 + 10);
    }
    return containerWidth / viewport1.width;
}

// Calculate scale for fitting page
function calculatePageScale(viewport1, viewport2 = null) {
    const containerHeight = window.innerHeight - 150; // Account for toolbar and padding
    const containerWidth = canvas.parentElement.clientWidth - 50;
    
    let totalWidth = viewport1.width;
    if (viewport2) {
        totalWidth = viewport1.width * 2 + 10;
    }
    
    const heightScale = containerHeight / viewport1.height;
    const widthScale = containerWidth / totalWidth;
    return Math.min(heightScale, widthScale);
}

// Render the pages
async function renderPages(num) {
    try {
        // Clear second canvas if we're showing first page (cover)
        if (num === 1) {
            canvas2.width = 0;
            canvas2.height = 0;
            canvas2.style.display = 'none';
        } else {
            canvas2.style.display = 'inline-block';
        }

        // Get the current page
        const page1 = await pdfDoc.getPage(num);
        const viewport1 = page1.getViewport({ scale: 1 });
        
        // Get the next page if we're not on the cover
        let page2 = null;
        let viewport2 = null;
        if (num !== 1 && num + 1 <= pdfDoc.numPages) {
            page2 = await pdfDoc.getPage(num + 1);
            viewport2 = page2.getViewport({ scale: 1 });
        }

        // Calculate the scale
        let finalScale = scale;
        if (isWidthFit) {
            finalScale = calculateWidthScale(viewport1, viewport2);
        } else if (isPageFit) {
            finalScale = calculatePageScale(viewport1, viewport2);
        }

        // Set up first canvas
        const scaledViewport1 = page1.getViewport({ scale: finalScale });
        canvas.height = scaledViewport1.height;
        canvas.width = scaledViewport1.width;

        // Render first page
        await page1.render({
            canvasContext: ctx,
            viewport: scaledViewport1
        }).promise;

        // Render second page if applicable
        if (page2) {
            const scaledViewport2 = page2.getViewport({ scale: finalScale });
            canvas2.height = scaledViewport2.height;
            canvas2.width = scaledViewport2.width;

            await page2.render({
                canvasContext: ctx2,
                viewport: scaledViewport2
            }).promise;
        }

        // Update page numbers
        document.querySelector('#page-num').textContent = num + (page2 ? '-' + (num + 1) : '');
        document.querySelector('#zoom-level').textContent = Math.round(finalScale * 100) + '%';
        
        // Save state after successful render
        saveState();
    } catch (err) {
        console.error('Error rendering pages:', err);
    }
}

// Previous page
document.querySelector('#prev-page').addEventListener('click', () => {
    if (pageNum <= 1) return;
    pageNum = pageNum === 2 ? 1 : pageNum - 2;
    renderPages(pageNum);
});

// Next page
document.querySelector('#next-page').addEventListener('click', () => {
    if (pageNum >= pdfDoc.numPages) return;
    pageNum = pageNum === 1 ? 2 : pageNum + 2;
    renderPages(pageNum);
});

// Zoom in
document.querySelector('#zoom-in').addEventListener('click', () => {
    isWidthFit = false;
    isPageFit = false;
    updateFitButtons();
    if (scale >= 3.0) return;
    scale += 0.25;
    renderPages(pageNum);
});

// Zoom out
document.querySelector('#zoom-out').addEventListener('click', () => {
    isWidthFit = false;
    isPageFit = false;
    updateFitButtons();
    if (scale <= 0.5) return;
    scale -= 0.25;
    renderPages(pageNum);
});

// Fit to width
document.querySelector('#fit-width').addEventListener('click', () => {
    isWidthFit = true;
    isPageFit = false;
    updateFitButtons();
    renderPages(pageNum);
});

// Fit to page
document.querySelector('#fit-page').addEventListener('click', () => {
    isWidthFit = false;
    isPageFit = true;
    updateFitButtons();
    renderPages(pageNum);
});

// Update fit buttons active state
function updateFitButtons() {
    document.querySelector('#fit-width').classList.toggle('active', isWidthFit);
    document.querySelector('#fit-page').classList.toggle('active', isPageFit);
}

// Handle keyboard navigation
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
        if (pageNum < pdfDoc.numPages) {
            pageNum = pageNum === 1 ? 2 : pageNum + 2;
            renderPages(pageNum);
        }
        e.preventDefault();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'Backspace') {
        if (pageNum > 1) {
            pageNum = pageNum === 2 ? 1 : pageNum - 2;
            renderPages(pageNum);
        }
        e.preventDefault();
    }
});

// Handle window resize
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        if (isWidthFit || isPageFit) {
            renderPages(pageNum);
        }
    }, 200);
}); 