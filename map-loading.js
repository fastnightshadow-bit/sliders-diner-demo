/* Give page images priority, then prepare the actual map before Contacts is opened. */
(() => {
  const frames = [...document.querySelectorAll('iframe[data-src]')];
  if (!frames.length) return;
  let observer;
  const load = frame => {
    if (!frame.dataset.src || !frame.getBoundingClientRect().width) return;
    const url = frame.dataset.src;
    delete frame.dataset.src;
    // We already schedule this request; native lazy loading must not postpone it again.
    frame.loading = 'eager';
    frame.src = url;
    observer?.unobserve(frame);
  };
  const loadVisible = () => frames.forEach(load);
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) load(entry.target); });
    }, {rootMargin:'1200px 0px'});
    frames.forEach(frame => observer.observe(frame));
  }
  for (const link of document.querySelectorAll('a[href="#visit"]')) {
    for (const event of ['pointerenter','focus','click']) link.addEventListener(event, loadVisible, {passive:true});
  }
  function preload() {
    const connection = navigator.connection;
    if (observer && (connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType || ''))) return;
    if (window.requestIdleCallback) window.requestIdleCallback(loadVisible, {timeout:1800});
    else setTimeout(loadVisible, 600);
  }
  if (document.readyState === 'complete') preload();
  else window.addEventListener('load', preload, {once:true});
})();
