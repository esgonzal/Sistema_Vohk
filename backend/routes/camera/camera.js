const express = require('express');
const axios = require('axios');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Where HLS files will be stored
const HLS_FOLDER = path.join(__dirname, '../../../hls');
if (!fs.existsSync(HLS_FOLDER)) fs.mkdirSync(HLS_FOLDER);

// Serve static HLS files from this route
router.use('/hls', express.static(HLS_FOLDER));

// Replace with your own credentials
const HIK_TOKEN = 'hcc.RZtR6fuimgXhh9UiYP8YtQg7vpqW37FY';
const DEVICE_SERIAL = 'FQ9225668';
const RESOURCE_ID = '8687742d174a439a96b083823f135120';
const DEVICE_CODE = 'vohk2024'; // camera password

let ffmpegProcess = null;

async function startFfmpeg() {
    try {
        // Get fresh RTMP URL
        const res = await axios.post(
            'https://isa-team.hikcentralconnect.com/api/hccgw/video/v1/live/address/get',
            {
                resourceId: RESOURCE_ID,
                deviceSerial: DEVICE_SERIAL,
                type: "1",
                code: DEVICE_CODE,
                protocol: 3,
                expireTime: 300 // 5 minutes
            },
            { headers: { Token: HIK_TOKEN } }
        );

        const rtmpUrl = res.data.data.url;
        console.log("Fresh RTMP URL:", rtmpUrl);

        // Kill old FFmpeg if running
        if (ffmpegProcess) {
            ffmpegProcess.kill('SIGKILL');
        }

        // Clean old HLS files
        fs.readdirSync(HLS_FOLDER).forEach(f => fs.unlinkSync(path.join(HLS_FOLDER, f)));

        // Start FFmpeg
        ffmpegProcess = spawn('ffmpeg', [
            '-i', rtmpUrl,
            '-c', 'copy',
            '-f', 'hls',
            '-hls_time', '2',
            '-hls_list_size', '5',
            '-hls_flags', 'delete_segments',
            path.join(HLS_FOLDER, 'live.m3u8')
        ]);

        ffmpegProcess.stderr.on('data', data => console.log('FFmpeg:', data.toString()));
        ffmpegProcess.on('exit', code => console.log('FFmpeg exited with code', code));

    } catch (err) {
        console.error("Error starting FFmpeg:", err.message);
    }
}

// Route to start/refresh stream
router.get('/refresh', async (req, res) => {
    await startFfmpeg();
    res.json({ message: 'Stream refreshed. HLS available at /camera/hls/live.m3u8' });
});

module.exports = router;