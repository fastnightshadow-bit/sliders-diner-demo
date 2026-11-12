'use strict';

const dishes = new Map(window.SLIDERS_DISHES.map(dish => [dish.id, dish]));
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const navToggle = document.querySelector('.nav-toggle');
const mainNav = document.getElementById('main-nav');
function closeNav(returnFocus = false) {
  mainNav.classList.remove('is-open');
  navToggle.setAttribute('aria-expanded', 'false');
  navToggle.setAttribute('aria-label', 'Открыть навигацию');
  if (returnFocus) navToggle.focus();
}
navToggle.addEventListener('click', () => {
  const open = navToggle.getAttribute('aria-expanded') !== 'true';
  navToggle.setAttribute('aria-expanded', String(open));
  navToggle.setAttribute('aria-label', open ? 'Закрыть навигацию' : 'Открыть навигацию');
  mainNav.classList.toggle('is-open', open);
});
mainNav.addEventListener('click', event => { if (event.target.closest('a')) closeNav(); });
document.addEventListener('click', event => { if (!event.target.closest('.site-header')) closeNav(); });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && navToggle.getAttribute('aria-expanded') === 'true') closeNav(true);
});
window.matchMedia('(min-width: 601px)').addEventListener('change', () => closeNav());

const filters = document.querySelector('.filters');
const cards = [...document.querySelectorAll('.food-card')];
const menuCount = document.getElementById('menu-count');
const countLabel = count => {
  const last = count % 10, lastTwo = count % 100;
  return `${count} ${last === 1 && lastTwo !== 11 ? 'позиция' : last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14) ? 'позиции' : 'позиций'}`;
};
const searchInput = document.getElementById('menu-search');
const normalizeQuery = value => value.toLocaleLowerCase('ru-RU').replace(/ё/g, 'е').trim();
let selectedCategory = 'all';
function applyMenuFilters() {
  const terms = normalizeQuery(searchInput?.value || '').split(/\s+/).filter(Boolean);
  cards.forEach(card => {
    const dish = dishes.get(card.dataset.dish);
    const haystack = normalizeQuery([dish.name, dish.label, ...dish.ingredients].join(' '));
    card.hidden = (selectedCategory !== 'all' && card.dataset.category !== selectedCategory) || !terms.every(term => haystack.includes(term));
  });
  const shown = cards.filter(card => !card.hidden).length;
  if (menuCount) menuCount.textContent = countLabel(shown) + ' в меню';
  document.querySelectorAll('[data-menu-section]').forEach(section => {
    const visible = [...section.querySelectorAll('.food-card')].filter(card => !card.hidden).length;
    section.hidden = visible === 0;
    section.querySelector('[data-section-count]').textContent = visible;
  });
  const empty = document.getElementById('menu-empty');
  if (empty) empty.hidden = shown > 0;
}
filters.querySelectorAll('[data-filter]').forEach(button => {
  const category = button.dataset.filter;
  const count = cards.filter(card => category === 'all' || card.dataset.category === category).length;
  button.querySelector('[data-count]').textContent = count;
  const name = button.querySelector('span').firstChild.textContent;
  button.setAttribute('aria-label', `${name} — ${countLabel(count)}`);
});
filters.hidden = false;
filters.addEventListener('click', event => {
  const button = event.target.closest('button[data-filter]');
  if (!button) return;
  selectedCategory = button.dataset.filter;
  filters.querySelectorAll('button').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  applyMenuFilters();
  if (searchInput) document.querySelector('.catalog-toolbar').scrollIntoView({behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start'});
});
searchInput?.addEventListener('input', applyMenuFilters);
document.getElementById('menu-reset')?.addEventListener('click', () => {
  searchInput.value = '';
  filters.querySelector('[data-filter="all"]').click();
  searchInput.focus();
});

// SVG masks hide the poster background without repainting any food pixels.
const svgNS = 'http://www.w3.org/2000/svg';
function createFoodCutout(dish, maskId = 'dialog-food-mask') {
  if (dish.pageImage) {
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', dish.view);
    svg.setAttribute('class', 'food-cutout source-photo');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', dish.name);
    const defs = document.createElementNS(svgNS, 'defs');
    const clip = document.createElementNS(svgNS, 'clipPath');
    clip.setAttribute('id', maskId);
    clip.setAttribute('clipPathUnits', 'userSpaceOnUse');
    const rect = document.createElementNS(svgNS, 'rect');
    dish.view.split(' ').forEach((value, index) => rect.setAttribute(['x', 'y', 'width', 'height'][index], value));
    clip.append(rect);
    defs.append(clip);
    const image = document.createElementNS(svgNS, 'image');
    image.setAttribute('href', 'assets/' + dish.pageImage);
    image.setAttribute('width', dish.pageWidth);
    image.setAttribute('height', dish.pageHeight);
    image.setAttribute('clip-path', `url(#${maskId})`);
    svg.append(defs, image);
    return svg;
  }
  if (!dish.image && !dish.cutout) {
    const illustration = document.createElement('div');
    illustration.className = 'food-placeholder';
    const icon = document.createElement('img');
    icon.src = 'assets/' + dish.icon; icon.alt = ''; icon.width = 100; icon.height = 100;
    const label = document.createElement('span'); label.textContent = 'Sliders';
    illustration.append(icon, label);
    return illustration;
  }
  if (dish.cutout) {
    const image = document.createElement('img');
    image.src = 'assets/' + dish.cutout;
    image.className = 'food-cutout food-photo';
    image.alt = dish.name;
    image.width = dish.cutoutWidth;
    image.height = dish.cutoutHeight;
    return image;
  }
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', dish.view);
  svg.setAttribute('class', 'food-cutout');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', dish.name);
  const defs = document.createElementNS(svgNS, 'defs');
  const clip = document.createElementNS(svgNS, dish.mask ? 'mask' : 'clipPath');
  clip.setAttribute('id', maskId);
  clip.setAttribute(dish.mask ? 'maskUnits' : 'clipPathUnits', 'userSpaceOnUse');
  const shape = document.createElementNS(svgNS, dish.mask ? 'image' : 'path');
  if (dish.mask) {
    clip.setAttribute('x', '0'); clip.setAttribute('y', '0');
    clip.setAttribute('width', dish.size); clip.setAttribute('height', dish.size);
    clip.style.maskType = 'alpha';
    shape.setAttribute('href', 'assets/' + dish.mask);
    shape.setAttribute('width', dish.size); shape.setAttribute('height', dish.size);
  } else shape.setAttribute('d', dish.path);
  clip.append(shape);
  defs.append(clip);
  const image = document.createElementNS(svgNS, 'image');
  image.setAttribute('href', 'assets/' + dish.image);
  image.setAttribute('width', dish.size);
  image.setAttribute('height', dish.size);
  image.setAttribute(dish.mask ? 'mask' : 'clip-path', `url(#${maskId})`);
  svg.append(defs, image);
  return svg;
}
const dialog = document.getElementById('dish-dialog');
let lastDishButton = null;
document.querySelectorAll('[data-open-dish]').forEach(button => {
  button.addEventListener('click', () => {
    const dish = dishes.get(button.dataset.openDish);
    if (!dish) return;
    lastDishButton = button;
    document.getElementById('dialog-action').dataset.dish = dish.id;
    document.getElementById('dialog-title').textContent = dish.name;
    dialog.classList.toggle('is-long-title', dish.name.length > 23);
    document.getElementById('dialog-category').textContent = dish.label;
    document.getElementById('dialog-price').textContent = dish.price + ' ₽';
    document.getElementById('dialog-description').textContent = dish.description;
    document.getElementById('dialog-food').replaceChildren(createFoodCutout(dish));
    dialog.classList.toggle('has-source-photo', Boolean(dish.pageImage));
    dialog.classList.toggle('has-menu-illustration', !dish.image && !dish.cutout && !dish.pageImage);
    dialog.querySelector('.ingredient-box').hidden = dish.ingredients.length === 0;
    document.getElementById('dialog-ingredients').replaceChildren(...dish.ingredients.map(text => {
      const li = document.createElement('li'); li.textContent = text; return li;
    }));
    dialog.showModal();
    document.body.classList.add('dialog-open');
    dialog.querySelector('.dialog-shell').scrollTop = 0;
    dialog.querySelector('.dialog-close').focus({preventScroll: true});
  });
});
dialog.querySelectorAll('.dialog-close,.dialog-back').forEach(button => button.addEventListener('click', () => dialog.close()));
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
});
dialog.addEventListener('close', () => {
  if (document.querySelector('dialog[open]')) return;
  document.body.classList.remove('dialog-open');
  if (lastDishButton?.isConnected) lastDishButton.focus({preventScroll: true});
});

// Motion follows the visitor, without perpetual movement while reading.
const hero = document.querySelector('.poster-hero');
const layers = [...document.querySelectorAll('.parallax-layer')];
const mobileActions = document.querySelector('.mobile-actions');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
let motionFrame = 0, mouseX = 0, mouseY = 0, currentX = 0, currentY = 0, lastMotionTime = 0;
let heroBounds = hero?.getBoundingClientRect();
function paintMotion(time) {
  motionFrame = 0;
  if (!hero || document.hidden) return;
  if (reducedMotion.matches || !finePointer.matches) {
    currentX = currentY = mouseX = mouseY = 0;
    layers.forEach(layer => { layer.style.transform = 'none'; });
    return;
  }
  const targetY = mouseY + Math.min(window.scrollY, heroBounds.height) * 1.7;
  const dt = lastMotionTime ? Math.min(time - lastMotionTime, 50) : 16.667;
  lastMotionTime = time;
  const ease = 1 - Math.exp(-dt / 105);
  currentX += (mouseX - currentX) * ease;
  currentY += (targetY - currentY) * ease;
  const moving = Math.abs(mouseX - currentX) > .12 || Math.abs(targetY - currentY) > .12;
  if (!moving) { currentX = mouseX; currentY = targetY; }
  layers.forEach(layer => {
    const depth = Number(layer.dataset.depth);
    layer.style.transform = `translate3d(${currentX * depth}px,${currentY * depth}px,0)`;
  });
  if (moving && window.scrollY < heroBounds.height) requestMotion();
  else lastMotionTime = 0;
}
function requestMotion() { if (hero && !motionFrame && !document.hidden) motionFrame = requestAnimationFrame(paintMotion); }
function motionScroll() {
  if (!hero) return;
  if (mobileActions) mobileActions.hidden = window.scrollY < heroBounds.height * .7;
  // Do no animation work once the hero has left the screen.
  if (window.scrollY < heroBounds.height) requestMotion();
  else if (motionFrame) { cancelAnimationFrame(motionFrame); motionFrame = 0; lastMotionTime = 0; }
}
function measureHero() { heroBounds = hero?.getBoundingClientRect(); motionScroll(); }
hero?.addEventListener('pointerenter', measureHero);
hero?.addEventListener('pointermove', event => {
  if (event.pointerType !== 'mouse' || reducedMotion.matches || !finePointer.matches) return;
  mouseX = event.clientX - heroBounds.left - heroBounds.width / 2;
  mouseY = event.clientY + window.scrollY - heroBounds.height / 2;
  requestMotion();
});
hero?.addEventListener('pointerleave', () => { mouseX = 0; mouseY = 0; requestMotion(); });
window.addEventListener('scroll', motionScroll, {passive: true});
window.addEventListener('resize', measureHero);
reducedMotion.addEventListener('change', requestMotion);
finePointer.addEventListener('change', requestMotion);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { cancelAnimationFrame(motionFrame); motionFrame = 0; lastMotionTime = 0; }
  else motionScroll();
});
document.fonts.ready.then(measureHero);
motionScroll();
if ('IntersectionObserver' in window && !reducedMotion.matches) {
  document.documentElement.classList.add('motion-ready');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
    });
  }, {threshold: 0.08});
  document.querySelectorAll('[data-reveal]').forEach(element => observer.observe(element));
}

// This basket is a browser-only demonstration: no orders leave the page.
const cartDialog = document.getElementById('cart-dialog');
const cartToggle = document.querySelector('.cart-toggle');
const cartItems = document.getElementById('cart-items');
const cart = new Map();
const cartStorageKey = 'sliders-demo-cart-v1';
let cartReturnFocus = cartToggle;
function readSavedCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(cartStorageKey) || '[]');
    if (!Array.isArray(saved)) return;
    cart.clear();
    saved.forEach(entry => {
      if (Array.isArray(entry) && dishes.has(entry[0]) && Number.isInteger(entry[1]) && entry[1] > 0 && entry[1] <= 99) cart.set(entry[0], entry[1]);
    });
  } catch { /* Storage may be unavailable; keep the in-memory basket. */ }
}
readSavedCart();
const rubles = value => new Intl.NumberFormat('ru-RU').format(value) + ' ₽';
function updateCart(persist = true) {
  let count = 0, total = 0;
  const rows = [];
  cart.forEach((quantity, id) => {
    const dish = dishes.get(id);
    count += quantity; total += dish.price * quantity;
    const row = document.createElement('article');
    row.className = 'cart-item';
    const art = document.createElement('div'); art.className = 'cart-item-art';
    art.append(createFoodCutout(dish, 'cart-food-' + id));
    const info = document.createElement('div'); info.className = 'cart-item-info';
    const title = document.createElement('h3'); title.textContent = dish.name;
    const unit = document.createElement('p'); unit.textContent = rubles(dish.price) + ' за порцию';
    const controls = document.createElement('div'); controls.className = 'cart-quantity';
    for (const [action, label, symbol] of [['less','Уменьшить','−'],['quantity','',''],['more','Увеличить','+']]) {
      const element = document.createElement(action === 'quantity' ? 'span' : 'button');
      if (action === 'quantity') element.textContent = quantity;
      else { element.type = 'button'; element.textContent = symbol; element.dataset.cartAction = action; element.dataset.id = id; element.setAttribute('aria-label', label + ' количество: ' + dish.name); if (action === 'more') element.disabled = quantity >= 99; }
      controls.append(element);
    }
    const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'cart-remove'; remove.textContent = 'Убрать'; remove.dataset.cartAction = 'remove'; remove.dataset.id = id; remove.setAttribute('aria-label', 'Убрать: ' + dish.name);
    const sum = document.createElement('strong'); sum.className = 'cart-item-sum'; sum.textContent = rubles(dish.price * quantity);
    info.append(title, unit, controls, remove); row.append(art, info, sum); rows.push(row);
  });
  if (!rows.length) { const empty = document.createElement('p'); empty.className = 'cart-empty'; empty.textContent = 'Пока пусто — самое время выбрать что-нибудь вкусное'; rows.push(empty); }
  cartItems.replaceChildren(...rows);
  document.getElementById('cart-total').textContent = rubles(total);
  const badge = document.getElementById('cart-count'); badge.textContent = count; badge.hidden = count === 0;
  cartToggle.setAttribute('aria-label', 'Открыть корзину, порций: ' + count);
  document.querySelector('.cart-call').hidden = count === 0;
  document.querySelector('.cart-hint').hidden = count === 0;
  document.getElementById('cart-status').textContent = 'В корзине порций: ' + count + '. Итого ' + rubles(total);
  if (persist) try { localStorage.setItem(cartStorageKey, JSON.stringify([...cart])); } catch { /* Optional persistence. */ }
}
function openCart(returnFocus = cartToggle) {
  readSavedCart(); updateCart(false);
  cartReturnFocus = returnFocus;
  if (dialog.open) dialog.close();
  cartDialog.showModal(); document.body.classList.add('dialog-open');
  cartDialog.querySelector('.cart-close').focus({preventScroll:true});
}
cartToggle.addEventListener('click', () => openCart());
document.getElementById('dialog-action').addEventListener('click', event => {
  const id = event.currentTarget.dataset.dish;
  if (!dishes.has(id)) return;
  readSavedCart();
  cart.set(id, Math.min(99, (cart.get(id) || 0) + 1)); updateCart(); openCart(lastDishButton);
});
cartItems.addEventListener('click', event => {
  const button = event.target.closest('[data-cart-action]'); if (!button) return;
  const {id, cartAction: action} = button.dataset;
  readSavedCart();
  const next = action === 'remove' ? 0 : (cart.get(id) || 0) + (action === 'more' ? 1 : -1);
  if (next > 0) cart.set(id, Math.min(99,next)); else cart.delete(id);
  updateCart();
  const available = [...cartItems.querySelectorAll('[data-cart-action]')].filter(item => item.dataset.id === id && !item.disabled);
  const nextFocus = available.find(item => item.dataset.cartAction === action) || available[0];
  (nextFocus || cartDialog.querySelector('.cart-close')).focus({preventScroll:true});
});
cartDialog.querySelectorAll('.cart-close,.cart-continue').forEach(button => button.addEventListener('click', () => cartDialog.close()));
cartDialog.addEventListener('click', event => {
  if (event.target !== cartDialog) return;
  const bounds = cartDialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) cartDialog.close();
});
cartDialog.addEventListener('close', () => {
  if (!document.querySelector('dialog[open]')) document.body.classList.remove('dialog-open');
  if (cartReturnFocus?.isConnected) cartReturnFocus.focus({preventScroll:true});
});
updateCart();
window.addEventListener('pageshow', event => {
  if (event.persisted) { readSavedCart(); updateCart(false); }
});
window.addEventListener('storage', event => {
  if (event.key === cartStorageKey || event.key === null) { readSavedCart(); updateCart(false); }
});


// The requested desktop direction: visible going down, hidden going up.
const desktopHeader = document.querySelector('.site-header');
const desktopQuery = window.matchMedia('(min-width: 801px)');
let headerScrollAnchor = window.scrollY;
let headerFrame = 0;
function updateDesktopHeader() {
  headerFrame = 0;
  const y = Math.max(0, window.scrollY);
  if (!desktopQuery.matches) {
    desktopHeader.classList.remove('is-scrolled', 'is-scroll-hidden');
    headerScrollAnchor = y; return;
  }
  desktopHeader.classList.toggle('is-scrolled', y > 30);
  if (y < 80) desktopHeader.classList.remove('is-scroll-hidden');
  else if (Math.abs(y - headerScrollAnchor) > 7) desktopHeader.classList.toggle('is-scroll-hidden', y < headerScrollAnchor);
  if (Math.abs(y - headerScrollAnchor) > 7 || y < 80) headerScrollAnchor = y;
}
window.addEventListener('scroll', () => {
  if (!headerFrame) headerFrame = requestAnimationFrame(updateDesktopHeader);
}, {passive:true});
desktopQuery.addEventListener('change', updateDesktopHeader);
updateDesktopHeader();

// Only activate the visible desktop/mobile map close to its viewport.
const pendingMaps = [...document.querySelectorAll('iframe[data-src]')];
if (pendingMaps.length) {
  const loadMap = frame => { frame.src = frame.dataset.src; delete frame.dataset.src; };
  if ('IntersectionObserver' in window) {
    const mapObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.target.getBoundingClientRect().width > 0) {
          loadMap(entry.target); mapObserver.unobserve(entry.target);
        }
      });
    }, {rootMargin:'250px'});
    pendingMaps.forEach(frame => mapObserver.observe(frame));
  } else pendingMaps.forEach(loadMap);
}

