// admin-routes-enhanced.js - Sistema mejorado para eventos económicos progresivos
const path = require('path');

// Configuración mejorada de administrador con cooldowns y progresividad
const ADMIN_CONFIG = {
    allowedUsers: ['admin', 'administrator', 'ADMIN', 'root', 'superuser'],
    maxBots: 10,
    eventCooldown: 45000, // 45 segundos entre eventos (más realista)
    lastEventTime: 0,
    progressiveEventDuration: 300000, // 5 minutos para aplicar evento completamente
    observationMode: {
        enabled: false,
        watchedBots: new Set(),
        thoughtStream: []
    }
};

// 10 Eventos económicos especiales con efectos progresivos mejorados
const ADMIN_EVENTS = {
    market_crash: {
        id: 'market_crash',
        name: 'Crisis Financiera Global',
        description: 'Colapso repentino del mercado que afecta todos los recursos de manera progresiva',
        effects: { 
            supply: -0.4, 
            demand: -0.3, 
            volatility: 2.0,
            // Nuevos parámetros para progresividad
            progressiveSteps: 20, // Se aplica en 20 pasos graduales
            stepDuration: 15000,  // Cada paso dura 15 segundos
            peakIntensity: 0.8    // Intensidad máxima del evento
        },
        resources: ['agua', 'comida', 'energia', 'materiales'],
        rarity: 'legendary',
        duration: 10, // Duración en ticks después de completarse
        // Función que describe cómo evoluciona el evento
        progressFunction: (step, totalSteps) => {
            // Función exponencial que crece rápidamente al principio
            return Math.pow(step / totalSteps, 1.5);
        }
    },
    
    tech_revolution: {
        id: 'tech_revolution',
        name: 'Revolución Tecnológica',
        description: 'Avance tecnológico que transforma gradualmente la eficiencia energética',
        effects: { 
            supply: 0.6, 
            demand: -0.2, 
            volatility: 1.5,
            progressiveSteps: 15,
            stepDuration: 20000,
            peakIntensity: 0.9
        },
        resources: ['energia'],
        rarity: 'epic',
        duration: 12,
        progressFunction: (step, totalSteps) => {
            // Función S-curve: lenta al principio, rápida en el medio, lenta al final
            const t = step / totalSteps;
            return 1 / (1 + Math.exp(-10 * (t - 0.5)));
        }
    },
    
    climate_disaster: {
        id: 'climate_disaster',
        name: 'Desastre Climático Extremo',
        description: 'Evento climático que destruye infraestructura crítica de manera gradual',
        effects: { 
            supply: -0.5, 
            demand: 0.4, 
            volatility: 1.8,
            progressiveSteps: 25,
            stepDuration: 12000,
            peakIntensity: 0.95
        },
        resources: ['agua', 'comida'],
        rarity: 'rare',
        duration: 8,
        progressFunction: (step, totalSteps) => {
            // Función lineal con aceleración al final
            const t = step / totalSteps;
            return t + 0.3 * Math.pow(t, 3);
        }
    },
    
    gold_rush: {
        id: 'gold_rush',
        name: 'Fiebre de Recursos',
        description: 'Descubrimiento masivo que inunda progresivamente el mercado',
        effects: { 
            supply: 0.8, 
            demand: 0.2, 
            volatility: 1.3,
            progressiveSteps: 18,
            stepDuration: 16000,
            peakIntensity: 0.7
        },
        resources: ['materiales'],
        rarity: 'epic',
        duration: 15,
        progressFunction: (step, totalSteps) => {
            // Función logarítmica: rápida al principio, se estabiliza
            return Math.log(1 + 9 * step / totalSteps) / Math.log(10);
        }
    },
    
    pandemic_lockdown: {
        id: 'pandemic_lockdown',
        name: 'Confinamiento Global',
        description: 'Restricciones mundiales que paralizan gradualmente el comercio',
        effects: { 
            supply: -0.3, 
            demand: -0.4, 
            volatility: 1.6,
            progressiveSteps: 30,
            stepDuration: 10000,
            peakIntensity: 0.85
        },
        resources: ['agua', 'comida', 'energia', 'materiales'],
        rarity: 'legendary',
        duration: 20,
        progressFunction: (step, totalSteps) => {
            // Función de escalón: cambios escalonados que simulan políticas graduales
            return Math.floor(step * 4 / totalSteps) / 4 + (step % (totalSteps/4)) / totalSteps;
        }
    },
    
    ai_automation: {
        id: 'ai_automation',
        name: 'Automatización por IA',
        description: 'Robots reemplazan trabajadores en sectores clave de manera progresiva',
        effects: { 
            supply: 0.4, 
            demand: -0.3, 
            volatility: 1.2,
            progressiveSteps: 22,
            stepDuration: 14000,
            peakIntensity: 0.6
        },
        resources: ['materiales', 'energia'],
        rarity: 'epic',
        duration: 18,
        progressFunction: (step, totalSteps) => {
            // Función cuadrática: aceleración constante
            return Math.pow(step / totalSteps, 2);
        }
    },
    
    space_mining: {
        id: 'space_mining',
        name: 'Minería Espacial',
        description: 'Explotación de asteroides que revoluciona gradualmente los materiales',
        effects: { 
            supply: 1.2, 
            demand: 0.1, 
            volatility: 2.2,
            progressiveSteps: 40,
            stepDuration: 8000,
            peakIntensity: 1.0
        },
        resources: ['materiales'],
        rarity: 'legendary',
        duration: 25,
        progressFunction: (step, totalSteps) => {
            // Función exponencial suavizada: cambio lento que se acelera
            const t = step / totalSteps;
            return (Math.exp(3 * t) - 1) / (Math.exp(3) - 1);
        }
    },
    
    fusion_breakthrough: {
        id: 'fusion_breakthrough',
        name: 'Energía de Fusión',
        description: 'Fusión nuclear comercial que resuelve gradualmente la crisis energética',
        effects: { 
            supply: 0.9, 
            demand: -0.5, 
            volatility: 1.7,
            progressiveSteps: 35,
            stepDuration: 9000,
            peakIntensity: 0.9
        },
        resources: ['energia'],
        rarity: 'legendary',
        duration: 30,
        progressFunction: (step, totalSteps) => {
            // Función de investigación: lenta al principio, breakthrough súbito, luego implementación gradual
            const t = step / totalSteps;
            if (t < 0.6) return 0.1 * t / 0.6; // Investigación lenta
            else if (t < 0.7) return 0.1 + 0.5 * (t - 0.6) / 0.1; // Breakthrough
            else return 0.6 + 0.4 * (t - 0.7) / 0.3; // Implementación
        }
    },
    
    bioengineering_boost: {
        id: 'bioengineering_boost',
        name: 'Revolución Biotecnológica',
        description: 'Cultivos modificados que multiplican gradualmente la producción de alimentos',
        effects: { 
            supply: 0.7, 
            demand: -0.1, 
            volatility: 1.1,
            progressiveSteps: 28,
            stepDuration: 11000,
            peakIntensity: 0.8
        },
        resources: ['comida'],
        rarity: 'epic',
        duration: 22,
        progressFunction: (step, totalSteps) => {
            // Función de crecimiento biológico: exponencial al principio, luego se satura
            const t = step / totalSteps;
            return 1 - Math.exp(-4 * t);
        }
    },
    
    water_wars: {
        id: 'water_wars',
        name: 'Conflictos por Agua',
        description: 'Disputas geopolíticas por recursos hídricos que escalan gradualmente',
        effects: { 
            supply: -0.6, 
            demand: 0.8, 
            volatility: 2.5,
            progressiveSteps: 20,
            stepDuration: 15000,
            peakIntensity: 0.95
        },
        resources: ['agua'],
        rarity: 'rare',
        duration: 12,
        progressFunction: (step, totalSteps) => {
            // Función de escalada de conflicto: tensión creciente con picos
            const t = step / totalSteps;
            return 0.3 * t + 0.7 * Math.sin(3 * Math.PI * t) * t;
        }
    }
};

// Estado mejorado del administrador con tracking de eventos progresivos
let adminState = {
    connectedAdmins: new Set(),
    lastBotConfig: { qlearning: 0, standard: 0 },
    activeEvents: new Map(),
    progressiveEvents: new Map(), // Nuevos eventos en progreso
    simulationSpeed: 1.0,
    observationData: {
        watchedBots: new Set(),
        thoughtHistory: [],
        adaptationMetrics: new Map()
    }
};

// Función para aplicar eventos de manera progresiva
function applyProgressiveEvent(eventId, eventConfig, gameState, io) {
    const progressData = {
        eventId: eventId,
        config: eventConfig,
        currentStep: 0,
        totalSteps: eventConfig.effects.progressiveSteps,
        stepDuration: eventConfig.effects.stepDuration,
        startTime: Date.now(),
        lastStepTime: Date.now(),
        accumulatedEffects: { supply: 0, demand: 0 },
        botReactions: new Map(), // Para rastrear cómo reaccionan los bots
        thoughtSnapshots: [] // Capturas del pensamiento de bots durante el evento
    };
    
    adminState.progressiveEvents.set(eventId, progressData);
    
    console.log(`🌍 Iniciando evento progresivo: ${eventConfig.name}`);
    
    // Notificar inicio del evento
    io.emit('admin_progressive_event_started', {
        eventId: eventId,
        eventName: eventConfig.name,
        description: eventConfig.description,
        totalSteps: progressData.totalSteps,
        estimatedDuration: progressData.totalSteps * progressData.stepDuration,
        timestamp: Date.now()
    });
    
    // Activar observación automática de todos los Q-Learning bots
    if (gameState.qLearningBots) {
        gameState.qLearningBots.forEach((bot, botId) => {
            enableBotObservation(botId, bot, io);
        });
    }
    
    return progressData;
}

// Función para procesar el siguiente paso de un evento progresivo
function processEventStep(eventId, gameState, io) {
    const progressData = adminState.progressiveEvents.get(eventId);
    if (!progressData) return false;
    
    const now = Date.now();
    
    // Verificar si es tiempo del siguiente paso
    if (now - progressData.lastStepTime < progressData.stepDuration) {
        return true; // Evento sigue activo pero no es tiempo del siguiente paso
    }
    
    progressData.currentStep++;
    progressData.lastStepTime = now;
    
    // Calcular intensidad del paso actual usando la función de progreso del evento
    const progressRatio = progressData.config.progressFunction(
        progressData.currentStep, 
        progressData.totalSteps
    );
    
    const stepIntensity = progressRatio * progressData.config.effects.peakIntensity;
    
    // Calcular efectos incrementales para este paso
    const incrementalSupplyEffect = 
        (progressData.config.effects.supply * stepIntensity) - progressData.accumulatedEffects.supply;
    const incrementalDemandEffect = 
        (progressData.config.effects.demand * stepIntensity) - progressData.accumulatedEffects.demand;
    
    // Aplicar efectos a los recursos especificados
    progressData.config.resources.forEach(resource => {
        if (gameState.market && gameState.market[resource]) {
            const market = gameState.market[resource];
            
            // Aplicar cambios incrementales
            const newSupply = Math.max(50, Math.floor(
                market.supply * (1 + incrementalSupplyEffect)
            ));
            const newDemand = Math.max(50, Math.floor(
                market.demand * (1 + incrementalDemandEffect)
            ));
            
            market.supply = Math.min(5000, newSupply);
            market.demand = Math.min(5000, newDemand);
            
            console.log(`📊 Paso ${progressData.currentStep}/${progressData.totalSteps} - ${resource}: Supply ${market.supply}, Demand ${market.demand}`);
        }
    });
    
    // Actualizar efectos acumulados
    progressData.accumulatedEffects.supply += incrementalSupplyEffect;
    progressData.accumulatedEffects.demand += incrementalDemandEffect;
    
    // Capturar reacciones de los bots en este momento
    captureBotReactions(eventId, progressData, gameState, io);
    
    // Emitir actualización del evento progresivo
    io.emit('admin_progressive_event_step', {
        eventId: eventId,
        currentStep: progressData.currentStep,
        totalSteps: progressData.totalSteps,
        intensity: stepIntensity,
        progressRatio: progressRatio,
        accumulatedEffects: progressData.accumulatedEffects,
        marketState: Object.fromEntries(
            progressData.config.resources.map(r => [r, gameState.market[r]])
        ),
        timestamp: now
    });
    
    // Verificar si el evento ha terminado
    if (progressData.currentStep >= progressData.totalSteps) {
        completeProgressiveEvent(eventId, gameState, io);
        return false; // Evento terminado
    }
    
    return true; // Evento sigue activo
}

// Función para capturar las reacciones de los bots durante un evento
function captureBotReactions(eventId, progressData, gameState, io) {
    const snapshot = {
        step: progressData.currentStep,
        timestamp: Date.now(),
        botStates: new Map(),
        marketConditions: {}
    };
    
    // Capturar estado del mercado
    progressData.config.resources.forEach(resource => {
        if (gameState.market && gameState.market[resource]) {
            snapshot.marketConditions[resource] = {
                price: gameState.market[resource].price,
                supply: gameState.market[resource].supply,
                demand: gameState.market[resource].demand,
                ratio: gameState.market[resource].demand / gameState.market[resource].supply
            };
        }
    });
    
    // Capturar estado y decisiones de los Q-Learning bots
    if (gameState.qLearningBots) {
        gameState.qLearningBots.forEach((bot, botId) => {
            const botSnapshot = {
                name: bot.name,
                strategy: bot.strategy,
                netWorth: bot.calculateSafeNetWorth ? bot.calculateSafeNetWorth(gameState) : bot.money,
                money: bot.money,
                inventory: { ...bot.inventory },
                epsilon: bot.epsilon || 0,
                qTableSize: bot.qTable ? bot.qTable.size : 0,
                recentTransactions: bot.transactions ? bot.transactions.slice(-3) : [],
                lastThought: bot.lastThoughtProcess || null,
                adaptationScore: calculateAdaptationScore(bot, eventId, progressData)
            };
            
            snapshot.botStates.set(botId, botSnapshot);
        });
    }
    
    progressData.thoughtSnapshots.push(snapshot);
    
    // Emitir snapshot para observación en tiempo real
    io.emit('bot_adaptation_snapshot', {
        eventId: eventId,
        snapshot: {
            step: snapshot.step,
            timestamp: snapshot.timestamp,
            marketConditions: snapshot.marketConditions,
            botStates: Object.fromEntries(snapshot.botStates)
        }
    });
}

// Función para calcular un score de adaptación del bot al evento
function calculateAdaptationScore(bot, eventId, progressData) {
    if (!bot.transactions || bot.transactions.length < 3) {
        return { score: 0, reason: 'insufficient_data' };
    }
    
    const recentTransactions = bot.transactions.slice(-5);
    const eventStartTime = progressData.startTime;
    
    // Transacciones durante el evento
    const eventTransactions = recentTransactions.filter(t => t.timestamp >= eventStartTime);
    
    if (eventTransactions.length === 0) {
        return { score: 0.5, reason: 'no_activity_during_event' };
    }
    
    // Evaluar si las decisiones del bot son apropiadas para el evento
    let adaptationScore = 0;
    let factors = [];
    
    eventTransactions.forEach(transaction => {
        const resource = transaction.resource;
        const affectedResources = progressData.config.resources;
        
        // Si el bot está operando en recursos afectados por el evento
        if (affectedResources.includes(resource)) {
            const supplyEffect = progressData.config.effects.supply;
            const demandEffect = progressData.config.effects.demand;
            
            // Evaluar si la decisión es "inteligente" dado el evento
            if (transaction.type === 'buy' && supplyEffect < 0) {
                // Comprar cuando la oferta va a disminuir es inteligente
                adaptationScore += 0.3;
                factors.push('smart_buy_before_scarcity');
            } else if (transaction.type === 'sell' && demandEffect > 0) {
                // Vender cuando la demanda va a aumentar es inteligente
                adaptationScore += 0.3;
                factors.push('smart_sell_with_high_demand');
            } else if (transaction.type === 'buy' && supplyEffect > 0) {
                // Comprar cuando va a haber sobreoferta podría no ser inteligente
                adaptationScore -= 0.1;
                factors.push('risky_buy_before_surplus');
            }
        }
        
        // Evaluar timing de las transacciones
        const timingScore = evaluateTransactionTiming(transaction, progressData);
        adaptationScore += timingScore;
        if (timingScore > 0.1) factors.push('good_timing');
        else if (timingScore < -0.1) factors.push('poor_timing');
    });
    
    // Normalizar score
    adaptationScore = Math.max(0, Math.min(1, adaptationScore));
    
    return {
        score: adaptationScore,
        factors: factors,
        transactionCount: eventTransactions.length,
        reason: factors.length > 0 ? factors.join(', ') : 'neutral_behavior'
    };
}

// Función para evaluar el timing de una transacción durante un evento
function evaluateTransactionTiming(transaction, progressData) {
    const eventDuration = Date.now() - progressData.startTime;
    const totalEventDuration = progressData.totalSteps * progressData.stepDuration;
    const eventProgress = eventDuration / totalEventDuration;
    
    // Los bots que reaccionan rápido pero no demasiado rápido obtienen mejor score
    if (eventProgress < 0.1) {
        return 0.2; // Reacción muy rápida es buena
    } else if (eventProgress < 0.3) {
        return 0.1; // Reacción rápida es buena
    } else if (eventProgress < 0.7) {
        return 0; // Reacción neutral
    } else {
        return -0.1; // Reacción tardía no es ideal
    }
}

// Función para completar un evento progresivo
function completeProgressiveEvent(eventId, gameState, io) {
    const progressData = adminState.progressiveEvents.get(eventId);
    if (!progressData) return;
    
    const eventConfig = progressData.config;
    const finalReport = generateEventReport(eventId, progressData, gameState);
    
    console.log(`✅ Evento progresivo completado: ${eventConfig.name}`);
    
    // Registrar evento en el estado del juego para efectos duraderos
    const marketEvent = {
        type: eventId,
        name: eventConfig.name,
        resource: eventConfig.resources[0],
        effect: {
            supply: progressData.accumulatedEffects.supply,
            demand: progressData.accumulatedEffects.demand,
            finalSupply: Object.fromEntries(
                eventConfig.resources.map(r => [r, gameState.market[r]?.supply || 0])
            ),
            finalDemand: Object.fromEntries(
                eventConfig.resources.map(r => [r, gameState.market[r]?.demand || 0])
            )
        },
        tick: gameState.tick,
        timestamp: Date.now(),
        severity: Math.abs(progressData.accumulatedEffects.supply) + Math.abs(progressData.accumulatedEffects.demand),
        isAdminEvent: true,
        rarity: eventConfig.rarity,
        duration: eventConfig.duration,
        progressiveData: {
            totalSteps: progressData.totalSteps,
            actualDuration: Date.now() - progressData.startTime,
            botReactions: finalReport.botAdaptation
        }
    };
    
    // Agregar al historial de eventos del juego
    if (gameState.marketEvents) {
        gameState.marketEvents.push(marketEvent);
    }
    
    // Programar efectos duraderos
    adminState.activeEvents.set(eventId, {
        ...eventConfig,
        startTime: Date.now(),
        endTime: Date.now() + (eventConfig.duration * 15000),
        finalEffects: progressData.accumulatedEffects
    });
    
    // Emitir reporte final
    io.emit('admin_progressive_event_completed', {
        eventId: eventId,
        eventName: eventConfig.name,
        finalReport: finalReport,
        marketEvent: marketEvent,
        timestamp: Date.now()
    });
    
    // Limpiar datos del evento progresivo
    adminState.progressiveEvents.delete(eventId);
    
    // Desactivar observación automática después de un tiempo
    setTimeout(() => {
        if (gameState.qLearningBots) {
            gameState.qLearningBots.forEach((bot, botId) => {
                disableBotObservation(botId, bot);
            });
        }
    }, 60000); // Continuar observando 1 minuto después del evento
}

// Función para generar un reporte detallado del evento
function generateEventReport(eventId, progressData, gameState) {
    const report = {
        eventSummary: {
            name: progressData.config.name,
            duration: Date.now() - progressData.startTime,
            stepsCompleted: progressData.currentStep,
            totalSteps: progressData.totalSteps,
            finalIntensity: progressData.accumulatedEffects
        },
        marketImpact: {},
        botAdaptation: {},
        insights: []
    };
    
    // Analizar impacto en el mercado
    progressData.config.resources.forEach(resource => {
        if (gameState.market && gameState.market[resource]) {
            const market = gameState.market[resource];
            report.marketImpact[resource] = {
                finalPrice: market.price,
                finalSupply: market.supply,
                finalDemand: market.demand,
                finalRatio: market.demand / market.supply,
                priceVolatility: calculatePriceVolatility(resource, progressData)
            };
        }
    });
    
    // Analizar adaptación de los bots
    if (gameState.qLearningBots) {
        gameState.qLearningBots.forEach((bot, botId) => {
            const adaptationData = calculateAdaptationScore(bot, eventId, progressData);
            const finalSnapshot = progressData.thoughtSnapshots[progressData.thoughtSnapshots.length - 1];
            const initialSnapshot = progressData.thoughtSnapshots[0];
            
            if (finalSnapshot && initialSnapshot) {
                const initialState = initialSnapshot.botStates.get(botId);
                const finalState = finalSnapshot.botStates.get(botId);
                
                if (initialState && finalState) {
                    report.botAdaptation[botId] = {
                        name: bot.name,
                        strategy: bot.strategy,
                        adaptationScore: adaptationData.score,
                        adaptationFactors: adaptationData.factors,
                        performanceChange: {
                            netWorthChange: finalState.netWorth - initialState.netWorth,
                            transactionsDuringEvent: adaptationData.transactionCount,
                            learningProgress: finalState.qTableSize - initialState.qTableSize
                        },
                        behaviorPattern: analyzeBehaviorPattern(bot, progressData)
                    };
                }
            }
        });
    }
    
    // Generar insights
    report.insights = generateEventInsights(report, progressData);
    
    return report;
}

// Función para analizar el patrón de comportamiento durante el evento
function analyzeBehaviorPattern(bot, progressData) {
    const eventTransactions = bot.transactions.filter(t => 
        t.timestamp >= progressData.startTime && t.timestamp <= Date.now()
    );
    
    if (eventTransactions.length === 0) {
        return { pattern: 'inactive', description: 'No realizó transacciones durante el evento' };
    }
    
    const buyCount = eventTransactions.filter(t => t.type === 'buy').length;
    const sellCount = eventTransactions.filter(t => t.type === 'sell').length;
    
    if (buyCount > sellCount * 2) {
        return { pattern: 'accumulator', description: 'Tendencia a acumular recursos durante el evento' };
    } else if (sellCount > buyCount * 2) {
        return { pattern: 'liquidator', description: 'Tendencia a vender recursos durante el evento' };
    } else if (eventTransactions.length > 10) {
        return { pattern: 'active_trader', description: 'Alta actividad de trading durante el evento' };
    } else {
        return { pattern: 'cautious', description: 'Comportamiento cauteloso con pocas transacciones' };
    }
}

// Función para calcular volatilidad de precios durante el evento
function calculatePriceVolatility(resource, progressData) {
    const priceChanges = [];
    
    for (let i = 1; i < progressData.thoughtSnapshots.length; i++) {
        const prev = progressData.thoughtSnapshots[i - 1].marketConditions[resource];
        const curr = progressData.thoughtSnapshots[i].marketConditions[resource];
        
        if (prev && curr && prev.price && curr.price) {
            const change = Math.abs(curr.price - prev.price) / prev.price;
            priceChanges.push(change);
        }
    }
    
    if (priceChanges.length === 0) return 0;
    
    return priceChanges.reduce((sum, change) => sum + change, 0) / priceChanges.length;
}

// Función para generar insights del evento
function generateEventInsights(report, progressData) {
    const insights = [];
    
    // Insight sobre adaptación de bots
    const adaptationScores = Object.values(report.botAdaptation).map(b => b.adaptationScore);
    if (adaptationScores.length > 0) {
        const avgAdaptation = adaptationScores.reduce((a, b) => a + b, 0) / adaptationScores.length;
        
        if (avgAdaptation > 0.7) {
            insights.push({
                type: 'excellent_adaptation',
                title: 'Excelente Adaptación de los Bots',
                description: `Los bots mostraron una adaptación promedio de ${(avgAdaptation * 100).toFixed(1)}% al evento`,
                recommendation: 'Los algoritmos de Q-Learning están funcionando óptimamente'
            });
        } else if (avgAdaptation < 0.3) {
            insights.push({
                type: 'poor_adaptation',
                title: 'Adaptación Deficiente',
                description: `Los bots tuvieron dificultades adaptándose con un promedio de ${(avgAdaptation * 100).toFixed(1)}%`,
                recommendation: 'Considerar ajustar parámetros de aprendizaje o exploración'
            });
        }
    }
    
    // Insight sobre volatilidad del mercado
    const volatilities = Object.values(report.marketImpact).map(m => m.priceVolatility);
    if (volatilities.length > 0) {
        const maxVolatility = Math.max(...volatilities);
        if (maxVolatility > 0.3) {
            insights.push({
                type: 'high_volatility',
                title: 'Alta Volatilidad Detectada',
                description: `El evento causó una volatilidad máxima de ${(maxVolatility * 100).toFixed(1)}%`,
                recommendation: 'Monitorear estabilidad del mercado en eventos futuros'
            });
        }
    }
    
    // Insight sobre patrones de comportamiento
    const behaviorPatterns = Object.values(report.botAdaptation).map(b => b.behaviorPattern.pattern);
    const patternCounts = behaviorPatterns.reduce((acc, pattern) => {
        acc[pattern] = (acc[pattern] || 0) + 1;
        return acc;
    }, {});
    
    const dominantPattern = Object.keys(patternCounts).reduce((a, b) => 
        patternCounts[a] > patternCounts[b] ? a : b
    );
    
    if (patternCounts[dominantPattern] > behaviorPatterns.length * 0.6) {
        insights.push({
            type: 'behavior_pattern',
            title: 'Patrón de Comportamiento Dominante',
            description: `${patternCounts[dominantPattern]} de ${behaviorPatterns.length} bots mostraron comportamiento ${dominantPattern}`,
            recommendation: 'Diversificar estrategias para mejor balance del ecosistema'
        });
    }
    
    return insights;
}

// Funciones de observación de bots
function enableBotObservation(botId, bot, io) {
    if (!bot) return;
    
    console.log(`👁️ Activando observación del bot: ${bot.name}`);
    
    // Marcar el bot como observado
    bot.isBeingWatched = true;
    adminState.observationData.watchedBots.add(botId);
    
    // Si el bot ya tiene el método de pensamiento avanzado, no lo sobrescribimos
    if (!bot.makeDecisionWithThinking) {
        // Implementar método de pensamiento si no existe
        bot.makeDecisionWithThinking = function(marketState, ioInstance = null) {
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
                
                // Paso 2: Detectar cambios en el mercado
                const marketChanges = this.detectMarketChanges ? this.detectMarketChanges(marketState) : {};
                thinkingProcess.decisionProcess.push({
                    step: 'market_analysis',
                    explanation: 'Analizando cambios y tendencias del mercado',
                    result: {
                        market_cycle: marketState.economicCycle,
                        detected_changes: marketChanges,
                        price_trends: this.analyzePriceTrends ? this.analyzePriceTrends(marketState) : 'unknown'
                    }
                });
                
                // Paso 3: Evaluación de riesgo/oportunidad
                const opportunities = this.evaluateOpportunities ? this.evaluateOpportunities(marketState) : [];
                thinkingProcess.decisionProcess.push({
                    step: 'opportunity_evaluation',
                    explanation: 'Evaluando oportunidades y riesgos en el mercado actual',
                    result: {
                        opportunities_found: opportunities.length,
                        best_opportunity: opportunities[0] || null,
                        risk_assessment: this.assessRisk ? this.assessRisk(marketState) : 'medium'
                    }
                });
                
                // Paso 4: Codificar estado para Q-Learning
                const encodedState = this.encodeState(marketState);
                thinkingProcess.decisionProcess.push({
                    step: 'encode_market_state',
                    explanation: 'Convirtiendo condiciones del mercado a representación discreta',
                    result: {
                        encoded_state: encodedState.substring(0, 80) + '...',
                        state_complexity: encodedState.length
                    }
                });
                
                // Paso 5: Generar acciones posibles
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
                
                // Paso 6: Evaluar Q-values
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
                        q_value_range: qValues.length > 1 ? (qValues[0].qValue - qValues[qValues.length - 1].qValue).toFixed(4) : '0',
                        top_actions: qValues.slice(0, 3).map(qv => ({
                            action: `${qv.action.type} ${qv.action.quantity} ${qv.action.resource}`,
                            q_value: qv.qValue.toFixed(4)
                        }))
                    }
                });
                
                // Paso 7: Decisión de exploración vs explotación
                const isExploring = Math.random() < this.epsilon;
                thinkingProcess.decisionProcess.push({
                    step: 'exploration_decision',
                    explanation: isExploring ? 
                        'Eligiendo acción aleatoria para exploración' : 
                        'Eligiendo mejor acción conocida (explotación)',
                    result: {
                        is_exploring: isExploring,
                        epsilon: (this.epsilon * 100).toFixed(2) + '%',
                        decision_type: isExploring ? 'exploration' : 'exploitation',
                        confidence_in_best_action: qValues[0] ? Math.abs(qValues[0].qValue) : 0
                    }
                });
                
                // Paso 8: Selección final de acción
                const selectedAction = this.selectAction(encodedState, possibleActions);
                const confidence = this.calculateActionConfidence(encodedState, selectedAction);
                const reasoning = this.generateReasoning(encodedState, selectedAction, possibleActions);
                
                thinkingProcess.decisionProcess.push({
                    step: 'final_decision',
                    explanation: `Acción seleccionada: ${selectedAction.type} ${selectedAction.quantity} ${selectedAction.resource}`,
                    result: {
                        selected_action: selectedAction,
                        confidence: (confidence * 100).toFixed(1) + '%',
                        reasoning: reasoning,
                        expected_outcome: this.predictOutcome ? this.predictOutcome(selectedAction, marketState) : 'unknown'
                    }
                });
                
                // Guardar proceso de pensamiento
                this.lastThoughtProcess = thinkingProcess;
                
                // Emitir a observadores
                if (this.isBeingWatched && ioInstance) {
                    ioInstance.emit('bot_thinking_process', thinkingProcess);
                    
                    // También guardar en historial de observación
                    adminState.observationData.thoughtHistory.push({
                        botId: this.id,
                        botName: this.name,
                        timestamp: Date.now(),
                        thought: thinkingProcess,
                        marketTick: marketState.tick
                    });
                    
                    // Mantener solo los últimos 100 pensamientos
                    if (adminState.observationData.thoughtHistory.length > 100) {
                        adminState.observationData.thoughtHistory.shift();
                    }
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
                
                if (this.isBeingWatched && ioInstance) {
                    ioInstance.emit('bot_thinking_process', thinkingProcess);
                }
                
                const holdAction = { type: 'hold', resource: null, quantity: 0 };
                return {
                    action: holdAction,
                    confidence: 0,
                    reasoning: 'Error en proceso de decisión: ' + error.message
                };
            }
        };
    }
    
    // Emitir confirmación
    io.emit('bot_observation_enabled', {
        botId: botId,
        botName: bot.name,
        message: `Observación activada para ${bot.name}`,
        timestamp: Date.now()
    });
}

function disableBotObservation(botId, bot) {
    if (!bot) return;
    
    console.log(`👁️ Desactivando observación del bot: ${bot.name}`);
    
    bot.isBeingWatched = false;
    adminState.observationData.watchedBots.delete(botId);
}

// Función principal para activar un evento desde el admin
function triggerAdminEvent(eventId, gameState, io) {
    const event = ADMIN_EVENTS[eventId];
    if (!event) {
        return { success: false, message: 'Evento no encontrado' };
    }
    
    const now = Date.now();
    if (now - ADMIN_CONFIG.lastEventTime < ADMIN_CONFIG.eventCooldown) {
        const remainingTime = Math.ceil((ADMIN_CONFIG.eventCooldown - (now - ADMIN_CONFIG.lastEventTime)) / 1000);
        return { 
            success: false, 
            message: `Cooldown activo. Espera ${remainingTime} segundos.` 
        };
    }
    
    try {
        console.log(`🌍 Admin activando evento progresivo: ${event.name}`);
        
        // Iniciar evento progresivo
        const progressData = applyProgressiveEvent(eventId, event, gameState, io);
        
        if (progressData) {
            ADMIN_CONFIG.lastEventTime = now;
            
            // Notificar a todos los jugadores
            io.emit('admin_event_triggered', {
                event: event,
                message: `🔥 EVENTO ESPECIAL PROGRESIVO: ${event.name}`,
                description: event.description,
                estimatedDuration: progressData.totalSteps * progressData.stepDuration,
                affectedResources: event.resources,
                timestamp: Date.now()
            });
            
            console.log(`✅ Evento progresivo iniciado: ${event.name} - Duración estimada: ${Math.round(progressData.totalSteps * progressData.stepDuration / 1000)} segundos`);
            
            return { 
                success: true, 
                event: event, 
                progressData: {
                    eventId: eventId,
                    totalSteps: progressData.totalSteps,
                    stepDuration: progressData.stepDuration,
                    estimatedDuration: progressData.totalSteps * progressData.stepDuration
                }
            };
        } else {
            return { success: false, message: 'Error iniciando evento progresivo' };
        }
        
    } catch (error) {
        console.error('❌ Error aplicando evento admin:', error);
        return { success: false, message: 'Error aplicando evento: ' + error.message };
    }
}

// Función para procesar todos los eventos progresivos activos (llamar desde el tick económico)
function processActiveProgressiveEvents(gameState, io) {
    const activeEventIds = Array.from(adminState.progressiveEvents.keys());
    let activeCount = 0;
    
    activeEventIds.forEach(eventId => {
        const stillActive = processEventStep(eventId, gameState, io);
        if (stillActive) {
            activeCount++;
        }
    });
    
    return activeCount;
}

// Función para obtener el estado de observación actual
function getObservationStatus() {
    return {
        observationEnabled: adminState.observationData.watchedBots.size > 0,
        watchedBots: Array.from(adminState.observationData.watchedBots),
        recentThoughts: adminState.observationData.thoughtHistory.slice(-10),
        activeEvents: Array.from(adminState.progressiveEvents.keys()),
        totalThoughtsRecorded: adminState.observationData.thoughtHistory.length
    };
}

// Función para obtener historial de pensamientos de un bot específico
function getBotThoughtHistory(botId, limit = 20) {
    return adminState.observationData.thoughtHistory
        .filter(thought => thought.botId === botId)
        .slice(-limit)
        .reverse(); // Más recientes primero
}

// Función para obtener métricas de adaptación durante eventos activos
function getAdaptationMetrics() {
    const metrics = {
        activeEvents: adminState.progressiveEvents.size,
        observedBots: adminState.observationData.watchedBots.size,
        recentAdaptations: [],
        overallTrends: {}
    };
    
    // Analizar adaptaciones recientes
    const recentThoughts = adminState.observationData.thoughtHistory.slice(-20);
    
    recentThoughts.forEach(thought => {
        if (thought.thought && thought.thought.decisionProcess) {
            const finalDecision = thought.thought.decisionProcess.find(step => step.step === 'final_decision');
            if (finalDecision) {
                metrics.recentAdaptations.push({
                    botName: thought.botName,
                    timestamp: thought.timestamp,
                    action: finalDecision.result.selected_action,
                    confidence: finalDecision.result.confidence,
                    reasoning: finalDecision.result.reasoning
                });
            }
        }
    });
    
    return metrics;
}

module.exports = {
    ADMIN_EVENTS,
    triggerAdminEvent,
    processActiveProgressiveEvents,
    enableBotObservation,
    disableBotObservation,
    getObservationStatus,
    getBotThoughtHistory,
    getAdaptationMetrics,
    adminState
};