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

test('an unnamed email contact notifies the team with a safe reply-to', async () => {
  const messages = [];
  const handler = createContactHandler({ env: configured, sendMail: async mail => {
    messages.push(mail);
    return { accepted: [typeof mail.to === 'string' ? mail.to : mail.to.address], rejected: [] };
  } });
  const response = await handler(request({ contact: 'visitor@example.com', to: 'other@example.com' }));
  assert.equal(response.status, 202);
  assert.equal((await response.json()).ok, true);
  const delivered = messages[0];
  assert.equal(delivered.to, 'contact@chooselifemidland.com');
  assert.equal(delivered.from, 'contact@chooselifemidland.com');
  assert.equal(delivered.replyTo, 'visitor@example.com');
  assert.match(delivered.text, /visitor@example\.com/);
});

test('an email visitor receives a branded confirmation only after the team accepts their request', async () => {
  const messages = [];
  const background = [];
  let releaseTeam;
  const teamAccepted = new Promise(resolve => { releaseTeam = resolve; });
  const handler = createContactHandler({ env: configured, waitUntil: task => background.push(task), sendMail: async mail => {
    messages.push(mail);
    if (messages.length === 1) await teamAccepted;
    return { accepted: [typeof mail.to === 'string' ? mail.to : mail.to.address], rejected: [] };
  } });
  const pending = handler(request({ contact: 'visitor@example.com', name: '<img src=x onerror=alert(1)>', to: 'other@example.com' }));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(messages.length, 1, 'must not confirm a request before team delivery');
  releaseTeam();
  assert.equal((await pending).status, 202);
  await Promise.all(background);
  assert.equal(messages.length, 2);
  const confirmation = messages[1];
  assert.deepEqual(confirmation.to, { address: 'visitor@example.com' });
  assert.deepEqual(confirmation.from, { name: 'Choose Life Midland', address: 'contact@chooselifemidland.com' });
  assert.equal(confirmation.replyTo, 'contact@chooselifemidland.com');
  assert.match(confirmation.text, /received your request/i);
  assert.match(confirmation.html, /href="tel:\+14326956955"/);
  assert.match(confirmation.html, /src="cid:choose-life-logo@chooselifemidland\.com"/);
  assert.doesNotMatch(confirmation.html, /onerror|visitor@example|<script|https?:\/\/[^" ]+\.(?:png|gif)/i);
  assert.equal(confirmation.attachments[0].cid, 'choose-life-logo@chooselifemidland.com');
  assert.deepEqual([...confirmation.attachments[0].content.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(confirmation.headers['Auto-Submitted'], 'auto-replied');
});

test('a slow confirmation does not hold up the visitor success response', async () => {
  let releaseConfirmation;
  const held = new Promise(resolve => { releaseConfirmation = resolve; });
  const background = [];
  const handler = createContactHandler({ env: configured, waitUntil: task => background.push(task), sendMail: async mail => {
    if (typeof mail.to === 'object') await held;
    return { accepted: [typeof mail.to === 'string' ? mail.to : mail.to.address], rejected: [] };
  } });
  const response = await handler(request({ contact: 'visitor@example.com' }));
  assert.equal(response.status, 202);
  assert.equal(background.length, 1);
  releaseConfirmation();
  await Promise.all(background);
});

test('confirmation failure preserves the already delivered team request', async () => {
  const messages = [];
  const background = [];
  const handler = createContactHandler({ env: configured, waitUntil: task => background.push(task), sendMail: async mail => {
    messages.push(mail);
    if (messages.length === 2) throw new Error('private confirmation failure');
    return { accepted: ['contact@chooselifemidland.com'], rejected: [] };
  } });
  const response = await handler(request({ contact: 'visitor@example.com' }));
  await Promise.all(background);
  assert.equal(response.status, 202);
  assert.equal((await response.json()).ok, true);
  assert.equal(messages.length, 2);
});

test('rejected team delivery never sends a visitor confirmation', async () => {
  const messages = [];
  const handler = createContactHandler({ env: configured, sendMail: async mail => {
    messages.push(mail);
    return { accepted: [], rejected: ['contact@chooselifemidland.com'] };
  } });
  assert.equal((await handler(request({ contact: 'visitor@example.com' }))).status, 503);
  assert.equal(messages.length, 1);
});

test('phone-only requests produce no email confirmation', async () => {
  const messages = [];
  const handler = createContactHandler({ env: configured, sendMail: async mail => {
    messages.push(mail);
    return { accepted: ['contact@chooselifemidland.com'], rejected: [] };
  } });
  assert.equal((await handler(request({ contact: '432-555-0100' }))).status, 202);
  assert.equal(messages.length, 1);
});

test('email recipient separators and display-name syntax cannot trigger outbound mail', async () => {
  for (const contact of ['one,two@example.com', 'one;two@example.com', 'one<two>@example.com', 'one@example.com,other']) {
    const handler = createContactHandler({ env: configured, sendMail: async () => assert.fail('must reject recipient injection') });
    assert.equal((await handler(request({ contact }))).status, 422, contact);
  }
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
