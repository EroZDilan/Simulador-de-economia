// server/init-database.js
const { DatabaseManager } = require('./models');

async function initializeDatabase() {
    console.log('🔧 Inicializando base de datos...');
    
    try {
        await DatabaseManager.initialize();
        console.log('✅ Base de datos inicializada correctamente');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error inicializando base de datos:', error);
        process.exit(1);
    }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
    initializeDatabase();
}

module.exports = { initializeDatabase };