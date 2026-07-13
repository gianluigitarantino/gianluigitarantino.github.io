/**
 * Configurazione principale
 */
const CONFIG = {
    breakpoints: {
        mobile: 1024,
        shortSliderHeight: 380
    },
    selectors: {
        wrapper: '#wrapper',
        menu: '#menu',
        lingua: '#lingua',
        slider: '#slider',
        profileContent: '.profile-content', // Added selector
        slides: '.slides',
        slideImages: '.slide-frame',
        slideCounter: '#slide_counter',
        pivaPolicy: '#piva_policy',
        contatti: '#contatti',
        topbar: '#topbar',
        customCursor: '.custom-cursor',
        navArrowUp: '.nav-arrow.up',
        navArrowDown: '.nav-arrow.down'
    }
};

/**
 * Gestione del Layout Responsivo
 * Si occupa di ridisporre gli elementi del DOM in base alla risoluzione.
 */
class LayoutManager {
    constructor() {
        this.els = {
            wrapper: document.querySelector(CONFIG.selectors.wrapper),
            menu: document.querySelector(CONFIG.selectors.menu),
            lingua: document.querySelector(CONFIG.selectors.lingua),
            slider: document.querySelector(CONFIG.selectors.slider),
            profileContent: document.querySelector(CONFIG.selectors.profileContent), // Select profile content
            piva: document.querySelector(CONFIG.selectors.pivaPolicy),
            contatti: document.querySelector(CONFIG.selectors.contatti)
        };

        // Define the element that triggers height constraint check (Slider OR Profile Content)
        this.heightCheckTarget = this.els.slider || this.els.profileContent;

        this.init();
    }

    init() {
        this.handleResize();
        this.setupActiveLink(); // Evidenzia link attivo
        window.addEventListener('resize', () => this.handleResize());

        // ResizeObserver for the target element
        if (this.heightCheckTarget) {
            const resizeObserver = new ResizeObserver(() => {
                this.checkHeightConstraint();
            });
            resizeObserver.observe(this.heightCheckTarget);
        }

        // Fallback aggiuntivo
        window.addEventListener('load', () => this.handleResize());
    }

    handleResize() {
        if (!this.els.wrapper) return; // Safety check

        const isMobile = window.innerWidth <= CONFIG.breakpoints.mobile;

        if (isMobile) {
            this.setupMobileLayout();
        } else {
            this.restoreDesktopLayout();
        }

        if (this.heightCheckTarget) {
            this.checkHeightConstraint();
        }
    }

    /* ... setupMobileLayout and restoreDesktopLayout remain mostly unchanged, 
       but we need to make sure we don't assume checks strictly on slider existence for layout.
       Actually, the layout logic relocates #slider. It might need to relocate .profile-content too? 
       Wait, profile-content is static in profile.html. 
       Let's look closely at setupMobileLayout. 
       It appends slider to wrapper at end. 
       If profile-content is there, it is ALREADY after menu in DOM usually.
       Let's stick to modifying checkHeightConstraint for this request.
    */

    setupMobileLayout() {
        if (!this.els.wrapper || !this.els.menu || !this.els.lingua || !this.els.piva) return;

        // Evita duplicazioni controllando se esiste già la topbar
        if (document.querySelector(CONFIG.selectors.topbar)) return;

        // 1. Crea topbar
        const topbar = document.createElement("div");
        topbar.id = "topbar";

        // Sposta lingua e menu nella topbar
        topbar.appendChild(this.els.lingua);
        topbar.appendChild(this.els.menu);

        // Inserisci topbar all'inizio
        this.els.wrapper.insertBefore(topbar, this.els.wrapper.firstChild);

        // 2. Sposta contatti dentro p.iva (se contatti esiste)
        if (this.els.contatti) {
            this.els.piva.insertBefore(this.els.contatti, this.els.piva.firstChild);
        }

        // 3. Riorganizza ordine wrapper
        // Se c'è slider, appendilo. Se c'è profile content, lo lasciamo dov'è? 
        // In profile.html: wrapper > menu > profile-content.
        // Menu is moved to topbar. So wrapper contains profile-content.
        // We append piva at the end.

        if (this.els.slider) {
            // Create navigation arrows
            const arrowUp = document.createElement('button');
            arrowUp.className = 'nav-arrow up';
            arrowUp.innerHTML = '<span></span>';
            arrowUp.setAttribute('aria-label', 'Previous slide');

            const arrowDown = document.createElement('button');
            arrowDown.className = 'nav-arrow down';
            arrowDown.innerHTML = '<span></span>';
            arrowDown.setAttribute('aria-label', 'Next slide');

            this.els.wrapper.appendChild(arrowUp);
            this.els.wrapper.appendChild(this.els.slider);
            this.els.wrapper.appendChild(arrowDown);
        }

        this.els.wrapper.appendChild(this.els.piva);
    }

    /* ... setupActiveLink ... */
    setupActiveLink() {
        if (!this.els.menu) return;
        const normalizePath = (path) => path.replace(/\/+$/, '') || '/';
        const currentPath = normalizePath(window.location.pathname);
        const links = this.els.menu.querySelectorAll('#voci_menu a');

        links.forEach(link => {
            const linkPath = normalizePath(new URL(link.href).pathname);
            link.classList.toggle('active', currentPath === linkPath);
        });
    }

    /* ... restoreDesktopLayout ... */
    restoreDesktopLayout() {
        if (!this.els.wrapper || !this.els.menu || !this.els.lingua || !this.els.piva) return;
        const topbar = document.querySelector(CONFIG.selectors.topbar);
        if (!topbar) return;

        // Remove navigation arrows
        const arrows = this.els.wrapper.querySelectorAll('.nav-arrow');
        arrows.forEach(arrow => arrow.remove());

        this.els.wrapper.insertBefore(this.els.menu, this.els.wrapper.firstChild);
        this.els.menu.appendChild(this.els.piva);
        const menuInner = this.els.menu.firstElementChild;

        if (menuInner) {
            const counter = document.querySelector(CONFIG.selectors.slideCounter);
            if (counter && counter.parentNode === menuInner) {
                menuInner.insertBefore(this.els.lingua, counter.nextSibling);
            } else {
                menuInner.appendChild(this.els.lingua);
            }
            if (this.els.contatti) {
                menuInner.appendChild(this.els.contatti);
            }
        }
        topbar.remove();
        // Slider/Profile content returns to flow naturally.
    }

    checkHeightConstraint() {
        if (!this.heightCheckTarget) return;

        // "Rendere la pagina scrollabile quando lo slider (o contenuto) ha un'altezza inferiore ai 380px"
        // Si basa su viewport height.

        const verticalPadding = 180;
        const availableHeight = window.innerHeight - verticalPadding;

        if (availableHeight < CONFIG.breakpoints.shortSliderHeight) {
            document.body.classList.add('scroll-mode');
        } else {
            document.body.classList.remove('scroll-mode');
        }
    }
}

/**
 * Gestione del Cursore Personalizzato
 */
class CursorManager {
    constructor() {
        this.cursor = document.querySelector(CONFIG.selectors.customCursor);
        if (this.cursor) this.init();
    }

    init() {
        // Movimento cursore (Solo Desktop)
        document.addEventListener('mousemove', (e) => this.moveCursor(e));

        // Hover effect sui link
        document.querySelectorAll('a, button').forEach(el => {
            el.addEventListener('mouseenter', () => this.activate());
            el.addEventListener('mouseleave', () => this.deactivate());
        });
    }

    moveCursor(e) {
        if (window.innerWidth <= CONFIG.breakpoints.mobile) {
            this.cursor.style.display = 'none';
            return;
        }
        this.cursor.style.display = 'block';
        this.cursor.style.left = `${e.clientX}px`;
        this.cursor.style.top = `${e.clientY}px`;
    }

    activate() {
        if (window.innerWidth > CONFIG.breakpoints.mobile) {
            this.cursor.classList.add('active');
        }
    }

    deactivate() {
        if (window.innerWidth > CONFIG.breakpoints.mobile) {
            this.cursor.classList.remove('active');
        }
    }

    setDirectional(type) {
        if (!this.cursor) return;
        // type: 'left', 'right', o null
        this.cursor.classList.remove('directional', 'left', 'right');

        if (type && window.innerWidth > CONFIG.breakpoints.mobile) {
            this.cursor.classList.add('directional', type);
        }
    }
}

/**
 * Gestione dello Slider
 */
class SliderManager {
    constructor(cursorManager) {
        this.slider = document.querySelector(CONFIG.selectors.slider);
        if (!this.slider) return;

        this.slidesContainer = this.slider.querySelector(CONFIG.selectors.slides);
        this.slides = this.slider.querySelectorAll(CONFIG.selectors.slideImages);
        this.counter = document.querySelector(CONFIG.selectors.slideCounter);
        this.cursorManager = cursorManager;

        this.currentIndex = 0;
        this.totalSlides = this.slides.length;
        this.isDragging = false;
        this.startX = 0;
        this.isClick = true; // Per distinguere drag da click

        // Touch variables
        this.touchStartVals = { x: 0, y: 0 };
        // Navigation arrows (Mobile)
        this.navUp = document.querySelector(CONFIG.selectors.navArrowUp);
        this.navDown = document.querySelector(CONFIG.selectors.navArrowDown);

        this.init();
    }

    init() {
        // Eventi Mouse (Desktop)
        this.slider.addEventListener('mouseenter', (e) => this.updateCursorDirection(e));
        this.slider.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.slider.addEventListener('mouseleave', () => this.handleMouseLeave());
        this.slider.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        document.addEventListener('mouseup', (e) => this.handleMouseUp(e)); // Document per non perdere il drag uscendo
        this.slider.addEventListener('click', (e) => this.handleClick(e));

        // Eventi Touch (Mobile & Desktop Touchscreen)
        this.slider.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: true });
        this.slider.addEventListener('touchmove', (e) => {
            // Prevenire scroll solo se necessario? Meglio lasciare passive true per performance, ma gestire logica in end
        }, { passive: true });
        this.slider.addEventListener('touchend', (e) => this.handleTouchEnd(e));

        // Tastiera
        this.slider.addEventListener('keydown', (e) => this.handleKey(e));

        // Wheel (Touchpad)
        this.slider.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });

        // Gestione Resize per aggiornare transform (X vs Y)
        window.addEventListener('resize', () => {
            this.refreshArrows();
            this.update();
        });

        // Inizializzazione stato (es. contatore)
        this.refreshArrows();
        this.update();
        this.preloadAdjacent();
    }

    refreshArrows() {
        this.navUp = document.querySelector(CONFIG.selectors.navArrowUp);
        this.navDown = document.querySelector(CONFIG.selectors.navArrowDown);

        if (this.navUp && !this.navUp.hasListener) {
            this.navUp.addEventListener('click', () => this.prev());
            this.navUp.hasListener = true;
        }
        if (this.navDown && !this.navDown.hasListener) {
            this.navDown.addEventListener('click', () => this.next());
            this.navDown.hasListener = true;
        }
    }

    // --- LOGICA DI NAVIGAZIONE ---

    // Helper per controllare se siamo in "scroll mode"
    isScrollMode() {
        return document.body.classList.contains('scroll-mode');
    }

    next() {
        if (this.isScrollMode()) return;
        if (this.currentIndex < this.totalSlides - 1) {
            this.currentIndex++;
            this.update();
            this.preloadAdjacent();
        }
    }

    prev() {
        if (this.isScrollMode()) return;
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.update();
            this.preloadAdjacent();
        }
    }

    update() {
        // Se siamo in scroll mode, resetta transform (già fatto via CSS con !important, ma per sicurezza nel JS non facciamo nulla)
        if (this.isScrollMode()) return;

        const isMobile = window.innerWidth <= CONFIG.breakpoints.mobile;

        if (isMobile) {
            // Verticale su mobile
            if (this.slidesContainer) this.slidesContainer.style.transform = `translateY(-${this.currentIndex * 100}%)`;
        } else {
            // Orizzontale su desktop
            if (this.slidesContainer) this.slidesContainer.style.transform = `translateX(-${this.currentIndex * 100}%)`;
        }

        if (this.counter) {
            this.counter.textContent = `${this.currentIndex + 1} / ${this.totalSlides}`;
        }

        // Aggiorna stato frecce
        if (this.navUp) {
            this.navUp.classList.toggle('disabled', this.currentIndex === 0);
        }
        if (this.navDown) {
            this.navDown.classList.toggle('disabled', this.currentIndex === this.totalSlides - 1);
        }
    }

    preloadAdjacent() {
        const nextFrame = this.slides[this.currentIndex + 1];
        const image = nextFrame ? nextFrame.querySelector('img') : null;
        if (image && image.loading === 'lazy') {
            image.loading = 'eager';
        }
    }

    // --- MOUSE HANDLERS ---

    updateCursorDirection(e) {
        if (window.innerWidth <= CONFIG.breakpoints.mobile || this.isScrollMode()) {
            this.cursorManager.setDirectional(null);
            return;
        }

        const rect = this.slider.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const half = rect.width / 2;

        if (x < half && this.currentIndex > 0) {
            this.cursorManager.setDirectional('left');
        } else if (x >= half && this.currentIndex < this.totalSlides - 1) {
            this.cursorManager.setDirectional('right');
        } else {
            this.cursorManager.setDirectional(null);
        }
    }

    handleMouseMove(e) {
        if (window.innerWidth <= CONFIG.breakpoints.mobile || this.isScrollMode()) return;

        if (!this.isDragging) {
            this.updateCursorDirection(e);
        } else {
            // Se sta draggando, controlla se è un drag significativo
            const delta = Math.abs(e.pageX - this.startX);
            if (delta > 10) this.isClick = false;
        }
    }

    handleMouseLeave() {
        if (window.innerWidth > CONFIG.breakpoints.mobile) {
            this.cursorManager.setDirectional(null);
        }
        if (this.isDragging) this.isDragging = false;
    }

    handleMouseDown(e) {
        if (window.innerWidth <= CONFIG.breakpoints.mobile || this.isScrollMode()) return;
        this.isDragging = true;
        this.isClick = true;
        this.startX = e.pageX;
    }

    handleMouseUp(e) {
        if (window.innerWidth <= CONFIG.breakpoints.mobile || this.isScrollMode()) return;
        if (!this.isDragging) return;

        const deltaX = e.pageX - this.startX;
        if (deltaX > 50) this.prev();
        else if (deltaX < -50) this.next();

        this.isDragging = false;

        // Aggiorna cursore se siamo ancora sul target corretto
        if (e.target && e.target.closest && e.target.closest(CONFIG.selectors.slider)) {
            this.updateCursorDirection(e);
        }
    }

    handleClick(e) {
        if (window.innerWidth <= CONFIG.breakpoints.mobile || this.isScrollMode()) return;
        if (!this.isClick) {
            this.isClick = true;
            return;
        }

        const rect = this.slider.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const sliderWidth = rect.width;

        if (clickX > sliderWidth / 2) this.next();
        else this.prev();

        this.updateCursorDirection(e);
    }

    // --- TOUCH HANDLERS ---

    handleTouchStart(e) {
        if (this.isScrollMode()) return;
        this.touchStartVals.x = e.touches[0].clientX;
        this.touchStartVals.y = e.touches[0].clientY;
    }

    handleTouchEnd(e) {
        if (this.isScrollMode()) return;
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;

        const deltaX = touchEndX - this.touchStartVals.x;
        const deltaY = touchEndY - this.touchStartVals.y;

        // Logica richiesta:
        // Modalità touchscreen funziona orizzontalmente al di sopra dei 1024px 
        // e verticalmente al di sotto dei 1024px

        if (window.innerWidth > CONFIG.breakpoints.mobile) {
            // Orizzontale
            if (Math.abs(deltaX) > 50) { // Sogli minimal
                if (deltaX > 0) this.prev();
                else this.next();
            }
        } else {
            // Verticale
            if (Math.abs(deltaY) > 50) {
                if (deltaY > 0) this.prev();
                else this.next();
            }
        }
    }

    // --- OTHER INPUTS ---

    handleKey(e) {
        if (window.innerWidth <= CONFIG.breakpoints.mobile || this.isScrollMode()) return;
        if (e.key === 'ArrowRight') this.next();
        else if (e.key === 'ArrowLeft') this.prev();
    }

    handleWheel(e) {
        if (window.innerWidth <= CONFIG.breakpoints.mobile || this.isScrollMode()) return;

        // Se scroll orizzontale prevalente
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
            e.preventDefault();
            // Debounce semplice
            if (this.wheelTimeout) clearTimeout(this.wheelTimeout);
            this.wheelTimeout = setTimeout(() => {
                if (e.deltaX > 0) this.next();
                else if (e.deltaX < 0) this.prev();
            }, 50);
        }
    }
}

// Inizializzazione Applicazione
document.addEventListener('DOMContentLoaded', () => {
    const layoutManager = new LayoutManager();
    const cursorManager = new CursorManager();
    const sliderManager = new SliderManager(cursorManager);

    // Esponiamo i manager se necessario debug o estensioni future, altrimenti rimangono scoped
    window.app = { layoutManager, cursorManager, sliderManager };
});

