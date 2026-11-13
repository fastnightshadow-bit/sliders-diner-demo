/* Ingredient names, rather than indexes, keep saved choices safe if the menu is reordered. */
(() => {
  function keyFor(dish, excluded = []) {
    if (!dish || !Array.isArray(excluded) || excluded.some(name => typeof name !== 'string' || !dish.ingredients.includes(name))) return null;
    const names = [...new Set(dish.ingredients)].filter(name => excluded.includes(name));
    if (names.length && names.length === new Set(dish.ingredients).size) return null;
    return names.length ? dish.id + '::' + JSON.stringify(names) : dish.id;
  }
  function resolve(key, catalogue) {
    if (typeof key !== 'string') return null;
    if (catalogue.has(key)) return {key, dish:catalogue.get(key), excluded:[]};
    const separator = key.indexOf('::');
    if (separator < 0) return null;
    const dish = catalogue.get(key.slice(0, separator));
    try {
      const excluded = JSON.parse(key.slice(separator + 2));
      const canonical = keyFor(dish, excluded);
      if (canonical === null) return null;
      return {key:canonical, dish, excluded:[...new Set(dish.ingredients)].filter(name => excluded.includes(name))};
    } catch { return null; }
  }
  function readEntries(saved, catalogue) {
    const cart = new Map();
    if (!Array.isArray(saved)) return cart;
    for (const entry of saved) {
      if (!Array.isArray(entry) || entry.length !== 2 || !Number.isInteger(entry[1]) || entry[1] < 1 || entry[1] > 99) continue;
      const line = resolve(entry[0], catalogue);
      if (line) cart.set(line.key, Math.min(99, (cart.get(line.key) || 0) + entry[1]));
    }
    return cart;
  }
  window.SlidersCartOptions = Object.freeze({keyFor, resolve, readEntries});
})();
