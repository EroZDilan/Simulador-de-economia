// shared/constants.js

// Configuración del juego
const GAME_CONFIG = {
    TICK_INTERVAL: 30000, // 30 segundos por tick
    MAX_PLAYERS: 50,
    INITIAL_MONEY: 1000,
    INITIAL_INVENTORY: {
        agua: 50,
        comida: 30,
        energia: 20,
        materiales: 10
    },
    MARKET_UPDATE_INTERVAL: 5000, // 5 segundos
    LEADERBOARD_UPDATE_INTERVAL: 30000 // 30 segundos
};

// Recursos del juego
const RESOURCES = {
    agua: {
        name: 'Agua',
        symbol: '💧',
        description: 'Recurso esencial para la vida',
        basePrice: 10,
        volatility: 0.15,
        elasticity: 1.2
    },
    comida: {
        name: 'Comida',
        symbol: '🍞',
        description: 'Alimento básico para supervivencia',
        basePrice: 15,
        volatility: 0.20,
        elasticity: 0.8
    },
    energia: {
        name: 'Energía',
        symbol: '⚡',
        description: 'Poder necesario para la industria',
        basePrice: 20,
        volatility: 0.25,
        elasticity: 1.5
    },
    materiales: {
        name: 'Materiales',
        symbol: '🔧',
        description: 'Materias primas para construcción',
        basePrice: 25,
        volatility: 0.30,
        elasticity: 1.8
    }
};

// Configuración inicial del mercado
const INITIAL_MARKET = {
    agua: { price: 10, supply: 1000, demand: 800 },
    comida: { price: 15, supply: 800, demand: 900 },
    energia: { price: 20, supply: 600, demand: 700 },
    materiales: { price: 25, supply: 500, demand: 600 }
};

// Tipos de eventos de mercado
const MARKET_EVENTS = {
    DROUGHT: {
        type: 'drought',
        name: 'Sequía',
        description: 'Escasez de agua reduce la oferta',
        probability: 0.1,
        resources: ['agua'],
        effects: { supply: -0.3, demand: 0.2 },
        duration: { min: 2, max: 5 },
        severity: { min: 0.7, max: 1.0 }
    },
    HARVEST: {
        type: 'harvest',
        name: 'Gran Cosecha',
        description: 'Abundante producción de alimentos',
        probability: 0.15,
        resources: ['comida'],
        effects: { supply: 0.4, demand: -0.1 },
        duration: { min: 1, max: 3 },
        severity: { min: 0.8, max: 1.2 }
    },
    BLACKOUT: {
        type: 'blackout',
        name: 'Apagón',
        description: 'Falla en el sistema eléctrico',
        probability: 0.08,
        resources: ['energia'],
        effects: { supply: -0.2, demand: 0.3 },
        duration: { min: 1, max: 2 },
        severity: { min: 0.9, max: 1.0 }
    },
    DISCOVERY: {
        type: 'discovery',
        name: 'Nuevo Yacimiento',
        description: 'Descubrimiento de nuevos recursos',
        probability: 0.12,
        resources: ['materiales'],
        effects: { supply: 0.3, demand: 0.1 },
        duration: { min: 3, max: 8 },
        severity: { min: 0.5, max: 0.8 }
    },
    INNOVATION: {
        type: 'innovation',
        name: 'Innovación Tecnológica',
        description: 'Nueva tecnología mejora eficiencia',
        probability: 0.06,
        resources: ['energia', 'materiales'],
        effects: { supply: 0.2, demand: -0.2 },
        duration: { min: 5, max: 10 },
        severity: { min: 0.3, max: 0.6 }
    },
    PANDEMIC: {
        type: 'pandemic',
        name: 'Crisis Sanitaria',
        description: 'Emergencia afecta múltiples recursos',
        probability: 0.03,
        resources: ['agua', 'comida', 'materiales'],
        effects: { supply: -0.15, demand: 0.25 },
        duration: { min: 8, max: 15 },
        severity: { min: 0.8, max: 1.0 }
    },
    TRADE_WAR: {
        type: 'trade_war',
        name: 'Guerra Comercial',
        description: 'Conflicto reduce comercio internacional',
        probability: 0.05,
        resources: ['materiales', 'energia'],
        effects: { supply: -0.25, demand: -0.1 },
        duration: { min: 10, max: 20 },
        severity: { min: 0.6, max: 0.9 }
    }
};

// Ciclos económicos
const ECONOMIC_CYCLES = {
    EXPANSION: {
        name: 'Expansión',
        description: 'Crecimiento económico sostenido',
        effects: {
            supplyMultiplier: 1.1,
            demandMultiplier: 1.2,
            priceVolatility: 0.8,
            transactionBonus: 1.05
        },
        duration: { min: 8, max: 15 },
        nextCycles: ['peak']
    },
    PEAK: {
        name: 'Pico',
        description: 'Máximo crecimiento económico',
        effects: {
            supplyMultiplier: 1.0,
            demandMultiplier: 1.3,
            priceVolatility: 1.2,
            transactionBonus: 1.0
        },
        duration: { min: 3, max: 6 },
        nextCycles: ['contraction']
    },
    CONTRACTION: {
        name: 'Contracción',
        description: 'Reducción de la actividad económica',
        effects: {
            supplyMultiplier: 0.9,
            demandMultiplier: 0.8,
            priceVolatility: 1.3,
            transactionBonus: 0.95
        },
        duration: { min: 5, max: 12 },
        nextCycles: ['trough']
    },
    TROUGH: {
        name: 'Valle',
        description: 'Punto más bajo del ciclo económico',
        effects: {
            supplyMultiplier: 0.8,
            demandMultiplier: 0.7,
            priceVolatility: 1.5,
            transactionBonus: 0.9
        },
        duration: { min: 2, max: 5 },
        nextCycles: ['expansion']
    }
};

// Estrategias de bots
const BOT_STRATEGIES = {
    CONSERVATIVE: {
        name: 'Conservative',
        description: 'Estrategia conservadora de bajo riesgo',
        personality: {
            riskTolerance: 0.3,
            greed: 0.2,
            patience: 0.8,
            memory: 0.9,
            socialInfluence: 0.3,
            overconfidence: 0.1
        },
        parameters: {
            maxInvestmentPercentage: 0.2,
            profitTakeThreshold: 0.15,
            stopLossThreshold: -0.1,
            holdingPeriod: { min: 5, max: 15 }
        }
    },
    AGGRESSIVE: {
        name: 'Aggressive',
        description: 'Estrategia agresiva de alto riesgo',
        personality: {
            riskTolerance: 0.8,
            greed: 0.7,
            patience: 0.3,
            memory: 0.6,
            socialInfluence: 0.7,
            overconfidence: 0.6
        },
        parameters: {
            maxInvestmentPercentage: 0.6,
            profitTakeThreshold: 0.3,
            stopLossThreshold: -0.2,
            holdingPeriod: { min: 1, max: 5 }
        }
    },
    CONTRARIAN: {
        name: 'Contrarian',
        description: 'Va contra las tendencias del mercado',
        personality: {
            riskTolerance: 0.5,
            greed: 0.4,
            patience: 0.7,
            memory: 0.8,
            socialInfluence: 0.1,
            overconfidence: 0.3
        },
        parameters: {
            contrarianThreshold: 0.2,
            maxInvestmentPercentage: 0.4,
            holdingPeriod: { min: 3, max: 10 },
            contrarySignalStrength: 0.7
        }
    },
    ARBITRAGEUR: {
        name: 'Arbitrageur',
        description: 'Explota ineficiencias del mercado',
        personality: {
            riskTolerance: 0.4,
            greed: 0.6,
            patience: 0.9,
            memory: 0.95,
            socialInfluence: 0.2,
            overconfidence: 0.2
        },
        parameters: {
            arbitrageThreshold: 0.05,
            maxInvestmentPercentage: 0.3,
            speedBonus: 1.5,
            efficiencyFocus: 0.9
        }
    },
    HOARDER: {
        name: 'Hoarder',
        description: 'Acumula recursos específicos',
        personality: {
            riskTolerance: 0.6,
            greed: 0.8,
            patience: 0.4,
            memory: 0.7,
            socialInfluence: 0.5,
            overconfidence: 0.4
        },
        parameters: {
            favoriteResourceWeight: 0.7,
            accumulationRate: 0.8,
            maxInvestmentPercentage: 0.5,
            loyaltyFactor: 0.9
        }
    },
    BALANCED: {
        name: 'Balanced',
        description: 'Estrategia equilibrada y adaptativa',
        personality: {
            riskTolerance: 0.5,
            greed: 0.5,
            patience: 0.5,
            memory: 0.7,
            socialInfluence: 0.5,
            overconfidence: 0.3
        },
        parameters: {
            adaptationRate: 0.6,
            maxInvestmentPercentage: 0.35,
            diversificationFactor: 0.8,
            balanceThreshold: 0.3
        }
    }
};

// Configuración de detección de carteles
const CARTEL_DETECTION = {
    THRESHOLDS: {
        priceManipulation: 0.3,
        coordinatedTrading: 0.4,
        volumeAnomalies: 0.2,
        timingPatterns: 0.6,
        overallRisk: 0.5
    },
    WEIGHTS: {
        priceManipulation: 0.3,
        coordinatedTrading: 0.4,
        volumeAnomalies: 0.2,
        timingPatterns: 0.1
    },
    TIME_WINDOWS: {
        analysis: 50, // ticks
        coordination: 5, // ticks
        pattern: 20 // ticks
    }
};

// Configuración de análisis técnico
const TECHNICAL_ANALYSIS = {
    INDICATORS: {
        SMA_PERIOD: 10,
        EMA_PERIOD: 10,
        RSI_PERIOD: 14,
        BOLLINGER_PERIOD: 20,
        BOLLINGER_STD_DEV: 2,
        MACD_FAST: 12,
        MACD_SLOW: 26,
        MACD_SIGNAL: 9,
        MOMENTUM_PERIOD: 10,
        VOLATILITY_PERIOD: 20
    },
    THRESHOLDS: {
        RSI_OVERBOUGHT: 70,
        RSI_OVERSOLD: 30,
        TREND_STRENGTH_MIN: 0.3,
        VOLATILITY_HIGH: 0.3,
        MOMENTUM_STRONG: 5
    }
};

// Configuración de métricas de riesgo
const RISK_METRICS = {
    VAR_CONFIDENCE_LEVELS: [0.95, 0.99],
    RISK_CATEGORIES: {
        LOW: { min: 0, max: 0.1, color: '#27ae60' },
        MEDIUM: { min: 0.1, max: 0.3, color: '#f39c12' },
        HIGH: { min: 0.3, max: 0.6, color: '#e74c3c' },
        EXTREME: { min: 0.6, max: 1.0, color: '#8e44ad' }
    },
    RISK_FREE_RATE: 0.02, // 2% anual
    BETA_BASELINE: 1.0
};

// Mensajes del sistema
const SYSTEM_MESSAGES = {
    PLAYER_JOINED: 'Un nuevo jugador se ha unido al mercado',
    PLAYER_LEFT: 'Un jugador ha abandonado el mercado',
    BOT_ACTION: 'Bot realizó una transacción',
    MARKET_EVENT: 'Evento de mercado detectado',
    CYCLE_CHANGE: 'Cambio en el ciclo económico',
    CARTEL_ALERT: 'Actividad sospechosa detectada',
    PRICE_ALERT: 'Movimiento significativo de precios'
};

// Configuración de la interfaz
const UI_CONFIG = {
    CHART_UPDATE_INTERVAL: 5000,
    NOTIFICATION_DURATION: 3000,
    LEADERBOARD_SIZE: 10,
    ACTIVITY_FEED_SIZE: 20,
    PRICE_HISTORY_LENGTH: 50,
    COLORS: {
        PRIMARY: '#3498db',
        SUCCESS: '#27ae60',
        WARNING: '#f39c12',
        DANGER: '#e74c3c',
        INFO: '#17a2b8',
        DARK: '#343a40'
    }
};

// Límites del sistema
const SYSTEM_LIMITS = {
    MAX_TRANSACTION_SIZE: 1000,
    MIN_TRANSACTION_SIZE: 1,
    MAX_INVENTORY_PER_RESOURCE: 10000,
    MAX_MONEY: 1000000,
    MAX_PRICE: 1000,
    MIN_PRICE: 1,
    MAX_SUPPLY: 50000,
    MIN_SUPPLY: 50,
    MAX_DEMAND: 50000,
    MIN_DEMAND: 50
};

// Configuración de la base de datos
const DATABASE_CONFIG = {
    PRICE_HISTORY_RETENTION_DAYS: 30,
    TRANSACTION_HISTORY_RETENTION_DAYS: 90,
    MARKET_EVENT_RETENTION_DAYS: 60,
    CLEANUP_INTERVAL_HOURS: 24
};

module.exports = {
    GAME_CONFIG,
    RESOURCES,
    INITIAL_MARKET,
    MARKET_EVENTS,
    ECONOMIC_CYCLES,
    BOT_STRATEGIES,
    CARTEL_DETECTION,
    TECHNICAL_ANALYSIS,
    RISK_METRICS,
    SYSTEM_MESSAGES,
    UI_CONFIG,
    SYSTEM_LIMITS,
    DATABASE_CONFIG
};