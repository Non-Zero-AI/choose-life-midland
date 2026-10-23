import { readFileSync } from 'node:fs';

const TEAM_EMAIL = 'contact@chooselifemidland.com';
const LOGO_CID = 'choose-life-logo@chooselifemidland.com';
const logo = readFileSync(new URL('../assets/email-logo.png', import.meta.url));

export function createVisitorConfirmation(email) {
  return {
    from: { name: 'Choose Life Midland', address: TEAM_EMAIL },
    to: { address: email },
    envelope: { from: TEAM_EMAIL, to: [email] },
    replyTo: TEAM_EMAIL,
    subject: 'We received your request | Choose Life Midland',
    headers: { 'Auto-Submitted': 'auto-replied', 'X-Auto-Response-Suppress': 'All' },
    text: [
      'Choose Life Midland',
      'Here for Midland. Here for the Permian Basin.',
      '',
      'Thank you for reaching out.',
      'We’ve received your request, and someone from our team will be in touch.',
      '',
      'You don’t need to have the right words. We’re here to listen with care and without judgment.',
      '',
      'If you’d prefer to talk, call 432-695-6955.',
      'You’re also welcome to reply to this email.',
      '',
      'With care,',
      'The Choose Life Midland team',
      'https://chooselifemidland.com/',
      '',
      'This is a one-time confirmation because your email address was entered on our website. If this wasn’t you, no action is needed.',
    ].join('\n'),
    html: `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>We received your request | Choose Life Midland</title>
<style>@media screen and (max-width:620px){.email-pad{padding:30px 24px!important}.email-heading{font-size:32px!important}}</style></head>
<body style="margin:0;padding:0;background-color:#edf0e8;color:#39383b;font-family:Arial,Helvetica,sans-serif;">
<div style="display:none;font-size:1px;line-height:1px;color:#edf0e8;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">We’ve received your request. We’re here to listen with care and without judgment.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#edf0e8" style="background-color:#edf0e8;"><tr><td align="center" style="padding:28px 12px;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#faf8f3" style="width:100%;max-width:600px;background-color:#faf8f3;border:1px solid #dfdfd6;border-radius:6px;">
<tr><td align="center" bgcolor="#edf0e8" style="padding:12px 18px;color:#53604d;font-size:11px;line-height:18px;">Here for Midland. Here for the Permian Basin.</td></tr>
<tr><td class="email-pad" style="padding:36px 44px 20px;">
<a href="https://chooselifemidland.com/" style="text-decoration:none;"><img src="cid:${LOGO_CID}" alt="Choose Life Midland" width="210" height="62" style="display:block;width:210px;max-width:100%;height:auto;border:0;"></a>
</td></tr>
<tr><td class="email-pad" style="padding:18px 44px 38px;">
<h1 class="email-heading" style="margin:0 0 24px;color:#514b59;font-family:Georgia,'Times New Roman',serif;font-size:38px;font-weight:400;line-height:1.2;letter-spacing:-1px;">Thank you for<br>reaching out.</h1>
<p style="margin:0 0 20px;font-size:15px;line-height:26px;">We’ve received your request, and someone from our team will be in touch.</p>
<p style="margin:0 0 26px;color:#67646b;font-size:15px;line-height:26px;">You don’t need to have the right words. We’re here to listen with care and without judgment.</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#514b59" style="border-radius:5px;background-color:#514b59;"><a href="tel:+14326956955" style="display:inline-block;padding:15px 22px;border:1px solid #514b59;border-radius:5px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;text-align:center;text-decoration:none;mso-padding-alt:0;"><!--[if mso]><i style="mso-font-width:150%;mso-text-raise:24pt;">&nbsp;</i><![endif]-->Call 432-695-6955<!--[if mso]><i style="mso-font-width:150%;">&nbsp;</i><![endif]--></a></td></tr></table>
<p style="margin:16px 0 30px;color:#67646b;font-size:13px;line-height:22px;">If you’d prefer, you’re also welcome to reply to this email.</p>
<p style="margin:0;color:#62715c;font-size:14px;line-height:24px;">With care,<br><span style="color:#39383b;">The Choose Life Midland team</span></p>
</td></tr>
<tr><td class="email-pad" style="padding:24px 44px;border-top:1px solid #dfdfd6;">
<p style="margin:0 0 10px;color:#62715c;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:24px;">Hope and care, close to home.</p>
<p style="margin:0 0 14px;font-size:12px;line-height:20px;"><a href="https://chooselifemidland.com/" style="color:#514b59;text-decoration:underline;">chooselifemidland.com</a></p>
<p style="margin:0;color:#67646b;font-size:11px;line-height:18px;">This is a one-time confirmation because your email address was entered on our website. If this wasn’t you, no action is needed.</p>
</td></tr></table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table></body></html>`,
    attachments: [{ filename: 'choose-life-midland.png', content: logo, contentType: 'image/png', contentDisposition: 'inline', cid: LOGO_CID }],
  };
}
