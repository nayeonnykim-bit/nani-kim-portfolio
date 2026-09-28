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
  const selectSection = (el) => {
    selected?.classList.remove('debug-selected');
    selected = el;
    selected?.classList.add('debug-selected');
    selectionLabel.textContent = selected ? editableName(selected) : 'No section selected';
    if (!selected) return;
    document.querySelector('#layout-height').value = Math.min(1200, Math.max(240, Math.round(selected.getBoundingClientRect().height)));
    document.querySelector('#layout-padding').value = parseInt(getComputedStyle(selected).paddingTop) || 0;
    document.querySelector('#layout-columns').value = selected.dataset.columns || '1';
    document.querySelector('#layout-align').value = selected.style.textAlign || 'left';
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
  const apply = (id, fn) => document.querySelector(id).addEventListener('input', event => selected && fn(event.target.value));
  apply('#layout-height', value => selected.style.minHeight = `${value}px`);
  apply('#layout-padding', value => selected.style.padding = `${value}px`);
  apply('#layout-columns', value => { selected.dataset.columns = value; selected.style.gridTemplateColumns = value === '1' ? '1fr' : `repeat(${value},minmax(0,1fr))`; });
  apply('#layout-align', value => selected.style.textAlign = value);
  apply('#layout-bg', value => selected.style.background = value);
  apply('#layout-color', value => selected.style.color = value);

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
    if (!selected || !selected.dataset.editorCreated) { status.textContent = 'Only sections added in the editor can be removed.'; return; }
    selected.remove(); selectSection(null); status.textContent = 'Section removed. Save to keep this change.';
  });
  document.querySelector('#toggle-grid').addEventListener('change', event => body.classList.toggle('debug-grid-overlay', event.target.checked));
  document.querySelector('#toggle-outline').addEventListener('change', event => body.classList.toggle('debug-outlines', event.target.checked));
  document.querySelector('#toggle-motion').addEventListener('change', event => body.classList.toggle('debug-reduce-motion', event.target.checked));

  document.querySelector('#save-draft').addEventListener('click', async () => {
    selected?.classList.remove('debug-selected');
    const draft = { html: main.innerHTML, savedAt: new Date().toISOString(), version: 1 };
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
      if (draft?.html) { main.innerHTML = draft.html; status.textContent = `Draft restored from ${new Date(draft.savedAt).toLocaleString()}.`; }
      draftLoaded = true;
    } catch { draftLoaded = true; }
  })();

  window.__portfolioEditor = {
    getDraft: async () => await dbGet('current'),
    hasDraft: () => draftLoaded,
    open: () => toggleEditor(true)
  };
})();
