// api/qr-status.js

// Returns the current QR code status for polling

const express = require('express');
const router = express.Router();

// Placeholder for QR Code Status
let qrStatus = { isActive: true, updatedAt: new Date() };

// GET current QR code status
router.get('/qr-status', (req, res) => {
    res.json(qrStatus);
});

module.exports = router;