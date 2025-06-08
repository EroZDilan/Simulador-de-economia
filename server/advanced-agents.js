// server/advanced-agents.js - Versión completa con sistema de pensamiento
const { v4: uuidv4 } = require('uuid');

// Q-Learning Bot con inteligencia artificial avanzada
class QLearningBot {
    constructor(name, strategy = 'q_learning_balanced') {
        this.id = `qbot_${uuidv4()}`;
        this.name = name;
        this.money = 1000;
        this.inventory = {
            agua: 50,
            comida: 30,
            energia: 20,
            materiales: 10
        };
        this.transactions = [];
        this.isBot = true;
        this.strategy = strategy;
        
        // Q-Learning parameters
        this.qTable = new Map(); // State-Action -> Q-value
        this.alpha = 0.1; // Learning rate
        this.gamma = 0.95; // Discount factor
        this.epsilon = 0.3; // Exploration rate (starts high)
        this.epsilonDecay = 0.995; // Decay rate for exploration
        this.epsilonMin = 0.05; // Minimum exploration
        
        // State space configuration
        this.stateSpace = {
            priceLevel: ['very_low', 'low', 'medium', 'high', 'very_high'],
            supplyLevel: ['very_low', 'low', 'medium', 'high', 'very_high'],
            demandLevel: ['very_low', 'low', 'medium', 'high', 'very_high'],
            economicCycle: ['expansion', 'peak', 'contraction', 'trough'],
            inventoryLevel: ['empty', 'low', 'medium', 'high', 'full'],
            moneyLevel: ['broke', 'low', 'medium', 'high', 'rich']
        };
        
        // Action space
        this.actionSpace = this.generateActionSpace();
        
        // Memory and learning
        this.experienceBuffer = [];
        this.maxExperienceSize = 10000;
        this.lastState = null;
        this.lastAction = null;
        this.lastReward = 0;
        
        // Performance tracking
        this.statistics = {
            totalReward: 0,
            learningEpisodes: 0,
            explorationActions: 0,
            exploitationActions: 0,
            avgReward: 0,
            bestReward: -Infinity,
            worstReward: Infinity,
            recentPerformance: []
        };
        
        // Strategy-specific parameters
        this.initializeStrategy();
        
        // Personality traits for decision making
        this.personality = this.generatePersonality();

        // 🔧 NUEVO: Propiedades para sistema de pensamiento avanzado
        this.lastThoughtProcess = null;
        this.isBeingWatched = true;
        this.decisionHistory = [];
        this.maxDecisionHistory = 100;
        
        console.log(`🧠 Q-Learning Bot initialized: ${this.name} (${this.strategy})`);
    }

    generateActionSpace() {
        const actions = [];
        const resources = ['agua', 'comida', 'energia', 'materiales'];
        const quantities = [1, 5, 10, 15, 20, 25];
        
        // Buy actions
        resources.forEach(resource => {
            quantities.forEach(quantity => {
                actions.push({
                    type: 'buy',
                    resource: resource,
                    quantity: quantity
                });
            });
        });
        
        // Sell actions
        resources.forEach(resource => {
            quantities.forEach(quantity => {
                actions.push({
                    type: 'sell',
                    resource: resource,
                    quantity: quantity
                });
            });
        });
        
        // Hold action
        actions.push({ type: 'hold', resource: null, quantity: 0 });
        
        return actions;
    }

    initializeStrategy() {
        const strategyConfigs = {
            q_learning_aggressive: {
                alpha: 0.15,
                gamma: 0.9,
                epsilon: 0.4,
                rewardModifier: 1.2,
                riskTolerance: 0.8
            },
            q_learning_conservative: {
                alpha: 0.05,
                gamma: 0.98,
                epsilon: 0.2,
                rewardModifier: 0.8,
                riskTolerance: 0.3
            },
            q_learning_adaptive: {
                alpha: 0.1,
                gamma: 0.95,
                epsilon: 0.3,
                rewardModifier: 1.0,
                riskTolerance: 0.5
            },
            q_learning_contrarian: {
                alpha: 0.08,
                gamma: 0.92,
                epsilon: 0.25,
                rewardModifier: 0.9,
                riskTolerance: 0.4
            }
        };
        
        const config = strategyConfigs[this.strategy] || strategyConfigs.q_learning_adaptive;
        Object.assign(this, config);
    }

    generatePersonality() {
        return {
            riskAversion: Math.random() * 0.5 + 0.25,
            patternRecognition: Math.random() * 0.8 + 0.2,
            adaptability: Math.random() * 0.7 + 0.3,
            greed: Math.random() * 0.6 + 0.2,
            patience: Math.random() * 0.8 + 0.1,
            confidence: Math.random() * 0.5 + 0.5
        };
    }

    // Encode market state into discrete representation
    encodeState(marketState) {
        const state = {};
        const resources = ['agua', 'comida', 'energia', 'materiales'];
        
        // Encode each resource's market conditions
        resources.forEach(resource => {
            const market = marketState.market[resource];
            const basePrices = { agua: 10, comida: 15, energia: 20, materiales: 25 };
            const basePrice = basePrices[resource];
            
            // Price level
            const priceRatio = market.price / basePrice;
            let priceLevel;
            if (priceRatio < 0.7) priceLevel = 'very_low';
            else if (priceRatio < 0.9) priceLevel = 'low';
            else if (priceRatio < 1.1) priceLevel = 'medium';
            else if (priceRatio < 1.3) priceLevel = 'high';
            else priceLevel = 'very_high';
            
            // Supply level
            let supplyLevel;
            if (market.supply < 200) supplyLevel = 'very_low';
            else if (market.supply < 500) supplyLevel = 'low';
            else if (market.supply < 1000) supplyLevel = 'medium';
            else if (market.supply < 2000) supplyLevel = 'high';
            else supplyLevel = 'very_high';
            
            // Demand level
            let demandLevel;
            if (market.demand < 200) demandLevel = 'very_low';
            else if (market.demand < 500) demandLevel = 'low';
            else if (market.demand < 1000) demandLevel = 'medium';
            else if (market.demand < 2000) demandLevel = 'high';
            else demandLevel = 'very_high';
            
            state[`${resource}_price`] = priceLevel;
            state[`${resource}_supply`] = supplyLevel;
            state[`${resource}_demand`] = demandLevel;
            
            // Inventory level for this resource
            const inventoryAmount = this.inventory[resource];
            let inventoryLevel;
            if (inventoryAmount <= 0) inventoryLevel = 'empty';
            else if (inventoryAmount <= 10) inventoryLevel = 'low';
            else if (inventoryAmount <= 30) inventoryLevel = 'medium';
            else if (inventoryAmount <= 60) inventoryLevel = 'high';
            else inventoryLevel = 'full';
            
            state[`${resource}_inventory`] = inventoryLevel;
        });
        
        // Economic cycle
        state.cycle = marketState.economicCycle || 'expansion';
        
        // Money level
        let moneyLevel;
        if (this.money < 100) moneyLevel = 'broke';
        else if (this.money < 500) moneyLevel = 'low';
        else if (this.money < 1500) moneyLevel = 'medium';
        else if (this.money < 3000) moneyLevel = 'high';
        else moneyLevel = 'rich';
        
        state.money = moneyLevel;
        
        return this.stateToString(state);
    }

    stateToString(state) {
        return Object.entries(state)
            .sort()
            .map(([key, value]) => `${key}:${value}`)
            .join('|');
    }

    actionToString(action) {
        return `${action.type}:${action.resource}:${action.quantity}`;
    }

    // Get Q-value for state-action pair
    getQValue(state, action) {
        const key = `${state}#${this.actionToString(action)}`;
        return this.qTable.get(key) || 0;
    }

    // Set Q-value for state-action pair
    setQValue(state, action, value) {
        const key = `${state}#${this.actionToString(action)}`;
        this.qTable.set(key, value);
    }

    // Get possible actions given current state
    getPossibleActions(marketState) {
        const possibleActions = [];
        
        this.actionSpace.forEach(action => {
            if (this.isActionValid(action, marketState)) {
                possibleActions.push(action);
            }
        });
        
        // Always include hold action
        if (!possibleActions.find(a => a.type === 'hold')) {
            possibleActions.push({ type: 'hold', resource: null, quantity: 0 });
        }
        
        return possibleActions;
    }

    isActionValid(action, marketState) {
        if (action.type === 'hold') return true;
        
        if (action.type === 'buy') {
            const market = marketState.market[action.resource];
            const cost = market.price * action.quantity;
            return this.money >= cost && market.supply >= action.quantity;
        } else if (action.type === 'sell') {
            return this.inventory[action.resource] >= action.quantity;
        }
        
        return false;
    }

    // Epsilon-greedy action selection
    selectAction(state, possibleActions) {
        // Exploration vs Exploitation
        if (Math.random() < this.epsilon) {
            // Exploration: random action
            this.statistics.explorationActions++;
            const randomIndex = Math.floor(Math.random() * possibleActions.length);
            return possibleActions[randomIndex];
        } else {
            // Exploitation: best known action
            this.statistics.exploitationActions++;
            let bestAction = possibleActions[0];
            let bestQValue = this.getQValue(state, bestAction);
            
            possibleActions.forEach(action => {
                const qValue = this.getQValue(state, action);
                if (qValue > bestQValue) {
                    bestQValue = qValue;
                    bestAction = action;
                }
            });
            
            return bestAction;
        }
    }

    // 🔧 NUEVO: Make decision with advanced thinking system
    makeDecisionWithThinking(marketState, io = null) {
        const thinkingProcess = {
            timestamp: Date.now(),
            botId: this.id,
            botName: this.name,
            decisionProcess: []
        };
        
        try {
            // Paso 1: Analizar estado actual
            thinkingProcess.decisionProcess.push({
                step: 'analyze_current_state',
                explanation: 'Analizando estado actual del bot y mercado',
                result: {
                    money: this.money,
                    inventory: { ...this.inventory },
                    exploration_rate: (this.epsilon * 100).toFixed(1) + '%',
                    q_table_size: this.qTable.size
                }
            });
            
            // Paso 2: Codificar estado del mercado
            const encodedState = this.encodeState(marketState);
            thinkingProcess.decisionProcess.push({
                step: 'encode_market_state',
                explanation: 'Convirtiendo condiciones del mercado a representación discreta',
                result: {
                    encoded_state: encodedState.substring(0, 80) + '...',
                    market_cycle: marketState.economicCycle,
                    market_prices: Object.fromEntries(
                        Object.entries(marketState.market).map(([r, data]) => [r, data.price])
                    )
                }
            });
            
            // Paso 3: Obtener acciones posibles
            const possibleActions = this.getPossibleActions(marketState);
            thinkingProcess.decisionProcess.push({
                step: 'generate_possible_actions',
                explanation: `Generando ${possibleActions.length} acciones posibles`,
                result: {
                    total_actions: possibleActions.length,
                    sample_actions: possibleActions.slice(0, 3).map(a => ({
                        type: a.type,
                        resource: a.resource,
                        quantity: a.quantity
                    }))
                }
            });
            
            // Paso 4: Evaluar Q-values
            const qValues = possibleActions.map(action => ({
                action: action,
                qValue: this.getQValue(encodedState, action)
            })).sort((a, b) => b.qValue - a.qValue);
            
            thinkingProcess.decisionProcess.push({
                step: 'evaluate_q_values',
                explanation: 'Evaluando Q-values aprendidos para cada acción',
                result: {
                    best_q_value: qValues[0] ? qValues[0].qValue.toFixed(4) : '0',
                    worst_q_value: qValues[qValues.length - 1] ? qValues[qValues.length - 1].qValue.toFixed(4) : '0',
                    top_actions: qValues.slice(0, 3).map(qv => ({
                        action: `${qv.action.type} ${qv.action.quantity} ${qv.action.resource}`,
                        q_value: qv.qValue.toFixed(4)
                    }))
                }
            });
            
            // Paso 5: Decisión de exploración vs explotación
            const isExploring = Math.random() < this.epsilon;
            thinkingProcess.decisionProcess.push({
                step: 'exploration_decision',
                explanation: isExploring ? 
                    'Eligiendo acción aleatoria para exploración' : 
                    'Eligiendo mejor acción conocida (explotación)',
                result: {
                    is_exploring: isExploring,
                    epsilon: (this.epsilon * 100).toFixed(2) + '%',
                    decision_type: isExploring ? 'exploration' : 'exploitation'
                }
            });
            
            // Paso 6: Selección final de acción
            const selectedAction = this.selectAction(encodedState, possibleActions);
            const confidence = this.calculateActionConfidence(encodedState, selectedAction);
            const reasoning = this.generateReasoning(encodedState, selectedAction, possibleActions);
            
            thinkingProcess.decisionProcess.push({
                step: 'final_decision',
                explanation: `Acción seleccionada: ${selectedAction.type} ${selectedAction.quantity} ${selectedAction.resource}`,
                result: {
                    selected_action: selectedAction,
                    confidence: (confidence * 100).toFixed(1) + '%',
                    reasoning: reasoning
                }
            });
            
            // Guardar proceso de pensamiento
            this.lastThoughtProcess = thinkingProcess;
            
            // Agregar a historial de decisiones
            this.addToDecisionHistory({
                timestamp: Date.now(),
                action: selectedAction,
                confidence: confidence,
                reasoning: reasoning,
                qValue: this.getQValue(encodedState, selectedAction),
                isExploration: isExploring
            });
            
            // Emitir si está siendo observado
            if (this.isBeingWatched && io) {
                io.emit('bot_thinking_process', thinkingProcess);
            }
            
            // Preparar para el siguiente aprendizaje
            this.lastState = encodedState;
            this.lastAction = selectedAction;
            
            return {
                action: selectedAction,
                confidence: confidence,
                reasoning: reasoning
            };
            
        } catch (error) {
            console.error(`❌ Error en pensamiento de ${this.name}:`, error);
            
            thinkingProcess.decisionProcess.push({
                step: 'error',
                explanation: 'Error en el proceso de decisión',
                result: { error: error.message }
            });
            
            this.lastThoughtProcess = thinkingProcess;
            
            // Decisión por defecto en caso de error
            const holdAction = { type: 'hold', resource: null, quantity: 0 };
            return {
                action: holdAction,
                confidence: 0,
                reasoning: 'Error en proceso de decisión: ' + error.message
            };
        }
    }

    // Make decision using Q-Learning (método principal)
    
makeDecision(marketState, io = null) {
    // Aprender de experiencia previa
    if (this.lastState && this.lastAction) {
        this.learn(this.lastState, this.lastAction, this.lastReward, this.encodeState(marketState));
    }
    
    // Si está siendo observado, usar el sistema de pensamiento avanzado
    if (this.isBeingWatched && io) {
        const decision = this.makeDecisionWithThinking(marketState, io);
        this.epsilon = Math.max(this.epsilonMin, this.epsilon * this.epsilonDecay);
        return decision;
    }
    
    // Proceso normal sin observación
    const encodedState = this.encodeState(marketState);
    const possibleActions = this.getPossibleActions(marketState);
    const selectedAction = this.selectAction(encodedState, possibleActions);
    
    this.lastState = encodedState;
    this.lastAction = selectedAction;
    
    // Decay de exploración
    this.epsilon = Math.max(this.epsilonMin, this.epsilon * this.epsilonDecay);
    
    return {
        action: selectedAction,
        confidence: this.calculateActionConfidence(encodedState, selectedAction),
        reasoning: this.generateReasoning(encodedState, selectedAction, possibleActions)
    };
}

    // Q-Learning update rule
    learn(state, action, reward, nextState) {
        const currentQ = this.getQValue(state, action);
        
        // Find maximum Q-value for next state
        const nextPossibleActions = this.actionSpace.filter(a => 
            a.type === 'hold' || Math.random() < 0.3 // Simplified for performance
        );
        
        let maxNextQ = 0;
        nextPossibleActions.forEach(nextAction => {
            const nextQ = this.getQValue(nextState, nextAction);
            maxNextQ = Math.max(maxNextQ, nextQ);
        });
        
        // Q-Learning update: Q(s,a) = Q(s,a) + α[r + γ*max(Q(s',a')) - Q(s,a)]
        const newQ = currentQ + this.alpha * (reward + this.gamma * maxNextQ - currentQ);
        this.setQValue(state, action, newQ);
        
        // Update statistics
        this.statistics.totalReward += reward;
        this.statistics.learningEpisodes++;
        this.statistics.avgReward = this.statistics.totalReward / this.statistics.learningEpisodes;
        this.statistics.bestReward = Math.max(this.statistics.bestReward, reward);
        this.statistics.worstReward = Math.min(this.statistics.worstReward, reward);
        
        // Store recent performance
        this.statistics.recentPerformance.push(reward);
        if (this.statistics.recentPerformance.length > 100) {
            this.statistics.recentPerformance.shift();
        }
        
        // Store experience for replay learning
        this.storeExperience(state, action, reward, nextState);
    }

    storeExperience(state, action, reward, nextState) {
        this.experienceBuffer.push({
            state: state,
            action: action,
            reward: reward,
            nextState: nextState,
            timestamp: Date.now()
        });
        
        if (this.experienceBuffer.length > this.maxExperienceSize) {
            this.experienceBuffer.shift();
        }
    }

    // Calculate reward based on action outcome
    calculateReward(action, previousNetWorth, currentNetWorth, marketState) {
        let reward = 0;
        
        // Base reward: change in net worth
        const netWorthChange = currentNetWorth - previousNetWorth;
        reward += netWorthChange * 0.01; // Scale down
        
        // Strategy-specific reward modifications
        if (this.strategy === 'q_learning_aggressive') {
            // Reward bold moves that pay off
            if (action.type !== 'hold' && netWorthChange > 0) {
                reward += action.quantity * 0.1;
            }
        } else if (this.strategy === 'q_learning_conservative') {
            // Reward stability and small gains
            if (netWorthChange >= 0) {
                reward += Math.min(netWorthChange * 0.02, 5);
            }
            // Penalize large losses more
            if (netWorthChange < 0) {
                reward += netWorthChange * 0.02;
            }
        } else if (this.strategy === 'q_learning_contrarian') {
            // Reward contrarian moves that work
            const market = marketState.market[action.resource];
            if (market) {
                const ratio = market.demand / market.supply;
                if (action.type === 'buy' && ratio < 0.8 && netWorthChange > 0) {
                    reward += 2; // Bonus for buying when demand is low
                } else if (action.type === 'sell' && ratio > 1.2 && netWorthChange > 0) {
                    reward += 2; // Bonus for selling when demand is high
                }
            }
        }
        
        // Penalty for invalid or impossible actions
        if (action.type !== 'hold' && netWorthChange === 0) {
            reward -= 1; // Action had no effect
        }
        
        // Small penalty for holding too much (encourage activity)
        if (action.type === 'hold') {
            reward -= 0.1;
        }
        
        // Apply personality-based modifications
        reward *= (1 + this.personality.confidence * 0.1);
        
        this.lastReward = reward;
        return reward;
    }

    calculateActionConfidence(state, action) {
        const qValue = this.getQValue(state, action);
        const magnitude = Math.abs(qValue);
        
        if (magnitude > 10) return 0.9;
        if (magnitude > 5) return 0.7;
        if (magnitude > 1) return 0.5;
        if (magnitude > 0.1) return 0.3;
        return 0.1;
    }

    generateReasoning(state, action, possibleActions) {
        const qValue = this.getQValue(state, action);
        const avgQ = possibleActions.reduce((sum, a) => sum + this.getQValue(state, a), 0) / possibleActions.length;
        
        let reasoning = `Q-value: ${qValue.toFixed(3)} (avg: ${avgQ.toFixed(3)}). `;
        
        if (action.type === 'hold') {
            reasoning += "Choosing to observe market conditions.";
        } else if (action.type === 'buy') {
            reasoning += `Buying ${action.quantity} ${action.resource} based on learned patterns.`;
        } else if (action.type === 'sell') {
            reasoning += `Selling ${action.quantity} ${action.resource} for expected profit.`;
        }
        
        if (this.epsilon > 0.1 && Math.random() < this.epsilon) {
            reasoning += " (Exploration mode)";
        } else {
            reasoning += " (Exploitation mode)";
        }
        
        return reasoning;
    }

    // Execute the chosen action
    executeAction(decision, gameState) {
        const { action } = decision;
        const previousNetWorth = this.getNetWorth(gameState);
        
        let success = false;
        
        if (action.type === 'buy') {
            success = this.buy(action.resource, action.quantity, gameState);
        } else if (action.type === 'sell') {
            success = this.sell(action.resource, action.quantity, gameState);
        } else if (action.type === 'hold') {
            success = true; // Hold is always successful
        }
        
        if (success) {
            const currentNetWorth = this.getNetWorth(gameState);
            const reward = this.calculateReward(action, previousNetWorth, currentNetWorth, gameState);
            
            // Store the transaction
            if (action.type !== 'hold') {
                this.transactions.push({
                    type: action.type,
                    resource: action.resource,
                    quantity: action.quantity,
                    price: gameState.market[action.resource].price,
                    timestamp: Date.now(),
                    profit: currentNetWorth - previousNetWorth,
                    reward: reward,
                    qValue: this.getQValue(this.lastState, action),
                    isExploration: Math.random() < this.epsilon
                });
            }
        }
        
        return success;
    }

    // Buy resource
    buy(resource, quantity, gameState) {
        if (!gameState || !gameState.market || !gameState.market[resource]) {
            console.error(`❌ Invalid market data for resource ${resource}`);
            return false;
        }

        const market = gameState.market[resource];
        if (!market) return false;
        
        const totalCost = market.price * quantity;
        
        if (this.money >= totalCost && market.supply >= quantity && quantity > 0) {
            this.money -= totalCost;
            this.inventory[resource] += quantity;
            market.supply -= quantity;
            market.demand += Math.floor(quantity * 0.1);
            return true;
        }
        return false;
    }

    // Sell resource
    sell(resource, quantity, gameState) {
        if (!gameState || !gameState.market || !gameState.market[resource]) {
            console.error(`❌ Invalid market data for resource ${resource}`);
            return false;
        }

        if (!this.inventory[resource] || this.inventory[resource] < quantity || quantity <= 0) {
            return false;
        }
        
        const market = gameState.market[resource];
        const totalRevenue = market.price * quantity;
        
        this.money += totalRevenue;
        this.inventory[resource] -= quantity;
        market.supply += quantity;
        market.demand -= Math.floor(quantity * 0.1);
        
        return true;
    }

    // 🔧 NUEVO: Método seguro para calcular net worth
    calculateSafeNetWorth(gameState) {
        try {
            return this.getNetWorth(gameState);
        } catch (error) {
            console.warn(`⚠️ Error calculating net worth for ${this.name}: ${error.message}`);
            return this.money; // Fallback solo al dinero
        }
    }

    // Calculate net worth
    getNetWorth(gameState = null) {
        if(!gameState || !gameState.market){
            console.warn(`⚠️ getNetWorth called without valid gameState for bot ${this.name}`);
            // Retornar solo el dinero si no hay gameState válido
            return this.money;
        }
        let inventoryValue = 0;
        for (let resource in this.inventory) {
            if (gameState.market[resource]) {
                inventoryValue += this.inventory[resource] * gameState.market[resource].price;
            }
        }
        return this.money + inventoryValue;
    }

    // 🔧 NUEVO: Agregar decisión al historial
    addToDecisionHistory(decision) {
        this.decisionHistory.unshift(decision); // Más recientes al principio
        
        if (this.decisionHistory.length > this.maxDecisionHistory) {
            this.decisionHistory.pop();
        }
    }

    // 🔧 NUEVO: Obtener historial de decisiones
    getDecisionHistory(count = 20) {
        return this.decisionHistory.slice(0, count);
    }

    // 🔧 NUEVO: Obtener explicación de la estrategia actual
    explainCurrentStrategy() {
        return {
            name: this.name,
            strategy: this.strategy,
            learningProgress: {
                qTableSize: this.qTable.size,
                explorationRate: (this.epsilon * 100).toFixed(1) + '%',
                episodes: this.statistics.learningEpisodes,
                avgReward: this.statistics.avgReward.toFixed(3),
                successRate: this.calculateSuccessRate()
            },
            personality: this.personality,
            recentPerformance: this.getRecentPerformanceMetrics(),
            lastThought: this.lastThoughtProcess ? 
                this.lastThoughtProcess.decisionProcess[this.lastThoughtProcess.decisionProcess.length - 1] : null
        };
    }

    // 🔧 NUEVO: Obtener muestra de Q-Table
    getQTableSample(sampleSize = 10) {
        if (this.qTable.size === 0) {
            return {
                totalEntries: 0,
                topEntries: [],
                averageQValue: 0
            };
        }
        
        const qTableEntries = Array.from(this.qTable.entries());
        const sample = qTableEntries
            .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])) // Sort by Q-value magnitude
            .slice(0, sampleSize)
            .map(([stateAction, qValue]) => {
                const parts = stateAction.split('#');
                const actionPart = parts[1] || stateAction;
                const actionTokens = actionPart.split(':');
                
                return {
                    action: {
                        type: actionTokens[0] || 'unknown',
                        resource: actionTokens[1] || 'unknown',
                        quantity: parseInt(actionTokens[2]) || 0
                    },
                    qValue: qValue.toFixed(4),
                    confidence: this.categorizeQValue(qValue)
                };
            });
        
        const avgQValue = qTableEntries.length > 0 ? 
            (qTableEntries.reduce((sum, [_, val]) => sum + val, 0) / qTableEntries.length) : 0;
        
        return {
            totalEntries: qTableEntries.length,
            topEntries: sample,
            averageQValue: avgQValue.toFixed(4)
        };
    }

    // 🔧 NUEVO: Categorizar Q-value para entendimiento humano
    categorizeQValue(qValue) {
        const magnitude = Math.abs(qValue);
        if (magnitude > 10) return 'very_high';
        if (magnitude > 5) return 'high';
        if (magnitude > 1) return 'medium';
        if (magnitude > 0.1) return 'low';
        return 'very_low';
    }

    // 🔧 NUEVO: Activar/desactivar observación
    setWatching(enabled, io = null) {
        this.isBeingWatched = enabled;
        
        if (enabled && this.lastThoughtProcess && io) {
            // Enviar último proceso de pensamiento
            io.emit('bot_thinking_process', this.lastThoughtProcess);
        }
        
        return enabled;
    }

    // Experience replay for improved learning
    replayExperience(batchSize = 32) {
        if (this.experienceBuffer.length < batchSize) return;
        
        // Sample random batch
        const batch = [];
        for (let i = 0; i < batchSize; i++) {
            const randomIndex = Math.floor(Math.random() * this.experienceBuffer.length);
            batch.push(this.experienceBuffer[randomIndex]);
        }
        
        // Replay each experience
        batch.forEach(experience => {
            this.learn(experience.state, experience.action, experience.reward, experience.nextState);
        });
    }

    // Explain current strategy and learning progress
    explainStrategy() {
        return {
            name: this.name,
            strategy: this.strategy,
            learningProgress: {
                qTableSize: this.qTable.size,
                explorationRate: (this.epsilon * 100).toFixed(1) + '%',
                episodes: this.statistics.learningEpisodes,
                avgReward: this.statistics.avgReward.toFixed(3),
                successRate: this.calculateSuccessRate()
            },
            personality: this.personality,
            recentPerformance: this.getRecentPerformanceMetrics()
        };
    }

    calculateSuccessRate() {
        const recentTransactions = this.transactions.slice(-20);
        if (recentTransactions.length === 0) return '0%';
        
        const successful = recentTransactions.filter(t => (t.profit || 0) > 0).length;
        return ((successful / recentTransactions.length) * 100).toFixed(1) + '%';
    }

    getRecentPerformanceMetrics() {
        const recent = this.statistics.recentPerformance.slice(-20);
        if (recent.length === 0) return { trend: 'no_data' };
        
        const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length;
        const trend = recent.length > 10 ? 
            (recent.slice(-5).reduce((a, b) => a + b, 0) / 5 > recent.slice(0, 5).reduce((a, b) => a + b, 0) / 5 ? 'improving' : 'declining') : 'stable';
        
        return {
            avgReward: avgRecent.toFixed(3),
            trend: trend,
            samples: recent.length
        };
    }
}

// Action Logger for tracking bot decisions
class ActionLogger {
    constructor() {
        this.logs = new Map(); // botId -> array of decisions
        this.maxLogSize = 1000;
    }

    logDecision(botId, decision, marketState, outcome) {
        if (!this.logs.has(botId)) {
            this.logs.set(botId, []);
        }
        
        const log = this.logs.get(botId);
        log.push({
            timestamp: Date.now(),
            tick: marketState.tick,
            state: decision.state || 'unknown',
            action: decision.action,
            confidence: decision.confidence,
            reasoning: decision.reasoning,
            outcome: outcome,
            marketConditions: {
                cycle: marketState.economicCycle,
                prices: Object.fromEntries(
                    Object.entries(marketState.market).map(([resource, data]) => [resource, data.price])
                )
            }
        });
        
        // Keep only recent logs
        if (log.length > this.maxLogSize) {
            log.shift();
        }
    }

    getDecisionHistory(botId, count = 50) {
        const logs = this.logs.get(botId) || [];
        return logs.slice(-count).reverse(); // Most recent first
    }

    getDecisionsByType(botId, actionType) {
        const logs = this.logs.get(botId) || [];
        return logs.filter(log => log.action.type === actionType);
    }

    getAllLogs() {
        const allLogs = {};
        this.logs.forEach((logs, botId) => {
            allLogs[botId] = logs;
        });
        return allLogs;
    }

    clearLogs(botId = null) {
        if (botId) {
            this.logs.delete(botId);
        } else {
            this.logs.clear();
        }
    }
}

// Reputation System for tracking bot behavior
class ReputationSystem {
    constructor() {
        this.reputations = new Map(); // botId -> reputation data
        this.behaviorHistory = new Map(); // botId -> behavior log
        this.suspiciousActivities = new Map(); // botId -> suspicious activity count
    }

    calculateReputation(botId, transactions, marketImpact) {
        const behaviorHistory = this.behaviorHistory.get(botId) || [];
        const suspiciousCount = this.suspiciousActivities.get(botId) || 0;
        
        let score = 50; // Base score
        
        // Positive factors
        if (transactions.length > 0) {
            const avgProfit = transactions.reduce((sum, t) => sum + (t.profit || 0), 0) / transactions.length;
            const successRate = transactions.filter(t => (t.profit || 0) > 0).length / transactions.length;
            
            score += Math.min(avgProfit * 2, 20); // Cap bonus at 20
            score += successRate * 15; // Up to 15 points for success rate
        }
        
        // Market impact (positive if reasonable)
        if (marketImpact.totalImpact < 0.1) {
            score += 10; // Bonus for not disrupting market
        } else if (marketImpact.totalImpact > 0.5) {
            score -= 15; // Penalty for high impact
        }
        
        // Behavior consistency
        const consistencyScore = this.calculateBehaviorConsistency(behaviorHistory);
        score += consistencyScore * 10;
        
        // Suspicious activity penalty
        score -= suspiciousCount * 5;
        
        // Clamp score between 0 and 100
        score = Math.max(0, Math.min(100, score));
        
        const reputation = {
            score: Math.round(score),
            trustLevel: this.categorizeTrustLevel(score),
            behaviorProfile: this.categorizeBehaviorProfile(behaviorHistory),
            lastUpdated: Date.now()
        };
        
        this.reputations.set(botId, reputation);
        return reputation;
    }

    calculateBehaviorConsistency(behaviorHistory) {
        if (behaviorHistory.length < 10) return 0.5;
        
        // Analyze patterns in behavior
        const actionTypes = behaviorHistory.map(b => b.action);
        const uniqueActions = [...new Set(actionTypes)];
        
        // Diversity score (not too predictable, not too random)
        const diversity = uniqueActions.length / actionTypes.length;
        const idealDiversity = 0.3; // 30% diversity is good
        
        return Math.max(0, 1 - Math.abs(diversity - idealDiversity) * 2);
    }

    categorizeTrustLevel(score) {
        if (score >= 80) return 'very_high';
        if (score >= 60) return 'high';
        if (score >= 40) return 'medium';
        if (score >= 20) return 'low';
        return 'very_low';
    }

    categorizeBehaviorProfile(behaviorHistory) {
        if (behaviorHistory.length < 5) return 'unknown';
        
        const actions = behaviorHistory.map(b => b.action);
        const buyCount = actions.filter(a => a === 'buy').length;
        const sellCount = actions.filter(a => a === 'sell').length;
        const holdCount = actions.filter(a => a === 'hold').length;
        
        const total = actions.length;
        
        if (buyCount / total > 0.6) return 'accumulator';
        if (sellCount / total > 0.6) return 'distributor';
        if (holdCount / total > 0.5) return 'conservative';
        
        return 'balanced';
    }

    updateBehaviorHistory(botId, action, context) {
        if (!this.behaviorHistory.has(botId)) {
            this.behaviorHistory.set(botId, []);
        }
        
        const history = this.behaviorHistory.get(botId);
        history.push({
            action: action,
            timestamp: Date.now(),
            context: context
        });
        
        // Keep only recent history
        if (history.length > 200) {
            history.shift();
        }
    }

    flagSuspiciousActivity(botId, reason) {
        const current = this.suspiciousActivities.get(botId) || 0;
        this.suspiciousActivities.set(botId, current + 1);
        
        console.log(`🚨 Suspicious activity flagged for bot ${botId}: ${reason}`);
    }

    getReputationReport() {
        const report = {
            totalBots: this.reputations.size,
            averageReputation: 0,
            trustDistribution: {
                very_high: 0,
                high: 0,
                medium: 0,
                low: 0,
                very_low: 0
            },
            behaviorProfiles: {
                accumulator: 0,
                distributor: 0,
                conservative: 0,
                balanced: 0,
                unknown: 0
            },
            suspiciousActivities: 0,
            lastUpdated: Date.now()
        };
        
        let totalScore = 0;
        
        this.reputations.forEach((reputation, botId) => {
            totalScore += reputation.score;
            report.trustDistribution[reputation.trustLevel]++;
            report.behaviorProfiles[reputation.behaviorProfile]++;
        });
        
        if (this.reputations.size > 0) {
            report.averageReputation = totalScore / this.reputations.size;
        }
        
        report.suspiciousActivities = Array.from(this.suspiciousActivities.values())
            .reduce((sum, count) => sum + count, 0);
        
        return report;
    }

    getReputation(botId) {
        return this.reputations.get(botId) || {
            score: 50,
            trustLevel: 'medium',
            behaviorProfile: 'unknown',
            lastUpdated: Date.now()
        };
    }

    resetReputation(botId) {
        this.reputations.delete(botId);
        this.behaviorHistory.delete(botId);
        this.suspiciousActivities.delete(botId);
    }
}

// Simulation Controller for managing advanced bots
class SimulationController {
    constructor(gameState, io) {
        this.gameState = gameState;
        this.io = io;
        this.qLearningBots = new Map();
        this.actionLogger = new ActionLogger();
        this.reputationSystem = new ReputationSystem();
        
        this.isRunning = true;
        this.isPaused = false;
        this.tickCount = 0;
        this.analysisMode = false;
        
        // Performance tracking
        this.performanceMetrics = new Map();
        this.marketHistory = [];
        
        // Simulation parameters
        this.config = {
            learningRate: 0.1,
            experienceReplayFrequency: 10, // Every 10 ticks
            reputationUpdateFrequency: 5,  // Every 5 ticks
            maxBotsPerStrategy: 3,
            adaptiveEpsilon: true
        };
        
        console.log('🎛️ Simulation Controller initialized');
    }

    // Add Q-Learning bot to simulation
    addQLearningBot(name, strategy) {
        const bot = new QLearningBot(name, strategy);
        this.qLearningBots.set(bot.id, bot);
        
        // Initialize performance tracking
        this.performanceMetrics.set(bot.id, {
            initialNetWorth: bot.getNetWorth(this.gameState),
            bestPerformance: 0,
            worstPerformance: 0,
            totalTicks: 0,
            profitableTicks: 0,
            largestGain: 0,
            largestLoss: 0,
            consistencyScore: 0,
            adaptabilityScore: 0
        });
        
        console.log(`🧠 Added Q-Learning bot: ${name} (${strategy})`);
        return bot;
    }

    // Remove bot from simulation
    removeBot(botId) {
        const bot = this.qLearningBots.get(botId);
        if (bot) {
            this.qLearningBots.delete(botId);
            this.performanceMetrics.delete(botId);
            this.actionLogger.clearLogs(botId);
            this.reputationSystem.resetReputation(botId);
            
            console.log(`🗑️ Removed bot: ${bot.name}`);
            return true;
        }
        return false;
    }

    // Run Q-Learning bots for one tick
    runQLearningBots() {
        if (this.isPaused || !this.isRunning) return;
        
        this.tickCount++;
        
        // Store market history for analysis
        this.storeMarketSnapshot();
        
        const results = [];
        
        this.qLearningBots.forEach((bot, botId) => {
            try {
                const previousNetWorth = bot.getNetWorth(this.gameState);
                
                // Make decision with thinking system
                const decision = bot.makeDecision(this.gameState, this.io);
                
                // Execute action
                const success = bot.executeAction(decision, this.gameState);
                
                if (success) {
                    const currentNetWorth = bot.getNetWorth(this.gameState);
                    const performance = currentNetWorth - previousNetWorth;
                    
                    // Log the decision
                    this.actionLogger.logDecision(botId, decision, this.gameState, {
                        success: true,
                        performance: performance,
                        netWorth: currentNetWorth
                    });
                    
                    // Update performance metrics
                    this.updatePerformanceMetrics(botId, performance, currentNetWorth);
                    
                    // Emit bot action to clients
                    if (decision.action.type !== 'hold') {
                        this.io.emit('bot_action', {
                            botId: botId,
                            botName: bot.name,
                            action: decision.action.type,
                            resource: decision.action.resource,
                            quantity: decision.action.quantity,
                            price: this.gameState.market[decision.action.resource]?.price || 0,
                            confidence: decision.confidence,
                            reasoning: decision.reasoning,
                            market: this.gameState.market,
                            performance: performance
                        });
                    }
                    
                    results.push({
                        botId: botId,
                        bot: bot,
                        decision: decision,
                        performance: performance,
                        success: true
                    });
                }
                
                // Experience replay (periodically)
                if (this.tickCount % this.config.experienceReplayFrequency === 0) {
                    bot.replayExperience();
                }
                
            } catch (error) {
                console.error(`❌ Error running Q-Learning bot ${bot.name}:`, error.message);
                
                this.actionLogger.logDecision(botId, { action: { type: 'error' } }, this.gameState, {
                    success: false,
                    error: error.message
                });
            }
        });
        
        // Update reputations periodically
        if (this.tickCount % this.config.reputationUpdateFrequency === 0) {
            this.updateReputations();
        }
        
        // Emit simulation status update
        this.emitSimulationUpdate(results);
        
        return results;
    }

    storeMarketSnapshot() {
        const snapshot = {
            tick: this.tickCount,
            timestamp: Date.now(),
            cycle: this.gameState.economicCycle,
            market: JSON.parse(JSON.stringify(this.gameState.market)), // Deep copy
            botCount: this.qLearningBots.size,
            avgBotPerformance: this.calculateAveragePerformance()
        };
        
        this.marketHistory.push(snapshot);
        
        // Keep only recent history
        if (this.marketHistory.length > 1000) {
            this.marketHistory.shift();
        }
    }

    updatePerformanceMetrics(botId, performance, netWorth) {
        const metrics = this.performanceMetrics.get(botId);
        if (!metrics) return;
        
        metrics.totalTicks++;
        
        if (performance > 0) {
            metrics.profitableTicks++;
            metrics.largestGain = Math.max(metrics.largestGain, performance);
        } else if (performance < 0) {
            metrics.largestLoss = Math.min(metrics.largestLoss, performance);
        }
        
        const currentPerformance = ((netWorth - metrics.initialNetWorth) / metrics.initialNetWorth) * 100;
        metrics.bestPerformance = Math.max(metrics.bestPerformance, currentPerformance);
        metrics.worstPerformance = Math.min(metrics.worstPerformance, currentPerformance);
        
        // Calculate consistency score
        metrics.consistencyScore = metrics.totalTicks > 0 ? 
            (metrics.profitableTicks / metrics.totalTicks) : 0;
    }

    updateReputations() {
        this.qLearningBots.forEach((bot, botId) => {
            const marketImpact = this.calculateMarketImpact(bot);
            const reputation = this.reputationSystem.calculateReputation(
                botId,
                bot.transactions,
                marketImpact
            );
            
            // Check for suspicious patterns
            this.detectSuspiciousPatterns(bot, botId);
        });
    }

    calculateMarketImpact(bot) {
        const recentTransactions = bot.transactions.slice(-20);
        if (recentTransactions.length === 0) {
            return { totalImpact: 0, volatilityContribution: 0 };
        }
        
        let totalImpact = 0;
        let priceInfluence = 0;
        
        recentTransactions.forEach(transaction => {
            const market = this.gameState.market[transaction.resource];
            if (market) {
                // Calculate impact based on transaction size relative to market
                const marketSize = market.supply + market.demand;
                const impact = transaction.quantity / marketSize;
                totalImpact += impact;
                
                // Estimate price influence
                if (transaction.type === 'buy') {
                    priceInfluence += impact * 0.1; // Buying increases price
                } else {
                    priceInfluence -= impact * 0.1; // Selling decreases price
                }
            }
        });
        
        return {
            totalImpact: totalImpact,
            volatilityContribution: Math.abs(priceInfluence),
            averageTransactionImpact: totalImpact / recentTransactions.length,
            priceInfluence: priceInfluence
        };
    }

    detectSuspiciousPatterns(bot, botId) {
        const recentTransactions = bot.transactions.slice(-50);
        if (recentTransactions.length < 10) return;
        
        // Check for unusual timing patterns
        const timings = [];
        for (let i = 1; i < recentTransactions.length; i++) {
            const gap = recentTransactions[i].timestamp - recentTransactions[i-1].timestamp;
            timings.push(gap);
        }
        
        // Check for too-regular patterns (bot-like behavior)
        const avgTiming = timings.reduce((a, b) => a + b, 0) / timings.length;
        const regularCount = timings.filter(t => Math.abs(t - avgTiming) < avgTiming * 0.1).length;
        
        if (regularCount / timings.length > 0.8) {
            this.reputationSystem.flagSuspiciousActivity(botId, 'too_regular_timing');
        }
        
        // Check for unusual volume patterns
        const volumes = recentTransactions.map(t => t.quantity);
        const sameVolumeCount = volumes.filter(v => v === volumes[0]).length;
        
        if (sameVolumeCount / volumes.length > 0.7) {
            this.reputationSystem.flagSuspiciousActivity(botId, 'repetitive_volumes');
        }
        
        // Check for market manipulation patterns
        const priceChanges = this.analyzeTransactionPriceImpact(recentTransactions);
        if (priceChanges.suspiciousCount > 5) {
            this.reputationSystem.flagSuspiciousActivity(botId, 'potential_manipulation');
        }
    }

    analyzeTransactionPriceImpact(transactions) {
        let suspiciousCount = 0;
        let totalImpact = 0;
        
        transactions.forEach((transaction, index) => {
            if (index === 0) return;
            
            const prevTransaction = transactions[index - 1];
            const timeDiff = transaction.timestamp - prevTransaction.timestamp;
            
            // Quick successive transactions might indicate manipulation
            if (timeDiff < 5000 && transaction.resource === prevTransaction.resource) {
                if (transaction.type !== prevTransaction.type) {
                    suspiciousCount++; // Buy followed by sell quickly
                }
            }
            
            // Large quantity relative to typical market size
            if (transaction.quantity > 50) {
                totalImpact += 0.1;
            }
        });
        
        return { suspiciousCount, totalImpact };
    }

    emitSimulationUpdate(results) {
        const updateData = {
            tick: this.tickCount,
            timestamp: Date.now(),
            botCount: this.qLearningBots.size,
            actions: results.length,
            successfulActions: results.filter(r => r.success).length,
            averagePerformance: this.calculateAveragePerformance(),
            topPerformer: this.getTopPerformer(),
            marketSnapshot: {
                cycle: this.gameState.economicCycle,
                totalVolume: this.calculateTotalVolume(),
                priceVolatility: this.calculatePriceVolatility()
            }
        };
        
        this.io.emit('simulation_update', updateData);
    }

    calculateAveragePerformance() {
        if (this.qLearningBots.size === 0) return 0;
        
        let totalPerformance = 0;
        this.qLearningBots.forEach(bot => {
            const metrics = this.performanceMetrics.get(bot.id);
            if (metrics) {
                totalPerformance += metrics.bestPerformance;
            }
        });
        
        return totalPerformance / this.qLearningBots.size;
    }

    getTopPerformer() {
        let topBot = null;
        let bestPerformance = -Infinity;
        
        this.qLearningBots.forEach(bot => {
            const metrics = this.performanceMetrics.get(bot.id);
            if (metrics && metrics.bestPerformance > bestPerformance) {
                bestPerformance = metrics.bestPerformance;
                topBot = {
                    id: bot.id,
                    name: bot.name,
                    performance: metrics.bestPerformance
                };
            }
        });
        
        return topBot;
    }

    calculateTotalVolume() {
        let totalVolume = 0;
        this.qLearningBots.forEach(bot => {
            bot.transactions.slice(-10).forEach(transaction => {
                totalVolume += transaction.quantity * transaction.price;
            });
        });
        return totalVolume;
    }

    calculatePriceVolatility() {
        if (this.marketHistory.length < 5) return 0;
        
        const recentHistory = this.marketHistory.slice(-5);
        const resources = ['agua', 'comida', 'energia', 'materiales'];
        
        let totalVolatility = 0;
        
        resources.forEach(resource => {
            const prices = recentHistory.map(h => h.market[resource].price);
            const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
            
            const variance = prices.reduce((sum, price) => {
                return sum + Math.pow(price - avgPrice, 2);
            }, 0) / prices.length;
            
            totalVolatility += Math.sqrt(variance) / avgPrice;
        });
        
        return totalVolatility / resources.length;
    }

    // Simulation control methods
    pauseSimulation() {
        this.isPaused = true;
        this.analysisMode = true;
        
        console.log('⏸️ Simulation paused for analysis');
        
        const analysis = this.generatePauseAnalysis();
        
        this.io.emit('simulation_paused', {
            analysis: analysis,
            timestamp: Date.now()
        });
        
        return analysis;
    }

    resumeSimulation() {
        this.isPaused = false;
        this.analysisMode = false;
        
        console.log('▶️ Simulation resumed');
        
        this.io.emit('simulation_resumed', {
            timestamp: Date.now(),
            tickCount: this.tickCount
        });
    }

    stopSimulation() {
        this.isRunning = false;
        this.isPaused = true;
        
        console.log('⏹️ Simulation stopped');
        
        const finalAnalysis = this.generateFinalAnalysis();
        
        this.io.emit('simulation_stopped', {
            finalAnalysis: finalAnalysis,
            timestamp: Date.now()
        });
        
        return finalAnalysis;
    }

    generatePauseAnalysis() {
        return {
            type: 'pause_analysis',
            timestamp: Date.now(),
            tick: this.tickCount,
            summary: {
                totalBots: this.qLearningBots.size,
                totalActions: this.actionLogger.getAllLogs(),
                averagePerformance: this.calculateAveragePerformance(),
                marketVolatility: this.calculatePriceVolatility()
            },
            botPerformances: this.getBotPerformanceSummary(),
            marketAnalysis: this.getMarketAnalysis(),
            reputationOverview: this.reputationSystem.getReputationReport(),
            recommendations: this.generateRecommendations()
        };
    }

    generateFinalAnalysis() {
        return {
            type: 'final_analysis',
            timestamp: Date.now(),
            totalTicks: this.tickCount,
            duration: this.tickCount * 15000, // Assuming 15 second ticks
            summary: {
                totalBots: this.qLearningBots.size,
                totalTransactions: this.getTotalTransactions(),
                marketEvolution: this.analyzeMarketEvolution(),
                learningProgress: this.analyzeLearningProgress()
            },
            winners: this.identifyWinners(),
            insights: this.generateInsights(),
            finalPerformances: this.getBotPerformanceSummary(),
            reputationFinalReport: this.reputationSystem.getReputationReport()
        };
    }

    getBotPerformanceSummary() {
        const summary = {};
        
        this.qLearningBots.forEach((bot, botId) => {
            const metrics = this.performanceMetrics.get(botId);
            const netWorth = bot.getNetWorth(this.gameState);
            
            summary[botId] = {
                name: bot.name,
                strategy: bot.strategy,
                netWorth: netWorth,
                performance: ((netWorth - metrics.initialNetWorth) / metrics.initialNetWorth * 100).toFixed(2) + '%',
                consistency: (metrics.consistencyScore * 100).toFixed(1) + '%',
                transactions: bot.transactions.length,
                qTableSize: bot.qTable.size,
                explorationRate: (bot.epsilon * 100).toFixed(1) + '%',
                reputation: this.reputationSystem.getReputation(botId)
            };
        });
        
        return summary;
    }

    getMarketAnalysis() {
        const recentHistory = this.marketHistory.slice(-20);
        if (recentHistory.length === 0) return {};
        
        const analysis = {};
        const resources = ['agua', 'comida', 'energia', 'materiales'];
        
        resources.forEach(resource => {
            const prices = recentHistory.map(h => h.market[resource].price);
            const supplies = recentHistory.map(h => h.market[resource].supply);
            const demands = recentHistory.map(h => h.market[resource].demand);
            
            analysis[resource] = {
                priceRange: {
                    min: Math.min(...prices),
                    max: Math.max(...prices),
                    current: prices[prices.length - 1]
                },
                supplyTrend: this.calculateTrend(supplies),
                demandTrend: this.calculateTrend(demands),
                priceTrend: this.calculateTrend(prices),
                volatility: this.calculateArrayVolatility(prices)
            };
        });
        
        return analysis;
    }

    calculateTrend(values) {
        if (values.length < 2) return 'stable';
        
        const first = values.slice(0, Math.floor(values.length / 2)).reduce((a, b) => a + b, 0) / Math.floor(values.length / 2);
        const second = values.slice(Math.floor(values.length / 2)).reduce((a, b) => a + b, 0) / (values.length - Math.floor(values.length / 2));
        
        const change = (second - first) / first;
        
        if (change > 0.1) return 'rising';
        if (change < -0.1) return 'falling';
        return 'stable';
    }

    calculateArrayVolatility(values) {
        if (values.length < 2) return 0;
        
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
        
        return Math.sqrt(variance) / mean;
    }

    generateRecommendations() {
        const recommendations = [];
        
        // Performance-based recommendations
        const avgPerformance = this.calculateAveragePerformance();
        if (avgPerformance < 0) {
            recommendations.push({
                type: 'performance',
                priority: 'high',
                message: 'Average bot performance is negative. Consider adjusting learning parameters.',
                action: 'increase_exploration'
            });
        }
        
        // Market volatility recommendations
        const volatility = this.calculatePriceVolatility();
        if (volatility > 0.3) {
            recommendations.push({
                type: 'market',
                priority: 'medium',
                message: 'High market volatility detected. Bots may benefit from more conservative strategies.',
                action: 'reduce_risk_tolerance'
            });
        }
        
        // Learning progress recommendations
        const avgQTableSize = Array.from(this.qLearningBots.values())
            .reduce((sum, bot) => sum + bot.qTable.size, 0) / this.qLearningBots.size;
        
        if (avgQTableSize < 100) {
            recommendations.push({
                type: 'learning',
                priority: 'medium',
                message: 'Bots are still in early learning phase. More exploration recommended.',
                action: 'maintain_exploration'
            });
        }
        
        return recommendations;
    }

    getTotalTransactions() {
        let total = 0;
        this.qLearningBots.forEach(bot => {
            total += bot.transactions.length;
        });
        return total;
    }

    analyzeMarketEvolution() {
        if (this.marketHistory.length < 10) return {};
        
        const first = this.marketHistory[0];
        const last = this.marketHistory[this.marketHistory.length - 1];
        
        const evolution = {};
        const resources = ['agua', 'comida', 'energia', 'materiales'];
        
        resources.forEach(resource => {
            const initialPrice = first.market[resource].price;
            const finalPrice = last.market[resource].price;
            const change = ((finalPrice - initialPrice) / initialPrice * 100).toFixed(2);
            
            evolution[resource] = {
                initialPrice: initialPrice,
                finalPrice: finalPrice,
                changePercent: change + '%',
                direction: change > 0 ? 'increased' : change < 0 ? 'decreased' : 'stable'
            };
        });
        
        return evolution;
    }

    analyzeLearningProgress() {
        const progress = {
            totalQLearningBots: this.qLearningBots.size,
            averageQTableSize: 0,
            averageExplorationRate: 0,
            totalLearningEpisodes: 0,
            convergenceIndicators: {}
        };
        
        let totalQTableSize = 0;
        let totalEpsilon = 0;
        let totalEpisodes = 0;
        
        this.qLearningBots.forEach(bot => {
            totalQTableSize += bot.qTable.size;
            totalEpsilon += bot.epsilon;
            totalEpisodes += bot.statistics.learningEpisodes;
        });
        
        if (this.qLearningBots.size > 0) {
            progress.averageQTableSize = Math.round(totalQTableSize / this.qLearningBots.size);
            progress.averageExplorationRate = ((totalEpsilon / this.qLearningBots.size) * 100).toFixed(2) + '%';
            progress.totalLearningEpisodes = totalEpisodes;
        }
        
        return progress;
    }

    identifyWinners() {
        const rankings = [];
        
        this.qLearningBots.forEach(bot => {
            const metrics = this.performanceMetrics.get(bot.id);
            const netWorth = bot.getNetWorth(this.gameState);
            const performance = ((netWorth - metrics.initialNetWorth) / metrics.initialNetWorth) * 100;
            
            rankings.push({
                rank: 0, // Will be set after sorting
                botId: bot.id,
                name: bot.name,
                strategy: bot.strategy,
                finalNetWorth: netWorth,
                performancePercent: performance.toFixed(2) + '%',
                transactions: bot.transactions.length,
                reputation: this.reputationSystem.getReputation(bot.id)
            });
        });
        
        // Sort by performance
        rankings.sort((a, b) => {
            const aPerf = parseFloat(a.performancePercent);
            const bPerf = parseFloat(b.performancePercent);
            return bPerf - aPerf;
        });
        
        // Assign ranks
        rankings.forEach((bot, index) => {
            bot.rank = index + 1;
        });
        
        return rankings;
    }

    generateInsights() {
        const insights = [];
        
        // Strategy performance analysis
        const strategyPerformance = {};
        this.qLearningBots.forEach(bot => {
            if (!strategyPerformance[bot.strategy]) {
                strategyPerformance[bot.strategy] = { bots: 0, totalPerformance: 0 };
            }
            
            const metrics = this.performanceMetrics.get(bot.id);
            const netWorth = bot.getNetWorth(this.gameState);
            const performance = ((netWorth - metrics.initialNetWorth) / metrics.initialNetWorth) * 100;
            
            strategyPerformance[bot.strategy].bots++;
            strategyPerformance[bot.strategy].totalPerformance += performance;
        });
        
        // Find best strategy
        let bestStrategy = null;
        let bestAvgPerformance = -Infinity;
        
        Object.entries(strategyPerformance).forEach(([strategy, data]) => {
            const avgPerformance = data.totalPerformance / data.bots;
            if (avgPerformance > bestAvgPerformance) {
                bestAvgPerformance = avgPerformance;
                bestStrategy = strategy;
            }
        });
        
        if (bestStrategy) {
            insights.push({
                type: 'strategy_analysis',
                title: 'Best Performing Strategy',
                description: `${bestStrategy} achieved the highest average performance`,
                data: {
                    strategy: bestStrategy,
                    avgPerformance: bestAvgPerformance.toFixed(2) + '%',
                    botCount: strategyPerformance[bestStrategy].bots
                }
            });
        }
        
        // Learning convergence insight
        const avgEpsilon = Array.from(this.qLearningBots.values())
            .reduce((sum, bot) => sum + bot.epsilon, 0) / this.qLearningBots.size;
        
        insights.push({
            type: 'learning_analysis',
            title: 'Learning Convergence',
            description: avgEpsilon < 0.1 ? 
                'Bots have largely converged to exploitation strategies' :
                'Bots are still actively exploring and learning',
            data: {
                averageExploration: (avgEpsilon * 100).toFixed(2) + '%',
                phase: avgEpsilon < 0.1 ? 'exploitation' : 'exploration'
            }
        });
        
        return insights;
    }

    // Get recent decisions for a specific bot
    getRecentDecisions(botId, count = 20) {
        return this.actionLogger.getDecisionHistory(botId, count);
    }

    // Get bot decision log
    getBotDecisionLog(botId, count = 50) {
        return this.actionLogger.getDecisionHistory(botId, count);
    }

    // Calculate bot performance metrics
    calculateBotPerformance(bot) {
        const metrics = this.performanceMetrics.get(bot.id);
        if (!metrics) return null;
        
        const currentNetWorth = bot.calculateSafeNetWorth ? 
            bot.calculateSafeNetWorth(this.gameState) : 
            bot.getNetWorth(this.gameState);
        const performancePercent = ((currentNetWorth - metrics.initialNetWorth) / metrics.initialNetWorth * 100).toFixed(2) + '%';
        
        return {
            currentNetWorth: currentNetWorth,
            initialNetWorth: metrics.initialNetWorth,
            performancePercent: performancePercent,
            totalTransactions: bot.transactions.length,
            profitableTransactions: bot.transactions.filter(t => (t.profit || 0) > 0).length,
            winRate: bot.transactions.length > 0 ? 
                ((bot.transactions.filter(t => (t.profit || 0) > 0).length / bot.transactions.length) * 100).toFixed(1) + '%' : '0%',
            largestGain: metrics.largestGain,
            largestLoss: metrics.largestLoss,
            consistencyScore: (metrics.consistencyScore * 100).toFixed(1) + '%'
        };
    }

    // Export simulation data
    exportSimulationData() {
        return {
            metadata: {
                exportTime: Date.now(),
                totalTicks: this.tickCount,
                simulationDuration: this.tickCount * 15000,
                totalBots: this.qLearningBots.size
            },
            bots: Array.from(this.qLearningBots.values()).map(bot => ({
                id: bot.id,
                name: bot.name,
                strategy: bot.strategy,
                finalNetWorth: bot.getNetWorth(this.gameState),
                transactions: bot.transactions,
                qTableSize: bot.qTable.size,
                statistics: bot.statistics,
                performance: this.calculateBotPerformance(bot)
            })),
            marketHistory: this.marketHistory,
            performanceMetrics: Object.fromEntries(this.performanceMetrics),
            reputationReport: this.reputationSystem.getReputationReport(),
            actionLogs: this.actionLogger.getAllLogs(),
            finalAnalysis: this.generateFinalAnalysis()
        };
    }
}

// Risk Management System for bots
class RiskManager {
    constructor() {
        this.riskProfiles = new Map();
        this.alertThresholds = {
            maxLoss: 0.2, // 20% max loss
            concentrationLimit: 0.4, // 40% max in single resource
            volatilityThreshold: 0.3,
            correlationThreshold: 0.8
        };
        
        this.activeAlerts = new Map();
    }

    assessBotRisk(bot, marketState) {
        const riskProfile = this.calculateRiskProfile(bot, marketState);
        this.riskProfiles.set(bot.id, riskProfile);
        
        // Check for risk alerts
        this.checkRiskAlerts(bot, riskProfile);
        
        return riskProfile;
    }

    calculateRiskProfile(bot, marketState) {
        const netWorth = bot.getNetWorth(marketState);
        const initialWorth = 1000; // Assuming initial worth
        
        // Calculate various risk metrics
        const drawdown = this.calculateMaxDrawdown(bot);
        const concentration = this.calculateConcentrationRisk(bot, marketState);
        const volatility = this.calculatePortfolioVolatility(bot, marketState);
        const leverageRatio = this.calculateLeverage(bot);
        
        // Overall risk score (0 = low risk, 1 = high risk)
        const riskScore = Math.min(1, (
            drawdown * 0.3 +
            concentration * 0.25 +
            volatility * 0.25 +
            leverageRatio * 0.2
        ));
        
        return {
            riskScore: riskScore,
            riskLevel: this.categorizeRisk(riskScore),
            metrics: {
                drawdown: drawdown,
                concentration: concentration,
                volatility: volatility,
                leverage: leverageRatio
            },
            recommendations: this.generateRiskRecommendations(riskScore, {
                drawdown, concentration, volatility, leverageRatio
            }),
            timestamp: Date.now()
        };
    }

    calculateMaxDrawdown(bot) {
        const transactions = bot.transactions;
        if (transactions.length < 5) return 0;
        
        let peak = 1000; // Initial amount
        let maxDrawdown = 0;
        let runningTotal = 1000;
        
        transactions.forEach(transaction => {
            const profit = transaction.profit || 0;
            runningTotal += profit;
            
            if (runningTotal > peak) {
                peak = runningTotal;
            } else {
                const drawdown = (peak - runningTotal) / peak;
                maxDrawdown = Math.max(maxDrawdown, drawdown);
            }
        });
        
        return maxDrawdown;
    }

    calculateConcentrationRisk(bot, marketState) {
        const totalValue = bot.getNetWorth(marketState);
        if (totalValue === 0) return 0;
        
        let maxConcentration = 0;
        
        Object.entries(bot.inventory).forEach(([resource, quantity]) => {
            const resourceValue = quantity * marketState.market[resource].price;
            const concentration = resourceValue / totalValue;
            maxConcentration = Math.max(maxConcentration, concentration);
        });
        
        return maxConcentration;
    }

    calculatePortfolioVolatility(bot, marketState) {
        // Simplified portfolio volatility calculation
        const recentTransactions = bot.transactions.slice(-20);
        if (recentTransactions.length < 5) return 0;
        
        const returns = [];
        for (let i = 1; i < recentTransactions.length; i++) {
            const prevProfit = recentTransactions[i-1].profit || 0;
            const currentProfit = recentTransactions[i].profit || 0;
            
            if (prevProfit !== 0) {
                returns.push((currentProfit - prevProfit) / Math.abs(prevProfit));
            }
        }
        
        if (returns.length === 0) return 0;
        
        const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - meanReturn, 2), 0) / returns.length;
        
        return Math.sqrt(variance);
    }

    calculateLeverage(bot) {
        // For this simulation, leverage is simplified
        // In reality, it would be total position value / equity
        const netWorth = bot.money;
        const totalInventoryValue = Object.entries(bot.inventory).reduce((sum, [resource, quantity]) => {
            // Assuming average price of 15 for simplification
            return sum + quantity * 15;
        }, 0);
        
        if (netWorth <= 0) return 1;
        return Math.max(1, totalInventoryValue / netWorth);
    }

    categorizeRisk(riskScore) {
        if (riskScore < 0.2) return 'low';
        if (riskScore < 0.4) return 'moderate';
        if (riskScore < 0.7) return 'high';
        return 'extreme';
    }

    generateRiskRecommendations(riskScore, metrics) {
        const recommendations = [];
        
        if (metrics.drawdown > this.alertThresholds.maxLoss) {
            recommendations.push({
                type: 'drawdown',
                severity: 'high',
                message: 'Maximum drawdown exceeded. Consider reducing position sizes.',
                action: 'reduce_positions'
            });
        }
        
        if (metrics.concentration > this.alertThresholds.concentrationLimit) {
            recommendations.push({
                type: 'concentration',
                severity: 'medium',
                message: 'High concentration in single resource detected. Diversify holdings.',
                action: 'diversify_portfolio'
            });
        }
        
        if (metrics.volatility > this.alertThresholds.volatilityThreshold) {
            recommendations.push({
                type: 'volatility',
                severity: 'medium',
                message: 'High portfolio volatility. Consider more stable assets.',
                action: 'reduce_volatility'
            });
        }
        
        if (riskScore > 0.7) {
            recommendations.push({
                type: 'overall',
                severity: 'high',
                message: 'Overall risk level is too high. Implement risk reduction strategies.',
                action: 'comprehensive_risk_reduction'
            });
        }
        
        return recommendations;
    }

    checkRiskAlerts(bot, riskProfile) {
        const botAlerts = this.activeAlerts.get(bot.id) || [];
        
        // Clear old alerts
        const currentTime = Date.now();
        const validAlerts = botAlerts.filter(alert => 
            currentTime - alert.timestamp < 5 * 60 * 1000 // 5 minutes
        );
        
        // Check for new alerts
        if (riskProfile.riskScore > 0.8) {
            validAlerts.push({
                type: 'extreme_risk',
                message: `Bot ${bot.name} has extremely high risk profile`,
                riskScore: riskProfile.riskScore,
                timestamp: currentTime,
                severity: 'critical'
            });
        }
        
        if (riskProfile.metrics.drawdown > this.alertThresholds.maxLoss) {
            validAlerts.push({
                type: 'max_drawdown',
                message: `Bot ${bot.name} exceeded maximum drawdown threshold`,
                drawdown: riskProfile.metrics.drawdown,
                timestamp: currentTime,
                severity: 'high'
            });
        }
        
        this.activeAlerts.set(bot.id, validAlerts);
        
        // Emit alerts to clients if any new ones
        if (validAlerts.length > botAlerts.length) {
            // New alert detected - would emit to clients here
            console.log(`🚨 Risk alert for bot ${bot.name}: ${validAlerts[validAlerts.length - 1].message}`);
        }
    }

    getRiskReport() {
        const report = {
            timestamp: Date.now(),
            totalBots: this.riskProfiles.size,
            riskDistribution: {
                low: 0,
                moderate: 0,
                high: 0,
                extreme: 0
            },
            averageRiskScore: 0,
            activeAlerts: 0,
            highRiskBots: [],
            recommendations: []
        };
        
        let totalRisk = 0;
        
        this.riskProfiles.forEach((profile, botId) => {
            report.riskDistribution[profile.riskLevel]++;
            totalRisk += profile.riskScore;
            
            if (profile.riskLevel === 'high' || profile.riskLevel === 'extreme') {
                report.highRiskBots.push({
                    botId: botId,
                    riskLevel: profile.riskLevel,
                    riskScore: profile.riskScore
                });
            }
        });
        
        if (this.riskProfiles.size > 0) {
            report.averageRiskScore = totalRisk / this.riskProfiles.size;
        }
        
        // Count active alerts
        this.activeAlerts.forEach(alerts => {
            report.activeAlerts += alerts.length;
        });
        
        // Generate system-wide recommendations
        if (report.averageRiskScore > 0.6) {
            report.recommendations.push({
                type: 'system_wide',
                message: 'Average risk level is high across all bots',
                action: 'reduce_overall_risk'
            });
        }
        
        return report;
    }

    adjustBotBehavior(bot, riskProfile) {
        // Suggest adjustments to bot parameters based on risk
        const adjustments = {
            epsilonAdjustment: 0,
            learningRateAdjustment: 0,
            riskToleranceAdjustment: 0
        };
        
        if (riskProfile.riskScore > 0.7) {
            // High risk - make bot more conservative
            adjustments.epsilonAdjustment = -0.1; // Less exploration
            adjustments.learningRateAdjustment = -0.02; // Slower learning
            adjustments.riskToleranceAdjustment = -0.2; // Lower risk tolerance
        } else if (riskProfile.riskScore < 0.3) {
            // Low risk - can be more aggressive
            adjustments.epsilonAdjustment = 0.05; // More exploration
            adjustments.learningRateAdjustment = 0.01; // Faster learning
            adjustments.riskToleranceAdjustment = 0.1; // Higher risk tolerance
        }
        
        return adjustments;
    }
}

// Advanced Market Predictor using ensemble methods
class MarketPredictor {
    constructor() {
        this.models = {
            linearRegression: new LinearRegressionModel(),
            movingAverage: new MovingAverageModel(),
            seasonality: new SeasonalityModel(),
            sentiment: new SentimentModel()
        };
        
        this.weights = {
            linearRegression: 0.3,
            movingAverage: 0.25,
            seasonality: 0.25,
            sentiment: 0.2
        };
        
        this.predictions = new Map();
        this.accuracy = new Map();
    }

    predict(resource, marketHistory, horizon = 5) {
        const predictions = {};
        
        // Get predictions from each model
        Object.entries(this.models).forEach(([modelName, model]) => {
            try {
                predictions[modelName] = model.predict(resource, marketHistory, horizon);
            } catch (error) {
                console.error(`Error in ${modelName} prediction:`, error);
                predictions[modelName] = this.generateDefaultPrediction(marketHistory, horizon);
            }
        });
        
        // Ensemble prediction using weighted average
        const ensemblePrediction = this.combinePredictions(predictions);
        
        // Store prediction for accuracy tracking
        this.predictions.set(`${resource}_${Date.now()}`, {
            resource: resource,
            prediction: ensemblePrediction,
            timestamp: Date.now(),
            horizon: horizon
        });
        
        return {
            ensemble: ensemblePrediction,
            individual: predictions,
            confidence: this.calculateConfidence(predictions),
            metadata: {
                timestamp: Date.now(),
                horizon: horizon,
                modelsUsed: Object.keys(predictions)
            }
        };
    }

    combinePredictions(predictions) {
        const ensemble = [];
        const predictionArrays = Object.values(predictions);
        
        if (predictionArrays.length === 0) return [];
        
        const horizon = predictionArrays[0].length;
        
        for (let i = 0; i < horizon; i++) {
            let weightedSum = 0;
            let totalWeight = 0;
            
            Object.entries(predictions).forEach(([modelName, prediction]) => {
                if (prediction[i] !== undefined) {
                    const weight = this.weights[modelName] || 0.25;
                    weightedSum += prediction[i] * weight;
                    totalWeight += weight;
                }
            });
            
            ensemble.push(totalWeight > 0 ? weightedSum / totalWeight : 0);
        }
        
        return ensemble;
    }

    calculateConfidence(predictions) {
        const predictionArrays = Object.values(predictions);
        if (predictionArrays.length < 2) return 0.5;
        
        let totalVariance = 0;
        const ensemble = this.combinePredictions(predictions);
        
        for (let i = 0; i < ensemble.length; i++) {
            const values = predictionArrays.map(pred => pred[i]).filter(v => v !== undefined);
            if (values.length > 1) {
                const mean = values.reduce((a, b) => a + b, 0) / values.length;
                const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
                totalVariance += variance;
            }
        }
        
        const avgVariance = totalVariance / ensemble.length;
        return Math.max(0.1, Math.min(0.9, 1 - Math.sqrt(avgVariance) / 100));
    }

    generateDefaultPrediction(marketHistory, horizon) {
        if (marketHistory.length === 0) return new Array(horizon).fill(10);
        
        const lastPrice = marketHistory[marketHistory.length - 1];
        return new Array(horizon).fill(lastPrice);
    }

    updateAccuracy(actualPrices) {
        // Compare predictions with actual outcomes and update model weights
        const currentTime = Date.now();
        const timeThreshold = 5 * 60 * 1000; // 5 minutes
        
        this.predictions.forEach((predictionData, key) => {
            if (currentTime - predictionData.timestamp < timeThreshold) {
                const accuracy = this.calculatePredictionAccuracy(predictionData.prediction, actualPrices);
                this.accuracy.set(key, accuracy);
                
                // Adjust model weights based on performance
                this.adjustModelWeights(accuracy);
            }
        });
        
        // Clean old predictions
        this.cleanOldPredictions();
    }

    calculatePredictionAccuracy(predicted, actual) {
        if (predicted.length === 0 || actual.length === 0) return 0;
        
        const minLength = Math.min(predicted.length, actual.length);
        let totalError = 0;
        
        for (let i = 0; i < minLength; i++) {
            const error = Math.abs(predicted[i] - actual[i]) / actual[i];
            totalError += error;
        }
        
        return Math.max(0, 1 - (totalError / minLength));
    }

    adjustModelWeights(accuracy) {
        // Simple adaptive weight adjustment
        const learningRate = 0.01;
        const avgAccuracy = Array.from(this.accuracy.values()).reduce((a, b) => a + b, 0) / this.accuracy.size;
        
        Object.keys(this.weights).forEach(modelName => {
            if (accuracy > avgAccuracy) {
                this.weights[modelName] = Math.min(1, this.weights[modelName] + learningRate);
            } else {
                this.weights[modelName] = Math.max(0.1, this.weights[modelName] - learningRate);
            }
        });
        
        // Normalize weights
        const totalWeight = Object.values(this.weights).reduce((a, b) => a + b, 0);
        Object.keys(this.weights).forEach(modelName => {
            this.weights[modelName] /= totalWeight;
        });
    }

    cleanOldPredictions() {
        const cutoffTime = Date.now() - 30 * 60 * 1000; // 30 minutes
        
        this.predictions.forEach((predictionData, key) => {
            if (predictionData.timestamp < cutoffTime) {
                this.predictions.delete(key);
            }
        });
    }
}

// Individual prediction models
class LinearRegressionModel {
    predict(resource, marketHistory, horizon) {
        if (marketHistory.length < 5) {
            return new Array(horizon).fill(10); // Precio base por defecto
        }
        
        // 🔧 VALIDAR ESTRUCTURA DE DATOS
        const prices = marketHistory.slice(-20).map((entry, index) => {
            let price;
            
            // 🔧 Manejar diferentes formatos de datos
            if (typeof entry === 'object') {
                if (entry.market && entry.market[resource]) {
                    price = entry.market[resource].price;
                } else if (entry[resource]) {
                    price = entry[resource].price || entry[resource];
                } else if (entry.price) {
                    price = entry.price;
                } else {
                    console.warn(`⚠️ Formato de datos desconocido para ${resource}:`, entry);
                    price = 10; // Precio por defecto
                }
            } else {
                price = entry;
            }
            
            return {
                x: index,
                y: price || 10
            };
        }).filter(point => point.y > 0); // Filtrar precios inválidos
        
        if (prices.length < 2) {
            return new Array(horizon).fill(10);
        }
        
        // Simple linear regression
        const n = prices.length;
        const sumX = prices.reduce((sum, point) => sum + point.x, 0);
        const sumY = prices.reduce((sum, point) => sum + point.y, 0);
        const sumXY = prices.reduce((sum, point) => sum + point.x * point.y, 0);
        const sumXX = prices.reduce((sum, point) => sum + point.x * point.x, 0);
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        
        // Generate predictions
        const predictions = [];
        for (let i = 1; i <= horizon; i++) {
            const predictedPrice = intercept + slope * (n + i);
            predictions.push(Math.max(1, predictedPrice));
        }
        
        return predictions;
    }
}

class MovingAverageModel {
    predict(resource, marketHistory, horizon) {
        if (marketHistory.length === 0) {
            return new Array(horizon).fill(10);
        }
        
        const windowSize = Math.min(10, marketHistory.length);
        
        // 🔧 EXTRAER PRECIOS DE MANERA SEGURA
        const recentPrices = marketHistory.slice(-windowSize).map(entry => {
            if (typeof entry === 'object') {
                if (entry.market && entry.market[resource]) {
                    return entry.market[resource].price;
                } else if (entry[resource]) {
                    return entry[resource].price || entry[resource];
                } else if (entry.price) {
                    return entry.price;
                }
            }
            return entry || 10;
        }).filter(price => price > 0);
        
        if (recentPrices.length === 0) {
            return new Array(horizon).fill(10);
        }
        
        const movingAverage = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
        
        // Simple trend adjustment
        if (recentPrices.length >= 3) {
            const trend = (recentPrices[recentPrices.length - 1] - recentPrices[0]) / recentPrices.length;
            
            const predictions = [];
            for (let i = 1; i <= horizon; i++) {
                predictions.push(Math.max(1, movingAverage + trend * i));
            }
            return predictions;
        }
        
        return new Array(horizon).fill(movingAverage);
    }
}

class SeasonalityModel {
    predict(resource, marketHistory, horizon) {
        if (marketHistory.length < 20) {
            const fallbackPrice = marketHistory.length > 0 ? this.extractPrice(marketHistory[marketHistory.length - 1], resource) : 10;
            return new Array(horizon).fill(fallbackPrice);
        }
        
        // 🔧 EXTRAER PRECIOS DE MANERA SEGURA
        const prices = marketHistory.map(entry => this.extractPrice(entry, resource)).filter(price => price > 0);
        
        if (prices.length < 8) {
            return new Array(horizon).fill(prices[prices.length - 1] || 10);
        }
        
        const seasonalPeriod = 8; // Assume 8-tick seasonality
        
        // Extract seasonal pattern
        const seasonalPattern = [];
        for (let i = 0; i < seasonalPeriod; i++) {
            const seasonalValues = [];
            for (let j = i; j < prices.length; j += seasonalPeriod) {
                seasonalValues.push(prices[j]);
            }
            
            if (seasonalValues.length > 0) {
                const avgValue = seasonalValues.reduce((a, b) => a + b, 0) / seasonalValues.length;
                seasonalPattern.push(avgValue);
            } else {
                seasonalPattern.push(prices[prices.length - 1] || 10);
            }
        }
        
        // Generate predictions using seasonal pattern
        const predictions = [];
        const currentPosition = prices.length % seasonalPeriod;
        
        for (let i = 1; i <= horizon; i++) {
            const seasonalIndex = (currentPosition + i) % seasonalPeriod;
            predictions.push(Math.max(1, seasonalPattern[seasonalIndex]));
        }
        
        return predictions;
    }

    extractPrice(entry, resource) {
        if (typeof entry === 'object') {
            if (entry.market && entry.market[resource]) {
                return entry.market[resource].price;
            } else if (entry[resource]) {
                return entry[resource].price || entry[resource];
            } else if (entry.price) {
                return entry.price;
            }
        }
        return entry || 10;
    }
}

class SentimentModel {
    predict(resource, marketHistory, horizon) {
        if (marketHistory.length < 5) {
            const fallbackPrice = marketHistory.length > 0 ? this.extractPrice(marketHistory[marketHistory.length - 1], resource) : 10;
            return new Array(horizon).fill(fallbackPrice);
        }
        
        // Analyze market sentiment based on supply/demand dynamics
        const recentEntries = marketHistory.slice(-10);
        let bullishSignals = 0;
        let bearishSignals = 0;
        
        recentEntries.forEach(entry => {
            // 🔧 EXTRAER DATOS DE MERCADO DE MANERA SEGURA
            let market;
            if (entry.market && entry.market[resource]) {
                market = entry.market[resource];
            } else if (entry[resource]) {
                market = entry[resource];
            }
            
            if (market && market.demand && market.supply) {
                const ratio = market.demand / market.supply;
                if (ratio > 1.1) bullishSignals++;
                if (ratio < 0.9) bearishSignals++;
            }
        });
        
        const sentiment = bullishSignals - bearishSignals;
        const currentPrice = this.extractPrice(recentEntries[recentEntries.length - 1], resource);
        
        // Apply sentiment to price prediction
        const sentimentMultiplier = 1 + (sentiment * 0.02); // 2% per signal
        
        const predictions = [];
        for (let i = 1; i <= horizon; i++) {
            const adjustedPrice = currentPrice * Math.pow(sentimentMultiplier, i * 0.5);
            predictions.push(Math.max(1, adjustedPrice));
        }
        
        return predictions;
    }

    extractPrice(entry, resource) {
        if (typeof entry === 'object') {
            if (entry.market && entry.market[resource]) {
                return entry.market[resource].price;
            } else if (entry[resource]) {
                return entry[resource].price || entry[resource];
            } else if (entry.price) {
                return entry.price;
            }
        }
        return entry || 10;
    }
}

// Export all classes
module.exports = {
    QLearningBot,
    ActionLogger,
    ReputationSystem,
    SimulationController,
    MarketPredictor,
    LinearRegressionModel,
    MovingAverageModel,
    SeasonalityModel,
    SentimentModel,
    RiskManager
};