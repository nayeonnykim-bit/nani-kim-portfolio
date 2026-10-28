(() => {
  const marker = 'nani-card-content-2026-10-27-v3';
  // Capture the published source before asynchronous local draft restoration.
  const sourceGrid = document.querySelector('[data-project-grid]')?.cloneNode(true);
  let attempts = 0;
  const cards = [
    ["O'CLOCK", ['Identity Design', 'Motion Design', 'Experimental Design']],
    ['Bloom', ['Motion Design', 'Website Design', 'UX Design']],
    ['Pulse', ['Experimental Design', 'Motion Design', 'UX Design']],
    ['Desert X', ['Brand Identity', 'Experimental Design', 'Font Design']],
    ['Rise', ['Brand Identity', 'Editorial Design', 'Application Design']],
    ['AI & Me', ['Print Design', 'Editorial Design']],
    ['Eyebook', ['Brand Identity', 'Experimental Design', 'Editorial Design']],
    ['AZ Coffee', ['Brand Identity', 'Packaging Design', 'Editorial Design']],
    ['Matter Makes Form', ['Print Design', 'Editorial Design']],
    ['Impressionism', ['Print Design', 'Editorial Design']]
  ];

  async function migrate() {
    try { if (localStorage.getItem(marker)) return; } catch {}
    const editor = window.__portfolioEditor;
    if (!editor?.ready) {
      if (++attempts < 250) setTimeout(migrate, 80);
      return;
    }
    let grid = document.querySelector('[data-project-grid],#works');
    if (!grid || !sourceGrid) return;
    let elements = [...grid.querySelectorAll(':scope > .project')];
    const legacy = elements.length === 4 && document.querySelector('main > #home');
    const oldDraft = await editor.getDraft();
    if (oldDraft) await window.PortfolioMedia.storage.put('drafts', 'before-card-update-2026-10-27', oldDraft);
    grid.dataset.projectGrid = '';
    if (!grid.dataset.columns) grid.dataset.columns = '3';
    if (elements.length < cards.length) {
      const sourceCards = [...sourceGrid.querySelectorAll(':scope > .project')];
      for (let i = elements.length; i < cards.length; i++) {
        if (sourceCards[i]) grid.append(sourceCards[i].cloneNode(true));
      }
      elements = [...grid.querySelectorAll(':scope > .project')];
    }
    if (legacy) {
      document.querySelector('main > #home')?.remove();
      document.querySelector('main > #about')?.remove();
    }
    elements.forEach((card, index) => {
      if (!cards[index]) return;
      const [title, tags] = cards[index];
      const heading = card.querySelector('.project-copy h2');
      const tagList = card.querySelector('.tags');
      if (heading) heading.textContent = title;
      if (tagList) {
        tagList.replaceChildren(...tags.map(label => {
          const span = document.createElement('span');
          span.dataset.editableText = '';
          span.textContent = label;
          return span;
        }));
      }
    });
    await editor.save(false);
    try { localStorage.setItem(marker, 'done'); } catch {}
  }

  migrate().catch(error => console.error('Card update preserved the previous draft:', error));
})();
