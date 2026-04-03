/**
 * Classifies feedback by trying Azure OpenAI first, then falling back to standard OpenAI.
 * 
 * @param {string[]} tags - Array of complaint tags
 * @param {string} text - The optional complaint text
 * @returns {Promise<{ summary: string, severity: 1 | 2 | 3 }>}
 */
export async function classifyFeedback(tags, text) {
  const messages = [
    {
      role: 'system',
      content: `You are a feedback classifier.
Given complaint tags and text, you must return ONLY a JSON object exactly matching this structure: {"summary": "short sentence", "severity": 1}

Rules for "severity":
- 3 = hygiene/health risk
- 2 = moderate issue
- 1 = minor

Do not add any Markdown formatting, explanations, or extra text. Output raw JSON only.`
    },
    {
      role: 'user',
      content: `Tags: ${(tags || []).join(', ')}\nText: ${text || 'No text provided'}`
    }
  ]

  // 1. Try Azure OpenAI FIRST
  const azureEndpoint = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT
  const azureDeployment = import.meta.env.VITE_AZURE_DEPLOYMENT_NAME
  const azureApiKey = import.meta.env.VITE_AZURE_OPENAI_KEY

  if (azureEndpoint && azureDeployment && azureApiKey) {
    try {
      const azureUrl = `${azureEndpoint}/openai/deployments/${azureDeployment}/chat/completions?api-version=2024-02-01`
      const azureResponse = await fetch(azureUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': azureApiKey
        },
        body: JSON.stringify({
          messages,
          temperature: 0,
          response_format: { type: 'json_object' }
        })
      })

      if (azureResponse.ok) {
        const data = await azureResponse.json()
        return JSON.parse(data.choices[0].message.content)
      } else {
        console.warn(`Azure OpenAI failed with status: ${azureResponse.status}. Falling back...`)
      }
    } catch (azureError) {
      console.warn('Azure OpenAI error:', azureError.message, 'Falling back to standard OpenAI...')
    }
  }

  // 2. Fallback to standard OpenAI
  const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY

  if (!openaiApiKey) {
    console.error('Standard OpenAI fallback failed: VITE_OPENAI_API_KEY is missing.')
    return { summary: 'Analysis unavailable', severity: 1 }
  }

  const openaiUrl = 'https://api.openai.com/v1/chat/completions'

  try {
    const openaiResponse = await fetch(openaiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages,
        temperature: 0
      })
    })

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.status} ${openaiResponse.statusText}`)
    }

    const data = await openaiResponse.json()
    return JSON.parse(data.choices[0].message.content)
  } catch (error) {
    console.error('classifyFeedback totally failed (both Azure and standard):', error)
    return { summary: 'Classification failed', severity: 1 }
  }
}
