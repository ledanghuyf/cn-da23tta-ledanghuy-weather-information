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
  // Máy tính: kết quả tìm và "Địa điểm của bạn" là bảng thả xuống trên thanh trên cùng.
  // Đóng khi bấm/chuyển focus ra ngoài hoặc Esc để không che nội dung. Không dựa vào :focus-within
  // vì danh sách được vẽ lại sẽ tạm mất focus và ẩn bảng trước khi JS kịp trả focus.
  const saved = document.querySelector('.personal-section');
  const panels = [document.querySelector('.search-panel'), document.querySelector('.location-tools')];
  const closeOutside = target => {
    if (small.matches) return;
    for (const panel of panels) if (!panel.contains(target)) panel.dataset.dismissed = '';
    if (saved.open && !saved.contains(target)) saved.open = false;
  };
  document.addEventListener('pointerdown', event => closeOutside(event.target));
  document.addEventListener('focusin', event => closeOutside(event.target));
  for (const panel of panels) {
    panel.addEventListener('focusin', () => delete panel.dataset.dismissed);
    panel.addEventListener('keydown', event => { if (event.key === 'Escape' && !small.matches) panel.dataset.dismissed = ''; });
  }
  saved.addEventListener('keydown', event => {
    if (event.key === 'Escape' && saved.open && !small.matches) { event.stopPropagation(); saved.open = false; saved.querySelector('summary').focus(); }
  });
  // Chọn một nơi xong (kết quả tìm, nơi phổ biến, nơi đã lưu): khi thời tiết tải xong thì đóng bảng thả xuống,
  // cuộn lên đầu để thấy nơi mới và đưa focus tới tên nơi (trình đọc màn hình đọc ngay). Lỗi tải thì giữ nguyên để thử lại.
  let picked = false;
  document.addEventListener('click', event => {
    if (event.target.closest('.result-button, .personal-place')) picked = true;
  });
  new MutationObserver(() => {
    const content = document.getElementById('weather-content');
    if (!picked || content.getAttribute('aria-busy') !== 'false') return;
    picked = false;
    if (document.getElementById('weather-status').dataset.kind !== 'success') return;
    panels[0].dataset.dismissed = ''; saved.open = false;
    if (small.matches) drawer.open = false;
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.getElementById('place-name').focus({ preventScroll: true });
  }).observe(document.getElementById('weather-content'), { attributes: true, attributeFilter: ['aria-busy'] });
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
  // Chiều sâu 3D: ghi vị trí chuột (-0.5..0.5) và độ cuộn (0..1) vào biến CSS; các lớp trời/biểu tượng
  // dịch theo độ sâu riêng (xem app.css). Tối đa một lần mỗi khung hình; tắt khi người dùng chọn giảm chuyển động.
  const still = window.matchMedia('(prefers-reduced-motion: reduce)');
  // Hiệu ứng động: mặc định theo cài đặt giảm chuyển động của máy; nút "Hiệu ứng" cho người xem tự bật/tắt, nhớ trên trình duyệt.
  const MOTION_KEY = 'may.motion.v1', motionButton = document.getElementById('motion-toggle');
  let motionMemory = null; // dùng khi trình duyệt chặn lưu trữ
  const savedMotion = () => { try { return localStorage.getItem(MOTION_KEY) ?? motionMemory; } catch { return motionMemory; } };
  const motionOn = () => { const saved = savedMotion(); return saved ? saved === 'on' : !still.matches; };
  function applyMotion() {
    const saved = savedMotion();
    if (saved) document.documentElement.dataset.motion = saved; else delete document.documentElement.dataset.motion;
    const on = motionOn();
    motionButton.setAttribute('aria-pressed', String(on));
    motionButton.title = on ? 'Hiệu ứng động đang bật. Bấm để tắt.' : 'Hiệu ứng động đang tắt. Bấm để bật.';
  }
  motionButton.addEventListener('click', () => {
    motionMemory = motionOn() ? 'off' : 'on';
    try { localStorage.setItem(MOTION_KEY, motionMemory); } catch {}
    applyMotion();
  });
  still.addEventListener('change', applyMotion);
  applyMotion();
  const depthTargets = ['.sky', '#current-panel', '#daily-view'].map(selector => document.querySelector(selector));
  let frame = 0, mx = 0, my = 0;
  const paint = () => {
    frame = 0;
    const sy = Math.min(1, window.scrollY / window.innerHeight);
    for (const el of depthTargets) { el.style.setProperty('--mx', mx.toFixed(3)); el.style.setProperty('--my', my.toFixed(3)); el.style.setProperty('--sy', sy.toFixed(3)); }
  };
  const queueDepth = () => { if (!frame && motionOn()) frame = requestAnimationFrame(paint); };
  window.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse') return;
    mx = event.clientX / window.innerWidth - .5; my = event.clientY / window.innerHeight - .5; queueDepth();
  }, { passive: true });
  window.addEventListener('scroll', queueDepth, { passive: true });
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
