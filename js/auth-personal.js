// auth-personal.js - VERSIÓN ULTRA SIMPLE
class SimpleAuth {
    constructor() {
        // ⚠️ PEGA AQUÍ TU URL DEL APPS SCRIPT
        this.API_URL = 'https://script.google.com/macros/s/AKfycbxB3lJLiei_7YtkKyQ39OsEhScDCyZnoYoAS50ZKdd5cyq3_L3wFi5Pki0pilQZM35aCw/exec';
        
        this.STORAGE_KEY = 'secure_session';
        console.log('✅ Auth inicializado');
    }
    
    async login(username, password) {
        console.log(`🔐 Login: ${username}`);
        
        // Validación básica
        if (!username || !password) {
            return { success: false, error: 'Completa los campos' };
        }
        
        try {
            // Usar POST con text/plain para evitar CORS
            const response = await fetch(this.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain'
                },
                body: JSON.stringify({
                    action: 'login',
                    username: username.trim(),
                    password: password
                })
            });
            
            const data = await response.json();
            console.log('📥 Respuesta:', data);
            
            if (data.success) {
                // Guardar sesión
                const session = {
                    user: data.user || {
                        username: username,
                        name: username === 'admin' ? 'Administrador' : 'Usuario',
                        user_type: username === 'admin' ? 'admin' : 'user',
                        status: 'active'
                    },
                    loginTime: new Date().toISOString(),
                    expiresAt: data.expires_at || (Date.now() + 3600000)
                };
                
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
                console.log('✅ Sesión guardada');
                
                return {
                    success: true,
                    user: session.user,
                    message: '¡Login exitoso!'
                };
            }
            
            return data;
            
        } catch (error) {
            console.error('❌ Error de conexión:', error);
            
            // MODO DE EMERGENCIA: Si falla la conexión, permitir login local
            if (username === 'admin' && password === 'admin123') {
                const session = {
                    user: {
                        username: 'admin',
                        name: 'Administrador',
                        user_type: 'admin',
                        status: 'active'
                    },
                    loginTime: new Date().toISOString(),
                    expiresAt: Date.now() + 3600000
                };
                
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
                console.log('✅ Login en modo emergencia');
                
                return {
                    success: true,
                    user: session.user,
                    message: '¡Modo emergencia activado!'
                };
            }
            
            return {
                success: false,
                error: 'Error de conexión. Usa: admin / admin123'
            };
        }
    }
    
    verifySession() {
        try {
            const session = localStorage.getItem(this.STORAGE_KEY);
            if (!session) return false;
            
            const data = JSON.parse(session);
            return data.expiresAt > Date.now();
            
        } catch (e) {
            return false;
        }
    }
    
    getCurrentUser() {
        try {
            const session = localStorage.getItem(this.STORAGE_KEY);
            if (!session) return null;
            return JSON.parse(session).user;
        } catch (e) {
            return null;
        }
    }
    
    logout() {
        localStorage.removeItem(this.STORAGE_KEY);
        console.log('🚪 Sesión cerrada');
    }
    
    // Función para probar conexión
    async testConnection() {
        console.log('🔗 Probando conexión...');
        try {
            const response = await fetch(this.API_URL + '?action=test');
            const data = await response.json();
            console.log('✅ Conexión OK:', data);
            return data;
        } catch (error) {
            console.error('❌ Error:', error);
            return { success: false, error: error.message };
        }
    }
}

// Crear instancia global
window.SecureAuth = new SimpleAuth();

// Debug
window.debugAuth = function() {
    console.log('=== DEBUG ===');
    console.log('URL:', SecureAuth.API_URL);
    console.log('Sesión:', localStorage.getItem('secure_session'));
    console.log('Usuario:', SecureAuth.getCurrentUser());
};
