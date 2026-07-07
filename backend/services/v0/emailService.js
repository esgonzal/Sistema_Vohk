const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');
const USER = "soporte@vohk.cl";
const PASS = "khto bghq ckfz txla";

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: USER, pass: PASS }
});
function validateEmail(email) {
    return typeof email === 'string' && email.includes('@');
}
async function renderTemplate(templateName, variables) {
    const templatePath = path.join(__dirname, '../../routes/nodemailer/templates', templateName);
    let content = await fs.readFile(templatePath, 'utf8');
    for (const key of Object.keys(variables)) {
        content = content.replace(new RegExp(`{{${key}}}`, 'g'), variables[key]);
    }
    return content;
}
async function sendEmail({ toEmail, subject, html }) {
    if (!validateEmail(toEmail)) {
        throw new Error('Invalid email address');
    }
    return transporter.sendMail({ from: USER, to: toEmail, subject, html });
}
async function sendEkeyEmail({ toEmail, receiverName, locks, startDate, endDate, isNewUser, password }) {
    const isPermanent = startDate === "0" && endDate === "0";
    const lockList = locks.map(l => l.lockAlias).join('<br>');
    const variables = { to: receiverName, lock_alias: lockList };
    let template = '';
    if (isPermanent && isNewUser) {
        template = 'eKeyPermanentNewUser.html';
        variables.password = password;
    }
    else if (isPermanent && !isNewUser) {
        template = 'eKeyPermanent.html';
    }
    else if (!isPermanent && isNewUser) {
        template = 'eKeyPeriodicNewUser.html';
        variables.start = startDate;
        variables.end = endDate;
        variables.password = password;
    }
    else {
        template = 'eKeyPeriodic.html';
        variables.start = startDate;
        variables.end = endDate;
    }
    const html = await renderTemplate(template, variables);
    await sendEmail({ toEmail, subject: 'Acceso eKey compartido contigo', html });
    return true;
}

module.exports = { sendEmail, sendEkeyEmail };