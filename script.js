const status = document.querySelector('.form-status');
document.addEventListener('submit', (event) => {
  if (event.target.id !== 'contact-form') return;
  event.preventDefault();
  const data = new FormData(event.target);
  const subject = encodeURIComponent(`Portfolio enquiry from ${data.get('name')}`);
  const body = encodeURIComponent(`${data.get('message')}\n\nFrom: ${data.get('name')} (${data.get('email')})`);
  status.textContent = 'Opening your email app…';
  window.location.href = `mailto:hi@andrew.com?subject=${subject}&body=${body}`;
});

(() => {
  const body = document.body;
  const menu = document.querySelector('.debug-menu');
  const status = document.querySelector('#debug-status');
  const selectionLabel = document.querySelector('#debug-selection');
  const main = document.querySelector('main');
  let selected = null;
  let draftLoaded = false;
  document.querySelector('#padding-x').closest('label').childNodes[0].textContent = 'Component gap X ';
  document.querySelector('#padding-y').closest('label').childNodes[0].textContent = 'Component gap Y ';

  const openDb = () => new Promise((resolve, reject) => {
    const request = indexedDB.open('nani-portfolio-editor', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('drafts');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  const dbGet = async (key) => {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction('drafts').objectStore('drafts').get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  };

  const dbSet = async (key, value) => {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction('drafts', 'readwrite').objectStore('drafts').put(value, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  };

  const dbDelete = async (key) => {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction('drafts', 'readwrite').objectStore('drafts').delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  };

  const toggleEditor = (force) => {
    const open = typeof force === 'boolean' ? force : !body.classList.contains('debug-open');
    body.classList.toggle('debug-open', open);
    body.classList.toggle('debug-editing', open);
    menu.setAttribute('aria-hidden', String(!open));
  };

  const editableName = (el) => el?.id || el?.querySelector('h1,h2,h3')?.textContent?.trim() || 'Custom section';
  const numberFrom = (value, fallback = 0) => Number.parseFloat(value) || fallback;
  const syncField = (id, value, suffix = '') => {
    const input = document.querySelector(id);
    if (!input) return;
    input.value = value;
    const output = document.querySelector(`${id}-value`);
    if (output) output.value = `${value}${suffix}`;
  };
  const selectSection = (el) => {
    selected?.classList.remove('debug-selected');
    selected = el;
    selected?.classList.add('debug-selected');
    selectionLabel.textContent = selected ? `Global controls · selected: ${editableName(selected)}` : 'Global site controls';
  };

  document.querySelector('.debug-trigger').addEventListener('click', () => toggleEditor(true));
  document.querySelector('[data-debug-close]').addEventListener('click', () => toggleEditor(false));
  window.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() !== 'd' || event.metaKey || event.ctrlKey || event.altKey) return;
    if (/input|textarea|select/i.test(event.target.tagName) || event.target.isContentEditable) return;
    toggleEditor();
  });

  main.addEventListener('click', (event) => {
    if (!body.classList.contains('debug-editing')) return;
    const section = event.target.closest('[data-editable-section]');
    if (!section) return;
    event.preventDefault();
    event.stopPropagation();
    selectSection(section);
  }, true);

  const makeSection = (type) => {
    const section = document.createElement('section');
    section.className = 'custom-section panel';
    section.dataset.editableSection = '';
    section.dataset.editorCreated = type;
    section.innerHTML = type === 'split'
      ? '<div><p class="eyebrow">New section</p><h2 contenteditable="true">Your title</h2></div><p contenteditable="true">Add your story here. Click this text while the editor is open to revise it.</p>'
      : type === 'text'
        ? '<p class="eyebrow">New section</p><h2 contenteditable="true">Your title</h2><p contenteditable="true">Click to edit this text.</p>'
        : `<div class="media-placeholder"><p>Select this section, then upload a ${type}.</p></div>`;
    if (type === 'split') { section.dataset.columns = '2'; section.style.gridTemplateColumns = 'repeat(2,minmax(0,1fr))'; }
    document.querySelector('#contact').before(section);
    selectSection(section);
    section.scrollIntoView({behavior:'smooth', block:'center'});
  };

  document.querySelectorAll('[data-add]').forEach(button => button.addEventListener('click', () => makeSection(button.dataset.add)));
  const panels = () => [...main.querySelectorAll('.panel')];
  const apply = (id, fn, suffix = '') => document.querySelector(id).addEventListener('input', event => {
    fn(event.target.value);
    const output = document.querySelector(`${id}-value`);
    if (output) output.value = `${event.target.value}${suffix}`;
    status.textContent = 'Global style changed. Save the draft to keep it.';
  });
  apply('#layout-height', value => panels().forEach(panel => panel.style.minHeight = `${value}px`), 'px');
  apply('#layout-width', value => { main.style.width = `${value}%`; main.style.marginLeft = 'auto'; main.style.marginRight = 'auto'; }, '%');
  apply('#layout-gap', value => { main.style.display = 'flex'; main.style.flexDirection = 'column'; main.style.gap = `${value}px`; }, 'px');
  apply('#padding-x', value => {
    main.querySelectorAll('.works,.about,.contact,.hero-content,[data-columns]').forEach(layout => layout.style.columnGap = `${value}px`);
  }, 'px');
  apply('#padding-y', value => {
    main.style.display = 'flex';
    main.style.flexDirection = 'column';
    main.style.rowGap = `${value}px`;
    main.querySelectorAll('.works,.about,.contact,.hero-content,[data-columns]').forEach(layout => layout.style.rowGap = `${value}px`);
  }, 'px');
  apply('#margin-x', value => { main.style.marginLeft = `${value}px`; main.style.marginRight = `${value}px`; main.style.width = `calc(100% - ${value * 2}px)`; }, 'px');
  apply('#margin-y', value => { main.style.marginTop = `${value}px`; main.style.marginBottom = `${value}px`; }, 'px');
  apply('#layout-columns', value => { const grid = document.querySelector('[data-project-grid]'); grid.dataset.columns = value; grid.style.gridTemplateColumns = value === '1' ? '1fr' : `repeat(${value},minmax(0,1fr))`; });
  apply('#layout-align', value => panels().forEach(panel => panel.style.textAlign = value));
  apply('#layout-items', value => panels().forEach(panel => panel.style.alignItems = value));
  apply('#layout-justify', value => panels().forEach(panel => panel.style.justifyContent = value));
  apply('#layout-radius', value => panels().forEach(panel => panel.style.borderRadius = `${value}px`), 'px');
  apply('#layout-opacity', value => panels().forEach(panel => panel.style.opacity = value / 100), '%');
  apply('#layout-overflow', value => panels().forEach(panel => panel.style.overflow = value));
  apply('#type-scale', value => { main.dataset.typeScale = value; main.style.fontSize = `${value}%`; }, '%');
  apply('#line-height', value => { main.dataset.lineHeight = value; main.style.lineHeight = value / 100; });
  apply('#letter-space', value => { main.dataset.letterSpace = value; main.style.letterSpacing = `${value}px`; }, 'px');
  apply('#layout-bg', value => { body.style.background = value; panels().filter(panel => !panel.classList.contains('project') && !panel.classList.contains('hero')).forEach(panel => panel.style.backgroundColor = value); });
  apply('#layout-color', value => { main.style.color = value; panels().forEach(panel => panel.style.color = value); });
  apply('#media-fit', value => main.querySelectorAll('img,video').forEach(media => media.style.objectFit = value));
  apply('#media-position', value => main.querySelectorAll('img,video').forEach(media => media.style.objectPosition = value));

  document.querySelectorAll('[data-space]').forEach(button => button.addEventListener('click', () => {
    const values = {compact:[20,20,4,4],comfortable:[56,56,8,8],airy:[112,112,16,16]}[button.dataset.space];
    main.style.display = 'flex';
    main.style.flexDirection = 'column';
    main.style.margin = `${values[3]}px ${values[2]}px`;
    main.style.width = `calc(100% - ${values[2] * 2}px)`;
    main.style.gap = `${values[1]}px`;
    main.querySelectorAll('.works,.about,.contact,.hero-content,[data-columns]').forEach(layout => {
      layout.style.columnGap = `${values[0]}px`;
      layout.style.rowGap = `${values[1]}px`;
    });
    status.textContent = `${button.textContent} component spacing applied across the website.`;
  }));

  document.querySelector('#media-upload').addEventListener('change', event => {
    const file = event.target.files?.[0];
    if (!file || !selected) { status.textContent = 'Select a section before uploading media.'; return; }
    const reader = new FileReader();
    reader.onload = () => {
      const media = document.createElement(file.type.startsWith('video/') ? 'video' : 'img');
      media.src = reader.result;
      media.alt = file.name;
      if (media.tagName === 'VIDEO') { media.controls = true; media.loop = true; media.playsInline = true; }
      selected.querySelector('.media-placeholder')?.remove();
      selected.append(media);
      status.textContent = `${file.name} added. Save the draft to keep it.`;
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  });

  document.querySelector('#remove-section').addEventListener('click', () => {
    if (!selected) { status.textContent = 'Select a section first.'; return; }
    selected.remove(); selectSection(null); status.textContent = 'Section removed. Save to keep this change.';
  });
  document.querySelector('#duplicate-section').addEventListener('click', () => {
    if (!selected) { status.textContent = 'Select a section first.'; return; }
    const clone = selected.cloneNode(true);
    clone.removeAttribute('id');
    clone.dataset.editorCreated = clone.dataset.editorCreated || 'duplicate';
    selected.after(clone);
    selectSection(clone);
    status.textContent = 'Section duplicated.';
  });
  document.querySelector('#move-up').addEventListener('click', () => {
    if (!selected) { status.textContent = 'Select a section first.'; return; }
    const previous = selected.previousElementSibling;
    if (previous) previous.before(selected);
  });
  document.querySelector('#move-down').addEventListener('click', () => {
    if (!selected) { status.textContent = 'Select a section first.'; return; }
    const next = selected.nextElementSibling;
    if (next) next.after(selected);
  });
  document.querySelector('#reset-section').addEventListener('click', () => {
    if (!selected) { status.textContent = 'Select a section first.'; return; }
    selected.removeAttribute('style');
    delete selected.dataset.typeScale;
    delete selected.dataset.lineHeight;
    delete selected.dataset.letterSpace;
    selectSection(selected);
    status.textContent = 'Selected section styles reset.';
  });
  document.querySelector('#toggle-grid').addEventListener('change', event => body.classList.toggle('debug-grid-overlay', event.target.checked));
  document.querySelector('#toggle-outline').addEventListener('change', event => body.classList.toggle('debug-outlines', event.target.checked));
  document.querySelector('#toggle-motion').addEventListener('change', event => body.classList.toggle('debug-reduce-motion', event.target.checked));

  document.querySelector('#save-draft').addEventListener('click', async () => {
    selected?.classList.remove('debug-selected');
    const draft = { html: main.innerHTML, mainStyle: main.getAttribute('style') || '', bodyStyle: body.getAttribute('style') || '', savedAt: new Date().toISOString(), version: 2 };
    try { await dbSet('current', draft); status.textContent = `Saved ${new Date().toLocaleTimeString()}. Tell me “update” when ready to publish.`; }
    catch (error) { status.textContent = `Could not save: ${error.message}`; }
    selected?.classList.add('debug-selected');
  });

  document.querySelector('#reset-draft').addEventListener('click', async () => {
    await dbDelete('current');
    location.reload();
  });

  const updateViewport = () => document.querySelector('#debug-viewport').textContent = `${innerWidth} × ${innerHeight} · ${Math.round(scrollY)}px`;
  addEventListener('resize', updateViewport); addEventListener('scroll', updateViewport, {passive:true}); updateViewport();

  (async () => {
    try {
      const draft = await dbGet('current');
      if (draft?.html) {
        const template = document.createElement('template');
        template.innerHTML = draft.html;
        const savedHome = template.content.querySelector('#home');
        const currentHome = main.querySelector('#home');
        if (savedHome && currentHome?.querySelector('.hero-content') && !savedHome.querySelector('.hero-content')) {
          savedHome.innerHTML = currentHome.innerHTML;
          savedHome.dataset.columns = '2';
        }
        const savedWorks = template.content.querySelector('#works');
        if (savedWorks && !savedWorks.hasAttribute('data-project-grid')) {
          savedWorks.dataset.projectGrid = '';
          savedWorks.dataset.columns = '1';
        }
        main.innerHTML = template.innerHTML;
        if (draft.mainStyle) main.setAttribute('style', draft.mainStyle);
        if (draft.bodyStyle) body.setAttribute('style', draft.bodyStyle);
        status.textContent = `Draft restored from ${new Date(draft.savedAt).toLocaleString()} and upgraded to the latest layout.`;
      }
      draftLoaded = true;
    } catch { draftLoaded = true; }
  })();

  window.__portfolioEditor = {
    getDraft: async () => await dbGet('current'),
    hasDraft: () => draftLoaded,
    open: () => toggleEditor(true)
  };
})();
