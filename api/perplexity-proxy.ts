import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(request: VercelRequest, response: VercelResponse) {
    console.log('Proxy Handler Started');
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.PERPLEXITY_API_KEY;
    console.log(`API Key status: ${apiKey ? 'Present' : 'Missing'}, Length: ${apiKey?.length}`);

    if (!apiKey) {
        console.error('Missing API Key in environment');
        return response.status(500).json({ error: 'Server configuration error: Missing API Key' });
    }

    try {
        const { prompt, options } = request.body;

        // Default options
        const model = options?.model || 'sonar';
        const temperature = options?.temperature || 0.7;
        // Note: responseFormat is handled by logic in caller usually, but we pass what we can

        const requestBody = {
            model,
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature
        };

        const apiResponse = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'User-Agent': 'NightDividesTheDay/1.0 (Vercel Serverless)',
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!apiResponse.ok) {
            const errorText = await apiResponse.text();
            return response.status(apiResponse.status).json({ error: `Upstream API error: ${errorText}` });
        }

        const data = await apiResponse.json();
        return response.status(200).json(data);

    } catch (error: any) {
        console.error('Proxy error catch:', error);
        return response.status(500).json({
            error: 'Internal server error while communicating with Perplexity API',
            details: error.message
        });
    }
}
