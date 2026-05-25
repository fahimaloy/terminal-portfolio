import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '../../../../utils/adminAuth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ ok: false, message: 'Method not allowed' });
    return;
  }

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  try {
    const { provider_type, api_key, base_url } = req.body || {};

    if (!provider_type || !api_key) {
      res.status(400).json({ ok: false, message: 'provider_type and api_key are required' });
      return;
    }

    if (!['gemini', 'openai_compatible'].includes(provider_type)) {
      res.status(400).json({ ok: false, message: 'provider_type must be "gemini" or "openai_compatible"' });
      return;
    }

    let models: string[] = [];

    if (provider_type === 'gemini') {
      models = await fetchGeminiModels(api_key);
    } else if (provider_type === 'openai_compatible') {
      if (!base_url) {
        res.status(400).json({ ok: false, message: 'base_url is required for openai_compatible providers' });
        return;
      }
      models = await fetchOpenAICompatibleModels(base_url, api_key);
    }

    res.status(200).json({
      ok: true,
      models: models.sort(),
      count: models.length,
    });
  } catch (error: any) {
    const message = error.message || 'Failed to test connection';
    res.status(400).json({ ok: false, message });
  }
}

async function fetchGeminiModels(apiKey: string): Promise<string[]> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`,
    { headers: { 'Content-Type': 'application/json' } },
  );

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`Gemini API error ${response.status}: ${errorBody}`);
  }

  const data = await response.json();

  if (!data.models || !Array.isArray(data.models)) {
    throw new Error('Unexpected response format from Gemini API');
  }

  // Filter to only generative models (exclude embedding, tuning, etc.)
  return data.models
    .filter((m: any) =>
      m.name &&
      m.supportedGenerationMethods &&
      m.supportedGenerationMethods.includes('generateContent'),
    )
    .map((m: any) => m.name.replace('models/', ''));
}

async function fetchOpenAICompatibleModels(
  baseUrl: string,
  apiKey: string,
): Promise<string[]> {
  const normalizedUrl = baseUrl.replace(/\/+$/, '');
  const response = await fetch(`${normalizedUrl}/models`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`OpenAI API error ${response.status}: ${errorBody}`);
  }

  const data = await response.json();

  if (!data.data || !Array.isArray(data.data)) {
    throw new Error('Unexpected response format from API');
  }

  return data.data.map((m: any) => m.id);
}
