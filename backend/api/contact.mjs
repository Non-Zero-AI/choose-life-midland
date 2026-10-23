import { createContactHandler } from '../lib/contact-handler.mjs';
import { deliverContactMail } from '../lib/smtp.mjs';

export default { fetch: createContactHandler({ sendMail: deliverContactMail }) };
