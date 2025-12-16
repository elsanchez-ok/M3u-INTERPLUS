// auth-system.js - Sistema de sesión única CON bloqueo real
class SecureStreamAuth {
    constructor() {
        this.config = {
            STORAGE_KEY: 'secure_stream_auth',
            DEVICE_KEY: 'secure_stream_device',
            SESSIONS_KEY: 'active_sessions',
            SESSION_TIMEOUT: 60 // minutos
        };
        
        // Base de datos LOCAL
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
                    last_login: null,
                    session_expires: null // Nuevo campo: cuándo expira la sesión
                },
                {
                    id: 2,
                    username: 'usuario',
                    password: 'user123',
                    name: 'Usuario Normal',
                    email: 'usuario@stream.com',
                    user_type: 'user',
                    status: 'active',
                    max_devices: 1,
                    current_device: null,
                    last_login: null,
                    session_expires: null
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
        const random = Math.random().toString(36).substr(2, 9);
        return `device_${timestamp}_${random}`;
    }

    getDeviceId() {
        let deviceId = localStorage.getItem(this.config.DEVICE_KEY);
        if (!deviceId) {
            deviceId = this.generateDeviceId();
            localStorage.setItem(this.config.DEVICE_KEY, deviceId);
        }
        return deviceId;
    }

    // VERIFICAR Y LIMPIAR SESIONES CADUCADAS
    async checkAndCleanSessions() {
        const activeSessions = JSON.parse(localStorage.getItem(this.config.SESSIONS_KEY) || '{}');
        const now = new Date().getTime();
        let changed = false;
        
        // Verificar cada sesión
        for (const [username, sessionData] of Object.entries(activeSessions)) {
            // Si la sesión expiró, eliminarla
            if (sessionData.expiresAt && sessionData.expiresAt < now) {
                console.log(`Sesión expirada para ${username}`);
                delete activeSessions[username];
                changed = true;
                
                // También limpiar current_device del usuario
                const user = this.localDB.users.find(u => u.username === username);
                if (user) {
                    user.current_device = null;
                    user.session_expires = null;
                }
            }
        }
        
        if (changed) {
            localStorage.setItem(this.config.SESSIONS_KEY, JSON.stringify(activeSessions));
        }
        
        return activeSessions;
    }

    // VERIFICAR SESIÓN EXISTENTE (BLOQUEO REAL)
    async checkExistingSession(username, currentDeviceId) {
        // Primero limpiar sesiones caducadas
        const activeSessions = await this.checkAndCleanSessions();
        const userSession = activeSessions[username];
        
        if (userSession) {
            // Si es el MISMO dispositivo, permitir reconectar
            if (userSession.deviceId === currentDeviceId) {
                // Verificar si la sesión sigue activa
                if (userSession.expiresAt && userSession.expiresAt < new Date().getTime()) {
                    // Sesión expirada, permitir nuevo login
                    delete activeSessions[username];
                    localStorage.setItem(this.config.SESSIONS_KEY, JSON.stringify(activeSessions));
                    return { hasActiveSession: false };
                }
                return { hasActiveSession: false }; // Mismo dispositivo, permitir
            }
            
            // Si es DIFERENTE dispositivo, BLOQUEAR
            const timeLeft = Math.floor((userSession.expiresAt - new Date().getTime()) / 60000);
            return {
                hasActiveSession: true,
                session: userSession,
                message: `🔒 Sesión activa en otro dispositivo. 
                Tiempo restante: ${timeLeft} minutos.
                Espera o cierra sesión manualmente.`
            };
        }
        
        return { hasActiveSession: false };
    }

    // INICIAR SESIÓN CON BLOQUEO REAL
    async login(username, password) {
        try {
            const deviceId = this.getDeviceId();
            
            // 1. Verificar sesión existente (con bloqueo real)
            const existingSession = await this.checkExistingSession(username, deviceId);
            if (existingSession.hasActiveSession) {
                throw new Error(existingSession.message);
            }
            
            // 2. Buscar usuario
            const user = this.localDB.users.find(u => 
                u.username === username && u.password === password
            );
            
            if (!user) {
                throw new Error('❌ Usuario o contraseña incorrectos');
            }
            
            if (user.status !== 'active') {
                throw new Error('❌ Esta cuenta está desactivada');
            }
            
            // 3. Calcular tiempo de expiración (60 minutos)
            const now = new Date();
            const expiresAt = new Date(now.getTime() + (this.config.SESSION_TIMEOUT * 60000));
            
            // 4. Actualizar usuario
            user.current_device = deviceId;
            user.last_login = now.toISOString();
            user.session_expires = expiresAt.toISOString();
            
            // 5. Crear sesión con tiempo de expiración
            const sessionData = {
                user: {
                    id: user.id,
                    username: user.username,
                    name: user.name,
                    email: user.email,
                    user_type: user.user_type,
                    status: user.status,
                    max_devices: user.max_devices,
                    session_expires: user.session_expires
                },
                deviceId: deviceId,
                loginTime: now.toISOString(),
                expiresAt: expiresAt.getTime(), // Timestamp para fácil comparación
                token: 'local_token_' + Date.now()
            };
            
            // 6. Guardar en localStorage
            localStorage.setItem(this.config.STORAGE_KEY, JSON.stringify(sessionData));
            
            // 7. Registrar sesión activa (con expiración)
            const activeSessions = JSON.parse(localStorage.getItem(this.config.SESSIONS_KEY) || '{}');
            activeSessions[username] = {
                deviceId: deviceId,
                loginTime: sessionData.loginTime,
                expiresAt: expiresAt.getTime()
            };
            localStorage.setItem(this.config.SESSIONS_KEY, JSON.stringify(activeSessions));
            
            console.log(`✅ Login exitoso para ${username} - Expira: ${expiresAt.toLocaleTimeString()}`);
            
            return {
                success: true,
                user: sessionData.user,
                deviceId: deviceId,
                expiresAt: expiresAt
            };
            
        } catch (error) {
            console.error('Login Error:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // VERIFICAR SESIÓN (con expiración)
    async verifySession() {
        try {
            const sessionData = JSON.parse(localStorage.getItem(this.config.STORAGE_KEY) || 'null');
            const deviceId = localStorage.getItem(this.config.DEVICE_KEY);
            
            if (!sessionData || !deviceId) {
                return false;
            }
            
            // Verificar dispositivo
            if (sessionData.deviceId !== deviceId) {
                console.log('❌ Dispositivo no coincide');
                await this.logout();
                return false;
            }
            
            // Verificar expiración
            if (sessionData.expiresAt && sessionData.expiresAt < new Date().getTime()) {
                console.log('❌ Sesión expirada');
                await this.logout();
                return false;
            }
            
            // Verificar en sesiones activas
            const activeSessions = JSON.parse(localStorage.getItem(this.config.SESSIONS_KEY) || '{}');
            const userSession = activeSessions[sessionData.user.username];
            
            if (!userSession || userSession.deviceId !== deviceId) {
                console.log('❌ Sesión no encontrada en activas');
                await this.logout();
                return false;
            }
            
            // Verificar expiración en sesiones activas
            if (userSession.expiresAt && userSession.expiresAt < new Date().getTime()) {
                console.log('❌ Sesión expirada en activas');
                await this.logout();
                return false;
            }
            
            return true;
            
        } catch (error) {
            console.error('Verify Session Error:', error);
            return false;
        }
    }

    // Obtener tiempo restante de sesión
    getSessionTimeLeft() {
        try {
            const sessionData = JSON.parse(localStorage.getItem(this.config.STORAGE_KEY) || 'null');
            if (!sessionData || !sessionData.expiresAt) return 0;
            
            const now = new Date().getTime();
            const timeLeft = sessionData.expiresAt - now;
            
            if (timeLeft <= 0) return 0;
            
            return Math.floor(timeLeft / 60000); // minutos
        } catch (error) {
            return 0;
        }
    }

    // Forzar cierre de sesión (para admin)
    async forceLogoutUser(username) {
        try {
            const activeSessions = JSON.parse(localStorage.getItem(this.config.SESSIONS_KEY) || '{}');
            
            if (activeSessions[username]) {
                delete activeSessions[username];
                localStorage.setItem(this.config.SESSIONS_KEY, JSON.stringify(activeSessions));
                
                // Limpiar current_device del usuario
                const user = this.localDB.users.find(u => u.username === username);
                if (user) {
                    user.current_device = null;
                    user.session_expires = null;
                }
                
                console.log(`✅ Sesión forzada cerrada para: ${username}`);
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Force Logout Error:', error);
            return false;
        }
    }

    // CERRAR SESIÓN
    async logout() {
        try {
            const user = this.getCurrentUser();
            
            if (user) {
                // Eliminar de sesiones activas
                const activeSessions = JSON.parse(localStorage.getItem(this.config.SESSIONS_KEY) || '{}');
                delete activeSessions[user.username];
                localStorage.setItem(this.config.SESSIONS_KEY, JSON.stringify(activeSessions));
                
                // Limpiar current_device
                const dbUser = this.localDB.users.find(u => u.username === user.username);
                if (dbUser) {
                    dbUser.current_device = null;
                    dbUser.session_expires = null;
                }
            }
        } catch (error) {
            console.error('Logout Error:', error);
        } finally {
            // Limpiar datos locales
            localStorage.removeItem(this.config.STORAGE_KEY);
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

    // Obtener todas las sesiones activas (para admin)
    async getActiveSessions() {
        try {
            await this.checkAndCleanSessions(); // Limpiar expiradas primero
            const activeSessions = JSON.parse(localStorage.getItem(this.config.SESSIONS_KEY) || '{}');
            
            const sessions = [];
            for (const [username, data] of Object.entries(activeSessions)) {
                const user = this.localDB.users.find(u => u.username === username);
                if (user) {
                    const timeLeft = Math.floor((data.expiresAt - new Date().getTime()) / 60000);
                    sessions.push({
                        username: username,
                        name: user.name,
                        deviceId: data.deviceId,
                        loginTime: data.loginTime,
                        expiresAt: data.expiresAt,
                        timeLeft: timeLeft > 0 ? timeLeft : 0,
                        user_type: user.user_type
                    });
                }
            }
            
            return sessions;
        } catch (error) {
            console.error('Get Active Sessions Error:', error);
            return [];
        }
    }
}

// Instancia global
const SecureAuth = new SecureStreamAuth();

// Función DEBUG
function debugSessions() {
    console.log('=== DEBUG SESIONES ===');
    const sessions = JSON.parse(localStorage.getItem('active_sessions') || '{}');
    console.log('Sesiones activas:', sessions);
    console.log('Mi sesión:', localStorage.getItem('secure_stream_auth'));
    console.log('Mi dispositivo:', localStorage.getItem('secure_stream_device'));
}
