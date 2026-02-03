const svgCaptcha = require('svg-captcha');
const Session = require('../models/Session');
const crypto = require('crypto');

class CaptchaService {
    async generateCaptcha() {
        // Generate session ID
        const sessionId = crypto.randomBytes(16).toString('hex');

        // Generate CAPTCHA
        const captcha = svgCaptcha.create({
            size: 6,
            noise: 3,
            color: true,
            background: '#f0f0f0'
        });

        // Store CAPTCHA in session with 5-minute expiry
        await Session.create({
            sessionId,
            captchaText: captcha.text,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000)
        });

        return {
            sessionId,
            captcha: captcha.data,
            text: captcha.text
        };
    }

    async validateCaptcha(sessionId, userInput) {
        const session = await Session.findOne({ sessionId });

        if (!session) {
            return { valid: false, message: 'CAPTCHA expired or invalid session' };
        }

        // Clean up session
        await Session.deleteOne({ sessionId });

        if (session.captchaText.toLowerCase() !== userInput.toLowerCase()) {
            return { valid: false, message: 'Invalid CAPTCHA' };
        }

        return { valid: true, message: 'CAPTCHA validated successfully' };
    }
}

module.exports = new CaptchaService();