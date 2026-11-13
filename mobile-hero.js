/* Safari toolbar/keyboard resizes must not recompose the hero while scrolling. */
(() => {
  const root = document.documentElement, hero = document.querySelector('.poster-hero');
  if (!hero) return;
  let width = 0;
  function sizeHero() {
    if (window.visualViewport && Math.abs(window.visualViewport.scale - 1) > .01) return;
    const nextWidth = root.clientWidth;
    if (nextWidth === width) return;
    width = nextWidth;
    hero.classList.toggle('hero-landscape', width <= 1000 && width > 600 && width > window.innerHeight);
    if (width > 1000) {
      root.style.removeProperty('--mobile-hero-height');
      document.body.classList.remove('hero-in-view');
      return;
    }
    root.style.setProperty('--mobile-hero-height', Math.round(window.innerHeight) + 'px');
    const rect = hero.getBoundingClientRect();
    document.body.classList.toggle('hero-in-view', rect.bottom > 84 && rect.top < window.innerHeight);
  }
  sizeHero();
  window.addEventListener('resize', sizeHero, {passive:true});
  window.addEventListener('pageshow', sizeHero);
  // The header basket stays available; the bottom dock belongs to the menu and lower sections.
  if (typeof IntersectionObserver !== 'undefined') {
    const observer = new IntersectionObserver(([entry]) => {
      document.body.classList.toggle('hero-in-view', root.clientWidth <= 1000 && entry.isIntersecting);
    }, {rootMargin:'-84px 0px 0px 0px'});
    observer.observe(hero);
  }
})();
