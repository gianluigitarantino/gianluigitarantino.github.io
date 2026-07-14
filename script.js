const CONFIG = {
    breakpoints: { mobile: 1024, shortSliderHeight: 380 },
    selectors: {
        wrapper: '#wrapper',
        menu: '#menu',
        lingua: '#lingua',
        slider: '#slider',
        contentPage: '.content-page',
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

class LayoutManager {
    constructor() {
        this.els = {
            wrapper: document.querySelector(CONFIG.selectors.wrapper),
            menu: document.querySelector(CONFIG.selectors.menu),
            lingua: document.querySelector(CONFIG.selectors.lingua),
            slider: document.querySelector(CONFIG.selectors.slider),
            contentPage: document.querySelector(CONFIG.selectors.contentPage),
            piva: document.querySelector(CONFIG.selectors.pivaPolicy),
            contatti: document.querySelector(CONFIG.selectors.contatti)
        };
        this.heightCheckTarget = this.els.slider || this.els.contentPage;
        this.init();
    }

    init() {
        this.handleResize();
        this.setupActiveLink();
        window.addEventListener('resize', () => this.handleResize());
        window.addEventListener('load', () => this.handleResize());
        if (this.heightCheckTarget && 'ResizeObserver' in window) {
            new ResizeObserver(() => this.checkHeightConstraint()).observe(this.heightCheckTarget);
        }
    }

    handleResize() {
        if (!this.els.wrapper) return;
        const isMobile = window.innerWidth <= CONFIG.breakpoints.mobile;

        if (isMobile) this.setupMobileLayout();
        else this.restoreDesktopLayout();
        this.checkHeightConstraint();
    }

    setupMobileLayout() {
        if (!this.els.wrapper || !this.els.menu || !this.els.lingua || !this.els.piva) return;
        if (document.querySelector(CONFIG.selectors.topbar)) return;

        const topbar = document.createElement('div');
        topbar.id = 'topbar';
        topbar.appendChild(this.els.lingua);
        topbar.appendChild(this.els.menu);
        this.els.wrapper.insertBefore(topbar, this.els.wrapper.firstChild);

        if (this.els.contatti) this.els.piva.insertBefore(this.els.contatti, this.els.piva.firstChild);

        if (this.els.slider) {
            const isEnglish = document.documentElement.lang === 'en';
            const arrowUp = document.createElement('button');
            arrowUp.className = 'nav-arrow up';
            arrowUp.innerHTML = '<span aria-hidden="true"></span>';
            arrowUp.setAttribute('aria-label', isEnglish ? 'Previous slide' : 'Slide precedente');

            const arrowDown = document.createElement('button');
            arrowDown.className = 'nav-arrow down';
            arrowDown.innerHTML = '<span aria-hidden="true"></span>';
            arrowDown.setAttribute('aria-label', isEnglish ? 'Next slide' : 'Slide successiva');

            this.els.wrapper.appendChild(arrowUp);
            this.els.wrapper.appendChild(this.els.slider);
            this.els.wrapper.appendChild(arrowDown);
        }
        this.els.wrapper.appendChild(this.els.piva);
    }

    restoreDesktopLayout() {
        if (!this.els.wrapper || !this.els.menu || !this.els.lingua || !this.els.piva) return;
        const topbar = document.querySelector(CONFIG.selectors.topbar);
        if (!topbar) return;

        this.els.wrapper.querySelectorAll('.nav-arrow').forEach(arrow => arrow.remove());
        this.els.wrapper.insertBefore(this.els.menu, this.els.wrapper.firstChild);
        this.els.menu.appendChild(this.els.piva);

        const menuInner = this.els.menu.firstElementChild;
        if (menuInner) {
            const counter = document.querySelector(CONFIG.selectors.slideCounter);
            if (counter && counter.parentNode === menuInner) menuInner.insertBefore(this.els.lingua, counter.nextSibling);
            else menuInner.appendChild(this.els.lingua);
            if (this.els.contatti) menuInner.appendChild(this.els.contatti);
        }
        topbar.remove();
    }

    setupActiveLink() {
        if (!this.els.menu) return;
        const normalize = path => path.replace(/\/+$/, '') || '/';
        const current = normalize(window.location.pathname);
        this.els.menu.querySelectorAll('#voci_menu a').forEach(link => {
            const active = current === normalize(new URL(link.href).pathname);
            link.classList.toggle('active', active);
            if (active) link.setAttribute('aria-current', 'page');
            else link.removeAttribute('aria-current');
        });
    }

    checkHeightConstraint() {
        if (!this.els.slider) return;
        const availableHeight = window.innerHeight - 180;
        document.body.classList.toggle('scroll-mode', availableHeight < CONFIG.breakpoints.shortSliderHeight);
    }
}

class CursorManager {
    constructor() {
        this.cursor = document.querySelector(CONFIG.selectors.customCursor);
        if (this.cursor) this.init();
    }

    init() {
        document.addEventListener('mousemove', event => this.moveCursor(event));
        document.querySelectorAll('a, button').forEach(element => {
            element.addEventListener('mouseenter', () => this.activate());
            element.addEventListener('mouseleave', () => this.deactivate());
        });
    }

    moveCursor(event) {
        if (window.innerWidth <= CONFIG.breakpoints.mobile || !window.matchMedia('(pointer: fine)').matches) {
            this.cursor.style.display = 'none';
            return;
        }
        this.cursor.style.display = 'block';
        this.cursor.style.left = `${event.clientX}px`;
        this.cursor.style.top = `${event.clientY}px`;
    }
    activate() { if (window.innerWidth > CONFIG.breakpoints.mobile) this.cursor.classList.add('active'); }
    deactivate() { if (window.innerWidth > CONFIG.breakpoints.mobile) this.cursor.classList.remove('active'); }
    setDirectional(type) {
        this.cursor.classList.remove('directional', 'left', 'right');
        if (type && window.innerWidth > CONFIG.breakpoints.mobile) this.cursor.classList.add('directional', type);
    }
}

class SliderManager {
    constructor(cursorManager) {
        this.slider = document.querySelector(CONFIG.selectors.slider);
        if (!this.slider) return;
        this.slidesContainer = this.slider.querySelector(CONFIG.selectors.slides);
        this.slides = [...this.slider.querySelectorAll(CONFIG.selectors.slideImages)];
        this.counter = document.querySelector(CONFIG.selectors.slideCounter);
        this.cursorManager = cursorManager;
        this.currentIndex = 0;
        this.totalSlides = this.slides.length;
        this.isDragging = false;
        this.startX = 0;
        this.isClick = true;
        this.touchStartVals = { x: 0, y: 0 };
        this.wheelAccumulator = 0;
        this.wheelGestureLocked = false;
        this.wheelResetTimeout = null;
        this.wheelLastEventAt = 0;
        this.wheelLastMagnitude = 0;
        this.wheelNavigatedAt = 0;
        this.wheelMomentumWasLow = false;
        this.navUp = null;
        this.navDown = null;
        this.init();
    }

    init() {
        this.slider.addEventListener('mouseenter', event => this.updateCursorDirection(event));
        this.slider.addEventListener('mousemove', event => this.handleMouseMove(event));
        this.slider.addEventListener('mouseleave', () => this.handleMouseLeave());
        this.slider.addEventListener('mousedown', event => this.handleMouseDown(event));
        document.addEventListener('mouseup', event => this.handleMouseUp(event));
        this.slider.addEventListener('click', event => this.handleClick(event));
        this.slider.addEventListener('touchstart', event => this.handleTouchStart(event), { passive: true });
        this.slider.addEventListener('touchend', event => this.handleTouchEnd(event));
        document.addEventListener('keydown', event => this.handleKey(event));
        document.addEventListener('wheel', event => this.handleWheel(event), { passive: false });
        window.addEventListener('resize', () => { this.refreshArrows(); this.update(); });
        this.refreshArrows();
        this.update();
        this.preloadAdjacent();
    }

    refreshArrows() {
        this.navUp = document.querySelector(CONFIG.selectors.navArrowUp);
        this.navDown = document.querySelector(CONFIG.selectors.navArrowDown);
        if (this.navUp && !this.navUp.dataset.listener) {
            this.navUp.addEventListener('click', () => this.prev());
            this.navUp.dataset.listener = 'true';
        }
        if (this.navDown && !this.navDown.dataset.listener) {
            this.navDown.addEventListener('click', () => this.next());
            this.navDown.dataset.listener = 'true';
        }
    }

    isScrollMode() { return document.body.classList.contains('scroll-mode'); }
    isInteractiveTarget(target) {
        return Boolean(target?.closest?.('a, button, input, textarea, select, option, [contenteditable="true"]'));
    }
    next() { if (!this.isScrollMode() && this.currentIndex < this.totalSlides - 1) { this.currentIndex++; this.update(); this.preloadAdjacent(); } }
    prev() { if (!this.isScrollMode() && this.currentIndex > 0) { this.currentIndex--; this.update(); this.preloadAdjacent(); } }

    update() {
        if (!this.isScrollMode()) {
            const mobile = window.innerWidth <= CONFIG.breakpoints.mobile;
            if (this.slidesContainer) this.slidesContainer.style.transform = mobile
                ? `translateY(-${this.currentIndex * 100}%)`
                : `translateX(-${this.currentIndex * 100}%)`;
        }
        if (this.counter) this.counter.textContent = `${this.currentIndex + 1} / ${this.totalSlides}`;
        if (this.navUp) this.navUp.classList.toggle('disabled', this.currentIndex === 0);
        if (this.navDown) this.navDown.classList.toggle('disabled', this.currentIndex === this.totalSlides - 1);
    }

    preloadAdjacent() {
        const nextImage = this.slides[this.currentIndex + 1]?.querySelector('img');
        if (nextImage?.loading === 'lazy') nextImage.loading = 'eager';
    }

    updateCursorDirection(event) {
        if (event.target?.closest?.('a, button')) return this.cursorManager.setDirectional(null);
        if (window.innerWidth <= CONFIG.breakpoints.mobile || this.isScrollMode()) return this.cursorManager.setDirectional(null);
        const rect = this.slider.getBoundingClientRect();
        const leftHalf = event.clientX - rect.left < rect.width / 2;
        if (leftHalf && this.currentIndex > 0) this.cursorManager.setDirectional('left');
        else if (!leftHalf && this.currentIndex < this.totalSlides - 1) this.cursorManager.setDirectional('right');
        else this.cursorManager.setDirectional(null);
    }

    handleMouseMove(event) {
        if (window.innerWidth <= CONFIG.breakpoints.mobile || this.isScrollMode()) return;
        if (!this.isDragging) this.updateCursorDirection(event);
        else if (Math.abs(event.pageX - this.startX) > 10) this.isClick = false;
    }
    handleMouseLeave() { this.cursorManager.setDirectional(null); this.isDragging = false; }
    handleMouseDown(event) {
        if (event.target?.closest?.('a, button')) return;
        if (window.innerWidth <= CONFIG.breakpoints.mobile || this.isScrollMode()) return;
        this.isDragging = true;
        this.isClick = true;
        this.startX = event.pageX;
    }
    handleMouseUp(event) {
        if (window.innerWidth <= CONFIG.breakpoints.mobile || this.isScrollMode() || !this.isDragging) return;
        const delta = event.pageX - this.startX;
        if (delta > 50) this.prev();
        else if (delta < -50) this.next();
        this.isDragging = false;
        if (event.target?.closest?.(CONFIG.selectors.slider)) this.updateCursorDirection(event);
    }
    handleClick(event) {
        if (event.target?.closest?.('a, button')) return;
        if (window.innerWidth <= CONFIG.breakpoints.mobile || this.isScrollMode()) return;
        if (!this.isClick) { this.isClick = true; return; }
        const rect = this.slider.getBoundingClientRect();
        if (event.clientX - rect.left > rect.width / 2) this.next();
        else this.prev();
        this.updateCursorDirection(event);
    }
    handleTouchStart(event) {
        if (this.isScrollMode()) return;
        this.touchStartVals = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    }
    handleTouchEnd(event) {
        if (this.isScrollMode()) return;
        const dx = event.changedTouches[0].clientX - this.touchStartVals.x;
        const dy = event.changedTouches[0].clientY - this.touchStartVals.y;
        if (window.innerWidth > CONFIG.breakpoints.mobile && Math.abs(dx) > 50) dx > 0 ? this.prev() : this.next();
        if (window.innerWidth <= CONFIG.breakpoints.mobile && Math.abs(dy) > 50) dy > 0 ? this.prev() : this.next();
    }
    handleKey(event) {
        if (this.isScrollMode() || event.defaultPrevented || this.isInteractiveTarget(event.target)) return;
        if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') { event.preventDefault(); this.next(); }
        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') { event.preventDefault(); this.prev(); }
    }
    handleWheel(event) {
        if (window.innerWidth <= CONFIG.breakpoints.mobile || this.isScrollMode()) return;
        if (event.defaultPrevented || this.isInteractiveTarget(event.target)) return;

        const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerWidth : 1;
        const deltaX = event.deltaX * unit;
        const deltaY = event.deltaY * unit;
        if (Math.abs(deltaX) <= Math.abs(deltaY) || Math.abs(deltaX) < 2) return;

        if (event.cancelable) event.preventDefault();
        const now = performance.now();
        const magnitude = Math.abs(deltaX);
        const eventGap = now - this.wheelLastEventAt;
        const directionChanged = this.wheelAccumulator !== 0
            && Math.sign(deltaX) !== Math.sign(this.wheelAccumulator);
        const newIntentionalSwipe = this.wheelGestureLocked
            && magnitude >= 6
            && (this.wheelMomentumWasLow
                || directionChanged
                || (now - this.wheelNavigatedAt > 160
                    && magnitude > this.wheelLastMagnitude * 1.8));

        if (eventGap > 100 || newIntentionalSwipe) {
            this.wheelAccumulator = 0;
            this.wheelGestureLocked = false;
            this.wheelMomentumWasLow = false;
        }

        this.wheelLastEventAt = now;
        this.wheelLastMagnitude = magnitude;
        if (this.wheelGestureLocked && magnitude <= 4) this.wheelMomentumWasLow = true;
        this.wheelAccumulator += deltaX;
        clearTimeout(this.wheelResetTimeout);
        this.wheelResetTimeout = setTimeout(() => {
            this.wheelAccumulator = 0;
            this.wheelGestureLocked = false;
            this.wheelLastMagnitude = 0;
            this.wheelMomentumWasLow = false;
        }, 100);

        if (this.wheelGestureLocked || Math.abs(this.wheelAccumulator) < 30) return;
        this.wheelGestureLocked = true;
        this.wheelNavigatedAt = now;
        this.wheelMomentumWasLow = false;
        this.wheelAccumulator > 0 ? this.next() : this.prev();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const layoutManager = new LayoutManager();
    const cursorManager = new CursorManager();
    const sliderManager = new SliderManager(cursorManager);
    window.app = { layoutManager, cursorManager, sliderManager };
});
