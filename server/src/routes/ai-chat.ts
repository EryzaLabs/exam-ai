import { Router, Request, Response } from 'express';

const router = Router();

const HACKCLUB_URL = 'https://ai.hackclub.com/proxy/v1/chat/completions';

router.post(['/', '/chat'], async (req: Request, res: Response) => {
  try {
    const { messages, temperature = 0.7, max_tokens = 2000, model = 'openai/gpt-4o-mini' } = req.body;

    const apiKey =
      process.env.VLM_API_KEY ||
      process.env.EXPO_PUBLIC_VLM_API_KEY ||
      process.env.HACKCLUB_API_KEY ||
      '';

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    let response = await fetch(HACKCLUB_URL, {
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
      const is402 =
        response.status === 402 ||
        errText.includes('402') ||
        errText.toLowerCase().includes('payment required') ||
        errText.toLowerCase().includes('spending limit');

      if (is402 && model !== 'openrouter/free') {
        console.warn('[AI Chat Proxy] 402 Payment Required, retrying with openrouter/free');
        response = await fetch(HACKCLUB_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'openrouter/free',
            messages,
            temperature,
            max_tokens,
          }),
        });
        if (!response.ok) {
          const retryErrText = await response.text();
          return res.status(response.status).json({ error: retryErrText });
        }
      } else {
        return res.status(response.status).json({ error: errText });
      }
    }

    const data = await response.json();
    return res.json(data);
  } catch (error: any) {
    console.error('AI Chat Proxy Error:', error);
    return res.status(500).json({ error: error.message || 'Internal AI service error' });
  }
});

export default router;
