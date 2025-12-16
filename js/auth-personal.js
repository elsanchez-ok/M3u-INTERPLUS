// auth-personal.js - VERSIÓN DEFINITIVA SIN CIERRE AUTOMÁTICO
class SecureStreamAuth {
    constructor() {
        this.API_URL = 'https://script.google.com/macros/s/AKfycbxB3lJLiei_7YtkKyQ39OsEhScDCyZnoYoAS50ZKdd5cyq3_L3wFi5Pki0pilQZM35aCw/exec';
        this.STORAGE_KEY = 'secure_stream_session_v2'; // Cambié la clave
        this.DEVICE_KEY = 'secure_stream_device';
        
        console.log('✅ Auth inicializado - SIN CIERRE AUTOMÁTICO');
    }
    
    getDeviceId() {
        let deviceId = localStorage.getItem(this.DEVICE_KEY);
        if (!deviceId) {
            deviceId = 'dev_' + Date.now();
            localStorage.setItem(this.DEVICE_KEY, deviceId);
        }
        return deviceId;
    }
    
    // ======================= LOGIN CORREGIDO =======================
    async login(username, password) {
        console.log(`🔐 Login para: ${username}`);
        
        try {
            const response = await fetch(this.API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({
                    action: 'login',
                    username: username.trim(),
                    password: password,
                    deviceId: this.getDeviceId()
                })
            });
            
            const result = await response.json();
            console.log('📥 Respuesta del servidor:', result);
            
            if (result.success) {
                // ✅ CORRECCIÓN CLAVE: Calcular expiresAt CORRECTAMENTE
                const now = Date.now();
                const expiresAt = result.expires_at || (now + (60 * 60000));
                
                const session = {
                    user: result.user,
                    deviceId: this.getDeviceId(),
                    loginTime: new Date().toISOString(),
                    expiresAt: expiresAt, // Este es el valor CORRECTO
                    debug: {
                        setAt: now,
                        shouldExpireAt: expiresAt,
                        differenceMinutes: (expiresAt - now) / 60000
                    }
                };
                
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
                console.log('💾 Sesión guardada. Expira en:', 
                    new Date(expiresAt).toLocaleTimeString(),
                    `(${(expiresAt - now) / 60000} minutos)`);
            }
            
            return result;
            
        } catch (error) {
            console.error('❌ Error de conexión:', error);
            return {
                success: false,
                error: 'Error de conexión con el servidor'
            };
        }
    }
    
    // ======================= VERIFICACIÓN CORREGIDA =======================
    verifySession() {
        try {
            const sessionStr = localStorage.getItem(this.STORAGE_KEY);
            if (!sessionStr) {
                console.log('📭 No hay sesión en localStorage');
                return false;
            }
            
            const session = JSON.parse(sessionStr);
            
            // ✅ VERIFICACIÓN SEGURA: Solo expirar si realmente pasó el tiempo
            if (session.expiresAt) {
                const now = Date.now();
                const timeLeft = session.expiresAt - now;
                
                console.log('⏰ Verificación de sesión:',
                    `Expira: ${new Date(session.expiresAt).toLocaleTimeString()}`,
                    `| Ahora: ${new Date(now).toLocaleTimeString()}`,
                    `| Restante: ${Math.floor(timeLeft / 60000)} min`);
                
                // Solo expirar si ya pasaron más de 60 minutos
                if (timeLeft <= 0) {
                    console.log('⌛ Sesión REALMENTE expirada');
                    localStorage.removeItem(this.STORAGE_KEY);
                    return false;
                }
            }
            
            console.log('✅ Sesión válida');
            return true;
            
        } catch (error) {
            console.error('❌ Error verificando sesión:', error);
            return false;
        }
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
            if (!session.expiresAt) return 60;
            
            const timeLeft = session.expiresAt - Date.now();
            return timeLeft > 0 ? Math.floor(timeLeft / 60000) : 0;
            
        } catch (error) {
            return 60; // Valor por defecto
        }
    }
    
    async logout() {
        const user = this.getCurrentUser();
        if (user) {
            try {
                await fetch(this.API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain' },
                    body: JSON.stringify({
                        action: 'logout',
                        username: user.username
                    })
                });
            } catch (error) {
                // Ignorar errores de conexión en logout
            }
        }
        
        localStorage.removeItem(this.STORAGE_KEY);
        console.log('🚪 Sesión cerrada manualmente');
    }
    
    // Función de diagnóstico
    debugSession() {
        console.log('=== DEBUG DE SESIÓN ===');
        const sessionStr = localStorage.getItem(this.STORAGE_KEY);
        
        if (!sessionStr) {
            console.log('❌ No hay sesión guardada');
            return;
        }
        
        try {
            const session = JSON.parse(sessionStr);
            const now = Date.now();
            const timeLeft = session.expiresAt ? session.expiresAt - now : 0;
            
            console.log('👤 Usuario:', session.user?.username);
            console.log('🕐 Login:', session.loginTime);
            console.log('⏳ Expira:', new Date(session.expiresAt).toLocaleString());
            console.log('⏰ Tiempo restante:', Math.floor(timeLeft / 60000), 'minutos');
            console.log('📱 Dispositivo:', session.deviceId?.substring(0, 20));
            console.log('🔑 Storage key:', this.STORAGE_KEY);
            
        } catch (error) {
            console.error('❌ Sesión corrupta:', error);
        }
    }
}

// Crear instancia global
window.SecureAuth = new SecureStreamAuth();

// Hacer debug disponible
window.debugAuth = () => SecureAuth.debugSession();
