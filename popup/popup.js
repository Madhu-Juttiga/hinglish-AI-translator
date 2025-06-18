document.addEventListener('DOMContentLoaded', async () => {
  const apiKeyStatus = document.getElementById('apiKeyStatus');
  const changeApiKeyBtn = document.getElementById('changeApiKey');
  const removeApiKeyBtn = document.getElementById('removeApiKey');
  const apiKeyContainer = document.getElementById('apiKeyContainer');
  const saveApiKeyBtn = document.getElementById('saveApiKey');
  const apiKeyInput = document.getElementById('apiKey');
  const toggleApiKeyBtn = document.getElementById('toggleApiKey');
  const translationStyle = document.getElementById('translationStyle');
  const languageLevel = document.getElementById('languageLevel');
  const saveSettingsBtn = document.getElementById('saveSettings');
  const liveInput = document.getElementById('liveInput');
  const liveTranslateBtn = document.getElementById('liveTranslateBtn');
  const translatedText = document.getElementById('translatedText');
  const copyBtn = document.getElementById('copyTranslation');
  const speakBtn = document.getElementById('speakTranslation');
  const stopBtn = document.getElementById('stopSpeaking');

  // Load saved settings and key
  const { groqApiKey } = await chrome.storage.local.get('groqApiKey');
  const { translationSettings } = await chrome.storage.local.get('translationSettings') || {};

  if (groqApiKey) {
    apiKeyStatus.textContent = 'API Key is configured';
  }

  if (translationSettings) {
    translationStyle.value = translationSettings.style || 'hinglish';
    languageLevel.value = translationSettings.level || 'balanced';
  }

  // API Key Handlers
  changeApiKeyBtn.addEventListener('click', () => {
    apiKeyContainer.style.display = 'block';
  });

  removeApiKeyBtn.addEventListener('click', async () => {
    await chrome.storage.local.remove('groqApiKey');
    apiKeyStatus.textContent = 'No API key configured';
    alert('API Key removed.');
  });

  toggleApiKeyBtn.addEventListener('click', () => {
    apiKeyInput.type = apiKeyInput.type === 'password' ? 'text' : 'password';
  });

  saveApiKeyBtn.addEventListener('click', async () => {
    const key = apiKeyInput.value.trim();
    if (!key) return alert('Please enter a valid API key.');

    try {
      await chrome.storage.local.set({ groqApiKey: key });

      const testResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          messages: [{ role: "user", content: "Hello" }],
          temperature: 0.5,
          max_tokens: 5
        })
      });

      if (!testResponse.ok) throw new Error("Invalid API key.");

      apiKeyStatus.textContent = 'API Key is configured';
      alert('API Key saved!');
      apiKeyContainer.style.display = 'none';
    } catch (err) {
      await chrome.storage.local.remove('groqApiKey');
      alert(`Error saving key: ${err.message}`);
    }
  });

  saveSettingsBtn.addEventListener('click', async () => {
    const settings = {
      style: translationStyle.value,
      level: languageLevel.value
    };
    await chrome.storage.local.set({ translationSettings: settings });
    alert('Settings saved!');
  });

  // ⭐ Live Translation Preview
  liveTranslateBtn.addEventListener('click', async () => {
    const text = liveInput.value.trim();
    if (!text) {
      translatedText.textContent = "Please enter some text.";
      return;
    }

    try {
      const { groqApiKey } = await chrome.storage.local.get('groqApiKey');
      const { translationSettings } = await chrome.storage.local.get('translationSettings');

      const style = translationSettings?.style || 'hinglish';
      const level = translationSettings?.level || 'balanced';

      const prompt = `Translate the following English sentence to ${style} with a ${level} tone:\n"${text}"`;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqApiKey}`
        },
        body: JSON.stringify({
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          messages: [
            { role: "system", content: "You are a Hinglish translator." },
            { role: "user", content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 200
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API error: ${response.status}`);
      }

      const data = await response.json();
      const result = data.choices?.[0]?.message?.content?.trim() || "No response.";
      translatedText.textContent = result;
    } catch (err) {
      console.error("Translation error:", err.message);
      translatedText.textContent = "Translation failed: " + err.message;
    }
  });

  // 📋 Copy Button
  copyBtn.addEventListener('click', () => {
    const text = translatedText.textContent;
    if (text && text !== "---") {
      navigator.clipboard.writeText(text).then(() => {
        copyBtn.textContent = "Copied!";
        setTimeout(() => (copyBtn.textContent = "Copy"), 2000);
      });
    }
  });

  // 🔊 Speak Button
  speakBtn.addEventListener('click', () => {
    const text = translatedText.textContent;
    if (text && text !== "---") {
      speechSynthesis.cancel(); // Cancel any ongoing speech first
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'hi-IN'; // You can adjust based on selected style if needed
      speechSynthesis.speak(utterance);
    }
  });

  // ⏹️ Stop Button
  stopBtn.addEventListener('click', () => {
    speechSynthesis.cancel();
  });
});
