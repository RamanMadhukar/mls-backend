const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    sessionId: {
        type: String,
        required: true,
        unique: true
    },
    captchaText: {
        type: String,
        required: true
    },
    expiresAt: {
        type: Date,
        required: true,
        index: { expires: '5m' } // Auto expire after 5 minutes
    }
});

module.exports = mongoose.model('Session', sessionSchema);