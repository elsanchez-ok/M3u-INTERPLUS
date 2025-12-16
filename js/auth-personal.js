// auth-personal.js - VERSIÓN COMPLETA Y FUNCIONAL
class SecureStreamAuth {
    constructor() {
        // ⚠️ REEMPLAZA CON TU URL REAL DE APPS SCRIPT
        this.API_URL = 'https://script.google.com/macros/s/AKfycbxB3lJLiei_7YtkKyQ39OsEhScDCyZnoYoAS50ZKdd5cyq3_L3wFi5Pki0pilQZM35aCw/exec';
        
        this.STORAGE_KEY = 'secure_stream_session';
        this.DEVICE_KEY = 'secure_stream_device';
        
        console.log('✅ SecureStreamAuth inicializado');
        console.log('🔗 URL API:', this.API_URL);
    }
    
    // Generar ID del dispositivo
    getDeviceId() {
        let deviceId = localStorage.getItem(this.DEVICE_KEY);
        if (!deviceId) {
            deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem(this.DEVICE_KEY, deviceId);
        }
        return deviceId;
    }
    
    // Enviar solicitud al servidor
    async sendRequest(action, data = {}) {
        console.log(`📤 Enviando: ${action}`);
        
        try {
            const response = await fetch(this.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8'
                },
                body: JSON.stringify({
                    action: action,
                    deviceId: this.getDeviceId(),
                    ...data
                })
            });
            
            const result = await response.json();
            console.log(`📥 Respuesta ${action}:`, result);
            return result;
            
        } catch (error) {
            console.error(`❌ Error en ${action}:`, error);
            return {
                success: false,
                error: 'Error de conexión'
            };
        }
    }
    
    // Iniciar sesión
    async login(username, password) {
        console.log(`🔐 Login intento: ${username}`);
        
        const result = await this.sendRequest('login', {
            username: username.trim(),
            password: password
        });
        
        if (result.success && result.user) {
            // Guardar sesión local
            const session = {
                user: result.user,
                deviceId: this.getDeviceId(),
                loginTime: new Date().toISOString(),
                expiresAt: result.expires_at || (Date.now() + 3600000) // 1 hora
            };
            
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
            console.log('✅ Sesión guardada');
        }
        
        return result;
    }
    
    // Verificar sesión - VERSIÓN CORREGIDA (sin bucle infinito)
    async verifySession() {
        try {
            const sessionStr = localStorage.getItem(this.STORAGE_KEY);
            if (!sessionStr) {
                console.log('❌ No hay sesión guardada');
                return false;
            }
            
            const session = JSON.parse(sessionStr);
            
            // Verificar expiración
            const now = Date.now();
            if (session.expiresAt && session.expiresAt < now) {
                console.log('⌛ Sesión expirada');
                localStorage.removeItem(this.STORAGE_KEY);
                return false;
            }
            
            // Verificar con el servidor
            console.log('🔍 Verificando sesión con servidor...');
            const user = session.user;
            if (user && user.username) {
                const result = await this.sendRequest('verify_session', {
                    username: user.username,
                    deviceId: session.deviceId
                });
                
                if (result.success) {
                    console.log('✅ Sesión verificada en servidor');
                    return true;
                }
            }
            
            return false;
            
        } catch (error) {
            console.error('❌ Error verificando sesión:', error);
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
            await this.sendRequest('logout', { username: user.username });
        }
        localStorage.removeItem(this.STORAGE_KEY);
        console.log('🚪 Sesión cerrada');
    }
    
    // Forzar cierre (admin)
    async forceLogout(username) {
        return await this.sendRequest('force_logout', { username: username });
    }
    
    // Obtener usuarios (admin)
    async getUsers() {
        const result = await this.sendRequest('get_users');
        return result.users || [];
    }
    
    // Probar conexión
    async testConnection() {
        console.log('🔗 Probando conexión...');
        const result = await this.sendRequest('test');
        return result;
    }
}

// Crear instancia global
window.SecureAuth = new SecureStreamAuth();
