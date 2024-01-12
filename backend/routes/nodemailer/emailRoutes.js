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
    const mailOptions = {
        from: USER,
        to,
        subject: "Una eKey ha sido compartida contigo",
        html: emailContent
    };
    if (validateEmail(to)) {
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error(error);
                return res.status(500).send(error.toString());
            }
            //console.log(`Email sent: ${info.response}`);
            res.status(200).send({ emailContent });
        });
    } else {
        res.status(200).send({ emailContent });
    }
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
    const mailOptions = {
        from: USER,
        to,
        subject: "Una eKey ha sido compartida contigo",
        html: emailContent
    };
    if (validateEmail(to)) {
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error(error);
                return res.status(500).send(error.toString());
            }
            //console.log(`Email sent: ${info.response}`);
            res.status(200).send({ emailContent });
        });
    } else {
        res.status(200).send({ emailContent });
    }
});
/*
router.post('/ekeyOneTime', async(req, res) => {
    const { to, from, lock_alias } = req.body;
    const templatePath = path.join(__dirname, 'templates', 'eKeyOneTime.html');
    const templateContent = await fs.readFile(templatePath, 'utf8');
    const emailContent = templateContent
        .replace(/{{to}}/g, to)
        .replace(/{{from}}/g, from)
        .replace(/{{lock_alias}}/g, lock_alias)
    const mailOptions = {
        from: USER,
        to,
        subject: "Una eKey ha sido compartida contigo",
        html: emailContent
    };
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error(error);
            return res.status(500).send(error.toString());
        }
        //console.log(`Email sent: ${info.response}`);
        res.status(200).send({ emailContent });
    });
});
router.post('/ekeyOneTimeNewUser', async(req, res) => {
    const { to, from, lock_alias, password } = req.body;
    const templatePath = path.join(__dirname, 'templates', 'eKeyOneTimeNewUser.html');
    const templateContent = await fs.readFile(templatePath, 'utf8');
    const emailContent = templateContent
        .replace(/{{to}}/g, to)
        .replace(/{{from}}/g, from)
        .replace(/{{lock_alias}}/g, lock_alias)
        .replace(/{{password}}/g, password)
    const mailOptions = {
        from: USER,
        to,
        subject: "Una eKey ha sido compartida contigo",
        html: emailContent
    };
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error(error);
            return res.status(500).send(error.toString());
        }
        //console.log(`Email sent: ${info.response}`);
        res.status(200).send({ emailContent });
    });
});
router.post('/ekeySolicitante', async(req, res) => {
    const { to, from, lock_alias, startDay, endDay, startHour, endHour, week_days } = req.body;
    const templatePath = path.join(__dirname, 'templates', 'eKeySolicitante.html');
    const templateContent = await fs.readFile(templatePath, 'utf8');
    const emailContent = templateContent
        .replace(/{{to}}/g, to)
        .replace(/{{from}}/g, from)
        .replace(/{{lock_alias}}/g, lock_alias)
        .replace(/{{startDay}}/g, startDay)
        .replace(/{{endDay}}/g, endDay)
        .replace(/{{startHour}}/g, startHour)
        .replace(/{{endHour}}/g, endHour)
        .replace(/{{week_days}}/g, week_days)
    const mailOptions = {
        from: USER,
        to,
        subject: "Una eKey ha sido compartida contigo",
        html: emailContent
    };
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error(error);
            return res.status(500).send(error.toString());
        }
        //console.log(`Email sent: ${info.response}`);
        res.status(200).send({ emailContent });
    });
});
router.post('/ekeySolicitanteNewUser', async(req, res) => {
    const { to, from, lock_alias, password, startDay, endDay, startHour, endHour, week_days } = req.body;
    const templatePath = path.join(__dirname, 'templates', 'eKeySolicitanteNewUser.html');
    const templateContent = await fs.readFile(templatePath, 'utf8');
    const emailContent = templateContent
        .replace(/{{to}}/g, to)
        .replace(/{{from}}/g, from)
        .replace(/{{lock_alias}}/g, lock_alias)
        .replace(/{{password}}/g, password)
        .replace(/{{startDay}}/g, startDay)
        .replace(/{{endDay}}/g, endDay)
        .replace(/{{startHour}}/g, startHour)
        .replace(/{{endHour}}/g, endHour)
        .replace(/{{week_days}}/g, week_days)
    const mailOptions = {
        from: USER,
        to,
        subject: "Una eKey ha sido compartida contigo",
        html: emailContent
    };
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error(error);
            return res.status(500).send(error.toString());
        }
        //console.log(`Email sent: ${info.response}`);
        res.status(200).send({ emailContent });
    });
});
*/
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
    const mailOptions = {
        from: USER,
        to,
        subject: "Una eKey ha sido compartida contigo",
        html: emailContent
    };
    if (validateEmail(to)) {
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error(error);
                return res.status(500).send(error.toString());
            }
            //console.log(`Email sent: ${info.response}`);
            res.status(200).send({ emailContent });
        });
    } else {
        res.status(200).send({ emailContent });
    }
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
    const mailOptions = {
        from: USER,
        to,
        subject: "Una eKey ha sido compartida contigo",
        html: emailContent
    };
    if (validateEmail(to)) {
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error(error);
                return res.status(500).send(error.toString());
            }
            //console.log(`Email sent: ${info.response}`);
            res.status(200).send({ emailContent });
        });
    } else {
        res.status(200).send({ emailContent });
    }
});
//PASSCODES
/*
router.post('/passcodeDays', async(req, res) => {
    const { to, from, lock_alias, code, days, start, end } = req.body;
    const templatePath = path.join(__dirname, 'templates', 'passcodeDays.html');
    const templateContent = await fs.readFile(templatePath, 'utf8');
    const emailContent = templateContent
        .replace(/{{to}}/g, to)
        .replace(/{{from}}/g, from)
        .replace(/{{lock_alias}}/g, lock_alias)
        .replace(/{{code}}/g, code)
        .replace(/{{days}}/g, days)
        .replace(/{{start}}/g, start)
        .replace(/{{end}}/g, end)
    const mailOptions = {
        from: USER,
        to,
        subject: "Un código ha sido compartido contigo",
        html: emailContent
    };
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error(error);
            return res.status(500).json({ error: error.toString() });
        }
        //console.log(`Email sent: ${info.response}`);
        res.status(200).send({ emailContent });
    });
});
router.post('/passcodeDelete', async(req, res) => {
    const { to, from, lock_alias, code } = req.body;
    const templatePath = path.join(__dirname, 'templates', 'passcodeDelete.html');
    const templateContent = await fs.readFile(templatePath, 'utf8');
    const emailContent = templateContent
        .replace(/{{to}}/g, to)
        .replace(/{{from}}/g, from)
        .replace(/{{lock_alias}}/g, lock_alias)
        .replace(/{{code}}/g, code)
    const mailOptions = {
        from: USER,
        to,
        subject: "Un código ha sido compartido contigo",
        html: emailContent
    };
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error(error);
            return res.status(500).json({ error: error.toString() });
        }
        //console.log(`Email sent: ${info.response}`);
        res.status(200).send({ emailContent });
    });
});
router.post('/passcodeOneTime', async(req, res) => {
    const { to, from, lock_alias, code } = req.body;
    const templatePath = path.join(__dirname, 'templates', 'passcodeOneTime.html');
    const templateContent = await fs.readFile(templatePath, 'utf8');
    const emailContent = templateContent
        .replace(/{{to}}/g, to)
        .replace(/{{from}}/g, from)
        .replace(/{{lock_alias}}/g, lock_alias)
        .replace(/{{code}}/g, code)
    const mailOptions = {
        from: USER,
        to,
        subject: "Un código ha sido compartido contigo",
        html: emailContent
    };
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error(error);
            return res.status(500).json({ error: error.toString() });
        }
        //console.log(`Email sent: ${info.response}`);
        res.status(200).send({ emailContent });
    });
});
router.post('/passcodePeriodic', async(req, res) => {
    const { to, from, lock_alias, code, start, end } = req.body;
    const templatePath = path.join(__dirname, 'templates', 'passcodePeriodic.html');
    const templateContent = await fs.readFile(templatePath, 'utf8');
    const emailContent = templateContent
        .replace(/{{to}}/g, to)
        .replace(/{{from}}/g, from)
        .replace(/{{lock_alias}}/g, lock_alias)
        .replace(/{{code}}/g, code)
        .replace(/{{start}}/g, start)
        .replace(/{{end}}/g, end)
    const mailOptions = {
        from: USER,
        to,
        subject: "Un código ha sido compartido contigo",
        html: emailContent
    };
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error(error);
            return res.status(500).json({ error: error.toString() });
        }
        //console.log(`Email sent: ${info.response}`);
        res.status(200).send({ emailContent });
    });
});
router.post('/passcodePermanent', async(req, res) => {
    const { to, from, lock_alias, code } = req.body;
    const templatePath = path.join(__dirname, 'templates', 'passcodePermanent.html');
    const templateContent = await fs.readFile(templatePath, 'utf8');
    const emailContent = templateContent
        .replace(/{{to}}/g, to)
        .replace(/{{from}}/g, from)
        .replace(/{{lock_alias}}/g, lock_alias)
        .replace(/{{code}}/g, code)
    const mailOptions = {
        from: USER,
        to,
        subject: "Un código ha sido compartido contigo",
        html: emailContent
    };
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error(error);
            return res.status(500).json({ error: error.toString() });
        }
        //console.log(`Email sent: ${info.response}`);
        res.status(200).send({ emailContent });
    });
});
*/

function validateEmail(email) {
    return email.includes("@");
}

module.exports = router;