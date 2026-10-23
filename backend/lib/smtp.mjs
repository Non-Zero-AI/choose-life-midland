import nodemailer from 'nodemailer';

export async function deliverContactMail(message, env) {
  const transport = nodemailer.createTransport({
    host: 'mail.privateemail.com',
    port: 465,
    secure: true,
    auth: { user: 'contact@chooselifemidland.com', pass: env.SMTP_PASSWORD },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    disableFileAccess: true,
    disableUrlAccess: true,
  });
  try {
    // Await SMTP acceptance before telling a visitor their request was sent.
    return await transport.sendMail(message);
  } finally {
    transport.close();
  }
}
