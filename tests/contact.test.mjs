import test from 'node:test';
import assert from 'node:assert/strict';
import { parseContact } from '../contact-validation.mjs';
import { createContactHandler } from '../backend/lib/contact-handler.mjs';

test('an email address alone is enough to request contact', () => {
  assert.deepEqual(parseContact('  visitor@example.com  '), { kind: 'email', value: 'visitor@example.com' });
});
test('a phone number alone is enough to request contact', () => {
  assert.deepEqual(parseContact('(432) 555-0100'), { kind: 'phone', value: '(432) 555-0100' });
});
test('empty or malformed contact details are rejected', () => {
  for (const value of ['', '   ', 'hello', 'visitor@', '123', 'visitor@example.com\r\nBcc: other@example.com']) {
    assert.equal(parseContact(value), null, value);
  }
});

const origin = 'https://chooselifemidland.com';
const request = (body, requestOrigin = origin) => new Request('https://contact.example/api/contact', {
  method: 'POST', headers: { Origin: requestOrigin, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});
const configured = { SMTP_PASSWORD: 'test-only-placeholder' };

test('an unnamed email contact reaches only the team, with a safe reply-to', async () => {
  let delivered;
  const handler = createContactHandler({ env: configured, sendMail: async mail => {
    delivered = mail;
    return { accepted: ['contact@chooselifemidland.com'], rejected: [] };
  } });
  const response = await handler(request({ contact: 'visitor@example.com', to: 'other@example.com' }));
  assert.equal(response.status, 202);
  assert.equal((await response.json()).ok, true);
  assert.equal(delivered.to, 'contact@chooselifemidland.com');
  assert.equal(delivered.from, 'contact@chooselifemidland.com');
  assert.equal(delivered.replyTo, 'visitor@example.com');
  assert.match(delivered.text, /visitor@example\.com/);
});
test('an unnamed phone-only contact is accepted without a reply-to email', async () => {
  let delivered;
  const handler = createContactHandler({ env: configured, sendMail: async mail => {
    delivered = mail;
    return { accepted: ['contact@chooselifemidland.com'], rejected: [] };
  } });
  const response = await handler(request({ contact: '432-555-0100' }));
  assert.equal(response.status, 202);
  assert.equal(delivered.replyTo, undefined);
  assert.match(delivered.text, /432-555-0100/);
});
test('missing contact details never produce an email', async () => {
  let calls = 0;
  const handler = createContactHandler({ env: configured, sendMail: async () => { calls++; } });
  const response = await handler(request({ name: 'Optional name' }));
  assert.equal(response.status, 422);
  assert.equal(calls, 0);
});
test('a foreign origin cannot use the mail endpoint', async () => {
  let calls = 0;
  const handler = createContactHandler({ env: configured, sendMail: async () => { calls++; } });
  const response = await handler(request({ contact: 'visitor@example.com' }, 'https://other.example'));
  assert.equal(response.status, 403);
  assert.equal(calls, 0);
});
test('honeypot spam does not send email', async () => {
  let calls = 0;
  const handler = createContactHandler({ env: configured, sendMail: async () => { calls++; } });
  const response = await handler(request({ contact: 'visitor@example.com', website: 'spam' }));
  assert.equal(response.status, 202);
  assert.equal(calls, 0);
});
test('missing mail configuration is reported honestly', async () => {
  const handler = createContactHandler({ env: {}, sendMail: async () => assert.fail('must not send') });
  const response = await handler(request({ contact: 'visitor@example.com' }));
  assert.equal(response.status, 503);
  assert.equal((await response.json()).ok, false);
});
test('SMTP failure cannot appear as successful submission or expose its details', async () => {
  const handler = createContactHandler({ env: configured, sendMail: async () => { throw new Error('private mail details'); } });
  const response = await handler(request({ contact: 'visitor@example.com' }));
  assert.equal(response.status, 503);
  const body = await response.text();
  assert.equal(JSON.parse(body).ok, false);
  assert.doesNotMatch(body, /private mail details/);
});
test('SMTP recipient rejection cannot appear as successful submission', async () => {
  const handler = createContactHandler({ env: configured, sendMail: async () => ({ accepted: [], rejected: ['contact@chooselifemidland.com'] }) });
  const response = await handler(request({ contact: 'visitor@example.com' }));
  assert.equal(response.status, 503);
});
test('a request with excessive content is rejected before sending', async () => {
  let calls = 0;
  const handler = createContactHandler({ env: configured, sendMail: async () => { calls++; } });
  const response = await handler(request({ contact: 'visitor@example.com', name: 'x'.repeat(4000) }));
  assert.equal(response.status, 413);
  assert.equal(calls, 0);
});
test('native form submission redirects back to the site after SMTP acceptance', async () => {
  const handler = createContactHandler({ env: configured, sendMail: async () => ({ accepted: ['contact@chooselifemidland.com'], rejected: [] }) });
  const response = await handler(new Request('https://contact.example/api/contact', {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'text/html' },
    body: new URLSearchParams({ contact: '432-555-0100' }),
  }));
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('Location'), 'https://chooselifemidland.com/thank-you.html');
});
