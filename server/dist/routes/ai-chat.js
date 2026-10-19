"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
const HACKCLUB_URL = 'https://ai.hackclub.com/proxy/v1/chat/completions';
router.post(['/', '/chat'], async (req, res) => {
    try {
        const { messages, temperature = 0.7, max_tokens = 2000, model = 'openai/gpt-4o-mini' } = req.body;
        const apiKey = process.env.VLM_API_KEY ||
            process.env.EXPO_PUBLIC_VLM_API_KEY ||
            process.env.HACKCLUB_API_KEY ||
            '';
        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Messages array is required' });
        }
        const response = await fetch(HACKCLUB_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model,
                messages,
                temperature,
                max_tokens,
            }),
        });
        if (!response.ok) {
            const errText = await response.text();
            return res.status(response.status).json({ error: errText });
        }
        const data = await response.json();
        return res.json(data);
    }
    catch (error) {
        console.error('AI Chat Proxy Error:', error);
        return res.status(500).json({ error: error.message || 'Internal AI service error' });
    }
});
exports.default = router;
//# sourceMappingURL=ai-chat.js.map