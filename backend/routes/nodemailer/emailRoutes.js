const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const USER = "soporte@vohk.cl";
const PASS = "khto bghq ckfz txla";

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: USER,
        pass: PASS
    },
});
//EKEYS
router.post('/ekeyPermanent', async(req, res) => {
    const { to, from, lock_alias } = req.body;
    const templatePath = path.join(__dirname, 'templates', 'eKeyPermanent.html');
    const templateContent = await fs.readFile(templatePath, 'utf8');
    const emailContent = templateContent
        .replace(/{{to}}/g, to)
        .replace(/{{from}}/g, from)
        .replace(/{{lock_alias}}/g, lock_alias);
    res.status(200).send({ emailContent });
});
router.post('/ekeyPermanentNewUser', async(req, res) => {
    const { to, from, lock_alias, password } = req.body;
    const templatePath = path.join(__dirname, 'templates', 'eKeyPermanentNewUser.html');
    const templateContent = await fs.readFile(templatePath, 'utf8');
    const emailContent = templateContent
        .replace(/{{to}}/g, to)
        .replace(/{{from}}/g, from)
        .replace(/{{lock_alias}}/g, lock_alias)
        .replace(/{{password}}/g, password)
    res.status(200).send({ emailContent });
});
router.post('/ekeyPeriodic', async(req, res) => {
    const { to, from, lock_alias, start, end } = req.body;
    const templatePath = path.join(__dirname, 'templates', 'eKeyPeriodic.html');
    const templateContent = await fs.readFile(templatePath, 'utf8');
    const emailContent = templateContent
        .replace(/{{to}}/g, to)
        .replace(/{{from}}/g, from)
        .replace(/{{lock_alias}}/g, lock_alias)
        .replace(/{{start}}/g, start)
        .replace(/{{end}}/g, end)
    res.status(200).send({ emailContent });
});
router.post('/ekeyPeriodicNewUser', async(req, res) => {
    const { to, from, lock_alias, password, start, end } = req.body;
    const templatePath = path.join(__dirname, 'templates', 'eKeyPeriodicNewUser.html');
    const templateContent = await fs.readFile(templatePath, 'utf8');
    const emailContent = templateContent
        .replace(/{{to}}/g, to)
        .replace(/{{from}}/g, from)
        .replace(/{{lock_alias}}/g, lock_alias)
        .replace(/{{password}}/g, password)
        .replace(/{{start}}/g, start)
        .replace(/{{end}}/g, end)
    res.status(200).send({ emailContent });
});
router.post('/sendEmail', async(req, res) => {
    const { toEmail, emailContent } = req.body;
    const mailOptions = {
        from: USER,
        to: toEmail,
        subject: "Una eKey ha sido compartida contigo",
        html: emailContent
    };
    try {
        if (validateEmail(toEmail)) {
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.error(error);
                    return res.status(500).send(error.toString());
                }
                res.status(200).send({ success: true });
            });
        } else {
            res.status(400).send({ errmsg: 'Invalid email address' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).send({ errmsg: 'Error sending email' });
    }
});
router.post('/sharePasscode', async(req, res) => {
    const { name, email, motivo, code, lock_alias, start, end } = req.body;
    const templatePath = path.join(__dirname, 'templates', 'sharePasscode.html');
    const templateContent = await fs.readFile(templatePath, 'utf8');
    const emailContent = templateContent
        .replace(/{{name}}/g, name)
        .replace(/{{motivo}}/g, motivo)
        .replace(/{{code}}/g, code)
        .replace(/{{lock_alias}}/g, lock_alias)
        .replace(/{{start}}/g, start)
        .replace(/{{end}}/g, end)
    const mailOptions = {
        from: USER,
        to: email,
        subject: "Un código temporal ha sido compartido contigo",
        html: emailContent
    };
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error(error);
            return res.status(500).json({ error: error.toString() });
        }
        res.status(200).send({ emailContent });
    });
});

function validateEmail(email) {
    return email.includes("@");
}
module.exports = router;