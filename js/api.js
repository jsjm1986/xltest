class ChatService {
    constructor() {
        this.apiKey = CONFIG.API_KEY;
        this.apiEndpoint = 'https://api.deepseek.com/v1/chat/completions';
        this.currentStage = CONFIG.COUNSELING_STAGES.INITIAL;
        this.messageHistory = [];
        
        // 扩展情绪关键词和强度词
        this.emotionKeywords = {
            positive: {
                joy: ['开心', '快乐', '高兴', '欣喜', '愉悦', '兴奋', '雀跃', '喜悦'],
                satisfaction: ['满意', '满足', '欣慰', '舒适', '安心', '踏实', '放松', '轻松'],
                hope: ['期待', '充满希望', '乐观', '憧憬', '向往', '憧憬', '展望', '向上'],
                gratitude: ['感激', '感谢', '感恩', '珍惜', '铭记', '感动', '暖心', '温暖'],
                confidence: ['自信', '坚定', '笃定', '确信', '果断', '勇敢', '坚强', '无畏'],
                peace: ['平和', '安宁', '祥和', '宁静', '恬淡', '淡然', '从容', '安详'],
                enthusiasm: ['热情', '积极', '主动', '热心', '投入', '专注', '专心', '专一']
            },
            negative: {
                sadness: ['难过', '伤心', '悲伤', '沮丧', '失落', '消沉', '低落', '忧郁'],
                anxiety: ['焦虑', '担心', '紧张', '不安', '忐忑', '惶恐', '慌张', '恐慌'],
                anger: ['生气', '愤怒', '恼火', '烦躁', '暴怒', '气愤', '恼怒', '激动'],
                fear: ['害怕', '恐惧', '惊慌', '惶恐', '畏惧', '胆怯', '惊恐', '惊吓'],
                guilt: ['内疚', '自责', '羞愧', '惭愧', '后悔', '懊悔', '愧疚', '自责'],
                helplessness: ['无助', '无望', '绝望', '无力', '虚弱', '脆弱', '软弱', '无能'],
                loneliness: ['孤独', '寂寞', '孤单', '空虚', '落寞', '凄凉', '冷清', '寂寥'],
                shame: ['羞耻', '羞愧', '丢脸', '难堪', '尴尬', '窘迫', '羞涩', '羞赧']
            },
            neutral: {
                calm: ['平静', '平和', '淡定', '从容', '安宁', '镇定', '冷静', '沉着'],
                stable: ['稳定', '持平', '均衡', '适度', '中庸', '适中', '中和', '平衡'],
                objective: ['客观', '理性', '中立', '公正', '冷静', '清醒', '明智', '理智'],
                contemplative: ['思考', '沉思', '深思', '反思', '思索', '琢磨', '思量', '考虑'],
                ambivalent: ['矛盾', '纠结', '犹豫', '摇摆', '徘徊', '彷徨', '迟疑', '踌躇']
            }
        };

        this.emotionIntensifiers = {
            high: ['非常', '特别', '极其', '格外', '十分', '很', '太', '尤其', '异常', '超级'],
            moderate: ['比较', '相当', '还算', '稍微', '有点', '略微', '一般', '普通'],
            low: ['一点', '略微', '些许', '轻微', '偶尔', '稍许', '微微', '轻轻']
        };

        this.emotionDimensions = {
            valence: {  // 情绪效价
                positive: 1,
                neutral: 0,
                negative: -1
            },
            arousal: {  // 唤醒度
                high: ['激动', '兴奋', '愤怒', '恐慌', '狂喜'],
                moderate: ['开心', '担心', '烦躁', '期待', '焦虑'],
                low: ['平静', '疲倦', '无聊', '放松', '冷淡']
            },
            dominance: {  // 控制感
                high: ['自信', '坚定', '果断', '主动', '掌控'],
                moderate: ['平和', '适度', '中立', '思考', '观望'],
                low: ['无助', '脆弱', '被动', '犹豫', '迷茫']
            },
            stability: {  // 稳定性
                stable: ['持续', '稳定', '恒定', '长期', '固定'],
                fluctuating: ['波动', '变化', '起伏', '反复', '不定']
            }
        };

        // 优化阶段转换规则
        this.stageTransitionRules = {
            [CONFIG.COUNSELING_STAGES.INITIAL]: {
                keywords: [
                    '困扰', '问题', '帮助', '建议', '咨询', '倾诉', '分享',
                    '最近', '发生', '情况', '感受', '想法', '经历'
                ],
                minMessages: 3,
                emotionThreshold: 0.6,
                requiredTopics: ['主诉问题', '基本信息'],
                blockingFactors: ['严重危机', '精神症状']
            },
            [CONFIG.COUNSELING_STAGES.ASSESSMENT]: {
                keywords: [
                    '原因', '影响', '程度', '情况', '症状', '表现', '频率',
                    '持续', '严重', '变化', '关系', '工作', '生活', '家庭',
                    '睡眠', '饮食', '心情', '想法', '行为'
                ],
                minMessages: 5,
                emotionThreshold: 0.7,
                requiredTopics: ['问题评估', '影响范围', '严重程度'],
                blockingFactors: ['信息不足', '抗拒评估']
            },
            [CONFIG.COUNSELING_STAGES.GOAL_SETTING]: {
                keywords: [
                    '希望', '目标', '期待', '计划', '改变', '具体', '可行',
                    '短期', '长期', '预期', '结果', '步骤', '方向', '标准'
                ],
                minMessages: 4,
                emotionThreshold: 0.6,
                requiredTopics: ['目标制定', '可行性评估'],
                blockingFactors: ['目标不明确', '期望过高']
            },
            [CONFIG.COUNSELING_STAGES.INTERVENTION]: {
                keywords: [
                    '尝试', '改变', '行动', '练习', '方法', '技巧', '策略',
                    '调整', '应对', '解决', '执行', '实践', '进展', '效果',
                    '困难', '阻碍', '突破', '进步'
                ],
                minMessages: 6,
                emotionThreshold: 0.8,
                requiredTopics: ['干预方案', '执行情况', '效果评估'],
                blockingFactors: ['执行困难', '抗拒改变']
            },
            [CONFIG.COUNSELING_STAGES.CLOSING]: {
                keywords: [
                    '感谢', '收获', '结束', '再见', '总结', '回顾', '成长',
                    '变化', '进步', '巩固', '预防', '未来', '规划', '告别'
                ],
                minMessages: 3,
                emotionThreshold: 0.7,
                requiredTopics: ['成果总结', '预防复发'],
                blockingFactors: ['重大退步', '新问题出现']
            }
        };

        // 危机关键词
        this.crisisKeywords = [
            '自杀', '死亡', '伤害', '绝望', '活不下去', '结束生命',
            '没有意义', '痛苦难忍', '崩溃', '暴力倾向', '伤害他人',
            '失控', '幻觉', '妄想', '严重失眠', '无法工作'
        ];

        // 阶段评估维度
        this.assessmentDimensions = {
            problemSeverity: 0,      // 问题严重程度
            clientMotivation: 0,     // 来访者动机
            therapeuticAlliance: 0,   // 咨询关系
            progressLevel: 0,         // 进展程度
            riskLevel: 0             // 风险程度
        };

        // 干预策略库
        this.interventionStrategies = {
            cognitive: {
                name: '认知干预',
                description: '帮助识别和改变不合理认知',
                techniques: [
                    {
                        name: '认知重构',
                        description: '识别和挑战消极思维模式',
                        suitableFor: ['anxiety', 'depression', 'low_confidence'],
                        contraindications: ['severe_crisis', 'psychotic'],
                        steps: [
                            '识别自动化思维',
                            '寻找认知偏差',
                            '收集证据',
                            '生成替代性想法',
                            '实践新认知'
                        ]
                    },
                    {
                        name: '问题解决',
                        description: '系统性解决问题的方法',
                        suitableFor: ['stress', 'decision_making', 'life_adjustment'],
                        contraindications: ['severe_emotional_distress'],
                        steps: [
                            '明确问题',
                            '头脑风暴解决方案',
                            '评估可行性',
                            '制定行动计划',
                            '执行和评估'
                        ]
                    }
                ]
            },
            behavioral: {
                name: '行为干预',
                description: '通过改变行为模式促进改变',
                techniques: [
                    {
                        name: '行为激活',
                        description: '增加积极活动的参与',
                        suitableFor: ['depression', 'low_motivation', 'social_withdrawal'],
                        contraindications: ['manic', 'impulsive'],
                        steps: [
                            '活动监测',
                            '确定目标活动',
                            '制定活动计划',
                            '克服障碍',
                            '评估效果'
                        ]
                    },
                    {
                        name: '渐进式暴露',
                        description: '逐步面对恐惧情境',
                        suitableFor: ['anxiety', 'phobia', 'avoidance'],
                        contraindications: ['acute_trauma', 'severe_panic'],
                        steps: [
                            '建立焦虑层级',
                            '学习放松技巧',
                            '制定暴露计划',
                            '实施暴露',
                            '巩固进展'
                        ]
                    }
                ]
            },
            emotional: {
                name: '情绪干预',
                description: '关注情绪体验和表达',
                techniques: [
                    {
                        name: '情绪觉察',
                        description: '提高情绪意识和理解',
                        suitableFor: ['emotional_confusion', 'alexithymia', 'stress'],
                        contraindications: ['severe_dissociation'],
                        steps: [
                            '识别情绪',
                            '描述情绪体验',
                            '理解情绪触发',
                            '接纳情绪',
                            '健康表达'
                        ]
                    },
                    {
                        name: '情绪调节',
                        description: '学习管理和调节情绪的技巧',
                        suitableFor: ['emotion_dysregulation', 'impulse_control', 'anger'],
                        contraindications: ['active_crisis'],
                        steps: [
                            '识别预警信号',
                            '学习调节技巧',
                            '制定应对计划',
                            '练习新技能',
                            '预防复发'
                        ]
                    }
                ]
            },
            interpersonal: {
                name: '人际干预',
                description: '改善人际关系和沟通模式',
                techniques: [
                    {
                        name: '沟通训练',
                        description: '提高人际沟通效能',
                        suitableFor: ['relationship_problems', 'social_anxiety', 'assertiveness'],
                        contraindications: ['acute_conflict'],
                        steps: [
                            '评估沟通模式',
                            '学习沟通技巧',
                            '角色练习',
                            '实际应用',
                            '反馈调整'
                        ]
                    },
                    {
                        name: '角色分析',
                        description: '探索和调整社会角色',
                        suitableFor: ['role_transition', 'identity_issues', 'work_stress'],
                        contraindications: ['severe_confusion'],
                        steps: [
                            '识别角色期待',
                            '分析角色冲突',
                            '调整角色认知',
                            '学习新技能',
                            '适应新角色'
                        ]
                    }
                ]
            },
            supportive: {
                name: '支持性干预',
                description: '提供情感支持和资源链接',
                techniques: [
                    {
                        name: '积极倾听',
                        description: '提供理解和支持的倾听',
                        suitableFor: ['emotional_distress', 'loneliness', 'grief'],
                        contraindications: [],
                        steps: [
                            '建立信任',
                            '反映感受',
                            '提供支持',
                            '探索资源',
                            '巩固关系'
                        ]
                    },
                    {
                        name: '资源链接',
                        description: '连接社会支持资源',
                        suitableFor: ['practical_needs', 'social_isolation', 'crisis'],
                        contraindications: [],
                        steps: [
                            '评估需求',
                            '识别资源',
                            '制定计划',
                            '协助链接',
                            '跟进评估'
                        ]
                    }
                ]
            }
        };
    }

    // 获取当前阶段
    getCurrentStage() {
        return this.currentStage;
    }

    // 转换到新阶段
    transitionToStage(newStage) {
        if (Object.values(CONFIG.COUNSELING_STAGES).includes(newStage)) {
            this.currentStage = newStage;
            return true;
        }
        return false;
    }

    // 检查是否应该转换到下一个阶段
    checkStageTransition(message, emotionAnalysis) {
        // 首先检查危机情况
        if (this.checkCrisisSituation(message)) {
            return CONFIG.COUNSELING_STAGES.ASSESSMENT;
        }

        const currentRules = this.stageTransitionRules[this.currentStage];
        if (!currentRules) return false;

        const stages = Object.values(CONFIG.COUNSELING_STAGES);
        const currentIndex = stages.indexOf(this.currentStage);
        if (currentIndex === stages.length - 1) return false;

        const nextStage = stages[currentIndex + 1];
        const relevantMessages = this.messageHistory.slice(-currentRules.minMessages);
        
        // 计算各项指标的得分
        const scores = {
            // 基础指标
            topicCoverage: this.calculateTopicCoverageScore(relevantMessages, currentRules.requiredTopics),
            blockingFactors: this.calculateBlockingFactorScore(message, currentRules.blockingFactors),
            keywords: this.calculateKeywordScore(message, relevantMessages, currentRules.keywords),
            emotion: this.calculateEmotionScore(relevantMessages),
            dimensions: this.calculateDimensionScore(),

            // 新增指标
            emotionalStability: this.calculateEmotionalStabilityScore(relevantMessages),
            therapeuticAlliance: this.calculateTherapeuticAllianceScore(relevantMessages),
            clientReadiness: this.calculateClientReadinessScore(relevantMessages),
            problemClarity: this.calculateProblemClarityScore(relevantMessages),
            interventionEffectiveness: this.calculateInterventionEffectivenessScore(relevantMessages)
        };

        // 根据当前阶段调整权重
        const weights = this.getStageWeights(this.currentStage);
        
        // 计算总得分
        const totalScore = Object.entries(scores).reduce((sum, [key, score]) => {
            return sum + score * (weights[key] || 0);
        }, 0);

        // 根据阶段设置阈值
        const threshold = this.getStageThreshold(this.currentStage);

        // 检查额外条件
        const extraConditions = this.checkExtraConditions(this.currentStage, scores, relevantMessages);
        if (!extraConditions.passed) {
            return false;
        }

        // 记录转换评估结果
        this.transitionAssessment = {
            stage: this.currentStage,
            scores,
            weights,
            totalScore,
            threshold,
            extraConditions: extraConditions.details,
            timestamp: new Date()
        };

        // 判断是否可以转换阶段
        return totalScore >= threshold ? nextStage : false;
    }

    // 计算话题覆盖得分
    calculateTopicCoverageScore(messages, requiredTopics) {
        const messageText = messages.map(msg => msg.content).join(' ');
        const coveredTopics = requiredTopics.filter(topic => {
            const topicKeywords = this.getTopicKeywords(topic);
            return topicKeywords.some(keyword => messageText.includes(keyword));
        });
        return coveredTopics.length / requiredTopics.length;
    }

    // 计算阻碍因素得分
    calculateBlockingFactorScore(message, blockingFactors) {
        const blockingCount = blockingFactors.filter(factor => {
            const keywords = this.getBlockingKeywords(factor);
            return keywords.some(keyword => message.includes(keyword));
        }).length;
        return 1 - (blockingCount / blockingFactors.length);
    }

    // 计算维度得分
    calculateDimensionScore() {
        const dimensions = this.assessmentDimensions;
        const weights = {
            problemSeverity: 0.2,
            clientMotivation: 0.25,
            therapeuticAlliance: 0.25,
            progressLevel: 0.2,
            riskLevel: 0.1
        };

        return Object.entries(dimensions).reduce((score, [dimension, value]) => {
            return score + value * weights[dimension];
        }, 0);
    }

    // 获取阶段权重
    getStageWeights(stage) {
        const weights = {
            [CONFIG.COUNSELING_STAGES.INITIAL]: {
                topicCoverage: 0.3,
                blockingFactors: 0.2,
                keywords: 0.2,
                emotion: 0.15,
                dimensions: 0.15
            },
            [CONFIG.COUNSELING_STAGES.ASSESSMENT]: {
                topicCoverage: 0.35,
                blockingFactors: 0.15,
                keywords: 0.15,
                emotion: 0.15,
                dimensions: 0.2
            },
            [CONFIG.COUNSELING_STAGES.GOAL_SETTING]: {
                topicCoverage: 0.25,
                blockingFactors: 0.15,
                keywords: 0.25,
                emotion: 0.15,
                dimensions: 0.2
            },
            [CONFIG.COUNSELING_STAGES.INTERVENTION]: {
                topicCoverage: 0.2,
                blockingFactors: 0.2,
                keywords: 0.2,
                emotion: 0.2,
                dimensions: 0.2
            },
            [CONFIG.COUNSELING_STAGES.CLOSING]: {
                topicCoverage: 0.2,
                blockingFactors: 0.15,
                keywords: 0.15,
                emotion: 0.25,
                dimensions: 0.25
            }
        };

        return weights[stage] || weights[CONFIG.COUNSELING_STAGES.INITIAL];
    }

    // 获取阶段阈值
    getStageThreshold(stage) {
        const thresholds = {
            [CONFIG.COUNSELING_STAGES.INITIAL]: 0.65,
            [CONFIG.COUNSELING_STAGES.ASSESSMENT]: 0.7,
            [CONFIG.COUNSELING_STAGES.GOAL_SETTING]: 0.75,
            [CONFIG.COUNSELING_STAGES.INTERVENTION]: 0.8,
            [CONFIG.COUNSELING_STAGES.CLOSING]: 0.85
        };

        return thresholds[stage] || 0.7;
    }

    // 获取阻碍关键词
    getBlockingKeywords(factor) {
        const blockingKeywordsMap = {
            '严重危机': this.crisisKeywords,
            '精神症状': ['幻觉', '妄想', '失控', '混乱', '严重'],
            '信息不足': ['不清楚', '不知道', '不确定', '模糊', '困惑'],
            '抗拒评估': ['不想说', '不需要', '没问题', '不重要', '不愿意'],
            '目标不明确': ['不知道要什么', '没想好', '不确定', '迷茫', '混乱'],
            '期望过高': ['立即', '马上', '完全', '彻底', '根治'],
            '执行困难': ['做不到', '太难', '办不到', '做不来', '失败'],
            '抗拒改变': ['不想改', '没用', '不相信', '怀疑', '放弃'],
            '重大退步': ['更差', '恶化', '退步', '不行', '失败'],
            '新问题出现': ['新问题', '其他问题', '另外', '还有', '又']
        };

        return blockingKeywordsMap[factor] || [];
    }

    // 检查危机情况
    checkCrisisSituation(message) {
        return this.crisisKeywords.some(keyword => message.includes(keyword));
    }

    // 检查话题覆盖情况
    checkTopicsCoverage(messages, requiredTopics) {
        const messageText = messages.map(msg => msg.content).join(' ');
        return requiredTopics.every(topic => {
            const topicKeywords = this.getTopicKeywords(topic);
            return topicKeywords.some(keyword => messageText.includes(keyword));
        });
    }

    // 获取话题相关关键词
    getTopicKeywords(topic) {
        const topicKeywordsMap = {
            '主诉问题': ['困扰', '问题', '帮助', '情况', '发生'],
            '基本信息': ['年龄', '职业', '家庭', '生活', '工作'],
            '问题评估': ['原因', '影响', '程度', '表现', '症状'],
            '影响范围': ['生活', '工作', '学习', '关系', '家庭'],
            '严重程度': ['严重', '影响', '程度', '频率', '持续'],
            '目标制定': ['目标', '期望', '希望', '改变', '计划'],
            '可行性评估': ['具体', '可行', '步骤', '时间', '资源'],
            '干预方案': ['方法', '技巧', '策略', '建议', '练习'],
            '执行情况': ['尝试', '实践', '执行', '完成', '进展'],
            '效果评估': ['效果', '变化', '进步', '改善', '困难'],
            '成果总结': ['收获', '变化', '进步', '成长', '改变'],
            '预防复发': ['预防', '应对', '维持', '计划', '准备']
        };
        return topicKeywordsMap[topic] || [];
    }

    // 检查阻碍因素
    checkBlockingFactors(message, blockingFactors) {
        const blockingKeywordsMap = {
            '严重危机': this.crisisKeywords,
            '精神症状': ['幻觉', '妄想', '失控', '混乱', '严重'],
            '信息不足': ['不清楚', '不知道', '不确定', '模糊', '困惑'],
            '抗拒评估': ['不想说', '不需要', '没问题', '不重要', '不愿意'],
            '目标不明确': ['不知道要什么', '没想好', '不确定', '迷茫', '混乱'],
            '期望过高': ['立即', '马上', '完全', '彻底', '根治'],
            '执行困难': ['做不到', '太难', '办不到', '做不来', '失败'],
            '抗拒改变': ['不想改', '没用', '不相信', '怀疑', '放弃'],
            '重大退步': ['更差', '恶化', '退步', '不行', '失败'],
            '新问题出现': ['新问题', '其他问题', '另外', '还有', '又']
        };

        return blockingFactors.some(factor => {
            const keywords = blockingKeywordsMap[factor] || [];
            return keywords.some(keyword => message.includes(keyword));
        });
    }

    // 计算关键词匹配分数
    calculateKeywordScore(message, messages, keywords) {
        const messageText = message + ' ' + messages.map(msg => msg.content).join(' ');
        const matchCount = keywords.filter(keyword => messageText.includes(keyword)).length;
        return matchCount / keywords.length;
    }

    // 更新评估维度
    updateAssessmentDimensions(message, emotionAnalysis) {
        const { category, subCategory, intensity } = emotionAnalysis;
        
        // 根据情绪强度调整变化幅度
        const intensityMultiplier = {
            high: 0.2,
            moderate: 0.1,
            low: 0.05
        }[intensity];

        // 更新问题严重程度
        if (category === 'negative' && 
            (subCategory === 'fear' || subCategory === 'anxiety')) {
            this.assessmentDimensions.problemSeverity = Math.min(
                this.assessmentDimensions.problemSeverity + intensityMultiplier,
                1
            );
        }

        // 更新来访者动机
        if (category === 'positive' && 
            (subCategory === 'hope' || subCategory === 'confidence')) {
            this.assessmentDimensions.clientMotivation = Math.min(
                this.assessmentDimensions.clientMotivation + intensityMultiplier,
                1
            );
        }

        // 更新咨询关系
        if (category === 'positive' && 
            (subCategory === 'gratitude' || subCategory === 'satisfaction')) {
            this.assessmentDimensions.therapeuticAlliance = Math.min(
                this.assessmentDimensions.therapeuticAlliance + intensityMultiplier,
                1
            );
        }

        // 更新进展程度
        if (category === 'positive') {
            this.assessmentDimensions.progressLevel = Math.min(
                this.assessmentDimensions.progressLevel + intensityMultiplier,
                1
            );
        }

        // 更新风险程度
        if (category === 'negative' && 
            (subCategory === 'sadness' || subCategory === 'anger')) {
            this.assessmentDimensions.riskLevel = Math.min(
                this.assessmentDimensions.riskLevel + intensityMultiplier,
                1
            );
        }
    }

    // 检查评估维度是否满足转换条件
    checkAssessmentDimensions() {
        const stage = this.currentStage;
        const dimensions = this.assessmentDimensions;

        switch (stage) {
            case CONFIG.COUNSELING_STAGES.INITIAL:
                return dimensions.therapeuticAlliance >= 0.3 && dimensions.riskLevel < 0.7;
            case CONFIG.COUNSELING_STAGES.ASSESSMENT:
                return dimensions.problemSeverity < 0.8 && dimensions.clientMotivation >= 0.4;
            case CONFIG.COUNSELING_STAGES.GOAL_SETTING:
                return dimensions.clientMotivation >= 0.6 && dimensions.therapeuticAlliance >= 0.5;
            case CONFIG.COUNSELING_STAGES.INTERVENTION:
                return dimensions.progressLevel >= 0.4 && dimensions.riskLevel < 0.5;
            case CONFIG.COUNSELING_STAGES.CLOSING:
                return dimensions.progressLevel >= 0.7 && dimensions.therapeuticAlliance >= 0.7;
            default:
                return false;
        }
    }

    // 计算情绪得分
    calculateEmotionScore(messages) {
        if (!messages || messages.length === 0) return 0;

        const emotionCounts = messages.reduce((acc, msg) => {
            const emotion = this.analyzeEmotion(msg.content);
            acc[emotion] = (acc[emotion] || 0) + 1;
            return acc;
        }, {});

        const totalMessages = messages.length;
        const positiveScore = (emotionCounts.positive || 0) / totalMessages;
        const negativeScore = (emotionCounts.negative || 0) / totalMessages;

        return positiveScore - negativeScore + 0.5; // 归一化到0-1范围
    }

    // 增强的情绪分析方法
    analyzeEmotion(text) {
        if (!text) return {
            category: 'neutral',
            subCategory: 'stable',
            intensity: 'moderate',
            dimensions: {
                valence: 0,
                arousal: 'moderate',
                dominance: 'moderate',
                stability: 'stable'
            }
        };

        let scores = {
            positive: { total: 0, subcategories: {} },
            negative: { total: 0, subcategories: {} },
            neutral: { total: 0, subcategories: {} }
        };

        // 分析情绪类别和子类别
        Object.entries(this.emotionKeywords).forEach(([category, subcategories]) => {
            Object.entries(subcategories).forEach(([subCategory, keywords]) => {
                let subcategoryScore = 0;
                keywords.forEach(keyword => {
                    if (text.includes(keyword)) {
                        subcategoryScore++;
                        scores[category].total++;
                    }
                });
                scores[category].subcategories[subCategory] = subcategoryScore;
            });
        });

        // 分析情绪强度
        let intensity = 'moderate';
        Object.entries(this.emotionIntensifiers).forEach(([level, intensifiers]) => {
            if (intensifiers.some(word => text.includes(word))) {
                intensity = level;
            }
        });

        // 分析情绪维度
        const dimensions = {
            valence: this.analyzeValence(scores),
            arousal: this.analyzeArousal(text),
            dominance: this.analyzeDominance(text),
            stability: this.analyzeStability(text)
        };

        // 确定主导情绪
        let dominantCategory = 'neutral';
        let maxScore = scores.neutral.total;
        let dominantSubCategory = 'stable';

        if (scores.positive.total > maxScore) {
            dominantCategory = 'positive';
            maxScore = scores.positive.total;
        }
        if (scores.negative.total > maxScore) {
            dominantCategory = 'negative';
            maxScore = scores.negative.total;
        }

        // 确定主导子类别
        const subCategories = scores[dominantCategory].subcategories;
        let maxSubScore = 0;
        Object.entries(subCategories).forEach(([subCategory, score]) => {
            if (score > maxSubScore) {
                maxSubScore = score;
                dominantSubCategory = subCategory;
            }
        });

        return {
            category: dominantCategory,
            subCategory: dominantSubCategory,
            intensity: intensity,
            dimensions: dimensions
        };
    }

    // 分析情绪效价
    analyzeValence(scores) {
        const total = scores.positive.total + scores.negative.total + scores.neutral.total;
        if (total === 0) return 0;
        return (scores.positive.total - scores.negative.total) / total;
    }

    // 分析唤醒度
    analyzeArousal(text) {
        const { arousal } = this.emotionDimensions;
        if (arousal.high.some(word => text.includes(word))) return 'high';
        if (arousal.low.some(word => text.includes(word))) return 'low';
        return 'moderate';
    }

    // 分析控制感
    analyzeDominance(text) {
        const { dominance } = this.emotionDimensions;
        if (dominance.high.some(word => text.includes(word))) return 'high';
        if (dominance.low.some(word => text.includes(word))) return 'low';
        return 'moderate';
    }

    // 分析稳定性
    analyzeStability(text) {
        const { stability } = this.emotionDimensions;
        if (stability.fluctuating.some(word => text.includes(word))) return 'fluctuating';
        return 'stable';
    }

    // 发送消息
    async sendMessage(message) {
        try {
            // 添加用户消息到历史记录
            this.messageHistory.push({
                role: 'user',
                content: message,
                timestamp: new Date()
            });

            // 分析情绪
            const emotionAnalysis = this.analyzeEmotion(message);

            // 更新评估维度
            this.updateAssessmentDimensions(message, emotionAnalysis);

            // 检查是否需要转换阶段
            const nextStage = this.checkStageTransition(message, emotionAnalysis);
            if (nextStage) {
                this.transitionToStage(nextStage);
            }

            // 选择干预策略
            const stageProgress = {
                progressLevel: this.assessmentDimensions.progressLevel,
                blockingFactors: this.checkBlockingFactors(message, this.stageTransitionRules[this.currentStage].blockingFactors)
            };
            const interventionPlan = this.selectInterventionStrategy(emotionAnalysis, stageProgress);

            // 构建系统提示词
            const systemPrompt = this.buildSystemPrompt(interventionPlan);

            // 准备请求数据
            const requestData = {
                model: "deepseek-chat",
                messages: [
                    {
                        role: "system",
                        content: systemPrompt
                    },
                    ...this.messageHistory
                ],
                temperature: 0.7,
                max_tokens: 1000
            };

            // 发送请求
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify(requestData)
            });

            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status}`);
            }

            const data = await response.json();
            const aiResponse = data.choices[0].message.content;

            // 添加AI回复到历史记录
            this.messageHistory.push({
                role: 'assistant',
                content: aiResponse,
                timestamp: new Date(),
                interventionPlan: interventionPlan
            });

            // 评估会话质量
            const sessionQuality = this.assessSessionQuality();

            // 记录干预效果
            this.recordInterventionEffect(interventionPlan, emotionAnalysis, sessionQuality);

            return {
                response: aiResponse,
                emotionAnalysis,
                interventionPlan,
                sessionQuality
            };

        } catch (error) {
            console.error('发送消息失败:', error);
            throw error;
        }
    }

    // 构建系统提示词
    buildSystemPrompt(interventionPlan) {
        const basePrompt = `你是一位专业的心理咨询师，正在进行${this.currentStage}阶段的咨询。
请使用${interventionPlan.strategy.technique.name}策略进行干预。

干预重点：
${interventionPlan.implementation.steps.join('\n')}

调整建议：
- 强度：${interventionPlan.implementation.adjustments.intensity}
- 节奏：${interventionPlan.implementation.adjustments.pace}
- 重点：${interventionPlan.implementation.adjustments.focus.join('、')}

请注意：
1. 保持专业、同理心和温暖的态度
2. 使用积极倾听和反馈技巧
3. 关注来访者的情绪变化
4. 适时提供支持和鼓励
5. 遵守心理咨询的伦理准则`;

        return basePrompt;
    }

    // 记录干预效果
    recordInterventionEffect(interventionPlan, emotionAnalysis, sessionQuality) {
        const effect = {
            timestamp: new Date(),
            stage: this.currentStage,
            strategy: interventionPlan.strategy,
            emotionalChange: emotionAnalysis,
            sessionQuality: sessionQuality,
            dimensions: { ...this.assessmentDimensions }
        };

        // 保存干预效果记录
        this.interventionEffects = this.interventionEffects || [];
        this.interventionEffects.push(effect);

        // 更新策略效果统计
        this.updateStrategyEffectiveness(effect);
    }

    // 更新策略效果统计
    updateStrategyEffectiveness(effect) {
        const { strategy } = effect;
        
        this.strategyEffectiveness = this.strategyEffectiveness || {};
        this.strategyEffectiveness[strategy.technique.name] = this.strategyEffectiveness[strategy.technique.name] || {
            usageCount: 0,
            successCount: 0,
            averageQuality: 0,
            emotionalImpact: 0
        };

        const stats = this.strategyEffectiveness[strategy.technique.name];
        stats.usageCount++;

        // 计算成功率
        if (effect.sessionQuality.interactionQuality > 0.7) {
            stats.successCount++;
        }

        // 更新平均质量
        stats.averageQuality = (stats.averageQuality * (stats.usageCount - 1) + 
            effect.sessionQuality.interactionQuality) / stats.usageCount;

        // 计算情绪影响
        const emotionalImpact = effect.emotionalChange.dimensions.valence;
        stats.emotionalImpact = (stats.emotionalImpact * (stats.usageCount - 1) + 
            emotionalImpact) / stats.usageCount;
    }

    // 导出聊天记录
    exportHistory() {
        const history = this.messageHistory.map(msg => {
            const role = msg.role === 'user' ? '来访者' : 'AI咨询师';
            return `${role}：${msg.content}\n`;
        }).join('\n');

        const blob = new Blob([history], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `心理咨询记录_${new Date().toLocaleString()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // 清除历史记录
    clearHistory() {
        this.messageHistory = [];
        this.currentStage = CONFIG.COUNSELING_STAGES.INITIAL;
    }

    // 生成咨询报告
    generateReport() {
        const report = {
            sessionInfo: {
                startTime: this.messageHistory[0]?.timestamp || new Date(),
                endTime: new Date(),
                messageCount: this.messageHistory.length,
                currentStage: this.currentStage
            },
            emotionalAnalysis: this.generateEmotionalAnalysis(),
            stageProgress: this.generateStageProgress(),
            dimensionAnalysis: this.generateDimensionAnalysis(),
            recommendations: this.generateRecommendations()
        };

        return report;
    }

    // 生成情绪分析报告
    generateEmotionalAnalysis() {
        const emotions = this.messageHistory.map(msg => {
            if (msg.role === 'user') {
                return {
                    content: msg.content,
                    emotion: this.analyzeEmotion(msg.content),
                    timestamp: msg.timestamp
                };
            }
            return null;
        }).filter(Boolean);

        // 计算情绪变化趋势
        const emotionTrends = this.calculateEmotionTrends(emotions);

        return {
            emotions,
            trends: emotionTrends,
            summary: this.generateEmotionalSummary(emotions, emotionTrends)
        };
    }

    // 计算情绪变化趋势
    calculateEmotionTrends(emotions) {
        const trends = {
            positive: [],
            negative: [],
            neutral: []
        };

        emotions.forEach((emotion, index) => {
            const windowSize = 3;
            const startIndex = Math.max(0, index - windowSize + 1);
            const window = emotions.slice(startIndex, index + 1);
            
            const averages = {
                positive: 0,
                negative: 0,
                neutral: 0
            };

            window.forEach(e => {
                if (e.emotion.category === 'positive') averages.positive++;
                if (e.emotion.category === 'negative') averages.negative++;
                if (e.emotion.category === 'neutral') averages.neutral++;
            });

            Object.keys(averages).forEach(key => {
                averages[key] /= window.length;
                trends[key].push(averages[key]);
            });
        });

        return trends;
    }

    // 生成情绪总结
    generateEmotionalSummary(emotions, trends) {
        const lastEmotions = emotions.slice(-5);
        const currentTrend = this.identifyEmotionalTrend(trends);
        
        const summary = {
            currentState: lastEmotions[lastEmotions.length - 1]?.emotion || 'neutral',
            trend: currentTrend,
            recommendations: []
        };

        // 根据情绪状态和趋势生成建议
        if (currentTrend === 'improving') {
            summary.recommendations.push('继续保持当前的积极状态');
            summary.recommendations.push('可以开始设定更具挑战性的目标');
        } else if (currentTrend === 'deteriorating') {
            summary.recommendations.push('需要更多的情绪支持和理解');
            summary.recommendations.push('考虑调整咨询策略或节奏');
        } else {
            summary.recommendations.push('保持稳定的咨询节奏');
            summary.recommendations.push('可以尝试引入新的话题或技巧');
        }

        return summary;
    }

    // 识别情绪趋势
    identifyEmotionalTrend(trends) {
        const recentPositive = trends.positive.slice(-3);
        const recentNegative = trends.negative.slice(-3);

        const positiveSlope = this.calculateSlope(recentPositive);
        const negativeSlope = this.calculateSlope(recentNegative);

        if (positiveSlope > 0.1 && negativeSlope < 0) return 'improving';
        if (positiveSlope < 0 && negativeSlope > 0.1) return 'deteriorating';
        return 'stable';
    }

    // 计算斜率
    calculateSlope(values) {
        if (values.length < 2) return 0;
        const xMean = (values.length - 1) / 2;
        const yMean = values.reduce((a, b) => a + b, 0) / values.length;
        
        let numerator = 0;
        let denominator = 0;
        
        values.forEach((y, x) => {
            numerator += (x - xMean) * (y - yMean);
            denominator += Math.pow(x - xMean, 2);
        });
        
        return denominator === 0 ? 0 : numerator / denominator;
    }

    // 生成阶段进展报告
    generateStageProgress() {
        const stageHistory = this.messageHistory.map(msg => msg.stage).filter(Boolean);
        const stageDurations = {};
        const stageTransitions = [];
        let currentStage = null;
        let stageStartTime = null;

        stageHistory.forEach((stage, index) => {
            if (stage !== currentStage) {
                if (currentStage) {
                    const duration = new Date() - stageStartTime;
                    stageDurations[currentStage] = (stageDurations[currentStage] || 0) + duration;
                    stageTransitions.push({
                        from: currentStage,
                        to: stage,
                        messageIndex: index,
                        timestamp: new Date()
                    });
                }
                currentStage = stage;
                stageStartTime = new Date();
            }
        });

        return {
            currentStage: this.currentStage,
            stageDurations,
            stageTransitions,
            stageAssessments: this.transitionAssessment
        };
    }

    // 生成维度分析报告
    generateDimensionAnalysis() {
        return {
            current: this.assessmentDimensions,
            history: this.dimensionHistory || [],
            recommendations: this.generateDimensionRecommendations()
        };
    }

    // 生成维度建议
    generateDimensionRecommendations() {
        const recommendations = [];
        const dimensions = this.assessmentDimensions;

        if (dimensions.problemSeverity > 0.7) {
            recommendations.push('问题严重程度较高，建议增加支持性干预');
        }
        if (dimensions.clientMotivation < 0.5) {
            recommendations.push('来访者动机有待提高，可以探索其价值观和目标');
        }
        if (dimensions.therapeuticAlliance < 0.6) {
            recommendations.push('咨询关系需要加强，建议增加共情和理解');
        }
        if (dimensions.progressLevel < 0.4) {
            recommendations.push('进展较慢，可以考虑调整干预策略');
        }
        if (dimensions.riskLevel > 0.5) {
            recommendations.push('风险程度较高，需要加强安全评估和干预');
        }

        return recommendations;
    }

    // 生成总体建议
    generateRecommendations() {
        const recommendations = [];
        const stage = this.currentStage;
        const dimensions = this.assessmentDimensions;
        const emotionAnalysis = this.generateEmotionalAnalysis();
        const stageProgress = this.generateStageProgress();

        // 根据当前阶段生成建议
        this.generateStageSpecificRecommendations(stage, dimensions, recommendations);

        // 根据情绪状态生成建议
        this.generateEmotionalRecommendations(emotionAnalysis, recommendations);

        // 根据进展情况生成建议
        this.generateProgressRecommendations(stageProgress, recommendations);

        // 根据维度评估生成建议
        this.generateDimensionRecommendations(dimensions, recommendations);

        return recommendations;
    }

    // 生成阶段相关建议
    generateStageSpecificRecommendations(stage, dimensions, recommendations) {
        switch (stage) {
            case CONFIG.COUNSELING_STAGES.INITIAL:
                if (dimensions.therapeuticAlliance < 0.5) {
                    recommendations.push({
                        type: 'relationship',
                        content: '需要加强咨询关系的建立',
                        suggestions: [
                            '增加积极倾听和情感反映',
                            '表达更多理解和接纳',
                            '使用开放性问题探索来访者的感受',
                            '适时提供支持和鼓励'
                        ]
                    });
                }
                if (dimensions.problemSeverity > 0.7) {
                    recommendations.push({
                        type: 'assessment',
                        content: '需要评估问题的严重程度',
                        suggestions: [
                            '评估自伤或伤人风险',
                            '了解问题对日常生活的影响',
                            '探索是否需要其他专业帮助',
                            '制定危机干预计划'
                        ]
                    });
                }
                break;

            case CONFIG.COUNSELING_STAGES.ASSESSMENT:
                if (dimensions.problemSeverity > 0.7) {
                    recommendations.push({
                        type: 'assessment',
                        content: '建议进行更详细的问题评估',
                        suggestions: [
                            '探索问题的发生背景和维持因素',
                            '评估问题对各个生活领域的影响',
                            '了解既往应对方式及效果',
                            '评估社会支持系统'
                        ]
                    });
                }
                if (dimensions.clientMotivation < 0.5) {
                    recommendations.push({
                        type: 'motivation',
                        content: '需要提高来访者的改变动机',
                        suggestions: [
                            '探索问题给来访者带来的困扰',
                            '讨论不改变可能带来的后果',
                            '强调来访者的自主权和选择权',
                            '肯定来访者寻求帮助的勇气'
                        ]
                    });
                }
                break;

            case CONFIG.COUNSELING_STAGES.GOAL_SETTING:
                if (dimensions.clientMotivation < 0.6) {
                    recommendations.push({
                        type: 'goal',
                        content: '可以探索来访者的改变动机',
                        suggestions: [
                            '探讨改变可能带来的收益',
                            '设定具体可行的小目标',
                            '讨论实现目标的具体步骤',
                            '预估可能遇到的困难和解决方案'
                        ]
                    });
                }
                if (dimensions.therapeuticAlliance < 0.7) {
                    recommendations.push({
                        type: 'collaboration',
                        content: '需要加强合作关系',
                        suggestions: [
                            '共同制定咨询目标和计划',
                            '明确双方的责任和期望',
                            '及时处理咨询关系中的问题',
                            '保持开放和坦诚的沟通'
                        ]
                    });
                }
                break;

            case CONFIG.COUNSELING_STAGES.INTERVENTION:
                if (dimensions.progressLevel < 0.5) {
                    recommendations.push({
                        type: 'intervention',
                        content: '考虑调整干预策略或技术',
                        suggestions: [
                            '评估当前干预方法的效果',
                            '探索其他可能的干预方式',
                            '调整干预的节奏和强度',
                            '增加实践练习和反馈'
                        ]
                    });
                }
                if (dimensions.riskLevel > 0.5) {
                    recommendations.push({
                        type: 'risk',
                        content: '需要关注风险管理',
                        suggestions: [
                            '定期评估风险水平',
                            '制定应急预案',
                            '加强支持系统的建设',
                            '必要时寻求其他专业帮助'
                        ]
                    });
                }
                break;

            case CONFIG.COUNSELING_STAGES.CLOSING:
                if (dimensions.therapeuticAlliance > 0.8) {
                    recommendations.push({
                        type: 'closing',
                        content: '可以开始准备结束咨询',
                        suggestions: [
                            '回顾咨询过程和收获',
                            '巩固改变成果',
                            '制定预防复发计划',
                            '讨论后续支持方案'
                        ]
                    });
                }
                if (dimensions.progressLevel < 0.7) {
                    recommendations.push({
                        type: 'consolidation',
                        content: '需要巩固咨询成果',
                        suggestions: [
                            '回顾有效的应对策略',
                            '强化积极的改变',
                            '预演可能的挑战情境',
                            '制定维持改变的计划'
                        ]
                    });
                }
                break;
        }
    }

    // 生成情绪相关建议
    generateEmotionalRecommendations(emotionAnalysis, recommendations) {
        const { emotions, trends, summary } = emotionAnalysis;
        const lastEmotion = emotions[emotions.length - 1];

        if (!lastEmotion) return;

        // 根据情绪类别生成建议
        switch (lastEmotion.emotion.category) {
            case 'negative':
                if (lastEmotion.emotion.subCategory === 'anxiety') {
                    recommendations.push({
                        type: 'emotion',
                        content: '需要帮助来访者管理焦虑情绪',
                        suggestions: [
                            '教授放松技巧和呼吸练习',
                            '识别和挑战消极想法',
                            '制定焦虑管理计划',
                            '练习正念冥想'
                        ]
                    });
                }
                if (lastEmotion.emotion.subCategory === 'sadness') {
                    recommendations.push({
                        type: 'emotion',
                        content: '需要帮助来访者处理悲伤情绪',
                        suggestions: [
                            '允许和接纳悲伤的存在',
                            '寻找情绪宣泄的健康方式',
                            '建立日常活动计划',
                            '增强社会支持'
                        ]
                    });
                }
                break;

            case 'positive':
                recommendations.push({
                    type: 'emotion',
                    content: '可以强化积极情绪体验',
                    suggestions: [
                        '探索带来积极情绪的因素',
                        '练习感恩和欣赏',
                        '规划愉快活动',
                        '分享成功经验'
                    ]
                });
                break;
        }

        // 根据情绪趋势生成建议
        if (trends && summary.trend === 'deteriorating') {
            recommendations.push({
                type: 'emotion',
                content: '需要关注情绪恶化趋势',
                suggestions: [
                    '增加情绪监测的频率',
                    '识别情绪触发因素',
                    '制定情绪调节计划',
                    '考虑调整干预策略'
                ]
            });
        }
    }

    // 生成进展相关建议
    generateProgressRecommendations(stageProgress, recommendations) {
        const { stageDurations, stageTransitions } = stageProgress;

        // 检查阶段停留时间
        if (stageDurations[this.currentStage] > 1000 * 60 * 60 * 2) { // 2小时
            recommendations.push({
                type: 'progress',
                content: '当前阶段停留时间较长',
                suggestions: [
                    '评估阶段转换的障碍',
                    '调整干预策略和节奏',
                    '设定阶段性小目标',
                    '增加反馈和评估频率'
                ]
            });
        }

        // 检查阶段转换频率
        if (stageTransitions.length > 3 && stageTransitions[stageTransitions.length - 1].timestamp - stageTransitions[stageTransitions.length - 4].timestamp < 1000 * 60 * 30) { // 30分钟内超过3次转换
            recommendations.push({
                type: 'progress',
                content: '阶段转换频率过高',
                suggestions: [
                    '放慢咨询节奏',
                    '巩固当前阶段的成果',
                    '确保每个阶段的任务完成',
                    '加强过渡期的支持'
                ]
            });
        }
    }

    // 生成维度相关建议
    generateDimensionRecommendations(dimensions, recommendations) {
        // 问题严重程度
        if (dimensions.problemSeverity > 0.7) {
            recommendations.push({
                type: 'severity',
                content: '问题严重程度较高，建议增加支持性干预',
                suggestions: [
                    '评估是否需要医疗转介',
                    '加强危机干预准备',
                    '增加咨询频率',
                    '动员社会支持系统'
                ]
            });
        }

        // 来访者动机
        if (dimensions.clientMotivation < 0.5) {
            recommendations.push({
                type: 'motivation',
                content: '来访者动机有待提高',
                suggestions: [
                    '探索来访者的价值观和目标',
                    '使用动机访谈技术',
                    '强调改变的好处',
                    '设定小而可行的目标'
                ]
            });
        }

        // 咨询关系
        if (dimensions.therapeuticAlliance < 0.6) {
            recommendations.push({
                type: 'alliance',
                content: '咨询关系需要加强',
                suggestions: [
                    '增加共情和理解',
                    '处理咨询关系中的阻碍',
                    '澄清期待和目标',
                    '加强合作关系'
                ]
            });
        }

        // 进展程度
        if (dimensions.progressLevel < 0.4) {
            recommendations.push({
                type: 'progress',
                content: '进展较慢，需要调整策略',
                suggestions: [
                    '评估阻碍因素',
                    '调整干预方法',
                    '增加实践机会',
                    '强化积极改变'
                ]
            });
        }

        // 风险程度
        if (dimensions.riskLevel > 0.5) {
            recommendations.push({
                type: 'risk',
                content: '风险程度较高，需要加强评估和干预',
                suggestions: [
                    '详细评估风险因素',
                    '制定安全计划',
                    '建立支持网络',
                    '考虑专业转介'
                ]
            });
        }
    }

    // 计算情绪稳定性得分
    calculateEmotionalStabilityScore(messages) {
        if (messages.length < 2) return 0.5;

        const emotions = messages.map(msg => this.analyzeEmotion(msg.content));
        let stabilityScore = 0;

        // 检查情绪波动
        for (let i = 1; i < emotions.length; i++) {
            const prev = emotions[i - 1];
            const curr = emotions[i];
            
            // 检查情绪类别变化
            if (prev.category === curr.category) stabilityScore += 0.3;
            
            // 检查情绪强度变化
            if (prev.intensity === curr.intensity) stabilityScore += 0.2;
            
            // 检查情绪维度变化
            if (prev.dimensions.stability === curr.dimensions.stability) stabilityScore += 0.2;
            if (prev.dimensions.arousal === curr.dimensions.arousal) stabilityScore += 0.2;
            if (Math.abs(prev.dimensions.valence - curr.dimensions.valence) < 0.3) stabilityScore += 0.1;
        }

        return stabilityScore / (emotions.length - 1);
    }

    // 计算咨询关系得分
    calculateTherapeuticAllianceScore(messages) {
        const allianceIndicators = {
            positive: ['理解', '感谢', '帮助', '信任', '支持', '认同', '合作', '共同'],
            negative: ['不理解', '质疑', '怀疑', '不信任', '抗拒', '反对', '对抗', '否定']
        };

        let score = 0.5; // 基础分
        const messageText = messages.map(msg => msg.content).join(' ');

        // 计算正面指标
        allianceIndicators.positive.forEach(indicator => {
            if (messageText.includes(indicator)) score += 0.1;
        });

        // 计算负面指标
        allianceIndicators.negative.forEach(indicator => {
            if (messageText.includes(indicator)) score -= 0.1;
        });

        return Math.max(0, Math.min(1, score));
    }

    // 计算来访者准备程度得分
    calculateClientReadinessScore(messages) {
        const readinessIndicators = {
            high: ['想改变', '愿意', '准备好', '决定', '尝试', '努力', '行动', '开始'],
            moderate: ['考虑', '思考', '可能', '也许', '打算', '计划', '希望', '期待'],
            low: ['不想', '没用', '不行', '做不到', '放弃', '无法', '不愿意', '拒绝']
        };

        let score = 0.5;
        const messageText = messages.map(msg => msg.content).join(' ');

        readinessIndicators.high.forEach(indicator => {
            if (messageText.includes(indicator)) score += 0.15;
        });

        readinessIndicators.moderate.forEach(indicator => {
            if (messageText.includes(indicator)) score += 0.1;
        });

        readinessIndicators.low.forEach(indicator => {
            if (messageText.includes(indicator)) score -= 0.15;
        });

        return Math.max(0, Math.min(1, score));
    }

    // 计算问题清晰度得分
    calculateProblemClarityScore(messages) {
        const clarityIndicators = {
            high: ['具体', '清楚', '明确', '确定', '知道', '了解', '发现', '意识到'],
            moderate: ['可能', '也许', '感觉', '觉得', '猜测', '推测', '估计', '大概'],
            low: ['模糊', '不清楚', '不确定', '困惑', '迷茫', '不知道', '混乱', '复杂']
        };

        let score = 0.5;
        const messageText = messages.map(msg => msg.content).join(' ');

        clarityIndicators.high.forEach(indicator => {
            if (messageText.includes(indicator)) score += 0.15;
        });

        clarityIndicators.moderate.forEach(indicator => {
            if (messageText.includes(indicator)) score += 0.1;
        });

        clarityIndicators.low.forEach(indicator => {
            if (messageText.includes(indicator)) score -= 0.15;
        });

        return Math.max(0, Math.min(1, score));
    }

    // 计算干预效果得分
    calculateInterventionEffectivenessScore(messages) {
        const effectivenessIndicators = {
            positive: ['有效', '有用', '改善', '进步', '好转', '帮助', '作用', '效果'],
            neutral: ['一般', '还行', '普通', '一样', '持平', '保持', '维持', '稳定'],
            negative: ['无效', '没用', '恶化', '退步', '变差', '失败', '困难', '问题']
        };

        let score = 0.5;
        const messageText = messages.map(msg => msg.content).join(' ');

        effectivenessIndicators.positive.forEach(indicator => {
            if (messageText.includes(indicator)) score += 0.15;
        });

        effectivenessIndicators.neutral.forEach(indicator => {
            if (messageText.includes(indicator)) score += 0.05;
        });

        effectivenessIndicators.negative.forEach(indicator => {
            if (messageText.includes(indicator)) score -= 0.15;
        });

        return Math.max(0, Math.min(1, score));
    }

    // 检查额外条件
    checkExtraConditions(stage, scores, messages) {
        const conditions = {
            passed: true,
            details: []
        };

        switch (stage) {
            case CONFIG.COUNSELING_STAGES.INITIAL:
                // 检查基本信任关系是否建立
                if (scores.therapeuticAlliance < 0.4) {
                    conditions.passed = false;
                    conditions.details.push('咨询关系尚未建立');
                }
                // 检查问题是否初步明确
                if (scores.problemClarity < 0.3) {
                    conditions.passed = false;
                    conditions.details.push('问题描述不够清晰');
                }
                break;

            case CONFIG.COUNSELING_STAGES.ASSESSMENT:
                // 检查评估是否充分
                if (scores.problemClarity < 0.6) {
                    conditions.passed = false;
                    conditions.details.push('问题评估不够充分');
                }
                // 检查来访者是否准备好设定目标
                if (scores.clientReadiness < 0.5) {
                    conditions.passed = false;
                    conditions.details.push('来访者尚未准备好设定目标');
                }
                break;

            case CONFIG.COUNSELING_STAGES.GOAL_SETTING:
                // 检查目标是否明确
                if (scores.problemClarity < 0.7) {
                    conditions.passed = false;
                    conditions.details.push('咨询目标不够明确');
                }
                // 检查来访者动机
                if (scores.clientReadiness < 0.6) {
                    conditions.passed = false;
                    conditions.details.push('来访者动机不够强');
                }
                break;

            case CONFIG.COUNSELING_STAGES.INTERVENTION:
                // 检查干预效果
                if (scores.interventionEffectiveness < 0.5) {
                    conditions.passed = false;
                    conditions.details.push('干预效果不够理想');
                }
                // 检查情绪稳定性
                if (scores.emotionalStability < 0.6) {
                    conditions.passed = false;
                    conditions.details.push('情绪状态不够稳定');
                }
                break;

            case CONFIG.COUNSELING_STAGES.CLOSING:
                // 检查整体改善情况
                if (scores.interventionEffectiveness < 0.7) {
                    conditions.passed = false;
                    conditions.details.push('整体改善效果不够理想');
                }
                // 检查情绪稳定性
                if (scores.emotionalStability < 0.7) {
                    conditions.passed = false;
                    conditions.details.push('情绪状态不够稳定');
                }
                // 检查问题解决程度
                if (scores.problemClarity < 0.8) {
                    conditions.passed = false;
                    conditions.details.push('问题未得到充分解决');
                }
                break;
        }

        return conditions;
    }

    // 评估会话质量
    assessSessionQuality() {
        const sessionQuality = {
            interactionQuality: this.calculateInteractionQuality(),
            responseRelevance: this.calculateResponseRelevance(),
            interventionEffectiveness: this.calculateInterventionEffectiveness(),
            clientEngagement: this.calculateClientEngagement()
        };

        // 记录评估结果
        this.sessionQualityHistory = this.sessionQualityHistory || [];
        this.sessionQualityHistory.push({
            ...sessionQuality,
            timestamp: new Date()
        });

        return sessionQuality;
    }

    // 计算交互质量
    calculateInteractionQuality() {
        const recentMessages = this.messageHistory.slice(-10);
        let score = 0.5; // 基础分

        // 评估对话流畅度
        for (let i = 1; i < recentMessages.length; i++) {
            const prevMsg = recentMessages[i - 1];
            const currMsg = recentMessages[i];
            
            // 检查回复时间间隔
            const timeGap = new Date(currMsg.timestamp) - new Date(prevMsg.timestamp);
            if (timeGap < 1000 * 60) score += 0.1; // 1分钟内的回复
            
            // 检查消息长度的合适性
            const contentLength = currMsg.content.length;
            if (contentLength > 10 && contentLength < 500) score += 0.1;
            
            // 检查是否有关键词的呼应
            if (this.checkKeywordResonance(prevMsg.content, currMsg.content)) {
                score += 0.1;
            }
        }

        return Math.min(1, Math.max(0, score));
    }

    // 计算回应相关性
    calculateResponseRelevance() {
        const recentMessages = this.messageHistory.slice(-10);
        let score = 0.5;

        // 评估回应的相关性
        for (let i = 1; i < recentMessages.length; i += 2) {
            const userMsg = recentMessages[i - 1];
            const aiMsg = recentMessages[i];
            
            if (userMsg.role !== 'user' || aiMsg.role !== 'assistant') continue;

            // 检查关键词匹配度
            const keywordMatchScore = this.calculateKeywordMatchScore(userMsg.content, aiMsg.content);
            score += keywordMatchScore * 0.2;

            // 检查情感回应的匹配度
            const emotionMatchScore = this.calculateEmotionMatchScore(userMsg.content, aiMsg.content);
            score += emotionMatchScore * 0.2;

            // 检查主题连贯性
            const topicCoherenceScore = this.calculateTopicCoherenceScore(userMsg.content, aiMsg.content);
            score += topicCoherenceScore * 0.1;
        }

        return Math.min(1, Math.max(0, score));
    }

    // 计算来访者参与度
    calculateClientEngagement() {
        const recentMessages = this.messageHistory.slice(-10).filter(msg => msg.role === 'user');
        let score = 0.5;

        // 评估消息频率
        const messageFrequency = this.calculateMessageFrequency(recentMessages);
        score += messageFrequency * 0.2;

        // 评估消息质量
        const messageQuality = this.calculateMessageQuality(recentMessages);
        score += messageQuality * 0.3;

        // 评估情绪投入度
        const emotionalInvestment = this.calculateEmotionalInvestment(recentMessages);
        score += emotionalInvestment * 0.3;

        return Math.min(1, Math.max(0, score));
    }

    // 检查关键词呼应
    checkKeywordResonance(prevContent, currContent) {
        const keywords = this.extractKeywords(prevContent);
        return keywords.some(keyword => currContent.includes(keyword));
    }

    // 提取关键词
    extractKeywords(text) {
        // 使用简单的分词和停用词过滤
        const stopWords = ['的', '了', '和', '是', '在', '我', '你', '他', '她', '它', '这', '那', '都'];
        return text.split(/\s+/).filter(word => 
            word.length > 1 && !stopWords.includes(word)
        );
    }

    // 计算关键词匹配分数
    calculateKeywordMatchScore(userMsg, aiMsg) {
        const userKeywords = this.extractKeywords(userMsg);
        const aiKeywords = this.extractKeywords(aiMsg);
        
        const matchCount = userKeywords.filter(keyword => 
            aiKeywords.some(aiKeyword => aiKeyword.includes(keyword))
        ).length;

        return matchCount / (userKeywords.length || 1);
    }

    // 计算情感匹配分数
    calculateEmotionMatchScore(userMsg, aiMsg) {
        const userEmotion = this.analyzeEmotion(userMsg);
        const aiEmotion = this.analyzeEmotion(aiMsg);

        let score = 0;

        // 检查情绪类别的匹配
        if (userEmotion.category === 'negative' && aiEmotion.category === 'positive') {
            score += 0.3; // 积极回应消极情绪
        } else if (userEmotion.category === aiEmotion.category) {
            score += 0.2; // 情绪共鸣
        }

        // 检查情绪强度的适当性
        if (Math.abs(userEmotion.dimensions.valence - aiEmotion.dimensions.valence) < 0.3) {
            score += 0.2; // 情绪强度适中
        }

        return score;
    }

    // 计算主题连贯性分数
    calculateTopicCoherenceScore(userMsg, aiMsg) {
        const userTopics = this.extractTopics(userMsg);
        const aiTopics = this.extractTopics(aiMsg);

        const matchCount = userTopics.filter(topic => 
            aiTopics.some(aiTopic => aiTopic.includes(topic))
        ).length;

        return matchCount / (userTopics.length || 1);
    }

    // 提取主题
    extractTopics(text) {
        // 使用预定义的主题关键词列表
        const topicKeywords = {
            '情绪': ['感觉', '心情', '情绪', '感受'],
            '人际': ['关系', '家人', '朋友', '同事'],
            '工作': ['工作', '职业', '事业', '学习'],
            '生活': ['生活', '日常', '习惯', '作息'],
            '健康': ['身体', '健康', '睡眠', '饮食']
        };

        return Object.entries(topicKeywords).filter(([topic, keywords]) =>
            keywords.some(keyword => text.includes(keyword))
        ).map(([topic]) => topic);
    }

    // 计算消息频率
    calculateMessageFrequency(messages) {
        if (messages.length < 2) return 0.5;

        const timeGaps = [];
        for (let i = 1; i < messages.length; i++) {
            const gap = new Date(messages[i].timestamp) - new Date(messages[i-1].timestamp);
            timeGaps.push(gap);
        }

        const avgGap = timeGaps.reduce((a, b) => a + b, 0) / timeGaps.length;
        return Math.min(1, 1000 * 60 * 5 / avgGap); // 5分钟为标准间隔
    }

    // 计算消息质量
    calculateMessageQuality(messages) {
        let score = 0;

        messages.forEach(msg => {
            // 检查消息长度
            const length = msg.content.length;
            if (length > 10 && length < 500) score += 0.2;

            // 检查情感表达
            const emotion = this.analyzeEmotion(msg.content);
            if (emotion.category !== 'neutral') score += 0.2;

            // 检查具体细节
            if (this.containsSpecificDetails(msg.content)) score += 0.2;
        });

        return score / (messages.length || 1);
    }

    // 检查是否包含具体细节
    containsSpecificDetails(text) {
        const detailIndicators = [
            '具体', '例如', '比如', '当时', '那天',
            '上周', '昨天', '今天', '明天', '记得',
            '发生', '经历', '场景', '细节', '情况'
        ];

        return detailIndicators.some(indicator => text.includes(indicator));
    }

    // 计算情绪投入度
    calculateEmotionalInvestment(messages) {
        let score = 0;

        messages.forEach(msg => {
            const emotion = this.analyzeEmotion(msg.content);
            
            // 检查情绪强度
            if (emotion.intensity === 'high') score += 0.3;
            else if (emotion.intensity === 'moderate') score += 0.2;

            // 检查情绪表达的丰富性
            if (emotion.dimensions.valence !== 0) score += 0.2;
            if (emotion.dimensions.arousal !== 'moderate') score += 0.2;
        });

        return score / (messages.length || 1);
    }

    // 选择干预策略
    selectInterventionStrategy(emotionAnalysis, stageProgress, clientProfile) {
        // 获取当前状态评估
        const assessment = {
            emotion: emotionAnalysis,
            stage: this.currentStage,
            progress: stageProgress,
            dimensions: this.assessmentDimensions,
            profile: clientProfile || {}
        };

        // 匹配最适合的策略
        const matchedStrategies = this.matchStrategiesToNeeds(assessment);

        // 根据匹配结果选择最佳策略
        const selectedStrategy = this.selectBestStrategy(matchedStrategies, assessment);

        // 生成具体的干预计划
        return this.generateInterventionPlan(selectedStrategy, assessment);
    }

    // 匹配策略与需求
    matchStrategiesToNeeds(assessment) {
        const matchedStrategies = [];

        // 遍历所有策略
        Object.entries(this.interventionStrategies).forEach(([category, strategyGroup]) => {
            strategyGroup.techniques.forEach(technique => {
                const matchScore = this.calculateStrategyMatchScore(technique, assessment);
                if (matchScore > 0) {
                    matchedStrategies.push({
                        category,
                        technique,
                        matchScore
                    });
                }
            });
        });

        // 按匹配分数排序
        return matchedStrategies.sort((a, b) => b.matchScore - a.matchScore);
    }

    // 计算策略匹配分数
    calculateStrategyMatchScore(technique, assessment) {
        let score = 0;

        // 检查适用性
        technique.suitableFor.forEach(condition => {
            if (this.checkConditionMatch(condition, assessment)) {
                score += 0.3;
            }
        });

        // 检查禁忌
        if (technique.contraindications.some(condition => 
            this.checkConditionMatch(condition, assessment))) {
            return 0;
        }

        // 根据阶段适用性评分
        score += this.calculateStageCompatibility(technique, assessment.stage);

        // 根据情绪状态评分
        score += this.calculateEmotionalCompatibility(technique, assessment.emotion);

        // 根据进展评分
        score += this.calculateProgressCompatibility(technique, assessment.progress);

        return Math.min(1, score);
    }

    // 检查条件匹配
    checkConditionMatch(condition, assessment) {
        // 情绪相关条件
        if (['anxiety', 'depression', 'anger'].includes(condition)) {
            return assessment.emotion.subCategory === condition;
        }

        // 严重程度相关条件
        if (condition.startsWith('severe_')) {
            return assessment.dimensions.problemSeverity > 0.7;
        }

        // 动机相关条件
        if (['low_motivation', 'resistance'].includes(condition)) {
            return assessment.dimensions.clientMotivation < 0.4;
        }

        // 其他条件的匹配逻辑...
        return false;
    }

    // 计算阶段兼容性
    calculateStageCompatibility(technique, stage) {
        const stageCompatibility = {
            [CONFIG.COUNSELING_STAGES.INITIAL]: ['积极倾听', '情绪觉察'],
            [CONFIG.COUNSELING_STAGES.ASSESSMENT]: ['问题解决', '情绪觉察'],
            [CONFIG.COUNSELING_STAGES.GOAL_SETTING]: ['问题解决', '角色分析'],
            [CONFIG.COUNSELING_STAGES.INTERVENTION]: ['认知重构', '行为激活', '渐进式暴露'],
            [CONFIG.COUNSELING_STAGES.CLOSING]: ['资源链接', '预防复发']
        };

        return stageCompatibility[stage]?.includes(technique.name) ? 0.3 : 0;
    }

    // 计算情绪兼容性
    calculateEmotionalCompatibility(technique, emotion) {
        let score = 0;

        // 根据情绪类别评分
        if (emotion.category === 'negative') {
            if (['认知重构', '情绪调节', '积极倾听'].includes(technique.name)) {
                score += 0.2;
            }
        }

        // 根据情绪强度评分
        if (emotion.intensity === 'high') {
            if (['情绪调节', '积极倾听'].includes(technique.name)) {
                score += 0.2;
            }
        }

        // 根据情绪稳定性评分
        if (emotion.dimensions.stability === 'fluctuating') {
            if (['情绪调节', '认知重构'].includes(technique.name)) {
                score += 0.2;
            }
        }

        return score;
    }

    // 计算进展兼容性
    calculateProgressCompatibility(technique, progress) {
        let score = 0;

        // 根据进展速度评分
        if (progress.progressLevel < 0.3) {
            if (['行为激活', '问题解决'].includes(technique.name)) {
                score += 0.2;
            }
        }

        // 根据阻碍因素评分
        if (progress.blockingFactors > 0.5) {
            if (['问题解决', '认知重构'].includes(technique.name)) {
                score += 0.2;
            }
        }

        return score;
    }

    // 选择最佳策略
    selectBestStrategy(matchedStrategies, assessment) {
        if (matchedStrategies.length === 0) {
            return this.getDefaultStrategy(assessment);
        }

        // 选择得分最高的策略
        return matchedStrategies[0];
    }

    // 获取默认策略
    getDefaultStrategy(assessment) {
        return {
            category: 'supportive',
            technique: this.interventionStrategies.supportive.techniques[0],
            matchScore: 0.5
        };
    }

    // 生成干预计划
    generateInterventionPlan(strategy, assessment) {
        return {
            strategy: strategy,
            rationale: this.generateStrategyRationale(strategy, assessment),
            implementation: this.generateImplementationPlan(strategy, assessment),
            evaluation: this.generateEvaluationPlan(strategy, assessment)
        };
    }

    // 生成策略理由
    generateStrategyRationale(strategy, assessment) {
        return {
            mainReason: `选择${strategy.technique.name}的主要原因是其适用于当前的${strategy.technique.suitableFor.join('、')}等问题`,
            stageConsideration: `在${this.currentStage}阶段，该策略能够有效支持咨询目标的达成`,
            emotionalConsideration: `考虑到来访者当前的${assessment.emotion.category}情绪状态，该策略提供了合适的干预强度和方式`,
            safetyConsideration: `已评估相关禁忌症，确保策略的安全性和适用性`
        };
    }

    // 生成实施计划
    generateImplementationPlan(strategy, assessment) {
        return {
            steps: strategy.technique.steps,
            timeline: this.generateTimeline(strategy),
            adjustments: this.generateAdjustments(strategy, assessment),
            resources: this.identifyNeededResources(strategy)
        };
    }

    // 生成时间线
    generateTimeline(strategy) {
        return strategy.technique.steps.map((step, index) => ({
            step: step,
            estimatedDuration: '1-2次会谈',
            milestone: `完成${step}的标志是...`,
            nextStep: index < strategy.technique.steps.length - 1 ? 
                     strategy.technique.steps[index + 1] : '评估成效'
        }));
    }

    // 生成调整建议
    generateAdjustments(strategy, assessment) {
        return {
            intensity: this.adjustIntensity(strategy, assessment),
            pace: this.adjustPace(strategy, assessment),
            focus: this.adjustFocus(strategy, assessment)
        };
    }

    // 调整干预强度
    adjustIntensity(strategy, assessment) {
        if (assessment.dimensions.problemSeverity > 0.7) {
            return '建议降低干预强度，增加支持性元素';
        }
        if (assessment.dimensions.clientMotivation > 0.8) {
            return '可以适当增加干预强度和挑战性';
        }
        return '保持中等干预强度';
    }

    // 调整干预节奏
    adjustPace(strategy, assessment) {
        if (assessment.emotion.intensity === 'high') {
            return '放慢节奏，增加情绪调节的支持';
        }
        if (assessment.progress.progressLevel < 0.3) {
            return '适当放慢节奏，确保来访者能够跟上';
        }
        return '保持当前节奏';
    }

    // 调整干预重点
    adjustFocus(strategy, assessment) {
        const focuses = [];
        if (assessment.dimensions.therapeuticAlliance < 0.5) {
            focuses.push('加强咨询关系的建立');
        }
        if (assessment.dimensions.clientMotivation < 0.5) {
            focuses.push('增加动机强化的元素');
        }
        if (assessment.dimensions.riskLevel > 0.5) {
            focuses.push('加入风险管理的内容');
        }
        return focuses;
    }

    // 识别所需资源
    identifyNeededResources(strategy) {
        return {
            materials: ['工作表', '练习指导', '相关阅读材料'],
            support: ['社会支持系统', '专业转介资源'],
            skills: ['所需掌握的具体技能', '练习方法']
        };
    }

    // 生成评估计划
    generateEvaluationPlan(strategy, assessment) {
        return {
            indicators: this.generateEvaluationIndicators(strategy),
            methods: this.generateEvaluationMethods(strategy),
            timeline: this.generateEvaluationTimeline(strategy),
            adjustmentCriteria: this.generateAdjustmentCriteria(strategy)
        };
    }

    // 生成评估指标
    generateEvaluationIndicators(strategy) {
        return {
            primary: ['症状改善程度', '目标达成程度'],
            secondary: ['来访者满意度', '技能掌握程度'],
            process: ['执行情况', '参与度', '理解程度']
        };
    }

    // 生成评估方法
    generateEvaluationMethods(strategy) {
        return {
            subjective: ['来访者自我报告', '情绪评估'],
            objective: ['行为观察', '目标完成情况'],
            interactive: ['技能展示', '角色扮演']
        };
    }

    // 生成评估时间线
    generateEvaluationTimeline(strategy) {
        return {
            initial: '实施前基线评估',
            ongoing: '每次会谈后进展评估',
            final: '策略完成后总结评估'
        };
    }

    // 生成调整标准
    generateAdjustmentCriteria(strategy) {
        return {
            positive: ['目标达成度超过80%', '来访者报告显著改善'],
            negative: ['出现新的问题', '进展停滞超过2次会谈'],
            neutral: ['需要微调的迹象', '适应期的正常反应']
        };
    }

    // 计算干预效果
    calculateInterventionEffectiveness() {
        // 如果没有足够的历史记录，返回默认值
        if (!this.interventionEffects || this.interventionEffects.length < 2) {
            return 0.5;
        }

        // 获取最近的干预记录
        const recentEffects = this.interventionEffects.slice(-5);
        
        // 计算综合得分
        let score = 0;
        
        recentEffects.forEach(effect => {
            // 情绪改善得分
            const emotionalImprovement = effect.emotionalChange.dimensions.valence > 0 ? 0.2 : 0;
            
            // 会话质量得分
            const sessionQualityScore = effect.sessionQuality.interactionQuality * 0.3;
            
            // 维度改善得分
            const dimensionImprovement = (
                effect.dimensions.progressLevel +
                effect.dimensions.therapeuticAlliance +
                effect.dimensions.clientMotivation
            ) / 3 * 0.3;
            
            score += emotionalImprovement + sessionQualityScore + dimensionImprovement;
        });

        // 返回平均得分
        return score / recentEffects.length;
    }

    // 导出聊天记录功能
    exportChatHistory() {
        try {
            // 准备导出数据
            const exportData = {
                sessionInfo: {
                    timestamp: new Date().toISOString(),
                    duration: this.calculateSessionDuration(),
                    totalMessages: this.chatHistory.length
                },
                counselingStage: this.currentStage,
                assessmentDimensions: this.assessmentDimensions,
                chatHistory: this.chatHistory.map(record => ({
                    timestamp: record.timestamp,
                    role: record.role,
                    content: record.content,
                    emotion: record.emotionAnalysis
                }))
            };

            // 创建Blob对象
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            
            // 创建下载链接
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `chat-history-${new Date().toISOString().slice(0,10)}.json`;
            
            // 触发下载
            document.body.appendChild(a);
            a.click();
            
            // 清理
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            return true;
        } catch (error) {
            console.error('导出聊天记录失败:', error);
            return false;
        }
    }

    // 计算会话时长
    calculateSessionDuration() {
        if (this.chatHistory.length < 2) return '0分钟';
        
        const firstMessage = this.chatHistory[0];
        const lastMessage = this.chatHistory[this.chatHistory.length - 1];
        
        const duration = new Date(lastMessage.timestamp) - new Date(firstMessage.timestamp);
        const minutes = Math.floor(duration / (1000 * 60));
        
        if (minutes < 60) {
            return `${minutes}分钟`;
        } else {
            const hours = Math.floor(minutes / 60);
            const remainingMinutes = minutes % 60;
            return `${hours}小时${remainingMinutes}分钟`;
        }
    }
} 