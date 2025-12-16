// VERSIÓN COMPLETA SIN APPS SCRIPT
class LocalAuth {
    constructor() {
        this.STORAGE_KEY = 'local_auth';
        console.log('🔧 Auth local activado');
    }
    
    async login(username, password) {
        // Usuarios predefinidos
        const users = {
            'admin': { password: 'admin123', name: 'Administrador', type: 'admin' },
            'usuario': { password: 'user123', name: 'Usuario Normal', type: 'user' },
            'test': { password: 'test123', name: 'Usuario Test', type: 'user' }
        };
        
        if (users[username] && users[username].password === password) {
            const session = {
                user: {
                    username: username,
                    name: users[username].name,
                    user_type: users[username].type,
                    status: 'active'
                },
                loginTime: new Date().toISOString(),
                expiresAt: Date.now() + (60 * 60000) // 60 minutos
            };
            
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
            console.log('✅ Login exitoso:', username);
            
            return {
                success: true,
                user: session.user,
                message: `¡Bienvenido ${session.user.name}!`
            };
        }
        
        return {
            success: false,
            error: 'Credenciales incorrectas. Prueba: admin/admin123'
        };
    }
    
    verifySession() {
        const session = localStorage.getItem(this.STORAGE_KEY);
        return !!session; // Solo verifica que exista
    }
    
    getCurrentUser() {
        try {
            const session = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || 'null');
            return session ? session.user : null;
        } catch (e) {
            return null;
        }
    }
    
    logout() {
        localStorage.removeItem(this.STORAGE_KEY);
        console.log('🚪 Sesión cerrada');
    }
    
    // Crear usuario nuevo (solo guarda localmente)
    async createUser(username, password, name = username, type = 'user') {
        const session = {
            user: {
                username: username,
                name: name,
                user_type: type,
                status: 'active'
            },
            loginTime: new Date().toISOString(),
            expiresAt: Date.now() + (60 * 60000)
        };
        
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
        console.log('👤 Usuario creado localmente:', username);
        
        return {
            success: true,
            user: session.user,
            message: `Usuario ${username} creado (solo local)`
        };
    }
}

window.SecureAuth = new LocalAuth();
