/* Prisma Studio — único renderizador declarativo das opções de ferramentas.
 * Os esquemas contêm tipo, rótulo, limites, valor e callbacks; nenhum motor
 * precisa produzir HTML. Usa DOM e textContent para texto e fontes locais.
 */
(function () {
  'use strict';

  const PS = window.PS;
  const O = PS.toolOptions = {
    range: (s, id, label, key, min, max, step = 1, suffix = '') => ({
      type: 'range',
      id,
      label,
      min,
      max,
      step,
      suffix,
      value: s[key] ?? 0,
      onChange: v => {
        s[key] = v;
      }
    }),
    check: (s, id, label, key) => ({
      type: 'checkbox',
      id,
      label,
      value: s[key],
      onChange: v => {
        s[key] = v;
      }
    }),
    segment: (s, id, key, items, after) => ({
      type: 'segment',
      id,
      items,
      value: s[key],
      onChange: v => {
        s[key] = v;
        after?.();
        PS.tools.renderOptions();
        PS.view.render();
      }
    }),
    select: (s, id, label, key, items, after) => ({
      type: 'select',
      id,
      label,
      items,
      value: s[key],
      onChange: v => {
        s[key] = v;
        after?.();
      }
    }),
    number: (id, label, value, onChange, step = 1) => ({
      type: 'number',
      id,
      label,
      value,
      onChange,
      step
    }),
    hint: (text, id) => ({
      type: 'hint',
      text,
      id
    }),
    group: (children, className) => ({
      type: 'group',
      children,
      className
    }),
    button: (id, label, onClick, icon = '', variant = 'soft') => ({
      type: 'button',
      id,
      label,
      onClick,
      icon,
      variant
    })
  };
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function iconButton(spec) {
    const b = el('button', spec.className, spec.icon ? '' : spec.label);
    b.type = 'button';
    b.title = spec.label;
    b.setAttribute('aria-label', spec.label);
    if (spec.id) b.id = spec.id;
    if (spec.icon) {
      b.append(el('i', spec.icon));
      if (!spec.iconOnly) b.append(document.createTextNode(spec.label));
    }
    b.addEventListener('click', spec.onClick);
    return b;
  }
  function control(f) {
    if (f.type === 'group') {
      const e = el('div', f.className);
      f.children.filter(Boolean).forEach(c => e.append(control(c)));
      return e;
    }
    if (f.type === 'hint') {
      const e = el('p', 'hint', f.text);
      if (f.id) e.id = f.id;
      return e;
    }
    if (f.type === 'swatch') {
      const e = el('span', 'swatch');
      e.style.background = f.value;
      e.style.cursor = 'default';
      return e;
    }
    if (f.type === 'button') return iconButton({
      ...f,
      className: 'btn ' + f.variant + ' sm'
    });
    if (f.type === 'segment' || f.type === 'buttons') {
      const e = el('div', 'seg block');
      e.id = f.id;
      const items = f.type === 'segment' ? f.items.map(([key, label, icon]) => ({
        key,
        label,
        icon,
        active: key === f.value,
        onClick: () => f.onChange(key)
      })) : f.items;
      items.forEach(s => {
        const b = iconButton({
          ...s,
          className: s.active ? 'active' : '',
          iconOnly: true
        });
        if (s.key) b.dataset.k = s.key;
        if (s.align) b.dataset.a = s.align;
        e.append(b);
      });
      return e;
    }
    const wrap = el('label', f.type === 'range' ? 'sl' : f.type === 'checkbox' ? 'check' : f.type === 'color' ? 'color-row' : 'fld');
    if (f.label && f.type !== 'checkbox') wrap.append(el('span', f.type === 'color' ? 'grow' : '', f.label));
    const input = el(f.type === 'select' ? 'select' : f.type === 'textarea' ? 'textarea' : 'input', f.type === 'range' || f.type === 'checkbox' || f.type === 'color' ? '' : 'input');
    input.id = f.id;
    input.setAttribute('aria-label', f.label || f.id);
    if (f.type === 'select') {
      f.items.forEach(([v, l]) => {
        const o = el('option', '', l);
        o.value = v;
        input.append(o);
      });
    } else if (f.type === 'textarea') input.rows = 2;else input.type = f.type;
    for (const k of ['min', 'max', 'step']) if (f[k] !== undefined) input[k] = f[k];
    if (f.type === 'checkbox') input.checked = !!f.value;else input.value = f.value ?? '';
    wrap.append(input);
    let out;
    if (f.type === 'range') {
      input.dataset.suffix = f.suffix || '';
      out = el('output', '', input.value + (f.suffix || ''));
      wrap.append(out);
    }
    if (f.type === 'checkbox') wrap.append(document.createTextNode(' ' + f.label));
    if (f.onKey) input.addEventListener('keydown', f.onKey);
    input.addEventListener(f.type === 'checkbox' || f.type === 'select' ? 'change' : 'input', () => {
      const v = f.type === 'checkbox' ? input.checked : f.type === 'range' || f.type === 'number' ? +input.value : input.value;
      if (out) out.textContent = input.value + (f.suffix || '');
      f.onChange?.(v);
      if (PS.tools.current === 'crop') PS.view.renderOverlay();
      else if (PS.tools.current !== 'text') PS.view.render();
    });
    return wrap;
  }
  O.render = tool => {
    const target = PS.$('#toolOptions'),
      T = PS.tools,
      doc = PS.doc;
    target.hidden = T.current === 'hand' || !doc.has;
    target.replaceChildren();
    if (target.hidden) return;
    const button = PS.$(`.tool[data-tool="${T.current}"]`),
      h = el('h3');
    h.append(el('i', button.querySelector('i').className), document.createTextNode(button.title.replace(/ \(.+\)$/, '')));
    if (doc.editMask) h.append(el('span', 'pill', 'na máscara'));
    target.append(h);
    (tool?.options() || []).filter(Boolean).forEach(f => target.append(control(f)));
  };
})();
