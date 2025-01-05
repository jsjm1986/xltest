document.addEventListener('DOMContentLoaded', () => {
    // 首先获取所有需要的DOM元素
    const chatService = new ChatService();
    const chatMessages = document.getElementById('chatMessages');
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const emotionDisplay = document.getElementById('emotionDisplay');
    const interventionDisplay = document.getElementById('interventionDisplay');
    const qualityDisplay = document.getElementById('qualityDisplay');
    const stageIndicator = document.getElementById('stageIndicator');
    const voiceInputBtn = document.getElementById('voiceInputBtn');
    const voiceStatus = document.getElementById('voiceStatus');
    const exportButton = document.getElementById('exportButton');
    const clearButton = document.getElementById('clearButton');
    const statusIndicator = document.getElementById('statusIndicator');
    const headerTitle = document.querySelector('.chat-header h1');
    const headerDesc = document.querySelector('.chat-header .stage-desc');

    // 检查必要的DOM元素是否存在
    if (!messageInput || !sendButton || !chatMessages) {
        console.error('找不到必要的DOM元素');
        return;
    }

    // 语音识别相关变量
    let recognition = null;
    let isRecording = false;

    // 自动调整输入框高度
    function adjustTextareaHeight() {
        messageInput.style.height = 'auto';
        messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
    }

    messageInput.addEventListener('input', adjustTextareaHeight);

    // 初始化语音识别
    function initSpeechRecognition() {
        if ('webkitSpeechRecognition' in window) {
            recognition = new webkitSpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'zh-CN';

            recognition.onstart = () => {
                isRecording = true;
                voiceInputBtn.classList.add('recording');
                voiceStatus.style.display = 'flex';
                messageInput.placeholder = '正在聆听...点击麦克风按钮停止';
                voiceInputBtn.setAttribute('aria-pressed', 'true');
                voiceInputBtn.title = '点击停止录音';
            };

            recognition.onend = () => {
                isRecording = false;
                voiceInputBtn.classList.remove('recording');
                voiceStatus.style.display = 'none';
                messageInput.placeholder = getPlaceholderByStage(chatService.getCurrentStage());
                voiceInputBtn.setAttribute('aria-pressed', 'false');
                voiceInputBtn.title = '语音输入';
            };

            recognition.onresult = (event) => {
                let interimTranscript = '';
                let finalTranscript = messageInput.value;

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript;
                    } else {
                        interimTranscript += transcript;
                    }
                }

                // 显示临时结果和最终结果的组合
                messageInput.value = finalTranscript + interimTranscript;
                adjustTextareaHeight();
            };

            recognition.onerror = (event) => {
                console.error('语音识别错误:', event.error);
                isRecording = false;
                voiceInputBtn.classList.remove('recording');
                voiceStatus.style.display = 'none';
                messageInput.placeholder = getPlaceholderByStage(chatService.getCurrentStage());
                voiceInputBtn.setAttribute('aria-pressed', 'false');
                
                if (event.error === 'not-allowed') {
                    alert('请允许使用麦克风以启用语音输入功能');
                } else {
                    alert('语音识别出错，请重试或使用键盘输入');
                }
            };

            return true;
        } else {
            console.log('浏览器不支持语音识别');
            if (voiceInputBtn) {
                voiceInputBtn.style.display = 'none';
            }
            return false;
        }
    }

    // 处理语音输入
    function handleVoiceInput() {
        if (!recognition) {
            if (!initSpeechRecognition()) {
                alert('您的浏览器不支持语音识别功能，请使用Chrome浏览器');
                return;
            }
        }

        if (isRecording) {
            recognition.stop();
        } else {
            recognition.start();
        }
    }

    // 绑定事件监听器
    if (voiceInputBtn) {
        voiceInputBtn.addEventListener('click', handleVoiceInput);
    }

    if (sendButton) {
        sendButton.addEventListener('click', sendMessage);
    }

    if (exportButton) {
        exportButton.addEventListener('click', () => {
            chatService.exportChatHistory();
        });
    }

    if (clearButton) {
        clearButton.addEventListener('click', () => {
            if (confirm('确定要清除所有聊天记录吗？')) {
                chatService.clearHistory();
                chatContainer.innerHTML = '';
                updateStageUI(chatService.getCurrentStage());
                addMessage('你好！我是AI心理咨询师，很高兴能和你交流。请告诉我你想聊些什么？', false);
            }
        });
    }

    // 绑定回车发送
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // 阶段描述映射
    const stageDescriptions = {
        [CONFIG.COUNSELING_STAGES.INITIAL]: {
            name: '初始接触',
            desc: '建立信任关系，了解基本情况'
        },
        [CONFIG.COUNSELING_STAGES.ASSESSMENT]: {
            name: '问题评估',
            desc: '全面了解问题，评估严重程度'
        },
        [CONFIG.COUNSELING_STAGES.GOAL_SETTING]: {
            name: '目标设定',
            desc: '制定具体可行的改变目标'
        },
        [CONFIG.COUNSELING_STAGES.INTERVENTION]: {
            name: '干预阶段',
            desc: '实施改变策略，培养应对技能'
        },
        [CONFIG.COUNSELING_STAGES.CLOSING]: {
            name: '总结结束',
            desc: '巩固成果，预防复发，结束关系'
        }
    };

    // 情绪图标映射
    const emotionIcons = {
        positive: '😊',
        negative: '😔',
        neutral: '😐',
        joy: '😄',
        sadness: '😢',
        anxiety: '😰',
        anger: '😠',
        fear: '😨',
        calm: '😌'
    };

    // 更新情绪显示
    function updateEmotionDisplay(emotion) {
        const emotionDisplay = document.getElementById('emotionDisplay');
        if (!emotionDisplay) return;

        const emotionDetails = emotionDisplay.querySelector('.emotion-details');
        if (!emotionDetails) return;

        let emotionIcon = emotionIcons[emotion.category] || emotionIcons.neutral;
        let emotionText = '平静';

        // 根据情绪分析结果设置显示文本
        if (emotion.category === 'positive') {
            emotionText = emotion.subCategory || '积极';
        } else if (emotion.category === 'negative') {
            emotionText = emotion.subCategory || '消极';
        } else {
            emotionText = emotion.subCategory || '平静';
        }

        // 更新显示
        emotionDetails.innerHTML = `
            <div class="emotion-indicator">
                <span class="emotion-icon">${emotionIcon}</span>
                <span class="emotion-text">当前情绪: ${emotionText}</span>
            </div>
            <div class="emotion-intensity">
                <span>强度: ${emotion.intensity || '中等'}</span>
            </div>
        `;

        // 更新ARIA标签
        emotionDisplay.setAttribute('aria-label', `当前情绪状态：${emotionText}，强度：${emotion.intensity || '中等'}`);
    }

    // 更新阶段显示UI
    function updateStageUI(stage) {
        const stageInfo = stageDescriptions[stage];
        
        // 1. 更新进度条
        const progressSteps = document.querySelectorAll('.progress-step');
        const stages = Object.values(CONFIG.COUNSELING_STAGES);
        const currentIndex = stages.indexOf(stage);
        const progress = ((currentIndex + 1) / stages.length) * 100;
        
        document.documentElement.style.setProperty('--progress', `${progress}%`);

        progressSteps.forEach((step, index) => {
            const dot = step.querySelector('.step-dot');
            const label = step.querySelector('.step-label');
            
            if (dot && label) {
                // 重置所有样式
                dot.classList.remove('active', 'completed');
                label.classList.remove('active', 'completed');
                
                // 更新ARIA标签
                if (index === currentIndex) {
                    dot.setAttribute('aria-label', `当前阶段：${stageInfo.name}`);
                } else {
                    dot.setAttribute('aria-label', `${stageDescriptions[stages[index]].name}阶段`);
                }
                
                // 设置当前和已完成的阶段样式
                if (index === currentIndex) {
                    dot.classList.add('active');
                    label.classList.add('active');
                } else if (index < currentIndex) {
                    dot.classList.add('completed');
                    label.classList.add('completed');
                }
            }
        });

        // 2. 更新阶段标题和描述
        if (headerTitle) {
            headerTitle.textContent = `AI心理咨询师 - ${stageInfo.name}`;
        }
        if (headerDesc) {
            headerDesc.textContent = stageInfo.desc;
        }
        if (stageIndicator) {
            stageIndicator.textContent = stageInfo.name;
        }

        // 3. 更新输入框提示
        const placeholder = getPlaceholderByStage(stage);
        messageInput.placeholder = placeholder;

        // 4. 添加阶段转换提示消息
        if (chatMessages.children.length > 0) {
            addMessage(`[系统提示] 进入${stageInfo.name}阶段：${stageInfo.desc}`, false, true);
        }

        // 5. 更新ARIA标签
        const progressIndicator = document.querySelector('.progress-indicator');
        if (progressIndicator) {
            progressIndicator.setAttribute('aria-valuenow', currentIndex + 1);
            progressIndicator.setAttribute('aria-valuetext', `当前阶段：${stageInfo.name}`);
        }
    }

    // 根据阶段获取输入框提示文本
    function getPlaceholderByStage(stage) {
        const placeholders = {
            [CONFIG.COUNSELING_STAGES.INITIAL]: '请告诉我您想聊些什么...',
            [CONFIG.COUNSELING_STAGES.ASSESSMENT]: '请详细描述您的困扰...',
            [CONFIG.COUNSELING_STAGES.GOAL_SETTING]: '您希望通过咨询达到什么目标...',
            [CONFIG.COUNSELING_STAGES.INTERVENTION]: '让我们一起尝试一些改变...',
            [CONFIG.COUNSELING_STAGES.CLOSING]: '请分享这次咨询的感受和收获...'
        };
        return placeholders[stage] || '请输入您想说的话...';
    }

    // 监听阶段变化
    const originalTransitionToStage = chatService.transitionToStage;
    chatService.transitionToStage = function(newStage) {
        originalTransitionToStage.call(this, newStage);
        updateStageUI(newStage);
    };

    // 添加消息到聊天界面
    function addMessage(content, isUser, isSystem = false) {
        let messageDiv;
        if (isSystem) {
            messageDiv = document.createElement('div');
            messageDiv.className = 'message system';
            messageDiv.setAttribute('role', 'status');
            messageDiv.setAttribute('aria-live', 'polite');
        } else {
            messageDiv = document.createElement('div');
            messageDiv.className = `message ${isUser ? 'user' : 'ai'}`;
            messageDiv.setAttribute('role', 'listitem');
        }
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.textContent = content;
        
        messageDiv.appendChild(messageContent);
        chatMessages.appendChild(messageDiv);
        
        // 滚动到底部
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // 为屏幕阅读器添加提示
        if (!isSystem) {
            const srAnnouncement = document.createElement('div');
            srAnnouncement.className = 'sr-only';
            srAnnouncement.setAttribute('aria-live', 'polite');
            srAnnouncement.textContent = `${isUser ? '您' : 'AI咨询师'}说：${content}`;
            document.body.appendChild(srAnnouncement);
            setTimeout(() => srAnnouncement.remove(), 1000);
        }
    }

    // 发送消息
    async function sendMessage() {
        const message = messageInput.value.trim();
        if (!message) return;

        // 禁用输入和发送按钮
        messageInput.disabled = true;
        sendButton.disabled = true;
        voiceInputBtn.disabled = true;

        // 更新按钮状态
        sendButton.setAttribute('aria-disabled', 'true');
        voiceInputBtn.setAttribute('aria-disabled', 'true');

        try {
            // 显示用户消息
            addMessage(message, true);
            messageInput.value = '';
            adjustTextareaHeight();

            // 显示状态指示器
            statusIndicator.style.display = 'flex';
            
            // 获取当前阶段
            const currentStage = chatService.getCurrentStage();

            // 获取AI回复
            const response = await chatService.sendMessage(message);
            
            // 隐藏状态指示器
            statusIndicator.style.display = 'none';
            
            // 显示AI回复
            addMessage(response.response, false);

            // 更新情绪显示
            updateEmotionDisplay(response.emotionAnalysis);

            // 更新干预策略显示
            updateInterventionDisplay(response.interventionPlan);

            // 更新会话质量显示
            updateQualityDisplay(response.sessionQuality);

            // 检查阶段是否发生变化
            const newStage = chatService.getCurrentStage();
            if (newStage !== currentStage) {
                updateStageUI(newStage);
            }
        } catch (error) {
            console.error('发送消息失败:', error);
            addMessage('抱歉，发生了一些错误，请稍后重试。', false);
            statusIndicator.style.display = 'none';
        } finally {
            // 重新启用输入和发送按钮
            messageInput.disabled = false;
            sendButton.disabled = false;
            voiceInputBtn.disabled = false;

            // 更新按钮状态
            sendButton.setAttribute('aria-disabled', 'false');
            voiceInputBtn.setAttribute('aria-disabled', 'false');

            messageInput.focus();
        }
    }

    // 初始化
    function initialize() {
        // 初始化阶段显示
        updateStageUI(chatService.getCurrentStage());
        
        // 显示欢迎消息
        addMessage('你好！我是AI心理咨询师，很高兴能和你交流。请告诉我你想聊些什么？', false);
        
        // 初始化语音识别
        initSpeechRecognition();

        // 设置无障碍属性
        document.querySelector('.progress-indicator').setAttribute('aria-valuemin', 1);
        document.querySelector('.progress-indicator').setAttribute('aria-valuemax', 5);
        document.querySelector('.progress-indicator').setAttribute('aria-valuenow', 1);
        document.querySelector('.progress-indicator').setAttribute('aria-valuetext', '当前阶段：初始接触');
    }

    // 更新干预策略显示
    function updateInterventionDisplay(interventionPlan) {
        const interventionDisplay = document.getElementById('interventionDisplay');
        if (!interventionDisplay) return;

        const strategyDetails = interventionDisplay.querySelector('.strategy-details');
        if (!strategyDetails) return;

        // 更新显示
        strategyDetails.innerHTML = `
            <div class="strategy-name">
                <h4>${interventionPlan.strategy.technique.name}</h4>
                <p>${interventionPlan.strategy.technique.description}</p>
            </div>
            <div class="strategy-steps">
                <h4>实施步骤：</h4>
                <ul>
                    ${interventionPlan.implementation.steps.map(step => `<li>${step}</li>`).join('')}
                </ul>
            </div>
            <div class="strategy-adjustments">
                <h4>调整建议：</h4>
                <p>强度：${interventionPlan.implementation.adjustments.intensity}</p>
                <p>节奏：${interventionPlan.implementation.adjustments.pace}</p>
            </div>
        `;

        // 更新ARIA标签
        interventionDisplay.setAttribute('aria-label', `当前干预策略：${interventionPlan.strategy.technique.name}`);
    }

    // 更新会话质量显示
    function updateQualityDisplay(sessionQuality) {
        const qualityDisplay = document.getElementById('qualityDisplay');
        if (!qualityDisplay) return;

        const qualityDetails = qualityDisplay.querySelector('.quality-details');
        if (!qualityDetails) return;

        // 计算总体质量评分
        const overallQuality = (
            sessionQuality.interactionQuality +
            sessionQuality.responseRelevance +
            sessionQuality.interventionEffectiveness +
            sessionQuality.clientEngagement
        ) / 4;

        // 更新显示
        qualityDetails.innerHTML = `
            <div class="quality-score">
                <h4>总体评分：${(overallQuality * 100).toFixed(0)}%</h4>
            </div>
            <div class="quality-breakdown">
                <p>互动质量：${(sessionQuality.interactionQuality * 100).toFixed(0)}%</p>
                <p>回应相关性：${(sessionQuality.responseRelevance * 100).toFixed(0)}%</p>
                <p>干预效果：${(sessionQuality.interventionEffectiveness * 100).toFixed(0)}%</p>
                <p>来访者参与度：${(sessionQuality.clientEngagement * 100).toFixed(0)}%</p>
            </div>
        `;

        // 更新ARIA标签
        qualityDisplay.setAttribute('aria-label', `会话质量评分：${(overallQuality * 100).toFixed(0)}%`);
    }

    // 启动初始化
    initialize();
}); 