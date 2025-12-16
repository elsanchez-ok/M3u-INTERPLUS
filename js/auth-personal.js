// auth-simple.js - VERSIÓN ESTABLE Y FUNCIONAL
class SimpleAuth {
    constructor() {
        this.STORAGE_KEY = 'secure_stream_session';
        this.DEVICE_KEY = 'secure_stream_device';
        this.LAST_VERIFY_KEY = 'last_verify_time';
        
        console.log('🔧 SimpleAuth inicializado');
    }
    
    // ============================================
    // VERIFICACIÓN DE SESIÓN - VERSIÓN CORREGIDA
    // ============================================
    verifySession() {
        console.log('🔍 Verificando sesión...');
        
        try {
            const sessionStr = localStorage.getItem(this.STORAGE_KEY);
            if (!sessionStr) {
                console.log('📭 No hay sesión guardada');
                return false;
            }
            
            const session = JSON.parse(sessionStr);
            
            // DEBUG: Mostrar información de la sesión
            console.log('📋 Sesión encontrada:', {
                user: session.user?.username,
                expiresAt: session.expiresAt,
                now: Date.now(),
                diferencia: session.expiresAt - Date.now()
            });
            
            // Verificar que tenga los datos mínimos
            if (!session.user || !session.user.username) {
                console.log('⚠️ Sesión corrupta - sin usuario');
                this.clearSession();
                return false;
            }
            
            // Verificar expiración SOLO si existe expiresAt
            if (session.expiresAt) {
                const now = Date.now();
                const timeLeft = session.expiresAt - now;
                
                console.log(`⏰ Tiempo restante: ${Math.floor(timeLeft / 60000)} minutos`);
                
                if (timeLeft <= 0) {
                    console.log('⌛ Sesión expirada por tiempo');
                    this.clearSession();
                    return false;
                }
                
                // Renovar la sesión si quedan menos de 5 minutos
                if (timeLeft < (5 * 60000)) {
                    console.log('🔄 Renovando sesión...');
                    session.expiresAt = now + (60 * 60000); // Renovar a 60 minutos
                    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
                }
            } else {
                // Si no hay expiresAt, crear uno
                console.log('➕ Creando tiempo de expiración');
                session.expiresAt = Date.now() + (60 * 60000);
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
            }
            
            // Evitar verificaciones demasiado frecuentes
            const lastVerify = localStorage.getItem(this.LAST_VERIFY_KEY) || 0;
            if (Date.now() - lastVerify < 5000) { // 5 segundos mínimo entre verificaciones
                console.log('⚡ Verificación demasiado rápida, omitiendo...');
                return true;
            }
            
            localStorage.setItem(this.LAST_VERIFY_KEY, Date.now().toString());
            
            console.log('✅ Sesión válida');
            return true;
            
        } catch (error) {
            console.error('❌ Error verificando sesión:', error);
            return false;
        }
    }
    
    // ============================================
    // LOGIN - VERSIÓN SIMPLIFICADA Y ESTABLE
    // ============================================
    async login(username, password) {
        console.log(`🔐 Login para: ${username}`);
        
        // Simular respuesta del servidor
        return new Promise((resolve) => {
            setTimeout(() => {
                // Credenciales válidas
                const validUsers = {
                    'admin': { password: 'admin123', name: 'Administrador', user_type: 'admin', status: 'active' },
                    'usuario': { password: 'user123', name: 'Usuario Normal', user_type: 'user', status: 'active' }
                };
                
                if (validUsers[username] && validUsers[username].password === password) {
                    // Crear sesión
                    const session = {
                        user: {
                            username: username,
                            name: validUsers[username].name,
                            user_type: validUsers[username].user_type,
                            status: validUsers[username].status
                        },
                        deviceId: this.getDeviceId(),
                        loginTime: new Date().toISOString(),
                        expiresAt: Date.now() + (60 * 60000) // 60 minutos desde AHORA
                    };
                    
                    // Guardar sesión
                    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
                    
                    console.log('✅ Login exitoso, sesión guardada');
                    console.log('📅 Expira:', new Date(session.expiresAt).toLocaleTimeString());
                    
                    resolve({
                        success: true,
                        user: session.user,
                        expires_at: session.expiresAt,
                        message: `¡Bienvenido ${session.user.name}!`
                    });
                } else {
                    resolve({
                        success: false,
                        error: 'Usuario o contraseña incorrectos'
                    });
                }
            }, 1000); // Simular delay de red
        });
    }
    
    // ============================================
    // FUNCIONES AUXILIARES
    // ============================================
    getDeviceId() {
        let deviceId = localStorage.getItem(this.DEVICE_KEY);
        if (!deviceId) {
            deviceId = 'dev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem(this.DEVICE_KEY, deviceId);
        }
        return deviceId;
    }
    
    getCurrentUser() {
        try {
            const sessionStr = localStorage.getItem(this.STORAGE_KEY);
            if (!sessionStr) return null;
            
            const session = JSON.parse(sessionStr);
            return session.user;
        } catch (error) {
            return null;
        }
    }
    
    getSessionTimeLeft() {
        try {
            const sessionStr = localStorage.getItem(this.STORAGE_KEY);
            if (!sessionStr) return 0;
            
            const session = JSON.parse(sessionStr);
            if (!session.expiresAt) return 60; // Valor por defecto
            
            const timeLeft = session.expiresAt - Date.now();
            return timeLeft > 0 ? Math.floor(timeLeft / 60000) : 0;
        } catch (error) {
            return 0;
        }
    }
    
    clearSession() {
        localStorage.removeItem(this.STORAGE_KEY);
        console.log('🧹 Sesión limpiada');
    }
    
    async logout() {
        const user = this.getCurrentUser();
        if (user) {
            console.log(`🚪 Cerrando sesión de ${user.username}`);
        }
        this.clearSession();
    }
    
    // Para el admin panel
    getActiveSessions() {
        const user = this.getCurrentUser();
        if (!user) return [];
        
        return [{
            username: user.username,
            name: user.name,
            deviceId: this.getDeviceId(),
            loginTime: new Date().toISOString(),
            timeLeft: this.getSessionTimeLeft(),
            user_type: user.user_type
        }];
    }
    
    async forceLogoutUser(username) {
        console.log(`⚡ Forzando logout para: ${username}`);
        // Simular éxito
        return true;
    }
}

// Crear instancia global
window.SecureAuth = new SimpleAuth();

// Función de debug
window.debugAuth = function() {
    console.log('=== DEBUG AUTH ===');
    console.log('Session:', localStorage.getItem('secure_stream_session'));
    console.log('Device:', localStorage.getItem('secure_stream_device'));
    
    const sessionStr = localStorage.getItem('secure_stream_session');
    if (sessionStr) {
        try {
            const session = JSON.parse(sessionStr);
            console.log('Usuario:', session.user);
            console.log('Expira en:', new Date(session.expiresAt).toLocaleString());
            console.log('Tiempo restante:', Math.floor((session.expiresAt - Date.now()) / 60000) + ' minutos');
        } catch (e) {
            console.error('Error parseando sesión:', e);
        }
    }
};
