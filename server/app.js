// server/app.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

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

// Estado del juego (en memoria por ahora)
const gameState = {
    players: new Map(),
    resources: ['agua', 'comida', 'energia', 'materiales'],
    market: {
        agua: { price: 10, supply: 1000, demand: 800 },
        comida: { price: 15, supply: 800, demand: 900 },
        energia: { price: 20, supply: 600, demand: 700 },
        materiales: { price: 25, supply: 500, demand: 600 }
    },
    tick: 0 // Contador de turnos económicos
};

// Clase Player para manejar jugadores
class Player {
    constructor(id, name) {
        this.id = id;
        this.name = name;
        this.money = 1000; // Dinero inicial
        this.inventory = {
            agua: 50,
            comida: 30,
            energia: 20,
            materiales: 10
        };
        this.score = 0;
        this.transactions = [];
        this.isBot = false;
    }

    // Calcular valor total del jugador
    getNetWorth() {
        let inventoryValue = 0;
        for (let resource in this.inventory) {
            inventoryValue += this.inventory[resource] * gameState.market[resource].price;
        }
        return this.money + inventoryValue;
    }

    // Ejecutar compra
    buy(resource, quantity) {
        const market = gameState.market[resource];
        const totalCost = market.price * quantity;
        
        if (this.money >= totalCost && market.supply >= quantity) {
            this.money -= totalCost;
            this.inventory[resource] += quantity;
            market.supply -= quantity;
            market.demand += Math.floor(quantity * 0.1); // Aumenta demanda ligeramente
            
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

    // Ejecutar venta
    sell(resource, quantity) {
        const market = gameState.market[resource];
        
        if (this.inventory[resource] >= quantity) {
            const totalRevenue = market.price * quantity;
            this.money += totalRevenue;
            this.inventory[resource] -= quantity;
            market.supply += quantity;
            market.demand -= Math.floor(quantity * 0.1); // Reduce demanda ligeramente
            
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

// Conexiones WebSocket
io.on('connection', (socket) => {
    console.log(`Usuario conectado: ${socket.id}`);

    // Registro de jugador
    socket.on('register', (playerData) => {
        const player = new Player(socket.id, playerData.name || `Player_${socket.id.substring(0, 6)}`);
        gameState.players.set(socket.id, player);
        
        socket.emit('registered', {
            player: player,
            gameState: {
                market: gameState.market,
                tick: gameState.tick
            }
        });
        
        // Notificar a otros jugadores
        socket.broadcast.emit('player_joined', {
            player: { id: player.id, name: player.name }
        });
        
        console.log(`Jugador registrado: ${player.name}`);
    });

    // Manejar transacciones
    socket.on('trade', (tradeData) => {
        const player = gameState.players.get(socket.id);
        if (!player) return;

        const { action, resource, quantity } = tradeData;
        let success = false;

        if (action === 'buy') {
            success = player.buy(resource, quantity);
        } else if (action === 'sell') {
            success = player.sell(resource, quantity);
        }

        if (success) {
            // Actualizar precios basado en oferta y demanda
            updateMarketPrices(resource);
            
            socket.emit('trade_result', {
                success: true,
                player: player,
                market: gameState.market
            });
            
            // Notificar a todos los jugadores sobre cambios de mercado
            io.emit('market_update', gameState.market);
        } else {
            socket.emit('trade_result', {
                success: false,
                message: 'Transacción no válida'
            });
        }
    });

    // Obtener leaderboard
    socket.on('get_leaderboard', () => {
        const leaderboard = Array.from(gameState.players.values())
            .map(player => ({
                name: player.name,
                netWorth: player.getNetWorth(),
                money: player.money
            }))
            .sort((a, b) => b.netWorth - a.netWorth);
        
        socket.emit('leaderboard', leaderboard);
    });

    // Desconexión
    socket.on('disconnect', () => {
        gameState.players.delete(socket.id);
        console.log(`Usuario desconectado: ${socket.id}`);
    });
});

// Función para actualizar precios de mercado
function updateMarketPrices(resource) {
    const market = gameState.market[resource];
    
    // Algoritmo simple de oferta y demanda
    const ratio = market.demand / market.supply;
    const priceChange = (ratio - 1) * 0.1; // 10% máximo de cambio
    
    market.price = Math.max(1, Math.round(market.price * (1 + priceChange)));
    
    // Regeneración natural de recursos
    market.supply += Math.floor(Math.random() * 10) + 5;
    market.demand = Math.max(1, market.demand + Math.floor(Math.random() * 20) - 10);
}

// Simulación económica (tick cada 30 segundos)
function economicTick() {
    gameState.tick++;
    
    // Actualizar mercado naturalmente
    for (let resource in gameState.market) {
        updateMarketPrices(resource);
    }
    
    // Enviar actualizaciones a todos los clientes
    io.emit('economic_tick', {
        tick: gameState.tick,
        market: gameState.market
    });
    
    console.log(`Tick económico #${gameState.tick}`);
}

// Iniciar simulación económica
setInterval(economicTick, 30000); // Cada 30 segundos

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

// API REST para información del juego
app.get('/api/game-info', (req, res) => {
    res.json({
        playersCount: gameState.players.size,
        market: gameState.market,
        tick: gameState.tick
    });
});

// Iniciar servidor
server.listen(PORT, () => {
    console.log(`🎮 Simulador de Economía ejecutándose en puerto ${PORT}`);
    console.log(`📊 Mercado inicializado con ${gameState.resources.length} recursos`);
});

module.exports = app;
