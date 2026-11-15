"use strict";
// Điều khiển giao diện không thay đổi dữ liệu khí tượng từ API.
(() => {
  const drawer = document.getElementById('location-drawer');
  const small = window.matchMedia('(max-width: 760px)');
  drawer.open = !small.matches;
  small.addEventListener('change', event => { if (!event.matches) drawer.open = true; });
  drawer.addEventListener('keydown', event => {
    if (event.key === 'Escape' && small.matches) { drawer.open = false; drawer.querySelector('summary').focus(); }
  });
  const date = document.getElementById('weather-date');
  const prev = document.getElementById('date-prev'), next = document.getElementById('date-next'), now = document.getElementById('date-now');
  function updateDays() {
    prev.disabled = date.disabled || date.selectedIndex <= 0;
    next.disabled = date.disabled || date.selectedIndex < 0 || date.selectedIndex >= date.options.length - 1;
    now.disabled = date.disabled || !date.value;
  }
  function move(step) {
    if (date.disabled) return;
    const index = date.selectedIndex + step;
    if (!date.options[index]) return;
    date.selectedIndex = index; date.dispatchEvent(new Event('change', {bubbles:true}));
  }
  prev.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  now.addEventListener('click', () => { date.value = ''; date.dispatchEvent(new Event('change', {bubbles:true})); });
  date.addEventListener('change', updateDays);
  new MutationObserver(updateDays).observe(date, {childList:true, attributes:true, attributeFilter:['disabled']});
  updateDays();
  const age = document.getElementById('weather-age');
  function updateAge() {
    const loading = document.getElementById('weather-content').getAttribute('aria-busy') === 'true';
    const data = state.weather;
    if (!data || loading) { age.hidden = true; return; }
    const result = WeatherDataTools.freshness(data);
    age.hidden = result.kind !== 'warning';
    age.textContent = result.kind === 'warning' ? result.text : '';
  }
  new MutationObserver(updateAge).observe(document.getElementById('weather-content'), {attributes:true, attributeFilter:['aria-busy']});
  window.addEventListener('focus', updateAge);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) updateAge(); });
  setInterval(() => { if (!document.hidden) updateAge(); }, 60000);
})();
