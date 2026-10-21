/* Prisma Studio — destacar, arrastar e reencaixar a barra de ferramentas.
 * Guarda posição e modo em localStorage, tolera armazenamento bloqueado e
 * mantém a barra dentro da área da imagem após resize ou restauração.
 */
(function () {
  'use strict';

  const PS = window.PS,
    rail = PS.$('.toolrail'),
    stage = PS.$('#stage'),
    key = 'prisma.toolrail';
  const placeholder = document.createElement('div');
  placeholder.className = 'toolrail-placeholder';
  placeholder.hidden = true;
  placeholder.setAttribute('aria-hidden', 'true');
  rail.before(placeholder);
  const header = document.createElement('div');
  header.className = 'toolrail-head';
  const handle = document.createElement('button');
  handle.id = 'toolbarHandle';
  handle.type = 'button';
  handle.className = 'rail-handle';
  handle.title = 'Arrastar barra de ferramentas';
  handle.setAttribute('aria-label', handle.title);
  handle.textContent = '⠿';
  const toggle = document.createElement('button');
  toggle.id = 'toolbarDock';
  toggle.type = 'button';
  toggle.className = 'rail-toggle';
  toggle.innerHTML = '<i class="fa-solid fa-up-right-from-square"></i>';
  header.append(handle, toggle);
  rail.prepend(header);
  let state = {
      floating: false,
      x: 0,
      y: 0
    },
    drag = null,
    suppressClick = false;
  try {
    const saved = JSON.parse(localStorage.getItem(key) || 'null');
    if (saved && typeof saved.floating === 'boolean' && Number.isFinite(saved.x) && Number.isFinite(saved.y)) state = saved;
  } catch (_) {/* Armazenamento opcional. */}
  const save = () => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (_) {/* Continua utilizável sem persistência. */}
  };
  function position() {
    if (!state.floating || stage.getBoundingClientRect().width === 0) return;
    const r = stage.getBoundingClientRect();
    rail.style.maxHeight = Math.max(70, Math.min(r.height - 16, innerHeight - r.top - 8)) + 'px';
    state.x = PS.clamp(state.x, r.left + 8, Math.max(r.left + 8, r.right - rail.offsetWidth - 8));
    state.y = PS.clamp(state.y, r.top + 8, Math.max(r.top + 8, r.bottom - rail.offsetHeight - 8));
    rail.style.left = state.x + 'px';
    rail.style.top = state.y + 'px';
  }
  function apply() {
    rail.classList.toggle('floating', state.floating);
    placeholder.hidden = !state.floating;
    toggle.title = state.floating ? 'Encaixar barra à esquerda' : 'Destacar barra de ferramentas';
    toggle.setAttribute('aria-label', toggle.title);
    toggle.setAttribute('aria-pressed', String(state.floating));
    toggle.querySelector('i').className = 'fa-solid ' + (state.floating ? 'fa-arrow-left' : 'fa-up-right-from-square');
    if (state.floating) position();else {
      rail.style.left = '';
      rail.style.top = '';
      rail.style.maxHeight = '';
    }
  }
  toggle.addEventListener('click', () => {
    if (!state.floating && !state.x) {
      const r = stage.getBoundingClientRect();
      state.x = r.left + 16;
      state.y = r.top + 16;
    }
    state.floating = !state.floating;
    apply();
    save();
  });
  handle.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    handle.setPointerCapture(e.pointerId);
    drag = {
      px: e.clientX,
      py: e.clientY,
      x: state.x,
      y: state.y,
      started: false
    };
    suppressClick = false;
    e.preventDefault();
  });
  handle.addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.px,
      dy = e.clientY - drag.py;
    if (!drag.started && Math.hypot(dx, dy) < 4) return;
    if (!drag.started) {
      drag.started = true;
      suppressClick = true;
      if (!state.floating) {
        const r = stage.getBoundingClientRect();
        state.floating = true;
        drag.x = r.left + 16;
        drag.y = r.top + 16;
        apply();
      }
    }
    state.x = drag.x + dx;
    state.y = drag.y + dy;
    position();
  });
  const end = () => {
    if (drag) {
      drag = null;
      save();
    }
  };
  handle.addEventListener('pointerup', end);
  handle.addEventListener('pointercancel', end);
  handle.addEventListener('click', () => {
    if (!suppressClick) toggle.click();
    suppressClick = false;
  });
  window.addEventListener('resize', () => {
    position();
    save();
  });
  new ResizeObserver(position).observe(stage);
  apply();
})();
