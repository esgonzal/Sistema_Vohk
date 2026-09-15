const express = require('express');
const authenticate = require('../../middleware/authMiddleware');
const service = require('../../services/vohk_app/hikvisionQrService');

function createRouter(qrService = service) {
    const router = express.Router();
    function handler(operation, status) {
        return async (req, res) => {
            res.set('Cache-Control', 'no-store');
            try { return res.status(status).json(await operation(req)); }
            catch (error) {
                const known = Number.isInteger(error.status) && error.status >= 400 && error.status < 600;
                return res.status(known ? error.status : 500).json({
                    error: known ? error.message : 'Could not process QR request',
                    code: known ? error.code : 'QR_INTERNAL_ERROR',
                });
            }
        };
    }
    router.get('/:deviceId/qr/capabilities', authenticate, handler(req => qrService.getCapabilities(req.params.deviceId, req.user), 200));
    router.post('/:deviceId/qr', authenticate, handler(req => qrService.issue(req.params.deviceId, req.user, req.body), 201));
    return router;
}
module.exports = createRouter();
module.exports.createRouter = createRouter;
