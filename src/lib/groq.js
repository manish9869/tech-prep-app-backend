import { env } from '../config/env.js';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

function extractJSON(text) {
    const stripped = text.replace(/```json\n?|```/g, '').trim();
    const start = stripped.search(/[{[]/);
    const end = Math.max(stripped.lastIndexOf('}'), stripped.lastIndexOf(']'));
    if (start === -1 || end === -1) throw new Error('No JSON found in response');
    try {
        return JSON.parse(stripped.slice(start, end + 1));
    } catch {
        const fixed = stripped.slice(start, end + 1).replace(/:\s*"([\s\S]*?)"/g, (match) =>
            match.replace(/\n/g, '\\n')
        );
        return JSON.parse(fixed);
    }
}

export async function invokeGroq({ prompt, parseJSON = false, maxTokens = 1024 } = {}) {
    const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${env.groqApiKey}`,
        },
        body: JSON.stringify({
            model: GROQ_MODEL,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: maxTokens,
        }),
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(`Groq error ${response.status}: ${err?.error?.message || 'Unknown'}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';

    if (parseJSON) {
        try {
            const result = extractJSON(text);
            if (!result) throw new Error('Empty JSON');
            return result;
        } catch (e) {
            console.error('invokeGroq JSON parse failed:', e.message);
            return null;
        }
    }

    return text;
}

export function invokeResumeAnalysis(prompt) {
    return invokeGroq({ prompt, parseJSON: true, maxTokens: 8000 });
}
