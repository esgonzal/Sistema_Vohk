const express = require('express');
const fs = require("fs");
const path = require("path");
const router = express.Router();
const EVENTS_FILE = path.join(__dirname, '../../data/events.json');

router.get("/", (req, res) => {
    const data = fs.readFileSync(EVENTS_FILE, "utf8");
    res.json(JSON.parse(data));
});
router.post("/", (req, res) => {
    const event = req.body;
    const data = fs.readFileSync(EVENTS_FILE, "utf8");
    const events = JSON.parse(data);
    events.push(event);
    fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2));
    res.json({ status: "ok" });
});

module.exports = router;