// server/app-integrated.js - Simulador Económico Completo con IA Avanzada
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Importar sistemas avanzados
const { 
    QLearningBot, 
    ActionLogger, 
    ReputationSystem, 
    SimulationController,
    MarketPredictor,
    RiskManager 
} = require('./advanced-agents');
const { 
    ADMIN_EVENTS,
    triggerAdminEvent,
    processActiveProgressiveEvents,
    enableBotObservation,
    disableBotObservation,
    getObservationStatus,
    getBotThoughtHistory,
    getAdaptationMetrics
} = require('./admin-routes-enhanced');

const { 
    setupAdminRoutes, 
    setupAdminSocketHandlers, 
    processActiveAdminEvents,
    adminState 
} = require('./admin-routes');


const { MarketAnalytics } = require('./analytics');
const { DatabaseManager } = require('./models');
const { SimulationManager } = require('./simulation-control');

// Configuración
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { 
        origin: "*", 
        methods: ["GET", "POST"],
        credentials: true
    },
    allowEIO3: true, // Para compatibilidad
    transports: ['websocket', 'polling']
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));


// Estado del juego integrado
const gameState = {
    // Estado básico
    players: new Map(),
    bots: new Map(),
    qLearningBots: new Map(),
    resources: ['agua', 'comida', 'energia', 'materiales'],
    market: {
        agua: { price: 10, supply: 1000, demand: 800 },
        comida: { price: 15, supply: 800, demand: 900 },
        energia: { price: 20, supply: 600, demand: 700 },
        materiales: { price: 25, supply: 500, demand: 600 }
    },
    tick: 0,
    marketEvents: [],
    economicCycle: 'expansion',
    cycleCounter: 0,
    
    // Estado avanzado
    isAnalysisMode: false,
    isPaused: false,
    isRunning: true,
    lastAnalysis: null,
    priceHistory: new Map(),
    marketVolatility: 0,
    startTime: Date.now(),
    
    // Analytics y métricas
    analytics: {
        lastReport: {
            marketTrend: 'neutral',
            riskLevel: 'medium',
            cartelAlerts: 0,
            timestamp: Date.now()
        },
        cartelAlerts: [],
        riskLevel: 'medium',
        predictions: new Map(),
        performanceMetrics: new Map()
    }
};
setupAdminRoutes(app, gameState, io);


// Sistemas avanzados globales
let marketAnalytics = null;
let simulationManager = null;
let marketPredictor = null;
let riskManager = null;
let actionLogger = null;
let reputationSystem = null;

// Clase Player mejorada
class AdvancedPlayer {
    constructor(id, name, isBot = false) {
        this.id = id;
        this.name = name;
        this.money = 1000;
        this.inventory = { agua: 50, comida: 30, energia: 20, materiales: 10 };
        this.transactions = [];
        this.isBot = isBot;
        this.statistics = {
            totalProfit: 0,
            totalVolume: 0,
            successfulTrades: 0,
            gamesPlayed: 0,
            bestRank: 999,
            averageROI: 0
        };
        this.joinedAt = Date.now();
        this.riskProfile = null;
        this.tradingPattern = {
            preferredResources: [],
            averageTransactionSize: 0,
            riskTolerance: Math.random()
        };
    }

    getNetWorth() {
        let inventoryValue = 0;
        for (let resource in this.inventory) {
            if (gameState.market[resource]) {
                inventoryValue += this.inventory[resource] * gameState.market[resource].price;
            }
        }
        return this.money + inventoryValue;
    }

    calculateROI() {
        const currentNetWorth = this.getNetWorth();
        return ((currentNetWorth - 1000) / 1000) * 100;
    }

    buy(resource, quantity) {
        const market = gameState.market[resource];
        if (!market) return false;
        
        const totalCost = market.price * quantity;
        
        if (this.money >= totalCost && market.supply >= quantity && quantity > 0) {
            const previousNetWorth = this.getNetWorth();
            
            this.money -= totalCost;
            this.inventory[resource] += quantity;
            market.supply -= quantity;
            market.demand += Math.floor(quantity * 0.1);
            
            const transaction = {
                id: uuidv4(),
                type: 'buy',
                resource: resource,
                quantity: quantity,
                price: market.price,
                totalValue: totalCost,
                timestamp: Date.now(),
                tick: gameState.tick,
                netWorthBefore: previousNetWorth,
                netWorthAfter: this.getNetWorth()
            };
            
            this.transactions.push(transaction);
            this.updateStatistics(transaction);
            this.updateTradingPattern(resource, quantity);
            
            // Guardar en base de datos
            if (DatabaseManager) {
                DatabaseManager.saveTransaction(this.id, transaction);
            }
            
            return true;
        }
        return false;
    }

    sell(resource, quantity) {
        if (!this.inventory[resource] || this.inventory[resource] < quantity || quantity <= 0) {
            return false;
        }
        
        const market = gameState.market[resource];
        const totalRevenue = market.price * quantity;
        const previousNetWorth = this.getNetWorth();
        
        // Calcular profit (simplificado)
        const avgCost = this.transactions
            .filter(t => t.type === 'buy' && t.resource === resource)
            .reduce((sum, t, _, arr) => sum + t.price / (arr.length || 1), 0) || market.price;
        
        const profit = (market.price - avgCost) * quantity;
        
        this.money += totalRevenue;
        this.inventory[resource] -= quantity;
        market.supply += quantity;
        market.demand -= Math.floor(quantity * 0.1);
        
        const transaction = {
            id: uuidv4(),
            type: 'sell',
            resource: resource,
            quantity: quantity,
            price: market.price,
            totalValue: totalRevenue,
            timestamp: Date.now(),
            tick: gameState.tick,
            profit: profit,
            netWorthBefore: previousNetWorth,
            netWorthAfter: this.getNetWorth()
        };
        
        this.transactions.push(transaction);
        this.updateStatistics(transaction);
        this.updateTradingPattern(resource, quantity);
        
        // Guardar en base de datos
        if (DatabaseManager) {
            DatabaseManager.saveTransaction(this.id, transaction);
        }
        
        return true;
    }

    updateStatistics(transaction) {
        this.statistics.totalVolume += transaction.totalValue;
        
        if (transaction.profit && transaction.profit > 0) {
            this.statistics.totalProfit += transaction.profit;
            this.statistics.successfulTrades++;
        }
        
        // Calcular ROI promedio
        this.statistics.averageROI = this.calculateROI();
    }

    updateTradingPattern(resource, quantity) {
        // Actualizar recursos preferidos
        const resourceIndex = this.tradingPattern.preferredResources.findIndex(r => r.resource === resource);
        if (resourceIndex >= 0) {
            this.tradingPattern.preferredResources[resourceIndex].count++;
        } else {
            this.tradingPattern.preferredResources.push({ resource, count: 1 });
        }
        
        // Mantener solo top 3 recursos
        this.tradingPattern.preferredResources.sort((a, b) => b.count - a.count);
        this.tradingPattern.preferredResources = this.tradingPattern.preferredResources.slice(0, 3);
        
        // Actualizar tamaño promedio de transacción
        const totalQuantity = this.transactions.reduce((sum, t) => sum + t.quantity, 0);
        this.tradingPattern.averageTransactionSize = totalQuantity / this.transactions.length;
    }
}

// Bot inteligente mejorado
class EnhancedBot extends AdvancedPlayer {
    constructor(name, strategy = 'balanced') {
        super(`bot_${uuidv4()}`, name, true);
        this.strategy = strategy;
        this.lastAction = Date.now();
        this.patience = Math.random() * 20000 + 10000; // 10-30 segundos
        this.personality = this.generatePersonality();
        this.priceMemory = {};
        this.marketSentiment = 'neutral';
        this.confidenceLevel = 0.5;
        this.adaptationRate = 0.1;
    }

    generatePersonality() {
        return {
            riskTolerance: Math.random(),
            greed: Math.random() * 0.6 + 0.2,
            patience: Math.random() * 0.8 + 0.2,
            memory: Math.random() * 0.9 + 0.1,
            socialInfluence: Math.random() * 0.7,
            overconfidence: Math.random() * 0.5 + 0.1,
            adaptability: Math.random() * 0.8 + 0.2
        };
    }

    updateMarketSentiment() {
        // Analizar tendencias del mercado
        let bullishSignals = 0;
        let bearishSignals = 0;
        
        for (let resource in gameState.market) {
            const market = gameState.market[resource];
            const ratio = market.demand / market.supply;
            
            if (ratio > 1.2) bullishSignals++;
            if (ratio < 0.8) bearishSignals++;
        }
        
        if (bullishSignals > bearishSignals) {
            this.marketSentiment = 'bullish';
        } else if (bearishSignals > bullishSignals) {
            this.marketSentiment = 'bearish';
        } else {
            this.marketSentiment = 'neutral';
        }
        
        // Ajustar confianza basada en rendimiento reciente
        const recentTransactions = this.transactions.slice(-10);
        if (recentTransactions.length > 0) {
            const successRate = recentTransactions.filter(t => (t.profit || 0) > 0).length / recentTransactions.length;
            this.confidenceLevel = Math.max(0.1, Math.min(0.9, successRate));
        }
    }

    analyzeMarketOpportunity(resource) {
        const market = gameState.market[resource];
        const prices = this.priceMemory[resource] || [market.price];
        
        // Calcular métricas
        const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
        const priceDeviation = (market.price - avgPrice) / avgPrice;
        const supplyDemandRatio = market.demand / market.supply;
        
        // Puntuación de oportunidad
        let opportunityScore = 0;
        
        // Factor de precio
        if (this.strategy === 'contrarian') {
            opportunityScore += -priceDeviation * 0.4; // Comprar barato, vender caro
        } else {
            opportunityScore += priceDeviation * 0.3; // Seguir tendencia
        }
        
        // Factor de oferta/demanda
        opportunityScore += (supplyDemandRatio - 1) * 0.3;
        
        // Factor de sentimiento
        const sentimentMultiplier = {
            'bullish': 0.2,
            'neutral': 0,
            'bearish': -0.2
        };
        opportunityScore += sentimentMultiplier[this.marketSentiment];
        
        // Factor de confianza personal
        opportunityScore *= this.confidenceLevel;
        
        return {
            score: opportunityScore,
            action: opportunityScore > 0.1 ? 'buy' : opportunityScore < -0.1 ? 'sell' : 'hold',
            confidence: Math.abs(opportunityScore)
        };
    }

    executeStrategy() {
        if (Date.now() - this.lastAction < this.patience) {
            return null;
        }
        
        this.updateMarketSentiment();
        
        // Actualizar memoria de precios
        for (let resource in gameState.market) {
            if (!this.priceMemory[resource]) {
                this.priceMemory[resource] = [];
            }
            this.priceMemory[resource].push(gameState.market[resource].price);
            if (this.priceMemory[resource].length > 20) {
                this.priceMemory[resource].shift();
            }
        }
        
        // Evaluar oportunidades
        const opportunities = [];
        for (let resource of gameState.resources) {
            const opportunity = this.analyzeMarketOpportunity(resource);
            opportunities.push({ resource, ...opportunity });
        }
        
        // Ordenar por puntuación
        opportunities.sort((a, b) => b.score - a.score);
        
        // Seleccionar mejor oportunidad
        const bestOpportunity = opportunities[0];
        
        if (bestOpportunity.action === 'hold' || bestOpportunity.confidence < 0.2) {
            return null;
        }
        
        // Calcular cantidad basada en estrategia y personalidad
        const quantity = this.calculateTransactionQuantity(bestOpportunity);
        
        if (quantity <= 0) return null;
        
        return {
            action: bestOpportunity.action,
            resource: bestOpportunity.resource,
            quantity: quantity,
            confidence: bestOpportunity.confidence,
            reasoning: this.generateReasoning(bestOpportunity)
        };
    }

    calculateTransactionQuantity(opportunity) {
        const market = gameState.market[opportunity.resource];
        const baseQuantity = Math.floor(Math.random() * 20) + 5;
        
        // Ajustar por estrategia
        let multiplier = 1;
        
        switch (this.strategy) {
            case 'aggressive':
                multiplier = 1.5;
                break;
            case 'conservative':
                multiplier = 0.5;
                break;
            case 'adaptive':
                multiplier = this.confidenceLevel + 0.5;
                break;
        }
        
        // Ajustar por personalidad
        multiplier *= (this.personality.riskTolerance * 0.8 + 0.4);
        
        // Ajustar por confianza en la oportunidad
        multiplier *= opportunity.confidence;
        
        const quantity = Math.floor(baseQuantity * multiplier);
        
        // Verificar límites
        if (opportunity.action === 'buy') {
            const maxAffordable = Math.floor(this.money / market.price);
            const maxAvailable = market.supply;
            return Math.min(quantity, maxAffordable, maxAvailable);
        } else {
            return Math.min(quantity, this.inventory[opportunity.resource] || 0);
        }
    }

    generateReasoning(opportunity) {
        const sentimentText = {
            'bullish': 'mercado alcista',
            'bearish': 'mercado bajista',
            'neutral': 'mercado neutro'
        };
        
        const actionText = {
            'buy': 'Comprando',
            'sell': 'Vendiendo'
        };
        
        return `${actionText[opportunity.action]} ${opportunity.resource} en ${sentimentText[this.marketSentiment]}. ` +
               `Puntuación: ${opportunity.score.toFixed(2)}, Confianza: ${(opportunity.confidence * 100).toFixed(1)}%`;
    }

    performAction() {
        const decision = this.executeStrategy();
        if (!decision) return false;
        
        let success = false;
        const previousNetWorth = this.getNetWorth();
        
        if (decision.action === 'buy') {
            success = this.buy(decision.resource, decision.quantity);
        } else if (decision.action === 'sell') {
            success = this.sell(decision.resource, decision.quantity);
        }
        
        if (success) {
            this.lastAction = Date.now();
            this.patience = Math.random() * 20000 + 10000;
            
            const currentNetWorth = this.getNetWorth();
            const performance = currentNetWorth - previousNetWorth;
            
            // Adaptar estrategia basada en resultado
            this.adaptStrategy(performance);
            
            console.log(`🤖 ${this.name} (${this.strategy}): ${decision.action} ${decision.quantity} ${decision.resource} - ${decision.reasoning}`);
            
            // Notificar a clientes
            io.emit('bot_action', {
                botId: this.id,
                botName: this.name,
                action: decision.action,
                resource: decision.resource,
                quantity: decision.quantity,
                price: gameState.market[decision.resource].price,
                confidence: decision.confidence,
                reasoning: decision.reasoning,
                performance: performance,
                strategy: this.strategy,
                market: gameState.market
            });
            
            return true;
        }
        
        return false;
    }

    adaptStrategy(performance) {
        // Adaptación simple basada en rendimiento
        if (performance > 0) {
            this.confidenceLevel = Math.min(0.9, this.confidenceLevel + this.adaptationRate * 0.1);
        } else {
            this.confidenceLevel = Math.max(0.1, this.confidenceLevel - this.adaptationRate * 0.1);
        }
        
        // Ajustar paciencia basada en rendimiento
        if (performance < 0) {
            this.patience *= 1.1; // Ser más paciente después de pérdidas
        } else {
            this.patience *= 0.95; // Ser más activo después de ganancias
        }
    }
}

// Inicialización de sistemas
async function initializeSystems() {
    try {
        console.log('🔧 Inicializando sistemas avanzados...');
        
         try {
            if (DatabaseManager) {
                await DatabaseManager.initialize();
                console.log('✅ Base de datos inicializada');
            }
        } catch (error) {
            console.log('⚠️ Base de datos no disponible, desactivando funcionalidad BD');
            if (DatabaseManager) {
                DatabaseManager.disableDatabase();
            }
        }
        
        // Inicializar analytics
        marketAnalytics = new MarketAnalytics();
        console.log('✅ Market Analytics inicializado');
        
        // Inicializar predictor
        marketPredictor = new MarketPredictor();
        console.log('✅ Market Predictor inicializado');
        
        // Inicializar risk manager
        riskManager = new RiskManager();
        console.log('✅ Risk Manager inicializado');
        
        // Inicializar logger y reputación
        actionLogger = new ActionLogger();
        reputationSystem = new ReputationSystem();
        console.log('✅ Action Logger y Reputation System inicializados');
        
        // Inicializar simulation manager
        simulationManager = new SimulationController(gameState, io);
        console.log('✅ Simulation Manager inicializado');
        
        console.log('🎉 Todos los sistemas avanzados inicializados correctamente');

        marketAnalytics = new MarketAnalytics();
        marketPredictor = new MarketPredictor();
        riskManager = new RiskManager();
        actionLogger = new ActionLogger();
        reputationSystem = new ReputationSystem();
        simulationManager = new SimulationController(gameState, io);
        
        console.log('🎉 Sistemas avanzados inicializados');
        
    } catch (error) {
        console.error('❌ Error inicializando sistemas:', error);
        console.log('⚠️ Continuando con funcionalidad básica');
    }
}

// Crear bots estándar
function createStandardBots() {
    const botConfigs = [
        { name: 'Warren_Bot', strategy: 'conservative' },
        { name: 'Wolf_Bot', strategy: 'aggressive' },
        { name: 'Zen_Bot', strategy: 'balanced' },
        { name: 'Adapt_Bot', strategy: 'adaptive' },
        { name: 'Contra_Bot', strategy: 'contrarian' }
    ];
    
    botConfigs.forEach(config => {
        const bot = new EnhancedBot(config.name, config.strategy);
        gameState.bots.set(bot.id, bot);
        console.log(`🤖 Bot estándar creado: ${bot.name} (${bot.strategy})`);
    });
}

// Crear bots Q-Learning
// En app-integrated.js, modificar la creación de Q-Learning bots
function createQLearningBots() {
    if (!simulationManager) {
        console.warn('⚠️ SimulationManager no disponible, saltando Q-Learning bots');
        return;
    }
    
    const qlBotConfigs = [
        { name: 'AlphaAI', strategy: 'q_learning_aggressive' },
        { name: 'BetaAI', strategy: 'q_learning_conservative' },
        { name: 'GammaAI', strategy: 'q_learning_adaptive' },
        { name: 'DeltaAI', strategy: 'q_learning_contrarian' }
    ];
    
    qlBotConfigs.forEach(config => {
        try {
            const bot = simulationManager.addQLearningBot(config.name, config.strategy);
            
            // Método seguro para calcular net worth
            bot.calculateSafeNetWorth = function(gameState) {
                try {
                    return this.getNetWorth(gameState);
                } catch (error) {
                    console.warn(`⚠️ Error calculating net worth for ${this.name}: ${error.message}`);
                    return this.money;
                }
            };
            
            // Inicializar propiedades de observación
            bot.lastThoughtProcess = null;
            bot.isBeingWatched = false;
            
            // Implementar el sistema de pensamiento mejorado
            bot.makeDecisionWithThinking = function(marketState, io = null) {
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
                            q_table_size: this.qTable ? this.qTable.size : 0
                        }
                    });
                    
                    // Paso 2: Codificar estado del mercado
                    const encodedState = this.encodeState(marketState);
                    thinkingProcess.decisionProcess.push({
                        step: 'encode_market_state',
                        explanation: 'Convirtiendo condiciones del mercado a representación discreta',
                        result: {
                            encoded_state: encodedState.substring(0, 80) + '...',
                            market_cycle: marketState.economicCycle
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
                    
                    // Paso 4: Seleccionar acción
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
                    
                    // Emitir si está siendo observado
                    if (this.isBeingWatched && io) {
                        console.log(`🧠 Emitiendo proceso de pensamiento para ${this.name}`);
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
            };
            
            // NO intentar registrar en base de datos inmediatamente
            // El registro se hará de manera lazy cuando sea necesario
            
            gameState.qLearningBots.set(bot.id, bot);
            console.log(`🧠 Q-Learning Bot creado: ${bot.name} (${bot.strategy})`);
        } catch (error) {
            console.error(`❌ Error creando Q-Learning bot ${config.name}:`, error.message);
        }
    });
}


// Ejecutar bots estándar
function runStandardBots() {
    gameState.bots.forEach(bot => {
        try {
            bot.performAction();
        } catch (error) {
            console.error(`❌ Error en bot ${bot.name}:`, error.message);
        }
    });
}

// Ejecutar bots Q-Learning
// En app-integrated.js, mejorar la función de ejecución de bots
function runQLearningBots() {
    if (simulationManager && !gameState.isPaused) {
        try {
            gameState.qLearningBots.forEach(bot => {
                try {
                    const previousNetWorth = bot.calculateSafeNetWorth(gameState);
                    
                    // Usar el sistema de pensamiento mejorado si el bot está siendo observado
                    let decision;
                    if (bot.isBeingWatched && bot.makeDecisionWithThinking) {
                        decision = bot.makeDecisionWithThinking(gameState, io);
                    } else {
                        decision = bot.makeDecision(gameState);
                    }
                    
                    if (decision && decision.action) {
                        const success = bot.executeAction(decision, gameState);
                        
                        if (success) {
                            const currentNetWorth = bot.calculateSafeNetWorth(gameState);
                            const performance = currentNetWorth - previousNetWorth;
                            
                            // Emitir acción del bot si no es hold
                            if (decision.action.type !== 'hold') {
                                const actionData = {
                                    botId: bot.id,
                                    botName: bot.name,
                                    action: decision.action.type,
                                    resource: decision.action.resource,
                                    quantity: decision.action.quantity,
                                    price: gameState.market[decision.action.resource]?.price || 0,
                                    confidence: decision.confidence,
                                    reasoning: decision.reasoning,
                                    market: gameState.market,
                                    performance: performance,
                                    isObserved: bot.isBeingWatched || false
                                };
                                
                                io.emit('bot_action', actionData);
                                
                                // Si el bot está siendo observado, emitir información adicional
                                if (bot.isBeingWatched) {
                                    io.emit('observed_bot_action', {
                                        ...actionData,
                                        thoughtProcess: bot.lastThoughtProcess,
                                        adaptationData: {
                                            qTableGrowth: bot.qTable ? bot.qTable.size : 0,
                                            explorationRate: bot.epsilon || 0,
                                            confidence: decision.confidence,
                                            marketConditions: {
                                                cycle: gameState.economicCycle,
                                                volatility: gameState.marketVolatility,
                                                tick: gameState.tick
                                            }
                                        }
                                    });
                                }
                            }
                        }
                    }
                } catch (botError) {
                    console.error(`❌ Error ejecutando bot ${bot.name}:`, botError.message);
                }
            });
        } catch (error) {
            console.error('❌ Error general ejecutando Q-Learning bots:', error.message);
        }
    }
}

// Actualizar precios de mercado
function updateMarketPrices() {
    for (let resource of gameState.resources) {
        const market = gameState.market[resource];
        
        // Algoritmo de precios mejorado
        const ratio = market.demand / market.supply;
        const baseChange = (ratio - 1) * 0.08;
        
        // Factor de ciclo económico
        const cycleMultipliers = {
            expansion: 1.02,
            peak: 1.01,
            contraction: 0.98,
            trough: 0.97
        };
        const cycleMultiplier = cycleMultipliers[gameState.economicCycle] || 1.0;
        
        // Volatilidad
        const volatility = (Math.random() - 0.5) * 0.06; // ±3%
        
        // Aplicar cambios
        const totalChange = (baseChange + volatility) * cycleMultiplier;
        market.price = Math.max(1, Math.round(market.price * (1 + totalChange)));
        
        // Regeneración natural con variabilidad
        const supplyChange = Math.floor(Math.random() * 30) - 15;
        const demandChange = Math.floor(Math.random() * 35) - 17;
        
        market.supply += supplyChange;
        market.demand += demandChange;
        
        // Límites dinámicos
        market.supply = Math.max(100, Math.min(5000, market.supply));
        market.demand = Math.max(100, Math.min(5000, market.demand));
        
        // Actualizar historial de precios
        if (!gameState.priceHistory.has(resource)) {
            gameState.priceHistory.set(resource, []);
        }
        
        const history = gameState.priceHistory.get(resource);
        history.push({
            price: market.price,
            supply: market.supply,
            demand: market.demand,
            tick: gameState.tick,
            timestamp: Date.now()
        });
        
        if (history.length > 100) {
            history.shift();
        }
    }
    
    // Calcular volatilidad del mercado
    gameState.marketVolatility = calculateMarketVolatility();
}

function calculateMarketVolatility() {
    let totalVolatility = 0;
    let resourceCount = 0;
    
    gameState.priceHistory.forEach((history, resource) => {
        if (history.length >= 5) {
            const recentPrices = history.slice(-5).map(h => h.price);
            const avgPrice = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
            
            const variance = recentPrices.reduce((sum, price) => {
                return sum + Math.pow(price - avgPrice, 2);
            }, 0) / recentPrices.length;
            
            totalVolatility += Math.sqrt(variance) / avgPrice;
            resourceCount++;
        }
    });
    
    return resourceCount > 0 ? totalVolatility / resourceCount : 0;
}

// Generar eventos de mercado
// Función corregida para generar eventos de mercado
// Reemplaza la función generateMarketEvent() en tu app-integrated.js

function generateMarketEvent() {
    const events = [
        { 
            type: 'drought', 
            name: 'Sequía Severa', 
            resource: 'agua', 
            supply: -0.25, 
            demand: 0.2, 
            probability: 0.15 
        },
        { 
            type: 'harvest', 
            name: 'Cosecha Excepcional', 
            resource: 'comida', 
            supply: 0.35, 
            demand: -0.1, 
            probability: 0.2 
        },
        { 
            type: 'blackout', 
            name: 'Crisis Energética', 
            resource: 'energia', 
            supply: -0.2, 
            demand: 0.25, 
            probability: 0.12 
        },
        { 
            type: 'discovery', 
            name: 'Nuevo Yacimiento', 
            resource: 'materiales', 
            supply: 0.3, 
            demand: 0.05, 
            probability: 0.15 
        },
        { 
            type: 'innovation', 
            name: 'Avance Tecnológico', 
            resource: 'energia', 
            supply: 0.2, 
            demand: -0.15, 
            probability: 0.1 
        }
    ];
    
    const selectedEvent = events[Math.floor(Math.random() * events.length)];
    
    if (Math.random() < selectedEvent.probability) {
        // Seleccionar recurso afectado
        const affectedResource = selectedEvent.resource || 
            gameState.resources[Math.floor(Math.random() * gameState.resources.length)];
        const market = gameState.market[affectedResource];
        
        // Aplicar efectos
        market.supply = Math.floor(market.supply * (1 + selectedEvent.supply));
        market.demand = Math.floor(market.demand * (1 + selectedEvent.demand));
        
        // Asegurar límites
        market.supply = Math.max(100, Math.min(5000, market.supply));
        market.demand = Math.max(100, Math.min(5000, market.demand));
        
        // 🔧 CORRECCIÓN: Crear objeto de evento con effect válido
        const eventData = {
            type: selectedEvent.type,
            name: selectedEvent.name,
            resource: affectedResource,
            effect: {  // ✅ Siempre crear object válido
                supply: selectedEvent.supply,
                demand: selectedEvent.demand,
                appliedSupplyChange: market.supply - originalSupply,
                appliedDemandChange: market.demand - originalDemand,
                originalSupply: originalSupply,
                originalDemand: originalDemand
            },
            tick: gameState.tick,
            timestamp: Date.now(),
            severity: Math.abs(selectedEvent.supply) + Math.abs(selectedEvent.demand)
        };
        
        gameState.marketEvents.push(eventData);
        
        // Limpiar eventos viejos
        if (gameState.marketEvents.length > 10) {
            gameState.marketEvents.shift();
        }
        
        // 🔧 CORRECCIÓN: Guardar en BD con manejo de errores mejorado
        if (DatabaseManager && DatabaseManager.saveMarketEvent) {
            DatabaseManager.saveMarketEvent(eventData, gameState.tick).catch(error => {
                console.warn('⚠️ No se pudo guardar evento en BD:', error.message);
            });
        }
        
        return eventData;
    }
    
    return null;
}

// Simular ciclos económicos
function simulateEconomicCycle() {
    gameState.cycleCounter++;
    
    if (gameState.cycleCounter >= 15) { // Cambiar cada 15 ticks
        const cycles = ['expansion', 'peak', 'contraction', 'trough'];
        const currentIndex = cycles.indexOf(gameState.economicCycle);
        gameState.economicCycle = cycles[(currentIndex + 1) % cycles.length];
        gameState.cycleCounter = 0;
        
        console.log(`🔄 Cambio de ciclo económico: ${gameState.economicCycle}`);
        
        // Aplicar efectos del ciclo
        const effects = {
            expansion: { supply: 1.08, demand: 1.12 },
            peak: { supply: 1.02, demand: 1.18 },
            contraction: { supply: 0.92, demand: 0.88 },
            trough: { supply: 0.85, demand: 0.82 }
        };
        
        const effect = effects[gameState.economicCycle];
        for (let resource of gameState.resources) {
            const market = gameState.market[resource];
            market.supply = Math.floor(market.supply * effect.supply);
            market.demand = Math.floor(market.demand * effect.demand);
            
            // Asegurar límites
            market.supply = Math.max(100, Math.min(5000, market.supply));
            market.demand = Math.max(100, Math.min(5000, market.demand));
        }
    }
}

// Analytics avanzados
async function runAdvancedAnalytics() {
    try {
        // Análisis básico de tendencias
        let totalPriceChange = 0;
        const basePrices = { agua: 10, comida: 15, energia: 20, materiales: 25 };
        
        for (let resource of gameState.resources) {
            const currentPrice = gameState.market[resource].price;
            const basePrice = basePrices[resource];
            totalPriceChange += (currentPrice - basePrice) / basePrice;
        }
        
        const avgChange = totalPriceChange / gameState.resources.length;
        let marketTrend = 'neutral';
        if (avgChange > 0.15) marketTrend = 'bullish';
        else if (avgChange < -0.15) marketTrend = 'bearish';
        
        // Calcular riesgo basado en volatilidad
        let riskLevel = 'medium';
        if (gameState.marketVolatility < 0.1) riskLevel = 'low';
        else if (gameState.marketVolatility < 0.2) riskLevel = 'medium';
        else if (gameState.marketVolatility < 0.3) riskLevel = 'high';
        else riskLevel = 'extreme';
        
        // Actualizar analytics básicos
        gameState.analytics.lastReport = {
            marketTrend: marketTrend,
            riskLevel: riskLevel,
            cartelAlerts: gameState.analytics.cartelAlerts.length,
            timestamp: Date.now(),
            volatility: gameState.marketVolatility,
            avgPriceChange: avgChange
        };
        
        // Analytics avanzados si están disponibles
        if (marketAnalytics) {
            try {
                const detailedReport = await marketAnalytics.generateMarketReport();
                if (detailedReport) {
                    gameState.analytics.lastReport.detailed = detailedReport;
                }
            } catch (error) {
                console.error('Error en analytics detallados:', error.message);
            }
        }
        
        // Predicciones de mercado
        if (marketPredictor) {
            for (let resource of gameState.resources) {
                const history = gameState.priceHistory.get(resource) || [];
                if (history.length >= 10) {
                    try {
                        const prediction = marketPredictor.predict(resource, history, 5);
                        gameState.analytics.predictions.set(resource, prediction);
                    } catch (error) {
                        console.error(`Error en predicción de ${resource}:`, error.message);
                    }
                }
            }
        }
        
        // Análisis de riesgo
        if (riskManager) {
            // Evaluar riesgo de bots estándar
            gameState.bots.forEach(bot => {
                try {
                    const riskProfile = riskManager.assessBotRisk(bot, gameState);
                    bot.riskProfile = riskProfile;
                } catch (error) {
                    console.error(`Error evaluando riesgo de ${bot.name}:`, error.message);
                }
            });
            
            // Evaluar riesgo de Q-Learning bots
            gameState.qLearningBots.forEach(bot => {
                try {
                    const riskProfile = riskManager.assessBotRisk(bot, gameState);
                    bot.riskProfile = riskProfile;
                } catch (error) {
                    console.error(`Error evaluando riesgo de ${bot.name}:`, error.message);
                }
            });
        }
        
        // Detección de carteles simplificada
        const cartelSignals = detectBasicCartelActivity();
        gameState.analytics.cartelAlerts = cartelSignals;
        
        console.log(`📊 Analytics ejecutados - Tendencia: ${marketTrend}, Riesgo: ${riskLevel}, Volatilidad: ${(gameState.marketVolatility * 100).toFixed(2)}%`);
        
    } catch (error) {
        console.error('❌ Error en analytics avanzados:', error.message);
    }
}

// Detección básica de carteles
function detectBasicCartelActivity() {
    const alerts = [];
    const currentTime = Date.now();
    
    // Limpiar alertas viejas (más de 10 minutos)
    gameState.analytics.cartelAlerts = gameState.analytics.cartelAlerts.filter(
        alert => currentTime - alert.timestamp < 600000
    );
    
    // Detectar patrones sospechosos simples
    for (let resource of gameState.resources) {
        const market = gameState.market[resource];
        const history = gameState.priceHistory.get(resource) || [];
        
        if (history.length >= 10) {
            const recentPrices = history.slice(-10).map(h => h.price);
            const priceChanges = [];
            
            for (let i = 1; i < recentPrices.length; i++) {
                const change = Math.abs(recentPrices[i] - recentPrices[i-1]) / recentPrices[i-1];
                priceChanges.push(change);
            }
            
            const avgChange = priceChanges.reduce((a, b) => a + b, 0) / priceChanges.length;
            const extremeChanges = priceChanges.filter(change => change > avgChange * 3).length;
            
            if (extremeChanges >= 3) {
                alerts.push({
                    resource: resource,
                    type: 'price_manipulation',
                    riskScore: extremeChanges / priceChanges.length,
                    timestamp: currentTime,
                    details: `${extremeChanges} cambios extremos de precio detectados`
                });
            }
        }
    }
    
    return alerts;
}

// Función auxiliar para obtener muestra de Q-Table
function getQTableSample(bot, sampleSize = 10) {
    if (!bot.qTable || bot.qTable.size === 0) {
        return {
            totalEntries: 0,
            topEntries: [],
            averageQValue: 0
        };
    }
    
    const qTableEntries = Array.from(bot.qTable.entries());
    const sample = qTableEntries
        .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])) // Sort by Q-value magnitude
        .slice(0, sampleSize)
        .map(([stateAction, qValue]) => {
            // Parse state-action key
            const parts = stateAction.split('#');
            const actionPart = parts[1] || stateAction;
            const actionTokens = actionPart.split(':');
            
            return {
                action: {
                    type: actionTokens[0] || 'unknown',
                    resource: actionTokens[1] || 'unknown',
                    quantity: parseInt(actionTokens[2]) || 0
                },
                qValue: qValue.toFixed(4)
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
function generatePauseAnalysis() {
    return {
        type: 'pause_analysis',
        timestamp: Date.now(),
        tick: gameState.tick,
        summary: {
            totalBots: gameState.qLearningBots.size,
            averagePerformance: calculateAveragePerformance(),
            marketVolatility: gameState.marketVolatility || 0
        },
        botPerformances: getBotPerformanceSummary(),
        marketSnapshot: {
            prices: Object.fromEntries(
                gameState.resources.map(r => [r, gameState.market[r].price])
            ),
            cycle: gameState.economicCycle
        }
    };
}

// Función para generar análisis final
function generateFinalAnalysis() {
    return {
        type: 'final_analysis',
        timestamp: Date.now(),
        totalTicks: gameState.tick,
        summary: {
            totalBots: gameState.qLearningBots.size,
            totalTransactions: getTotalTransactionCount(),
            marketEvolution: analyzeMarketEvolution()
        },
        winners: getTopPerformers(5),
        finalPerformances: getBotPerformanceSummary()
    };
}

// Función para generar comparación de bots
function generateBotComparison() {
    const comparison = {
        timestamp: Date.now(),
        bots: {},
        rankings: {
            byPerformance: [],
            byLearning: []
        }
    };

    gameState.qLearningBots.forEach((bot, botId) => {
        const netWorth = bot.calculateSafeNetWorth ? 
            bot.calculateSafeNetWorth(gameState) : bot.money;
        const performance = ((netWorth - 1000) / 1000 * 100);
        
        comparison.bots[botId] = {
            name: bot.name,
            strategy: bot.strategy,
            performance: performance.toFixed(2) + '%',
            qTableSize: bot.qTable ? bot.qTable.size : 0,
            transactions: bot.transactions.length
        };
    });

    // Generar rankings
    comparison.rankings.byPerformance = Object.entries(comparison.bots)
        .sort((a, b) => parseFloat(b[1].performance) - parseFloat(a[1].performance))
        .map(([id, bot]) => ({ id, name: bot.name, value: bot.performance }));

    comparison.rankings.byLearning = Object.entries(comparison.bots)
        .sort((a, b) => b[1].qTableSize - a[1].qTableSize)
        .map(([id, bot]) => ({ id, name: bot.name, value: bot.qTableSize }));

    return comparison;
}

// Funciones auxiliares
function calculateAveragePerformance() {
    if (gameState.qLearningBots.size === 0) return 0;
    
    let totalPerformance = 0;
    gameState.qLearningBots.forEach(bot => {
        const netWorth = bot.calculateSafeNetWorth ? 
            bot.calculateSafeNetWorth(gameState) : bot.money;
        const performance = ((netWorth - 1000) / 1000 * 100);
        totalPerformance += performance;
    });
    
    return totalPerformance / gameState.qLearningBots.size;
}

function getBotPerformanceSummary() {
    const summary = {};
    
    gameState.qLearningBots.forEach((bot, botId) => {
        const netWorth = bot.calculateSafeNetWorth ? 
            bot.calculateSafeNetWorth(gameState) : bot.money;
        
        summary[botId] = {
            name: bot.name,
            strategy: bot.strategy,
            netWorth: netWorth,
            performance: ((netWorth - 1000) / 1000 * 100).toFixed(2) + '%',
            transactions: bot.transactions.length,
            qTableSize: bot.qTable ? bot.qTable.size : 0
        };
    });
    
    return summary;
}

function getTotalTransactionCount() {
    let total = 0;
    
    gameState.players.forEach(player => {
        total += player.transactions.length;
    });
    
    gameState.bots.forEach(bot => {
        total += bot.transactions.length;
    });
    
    gameState.qLearningBots.forEach(bot => {
        total += bot.transactions.length;
    });
    
    return total;
}

function analyzeMarketEvolution() {
    const evolution = {};
    const basePrices = { agua: 10, comida: 15, energia: 20, materiales: 25 };
    
    Object.entries(basePrices).forEach(([resource, basePrice]) => {
        const currentPrice = gameState.market[resource]?.price || basePrice;
        const change = ((currentPrice - basePrice) / basePrice * 100).toFixed(2);
        
        evolution[resource] = {
            initialPrice: basePrice,
            finalPrice: currentPrice,
            changePercent: change + '%'
        };
    });
    
    return evolution;
}

function getTopPerformers(count = 5) {
    const allParticipants = [
        ...Array.from(gameState.players.values()),
        ...Array.from(gameState.bots.values()),
        ...Array.from(gameState.qLearningBots.values())
    ];
    
    return allParticipants
        .map(participant => {
            let netWorth;
            
            if (gameState.qLearningBots.has(participant.id) || participant.isBot) {
                netWorth = participant.calculateSafeNetWorth ? 
                    participant.calculateSafeNetWorth(gameState) : 
                    participant.getNetWorth(gameState);
            } else {
                netWorth = participant.getNetWorth();
            }
            
            const roi = ((netWorth - 1000) / 1000 * 100);
            
            return {
                id: participant.id,
                name: participant.name,
                type: gameState.qLearningBots.has(participant.id) ? 'Q-Learning' :
                      participant.isBot ? 'Standard Bot' : 'Human',
                netWorth: netWorth,
                roi: roi
            };
        })
        .sort((a, b) => b.roi - a.roi)
        .slice(0, count);
}

// Tick económico principal
async function economicTick() {
    try {
        gameState.tick++;
        console.log(`\n📊 === TICK ECONÓMICO #${gameState.tick} ===`);
        
        let event = null;
        if (!gameState.isPaused) {
            // 1. Procesar eventos progresivos activos PRIMERO
            const activeProgressiveEvents = processActiveProgressiveEvents(gameState, io);
            
            if (activeProgressiveEvents > 0) {
                console.log(`🌍 Procesando ${activeProgressiveEvents} eventos progresivos activos`);
            }
            
            // 2. Ejecutar bots estándar
            runStandardBots();
            
            // 3. Ejecutar bots Q-Learning (con observación mejorada)
            runQLearningBots();
            
            // 4. Generar eventos normales (solo si no hay eventos progresivos activos)
            if (activeProgressiveEvents === 0) {
                event = generateMarketEvent();
            }
            
            // 5. Actualizar mercado
            updateMarketPrices();
            
            // 6. Simular ciclos
            simulateEconomicCycle();
            
            // 7. Ejecutar analytics cada 3 ticks
            if (gameState.tick % 3 === 0) {
                await runAdvancedAnalytics();
            }
            
            // 8. Guardar historial de precios en BD
            if (DatabaseManager && gameState.tick % 5 === 0) {
                try {
                    DatabaseManager.savePriceHistory(gameState.market, gameState.tick, gameState.economicCycle);
                } catch (error) {
                    console.error('Error guardando historial:', error.message);
                }
            }
        }
        
        // 9. Enviar actualizaciones a clientes con información de eventos progresivos
        let observationStatus;
        try {
            observationStatus = getObservationStatus();
        } catch (error) {
            console.warn('⚠️ Error obteniendo estado de observación:', error.message);
            // Crear observationStatus por defecto si falla
            observationStatus = {
                activeEvents: [],
                observedBots: [],
                observationEnabled: false
            };
        }
        
        const tickData = {
            tick: gameState.tick,
            market: gameState.market,
            event: event,
            cycle: gameState.economicCycle,
            marketEvents: gameState.marketEvents.slice(-3),
            volatility: gameState.marketVolatility,
            isPaused: gameState.isPaused,
            analytics: {
                marketTrend: gameState.analytics.lastReport.marketTrend,
                riskLevel: gameState.analytics.lastReport.riskLevel,
                cartelAlerts: gameState.analytics.cartelAlerts.length,
                predictions: Object.fromEntries(gameState.analytics.predictions)
            },
            botCounts: {
                standard: gameState.bots.size,
                qLearning: gameState.qLearningBots.size,
                total: gameState.bots.size + gameState.qLearningBots.size
            },
            // Información de eventos progresivos y observación
            progressiveEvents: {
                active: (observationStatus.activeEvents && observationStatus.activeEvents.length) || 0,
                observedBots: (observationStatus.observedBots && observationStatus.observedBots.length) || 0,
                observationEnabled: observationStatus.observationEnabled || false
            }
        };
        
        io.emit('economic_tick', tickData);
        
        // Log del estado con información de eventos progresivos
        const prices = gameState.resources.map(r => `${r}:${gameState.market[r].price}`).join(', ');
        console.log(`💰 Precios: ${prices}`);
        console.log(`📈 Ciclo: ${gameState.economicCycle} | Volatilidad: ${(gameState.marketVolatility * 100).toFixed(2)}%`);
        console.log(`🤖 Bots: ${gameState.bots.size} estándar, ${gameState.qLearningBots.size} Q-Learning`);
        console.log(`👥 Jugadores: ${gameState.players.size} humanos`);
        
        // 🔧 CORRECCIÓN: Validar antes de usar
        if (observationStatus.activeEvents && observationStatus.activeEvents.length > 0) {
            console.log(`🌍 Eventos progresivos activos: ${observationStatus.activeEvents.length}`);
        }
        
        if (observationStatus.observationEnabled) {
            console.log(`👁️ Bots observados: ${observationStatus.observedBots.length}`);
        }
        
        if (event) {
            console.log(`🌍 Evento normal: ${event.name} afecta ${event.resource}`);
        }
        
        if (gameState.analytics.cartelAlerts.length > 0) {
            console.log(`🚨 Alertas de cartel: ${gameState.analytics.cartelAlerts.length}`);
        }
        
    } catch (error) {
        console.error('❌ Error en tick económico:', error);
    }
}

// WebSocket connections
io.on('connection', (socket) => {
    console.log(`🔌 Usuario conectado: ${socket.id}`);
socket.isAdmin = false;
    socket.userType = 'guest';
    socket.playerName = null;

    // ====================================
    // HANDLER PARA JUGADORES NORMALES
    // ====================================
    socket.on('register', async (playerData) => {
        try {
            console.log(`👤 Solicitud de registro de jugador:`, playerData);
            
            // Verificar que no sea un admin intentando registrarse como jugador
            if (socket.isAdmin) {
                console.warn(`⚠️ Admin ${socket.id} intentando registrarse como jugador`);
                socket.emit('error', { message: 'Los administradores no pueden registrarse como jugadores' });
                return;
            }

            // Validar datos del jugador
            if (!playerData.name || playerData.name.trim().length === 0) {
                console.warn(`⚠️ Nombre de jugador inválido:`, playerData);
                socket.emit('error', { message: 'Nombre de jugador requerido' });
                return;
            }

            const playerName = playerData.name.trim();
            console.log(`✅ Creando jugador: ${playerName}`);
            
            // Crear jugador
            const player = new AdvancedPlayer(socket.id, playerName);
            gameState.players.set(socket.id, player);
            
            // Marcar socket como jugador
            socket.userType = 'player';
            socket.playerName = playerName;
            
            console.log(`📝 Jugador ${playerName} agregado al estado del juego`);
            
            // Registrar en base de datos si está disponible
            if (DatabaseManager && DatabaseManager.ensurePlayerExists) {
                try {
                    await DatabaseManager.ensurePlayerExists(socket.id, playerName, false);
                    console.log(`💾 Jugador ${playerName} registrado en BD`);
                } catch (dbError) {
                    console.warn(`⚠️ Error BD para ${playerName}:`, dbError.message);
                    // Continuar sin BD
                }
            }
            
            // Enviar confirmación de registro exitoso
            socket.emit('registered', {
                player: player,
                gameState: {
                    market: gameState.market,
                    tick: gameState.tick,
                    economicCycle: gameState.economicCycle,
                    analytics: gameState.analytics.lastReport,
                    volatility: gameState.marketVolatility,
                    isPaused: gameState.isPaused,
                    botCounts: {
                        standard: gameState.bots.size,
                        qLearning: gameState.qLearningBots.size
                    }
                }
            });
            
            // Notificar a otros jugadores
            socket.broadcast.emit('player_joined', {
                player: { id: player.id, name: player.name }
            });
            
            console.log(`🎉 Jugador ${playerName} registrado exitosamente`);
            
        } catch (error) {
            console.error(`❌ Error registrando jugador:`, error);
            socket.emit('error', { 
                message: 'Error interno del servidor al registrar jugador'
            });
        }
    });

    // ====================================
    // HANDLER PARA ADMINISTRADORES
    // ====================================
    socket.on('admin_connect', (data) => {
        try {
            console.log(`👑 Solicitud de autenticación admin:`, data);
            
            const validCredentials = ['admin', 'administrator', 'ADMIN', 'root', 'superuser'];
            
            if (!data.username || !validCredentials.includes(data.username)) {
                console.warn(`⚠️ Credenciales admin inválidas: ${data.username}`);
                socket.emit('admin_authentication_failed', {
                    message: 'Credenciales de administrador inválidas'
                });
                return;
            }
            
            // Marcar como admin
            socket.isAdmin = true;
            socket.userType = 'admin';
            socket.adminName = data.username;
            
            console.log(`✅ Administrador autenticado: ${data.username}`);
            
            // Confirmar autenticación
            socket.emit('admin_authenticated', {
                success: true,
                username: data.username,
                permissions: ['full_access'],
                timestamp: Date.now()
            });
            
            // Enviar estado inicial de la simulación
            setTimeout(() => {
                socket.emit('admin_simulation_status', {
                    totalBots: gameState.bots.size + gameState.qLearningBots.size,
                    activePlayers: gameState.players.size,
                    currentTick: gameState.tick,
                    isRunning: gameState.isRunning,
                    isPaused: gameState.isPaused,
                    volatility: gameState.marketVolatility || 0,
                    economicCycle: gameState.economicCycle || 'expansion'
                });
            }, 500);
            
        } catch (error) {
            console.error(`❌ Error en autenticación admin:`, error);
            socket.emit('admin_authentication_failed', {
                message: 'Error interno del servidor'
            });
        }
    
});

    socket.on('trade', async (tradeData) => {
    try {
        const player = gameState.players.get(socket.id);
        if (!player) {
            socket.emit('trade_result', { success: false, message: 'Jugador no encontrado' });
            return;
        }

        const { action, resource, quantity } = tradeData;
        
        // Validaciones...
        if (!gameState.resources.includes(resource)) {
            socket.emit('trade_result', { success: false, message: 'Recurso no válido' });
            return;
        }
        
        if (quantity <= 0 || quantity > 1000) {
            socket.emit('trade_result', { success: false, message: 'Cantidad inválida (1-1000)' });
            return;
        }

        let success = false;
        let message = '';
        
        if (action === 'buy') {
            success = player.buy(resource, quantity);
            message = success ? 'Compra exitosa' : 'Fondos insuficientes o stock agotado';
        } else if (action === 'sell') {
            success = player.sell(resource, quantity);
            message = success ? 'Venta exitosa' : 'Inventario insuficiente';
        }

        if (success) {
            // Actualizar métricas
            gameState.analytics.performanceMetrics.set(player.id, {
                netWorth: player.getNetWorth(),
                roi: player.calculateROI(),
                lastUpdate: Date.now()
            });
            
            socket.emit('trade_result', {
                success: true,
                message: message,
                player: player,
                market: gameState.market,
                transaction: player.transactions[player.transactions.length - 1],
                performance: {
                    netWorth: player.getNetWorth(),
                    roi: player.calculateROI()
                }
            });
            
            updateMarketPrices();
            io.emit('market_update', gameState.market);
            
            console.log(`💰 ${player.name}: ${action} ${quantity} ${resource} at ${gameState.market[resource].price}`);
            
            // 🔧 GUARDAR EN BD CON EL NOMBRE DEL JUGADOR
            if (DatabaseManager && DatabaseManager.saveTransaction) {
                const transaction = player.transactions[player.transactions.length - 1];
                DatabaseManager.saveTransaction(player.id, transaction, player.name).catch(error => {
                    console.warn('⚠️ No se pudo guardar transacción en BD:', error.message);
                });
            }
            
        } else {
            socket.emit('trade_result', { success: false, message });
        }
        
    } catch (error) {
        console.error('❌ Error en transacción:', error);
        socket.emit('trade_result', { success: false, message: 'Error interno del servidor' });
    }
});

    socket.on('get_leaderboard', () => {
        try {
            const allPlayers = new Map([...gameState.players, ...gameState.bots, ...gameState.qLearningBots]);
            const leaderboard = Array.from(allPlayers.values())
                .map(player => {
                    const isQBot = gameState.qLearningBots.has(player.id);
                    
                    // 🔧 CALCULAR NET WORTH DE FORMA SEGURA
                    let netWorth;
                    try {
                        if (isQBot || player.isBot) {
                            // Para bots, usar método seguro que pasa gameState
                            netWorth = player.calculateSafeNetWorth ? 
                                player.calculateSafeNetWorth(gameState) : 
                                player.getNetWorth(gameState);
                        } else {
                            // Para jugadores humanos, usar método normal
                            netWorth = player.getNetWorth();
                        }
                    } catch (error) {
                        console.warn(`⚠️ Error calculating net worth for ${player.name}: ${error.message}`);
                        netWorth = player.money || 1000; // Fallback
                    }
                    
                    return {
                        id: player.id,
                        name: player.name,
                        netWorth: netWorth,
                        money: player.money,
                        isBot: player.isBot || false,
                        botType: isQBot ? 'Q-Learning' : player.isBot ? 'Standard' : 'Human',
                        strategy: player.strategy || 'human',
                        transactions: player.transactions ? player.transactions.length : 0,
                        roi: player.calculateROI ? player.calculateROI().toFixed(2) + '%' : 
                             (((netWorth - 1000) / 1000 * 100).toFixed(2) + '%'),
                        riskLevel: player.riskProfile ? player.riskProfile.riskLevel : 'unknown',
                        lastActive: player.lastAction || player.joinedAt
                    };
                })
                .sort((a, b) => b.netWorth - a.netWorth)
                .map((player, index) => ({ ...player, rank: index + 1 }));
            
            socket.emit('leaderboard', leaderboard);
            
        } catch (error) {
            console.error('❌ Error obteniendo leaderboard:', error);
            socket.emit('error', { message: 'Error obteniendo leaderboard' });
        }
    });

    socket.on('get_market_analytics', () => {
        try {
            const analytics = {
                report: gameState.analytics.lastReport,
                cartelAlerts: gameState.analytics.cartelAlerts,
                riskLevel: gameState.analytics.lastReport.riskLevel,
                volatility: gameState.marketVolatility,
                predictions: Object.fromEntries(gameState.analytics.predictions),
                marketOverview: {
                    totalVolume: calculateTotalVolume(),
                    activeTraders: gameState.players.size + gameState.bots.size + gameState.qLearningBots.size,
                    cyclePhase: gameState.economicCycle,
                    tickCount: gameState.tick
                },
                lastUpdate: gameState.analytics.lastReport.timestamp
            };
            
            socket.emit('market_analytics', analytics);
            
        } catch (error) {
            console.error('❌ Error obteniendo analytics:', error);
            socket.emit('market_analytics', {
                report: {
                    marketTrend: 'neutral',
                    riskLevel: 'medium',
                    cartelAlerts: 0
                }
            });
        }
    });

   socket.on('admin_trigger_progressive_event', (data) => {
    if (!socket.isAdmin) {
        socket.emit('error', { message: 'Acceso no autorizado' });
        return;
    }
    
    try {
        console.log('🌍 Admin activando evento progresivo:', data);
        
        const result = triggerAdminEvent(data.eventId, gameState, io);
        
        if (result.success) {
            socket.emit('admin_operation_result', {
                success: true,
                message: `Evento "${result.event.name}" iniciado como evento progresivo`,
                data: {
                    eventId: data.eventId,
                    eventName: result.event.name,
                    progressData: result.progressData,
                    affectedResources: result.event.resources
                }
            });
            
            console.log(`✅ Evento progresivo iniciado por admin: ${result.event.name}`);
        } else {
            socket.emit('admin_operation_result', {
                success: false,
                message: result.message
            });
        }
        
    } catch (error) {
        console.error('❌ Error activando evento progresivo:', error);
        socket.emit('error', { 
            message: 'Error activando evento progresivo: ' + error.message 
        });
    }
});

socket.on('admin_start_bot_observation', (data) => {
    if (!socket.isAdmin) {
        socket.emit('error', { message: 'Acceso no autorizado' });
        return;
    }
    
    try {
        const { botId, botIds } = data;
        
        if (botId) {
            const bot = gameState.qLearningBots.get(botId);
            if (bot) {
                enableBotObservation(botId, bot, io);
                socket.emit('admin_operation_result', {
                    success: true,
                    message: `Observación iniciada para ${bot.name}`
                });
            } else {
                socket.emit('error', { message: 'Bot no encontrado' });
            }
        } else {
            let observedCount = 0;
            gameState.qLearningBots.forEach((bot, botId) => {
                enableBotObservation(botId, bot, io);
                observedCount++;
            });
            
            socket.emit('admin_operation_result', {
                success: true,
                message: `Observación iniciada para todos los bots (${observedCount})`
            });
        }
        
    } catch (error) {
        console.error('❌ Error iniciando observación:', error);
        socket.emit('error', { message: 'Error iniciando observación' });
    }
});

socket.on('admin_stop_bot_observation', (data) => {
    if (!socket.isAdmin) {
        socket.emit('error', { message: 'Acceso no autorizado' });
        return;
    }
    
    try {
        const { botId } = data;
        
        if (botId) {
            const bot = gameState.qLearningBots.get(botId);
            if (bot) {
                disableBotObservation(botId, bot);
                socket.emit('admin_operation_result', {
                    success: true,
                    message: `Observación detenida para ${bot.name}`
                });
            }
        } else {
            gameState.qLearningBots.forEach((bot, botId) => {
                disableBotObservation(botId, bot);
            });
            
            socket.emit('admin_operation_result', {
                success: true,
                message: 'Observación detenida para todos los bots'
            });
        }
        
    } catch (error) {
        console.error('❌ Error deteniendo observación:', error);
        socket.emit('error', { message: 'Error deteniendo observación' });
    }
});

socket.on('admin_get_observation_status', () => {
    if (!socket.isAdmin) return;
    
    try {
        const status = getObservationStatus();
        socket.emit('admin_observation_status', {
            status: status,
            timestamp: Date.now()
        });
    } catch (error) {
        console.error('❌ Error obteniendo estado de observación:', error);
        socket.emit('error', { message: 'Error obteniendo estado de observación' });
    }
});

socket.on('admin_get_adaptation_metrics', () => {
    if (!socket.isAdmin) return;
    
    try {
        const metrics = getAdaptationMetrics();
        socket.emit('admin_adaptation_metrics', {
            metrics: metrics,
            timestamp: Date.now()
        });
    } catch (error) {
        console.error('❌ Error obteniendo métricas de adaptación:', error);
        socket.emit('error', { message: 'Error obteniendo métricas de adaptación' });
    }
});

    socket.on('pause_simulation', () => {
        gameState.isPaused = true;
        gameState.isAnalysisMode = true;
        
        const analysis = generatePauseAnalysis();
        
        io.emit('simulation_paused', {
            analysis: analysis,
            timestamp: Date.now()
        });
        
        console.log('⏸️ Simulación pausada por usuario');
    });

    socket.on('resume_simulation', () => {
        gameState.isPaused = false;
        gameState.isAnalysisMode = false;
        
        io.emit('simulation_resumed', {
            timestamp: Date.now()
        });
        
        console.log('▶️ Simulación reanudada por usuario');
    });

    socket.on('get_advanced_analytics', () => {
        try {
            const advancedAnalytics = {
                timestamp: Date.now(),
                marketMetrics: {
                    volatility: gameState.marketVolatility,
                    trend: gameState.analytics.lastReport.marketTrend,
                    riskLevel: gameState.analytics.lastReport.riskLevel,
                    totalVolume: calculateTotalVolume(),
                    priceRanges: calculatePriceRanges()
                },
                botPerformance: getBotPerformanceMetrics(),
                riskAnalysis: riskManager ? riskManager.getRiskReport() : null,
                predictions: Object.fromEntries(gameState.analytics.predictions),
                cartelDetection: gameState.analytics.cartelAlerts,
                simulationHealth: {
                    tickCount: gameState.tick,
                    uptime: Date.now() - gameState.startTime,
                    activeConnections: io.engine.clientsCount
                }
            };
            
            socket.emit('advanced_analytics', advancedAnalytics);
            
        } catch (error) {
            console.error('❌ Error en analytics avanzados:', error);
            socket.emit('error', { message: 'Error obteniendo analytics avanzados' });
        }
    });

    socket.on('get_bot_details', (data) => {
        try {
            const { botId } = data;
            let bot = gameState.bots.get(botId) || gameState.qLearningBots.get(botId);
            
            if (!bot) {
                socket.emit('error', { message: 'Bot no encontrado' });
                return;
            }
            
            const isQLearning = gameState.qLearningBots.has(botId);
            
            const botDetails = {
                id: bot.id,
                name: bot.name,
                type: isQLearning ? 'Q-Learning' : 'Standard',
                strategy: bot.strategy,
                performance: {
                    netWorth: bot.calculateSafeNetWorth ? bot.calculateSafeNetWorth(gameState) : bot.money,
                    roi: bot.calculateROI ? bot.calculateROI() : 0,
                    transactions: bot.transactions.length,
                    successRate: bot.transactions.length > 0 ? 
                        (bot.transactions.filter(t => (t.profit || 0) > 0).length / bot.transactions.length * 100).toFixed(1) + '%' : '0%'
                },
                currentState: {
                    money: bot.money,
                    inventory: bot.inventory,
                    lastAction: bot.lastAction,
                    confidence: bot.confidenceLevel || 0.5
                },
                recentTransactions: bot.transactions.slice(-10),
                riskProfile: bot.riskProfile || null,
                lastThoughtProcess: bot.lastThoughtProcess || null
            };
            
            // Datos específicos para Q-Learning bots
            if (isQLearning) {
                botDetails.qLearningData = {
                    qTableSize: bot.qTable ? bot.qTable.size : 0,
                    epsilon: bot.epsilon || 0,
                    alpha: bot.alpha || 0,
                    gamma: bot.gamma || 0,
                    statistics: bot.statistics || {},
                    learningProgress: bot.explainStrategy ? bot.explainStrategy() : null
                };
            }
            
            // Datos específicos para bots estándar
            if (!isQLearning && bot.personality) {
                botDetails.personalityTraits = bot.personality;
                botDetails.marketSentiment = bot.marketSentiment || 'neutral';
                botDetails.tradingPattern = bot.tradingPattern || {};
            }
            
            socket.emit('bot_details', botDetails);
            
        } catch (error) {
            console.error('❌ Error obteniendo detalles del bot:', error);
            socket.emit('error', { message: 'Error obteniendo detalles del bot' });
        }
    });

    // 🔧 CORRECCIÓN: Socket handler para observar pensamiento de bots
// En app-integrated.js, corregir el handler de observación
socket.on('watch_bot_thinking', (data) => {
    try {
        const { botId, enable } = data;
        console.log(`🔍 Solicitud de observación: Bot ${botId}, Activar: ${enable}`);
        
        // Buscar el bot en la colección correcta
        const bot = gameState.qLearningBots.get(botId);
        
        if (!bot) {
            console.error(`❌ Bot ${botId} no encontrado en qLearningBots`);
            console.log(`📊 Bots disponibles:`, Array.from(gameState.qLearningBots.keys()));
            socket.emit('error', { message: 'Bot no encontrado' });
            return;
        }
        
        // Activar/desactivar observación
        bot.isBeingWatched = enable;
        
        console.log(`👁️ Observación ${enable ? 'activada' : 'desactivada'} para ${bot.name}`);
        
        if (enable) {
            socket.emit('bot_watching_started', {
                botId: botId,
                botName: bot.name,
                message: `Observando proceso de pensamiento de ${bot.name}`
            });
            
            // Si hay un último proceso de pensamiento, enviarlo inmediatamente
            if (bot.lastThoughtProcess) {
                console.log(`📤 Enviando último proceso de pensamiento para ${bot.name}`);
                socket.emit('bot_thinking_process', bot.lastThoughtProcess);
            } else {
                console.log(`ℹ️ No hay proceso de pensamiento previo para ${bot.name}`);
            }
        } else {
            socket.emit('bot_watching_stopped', {
                botId: botId,
                botName: bot.name
            });
        }
        
    } catch (error) {
        console.error('❌ Error en watch_bot_thinking:', error);
        socket.emit('error', { message: 'Error configurando observación: ' + error.message });
    }
});
socket.on('get_reputation_report', () => {
        try {
            console.log('🏆 Generando reporte de reputación...');
            
            // Crear reporte de reputación básico
            const report = {
                totalBots: gameState.qLearningBots.size,
                averageReputation: 75, // Valor simulado
                suspiciousActivities: 0,
                trustDistribution: {
                    very_high: Math.floor(gameState.qLearningBots.size * 0.2),
                    high: Math.floor(gameState.qLearningBots.size * 0.3),
                    medium: Math.floor(gameState.qLearningBots.size * 0.3),
                    low: Math.floor(gameState.qLearningBots.size * 0.1),
                    very_low: Math.floor(gameState.qLearningBots.size * 0.1)
                },
                behaviorProfiles: {
                    accumulator: Math.floor(gameState.qLearningBots.size * 0.25),
                    distributor: Math.floor(gameState.qLearningBots.size * 0.25),
                    conservative: Math.floor(gameState.qLearningBots.size * 0.25),
                    balanced: Math.floor(gameState.qLearningBots.size * 0.25),
                    unknown: 0
                },
                lastUpdated: Date.now()
            };
            
            socket.emit('reputation_report', {
                report: report,
                timestamp: Date.now()
            });
            
        } catch (error) {
            console.error('❌ Error generando reporte de reputación:', error);
            socket.emit('error', { message: 'Error generando reporte de reputación' });
        }
    });
    socket.on('export_simulation', () => {
        try {
            console.log('📤 Exportando datos de simulación...');
            
            const exportData = {
                metadata: {
                    exportTime: Date.now(),
                    totalTicks: gameState.tick,
                    totalBots: gameState.qLearningBots.size
                },
                qLearningBots: Array.from(gameState.qLearningBots.values()).map(bot => ({
                    id: bot.id,
                    name: bot.name,
                    strategy: bot.strategy,
                    netWorth: bot.calculateSafeNetWorth ? bot.calculateSafeNetWorth(gameState) : bot.money,
                    transactions: bot.transactions,
                    qTableSize: bot.qTable ? bot.qTable.size : 0,
                    statistics: bot.statistics
                })),
                marketHistory: Array.from(gameState.priceHistory.entries()),
                gameState: {
                    tick: gameState.tick,
                    economicCycle: gameState.economicCycle,
                    market: gameState.market,
                    marketEvents: gameState.marketEvents
                }
            };
            
            socket.emit('simulation_export', {
                data: exportData,
                filename: `simulation_export_${Date.now()}.json`,
                timestamp: Date.now()
            });
            
        } catch (error) {
            console.error('❌ Error exportando simulación:', error);
            socket.emit('error', { message: 'Error exportando datos' });
        }
    });

    // 🔧 NUEVO: Manejadores para control de simulación
    socket.on('pause_simulation', () => {
        try {
            console.log('⏸️ Pausando simulación por solicitud de usuario...');
            gameState.isPaused = true;
            gameState.isAnalysisMode = true;
            
            const analysis = generatePauseAnalysis();
            
            io.emit('simulation_paused', {
                analysis: analysis,
                timestamp: Date.now()
            });
            
            console.log('⏸️ Simulación pausada');
        } catch (error) {
            console.error('❌ Error pausando simulación:', error);
            socket.emit('error', { message: 'Error pausando simulación' });
        }
    });

    socket.on('resume_simulation', () => {
        try {
            console.log('▶️ Reanudando simulación por solicitud de usuario...');
            gameState.isPaused = false;
            gameState.isAnalysisMode = false;
            
            io.emit('simulation_resumed', {
                timestamp: Date.now(),
                tickCount: gameState.tick
            });
            
            console.log('▶️ Simulación reanudada');
        } catch (error) {
            console.error('❌ Error reanudando simulación:', error);
            socket.emit('error', { message: 'Error reanudando simulación' });
        }
    });

    socket.on('stop_simulation', () => {
        try {
            console.log('⏹️ Deteniendo simulación por solicitud de usuario...');
            gameState.isRunning = false;
            gameState.isPaused = true;
            
            const finalAnalysis = generateFinalAnalysis();
            
            io.emit('simulation_stopped', {
                finalAnalysis: finalAnalysis,
                timestamp: Date.now()
            });
            
            console.log('⏹️ Simulación detenida');
        } catch (error) {
            console.error('❌ Error deteniendo simulación:', error);
            socket.emit('error', { message: 'Error deteniendo simulación' });
        }
    });
   socket.on('admin_configure_bots', async (config) => {
    if (!socket.isAdmin) {
        socket.emit('error', { message: 'Acceso no autorizado' });
        return;
    }
    
    try {
        console.log('🤖 Administrador solicitó configuración de bots:', config);
        
        // Validar que la configuración sea válida
        if (!config || typeof config !== 'object') {
            socket.emit('error', { message: 'Configuración de bots inválida' });
            return;
        }
        
        // Aplicar la configuración usando nuestras funciones corregidas
        const result = applyBotConfigurationComplete(
            config,           // La configuración del admin
            gameState,        // Estado del juego
            simulationManager, // Manager de simulación
            io,              // Socket.io para comunicación
            socket.id        // ID del admin que hizo la solicitud
        );
        
        console.log('✅ Proceso de configuración de bots completado:', 
                   result.success ? 'EXITOSO' : 'FALLÓ');
        
    } catch (error) {
        console.error('❌ Error procesando configuración de bots:', error);
        socket.emit('error', { 
            message: 'Error interno configurando bots: ' + error.message 
        });
    }
});

    socket.on('generate_bot_comparison', () => {
        try {
            console.log('🔍 Generando comparación de bots...');
            
            const comparison = generateBotComparison();
            
            socket.emit('bot_comparison', {
                comparison: comparison,
                timestamp: Date.now()
            });
            
        } catch (error) {
            console.error('❌ Error generando comparación:', error);
            socket.emit('error', { message: 'Error generando comparación de bots' });
        }
    });

    socket.on('analyze_bot', (data) => {
        try {
            const { botId } = data;
            const bot = gameState.qLearningBots.get(botId);
            
            if (!bot) {
                socket.emit('error', { message: 'Bot no encontrado' });
                return;
            }
            
            console.log(`🔬 Analizando bot: ${bot.name}`);
            
            // Calcular análisis detallado
            const currentNetWorth = bot.calculateSafeNetWorth ? 
                bot.calculateSafeNetWorth(gameState) : 
                bot.getNetWorth(gameState);
            
            const initialNetWorth = 1000; // Valor inicial
            const performancePercent = ((currentNetWorth - initialNetWorth) / initialNetWorth * 100).toFixed(2) + '%';
            
            const analysis = {
                botInfo: {
                    name: bot.name,
                    strategy: bot.strategy,
                    learningProgress: {
                        qTableSize: bot.qTable ? bot.qTable.size : 0,
                        explorationRate: bot.epsilon ? (bot.epsilon * 100).toFixed(1) : '0',
                        episodes: bot.statistics ? bot.statistics.learningEpisodes : 0,
                        successRate: bot.transactions.length > 0 ? 
                            ((bot.transactions.filter(t => (t.profit || 0) > 0).length / bot.transactions.length) * 100).toFixed(1) + '%' : '0%'
                    }
                },
                performance: {
                    currentNetWorth: Math.round(currentNetWorth),
                    performancePercent: performancePercent,
                    winRate: bot.transactions.length > 0 ? 
                        ((bot.transactions.filter(t => (t.profit || 0) > 0).length / bot.transactions.length) * 100).toFixed(1) + '%' : '0%',
                    totalTransactions: bot.transactions.length
                },
                qTableSample: getQTableSample(bot)
            };
            
            socket.emit('detailed_bot_analysis', {
                botId: botId,
                analysis: analysis,
                timestamp: Date.now()
            });
            
        } catch (error) {
            console.error('❌ Error analizando bot:', error);
            socket.emit('error', { message: 'Error analizando bot' });
        }
    });

     socket.on('get_bot_decisions', (data) => {
        try {
            const { botId, count = 20 } = data;
            const bot = gameState.qLearningBots.get(botId);
            
            if (!bot) {
                socket.emit('error', { message: 'Bot no encontrado' });
                return;
            }
            
            console.log(`📋 Obteniendo decisiones del bot: ${bot.name}`);
            
            // Crear historial de decisiones basado en las transacciones
            const decisions = bot.transactions.slice(-count).map(transaction => ({
                timestamp: transaction.timestamp,
                action: {
                    type: transaction.type,
                    resource: transaction.resource,
                    quantity: transaction.quantity
                },
                confidence: Math.random() * 0.5 + 0.5, // Simular confianza
                reasoning: `Transacción de ${transaction.type} a precio ${transaction.price}`,
                outcome: {
                    success: true,
                    profit: transaction.profit || 0
                }
            }));
            
            socket.emit('bot_decision_history', {
                botId: botId,
                decisions: decisions.reverse(), // Más recientes primero
                timestamp: Date.now()
            });
            
        } catch (error) {
            console.error('❌ Error obteniendo decisiones:', error);
            socket.emit('error', { message: 'Error obteniendo historial de decisiones' });
        }
    });

    socket.on('disconnect', () => {
        const player = gameState.players.get(socket.id);
        if (player) {
            console.log(`👋 Jugador desconectado: ${player.name}`);
            gameState.analytics.performanceMetrics.delete(socket.id);
        }
        gameState.players.delete(socket.id);
    });
});
// Funciones auxiliares
function calculateTotalVolume() {
    let totalVolume = 0;
    
    // Volumen de jugadores humanos
    gameState.players.forEach(player => {
        player.transactions.slice(-20).forEach(transaction => {
            totalVolume += transaction.totalValue || 0;
        });
    });
    
    // Volumen de bots estándar
    gameState.bots.forEach(bot => {
        bot.transactions.slice(-20).forEach(transaction => {
            totalVolume += transaction.totalValue || 0;
        });
    });
    
    // Volumen de Q-Learning bots
    gameState.qLearningBots.forEach(bot => {
        bot.transactions.slice(-20).forEach(transaction => {
            totalVolume += transaction.totalValue || 0;
        });
    });
    
    return totalVolume;
}

function calculatePriceRanges() {
    const ranges = {};
    
    gameState.resources.forEach(resource => {
        const history = gameState.priceHistory.get(resource) || [];
        if (history.length > 0) {
            const prices = history.map(h => h.price);
            ranges[resource] = {
                min: Math.min(...prices),
                max: Math.max(...prices),
                current: prices[prices.length - 1],
                average: prices.reduce((a, b) => a + b, 0) / prices.length
            };
        }
    });
    
    return ranges;
}

function getBotPerformanceMetrics() {
    const metrics = {
        standard: [],
        qLearning: []
    };
    
    // Métricas de bots estándar
    gameState.bots.forEach(bot => {
        metrics.standard.push({
            id: bot.id,
            name: bot.name,
            strategy: bot.strategy,
            netWorth: bot.getNetWorth(),
            roi: bot.calculateROI ? bot.calculateROI() : 0,
            transactions: bot.transactions.length,
            riskLevel: bot.riskProfile ? bot.riskProfile.riskLevel : 'unknown',
            confidence: bot.confidenceLevel || 0.5
        });
    });
    
    // Métricas de Q-Learning bots
    gameState.qLearningBots.forEach(bot => {
        metrics.qLearning.push({
            id: bot.id,
            name: bot.name,
            strategy: bot.strategy,
            netWorth: bot.getNetWorth(),
            roi: ((bot.getNetWorth() - 1000) / 1000 * 100).toFixed(2),
            transactions: bot.transactions.length,
            qTableSize: bot.qTable ? bot.qTable.size : 0,
            epsilon: bot.epsilon || 0,
            learningEpisodes: bot.statistics ? bot.statistics.learningEpisodes : 0,
            avgReward: bot.statistics ? bot.statistics.avgReward : 0
        });
    });
    
    return metrics;
}

function generatePauseAnalysis() {
    return {
        timestamp: Date.now(),
        tick: gameState.tick,
        marketSnapshot: {
            prices: Object.fromEntries(
                gameState.resources.map(r => [r, gameState.market[r].price])
            ),
            volatility: gameState.marketVolatility,
            cycle: gameState.economicCycle,
            totalVolume: calculateTotalVolume()
        },
        participantSummary: {
            totalPlayers: gameState.players.size,
            standardBots: gameState.bots.size,
            qLearningBots: gameState.qLearningBots.size,
            totalTransactions: getTotalTransactionCount()
        },
        topPerformers: getTopPerformers(5),
        riskSummary: riskManager ? riskManager.getRiskReport() : null,
        cartelAlerts: gameState.analytics.cartelAlerts,
        recommendations: generateSimulationRecommendations()
    };
}

function getTotalTransactionCount() {
    let total = 0;
    
    gameState.players.forEach(player => {
        total += player.transactions.length;
    });
    
    gameState.bots.forEach(bot => {
        total += bot.transactions.length;
    });
    
    gameState.qLearningBots.forEach(bot => {
        total += bot.transactions.length;
    });
    
    return total;
}

function getTopPerformers(count = 5) {
    const allParticipants = [
        ...Array.from(gameState.players.values()),
        ...Array.from(gameState.bots.values()),
        ...Array.from(gameState.qLearningBots.values())
    ];
    
    return allParticipants
        .map(participant => {
            const isQBot = gameState.qLearningBots.has(participant.id);
            
            // 🔧 CALCULAR NET WORTH DE FORMA SEGURA
            let netWorth;
            try {
                if (isQBot || participant.isBot) {
                    netWorth = participant.calculateSafeNetWorth ? 
                        participant.calculateSafeNetWorth(gameState) : 
                        participant.getNetWorth(gameState);
                } else {
                    netWorth = participant.getNetWorth();
                }
            } catch (error) {
                console.warn(`⚠️ Error calculating net worth for ${participant.name}: ${error.message}`);
                netWorth = participant.money || 1000;
            }
            
            const roi = participant.calculateROI ? 
                participant.calculateROI() : 
                ((netWorth - 1000) / 1000 * 100);
            
            return {
                id: participant.id,
                name: participant.name,
                type: gameState.qLearningBots.has(participant.id) ? 'Q-Learning' :
                      participant.isBot ? 'Standard Bot' : 'Human',
                netWorth: netWorth,
                roi: roi
            };
        })
        .sort((a, b) => b.roi - a.roi)
        .slice(0, count);
}

function generateSimulationRecommendations() {
    const recommendations = [];
    
    // Recomendaciones basadas en volatilidad
    if (gameState.marketVolatility > 0.4) {
        recommendations.push({
            type: 'market_stability',
            priority: 'high',
            message: 'Alta volatilidad detectada. Considerar medidas estabilizadoras.',
            action: 'reduce_event_frequency'
        });
    }
    
    // Recomendaciones basadas en participación
    const totalParticipants = gameState.players.size + gameState.bots.size + gameState.qLearningBots.size;
    if (totalParticipants < 5) {
        recommendations.push({
            type: 'participation',
            priority: 'medium',
            message: 'Pocos participantes activos. Agregar más bots podría mejorar la dinámica.',
            action: 'add_more_bots'
        });
    }
    
    // Recomendaciones basadas en alertas de cartel
    if (gameState.analytics.cartelAlerts.length > 2) {
        recommendations.push({
            type: 'market_integrity',
            priority: 'high',
            message: 'Múltiples alertas de cartel. Revisar comportamiento de bots.',
            action: 'investigate_bot_behavior'
        });
    }
    
    return recommendations;
}

// Rutas API mejoradas
app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, '../client/index.html');
    console.log(`Serving index from: ${indexPath}`);
    
    // Verificar que el archivo existe
    if (require('fs').existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        console.error(`❌ Index file not found at: ${indexPath}`);
        res.status(404).send('Index file not found');
    }
});

app.get('/progressive-events', (req, res) => {
    const progressivePath = path.join(__dirname, '../client/admin-panel-enhanced.html');
    console.log(`Serving progressive events panel from: ${progressivePath}`);
    
    if (require('fs').existsSync(progressivePath)) {
        res.sendFile(progressivePath);
    } else {
        console.error(`❌ Progressive events panel not found at: ${progressivePath}`);
        res.status(404).send('Progressive events panel not found');
    }
});

app.get('/advanced-control', (req, res) => {
    const advancedPath = path.join(__dirname, '../client/advanced-control.html');
    console.log(`Serving advanced control from: ${advancedPath}`);
    
    if (require('fs').existsSync(advancedPath)) {
        res.sendFile(advancedPath);
    } else {
        console.error(`❌ Advanced control file not found at: ${advancedPath}`);
        res.status(404).send('Advanced control file not found');
    }
});

app.get('/api/simulation-status', (req, res) => {
    try {
        const status = {
            isRunning: gameState.isRunning,
            isPaused: gameState.isPaused,
            isAnalysisMode: gameState.isAnalysisMode,
            tickCount: gameState.tick,
            participants: {
                humans: gameState.players.size,
                standardBots: gameState.bots.size,
                qLearningBots: gameState.qLearningBots.size,
                total: gameState.players.size + gameState.bots.size + gameState.qLearningBots.size
            },
            market: gameState.market,
            cycle: gameState.economicCycle,
            volatility: gameState.marketVolatility,
            analytics: gameState.analytics.lastReport,
            qLearningBots: Array.from(gameState.qLearningBots.values()).map(bot => ({
                id: bot.id,
                name: bot.name,
                strategy: bot.strategy,
                netWorth: bot.getNetWorth(),
                qTableSize: bot.qTable ? bot.qTable.size : 0,
                epsilon: bot.epsilon || 0,
                transactions: bot.transactions.length
            })),
            recentEvents: gameState.marketEvents.slice(-5)
        };
        
        res.json(status);
    } catch (error) {
        console.error('Error getting simulation status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/analytics-report', async (req, res) => {
    try {
        const report = {
            timestamp: Date.now(),
            tick: gameState.tick,
            marketMetrics: {
                volatility: gameState.marketVolatility,
                totalVolume: calculateTotalVolume(),
                priceRanges: calculatePriceRanges(),
                cycle: gameState.economicCycle
            },
            participantMetrics: getBotPerformanceMetrics(),
            riskAnalysis: riskManager ? riskManager.getRiskReport() : null,
            cartelDetection: gameState.analytics.cartelAlerts,
            predictions: Object.fromEntries(gameState.analytics.predictions)
        };
        
        // Agregar analytics de base de datos si está disponible
        if (marketAnalytics) {
            try {
                const dbAnalytics = await marketAnalytics.getMarketAnalytics();
                if (dbAnalytics) {
                    report.historicalAnalytics = dbAnalytics;
                }
            } catch (error) {
                console.error('Error getting DB analytics:', error);
            }
        }
        
        res.json(report);
    } catch (error) {
        console.error('Error generating analytics report:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/admin/verify', (req, res) => {
    res.json({ 
        adminEnabled: true, 
        version: '1.0.0',
        timestamp: Date.now()
    });
});

app.post('/api/simulation-control', (req, res) => {
    try {
        const { action } = req.body;
        
        switch (action) {
            case 'pause':
                gameState.isPaused = true;
                res.json({ success: true, message: 'Simulation paused' });
                break;
                
            case 'resume':
                gameState.isPaused = false;
                res.json({ success: true, message: 'Simulation resumed' });
                break;
                
            case 'reset':
                // Reset básico (en producción sería más complejo)
                gameState.tick = 0;
                gameState.economicCycle = 'expansion';
                gameState.cycleCounter = 0;
                gameState.marketEvents = [];
                res.json({ success: true, message: 'Simulation reset' });
                break;
                
            default:
                res.status(400).json({ error: 'Invalid action' });
        }
    } catch (error) {
        console.error('Error controlling simulation:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Funciones de sistema adicionales
async function updateMarketPredictions() {
    if (!marketPredictor) return;
    
    try {
        for (let resource of gameState.resources) {
            const history = gameState.priceHistory.get(resource) || [];
            if (history.length >= 5) { // Reducir requisito mínimo
                try {
                    // 🔧 ASEGURAR FORMATO CORRECTO DE DATOS
                    const formattedHistory = history.map(entry => ({
                        market: {
                            [resource]: {
                                price: entry.price,
                                supply: entry.supply,
                                demand: entry.demand
                            }
                        },
                        tick: entry.tick,
                        timestamp: entry.timestamp
                    }));
                    
                    const prediction = marketPredictor.predict(resource, formattedHistory, 5);
                    gameState.analytics.predictions.set(resource, prediction);
                } catch (predError) {
                    console.warn(`⚠️ Error prediciendo ${resource}:`, predError.message);
                    // Continuar con otros recursos
                }
            }
        }
    } catch (error) {
        console.error('❌ Error actualizando predicciones:', error.message);
    }
}

function checkSystemAlerts() {
    const alerts = [];
    
    // Alerta por alta volatilidad
    if (gameState.marketVolatility > 0.5) {
        alerts.push({
            type: 'high_volatility',
            severity: 'warning',
            message: `Alta volatilidad detectada: ${(gameState.marketVolatility * 100).toFixed(2)}%`,
            timestamp: Date.now()
        });
    }
    
    // Alerta por número bajo de participantes
    const totalParticipants = gameState.players.size + gameState.bots.size + gameState.qLearningBots.size;
    if (totalParticipants < 3) {
        alerts.push({
            type: 'low_participation',
            severity: 'info',
            message: `Pocos participantes activos: ${totalParticipants}`,
            timestamp: Date.now()
        });
    }
    
    // Alerta por eventos de mercado múltiples
    const recentEvents = gameState.marketEvents.filter(event => 
        Date.now() - event.timestamp < 300000 // Últimos 5 minutos
    );
    
    if (recentEvents.length >= 3) {
        alerts.push({
            type: 'multiple_events',
            severity: 'warning',
            message: `Múltiples eventos de mercado en corto tiempo: ${recentEvents.length}`,
            timestamp: Date.now()
        });
    }
    
    // Emitir alertas a clientes conectados
    if (alerts.length > 0) {
        io.emit('system_alerts', alerts);
    }
    
    return alerts;
}

function optimizeSystemPerformance() {
    try {
        // Limpiar historiales antiguos
        gameState.priceHistory.forEach((history, resource) => {
            if (history.length > 200) {
                const keepCount = 150;
                gameState.priceHistory.set(resource, history.slice(-keepCount));
            }
        });
        
        // Limpiar transacciones viejas de bots
        gameState.bots.forEach(bot => {
            if (bot.transactions.length > 100) {
                bot.transactions = bot.transactions.slice(-50);
            }
        });
        
        gameState.qLearningBots.forEach(bot => {
            if (bot.transactions.length > 100) {
                bot.transactions = bot.transactions.slice(-50);
            }
            
            // Limpiar buffer de experiencias si es muy grande
            if (bot.experienceBuffer && bot.experienceBuffer.length > bot.maxExperienceSize) {
                bot.experienceBuffer = bot.experienceBuffer.slice(-bot.maxExperienceSize);
            }
        });
        
        // Limpiar eventos de mercado antiguos
        if (gameState.marketEvents.length > 20) {
            gameState.marketEvents = gameState.marketEvents.slice(-15);
        }
        
        // Limpiar alertas de cartel antiguas
        const oneHourAgo = Date.now() - 3600000;
        gameState.analytics.cartelAlerts = gameState.analytics.cartelAlerts.filter(
            alert => alert.timestamp > oneHourAgo
        );
        
        console.log('🧹 Optimización de rendimiento completada');
        
    } catch (error) {
        console.error('❌ Error en optimización de rendimiento:', error);
    }
}

async function createSystemBackup() {
    try {
        const backupData = {
            timestamp: Date.now(),
            tick: gameState.tick,
            market: gameState.market,
            economicCycle: gameState.economicCycle,
            cycleCounter: gameState.cycleCounter,
            marketEvents: gameState.marketEvents,
            analytics: {
                lastReport: gameState.analytics.lastReport,
                cartelAlerts: gameState.analytics.cartelAlerts
            },
            participantCounts: {
                humans: gameState.players.size,
                standardBots: gameState.bots.size,
                qLearningBots: gameState.qLearningBots.size
            },
            systemMetrics: {
                uptime: Date.now() - gameState.startTime,
                totalVolume: calculateTotalVolume(),
                marketVolatility: gameState.marketVolatility
            }
        };
        
        // Agregar datos de Q-Learning bots (sin la Q-table completa por tamaño)
        backupData.qLearningBotsStats = Array.from(gameState.qLearningBots.values()).map(bot => ({
            id: bot.id,
            name: bot.name,
            strategy: bot.strategy,
            netWorth: bot.getNetWorth(),
            qTableSize: bot.qTable ? bot.qTable.size : 0,
            epsilon: bot.epsilon,
            statistics: bot.statistics,
            recentTransactions: bot.transactions.slice(-10)
        }));
        
        const backupPath = path.join(__dirname, '../backups');
        
        // Crear directorio si no existe
        if (!fs.existsSync(backupPath)) {
            fs.mkdirSync(backupPath, { recursive: true });
        }
        
        const filename = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        fs.writeFileSync(path.join(backupPath, filename), JSON.stringify(backupData, null, 2));
        
        // Mantener solo los últimos 10 backups
        const files = fs.readdirSync(backupPath)
            .filter(file => file.startsWith('backup_') && file.endsWith('.json'))
            .sort()
            .reverse();
        
        if (files.length > 10) {
            files.slice(10).forEach(file => {
                fs.unlinkSync(path.join(backupPath, file));
            });
        }
        
        console.log(`💾 Backup creado: ${filename}`);
        
    } catch (error) {
        console.error('❌ Error creando backup:', error);
    }
}

function monitorSystemHealth() {
    const health = {
        timestamp: Date.now(),
        status: 'healthy',
        metrics: {
            uptime: Date.now() - gameState.startTime,
            memoryUsage: process.memoryUsage(),
            cpuUsage: process.cpuUsage(),
            activeConnections: io.engine.clientsCount,
            tick: gameState.tick,
            participantCount: gameState.players.size + gameState.bots.size + gameState.qLearningBots.size
        },
        checks: {
            marketFunctioning: gameState.market && Object.keys(gameState.market).length === 4,
            botsActive: gameState.bots.size > 0 || gameState.qLearningBots.size > 0,
            analyticsWorking: gameState.analytics.lastReport && 
                             Date.now() - gameState.analytics.lastReport.timestamp < 300000, // 5 minutos
            databaseConnected: DatabaseManager !== null
        }
    };
    
    // Determinar estado general
    const failedChecks = Object.values(health.checks).filter(check => !check).length;
    if (failedChecks > 0) {
        health.status = failedChecks > 2 ? 'critical' : 'warning';
    }
    
    // Alertas por uso excesivo de memoria
    const memoryUsageMB = health.metrics.memoryUsage.heapUsed / 1024 / 1024;
    if (memoryUsageMB > 500) { // 500MB
        health.status = 'warning';
        health.alerts = health.alerts || [];
        health.alerts.push(`High memory usage: ${memoryUsageMB.toFixed(2)}MB`);
    }
    
    // Log del estado cada cierto tiempo
    if (gameState.tick % 10 === 0) {
        console.log(`🔍 System Health: ${health.status} | Memory: ${memoryUsageMB.toFixed(2)}MB | Connections: ${health.metrics.activeConnections}`);
    }
    
    return health;
}

function logSystemEvent(type, message, data = null) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        tick: gameState.tick,
        type: type,
        message: message,
        data: data
    };
    
    // En producción, esto iría a un sistema de logs más robusto
    console.log(`📝 [${type.toUpperCase()}] ${message}`, data ? JSON.stringify(data) : '');
    
    // Guardar logs críticos en archivo
    if (['error', 'critical', 'security'].includes(type)) {
        try {
            const logPath = path.join(__dirname, '../logs');
            
            if (!fs.existsSync(logPath)) {
                fs.mkdirSync(logPath, { recursive: true });
            }
            
            const logFile = path.join(logPath, `system_${new Date().toISOString().slice(0, 10)}.log`);
            fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
        } catch (error) {
            console.error('❌ Error escribiendo log:', error);
        }
    }
}

function scheduleSystemTasks() {
    // Actualizar predicciones cada 30 segundos
    setInterval(updateMarketPredictions, 30000);
    
    // Verificar alertas del sistema cada 45 segundos
    setInterval(checkSystemAlerts, 45000);
    
    // Optimizar rendimiento cada 5 minutos
    setInterval(optimizeSystemPerformance, 300000);
    
    // Crear backup cada 15 minutos
    setInterval(createSystemBackup, 900000);
    
    // Monitorear salud del sistema cada 30 segundos
    setInterval(monitorSystemHealth, 30000);
    
    console.log('⏰ Tareas programadas del sistema iniciadas');
}

// Rutas adicionales para salud del sistema
app.get('/api/system-health', (req, res) => {
    try {
        const health = monitorSystemHealth();
        res.json(health);
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Error checking system health',
            error: error.message
        });
    }
});

app.get('/api/system-logs', (req, res) => {
    try {
        const { type, limit = 100 } = req.query;
        
        // En una implementación real, esto leería de una base de datos de logs
        const mockLogs = [
            {
                timestamp: new Date().toISOString(),
                tick: gameState.tick,
                type: 'info',
                message: 'System operating normally',
                data: { participants: gameState.players.size + gameState.bots.size + gameState.qLearningBots.size }
            }
        ];
        
        let filteredLogs = mockLogs;
        if (type) {
            filteredLogs = mockLogs.filter(log => log.type === type);
        }
        
        res.json({
            logs: filteredLogs.slice(0, parseInt(limit)),
            total: filteredLogs.length,
            timestamp: Date.now()
        });
    } catch (error) {
        res.status(500).json({ error: 'Error retrieving logs' });
    }
});

function clearAllExistingBots(gameState) {
    console.log('🗑️ Iniciando limpieza de bots existentes...');
    
    let removedCount = 0;
    
    // Eliminar bots estándar
    gameState.bots.forEach((bot, botId) => {
        console.log(`🗑️ Eliminando bot estándar: ${bot.name}`);
        removedCount++;
    });
    gameState.bots.clear();
    
    // Eliminar Q-Learning bots
    gameState.qLearningBots.forEach((bot, botId) => {
        console.log(`🗑️ Eliminando Q-Learning bot: ${bot.name}`);
        removedCount++;
    });
    gameState.qLearningBots.clear();
    
    // Limpiar métricas de performance si existen
    if (gameState.analytics && gameState.analytics.performanceMetrics) {
        gameState.analytics.performanceMetrics.clear();
    }
    
    console.log(`✅ Limpieza completada: ${removedCount} bots eliminados`);
    return removedCount;
}

// Función para crear bots estándar con estrategia específica
function createStandardBotsWithStrategy(count, strategy, gameState) {
    console.log(`🎯 Creando ${count} bots estándar con estrategia: ${strategy}`);
    
    const createdBots = [];
    
    for (let i = 1; i <= count; i++) {
        try {
            // Crear nombre único basado en estrategia y número
            const strategyPrefix = strategy.charAt(0).toUpperCase() + strategy.slice(1);
            const botName = `${strategyPrefix}_Bot_${i}`;
            
            // Crear el bot usando la clase EnhancedBot que ya tienes definida
            const bot = new EnhancedBot(botName, strategy);
            
            // Configurar propiedades específicas según la estrategia elegida
            configureBotPersonality(bot, strategy);
            
            // Agregar el bot al estado del juego
            gameState.bots.set(bot.id, bot);
            
            // Registrar información del bot creado
            createdBots.push({
                id: bot.id,
                name: bot.name,
                strategy: bot.strategy,
                riskTolerance: bot.personality.riskTolerance,
                patience: bot.patience
            });
            
            console.log(`✅ Bot estándar creado exitosamente: ${bot.name} (${bot.strategy})`);
            
        } catch (error) {
            console.error(`❌ Error creando bot estándar número ${i}:`, error.message);
        }
    }
    
    console.log(`📊 Resumen: ${createdBots.length}/${count} bots estándar creados correctamente`);
    return createdBots;
}

// Función auxiliar para configurar la personalidad de cada bot según su estrategia
function configureBotPersonality(bot, strategy) {
    switch (strategy) {
        case 'conservative':
            // Bots conservadores: bajo riesgo, alta paciencia, poca codicia
            bot.personality.riskTolerance = Math.random() * 0.3 + 0.1; // 0.1 a 0.4
            bot.personality.greed = Math.random() * 0.3 + 0.2; // 0.2 a 0.5
            bot.personality.patience = Math.random() * 0.4 + 0.6; // 0.6 a 1.0
            bot.patience = Math.random() * 25000 + 15000; // 15 a 40 segundos
            break;
            
        case 'aggressive':
            // Bots agresivos: alto riesgo, baja paciencia, alta codicia
            bot.personality.riskTolerance = Math.random() * 0.3 + 0.7; // 0.7 a 1.0
            bot.personality.greed = Math.random() * 0.4 + 0.6; // 0.6 a 1.0
            bot.personality.patience = Math.random() * 0.3 + 0.1; // 0.1 a 0.4
            bot.patience = Math.random() * 10000 + 5000; // 5 a 15 segundos
            break;
            
        case 'balanced':
            // Bots balanceados: riesgo medio, paciencia media
            bot.personality.riskTolerance = Math.random() * 0.4 + 0.3; // 0.3 a 0.7
            bot.personality.greed = Math.random() * 0.4 + 0.3; // 0.3 a 0.7
            bot.personality.patience = Math.random() * 0.4 + 0.4; // 0.4 a 0.8
            bot.patience = Math.random() * 20000 + 10000; // 10 a 30 segundos
            break;
            
        case 'contrarian':
            // Bots contrarios: baja influencia social, alta memoria
            bot.personality.riskTolerance = Math.random() * 0.4 + 0.3; // 0.3 a 0.7
            bot.personality.socialInfluence = Math.random() * 0.2; // 0 a 0.2 (muy bajo)
            bot.personality.memory = Math.random() * 0.2 + 0.8; // 0.8 a 1.0 (muy alto)
            bot.patience = Math.random() * 30000 + 20000; // 20 a 50 segundos
            break;
            
        case 'arbitrageur':
            // Bots arbitrajistas: alta memoria, mucha paciencia, precisión
            bot.personality.memory = Math.random() * 0.2 + 0.8; // 0.8 a 1.0
            bot.personality.patience = Math.random() * 0.3 + 0.7; // 0.7 a 1.0
            bot.personality.overconfidence = Math.random() * 0.2 + 0.1; // 0.1 a 0.3 (bajo)
            bot.patience = Math.random() * 15000 + 25000; // 25 a 40 segundos
            break;
            
        default:
            // Configuración por defecto (balanceada)
            bot.personality.riskTolerance = 0.5;
            bot.personality.greed = 0.5;
            bot.personality.patience = 0.5;
            bot.patience = 15000; // 15 segundos
    }
}

// Función para crear Q-Learning bots con estrategia específica
function createQLearningBotsWithStrategy(count, strategy, gameState, simulationManager) {
    console.log(`🧠 Creando ${count} Q-Learning bots con estrategia: ${strategy}`);
    
    if (!simulationManager) {
        console.error('❌ SimulationManager no está disponible para crear Q-Learning bots');
        return [];
    }
    
    const createdBots = [];
    
    for (let i = 1; i <= count; i++) {
        try {
            // Crear nombre único basado en estrategia
            const strategyName = strategy.split('_')[2] || 'adaptive'; // Extrae 'aggressive', 'conservative', etc.
            const botName = `AI_${strategyName.charAt(0).toUpperCase() + strategyName.slice(1)}_${i}`;
            
            // Crear el bot usando el simulation manager
            const bot = simulationManager.addQLearningBot(botName, strategy);
            
            if (bot) {
                // Configurar parámetros de aprendizaje específicos según estrategia
                configureQLearningParameters(bot, strategy);
                
                // Asegurar que el bot esté registrado en gameState
                gameState.qLearningBots.set(bot.id, bot);
                
                // Registrar información del bot creado
                createdBots.push({
                    id: bot.id,
                    name: bot.name,
                    strategy: bot.strategy,
                    qTableSize: bot.qTable ? bot.qTable.size : 0,
                    epsilon: bot.epsilon,
                    alpha: bot.alpha,
                    gamma: bot.gamma
                });
                
                console.log(`✅ Q-Learning bot creado exitosamente: ${bot.name} (${bot.strategy})`);
            } else {
                console.error(`❌ No se pudo crear Q-Learning bot número ${i}`);
            }
            
        } catch (error) {
            console.error(`❌ Error creando Q-Learning bot número ${i}:`, error.message);
        }
    }
    
    console.log(`📊 Resumen: ${createdBots.length}/${count} Q-Learning bots creados correctamente`);
    return createdBots;
}

// Función auxiliar para configurar parámetros de Q-Learning según estrategia
function configureQLearningParameters(bot, strategy) {
    switch (strategy) {
        case 'q_learning_aggressive':
            // Aprendizaje rápido, más exploración, menos enfoque en futuro
            bot.alpha = 0.15; // Tasa de aprendizaje alta
            bot.gamma = 0.9; // Factor de descuento medio
            bot.epsilon = 0.4; // Exploración alta
            bot.personality.riskTolerance = 0.8;
            break;
            
        case 'q_learning_conservative':
            // Aprendizaje lento, menos exploración, más enfoque en futuro
            bot.alpha = 0.05; // Tasa de aprendizaje baja
            bot.gamma = 0.98; // Factor de descuento alto
            bot.epsilon = 0.2; // Exploración baja
            bot.personality.riskTolerance = 0.3;
            break;
            
        case 'q_learning_adaptive':
            // Parámetros balanceados que se adaptan
            bot.alpha = 0.1; // Tasa de aprendizaje media
            bot.gamma = 0.95; // Factor de descuento balanceado
            bot.epsilon = 0.3; // Exploración moderada
            bot.personality.riskTolerance = 0.5;
            break;
            
        case 'q_learning_contrarian':
            // Parámetros para estrategia contraria
            bot.alpha = 0.08; // Aprendizaje ligeramente lento
            bot.gamma = 0.92; // Enfoque en mediano plazo
            bot.epsilon = 0.25; // Exploración controlada
            bot.personality.riskTolerance = 0.4;
            break;
            
        default:
            // Configuración por defecto
            bot.alpha = 0.1;
            bot.gamma = 0.95;
            bot.epsilon = 0.3;
            bot.personality.riskTolerance = 0.5;
    }
}

// Función principal para aplicar configuración completa de bots
function applyBotConfigurationComplete(config, gameState, simulationManager, io, adminSocketId) {
    console.log('🔧 Aplicando configuración ADITIVA de bots...');
    console.log('📋 Configuración recibida:', JSON.stringify(config, null, 2));
    
    try {
        // 🔧 CAMBIO: NO limpiar bots existentes, solo agregar nuevos
        console.log('📊 Estado actual:');
        console.log(`   - Bots estándar existentes: ${gameState.bots.size}`);
        console.log(`   - Q-Learning bots existentes: ${gameState.qLearningBots.size}`);
        
        // FASE 1: Crear bots estándar ADICIONALES si se solicitaron
        console.log('🎯 FASE 1: Agregando bots estándar...');
        let standardBots = [];
        if (config.standard && config.standard.count > 0) {
            const maxStandardBots = Math.min(config.standard.count, 10);
            const strategy = config.standard.strategy || 'balanced';
            
            console.log(`   Creando ${maxStandardBots} bots estándar adicionales con estrategia: ${strategy}`);
            standardBots = createStandardBotsWithStrategy(maxStandardBots, strategy, gameState);
        }
        
        // FASE 2: Crear Q-Learning bots ADICIONALES si se solicitaron
        console.log('🧠 FASE 2: Agregando Q-Learning bots...');
        let qlearningBots = [];
        if (config.qlearning && config.qlearning.count > 0) {
            const maxQLearningBots = Math.min(config.qlearning.count, 10);
            const strategy = config.qlearning.strategy || 'q_learning_adaptive';
            
            console.log(`   Creando ${maxQLearningBots} Q-Learning bots adicionales con estrategia: ${strategy}`);
            qlearningBots = createQLearningBotsWithStrategy(maxQLearningBots, strategy, gameState, simulationManager);
        }
        
        // FASE 3: Compilar resultados
        const totalCreated = standardBots.length + qlearningBots.length;
        const totalExisting = gameState.bots.size + gameState.qLearningBots.size;
        
        console.log('📊 RESULTADOS:');
        console.log(`   ✅ Bots estándar agregados: ${standardBots.length}`);
        console.log(`   ✅ Q-Learning bots agregados: ${qlearningBots.length}`);
        console.log(`   ✅ Total creados en esta operación: ${totalCreated}`);
        console.log(`   📈 Total de bots ahora en el sistema: ${totalExisting}`);
        
        const result = {
            success: true,
            message: `${totalCreated} bots agregados exitosamente (Total: ${totalExisting})`,
            statistics: {
                added: {
                    standard: standardBots.length,
                    qlearning: qlearningBots.length,
                    total: totalCreated
                },
                currentTotals: {
                    standard: gameState.bots.size,
                    qlearning: gameState.qLearningBots.size,
                    total: totalExisting
                }
            },
            bots: {
                standard: standardBots,
                qlearning: qlearningBots
            },
            timestamp: Date.now()
        };
        
        // Notificar resultados
        const adminSocket = io.sockets.sockets.get(adminSocketId);
        if (adminSocket) {
            adminSocket.emit('admin_operation_result', result);
        }
        
        // Notificar actualización a todos los clientes
        io.emit('bots_updated', {
            qlearning: gameState.qLearningBots.size,
            standard: gameState.bots.size,
            total: totalExisting
        });
        
        console.log('🎉 ¡Configuración de bots aplicada exitosamente!');
        return result;
        
    } catch (error) {
        console.error('❌ Error aplicando configuración de bots:', error);
        
        const errorResult = {
            success: false,
            message: 'Error aplicando configuración: ' + error.message,
            error: error.message,
            timestamp: Date.now()
        };
        
        const adminSocket = io.sockets.sockets.get(adminSocketId);
        if (adminSocket) {
            adminSocket.emit('admin_operation_result', errorResult);
        }
        
        return errorResult;
    }
}

// Función para eliminar bots específicos por ID o tipo
function removeBotsByType(type, count = 'all', gameState) {
    console.log(`🗑️ Eliminando bots de tipo: ${type}, cantidad: ${count}`);
    
    let removed = 0;
    
    if (type === 'standard' || type === 'all') {
        if (count === 'all') {
            removed += gameState.bots.size;
            gameState.bots.clear();
        } else {
            const botsToRemove = Array.from(gameState.bots.keys()).slice(0, count);
            botsToRemove.forEach(botId => {
                gameState.bots.delete(botId);
                removed++;
            });
        }
    }
    
    if (type === 'qlearning' || type === 'all') {
        if (count === 'all') {
            removed += gameState.qLearningBots.size;
            gameState.qLearningBots.clear();
        } else {
            const botsToRemove = Array.from(gameState.qLearningBots.keys()).slice(0, count);
            botsToRemove.forEach(botId => {
                gameState.qLearningBots.delete(botId);
                removed++;
            });
        }
    }
    
    console.log(`✅ ${removed} bots eliminados`);
    return removed;
}

// Iniciar servidor
async function startServer() {
    console.log('🚀 Iniciando Simulador Económico Integrado...');
    
    // Marcar tiempo de inicio
    gameState.startTime = Date.now();
    
    // Inicializar sistemas avanzados
    await initializeSystems();
    

    setupAdminSocketHandlers(io, gameState, simulationManager);
    
    
    // Crear bots
    //createStandardBots();
    //createQLearningBots();
    
    // Programar tareas del sistema
    scheduleSystemTasks();
    
    // Iniciar loops de sistema
    setInterval(economicTick, 18000); // Tick principal cada 18 segundos
    setInterval(runStandardBots, 10000); // Bots estándar cada 10 segundos
    setInterval(() => {
        if (simulationManager && !gameState.isPaused) {
            runQLearningBots();
        }
    }, 12000); // Q-Learning bots cada 12 segundos
    
    setInterval(runAdvancedAnalytics, 45000); // Analytics cada 45 segundos
    
    // Log inicial del sistema
    logSystemEvent('startup', 'Economic Simulator started successfully', {
        standardBots: gameState.bots.size,
        qLearningBots: gameState.qLearningBots.size,
        resources: gameState.resources.length,
        port: PORT
    });
    

    
    // Iniciar servidor HTTP
    server.listen(PORT, () => {
        console.log('\n🎮 ==========================================');
        console.log(`🎮 Simulador Económico Integrado ejecutándose en puerto ${PORT}`);
        console.log(`📊 Mercado inicializado con ${gameState.resources.length} recursos`);
        console.log(`🤖 ${gameState.bots.size} bots estándar activos`);
        console.log(`🧠 ${gameState.qLearningBots.size} Q-Learning bots activos`);
        console.log(`📈 Analytics avanzados y predicciones activados`);
        console.log(`🛡️ Sistema de gestión de riesgos activado`);
        console.log(`🔍 Detección de carteles activada`);
        console.log(`⏰ Tareas programadas del sistema activas`);
        console.log(`💾 Sistema de backups automáticos activado`);
        console.log(`🔍 Monitoreo de salud del sistema activado`);
        console.log(`🌐 URL Principal: http://localhost:${PORT}`);
        console.log(`🎛️ Panel Avanzado: http://localhost:${PORT}/advanced-control`);
        console.log(`📊 System Health: http://localhost:${PORT}/api/system-health`);
        console.log('🎮 ==========================================\n');
    });
}

// Manejo de errores y cierre graceful
process.on('uncaughtException', (error) => {
    console.error('❌ Error no capturado:', error.message);
    logSystemEvent('critical', 'Uncaught exception', { error: error.message, stack: error.stack });
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promesa rechazada:', reason);
    logSystemEvent('critical', 'Unhandled promise rejection', { reason: reason.toString() });
});

process.on('SIGINT', async () => {
    console.log('\n📊 Cerrando servidor...');
    console.log(`📈 Total de ticks ejecutados: ${gameState.tick}`);
    console.log(`👥 Participantes totales: ${gameState.players.size + gameState.bots.size + gameState.qLearningBots.size}`);
    console.log(`💰 Volumen total negociado: ${calculateTotalVolume()}`);
    
    // Generar reporte final
    try {
        const finalReport = {
            sessionSummary: {
                duration: Date.now() - gameState.startTime,
                totalTicks: gameState.tick,
                participantCounts: {
                    humans: gameState.players.size,
                    standardBots: gameState.bots.size,
                    qLearningBots: gameState.qLearningBots.size
                },
                totalVolume: calculateTotalVolume(),
                totalTransactions: getTotalTransactionCount()
            },
            finalPerformances: getTopPerformers(10),
            marketSummary: {
                finalPrices: Object.fromEntries(
                    gameState.resources.map(r => [r, gameState.market[r].price])
                ),
                finalVolatility: gameState.marketVolatility,
                finalCycle: gameState.economicCycle
            },
            qLearningProgress: Array.from(gameState.qLearningBots.values()).map(bot => ({
                name: bot.name,
                strategy: bot.strategy,
                qTableSize: bot.qTable ? bot.qTable.size : 0,
                finalEpsilon: bot.epsilon || 0,
                totalReward: bot.statistics ? bot.statistics.totalReward : 0,
                learningEpisodes: bot.statistics ? bot.statistics.learningEpisodes : 0
            })),
            riskAnalysis: riskManager ? riskManager.getRiskReport() : null,
            cartelAlerts: gameState.analytics.cartelAlerts
        };
        
        // Guardar reporte final en archivo
        const reportPath = path.join(__dirname, '../reports');
        
        // Crear directorio si no existe
        if (!fs.existsSync(reportPath)) {
            fs.mkdirSync(reportPath, { recursive: true });
        }
        
        const filename = `simulation_report_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        fs.writeFileSync(path.join(reportPath, filename), JSON.stringify(finalReport, null, 2));
        
        console.log(`📋 Reporte final guardado: ${filename}`);
        
        logSystemEvent('shutdown', 'Economic Simulator shutdown completed', {
            finalReport: {
                duration: finalReport.sessionSummary.duration,
                totalTicks: finalReport.sessionSummary.totalTicks,
                totalVolume: finalReport.sessionSummary.totalVolume
            }
        });
        
    } catch (error) {
        console.error('❌ Error generando reporte final:', error);
        logSystemEvent('error', 'Error generating final report', { error: error.message });
    }
    
    console.log('👋 ¡Hasta luego!');
    process.exit(0);
});

// Iniciar servidor
startServer().catch(error => {
    console.error('❌ Error fatal iniciando servidor:', error);
    logSystemEvent('critical', 'Fatal startup error', { error: error.message, stack: error.stack });
    process.exit(1);
});

module.exports = app;