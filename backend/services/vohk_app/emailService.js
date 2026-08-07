const fs = require('fs').promises;
const path = require('path');
const { Resend } = require('resend');

const RESEND_KEY = process.env.RESEND_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'VÖHK <soporte@vohk.cl>';

if (!RESEND_KEY) {
    throw new Error('RESEND_KEY environment variable is not configured');
}

const resend = new Resend(RESEND_KEY);

function validateEmail(email) {
    return (typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
}

function escapeHtml(value) {
    return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

async function renderTemplate(templateName, variables = {}) {
    const templatePath = path.join(__dirname, '../../routes/nodemailer/templates', templateName);
    let content = await fs.readFile(templatePath, 'utf8');
    for (const [key, value] of Object.entries(variables)) {
        const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        content = content.replace(placeholder, escapeHtml(value ?? ''));
    }
    return content;
}

async function sendEmail({ toEmail, subject, html, text }) {
    if (!validateEmail(toEmail)) {
        throw new Error('Invalid recipient email address');
    }
    const { data, error } = await resend.emails.send({ from: EMAIL_FROM, to: [toEmail], subject, html, ...(text ? { text } : {}) });
    if (error) {
        throw new Error(error.message || 'Resend could not send the email');
    }
    return data;
}

async function sendResidentWelcomeEmail({ toEmail, legalName, temporaryPassword }) {
    const html = await renderTemplate('resident-welcome.html', { legalName, email: toEmail, temporaryPassword });
    const text = [`Hola ${legalName},`, '', 'Se ha creado una cuenta para ti en VÖHK Condominios.', '', `Correo: ${toEmail}`, `Contraseña temporal: ${temporaryPassword}`, '', 'Por seguridad, cambia tu contraseña después de iniciar sesión.'].join('\n');
    return sendEmail({ toEmail, subject: 'Tu cuenta en VÖHK Condominios', html, text });
}

async function sendPasswordResetEmail({ toEmail, legalName, resetUrl }) {
    const html = await renderTemplate('password-reset.html', { legalName: legalName || 'usuario', resetUrl });
    const text = [`Hola ${legalName || 'usuario'},`, '', 'Recibimos una solicitud para restablecer tu contraseña de VÖHK.', '', 'Puedes cambiar tu contraseña usando el siguiente enlace:', resetUrl, '', 'Este enlace expirará en 30 minutos.', '', 'Si no solicitaste este cambio, puedes ignorar este correo.'].join('\n');
    return sendEmail({ toEmail, subject: 'Restablecer contraseña - VÖHK', html, text });
}

module.exports = { sendEmail, renderTemplate, sendResidentWelcomeEmail, sendPasswordResetEmail };