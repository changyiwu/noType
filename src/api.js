const fs = require('fs');

/**
 * Transcribe audio buffer using OpenAI or Groq Whisper API
 * @param {Buffer} audioBuffer 
 * @param {Object} config 
 * @returns {Promise<string>}
 */
async function transcribeAudio(audioBuffer, config) {
  const isGroq = config.provider === 'groq';
  const apiKey = isGroq ? config.groqApiKey : config.openaiApiKey;
  const endpoint = isGroq 
    ? 'https://api.groq.com/openai/v1/audio/transcriptions'
    : 'https://api.openai.com/v1/audio/transcriptions';
  const model = isGroq ? 'whisper-large-v3-turbo' : 'whisper-1';

  if (!apiKey) {
    throw new Error(`缺少 ${isGroq ? 'Groq' : 'OpenAI'} API 金鑰，請先在設定中配置。`);
  }

  // Create a Blob from the Buffer
  const blob = new Blob([audioBuffer], { type: 'audio/webm' });
  const formData = new FormData();
  formData.append('file', blob, 'speech.webm');
  formData.append('model', model);
  if (config.language) {
    formData.append('language', config.language); // e.g. 'zh'
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`
    },
    body: formData
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`語音辨識 API 錯誤 (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.text;
}

/**
 * Refine transcribed text using Gemini, Groq, or OpenAI API
 * @param {string} text 
 * @param {Object} config 
 * @returns {Promise<string>}
 */
async function refineText(text, config) {
  const provider = config.llmProvider || 'groq';
  
  const systemInstruction = 
    `你是一個專業的語音輸入修飾助手。使用者的輸入是語音轉文字（STT）的原始逐字稿，可能包含贅字（如「呃」、「然後」、「那就是」、「這樣」、「對」、「那個」）、重複的詞彙、錯誤的標點或口語語病。
請依照以下規則進行修飾：
1. 濾除所有無意義的贅字、語氣詞與重複詞。
2. 修正明顯的文法錯誤，重整句子結構，使讀起來流暢、通順且專業。
3. 根據語音的停頓與語意，加上正確的繁體中文標點符號。
4. 除非語音中明確發出格式指令（例如「換行」、「條列如下」），否則直接輸出流暢的段落文字。
5. **重要**：只輸出修飾後的最終文字，絕對不要包含任何前言、說明、解釋、Markdown 標記或引號。直接輸出修飾後的內容。
6. 回應語言必須與使用者發言的主要語言一致（預設為繁體中文，除非使用者說英語等其他語言）。`;

  // Handle Groq and OpenAI
  let apiKey, endpoint, model;
  if (provider === 'groq') {
    apiKey = config.groqApiKey;
    if (!apiKey) {
      throw new Error('缺少 Groq API 金鑰');
    }
    endpoint = 'https://api.groq.com/openai/v1/chat/completions';
    model = config.groqModel || 'llama-3.1-8b-instant';
  } else if (provider === 'openai') {
    apiKey = config.openaiApiKey;
    if (!apiKey) {
      throw new Error('缺少 OpenAI API 金鑰');
    }
    endpoint = 'https://api.openai.com/v1/chat/completions';
    model = config.openaiModel || 'gpt-4o-mini';
  } else {
    throw new Error(`不支援的 LLM 服務商: ${provider}`);
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: text }
      ],
      temperature: 0.3,
      max_tokens: 1024
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${provider.toUpperCase()} API 錯誤 (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  if (data.choices && data.choices[0] && data.choices[0].message) {
    return data.choices[0].message.content.trim();
  } else {
    throw new Error(`${provider.toUpperCase()} API 未能產生有效回應。`);
  }
}

module.exports = {
  transcribeAudio,
  refineText
};
