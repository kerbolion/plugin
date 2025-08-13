// ===== ASSISTANT MODULE (WordPress Version) =====
class AssistantModule {
    constructor(framework) {
        this.framework = framework;
        this.api = framework.getFrameworkAPI();
        
        // Variables de estado del chat contextual
        this.currentModule = null;
        this.selectedScenarios = new Set();
        this.selectedProjects = new Set();
        this.selectedFolders = new Set();
        
        // Configuración de IA
        this.aiConfig = {
            apiKey: '',
            model: 'gpt-5-mini',
            maxTokens: 1000,
            temperature: 0.7,
            historyLimit: 10
        };
        
        this.aiStats = {
            todayQueries: 0,
            totalTokens: 0,
            estimatedCost: 0,
            usageHistory: [],
            currentModel: 'GPT-5 Mini',
            lastResetDate: new Date().toDateString()
        };
        
        this.modelPricing = {
            'gpt-5-nano': { input: 0.00005, output: 0.0004 },
            'gpt-5-mini': { input: 0.00025, output: 0.002 },
            'gpt-5': { input: 0.00125, output: 0.01 }
        };
        
        // Mensajes del chat
        this.mensajes = [];
        
        // Datos de los módulos para contexto
        this.appData = {};
        
        // Inicializar
        this.init();
    }
    
    // ===== FUNCIONES GLOBALES =====
    exposeGlobalFunctions() {
        window.assistantModule = {
            // Selección de módulos
            selectModule: (module) => this.selectModule(module),
            
            // Selección de contexto
            toggleSelection: (btn) => this.toggleSelection(btn),
            toggleAllSelection: (type) => this.toggleAllSelection(type),
            
            // Chat
            sendMessage: () => this.sendMessage(),
            
            // Configuración
            showAIConfigModal: () => this.showAIConfigModal(),
            hideAIConfigModal: () => this.hideAIConfigModal(),
            saveAIConfig: () => this.saveAIConfig(),
            
            // Configuración de Prompts
            showPromptConfigModal: () => this.showPromptConfigModal(),
            hidePromptConfigModal: () => this.hidePromptConfigModal(),
            savePromptConfig: () => this.savePromptConfig(),
            loadPromptForContext: (contextId) => this.loadPromptForContext(contextId),
            resetPromptToDefault: (contextId) => this.resetPromptToDefault(contextId),
            
            // Estadísticas
            showAIStatsModal: () => this.showAIStatsModal(),
            hideAIStatsModal: () => this.hideAIStatsModal(),
            exportStats: () => this.exportStats(),
            clearStats: () => this.clearStats()
        };
    }
    
    // ===== INICIALIZACIÓN =====
    async init() {
        // Exponer funciones globalmente PRIMERO
        this.exposeGlobalFunctions();
        
        // Cargar datos desde WordPress
        await this.loadData();
        await this.loadAIConfig();
        await this.loadMessages();
        
        await this.loadInterface();
        this.setupEventListeners();
        
        // Mostrar mensaje de bienvenida
        setTimeout(() => {
            this.showWelcomeMessage();
        }, 1000);
    }
    
    async loadData() {
        try {
            const savedData = await this.api.getModuleData('assistant');
            
            this.data = {
                contexts: savedData.contexts || {
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
                currentContext: savedData.currentContext || 'general'
            };
        } catch (error) {
            console.error('Error cargando datos del módulo assistant:', error);
            // Datos por defecto si hay error
            this.data = {
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
                        description: 'Especializado en organización de notas y gestión del conocimiento',
                        systemPrompt: 'Eres un asistente especializado en organización de notas y gestión del conocimiento. Ayuda al usuario a estructurar, categorizar y encontrar información.'
                    }
                },
                currentContext: 'general'
            };
        }
    }
    
    async saveData() {
        await this.api.saveModuleData('assistant', this.data);
    }
    
    async loadAIConfig() {
        try {
            const savedConfig = await this.api.getModuleData('assistant_aiConfig');
            const savedStats = await this.api.getModuleData('assistant_aiStats');
            
            if (savedConfig && Object.keys(savedConfig).length > 0) {
                this.aiConfig = { ...this.aiConfig, ...savedConfig };
            }
            
            if (savedStats && Object.keys(savedStats).length > 0) {
                if (savedStats.lastResetDate !== new Date().toDateString()) {
                    savedStats.todayQueries = 0;
                    savedStats.lastResetDate = new Date().toDateString();
                }
                this.aiStats = { ...this.aiStats, ...savedStats };
            }
        } catch (error) {
            console.error('Error cargando configuración de IA:', error);
        }
    }
    
    async saveAIConfigData() {
        try {
            await this.api.saveModuleData('assistant_aiConfig', this.aiConfig);
            await this.api.saveModuleData('assistant_aiStats', this.aiStats);
        } catch (error) {
            console.error('Error guardando configuración de IA:', error);
        }
    }
    
    async loadMessages() {
        try {
            const savedMessages = await this.api.getModuleData('assistant_messages');
            if (Array.isArray(savedMessages)) {
                this.mensajes = savedMessages;
            }
        } catch (error) {
            console.error('Error cargando mensajes del asistente:', error);
            this.mensajes = [];
        }
    }
    
    async saveMessages() {
        try {
            await this.api.saveModuleData('assistant_messages', this.mensajes);
        } catch (error) {
            console.error('Error guardando mensajes del asistente:', error);
        }
    }
    
    // ===== INTERFAZ =====
    async loadInterface() {
        this.setupModuleNavigation();
        this.setupModuleActions();
        await this.setupModuleContainer();
    }
    
    setupModuleNavigation() {
        const navigationHTML = `
            <div class="nav-section">
                <div class="nav-section-title">Configuración</div>
                <div class="nav-item" id="configAIBtn">
                    <div class="nav-item-icon">⚙️</div>
                    <div class="nav-item-text">Configurar IA</div>
                </div>
                <div class="nav-item" id="promptConfigBtn">
                    <div class="nav-item-icon">🦾</div>
                    <div class="nav-item-text">Prompt</div>
                </div>
                <div class="nav-item" id="statsAIBtn">
                    <div class="nav-item-icon">📊</div>
                    <div class="nav-item-text">Estadísticas</div>
                </div>
            </div>
        `;
        
        this.api.updateModuleNavigation(navigationHTML);
        
        // Configurar event listeners después de crear el HTML
        setTimeout(() => {
            this.setupNavigationListeners();
        }, 100);
    }
    
    setupNavigationListeners() {
        // Event listeners para botones específicos
        const configAIBtn = document.getElementById('configAIBtn');
        if (configAIBtn) {
            configAIBtn.addEventListener('click', () => this.showAIConfigModal());
        }
        
        const promptConfigBtn = document.getElementById('promptConfigBtn');
        if (promptConfigBtn) {
            promptConfigBtn.addEventListener('click', () => this.showPromptConfigModal());
        }
        
        const statsAIBtn = document.getElementById('statsAIBtn');
        if (statsAIBtn) {
            statsAIBtn.addEventListener('click', () => this.showAIStatsModal());
        }
    }
    
    setupModuleActions() {
        const actionsHTML = `
            <button class="header-btn" id="clearChatBtn">
                <span>🗑️</span>
                Limpiar Chat
            </button>
        `;
        
        this.api.updateModuleActions(actionsHTML);
        
        // Configurar event listeners después de crear el HTML
        setTimeout(() => {
            this.setupActionsListeners();
        }, 100);
    }
    
    setupActionsListeners() {
        const clearChatBtn = document.getElementById('clearChatBtn');
        if (clearChatBtn) {
            clearChatBtn.addEventListener('click', () => this.clearChat());
        }
    }
    
    async setupModuleContainer() {
        const containerHTML = `
            <div class="chat-container">
                <div class="header">
                    <h1>🤖 Chat IA Contextual</h1>
                    <p>Selecciona el contexto específico para tu conversación</p>
                </div>

                <div class="context-selector">
                    <div class="module-buttons">
                        <button class="module-btn" data-module="general" onclick="window.assistantModule.selectModule('general')">🤖 General</button>
                        <button class="module-btn" data-module="tasks" onclick="window.assistantModule.selectModule('tasks')">📋 Tasks</button>
                        <button class="module-btn" data-module="notes" onclick="window.assistantModule.selectModule('notes')">📝 Notes</button>
                    </div>

                    <div class="context-sections">
                        <!-- Sección de Escenarios -->
                        <div class="context-section" id="scenarios-section">
                            <div class="section-title">Escenarios</div>
                            <div class="option-buttons" id="scenarios-buttons">
                                <button class="option-btn all" data-type="scenarios" data-value="all" onclick="window.assistantModule.toggleAllSelection('scenarios')">Todos</button>
                            </div>
                        </div>

                        <!-- Sección de Proyectos (solo para tasks) -->
                        <div class="context-section hidden" id="projects-section">
                            <div class="section-title">Proyectos</div>
                            <div class="option-buttons" id="projects-buttons">
                                <button class="option-btn all" data-type="projects" data-value="all" onclick="window.assistantModule.toggleAllSelection('projects')">Todos</button>
                                <button class="option-btn" data-type="projects" data-value="none" onclick="window.assistantModule.toggleSelection(this)">Sin proyecto</button>
                            </div>
                        </div>

                        <!-- Sección de Carpetas (solo para notes) -->
                        <div class="context-section hidden" id="folders-section">
                            <div class="section-title">Carpetas</div>
                            <div class="option-buttons" id="folders-buttons">
                                <button class="option-btn all" data-type="folders" data-value="all" onclick="window.assistantModule.toggleAllSelection('folders')">Todas</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="chat-area">
                    <div class="messages" id="messages">
                        <div class="message ai-message">
                            ¡Hola! Soy tu asistente IA. Selecciona el módulo y contexto específico arriba para que pueda ayudarte mejor. 
                            Puedes elegir entre Tasks o Notes, y luego seleccionar escenarios y proyectos/carpetas específicos.
                        </div>
                    </div>
                </div>

                <div class="input-area">
                    <div class="input-container">
                        <textarea class="message-input" id="messageInput" placeholder="Escribe tu mensaje aquí..." rows="3"></textarea>
                        <button class="send-btn" id="sendBtn" onclick="window.assistantModule.sendMessage()">Enviar</button>
                    </div>
                </div>
            </div>

            ${this.getModalsHTML()}
        `;
        
        this.api.updateModuleContainer(containerHTML);
        
        // Cargar datos de los módulos ANTES de configurar event listeners
        await this.loadAppData();
        
        // Configurar event listeners después de cargar datos
        setTimeout(() => {
            this.setupContextEventListeners();
        }, 500);
        
        // Renderizar mensajes existentes
        this.renderMessages();
    }
    
    getModalsHTML() {
        return `
            <!-- Modal de Configuración de IA -->
            <div class="modal" id="aiConfigModal">
                <div class="modal-content" style="max-width: 600px;">
                    <div class="modal-header">
                        <h2 class="modal-title">⚙️ Configuración de IA</h2>
                        <button class="modal-close" onclick="window.assistantModule.hideAIConfigModal()">×</button>
                    </div>

                    <div class="warning-box" id="costWarning" style="display: none;">
                        <h4>⚠️ Advertencia de Costos</h4>
                        <p>El modelo GPT-4 es considerablemente más caro. Se recomienda usar GPT-3.5-turbo para reducir costos en un 90%.</p>
                    </div>

                    <div class="config-grid">
                        <div class="config-item full-width">
                            <label class="form-label">🔑 API Key de OpenAI</label>
                            <input type="password" class="form-input" id="aiApiKey" placeholder="sk-..." value="">
                            <small style="color: #666; font-size: 12px;">Tu API key se guarda localmente y nunca se comparte</small>
                        </div>

                        <div class="config-item">
                            <label class="form-label">🤖 Modelo de IA</label>
                            <select class="form-select" id="aiModel">
                                <option value="gpt-5-nano">GPT-5 Nano (Económico)</option>
                                <option value="gpt-5-mini">GPT-5 Mini (Recomendado)</option>
                                <option value="gpt-5">GPT-5 (Más potente)</option>
                            </select>
                        </div>

                        <div class="config-item">
                            <label class="form-label">📏 Máx. tokens respuesta</label>
                            <div class="slider-container">
                                <input type="range" class="slider" id="maxTokens" min="100" max="128000" value="1000" step="1000">
                                <div class="slider-value" id="maxTokensValue">1000</div>
                            </div>
                        </div>

                        <div class="config-item">
                            <label class="form-label">🎯 Temperatura (creatividad)</label>
                            <div class="slider-container">
                                <input type="range" class="slider" id="temperature" min="0" max="2" value="0.7" step="0.1">
                                <div class="slider-value" id="temperatureValue">0.7</div>
                            </div>
                        </div>

                        <div class="config-item">
                            <label class="form-label">💭 Límite historial mensajes</label>
                            <div class="slider-container">
                                <input type="range" class="slider" id="historyLimit" min="5" max="50" value="10" step="5">
                                <div class="slider-value" id="historyLimitValue">10</div>
                            </div>
                        </div>

                        <div class="config-item full-width">
                            <div class="cost-indicator">
                                <h4>💰 Costo estimado por consulta</h4>
                                <div class="cost-value" id="costEstimate">~$0.01</div>
                            </div>
                        </div>
                    </div>

                    <div class="form-group" style="margin-top: 20px;">
                        <button class="btn btn-primary" onclick="window.assistantModule.saveAIConfig()" style="width: 100%;">Guardar Configuración</button>
                    </div>
                </div>
            </div>

            <!-- Modal de Configuración de Prompts -->
            <div class="modal" id="promptConfigModal">
                <div class="modal-content" style="max-width: 800px;">
                    <div class="modal-header">
                        <h2 class="modal-title">🦾 Configuración de Prompts</h2>
                        <button class="modal-close" onclick="window.assistantModule.hidePromptConfigModal()">×</button>
                    </div>

                    <div class="info-box" style="background: #e3f2fd; border: 1px solid #2196f3; border-radius: 6px; padding: 12px; margin-bottom: 20px;">
                        <h4 style="margin: 0 0 8px 0; color: #1976d2;">💡 Personaliza tu Asistente</h4>
                        <p style="margin: 0; font-size: 14px; color: #1565c0;">
                            Configura prompts personalizados para cada contexto. Esto permite que la IA se comporte de manera específica según tus necesidades.
                        </p>
                    </div>

                    <div class="form-group">
                        <label class="form-label">🎯 Seleccionar Contexto</label>
                        <select class="form-select" id="promptContextSelect" onchange="window.assistantModule.loadPromptForContext(this.value)">
                            <option value="general">🤖 General</option>
                            <option value="tasks">📋 Tareas</option>
                            <option value="notes">📝 Notas</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <label class="form-label">📝 Prompt del Sistema</label>
                            <button class="btn btn-secondary" onclick="window.assistantModule.resetPromptToDefault(document.getElementById('promptContextSelect').value)" style="padding: 4px 8px; font-size: 12px;">
                                🔄 Restaurar por defecto
                            </button>
                        </div>
                        <textarea class="form-textarea" id="systemPromptInput" rows="8" placeholder="Escribe aquí el prompt personalizado para este contexto..."></textarea>
                        <small style="color: #666; font-size: 12px; margin-top: 4px; display: block;">
                            Define cómo debe comportarse la IA en este contexto específico. Sé claro y específico sobre el rol y las capacidades que deseas.
                        </small>
                    </div>

                    <div class="form-group">
                        <h4 style="margin-bottom: 8px;">📋 Ejemplos de Prompts</h4>
                        <div class="prompt-examples" style="background: #f8f9fa; border-radius: 6px; padding: 12px; font-size: 13px;">
                            <div class="example-item" style="margin-bottom: 8px;">
                                <strong>Para Tareas:</strong> "Eres un asistente especializado en productividad. Ayuda a organizar tareas, establecer prioridades y crear planes de trabajo eficientes."
                            </div>
                            <div class="example-item" style="margin-bottom: 8px;">
                                <strong>Para Notas:</strong> "Eres un experto en organización de información. Ayuda a estructurar notas, crear resúmenes y encontrar conexiones entre ideas."
                            </div>
                            <div class="example-item">
                                <strong>Personalizado:</strong> "Eres un coach personal que motiva y guía hacia el logro de objetivos con un enfoque positivo y práctico."
                            </div>
                        </div>
                    </div>

                    <div class="form-group" style="display: flex; gap: 12px; margin-top: 20px;">
                        <button class="btn btn-primary" onclick="window.assistantModule.savePromptConfig()" style="flex: 1;">💾 Guardar Prompt</button>
                        <button class="btn btn-secondary" onclick="window.assistantModule.hidePromptConfigModal()" style="flex: 1;">❌ Cancelar</button>
                    </div>
                </div>
            </div>

            <!-- Modal de Estadísticas de IA -->
            <div class="modal" id="aiStatsModal">
                <div class="modal-content" style="max-width: 700px;">
                    <div class="modal-header">
                        <h2 class="modal-title">📊 Estadísticas de Uso de IA</h2>
                        <button class="modal-close" onclick="window.assistantModule.hideAIStatsModal()">×</button>
                    </div>

                    <div class="stats-grid">
                        <div class="stats-card">
                            <h4>Consultas Hoy</h4>
                            <div class="stats-value" id="todayQueries">0</div>
                        </div>
                        <div class="stats-card">
                            <h4>Tokens Usados</h4>
                            <div class="stats-value" id="tokensUsed">0</div>
                        </div>
                        <div class="stats-card">
                            <h4>Costo Estimado</h4>
                            <div class="stats-value" id="estimatedCost">$0.00</div>
                        </div>
                        <div class="stats-card">
                            <h4>Modelo Actual</h4>
                            <div class="stats-value" id="currentModel">GPT-4.1 nano</div>
                        </div>
                    </div>

                    <div class="form-group">
                        <h3 style="margin-bottom: 12px;">📈 Historial de Uso</h3>
                        <div style="background: #f8f9fa; border-radius: 6px; padding: 16px; max-height: 200px; overflow-y: auto;">
                            <div id="usageHistory">
                                <!-- El historial se cargará dinámicamente -->
                            </div>
                        </div>
                    </div>

                    <div class="form-group" style="display: flex; gap: 12px;">
                        <button class="btn btn-secondary" onclick="window.assistantModule.exportStats()" style="flex: 1;">📤 Exportar</button>
                        <button class="btn btn-secondary" onclick="window.assistantModule.clearStats()" style="flex: 1;">🗑️ Limpiar</button>
                    </div>
                </div>
            </div>
        `;
    }
    
    // ===== EVENT LISTENERS =====
    setupEventListeners() {
        // Configurar eventos después de que se haya cargado la interfaz
        setTimeout(() => {
            this.setupChatEventListeners();
            this.setupAIConfigListeners();
        }, 100);
    }
    
    setupChatEventListeners() {
        // Event listener para chat minimize
        const chatMinimizeBtn = document.getElementById('chatMinimizeBtn');
        if (chatMinimizeBtn) {
            chatMinimizeBtn.addEventListener('click', () => this.toggleChat());
        }
        
        // Event listener para chat input
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.enviarMensaje();
                }
            });
        }
        
        // Event listener para botón de enviar
        const chatSendBtn = document.getElementById('chatSendBtn');
        if (chatSendBtn) {
            chatSendBtn.addEventListener('click', () => this.enviarMensaje());
        }
    }
    
    setupAIConfigListeners() {
        const sliders = ['maxTokens', 'temperature', 'historyLimit'];
        sliders.forEach(sliderId => {
            const slider = document.getElementById(sliderId);
            if (slider) {
                slider.addEventListener('input', () => {
                    this.updateSliderValues();
                    this.updateCostEstimate();
                });
            }
        });

        const modelSelect = document.getElementById('aiModel');
        if (modelSelect) {
            modelSelect.addEventListener('change', () => {
                this.updateCostEstimate();
                this.updateCostWarning();
            });
        }
    }
    
    // ===== CARGA DE DATOS DE MÓDULOS =====
    async loadAppData() {
        try {
            // Cargar datos de tasks
            const tasksData = await this.api.getModuleData('tasks');
            
            // Cargar datos de notes
            const notesData = await this.api.getModuleData('notes');
            
            this.appData = {
                framework: {
                    currentModule: this.api.getCurrentModule(),
                    globalConfig: this.api.getGlobalConfig()
                },
                modules: {
                    tasks: tasksData || {
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
                    notes: notesData || {
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
                    }
                }
            };
            
            console.log('Datos de módulos cargados:', this.appData);
        } catch (error) {
            console.error('Error cargando datos de módulos:', error);
            this.appData = { modules: { tasks: {}, notes: {} } };
        }
    }
    
    // ===== GESTIÓN DE SELECCIÓN DE MÓDULOS =====
    selectModule(module) {
        this.currentModule = module;
        
        // Actualizar botones de módulo
        const moduleButtons = document.querySelectorAll('.module-btn');
        moduleButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.module === module);
        });

        // Limpiar selecciones anteriores
        this.selectedScenarios.clear();
        this.selectedProjects.clear();
        this.selectedFolders.clear();

        // Mostrar/ocultar secciones según el módulo
        const projectsSection = document.getElementById('projects-section');
        const foldersSection = document.getElementById('folders-section');
        const scenariosSection = document.getElementById('scenarios-section');
        
        if (module === 'general') {
            // Para el módulo general, ocultar todas las secciones de contexto específico
            if (projectsSection) projectsSection.classList.add('hidden');
            if (foldersSection) foldersSection.classList.add('hidden');
            if (scenariosSection) scenariosSection.classList.add('hidden');
        } else if (module === 'tasks') {
            if (scenariosSection) scenariosSection.classList.remove('hidden');
            if (projectsSection) projectsSection.classList.remove('hidden');
            if (foldersSection) foldersSection.classList.add('hidden');
        } else if (module === 'notes') {
            if (scenariosSection) scenariosSection.classList.remove('hidden');
            if (projectsSection) projectsSection.classList.add('hidden');
            if (foldersSection) foldersSection.classList.remove('hidden');
        }

        // Cargar opciones del módulo seleccionado (solo si no es general)
        if (module !== 'general') {
            this.loadScenarios(module);
            if (module === 'tasks') {
                this.loadProjects(module);
            } else if (module === 'notes') {
                this.loadFolders(module);
            }
        }
    }
    
    loadScenarios(module) {
        const scenariosButtons = document.getElementById('scenarios-buttons');
        if (!scenariosButtons) return;
        
        // Verificar que los datos del módulo existan
        if (!this.appData.modules || !this.appData.modules[module] || !this.appData.modules[module].scenarios) {
            console.warn(`No hay datos disponibles para el módulo ${module}`);
            return;
        }
        
        const scenarios = this.appData.modules[module].scenarios;
        
        // Limpiar botones existentes excepto "Todos"
        const allButton = scenariosButtons.querySelector('.all');
        scenariosButtons.innerHTML = '';
        if (allButton) scenariosButtons.appendChild(allButton);
        
        // Agregar botones de escenarios
        Object.values(scenarios).forEach(scenario => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.textContent = `${scenario.icon} ${scenario.name}`;
            btn.dataset.type = 'scenarios';
            btn.dataset.value = scenario.id;
            btn.addEventListener('click', () => this.toggleSelection(btn));
            scenariosButtons.appendChild(btn);
        });
    }
    
    loadProjects(module) {
        const projectsButtons = document.getElementById('projects-buttons');
        if (!projectsButtons || !this.appData.modules[module]) return;
        
        const scenarios = this.appData.modules[module].scenarios || {};
        
        // Obtener todos los proyectos únicos
        const projectsMap = new Map();
        Object.values(scenarios).forEach(scenario => {
            if (scenario.data && scenario.data.projects) {
                scenario.data.projects.forEach(project => {
                    projectsMap.set(project.id, project);
                });
            }
        });
        
        // Limpiar y recrear botones (mantener "Todos" y "Sin proyecto")
        const existingButtons = Array.from(projectsButtons.children);
        existingButtons.slice(2).forEach(btn => btn.remove());
        
        // Agregar botones de proyectos
        projectsMap.forEach(project => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.textContent = project.name;
            btn.style.borderLeft = `4px solid ${project.color}`;
            btn.dataset.type = 'projects';
            btn.dataset.value = project.id;
            btn.addEventListener('click', () => this.toggleSelection(btn));
            projectsButtons.appendChild(btn);
        });
    }
    
    loadFolders(module) {
        const foldersButtons = document.getElementById('folders-buttons');
        if (!foldersButtons || !this.appData.modules[module]) return;
        
        const scenarios = this.appData.modules[module].scenarios || {};
        
        // Obtener todas las carpetas únicas
        const foldersMap = new Map();
        Object.values(scenarios).forEach(scenario => {
            if (scenario.data && scenario.data.folders) {
                scenario.data.folders.forEach(folder => {
                    foldersMap.set(folder.id, folder);
                });
            }
        });
        
        // Limpiar y recrear botones
        const allButton = foldersButtons.querySelector('.all');
        foldersButtons.innerHTML = '';
        if (allButton) foldersButtons.appendChild(allButton);
        
        // Agregar botones de carpetas
        foldersMap.forEach(folder => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.textContent = folder.name;
            btn.style.borderLeft = `4px solid ${folder.color}`;
            btn.dataset.type = 'folders';
            btn.dataset.value = folder.id;
            btn.addEventListener('click', () => this.toggleSelection(btn));
            foldersButtons.appendChild(btn);
        });
    }
    
    // ===== GESTIÓN DE SELECCIONES =====
    toggleSelection(btn) {
        const type = btn.dataset.type;
        const value = btn.dataset.value;
        
        if (type === 'scenarios') {
            if (this.selectedScenarios.has(value)) {
                this.selectedScenarios.delete(value);
                btn.classList.remove('selected');
            } else {
                this.selectedScenarios.add(value);
                btn.classList.add('selected');
            }
        } else if (type === 'projects') {
            if (this.selectedProjects.has(value)) {
                this.selectedProjects.delete(value);
                btn.classList.remove('selected');
            } else {
                this.selectedProjects.add(value);
                btn.classList.add('selected');
            }
        } else if (type === 'folders') {
            if (this.selectedFolders.has(value)) {
                this.selectedFolders.delete(value);
                btn.classList.remove('selected');
            } else {
                this.selectedFolders.add(value);
                btn.classList.add('selected');
            }
        }
    }
    
    toggleAllSelection(type) {
        const buttons = document.querySelectorAll(`[data-type="${type}"]:not(.all)`);
        
        if (type === 'scenarios') {
            if (this.selectedScenarios.size === buttons.length) {
                this.selectedScenarios.clear();
                buttons.forEach(btn => btn.classList.remove('selected'));
            } else {
                this.selectedScenarios.clear();
                buttons.forEach(btn => {
                    this.selectedScenarios.add(btn.dataset.value);
                    btn.classList.add('selected');
                });
            }
        } else if (type === 'projects') {
            if (this.selectedProjects.size === buttons.length) {
                this.selectedProjects.clear();
                buttons.forEach(btn => btn.classList.remove('selected'));
            } else {
                this.selectedProjects.clear();
                buttons.forEach(btn => {
                    this.selectedProjects.add(btn.dataset.value);
                    btn.classList.add('selected');
                });
            }
        } else if (type === 'folders') {
            if (this.selectedFolders.size === buttons.length) {
                this.selectedFolders.clear();
                buttons.forEach(btn => btn.classList.remove('selected'));
            } else {
                this.selectedFolders.clear();
                buttons.forEach(btn => {
                    this.selectedFolders.add(btn.dataset.value);
                    btn.classList.add('selected');
                });
            }
        }
    }
    
    // ===== CONSTRUCCIÓN DE CONTEXTO =====
    buildContext() {
        if (!this.currentModule) return null;
        
        const context = {
            module: this.currentModule,
            scenarios: Array.from(this.selectedScenarios),
            data: {}
        };
        
        // Para el módulo general, incluir todos los datos de todos los módulos
        if (this.currentModule === 'general') {
            context.data = this.appData.modules || {};
            return context;
        }
        
        // Para módulos específicos (tasks, notes)
        if (this.currentModule === 'tasks') {
            context.projects = Array.from(this.selectedProjects);
        } else if (this.currentModule === 'notes') {
            context.folders = Array.from(this.selectedFolders);
        }
        
        // Extraer datos relevantes según la selección
        const moduleData = this.appData.modules[this.currentModule];
        
        if (!moduleData) {
            console.warn(`No hay datos disponibles para el módulo ${this.currentModule}`);
            return context;
        }
        
        if (this.selectedScenarios.size > 0) {
            this.selectedScenarios.forEach(scenarioId => {
                if (moduleData.scenarios && moduleData.scenarios[scenarioId]) {
                    context.data[scenarioId] = moduleData.scenarios[scenarioId];
                }
            });
        } else {
            // Si no hay escenarios seleccionados, incluir todos
            context.data = moduleData.scenarios || {};
        }
        
        return context;
    }
    
    // ===== EVENT LISTENERS PARA CONTEXTO =====
    setupContextEventListeners() {
        // Event listener para input de mensaje
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    if (e.shiftKey) {
                        // Shift+Enter permite salto de línea (comportamiento por defecto)
                        return;
                    } else {
                        // Enter solo envía el mensaje
                        e.preventDefault();
                        this.sendMessage();
                    }
                }
            });
            
            // Auto-resize del textarea
            messageInput.addEventListener('input', () => {
                messageInput.style.height = 'auto';
                messageInput.style.height = Math.min(messageInput.scrollHeight, 150) + 'px';
            });
        }
        
        // Inicializar con módulo por defecto
        this.selectModule('tasks');
    }
    
    // ===== CHAT =====
    toggleChat() {
        const chatContainer = document.getElementById('chat-container');
        const toggleBtn = document.getElementById('toggleChatBtn');
        const chatMinimizeBtn = document.getElementById('chatMinimizeBtn');
        
        if (!chatContainer) return;
        
        this.isMinimized = !this.isMinimized;
        
        if (this.isMinimized) {
            chatContainer.classList.add('minimized');
            if (chatMinimizeBtn) chatMinimizeBtn.textContent = '+';
            if (toggleBtn) toggleBtn.innerHTML = '<span>💬</span>Mostrar Chat';
        } else {
            chatContainer.classList.remove('minimized');
            if (chatMinimizeBtn) chatMinimizeBtn.textContent = '−';
            if (toggleBtn) toggleBtn.innerHTML = '<span>💬</span>Minimizar Chat';
        }
    }
    
    clearChat() {
        if (confirm('¿Estás seguro de que quieres limpiar todo el historial del chat?')) {
            this.mensajes = [];
            this.saveMessages();
            this.renderMessages();
            this.api.showMessage('🗑️ Historial del chat limpiado');
        }
    }
    
    // ===== NUEVO SISTEMA DE MENSAJES =====
    sendMessage() {
        const input = document.getElementById('messageInput');
        if (!input) return;
        
        const message = input.value.trim();
        if (!message) return;
        
        const context = this.buildContext();
        
        // Agregar mensaje del usuario
        this.addMessage(message, 'user');
        
        // Limpiar completamente el textarea
        input.value = '';
        input.style.height = 'auto'; // Reset height for auto-resize
        
        // Agregar indicador "Escribiendo..." inmediatamente
        const loadingMessageId = this.addLoadingMessage();
        
        // Simular respuesta de la IA
        setTimeout(async () => {
            try {
                let aiResponse = '';
                
                if (context) {
                    if (context.module === 'tasks') {
                        aiResponse += `📋 **Tasks**\n`;
                        aiResponse += `Escenarios: ${context.scenarios.length > 0 ? context.scenarios.join(', ') : 'Todos'}\n`;
                        aiResponse += `Proyectos: ${context.projects.length > 0 ? context.projects.join(', ') : 'Todos'}\n\n`;
                        aiResponse += `He recibido el contexto con ${Object.keys(context.data).length} escenario(s) de tareas. ¿En qué puedo ayudarte específicamente?`;
                    } else if (context.module === 'notes') {
                        aiResponse += `📝 **Notes**\n`;
                        aiResponse += `Escenarios: ${context.scenarios.length > 0 ? context.scenarios.join(', ') : 'Todos'}\n`;
                        aiResponse += `Carpetas: ${context.folders.length > 0 ? context.folders.join(', ') : 'Todas'}\n\n`;
                        aiResponse += `He recibido el contexto con ${Object.keys(context.data).length} escenario(s) de notas. ¿En qué puedo ayudarte específicamente?`;
                    }
                } else {
                    aiResponse = "Por favor, selecciona un módulo (Tasks o Notes) y el contexto específico para poder ayudarte mejor.";
                }
                
                // Si hay API key configurada, usar la IA real
                if (this.aiConfig.apiKey && context) {
                    const realResponse = await this.consultarIAConContexto(message, context);
                    aiResponse = realResponse;
                }
                
                // Remover el mensaje de carga y agregar la respuesta real
                this.removeLoadingMessage(loadingMessageId);
                this.addMessage(aiResponse, 'ai');
                
                // Mostrar contexto JSON en consola para desarrollo
                if (context) {
                    console.log('Contexto enviado a la IA:', JSON.stringify(context, null, 2));
                }
            } catch (error) {
                // Remover el mensaje de carga en caso de error
                this.removeLoadingMessage(loadingMessageId);
                this.addMessage('❌ Error al procesar tu mensaje: ' + error.message, 'ai');
            }
        }, 1000);
    }
    
    addMessage(text, sender) {
        const messagesContainer = document.getElementById('messages');
        if (!messagesContainer) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        // Verificar si marked está disponible para markdown
        let html;
        if (typeof marked !== 'undefined') {
            html = marked.parse ? marked.parse(text) : marked(text);
        } else {
            // Fallback simple sin marked.js
            html = text.replace(/\n/g, '<br>');
        }
        
        // Crear contenedor para el mensaje con opciones
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.innerHTML = html;
        
        // Crear botones de acción
        const messageActions = document.createElement('div');
        messageActions.className = 'message-actions';
        
        // Botón copiar
        const copyBtn = document.createElement('button');
        copyBtn.className = 'message-action-btn copy-btn';
        copyBtn.innerHTML = '📋';
        copyBtn.title = 'Copiar mensaje';
        copyBtn.addEventListener('click', () => this.copyMessage(text));
        
        // Botón eliminar
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'message-action-btn delete-btn';
        deleteBtn.innerHTML = '🗑️';
        deleteBtn.title = 'Eliminar mensaje';
        deleteBtn.addEventListener('click', () => this.deleteMessage(messageDiv, text));
        
        messageActions.appendChild(copyBtn);
        messageActions.appendChild(deleteBtn);
        
        messageDiv.appendChild(messageContent);
        messageDiv.appendChild(messageActions);
        
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Guardar mensaje
        this.mensajes.push({
            role: sender === 'user' ? 'user' : 'assistant',
            content: text,
            timestamp: new Date().toISOString(),
            context: this.currentModule || 'general'
        });
        this.cleanHistory();
        this.saveMessages();
    }
    
    renderMessages() {
        const container = document.getElementById('messages');
        if (!container) return;
        
        // Limpiar mensajes existentes excepto el mensaje de bienvenida
        const welcomeMessage = container.querySelector('.ai-message');
        container.innerHTML = '';
        if (welcomeMessage) {
            container.appendChild(welcomeMessage);
        }
        
        this.mensajes.forEach(mensaje => {
            this.addMessage(mensaje.content, mensaje.role === 'user' ? 'user' : 'ai');
        });
        
        container.scrollTop = container.scrollHeight;
    }
    
    async consultarIAConContexto(pregunta, context) {
        if (!this.aiConfig.apiKey) {
            return '🔑 **Error:** No has configurado tu API Key de OpenAI. Ve a Configurar IA en el sidebar.';
        }

        // Obtener fecha y hora actual del navegador
        const now = new Date();
        const currentDateTime = {
            fecha: now.toLocaleDateString('es-ES', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            }),
            hora: now.toLocaleTimeString('es-ES', { 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit' 
            }),
            timestamp: now.toISOString()
        };

        // Crear prompt con contexto y funciones
        let systemPrompt = '';
        
        if (context.module === 'general') {
            // Para el módulo general, usar el prompt personalizado y dar acceso a toda la base de datos
            const generalContext = this.data.contexts.general;
            systemPrompt = generalContext.systemPrompt || 'Eres un asistente útil y amigable. Ayuda al usuario con cualquier consulta de manera clara y concisa.';
            systemPrompt += ` FECHA Y HORA ACTUAL: ${currentDateTime.fecha} a las ${currentDateTime.hora} (${currentDateTime.timestamp}). `;
            systemPrompt += `Tienes acceso completo a toda la base de datos del usuario, incluyendo tareas y notas de todos los módulos. `;
            systemPrompt += `\n\nDatos completos disponibles:\n${JSON.stringify(this.appData.modules, null, 2)}`;
            systemPrompt += `\n\nPuedes consultar, agregar, editar o eliminar cualquier elemento de cualquier módulo. `;
            systemPrompt += `Siempre incluye los IDs cuando muestres elementos para que el usuario pueda referenciarlos. `;
            systemPrompt += `Sé conciso y directo en tus respuestas para optimizar costos.`;
        } else {
            // Para módulos específicos, usar el comportamiento original
            const contextData = this.data.contexts[context.module];
            const basePrompt = contextData ? contextData.systemPrompt : 
                (context.module === 'tasks' ? 'Eres un asistente especializado en gestión de tareas y productividad.' : 'Eres un asistente especializado en organización de notas y gestión del conocimiento.');
            
            systemPrompt = basePrompt + ` `;
            systemPrompt += `FECHA Y HORA ACTUAL: ${currentDateTime.fecha} a las ${currentDateTime.hora} (${currentDateTime.timestamp}). `;
            systemPrompt += `El usuario ha seleccionado trabajar con el módulo ${context.module} `;
            
            if (context.scenarios.length > 0) {
                systemPrompt += `en los escenarios: ${context.scenarios.join(', ')} `;
            }
            
            if (context.module === 'tasks' && context.projects.length > 0) {
                systemPrompt += `y los proyectos: ${context.projects.join(', ')} `;
            } else if (context.module === 'notes' && context.folders.length > 0) {
                systemPrompt += `y las carpetas: ${context.folders.join(', ')} `;
            }
            
            systemPrompt += `\n\nDatos del contexto:\n${JSON.stringify(context.data, null, 2)}`;
            
            if (context.module === 'tasks') {
                systemPrompt += `\n\nPuedes agregar, editar, eliminar múltiples tareas en una sola consulta. `;
                systemPrompt += `Cada tarea tiene un ID único. Para editar o eliminar, usa el ID de la tarea específica. `;
                systemPrompt += `Cuando muestres las tareas al usuario, siempre incluye su ID para referencia. `;
                systemPrompt += `Puedes realizar operaciones en lote como 'eliminar tareas 1, 2, 3' o 'marcar como completadas las tareas 4, 5, 6'. `;
                systemPrompt += `IMPORTANTE: Cuando el usuario mencione un proyecto, usa el nombre exacto del proyecto que existe en la lista. `;
                systemPrompt += `Sé conciso y directo en tus respuestas para optimizar costos.`;
            } else {
                systemPrompt += `\n\nAyuda al usuario con consultas específicas sobre estos datos. Sé conciso y directo.`;
            }
        }

        // Preparar mensajes para la API
        const mensajesParaAPI = this.mensajes
            .filter(m => m.context === this.currentModule)
            .slice(-this.aiConfig.historyLimit)
            .map(m => ({ role: m.role, content: m.content }));

        const mensajesAPI = [
            { role: 'system', content: systemPrompt },
            ...mensajesParaAPI,
            { role: 'user', content: pregunta }
        ];

        // Agregar funciones solo para el módulo de tasks
        const requestBody = {
            model: this.aiConfig.model,
            messages: mensajesAPI
        };
        
        // Usar max_completion_tokens para modelos GPT-5, max_tokens para otros
        if (this.aiConfig.model.startsWith('gpt-5')) {
            requestBody.max_completion_tokens = this.aiConfig.maxTokens;
            // Los modelos GPT-5 solo soportan temperature = 1 (valor por defecto)
            requestBody.temperature = 1;
        } else {
            requestBody.max_tokens = this.aiConfig.maxTokens;
            requestBody.temperature = this.aiConfig.temperature;
        }

        // Agregar función genérica para manipular datos (disponible para todos los módulos)
        requestBody.functions = this.getDataManipulationFunctions();

        try {
            const startTime = Date.now();
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.aiConfig.apiKey}`
                },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();
            const endTime = Date.now();

            if (!response.ok) {
                console.error('Error en la API:', data);
                return '❌ **Error API:** ' + (data.error ? data.error.message : `Estado ${response.status}`);
            }

            // Actualizar estadísticas
            if (data.usage) {
                const { prompt_tokens, completion_tokens, total_tokens } = data.usage;
                const pricing = this.modelPricing[this.aiConfig.model];
                const cost = (prompt_tokens * pricing.input / 1000) + (completion_tokens * pricing.output / 1000);
                
                this.aiStats.todayQueries++;
                this.aiStats.totalTokens += total_tokens;
                this.aiStats.estimatedCost += cost;
                this.aiStats.usageHistory.push({
                    timestamp: new Date().toLocaleTimeString(),
                    model: this.aiConfig.model,
                    tokens: total_tokens,
                    cost: cost,
                    responseTime: endTime - startTime
                });
                
                await this.saveAIConfigData();
            }

            if (data.choices && data.choices.length > 0) {
                const msg = data.choices[0].message;
                
                // Verificar si hay function_call
                if (msg.hasOwnProperty('function_call')) {
                    const nombreFuncion = msg.function_call.name;
                    const args = JSON.parse(msg.function_call.arguments);
                    let resultado;
                    
                    switch(nombreFuncion) {
                        case 'manipularDatos':
                            resultado = await this.manipularDatos(args, context);
                            break;
                        default:
                            resultado = '❌ Función no reconocida.';
                    }

                    // Hacer una segunda llamada para obtener la respuesta final
                    const finalRequestBody = {
                        model: this.aiConfig.model,
                        messages: [
                            { role: 'system', content: systemPrompt + " Responde de forma muy concisa." },
                            ...mensajesParaAPI.slice(-3),
                            { role: 'user', content: pregunta },
                            { role: 'function', name: nombreFuncion, content: resultado }
                        ]
                    };
                    
                    // Usar max_completion_tokens para modelos GPT-5, max_tokens para otros
                    if (this.aiConfig.model.startsWith('gpt-5')) {
                        finalRequestBody.max_completion_tokens = Math.min(this.aiConfig.maxTokens, 200);
                        finalRequestBody.temperature = 1; // GPT-5 solo soporta temperature = 1
                    } else {
                        finalRequestBody.max_tokens = Math.min(this.aiConfig.maxTokens, 200);
                        finalRequestBody.temperature = 0.3;
                    }
                    
                    const finalResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${this.aiConfig.apiKey}`
                        },
                        body: JSON.stringify(finalRequestBody)
                    });

                    const finalData = await finalResponse.json();
                    if (finalData.choices && finalData.choices.length > 0) {
                        return finalData.choices[0].message.content;
                    }
                    
                    return resultado;
                } else {
                    return msg.content;
                }
            } else {
                return "❌ Respuesta no válida de la API.";
            }
        } catch (error) {
            console.error('Error:', error);
            return '❌ **Error de conexión:** ' + error.message;
        }
    }
    
    cleanHistory() {
        if (this.mensajes.length > this.aiConfig.historyLimit * 2) {
            const keepCount = this.aiConfig.historyLimit;
            this.mensajes = this.mensajes.slice(-keepCount);
        }
    }
    
    async enviarMensaje() {
        const input = document.getElementById('chat-input');
        if (!input) return;
        
        const mensaje = input.value.trim();
        if (!mensaje) return;
        
        this.mostrarMensajeChat(mensaje, true);
        input.value = '';
        
        const loadingMsg = document.createElement('div');
        loadingMsg.className = 'chat-message bot';
        loadingMsg.innerHTML = '<strong>AI:</strong> <em>Escribiendo...</em>';
        loadingMsg.id = 'loading-message';
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages) chatMessages.appendChild(loadingMsg);
        
        try {
            const respuesta = await this.consultarIA(mensaje);
            
            const loadingElement = document.getElementById('loading-message');
            if (loadingElement) {
                loadingElement.remove();
            }
            
            this.mostrarMensajeChat(respuesta);
        } catch (error) {
            const loadingElement = document.getElementById('loading-message');
            if (loadingElement) {
                loadingElement.remove();
            }
            
            this.mostrarMensajeChat('❌ Error al procesar tu mensaje: ' + error.message);
        }
    }
    
    async consultarIA(pregunta) {
        if (!this.aiConfig.apiKey) {
            return '🔑 **Error:** No has configurado tu API Key de OpenAI. Ve a Configurar IA en el sidebar.';
        }

        const currentContext = this.data.contexts[this.data.currentContext];
        const systemPrompt = currentContext.systemPrompt;

        // Preparar mensajes para la API
        const mensajesParaAPI = this.mensajes
            .filter(m => m.context === this.data.currentContext)
            .slice(-this.aiConfig.historyLimit)
            .map(m => ({ role: m.role, content: m.content }));

        const mensajesAPI = [
            { role: 'system', content: systemPrompt },
            ...mensajesParaAPI,
            { role: 'user', content: pregunta }
        ];

        try {
            const startTime = Date.now();
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.aiConfig.apiKey}`
                },
                body: JSON.stringify({
                    model: this.aiConfig.model,
                    messages: mensajesAPI,
                    max_tokens: this.aiConfig.maxTokens,
                    temperature: this.aiConfig.temperature
                })
            });

            const data = await response.json();
            const endTime = Date.now();

            if (!response.ok) {
                console.error('Error en la API:', data);
                return '❌ **Error API:** ' + (data.error ? data.error.message : `Estado ${response.status}`);
            }

            // Actualizar estadísticas
            if (data.usage) {
                const { prompt_tokens, completion_tokens, total_tokens } = data.usage;
                const pricing = this.modelPricing[this.aiConfig.model];
                const cost = (prompt_tokens * pricing.input / 1000) + (completion_tokens * pricing.output / 1000);
                
                this.aiStats.todayQueries++;
                this.aiStats.totalTokens += total_tokens;
                this.aiStats.estimatedCost += cost;
                this.aiStats.usageHistory.push({
                    timestamp: new Date().toLocaleTimeString(),
                    model: this.aiConfig.model,
                    tokens: total_tokens,
                    cost: cost,
                    responseTime: endTime - startTime
                });
                
                await this.saveAIConfigData();
            }

            if (data.choices && data.choices.length > 0) {
                const msg = data.choices[0].message;
                return msg.content;
            } else {
                return "❌ Respuesta no válida de la API.";
            }
        } catch (error) {
            console.error('Error:', error);
            return '❌ **Error de conexión:** ' + error.message;
        }
    }
    
    // ===== CONFIGURACIÓN DE IA =====
    showAIConfigModal() {
        const modal = document.getElementById('aiConfigModal');
        if (!modal) return;
        
        modal.classList.add('active');
        
        document.getElementById('aiApiKey').value = this.aiConfig.apiKey;
        document.getElementById('aiModel').value = this.aiConfig.model;
        document.getElementById('maxTokens').value = this.aiConfig.maxTokens;
        document.getElementById('temperature').value = this.aiConfig.temperature;
        document.getElementById('historyLimit').value = this.aiConfig.historyLimit;
        
        this.updateSliderValues();
        this.updateCostEstimate();
        this.updateCostWarning();
    }
    
    hideAIConfigModal() {
        const modal = document.getElementById('aiConfigModal');
        if (modal) modal.classList.remove('active');
    }
    
    updateSliderValues() {
        const maxTokensValue = document.getElementById('maxTokensValue');
        const temperatureValue = document.getElementById('temperatureValue');
        const historyLimitValue = document.getElementById('historyLimitValue');
        
        if (maxTokensValue) maxTokensValue.textContent = document.getElementById('maxTokens').value;
        if (temperatureValue) temperatureValue.textContent = document.getElementById('temperature').value;
        if (historyLimitValue) historyLimitValue.textContent = document.getElementById('historyLimit').value;
    }
    
    updateCostEstimate() {
        const model = document.getElementById('aiModel').value;
        const maxTokens = parseInt(document.getElementById('maxTokens').value);
        const pricing = this.modelPricing[model];
        
        if (pricing) {
            const estimatedInputTokens = 500;
            const estimatedOutputTokens = maxTokens;
            const cost = (estimatedInputTokens * pricing.input / 1000) + (estimatedOutputTokens * pricing.output / 1000);
            const costEstimate = document.getElementById('costEstimate');
            if (costEstimate) costEstimate.textContent = `~$${cost.toFixed(4)}`;
            return cost.toFixed(4);
        }
        return '0.01';
    }
    
    updateCostWarning() {
        const model = document.getElementById('aiModel').value;
        const warning = document.getElementById('costWarning');
        
        if (warning) {
            if (model === 'gpt-4' || model === 'gpt-4-turbo') {
                warning.style.display = 'block';
            } else {
                warning.style.display = 'none';
            }
        }
    }
    
    async saveAIConfig() {
        this.aiConfig.apiKey = document.getElementById('aiApiKey').value;
        this.aiConfig.model = document.getElementById('aiModel').value;
        this.aiConfig.maxTokens = parseInt(document.getElementById('maxTokens').value);
        this.aiConfig.temperature = parseFloat(document.getElementById('temperature').value);
        this.aiConfig.historyLimit = parseInt(document.getElementById('historyLimit').value);
        
        await this.saveAIConfigData();
        this.hideAIConfigModal();
        
        this.api.showMessage('✅ Configuración de IA guardada correctamente');
    }
    
    showAIStatsModal() {
        const modal = document.getElementById('aiStatsModal');
        if (!modal) return;
        
        modal.classList.add('active');
        this.updateStatsDisplay();
    }
    
    hideAIStatsModal() {
        const modal = document.getElementById('aiStatsModal');
        if (modal) modal.classList.remove('active');
    }
    
    updateStatsDisplay() {
        const todayQueries = document.getElementById('todayQueries');
        const tokensUsed = document.getElementById('tokensUsed');
        const estimatedCost = document.getElementById('estimatedCost');
        const currentModel = document.getElementById('currentModel');
        
        if (todayQueries) todayQueries.textContent = this.aiStats.todayQueries;
        if (tokensUsed) tokensUsed.textContent = this.aiStats.totalTokens.toLocaleString();
        if (estimatedCost) estimatedCost.textContent = `$${this.aiStats.estimatedCost.toFixed(4)}`;
        
        // Formatear nombre del modelo para mostrar
        let modelDisplayName = this.aiConfig.model;
        if (modelDisplayName.startsWith('gpt-5')) {
            modelDisplayName = modelDisplayName.replace('gpt-5-nano', 'GPT-5 Nano')
                                               .replace('gpt-5-mini', 'GPT-5 Mini')
                                               .replace('gpt-5', 'GPT-5');
        } else {
            // Mantener compatibilidad con modelos anteriores si existen
            modelDisplayName = modelDisplayName.replace('gpt-', 'GPT-')
                                               .replace('-turbo', ' Turbo')
                                               .replace('4.1-nano', '4.1 nano');
        }
        
        if (currentModel) currentModel.textContent = modelDisplayName;
        
        const historyContainer = document.getElementById('usageHistory');
        if (historyContainer) {
            if (this.aiStats.usageHistory.length === 0) {
                historyContainer.innerHTML = '<p style="color: #666; font-style: italic;">No hay historial de uso</p>';
            } else {
                historyContainer.innerHTML = this.aiStats.usageHistory.slice(-10).map(entry => `
                    <div style="padding: 8px 0; border-bottom: 1px solid #eee;">
                        <strong>${entry.timestamp}</strong> - ${entry.model} - ${entry.tokens} tokens - $${entry.cost.toFixed(4)}
                    </div>
                `).join('');
            }
        }
    }
    
    exportStats() {
        const dataStr = JSON.stringify(this.aiStats, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `assistant-ai-stats-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        this.api.showMessage('📤 Estadísticas exportadas correctamente');
    }
    
    async clearStats() {
        if (confirm('¿Estás seguro de que quieres limpiar todas las estadísticas?')) {
            this.aiStats = {
                todayQueries: 0,
                totalTokens: 0,
                estimatedCost: 0,
                usageHistory: [],
                currentModel: this.aiConfig.model.replace('gpt-', 'GPT-').replace('-turbo', ' Turbo').replace('4.1-nano', '4.1 nano'),
                lastResetDate: new Date().toDateString()
            };
            await this.saveAIConfigData();
            this.updateStatsDisplay();
            this.api.showMessage('🗑️ Estadísticas limpiadas');
        }
    }
    
    // ===== FUNCIONES DE OPENAI PARA TASKS =====
    getTasksFunctions() {
        return [
            {
                name: 'obtenerTareas',
                description: 'Devuelve la lista de tareas con sus IDs únicos, proyectos asignados y días restantes del contexto seleccionado.',
                parameters: { type: 'object', properties: {} }
            },
            {
                name: 'agregarTareas',
                description: 'Agrega una o múltiples tareas nuevas al contexto seleccionado.',
                parameters: { 
                    type: 'object', 
                    properties: { 
                        tareas: { 
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    titulo: { type: 'string', description: 'Título de la tarea' },
                                    descripcion: { type: 'string', description: 'Descripción opcional' },
                                    prioridad: { type: 'string', enum: ['alta', 'media', 'baja'], description: 'Prioridad de la tarea' },
                                    fecha: { type: 'string', description: 'Fecha límite en formato ISO' },
                                    proyecto: { type: 'string', description: 'Nombre del proyecto (debe coincidir exactamente)' },
                                    etiquetas: { type: 'array', items: { type: 'string' }, description: 'Lista de etiquetas' },
                                    subtareas: { type: 'array', items: { type: 'string' }, description: 'Lista de subtareas' }
                                },
                                required: ['titulo']
                            }
                        }
                    }, 
                    required: ['tareas'] 
                }
            },
            {
                name: 'editarTareas',
                description: 'Edita una o múltiples tareas existentes usando sus IDs únicos.',
                parameters: { 
                    type: 'object', 
                    properties: { 
                        tareasAEditar: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    taskId: { type: 'integer', description: 'ID único de la tarea a editar' },
                                    cambios: { 
                                        type: 'object',
                                        properties: {
                                            titulo: { type: 'string' },
                                            descripcion: { type: 'string' },
                                            prioridad: { type: 'string', enum: ['alta', 'media', 'baja'] },
                                            fecha: { type: 'string' },
                                            completada: { type: 'boolean' },
                                            proyecto: { type: 'string', description: 'Nombre del proyecto (debe coincidir exactamente)' },
                                            etiquetas: { type: 'array', items: { type: 'string' } }
                                        }
                                    }
                                },
                                required: ['taskId', 'cambios']
                            }
                        }
                    }, 
                    required: ['tareasAEditar'] 
                }
            },
            {
                name: 'eliminarTareas',
                description: 'Elimina una o múltiples tareas usando sus IDs únicos.',
                parameters: { 
                    type: 'object', 
                    properties: { 
                        taskIds: { 
                            type: 'array',
                            items: { type: 'integer' },
                            description: 'Array de IDs únicos de las tareas a eliminar'
                        }
                    }, 
                    required: ['taskIds'] 
                }
            },
            {
                name: 'marcarCompletadas',
                description: 'Marca una o múltiples tareas como completadas usando sus IDs.',
                parameters: { 
                    type: 'object', 
                    properties: { 
                        taskIds: { 
                            type: 'array',
                            items: { type: 'integer' },
                            description: 'Array de IDs únicos de las tareas'
                        }
                    }, 
                    required: ['taskIds'] 
                }
            },
            {
                name: 'marcarPendientes',
                description: 'Marca una o múltiples tareas como pendientes usando sus IDs.',
                parameters: { 
                    type: 'object', 
                    properties: { 
                        taskIds: { 
                            type: 'array',
                            items: { type: 'integer' },
                            description: 'Array de IDs únicos de las tareas'
                        }
                    }, 
                    required: ['taskIds'] 
                }
            }
        ];
    }
    
    // ===== IMPLEMENTACIÓN DE FUNCIONES DE TAREAS =====
    async obtenerTareas(context) {
        const tareas = [];
        
        // Recopilar tareas de todos los escenarios seleccionados
        Object.values(context.data).forEach(scenario => {
            if (scenario.data && scenario.data.tasks) {
                scenario.data.tasks.forEach(task => {
                    const proyecto = scenario.data.projects ? scenario.data.projects.find(p => p.id === task.projectId) : null;
                    const daysRemaining = this.getDaysRemaining(task.dueDate);
                    
                    tareas.push({
                        id: task.id,
                        titulo: task.title,
                        descripcion: task.description,
                        completada: task.completed,
                        prioridad: task.priority,
                        fecha: task.dueDate,
                        diasRestantes: daysRemaining,
                        proyecto: proyecto?.name || null,
                        proyectoId: task.projectId,
                        etiquetas: task.labels,
                        subtareas: task.subtasks,
                        escenario: scenario.name
                    });
                });
            }
        });

        let respuesta = `## 📋 Tareas del Contexto Seleccionado\n\n`;
        
        if (tareas.length === 0) {
            respuesta += "*Sin tareas en el contexto seleccionado.*";
        } else {
            tareas.forEach(tarea => {
                const estado = tarea.completada ? "✅" : "⏳";
                const prioEmoji = tarea.prioridad === 'alta' ? '🔴' : tarea.prioridad === 'media' ? '🟡' : '⚪';
                
                respuesta += `**${tarea.titulo}** (ID: ${tarea.id}) ${estado} ${prioEmoji}\n`;
                
                if (tarea.descripcion) respuesta += `*${tarea.descripcion}*\n`;
                if (tarea.fecha) {
                    const fecha = new Date(tarea.fecha);
                    respuesta += `📅 ${fecha.toLocaleDateString()} (${tarea.diasRestantes} días)\n`;
                }
                if (tarea.proyecto) respuesta += `📁 ${tarea.proyecto}\n`;
                respuesta += `\n`;
            });
        }

        return respuesta;
    }

    // ===== FUNCIÓN GENÉRICA PARA MANIPULAR DATOS =====
    getDataManipulationFunctions() {
        return [
            {
                name: 'manipularDatos',
                description: 'Función genérica para manipular datos del JSON. Puede agregar, editar, eliminar o consultar cualquier tipo de dato (tareas, notas, proyectos, carpetas, etc.)',
                parameters: {
                    type: 'object',
                    properties: {
                        operacion: {
                            type: 'string',
                            enum: ['obtener', 'agregar', 'editar', 'eliminar', 'marcar_completada', 'marcar_pendiente'],
                            description: 'Tipo de operación a realizar'
                        },
                        tipo: {
                            type: 'string',
                            enum: ['tasks', 'notes', 'projects', 'folders'],
                            description: 'Tipo de datos a manipular'
                        },
                        datos: {
                            type: 'array',
                            description: 'Array de objetos con los datos a manipular. Para editar/eliminar incluir el ID.',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'integer', description: 'ID del elemento (para editar/eliminar)' },
                                    title: { type: 'string', description: 'Título/nombre del elemento' },
                                    description: { type: 'string', description: 'Descripción' },
                                    priority: { type: 'string', enum: ['alta', 'media', 'baja'] },
                                    dueDate: { type: 'string', description: 'Fecha límite ISO' },
                                    projectId: { type: 'integer', description: 'ID del proyecto' },
                                    folderId: { type: 'integer', description: 'ID de la carpeta' },
                                    completed: { type: 'boolean', description: 'Estado completado' },
                                    labels: { type: 'array', items: { type: 'string' } },
                                    subtasks: { type: 'array', items: { type: 'string' } },
                                    color: { type: 'string', description: 'Color hex para proyectos/carpetas' },
                                    content: { type: 'string', description: 'Contenido de la nota' }
                                }
                            }
                        },
                        escenario: {
                            type: 'string',
                            description: 'ID del escenario donde realizar la operación (opcional, usa el seleccionado por defecto)'
                        }
                    },
                    required: ['operacion', 'tipo']
                }
            }
        ];
    }

    // ===== IMPLEMENTACIÓN DE LA FUNCIÓN GENÉRICA =====
    async manipularDatos(args, context) {
        const { operacion, tipo, datos = [], escenario } = args;
        
        try {
            let targetModule = this.currentModule;
            let moduleData = null;
            let scenarioId = escenario;
            let scenarioData = null;
            
            // Si estamos en modo "general", determinar el módulo según el tipo de datos
            if (context.module === 'general') {
                if (tipo === 'tasks' || tipo === 'projects') {
                    targetModule = 'tasks';
                    moduleData = context.data.tasks.scenarios;
                } else if (tipo === 'notes' || tipo === 'folders') {
                    targetModule = 'notes';
                    moduleData = context.data.notes.scenarios;
                } else {
                    return `❌ Error: Tipo de datos "${tipo}" no reconocido para el módulo general`;
                }
            } else {
                // Para módulos específicos, usar los datos del contexto
                moduleData = context.data;
            }
            
            // SIMPLIFICADO: Usar siempre el primer escenario disponible si no se especifica
            if (!scenarioId) {
                const availableScenarios = Object.keys(moduleData || {});
                if (availableScenarios.length > 0) {
                    // Convertir a número si es posible, sino usar como string
                    const firstScenario = availableScenarios[0];
                    scenarioId = isNaN(firstScenario) ? firstScenario : parseInt(firstScenario);
                } else {
                    return `❌ Error: No hay escenarios disponibles en el módulo ${targetModule}`;
                }
            } else {
                // Asegurar que scenarioId sea del tipo correcto
                scenarioId = isNaN(scenarioId) ? scenarioId : parseInt(scenarioId);
            }
            
            // Obtener el escenario directamente
            scenarioData = moduleData[scenarioId];
            
            // Si no existe, usar el primer escenario disponible como fallback
            if (!scenarioData) {
                const availableScenarios = Object.keys(moduleData || {});
                if (availableScenarios.length > 0) {
                    const firstScenario = availableScenarios[0];
                    scenarioId = isNaN(firstScenario) ? firstScenario : parseInt(firstScenario);
                    scenarioData = moduleData[scenarioId];
                }
            }
            
            if (!scenarioData) {
                return `❌ Error: No se pudo acceder a ningún escenario en el módulo ${targetModule}`;
            }

            let resultado = '';

            switch (operacion) {
                case 'obtener':
                    resultado = await this.obtenerDatos(tipo, scenarioData, context);
                    break;
                    
                case 'agregar':
                    resultado = await this.agregarDatos(tipo, datos, scenarioData, scenarioId, targetModule);
                    break;
                    
                case 'editar':
                    resultado = await this.editarDatos(tipo, datos, scenarioData, scenarioId, targetModule);
                    break;
                    
                case 'eliminar':
                    resultado = await this.eliminarDatos(tipo, datos, scenarioData, scenarioId, targetModule);
                    break;
                    
                case 'marcar_completada':
                case 'marcar_pendiente':
                    resultado = await this.cambiarEstado(tipo, datos, scenarioData, scenarioId, operacion === 'marcar_completada', targetModule);
                    break;
                    
                default:
                    resultado = '❌ Operación no reconocida';
            }

            return resultado;
            
        } catch (error) {
            console.error('Error en manipularDatos:', error);
            return `❌ Error: ${error.message}`;
        }
    }

    async obtenerDatos(tipo, scenarioData, context) {
        let resultado = '';
        
        switch (tipo) {
            case 'tasks':
                const tasks = scenarioData.data?.tasks || [];
                resultado = `📋 **Tareas (${tasks.length})**\n\n`;
                
                if (tasks.length === 0) {
                    resultado += '*No hay tareas*';
                } else {
                    tasks.forEach(task => {
                        const proyecto = scenarioData.data.projects?.find(p => p.id === task.projectId);
                        const estado = task.completed ? '✅' : '⏳';
                        const prioEmoji = task.priority === 'alta' ? '🔴' : task.priority === 'media' ? '🟡' : '⚪';
                        
                        resultado += `**${task.title}** (ID: ${task.id}) ${estado} ${prioEmoji}\n`;
                        if (task.description) resultado += `*${task.description}*\n`;
                        if (task.dueDate) resultado += `📅 ${new Date(task.dueDate).toLocaleDateString()}\n`;
                        if (proyecto) resultado += `📁 ${proyecto.name}\n`;
                        resultado += '\n';
                    });
                }
                break;
                
            case 'notes':
                const notes = scenarioData.data?.notes || [];
                resultado = `📝 **Notas (${notes.length})**\n\n`;
                
                if (notes.length === 0) {
                    resultado += '*No hay notas*';
                } else {
                    notes.forEach(note => {
                        const folder = scenarioData.data.folders?.find(f => f.id === note.folderId);
                        resultado += `**${note.title}** (ID: ${note.id})\n`;
                        if (note.content) resultado += `${note.content.substring(0, 100)}...\n`;
                        if (folder) resultado += `📁 ${folder.name}\n`;
                        resultado += '\n';
                    });
                }
                break;
                
            case 'projects':
                const projects = scenarioData.data?.projects || [];
                resultado = `📁 **Proyectos (${projects.length})**\n\n`;
                projects.forEach(project => {
                    resultado += `**${project.name}** (ID: ${project.id}) 🎨 ${project.color}\n`;
                });
                break;
                
            case 'folders':
                const folders = scenarioData.data?.folders || [];
                resultado = `📂 **Carpetas (${folders.length})**\n\n`;
                folders.forEach(folder => {
                    resultado += `**${folder.name}** (ID: ${folder.id}) 🎨 ${folder.color}\n`;
                });
                break;
        }
        
        return resultado;
    }

    async agregarDatos(tipo, datos, scenarioData, scenarioId, targetModule = null) {
        let resultado = '';
        let contador = 0;
        
        datos.forEach(item => {
            switch (tipo) {
                case 'tasks':
                    // Procesar subtareas correctamente
                    let subtasksProcessed = [];
                    if (item.subtasks && Array.isArray(item.subtasks)) {
                        subtasksProcessed = item.subtasks.map(sub => {
                            if (typeof sub === 'string') {
                                return {
                                    id: scenarioData.data.subtaskIdCounter++,
                                    title: sub,
                                    completed: false
                                };
                            } else if (typeof sub === 'object' && sub !== null) {
                                return {
                                    id: scenarioData.data.subtaskIdCounter++,
                                    title: sub.title || sub.titulo || sub.name || 'Subtarea sin título',
                                    completed: sub.completed || sub.completada || false
                                };
                            }
                            return null;
                        }).filter(sub => sub !== null);
                    }
                    
                    // También procesar subtareas si vienen como 'subtareas' (en español)
                    if (item.subtareas && Array.isArray(item.subtareas)) {
                        const subtareasProcessed = item.subtareas.map(sub => {
                            if (typeof sub === 'string') {
                                return {
                                    id: scenarioData.data.subtaskIdCounter++,
                                    title: sub,
                                    completed: false
                                };
                            } else if (typeof sub === 'object' && sub !== null) {
                                return {
                                    id: scenarioData.data.subtaskIdCounter++,
                                    title: sub.title || sub.titulo || sub.name || 'Subtarea sin título',
                                    completed: sub.completed || sub.completada || false
                                };
                            }
                            return null;
                        }).filter(sub => sub !== null);
                        subtasksProcessed = [...subtasksProcessed, ...subtareasProcessed];
                    }

                    const newTask = {
                        id: scenarioData.data.taskIdCounter++,
                        title: item.title || item.titulo || 'Nueva tarea',
                        description: item.description || item.descripcion || '',
                        completed: false,
                        priority: item.priority || item.prioridad || 'media',
                        dueDate: item.dueDate || item.fecha || null,
                        projectId: item.projectId || null,
                        labels: item.labels || item.etiquetas || [],
                        subtasks: subtasksProcessed,
                        createdAt: new Date().toISOString()
                    };
                    
                    if (!scenarioData.data.tasks) scenarioData.data.tasks = [];
                    scenarioData.data.tasks.push(newTask);
                    contador++;
                    break;
                    
                case 'notes':
                    const newNote = {
                        id: scenarioData.data.noteIdCounter++,
                        title: item.title || 'Nueva nota',
                        content: item.content || '',
                        folderId: item.folderId || null,
                        labels: item.labels || [],
                        createdAt: new Date().toISOString()
                    };
                    
                    if (!scenarioData.data.notes) scenarioData.data.notes = [];
                    scenarioData.data.notes.push(newNote);
                    contador++;
                    break;
                    
                case 'projects':
                    const newProject = {
                        id: scenarioData.data.projectIdCounter++,
                        name: item.title || item.name || 'Nuevo proyecto',
                        color: item.color || '#007bff'
                    };
                    
                    if (!scenarioData.data.projects) scenarioData.data.projects = [];
                    scenarioData.data.projects.push(newProject);
                    contador++;
                    break;
                    
                case 'folders':
                    const newFolder = {
                        id: scenarioData.data.folderIdCounter++,
                        name: item.title || item.name || 'Nueva carpeta',
                        color: item.color || '#a8e6cf'
                    };
                    
                    if (!scenarioData.data.folders) scenarioData.data.folders = [];
                    scenarioData.data.folders.push(newFolder);
                    contador++;
                    break;
            }
        });
        
        // Guardar cambios
        await this.guardarCambiosEscenario(scenarioId, scenarioData, targetModule);
        
        resultado = `✅ Se agregaron ${contador} ${tipo} correctamente`;
        return resultado;
    }

    async editarDatos(tipo, datos, scenarioData, scenarioId, targetModule = null) {
        let resultado = '';
        let contador = 0;
        
        datos.forEach(item => {
            if (!item.id) return;
            
            let collection;
            switch (tipo) {
                case 'tasks':
                    collection = scenarioData.data?.tasks || [];
                    break;
                case 'notes':
                    collection = scenarioData.data?.notes || [];
                    break;
                case 'projects':
                    collection = scenarioData.data?.projects || [];
                    break;
                case 'folders':
                    collection = scenarioData.data?.folders || [];
                    break;
            }
            
            const index = collection.findIndex(el => el.id === item.id);
            if (index !== -1) {
                // Actualizar solo los campos proporcionados
                Object.keys(item).forEach(key => {
                    if (key !== 'id' && item[key] !== undefined) {
                        collection[index][key] = item[key];
                    }
                });
                contador++;
            }
        });
        
        // Guardar cambios
        await this.guardarCambiosEscenario(scenarioId, scenarioData);
        
        resultado = `✅ Se editaron ${contador} ${tipo} correctamente`;
        return resultado;
    }

    async eliminarDatos(tipo, datos, scenarioData, scenarioId, targetModule = null) {
        let resultado = '';
        let contador = 0;
        
        const ids = datos.map(item => item.id).filter(id => id);
        
        let collection;
        switch (tipo) {
            case 'tasks':
                collection = scenarioData.data?.tasks || [];
                scenarioData.data.tasks = collection.filter(task => !ids.includes(task.id));
                break;
            case 'notes':
                collection = scenarioData.data?.notes || [];
                scenarioData.data.notes = collection.filter(note => !ids.includes(note.id));
                break;
            case 'projects':
                collection = scenarioData.data?.projects || [];
                scenarioData.data.projects = collection.filter(project => !ids.includes(project.id));
                break;
            case 'folders':
                collection = scenarioData.data?.folders || [];
                scenarioData.data.folders = collection.filter(folder => !ids.includes(folder.id));
                break;
        }
        
        contador = ids.length;
        
        // Guardar cambios
        await this.guardarCambiosEscenario(scenarioId, scenarioData);
        
        resultado = `✅ Se eliminaron ${contador} ${tipo} correctamente`;
        return resultado;
    }

    async cambiarEstado(tipo, datos, scenarioData, scenarioId, completada, targetModule = null) {
        if (tipo !== 'tasks') {
            return '❌ Solo se puede cambiar el estado de las tareas';
        }
        
        let resultado = '';
        let contador = 0;
        
        const ids = datos.map(item => item.id).filter(id => id);
        const tasks = scenarioData.data?.tasks || [];
        
        tasks.forEach(task => {
            if (ids.includes(task.id)) {
                task.completed = completada;
                contador++;
            }
        });
        
        // Guardar cambios
        await this.guardarCambiosEscenario(scenarioId, scenarioData);
        
        const estado = completada ? 'completadas' : 'pendientes';
        resultado = `✅ Se marcaron ${contador} tareas como ${estado}`;
        return resultado;
    }

    async guardarCambiosEscenario(scenarioId, scenarioData, targetModule = null) {
        try {
            // Asegurar que scenarioId sea del tipo correcto
            const finalScenarioId = isNaN(scenarioId) ? scenarioId : parseInt(scenarioId);
            
            // Determinar el módulo correcto para guardar
            let moduleToSave = targetModule || this.currentModule;
            
            // Si estamos en modo general, necesitamos determinar el módulo basado en el tipo de datos
            if (this.currentModule === 'general' && !targetModule) {
                // En este caso, targetModule debería haber sido pasado desde agregarDatos
                console.error('Error: No se puede determinar el módulo para guardar en modo general');
                return;
            }
            
            // Actualizar los datos en appData
            if (this.appData.modules[moduleToSave] && this.appData.modules[moduleToSave].scenarios) {
                this.appData.modules[moduleToSave].scenarios[finalScenarioId] = scenarioData;
                
                // Guardar en WordPress
                await this.api.saveModuleData(moduleToSave, this.appData.modules[moduleToSave]);
                
                console.log(`Cambios guardados en escenario ${finalScenarioId} del módulo ${moduleToSave}`);
            } else {
                console.error(`Error: No se encontró el módulo ${moduleToSave} en appData`);
            }
        } catch (error) {
            console.error('Error guardando cambios:', error);
            throw error;
        }
    }

    getDaysRemaining(dueDate) {
        if (!dueDate) return null;
        const today = new Date();
        const due = new Date(dueDate);
        const diffTime = due - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }

    // ===== FUNCIONES PARA INDICADOR DE CARGA =====
    addLoadingMessage() {
        const messagesContainer = document.getElementById('messages');
        if (!messagesContainer) return null;
        
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message ai-message loading-message';
        loadingDiv.id = `loading-${Date.now()}`;
        
        const loadingContent = document.createElement('div');
        loadingContent.className = 'message-content';
        loadingContent.innerHTML = `
            <div class="typing-indicator">
                <span>🤖 Escribiendo</span>
                <div class="typing-dots">
                    <span>.</span>
                    <span>.</span>
                    <span>.</span>
                </div>
            </div>
        `;
        
        loadingDiv.appendChild(loadingContent);
        messagesContainer.appendChild(loadingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        return loadingDiv.id;
    }
    
    removeLoadingMessage(loadingMessageId) {
        if (!loadingMessageId) return;
        
        const loadingElement = document.getElementById(loadingMessageId);
        if (loadingElement) {
            loadingElement.remove();
        }
    }

    // ===== FUNCIONES PARA ACCIONES DE MENSAJES =====
    copyMessage(text) {
        // Usar la API moderna del portapapeles si está disponible
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(() => {
                this.api.showMessage('📋 Mensaje copiado al portapapeles');
            }).catch(err => {
                console.error('Error copiando al portapapeles:', err);
                this.fallbackCopyTextToClipboard(text);
            });
        } else {
            // Fallback para navegadores más antiguos
            this.fallbackCopyTextToClipboard(text);
        }
    }
    
    fallbackCopyTextToClipboard(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.top = '0';
        textArea.style.left = '0';
        textArea.style.position = 'fixed';
        
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            const successful = document.execCommand('copy');
            if (successful) {
                this.api.showMessage('📋 Mensaje copiado al portapapeles');
            } else {
                this.api.showMessage('❌ Error al copiar mensaje');
            }
        } catch (err) {
            console.error('Error copiando al portapapeles:', err);
            this.api.showMessage('❌ Error al copiar mensaje');
        }
        
        document.body.removeChild(textArea);
    }
    
    deleteMessage(messageElement, messageText) {
        if (confirm('¿Estás seguro de que quieres eliminar este mensaje?')) {
            // Eliminar del DOM
            messageElement.remove();
            
            // Eliminar del array de mensajes
            const messageIndex = this.mensajes.findIndex(msg => msg.content === messageText);
            if (messageIndex !== -1) {
                this.mensajes.splice(messageIndex, 1);
                this.saveMessages();
            }
            
            this.api.showMessage('🗑️ Mensaje eliminado');
        }
    }

    // ===== CONFIGURACIÓN DE PROMPTS =====
    showPromptConfigModal() {
        const modal = document.getElementById('promptConfigModal');
        if (!modal) return;
        
        modal.classList.add('active');
        
        // Cargar el contexto general por defecto
        this.loadPromptForContext('general');
    }
    
    hidePromptConfigModal() {
        const modal = document.getElementById('promptConfigModal');
        if (modal) modal.classList.remove('active');
    }
    
    loadPromptForContext(contextId) {
        const promptInput = document.getElementById('systemPromptInput');
        if (!promptInput) return;
        
        if (this.data.contexts && this.data.contexts[contextId]) {
            promptInput.value = this.data.contexts[contextId].systemPrompt || '';
        } else {
            promptInput.value = '';
        }
    }
    
    async savePromptConfig() {
        const contextSelect = document.getElementById('promptContextSelect');
        const promptInput = document.getElementById('systemPromptInput');
        
        if (!contextSelect || !promptInput) return;
        
        const contextId = contextSelect.value;
        const newPrompt = promptInput.value.trim();
        
        if (!newPrompt) {
            this.api.showMessage('❌ El prompt no puede estar vacío');
            return;
        }
        
        // Actualizar el prompt en los datos
        if (!this.data.contexts[contextId]) {
            this.data.contexts[contextId] = {
                id: contextId,
                name: contextId.charAt(0).toUpperCase() + contextId.slice(1),
                icon: contextId === 'general' ? '🤖' : contextId === 'tasks' ? '📋' : '📝',
                description: `Contexto personalizado para ${contextId}`,
                systemPrompt: newPrompt
            };
        } else {
            this.data.contexts[contextId].systemPrompt = newPrompt;
        }
        
        // Guardar los datos
        await this.saveData();
        
        this.hidePromptConfigModal();
        this.api.showMessage('✅ Prompt personalizado guardado correctamente');
    }
    
    resetPromptToDefault(contextId) {
        if (!confirm('¿Estás seguro de que quieres restaurar el prompt por defecto? Se perderán los cambios personalizados.')) {
            return;
        }
        
        const defaultPrompts = {
            general: 'Eres un asistente útil y amigable. Ayuda al usuario con cualquier consulta de manera clara y concisa.',
            tasks: 'Eres un asistente especializado en gestión de tareas y productividad. Ayuda al usuario a organizar, planificar y completar sus tareas de manera eficiente.',
            notes: 'Eres un asistente especializado en organización de notas y gestión del conocimiento. Ayuda al usuario a estructurar, categorizar y encontrar información.'
        };
        
        const promptInput = document.getElementById('systemPromptInput');
        if (promptInput && defaultPrompts[contextId]) {
            promptInput.value = defaultPrompts[contextId];
            this.api.showMessage('🔄 Prompt restaurado por defecto');
        }
    }

    // ===== MENSAJE DE BIENVENIDA =====
    showWelcomeMessage() {
        // Mensaje de bienvenida comentado - se puede habilitar si se desea
        /*
        let welcomeMessage = '🤖 **¡ASISTENTE DE IA CONTEXTUAL ACTIVADO!**\n\n';
        
        welcomeMessage += '✨ **Nuevo Sistema:** Selecciona módulos y contexto específico para conversaciones más precisas.\n\n';
        
        if (!this.aiConfig.apiKey) {
            welcomeMessage += '🔑 **Configura tu API Key:** Ve a "Configurar IA" en el sidebar para habilitar el asistente.\n\n';
        }
        
        welcomeMessage += '🎯 **MÓDULOS DISPONIBLES:**\n';
        welcomeMessage += '- 📋 **Tasks:** Gestión completa de tareas, proyectos y productividad\n';
        welcomeMessage += '- 📝 **Notes:** Organización de notas, carpetas y conocimiento\n\n';
        
        welcomeMessage += '🚀 **CAPACIDADES INCLUIDAS:**\n';
        welcomeMessage += '- ✅ Agregar, editar, eliminar múltiples elementos\n';
        welcomeMessage += '- 🔄 Operaciones en lote (ej: "eliminar tareas 1, 2, 3")\n';
        welcomeMessage += '- 📊 Consultas contextuales inteligentes\n';
        welcomeMessage += '- 🎯 Selección específica de escenarios y proyectos/carpetas\n';
        welcomeMessage += '- 💾 Persistencia automática de cambios\n\n';
        
        welcomeMessage += `📊 **Estado Actual:**\n`;
        welcomeMessage += `- **Módulos cargados:** ${Object.keys(this.appData.modules || {}).length}\n`;
        welcomeMessage += `- **Mensajes en historial:** ${this.mensajes.length}\n`;
        welcomeMessage += `- **Modelo configurado:** ${this.aiConfig.model}\n\n`;
        
        welcomeMessage += '🎉 **¡Selecciona un módulo arriba y pregúntame lo que necesites!**';
        
        this.addMessage(welcomeMessage, 'ai');
        */
    }
    
    // ===== DESTRUCTOR =====
    async destroy() {
        // Guardar datos antes de destruir
        await this.saveData();
        await this.saveAIConfigData();
        await this.saveMessages();
        
        // Limpiar referencias globales
        if (window.assistantModule) {
            delete window.assistantModule;
        }
        
        console.log('🗑️ Assistant Module destruido correctamente');
    }
}

// ===== EXPORT DEL MÓDULO =====
window.AssistantModule = AssistantModule;
