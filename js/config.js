// config.js - Configuración del entorno
const AppConfig = {
    // URL de tu instancia de NocoDB
    NOCODB_URL: process.env.NOCODB_URL || 'https://tu-instancia.nocodb.com',
    
    // Token de API de NocoDB
    NOCODB_TOKEN: process.env.NOCODB_TOKEN || 'tu-api-token',
    
    // ID del proyecto en NocoDB
    PROJECT_ID: process.env.PROJECT_ID || 'p_xxxxxxxxxxxx',
    
    // Tiempo de sesión en minutos
    SESSION_TIMEOUT: 60,
    
    // Máximo de dispositivos por usuario
    MAX_DEVICES: 1
};

// Exportar para uso global
window.AppConfig = AppConfig;
