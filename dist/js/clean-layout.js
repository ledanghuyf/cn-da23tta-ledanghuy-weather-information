"use strict";
// Thanh mục: sáng mục đang xem khi cuộn, bấm mục thì cuộn tới đúng phần.
(() => {
  const links = [...document.querySelectorAll('.weather-tabs a')];
  const targets = links.map(link => document.querySelector(link.getAttribute('href')));
  let pending = false;
  let waitingForAnchor = location.hash;
  let anchoredIndex = null;
  function setActive(active) {
    links.forEach((link, index) => {
      if (index === active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  function updateNavigation() {
    pending = false;
    let active = 0;
    const visible = targets.map((target, index) => ({target, index})).filter(({target}) => target.getClientRects().length);
    const anchorMargin = Math.max(...targets.map(target => parseFloat(getComputedStyle(target).scrollMarginTop) || 0));
    const pagePadding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    const threshold = Math.max(document.querySelector('.weather-tabs').getBoundingClientRect().bottom + 24, anchorMargin + pagePadding + 2);
    if (anchoredIndex !== null) {
      const rect = targets[anchoredIndex].getBoundingClientRect();
      if (rect.bottom > threshold && rect.top < window.innerHeight) { setActive(anchoredIndex); return; }
      anchoredIndex = null;
    }
    visible.forEach(({target, index}) => { if (target.getBoundingClientRect().top <= threshold) active = index; });
    // Mục cuối có thể không lên sát thanh menu vì trang đã chạm đáy.
    const atBottom = window.scrollY > 0 && Math.ceil(window.scrollY + window.innerHeight) >= document.documentElement.scrollHeight - 4;
    if (atBottom && visible.length) active = visible[visible.length - 1].index;
    setActive(active);
  }
  function scheduleNavigation() {
    if (!pending) { pending = true; requestAnimationFrame(updateNavigation); }
  }
  function openAnchor() {
    const index = links.findIndex(link => link.hash === waitingForAnchor);
    if (index < 0 || !targets[index].getClientRects().length) return;
    waitingForAnchor = '';
    anchoredIndex = index;
    targets[index].scrollIntoView({block:'start', behavior:'instant'});
    setActive(index);
    scheduleNavigation();
  }
  links.forEach((link, index) => link.addEventListener('click', event => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (location.hash !== link.hash) history.pushState(null, '', link.hash);
    waitingForAnchor = link.hash; setActive(index); openAnchor();
  }));
  window.addEventListener('hashchange', () => { waitingForAnchor = location.hash; openAnchor(); scheduleNavigation(); });
  window.addEventListener('scroll', scheduleNavigation, {passive:true});
  const resumeScrollTracking = () => { anchoredIndex = null; waitingForAnchor = ''; scheduleNavigation(); };
  window.addEventListener('wheel', resumeScrollTracking, {passive:true});
  window.addEventListener('touchmove', resumeScrollTracking, {passive:true});
  window.addEventListener('keydown', event => {
    if (event.target.closest('input,select,textarea,[role="tab"]')) return;
    if (['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key)) resumeScrollTracking();
  });
  window.addEventListener('pointerdown', event => {
    if (event.clientX >= document.documentElement.clientWidth) resumeScrollTracking();
  });
  window.addEventListener('resize', scheduleNavigation);
  new ResizeObserver(() => { openAnchor(); scheduleNavigation(); }).observe(document.querySelector('.main-content'));
  openAnchor();
  updateNavigation();
})();
