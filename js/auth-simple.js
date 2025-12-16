// auth-google.js - Sistema de autenticación con Google Sheets
class GoogleSheetsAuth {
    constructor() {
        this.config = {
            API_URL: 'https://script.google.com/a/macros/iteesa.edu.hn/s/AKfycbxocLXjNoaRscKOteVm_OsPTdk4LdnU_JtuRffGZSoy6XaDOZVG4giJ3d7FyAwk_tYVjQ/exec', // PEGA TU URL AQUÍ
            STORAGE_KEY: 'secure_stream_auth',
            DEVICE_KEY: 'secure_stream_device',
            SESSION_TIMEOUT: 60 // minutos
        };
        
        console.log('✅ GoogleSheetsAuth inicializado');
    }

    // Generar ID de dispositivo
    generateDeviceId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        return `device_${timestamp}_${random}`;
    }

    getDeviceId() {
        let deviceId = localStorage.getItem(this.config.DEVICE_KEY);
        if (!deviceId) {
            deviceId = this.generateDeviceId();
            localStorage.setItem(this.config.DEVICE_KEY, deviceId);
            console.log('Nuevo dispositivo registrado:', deviceId);
        }
        return deviceId;
    }

    // Llamar a la API
    async callAPI(action, data = {}) {
        try {
            console.log(`📤 Enviando ${action}:`, data);
            
            const response = await fetch(this.config.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    action, 
                    ...data,
                    timestamp: Date.now()
                })
            });
            
            const result = await response.json();
            console.log(`📥 Respuesta ${action}:`, result);
            
            return result;
            
        } catch (error) {
            console.error('❌ Error en API call:', error);
            return { 
                success: false, 
                error: 'Error de conexión con el servidor' 
            };
        }
    }

    // INICIAR SESIÓN (Paso 1: Obtener PIN)
    async login(username, password) {
        try {
            const deviceId = this.getDeviceId();
            
            const result = await this.callAPI('login', {
                username: username,
                password: password,
                deviceId: deviceId
            });
            
            return result;
            
        } catch (error) {
            console.error('Login error:', error);
            return { 
                success: false, 
                error: 'Error en el proceso de login' 
            };
        }
    }

    // VERIFICAR PIN (Paso 2: Confirmar PIN)
    async verifyPin(username, pin) {
        try {
            const result = await this.callAPI('verify_pin', {
                username: username,
                pin: pin
            });
            
            if (result.success) {
                // Guardar sesión localmente
                const sessionData = {
                    user: result.user,
                    deviceId: this.getDeviceId(),
                    loginTime: new Date().toISOString(),
                    expiresAt: result.session_expires || (Date.now() + (this.config.SESSION_TIMEOUT * 60000))
                };
                
                localStorage.setItem(this.config.STORAGE_KEY, JSON.stringify(sessionData));
                
                console.log('✅ Sesión guardada para:', username);
            }
            
            return result;
            
        } catch (error) {
            console.error('Verify PIN error:', error);
            return { 
                success: false, 
                error: 'Error verificando PIN' 
            };
        }
    }

    // VERIFICAR SESIÓN ACTIVA
    async verifySession() {
        try {
            const sessionData = JSON.parse(localStorage.getItem(this.config.STORAGE_KEY) || 'null');
            const deviceId = this.getDeviceId();
            
            if (!sessionData || !deviceId) {
                console.log('No hay sesión local');
                return false;
            }
            
            // Verificar expiración local
            if (sessionData.expiresAt && sessionData.expiresAt < Date.now()) {
                console.log('Sesión local expirada');
                await this.logout();
                return false;
            }
            
            // Verificar con Google Sheets
            const result = await this.callAPI('verify_session', {
                username: sessionData.user.username,
                deviceId: deviceId
            });
            
            return result.valid === true;
            
        } catch (error) {
            console.error('Verify session error:', error);
            return false;
        }
    }

    // OBTENER USUARIO ACTUAL
    getCurrentUser() {
        const sessionData = JSON.parse(localStorage.getItem(this.config.STORAGE_KEY) || 'null');
        return sessionData ? sessionData.user : null;
    }

    // CERRAR SESIÓN
    async logout() {
        try {
            const user = this.getCurrentUser();
            if (user) {
                await this.callAPI('logout', {
                    username: user.username
                });
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // Siempre limpiar local
            localStorage.removeItem(this.config.STORAGE_KEY);
            console.log('✅ Sesión local cerrada');
        }
    }

    // OBTENER TIEMPO RESTANTE
    getSessionTimeLeft() {
        try {
            const sessionData = JSON.parse(localStorage.getItem(this.config.STORAGE_KEY) || 'null');
            if (!sessionData || !sessionData.expiresAt) return 0;
            
            const now = Date.now();
            const timeLeft = sessionData.expiresAt - now;
            
            if (timeLeft <= 0) return 0;
            
            return Math.floor(timeLeft / 60000); // minutos
        } catch (error) {
            return 0;
        }
    }

    // ========== FUNCIONES DE ADMIN ==========

    // OBTENER TODOS LOS USUARIOS
    async getAllUsers() {
        try {
            const result = await this.callAPI('get_users');
            return result.users || [];
        } catch (error) {
            console.error('Get users error:', error);
            return [];
        }
    }

    // CREAR NUEVO USUARIO
    async createUser(userData) {
        return await this.callAPI('create_user', userData);
    }

    // FORZAR CIERRE DE SESIÓN
    async forceLogoutUser(username) {
        return await this.callAPI('force_logout', {
            target_username: username
        });
    }

    // OBTENER SESIONES ACTIVAS
    async getActiveSessions() {
        const users = await this.getAllUsers();
        return users.filter(user => user.has_active_session);
    }
}

// Crear instancia global
const SecureAuth = new GoogleSheetsAuth();

// Función para debug
function debugGoogleAuth() {
    console.log('=== DEBUG GOOGLE SHEETS AUTH ===');
    console.log('API URL:', SecureAuth.config.API_URL);
    console.log('Dispositivo:', localStorage.getItem('secure_stream_device'));
    console.log('Sesión:', localStorage.getItem('secure_stream_auth'));
    
    // Probar conexión
    SecureAuth.callAPI('test').then(result => {
        console.log('Conexión API:', result);
    });
}
