// scripts/reset-database-fixed.js - Script mejorado para limpiar la BD
const fs = require('fs');
const path = require('path');

async function resetDatabase() {
    const dbPath = path.join(__dirname, '../database.sqlite');
    
    try {
        // 1. Eliminar archivo de BD existente
        if (fs.existsSync(dbPath)) {
            fs.unlinkSync(dbPath);
            console.log('✅ Archivo de base de datos eliminado');
        } else {
            console.log('ℹ️ No se encontró base de datos existente');
        }
        
        // 2. Inicializar nueva BD con esquema corregido
        console.log('🔄 Inicializando nueva base de datos...');
        
        // Importar el nuevo modelo corregido
        const { DatabaseManager } = require('../server/models');
        
        await DatabaseManager.initialize();
        
        console.log('✅ Base de datos reinicializada con esquema corregido');
        console.log('🎉 Listo para usar!');
        
    } catch (error) {
        console.error('❌ Error reinicializando base de datos:', error.message);
        process.exit(1);
    }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
    console.log('🗑️ Reiniciando base de datos con correcciones...');
    resetDatabase().then(() => {
        console.log('✅ Proceso completado');
        process.exit(0);
    }).catch(error => {
        console.error('❌ Error fatal:', error);
        process.exit(1);
    });
}

module.exports = { resetDatabase };