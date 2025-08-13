// ===== FRAMEWORK MODULAR - CORE SYSTEM (WordPress Version) =====

class ModularFramework {
    constructor() {
        this.modules = new Map();
        this.currentModule = null;
        this.wpAPI = frameworkModularWP; // Datos de WordPress
        
        // Sistema de cache local para PWA
        this.localCache = new Map();
        this.pendingSync = new Set();
        this.isOnline = navigator.onLine;
        this.lastSyncTime = new Map();
        this.syncInProgress = false;
        this.workMode = 'local'; // 'local' only - removed 'auto' mode
        this.syncTimeout = null; // Para el debounce de sincronización automática
        
        this.init();
    }

    // ===== INICIALIZACIÓN =====
    async init() {
        this.setupEventListeners();
        this.setupPWAEventListeners();
        this.registerBuiltInModules();
        await this.initializeLocalCache();
        this.loadInterface();
        
        // Iniciar sincronización periódica
        this.startPeriodicSync();
        
        // Actualizar indicador PWA inicial
        setTimeout(() => {
            this.updatePWAStatus();
        }, 1000);
        
        console.log('🚀 Framework Modular iniciado correctamente (WordPress + PWA Cache)');
    }

    setupEventListeners() {
        // Cerrar modales al hacer clic fuera
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', function(e) {
                if (e.target === this) {
                    this.classList.remove('active');
                }
            });
        });

        // Responsive sidebar
        document.addEventListener('click', function(e) {
            if (window.innerWidth <= 768) {
                if (!e.target.closest('.sidebar') && !e.target.closest('.mobile-menu-btn')) {
                    document.getElementById('sidebar').classList.remove('open');
                }
            }
        });

    }

    setupPWAEventListeners() {
        // Detectar cambios de conectividad
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.updatePWAStatus();
            this.showMessage('🌐 Conexión restaurada - Sincronizando datos...');
            this.syncPendingChanges();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.updatePWAStatus();
            this.showMessage('📱 Modo offline activado - Los cambios se guardarán localmente');
        });

        // Sincronizar antes de cerrar la página
        window.addEventListener('beforeunload', () => {
            if (this.pendingSync.size > 0) {
                this.syncPendingChanges();
            }
        });

        // Detectar cuando la página se vuelve visible (para sincronizar)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.isOnline && this.pendingSync.size > 0) {
                this.syncPendingChanges();
            }
        });

        // Actualizar indicador PWA cada 30 segundos
        setInterval(() => {
            this.updatePWAStatus();
        }, 30000);

        // Configurar click en el indicador PWA
        setTimeout(() => {
            const indicator = document.getElementById('pwaStatusIndicator');
            if (indicator) {
                indicator.addEventListener('click', () => {
                    this.showPWAStatusModal();
                });
            }
        }, 1000);
    }

    // ===== GESTIÓN DE DATOS WORDPRESS =====

    async getModuleData(moduleId) {
        try {
            const response = await fetch(`${this.wpAPI.restUrl}data/${moduleId}`, {
                method: 'GET',
                headers: {
                    'X-WP-Nonce': this.wpAPI.nonce
                }
            });
            
            if (response.ok) {
                return await response.json();
            } else {
                return this.getDefaultData(moduleId);
            }
        } catch (error) {
            console.error(`Error cargando datos del módulo ${moduleId}:`, error);
            return this.getDefaultData(moduleId);
        }
    }

    async saveModuleData(moduleId, data) {
        try {
            const response = await fetch(`${this.wpAPI.restUrl}data/${moduleId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': this.wpAPI.nonce
                },
                body: JSON.stringify({ data: data })
            });
            
            if (!response.ok) {
                console.error(`Error guardando datos del módulo ${moduleId}`);
            }
        } catch (error) {
            console.error(`Error guardando datos del módulo ${moduleId}:`, error);
        }
    }

    // ===== SISTEMA DE CACHE LOCAL PWA =====
    async initializeLocalCache() {
        try {
            console.log('🔄 Inicializando cache local - Priorizando datos del servidor...');
            
            // Limpiar cache local al iniciar para forzar carga desde servidor
            this.localCache = new Map();
            this.lastSyncTime = new Map();
            
            // Limpiar localStorage de cache anterior
            localStorage.removeItem('frameworkModular_cache');
            console.log('🗑️ Cache local limpiado - Se cargarán datos frescos del servidor');

            // Cargar datos pendientes de sincronización (mantener estos)
            const pendingData = localStorage.getItem('frameworkModular_pending');
            if (pendingData) {
                this.pendingSync = new Set(JSON.parse(pendingData));
                console.log('⏳ Datos pendientes de sincronización:', this.pendingSync.size);
            } else {
                this.pendingSync = new Set();
            }

            // Cargar modo de trabajo preferido
            const savedWorkMode = localStorage.getItem('frameworkModular_workMode');
            if (savedWorkMode) {
                this.workMode = savedWorkMode;
                console.log('🔧 Modo de trabajo cargado:', this.workMode);
            }

            // SIEMPRE cargar datos frescos del servidor al iniciar la página
            if (this.isOnline) {
                console.log('🌐 Cargando datos frescos desde el servidor...');
                await this.loadFreshDataFromServer();
            } else {
                console.log('📱 Sin conexión - Usando datos por defecto');
                // Si no hay conexión, usar datos por defecto
                for (const [moduleId] of this.modules) {
                    const defaultData = this.getDefaultData(moduleId);
                    this.localCache.set(moduleId, defaultData);
                }
            }
            
            // Guardar el cache actualizado
            this.saveLocalCache();
            
        } catch (error) {
            console.error('Error inicializando cache local:', error);
            this.localCache = new Map();
            this.pendingSync = new Set();
            this.lastSyncTime = new Map();
        }
    }

    async loadFreshDataFromServer() {
        try {
            let loadedCount = 0;
            // Cargar datos frescos de todos los módulos registrados desde el servidor
            for (const [moduleId] of this.modules) {
                try {
                    console.log(`🌐 Cargando datos frescos del servidor para: ${moduleId}`);
                    const freshData = await this.fetchFromServer(moduleId);
                    this.localCache.set(moduleId, freshData);
                    this.lastSyncTime.set(moduleId, Date.now());
                    loadedCount++;
                    console.log(`✅ Datos frescos cargados para: ${moduleId}`);
                } catch (error) {
                    console.error(`❌ Error cargando datos frescos para ${moduleId}:`, error);
                    // Si falla, usar datos por defecto
                    const defaultData = this.getDefaultData(moduleId);
                    this.localCache.set(moduleId, defaultData);
                    this.lastSyncTime.set(moduleId, Date.now());
                }
            }
            console.log(`🎉 Carga fresca completada: ${loadedCount} módulos actualizados desde el servidor`);
        } catch (error) {
            console.error('Error cargando datos frescos del servidor:', error);
        }
    }

    async preloadCriticalData() {
        try {
            // Pre-cargar datos de todos los módulos registrados
            for (const [moduleId] of this.modules) {
                if (!this.localCache.has(moduleId)) {
                    const data = await this.fetchFromServer(moduleId);
                    this.localCache.set(moduleId, data);
                    this.lastSyncTime.set(moduleId, Date.now());
                }
            }
            this.saveLocalCache();
            console.log('🚀 Datos críticos pre-cargados en cache');
        } catch (error) {
            console.error('Error pre-cargando datos críticos:', error);
        }
    }

    saveLocalCache() {
        try {
            const cacheData = {
                cache: Array.from(this.localCache.entries()),
                syncTimes: Array.from(this.lastSyncTime.entries()),
                timestamp: Date.now()
            };
            localStorage.setItem('frameworkModular_cache', JSON.stringify(cacheData));
            
            if (this.pendingSync.size > 0) {
                localStorage.setItem('frameworkModular_pending', JSON.stringify(Array.from(this.pendingSync)));
            } else {
                localStorage.removeItem('frameworkModular_pending');
            }
        } catch (error) {
            console.error('Error guardando cache local:', error);
        }
    }

    async getFromCacheOrFetch(moduleId) {
        // Primero intentar obtener del cache local
        if (this.localCache.has(moduleId)) {
            const cachedData = this.localCache.get(moduleId);
            console.log(`📦 Datos obtenidos del cache local: ${moduleId}`);
            
            // Si estamos online, verificar si necesitamos actualizar en background
            if (this.isOnline) {
                this.backgroundSync(moduleId);
            }
            
            return cachedData;
        }

        // Si no está en cache y estamos online, obtener del servidor
        if (this.isOnline) {
            try {
                const data = await this.fetchFromServer(moduleId);
                this.localCache.set(moduleId, data);
                this.lastSyncTime.set(moduleId, Date.now());
                this.saveLocalCache();
                console.log(`🌐 Datos obtenidos del servidor: ${moduleId}`);
                return data;
            } catch (error) {
                console.error(`Error obteniendo datos del servidor para ${moduleId}:`, error);
            }
        }

        // Fallback: datos por defecto
        console.log(`⚠️ Usando datos por defecto para: ${moduleId}`);
        return this.getDefaultData(moduleId);
    }

    async fetchFromServer(moduleId) {
        const response = await fetch(`${this.wpAPI.restUrl}data/${moduleId}`, {
            method: 'GET',
            headers: {
                'X-WP-Nonce': this.wpAPI.nonce
            }
        });
        
        if (response.ok) {
            return await response.json();
        } else {
            return this.getDefaultData(moduleId);
        }
    }

    async backgroundSync(moduleId) {
        // Verificar si necesitamos sincronizar (cada 5 minutos)
        const lastSync = this.lastSyncTime.get(moduleId) || 0;
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;
        
        if (now - lastSync > fiveMinutes) {
            try {
                const serverData = await this.fetchFromServer(moduleId);
                const cachedData = this.localCache.get(moduleId);
                
                // Solo actualizar si los datos son diferentes
                if (JSON.stringify(serverData) !== JSON.stringify(cachedData)) {
                    this.localCache.set(moduleId, serverData);
                    this.lastSyncTime.set(moduleId, now);
                    this.saveLocalCache();
                    console.log(`🔄 Datos actualizados en background: ${moduleId}`);
                }
            } catch (error) {
                console.error(`Error en sincronización background para ${moduleId}:`, error);
            }
        }
    }

    async saveToCache(moduleId, data) {
        // Guardar en cache local inmediatamente
        this.localCache.set(moduleId, data);
        this.saveLocalCache();
        
        // En modo local, programar sincronización automática con debounce de 5 segundos
        this.scheduleAutoSync(moduleId, data);
    }

    scheduleAutoSync(moduleId, data) {
        // Limpiar timeout anterior si existe
        if (this.syncTimeout) {
            clearTimeout(this.syncTimeout);
        }

        // Agregar a pendientes inmediatamente para mostrar en el indicador
        this.pendingSync.add(moduleId);
        this.saveLocalCache();
        this.updatePWAStatus();

        // Programar sincronización de TODOS los elementos pendientes después de 5 segundos
        this.syncTimeout = setTimeout(async () => {
            if (this.isOnline && this.pendingSync.size > 0) {
                console.log(`💻 Iniciando sincronización automática de ${this.pendingSync.size} elementos pendientes...`);
                console.log(`🌐 Enviando datos al servidor para módulo: ${moduleId}`);
                
                // Forzar sincronización inmediata al servidor
                try {
                    await this.syncToServer(moduleId, data);
                    console.log(`✅ Datos sincronizados exitosamente al servidor para ${moduleId}`);
                    this.pendingSync.delete(moduleId);
                    this.saveLocalCache();
                    this.updatePWAStatus();
                    this.showMessage(`✅ Datos sincronizados con el servidor`);
                } catch (error) {
                    console.error(`❌ Error sincronizando ${moduleId} al servidor:`, error);
                    this.showMessage(`❌ Error sincronizando datos: ${error.message}`);
                }
                
                // También ejecutar la sincronización completa de elementos pendientes
                await this.syncPendingChanges();
            } else if (!this.isOnline) {
                console.log(`📱 Sin conexión - Los datos se sincronizarán cuando se restaure la conexión`);
                this.showMessage(`📱 Sin conexión - Los datos se sincronizarán automáticamente cuando se restaure la conexión`);
            }
            this.syncTimeout = null;
        }, 5000);

        console.log(`⏱️ Sincronización automática programada en 5 segundos para ${this.pendingSync.size} elemento(s)`);
        console.log(`📊 Datos que se sincronizarán:`, { moduleId, dataSize: JSON.stringify(data).length });
    }

    async syncToServer(moduleId, data) {
        const response = await fetch(`${this.wpAPI.restUrl}data/${moduleId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-WP-Nonce': this.wpAPI.nonce
            },
            body: JSON.stringify({ data: data })
        });
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        this.lastSyncTime.set(moduleId, Date.now());
        return true;
    }

    async syncPendingChanges() {
        if (this.syncInProgress || this.pendingSync.size === 0 || !this.isOnline) {
            return;
        }

        this.syncInProgress = true;
        this.updatePWAStatus(); // Actualizar indicador al iniciar sincronización
        
        const pendingItems = Array.from(this.pendingSync);
        let syncedCount = 0;

        console.log(`🔄 Iniciando sincronización de ${pendingItems.length} elementos pendientes...`);

        for (const moduleId of pendingItems) {
            try {
                const data = this.localCache.get(moduleId);
                if (data) {
                    await this.syncToServer(moduleId, data);
                    this.pendingSync.delete(moduleId);
                    syncedCount++;
                }
            } catch (error) {
                console.error(`Error sincronizando ${moduleId}:`, error);
                // Mantener en pendientes si falla
            }
        }

        this.saveLocalCache();
        this.syncInProgress = false;
        this.updatePWAStatus(); // Actualizar indicador al finalizar sincronización

        if (syncedCount > 0) {
            this.showMessage(`✅ ${syncedCount} elementos sincronizados con el servidor`);
        }
    }

    startPeriodicSync() {
        // Sincronizar cada 2 minutos si hay datos pendientes
        setInterval(() => {
            if (this.isOnline && this.pendingSync.size > 0) {
                this.syncPendingChanges();
            }
        }, 2 * 60 * 1000);
    }

    // ===== GESTIÓN DE MODO DE TRABAJO =====
    shouldSyncToServer() {
        switch (this.workMode) {
            case 'local':
                return false; // Nunca sincronizar automáticamente
            case 'auto':
            default:
                return false; // En modo auto, usamos debounce en lugar de sincronización inmediata
        }
    }

    setWorkMode(mode) {
        if (['auto', 'local'].includes(mode)) {
            this.workMode = mode;
            localStorage.setItem('frameworkModular_workMode', mode);
            this.updatePWAStatus();
            
            const modeNames = {
                'auto': 'Automático',
                'local': 'Trabajo Local'
            };
            
            this.showMessage(`🔧 Modo de trabajo cambiado a: ${modeNames[mode]}`);
            console.log('🔧 Modo de trabajo actualizado:', mode);
        }
    }

    getWorkModeDescription() {
        return 'Trabajo Local - Los cambios se guardan localmente y se sincronizan automáticamente después de 5 segundos';
    }

    getDefaultData(moduleId) {
        // Datos por defecto según el tipo de módulo
        const defaults = {
            'tasks': {
                scenarios: {
                    1: {
                        id: 1,
                        name: 'Personal',
                        icon: '🏠',
                        description: 'Escenario personal por defecto',
                        createdAt: new Date().toISOString(),
                        data: {
                            tasks: [],
                            projects: [
                                { id: 1, name: 'Trabajo', color: '#db4035' },
                                { id: 2, name: 'Personal', color: '#ff9933' },
                                { id: 3, name: 'Estudio', color: '#299438' }
                            ],
                            taskIdCounter: 1,
                            projectIdCounter: 4,
                            subtaskIdCounter: 1000
                        }
                    }
                },
                currentScenario: 1,
                scenarioIdCounter: 2
            },
            'notes': {
                scenarios: {
                    1: {
                        id: 1,
                        name: 'Personal',
                        icon: '🏠',
                        description: 'Escenario personal por defecto',
                        createdAt: new Date().toISOString(),
                        data: {
                            notes: [],
                            folders: [
                                { id: 1, name: 'General', color: '#a8e6cf' },
                                { id: 2, name: 'Ideas', color: '#ffd3a5' },
                                { id: 3, name: 'Trabajo', color: '#fd9b9b' }
                            ],
                            noteIdCounter: 1,
                            folderIdCounter: 4
                        }
                    }
                },
                currentScenario: 1,
                scenarioIdCounter: 2
            },
            'assistant': {
                contexts: {
                    general: {
                        id: 'general',
                        name: 'General',
                        icon: '🤖',
                        description: 'Asistente general para cualquier consulta',
                        systemPrompt: 'Eres un asistente útil y amigable. Ayuda al usuario con cualquier consulta de manera clara y concisa.'
                    },
                    tasks: {
                        id: 'tasks',
                        name: 'Tareas',
                        icon: '📋',
                        description: 'Especializado en gestión de tareas y productividad',
                        systemPrompt: 'Eres un asistente especializado en gestión de tareas y productividad. Ayuda al usuario a organizar, planificar y completar sus tareas de manera eficiente.'
                    },
                    notes: {
                        id: 'notes',
                        name: 'Notas',
                        icon: '📝',
                        description: 'Especializado en organización de notas y conocimiento',
                        systemPrompt: 'Eres un asistente especializado en organización de notas y gestión del conocimiento. Ayuda al usuario a estructurar, categorizar y encontrar información.'
                    }
                },
                currentContext: 'general'
            },
            'assistant_aiConfig': {
                apiKey: '',
                model: 'gpt-4.1-nano',
                maxTokens: 1000,
                temperature: 0.7,
                historyLimit: 10
            },
            'assistant_aiStats': {
                todayQueries: 0,
                totalTokens: 0,
                estimatedCost: 0,
                usageHistory: [],
                currentModel: 'GPT-4.1 nano',
                lastResetDate: new Date().toDateString()
            },
            'assistant_messages': [],
            'tasksModule_aiConfig': {
                apiKey: '',
                model: 'gpt-4.1-nano',
                maxTokens: 1000,
                temperature: 0.7,
                historyLimit: 10
            },
            'tasksModule_aiStats': {
                todayQueries: 0,
                totalTokens: 0,
                estimatedCost: 0,
                usageHistory: [],
                currentModel: 'GPT-4.1 nano',
                lastResetDate: new Date().toDateString()
            },
            'tasksModule_assistantMessages': []
        };

        return defaults[moduleId] || {};
    }

    // ===== GESTIÓN DE MÓDULOS =====
    registerModule(moduleConfig) {
        if (!moduleConfig.id || !moduleConfig.name || !moduleConfig.load) {
            throw new Error('Configuración de módulo inválida');
        }

        this.modules.set(moduleConfig.id, {
            id: moduleConfig.id,
            name: moduleConfig.name,
            icon: moduleConfig.icon || '📋',
            description: moduleConfig.description || '',
            version: moduleConfig.version || '1.0.0',
            load: moduleConfig.load,
            unload: moduleConfig.unload || (() => {}),
            instance: null
        });

        this.updateModulesInterface();
        console.log(`📦 Módulo "${moduleConfig.name}" registrado`);
    }

    registerBuiltInModules() {
        // Registro del módulo de tareas
        this.registerModule({
            id: 'tasks',
            name: 'Tasks',
            icon: '📋',
            description: 'Gestión de tareas y proyectos',
            version: '4.0.0',
            load: () => this.loadTasksModule()
        });

        // Registro del módulo de asistente
        this.registerModule({
            id: 'assistant',
            name: 'Assistant',
            icon: '🤖',
            description: 'Asistente de IA con contextos especializados',
            version: '1.0.0',
            load: () => this.loadAssistantModule()
        });

        // Registro del módulo de notas (preparado para futuro)
        this.registerModule({
            id: 'notes',
            name: 'Notes',
            icon: '📝',
            description: 'Gestión de notas y apuntes',
            version: '1.0.0',
            load: () => this.loadNotesModule()
        });
    }

    async loadTasksModule() {
        try {
            // El CSS ya está cargado por WordPress
            
            // Verificar si el módulo ya está disponible
            if (window.TasksModule) {
                return new window.TasksModule(this);
            } else {
                throw new Error('Módulo de tareas no encontrado');
            }
        } catch (error) {
            console.error('Error cargando módulo de tareas:', error);
            throw error;
        }
    }

    async loadAssistantModule() {
        try {
            // El CSS ya está cargado por WordPress
            
            // Verificar si el módulo ya está disponible
            if (window.AssistantModule) {
                return new window.AssistantModule(this);
            } else {
                throw new Error('Módulo de asistente no encontrado');
            }
        } catch (error) {
            console.error('Error cargando módulo de asistente:', error);
            throw error;
        }
    }

    async loadNotesModule() {
        try {
            // El CSS ya está cargado por WordPress
            
            // Verificar si el módulo ya está disponible
            if (window.NotesModule) {
                return new window.NotesModule(this);
            } else {
                throw new Error('Módulo de notas no encontrado');
            }
        } catch (error) {
            console.error('Error cargando módulo de notas:', error);
            throw error;
        }
    }

    // ===== CAMBIO DE ESPACIOS =====
    async switchSpace(moduleId) {
        if (!this.modules.has(moduleId)) {
            console.error(`Módulo "${moduleId}" no encontrado`);
            return;
        }

        // Descargar módulo actual si existe
        if (this.currentModule) {
            await this.unloadCurrentModule();
        }

        const moduleInfo = this.modules.get(moduleId);
        
        try {
            // Mostrar estado de carga
            this.showLoadingState(`Cargando ${moduleInfo.name}...`);

            // Cargar nuevo módulo
            moduleInfo.instance = await moduleInfo.load();
            
            this.currentModule = moduleId;

            // Actualizar interfaz
            this.updateSpaceSelector();
            this.updateMainTitle(moduleInfo.name);
            
            // Ocultar estado de carga
            this.hideLoadingState();

            console.log(`✅ Espacio cambiado a: ${moduleInfo.name}`);
            
        } catch (error) {
            console.error(`Error cargando módulo ${moduleInfo.name}:`, error);
            this.hideLoadingState();
            this.showError(`Error cargando ${moduleInfo.name}: ${error.message}`);
        }
    }

    async unloadCurrentModule() {
        if (this.currentModule && this.modules.has(this.currentModule)) {
            const moduleInfo = this.modules.get(this.currentModule);
            
            if (moduleInfo.instance && moduleInfo.instance.destroy) {
                await moduleInfo.instance.destroy();
            }
            
            if (moduleInfo.unload) {
                await moduleInfo.unload();
            }
            
            moduleInfo.instance = null;
        }
    }

    // ===== INTERFAZ =====
    loadInterface() {
        this.updateModulesInterface();
        this.updateSpaceSelector();
    }

    updateModulesInterface() {
        const modulesList = document.getElementById('modulesList');
        modulesList.innerHTML = '';

        this.modules.forEach((moduleInfo, moduleId) => {
            const moduleItem = document.createElement('div');
            moduleItem.className = `nav-item ${moduleId === this.currentModule ? 'active' : ''}`;
            moduleItem.setAttribute('data-module', moduleId);
            
            moduleItem.innerHTML = `
                <div class="nav-item-icon">${moduleInfo.icon}</div>
                <div class="nav-item-text">${moduleInfo.name}</div>
            `;
            
            moduleItem.addEventListener('click', () => {
                this.switchSpace(moduleId);
            });
            
            modulesList.appendChild(moduleItem);
        });
    }

    updateSpaceSelector() {
        const spaceSelect = document.getElementById('spaceSelect');
        spaceSelect.innerHTML = '<option value="">Seleccionar Espacio...</option>';

        this.modules.forEach((moduleInfo, moduleId) => {
            const option = document.createElement('option');
            option.value = moduleId;
            option.textContent = `${moduleInfo.icon} ${moduleInfo.name}`;
            spaceSelect.appendChild(option);
        });

        spaceSelect.value = this.currentModule || '';
    }

    updateMainTitle(title) {
        document.getElementById('mainTitle').textContent = title;
    }

    showLoadingState(message = 'Cargando...') {
        const container = document.getElementById('moduleContainer');
        container.innerHTML = `
            <div class="loading-state">
                <div class="loading-icon"></div>
                <div class="loading-message">${message}</div>
            </div>
        `;
        container.classList.add('loading');
    }

    hideLoadingState() {
        const container = document.getElementById('moduleContainer');
        container.classList.remove('loading');
    }

    showError(message) {
        const container = document.getElementById('moduleContainer');
        container.innerHTML = `
            <div class="error-state">
                <div class="error-icon">❌</div>
                <div class="error-title">Error</div>
                <div class="error-message">${message}</div>
                <button class="btn btn-primary" onclick="location.reload()">Recargar</button>
            </div>
        `;
    }


    // ===== GESTIÓN DE DATOS GLOBAL =====
    async exportAllData() {
        try {
            // Recopilar datos de todos los módulos
            const allModulesData = {};
            
            // Obtener datos de cada módulo registrado
            for (const [moduleId] of this.modules) {
                allModulesData[moduleId] = await this.getModuleData(moduleId);
            }

            const exportData = {
                // Datos del framework
                framework: {
                    currentModule: this.data.currentModule,
                    globalConfig: this.data.globalConfig
                },
                // Datos de todos los módulos
                modules: allModulesData,
                // Metadatos de exportación
                exportDate: new Date().toISOString(),
                frameworkVersion: '4.0.0',
                exportType: 'complete-system',
                source: 'wordpress'
            };

            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `framework-modular-backup-${new Date().toISOString().split('T')[0]}.json`;
            link.click();

            this.showMessage('📤 Sistema completo exportado correctamente (todos los módulos)');
        } catch (error) {
            console.error('Error exportando datos:', error);
            this.showMessage('❌ Error al exportar datos');
        }
    }

    async exportCurrentSpace() {
        if (!this.currentModule) {
            this.showMessage('❌ No hay espacio activo para exportar');
            return;
        }

        try {
            const moduleInfo = this.modules.get(this.currentModule);
            const moduleData = await this.getModuleData(this.currentModule);
            
            const exportData = {
                module: this.currentModule,
                moduleName: moduleInfo.name,
                data: moduleData,
                exportDate: new Date().toISOString(),
                source: 'wordpress'
            };

            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${this.currentModule}-backup-${new Date().toISOString().split('T')[0]}.json`;
            link.click();

            this.showMessage(`📤 Datos de ${moduleInfo.name} exportados`);
        } catch (error) {
            console.error('Error exportando espacio actual:', error);
            this.showMessage('❌ Error al exportar espacio actual');
        }
    }

    async importData() {
        // Intentar obtener el input global primero, luego el de módulo como fallback
        let fileInput = document.getElementById('globalImportFileInput');
        if (!fileInput) {
            fileInput = document.getElementById('importFileInput');
        }
        
        if (!fileInput) {
            this.showMessage('❌ No se encontró el selector de archivos');
            return;
        }

        const file = fileInput.files[0];

        if (!file) {
            this.showMessage('❌ Selecciona un archivo para importar');
            return;
        }

        // Verificar extensión del archivo en lugar de MIME type
        const fileName = file.name.toLowerCase();
        if (!fileName.endsWith('.json')) {
            this.showMessage('❌ Por favor selecciona un archivo JSON válido (.json)');
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                
                if (!confirm('⚠️ ¿Estás seguro? Esto reemplazará TODOS los datos del sistema (todos los módulos).')) {
                    return;
                }

                // Validar estructura de datos
                if (!importedData || typeof importedData !== 'object') {
                    throw new Error('Estructura de datos inválida');
                }

                // Verificar si es una exportación completa del sistema
                if (importedData.exportType === 'complete-system' && importedData.frameworkVersion) {
                    console.log('🔄 Iniciando importación completa del sistema...');
                    
                    // Descargar módulo actual antes de importar
                    if (this.currentModule) {
                        await this.unloadCurrentModule();
                    }
                    
                    // Limpiar timeout de sincronización automática si existe
                    if (this.syncTimeout) {
                        clearTimeout(this.syncTimeout);
                        this.syncTimeout = null;
                    }
                    
                    // Limpiar cache local
                    this.localCache.clear();
                    this.pendingSync.clear();
                    this.lastSyncTime.clear();
                    
                    // Importación completa del sistema
                    this.data = {
                        currentModule: importedData.framework.currentModule || null,
                        globalConfig: importedData.framework.globalConfig || {
                            theme: 'light',
                            language: 'es'
                        },
                        modules: {}
                    };
                    
                    // Guardar datos del framework
                    await this.saveGlobalData();
                    
                    // Guardar datos de cada módulo
                    let modulesImported = 0;
                    for (const [moduleId, moduleData] of Object.entries(importedData.modules || {})) {
                        try {
                            await this.saveModuleData(moduleId, moduleData);
                            console.log(`✅ Módulo ${moduleId} importado correctamente`);
                            modulesImported++;
                        } catch (error) {
                            console.error(`❌ Error importando módulo ${moduleId}:`, error);
                        }
                    }
                    
                    // Actualizar cache local con los nuevos datos
                    for (const [moduleId, moduleData] of Object.entries(importedData.modules || {})) {
                        this.localCache.set(moduleId, moduleData);
                        this.lastSyncTime.set(moduleId, Date.now());
                    }
                    this.saveLocalCache();
                    
                    // Actualizar interfaz
                    this.updateModulesInterface();
                    this.updateSpaceSelector();
                    this.updateMainTitle('Framework Modular');
                    this.updatePWAStatus();
                    
                    this.showMessage(`✅ Sistema completo importado: ${modulesImported} módulos restaurados`);
                    console.log(`🎉 Importación completa finalizada: ${modulesImported} módulos`);
                    
                    // Recargar la página después de un breve delay
                    setTimeout(() => {
                        location.reload();
                    }, 2000);
                    
                } else if (importedData.module && importedData.data) {
                    // Importación de módulo específico
                    await this.saveModuleData(importedData.module, importedData.data);
                    
                    // Actualizar cache local
                    this.localCache.set(importedData.module, importedData.data);
                    this.lastSyncTime.set(importedData.module, Date.now());
                    this.saveLocalCache();
                    
                    this.showMessage(`✅ Datos de ${importedData.moduleName || importedData.module} importados`);
                    
                } else {
                    throw new Error('Formato de archivo no reconocido. Debe ser una exportación completa del sistema o de un módulo específico.');
                }

                // Limpiar el input de archivo
                fileInput.value = '';

            } catch (error) {
                console.error('Error importando datos:', error);
                this.showMessage(`❌ Error al importar: ${error.message}`);
            }
        };

        reader.onerror = () => {
            this.showMessage('❌ Error al leer el archivo');
        };

        reader.readAsText(file);
    }

    async clearAllData() {
        if (!confirm('⚠️ ¿Estás COMPLETAMENTE seguro? Esto eliminará TODOS los datos.')) {
            return;
        }

        if (!confirm('⚠️ ÚLTIMA CONFIRMACIÓN: Se eliminarán todos los datos. ¿Continuar?')) {
            return;
        }

        try {
            // Descargar módulo actual antes de limpiar
            if (this.currentModule) {
                await this.unloadCurrentModule();
            }

            // Limpiar timeout de sincronización automática si existe
            if (this.syncTimeout) {
                clearTimeout(this.syncTimeout);
                this.syncTimeout = null;
            }

            // Eliminar TODOS los datos del usuario de una vez usando la nueva ruta
            try {
                const response = await fetch(`${this.wpAPI.restUrl}data`, {
                    method: 'DELETE',
                    headers: {
                        'X-WP-Nonce': this.wpAPI.nonce
                    }
                });
                
                if (response.ok) {
                    const result = await response.json();
                    console.log(`🗑️ ${result.deleted_records} registros eliminados del servidor:`, result.message);
                } else {
                    console.error('Error eliminando todos los datos del servidor');
                }
            } catch (error) {
                console.error('Error eliminando todos los datos del servidor:', error);
            }
            
            // Limpiar COMPLETAMENTE el cache local y localStorage
            this.localCache.clear();
            this.pendingSync.clear();
            this.lastSyncTime.clear();
            
            // Eliminar todos los datos de localStorage relacionados
            localStorage.removeItem('frameworkModular_cache');
            localStorage.removeItem('frameworkModular_pending');
            localStorage.removeItem('frameworkModular_workMode');
            
            // Limpiar cualquier otro dato de localStorage que pueda existir
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.startsWith('frameworkModular_') || key.startsWith('tasksModule_'))) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
            
            console.log(`🗑️ ${keysToRemove.length} elementos eliminados del localStorage`);
            
            // Reinicializar datos del framework
            this.data = {
                currentModule: null,
                globalConfig: {
                    theme: 'light',
                    language: 'es'
                },
                modules: {}
            };
            
            // Resetear estado del framework
            this.currentModule = null;
            this.workMode = 'local'; // Resetear a modo por defecto
            this.syncInProgress = false;
            
            // Actualizar interfaz
            this.updateModulesInterface();
            this.updateSpaceSelector();
            this.updateMainTitle('Framework Modular');
            this.updatePWAStatus(); // Actualizar indicador PWA
            
            // Limpiar contenedor principal
            const container = document.getElementById('moduleContainer');
            if (container) {
                container.innerHTML = `
                    <div class="welcome-state">
                        <div class="welcome-icon">🚀</div>
                        <div class="welcome-title">¡Bienvenido al Framework Modular!</div>
                        <div class="welcome-description">Selecciona un espacio de trabajo para comenzar</div>
                    </div>
                `;
            }
            
            // Limpiar navegación y acciones del módulo
            const moduleNavigation = document.getElementById('moduleNavigation');
            const moduleActions = document.getElementById('moduleActions');
            if (moduleNavigation) moduleNavigation.innerHTML = '';
            if (moduleActions) moduleActions.innerHTML = '';
            
            // Guardar el estado limpio
            this.saveLocalCache();
            
            this.showMessage('🗑️ Todos los datos han sido eliminados correctamente (servidor y local)');
            console.log('✅ Limpieza completa finalizada - Sistema reiniciado');
            
        } catch (error) {
            console.error('Error limpiando datos:', error);
            this.showMessage('❌ Error al limpiar datos: ' + error.message);
        }
    }

    // ===== UTILIDADES =====
    showMessage(message) {
        // Crear un sistema simple de notificaciones
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            z-index: 10000;
            animation: slideInRight 0.3s ease;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // ===== INDICADOR PWA =====
    updatePWAStatus() {
        const indicator = document.getElementById('pwaStatusIndicator');
        const statusIcon = document.getElementById('statusIcon');
        const statusText = document.getElementById('statusText');
        const pendingSync = document.getElementById('pendingSync');
        const pendingCount = document.getElementById('pendingCount');

        if (!indicator || !statusIcon || !statusText || !pendingSync || !pendingCount) {
            return;
        }

        // Limpiar clases anteriores
        indicator.className = 'pwa-status-indicator';

        if (this.syncInProgress) {
            // Estado sincronizando
            indicator.classList.add('syncing');
            statusIcon.textContent = '🔄';
            statusText.textContent = 'Sincronizando';
            indicator.title = 'Sincronizando datos con el servidor...';
        } else if (!this.isOnline) {
            // Estado offline
            indicator.classList.add('offline');
            statusIcon.textContent = '📱';
            statusText.textContent = 'Offline';
            indicator.title = 'Sin conexión - Los cambios se guardan localmente';
        } else {
            // Estado online
            indicator.classList.add('online');
            statusIcon.textContent = '🌐';
            statusText.textContent = 'Online';
            indicator.title = 'Conectado - Datos sincronizados';
        }

        // Mostrar contador de elementos pendientes
        if (this.pendingSync.size > 0) {
            pendingSync.style.display = 'block';
            pendingCount.textContent = this.pendingSync.size;
            indicator.title += ` - ${this.pendingSync.size} elemento(s) pendiente(s)`;
        } else {
            pendingSync.style.display = 'none';
        }
    }

    showPWAStatusModal() {
        const modalHTML = `
            <div class="modal active" id="pwaStatusModal">
                <div class="modal-content" style="max-width: 600px;">
                    <div class="modal-header">
                        <h2 class="modal-title">📱 Estado PWA & Control de Trabajo</h2>
                        <button class="modal-close" onclick="document.getElementById('pwaStatusModal').remove()">×</button>
                    </div>
                    
                    <div class="form-group">
                        <h3 style="margin-bottom: 12px;">🔧 Modo de Trabajo</h3>
                        <div class="work-mode-info">
                            <div class="work-mode-badge local">💻 Trabajo Local</div>
                            <div class="work-mode-description" style="margin-top: 8px; font-size: 14px; color: #666;">
                                ${this.getWorkModeDescription()}
                            </div>
                        </div>
                    </div>

                    <div class="form-group">
                        <h3 style="margin-bottom: 12px;">🌐 Estado de Conexión</h3>
                        <div class="status-card ${this.isOnline ? 'online' : 'offline'}">
                            <div class="status-indicator">
                                <span class="status-icon">${this.isOnline ? '🌐' : '📱'}</span>
                                <span class="status-label">${this.isOnline ? 'Online' : 'Offline'}</span>
                            </div>
                            <div class="status-description">
                                ${this.isOnline 
                                    ? 'Conectado al servidor - Los datos se sincronizan según el modo seleccionado'
                                    : 'Sin conexión - Los cambios se guardan localmente y se sincronizarán cuando se restaure la conexión'
                                }
                            </div>
                        </div>
                    </div>

                    <div class="form-group">
                        <h3 style="margin-bottom: 12px;">⏳ Sincronización</h3>
                        <div class="sync-info">
                            <div class="sync-item">
                                <strong>Modo actual:</strong> 
                                <span class="work-mode-badge ${this.workMode}">${this.workMode === 'auto' ? '🤖 Automático' : this.workMode === 'local' ? '💻 Local' : '🌐 Online'}</span>
                            </div>
                            <div class="sync-item">
                                <strong>Elementos pendientes:</strong> 
                                <span class="sync-count">${this.pendingSync.size}</span>
                            </div>
                            <div class="sync-item">
                                <strong>Estado:</strong> 
                                <span class="sync-status">${this.syncInProgress ? 'Sincronizando...' : 'Inactivo'}</span>
                            </div>
                            <div class="sync-item">
                                <strong>Cache local:</strong> 
                                <span class="cache-count">${this.localCache.size} elementos</span>
                            </div>
                        </div>
                    </div>

                    ${this.pendingSync.size > 0 ? `
                        <div class="form-group">
                            <h3 style="margin-bottom: 12px;">📋 Elementos Pendientes</h3>
                            <div class="pending-list">
                                ${Array.from(this.pendingSync).map(moduleId => `
                                    <div class="pending-item">
                                        <span class="module-name">${this.modules.get(moduleId)?.name || moduleId}</span>
                                        <span class="pending-badge">Pendiente</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    <div class="form-group">
                        <div class="pwa-actions">
                            ${this.isOnline && this.pendingSync.size > 0 ? `
                                <button class="btn btn-primary" onclick="framework.syncPendingChanges(); document.getElementById('pwaStatusModal').remove();">
                                    🔄 Sincronizar Ahora
                                </button>
                            ` : ''}
                            <button class="btn btn-secondary" onclick="framework.updatePWAStatus(); document.getElementById('pwaStatusModal').remove();">
                                🔄 Actualizar Estado
                            </button>
                        </div>
                    </div>

                    <div class="info-box" style="background: #e8f5e9; border: 1px solid #4caf50; border-radius: 6px; padding: 12px; margin-top: 16px;">
                        <h4 style="margin: 0 0 8px 0; color: #2e7d32;">🎯 Modos de Trabajo</h4>
                        <ul style="margin: 0; padding-left: 16px; font-size: 14px; color: #388e3c;">
                            <li><strong>🤖 Automático:</strong> Sincroniza automáticamente 2 segundos después de hacer cambios</li>
                            <li><strong>💻 Trabajo Local:</strong> Solo guarda localmente, sincroniza manualmente</li>
                        </ul>
                    </div>

                    <div class="info-box" style="background: #e3f2fd; border: 1px solid #2196f3; border-radius: 6px; padding: 12px; margin-top: 12px;">
                        <h4 style="margin: 0 0 8px 0; color: #1976d2;">💡 Información PWA</h4>
                        <ul style="margin: 0; padding-left: 16px; font-size: 14px; color: #1565c0;">
                            <li>Los datos se guardan localmente para funcionar sin conexión</li>
                            <li>El cache local mejora la velocidad de carga</li>
                            <li>Puedes elegir cuándo sincronizar con el servidor</li>
                            <li>El modo local te permite trabajar completamente offline</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;

        // Agregar estilos específicos para el modal PWA
        const pwaModalStyles = `
            <style>
                .status-card {
                    padding: 16px;
                    border-radius: 8px;
                    border: 2px solid;
                    margin-bottom: 16px;
                }
                
                .status-card.online {
                    background: rgba(76, 175, 80, 0.1);
                    border-color: #4caf50;
                }
                
                .status-card.offline {
                    background: rgba(255, 152, 0, 0.1);
                    border-color: #ff9800;
                }
                
                .status-indicator {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 8px;
                    font-weight: 600;
                }
                
                .status-description {
                    font-size: 14px;
                    color: #666;
                    line-height: 1.4;
                }
                
                .sync-info {
                    background: #f8f9fa;
                    border-radius: 6px;
                    padding: 12px;
                }
                
                .sync-item {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 8px;
                    font-size: 14px;
                }
                
                .sync-item:last-child {
                    margin-bottom: 0;
                }
                
                .sync-count, .cache-count {
                    background: #2196f3;
                    color: white;
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 12px;
                    font-weight: 600;
                }
                
                .sync-status {
                    color: #666;
                    font-style: italic;
                }
                
                .pending-list {
                    max-height: 150px;
                    overflow-y: auto;
                    background: #f8f9fa;
                    border-radius: 6px;
                    padding: 8px;
                }
                
                .pending-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 6px 8px;
                    margin-bottom: 4px;
                    background: white;
                    border-radius: 4px;
                    font-size: 14px;
                }
                
                .pending-badge {
                    background: #ff5722;
                    color: white;
                    padding: 2px 8px;
                    border-radius: 10px;
                    font-size: 11px;
                    font-weight: 600;
                }
                
                .pwa-actions {
                    display: flex;
                    gap: 12px;
                    justify-content: center;
                }
                
                .pwa-actions .btn {
                    flex: 1;
                }
                
                .work-mode-selector {
                    margin-bottom: 16px;
                }
                
                .work-mode-selector .form-select {
                    width: 100%;
                    padding: 8px 12px;
                    border: 1px solid #ddd;
                    border-radius: 6px;
                    font-size: 14px;
                    background: white;
                }
                
                .work-mode-description {
                    background: #f8f9fa;
                    border-radius: 4px;
                    padding: 8px 12px;
                    border-left: 3px solid #2196f3;
                }
                
                .work-mode-badge {
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 12px;
                    font-weight: 600;
                }
                
                .work-mode-badge.auto {
                    background: #2196f3;
                    color: white;
                }
                
                .work-mode-badge.local {
                    background: #ff9800;
                    color: white;
                }
                
                .work-mode-badge.online {
                    background: #4caf50;
                    color: white;
                }
            </style>
        `;

        // Insertar modal en el DOM
        document.body.insertAdjacentHTML('beforeend', pwaModalStyles + modalHTML);
    }


    // ===== API PÚBLICA PARA MÓDULOS =====
    getFrameworkAPI() {
        return {
            // Gestión de datos con cache PWA
            getModuleData: (moduleId) => this.getFromCacheOrFetch(moduleId),
            saveModuleData: (moduleId, data) => this.saveToCache(moduleId, data),
            
            // Gestión de datos legacy (para compatibilidad)
            getModuleDataDirect: (moduleId) => this.getModuleData(moduleId),
            saveModuleDataDirect: (moduleId, data) => this.saveModuleData(moduleId, data),
            
            // UI
            updateMainTitle: (title) => this.updateMainTitle(title),
            showMessage: (message) => this.showMessage(message),
            showLoadingState: (message) => this.showLoadingState(message),
            hideLoadingState: () => this.hideLoadingState(),
            
            // Navegación
            updateModuleNavigation: (html) => {
                document.getElementById('moduleNavigation').innerHTML = html;
            },
            updateModuleActions: (html) => {
                document.getElementById('moduleActions').innerHTML = html;
            },
            updateModuleContainer: (html) => {
                document.getElementById('moduleContainer').innerHTML = html;
            },
            
            // Configuración
            getGlobalConfig: () => ({}),
            
            // Módulo actual
            getCurrentModule: () => this.currentModule,
            
            // Estado PWA
            isOnline: () => this.isOnline,
            getPendingSyncCount: () => this.pendingSync.size,
            forceSyncPending: () => this.syncPendingChanges(),
            
            // WordPress API
            wpAPI: this.wpAPI
        };
    }
}

// ===== FUNCIONES GLOBALES =====
let framework;

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

function switchSpace(moduleId) {
    if (framework && moduleId) {
        framework.switchSpace(moduleId);
    }
}

function showGlobalConfigModal() {
    document.getElementById('globalConfigModal').classList.add('active');
}

function hideGlobalConfigModal() {
    document.getElementById('globalConfigModal').classList.remove('active');
}

function saveGlobalConfig() {
    framework.saveGlobalConfig();
    hideGlobalConfigModal();
}

function showGlobalDataManagementModal() {
    document.getElementById('globalDataManagementModal').classList.add('active');
}

function hideGlobalDataManagementModal() {
    document.getElementById('globalDataManagementModal').classList.remove('active');
}

// Mantener las funciones originales para compatibilidad
function showDataManagementModal() {
    showGlobalDataManagementModal();
}

function hideDataManagementModal() {
    hideGlobalDataManagementModal();
}

function exportAllData() {
    framework.exportAllData();
}

function exportCurrentSpace() {
    framework.exportCurrentSpace();
}

function importData() {
    framework.importData();
}

function clearAllData() {
    framework.clearAllData();
}

function showSpaceConfigModal() {
    document.getElementById('spaceConfigModal').classList.add('active');
    updateSpaceConfigModal();
}

function hideSpaceConfigModal() {
    document.getElementById('spaceConfigModal').classList.remove('active');
}

function updateSpaceConfigModal() {
    if (!framework) return;
    
    const spacesList = document.getElementById('spacesList');
    spacesList.innerHTML = '';
    
    framework.modules.forEach((moduleInfo, moduleId) => {
        const spaceItem = document.createElement('div');
        spaceItem.className = `space-item ${moduleId === framework.currentModule ? 'active' : ''}`;
        
        spaceItem.innerHTML = `
            <div class="space-info">
                <div class="space-icon">${moduleInfo.icon}</div>
                <div class="space-details">
                    <div class="space-name">${moduleInfo.name}</div>
                    <div class="space-description">${moduleInfo.description}</div>
                </div>
            </div>
            <div class="space-actions">
                <button class="space-action-btn" onclick="switchSpace('${moduleId}')" title="Activar">
                    🔄
                </button>
            </div>
        `;
        
        spacesList.appendChild(spaceItem);
    });
    
    // Actualizar información del espacio actual
    if (framework.currentModule) {
        const currentModule = framework.modules.get(framework.currentModule);
        document.getElementById('currentSpaceName').textContent = currentModule.name;
        document.getElementById('currentSpaceType').textContent = currentModule.description;
        document.getElementById('currentSpaceStatus').textContent = 'Activo';
    }
}

// ===== ESTILOS ADICIONALES PARA ESTADOS =====
const additionalStyles = `
.notification {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
}

@keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}

@keyframes slideOutRight {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
}

.loading-state, .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    text-align: center;
    padding: 40px;
}

.loading-icon::after {
    content: '';
    width: 40px;
    height: 40px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #db4035;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 20px;
}

.loading-message, .error-message {
    font-size: 16px;
    color: #666;
    margin-top: 16px;
}

.error-icon {
    font-size: 48px;
    margin-bottom: 16px;
}

.error-title {
    font-size: 24px;
    font-weight: 600;
    color: #dc2626;
    margin-bottom: 8px;
}

.theme-dark {
    background: #1a1a1a;
    color: #e0e0e0;
}

.theme-dark .sidebar {
    background: #2d2d2d;
    border-color: #404040;
}

.theme-dark .main-header {
    background: #2d2d2d;
    border-color: #404040;
}

.welcome-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    text-align: center;
    padding: 60px 40px;
    color: #666;
}

.welcome-icon {
    font-size: 64px;
    margin-bottom: 24px;
    opacity: 0.8;
}

.welcome-title {
    font-size: 28px;
    font-weight: 600;
    color: #202124;
    margin-bottom: 12px;
}

.welcome-description {
    font-size: 16px;
    color: #666;
    max-width: 400px;
    line-height: 1.5;
}

/* Estilos para el indicador PWA */
.pwa-status-indicator {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    font-size: 12px;
    cursor: pointer;
    transition: all 0.3s ease;
}

.pwa-status-indicator:hover {
    background: rgba(255, 255, 255, 0.2);
}

.pwa-status-indicator.online {
    background: rgba(76, 175, 80, 0.1);
    border-color: rgba(76, 175, 80, 0.3);
    color: #4caf50;
}

.pwa-status-indicator.offline {
    background: rgba(255, 152, 0, 0.1);
    border-color: rgba(255, 152, 0, 0.3);
    color: #ff9800;
}

.pwa-status-indicator.syncing {
    background: rgba(33, 150, 243, 0.1);
    border-color: rgba(33, 150, 243, 0.3);
    color: #2196f3;
}

.status-icon {
    font-size: 14px;
    line-height: 1;
}

.status-text {
    font-weight: 500;
    white-space: nowrap;
}

.pending-sync {
    background: #ff5722;
    color: white;
    border-radius: 10px;
    padding: 2px 6px;
    font-size: 10px;
    font-weight: 600;
    min-width: 16px;
    text-align: center;
    animation: pulse 2s infinite;
}

@keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.6; }
    100% { opacity: 1; }
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

/* Responsive para móviles */
@media (max-width: 768px) {
    .pwa-status-indicator .status-text {
        display: none;
    }
    
    .pwa-status-indicator {
        padding: 4px 6px;
    }
}
`;

// Agregar estilos adicionales
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
    framework = new ModularFramework();
    
    // Hacer disponible globalmente para debugging
    window.Framework = framework;
    
    console.log('🎯 Framework Modular listo para usar (WordPress)');
});
