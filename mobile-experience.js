/* The mobile dock reflects the shared basket; it does not keep a second cart. */
(() => {
  const dock = document.getElementById('mobile-cart-dock');
  const toolsToggle = document.getElementById('mobile-menu-tools-toggle');
  const menuTools = document.getElementById('menu-tools');
  toolsToggle?.addEventListener('click', () => {
    const expanded = toolsToggle.getAttribute('aria-expanded') !== 'true';
    toolsToggle.setAttribute('aria-expanded', String(expanded));
    menuTools.classList.toggle('mobile-tools-open', expanded);
    if (expanded) document.getElementById('menu-search').focus({preventScroll:true});
  });
  const plural = count => {
    const last = count % 10, pair = count % 100;
    return last === 1 && pair !== 11 ? 'товар' : last >= 2 && last <= 4 && (pair < 12 || pair > 14) ? 'товара' : 'товаров';
  };
  window.SlidersMobile = Object.freeze({syncCart(count, total) {
    if (!dock) return;
    const price = new Intl.NumberFormat('ru-RU').format(total) + ' ₽';
    dock.hidden = count === 0;
    document.body.classList.toggle('has-cart-dock', count > 0);
    document.getElementById('mobile-cart-summary').textContent = `${count} ${plural(count)} · ${price}`;
    dock.setAttribute('aria-label', `Открыть корзину: ${count} ${plural(count)}, ${price}`);
  }});
})();
