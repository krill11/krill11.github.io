// Simple nav highlight and content placeholder
const navBtns = document.querySelectorAll('.nav-btn');
const mainContent = document.getElementById('main-content');

navBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    navBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    // Placeholder content swap
    if (btn.textContent === 'About Us') {
      mainContent.innerHTML = '<div style="margin-top:100px;text-align:center;font-size:1.3em;color:#222;">about us splash page to be written later</div>';
    } else if (btn.textContent === 'Home') {
      mainContent.innerHTML = `
        <div class="issue-card">
          <div class="issue-title">issue #1</div>
        </div>
        <div class="issue-actions">
          <button>Read</button>
          <button>Download PDF</button>
        </div>
        <div class="pagination">
          <button>1</button>
          <button>2</button>
          <button>3</button>
          <button>4</button>
          <button>&gt;</button>
          <button>&gt;&gt;</button>
        </div>
      `;
    } else {
      mainContent.innerHTML = `<div style="margin-top:100px;text-align:center;font-size:1.3em;color:#222;">${btn.textContent} page placeholder</div>`;
    }
  });
});