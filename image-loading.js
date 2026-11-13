'use strict';

// Share the decoded menu photos with filters, dish dialogs and the basket.
(() => {
  const photos = new Map([...document.querySelectorAll('.food-card')].map(card =>
    [card.dataset.dish, card.querySelector('.food-stage img')]).filter(([, image]) => image));
  const decoded = new WeakMap();
  const pending = new WeakMap();
  const details = new Map();
  const sourceOf = image => image.currentSrc || image.src;
  const isDecoded = image => image.complete && image.naturalWidth > 0 && decoded.get(image) === sourceOf(image);

  function prepareImage(image, timeout = 4000) {
    if (isDecoded(image)) return Promise.resolve(image);
    if (pending.has(image)) return pending.get(image);
    image.loading = 'eager';
    const promise = new Promise(resolve => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        image.removeEventListener('load', finish);
        image.removeEventListener('error', finish);
        if (image.complete && image.naturalWidth > 0) decoded.set(image, sourceOf(image));
        resolve(image);
      };
      // A failed/stalled photo must never lock category navigation.
      const timer = timeout ? setTimeout(finish, timeout) : null;
      if (typeof image.decode === 'function') image.decode().then(finish, finish);
      else if (image.complete) finish();
      else {
        image.addEventListener('load', finish, {once:true});
        image.addEventListener('error', finish, {once:true});
      }
    });
    pending.set(image, promise);
    promise.then(() => pending.delete(image));
    return promise;
  }

  function prepare(ids = [...photos.keys()]) {
    return Promise.all(ids.map(id => photos.get(id)).filter(Boolean).map(image => prepareImage(image)));
  }

  function prepareDetail(id, priority = 'low') {
    const source = photos.get(id);
    if (!source) return Promise.resolve(null);
    let image = details.get(id);
    if (!image || (image.complete && image.naturalWidth === 0)) {
      image = new Image();
      image.decoding = 'async';
      image.fetchPriority = priority;
      image.sizes = source.width / source.height < .7 ? '180px'
        : '(max-width: 600px) calc(100vw - 72px), (max-width: 1000px) 350px, 460px';
      image.srcset = source.srcset;
      image.src = source.src;
      details.set(id, image);
    }
    if (image.fetchPriority !== 'high') image.fetchPriority = priority;
    // Keep detail readiness alive on slow networks. Only category navigation
    // needs a timeout; a pending dish can be cancelled without blocking the page.
    return prepareImage(image, 0);
  }

  function create(dish, detail = false) {
    const source = photos.get(dish.id);
    if (!source) return null;
    const image = document.createElement('img');
    const readyDetail = detail && details.get(dish.id);
    image.className = 'food-cutout food-photo';
    image.alt = dish.name;
    image.width = source.width;
    image.height = source.height;
    // Display the cached pixels immediately; never blank them during an upgrade.
    image.decoding = 'sync';
    image.src = readyDetail && isDecoded(readyDetail) ? sourceOf(readyDetail) : sourceOf(source);
    if (detail) prepareDetail(dish.id, 'auto').then(large => {
      if (image.isConnected && large && isDecoded(large)) image.src = sourceOf(large);
    });
    return image;
  }

  window.SlidersImages = Object.freeze({
    prepare,
    isReady: ids => ids.every(id => !photos.has(id) || isDecoded(photos.get(id))),
    isDetailReady: id => Boolean(details.get(id) && isDecoded(details.get(id))),
    prepareForDialog: id => prepareDetail(id, 'high').then(image => Boolean(image && isDecoded(image))),
    create
  });

  // Warm only nearby dishes, with two background transfers at a time.
  // A deliberate click can promote its existing request to high priority.
  const detailQueue = [];
  const queuedDetails = new Set();
  let warmingDetails = 0;
  function warmNextDetail() {
    while (warmingDetails < 2 && detailQueue.length) {
      const id = detailQueue.shift();
      warmingDetails++;
      prepareDetail(id).finally(() => { warmingDetails--; warmNextDetail(); });
    }
  }
  function queueDetail(id) {
    if (!photos.has(id) || queuedDetails.has(id)) return;
    queuedDetails.add(id);
    detailQueue.push(id);
    warmNextDetail();
  }
  function approachMenu() {
    prepare();
    queueDetail('bacon');
  }
  const menu = document.getElementById('menu');
  if (menu && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        approachMenu();
        observer.disconnect();
      }
    }, {rootMargin:'800px'});
    observer.observe(menu);
    const targets = new Map([...photos].map(([id, image]) => [image, id]));
    const nearbyPhotos = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        queueDetail(targets.get(entry.target));
        nearbyPhotos.unobserve(entry.target);
      });
    }, {rootMargin:'600px'});
    photos.forEach(image => nearbyPhotos.observe(image));
  } else approachMenu();
  document.querySelectorAll('a[href="#menu"]').forEach(link => {
    link.addEventListener('pointerenter', approachMenu, {once:true});
    link.addEventListener('focusin', approachMenu, {once:true});
  });
  document.querySelectorAll('[data-open-dish]').forEach(button => {
    let timer;
    button.addEventListener('pointerenter', event => {
      if (event.pointerType === 'mouse') timer = setTimeout(() => prepareDetail(button.dataset.openDish), 120);
    });
    button.addEventListener('pointerleave', () => clearTimeout(timer));
    button.addEventListener('focusin', () => prepareDetail(button.dataset.openDish));
    button.addEventListener('pointerdown', () => prepareDetail(button.dataset.openDish), {passive:true});
  });
})();
