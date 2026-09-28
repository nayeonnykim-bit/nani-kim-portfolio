const form = document.querySelector('#contact-form');
const status = document.querySelector('.form-status');
form.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const subject = encodeURIComponent(`Portfolio enquiry from ${data.get('name')}`);
  const body = encodeURIComponent(`${data.get('message')}\n\nFrom: ${data.get('name')} (${data.get('email')})`);
  status.textContent = 'Opening your email app…';
  window.location.href = `mailto:hi@andrew.com?subject=${subject}&body=${body}`;
});
