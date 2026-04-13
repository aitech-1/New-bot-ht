// Import necessary libraries
const express = require('express');
const router = express.Router();

// Simulated session data for demonstration purposes
let sessions = [
    { id: 1, userId: '1', data: 'Session data for user 1' },
    { id: 2, userId: '2', data: 'Session data for user 2' }
];

// GET endpoint for session retrieval
router.get('/session/:id', (req, res) => {
    const sessionId = parseInt(req.params.id);
    const session = sessions.find(s => s.id === sessionId);
    
    if (session) {
        res.status(200).json(session);
    } else {
        res.status(404).json({ message: 'Session not found' });
    }
});

module.exports = router;