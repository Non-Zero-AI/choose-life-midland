# Choose Life Midland

A responsive landing page for Midland, Odessa, and the greater Permian Basin, with compassionate pregnancy and end-of-life conversation messaging.

Website: https://chooselifemidland.com/

Call to action: **432-695-6955**

## Editing and publishing

The site uses plain HTML, CSS, and small JavaScript modules. Edit `index.html` for content and `styles.css` for styling. Keep images and the favicon in `assets/`. The static website requires no build step.

GitHub Pages publishes the root of the `main` branch. Changes pushed to `main` publish automatically. `CNAME` sets the custom domain, and `.nojekyll` preserves static files without Jekyll processing.

To preview locally, run `python3 -m http.server 4321` in this directory and open http://localhost:4321/. Production email delivery intentionally accepts only the apex and www production origins; local submissions show an error without clearing the fields.

## Contact form and email backend

The main-page form asks for one email address or phone number. Name is optional. There is no message field, account, CAPTCHA, or form database. Browser and server share `contact-validation.mjs`. The JavaScript form shows success only after SMTP acceptance and retains entered details on failure. Native HTML submission works without JavaScript and redirects to `thank-you.html` after acceptance.

The Vercel project `choose-life-midland-contact` deploys the `backend/` directory from this repository, with source files outside the root enabled for the shared validator. Its production endpoint is https://choose-life-midland-contact.vercel.app/api/contact. The public website remains on GitHub Pages.

Set `SMTP_PASSWORD` as a sensitive **Production** environment variable in Vercel, then redeploy. Never commit it or place it in browser code. SMTP connects with TLS to `mail.privateemail.com:465` using `contact@chooselifemidland.com`. Sender and recipient are fixed to that mailbox. A validated visitor email becomes Reply-To; a phone submission has no Reply-To override.

The endpoint validates input size and type, checks production origins, and uses a hidden honeypot. Application logs contain only safe delivery error codes, not contact details or passwords. Submissions are delivered to the team mailbox; the app does not store them in a database. Hosting and email providers may retain operational records under their own policies.

Vercel Firewall rule **Contact form request limit** applies only to `POST /api/contact`: six requests per IP per 60-second fixed window, then HTTP 429. The approved price is $0.50 per million allowed requests; blocked requests are free. The rule is managed separately in Vercel and should be retained when redeploying. Origin checks are a browser boundary, not bot authentication; rate limiting provides additional abuse protection.

Run the request/response and validator tests from the repository root:

```sh
node --test tests/*.test.mjs
```

`GET /api/contact` returns readiness without sending mail. A successful POST confirms acceptance by the SMTP server, not inbox placement. Check the team mailbox and spam folder during setup.

## Assets and fonts

The hero photograph is AI-generated illustrative imagery. It does not depict actual staff or clients. The logo and landscape illustration are SVG. Google Fonts supplies Lora and DM Sans, with Georgia and Arial as local fallbacks.

Traffic analytics and automated blog publishing are not configured yet.
