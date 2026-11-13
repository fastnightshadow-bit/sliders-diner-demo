/* Native inputs retain keyboard, touch and screen-reader behavior. */
(() => {
  const list = document.getElementById('dialog-ingredients');
  const action = document.getElementById('dialog-action');
  const summary = document.getElementById('ingredient-summary');
  const box = document.querySelector('.ingredient-box');
  let currentDish = null;
  const excluded = () => [...list.querySelectorAll('input')].filter(input => !input.checked).map(input => input.value);
  function refresh() {
    const removed = excluded();
    const valid = window.SlidersCartOptions.keyFor(currentDish, removed) !== null;
    action.disabled = !valid;
    summary.textContent = !valid ? 'Оставь хотя бы один пункт состава.' : removed.length
      ? 'Убрать: ' + removed.join(', ') + '. Подтвердим изменения по телефону.'
      : 'Изменения состава подтвердим по телефону.';
    summary.classList.toggle('is-invalid', !valid);
  }
  function render(dish) {
    currentDish = dish;
    const ingredients = [...new Set(dish.ingredients)];
    box.hidden = ingredients.length === 0;
    const description = document.getElementById('dialog-description');
    description.textContent = dish.description;
    description.hidden = ingredients.length > 0;
    list.replaceChildren(...ingredients.map(name => {
      const row = document.createElement('li'), label = document.createElement('label');
      const input = document.createElement('input'), text = document.createElement('span');
      input.type = 'checkbox'; input.checked = true; input.value = name;
      text.textContent = name;
      label.append(input, text); row.append(label); return row;
    }));
    refresh();
  }
  list.addEventListener('change', refresh);
  window.SlidersDishOptions = Object.freeze({render, excluded});
})();
