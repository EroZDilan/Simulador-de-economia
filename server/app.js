// server/app-final.js - Versión Final Limpia y Estable
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Configuración
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

// Estado del juego
const gameState = {
    players: new Map(),
    bots: new Map(),
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
    analytics: {
        lastReport: {
            marketTrend: 'neutral',
            riskLevel: 'medium',
            cartelAlerts: 0,
            timestamp: Date.now()
        },
        cartelAlerts: [],
        riskLevel: 'medium'
    }
};

// Clase Player
class GamePlayer {
    constructor(id, name) {
        this.id = id;
        this.name = name;
        this.money = 1000;
        this.inventory = { agua: 50, comida: 30, energia: 20, materiales: 10 };
        this.transactions = [];
        this.isBot = false;
        this.statistics = {
            totalProfit: 0,
            totalVolume: 0,
            successfulTrades: 0,
            gamesPlayed: 0
        };
        this.joinedAt = Date.now();
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

    buy(resource, quantity) {
        const market = gameState.market[resource];
        if (!market) return false;
        
        const totalCost = market.price * quantity;
        
        if (this.money >= totalCost && market.supply >= quantity && quantity > 0) {
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
                tick: gameState.tick
            };
            
            this.transactions.push(transaction);
            this.statistics.totalVolume += totalCost;
            
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
        
        // Calcular profit básico
        const avgCost = this.transactions
            .filter(t => t.type === 'buy' && t.resource === resource)
            .reduce((sum, t, _, arr) => sum + t.price / arr.length, 0) || market.price;
        
        const profit = (market.price - avgCost) * quantity;
        
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
        
        return true;
    }
}

// Bot inteligente
class SmartBot extends GamePlayer {
    constructor(name, strategy = 'balanced') {
        super(`bot_${uuidv4()}`, name);
        this.isBot = true;
        this.strategy = strategy;
        this.lastAction = Date.now();
        this.patience = Math.random() * 15000 + 5000; // 5-20 segundos
        this.personality = {
            riskTolerance: Math.random(),
            greed: Math.random() * 0.5 + 0.25,
            patience: Math.random() * 0.8 + 0.2
        };
        this.priceMemory = {};
    }

    updatePriceMemory() {
        for (let resource in gameState.market) {
            if (!this.priceMemory[resource]) {
                this.priceMemory[resource] = [];
            }
            this.priceMemory[resource].push(gameState.market[resource].price);
            if (this.priceMemory[resource].length > 10) {
                this.priceMemory[resource].shift();
            }
        }
    }

    decideAction() {
        if (Date.now() - this.lastAction < this.patience) {
            return null;
        }

        this.updatePriceMemory();
        
        const resources = Object.keys(gameState.market);
        const resource = resources[Math.floor(Math.random() * resources.length)];
        const market = gameState.market[resource];
        
        // Estrategia basada en tipo de bot
        const ratio = market.demand / market.supply;
        
        switch (this.strategy) {
            case 'aggressive':
                if (ratio > 1.1 && this.money > market.price * 15) {
                    return {
                        action: 'buy',
                        resource: resource,
                        quantity: Math.min(25, Math.floor(this.money * 0.4 / market.price))
                    };
                } else if (ratio < 0.9 && this.inventory[resource] > 10) {
                    return {
                        action: 'sell',
                        resource: resource,
                        quantity: Math.min(20, Math.floor(this.inventory[resource] * 0.6))
                    };
                }
                break;
                
            case 'conservative':
                if (ratio > 1.3 && this.money > market.price * 20) {
                    return {
                        action: 'buy',
                        resource: resource,
                        quantity: Math.min(10, Math.floor(this.money * 0.2 / market.price))
                    };
                } else if (ratio < 0.7 && this.inventory[resource] > 15) {
                    return {
                        action: 'sell',
                        resource: resource,
                        quantity: Math.min(8, Math.floor(this.inventory[resource] * 0.3))
                    };
                }
                break;
                
            case 'contrarian':
                const prices = this.priceMemory[resource] || [market.price];
                if (prices.length >= 3) {
                    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
                    
                    if (market.price < avgPrice * 0.9 && this.money > market.price * 10) {
                        return {
                            action: 'buy',
                            resource: resource,
                            quantity: Math.min(15, Math.floor(this.money * 0.3 / market.price))
                        };
                    } else if (market.price > avgPrice * 1.1 && this.inventory[resource] > 8) {
                        return {
                            action: 'sell',
                            resource: resource,
                            quantity: Math.min(12, Math.floor(this.inventory[resource] * 0.4))
                        };
                    }
                }
                break;
                
            case 'arbitrageur':
                if (ratio > 1.2 && this.money > market.price * 12) {
                    return {
                        action: 'buy',
                        resource: resource,
                        quantity: Math.min(18, Math.floor(this.money * 0.35 / market.price))
                    };
                } else if (ratio < 0.8 && this.inventory[resource] > 12) {
                    return {
                        action: 'sell',
                        resource: resource,
                        quantity: Math.min(15, Math.floor(this.inventory[resource] * 0.5))
                    };
                }
                break;
                
            case 'hoarder':
                const favoriteResource = ['agua', 'comida', 'energia', 'materiales'][
                    Math.floor(this.personality.greed * 4)
                ];
                
                if (resource === favoriteResource) {
                    if (this.money > market.price * 8) {
                        return {
                            action: 'buy',
                            resource: resource,
                            quantity: Math.min(22, Math.floor(this.money * 0.5 / market.price))
                        };
                    }
                } else if (this.inventory[resource] > 20) {
                    return {
                        action: 'sell',
                        resource: resource,
                        quantity: Math.min(10, Math.floor(this.inventory[resource] * 0.4))
                    };
                }
                break;
                
            default: // balanced
                if (ratio > 1.15 && this.money > market.price * 12) {
                    return {
                        action: 'buy',
                        resource: resource,
                        quantity: Math.min(15, Math.floor(this.money * 0.3 / market.price))
                    };
                } else if (ratio < 0.85 && this.inventory[resource] > 10) {
                    return {
                        action: 'sell',
                        resource: resource,
                        quantity: Math.min(12, Math.floor(this.inventory[resource] * 0.4))
                    };
                }
                break;
        }
        
        return null;
    }

    executeAction() {
        const action = this.decideAction();
        if (!action) return false;

        let success = false;
        if (action.action === 'buy') {
            success = this.buy(action.resource, action.quantity);
        } else if (action.action === 'sell') {
            success = this.sell(action.resource, action.quantity);
        }

        if (success) {
            this.lastAction = Date.now();
            this.patience = Math.random() * 15000 + 5000;
            
            console.log(`🤖 ${this.name}: ${action.action} ${action.quantity} ${action.resource} at $${gameState.market[action.resource].price}`);
            
            // Notificar a clientes
            io.emit('bot_action', {
                botName: this.name,
                action: action.action,
                resource: action.resource,
                quantity: action.quantity,
                price: gameState.market[action.resource].price,
                market: gameState.market
            });
        }

        return success;
    }
}

// Crear bots
function initializeBots() {
    const botConfigs = [
        { name: 'Warren_Bot', strategy: 'conservative' },
        { name: 'Wolf_Bot', strategy: 'aggressive' },
        { name: 'Contra_Bot', strategy: 'contrarian' },
        { name: 'Arbit_Bot', strategy: 'arbitrageur' },
        { name: 'Dragon_Bot', strategy: 'hoarder' },
        { name: 'Zen_Bot', strategy: 'balanced' }
    ];
    
    botConfigs.forEach(config => {
        const bot = new SmartBot(config.name, config.strategy);
        gameState.bots.set(bot.id, bot);
        console.log(`🤖 Bot creado: ${bot.name} (${bot.strategy})`);
    });
}

// Ejecutar acciones de bots
function runBotActions() {
    gameState.bots.forEach(bot => {
        try {
            bot.executeAction();
        } catch (error) {
            console.error(`❌ Error en bot ${bot.name}:`, error.message);
        }
    });
}

// Actualizar precios de mercado
function updateMarketPrices() {
    for (let resource of gameState.resources) {
        const market = gameState.market[resource];
        
        // Algoritmo de precios
        const ratio = market.demand / market.supply;
        const baseChange = (ratio - 1) * 0.08; // 8% máximo
        
        // Añadir volatilidad
        const volatility = (Math.random() - 0.5) * 0.04; // ±2%
        const priceChange = baseChange + volatility;
        
        market.price = Math.max(1, Math.round(market.price * (1 + priceChange)));
        
        // Regeneración natural
        market.supply += Math.floor(Math.random() * 25) - 10;
        market.demand += Math.floor(Math.random() * 30) - 15;
        
        // Límites
        market.supply = Math.max(100, Math.min(3000, market.supply));
        market.demand = Math.max(100, Math.min(3000, market.demand));
    }
}

// Generar eventos de mercado
function generateMarketEvent() {
    const events = [
        { type: 'drought', name: 'Sequía', resource: 'agua', supply: -0.2, demand: 0.15 },
        { type: 'harvest', name: 'Gran Cosecha', resource: 'comida', supply: 0.3, demand: -0.1 },
        { type: 'blackout', name: 'Apagón', resource: 'energia', supply: -0.15, demand: 0.2 },
        { type: 'discovery', name: 'Nuevo Yacimiento', resource: 'materiales', supply: 0.25, demand: 0.05 },
        { type: 'innovation', name: 'Innovación', resource: 'energia', supply: 0.15, demand: -0.1 }
    ];
    
    if (Math.random() < 0.25) { // 25% probabilidad
        const event = events[Math.floor(Math.random() * events.length)];
        const market = gameState.market[event.resource];
        
        market.supply = Math.floor(market.supply * (1 + event.supply));
        market.demand = Math.floor(market.demand * (1 + event.demand));
        
        // Asegurar límites
        market.supply = Math.max(100, Math.min(3000, market.supply));
        market.demand = Math.max(100, Math.min(3000, market.demand));
        
        gameState.marketEvents.push({
            ...event,
            tick: gameState.tick,
            timestamp: Date.now()
        });
        
        // Limpiar eventos viejos
        if (gameState.marketEvents.length > 8) {
            gameState.marketEvents.shift();
        }
        
        return event;
    }
    
    return null;
}

// Simular ciclos económicos
function simulateEconomicCycle() {
    gameState.cycleCounter++;
    
    if (gameState.cycleCounter >= 12) { // Cambiar cada 12 ticks
        const cycles = ['expansion', 'peak', 'contraction', 'trough'];
        const currentIndex = cycles.indexOf(gameState.economicCycle);
        gameState.economicCycle = cycles[(currentIndex + 1) % cycles.length];
        gameState.cycleCounter = 0;
        
        console.log(`🔄 Cambio de ciclo: ${gameState.economicCycle}`);
        
        // Aplicar efectos del ciclo
        const effects = {
            expansion: { supply: 1.05, demand: 1.1 },
            peak: { supply: 1.0, demand: 1.15 },
            contraction: { supply: 0.95, demand: 0.9 },
            trough: { supply: 0.9, demand: 0.85 }
        };
        
        const effect = effects[gameState.economicCycle];
        for (let resource of gameState.resources) {
            const market = gameState.market[resource];
            market.supply = Math.floor(market.supply * effect.supply);
            market.demand = Math.floor(market.demand * effect.demand);
        }
    }
}

// Analytics básicos
function runMarketAnalysis() {
    try {
        // Calcular tendencia basada en precios
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
        const volatilities = gameState.resources.map(resource => {
            const market = gameState.market[resource];
            const ratio = market.demand / market.supply;
            return Math.abs(ratio - 1);
        });
        
        const avgVolatility = volatilities.reduce((a, b) => a + b, 0) / volatilities.length;
        let riskLevel = 'medium';
        if (avgVolatility < 0.2) riskLevel = 'low';
        else if (avgVolatility < 0.4) riskLevel = 'medium';
        else if (avgVolatility < 0.6) riskLevel = 'high';
        else riskLevel = 'extreme';
        
        gameState.analytics.lastReport = {
            marketTrend: marketTrend,
            riskLevel: riskLevel,
            cartelAlerts: 0,
            timestamp: Date.now()
        };
        
        gameState.analytics.riskLevel = riskLevel;
        
        console.log(`📊 Analytics: Tendencia ${marketTrend}, Riesgo ${riskLevel}`);
        
    } catch (error) {
        console.error('❌ Error en análisis:', error.message);
    }
}

// Tick económico principal
function economicTick() {
    try {
        gameState.tick++;
        console.log(`\n📊 === TICK ECONÓMICO #${gameState.tick} ===`);
        
        // 1. Ejecutar bots
        runBotActions();
        
        // 2. Generar eventos
        const event = generateMarketEvent();
        
        // 3. Actualizar mercado
        updateMarketPrices();
        
        // 4. Simular ciclos
        simulateEconomicCycle();
        
        // 5. Ejecutar analytics cada 3 ticks
        if (gameState.tick % 3 === 0) {
            runMarketAnalysis();
        }
        
        // 6. Enviar actualizaciones
        const tickData = {
            tick: gameState.tick,
            market: gameState.market,
            event: event,
            cycle: gameState.economicCycle,
            marketEvents: gameState.marketEvents.slice(-3),
            analytics: gameState.analytics.lastReport ? {
                marketTrend: gameState.analytics.lastReport.marketTrend,
                riskLevel: gameState.analytics.riskLevel,
                cartelAlerts: gameState.analytics.cartelAlerts.length
            } : null
        };
        
        io.emit('economic_tick', tickData);
        
        // Log del estado
        const prices = gameState.resources.map(r => `${r}:$${gameState.market[r].price}`).join(', ');
        console.log(`💰 Precios: ${prices}`);
        console.log(`📈 Ciclo: ${gameState.economicCycle} | Jugadores: ${gameState.players.size} | Bots: ${gameState.bots.size}`);
        
        if (event) {
            console.log(`🌍 Evento: ${event.name} afecta ${event.resource}`);
        }
        
    } catch (error) {
        console.error('❌ Error en tick económico:', error);
    }
}

// WebSocket connections
io.on('connection', (socket) => {
    console.log(`🔌 Usuario conectado: ${socket.id}`);

    socket.on('register', (playerData) => {
        try {
            const player = new GamePlayer(socket.id, playerData.name || `Player_${socket.id.substring(0, 6)}`);
            gameState.players.set(socket.id, player);
            
            socket.emit('registered', {
                player: player,
                gameState: {
                    market: gameState.market,
                    tick: gameState.tick,
                    economicCycle: gameState.economicCycle,
                    analytics: gameState.analytics.lastReport
                }
            });
            
            socket.broadcast.emit('player_joined', {
                player: { id: player.id, name: player.name }
            });
            
            // Enviar datos inmediatamente
            setTimeout(() => {
                socket.emit('get_leaderboard');
                socket.emit('get_market_analytics');
            }, 500);
            
            console.log(`👤 Jugador registrado: ${player.name}`);
            
        } catch (error) {
            console.error('❌ Error registrando jugador:', error);
            socket.emit('error', { message: 'Error al registrar' });
        }
    });

    socket.on('trade', (tradeData) => {
        try {
            const player = gameState.players.get(socket.id);
            if (!player) {
                socket.emit('trade_result', { success: false, message: 'Jugador no encontrado' });
                return;
            }

            const { action, resource, quantity } = tradeData;
            
            // Validaciones
            if (!gameState.resources.includes(resource)) {
                socket.emit('trade_result', { success: false, message: 'Recurso no válido' });
                return;
            }
            
            if (quantity <= 0 || quantity > 1000) {
                socket.emit('trade_result', { success: false, message: 'Cantidad inválida' });
                return;
            }

            let success = false;
            if (action === 'buy') {
                success = player.buy(resource, quantity);
            } else if (action === 'sell') {
                success = player.sell(resource, quantity);
            }

            if (success) {
                updateMarketPrices();
                
                socket.emit('trade_result', {
                    success: true,
                    player: player,
                    market: gameState.market,
                    transaction: player.transactions[player.transactions.length - 1]
                });
                
                io.emit('market_update', gameState.market);
                
                console.log(`💰 ${player.name}: ${action} ${quantity} ${resource} at $${gameState.market[resource].price}`);
                
            } else {
                const message = action === 'buy' ? 
                    'Fondos insuficientes o stock agotado' : 
                    'Inventario insuficiente';
                
                socket.emit('trade_result', { success: false, message });
            }
            
        } catch (error) {
            console.error('❌ Error en transacción:', error);
            socket.emit('trade_result', { success: false, message: 'Error interno' });
        }
    });

    socket.on('get_leaderboard', () => {
        try {
            const allPlayers = new Map([...gameState.players, ...gameState.bots]);
            const leaderboard = Array.from(allPlayers.values())
                .map(player => ({
                    name: player.name,
                    netWorth: player.getNetWorth(),
                    money: player.money,
                    isBot: player.isBot || false,
                    transactions: player.transactions ? player.transactions.length : 0,
                    totalProfit: player.statistics ? player.statistics.totalProfit : 0
                }))
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
            const analytics = gameState.analytics.lastReport;
            
            socket.emit('market_analytics', {
                report: analytics,
                cartelAlerts: gameState.analytics.cartelAlerts,
                riskLevel: gameState.analytics.riskLevel,
                lastUpdate: analytics.timestamp
            });
            
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

    socket.on('disconnect', () => {
        const player = gameState.players.get(socket.id);
        if (player) {
            console.log(`👋 Jugador desconectado: ${player.name}`);
        }
        gameState.players.delete(socket.id);
    });
});

// Rutas API
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
            lastAnalysis: gameState.analytics.lastReport.timestamp
        }
    });
});

// Iniciar servidor
function startServer() {
    console.log('🚀 Iniciando Simulador de Economía...');
    
    // Inicializar bots
    initializeBots();
    
    // Iniciar sistemas
    setInterval(economicTick, 15000); // Cada 15 segundos
    setInterval(runBotActions, 8000); // Bots cada 8 segundos
    setInterval(runMarketAnalysis, 30000); // Analytics cada 30 segundos
    
    // Iniciar servidor HTTP
    server.listen(PORT, () => {
        console.log('\n🎮 ==========================================');
        console.log(`🎮 Simulador de Economía ejecutándose en puerto ${PORT}`);
        console.log(`📊 Mercado inicializado con ${gameState.resources.length} recursos`);
        console.log(`🤖 ${gameState.bots.size} bots activos`);
        console.log(`🔄 Tick económico cada 15 segundos`);
        console.log(`📈 Analytics básicos activados`);
        console.log(`🌐 URL: http://localhost:${PORT}`);
        console.log('🎮 ==========================================\n');
    });
}

// Manejo de errores
process.on('uncaughtException', (error) => {
    console.error('❌ Error no capturado:', error.message);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promesa rechazada:', reason);
});

// Manejo de cierre graceful
process.on('SIGINT', () => {
    console.log('\n📊 Cerrando servidor...');
    console.log(`📈 Total de ticks ejecutados: ${gameState.tick}`);
    console.log(`👥 Jugadores totales: ${gameState.players.size}`);
    console.log('👋 ¡Hasta luego!');
    process.exit(0);
});

// Iniciar servidor
startServer();

module.exports = app;