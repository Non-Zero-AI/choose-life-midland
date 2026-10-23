import { createContactHandler } from '../lib/contact-handler.mjs';
import { deliverContactMail } from '../lib/smtp.mjs';
import { waitUntil } from '@vercel/functions';

export default { fetch: createContactHandler({ sendMail: deliverContactMail, waitUntil }) };
