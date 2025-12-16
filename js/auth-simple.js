// auth-simple.js - Sistema SUPER SIMPLE con PIN compartido
class SimpleAuthSystem {
    constructor() {
        this.config = {
            STORAGE_KEY: 'secure_stream_auth',
            DEVICE_KEY: 'secure_stream_device',
            PIN_KEY: 'current_pin',
            PIN_EXPIRES_KEY: 'pin_expires',
            SESSION_TIMEOUT: 60 // minutos
        };
        
        // PIN FIJO que TODOS los dispositivos deben conocer
        // ¡CAMBIA ESTE PIN!
        this.MASTER_PIN = '1234';
        
        // Base de datos LOCAL (en cada dispositivo)
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
                    pin: this.MASTER_PIN // Todos tienen el mismo PIN
                },
                {
                    id: 2,
                    username: 'usuario',
                    password: 'user123',
                    name: 'Usuario Normal',
                    email: 'usuario@stream.com',
                    user_type: 'user',
                    status: 'active',
                    pin: this.MASTER_PIN
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

    // Generar ID de dispositivo
    generateDeviceId() {
        return 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    }

    getDeviceId() {
        let deviceId = localStorage.getItem(this.config.DEVICE_KEY);
        if (!deviceId) {
            deviceId = this.generateDeviceId();
            localStorage.setItem(this.config.DEVICE_KEY, deviceId);
        }
        return deviceId;
    }

    // Generar PIN temporal (expira en 10 minutos)
    generateTempPin() {
        const pin = Math.floor(1000 + Math.random() * 9000); // 1000-9999
        const expiresAt = Date.now() + (10 * 60000); // 10 minutos
        
        localStorage.setItem(this.config.PIN_KEY, pin.toString());
        localStorage.setItem(this.config.PIN_EXPIRES_KEY, expiresAt.toString());
        
        return pin;
    }

    // Verificar PIN
    verifyPin(inputPin) {
        const savedPin = localStorage.getItem(this.config.PIN_KEY);
        const expiresAt = localStorage.getItem(this.config.PIN_EXPIRES_KEY);
        
        if (!savedPin || !expiresAt) {
            return false;
        }
        
        if (Date.now() > parseInt(expiresAt)) {
            // PIN expirado
            localStorage.removeItem(this.config.PIN_KEY);
            localStorage.removeItem(this.config.PIN_EXPIRES_KEY);
            return false;
        }
        
        return inputPin === savedPin || inputPin === this.MASTER_PIN;
    }

    // INICIAR SESIÓN SUPER SIMPLE
    async login(username, password) {
        try {
            const deviceId = this.getDeviceId();
            
            console.log(`Login intentado: ${username} desde ${deviceId}`);
            
            // 1. Buscar usuario
            const user = this.localDB.users.find(u => 
                u.username === username && u.password === password
            );
            
            if (!user) {
                throw new Error('❌ Usuario o contraseña incorrectos');
            }
            
            if (user.status !== 'active') {
                throw new Error('❌ Cuenta desactivada');
            }
            
            // 2. Mostrar diálogo para ingresar PIN
            // (En la práctica, esto se haría en el HTML)
            // Por ahora simulamos que siempre pasa
            const pinRequired = true;
            
            if (pinRequired) {
                // En la implementación real, esto vendría de un input en HTML
                // Por ahora, asumimos que el PIN es correcto
                const pinIsValid = true; // Cambiar por verificación real
                
                if (!pinIsValid) {
                    throw new Error('❌ PIN incorrecto o expirado');
                }
            }
            
            // 3. Calcular expiración
            const now = new Date();
            const expiresAt = new Date(now.getTime() + (this.config.SESSION_TIMEOUT * 60000));
            
            // 4. Crear sesión
            const sessionData = {
                user: {
                    id: user.id,
                    username: user.username,
                    name: user.name,
                    email: user.email,
                    user_type: user.user_type,
                    status: user.status
                },
                deviceId: deviceId,
                loginTime: now.toISOString(),
                expiresAt: expiresAt.getTime(),
                pinUsed: true
            };
            
            // 5. Guardar localmente
            localStorage.setItem(this.config.STORAGE_KEY, JSON.stringify(sessionData));
            
            console.log(`✅ Login exitoso para ${username}`);
            
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

    // VERIFICAR SESIÓN (solo local)
    async verifySession() {
        try {
            const sessionData = JSON.parse(localStorage.getItem(this.config.STORAGE_KEY) || 'null');
            const deviceId = localStorage.getItem(this.config.DEVICE_KEY);
            
            if (!sessionData || !deviceId) {
                return false;
            }
            
            // Verificar dispositivo
            if (sessionData.deviceId !== deviceId) {
                await this.logout();
                return false;
            }
            
            // Verificar expiración
            if (sessionData.expiresAt && sessionData.expiresAt < Date.now()) {
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

    // Obtener tiempo restante
    getSessionTimeLeft() {
        try {
            const sessionData = JSON.parse(localStorage.getItem(this.config.STORAGE_KEY) || 'null');
            if (!sessionData || !sessionData.expiresAt) return 0;
            
            const now = Date.now();
            const timeLeft = sessionData.expiresAt - now;
            
            if (timeLeft <= 0) return 0;
            
            return Math.floor(timeLeft / 60000);
        } catch (error) {
            return 0;
        }
    }

    // CERRAR SESIÓN
    async logout() {
        try {
            // Solo limpia local, no afecta a otros dispositivos
            localStorage.removeItem(this.config.STORAGE_KEY);
            console.log('✅ Sesión cerrada localmente');
        } catch (error) {
            console.error('Logout Error:', error);
        }
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
}

// Instancia global
const SecureAuth = new SimpleAuthSystem();

// Función para debug
function debugSimple() {
    console.log('=== DEBUG SIMPLE ===');
    console.log('Dispositivo:', localStorage.getItem('secure_stream_device'));
    console.log('Sesión:', localStorage.getItem('secure_stream_auth'));
    console.log('PIN actual:', localStorage.getItem('current_pin'));
}
