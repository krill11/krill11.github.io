class BlogPost {
    constructor(filename) {
        // Extract date from filename format: YYYY-MM-DD-title.md
        const dateMatch = filename.match(/^(\d{4}-\d{2}-\d{2})/);
        this.date = dateMatch ? dateMatch[1] : null;
        
        // Get title by removing date and .md, then replace hyphens with spaces
        this.title = filename
            .replace(/^\d{4}-\d{2}-\d{2}-/, '')
            .replace('.md', '')
            .replace(/-/g, ' ');
            
        this.filename = filename;
        this.content = '';
    }

    async load() {
        try {
            const response = await fetch(`posts/${this.filename}`);
            this.content = await response.text();
            
            // Extract the first image from the markdown if it exists
            const imageMatch = this.content.match(/!\[.*?\]\((.*?)\)/);
            this.image = imageMatch ? imageMatch[1] : 'images/default.jpg';
            
            // Get the first paragraph for preview
            const paragraphMatch = this.content.match(/(?:^|\n\n)((?![#!\[])[^\n]+)/);
            this.preview = paragraphMatch ? paragraphMatch[1] : '';
        } catch (error) {
            console.error(`Error loading post ${this.filename}:`, error);
        }
    }

    toHTML() {
        return `
            <article class="post">
                <img src="${this.image}" alt="${this.title}">
                <div class="post-content">
                    <h2>${this.title}</h2>
                    <div class="post-meta">Posted on ${this.formatDate()}</div>
                    <p>${this.preview}</p>
                    <a href="#" class="button read-more" data-post="${this.filename}">Read More →</a>
                </div>
            </article>
        `;
    }

    toFullHTML() {
        return `
            <article class="post full-post">
                <h2 class="full-title">${this.title}</h2>
                <div class="post-meta">Posted on ${this.formatDate()}</div>
                ${marked.parse(this.content)}
                <a href="#" class="button back-link">← Back to Posts</a>
            </article>
        `;
    }

    formatDate() {
        const date = new Date(this.date);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
}

class Blog {
    constructor() {
        // Constructor remains empty
    }

    async initialize() {
        this.blogPostsElement = document.querySelector('main');
        if (!this.blogPostsElement) {
            console.error('Could not find main element');
            return;
        }
        
        // First load the posts
        await this.init();
        
        // Then set up event listeners
        this.setupEventListeners();
        
        // Finally check URL parameters for post
        const urlParams = new URLSearchParams(window.location.search);
        const postId = urlParams.get('post');
        if (postId && this.posts) {
            const post = this.posts.find(p => p.filename === postId);
            if (post) {
                this.renderSinglePost(postId);
            } else {
                this.renderPosts(); // Fallback if post not found
            }
        } else {
            this.renderPosts();
        }
    }

    async init() {
        try {
            console.log('Attempting to fetch posts/index.json...');
            const response = await fetch('./posts/index.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const files = await response.json();
            console.log('Successfully loaded files:', files);
            
            this.posts = files
                .filter(file => file.endsWith('.md'))
                .map(file => new BlogPost(file));
    
            await Promise.all(this.posts.map(post => post.load()));
            this.posts.sort((a, b) => new Date(b.date) - new Date(a.date));
        } catch (error) {
            console.error('Detailed error:', error);
            this.blogPostsElement.innerHTML = `
                <p style="color: var(--text-secondary); text-align: center; padding: 2rem;">
                    Error: ${error.message}<br>
                    <small>Check the console for more details.</small>
                </p>`;
        }
    }

    renderPosts() {
        this.blogPostsElement.innerHTML = this.posts.map(post => post.toHTML()).join('');
        // Clear URL parameters when showing all posts
        window.history.pushState({}, '', window.location.pathname);
    }

    renderSinglePost(filename) {
        const post = this.posts.find(p => p.filename === filename);
        if (post) {
            this.blogPostsElement.innerHTML = post.toFullHTML();
            // Update URL without reloading page
            const newUrl = `${window.location.pathname}?post=${filename}`;
            window.history.pushState({ post: filename }, '', newUrl);
            window.scrollTo(0, 0);
        }
    }

    setupEventListeners() {
        this.blogPostsElement.addEventListener('click', (e) => {
            e.preventDefault();
            if (e.target.classList.contains('read-more')) {
                const filename = e.target.dataset.post;
                this.renderSinglePost(filename);
            } else if (e.target.classList.contains('back-link')) {
                this.renderPosts();
                window.scrollTo(0, 0);
            }
        });

        // Handle browser back/forward buttons
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.post) {
                this.renderSinglePost(e.state.post);
            } else {
                this.renderPosts();
            }
        });
    }
}

// Initialize the blog
document.addEventListener('DOMContentLoaded', async () => {
    const blog = new Blog();
    await blog.initialize();
});

// Selecting the iframe element
var frame = document.getElementById("Iframe");
            
// Adjusting the iframe height onload event
frame.onload = function() {
    // set the height of the iframe as 
    // the height of the iframe content
    frame.style.height = frame.contentWindow.document.body.scrollHeight + 'px';

    // set the width of the iframe as the 
    // width of the iframe content
    frame.style.width  = frame.contentWindow.document.body.scrollWidth + 'px';
}