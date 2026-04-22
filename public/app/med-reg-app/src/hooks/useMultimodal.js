export function useMultimodal() {
  const analyzeWithAI = async ({ apiKey, baseUrl, model, systemPrompt, userText, imageBase64, onChunk }) => {
    
    // 1. 自动修正 URL，确保准确指向 completions 接口
    let apiUrl = (baseUrl || 'https://api.deepseek.com').replace(/\/+$/, '');
    if (!apiUrl.endsWith('/chat/completions')) {
      apiUrl = `${apiUrl}/chat/completions`;
    }

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userText }
    ];

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey.trim()}`
        },
        body: JSON.stringify({
          model: model || "deepseek-chat",
          messages: messages,
          stream: true,
          temperature: 0.1
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = ""; 

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); 

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.substring(6));
              const content = data.choices[0]?.delta?.content;
              if (content) onChunk(content);
            } catch (e) {
              // 忽略解析碎片
            }
          }
        }
      }
    } catch (error) {
      console.error("[AI 底层报错]:", error);
      // 捕获网络层面的拦截 (比如插件拦截、CORS跨域)
      if (error.message.includes('Failed to fetch')) {
        throw new Error("网络请求被阻断。可能原因：1. 浏览器广告拦截插件拦截了 API；2. 公司内网防火墙限制；3. 跨域(CORS)失败。建议使用无痕模式测试。");
      }
      throw error; // 将真实错误抛给 UI
    }
  }

  return { analyzeWithAI }
}