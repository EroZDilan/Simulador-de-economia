// server/bots.js
const { v4: uuidv4 } = require('uuid');

class EconomicBot {
    constructor(name, strategy = 'balanced') {
        this.id = `bot_${uuidv4()}`;
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
        this.personality = this.generatePersonality();
        this.priceMemory = {}; // Recuerda precios históricos
        this.lastAction = Date.now();
        this.patience = Math.random() * 30000 + 10000; // 10-40 segundos entre acciones
    }

    generatePersonality() {
        // Cada bot tiene características psicológicas únicas
        return {
            riskTolerance: Math.random(), // 0 = conservador, 1 = arriesgado
            greed: Math.random() * 0.5 + 0.25, // 0.25-0.75
            patience: Math.random() * 0.8 + 0.2, // 0.2-1.0
            memory: Math.random() * 0.9 + 0.1, // Qué tan bien recuerda precios pasados
            socialInfluence: Math.random() * 0.6, // Susceptibilidad a tendencias de mercado
            overconfidence: Math.random() * 0.4 + 0.1 // Sesgo de sobreconfianza
        };
    }

    // Calcular valor neto
    getNetWorth(market) {
        let inventoryValue = 0;
        for (let resource in this.inventory) {
            inventoryValue += this.inventory[resource] * market[resource].price;
        }
        return this.money + inventoryValue;
    }

    // Actualizar memoria de precios
    updatePriceMemory(market) {
        for (let resource in market) {
            if (!this.priceMemory[resource]) {
                this.priceMemory[resource] = [];
            }
            this.priceMemory[resource].push(market[resource].price);
            
            // Mantener solo los últimos N precios basado en la memoria del bot
            const memoryCapacity = Math.floor(this.personality.memory * 20) + 5;
            if (this.priceMemory[resource].length > memoryCapacity) {
                this.priceMemory[resource].shift();
            }
        }
    }

    // Detectar tendencias de precios
    detectTrend(resource) {
        const prices = this.priceMemory[resource] || [];
        if (prices.length < 3) return 'neutral';
        
        const recent = prices.slice(-3);
        const older = prices.slice(-6, -3);
        
        if (older.length === 0) return 'neutral';
        
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
        
        const change = (recentAvg - olderAvg) / olderAvg;
        
        if (change > 0.1) return 'rising';
        if (change < -0.1) return 'falling';
        return 'neutral';
    }

    // Estrategias de trading
    decideAction(market, otherPlayers) {
        this.updatePriceMemory(market);
        
        // No actuar si no ha pasado suficiente tiempo (paciencia)
        if (Date.now() - this.lastAction < this.patience) {
            return null;
        }
        
        switch (this.strategy) {
            case 'momentum':
                return this.momentumStrategy(market);
            case 'contrarian':
                return this.contrarianStrategy(market);
            case 'value':
                return this.valueStrategy(market);
            case 'arbitrage':
                return this.arbitrageStrategy(market);
            case 'hoarder':
                return this.hoarderStrategy(market);
            default:
                return this.balancedStrategy(market);
        }
    }

    // Estrategia momentum: sigue las tendencias
    momentumStrategy(market) {
        const actions = [];
        
        for (let resource in market) {
            const trend = this.detectTrend(resource);
            const currentPrice = market[resource].price;
            const supplyDemandRatio = market[resource].supply / market[resource].demand;
            
            if (trend === 'rising' && this.money > currentPrice * 10) {
                // Precio subiendo, comprar más
                const quantity = Math.min(
                    Math.floor(this.money * this.personality.riskTolerance / currentPrice),
                    market[resource].supply,
                    20
                );
                if (quantity > 0) {
                    actions.push({ action: 'buy', resource, quantity });
                }
            } else if (trend === 'falling' && this.inventory[resource] > 5) {
                // Precio bajando, vender antes de que baje más
                const quantity = Math.min(
                    Math.floor(this.inventory[resource] * 0.3),
                    15
                );
                if (quantity > 0) {
                    actions.push({ action: 'sell', resource, quantity });
                }
            }
        }
        
        return actions.length > 0 ? actions[Math.floor(Math.random() * actions.length)] : null;
    }

    // Estrategia contrarian: va contra las tendencias
    contrarianStrategy(market) {
        const actions = [];
        
        for (let resource in market) {
            const trend = this.detectTrend(resource);
            const currentPrice = market[resource].price;
            
            if (trend === 'falling' && this.money > currentPrice * 5) {
                // Precio bajando, es oportunidad de compra
                const quantity = Math.min(
                    Math.floor(this.money * 0.2 / currentPrice),
                    market[resource].supply,
                    25
                );
                if (quantity > 0) {
                    actions.push({ action: 'buy', resource, quantity });
                }
            } else if (trend === 'rising' && this.inventory[resource] > 10) {
                // Precio muy alto, vender
                const quantity = Math.min(
                    Math.floor(this.inventory[resource] * 0.4),
                    20
                );
                if (quantity > 0) {
                    actions.push({ action: 'sell', resource, quantity });
                }
            }
        }
        
        return actions.length > 0 ? actions[Math.floor(Math.random() * actions.length)] : null;
    }

    // Estrategia de valor: busca precios bajos/altos históricos
    valueStrategy(market) {
        const actions = [];
        
        for (let resource in market) {
            const prices = this.priceMemory[resource] || [];
            if (prices.length < 5) continue;
            
            const currentPrice = market[resource].price;
            const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);
            
            // Comprar si está cerca del mínimo histórico
            if (currentPrice <= minPrice * 1.1 && this.money > currentPrice * 8) {
                const quantity = Math.min(
                    Math.floor(this.money * 0.25 / currentPrice),
                    market[resource].supply,
                    30
                );
                if (quantity > 0) {
                    actions.push({ action: 'buy', resource, quantity });
                }
            }
            
            // Vender si está cerca del máximo histórico
            if (currentPrice >= maxPrice * 0.9 && this.inventory[resource] > 8) {
                const quantity = Math.min(
                    Math.floor(this.inventory[resource] * 0.5),
                    25
                );
                if (quantity > 0) {
                    actions.push({ action: 'sell', resource, quantity });
                }
            }
        }
        
        return actions.length > 0 ? actions[Math.floor(Math.random() * actions.length)] : null;
    }

    // Estrategia de arbitraje: explota diferencias de precio
    arbitrageStrategy(market) {
        // Busca oportunidades donde supply/demand está desbalanceado
        let bestOpportunity = null;
        let bestScore = 0;
        
        for (let resource in market) {
            const marketData = market[resource];
            const ratio = marketData.demand / marketData.supply;
            const trend = this.detectTrend(resource);
            
            // Oportunidad de compra (alta demanda, baja oferta, precio aún no subió mucho)
            if (ratio > 1.2 && trend !== 'rising' && this.money > marketData.price * 10) {
                const score = ratio * (2 - this.personality.riskTolerance);
                if (score > bestScore) {
                    bestScore = score;
                    bestOpportunity = {
                        action: 'buy',
                        resource: resource,
                        quantity: Math.min(15, Math.floor(this.money * 0.3 / marketData.price))
                    };
                }
            }
            
            // Oportunidad de venta (baja demanda, alta oferta, tengo inventory)
            if (ratio < 0.8 && this.inventory[resource] > 10) {
                const score = (1 / ratio) * this.personality.greed;
                if (score > bestScore) {
                    bestScore = score;
                    bestOpportunity = {
                        action: 'sell',
                        resource: resource,
                        quantity: Math.min(20, Math.floor(this.inventory[resource] * 0.4))
                    };
                }
            }
        }
        
        return bestOpportunity;
    }

    // Estrategia acumuladora: acumula recursos específicos
    hoarderStrategy(market) {
        // Escoge un recurso favorito basado en su personalidad
        const resources = Object.keys(market);
        const favoriteResource = resources[Math.floor(this.personality.greed * resources.length)];
        
        const marketData = market[favoriteResource];
        const currentPrice = marketData.price;
        
        // Siempre trata de acumular su recurso favorito
        if (this.money > currentPrice * 5) {
            const quantity = Math.min(
                Math.floor(this.money * 0.4 / currentPrice),
                marketData.supply,
                25
            );
            
            if (quantity > 0) {
                return { action: 'buy', resource: favoriteResource, quantity };
            }
        }
        
        // Vende otros recursos para comprar el favorito
        for (let resource in this.inventory) {
            if (resource !== favoriteResource && this.inventory[resource] > 15) {
                return {
                    action: 'sell',
                    resource: resource,
                    quantity: Math.min(10, Math.floor(this.inventory[resource] * 0.3))
                };
            }
        }
        
        return null;
    }

    // Estrategia balanceada: mix de todas las estrategias
    balancedStrategy(market) {
        const strategies = [
            () => this.momentumStrategy(market),
            () => this.valueStrategy(market),
            () => this.contrarianStrategy(market)
        ];
        
        // Escoge estrategia basada en personalidad
        const strategyIndex = Math.floor(this.personality.overconfidence * strategies.length);
        const chosenStrategy = strategies[strategyIndex];
        
        return chosenStrategy();
    }

    // Ejecutar transacción
    executeTransaction(action, market) {
        if (!action) return false;
        
        const { action: type, resource, quantity } = action;
        const marketData = market[resource];
        
        if (type === 'buy') {
            const totalCost = marketData.price * quantity;
            if (this.money >= totalCost && marketData.supply >= quantity) {
                this.money -= totalCost;
                this.inventory[resource] += quantity;
                marketData.supply -= quantity;
                marketData.demand += Math.floor(quantity * 0.1);
                
                this.transactions.push({
                    type: 'buy',
                    resource: resource,
                    quantity: quantity,
                    price: marketData.price,
                    timestamp: Date.now()
                });
                
                this.lastAction = Date.now();
                return true;
            }
        } else if (type === 'sell') {
            if (this.inventory[resource] >= quantity) {
                const totalRevenue = marketData.price * quantity;
                this.money += totalRevenue;
                this.inventory[resource] -= quantity;
                marketData.supply += quantity;
                marketData.demand -= Math.floor(quantity * 0.1);
                
                this.transactions.push({
                    type: 'sell',
                    resource: resource,
                    quantity: quantity,
                    price: marketData.price,
                    timestamp: Date.now()
                });
                
                this.lastAction = Date.now();
                return true;
            }
        }
        
        return false;
    }
}

// Factory para crear diferentes tipos de bots
class BotFactory {
    static createBot(type, name) {
        const botTypes = {
            'conservative': () => new EconomicBot(`${name}_Conservative`, 'value'),
            'aggressive': () => new EconomicBot(`${name}_Aggressive`, 'momentum'),
            'contrarian': () => new EconomicBot(`${name}_Contrarian`, 'contrarian'),
            'arbitrageur': () => new EconomicBot(`${name}_Arbitrageur`, 'arbitrage'),
            'hoarder': () => new EconomicBot(`${name}_Hoarder`, 'hoarder'),
            'balanced': () => new EconomicBot(`${name}_Balanced`, 'balanced')
        };
        
        return botTypes[type] ? botTypes[type]() : botTypes['balanced']();
    }
    
    static createRandomBot() {
        const names = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta'];
        const types = ['conservative', 'aggressive', 'contrarian', 'arbitrageur', 'hoarder', 'balanced'];
        
        const name = names[Math.floor(Math.random() * names.length)];
        const type = types[Math.floor(Math.random() * types.length)];
        
        return this.createBot(type, name);
    }
}

module.exports = { EconomicBot, BotFactory };