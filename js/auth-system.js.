// auth-system.js - Sistema de autenticación profesional
class SecureStreamAuth {
    constructor() {
        this.config = {
            BASE_URL: 'https://nocodb.yourdomain.com', // REEMPLAZAR
            PROJECT_ID: 'p_xxxxxxxxxxxx', // REEMPLAZAR
            API_TOKEN: 'your-nocodb-api-token', // REEMPLAZAR
            STORAGE_KEY: 'secure_stream_auth',
            DEVICE_KEY: 'secure_stream_device',
            TOKEN_KEY: 'secure_stream_token'
        };
        
        // Verificar configuración
        if (this.config.BASE_URL.includes('yourdomain.com')) {
            console.error('⚠️ Configura tu URL de NocoDB en auth-system.js');
        }
    }

    // Generar ID de dispositivo único
    generateDeviceId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 15);
        const userAgent = navigator.userAgent.substring(0, 10);
        return `device_${timestamp}_${random}_${btoa(userAgent).substring(0, 8)}`;
    }

    // Obtener o crear ID de dispositivo
    getDeviceId() {
        let deviceId = localStorage.getItem(this.config.DEVICE_KEY);
        
        if (!deviceId) {
            deviceId = this.generateDeviceId();
            localStorage.setItem(this.config.DEVICE_KEY, deviceId);
            
            // Registrar dispositivo en NocoDB (opcional)
            this.registerDevice(deviceId);
        }
        
        return deviceId;
    }

    // Obtener IP del usuario
    async getUserIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (error) {
            return 'unknown';
        }
    }

    // API Request a NocoDB
    async nocodbRequest(endpoint, method = 'GET', data = null) {
        try {
            const url = `${this.config.BASE_URL}/api/v1/db/data/${this.config.PROJECT_ID}/${endpoint}`;
            
            const headers = {
                'Content-Type': 'application/json',
                'xc-token': this.config.API_TOKEN
            };
            
            const options = {
                method: method,
                headers: headers,
                credentials: 'include'
            };
            
            if (data && (method === 'POST' || method === 'PUT')) {
                options.body = JSON.stringify(data);
            }
            
            const response = await fetch(url, options);
            
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('NocoDB Request Error:', error);
            throw error;
        }
    }

    // Iniciar sesión con verificación de dispositivo único
    async login(username, password) {
        try {
            const deviceId = this.getDeviceId();
            const ipAddress = await this.getUserIP();
            
            // 1. Buscar usuario por username
            const userResponse = await this.nocodbRequest(
                `users?where=(username,eq,${encodeURIComponent(username)})`
            );
            
            if (!userResponse.list || userResponse.list.length === 0) {
                throw new Error('Usuario no encontrado');
            }
            
            const user = userResponse.list[0];
            
            // 2. Verificar contraseña (NocoDB maneja hash automáticamente)
            // En una implementación real, necesitarías una API personalizada para verificar contraseñas
            const verifyResponse = await fetch(`${this.config.BASE_URL}/api/v1/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'xc-token': this.config.API_TOKEN
                },
                body: JSON.stringify({
                    email: user.email,
                    password: password
                })
            });
            
            if (!verifyResponse.ok) {
                throw new Error('Contraseña incorrecta');
            }
            
            // 3. Verificar si ya tiene sesión activa en otro dispositivo
            if (user.current_device && user.current_device !== deviceId) {
                // Buscar sesión activa del usuario
                const activeSessionResponse = await this.nocodbRequest(
                    `sessions?where=(user_id,eq,${user.id})~and(is_active,eq,true)`
                );
                
                if (activeSessionResponse.list && activeSessionResponse.list.length > 0) {
                    const activeSession = activeSessionResponse.list[0];
                    throw new Error(`Sesión activa en otro dispositivo (ID: ${activeSession.device_id.substring(0, 8)}...). Cierra sesión primero.`);
                }
            }
            
            // 4. Generar token de sesión
            const token = `st_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
            
            // 5. Crear nueva sesión en NocoDB
            const sessionData = {
                user_id: user.id,
                device_id: deviceId,
                token: token,
                login_time: new Date().toISOString(),
                last_activity: new Date().toISOString(),
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 horas
                ip_address: ipAddress,
                is_active: true
            };
            
            const sessionResponse = await this.nocodbRequest('sessions', 'POST', sessionData);
            
            // 6. Actualizar usuario con dispositivo actual
            await this.nocodbRequest(`users/${user.id}`, 'PATCH', {
                current_device: deviceId,
                last_login: new Date().toISOString()
            });
            
            // 7. Guardar datos localmente
            const localSession = {
                user: {
                    id: user.id,
                    username: user.username,
                    name: user.name,
                    email: user.email,
                    user_type: user.user_type,
                    status: user.status,
                    max_devices: user.max_devices || 1
                },
                deviceId: deviceId,
                token: token,
                sessionId: sessionResponse.id,
                loginTime: sessionData.login_time
            };
            
            localStorage.setItem(this.config.STORAGE_KEY, JSON.stringify(localSession));
            localStorage.setItem(this.config.TOKEN_KEY, token);
            
            return {
                success: true,
                user: localSession.user,
                token: token,
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

    // Verificar sesión activa
    async verifySession() {
        try {
            const sessionData = JSON.parse(localStorage.getItem(this.config.STORAGE_KEY) || 'null');
            const deviceId = localStorage.getItem(this.config.DEVICE_KEY);
            const token = localStorage.getItem(this.config.TOKEN_KEY);
            
            if (!sessionData || !deviceId || !token) {
                return false;
            }
            
            // Verificar en NocoDB
            const sessionResponse = await this.nocodbRequest(
                `sessions?where=(token,eq,${encodeURIComponent(token)})~and(is_active,eq,true)`
            );
            
            if (!sessionResponse.list || sessionResponse.list.length === 0) {
                this.logout();
                return false;
            }
            
            const dbSession = sessionResponse.list[0];
            
            // Verificar que coincida el dispositivo
            if (dbSession.device_id !== deviceId) {
                this.logout();
                return false;
            }
            
            // Verificar expiración
            const expiresAt = new Date(dbSession.expires_at);
            if (expiresAt < new Date()) {
                this.logout();
                return false;
            }
            
            // Actualizar última actividad
            await this.nocodbRequest(`sessions/${dbSession.id}`, 'PATCH', {
                last_activity: new Date().toISOString()
            });
            
            return true;
            
        } catch (error) {
            console.error('Verify Session Error:', error);
            return false;
        }
    }

    // Obtener usuario actual
    getCurrentUser() {
        const sessionData = JSON.parse(localStorage.getItem(this.config.STORAGE_KEY) || 'null');
        return sessionData ? sessionData.user : null;
    }

    // Obtener stream configurado
    async getCurrentStream() {
        try {
            const response = await this.nocodbRequest('streams?where=(is_active,eq,true)&limit=1');
            
            if (response.list && response.list.length > 0) {
                return response.list[0].url;
            }
            
            return null;
        } catch (error) {
            console.error('Get Stream Error:', error);
            return null;
        }
    }

    // Cerrar sesión
    async logout() {
        try {
            const sessionData = JSON.parse(localStorage.getItem(this.config.STORAGE_KEY) || 'null');
            
            if (sessionData) {
                // Buscar sesión en NocoDB
                const sessionResponse = await this.nocodbRequest(
                    `sessions?where=(token,eq,${encodeURIComponent(sessionData.token)})`
                );
                
                if (sessionResponse.list && sessionResponse.list.length > 0) {
                    // Desactivar sesión en NocoDB
                    await this.nocodbRequest(`sessions/${sessionResponse.list[0].id}`, 'PATCH', {
                        is_active: false,
                        expires_at: new Date().toISOString()
                    });
                    
                    // Actualizar usuario (remover dispositivo)
                    await this.nocodbRequest(`users/${sessionData.user.id}`, 'PATCH', {
                        current_device: null
                    });
                }
            }
        } catch (error) {
            console.error('Logout Error:', error);
        } finally {
            // Limpiar datos locales
            localStorage.removeItem(this.config.STORAGE_KEY);
            localStorage.removeItem(this.config.TOKEN_KEY);
        }
    }

    // Forzar cierre de sesión (admin)
    async forceLogout(userId) {
        try {
            // Desactivar todas las sesiones del usuario
            const sessionsResponse = await this.nocodbRequest(
                `sessions?where=(user_id,eq,${userId})~and(is_active,eq,true)`
            );
            
            if (sessionsResponse.list) {
                for (const session of sessionsResponse.list) {
                    await this.nocodbRequest(`sessions/${session.id}`, 'PATCH', {
                        is_active: false
                    });
                }
            }
            
            // Limpiar dispositivo del usuario
            await this.nocodbRequest(`users/${userId}`, 'PATCH', {
                current_device: null
            });
            
            return true;
        } catch (error) {
            console.error('Force Logout Error:', error);
            throw error;
        }
    }

    // Obtener todas las sesiones activas (admin)
    async getActiveSessions() {
        try {
            const response = await this.nocodbRequest('sessions?where=(is_active,eq,true)');
            
            if (response.list) {
                // Enriquecer con información de usuarios
                const enrichedSessions = [];
                
                for (const session of response.list) {
                    const userResponse = await this.nocodbRequest(`users/${session.user_id}`);
                    
                    enrichedSessions.push({
                        id: session.id,
                        username: userResponse.username,
                        name: userResponse.name,
                        user_type: userResponse.user_type,
                        device_id: session.device_id,
                        login_time: session.login_time,
                        last_activity: session.last_activity,
                        ip_address: session.ip_address
                    });
                }
                
                return enrichedSessions;
            }
            
            return [];
        } catch (error) {
            console.error('Get Active Sessions Error:', error);
            return [];
        }
    }

    // Obtener todos los usuarios (admin)
    async getAllUsers() {
        try {
            const response = await this.nocodbRequest('users');
            return response.list || [];
        } catch (error) {
            console.error('Get Users Error:', error);
            return [];
        }
    }

    // Crear nuevo usuario (admin)
    async createUser(userData) {
        try {
            const response = await this.nocodbRequest('users', 'POST', userData);
            return response;
        } catch (error) {
            console.error('Create User Error:', error);
            throw error;
        }
    }

    // Actualizar usuario (admin)
    async updateUser(userId, userData) {
        try {
            const response = await this.nocodbRequest(`users/${userId}`, 'PATCH', userData);
            return response;
        } catch (error) {
            console.error('Update User Error:', error);
            throw error;
        }
    }
}

// Instancia global
const SecureAuth = new SecureStreamAuth();
