// auth-personal.js - VERSIÓN ULTRA SIMPLIFICADA Y FUNCIONAL
class SimpleAuth {
    constructor() {
        // ⚠️ REEMPLAZA ESTA URL CON LA TUYA
        this.API_URL = 'https://script.google.com/macros/s/AKfycbxB3lJLiei_7YtkKyQ39OsEhScDCyZnoYoAS50ZKdd5cyq3_L3wFi5Pki0pilQZM35aCw/exec';
        
        this.STORAGE_KEY = 'secure_stream_session';
        this.DEVICE_KEY = 'secure_stream_device';
        
        console.log('✅ Auth inicializado');
        console.log('🔗 URL API:', this.API_URL);
    }
    
    // Generar ID del dispositivo
    getDeviceId() {
        let deviceId = localStorage.getItem(this.DEVICE_KEY);
        if (!deviceId) {
            deviceId = 'dev_' + Date.now();
            localStorage.setItem(this.DEVICE_KEY, deviceId);
        }
        return deviceId;
    }
    
    // Login SIMPLIFICADO - sin verificar sesiones previas
    async login(username, password) {
        console.log(`🔐 Login intento: ${username}`);
        
        try {
            const response = await fetch(this.API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({
                    action: 'login',
                    username: username.trim(),
                    password: password,
                    deviceId: this.getDeviceId(),
                    timestamp: Date.now()
                })
            });
            
            const result = await response.json();
            console.log('📥 Respuesta login:', result);
            
            if (result.success) {
                // Guardar sesión local
                const session = {
                    user: result.user,
                    deviceId: this.getDeviceId(),
                    loginTime: new Date().toISOString(),
                    expiresAt: Date.now() + (60 * 60000) // 60 minutos
                };
                
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
                console.log('✅ Sesión guardada');
            }
            
            return result;
            
        } catch (error) {
            console.error('❌ Error en login:', error);
            return {
                success: false,
                error: 'Error de conexión con el servidor'
            };
        }
    }
    
    // Verificar sesión local SOLO
    verifySession() {
        try {
            const sessionStr = localStorage.getItem(this.STORAGE_KEY);
            if (!sessionStr) return false;
            
            const session = JSON.parse(sessionStr);
            
            // Verificar si ha expirado
            if (session.expiresAt && session.expiresAt < Date.now()) {
                localStorage.removeItem(this.STORAGE_KEY);
                return false;
            }
            
            return true;
            
        } catch (error) {
            return false;
        }
    }
    
    // Obtener usuario actual
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
    
    // Cerrar sesión
    async logout() {
        const user = this.getCurrentUser();
        if (user) {
            try {
                await fetch(this.API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain' },
                    body: JSON.stringify({
                        action: 'logout',
                        username: user.username,
                        timestamp: Date.now()
                    })
                });
            } catch (error) {
                console.log('⚠️ Error al notificar logout al servidor');
            }
        }
        
        localStorage.removeItem(this.STORAGE_KEY);
        console.log('🚪 Sesión local cerrada');
    }
    
    // Probar conexión con Google Apps Script
    async testConnection() {
        console.log('🔗 Probando conexión...');
        
        try {
            const response = await fetch(this.API_URL + '?action=test');
            const data = await response.json();
            console.log('✅ Conexión OK:', data);
            return data;
        } catch (error) {
            console.error('❌ Error de conexión:', error);
            return { success: false, error: error.message };
        }
    }
}

// Crear instancia global
window.SecureAuth = new SimpleAuth();
