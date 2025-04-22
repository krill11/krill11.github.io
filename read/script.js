let pdfDoc = null;
let pageNum = 1;
let scale = 1.0;
let isWidthFit = true;
let isPageFit = false;
const canvas = document.querySelector('#pdf-render');
const ctx = canvas.getContext('2d');

// Load the PDF
pdfjsLib.getDocument('920London.pdf').promise.then(pdfDoc_ => {
    pdfDoc = pdfDoc_;
    document.querySelector('#page-count').textContent = pdfDoc.numPages;
    renderPage(pageNum);
}).catch(error => {
    console.error('Error loading PDF:', error);
    alert('Error loading PDF. Please check if the file exists and try again.');
});

// Calculate scale for fitting width
function calculateWidthScale(page) {
    const viewport = page.getViewport({ scale: 1 });
    const containerWidth = canvas.parentElement.clientWidth - 40; // Account for padding
    return containerWidth / viewport.width;
}

// Calculate scale for fitting page
function calculatePageScale(page) {
    const viewport = page.getViewport({ scale: 1 });
    const containerHeight = window.innerHeight - 150; // Account for toolbar and padding
    const containerWidth = canvas.parentElement.clientWidth - 40;
    const heightScale = containerHeight / viewport.height;
    const widthScale = containerWidth / viewport.width;
    return Math.min(heightScale, widthScale);
}

// Render the page
function renderPage(num) {
    pdfDoc.getPage(num).then(page => {
        let finalScale = scale;
        
        if (isWidthFit) {
            finalScale = calculateWidthScale(page);
        } else if (isPageFit) {
            finalScale = calculatePageScale(page);
        }

        const viewport = page.getViewport({ scale: finalScale });
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
            canvasContext: ctx,
            viewport: viewport
        };

        page.render(renderContext).promise.then(() => {
            document.querySelector('#page-num').textContent = num;
            document.querySelector('#zoom-level').textContent = Math.round(finalScale * 100) + '%';
        });
    });
}

// Previous page
document.querySelector('#prev-page').addEventListener('click', () => {
    if (pageNum <= 1) return;
    pageNum--;
    renderPage(pageNum);
});

// Next page
document.querySelector('#next-page').addEventListener('click', () => {
    if (pageNum >= pdfDoc.numPages) return;
    pageNum++;
    renderPage(pageNum);
});

// Zoom in
document.querySelector('#zoom-in').addEventListener('click', () => {
    isWidthFit = false;
    isPageFit = false;
    updateFitButtons();
    if (scale >= 3.0) return;
    scale += 0.25;
    renderPage(pageNum);
});

// Zoom out
document.querySelector('#zoom-out').addEventListener('click', () => {
    isWidthFit = false;
    isPageFit = false;
    updateFitButtons();
    if (scale <= 0.5) return;
    scale -= 0.25;
    renderPage(pageNum);
});

// Fit to width
document.querySelector('#fit-width').addEventListener('click', () => {
    isWidthFit = true;
    isPageFit = false;
    updateFitButtons();
    renderPage(pageNum);
});

// Fit to page
document.querySelector('#fit-page').addEventListener('click', () => {
    isWidthFit = false;
    isPageFit = true;
    updateFitButtons();
    renderPage(pageNum);
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
            pageNum++;
            renderPage(pageNum);
        }
        e.preventDefault();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'Backspace') {
        if (pageNum > 1) {
            pageNum--;
            renderPage(pageNum);
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
            renderPage(pageNum);
        }
    }, 200);
}); 