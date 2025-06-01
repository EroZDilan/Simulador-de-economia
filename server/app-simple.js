// server/app-simple.js - Versión simplificada que funciona
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

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

// Estado del juego simplificado
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
    cycleCounter: 0
};

// Clase Player simplificada
class SimplePlayer {
    constructor(id, name) {
        this.id = id;
        this.name = name;
        this.money = 1000;
        this.inventory = {
            agua: 50,
            comida: 30,
            energia: 20,
            materiales: 10
        };
        this.transactions = [];
        this.isBot = false;
    }

    getNetWorth() {
        let inventoryValue = 0;
        for (let resource in this.inventory) {
            inventoryValue += this.inventory[resource] * gameState.market[resource].price;
        }
        return this.money + inventoryValue;
    }

    buy(resource, quantity) {
        const market = gameState.market[resource];
        const totalCost = market.price * quantity;
        
        if (this.money >= totalCost && market.supply >= quantity) {
            this.money -= totalCost;
            this.inventory[resource] += quantity;
            market.supply -= quantity;
            market.demand += Math.floor(quantity * 0.1);
            
            this.transactions.push({
                type: 'buy',
                resource: resource,
                quantity: quantity,
                price: market.price,
                timestamp: Date.now()
            });
            
            return true;
        }
        return false;
    }

    sell(resource, quantity) {
        const market = gameState.market[resource];
        
        if (this.inventory[resource] >= quantity) {
            const totalRevenue = market.price * quantity;
            this.money += totalRevenue;
            this.inventory[resource] -= quantity;
            market.supply += quantity;
            market.demand -= Math.floor(quantity * 0.1);
            
            this.transactions.push({
                type: 'sell',
                resource: resource,
                quantity: quantity,
                price: market.price,
                timestamp: Date.now()
            });
            
            return true;
        }
        return false;
    }
}

// Bot simplificado
class SimpleBot extends SimplePlayer {
    constructor(name, strategy) {
        super(`bot_${uuidv4()}`, name);
        this.isBot = true;
        this.strategy = strategy;
        this.lastAction = Date.now();
        this.patience = Math.random() * 15000 + 5000; // 5-20 segundos (más activo)
    }

    decideAction() {
        if (Date.now() - this.lastAction < this.patience) {
            return null;
        }

        const resources = Object.keys(gameState.market);
        const resource = resources[Math.floor(Math.random() * resources.length)];
        const market = gameState.market[resource];
        
        // Estrategia más agresiva basada en el tipo de bot
        const ratio = market.demand / market.supply;
        
        if (this.strategy === 'aggressive' || ratio > 1.1) {
            // Comprar cuando hay demanda alta
            if (this.money > market.price * 5) {
                return {
                    action: 'buy',
                    resource: resource,
                    quantity: Math.min(20, Math.floor(this.money / market.price / 3))
                };
            }
        } else if (this.strategy === 'conservative' || ratio < 0.9) {
            // Vender cuando hay poca demanda
            if (this.inventory[resource] > 3) {
                return {
                    action: 'sell',
                    resource: resource,
                    quantity: Math.min(15, Math.floor(this.inventory[resource] / 2))
                };
            }
        }
        
        // Acción aleatoria para mantener actividad
        if (Math.random() < 0.3) {
            if (this.money > market.price * 10) {
                return {
                    action: 'buy',
                    resource: resource,
                    quantity: Math.floor(Math.random() * 10) + 1
                };
            }
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
            this.patience = Math.random() * 15000 + 5000; // Nueva paciencia
            
            console.log(`🤖 ${this.name}: ${action.action} ${action.quantity} ${action.resource} at ${gameState.market[action.resource].price}`);
            
            // Notificar a clientes inmediatamente
            io.emit('bot_action', {
                botName: this.name,
                action: action.action,
                resource: action.resource,
                quantity: action.quantity,
                price: gameState.market[action.resource].price,
                market: gameState.market
            });
            
            // Actualizar mercado inmediatamente
            io.emit('market_update', gameState.market);
        }

        return success;
    }
}

// Crear bots
function createBots() {
    const botConfigs = [
        { name: 'Warren_Bot', strategy: 'conservative' },
        { name: 'Wolf_Bot', strategy: 'aggressive' },
        { name: 'Contra_Bot', strategy: 'contrarian' },
        { name: 'Arbit_Bot', strategy: 'arbitrage' },
        { name: 'Dragon_Bot', strategy: 'hoarder' }
    ];
    
    botConfigs.forEach(config => {
        const bot = new SimpleBot(config.name, config.strategy);
        gameState.bots.set(bot.id, bot);
        console.log(`🤖 Bot creado: ${bot.name}`);
    });
}

// Actualizar precios de mercado
function updateMarketPrices() {
    for (let resource in gameState.market) {
        const market = gameState.market[resource];
        const ratio = market.demand / market.supply;
        const priceChange = (ratio - 1) * 0.1;
        
        market.price = Math.max(1, Math.round(market.price * (1 + priceChange)));
        market.supply += Math.floor(Math.random() * 20) - 5;
        market.demand += Math.floor(Math.random() * 30) - 15;
        
        // Límites
        market.supply = Math.max(50, Math.min(5000, market.supply));
        market.demand = Math.max(50, Math.min(5000, market.demand));
    }
}

// Tick económico
function economicTick() {
    gameState.tick++;
    console.log(`📊 Tick #${gameState.tick}`);
    
    // Ejecutar bots
    gameState.bots.forEach(bot => {
        bot.executeAction();
    });
    
    // Actualizar mercado
    updateMarketPrices();
    
    // Enviar actualización
    io.emit('economic_tick', {
        tick: gameState.tick,
        market: gameState.market,
        cycle: gameState.economicCycle
    });
}

// WebSocket connections
io.on('connection', (socket) => {
    console.log(`Usuario conectado: ${socket.id}`);

    socket.on('register', (playerData) => {
        const player = new SimplePlayer(socket.id, playerData.name || `Player_${socket.id.substring(0, 6)}`);
        gameState.players.set(socket.id, player);
        
        socket.emit('registered', {
            player: player,
            gameState: {
                market: gameState.market,
                tick: gameState.tick,
                economicCycle: gameState.economicCycle
            }
        });
        
        // Enviar leaderboard inmediatamente
        setTimeout(() => {
            const allPlayers = new Map([...gameState.players, ...gameState.bots]);
            const leaderboard = Array.from(allPlayers.values())
                .map(player => ({
                    name: player.name,
                    netWorth: player.getNetWorth(),
                    money: player.money,
                    isBot: player.isBot || false
                }))
                .sort((a, b) => b.netWorth - a.netWorth);
            
            socket.emit('leaderboard', leaderboard);
        }, 500);
        
        // Enviar analytics básicos inmediatamente
        setTimeout(() => {
            socket.emit('market_analytics', {
                report: {
                    marketTrend: 'neutral',
                    riskLevel: 'medium',
                    cartelAlerts: 0
                }
            });
        }, 1000);
        
        console.log(`Jugador registrado: ${player.name}`);
    });

    socket.on('trade', (tradeData) => {
        const player = gameState.players.get(socket.id);
        if (!player) {
            socket.emit('trade_result', {
                success: false,
                message: 'Jugador no encontrado'
            });
            return;
        }

        const { action, resource, quantity } = tradeData;
        
        // Validaciones básicas
        if (!resource || quantity <= 0 || quantity > 1000) {
            socket.emit('trade_result', {
                success: false,
                message: 'Cantidad inválida'
            });
            return;
        }

        if (!gameState.market[resource]) {
            socket.emit('trade_result', {
                success: false,
                message: 'Recurso no válido'
            });
            return;
        }

        let success = false;
        let errorMessage = '';

        try {
            if (action === 'buy') {
                success = player.buy(resource, quantity);
                if (!success) {
                    errorMessage = 'Fondos insuficientes o stock agotado';
                }
            } else if (action === 'sell') {
                success = player.sell(resource, quantity);
                if (!success) {
                    errorMessage = 'Inventario insuficiente';
                }
            } else {
                errorMessage = 'Acción no válida';
            }

            if (success) {
                updateMarketPrices();
                
                socket.emit('trade_result', {
                    success: true,
                    player: player,
                    market: gameState.market
                });
                
                io.emit('market_update', gameState.market);
                
                console.log(`💰 ${player.name}: ${action} ${quantity} ${resource} at ${gameState.market[resource].price}`);
            } else {
                socket.emit('trade_result', {
                    success: false,
                    message: errorMessage
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

    socket.on('get_leaderboard', () => {
        const allPlayers = new Map([...gameState.players, ...gameState.bots]);
        const leaderboard = Array.from(allPlayers.values())
            .map(player => ({
                name: player.name,
                netWorth: player.getNetWorth(),
                money: player.money,
                isBot: player.isBot || false
            }))
            .sort((a, b) => b.netWorth - a.netWorth);
        
        socket.emit('leaderboard', leaderboard);
    });

    // Agregar analytics básicos
    socket.on('get_market_analytics', () => {
        console.log('Solicitando analytics...'); // Debug
        
        // Analytics simplificados
        const analytics = {
            marketTrend: 'neutral',
            riskLevel: 'medium',
            cartelAlerts: 0,
            lastUpdate: new Date()
        };
        
        // Calcular tendencia basada en precios
        let totalPriceChange = 0;
        let resources = 0;
        for (let resource in gameState.market) {
            // Comparar con precio base
            const basePrice = { agua: 10, comida: 15, energia: 20, materiales: 25 }[resource];
            const currentPrice = gameState.market[resource].price;
            totalPriceChange += (currentPrice - basePrice) / basePrice;
            resources++;
        }
        
        const avgChange = totalPriceChange / resources;
        if (avgChange > 0.1) analytics.marketTrend = 'bullish';
        else if (avgChange < -0.1) analytics.marketTrend = 'bearish';
        
        console.log('Enviando analytics:', analytics); // Debug
        socket.emit('market_analytics', { report: analytics });
    });

    socket.on('disconnect', () => {
        gameState.players.delete(socket.id);
        console.log(`Usuario desconectado: ${socket.id}`);
    });
});

// Rutas
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

app.get('/api/game-info', (req, res) => {
    res.json({
        playersCount: gameState.players.size,
        botsCount: gameState.bots.size,
        market: gameState.market,
        tick: gameState.tick
    });
});

// Inicializar
createBots();

// Tick más frecuente para más acción
setInterval(economicTick, 20000); // Cada 20 segundos

// Ejecutar bots más frecuentemente
setInterval(() => {
    gameState.bots.forEach(bot => {
        bot.executeAction();
    });
}, 8000); // Cada 8 segundos

server.listen(PORT, () => {
    console.log(`🎮 Simulador ejecutándose en puerto ${PORT}`);
    console.log(`🤖 ${gameState.bots.size} bots activos`);
    console.log(`📊 Mercado inicializado`);
});

module.exports = app;