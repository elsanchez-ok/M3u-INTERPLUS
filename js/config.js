// config.js - Configuración del entorno
const AppConfig = {
    // URL de tu instancia de NocoDB
    NOCODB_URL: process.env.NOCODB_URL || 'https://app.nocodb.com/api/v3/meta/bases/p5xsjpo507ot933/swagger',
    
    // Token de API de NocoDB
    NOCODB_TOKEN: process.env.NOCODB_TOKEN || 'ZedVPgS8jEw22E1zo5Icw2IFLG2jbJhOy77qkw7j',
    
    // ID del proyecto en NocoDB
    PROJECT_ID: process.env.PROJECT_ID || 'p5xsjpo507ot933',
    
    // Tiempo de sesión en minutos
    SESSION_TIMEOUT: 60,
    
    // Máximo de dispositivos por usuario
    MAX_DEVICES: 1
};

// Exportar para uso global
window.AppConfig = AppConfig;
