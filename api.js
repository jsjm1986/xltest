class ChatService {
    constructor() {
        this.messages = [{
            role: 'system',
            content: CONFIG.SYSTEM_PROMPT
        }];
    }

    async sendMessage(userMessage) {
        try {
            // 添加用户消息到历史记录
            this.messages.push({
                role: 'user',
                content: userMessage
            });

            // 使用fetch调用API
            const response = await fetch(CONFIG.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CONFIG.API_KEY}`
                },
                body: JSON.stringify({
                    model: "deepseek-chat",
                    messages: this.messages,
                    temperature: 0.7,
                    max_tokens: 1000
                })
            });

            if (!response.ok) {
                throw new Error('API请求失败: ' + response.status);
            }

            const data = await response.json();
            const aiResponse = data.choices[0].message.content;

            // 添加AI回复到历史记录
            this.messages.push({
                role: 'assistant',
                content: aiResponse
            });

            return aiResponse;
        } catch (error) {
            console.error('发送消息时出错:', error);
            throw error;
        }
    }

    clearHistory() {
        this.messages = [{
            role: 'system',
            content: CONFIG.SYSTEM_PROMPT
        }];
    }
} 