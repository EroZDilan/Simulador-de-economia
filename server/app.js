// server/app.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const { EconomicBot, BotFactory } = require('./bots');
const { DatabaseManager, Player, Transaction, PriceHistory, MarketEvent } = require('./models');
const { MarketAnalytics } = require('./analytics');
const constants = require('../shared/constants');

// Configuración básica
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

// Instancia de analytics
const marketAnalytics = new MarketAnalytics();

// Estado del juego (en memoria)
const gameState = {
    players: new Map(),
    bots: new Map(),
    resources: Object.keys(constants.RESOURCES),
    market: JSON.parse(JSON.stringify(constants.INITIAL_MARKET)),
    tick: 0,
    marketEvents: [],
    economicCycle: 'expansion',
    cycleCounter: 0,
    analytics: {
        lastReport: null,
        cartelAlerts: [],
        riskLevel: 'medium'
    }
};

// Clase GamePlayer (para evitar conflicto con models.js)
class GamePlayer {
    constructor(id, name) {
        this.id = id;
        this.name = name;
        this.money = constants.GAME_CONFIG.INITIAL_MONEY;
        this.inventory = { ...constants.GAME_CONFIG.INITIAL_INVENTORY };
        this.score = 0;
        this.transactions = [];
        this.isBot = false;
        this.statistics = {
            totalProfit: 0,
            totalVolume: 0,
            successfulTrades: 0,
            bestRank: 999,
            gamesPlayed: 0
        };
        this.joinedAt = Date.now();
    }

    getNetWorth() {
        let inventoryValue = 0;
        for (let resource in this.inventory) {
            inventoryValue += this.inventory[resource] * gameState.market[resource].price;
        }
        return this.money + inventoryValue;
    }

    async buy(resource, quantity) {
        const market = gameState.market[resource];
        const totalCost = market.price * quantity;
        
        if (this.money >= totalCost && market.supply >= quantity && 
            quantity <= constants.SYSTEM_LIMITS.MAX_TRANSACTION_SIZE) {
            
            this.money -= totalCost;
            this.inventory[resource] += quantity;
            market.supply -= quantity;
            market.demand += Math.floor(quantity * 0.1);
            
            const transaction = {
                type: 'buy',
                resource: resource,
                quantity: quantity,
                price: market.price,
                totalValue: totalCost,
                timestamp: Date.now(),
                tick: gameState.tick,
                profit: 0
            };
            
            this.transactions.push(transaction);
            this.statistics.totalVolume += totalCost;
            
            // Guardar en base de datos
            await DatabaseManager.saveTransaction(this.id, transaction);
            
            return true;
        }
        return false;
    }

    async sell(resource, quantity) {
        const market = gameState.market[resource];
        
        if (this.inventory[resource] >= quantity && 
            quantity <= constants.SYSTEM_LIMITS.MAX_TRANSACTION_SIZE) {
            
            const totalRevenue = market.price * quantity;
            
            // Calcular profit basado en compras anteriores
            const buyTransactions = this.transactions
                .filter(t => t.type === 'buy' && t.resource === resource)
                .sort((a, b) => a.timestamp - b.timestamp);
            
            let remainingQuantity = quantity;
            let totalCost = 0;
            
            for (let buyTx of buyTransactions) {
                if (remainingQuantity <= 0) break;
                const useQuantity = Math.min(remainingQuantity, buyTx.quantity);
                totalCost += useQuantity * buyTx.price;
                remainingQuantity -= useQuantity;
            }
            
            const profit = totalRevenue - totalCost;
            
            this.money += totalRevenue;
            this.inventory[resource] -= quantity;
            market.supply += quantity;
            market.demand -= Math.floor(quantity * 0.1);
            
            const transaction = {
                type: 'sell',
                resource: resource,
                quantity: quantity,
                price: market.price,
                totalValue: totalRevenue,
                timestamp: Date.now(),
                tick: gameState.tick,
                profit: profit
            };
            
            this.transactions.push(transaction);
            this.statistics.totalVolume += totalRevenue;
            this.statistics.totalProfit += profit;
            
            if (profit > 0) {
                this.statistics.successfulTrades++;
            }
            
            // Guardar en base de datos
            await DatabaseManager.saveTransaction(this.id, transaction);
            
            return true;
        }
        return false;
    }
}

// Inicializar bots mejorado
function initializeBots() {
    const botConfigs = [
        { type: 'conservative', name: 'Warren_Bot' },
        { type: 'aggressive', name: 'Wolf_Bot' },
        { type: 'contrarian', name: 'Contra_Bot' },
        { type: 'arbitrageur', name: 'Arbit_Bot' },
        { type: 'hoarder', name: 'Dragon_Bot' },
        { type: 'balanced', name: 'Zen_Bot' }
    ];
    
    botConfigs.forEach(config => {
        const bot = BotFactory.createBot(config.type, config.name);
        gameState.bots.set(bot.id, bot);
        console.log(`🤖 Bot creado: ${bot.name} (${bot.strategy})`);
    });
}

// Lógica de bots mejorada
async function runBotActions() {
    const allPlayers = new Map([...gameState.players, ...gameState.bots]);
    
    for (const [botId, bot] of gameState.bots) {
        try {
            const action = bot.decideAction(gameState.market, allPlayers);
            if (action) {
                const success = bot.executeTransaction(action, gameState.market);
                if (success) {
                    await updateMarketPrices(action.resource);
                    
                    // Guardar transacción del bot
                    await DatabaseManager.saveTransaction(botId, {
                        type: action.action,
                        resource: action.resource,
                        quantity: action.quantity,
                        price: gameState.market[action.resource].price,
                        totalValue: action.quantity * gameState.market[action.resource].price,
                        tick: gameState.tick,
                        profit: action.action === 'sell' ? action.quantity * 0.1 : 0
                    });
                    
                    console.log(`🤖 ${bot.name}: ${action.action} ${action.quantity} ${action.resource} at $${gameState.market[action.resource].price}`);
                    
                    // Notificar a clientes
                    io.emit('bot_action', {
                        botName: bot.name,
                        action: action.action,
                        resource: action.resource,
                        quantity: action.quantity,
                        price: gameState.market[action.resource].price,
                        market: gameState.market
                    });
                }
            }
        } catch (error) {
            console.error(`Error en bot ${bot.name}:`, error);
        }
    }
}

// Función mejorada para actualizar precios
async function updateMarketPrices(resource) {
    const market = gameState.market[resource];
    const resourceConfig = constants.RESOURCES[resource];
    
    // Algoritmo mejorado de oferta y demanda
    const ratio = market.demand / market.supply;
    const baseChange = (ratio - 1) * 0.1;
    
    // Aplicar volatilidad específica del recurso
    const volatilityFactor = 1 + (Math.random() - 0.5) * resourceConfig.volatility;
    const priceChange = baseChange * volatilityFactor;
    
    // Aplicar efectos del ciclo económico
    const cycleEffects = constants.ECONOMIC_CYCLES[gameState.economicCycle.toUpperCase()];
    const cycleFactor = cycleEffects ? cycleEffects.effects.priceVolatility : 1;
    
    market.price = Math.max(
        constants.SYSTEM_LIMITS.MIN_PRICE,
        Math.min(
            constants.SYSTEM_LIMITS.MAX_PRICE,
            Math.round(market.price * (1 + priceChange * cycleFactor))
        )
    );
    
    // Regeneración natural ajustada por ciclo económico
    const supplyMultiplier = cycleEffects ? cycleEffects.effects.supplyMultiplier : 1;
    const demandMultiplier = cycleEffects ? cycleEffects.effects.demandMultiplier : 1;
    
    market.supply = Math.min(
        constants.SYSTEM_LIMITS.MAX_SUPPLY,
        Math.max(
            constants.SYSTEM_LIMITS.MIN_SUPPLY,
            Math.floor(market.supply + (Math.random() * 20 - 5) * supplyMultiplier)
        )
    );
    
    market.demand = Math.min(
        constants.SYSTEM_LIMITS.MAX_DEMAND,
        Math.max(
            constants.SYSTEM_LIMITS.MIN_DEMAND,
            Math.floor(market.demand + (Math.random() * 30 - 15) * demandMultiplier)
        )
    );
    
    // Guardar historial de precios
    await DatabaseManager.savePriceHistory(
        { [resource]: market },
        gameState.tick,
        gameState.economicCycle
    );
}

// Generar eventos de mercado mejorado
async function generateMarketEvent() {
    const eventTypes = Object.values(constants.MARKET_EVENTS);
    const totalProbability = eventTypes.reduce((sum, event) => sum + event.probability, 0);
    
    if (Math.random() < totalProbability) {
        const randomValue = Math.random() * totalProbability;
        let cumulativeProbability = 0;
        
        for (let eventConfig of eventTypes) {
            cumulativeProbability += eventConfig.probability;
            if (randomValue <= cumulativeProbability) {
                
                const selectedResource = eventConfig.resources[
                    Math.floor(Math.random() * eventConfig.resources.length)
                ];
                
                const severity = eventConfig.severity.min + 
                    Math.random() * (eventConfig.severity.max - eventConfig.severity.min);
                
                const market = gameState.market[selectedResource];
                const effects = eventConfig.effects;
                
                market.supply = Math.max(
                    constants.SYSTEM_LIMITS.MIN_SUPPLY,
                    Math.floor(market.supply * (1 + effects.supply * severity))
                );
                market.demand = Math.max(
                    constants.SYSTEM_LIMITS.MIN_DEMAND,
                    Math.floor(market.demand * (1 + effects.demand * severity))
                );
                
                const event = {
                    type: eventConfig.type,
                    name: eventConfig.name,
                    description: eventConfig.description,
                    resource: selectedResource,
                    severity: severity,
                    tick: gameState.tick,
                    timestamp: Date.now()
                };
                
                gameState.marketEvents.push(event);
                
                // Guardar evento en base de datos
                await DatabaseManager.saveMarketEvent(event, gameState.tick);
                
                // Limpiar eventos viejos
                if (gameState.marketEvents.length > 10) {
                    gameState.marketEvents.shift();
                }
                
                return event;
            }
        }
    }
    
    return null;
}

// Simulación económica principal
async function economicTick() {
    try {
        gameState.tick++;
        console.log(`\n📊 === TICK ECONÓMICO #${gameState.tick} ===`);
        
        // 1. Ejecutar acciones de bots
        await runBotActions();
        
        // 2. Generar eventos aleatorios
        const event = await generateMarketEvent();
        
        // 3. Actualizar mercado naturalmente
        for (let resource of gameState.resources) {
            await updateMarketPrices(resource);
        }
        
        // 4. Simular ciclos económicos
        await simulateEconomicCycle();
        
        // 5. Ejecutar análisis de mercado cada 5 ticks
        if (gameState.tick % 5 === 0) {
            await runMarketAnalysis();
        }
        
        // 6. Detectar carteles cada 10 ticks
        if (gameState.tick % 10 === 0) {
            await runCartelDetection();
        }
        
        // 7. Enviar actualizaciones a clientes
        const tickData = {
            tick: gameState.tick,
            market: gameState.market,
            event: event,
            cycle: gameState.economicCycle,
            marketEvents: gameState.marketEvents.slice(-3),
            analytics: gameState.analytics.lastReport ? {
                marketTrend: gameState.analytics.lastReport.marketOverview.marketTrend,
                riskLevel: gameState.analytics.riskLevel,
                cartelAlerts: gameState.analytics.cartelAlerts.length
            } : null
        };
        
        io.emit('economic_tick', tickData);
        
        // Log del estado del mercado
        console.log(`💰 Precios: ${Object.entries(gameState.market)
            .map(([r, m]) => `${r}:$${m.price}`).join(', ')}`);
        console.log(`📈 Ciclo: ${gameState.economicCycle} | Jugadores: ${gameState.players.size} | Bots: ${gameState.bots.size}`);
        if (event) {
            console.log(`🌍 Evento: ${event.name} afecta ${event.resource} (severidad: ${event.severity.toFixed(2)})`);
        }
        
    } catch (error) {
        console.error('❌ Error en tick económico:', error);
    }
}

// Ejecutar análisis de mercado
async function runMarketAnalysis() {
    try {
        console.log('📊 Ejecutando análisis de mercado...');
        
        // Calcular indicadores técnicos para todos los recursos
        for (let resource of gameState.resources) {
            await marketAnalytics.calculateTechnicalIndicators(resource);
            await marketAnalytics.generateMarketPredictions(resource);
        }
        
        // Calcular métricas de riesgo
        await marketAnalytics.calculateRiskMetrics();
        
        // Generar reporte completo
        const report = await marketAnalytics.generateMarketReport();
        if (report) {
            gameState.analytics.lastReport = report;
            
            // Determinar nivel de riesgo general
            const volatilities = Object.values(report.riskAssessment)
                .map(risk => risk.volatility || 0);
            const avgVolatility = volatilities.reduce((a, b) => a + b, 0) / volatilities.length;
            
            if (avgVolatility < 0.2) gameState.analytics.riskLevel = 'low';
            else if (avgVolatility < 0.4) gameState.analytics.riskLevel = 'medium';
            else if (avgVolatility < 0.6) gameState.analytics.riskLevel = 'high';
            else gameState.analytics.riskLevel = 'extreme';
            
            console.log(`📊 Análisis completado - Riesgo: ${gameState.analytics.riskLevel}`);
        }
        
    } catch (error) {
        console.error('❌ Error en análisis de mercado:', error);
    }
}

// Ejecutar detección de carteles
async function runCartelDetection() {
    try {
        console.log('🕵️ Ejecutando detección de carteles...');
        
        const cartelSignals = await marketAnalytics.detectCartelActivity();
        gameState.analytics.cartelAlerts = [];
        
        for (let [resource, signals] of Object.entries(cartelSignals)) {
            if (signals.riskScore > constants.CARTEL_DETECTION.THRESHOLDS.overallRisk) {
                const alert = {
                    resource: resource,
                    riskScore: signals.riskScore,
                    timestamp: Date.now(),
                    tick: gameState.tick,
                    details: signals
                };
                
                gameState.analytics.cartelAlerts.push(alert);
                
                console.log(`🚨 ALERTA DE CARTEL: ${resource} (riesgo: ${(signals.riskScore * 100).toFixed(1)}%)`);
                
                // Notificar a clientes
                io.emit('cartel_alert', alert);
            }
        }
        
    } catch (error) {
        console.error('❌ Error en detección de carteles:', error);
    }
}

// Simular ciclos económicos
async function simulateEconomicCycle() {
    gameState.cycleCounter++;
    
    const currentCycleConfig = constants.ECONOMIC_CYCLES[gameState.economicCycle.toUpperCase()];
    if (!currentCycleConfig) return;
    
    const minDuration = currentCycleConfig.duration.min;
    const maxDuration = currentCycleConfig.duration.max;
    const cycleDuration = minDuration + Math.floor(Math.random() * (maxDuration - minDuration + 1));
    
    if (gameState.cycleCounter >= cycleDuration) {
        const nextCycles = currentCycleConfig.nextCycles;
        const nextCycle = nextCycles[Math.floor(Math.random() * nextCycles.length)];
        
        console.log(`🔄 Cambio de ciclo: ${gameState.economicCycle} → ${nextCycle}`);
        
        gameState.economicCycle = nextCycle;
        gameState.cycleCounter = 0;
        
        // Aplicar efectos inmediatos del nuevo ciclo
        await applyEconomicCycleEffects();
        
        // Notificar cambio de ciclo
        io.emit('cycle_change', {
            oldCycle: gameState.economicCycle,
            newCycle: nextCycle,
            tick: gameState.tick
        });
    }
}

// Aplicar efectos de ciclos económicos
async function applyEconomicCycleEffects() {
    const effects = constants.ECONOMIC_CYCLES[gameState.economicCycle.toUpperCase()];
    if (!effects) return;
    
    console.log(`📊 Aplicando efectos del ciclo ${gameState.economicCycle}`);
    
    for (let resource of gameState.resources) {
        const market = gameState.market[resource];
        
        market.supply = Math.floor(market.supply * effects.effects.supplyMultiplier);
        market.demand = Math.floor(market.demand * effects.effects.demandMultiplier);
        
        // Asegurar límites
        market.supply = Math.max(constants.SYSTEM_LIMITS.MIN_SUPPLY, 
                               Math.min(constants.SYSTEM_LIMITS.MAX_SUPPLY, market.supply));
        market.demand = Math.max(constants.SYSTEM_LIMITS.MIN_DEMAND, 
                               Math.min(constants.SYSTEM_LIMITS.MAX_DEMAND, market.demand));
    }
}

// Conexiones WebSocket
io.on('connection', (socket) => {
    console.log(`🔌 Usuario conectado: ${socket.id}`);

    // Registro de jugador
    socket.on('register', async (playerData) => {
        try {
            const player = new GamePlayer(socket.id, playerData.name || `Player_${socket.id.substring(0, 6)}`);
            gameState.players.set(socket.id, player);
            
            // Guardar jugador en base de datos
            await Player.findOrCreate({
                where: { id: socket.id },
                defaults: {
                    id: socket.id,
                    name: player.name,
                    money: player.money,
                    inventory: player.inventory,
                    isBot: false
                }
            });
            
            socket.emit('registered', {
                player: player,
                gameState: {
                    market: gameState.market,
                    tick: gameState.tick,
                    economicCycle: gameState.economicCycle,
                    analytics: gameState.analytics.lastReport ? {
                        marketTrend: gameState.analytics.lastReport.marketOverview.marketTrend,
                        riskLevel: gameState.analytics.riskLevel
                    } : null
                }
            });
            
            socket.broadcast.emit('player_joined', {
                player: { id: player.id, name: player.name }
            });
            
            console.log(`👤 Jugador registrado: ${player.name}`);
            
        } catch (error) {
            console.error('Error registrando jugador:', error);
            socket.emit('error', { message: 'Error al registrar jugador' });
        }
    });

    // Manejar transacciones
    socket.on('trade', async (tradeData) => {
        try {
            const player = gameState.players.get(socket.id);
            if (!player) {
                socket.emit('trade_result', {
                    success: false,
                    message: 'Jugador no encontrado'
                });
                return;
            }

            const { action, resource, quantity } = tradeData;
            
            // Validaciones
            if (!gameState.resources.includes(resource)) {
                socket.emit('trade_result', {
                    success: false,
                    message: 'Recurso no válido'
                });
                return;
            }
            
            if (quantity <= 0 || quantity > constants.SYSTEM_LIMITS.MAX_TRANSACTION_SIZE) {
                socket.emit('trade_result', {
                    success: false,
                    message: `Cantidad debe estar entre 1 y ${constants.SYSTEM_LIMITS.MAX_TRANSACTION_SIZE}`
                });
                return;
            }

            let success = false;

            if (action === 'buy') {
                success = await player.buy(resource, quantity);
            } else if (action === 'sell') {
                success = await player.sell(resource, quantity);
            }

            if (success) {
                await updateMarketPrices(resource);
                
                socket.emit('trade_result', {
                    success: true,
                    player: player,
                    market: gameState.market,
                    transaction: player.transactions[player.transactions.length - 1]
                });
                
                io.emit('market_update', gameState.market);
                
                console.log(`💰 ${player.name}: ${action} ${quantity} ${resource} at ${gameState.market[resource].price}`);
                
            } else {
                socket.emit('trade_result', {
                    success: false,
                    message: action === 'buy' ? 
                        'Fondos insuficientes o stock agotado' : 
                        'Inventario insuficiente'
                });
            }
            
        } catch (error) {
            console.error('Error en transacción:', error);
            socket.emit('trade_result', {
                success: false,
                message: 'Error interno del servidor'
            });
        }
    });

    // Obtener leaderboard
    socket.on('get_leaderboard', async () => {
        try {
            const allPlayers = new Map([...gameState.players, ...gameState.bots]);
            const leaderboard = Array.from(allPlayers.values())
                .map((player, index) => ({
                    name: player.name,
                    netWorth: player.getNetWorth ? player.getNetWorth() : calculatePlayerNetWorth(player),
                    money: player.money,
                    isBot: player.isBot || false,
                    transactions: player.transactions ? player.transactions.length : 0,
                    totalProfit: player.statistics ? player.statistics.totalProfit : 0
                }))
                .sort((a, b) => b.netWorth - a.netWorth)
                .map((player, index) => ({ ...player, rank: index + 1 }));
            
            socket.emit('leaderboard', leaderboard);
            
        } catch (error) {
            console.error('Error obteniendo leaderboard:', error);
            socket.emit('error', { message: 'Error obteniendo leaderboard' });
        }
    });

    // Obtener analytics de mercado
    socket.on('get_market_analytics', async () => {
        try {
            const report = gameState.analytics.lastReport;
            if (report) {
                socket.emit('market_analytics', {
                    report: report,
                    cartelAlerts: gameState.analytics.cartelAlerts,
                    riskLevel: gameState.analytics.riskLevel,
                    lastUpdate: report.timestamp
                });
            } else {
                socket.emit('market_analytics', {
                    message: 'Analytics aún no disponible'
                });
            }
        } catch (error) {
            console.error('Error obteniendo analytics:', error);
            socket.emit('error', { message: 'Error obteniendo analytics' });
        }
    });

    // Obtener estadísticas de jugador
    socket.on('get_player_stats', async () => {
        try {
            const stats = await DatabaseManager.getPlayerStatistics(socket.id);
            socket.emit('player_stats', stats);
        } catch (error) {
            console.error('Error obteniendo estadísticas:', error);
            socket.emit('error', { message: 'Error obteniendo estadísticas' });
        }
    });

    // Desconexión
    socket.on('disconnect', () => {
        const player = gameState.players.get(socket.id);
        if (player) {
            console.log(`👋 Jugador desconectado: ${player.name}`);
        }
        gameState.players.delete(socket.id);
    });
});

// Funciones de utilidad
function calculatePlayerNetWorth(player) {
    let total = player.money;
    for (let resource in player.inventory) {
        total += player.inventory[resource] * gameState.market[resource].price;
    }
    return total;
}

// Rutas de la API REST
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

app.get('/api/game-info', (req, res) => {
    const allPlayers = new Map([...gameState.players, ...gameState.bots]);
    res.json({
        playersCount: gameState.players.size,
        botsCount: gameState.bots.size,
        totalPlayers: allPlayers.size,
        market: gameState.market,
        tick: gameState.tick,
        economicCycle: gameState.economicCycle,
        recentEvents: gameState.marketEvents.slice(-5),
        analytics: {
            riskLevel: gameState.analytics.riskLevel,
            cartelAlerts: gameState.analytics.cartelAlerts.length,
            lastAnalysis: gameState.analytics.lastReport ? gameState.analytics.lastReport.timestamp : null
        }
    });
});

app.get('/api/market-analytics', async (req, res) => {
    try {
        const analytics = await DatabaseManager.getMarketAnalytics(7);
        res.json({
            success: true,
            data: analytics,
            currentReport: gameState.analytics.lastReport
        });
    } catch (error) {
        console.error('Error en API analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo analytics'
        });
    }
});

app.get('/api/player/:id/stats', async (req, res) => {
    try {
        const stats = await DatabaseManager.getPlayerStatistics(req.params.id);
        if (stats) {
            res.json({ success: true, data: stats });
        } else {
            res.status(404).json({ success: false, message: 'Jugador no encontrado' });
        }
    } catch (error) {
        console.error('Error en API stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo estadísticas'
        });
    }
});

// Inicialización del servidor
async function startServer() {
    try {
        // Inicializar base de datos
        await DatabaseManager.initialize();
        
        // Inicializar bots
        initializeBots();
        
        // Iniciar tick económico
        setInterval(economicTick, constants.GAME_CONFIG.TICK_INTERVAL);
        
        // Iniciar análisis periódico
        setInterval(runMarketAnalysis, constants.GAME_CONFIG.TICK_INTERVAL * 5);
        
        // Iniciar servidor
        server.listen(PORT, () => {
            console.log(`🎮 Simulador de Economía ejecutándose en puerto ${PORT}`);
            console.log(`📊 Mercado inicializado con ${gameState.resources.length} recursos`);
            console.log(`🤖 ${gameState.bots.size} bots activos`);
            console.log(`🔄 Tick económico cada ${constants.GAME_CONFIG.TICK_INTERVAL / 1000} segundos`);
            console.log(`📈 Analytics y detección de carteles habilitados`);
        });
        
    } catch (error) {
        console.error('❌ Error iniciando servidor:', error);
        process.exit(1);
    }
}

// Manejo de errores globales
process.on('uncaughtException', (error) => {
    console.error('❌ Error no capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promesa rechazada:', reason);
});

// Iniciar servidor
startServer();

module.exports = app;