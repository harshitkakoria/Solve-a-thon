/**
 * Calls Azure OpenAI chat completion to analyze a complaint.
 * @param {string[]} complaint_tags
 * @param {string} complaint_text
 * @returns {Promise<{ summary: string, severity: 1 | 2 | 3 }>}
 */
export async function analyzeComplaint(complaint_tags, complaint_text) {
  const endpoint = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT
  const deploymentName = import.meta.env.VITE_AZURE_DEPLOYMENT_NAME
  const apiKey = import.meta.env.VITE_AZURE_OPENAI_KEY

  const url = `${endpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=2024-02-01`

  const body = {
    messages: [
      {
        role: 'system',
        content:
          'You are a complaint analysis assistant. Given complaint tags and text, return ONLY a JSON object with two fields: "summary" (a short sentence) and "severity" (1, 2, or 3 where 1=low, 2=medium, 3=high). Return ONLY valid JSON, no explanation.',
      },
      {
        role: 'user',
        content: `Tags: ${complaint_tags.join(', ')}\nComplaint: ${complaint_text}`,
      },
    ],
    temperature: 0,
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error(`Azure OpenAI error: ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices[0].message.content

    return JSON.parse(content)
  } catch (error) {
    console.error('analyzeComplaint failed:', error)
    return { summary: 'Analysis unavailable', severity: 1 }
  }
}
