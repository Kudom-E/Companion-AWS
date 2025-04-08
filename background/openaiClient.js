import { buildPromptMessages } from "./promptTemplate.js";

export async function fetchOpenAIResponse(prompt, url, apiKey) {
  const messages = buildPromptMessages(prompt, url);
  let defaultModel = "gpt-4o";

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: defaultModel,
      messages: messages,
      max_tokens: 250,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error: ${response.statusText}. Details: ${errorText}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content?.trim() || null;
}
