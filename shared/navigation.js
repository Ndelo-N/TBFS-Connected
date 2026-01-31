/**
 * TBFS Navigation Manager
 * Provides consistent navigation across all pages
 * Handles keyboard shortcuts, swipe gestures, and active state
 * 
 * Version: 2.0.0 (Multi-Page Architecture)
 */

class NavigationManager {
    static pages = [
        { 
            id: 'dashboard', 
            title: '📊 Dashboard', 
            url: 'index.html',
            description: 'Portfolio overview and quick stats'
        },
        { 
            id: 'calculator', 
            title: '💳 Calculator', 
            url: 'calculator.html',
            description: 'Calculate new loans'
        },
        { 
            id: 'loans', 
            title: '💰 Active Loans', 
            url: 'active-loans.html',
            description: 'Manage loan payments'
        },
        { 
            id: 'stockvel', 
            title: '🎁 Stockvel', 
            url: 'stockvel.html',
            description: 'Member management'
        },
        { 
            id: 'clients', 
            title: '👥 Clients', 
            url: 'clients.html',
            description: 'Client database'
        },
        { 
            id: 'reports', 
            title: '📈 Reports', 
            url: 'reports.html',
            description: 'Analytics & reports'
        },
        { 
            id: 'income-table', 
            title: '💵 Income Table', 
            url: 'loan-income-calculator.html',
            description: 'Income projections'
        },
        { 
            id: 'settings', 
            title: '⚙️ Settings', 
            url: 'settings.html',
            description: 'Backup & configuration'
        }
    ];
    
    /**
     * Render navigation HTML
     */
    static render(currentPageId) {
        return `
            <header class="app-header">
                <div class="header-content">
                    <div class="logo-section">
                        <img src="TBFS_Logo.png" alt="TBFS" class="logo" onerror="this.style.display='none'">
                    </div>
                    
                    <button class="hamburger" onclick="Navigation.toggleMenu()" aria-label="Toggle menu">
                        <span></span>
                        <span></span>
                        <span></span>
                    </button>
                    
                    <nav class="main-nav" id="mainNav">
                        ${this.pages.map(page => `
                            <a href="${page.url}" 
                               class="nav-item ${page.id === currentPageId ? 'active' : ''}"
                               data-page="${page.id}"
                               title="${page.description}">
                                ${page.title}
                            </a>
                        `).join('')}
                    </nav>
                </div>
            </header>
        `;
    }
    
    /**
     * Initialize navigation (call this on page load)
     */
    static init(currentPageId) {
        // Inject navigation into page
        const headerContainer = document.getElementById('navigation-header');
        if (headerContainer) {
            headerContainer.innerHTML = this.render(currentPageId);
        }
        
        // Set up keyboard shortcuts
        this.setupKeyboardNav();
        
        // Set up swipe gestures for mobile
        this.setupSwipeNav();
        
        // Set up responsive menu
        this.setupResponsiveMenu();
        
        // Handle hash-based redirects (backwards compatibility)
        this.handleLegacyHashRouting();
        
        // Ensure hamburger menu works after DOM injection
        setTimeout(() => {
            const hamburger = document.querySelector('.hamburger');
            const nav = document.getElementById('mainNav');
            if (hamburger && nav) {
                // Remove any existing listeners and add fresh one
                const newHamburger = hamburger.cloneNode(true);
                hamburger.parentNode.replaceChild(newHamburger, hamburger);
                newHamburger.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.toggleMenu();
                });
            }
        }, 100);
        
        console.log(`🧭 Navigation initialized for page: ${currentPageId}`);
    }
    
    /**
     * Get current page index
     */
    static getCurrentPageIndex(currentPageId) {
        return this.pages.findIndex(p => p.id === currentPageId);
    }
    
    /**
     * Navigate to previous page
     */
    static navigatePrevious() {
        const currentPage = this.getCurrentPage();
        const currentIndex = this.getCurrentPageIndex(currentPage);
        
        if (currentIndex > 0) {
            const prevPage = this.pages[currentIndex - 1];
            this.navigateTo(prevPage.url);
        }
    }
    
    /**
     * Navigate to next page
     */
    static navigateNext() {
        const currentPage = this.getCurrentPage();
        const currentIndex = this.getCurrentPageIndex(currentPage);
        
        if (currentIndex < this.pages.length - 1) {
            const nextPage = this.pages[currentIndex + 1];
            this.navigateTo(nextPage.url);
        }
    }
    
    /**
     * Navigate to specific URL
     */
    static navigateTo(url) {
        window.location.href = url;
    }
    
    /**
     * Get current page ID from URL
     */
    static getCurrentPage() {
        const currentURL = window.location.pathname;
        const filename = currentURL.split('/').pop() || 'index.html';
        
        // Map filename to page ID
        const page = this.pages.find(p => p.url === filename);
        return page ? page.id : 'dashboard';
    }
    
    /**
     * Set up keyboard navigation (Arrow keys)
     */
    static setupKeyboardNav() {
        document.addEventListener('keydown', (e) => {
            // Only if not typing in input field
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }
            
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                this.navigatePrevious();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                this.navigateNext();
            }
        });
        
        console.log('⌨️ Keyboard navigation enabled (Arrow Left/Right)');
    }
    
    /**
     * Set up swipe navigation for mobile
     */
    static setupSwipeNav() {
        let touchStartX = 0;
        let touchEndX = 0;
        const minSwipeDistance = 50;
        
        document.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });
        
        document.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            this.handleSwipe(touchStartX, touchEndX, minSwipeDistance);
        }, { passive: true });
        
        console.log('👆 Swipe navigation enabled (swipe left/right)');
    }
    
    /**
     * Handle swipe gesture
     */
    static handleSwipe(startX, endX, minDistance) {
        const deltaX = endX - startX;
        
        if (Math.abs(deltaX) > minDistance) {
            if (deltaX > 0) {
                // Swipe right = previous page
                this.navigatePrevious();
            } else {
                // Swipe left = next page
                this.navigateNext();
            }
        }
    }
    
    /**
     * Toggle mobile menu
     */
    static toggleMenu() {
        const nav = document.getElementById('mainNav');
        const hamburger = document.querySelector('.hamburger');
        
        if (nav && hamburger) {
            const isActive = nav.classList.contains('active');
            if (isActive) {
                nav.classList.remove('active');
                hamburger.classList.remove('active');
            } else {
                nav.classList.add('active');
                hamburger.classList.add('active');
            }
            console.log('🍔 Menu toggled:', nav.classList.contains('active') ? 'open' : 'closed');
        } else {
            console.error('❌ Navigation elements not found:', { nav: !!nav, hamburger: !!hamburger });
        }
    }
    
    /**
     * Set up responsive menu behavior
     */
    static setupResponsiveMenu() {
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            const nav = document.getElementById('mainNav');
            const hamburger = document.querySelector('.hamburger');
            
            if (nav && hamburger) {
                const isClickInsideNav = nav.contains(e.target);
                const isClickOnHamburger = hamburger.contains(e.target);
                
                if (!isClickInsideNav && !isClickOnHamburger && nav.classList.contains('active')) {
                    nav.classList.remove('active');
                    hamburger.classList.remove('active');
                }
            }
        });
        
        // Close menu when link clicked
        const navLinks = document.querySelectorAll('.nav-item');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                const nav = document.getElementById('mainNav');
                const hamburger = document.querySelector('.hamburger');
                
                if (nav && hamburger) {
                    nav.classList.remove('active');
                    hamburger.classList.remove('active');
                }
            });
        });
    }
    
    /**
     * Handle legacy hash-based URLs (backwards compatibility)
     */
    static handleLegacyHashRouting() {
        if (window.location.hash) {
            const hashMap = {
                '#dashboard': 'index.html',
                '#calculator': 'calculator.html',
                '#loans': 'active-loans.html',
                '#stockvel': 'stockvel.html',
                '#clients': 'clients.html',
                '#reports': 'reports.html',
                '#income-table': 'loan-income-calculator.html',
                '#settings': 'settings.html'
            };
            
            const newPage = hashMap[window.location.hash];
            if (newPage) {
                console.log(`🔄 Redirecting from legacy hash URL: ${window.location.hash} → ${newPage}`);
                window.location.href = newPage;
            }
        }
    }
    
    /**
     * Show loading indicator during navigation
     */
    static showLoading() {
        document.body.classList.add('navigating');
    }
    
    /**
     * Hide loading indicator
     */
    static hideLoading() {
        document.body.classList.remove('navigating');
    }
}

// Make Navigation globally available
window.Navigation = NavigationManager;

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NavigationManager;
}
