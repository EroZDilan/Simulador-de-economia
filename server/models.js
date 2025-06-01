// server/models.js
const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

// Configuración de la base de datos
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, '../database.sqlite'),
    logging: false, // Desactivar logs de SQL
    define: {
        freezeTableName: true,
        timestamps: true
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

// Modelo de Transacción
const Transaction = sequelize.define('Transaction', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    playerId: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
            model: Player,
            key: 'id'
        }
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
});

// Modelo de Historial de Precios
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

// Modelo de Eventos del Mercado
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
    resource: {
        type: DataTypes.STRING,
        allowNull: false
    },
    effect: {
        type: DataTypes.JSON,
        allowNull: false
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

// Modelo de Sesiones de Juego
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

// Modelo de Estrategias de IA
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

// Relaciones
Player.hasMany(Transaction, { foreignKey: 'playerId' });
Transaction.belongsTo(Player, { foreignKey: 'playerId' });

// Funciones de utilidad para la base de datos
class DatabaseManager {
    static async initialize() {
        try {
            await sequelize.authenticate();
            console.log('📊 Conexión a base de datos establecida');
            
            await sequelize.sync({ alter: true });
            console.log('📊 Modelos sincronizados');
            
            // Crear estrategias de bots por defecto
            await this.createDefaultBotStrategies();
            
        } catch (error) {
            console.error('❌ Error conectando a la base de datos:', error);
        }
    }

    static async createDefaultBotStrategies() {
        const defaultStrategies = [
            {
                name: 'conservative',
                parameters: {
                    riskTolerance: 0.3,
                    maxInvestmentPercentage: 0.2,
                    profitTakeThreshold: 0.15,
                    stopLossThreshold: -0.1
                }
            },
            {
                name: 'aggressive',
                parameters: {
                    riskTolerance: 0.8,
                    maxInvestmentPercentage: 0.6,
                    profitTakeThreshold: 0.3,
                    stopLossThreshold: -0.2
                }
            },
            {
                name: 'contrarian',
                parameters: {
                    riskTolerance: 0.5,
                    contrarianThreshold: 0.2,
                    maxInvestmentPercentage: 0.4,
                    holdingPeriod: 5
                }
            }
        ];

        for (let strategy of defaultStrategies) {
            await BotStrategy.findOrCreate({
                where: { name: strategy.name },
                defaults: strategy
            });
        }
    }

    static async saveTransaction(playerId, transactionData) {
        try {
            const transaction = await Transaction.create({
                playerId: playerId,
                ...transactionData
            });
            return transaction;
        } catch (error) {
            console.error('Error guardando transacción:', error);
            return null;
        }
    }

    static async savePriceHistory(marketData, tick, cycle) {
        try {
            const promises = Object.entries(marketData).map(([resource, data]) => {
                return PriceHistory.create({
                    resource: resource,
                    price: data.price,
                    supply: data.supply,
                    demand: data.demand,
                    tick: tick,
                    economicCycle: cycle
                });
            });
            
            await Promise.all(promises);
        } catch (error) {
            console.error('Error guardando historial de precios:', error);
        }
    }

    static async saveMarketEvent(eventData, tick) {
        try {
            const event = await MarketEvent.create({
                ...eventData,
                tick: tick
            });
            return event;
        } catch (error) {
            console.error('Error guardando evento de mercado:', error);
            return null;
        }
    }

    static async getPlayerStatistics(playerId) {
        try {
            const player = await Player.findByPk(playerId, {
                include: [{
                    model: Transaction,
                    order: [['createdAt', 'DESC']],
                    limit: 50
                }]
            });

            if (!player) return null;

            const transactions = player.Transactions || [];
            const totalTransactions = transactions.length;
            const totalVolume = transactions.reduce((sum, t) => sum + t.totalValue, 0);
            
            const buyTransactions = transactions.filter(t => t.type === 'buy');
            const sellTransactions = transactions.filter(t => t.type === 'sell');
            
            const totalProfit = sellTransactions.reduce((sum, t) => sum + t.profit, 0);
            
            return {
                player: player.toJSON(),
                statistics: {
                    totalTransactions,
                    totalVolume,
                    totalProfit,
                    averageTransactionSize: totalVolume / (totalTransactions || 1),
                    buyCount: buyTransactions.length,
                    sellCount: sellTransactions.length,
                    profitability: totalProfit / (totalVolume || 1)
                }
            };
        } catch (error) {
            console.error('Error obteniendo estadísticas del jugador:', error);
            return null;
        }
    }

    static async getMarketAnalytics(days = 7) {
        try {
            const since = new Date();
            since.setDate(since.getDate() - days);

            const priceHistory = await PriceHistory.findAll({
                where: {
                    createdAt: {
                        [Sequelize.Op.gte]: since
                    }
                },
                order: [['tick', 'ASC']]
            });

            const marketEvents = await MarketEvent.findAll({
                where: {
                    createdAt: {
                        [Sequelize.Op.gte]: since
                    }
                },
                order: [['tick', 'ASC']]
            });

            const transactions = await Transaction.findAll({
                where: {
                    createdAt: {
                        [Sequelize.Op.gte]: since
                    }
                },
                order: [['tick', 'ASC']]
            });

            return {
                priceHistory,
                marketEvents,
                transactions,
                analytics: this.calculateMarketMetrics(priceHistory, transactions)
            };
        } catch (error) {
            console.error('Error obteniendo analíticas del mercado:', error);
            return null;
        }
    }

    static calculateMarketMetrics(priceHistory, transactions) {
        const resources = ['agua', 'comida', 'energia', 'materiales'];
        const metrics = {};

        resources.forEach(resource => {
            const resourcePrices = priceHistory
                .filter(p => p.resource === resource)
                .map(p => p.price);
            
            const resourceTransactions = transactions
                .filter(t => t.resource === resource);

            if (resourcePrices.length > 0) {
                const prices = resourcePrices;
                const minPrice = Math.min(...prices);
                const maxPrice = Math.max(...prices);
                const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
                
                // Calcular volatilidad (desviación estándar)
                const variance = prices.reduce((sum, price) => {
                    return sum + Math.pow(price - avgPrice, 2);
                }, 0) / prices.length;
                const volatility = Math.sqrt(variance);

                // Volumen de transacciones
                const volume = resourceTransactions.reduce((sum, t) => sum + t.quantity, 0);

                metrics[resource] = {
                    minPrice,
                    maxPrice,
                    avgPrice,
                    volatility,
                    volume,
                    priceChange: prices.length > 1 ? 
                        ((prices[prices.length - 1] - prices[0]) / prices[0]) * 100 : 0
                };
            }
        });

        return metrics;
    }

    static async updateBotPerformance(botId, profit, rank) {
        try {
            const player = await Player.findByPk(botId);
            if (!player || !player.isBot) return;

            const strategy = await BotStrategy.findOne({
                where: { name: player.strategy }
            });

            if (strategy) {
                const perf = strategy.performance;
                perf.totalProfit += profit;
                perf.gamesPlayed += 1;
                perf.averageRank = ((perf.averageRank * (perf.gamesPlayed - 1)) + rank) / perf.gamesPlayed;
                perf.winRate = rank === 1 ? (perf.winRate + 1) / perf.gamesPlayed : perf.winRate;

                await strategy.update({ performance: perf });
            }
        } catch (error) {
            console.error('Error actualizando rendimiento del bot:', error);
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