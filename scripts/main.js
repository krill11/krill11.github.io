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
                <h2>${this.title}</h2>
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
        this.blogPostsElement = document.querySelector('main');
        this.setupEventListeners();
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
            this.renderPosts();
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
    }

    renderSinglePost(filename) {
        const post = this.posts.find(p => p.filename === filename);
        if (post) {
            this.blogPostsElement.innerHTML = post.toFullHTML();
        }
    }

    setupEventListeners() {
        this.blogPostsElement.addEventListener('click', (e) => {
            e.preventDefault();
            if (e.target.classList.contains('read-more')) {
                const filename = e.target.dataset.post;
                this.renderSinglePost(filename);
                window.scrollTo(0, 0);
            } else if (e.target.classList.contains('back-link')) {
                this.renderPosts();
                window.scrollTo(0, 0);
            }
        });
    }
}

// Initialize the blog
document.addEventListener('DOMContentLoaded', () => {
    const blog = new Blog();
    blog.init();
});