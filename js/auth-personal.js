// AUTH-PERSONAL.JS - VERSIÓN CON GOOGLE SHEETS
class GoogleSheetsAuth {
    constructor() {
        this.STORAGE_KEY = 'iptv_auth_session';
        this.GOOGLE_SHEETS_API = 'https://script.google.com/macros/s/AKfycbwYOUR_APPS_SCRIPT_ID/exec';
        this.cachedUsers = null;
        this.lastFetch = null;
        this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
        
        console.log('🔧 Auth Google Sheets activado');
        this.initialize();
    }
    
    async initialize() {
        // Intentar restaurar sesión previa
        const session = this.getSession();
        if (session && this.isSessionValid(session)) {
            console.log('🔄 Sesión restaurada:', session.user.username);
        }
    }
    
    // ===================== FUNCIONES PRINCIPALES =====================
    
    async login(username, password) {
        console.log('🔐 Intentando login:', username);
        
        try {
            // 1. Verificar si tenemos usuarios en caché
            let users = await this.getUsers();
            
            // 2. Buscar usuario
            const user = users.find(u => 
                u.username === username && u.password === password
            );
            
            if (!user) {
                console.warn('❌ Usuario o contraseña incorrectos');
                return {
                    success: false,
                    error: 'Credenciales incorrectas'
                };
            }
            
            // 3. Verificar estado
            if (user.status !== 'active') {
                return {
                    success: false,
                    error: 'Usuario inactivo'
                };
            }
            
            // 4. Crear sesión
            const session = {
                user: {
                    username: user.username,
                    name: user.name,
                    user_type: user.user_type,
                    status: user.status,
                    max_devices: user.max_devices,
                    last_login: new Date().toISOString(),
                    device_id: user.device_id || this.generateDeviceId()
                },
                loginTime: new Date().toISOString(),
                expiresAt: Date.now() + (24 * 60 * 60000), // 24 horas
                token: this.generateToken(username)
            };
            
            // 5. Guardar sesión
            this.saveSession(session);
            
            // 6. Opcional: Actualizar último login en Google Sheets
            this.updateLastLogin(username);
            
            console.log('✅ Login exitoso:', username);
            
            return {
                success: true,
                user: session.user,
                token: session.token,
                message: `¡Bienvenido ${session.user.name}!`
            };
            
        } catch (error) {
            console.error('🚨 Error en login:', error);
            
            // Fallback a usuarios locales si Google Sheets falla
            return await this.localLogin(username, password);
        }
    }
    
    async register(username, password, name, user_type = 'user') {
        console.log('📝 Registrando nuevo usuario:', username);
        
        try {
            // Verificar si el usuario ya existe
            const users = await this.getUsers();
            const exists = users.find(u => u.username === username);
            
            if (exists) {
                return {
                    success: false,
                    error: 'El usuario ya existe'
                };
            }
            
            // Crear nuevo usuario (aquí deberías implementar la API para agregar a Google Sheets)
            const newUser = {
                username: username,
                password: password,
                name: name || username,
                user_type: user_type,
                status: 'active',
                max_devices: 1,
                last_login: new Date().toISOString(),
                device_id: this.generateDeviceId()
            };
            
            // Guardar localmente primero
            this.saveLocalUser(newUser);
            
            console.log('✅ Usuario registrado localmente:', username);
            
            // Auto-login después del registro
            return await this.login(username, password);
            
        } catch (error) {
            console.error('🚨 Error en registro:', error);
            return {
                success: false,
                error: 'Error en el registro'
            };
        }
    }
    
    logout() {
        const session = this.getSession();
        if (session) {
            console.log('🚪 Cerrando sesión:', session.user.username);
        }
        localStorage.removeItem(this.STORAGE_KEY);
        window.location.href = '/login.html';
    }
    
    // ===================== FUNCIONES DE SESIÓN =====================
    
    getSession() {
        try {
            const sessionStr = localStorage.getItem(this.STORAGE_KEY);
            if (!sessionStr) return null;
            
            const session = JSON.parse(sessionStr);
            
            // Verificar si la sesión expiró
            if (!this.isSessionValid(session)) {
                console.log('⏰ Sesión expirada');
                this.logout();
                return null;
            }
            
            return session;
        } catch (error) {
            console.error('Error leyendo sesión:', error);
            return null;
        }
    }
    
    saveSession(session) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
    }
    
    isSessionValid(session) {
        if (!session || !session.expiresAt) return false;
        return Date.now() < session.expiresAt;
    }
    
    getCurrentUser() {
        const session = this.getSession();
        return session ? session.user : null;
    }
    
    isAuthenticated() {
        return this.getSession() !== null;
    }
    
    isAdmin() {
        const user = this.getCurrentUser();
        return user && user.user_type === 'admin';
    }
    
    // ===================== FUNCIONES DE DATOS =====================
    
    async getUsers() {
        // Verificar caché
        if (this.cachedUsers && this.lastFetch && 
            (Date.now() - this.lastFetch) < this.CACHE_DURATION) {
            return this.cachedUsers;
        }
        
        try {
            // Intentar obtener de Google Sheets
            const response = await fetch(`${this.GOOGLE_SHEETS_API}?action=getUsers`);
            
            if (!response.ok) {
                throw new Error('Error fetching users');
            }
            
            const data = await response.json();
            
            // Actualizar caché
            this.cachedUsers = data.users || [];
            this.lastFetch = Date.now();
            
            console.log('📊 Usuarios cargados desde Google Sheets:', this.cachedUsers.length);
            
            return this.cachedUsers;
            
        } catch (error) {
            console.warn('⚠️ Falló conexión con Google Sheets, usando datos locales');
            
            // Cargar usuarios locales como fallback
            return this.getLocalUsers();
        }
    }
    
    getLocalUsers() {
        const localKey = 'local_users_backup';
        const usersStr = localStorage.getItem(localKey);
        
        if (usersStr) {
            return JSON.parse(usersStr);
        }
        
        // Usuarios por defecto si no hay datos
        return [
            {
                username: 'admin',
                password: 'admin123',
                name: 'Administrador',
                user_type: 'admin',
                status: 'active',
                max_devices: 1,
                last_login: new Date().toISOString(),
                device_id: 'dev_local_admin'
            },
            {
                username: 'usuario',
                password: 'user123',
                name: 'Usuario Demo',
                user_type: 'user',
                status: 'active',
                max_devices: 1,
                last_login: new Date().toISOString(),
                device_id: 'dev_local_user'
            }
        ];
    }
    
    saveLocalUser(user) {
        const localKey = 'local_users_backup';
        let users = this.getLocalUsers();
        
        // Remover si ya existe
        users = users.filter(u => u.username !== user.username);
        
        // Agregar nuevo
        users.push(user);
        
        localStorage.setItem(localKey, JSON.stringify(users));
    }
    
    // ===================== FUNCIONES DE APPS SCRIPT =====================
    
    async updateLastLogin(username) {
        try {
            await fetch(`${this.GOOGLE_SHEETS_API}?action=updateLogin`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: username,
                    last_login: new Date().toISOString(),
                    device_id: this.getCurrentUser()?.device_id
                })
            });
        } catch (error) {
            console.warn('No se pudo actualizar último login:', error);
        }
    }
    
    // ===================== FUNCIONES AUXILIARES =====================
    
    generateToken(username) {
        return btoa(`${username}:${Date.now()}:${Math.random()}`).replace(/=/g, '');
    }
    
    generateDeviceId() {
        return `dev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    async localLogin(username, password) {
        // Fallback a login local
        const users = this.getLocalUsers();
        const user = users.find(u => 
            u.username === username && u.password === password
        );
        
        if (user) {
            const session = {
                user: {
                    username: user.username,
                    name: user.name,
                    user_type: user.user_type,
                    status: user.status,
                    max_devices: user.max_devices
                },
                loginTime: new Date().toISOString(),
                expiresAt: Date.now() + (24 * 60 * 60000),
                token: this.generateToken(username)
            };
            
            this.saveSession(session);
            
            console.log('✅ Login local exitoso:', username);
            
            return {
                success: true,
                user: session.user,
                token: session.token,
                message: `¡Bienvenido ${session.user.name}! (modo local)`
            };
        }
        
        return {
            success: false,
            error: 'Credenciales incorrectas'
        };
    }
    
    // ===================== FUNCIONES DE USUARIO =====================
    
    async changePassword(oldPassword, newPassword) {
        const user = this.getCurrentUser();
        
        if (!user) {
            return { success: false, error: 'No hay sesión activa' };
        }
        
        // Verificar contraseña actual
        const users = await this.getUsers();
        const currentUser = users.find(u => u.username === user.username);
        
        if (!currentUser || currentUser.password !== oldPassword) {
            return { success: false, error: 'Contraseña actual incorrecta' };
        }
        
        // Actualizar localmente
        currentUser.password = newPassword;
        this.saveLocalUser(currentUser);
        
        console.log('🔑 Contraseña actualizada para:', user.username);
        
        return {
            success: true,
            message: 'Contraseña actualizada correctamente'
        };
    }
    
    async updateProfile(data) {
        const user = this.getCurrentUser();
        
        if (!user) {
            return { success: false, error: 'No hay sesión activa' };
        }
        
        const users = await this.getUsers();
        const currentUser = users.find(u => u.username === user.username);
        
        if (!currentUser) {
            return { success: false, error: 'Usuario no encontrado' };
        }
        
        // Actualizar datos
        if (data.name) currentUser.name = data.name;
        if (data.max_devices) currentUser.max_devices = data.max_devices;
        
        this.saveLocalUser(currentUser);
        
        // Actualizar sesión actual
        const session = this.getSession();
        if (session) {
            Object.assign(session.user, currentUser);
            this.saveSession(session);
        }
        
        return {
            success: true,
            user: currentUser,
            message: 'Perfil actualizado'
        };
    }
    
    // ===================== FUNCIONES DE VALIDACIÓN =====================
    
    validateUsername(username) {
        if (!username || username.length < 3) {
            return 'El usuario debe tener al menos 3 caracteres';
        }
        
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            return 'Solo se permiten letras, números y guiones bajos';
        }
        
        return null;
    }
    
    validatePassword(password) {
        if (!password || password.length < 6) {
            return 'La contraseña debe tener al menos 6 caracteres';
        }
        
        return null;
    }
    
    // ===================== API PÚBLICA =====================
    
    async testConnection() {
        try {
            const startTime = Date.now();
            const response = await fetch(`${this.GOOGLE_SHEETS_API}?action=ping`);
            const endTime = Date.now();
            
            return {
                connected: response.ok,
                latency: endTime - startTime,
                message: response.ok ? 
                    `Conectado a Google Sheets (${endTime - startTime}ms)` : 
                    'Error de conexión'
            };
        } catch (error) {
            return {
                connected: false,
                latency: null,
                message: 'No se pudo conectar a Google Sheets'
            };
        }
    }
}

// ===================== INICIALIZACIÓN =====================

// Configuración según entorno
const APPS_SCRIPT_ID = 'AKfycbwYOUR_ACTUAL_APPS_SCRIPT_ID'; // REEMPLAZA ESTO

// Crear instancia global
window.AuthManager = new GoogleSheetsAuth();

// Función de inicialización automática
(async function initAuth() {
    console.log('🚀 Inicializando sistema de autenticación...');
    
    // Verificar si estamos en página de login
    const isLoginPage = window.location.pathname.includes('login.html') || 
                       window.location.pathname.includes('register.html');
    
    // Si no está en login y no está autenticado, redirigir
    if (!isLoginPage && !window.AuthManager.isAuthenticated()) {
        console.log('🔒 No autenticado, redirigiendo a login...');
        window.location.href = '/login.html';
        return;
    }
    
    // Si está autenticado y en login, redirigir al dashboard
    if (isLoginPage && window.AuthManager.isAuthenticated()) {
        console.log('✅ Ya autenticado, redirigiendo a dashboard...');
        window.location.href = '/dashboard.html';
        return;
    }
    
    // Probar conexión con Google Sheets
    const connection = await window.AuthManager.testConnection();
    console.log(connection.message);
    
    // Mostrar información de usuario si está logueado
    const user = window.AuthManager.getCurrentUser();
    if (user) {
        console.log('👤 Usuario actual:', user.name);
        console.log('🎯 Tipo:', user.user_type);
        console.log('📱 Device ID:', user.device_id);
    }
})();

// ===================== EJEMPLO DE USO EN HTML =====================
/*
<!-- En tu HTML -->
<script src="auth-personal.js"></script>

<script>
// Para login
async function handleLogin() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    const result = await window.AuthManager.login(username, password);
    
    if (result.success) {
        alert(result.message);
        window.location.href = '/dashboard.html';
    } else {
        alert('Error: ' + result.error);
    }
}

// Para verificar sesión en cualquier página
if (!window.AuthManager.isAuthenticated()) {
    window.location.href = '/login.html';
}

// Para obtener usuario actual
const user = window.AuthManager.getCurrentUser();
if (user) {
    document.getElementById('user-name').textContent = user.name;
    document.getElementById('user-type').textContent = user.user_type;
}
</script>
*/
