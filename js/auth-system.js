// auth-system.js - Sistema de autenticación profesional para GitHub Pages
class SecureStreamAuth {
    constructor() {
        this.config = {
            STORAGE_KEY: 'secure_stream_auth',
            DEVICE_KEY: 'secure_stream_device',
            TOKEN_KEY: 'secure_stream_token',
            SESSIONS_KEY: 'active_sessions'
        };
        
        // Base de datos local para demo
        this.localDB = {
            users: [
                {
                    id: 1,
                    username: 'admin',
                    password: 'admin123',
                    name: 'Administrador',
                    email: 'admin@stream.com',
                    user_type: 'admin',
                    status: 'active',
                    max_devices: 1,
                    current_device: null,
                    last_login: null
                }
            ],
            streams: [
                {
                    id: 1,
                    name: 'Stream Principal',
                    url: 'https://rst.cyphn.site/memfs/366c450b-a9f7-40c8-92df-f398d8cb693c.m3u8',
                    is_active: true
                }
            ]
        };
    }

    // Generar ID de dispositivo único
    generateDeviceId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 15);
        return `device_${timestamp}_${random}`;
    }

    // Obtener o crear ID de dispositivo
    getDeviceId() {
        let deviceId = localStorage.getItem(this.config.DEVICE_KEY);
        
        if (!deviceId) {
            deviceId = this.generateDeviceId();
            localStorage.setItem(this.config.DEVICE_KEY, deviceId);
        }
        
        return deviceId;
    }

    // Verificar si usuario ya tiene sesión activa
    checkExistingSession(username, currentDeviceId) {
        const sessions = JSON.parse(localStorage.getItem(this.config.SESSIONS_KEY) || '{}');
        const userSession = sessions[username];
        
        if (userSession && userSession.deviceId !== currentDeviceId) {
            return {
                hasActiveSession: true,
                session: userSession
            };
        }
        
        return { hasActiveSession: false };
    }

    // Iniciar sesión
    async login(username, password) {
        try {
            const deviceId = this.getDeviceId();
            
            // Verificar sesión existente
            const existingSession = this.checkExistingSession(username, deviceId);
            if (existingSession.hasActiveSession) {
                throw new Error('Sesión activa en otro dispositivo. Cierra sesión primero.');
            }
            
            // Buscar usuario
            const user = this.localDB.users.find(u => 
                u.username === username && u.password === password
            );
            
            if (!user) {
                throw new Error('Usuario o contraseña incorrectos');
            }
            
            if (user.status !== 'active') {
                throw new Error('Cuenta desactivada');
            }
            
            // Verificar dispositivo
            if (user.current_device && user.current_device !== deviceId) {
                throw new Error('Solo puedes tener una sesión activa a la vez');
            }
            
            // Actualizar información
            user.current_device = deviceId;
            user.last_login = new Date().toISOString();
            
            // Crear sesión
            const sessionData = {
                user: {
                    id: user.id,
                    username: user.username,
                    name: user.name,
                    email: user.email,
                    user_type: user.user_type,
                    status: user.status,
                    max_devices: user.max_devices
                },
                deviceId: deviceId,
                loginTime: new Date().toISOString(),
                token: 'token_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
            };
            
            // Guardar datos
            localStorage.setItem(this.config.STORAGE_KEY, JSON.stringify(sessionData));
            localStorage.setItem(this.config.TOKEN_KEY, sessionData.token);
            
            // Registrar sesión activa
            const activeSessions = JSON.parse(localStorage.getItem(this.config.SESSIONS_KEY) || '{}');
            activeSessions[username] = {
                deviceId: deviceId,
                loginTime: sessionData.loginTime
            };
            localStorage.setItem(this.config.SESSIONS_KEY, JSON.stringify(activeSessions));
            
            return {
                success: true,
                user: sessionData.user,
                token: sessionData.token,
                deviceId: deviceId
            };
            
        } catch (error) {
            console.error('Login Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Verificar sesión
    async verifySession() {
        try {
            const sessionData = JSON.parse(localStorage.getItem(this.config.STORAGE_KEY) || 'null');
            const deviceId = localStorage.getItem(this.config.DEVICE_KEY);
            
            if (!sessionData || !deviceId) {
                return false;
            }
            
            // Verificar dispositivo
            if (sessionData.deviceId !== deviceId) {
                this.logout();
                return false;
            }
            
            // Verificar sesión activa
            const activeSessions = JSON.parse(localStorage.getItem(this.config.SESSIONS_KEY) || '{}');
            const userSession = activeSessions[sessionData.user.username];
            
            if (!userSession || userSession.deviceId !== deviceId) {
                this.logout();
                return false;
            }
            
            return true;
            
        } catch (error) {
            return false;
        }
    }

    // Obtener usuario actual
    getCurrentUser() {
        const sessionData = JSON.parse(localStorage.getItem(this.config.STORAGE_KEY) || 'null');
        return sessionData ? sessionData.user : null;
    }

    // Obtener stream
    async getCurrentStream() {
        try {
            const stream = this.localDB.streams.find(s => s.is_active);
            return stream ? stream.url : null;
        } catch (error) {
            return null;
        }
    }

    // Cerrar sesión
    async logout() {
        try {
            const user = this.getCurrentUser();
            const deviceId = localStorage.getItem(this.config.DEVICE_KEY);
            
            if (user) {
                // Remover de sesiones activas
                const activeSessions = JSON.parse(localStorage.getItem(this.config.SESSIONS_KEY) || '{}');
                delete activeSessions[user.username];
                localStorage.setItem(this.config.SESSIONS_KEY, JSON.stringify(activeSessions));
            }
        } catch (error) {
            console.error('Logout Error:', error);
        } finally {
            // Limpiar datos locales
            localStorage.removeItem(this.config.STORAGE_KEY);
            localStorage.removeItem(this.config.TOKEN_KEY);
        }
    }
}

// Instancia global
const SecureAuth = new SecureStreamAuth();
