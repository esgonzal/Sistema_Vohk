const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const router = express.Router();

const client_id = "5dyaqrgxgeedqcpcktae";
const secret = "70b78dec27d047c98c8ef5ce331548f2";
const device_id = "eb97e8f1fad554a965cbkg";
const url = "https://openapi.tuyaus.com";

function getTime() {
    return new Date().getTime().toString();
}

function generateSign(clientId, timestamp, nonce, signStr, secret) {
    const str = clientId + timestamp + nonce + signStr;
    const hash = crypto.createHmac('sha256', secret).update(str).digest('hex').toUpperCase();
    return hash;
}


module.exports = router;

/*
//streamUrl: 'rtsp://admin:Vohk2024@169.254.34.108/media/video0',
router.get('/livestream', (req, res) => {
    const streamPath = 'rtsp://admin:Vohk2024@169.254.34.108/media/video0'; // Path where ffmpeg is streaming
    const ffmpegCommand = `ffmpeg -i ${streamPath} -c:v copy -f mpegts -`;
    res.contentType('mpegts');
    const ffmpegProcess = require('child_process').spawn(ffmpegCommand.split(' ')[0], ffmpegCommand.split(' ').slice(1));
    ffmpegProcess.stdout.on('data', (data) => {
        res.write(data);
    });
    ffmpegProcess.stderr.on('data', (data) => {
        console.error(`ffmpeg stderr: ${data}`);
    });
    req.on('close', () => {
        ffmpegProcess.kill();
    });
});
*/