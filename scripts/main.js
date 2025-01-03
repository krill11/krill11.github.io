class BlogPost {
    constructor(filename) {
        const [, date, ...titleParts] = filename.replace('.md', '').split('-');
        this.date = date;
        this.title = titleParts.join(' ').replace(/-/g, ' ');
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
                    <a href="#" class="read-more" data-post="${this.filename}">Read More →</a>
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
                <a href="#" class="back-link">← Back to Posts</a>
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
        this.posts = [];
        this.blogPostsElement = document.getElementById('blog-posts');
        this.setupEventListeners();
    }

    async init() {
        try {
            const response = await fetch('posts/index.json');
            const files = await response.json();
            
            this.posts = files
                .filter(file => file.endsWith('.md'))
                .map(file => new BlogPost(file));

            await Promise.all(this.posts.map(post => post.load()));
            this.posts.sort((a, b) => new Date(b.date) - new Date(a.date));
            this.renderPosts();
        } catch (error) {
            console.error('Error initializing blog:', error);
            this.blogPostsElement.innerHTML = '<p>Error loading blog posts.</p>';
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
const blog = new Blog();
blog.init();