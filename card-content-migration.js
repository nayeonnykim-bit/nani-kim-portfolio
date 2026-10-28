(() => {
  const marker = 'nani-card-content-2026-10-27-v2';
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
    if (localStorage.getItem(marker)) return;
    const editor = window.__portfolioEditor;
    const elements = [...document.querySelectorAll('[data-project-grid] > .project')];
    if (!editor?.ready || elements.length !== cards.length) {
      setTimeout(migrate, 80);
      return;
    }
    elements.forEach((card, index) => {
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
    localStorage.setItem(marker, 'done');
  }

  migrate();
})();
