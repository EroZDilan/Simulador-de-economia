// server/simulation-controls.js
const { QLearningBot, SimulationController, ActionLogger, ReputationSystem } = require('./advanced-agents');

class SimulationManager {
    constructor(gameState, io) {
        this.gameState = gameState;
        this.io = io;
        this.controller = new SimulationController(gameState, io);
        this.reputationSystem = new ReputationSystem();
        this.isAnalysisMode = false;
        this.analysisData = null;
        
        // Create advanced bots
        this.initializeAdvancedBots();
        
        // Setup control endpoints
        this.setupControlEndpoints();
    }

    initializeAdvancedBots() {
        console.log('🧠 Initializing Advanced Q-Learning Bots...');
        
        const advancedBotConfigs = [
            { name: 'AlphaBot', strategy: 'q_learning_aggressive' },
            { name: 'BetaBot', strategy: 'q_learning_conservative' },
            { name: 'GammaBot', strategy: 'q_learning_adaptive' },
            { name: 'DeltaBot', strategy: 'q_learning_contrarian' }
        ];
        
        advancedBotConfigs.forEach(config => {
            const bot = this.controller.addQLearningBot(config.name, config.strategy);
            
            // Set up reputation tracking
            this.reputationSystem.updateBehaviorHistory(bot.id, 'initialized', {
                cycle: this.gameState.economicCycle,
                marketTrend: 'neutral'
            });
        });
        
        console.log(`✅ ${advancedBotConfigs.length} Advanced Q-Learning bots initialized`);
    }

    setupControlEndpoints() {
        // Add WebSocket listeners for simulation control
        this.io.on('connection', (socket) => {
            
            // Pause simulation
            socket.on('pause_simulation', () => {
                console.log('📊 Pausing simulation for analysis...');
                const analysis = this.controller.pauseSimulation();
                this.isAnalysisMode = true;
                this.analysisData = analysis;
                
                socket.emit('simulation_analysis', {
                    type: 'pause_analysis',
                    data: analysis,
                    timestamp: Date.now()
                });
            });

            // Resume simulation
            socket.on('resume_simulation', () => {
                console.log('▶️ Resuming simulation...');
                this.controller.resumeSimulation();
                this.isAnalysisMode = false;
                
                socket.emit('simulation_control', {
                    type: 'resumed',
                    message: 'Simulation resumed successfully'
                });
            });

            // Stop simulation
            socket.on('stop_simulation', () => {
                console.log('⏹️ Stopping simulation...');
                const finalAnalysis = this.controller.stopSimulation();
                
                socket.emit('simulation_analysis', {
                    type: 'final_analysis',
                    data: finalAnalysis,
                    timestamp: Date.now()
                });
            });

            // Get bot decision history
            socket.on('get_bot_decisions', (data) => {
                const { botId, count } = data;
                const decisions = this.controller.getBotDecisionLog(botId, count || 50);
                
                socket.emit('bot_decision_history', {
                    botId: botId,
                    decisions: decisions,
                    timestamp: Date.now()
                });
            });

            // Get detailed bot analysis
            socket.on('analyze_bot', (data) => {
                const { botId } = data;
                const bot = this.controller.qLearningBots.get(botId);
                
                if (bot) {
                    const analysis = {
                        botInfo: bot.explainStrategy(),
                        performance: this.controller.calculateBotPerformance(bot),
                        recentDecisions: this.controller.getRecentDecisions(botId, 20),
                        qTableSample: this.getQTableSample(bot),
                        learningCurve: this.getLearningCurve(bot),
                        reputation: this.reputationSystem.calculateReputation(
                            botId, 
                            bot.transactions, 
                            this.calculateMarketImpact(bot)
                        )
                    };
                    
                    socket.emit('detailed_bot_analysis', {
                        botId: botId,
                        analysis: analysis,
                        timestamp: Date.now()
                    });
                } else {
                    socket.emit('error', { message: 'Bot not found' });
                }
            });

            // Export simulation data
            socket.on('export_simulation', () => {
                const exportData = this.controller.exportSimulationData();
                
                socket.emit('simulation_export', {
                    data: exportData,
                    filename: `simulation_${Date.now()}.json`,
                    timestamp: Date.now()
                });
            });

            // Get real-time bot thinking process
            socket.on('watch_bot_thinking', (data) => {
                const { botId, enable } = data;
                
                if (enable) {
                    this.setupBotWatching(botId, socket);
                } else {
                    this.stopBotWatching(botId, socket);
                }
            });

            // Get reputation report
            socket.on('get_reputation_report', () => {
                const report = this.reputationSystem.getReputationReport();
                
                socket.emit('reputation_report', {
                    report: report,
                    timestamp: Date.now()
                });
            });
        });
    }

    getQTableSample(bot, sampleSize = 10) {
        const qTableEntries = Array.from(bot.qTable.entries());
        const sample = qTableEntries
            .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])) // Sort by Q-value magnitude
            .slice(0, sampleSize)
            .map(([stateAction, qValue]) => {
                const [state, action] = stateAction.split('#');
                return {
                    state: this.parseState(state),
                    action: this.parseAction(action),
                    qValue: qValue.toFixed(4),
                    confidence: this.calculateConfidence(qValue)
                };
            });
        
        return {
            totalEntries: qTableEntries.length,
            topEntries: sample,
            averageQValue: qTableEntries.length > 0 ? 
                (qTableEntries.reduce((sum, [_, val]) => sum + val, 0) / qTableEntries.length).toFixed(4) : 0
        };
    }

    parseState(stateString) {
        const parts = stateString.split('|');
        const parsed = {};
        
        parts.forEach(part => {
            const [key, value] = part.split(':');
            parsed[key] = value;
        });
        
        return parsed;
    }

    parseAction(actionString) {
        const [type, resource, quantity] = actionString.split(':');
        return { type, resource, quantity: parseInt(quantity) || 0 };
    }

    calculateConfidence(qValue) {
        // Simple confidence calculation based on Q-value magnitude
        const magnitude = Math.abs(qValue);
        if (magnitude > 5) return 'very_high';
        if (magnitude > 2) return 'high';
        if (magnitude > 1) return 'medium';
        if (magnitude > 0.1) return 'low';
        return 'very_low';
    }

    getLearningCurve(bot) {
        const transactions = bot.transactions;
        if (transactions.length < 10) return { insufficient_data: true };
        
        const windowSize = Math.max(5, Math.floor(transactions.length / 10));
        const windows = [];
        
        for (let i = 0; i < transactions.length; i += windowSize) {
            const window = transactions.slice(i, i + windowSize);
            const avgProfit = window.reduce((sum, t) => sum + (t.profit || 0), 0) / window.length;
            const successRate = window.filter(t => (t.profit || 0) > 0).length / window.length;
            
            windows.push({
                period: Math.floor(i / windowSize) + 1,
                avgProfit: avgProfit.toFixed(2),
                successRate: (successRate * 100).toFixed(1) + '%',
                transactions: window.length
            });
        }
        
        // Calculate trend
        const profits = windows.map(w => parseFloat(w.avgProfit));
        const trend = profits.length > 1 ? 
            (profits[profits.length - 1] > profits[0] ? 'improving' : 'declining') : 'stable';
        
        return {
            windows: windows,
            trend: trend,
            totalPeriods: windows.length
        };
    }

    calculateMarketImpact(bot) {
        // Calculate how much the bot affects market prices
        const transactions = bot.transactions;
        if (transactions.length === 0) return { impact: 'minimal' };
        
        let totalImpact = 0;
        let coordinatedActions = 0;
        let priceInflation = 0;
        
        transactions.forEach((transaction, index) => {
            // Calculate individual transaction impact
            const quantity = transaction.quantity;
            const resource = transaction.resource;
            
            // Estimate impact based on quantity relative to market size
            const marketSize = 1000; // Approximate market size
            const impact = quantity / marketSize;
            totalImpact += impact;
            
            // Check for coordinated actions (simplified)
            if (index > 0) {
                const prevTransaction = transactions[index - 1];
                const timeDiff = transaction.timestamp - prevTransaction.timestamp;
                
                if (timeDiff < 5000 && transaction.type === prevTransaction.type) {
                    coordinatedActions++;
                }
            }
        });
        
        return {
            totalImpact: totalImpact.toFixed(4),
            averageImpact: (totalImpact / transactions.length).toFixed(4),
            coordinatedActions: coordinatedActions / transactions.length,
            priceInflation: priceInflation,
            volatilityContribution: Math.min(1, totalImpact * 0.1)
        };
    }

    setupBotWatching(botId, socket) {
        const bot = this.controller.qLearningBots.get(botId);
        if (!bot) return;
        
        // Override bot's decision method to broadcast thinking process
        const originalMakeDecision = bot.makeDecision.bind(bot);
        
        bot.makeDecision = (marketState) => {
            const thinkingProcess = {
                botId: botId,
                timestamp: Date.now(),
                marketState: {
                    cycle: marketState.economicCycle,
                    tick: marketState.tick,
                    prices: Object.fromEntries(
                        Object.entries(marketState.market).map(([resource, data]) => [resource, data.price])
                    )
                },
                internalState: {
                    money: bot.money,
                    inventory: bot.inventory,
                    epsilon: bot.epsilon,
                    lastReward: bot.lastReward
                },
                decisionProcess: []
            };
            
            // Capture state encoding
            const encodedState = bot.encodeState(marketState);
            thinkingProcess.decisionProcess.push({
                step: 'state_encoding',
                result: encodedState,
                explanation: 'Converting market conditions into discrete state representation'
            });
            
            // Capture possible actions
            const possibleActions = bot.getPossibleActions(marketState);
            thinkingProcess.decisionProcess.push({
                step: 'action_generation',
                result: possibleActions,
                explanation: `Generated ${possibleActions.length} possible actions based on current resources and money`
            });
            
            // Capture Q-value evaluation
            const qValues = possibleActions.map(action => ({
                action: action,
                qValue: bot.getQValue(encodedState, action)
            }));
            thinkingProcess.decisionProcess.push({
                step: 'q_value_evaluation',
                result: qValues,
                explanation: 'Evaluating learned Q-values for each possible action'
            });
            
            // Capture exploration vs exploitation decision
            const isExploring = Math.random() < bot.epsilon;
            thinkingProcess.decisionProcess.push({
                step: 'exploration_decision',
                result: {
                    isExploring: isExploring,
                    epsilon: bot.epsilon,
                    probability: bot.epsilon
                },
                explanation: isExploring ? 
                    'Choosing random action for exploration' : 
                    'Choosing best known action for exploitation'
            });
            
            // Make the actual decision
            const decision = originalMakeDecision(marketState);
            
            thinkingProcess.decisionProcess.push({
                step: 'final_decision',
                result: decision,
                explanation: `Selected action: ${decision.action.type} ${decision.action.quantity} ${decision.action.resource}`
            });
            
            // Broadcast thinking process
            socket.emit('bot_thinking_process', thinkingProcess);
            
            return decision;
        };
        
        console.log(`👁️ Started watching bot ${botId} thinking process`);
    }

    stopBotWatching(botId, socket) {
        const bot = this.controller.qLearningBots.get(botId);
        if (!bot) return;
        
        // Restore original decision method (this is simplified)
        // In practice, you'd want to store the original method
        console.log(`👁️ Stopped watching bot ${botId} thinking process`);
    }

    // Run advanced bots (integrates with existing tick system)
    runAdvancedBots() {
        if (!this.isAnalysisMode) {
            this.controller.runQLearningBots();
            
            // Update reputation system
            this.controller.qLearningBots.forEach((bot, botId) => {
                const marketImpact = this.calculateMarketImpact(bot);
                const reputation = this.reputationSystem.calculateReputation(
                    botId,
                    bot.transactions,
                    marketImpact
                );
                
                // Update behavior history
                if (bot.lastAction) {
                    this.reputationSystem.updateBehaviorHistory(botId, bot.lastAction.type, {
                        cycle: this.gameState.economicCycle,
                        marketTrend: this.getCurrentMarketTrend()
                    });
                }
            });
        }
    }

    getCurrentMarketTrend() {
        // Simplified market trend calculation
        const basePrices = { agua: 10, comida: 15, energia: 20, materiales: 25 };
        let totalChange = 0;
        
        Object.entries(basePrices).forEach(([resource, basePrice]) => {
            const currentPrice = this.gameState.market[resource]?.price || basePrice;
            totalChange += (currentPrice - basePrice) / basePrice;
        });
        
        const avgChange = totalChange / Object.keys(basePrices).length;
        
        if (avgChange > 0.1) return 'bullish';
        if (avgChange < -0.1) return 'bearish';
        return 'neutral';
    }

    // Get current simulation status
    getSimulationStatus() {
        return {
            isRunning: this.controller.isRunning,
            isPaused: this.controller.isPaused,
            isAnalysisMode: this.isAnalysisMode,
            tickCount: this.controller.tickCount,
            totalBots: this.controller.qLearningBots.size,
            qLearningBots: Array.from(this.controller.qLearningBots.values()).map(bot => ({
                id: bot.id,
                name: bot.name,
                strategy: bot.strategy,
                netWorth: bot.getNetWorth(this.gameState),
                epsilon: bot.epsilon,
                qTableSize: bot.qTable.size,
                totalTransactions: bot.transactions.length
            })),
            reputationSummary: this.reputationSystem.getReputationReport()
        };
    }

    // Generate comprehensive bot comparison
    generateBotComparison() {
        const comparison = {
            timestamp: Date.now(),
            bots: {},
            rankings: {
                byPerformance: [],
                byLearningSpeed: [],
                byReputation: [],
                byAdaptability: []
            },
            insights: []
        };

        // Analyze each bot
        this.controller.qLearningBots.forEach((bot, botId) => {
            const performance = this.controller.calculateBotPerformance(bot);
            const reputation = this.reputationSystem.calculateReputation(
                botId,
                bot.transactions,
                this.calculateMarketImpact(bot)
            );
            const learningCurve = this.getLearningCurve(bot);

            comparison.bots[botId] = {
                name: bot.name,
                strategy: bot.strategy,
                performance: performance,
                reputation: reputation,
                learningProgress: {
                    qTableSize: bot.qTable.size,
                    epsilon: bot.epsilon,
                    learningEpisodes: bot.statistics.learningEpisodes,
                    explorationRate: bot.statistics.explorationActions / 
                        (bot.statistics.explorationActions + bot.statistics.exploitationActions)
                },
                adaptability: this.calculateAdaptability(bot),
                specializations: this.identifySpecializations(bot)
            };
        });

        // Generate rankings
        comparison.rankings.byPerformance = Object.entries(comparison.bots)
            .sort((a, b) => parseFloat(b[1].performance.performancePercent) - parseFloat(a[1].performance.performancePercent))
            .map(([id, bot]) => ({ id, name: bot.name, value: bot.performance.performancePercent }));

        comparison.rankings.byReputation = Object.entries(comparison.bots)
            .sort((a, b) => b[1].reputation.score - a[1].reputation.score)
            .map(([id, bot]) => ({ id, name: bot.name, value: bot.reputation.score }));

        // Generate insights
        comparison.insights = this.generateComparisonInsights(comparison.bots);

        return comparison;
    }

    calculateAdaptability(bot) {
        // Measure how well the bot adapts to changing market conditions
        const transactions = bot.transactions;
        if (transactions.length < 20) return { score: 0, reason: 'insufficient_data' };

        // Look at performance across different market cycles
        const cyclePerformance = {};
        
        transactions.forEach(transaction => {
            // This is simplified - in practice you'd track the cycle when each transaction occurred
            const cycle = 'expansion'; // Placeholder
            if (!cyclePerformance[cycle]) {
                cyclePerformance[cycle] = { profits: [], count: 0 };
            }
            cyclePerformance[cycle].profits.push(transaction.profit || 0);
            cyclePerformance[cycle].count++;
        });

        // Calculate consistency across cycles
        const cycleAverages = Object.values(cyclePerformance).map(cycle => {
            return cycle.profits.reduce((sum, profit) => sum + profit, 0) / cycle.count;
        });

        const variance = cycleAverages.length > 1 ? 
            cycleAverages.reduce((sum, avg) => {
                const mean = cycleAverages.reduce((a, b) => a + b, 0) / cycleAverages.length;
                return sum + Math.pow(avg - mean, 2);
            }, 0) / cycleAverages.length : 0;

        // Lower variance = higher adaptability
        const adaptabilityScore = Math.max(0, 1 - variance);

        return {
            score: adaptabilityScore,
            cyclePerformance: cyclePerformance,
            consistency: 1 - variance
        };
    }

    identifySpecializations(bot) {
        const transactions = bot.transactions;
        if (transactions.length < 10) return [];

        const resourceStats = {};
        const actionStats = { buy: 0, sell: 0 };

        transactions.forEach(transaction => {
            const resource = transaction.resource;
            if (!resourceStats[resource]) {
                resourceStats[resource] = { count: 0, totalProfit: 0 };
            }
            resourceStats[resource].count++;
            resourceStats[resource].totalProfit += transaction.profit || 0;
            actionStats[transaction.type]++;
        });

        const specializations = [];

        // Check for resource specialization
        const totalTransactions = transactions.length;
        Object.entries(resourceStats).forEach(([resource, stats]) => {
            const concentration = stats.count / totalTransactions;
            if (concentration > 0.4) {
                specializations.push({
                    type: 'resource_specialist',
                    resource: resource,
                    concentration: (concentration * 100).toFixed(1) + '%',
                    avgProfit: (stats.totalProfit / stats.count).toFixed(2)
                });
            }
        });

        // Check for action bias
        const buyRate = actionStats.buy / totalTransactions;
        if (buyRate > 0.7) {
            specializations.push({
                type: 'accumulator',
                description: 'Prefers buying over selling',
                rate: (buyRate * 100).toFixed(1) + '%'
            });
        } else if (buyRate < 0.3) {
            specializations.push({
                type: 'distributor',
                description: 'Prefers selling over buying',
                rate: ((1 - buyRate) * 100).toFixed(1) + '%'
            });
        }

        return specializations;
    }

    generateComparisonInsights(bots) {
        const insights = [];
        const botEntries = Object.entries(bots);

        // Performance insights
        const performances = botEntries.map(([id, bot]) => 
            parseFloat(bot.performance.performancePercent)
        );
        const avgPerformance = performances.reduce((a, b) => a + b, 0) / performances.length;
        const bestBot = botEntries.find(([id, bot]) => 
            parseFloat(bot.performance.performancePercent) === Math.max(...performances)
        );

        insights.push({
            type: 'performance',
            title: 'Performance Leader',
            description: `${bestBot[1].name} leads with ${bestBot[1].performance.performancePercent} return`,
            details: `Average performance across all bots: ${avgPerformance.toFixed(2)}%`
        });

        // Learning insights
        const learningRates = botEntries.map(([id, bot]) => bot.learningProgress.qTableSize);
        const fastestLearner = botEntries.find(([id, bot]) => 
            bot.learningProgress.qTableSize === Math.max(...learningRates)
        );

        insights.push({
            type: 'learning',
            title: 'Fastest Learner',
            description: `${fastestLearner[1].name} has explored ${fastestLearner[1].learningProgress.qTableSize} state-action pairs`,
            details: `Current exploration rate: ${(fastestLearner[1].learningProgress.explorationRate * 100).toFixed(1)}%`
        });

        // Strategy insights
        const strategies = {};
        botEntries.forEach(([id, bot]) => {
            if (!strategies[bot.strategy]) strategies[bot.strategy] = [];
            strategies[bot.strategy].push(bot);
        });

        Object.entries(strategies).forEach(([strategy, strategyBots]) => {
            if (strategyBots.length > 1) {
                const avgPerf = strategyBots.reduce((sum, bot) => 
                    sum + parseFloat(bot.performance.performancePercent), 0
                ) / strategyBots.length;

                insights.push({
                    type: 'strategy',
                    title: `${strategy} Strategy Analysis`,
                    description: `${strategyBots.length} bots using this strategy`,
                    details: `Average performance: ${avgPerf.toFixed(2)}%`
                });
            }
        });

        return insights;
    }
}

module.exports = { SimulationManager };