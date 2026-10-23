import { parseContact } from '../../contact-validation.mjs';

const TEAM_EMAIL = 'contact@chooselifemidland.com';
const SITE = 'https://chooselifemidland.com';
const ALLOWED_ORIGINS = new Set([SITE, 'https://www.chooselifemidland.com']);
const DELIVERY_ERROR = 'Your request could not be sent. Your details are still here. Please try again, call 432-695-6955, or email contact@chooselifemidland.com.';

export function createContactHandler({ env = process.env, sendMail } = {}) {
  return async function handleContact(request) {
    const origin = request.headers.get('origin');
    const headers = { 'Cache-Control': 'no-store', Vary: 'Origin' };
    if (origin && ALLOWED_ORIGINS.has(origin)) {
      Object.assign(headers, {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
    }
    const json = (body, status) => Response.json(body, { status, headers });
    const wantsHTML = request.headers.get('accept')?.includes('text/html');
    const failure = (message, status) => wantsHTML
      ? new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Let’s try another way | Choose Life Midland</title><body><main style="max-width:36rem;margin:10vh auto;padding:24px;font:18px/1.7 system-ui"><h1>Let’s try another way.</h1><p>${message}</p><p><a href="${SITE}/#contact">Return to the contact form</a> · <a href="tel:+14326956955">Call our team</a></p></main></body></html>`, { status, headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' } })
      : json({ ok: false, message }, status);
    const success = () => wantsHTML
      ? new Response(null, { status: 303, headers: { ...headers, Location: `${SITE}/thank-you.html` } })
      : json({ ok: true }, 202);

    if (request.method === 'GET') return json({ ok: true, ready: Boolean(env.SMTP_PASSWORD) }, 200);
    if (!origin || !ALLOWED_ORIGINS.has(origin)) return failure('Please send your request through the contact form at chooselifemidland.com.', 403);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return json({ ok: false }, 405);

    const type = request.headers.get('content-type')?.split(';')[0].trim();
    if (!['application/json', 'application/x-www-form-urlencoded'].includes(type)) return failure('Please use the contact form to send your request.', 415);
    if (Number(request.headers.get('content-length')) > 2048) return failure('Please keep your request to your contact details and optional name.', 413);

    let body;
    try {
      const raw = await request.text();
      if (new TextEncoder().encode(raw).length > 2048) return failure('Please keep your request to your contact details and optional name.', 413);
      body = type === 'application/json' ? JSON.parse(raw) : Object.fromEntries(new URLSearchParams(raw));
    } catch {
      return failure('Please check your contact details and try again.', 400);
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return failure('Please check your contact details and try again.', 400);
    if (body.website) return success(); // Hidden spam field; never deliver its contents.
    const contact = parseContact(body.contact);
    if (!contact) return failure('Please enter an email address or phone number so we can reach you.', 422);
    if (body.name != null && (typeof body.name !== 'string' || body.name.length > 100 || /[\r\n]/.test(body.name))) return failure('Your name is optional. Please keep it to 100 characters or leave it blank.', 422);
    if (!env.SMTP_PASSWORD) return failure(DELIVERY_ERROR, 503);

    const name = body.name?.trim();
    const mail = {
      from: TEAM_EMAIL,
      to: TEAM_EMAIL,
      subject: 'New website contact request | Choose Life Midland',
      text: [
        'A visitor has asked the Choose Life Midland team to reach out.',
        '',
        `Contact method: ${contact.kind === 'email' ? 'Email' : 'Phone'}`,
        `Contact details: ${contact.value}`,
        `Name: ${name || 'Not provided (optional)'}`,
        '',
        'Submitted through https://chooselifemidland.com/.',
      ].join('\n'),
      ...(contact.kind === 'email' ? { replyTo: contact.value } : {}),
    };
    try {
      const result = await sendMail(mail, env);
      if (!result.accepted?.some(address => String(address).toLowerCase() === TEAM_EMAIL)) throw new Error('Recipient not accepted');
      return success();
    } catch (error) {
      // Contact details, message contents, and credentials must not enter runtime logs.
      const safeCodes = ['EAUTH', 'ETIMEDOUT', 'ECONNECTION', 'EENVELOPE', 'EDNS', 'ESOCKET'];
      console.error('Contact email delivery failed', safeCodes.includes(error.code) ? error.code : 'SMTP_ERROR');
      return failure(DELIVERY_ERROR, 503);
    }
  };
}
