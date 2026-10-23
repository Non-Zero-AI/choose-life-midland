import { parseContact } from './contact-validation.mjs';

const form = document.querySelector('#contact-form');
if (form) {
  const contactInput = form.elements.contact;
  const button = form.querySelector('button[type="submit"]');
  const status = document.querySelector('#contact-status');
  const deliveryError = 'We couldn’t send your request. Your details are still here. Please try again, call 432-695-6955, or email contact@chooselifemidland.com.';
  let submitting = false;

  contactInput.addEventListener('input', () => {
    contactInput.setCustomValidity('');
    contactInput.removeAttribute('aria-invalid');
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submitting) return;
    const contact = parseContact(contactInput.value);
    if (!contact) {
      contactInput.setCustomValidity('Please enter an email address or phone number so we can reach you.');
      contactInput.setAttribute('aria-invalid', 'true');
      contactInput.reportValidity();
      return;
    }
    submitting = true;
    button.disabled = true;
    button.textContent = 'Sending…';
    form.setAttribute('aria-busy', 'true');
    status.dataset.state = 'pending';
    status.textContent = 'Sending your request…';
    try {
      const response = await fetch(form.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        credentials: 'omit',
        cache: 'no-store',
        redirect: 'error',
        signal: AbortSignal.timeout(25000),
        body: JSON.stringify({
          contact: contact.value,
          name: form.elements.name.value.trim(),
          website: form.elements.website.value,
        }),
      });
      const result = await response.json();
      if (!response.ok || result.ok !== true) throw new Error('Delivery not confirmed');
      form.reset();
      status.dataset.state = 'success';
      status.textContent = 'Thank you for reaching out. Your request has been sent to our team.';
      status.focus();
    } catch {
      status.dataset.state = 'error';
      status.textContent = deliveryError;
      status.focus();
    } finally {
      submitting = false;
      button.disabled = false;
      button.textContent = 'Ask us to reach out';
      form.removeAttribute('aria-busy');
    }
  });
}
