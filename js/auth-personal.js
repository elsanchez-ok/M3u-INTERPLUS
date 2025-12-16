// auth-personal.js - VERSIÓN SIMPLIFICADA Y FUNCIONAL
class SecureStreamAuth {
    constructor() {
        // ⚠️ REEMPLAZA ESTA URL CON LA DE TU APPS SCRIPT
        this.API_URL = 'https://script.google.com/macros/s/TU_ID_APPS_SCRIPT/exec';
        
        this.STORAGE_KEY = 'secure_stream_session';
        this.DEVICE_KEY = 'secure_stream_device';
        
        console.log('🔧 SecureStreamAuth inicializado');
        console.log('🔗 URL API:', this.API_URL);
    }
    
    // Generar ID único del dispositivo
    getDeviceId() {
        let deviceId = localStorage.getItem(this.DEVICE_KEY);
        if (!deviceId) {
            deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem(this.DEVICE_KEY, deviceId);
        }
        return deviceId;
    }
    
    // Enviar solicitud al API - VERSIÓN CORREGIDA
    async sendRequest(action, data = {}) {
        const url = this.API_URL;
        const deviceId = this.getDeviceId();
        
        // DATOS COMPLETOS A ENVIAR
        const requestData = {
            action: action,
            deviceId: deviceId,
            timestamp: Date.now(),
            ...data
        };
        
        console.log(`📤 Enviando ${action}:`, requestData);
        
        try {
            // USAR text/plain PARA EVITAR CORS
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8'
                },
                body: JSON.stringify(requestData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log(`📥 Respuesta ${action}:`, result);
            
            return result;
            
        } catch (error) {
            console.error(`❌ Error en ${action}:`, error);
            return {
                success: false,
                error: 'Error de conexión: ' + error.message
            };
        }
    }
    
    // LOGIN PRINCIPAL
    async login(username, password) {
        console.log(`🔐 Intentando login: ${username}`);
        
        const result = await this.sendRequest('login', {
            username: username.trim(),
            password: password
        });
        
        if (result.success && result.user) {
            // GUARDAR SESIÓN LOCAL
            const session = {
                user: result.user,
                deviceId: this.getDeviceId(),
                loginTime: new Date().toISOString(),
                expiresAt: result.expires_at || (Date.now() + (60 * 60000))
            };
            
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
            console.log('✅ Sesión guardada');
        }
        
        return result;
    }
    
    // VERIFICAR SESIÓN
    verifySession() {
        try {
            const sessionStr = localStorage.getItem(this.STORAGE_KEY);
            if (!sessionStr) return false;
            
            const session = JSON.parse(sessionStr);
            
            // Verificar expiración
            if (session.expiresAt && session.expiresAt < Date.now()) {
                localStorage.removeItem(this.STORAGE_KEY);
                return false;
            }
            
            return true;
            
        } catch (error) {
            return false;
        }
    }
    
    // OBTENER USUARIO ACTUAL
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
    
    // CERRAR SESIÓN
    async logout() {
        const user = this.getCurrentUser();
        if (user) {
            await this.sendRequest('logout', { username: user.username });
        }
        localStorage.removeItem(this.STORAGE_KEY);
        console.log('🚪 Sesión cerrada');
    }
    
    // FORZAR CIERRE (admin)
    async forceLogout(username) {
        return await this.sendRequest('force_logout', { username: username });
    }
    
    // OBTENER TODOS LOS USUARIOS (admin)
    async getUsers() {
        const result = await this.sendRequest('get_users');
        return result.users || [];
    }
    
    // PROBAR CONEXIÓN
    async testConnection() {
        console.log('🔗 Probando conexión...');
        const result = await this.sendRequest('test');
        return result;
    }
}

// CREAR INSTANCIA GLOBAL
window.SecureAuth = new SecureStreamAuth();

// Función de depuración
window.debugAuth = function() {
    console.log('=== DEBUG ===');
    console.log('URL API:', SecureAuth.API_URL);
    console.log('Dispositivo:', SecureAuth.getDeviceId());
    console.log('Sesión:', localStorage.getItem('secure_stream_session'));
    console.log('Usuario:', SecureAuth.getCurrentUser());
};
