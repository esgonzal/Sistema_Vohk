//cameraRoutes.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const RTSPStream = require('node-rtsp-stream'); //npm install node-rtsp-stream
let rtspServer;
// STEP 1
router.post('/getStreamUrl', async(req, res) => {
    try {
        const { ip_address, dev_index } = req.body;
        const apiUrl = `http://${ip_address}/ISAPI/System/streamMedia?format=json&devIndex=${dev_index}`;
        const requestBody = {
            StreamInfo: {
                id: "1",
                streamType: "main",
                method: "preview",
            }
        };
        // Make a POST request to retrieve the stream URL
        const response = await axios.post(apiUrl, requestBody);
        // Extract the stream URL from the response
        console.log(response);
        const streamUrl = response.data.MediaAccessInfo.URL;
        // Save the stream URL in the global variable for later use
        rtspServer = {
            streamUrl: streamUrl,
            server: null, // Initialize server as null
        };
        // Respond with the stream URL
        res.json({ success: true, streamUrl });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Error starting live stream in step 1' });
    }
});
// STEP 2
router.post('/startLiveStream', async(req, res) => {
    try {
        if (!rtspServer) {
            return res.status(400).json({ success: false, error: 'Stream URL not available' });
        }
        // Start RTSP server if not already started
        if (!rtspServer.server) {
            rtspServer.server = new RTSPStream({
                name: 'camera-stream',
                streamUrl: rtspServer.streamUrl,
                wsPort: 9999,
            });
        }
        res.json({ success: true, message: 'Live stream started' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Error starting live stream in step 2' });
    }
});
// STEP 3
router.post('/setupLiveStream', async(req, res) => {
    try {
        const { streamUrl } = req.body;
        // Make a SETUP request to initiate the connection
        const setupResponse = await axios({
            method: 'SETUP',
            url: streamUrl,
            headers: {
                'Transport': 'RTP/AVP/TCP;unicast;interleaved=0-1',
            },
        });
        // Check if the SETUP request was successful (200 OK)
        if (setupResponse.status === 200) {
            return res.json({ success: true, message: 'Live stream setup completed' });
        } else {
            return res.status(500).json({ success: false, error: 'Failed to set up live stream in step 3' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Error setting up live stream in step 3' });
    }
});
// STEP 4
router.post('/startLiveStream', async(req, res) => {
    try {
        if (!rtspServer) {
            return res.status(400).json({ success: false, error: 'Stream URL not available' });
        }

        // Start RTSP server if not already started
        if (!rtspServer.server) {
            rtspServer.server = new RTSPStream({
                name: 'camera-stream',
                streamUrl: rtspServer.streamUrl,
                wsPort: 9999,
            });
        }

        res.json({ success: true, message: 'Live stream started' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Error starting live stream' });
    }
});
// STEP 5
router.post('/stopLiveStream', async(req, res) => {
    try {
        if (!rtspServer || !rtspServer.server) {
            return res.status(400).json({ success: false, error: 'Stream not currently active' });
        }

        // Stop RTSP server
        rtspServer.server.close();
        rtspServer.server = null;

        res.json({ success: true, message: 'Live stream stopped' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Error stopping live stream' });
    }
});

module.exports = router;