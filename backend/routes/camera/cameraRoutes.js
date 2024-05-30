const express = require('express');
const router = express.Router();
//    streamUrl: 'rtsp://admin:Vohk2024@169.254.34.108/media/video0',

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

module.exports = router;