import nodemailer from 'nodemailer'

export function mailConfigured() {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS, MAIL_FROM } = process.env
  return Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS && MAIL_FROM)
}

let transport = null

function getTransport() {
  transport ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  })
  return transport
}

const MESSAGES = {
  verify: {
    subject: 'Confirm your Timetabler account',
    intro: 'Confirm your email to finish setting up your Timetabler account.',
    button: 'Confirm email',
    outro: "The link expires in 24 hours. If you didn't sign up, ignore this email.",
  },
  reset: {
    subject: 'Reset your Timetabler password',
    intro: 'Someone asked to reset the password for your Timetabler account.',
    button: 'Choose a new password',
    outro: "The link expires in 1 hour. If it wasn't you, ignore this email — your password stays the same.",
  },
}

export async function sendAccountLink(kind, email, link) {
  const m = MESSAGES[kind]
  await getTransport().sendMail({
    from: `RBS Timetabler <${process.env.MAIL_FROM}>`,
    to: email,
    subject: m.subject,
    text: `${m.intro}\n\n${m.button}: ${link}\n\n${m.outro}`,
    html: `<div style="font-family:system-ui,sans-serif;font-size:15px;color:#222">
<p>${m.intro}</p>
<p style="margin:20px 0"><a href="${link}" style="background:#1f5f5b;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">${m.button}</a></p>
<p style="color:#666;font-size:13px">${m.outro}</p>
</div>`,
  })
}
