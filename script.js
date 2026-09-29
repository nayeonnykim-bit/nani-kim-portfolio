const formStatus = document.querySelector('.form-status');
document.addEventListener('submit', (event) => {
  if (event.target.id !== 'contact-form') return;
  event.preventDefault();
  const data = new FormData(event.target);
  formStatus.textContent = 'Opening your email app…';
  location.href = `mailto:hi@andrew.com?subject=${encodeURIComponent(`Portfolio enquiry from ${data.get('name')}`)}&body=${encodeURIComponent(`${data.get('message')}\n\nFrom: ${data.get('name')} (${data.get('email')})`)}`;
});

(async () => {
  const body = document.body, main = document.querySelector('main'), menu = document.querySelector('.debug-menu');
  const status = document.querySelector('#debug-status'), selectionLabel = document.querySelector('#debug-selection');
  let selected = null, history = [], historyIndex = -1, restoring = false;
  const $ = selector => document.querySelector(selector);
  const clearLegacyTextLayoutGaps = () => {
    main.querySelectorAll('.hero-content,.about,.contact').forEach(layout => {
      layout.style.removeProperty('column-gap');
      layout.style.removeProperty('row-gap');
      [...layout.children].forEach(child => {
        child.style.removeProperty('margin-left');
        child.style.removeProperty('margin-top');
      });
    });
  };
  const ensureLandingTextTargets = () => {
    main.querySelector('.hero h1')?.setAttribute('data-editable-text', '');
    main.querySelector('.hero-intro')?.setAttribute('data-editable-text', '');
    main.querySelector('.hero .eyebrow')?.setAttribute('data-editable-text', '');
  };
  const installGapControls = () => {
    const gapX = $('#padding-x'), gapY = $('#padding-y'), layoutGap = $('#layout-gap');
    gapX.closest('label').childNodes[0].textContent = 'Component gap X ';
    gapY.closest('label').childNodes[0].textContent = 'Component gap Y ';
    [gapX, gapY, layoutGap].forEach(input => { input.min = '-100'; input.max = '240'; input.step = '1'; });
    layoutGap.closest('label').childNodes[0].textContent = 'Gap ';

    const presets = '<button type="button" data-value="-16">−16</button><button type="button" data-value="-8">−8</button><button type="button" data-value="-4">−4</button><button type="button" data-value="0">0</button><button type="button" data-value="4">4</button><button type="button" data-value="8">8</button>';
    const componentFine = document.createElement('div');
    componentFine.className = 'gap-fine-controls';
    componentFine.innerHTML = `<span>Overlap</span>${presets}<span>Exact X/Y</span><input id="gap-x-number" type="number" min="-100" max="240" step="1" value="${gapX.value}" aria-label="Exact horizontal component gap"><input id="gap-y-number" type="number" min="-100" max="240" step="1" value="${gapY.value}" aria-label="Exact vertical component gap">`;
    gapY.closest('label').after(componentFine);

    const gapFine = document.createElement('div');
    gapFine.className = 'section-gap-fine';
    gapFine.innerHTML = `<span>Overlap</span>${presets.replaceAll('data-value', 'data-section-value')}<label>Exact <input id="section-gap-number" type="number" min="-100" max="240" step="1" value="${layoutGap.value}" aria-label="Exact gap between sections"></label>`;
    layoutGap.closest('label').after(gapFine);

    componentFine.querySelectorAll('[data-value]').forEach(button => button.addEventListener('click', () => {
      [gapX, gapY].forEach(input => { input.value = button.dataset.value; input.dispatchEvent(new Event('input', {bubbles:true})); });
    }));
    gapFine.querySelectorAll('[data-section-value]').forEach(button => button.addEventListener('click', () => {
      layoutGap.value = button.dataset.sectionValue;
      layoutGap.dispatchEvent(new Event('input', {bubbles:true}));
    }));
    [['#gap-x-number', gapX], ['#gap-y-number', gapY], ['#section-gap-number', layoutGap]].forEach(([selector, slider]) => {
      const exact = $(selector);
      const applyExact = () => { slider.value = exact.value; slider.dispatchEvent(new Event('input', {bubbles:true})); };
      exact.addEventListener('input', applyExact);
      exact.addEventListener('change', applyExact);
      exact.addEventListener('keyup', applyExact);
      slider.addEventListener('input', () => { exact.value = slider.value; });
    });
  };
  installGapControls();
  const openDb = () => new Promise((resolve, reject) => {
    const request = indexedDB.open('nani-portfolio-editor', 2);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains('drafts')) request.result.createObjectStore('drafts'); };
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
  });
  const dbAction = async (mode, action) => { const db = await openDb(); return new Promise((resolve, reject) => { const request = action(db.transaction('drafts', mode).objectStore('drafts')); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); };
  const dbGet = key => dbAction('readonly', store => store.get(key));
  const dbSet = (key, value) => dbAction('readwrite', store => store.put(value, key));
  const dbDelete = key => dbAction('readwrite', store => store.delete(key));
  const snapshot = () => ({html:main.innerHTML, mainStyle:main.getAttribute('style') || '', bodyStyle:body.getAttribute('style') || '', bodyClasses:[...body.classList].filter(name => name.startsWith('debug-') && !['debug-open','debug-editing'].includes(name))});
  const restoreSnapshot = state => {
    restoring = true; selected = null; main.innerHTML = state.html;
    state.mainStyle ? main.setAttribute('style', state.mainStyle) : main.removeAttribute('style');
    state.bodyStyle ? body.setAttribute('style', state.bodyStyle) : body.removeAttribute('style');
    [...body.classList].filter(name => name.startsWith('debug-') && !['debug-open','debug-editing'].includes(name)).forEach(name => body.classList.remove(name));
    (state.bodyClasses || []).forEach(name => body.classList.add(name)); selectionLabel.textContent = 'Global site controls'; restoring = false;
  };
  const updateHistoryButtons = () => { $('#undo-change').disabled = historyIndex <= 0; $('#redo-change').disabled = historyIndex >= history.length - 1; };
  const recordHistory = () => { if (restoring) return; history = history.slice(0, historyIndex + 1); history.push(snapshot()); if (history.length > 40) history.shift(); historyIndex = history.length - 1; updateHistoryButtons(); };
  const travelHistory = step => { const next = historyIndex + step; if (next < 0 || next >= history.length) return; historyIndex = next; restoreSnapshot(history[next]); updateHistoryButtons(); status.textContent = step < 0 ? 'Undid the last change.' : 'Redid the change.'; };
  try { const draft = await dbGet('current'); if (draft?.html) { main.innerHTML = draft.html; if (draft.mainStyle) main.setAttribute('style', draft.mainStyle); if (draft.bodyStyle) body.setAttribute('style', draft.bodyStyle); clearLegacyTextLayoutGaps(); ensureLandingTextTargets(); status.textContent = `Draft restored from ${new Date(draft.savedAt).toLocaleString()}.`; } } catch (error) { status.textContent = `Editor storage unavailable: ${error.message}`; }
  ensureLandingTextTargets();
  recordHistory();

  const panels = () => [...main.querySelectorAll('.panel')];
  const editableName = el => el?.id || el?.querySelector('h1,h2,h3')?.textContent?.trim() || 'Custom section';
  const numberFrom = (value, fallback = 0) => Number.isFinite(parseFloat(value)) ? parseFloat(value) : fallback;
  const rgbToHex = (value, fallback) => { const match = value?.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/); return match ? `#${match.slice(1).map(n => Number(n).toString(16).padStart(2, '0')).join('')}` : fallback; };
  const setOutput = (input, suffix = '') => { const output = $(`#${input.id}-value`); if (output) output.value = `${input.value}${suffix}`; };
  const activateTab = name => { menu.querySelectorAll('[data-editor-tab]').forEach(button => button.classList.toggle('active', button.dataset.editorTab === name)); menu.querySelectorAll('.debug-pane').forEach(pane => pane.classList.toggle('active', pane.dataset.pane === name)); };
  const setTextEditMode = open => main.querySelectorAll('[data-editable-text]').forEach(element => {
    element.contentEditable = String(open);
    element.spellcheck = false;
    if (element.dataset.textEditorBound) return;
    element.dataset.textEditorBound = 'true';
    element.addEventListener('input', () => { status.textContent = 'Landing text changed. Save the draft to keep it.'; });
    element.addEventListener('blur', recordHistory);
  });
  const toggleEditor = force => { const open = typeof force === 'boolean' ? force : !body.classList.contains('debug-open'); body.classList.toggle('debug-open', open); body.classList.toggle('debug-editing', open); menu.setAttribute('aria-hidden', String(!open)); setTextEditMode(open); };
  const updateTransform = element => { element.style.transform = `translate3d(${element.dataset.tx || 0}px,${element.dataset.ty || 0}px,0) rotate(${element.dataset.rotate || 0}deg) scale(${(element.dataset.scale || 100) / 100})`; };
  const updateEffects = element => { element.style.filter = `blur(${element.dataset.blur || 0}px) saturate(${element.dataset.saturate || 100}%)`; const shadow = Number(element.dataset.shadow || 0); element.style.boxShadow = shadow ? `0 ${Math.round(shadow / 2)}px ${shadow}px rgba(0,0,0,.42)` : ''; };
  const updateHover = element => { element.classList.add('editor-hoverable'); element.style.setProperty('--hover-y', `${element.dataset.hoverY || 0}px`); element.style.setProperty('--hover-scale', (element.dataset.hoverScale || 100) / 100); element.style.setProperty('--hover-rotate', `${element.dataset.hoverRotate || 0}deg`); element.style.setProperty('--hover-glow', `${element.dataset.hoverGlow || 0}px`); element.style.setProperty('--hover-duration', `${element.dataset.hoverDuration || 350}ms`); };
  const syncField = (id, value, suffix = '') => { const input = $(id); if (!input) return; input.value = value; setOutput(input, suffix); };
  const syncSelection = element => {
    if (!element) return; const style = getComputedStyle(element);
    syncField('#c-width', Math.min(100, Math.round(element.getBoundingClientRect().width / main.getBoundingClientRect().width * 100)), '%'); syncField('#c-height', Math.min(1200, Math.round(element.getBoundingClientRect().height)), 'px');
    syncField('#c-padding-x', numberFrom(style.paddingLeft), 'px'); syncField('#c-padding-y', numberFrom(style.paddingTop), 'px'); syncField('#c-gap', numberFrom(style.gap), 'px');
    syncField('#c-x', element.dataset.tx || 0, 'px'); syncField('#c-y', element.dataset.ty || 0, 'px'); syncField('#c-rotate', element.dataset.rotate || 0, '°'); syncField('#c-scale', element.dataset.scale || 100, '%'); syncField('#c-z', style.zIndex === 'auto' ? 0 : style.zIndex);
    syncField('#c-radius', numberFrom(style.borderRadius), 'px'); syncField('#c-opacity', Math.round(numberFrom(style.opacity, 1) * 100), '%'); syncField('#c-shadow', element.dataset.shadow || 0); syncField('#c-blur', element.dataset.blur || 0, 'px'); syncField('#c-saturate', element.dataset.saturate || 100, '%'); syncField('#c-border', numberFrom(style.borderWidth), 'px');
    syncField('#h-y', element.dataset.hoverY || -8, 'px'); syncField('#h-scale', element.dataset.hoverScale || 102, '%'); syncField('#h-rotate', element.dataset.hoverRotate || 0, '°'); syncField('#h-glow', element.dataset.hoverGlow || 24); syncField('#h-duration', element.dataset.hoverDuration || 350, 'ms');
    $('#c-bg').value = rgbToHex(style.backgroundColor, '#111111'); $('#c-color').value = rgbToHex(style.color, '#ffffff'); $('#c-border-color').value = rgbToHex(style.borderColor, '#ffffff'); $('#c-blend').value = style.mixBlendMode || 'normal';
  };
  const selectSection = element => { selected?.classList.remove('debug-selected'); selected = element; selected?.classList.add('debug-selected'); selectionLabel.textContent = selected ? editableName(selected) : 'Global site controls'; if (selected) { syncSelection(selected); activateTab('component'); } };
  $('.debug-trigger').addEventListener('click', () => toggleEditor(true)); $('[data-debug-close]').addEventListener('click', () => toggleEditor(false));
  menu.querySelectorAll('[data-editor-tab]').forEach(button => button.addEventListener('click', () => activateTab(button.dataset.editorTab)));
  $('#undo-change').addEventListener('click', () => travelHistory(-1)); $('#redo-change').addEventListener('click', () => travelHistory(1));
  addEventListener('keydown', event => { if (/input|textarea|select/i.test(event.target.tagName) || event.target.isContentEditable) return; if (event.key.toLowerCase() === 'd' && !event.metaKey && !event.ctrlKey) toggleEditor(); if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); travelHistory(event.shiftKey ? 1 : -1); } if (event.key === 'Escape') toggleEditor(false); });
  main.addEventListener('click', event => { if (!body.classList.contains('debug-editing')) return; const section = event.target.closest('[data-editable-section]'); if (!section) return; const text = event.target.closest('[data-editable-text]'); if (text) { selectSection(section); return; } event.preventDefault(); event.stopPropagation(); selectSection(section); }, true);

  const bind = (id, handler, suffix = '') => { const input = $(id); input.addEventListener('input', () => { handler(input.value); setOutput(input, suffix); status.textContent = id.startsWith('#c-') || id.startsWith('#h-') ? `Adjusted ${editableName(selected)}.` : 'Canvas settings changed.'; }); input.addEventListener('change', recordHistory); };
  bind('#layout-height', value => panels().forEach(panel => panel.style.minHeight = `${value}px`), 'px');
  bind('#layout-width', value => { main.style.width = `${value}%`; main.style.marginInline = 'auto'; }, '%');
  bind('#layout-gap', value => { main.style.display = 'flex'; main.style.flexDirection = 'column'; main.style.gap = `${Math.max(0, Number(value))}px`; [...main.children].forEach((child, i) => child.style.marginTop = Number(value) < 0 && i ? `${value}px` : ''); }, 'px');
  const setProjectGap = (axis, rawValue) => {
    clearLegacyTextLayoutGaps();
    const value = Number(rawValue);
    main.querySelectorAll('[data-project-grid]').forEach(layout => {
      const columns = Math.max(1, Number(layout.dataset.columns) || 1);
      layout.style[axis === 'x' ? 'columnGap' : 'rowGap'] = `${Math.max(0, value)}px`;
      [...layout.children].forEach((child, index) => {
        if (axis === 'x') child.style.marginLeft = value < 0 && index % columns !== 0 ? `${value}px` : '';
        else child.style.marginTop = value < 0 && index >= columns ? `${value}px` : '';
      });
    });
  };
  bind('#padding-x', value => setProjectGap('x', value), 'px'); bind('#padding-y', value => setProjectGap('y', value), 'px');
  bind('#margin-x', value => { main.style.marginLeft = `${value}px`; main.style.marginRight = `${value}px`; main.style.width = `calc(100% - ${value * 2}px)`; }, 'px'); bind('#margin-y', value => { main.style.marginTop = `${value}px`; main.style.marginBottom = `${value}px`; }, 'px');
  bind('#layout-columns', value => { const grid = $('[data-project-grid]'); grid.dataset.columns = value; grid.style.gridTemplateColumns = value === '1' ? '1fr' : `repeat(${value},minmax(0,1fr))`; });
  bind('#layout-align', value => panels().forEach(panel => panel.style.textAlign = value)); bind('#layout-items', value => panels().forEach(panel => panel.style.alignItems = value)); bind('#layout-justify', value => panels().forEach(panel => panel.style.justifyContent = value));
  bind('#layout-radius', value => panels().forEach(panel => panel.style.borderRadius = `${value}px`), 'px'); bind('#layout-opacity', value => panels().forEach(panel => panel.style.opacity = value / 100), '%'); bind('#layout-overflow', value => panels().forEach(panel => panel.style.overflow = value));
  bind('#type-scale', value => main.style.fontSize = `${value}%`, '%'); bind('#line-height', value => main.style.lineHeight = value / 100); bind('#letter-space', value => main.style.letterSpacing = `${value}px`, 'px'); bind('#layout-bg', value => body.style.background = value); bind('#layout-color', value => main.style.color = value);
  const landingTypeTargets = {title:'.hero h1', intro:'.hero-intro', eyebrow:'.hero .eyebrow'};
  const landingTypeElement = () => main.querySelector(landingTypeTargets[$('#landing-type-target').value]) || main.querySelector('.hero h1');
  const syncLandingType = () => {
    const element = landingTypeElement();
    if (!element) return;
    const style = getComputedStyle(element);
    $('#landing-type-content').value = element.textContent.trim();
    $('#landing-type-font').value = style.fontFamily;
    $('#landing-type-size').value = Math.max(12, Math.min(180, Math.round(parseFloat(style.fontSize) || 72)));
    $('#landing-type-weight').value = style.fontWeight;
    $('#landing-type-line').value = Math.max(70, Math.min(220, Math.round((parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2) / parseFloat(style.fontSize) * 100)));
    $('#landing-type-letter').value = parseFloat(style.letterSpacing) || 0;
    $('#landing-type-color').value = rgbToHex(style.color, '#ffffff');
    $('#landing-type-align').value = style.textAlign || 'left';
    ['#landing-type-size','#landing-type-line','#landing-type-letter'].forEach(id => setOutput($(id), id === '#landing-type-line' ? '' : 'px'));
    setOutput($('#landing-type-line'));
  };
  const applyLandingTypeText = value => {
    const element = landingTypeElement();
    if (!element) return;
    if ($('#landing-type-target').value === 'eyebrow') {
      element.replaceChildren(...value.split(/\r?\n/).flatMap((line, index, lines) => index < lines.length - 1 ? [document.createTextNode(line), document.createElement('br')] : [document.createTextNode(line)]));
    } else element.textContent = value;
  };
  const landingBind = (id, handler, suffix = '') => { const input = $(id); input.addEventListener('input', () => { handler(input.value); setOutput(input, suffix); status.textContent = 'Landing type changed. Save the draft to keep it.'; }); input.addEventListener('change', recordHistory); };
  $('#landing-type-target').addEventListener('change', syncLandingType);
  landingBind('#landing-type-content', applyLandingTypeText);
  landingBind('#landing-type-font', value => landingTypeElement().style.fontFamily = value);
  landingBind('#landing-type-size', value => landingTypeElement().style.fontSize = `${value}px`, 'px');
  landingBind('#landing-type-weight', value => landingTypeElement().style.fontWeight = value);
  landingBind('#landing-type-line', value => landingTypeElement().style.lineHeight = Number(value) / 100);
  landingBind('#landing-type-letter', value => landingTypeElement().style.letterSpacing = `${value}px`, 'px');
  landingBind('#landing-type-color', value => landingTypeElement().style.color = value);
  landingBind('#landing-type-align', value => landingTypeElement().style.textAlign = value);
  syncLandingType();
  const selectedBind = (id, handler, suffix = '') => bind(id, value => { if (!selected) { status.textContent = 'Select a section first.'; return; } handler(value); }, suffix);
  selectedBind('#c-width', value => selected.style.width = `${value}%`, '%'); selectedBind('#c-height', value => selected.style.minHeight = `${value}px`, 'px'); selectedBind('#c-padding-x', value => { selected.style.paddingLeft = `${value}px`; selected.style.paddingRight = `${value}px`; }, 'px'); selectedBind('#c-padding-y', value => { selected.style.paddingTop = `${value}px`; selected.style.paddingBottom = `${value}px`; }, 'px'); selectedBind('#c-gap', value => selected.style.gap = `${value}px`, 'px');
  selectedBind('#c-x', value => { selected.dataset.tx = value; updateTransform(selected); }, 'px'); selectedBind('#c-y', value => { selected.dataset.ty = value; updateTransform(selected); }, 'px'); selectedBind('#c-rotate', value => { selected.dataset.rotate = value; updateTransform(selected); }, '°'); selectedBind('#c-scale', value => { selected.dataset.scale = value; updateTransform(selected); }, '%'); selectedBind('#c-z', value => selected.style.zIndex = value);
  selectedBind('#c-radius', value => selected.style.borderRadius = `${value}px`, 'px'); selectedBind('#c-opacity', value => selected.style.opacity = value / 100, '%'); selectedBind('#c-bg', value => selected.style.background = value); selectedBind('#c-color', value => selected.style.color = value); selectedBind('#c-blend', value => selected.style.mixBlendMode = value);
  selectedBind('#c-shadow', value => { selected.dataset.shadow = value; updateEffects(selected); }); selectedBind('#c-blur', value => { selected.dataset.blur = value; updateEffects(selected); }, 'px'); selectedBind('#c-saturate', value => { selected.dataset.saturate = value; updateEffects(selected); }, '%'); selectedBind('#c-border', value => { selected.style.borderStyle = value === '0' ? '' : 'solid'; selected.style.borderWidth = `${value}px`; }, 'px'); selectedBind('#c-border-color', value => selected.style.borderColor = value);
  selectedBind('#h-y', value => { selected.dataset.hoverY = value; updateHover(selected); }, 'px'); selectedBind('#h-scale', value => { selected.dataset.hoverScale = value; updateHover(selected); }, '%'); selectedBind('#h-rotate', value => { selected.dataset.hoverRotate = value; updateHover(selected); }, '°'); selectedBind('#h-glow', value => { selected.dataset.hoverGlow = value; updateHover(selected); }); selectedBind('#h-duration', value => { selected.dataset.hoverDuration = value; updateHover(selected); }, 'ms');
  selectedBind('#media-fit', value => selected.querySelectorAll('img,video').forEach(media => media.style.objectFit = value)); selectedBind('#media-position', value => selected.querySelectorAll('img,video').forEach(media => media.style.objectPosition = value));

  menu.querySelectorAll('[data-hover-preset]').forEach(button => button.addEventListener('click', () => { if (!selected) { status.textContent = 'Select a section first.'; return; } const presets = {lift:[-10,102,0,24,320],zoom:[0,108,0,12,500],glow:[0,100,0,60,280],tilt:[-4,103,2,28,380]}; const [y,scale,rotate,glow,duration] = presets[button.dataset.hoverPreset]; Object.assign(selected.dataset,{hoverY:y,hoverScale:scale,hoverRotate:rotate,hoverGlow:glow,hoverDuration:duration}); updateHover(selected); syncSelection(selected); recordHistory(); status.textContent = `${button.textContent} hover applied.`; }));
  menu.querySelectorAll('[data-space]').forEach(button => button.addEventListener('click', () => { const [gap,margin] = {compact:[4,4],comfortable:[16,8],airy:[36,16]}[button.dataset.space]; main.style.display='flex'; main.style.flexDirection='column'; main.style.gap=`${gap}px`; main.style.margin=`${margin}px`; main.style.width=`calc(100% - ${margin*2}px)`; recordHistory(); }));
  menu.querySelectorAll('[data-add]').forEach(button => button.addEventListener('click', () => { const type=button.dataset.add, section=document.createElement('section'); section.className='custom-section panel'; section.dataset.editableSection=''; section.dataset.editorCreated=type; section.innerHTML=type==='split'?'<div><p class="eyebrow">New section</p><h2 contenteditable="true">Your title</h2></div><p contenteditable="true">Add your story here.</p>':type==='text'?'<p class="eyebrow">New section</p><h2 contenteditable="true">Your title</h2><p contenteditable="true">Click to edit this text.</p>':`<div class="media-placeholder"><p>Upload a ${type} from the Selection tab.</p></div>`; if(type==='split') section.style.gridTemplateColumns='repeat(2,minmax(0,1fr))'; $('#contact').before(section); selectSection(section); recordHistory(); section.scrollIntoView({behavior:'smooth',block:'center'}); }));
  $('#media-upload').addEventListener('change', event => { const file=event.target.files?.[0]; if(!file||!selected){status.textContent='Select a section first.';return;} const reader=new FileReader(); reader.onload=()=>{const media=document.createElement(file.type.startsWith('video/')?'video':'img');media.src=reader.result;media.alt=file.name;if(media.tagName==='VIDEO'){media.controls=true;media.loop=true;media.playsInline=true;}selected.querySelector('.media-placeholder')?.remove();selected.append(media);recordHistory();status.textContent=`${file.name} added.`;};reader.readAsDataURL(file);event.target.value='';});
  const requireSelection = action => selected ? action() : status.textContent='Select a section first.';
  $('#duplicate-section').addEventListener('click',()=>requireSelection(()=>{const clone=selected.cloneNode(true);clone.removeAttribute('id');selected.after(clone);selectSection(clone);recordHistory();})); $('#move-up').addEventListener('click',()=>requireSelection(()=>{const previous=selected.previousElementSibling;if(previous)previous.before(selected);recordHistory();})); $('#move-down').addEventListener('click',()=>requireSelection(()=>{const next=selected.nextElementSibling;if(next)next.after(selected);recordHistory();}));
  $('#reset-section').addEventListener('click',()=>requireSelection(()=>{selected.removeAttribute('style');[...selected.attributes].filter(attr=>attr.name.startsWith('data-hover')||['data-tx','data-ty','data-rotate','data-scale','data-shadow','data-blur','data-saturate'].includes(attr.name)).forEach(attr=>selected.removeAttribute(attr.name));selected.classList.remove('editor-hoverable');syncSelection(selected);recordHistory();})); $('#remove-section').addEventListener('click',()=>requireSelection(()=>{selected.remove();selectSection(null);recordHistory();}));
  $('#toggle-grid').addEventListener('change',event=>body.classList.toggle('debug-grid-overlay',event.target.checked)); $('#toggle-outline').addEventListener('change',event=>body.classList.toggle('debug-outlines',event.target.checked)); $('#toggle-motion').addEventListener('change',event=>body.classList.toggle('debug-reduce-motion',event.target.checked));
  $('#save-draft').addEventListener('click',async()=>{selected?.classList.remove('debug-selected');try{await dbSet('current',{...snapshot(),savedAt:new Date().toISOString(),version:3});status.textContent=`Draft saved at ${new Date().toLocaleTimeString()}.`;}catch(error){status.textContent=`Could not save: ${error.message}`;}selected?.classList.add('debug-selected');});
  $('#reset-draft').addEventListener('click',async()=>{await dbDelete('current');location.reload();});
  const updateViewport=()=>$('#debug-viewport').textContent=`${innerWidth} × ${innerHeight} · ${Math.round(scrollY)}px`; addEventListener('resize',updateViewport);addEventListener('scroll',updateViewport,{passive:true});updateViewport();
  window.__portfolioEditor={getDraft:()=>dbGet('current'),open:()=>toggleEditor(true),select:selectSection};
})();
