// server/admin-routes.js - Rutas y funcionalidad de administrador
const path = require('path');

// 🔧 NUEVO: Configuración de administrador
const ADMIN_CONFIG = {
    allowedUsers: ['admin', 'administrator', 'ADMIN', 'root', 'superuser'],
    maxBots: 10,
    eventCooldown: 30000, // 30 segundos entre eventos
    lastEventTime: 0
};

// 🔧 NUEVO: 10 Eventos económicos especiales para admin
const ADMIN_EVENTS = {
    market_crash: {
        id: 'market_crash',
        name: 'Crisis Financiera Global',
        description: 'Colapso repentino del mercado que afecta todos los recursos',
        effects: { supply: -0.4, demand: -0.3, volatility: 2.0 },
        resources: ['agua', 'comida', 'energia', 'materiales'],
        rarity: 'legendary',
        duration: 5
    },
    tech_revolution: {
        id: 'tech_revolution',
        name: 'Revolución Tecnológica',
        description: 'Avance tecnológico que transforma la eficiencia energética',
        effects: { supply: 0.6, demand: -0.2, volatility: 1.5 },
        resources: ['energia'],
        rarity: 'epic',
        duration: 8
    },
    climate_disaster: {
        id: 'climate_disaster',
        name: 'Desastre Climático Extremo',
        description: 'Evento climático que destruye infraestructura crítica',
        effects: { supply: -0.5, demand: 0.4, volatility: 1.8 },
        resources: ['agua', 'comida'],
        rarity: 'rare',
        duration: 6
    },
    gold_rush: {
        id: 'gold_rush',
        name: 'Fiebre de Recursos',
        description: 'Descubrimiento masivo que inunda el mercado',
        effects: { supply: 0.8, demand: 0.2, volatility: 1.3 },
        resources: ['materiales'],
        rarity: 'epic',
        duration: 10
    },
    pandemic_lockdown: {
        id: 'pandemic_lockdown',
        name: 'Confinamiento Global',
        description: 'Restricciones mundiales que paralizan el comercio',
        effects: { supply: -0.3, demand: -0.4, volatility: 1.6 },
        resources: ['agua', 'comida', 'energia', 'materiales'],
        rarity: 'legendary',
        duration: 12
    },
    ai_automation: {
        id: 'ai_automation',
        name: 'Automatización por IA',
        description: 'Robots reemplazan trabajadores en sectores clave',
        effects: { supply: 0.4, demand: -0.3, volatility: 1.2 },
        resources: ['materiales', 'energia'],
        rarity: 'epic',
        duration: 15
    },
    space_mining: {
        id: 'space_mining',
        name: 'Minería Espacial',
        description: 'Explotación de asteroides revoluciona los materiales',
        effects: { supply: 1.2, demand: 0.1, volatility: 2.2 },
        resources: ['materiales'],
        rarity: 'legendary',
        duration: 20
    },
    fusion_breakthrough: {
        id: 'fusion_breakthrough',
        name: 'Energía de Fusión',
        description: 'Fusión nuclear comercial resuelve la crisis energética',
        effects: { supply: 0.9, demand: -0.5, volatility: 1.7 },
        resources: ['energia'],
        rarity: 'legendary',
        duration: 25
    },
    bioengineering_boost: {
        id: 'bioengineering_boost',
        name: 'Revolución Biotecnológica',
        description: 'Cultivos modificados multiplican la producción de alimentos',
        effects: { supply: 0.7, demand: -0.1, volatility: 1.1 },
        resources: ['comida'],
        rarity: 'epic',
        duration: 12
    },
    water_wars: {
        id: 'water_wars',
        name: 'Conflictos por Agua',
        description: 'Disputas geopolíticas por recursos hídricos escasos',
        effects: { supply: -0.6, demand: 0.8, volatility: 2.5 },
        resources: ['agua'],
        rarity: 'rare',
        duration: 8
    }
};

// Estado del administrador
let adminState = {
    connectedAdmins: new Set(),
    lastBotConfig: { qlearning: 0, standard: 0 },
    activeEvents: new Map(),
    simulationSpeed: 1.0
};

// Función para configurar rutas de administrador
function setupAdminRoutes(app, gameState, io) {
    console.log('🔧 Configurando rutas de administrador...');

    // Ruta para servir el panel de administrador
    app.get('/admin-panel', (req, res) => {
        const adminPath = path.join(__dirname, '../client/admin-panel.html');
        console.log(`Serving admin panel from: ${adminPath}`);
        
        // Verificar que el archivo existe
        if (require('fs').existsSync(adminPath)) {
            res.sendFile(adminPath);
        } else {
            console.error(`❌ Admin panel file not found at: ${adminPath}`);
            res.status(404).send('Admin panel not found');
        }
    });

    // API para obtener configuración de admin
    app.get('/api/admin/config', (req, res) => {
        res.json({
            events: Object.values(ADMIN_EVENTS),
            maxBots: ADMIN_CONFIG.maxBots,
            currentConfig: adminState.lastBotConfig,
            activeEvents: Array.from(adminState.activeEvents.entries())
        });
    });

    // API para obtener estadísticas
    app.get('/api/admin/stats', (req, res) => {
        try {
            const stats = {
                totalBots: (gameState.bots?.size || 0) + (gameState.qLearningBots?.size || 0),
                activePlayers: gameState.players?.size || 0,
                currentTick: gameState.tick || 0,
                volatility: gameState.marketVolatility || 0,
                totalTransactions: getTotalTransactionCount(gameState),
                economicCycle: gameState.economicCycle || 'expansion',
                simulationSpeed: adminState.simulationSpeed
            };
            
            res.json(stats);
        } catch (error) {
            console.error('Error getting admin stats:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    console.log('✅ Rutas de administrador configuradas');
}

// Función para configurar eventos de WebSocket de administrador
function setupAdminSocketHandlers(io, gameState, simulationManager) {
    console.log('🔧 Configurando manejadores de admin WebSocket...');

    io.on('connection', (socket) => {
        // Detectar si es una conexión de administrador
        socket.on('admin_connect', (data) => {
            if (isValidAdmin(data.username)) {
                adminState.connectedAdmins.add(socket.id);
                socket.isAdmin = true;
                
                console.log(`👑 Administrador conectado: ${socket.id}`);
                
                // Enviar estado actual
                socket.emit('admin_simulation_status', getAdminStatus(gameState));
                socket.emit('admin_events_list', Object.values(ADMIN_EVENTS));
            } else {
                socket.emit('error', { message: 'Acceso de administrador no autorizado' });
            }
        });

        // Configurar bots
        socket.on('admin_configure_bots', async (config) => {
            if (!socket.isAdmin) return;
            
            try {
                console.log('🤖 Configurando bots:', config);
                
                const result = await configureBots(config, gameState, simulationManager);
                
                adminState.lastBotConfig = {
                    qlearning: config.qlearning?.count || 0,
                    standard: config.standard?.count || 0
                };
                
                // Notificar a todos los admins
                io.to('admins').emit('bots_updated', adminState.lastBotConfig);
                
                socket.emit('admin_operation_result', {
                    success: true,
                    message: `Bots configurados: ${result.qlearning} Q-Learning, ${result.standard} estándar`,
                    data: result
                });
                
            } catch (error) {
                console.error('Error configurando bots:', error);
                socket.emit('error', { message: 'Error configurando bots: ' + error.message });
            }
        });

        // Eliminar todos los bots
        socket.on('admin_remove_all_bots', () => {
            if (!socket.isAdmin) return;
            
            try {
                removeAllBots(gameState);
                adminState.lastBotConfig = { qlearning: 0, standard: 0 };
                
                io.emit('bots_updated', adminState.lastBotConfig);
                socket.emit('admin_operation_result', {
                    success: true,
                    message: 'Todos los bots eliminados'
                });
                
                console.log('🗑️ Todos los bots eliminados por admin');
                
            } catch (error) {
                console.error('Error eliminando bots:', error);
                socket.emit('error', { message: 'Error eliminando bots' });
            }
        });

        // Activar evento especial
        socket.on('admin_trigger_event', (data) => {
            if (!socket.isAdmin) return;
            
            try {
                const now = Date.now();
                if (now - ADMIN_CONFIG.lastEventTime < ADMIN_CONFIG.eventCooldown) {
                    socket.emit('error', { 
                        message: `Cooldown activo. Espera ${Math.ceil((ADMIN_CONFIG.eventCooldown - (now - ADMIN_CONFIG.lastEventTime)) / 1000)} segundos.` 
                    });
                    return;
                }
                
                const result = triggerAdminEvent(data.eventId, gameState, io);
                
                if (result.success) {
                    ADMIN_CONFIG.lastEventTime = now;
                    
                    socket.emit('admin_operation_result', {
                        success: true,
                        message: `Evento "${result.event.name}" activado`,
                        data: result
                    });
                    
                    // Notificar a todos los jugadores
                    io.emit('admin_event_triggered', {
                        event: result.event,
                        message: `🔥 EVENTO ESPECIAL: ${result.event.name}`,
                        timestamp: Date.now()
                    });
                    
                    console.log(`🌍 Admin activó evento: ${result.event.name}`);
                } else {
                    socket.emit('error', { message: result.message });
                }
                
            } catch (error) {
                console.error('Error activando evento:', error);
                socket.emit('error', { message: 'Error activando evento' });
            }
        });

        // Control de simulación
        socket.on('admin_pause_simulation', () => {
            if (!socket.isAdmin) return;
            
            gameState.isPaused = true;
            io.emit('simulation_paused', { by: 'admin', timestamp: Date.now() });
            console.log('⏸️ Simulación pausada por admin');
        });

        socket.on('admin_resume_simulation', () => {
            if (!socket.isAdmin) return;
            
            gameState.isPaused = false;
            io.emit('simulation_resumed', { by: 'admin', timestamp: Date.now() });
            console.log('▶️ Simulación reanudada por admin');
        });

        socket.on('admin_set_speed', (data) => {
            if (!socket.isAdmin) return;
            
            adminState.simulationSpeed = Math.max(0.1, Math.min(5.0, data.speed));
            
            // Aquí se aplicaría el cambio de velocidad a los timers
            console.log(`⏱️ Velocidad cambiada a ${adminState.simulationSpeed}x por admin`);
            
            socket.emit('admin_operation_result', {
                success: true,
                message: `Velocidad ajustada a ${adminState.simulationSpeed}x`
            });
        });

        // Obtener estado
        socket.on('admin_get_status', () => {
            if (!socket.isAdmin) return;
            socket.emit('admin_simulation_status', getAdminStatus(gameState));
        });

        // Limpiar al desconectar
        socket.on('disconnect', () => {
            if (socket.isAdmin) {
                adminState.connectedAdmins.delete(socket.id);
                console.log(`👑 Administrador desconectado: ${socket.id}`);
            }
        });
    });

    console.log('✅ Manejadores de admin WebSocket configurados');
}

// Funciones auxiliares
function isValidAdmin(username) {
    return ADMIN_CONFIG.allowedUsers.includes(username);
}

function getAdminStatus(gameState) {
    return {
        totalBots: (gameState.bots?.size || 0) + (gameState.qLearningBots?.size || 0),
        activePlayers: gameState.players?.size || 0,
        currentTick: gameState.tick || 0,
        volatility: gameState.marketVolatility || 0,
        totalTransactions: getTotalTransactionCount(gameState),
        economicCycle: gameState.economicCycle || 'expansion',
        simulationSpeed: adminState.simulationSpeed,
        activeEvents: Array.from(adminState.activeEvents.keys()),
        connectedAdmins: adminState.connectedAdmins.size
    };
}

function getTotalTransactionCount(gameState) {
    let total = 0;
    
    if (gameState.players) {
        gameState.players.forEach(player => {
            total += player.transactions ? player.transactions.length : 0;
        });
    }
    
    if (gameState.bots) {
        gameState.bots.forEach(bot => {
            total += bot.transactions ? bot.transactions.length : 0;
        });
    }
    
    if (gameState.qLearningBots) {
        gameState.qLearningBots.forEach(bot => {
            total += bot.transactions ? bot.transactions.length : 0;
        });
    }
    
    return total;
}

async function configureBots(config, gameState, simulationManager) {
    const result = { qlearning: 0, standard: 0 };
    
    try {
        // Configurar Q-Learning bots
        if (config.qlearning && config.qlearning.count > 0) {
            const qCount = Math.min(config.qlearning.count, ADMIN_CONFIG.maxBots);
            const strategy = config.qlearning.strategy || 'q_learning_adaptive';
            
            for (let i = 0; i < qCount; i++) {
                if (simulationManager && simulationManager.addQLearningBot) {
                    const botName = `AdminQ_${i + 1}`;
                    simulationManager.addQLearningBot(botName, strategy);
                    result.qlearning++;
                }
            }
        }
        
        // Configurar bots estándar
        if (config.standard && config.standard.count > 0) {
            const sCount = Math.min(config.standard.count, ADMIN_CONFIG.maxBots);
            const strategy = config.standard.strategy || 'balanced';
            
            for (let i = 0; i < sCount; i++) {
                // Aquí se crearían los bots estándar
                // Esto depende de cómo esté implementado en tu sistema
                const botName = `AdminS_${i + 1}`;
                // createStandardBot(botName, strategy, gameState);
                result.standard++;
            }
        }
        
        console.log(`✅ Bots configurados: ${result.qlearning} Q-Learning, ${result.standard} estándar`);
        
    } catch (error) {
        console.error('Error en configureBots:', error);
        throw error;
    }
    
    return result;
}

function removeAllBots(gameState) {
    let removed = 0;
    
    if (gameState.bots) {
        removed += gameState.bots.size;
        gameState.bots.clear();
    }
    
    if (gameState.qLearningBots) {
        removed += gameState.qLearningBots.size;
        gameState.qLearningBots.clear();
    }
    
    console.log(`🗑️ ${removed} bots eliminados`);
    return removed;
}

function triggerAdminEvent(eventId, gameState, io) {
    const event = ADMIN_EVENTS[eventId];
    if (!event) {
        return { success: false, message: 'Evento no encontrado' };
    }
    
    try {
        // Aplicar efectos del evento
        event.resources.forEach(resource => {
            if (gameState.market && gameState.market[resource]) {
                const market = gameState.market[resource];
                
                // Aplicar efectos gradualmente
                const supplyChange = event.effects.supply || 0;
                const demandChange = event.effects.demand || 0;
                
                market.supply = Math.max(50, Math.floor(market.supply * (1 + supplyChange)));
                market.demand = Math.max(50, Math.floor(market.demand * (1 + demandChange)));
                
                // Asegurar límites
                market.supply = Math.min(5000, market.supply);
                market.demand = Math.min(5000, market.demand);
            }
        });
        
        // Registrar evento activo
        adminState.activeEvents.set(eventId, {
            ...event,
            startTime: Date.now(),
            endTime: Date.now() + (event.duration * 15000) // duration en ticks
        });
        
        // Crear evento para el sistema
        const marketEvent = {
            type: event.id,
            name: event.name,
            resource: event.resources[0], // Recurso principal
            effect: event.effects,
            tick: gameState.tick,
            timestamp: Date.now(),
            severity: Math.abs(event.effects.supply) + Math.abs(event.effects.demand),
            isAdminEvent: true,
            rarity: event.rarity
        };
        
        // Agregar al historial de eventos
        if (gameState.marketEvents) {
            gameState.marketEvents.push(marketEvent);
        }
        
        console.log(`🌍 Evento admin activado: ${event.name} afecta ${event.resources.join(', ')}`);
        
        return { success: true, event: event, marketEvent: marketEvent };
        
    } catch (error) {
        console.error('Error aplicando evento admin:', error);
        return { success: false, message: 'Error aplicando evento: ' + error.message };
    }
}

// Función para procesar eventos activos (llamar desde el tick económico)
function processActiveAdminEvents(gameState) {
    const now = Date.now();
    const expiredEvents = [];
    
    adminState.activeEvents.forEach((event, eventId) => {
        if (now >= event.endTime) {
            expiredEvents.push(eventId);
        }
    });
    
    // Limpiar eventos expirados
    expiredEvents.forEach(eventId => {
        adminState.activeEvents.delete(eventId);
        console.log(`⏰ Evento admin expirado: ${eventId}`);
    });
    
    return adminState.activeEvents.size;
}

module.exports = {
    setupAdminRoutes,
    setupAdminSocketHandlers,
    processActiveAdminEvents,
    ADMIN_EVENTS,
    adminState
};