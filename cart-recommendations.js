'use strict';

// Complement the order using the existing catalogue; combos already include sides/drinks.
(() => {
  function choose(cart, catalogue) {
    const selected = [...cart.keys()].map(id => catalogue.get(id)).filter(Boolean);
    if (!selected.length) return {items:[], caption:''};
    const categories = new Set(selected.map(dish => dish.category));
    const combo = categories.has('combo');
    const burger = combo || categories.has('sliders') || categories.has('smash');
    const fries = combo || categories.has('fries');
    const drink = combo || categories.has('drinks');
    const candidates = [];
    if (!burger) candidates.push('bacon');
    if (!fries) candidates.push('fries-classic');
    if (!categories.has('sauces') && (burger || fries || categories.has('snacks'))) candidates.push('sauce-bbq');
    if (!drink) candidates.push('coca-cola');
    if (!categories.has('desserts')) candidates.push('cheesecake');
    return {
      items: [...new Set(candidates)].filter(id => !cart.has(id) && catalogue.has(id)).slice(0,3).map(id => catalogue.get(id)),
      caption: combo ? 'Ещё немного удовольствия' : burger ? 'Хорошо к твоему бургеру' : fries ? 'К картошке — самое то' : 'Вместе ещё вкуснее'
    };
  }
  window.SlidersRecommendations = Object.freeze({choose});
})();
