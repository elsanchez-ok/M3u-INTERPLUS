// auth-personal.js - Para cuenta personal de Google
class PersonalGoogleAuth {
    constructor() {
        // PEGA TU URL AQUÍ ↓
        this.config = {
            API_URL: 'https://script.google.com/macros/s/TU_ID_NUEVO/exec',
            STORAGE_KEY: 'secure_stream_auth',
            DEVICE_KEY: 'secure_stream_device'
        };
        
        console.log('✅ PersonalGoogleAuth inicializado');
        console.log('🔗 API URL:', this.config.API_URL);
    }

    generateDeviceId() {
        const agent = navigator.userAgent.substring(0, 20).replace(/\W/g, '_');
        return `dev_${Date.now()}_${Math.random().toString(36).substr(2, 6)}_${agent}`;
    }

    getDeviceId() {
        let deviceId = localStorage.getItem(this.config.DEVICE_KEY);
        if (!deviceId) {
            deviceId = this.generateDeviceId();
            localStorage.setItem(this.config.DEVICE_KEY, deviceId);
        }
        return deviceId;
    }

    // Método PRINCIPAL para llamar al API
    async callAPI(action, data = {}) {
        try {
            console.log(`📤 ${action}:`, data);
            
            // Usar POST para enviar datos (más seguro)
            const response = await fetch(this.config.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: action,
                    ...data,
                    timestamp: Date.now()
                })
            });
            
            const result = await response.json();
            console.log(`📥 ${action} result:`, result);
            
            return result;
            
        } catch (error) {
            console.error(`❌ ${action} error:`, error);
            
            // Intentar con GET si POST falla
            return await this.callAPIWithGet(action, data);
        }
    }

    // Método alternativo con GET (JSONP)
    async callAPIWithGet(action, data) {
        return new Promise((resolve) => {
            const callbackName = 'cb_' + Date.now();
            
            // Construir URL
            const params = new URLSearchParams();
            params.append('action', action);
            params.append('callback', callbackName);
            
            Object.keys(data).forEach(key => {
                params.append(key, data[key]);
            });
            
            const url = `${this.config.API_URL}?${params}`;
            console.log('🔄 Intentando GET:', url.substring(0, 100) + '...');
            
            // Callback
            window[callbackName] = (response) => {
                console.log('📥 GET response:', response);
                resolve(response);
                delete window[callbackName];
            };
            
            // Script
            const script = document.createElement('script');
            script.src = url;
            script.onerror = () => {
                resolve({ success: false, error: 'Error de conexión' });
                delete window[callbackName];
            };
            
            document.head.appendChild(script);
            
            setTimeout(() => {
                if (window[callbackName]) {
                    resolve({ success: false, error: 'Timeout' });
                    delete window[callbackName];
                }
            }, 10000);
        });
    }

    async login(username, password) {
        const deviceId = this.getDeviceId();
        
        console.log(`🔐 Login: ${username} desde ${deviceId}`);
        
        const result = await this.callAPI('login', {
            username: username,
            password: password,
            deviceId: deviceId
        });
        
        if (result.success) {
            // Guardar sesión local
            const sessionData = {
                user: result.user,
                deviceId: deviceId,
                loginTime: new Date().toISOString(),
                expiresAt: result.expires_at || (Date.now() + (60 * 60000))
            };
            
            localStorage.setItem(this.config.STORAGE_KEY, JSON.stringify(sessionData));
            
            console.log('✅ Sesión guardada para:', username);
        }
        
        return result;
    }

    async verifySession() {
        try {
            const session = JSON.parse(localStorage.getItem(this.config.STORAGE_KEY) || 'null');
            
            if (!session) return false;
            
            // Verificar expiración local
            if (session.expiresAt && session.expiresAt < Date.now()) {
                await this.logout();
                return false;
            }
            
            return true;
            
        } catch (error) {
            return false;
        }
    }

    getCurrentUser() {
        const session = JSON.parse(localStorage.getItem(this.config.STORAGE_KEY) || 'null');
        return session ? session.user : null;
    }

    async logout() {
        const user = this.getCurrentUser();
        if (user) {
            await this.callAPI('logout', { username: user.username });
        }
        localStorage.removeItem(this.config.STORAGE_KEY);
    }

    getSessionTimeLeft() {
        const session = JSON.parse(localStorage.getItem(this.config.STORAGE_KEY) || 'null');
        if (!session || !session.expiresAt) return 0;
        
        const timeLeft = session.expiresAt - Date.now();
        return timeLeft > 0 ? Math.floor(timeLeft / 60000) : 0;
    }

    // Funciones de admin
    async getAllUsers() {
        const result = await this.callAPI('get_users');
        return result.users || [];
    }

    async createUser(userData) {
        return await this.callAPI('create_user', userData);
    }

    async forceLogoutUser(username) {
        return await this.callAPI('force_logout', { username: username });
    }
}

const SecureAuth = new PersonalGoogleAuth();

// Debug
window.debugPersonal = function() {
    console.log('=== DEBUG PERSONAL ===');
    console.log('API URL:', SecureAuth.config.API_URL);
    console.log('Device:', localStorage.getItem('secure_stream_device'));
    console.log('Session:', localStorage.getItem('secure_stream_auth'));
};
