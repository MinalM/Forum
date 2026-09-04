const nodemailer = require('nodemailer');

let cachedTransport;

// SMTP works with any provider that exposes an SMTP endpoint (Resend,
// Postmark, SES, etc.) without pulling in a provider-specific SDK. With no
// SMTP_HOST configured (local dev) or under test, fall back to a no-op
// transport that logs instead of sending.
const getTransport = () => {
  if (cachedTransport) {
    return cachedTransport;
  }

  if (process.env.NODE_ENV === 'test' || !process.env.SMTP_HOST) {
    cachedTransport = {
      sendMail: async options => {
        console.log('[sendEmail] no mail provider configured, logging instead of sending:', options);
      }
    };
  } else {
    cachedTransport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined
    });
  }

  return cachedTransport;
};

const sendEmail = async ({ to, subject, text, html }) => {
  const transport = getTransport();

  await transport.sendMail({
    from: process.env.MAIL_FROM || 'no-reply@ai-ml-career-forum.example',
    to,
    subject,
    text,
    html
  });
};

module.exports = sendEmail;
