// auth-no-pin.js - Sistema SIN PIN
class NoPinAuth {
    constructor() {
        this.config = {
            SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxocLXjNoaRscKOteVm_OsPTdk4LdnU_JtuRffGZSoy6XaDOZVG4giJ3d7FyAwk_tYVjQ/exec',
            STORAGE_KEY: 'secure_stream_auth',
            DEVICE_KEY: 'secure_stream_device'
        };
    }

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

    // Usar JSONP para evitar CORS
    async callGoogleScript(action, data) {
        return new Promise((resolve) => {
            const callbackName = 'callback_' + Date.now();
            const params = new URLSearchParams({
                action: action,
                callback: callbackName,
                ...data
            });
            
            const url = `${this.config.SCRIPT_URL}?${params}`;
            
            window[callbackName] = (response) => {
                resolve(response);
                delete window[callbackName];
            };
            
            const script = document.createElement('script');
            script.src = url;
            script.onerror = () => {
                resolve({ success: false, error: 'Error de conexión' });
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
        try {
            const deviceId = this.getDeviceId();
            
            console.log(`📤 Login: ${username} desde ${deviceId}`);
            
            const result = await this.callGoogleScript('login', {
                username: username,
                password: password,
                deviceId: deviceId
            });
            
            console.log('📥 Respuesta:', result);
            
            if (result.success) {
                // Guardar sesión local
                const sessionData = {
                    user: result.user,
                    deviceId: deviceId,
                    loginTime: new Date().toISOString(),
                    expiresAt: result.expires_at || (Date.now() + (60 * 60000))
                };
                
                localStorage.setItem(this.config.STORAGE_KEY, JSON.stringify(sessionData));
            }
            
            return result;
            
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: 'Error en login' };
        }
    }

    async verifySession() {
        try {
            const sessionData = JSON.parse(localStorage.getItem(this.config.STORAGE_KEY) || 'null');
            
            if (!sessionData) return false;
            
            // Verificar expiración local
            if (sessionData.expiresAt && sessionData.expiresAt < Date.now()) {
                await this.logout();
                return false;
            }
            
            return true;
            
        } catch (error) {
            return false;
        }
    }

    getCurrentUser() {
        const sessionData = JSON.parse(localStorage.getItem(this.config.STORAGE_KEY) || 'null');
        return sessionData ? sessionData.user : null;
    }

    async logout() {
        const user = this.getCurrentUser();
        if (user) {
            await this.callGoogleScript('logout', { username: user.username });
        }
        localStorage.removeItem(this.config.STORAGE_KEY);
    }

    getSessionTimeLeft() {
        const sessionData = JSON.parse(localStorage.getItem(this.config.STORAGE_KEY) || 'null');
        if (!sessionData || !sessionData.expiresAt) return 0;
        
        const timeLeft = sessionData.expiresAt - Date.now();
        return timeLeft > 0 ? Math.floor(timeLeft / 60000) : 0;
    }
}

const SecureAuth = new NoPinAuth();
