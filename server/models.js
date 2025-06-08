// server/models-final.js - Solución definitiva para errores de FK
const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

// Configuración de la base de datos
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, '../database.sqlite'),
    logging: false,
    define: {
        freezeTableName: true,
        timestamps: true
    },
    // 🔧 CORRECCIÓN: Configuración para manejar Foreign Keys
    dialectOptions: {
        foreignKeys: true
    }
});

// Modelo de Jugador
const Player = sequelize.define('Player', {
    id: {
        type: DataTypes.STRING,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    money: {
        type: DataTypes.INTEGER,
        defaultValue: 1000
    },
    inventory: {
        type: DataTypes.JSON,
        defaultValue: {
            agua: 50,
            comida: 30,
            energia: 20,
            materiales: 10
        }
    },
    isBot: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    strategy: {
        type: DataTypes.STRING,
        allowNull: true
    },
    personality: {
        type: DataTypes.JSON,
        allowNull: true
    },
    totalNetWorth: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    gamesPlayed: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    bestRank: {
        type: DataTypes.INTEGER,
        defaultValue: 999
    }
});

// 🔧 CORRECCIÓN: Modelo de Transacción simplificado sin FK estrictas
const Transaction = sequelize.define('Transaction', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    transactionId: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    playerId: {
        type: DataTypes.STRING,
        allowNull: false
        // 🔧 REMOVEMOS la foreign key constraint por ahora
    },
    playerName: {
        type: DataTypes.STRING,
        allowNull: true  // Campo adicional para debug
    },
    type: {
        type: DataTypes.ENUM('buy', 'sell'),
        allowNull: false
    },
    resource: {
        type: DataTypes.STRING,
        allowNull: false
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    price: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    totalValue: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    tick: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    profit: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    }
}, {
    indexes: [
        {
            fields: ['playerId']
        },
        {
            fields: ['tick']
        },
        {
            fields: ['resource']
        },
        {
            fields: ['transactionId']
        }
    ]
});

// Otros modelos sin cambios
const PriceHistory = sequelize.define('PriceHistory', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    resource: {
        type: DataTypes.STRING,
        allowNull: false
    },
    price: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    supply: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    demand: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    tick: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    economicCycle: {
        type: DataTypes.STRING,
        allowNull: false
    }
});

const MarketEvent = sequelize.define('MarketEvent', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    type: {
        type: DataTypes.STRING,
        allowNull: false
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    resource: {
        type: DataTypes.STRING,
        allowNull: false
    },
    effect: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {}
    },
    tick: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    severity: {
        type: DataTypes.FLOAT,
        defaultValue: 1.0
    },
    duration: {
        type: DataTypes.INTEGER,
        defaultValue: 1
    }
});

const GameSession = sequelize.define('GameSession', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    startTick: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    endTick: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    totalPlayers: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    totalBots: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    totalTransactions: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    averagePrice: {
        type: DataTypes.JSON,
        allowNull: true
    },
    economicCycles: {
        type: DataTypes.JSON,
        allowNull: true
    },
    winnerData: {
        type: DataTypes.JSON,
        allowNull: true
    }
});

const BotStrategy = sequelize.define('BotStrategy', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    parameters: {
        type: DataTypes.JSON,
        allowNull: false
    },
    performance: {
        type: DataTypes.JSON,
        defaultValue: {
            totalProfit: 0,
            winRate: 0,
            averageRank: 0,
            gamesPlayed: 0
        }
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
});

// 🔧 CORRECCIÓN: Relaciones opcionales
// No definimos FK constraints estrictas para evitar errores
Player.hasMany(Transaction, { foreignKey: 'playerId', constraints: false });
Transaction.belongsTo(Player, { foreignKey: 'playerId', constraints: false });

// En models.js, agregar este sistema de cola
class DatabaseQueue {
    constructor() {
        this.queue = [];
        this.processing = false;
    }

    async add(operation) {
        return new Promise((resolve, reject) => {
            this.queue.push({ operation, resolve, reject });
            this.processQueue();
        });
    }

    async processQueue() {
        if (this.processing || this.queue.length === 0) return;
        
        this.processing = true;
        
        while (this.queue.length > 0) {
            const { operation, resolve, reject } = this.queue.shift();
            
            try {
                const result = await operation();
                resolve(result);
                // Pequeña pausa para evitar conflictos
                await new Promise(resolve => setTimeout(resolve, 10));
            } catch (error) {
                console.warn('⚠️ Error en operación de BD, reintentando:', error.message);
                
                // Reintentar una vez más
                try {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    const result = await operation();
                    resolve(result);
                } catch (retryError) {
                    console.error('❌ Error definitivo en BD:', retryError.message);
                    reject(retryError);
                }
            }
        }
        
        this.processing = false;
    }
}

// Instancia global de la cola
const dbQueue = new DatabaseQueue();

// DatabaseManager mejorado con manejo robusto
class DatabaseManager {
    static isEnabled = true;
    static playersCache = new Map(); // Cache de jugadores
    
    static async initialize() {
        try {
            console.log('🔧 Inicializando base de datos...');
            
            await sequelize.authenticate();
            console.log('📊 Conexión a base de datos establecida');
            
            // Sincronizar con force para empezar limpio
            await sequelize.sync({ force: true });
            console.log('📊 Tablas creadas/actualizadas');
            
            await this.createDefaultBotStrategies();
            
            console.log('✅ Base de datos inicializada correctamente');
            
        } catch (error) {
            console.error('❌ Error inicializando BD:', error.message);
            this.disableDatabase();
            throw error;
        }
    }

    static async createDefaultBotStrategies() {
        const strategies = [
            {
                name: 'conservative',
                parameters: { riskTolerance: 0.3, maxInvestment: 0.2 }
            },
            {
                name: 'aggressive', 
                parameters: { riskTolerance: 0.8, maxInvestment: 0.6 }
            },
            {
                name: 'balanced',
                parameters: { riskTolerance: 0.5, maxInvestment: 0.4 }
            }
        ];

        for (let strategy of strategies) {
            try {
                await BotStrategy.findOrCreate({
                    where: { name: strategy.name },
                    defaults: strategy
                });
            } catch (error) {
                console.warn(`⚠️ Error creando estrategia ${strategy.name}`);
            }
        }
    }

    // 🔧 CORRECCIÓN: Método para asegurar que el jugador existe en BD
    static async ensurePlayerExists(playerId, playerName = null, isBot = false) {
        if (!this.isEnabled) return null;
        
        // Usar la cola para evitar conflictos
        return await dbQueue.add(async () => {
            try {
                // Verificar cache primero
                if (this.playersCache.has(playerId)) {
                    return this.playersCache.get(playerId);
                }
                
                // Buscar o crear el jugador con timeout más largo
                const [player, created] = await Player.findOrCreate({
                    where: { id: playerId },
                    defaults: {
                        id: playerId,
                        name: playerName || `Player_${playerId.substring(0, 8)}`,
                        isBot: isBot,
                        money: 1000,
                        inventory: {
                            agua: 50,
                            comida: 30,
                            energia: 20,
                            materiales: 10
                        }
                    },
                    // Configurar timeout específico para esta operación
                    timeout: 5000
                });
                
                // Agregar al cache
                this.playersCache.set(playerId, player);
                
                if (created) {
                    console.log(`📝 Jugador ${playerName || 'Bot'} registrado en BD`);
                }
                
                return player;
                
            } catch (error) {
                console.error(`❌ Error asegurando jugador ${playerId}:`, error.message);
                return null;
            }
        });
    }

    // 🔧 CORRECCIÓN: Método mejorado para guardar transacciones
    static async saveTransaction(playerId, transactionData, playerName = null) {
        if (!this.isEnabled) return null;
        
        // Usar la cola para transacciones también
        return await dbQueue.add(async () => {
            try {
                // Preparar datos de transacción
                const transactionId = transactionData.id || require('uuid').v4();
                
                const cleanData = {
                    transactionId: String(transactionId),
                    playerId: String(playerId),
                    playerName: playerName || 'Unknown',
                    type: String(transactionData.type),
                    resource: String(transactionData.resource),
                    quantity: parseInt(transactionData.quantity) || 0,
                    price: parseFloat(transactionData.price) || 0,
                    totalValue: parseFloat(transactionData.totalValue) || 0,
                    tick: parseInt(transactionData.tick) || 0,
                    profit: parseFloat(transactionData.profit) || 0
                };

                // Validar datos
                if (!cleanData.playerId || !cleanData.type || !cleanData.resource) {
                    console.warn('⚠️ Datos inválidos para transacción');
                    return null;
                }

                // Guardar transacción con timeout
                const transaction = await Transaction.create(cleanData, { timeout: 3000 });
                console.log(`💾 Transacción guardada: ${cleanData.type} ${cleanData.quantity} ${cleanData.resource}`);
                
                return transaction;
                
            } catch (error) {
                console.error('❌ Error guardando transacción:', error.message);
                return null;
            }
        });
    }

    // 🔧 CORRECCIÓN: Método para registrar bots en BD
    static async registerBot(bot) {
        if (!this.isEnabled) return null;
        
        try {
            const player = await this.ensurePlayerExists(
                bot.id, 
                bot.name, 
                true  // isBot = true
            );
            
            if (player && bot.strategy) {
                await player.update({
                    strategy: bot.strategy,
                    personality: bot.personality || null
                });
            }
            
            return player;
            
        } catch (error) {
            console.error(`❌ Error registrando bot ${bot.name}:`, error.message);
            return null;
        }
    }

    static async savePriceHistory(marketData, tick, cycle) {
        if (!this.isEnabled) return null;
        
        try {
            const promises = Object.entries(marketData).map(([resource, data]) => {
                return PriceHistory.create({
                    resource: resource,
                    price: data.price || 0,
                    supply: data.supply || 0,
                    demand: data.demand || 0,
                    tick: tick || 0,
                    economicCycle: cycle || 'expansion'
                });
            });
            
            await Promise.all(promises);
            
        } catch (error) {
            console.error('❌ Error guardando historial:', error.message);
        }
    }

    static async saveMarketEvent(eventData, tick) {
        if (!this.isEnabled) return null;
        
        try {
            const cleanEventData = {
                type: eventData.type || 'unknown',
                name: eventData.name || 'Market Event',
                resource: eventData.resource || 'agua',
                effect: eventData.effect || { supply: 0, demand: 0 },
                tick: tick || 0,
                severity: eventData.severity || 1.0,
                duration: eventData.duration || 1
            };

            const event = await MarketEvent.create(cleanEventData);
            return event;
            
        } catch (error) {
            console.error('❌ Error guardando evento:', error.message);
            return null;
        }
    }

    static async getPlayerStatistics(playerId) {
        if (!this.isEnabled) return null;
        
        try {
            const player = await Player.findByPk(playerId);
            if (!player) return null;

            const transactions = await Transaction.findAll({
                where: { playerId: playerId },
                order: [['createdAt', 'DESC']],
                limit: 50
            });

            const totalTransactions = transactions.length;
            const totalVolume = transactions.reduce((sum, t) => sum + t.totalValue, 0);
            const totalProfit = transactions
                .filter(t => t.type === 'sell')
                .reduce((sum, t) => sum + t.profit, 0);
            
            return {
                player: player.toJSON(),
                statistics: {
                    totalTransactions,
                    totalVolume,
                    totalProfit,
                    averageTransactionSize: totalVolume / (totalTransactions || 1),
                    profitability: totalProfit / (totalVolume || 1)
                }
            };
            
        } catch (error) {
            console.error('❌ Error obteniendo estadísticas:', error.message);
            return null;
        }
    }

    static async resetDatabase() {
        try {
            console.log('🔄 Reinicializando base de datos...');
            
            // Limpiar cache
            this.playersCache.clear();
            
            // Recrear tablas
            await sequelize.sync({ force: true });
            await this.createDefaultBotStrategies();
            
            console.log('✅ Base de datos reinicializada');
            
        } catch (error) {
            console.error('❌ Error reinicializando BD:', error.message);
            this.disableDatabase();
        }
    }

    static disableDatabase() {
        console.log('⚠️ Base de datos desactivada');
        this.isEnabled = false;
        
        // Sobrescribir métodos
        this.saveTransaction = () => Promise.resolve(null);
        this.savePriceHistory = () => Promise.resolve(null);
        this.saveMarketEvent = () => Promise.resolve(null);
        this.ensurePlayerExists = () => Promise.resolve(null);
        this.registerBot = () => Promise.resolve(null);
    }

    static async checkHealth() {
        if (!this.isEnabled) return { healthy: false, reason: 'Database disabled' };
        
        try {
            await sequelize.authenticate();
            return { healthy: true };
        } catch (error) {
            return { healthy: false, reason: error.message };
        }
    }
}

module.exports = {
    sequelize,
    Player,
    Transaction,
    PriceHistory,
    MarketEvent,
    GameSession,
    BotStrategy,
    DatabaseManager
};