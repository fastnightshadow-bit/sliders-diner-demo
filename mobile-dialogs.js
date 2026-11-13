/* Native dialogs stay in charge of focus/Escape; this adds phone viewport and drag behavior. */
(() => {
  const compact = window.matchMedia('(max-width: 1000px)');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.documentElement, body = document.body;
  const dialogs = [...document.querySelectorAll('dialog')];
  const cart = document.getElementById('cart-dialog');
  const handle = document.getElementById('cart-drag-handle');
  let savedPage = null, viewportFrame = 0, drag = null, motion = null;

  function updateViewport() {
    viewportFrame = 0;
    if (!savedPage) return;
    const view = window.visualViewport;
    if (view && Math.abs(view.scale - 1) > .01) return; // Preserve native pinch zoom.
    root.style.setProperty('--mobile-view-height', Math.round(view?.height || window.innerHeight) + 'px');
    root.style.setProperty('--mobile-view-top', Math.max(0, Math.round(view?.offsetTop || 0)) + 'px');
  }
  function queueViewport() {
    if (savedPage && !viewportFrame) viewportFrame = requestAnimationFrame(updateViewport);
  }
  function prepare() {
    if (!compact.matches) return;
    if (!savedPage) {
      savedPage = {x:window.scrollX, y:window.scrollY, styles:{}};
      for (const key of ['position','top','left','width','overflow']) savedPage.styles[key] = body.style[key];
      body.style.position = 'fixed'; body.style.top = -savedPage.y + 'px';
      body.style.left = -savedPage.x + 'px'; body.style.width = '100%'; body.style.overflow = 'hidden';
      root.classList.add('mobile-dialog-locked');
    }
    updateViewport();
  }
  function restorePage() {
    if (!savedPage) return;
    const page = savedPage; savedPage = null;
    if (viewportFrame) cancelAnimationFrame(viewportFrame);
    viewportFrame = 0;
    Object.assign(body.style, page.styles);
    root.classList.remove('mobile-dialog-locked');
    root.style.removeProperty('--mobile-view-height'); root.style.removeProperty('--mobile-view-top');
    window.scrollTo({left:page.x, top:page.y, behavior:'instant'});
  }
  window.visualViewport?.addEventListener('resize', queueViewport);
  window.visualViewport?.addEventListener('scroll', queueViewport);
  window.addEventListener('resize', queueViewport);
  compact.addEventListener('change', () => {
    resetDrag();
    if (compact.matches && document.querySelector('dialog[open]')) prepare(); else restorePage();
  });

  // Stop elastic pulling at a scroll boundary, while preserving normal scrolling and pinch zoom.
  for (const dialog of dialogs) {
    let touchY = null;
    dialog.addEventListener('touchstart', event => { touchY = event.touches.length === 1 ? event.touches[0].clientY : null; }, {passive:true});
    dialog.addEventListener('touchmove', event => {
      if (!compact.matches || touchY === null || event.touches.length !== 1 || event.target.closest?.('.cart-drag-handle')) return;
      const nextY = event.touches[0].clientY, delta = nextY - touchY; touchY = nextY;
      let node = event.target;
      while (node && node !== dialog.parentElement) {
        if (node.scrollHeight > node.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(node).overflowY)) {
          const canScroll = delta > 0 ? node.scrollTop > 0 : node.scrollTop + node.clientHeight < node.scrollHeight - 1;
          if (canScroll) return;
        }
        if (node === dialog) break;
        node = node.parentElement;
      }
      if (delta && event.cancelable !== false) event.preventDefault();
    }, {passive:false});
    dialog.addEventListener('touchend', () => { touchY = null; }, {passive:true});
    dialog.addEventListener('touchcancel', () => { touchY = null; }, {passive:true});
    dialog.addEventListener('close', () => {
      if (dialog === cart) resetDrag();
      if (!document.querySelector('dialog[open]')) restorePage();
    });
  }

  function resetDrag() {
    const previousDrag = drag; drag = null;
    if (previousDrag && handle?.hasPointerCapture(previousDrag.id)) handle.releasePointerCapture(previousDrag.id);
    if (motion) { const previous = motion; motion = null; previous.cancel(); }
    cart?.classList.remove('is-dragging');
    cart?.style.removeProperty('--cart-drag-y');
  }
  function settleDrag(distance, close) {
    resetDrag();
    if (!cart.open) return;
    if (reduced.matches || typeof cart.animate !== 'function' || !distance) { if (close) cart.close(); return; }
    const animation = cart.animate([
      {transform:`translateY(${distance}px)`,opacity:1},
      {transform:close ? `translateY(${cart.getBoundingClientRect().height + 24}px)` : 'translateY(0)',opacity:close ? 0 : 1},
    ], {duration:close ? 180 : 210,easing:'cubic-bezier(.2,.7,.2,1)',fill:'forwards'});
    motion = animation;
    animation.finished.then(() => {
      if (motion !== animation) return;
      motion = null;
      if (close && cart.open) cart.close();
      animation.cancel();
    }).catch(() => {});
  }
  handle?.addEventListener('pointerdown', event => {
    if (!compact.matches || !cart.open || event.button !== 0 || event.isPrimary === false) return;
    resetDrag();
    suppressClick = false;
    drag = {id:event.pointerId,x:event.clientX,y:event.clientY,time:event.timeStamp,distance:0,moved:false};
    handle.setPointerCapture(event.pointerId);
    cart.classList.add('is-dragging');
  });
  handle?.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId) return;
    const dy = event.clientY - drag.y, dx = Math.abs(event.clientX - drag.x);
    drag.moved ||= Math.max(dx, Math.abs(dy)) > 4;
    if (dx > 24 && dx > Math.abs(dy) * 1.5) { suppressClick = true; settleDrag(drag.distance, false); return; }
    drag.distance = Math.max(0, dy);
    cart.style.setProperty('--cart-drag-y', drag.distance + 'px');
  });
  handle?.addEventListener('pointerup', event => {
    if (!drag || drag.id !== event.pointerId) return;
    const distance = drag.distance, elapsed = Math.max(1, event.timeStamp - drag.time);
    const close = distance > Math.min(120, cart.getBoundingClientRect().height * .22) || (distance > 36 && distance / elapsed > .6);
    // A completed drag must not also trigger the handle's click action.
    suppressClick = drag.moved;
    settleDrag(distance, close);
  });
  handle?.addEventListener('pointercancel', () => { if (drag) { suppressClick = true; settleDrag(drag.distance, false); } });
  handle?.addEventListener('lostpointercapture', () => { if (drag) settleDrag(drag.distance, false); });
  let suppressClick = false;
  handle?.addEventListener('click', event => {
    if (suppressClick && event.detail !== 0) { suppressClick = false; return; }
    suppressClick = false; if (compact.matches && cart.open) cart.close();
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) resetDrag(); });
  window.SlidersMobileDialogs = Object.freeze({prepare});
})();
