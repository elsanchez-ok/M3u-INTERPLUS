// auth-system.js - Versión SIMPLIFICADA para GitHub Pages
class SecureStreamAuth {
    constructor() {
        // Configuración básica
        this.config = {
            STORAGE_KEY: 'secure_stream_auth',
            DEVICE_KEY: 'secure_stream_device',
            SESSIONS_KEY: 'active_sessions'
        };
        
        // Base de datos LOCAL (en el navegador del usuario)
        // ¡CAMBIA ESTAS CONTRASEÑAS!
        this.localDB = {
            users: [
                {
                    id: 1,
                    username: 'admin',
                    password: 'admin123', // Cambia esto
                    name: 'Administrador',
                    email: 'admin@stream.com',
                    user_type: 'admin',
                    status: 'active',
                    max_devices: 1,
                    current_device: null
                },
                {
                    id: 2,
                    username: 'usuario',
                    password: 'user123', // Cambia esto
                    name: 'Usuario Normal',
                    email: 'usuario@stream.com',
                    user_type: 'user',
                    status: 'active',
                    max_devices: 1,
                    current_device: null
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

    // Generar ID único para el dispositivo
    generateDeviceId() {
        return 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    getDeviceId() {
        let deviceId = localStorage.getItem(this.config.DEVICE_KEY);
        if (!deviceId) {
            deviceId = this.generateDeviceId();
            localStorage.setItem(this.config.DEVICE_KEY, deviceId);
        }
        return deviceId;
    }

    // Verificar si ya hay sesión activa
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

    // INICIAR SESIÓN (versión local)
    async login(username, password) {
        try {
            const deviceId = this.getDeviceId();
            
            // 1. Verificar si ya está logeado en otro dispositivo
            const existingSession = this.checkExistingSession(username, deviceId);
            if (existingSession.hasActiveSession) {
                throw new Error('⚠️ Ya tienes una sesión activa en otro dispositivo. Cierra sesión primero.');
            }
            
            // 2. Buscar usuario en la base LOCAL
            const user = this.localDB.users.find(u => 
                u.username === username && u.password === password
            );
            
            if (!user) {
                throw new Error('❌ Usuario o contraseña incorrectos');
            }
            
            // 3. Verificar que la cuenta esté activa
            if (user.status !== 'active') {
                throw new Error('❌ Esta cuenta está desactivada');
            }
            
            // 4. Verificar dispositivo (solo 1 sesión)
            if (user.current_device && user.current_device !== deviceId) {
                throw new Error('❌ Solo puedes tener UNA sesión activa a la vez');
            }
            
            // 5. Actualizar información del usuario
            user.current_device = deviceId;
            user.last_login = new Date().toISOString();
            
            // 6. Crear la sesión
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
                token: 'local_token_' + Date.now()
            };
            
            // 7. Guardar en el navegador del usuario
            localStorage.setItem(this.config.STORAGE_KEY, JSON.stringify(sessionData));
            
            // 8. Registrar sesión activa
            const activeSessions = JSON.parse(localStorage.getItem(this.config.SESSIONS_KEY) || '{}');
            activeSessions[username] = {
                deviceId: deviceId,
                loginTime: sessionData.loginTime
            };
            localStorage.setItem(this.config.SESSIONS_KEY, JSON.stringify(activeSessions));
            
            return {
                success: true,
                user: sessionData.user,
                deviceId: deviceId
            };
            
        } catch (error) {
            console.error('Error en login:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Verificar si hay sesión activa
    async verifySession() {
        try {
            const sessionData = JSON.parse(localStorage.getItem(this.config.STORAGE_KEY) || 'null');
            const deviceId = localStorage.getItem(this.config.DEVICE_KEY);
            
            if (!sessionData || !deviceId) {
                return false;
            }
            
            // Verificar que el dispositivo sea el mismo
            if (sessionData.deviceId !== deviceId) {
                await this.logout();
                return false;
            }
            
            // Verificar sesiones activas
            const activeSessions = JSON.parse(localStorage.getItem(this.config.SESSIONS_KEY) || '{}');
            const userSession = activeSessions[sessionData.user.username];
            
            if (!userSession || userSession.deviceId !== deviceId) {
                await this.logout();
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

    // Obtener el stream
    async getCurrentStream() {
        try {
            const stream = this.localDB.streams.find(s => s.is_active);
            return stream ? stream.url : null;
        } catch (error) {
            return null;
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
            }
        } catch (error) {
            console.error('Error en logout:', error);
        } finally {
            // Limpiar todo
            localStorage.removeItem(this.config.STORAGE_KEY);
        }
    }

    // OPCIONAL: Agregar más usuarios (para admin)
    async createUser(userData) {
        try {
            // Verificar que el usuario no exista
            const existingUser = this.localDB.users.find(u => u.username === userData.username);
            if (existingUser) {
                throw new Error('El usuario ya existe');
            }
            
            const newUser = {
                id: this.localDB.users.length + 1,
                ...userData,
                status: 'active',
                current_device: null,
                max_devices: 1
            };
            
            this.localDB.users.push(newUser);
            return { success: true, user: newUser };
            
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

// Crear la instancia global
const SecureAuth = new SecureStreamAuth();

// Función para DEBUG (opcional)
function debugAuth() {
    console.log('=== DEBUG SISTEMA ===');
    console.log('Dispositivo:', localStorage.getItem('secure_stream_device'));
    console.log('Sesión:', localStorage.getItem('secure_stream_auth'));
    console.log('Sesiones activas:', localStorage.getItem('active_sessions'));
}
