// ===== TASKS MODULE (WordPress Version) =====
class TasksModule {
    constructor(framework) {
        this.framework = framework;
        this.api = framework.getFrameworkAPI();
        
        // Datos del módulo
        this.data = {};
        
        // Variables de estado
        this.currentView = 'today';
        this.editingTask = null;
        this.editingProject = null;
        this.editingScenario = null;
        this.isFormVisible = false;
        this.sortableInstance = null;
        
        // Tags y subtasks temporales para formularios
        this.selectedTags = [];
        this.selectedSubtasks = [];
        
        // Variables para selección múltiple
        this.selectedTaskIds = new Set();
        this.lastSelectedTaskId = null;
        this.isMultiSelectMode = false;
        
        
        // Inicializar
        this.init();
    }
    
    // ===== FUNCIONES GLOBALES =====
    exposeGlobalFunctions() {
        // Asegurar que las funciones estén disponibles inmediatamente
        window.tasksModule = {
            // Navegación
            switchView: (view) => this.switchView(view),
            switchToProject: (projectId) => this.switchToProject(projectId),
            switchToLabel: (labelName) => this.switchToLabel(labelName),
            
            // Tareas
            toggleTask: (taskId) => this.toggleTask(taskId),
            duplicateTask: (taskId) => this.duplicateTask(taskId),
            editTask: (taskId) => this.editTask(taskId),
            deleteTask: (taskId) => this.deleteTask(taskId),
            saveTask: () => this.saveTask(),
            toggleSubtask: (taskId, subtaskId) => this.toggleSubtask(taskId, subtaskId),
            
            // Formulario
            toggleTaskForm: () => this.toggleTaskForm(),
            setQuickDate: (days) => this.setQuickDate(days),
            setModalQuickDate: (days) => this.setModalQuickDate(days),
            
            // Proyectos
            showProjectModal: (projectId) => this.showProjectModal(projectId),
            hideProjectModal: () => this.hideProjectModal(),
            saveProject: () => this.saveProject(),
            deleteProject: () => this.deleteProject(),
            editProject: (projectId) => this.editProject(projectId),
            
            // Escenarios
            switchScenario: (scenarioId) => this.switchScenario(scenarioId),
            showScenarioModal: () => this.showScenarioModal(),
            hideScenarioModal: () => this.hideScenarioModal(),
            showNewScenarioModal: (scenarioId) => this.showNewScenarioModal(scenarioId),
            hideNewScenarioModal: () => this.hideNewScenarioModal(),
            saveScenario: () => this.saveScenario(),
            deleteScenario: () => this.deleteScenario(),
            deleteScenarioConfirm: (scenarioId) => this.deleteScenarioConfirm(scenarioId),
            
            // Modales
            showTaskModal: () => this.showTaskModal(),
            hideTaskModal: () => this.hideTaskModal(),
            showTasksDataManagementModal: () => this.showTasksDataManagementModal(),
            hideTasksDataManagementModal: () => this.hideTasksDataManagementModal(),
            
            // Datos
            exportAllData: () => this.exportAllData(),
            exportTasks: () => this.exportTasks(),
            exportProjects: () => this.exportProjects(),
            importData: () => this.importData(),
            clearAllData: () => this.clearAllData(),
            
            // Funciones auxiliares para formularios
            removeTag: (index) => this.removeTag(index),
            removeFormSubtask: (id) => this.removeFormSubtask(id),
            toggleFormSubtask: (id) => this.toggleFormSubtask(id),
            
            // Funciones para alertas
            addAlert: () => this.addAlert(),
            addAlertToMainForm: () => this.addAlertToMainForm(),
            removeAlert: (id) => this.removeAlert(id),
            removeMainFormAlert: (id) => this.removeMainFormAlert(id),
            editAlert: (id) => this.editAlert(id),
            toggleAlert: (id) => this.toggleAlert(id),
            duplicateAlert: (id) => this.duplicateAlert(id),
            addSubtaskFromInput: () => this.addSubtaskFromInput(),
            addTagFromInput: () => this.addTagFromInput(),
            addTagFromMainForm: () => this.addTagFromMainForm(),
            addSubtaskFromMainForm: () => this.addSubtaskFromMainForm(),
            
            // Funciones para selección múltiple
            selectTask: (taskId, event) => this.selectTask(taskId, event),
            deleteSelectedTasks: () => this.deleteSelectedTasks(),
            clearSelection: () => this.clearSelection()
        };
    }
    
    // ===== INICIALIZACIÓN =====
    async init() {
        // Exponer funciones globalmente PRIMERO
        this.exposeGlobalFunctions();
        
        // Cargar datos desde WordPress
        await this.loadData();
        
        this.loadInterface();
        this.setupEventListeners();
        this.renderTasks();
        this.renderProjects();
        this.renderLabels();
        this.updateCounts();
        
        // Inicializar actualización automática de tiempo restante
        this.startTimeRemainingUpdater();
    }
    
    async loadData() {
        try {
            const savedData = await this.api.getModuleData('tasks');
            
            this.data = {
                scenarios: savedData.scenarios || {
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
                currentScenario: savedData.currentScenario || 1,
                scenarioIdCounter: savedData.scenarioIdCounter || 2,
                // Los datos actuales se cargan del escenario activo
                tasks: [],
                projects: [],
                taskIdCounter: 1,
                projectIdCounter: 4,
                subtaskIdCounter: 1000
            };
        } catch (error) {
            console.error('Error cargando datos del módulo:', error);
            // Datos por defecto si hay error
            this.data = {
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
                scenarioIdCounter: 2,
                tasks: [],
                projects: [],
                taskIdCounter: 1,
                projectIdCounter: 4,
                subtaskIdCounter: 1000
            };
        }
    }
    
    async saveData() {
        // Guardar datos del escenario actual
        this.saveCurrentScenarioData();
        
        // Guardar toda la estructura en WordPress
        await this.api.saveModuleData('tasks', {
            scenarios: this.data.scenarios,
            currentScenario: this.data.currentScenario,
            scenarioIdCounter: this.data.scenarioIdCounter
        });
    }
    
    
    // ===== GESTIÓN DE ESCENARIOS =====
    saveCurrentScenarioData() {
        if (this.data.scenarios[this.data.currentScenario]) {
            this.data.scenarios[this.data.currentScenario].data = {
                tasks: [...this.data.tasks],
                projects: [...this.data.projects],
                taskIdCounter: this.data.taskIdCounter,
                projectIdCounter: this.data.projectIdCounter,
                subtaskIdCounter: this.data.subtaskIdCounter
            };
        }
    }
    
    loadScenarioData(scenarioId) {
        if (this.data.scenarios[scenarioId] && this.data.scenarios[scenarioId].data) {
            const scenarioData = this.data.scenarios[scenarioId].data;
            this.data.tasks = [...scenarioData.tasks];
            this.data.projects = [...scenarioData.projects];
            this.data.taskIdCounter = scenarioData.taskIdCounter;
            this.data.projectIdCounter = scenarioData.projectIdCounter;
            this.data.subtaskIdCounter = scenarioData.subtaskIdCounter;
            
            this.currentView = 'today';
            this.editingTask = null;
            this.editingProject = null;
        }
    }
    
    async switchScenario(scenarioId) {
        if (scenarioId === this.data.currentScenario) return;
        
        // Guardar datos del escenario actual
        this.saveCurrentScenarioData();
        
        // Cambiar al nuevo escenario
        this.data.currentScenario = scenarioId;
        
        // Cargar datos del nuevo escenario
        this.loadScenarioData(scenarioId);
        
        // Actualizar interfaz
        this.renderTasks();
        this.renderProjects();
        this.renderLabels();
        this.updateCounts();
        this.updateProjectSelects();
        
        // Cerrar formulario si estaba abierto
        if (this.isFormVisible) {
            this.toggleTaskForm();
        }
        
        this.switchView('today');
        
        const scenarioName = this.data.scenarios[scenarioId]?.name || 'Desconocido';
        this.api.showMessage(`🎭 Cambiado a escenario: "${scenarioName}"`);
    }
    
    // ===== INTERFAZ =====
    loadInterface() {
        // Cargar datos del escenario actual
        this.loadScenarioData(this.data.currentScenario);
        
        // Configurar navegación del módulo
        this.setupModuleNavigation();
        
        // Configurar acciones del módulo
        this.setupModuleActions();
        
        // Configurar contenedor principal
        this.setupModuleContainer();
    }
    
    setupModuleNavigation() {
        const navigationHTML = `
            <div class="search-box" style="position: relative; margin: 16px; margin-bottom: 24px;">
                <input type="text" class="search-input" placeholder="Buscar tareas..." id="searchInput" style="width: 100%; padding: 8px 12px 8px 36px; border: 1px solid #e1e1e1; border-radius: 6px; font-size: 14px; background-color: #f8f8f8;">
                <div class="search-icon" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #888;">🔍</div>
            </div>

            <div class="nav-section">
                <div class="nav-item active" data-view="today">
                    <div class="nav-item-icon">📅</div>
                    <div class="nav-item-text">Hoy</div>
                    <div class="nav-item-count" id="todayCount">0</div>
                </div>
                <div class="nav-item" data-view="upcoming">
                    <div class="nav-item-icon">📆</div>
                    <div class="nav-item-text">Próximamente</div>
                    <div class="nav-item-count" id="upcomingCount">0</div>
                </div>
                <div class="nav-item" data-view="inbox">
                    <div class="nav-item-icon">📥</div>
                    <div class="nav-item-text">Bandeja de entrada</div>
                    <div class="nav-item-count" id="inboxCount">0</div>
                </div>
            </div>

            <div class="nav-section">
                <div class="nav-section-title">Favoritos</div>
                <div class="nav-item" data-view="important">
                    <div class="nav-item-icon">⭐</div>
                    <div class="nav-item-text">Importante</div>
                    <div class="nav-item-count" id="importantCount">0</div>
                </div>
            </div>

            <div class="nav-section">
                <div class="nav-section-title">Proyectos</div>
                <div id="projectsList">
                    <!-- Los proyectos se cargarán dinámicamente -->
                </div>
                <div class="nav-item" id="addProjectBtn">
                    <div class="nav-item-icon">➕</div>
                    <div class="nav-item-text">Añadir proyecto</div>
                </div>
            </div>

            <div class="nav-section">
                <div class="nav-section-title">Filtros</div>
                <div class="nav-item" data-view="all">
                    <div class="nav-item-icon">📋</div>
                    <div class="nav-item-text">Todas las tareas</div>
                    <div class="nav-item-count" id="allCount">0</div>
                </div>
                <div class="nav-item" data-view="completed">
                    <div class="nav-item-icon">✅</div>
                    <div class="nav-item-text">Completadas</div>
                    <div class="nav-item-count" id="completedCount">0</div>
                </div>
            </div>

            <div class="nav-section">
                <div class="nav-section-title">Etiquetas</div>
                <div id="labelsList">
                    <!-- Las etiquetas se cargarán dinámicamente -->
                </div>
            </div>

            <div class="nav-section">
                <div class="nav-section-title">Datos</div>
                <div class="nav-item" id="dataManagementBtn">
                    <div class="nav-item-icon">💾</div>
                    <div class="nav-item-text">Importar/Exportar</div>
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
        // Event listeners para vistas
        document.querySelectorAll('[data-view]').forEach(item => {
            item.addEventListener('click', (e) => {
                const view = e.currentTarget.getAttribute('data-view');
                this.switchView(view);
            });
        });
        
        // Event listeners para botones específicos
        const addProjectBtn = document.getElementById('addProjectBtn');
        if (addProjectBtn) {
            addProjectBtn.addEventListener('click', () => this.showProjectModal());
        }
        
        const configAIBtn = document.getElementById('configAIBtn');
        if (configAIBtn) {
            configAIBtn.addEventListener('click', () => this.showAIConfigModal());
        }
        
        const statsAIBtn = document.getElementById('statsAIBtn');
        if (statsAIBtn) {
            statsAIBtn.addEventListener('click', () => this.showAIStatsModal());
        }
        
        const dataManagementBtn = document.getElementById('dataManagementBtn');
        if (dataManagementBtn) {
            dataManagementBtn.addEventListener('click', () => this.showTasksDataManagementModal());
        }
        
        // Configurar buscador
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', () => this.searchTasks());
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.searchTasks();
                }
            });
        }
    }
    
    setupModuleActions() {
        const actionsHTML = `
            <div class="scenario-selector">
                <select id="scenarioSelect" class="scenario-select">
                    ${Object.values(this.data.scenarios).map(scenario => 
                        `<option value="${scenario.id}" ${scenario.id === this.data.currentScenario ? 'selected' : ''}>${scenario.icon} ${scenario.name}</option>`
                    ).join('')}
                </select>
                <button class="scenario-btn" id="manageScenarioBtn" title="Gestionar Escenarios">
                    ⚙️
                </button>
                <button class="scenario-btn" id="newScenarioBtn" title="Nuevo Escenario">
                    ➕
                </button>
            </div>
            <button class="header-btn" id="toggleFormBtn">
                <span>📝</span>
                Mostrar formulario
            </button>
            <button class="header-btn" id="addTaskBtn">
                <span>➕</span>
                Añadir tarea
            </button>
        `;
        
        this.api.updateModuleActions(actionsHTML);
        
        // Configurar event listeners después de crear el HTML
        setTimeout(() => {
            this.setupActionsListeners();
        }, 100);
    }
    
    setupActionsListeners() {
        const scenarioSelect = document.getElementById('scenarioSelect');
        if (scenarioSelect) {
            scenarioSelect.addEventListener('change', (e) => {
                this.switchScenario(e.target.value);
            });
        }
        
        const manageScenarioBtn = document.getElementById('manageScenarioBtn');
        if (manageScenarioBtn) {
            manageScenarioBtn.addEventListener('click', () => this.showScenarioModal());
        }
        
        const newScenarioBtn = document.getElementById('newScenarioBtn');
        if (newScenarioBtn) {
            newScenarioBtn.addEventListener('click', () => this.showNewScenarioModal());
        }
        
        const toggleFormBtn = document.getElementById('toggleFormBtn');
        if (toggleFormBtn) {
            toggleFormBtn.addEventListener('click', () => this.toggleTaskForm());
        }
        
        const addTaskBtn = document.getElementById('addTaskBtn');
        if (addTaskBtn) {
            addTaskBtn.addEventListener('click', () => this.showTaskModal());
        }
    }
    
    setupModuleContainer() {
        const containerHTML = `
            <div class="tasks-container">
                <div class="task-form" id="taskForm" style="display: none;">
                    <div class="task-form-header">
                        <h3 style="margin: 0; color: #202124; font-size: 18px;">Nueva tarea</h3>
                        <button class="close-form-btn" id="closeFormBtn">×</button>
                    </div>
                    <form id="task-form">
                        <div class="form-row">
                            <input type="text" id="task-name" placeholder="Nombre de la tarea" required />
                            <select id="task-priority">
                                <option value="baja">Prioridad baja</option>
                                <option value="media">Prioridad media</option>
                                <option value="alta">Prioridad alta</option>
                            </select>
                        </div>
                        <div class="form-row">
                            <textarea id="task-description" placeholder="Descripción (opcional)"></textarea>
                        </div>
                        <div class="form-row">
                            <select id="task-project">
                                <option value="">Sin proyecto</option>
                            </select>
                            <input type="datetime-local" id="task-date" />
                        </div>
                        <div class="form-row">
                            <select id="task-repeat">
                                <option value="">Sin repetir</option>
                                <option value="daily">Diariamente</option>
                                <option value="weekly">Semanalmente</option>
                                <option value="monthly">Mensualmente</option>
                                <option value="yearly">Anualmente</option>
                            </select>
                            <input type="number" id="task-repeat-count" placeholder="Repetir X veces" min="1" max="100" style="display: none;" />
                        </div>
                        <div class="quick-date-buttons">
                            <button type="button" class="quick-date-btn" data-days="1">Mañana</button>
                            <button type="button" class="quick-date-btn" data-days="2">Pasado mañana</button>
                            <button type="button" class="quick-date-btn" data-days="7">En 1 semana</button>
                            <button type="button" class="quick-date-btn" data-days="15">En 15 días</button>
                            <button type="button" class="quick-date-btn" data-days="30">En 1 mes</button>
                            <button type="button" class="quick-date-btn" data-days="90">En 3 meses</button>
                            <button type="button" class="quick-date-btn" data-days="180">En 6 meses</button>
                            <button type="button" class="quick-date-btn" data-days="365">En 1 año</button>
                        </div>
                        <div class="form-row">
                            <div class="tags-input-container">
                                <div class="input-with-button">
                                    <input type="text" id="task-tags" placeholder="Etiquetas (presiona Enter para agregar)" />
                                    <button type="button" class="add-item-btn" onclick="window.tasksModule.addTagFromMainForm()" title="Agregar etiqueta">+</button>
                                </div>
                                <div class="tags-suggestions" id="tagsSuggestions"></div>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="input-with-button">
                                <input type="text" id="task-subtasks" placeholder="Subtareas (presiona Enter para agregar)" />
                                <button type="button" class="add-item-btn" onclick="window.tasksModule.addSubtaskFromMainForm()" title="Agregar subtarea">+</button>
                            </div>
                        </div>
                        <div class="form-row alerts-form-row">
                            <label class="form-label">Alertas</label>
                            <div class="alerts-editor">
                                <div class="alerts-list" id="mainFormAlertsList"></div>
                                <div class="alert-input-container">
                                    <input type="text" class="form-input" id="mainFormAlertTitleInput" placeholder="Título de la alerta">
                                    <input type="text" class="form-input" id="mainFormAlertMessageInput" placeholder="Mensaje de la alerta">
                                    <input type="datetime-local" class="form-input" id="mainFormAlertDateInput">
                                    <input type="url" class="form-input" id="mainFormAlertWebhookInput" placeholder="URL del webhook (opcional)">
                                    <button type="button" class="add-item-btn" onclick="window.tasksModule.addAlertToMainForm()" title="Agregar alerta">+</button>
                                </div>
                                <div class="alert-help-message" style="font-size: 12px; color: #666; margin-top: 8px; padding: 6px 8px; background: #f8f9fa; border-radius: 4px; border-left: 3px solid #007cba;">
                                    ⏰ <strong>Importante:</strong> La fecha y hora de la alerta debe ser futura para que funcione correctamente.
                                </div>
                            </div>
                        </div>
                        <div id="selected-tags" style="margin-bottom: 12px;"></div>
                        <div id="selected-subtasks" style="margin-bottom: 12px;"></div>
                        <div id="selected-alerts" style="margin-bottom: 12px;"></div>
                        <button type="submit" class="add-btn">Añadir tarea</button>
                    </form>
                </div>

                <div class="tasks-list" id="tasksList">
                    <!-- Las tareas se cargarán dinámicamente -->
                </div>

                <div class="empty-state" id="emptyState" style="display: none;">
                    <div class="empty-icon">📋</div>
                    <div class="empty-title">Sin tareas</div>
                    <div class="empty-description">¡Añade tu primera tarea para comenzar!</div>
                </div>
            </div>

            ${this.getModalsHTML()}
        `;
        
        this.api.updateModuleContainer(containerHTML);
    }
    
    getModalsHTML() {
        return `
            <!-- Modal para editar tareas -->
            <div class="modal" id="taskModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title">Detalles de la tarea</h2>
                        <button class="modal-close" onclick="window.tasksModule.hideTaskModal()">×</button>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Título</label>
                        <input type="text" class="form-input" id="modalTaskTitle" placeholder="Nombre de la tarea">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Descripción</label>
                        <textarea class="form-input form-textarea" id="modalTaskDescription" placeholder="Descripción de la tarea"></textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Proyecto</label>
                        <select class="form-select" id="modalTaskProject">
                            <option value="">Sin proyecto</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Fecha límite</label>
                        <input type="datetime-local" class="form-input" id="modalTaskDate">
                        <div class="quick-date-buttons modal-quick-dates">
                            <button type="button" class="quick-date-btn" data-modal-days="1">Mañana</button>
                            <button type="button" class="quick-date-btn" data-modal-days="2">Pasado mañana</button>
                            <button type="button" class="quick-date-btn" data-modal-days="7">1 semana</button>
                            <button type="button" class="quick-date-btn" data-modal-days="15">15 días</button>
                            <button type="button" class="quick-date-btn" data-modal-days="30">1 mes</button>
                            <button type="button" class="quick-date-btn" data-modal-days="90">3 meses</button>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Prioridad</label>
                        <select class="form-select" id="modalTaskPriority">
                            <option value="alta">Prioridad alta</option>
                            <option value="media">Prioridad media</option>
                            <option value="baja" selected>Prioridad baja</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Repetir tarea</label>
                        <div style="display: flex; gap: 8px;">
                            <select class="form-select" id="modalTaskRepeat" style="flex: 1;">
                                <option value="">Sin repetir</option>
                                <option value="daily">Diariamente</option>
                                <option value="weekly">Semanalmente</option>
                                <option value="monthly">Mensualmente</option>
                                <option value="yearly">Anualmente</option>
                            </select>
                            <input type="number" class="form-input" id="modalTaskRepeatCount" placeholder="X veces" min="1" max="100" style="width: 100px; display: none;" />
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Etiquetas</label>
                        <div class="tags-input-container">
                            <div class="input-with-button">
                                <input type="text" class="form-input" id="modalTaskLabels" placeholder="Añadir etiqueta y presionar Enter">
                                <button type="button" class="add-item-btn" onclick="window.tasksModule.addTagFromInput()" title="Agregar etiqueta">+</button>
                            </div>
                            <div class="tags-suggestions" id="modalTagsSuggestions"></div>
                        </div>
                        <div class="selected-labels" id="selectedLabels"></div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Subtareas</label>
                        <div class="subtasks-editor">
                            <div class="subtasks-list" id="modalSubtasksList"></div>
                            <div class="input-with-button">
                                <input type="text" class="form-input" id="newSubtaskInput" placeholder="Añadir subtarea y presionar Enter">
                                <button type="button" class="add-item-btn" onclick="window.tasksModule.addSubtaskFromInput()" title="Agregar subtarea">+</button>
                            </div>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Alertas</label>
                        <div class="alerts-editor">
                            <div class="alerts-list" id="modalAlertsList"></div>
                            <div class="alert-input-container">
                                <input type="text" class="form-input" id="alertTitleInput" placeholder="Título de la alerta">
                                <input type="text" class="form-input" id="alertMessageInput" placeholder="Mensaje de la alerta">
                                <input type="datetime-local" class="form-input" id="alertDateInput">
                                <input type="url" class="form-input" id="alertWebhookInput" placeholder="URL del webhook (opcional)">
                                <button type="button" class="add-item-btn" onclick="window.tasksModule.addAlert()" title="Agregar alerta">+</button>
                            </div>
                        </div>
                    </div>
                    <div class="form-group">
                        <button class="btn btn-primary" onclick="window.tasksModule.saveTask()" style="width: 100%;">Guardar</button>
                    </div>
                </div>
            </div>

            <!-- Modal para proyectos -->
            <div class="modal" id="projectModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title" id="projectModalTitle">Nuevo proyecto</h2>
                        <button class="modal-close" onclick="window.tasksModule.hideProjectModal()">×</button>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Nombre del proyecto</label>
                        <input type="text" class="form-input" id="projectNameInput" placeholder="Mi proyecto">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Color</label>
                        <select class="form-select" id="projectColorInput">
                            <option value="#db4035">🔴 Rojo</option>
                            <option value="#ff9933">🟠 Naranja</option>
                            <option value="#fad000">🟡 Amarillo</option>
                            <option value="#299438">🟢 Verde</option>
                            <option value="#6accbc">🔵 Azul claro</option>
                            <option value="#158fad">🔷 Azul</option>
                            <option value="#14aaf5">💙 Azul cielo</option>
                            <option value="#96c3eb">🩵 Azul pastel</option>
                            <option value="#884dff">🟣 Morado</option>
                            <option value="#af38eb">🟪 Rosa</option>
                        </select>
                    </div>
                    <div class="form-group" style="display: flex; gap: 12px;">
                        <button class="btn btn-primary" onclick="window.tasksModule.saveProject()" style="flex: 1;">Guardar</button>
                        <button class="btn btn-danger" id="deleteProjectBtn" onclick="window.tasksModule.deleteProject()" style="display: none;">Eliminar</button>
                    </div>
                </div>
            </div>

            <!-- Modal de Configuración de IA -->
            <div class="modal" id="aiConfigModal">
                <div class="modal-content" style="max-width: 600px;">
                    <div class="modal-header">
                        <h2 class="modal-title">⚙️ Configuración de IA</h2>
                        <button class="modal-close" onclick="window.tasksModule.hideAIConfigModal()">×</button>
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
                                <option value="gpt-4.1-nano">GPT-4.1 nano (Recomendado)</option>
                                <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Económico)</option>
                                <option value="gpt-4-turbo">GPT-4 Turbo (Balanceado)</option>
                                <option value="gpt-4">GPT-4 (Más caro)</option>
                            </select>
                        </div>

                        <div class="config-item">
                            <label class="form-label">📏 Máx. tokens respuesta</label>
                            <div class="slider-container">
                                <input type="range" class="slider" id="maxTokens" min="100" max="4000" value="1000" step="100">
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
                        <button class="btn btn-primary" onclick="window.tasksModule.saveAIConfig()" style="width: 100%;">Guardar Configuración</button>
                    </div>
                </div>
            </div>

            <!-- Modal de Estadísticas de IA -->
            <div class="modal" id="aiStatsModal">
                <div class="modal-content" style="max-width: 700px;">
                    <div class="modal-header">
                        <h2 class="modal-title">📊 Estadísticas de Uso de IA</h2>
                        <button class="modal-close" onclick="window.tasksModule.hideAIStatsModal()">×</button>
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
                        <button class="btn btn-secondary" onclick="window.tasksModule.exportStats()" style="flex: 1;">📤 Exportar</button>
                        <button class="btn btn-secondary" onclick="window.tasksModule.clearStats()" style="flex: 1;">🗑️ Limpiar</button>
                    </div>
                </div>
            </div>

            <!-- Modal de Gestión de Escenarios -->
            <div class="modal" id="scenarioModal">
                <div class="modal-content" style="max-width: 600px;">
                    <div class="modal-header">
                        <h2 class="modal-title">🎭 Gestión de Escenarios</h2>
                        <button class="modal-close" onclick="window.tasksModule.hideScenarioModal()">×</button>
                    </div>
                    
                    <div class="form-group">
                        <h3 style="margin-bottom: 12px;">📋 Escenarios Existentes</h3>
                        <div id="scenariosList" class="scenarios-list">
                            <!-- Los escenarios se cargarán dinámicamente -->
                        </div>
                    </div>

                    <div class="form-group">
                        <h3 style="margin-bottom: 12px;">📊 Información del Escenario Actual</h3>
                        <div class="scenario-info-card">
                            <div class="scenario-info-item">
                                <strong>Nombre:</strong> <span id="currentScenarioName">Personal</span>
                            </div>
                            <div class="scenario-info-item">
                                <strong>Tareas:</strong> <span id="currentScenarioTasks">0</span>
                            </div>
                            <div class="scenario-info-item">
                                <strong>Proyectos:</strong> <span id="currentScenarioProjects">0</span>
                            </div>
                            <div class="scenario-info-item">
                                <strong>Creado:</strong> <span id="currentScenarioCreated">-</span>
                            </div>
                        </div>
                    </div>

                    <div class="warning-box">
                        <h4>⚠️ Importante</h4>
                        <p>Cada escenario mantiene sus datos completamente separados. Al cambiar de escenario se guardan automáticamente los datos del escenario actual.</p>
                    </div>
                </div>
            </div>

            <!-- Modal para Nuevo/Editar Escenario -->
            <div class="modal" id="newScenarioModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title" id="scenarioModalTitle">➕ Nuevo Escenario</h2>
                        <button class="modal-close" onclick="window.tasksModule.hideNewScenarioModal()">×</button>
                    </div>
                    <div class="form-group">
                        <label class="form-label">🏷️ Nombre del Escenario</label>
                        <input type="text" class="form-input" id="scenarioNameInput" placeholder="ej: Trabajo, Familia, Estudios">
                    </div>
                    <div class="form-group">
                        <label class="form-label">🎨 Icono</label>
                        <select class="form-select" id="scenarioIconInput">
                            <option value="🏠">🏠 Personal</option>
                            <option value="🏢">🏢 Trabajo</option>
                            <option value="👨‍👩‍👧‍👦">👨‍👩‍👧‍👦 Familia</option>
                            <option value="📚">📚 Estudios</option>
                            <option value="💼">💼 Freelance</option>
                            <option value="🎯">🎯 Objetivos</option>
                            <option value="🏋️‍♀️">🏋️‍♀️ Fitness</option>
                            <option value="✈️">✈️ Viajes</option>
                            <option value="🎨">🎨 Creatividad</option>
                            <option value="💰">💰 Finanzas</option>
                            <option value="🏠">🏠 Hogar</option>
                            <option value="🎮">🎮 Hobbies</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">📝 Descripción (Opcional)</label>
                        <textarea class="form-input form-textarea" id="scenarioDescriptionInput" placeholder="Describe el propósito de este escenario"></textarea>
                    </div>
                    <div class="form-group" style="display: flex; gap: 12px;">
                        <button class="btn btn-primary" onclick="window.tasksModule.saveScenario()" style="flex: 1;">Guardar</button>
                        <button class="btn btn-danger" id="deleteScenarioBtn" onclick="window.tasksModule.deleteScenario()" style="display: none;">Eliminar</button>
                    </div>
                </div>
            </div>

            <!-- Modal de Gestión de Datos -->
            <div class="modal" id="dataManagementModal">
                <div class="modal-content" style="max-width: 600px;">
                    <div class="modal-header">
                        <h2 class="modal-title">💾 Gestión de Datos</h2>
                        <button class="modal-close" onclick="window.tasksModule.hideTasksDataManagementModal()">×</button>
                    </div>

                    <div class="form-group">
                        <h3 style="margin-bottom: 12px;">📤 Exportar Datos</h3>
                        <p style="color: #666; margin-bottom: 16px; font-size: 14px;">
                            Exporta todas tus tareas, proyectos y configuración para hacer respaldo o transferir a otro dispositivo.
                        </p>
                        <div class="data-actions">
                            <button class="btn btn-primary" onclick="window.tasksModule.exportAllData()">
                                📤 Exportar Todo
                            </button>
                            <button class="btn btn-secondary" onclick="window.tasksModule.exportTasks()">
                                📋 Solo Tareas
                            </button>
                            <button class="btn btn-secondary" onclick="window.tasksModule.exportProjects()">
                                📁 Solo Proyectos
                            </button>
                        </div>
                    </div>

                    <div class="form-group">
                        <h3 style="margin-bottom: 12px;">📥 Importar Datos</h3>
                        <p style="color: #666; margin-bottom: 16px; font-size: 14px;">
                            Importa datos previamente exportados. <strong>Advertencia:</strong> Esto reemplazará todos los datos actuales.
                        </p>
                        <input type="file" id="importFileInput" accept=".json" style="margin-bottom: 16px;" />
                        <div class="data-actions">
                            <button class="btn btn-primary" onclick="window.tasksModule.importData()">
                                📥 Importar Datos
                            </button>
                            <button class="btn btn-danger" onclick="window.tasksModule.clearAllData()">
                                🗑️ Limpiar Todo
                            </button>
                        </div>
                    </div>

                    <div class="warning-box">
                        <h4>⚠️ Importante</h4>
                        <p>Siempre haz una copia de seguridad antes de importar datos o limpiar. Los datos eliminados no se pueden recuperar.</p>
                    </div>
                </div>
            </div>
        `;
    }
    
    // ===== EVENT LISTENERS =====
    setupEventListeners() {
        // Configurar eventos después de que se haya cargado la interfaz
        setTimeout(() => {
            this.setupFormEventListeners();
            this.setupModalsEventListeners();
            this.setupAIConfigListeners();
            this.setupContainerListeners();
        }, 100);
    }
    
    setupContainerListeners() {
        // Event listener para cerrar formulario
        const closeFormBtn = document.getElementById('closeFormBtn');
        if (closeFormBtn) {
            closeFormBtn.addEventListener('click', () => this.toggleTaskForm());
        }
        
        // Event listeners para botones de fecha rápida en formulario
        document.querySelectorAll('.quick-date-btn[data-days]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const days = parseInt(e.target.getAttribute('data-days'));
                this.setQuickDate(days);
            });
        });
        
        // Event listeners para botones de fecha rápida en modal
        document.querySelectorAll('.quick-date-btn[data-modal-days]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const days = parseInt(e.target.getAttribute('data-modal-days'));
                this.setModalQuickDate(days);
            });
        });
        
    }
    
    setupFormEventListeners() {
        // Form submit
        const taskForm = document.getElementById('task-form');
        if (taskForm) {
            taskForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFormSubmit();
            });
        }
        
        // Establecer fecha y hora actual por defecto
        const taskDateInput = document.getElementById('task-date');
        if (taskDateInput) {
            taskDateInput.value = this.getCurrentDateTimeString();
        }
        
        // Manejar campo de repetición
        const taskRepeatSelect = document.getElementById('task-repeat');
        const taskRepeatCountInput = document.getElementById('task-repeat-count');
        if (taskRepeatSelect && taskRepeatCountInput) {
            taskRepeatSelect.addEventListener('change', (e) => {
                if (e.target.value) {
                    taskRepeatCountInput.style.display = 'block';
                    taskRepeatCountInput.value = '5'; // Valor por defecto
                } else {
                    taskRepeatCountInput.style.display = 'none';
                    taskRepeatCountInput.value = '';
                }
            });
        }
        
        // Manejar campo de repetición en modal
        const modalTaskRepeatSelect = document.getElementById('modalTaskRepeat');
        const modalTaskRepeatCountInput = document.getElementById('modalTaskRepeatCount');
        if (modalTaskRepeatSelect && modalTaskRepeatCountInput) {
            modalTaskRepeatSelect.addEventListener('change', (e) => {
                if (e.target.value) {
                    modalTaskRepeatCountInput.style.display = 'block';
                    modalTaskRepeatCountInput.value = '5'; // Valor por defecto
                } else {
                    modalTaskRepeatCountInput.style.display = 'none';
                    modalTaskRepeatCountInput.value = '';
                }
            });
        }
        
        // Tags y subtasks input handlers
        this.handleTagInput();
        this.handleSubtaskInputForm();
    }
    
    setupModalsEventListeners() {
        // Cerrar modales al hacer clic fuera
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', function(e) {
                if (e.target === this) {
                    this.classList.remove('active');
                }
            });
        });
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
    
    // ===== FUNCIONES DE UTILIDAD PARA FECHAS =====
    getTodayDateString() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    getCurrentDateTimeString() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }
    
    getDateFromString(dateString) {
        if (!dateString) return null;
        const parts = dateString.split('T')[0].split('-');
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    }
    
    compareDates(date1String, date2String) {
        const date1 = this.getDateFromString(date1String);
        const date2 = this.getDateFromString(date2String);
        
        if (!date1 || !date2) return 0;
        
        if (date1 < date2) return -1;
        if (date1 > date2) return 1;
        return 0;
    }
    
    addDaysToDate(days) {
        const date = new Date();
        date.setDate(date.getDate() + days);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }
    
    getDaysRemaining(dueDate) {
        if (!dueDate) return null;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const due = this.getDateFromString(dueDate);
        if (!due) return null;
        
        const diffTime = due - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return diffDays;
    }
    
    getDaysRemainingBadge(daysRemaining) {
        if (daysRemaining === null) return null;
        
        let text, className;
        
        if (daysRemaining < 0) {
            text = `Vencido ${Math.abs(daysRemaining)} día${Math.abs(daysRemaining) > 1 ? 's' : ''}`;
            className = 'days-remaining-overdue';
        } else if (daysRemaining === 0) {
            text = 'Hoy';
            className = 'days-remaining-today';
        } else if (daysRemaining === 1) {
            text = 'Mañana';
            className = 'days-remaining-soon';
        } else if (daysRemaining <= 7) {
            text = `${daysRemaining} días`;
            className = 'days-remaining-soon';
        } else {
            text = `${daysRemaining} días`;
            className = 'days-remaining-future';
        }
        
        return { text, className };
    }
    
    getDueDateInfo(dueDate) {
        if (!dueDate) return null;
        
        const now = new Date();
        const taskDateTime = new Date(dueDate);
        
        // Formatear fecha y hora completa
        const dateStr = taskDateTime.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        const timeStr = taskDateTime.toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        const fullDateTime = `${dateStr} ${timeStr}`;
        
        // Determinar si está vencida
        if (taskDateTime <= now) {
            return { 
                text: `${fullDateTime} (Vencida)`, 
                class: 'due-overdue',
                isOverdue: true 
            };
        } else {
            return { 
                text: fullDateTime, 
                class: 'due-future',
                isOverdue: false 
            };
        }
    }
    
    getTimeRemainingInfo(dueDate) {
        if (!dueDate) return null;
        
        const now = new Date();
        const taskDateTime = new Date(dueDate);
        const todayStr = this.getTodayDateString();
        const taskDateStr = dueDate.split('T')[0];
        
        // Solo mostrar tiempo restante para tareas de hoy que no han vencido
        if (taskDateStr === todayStr && taskDateTime > now) {
            const timeDiff = taskDateTime.getTime() - now.getTime();
            const hours = Math.floor(timeDiff / (1000 * 60 * 60));
            const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
            
            let timeText = '';
            let className = '';
            
            if (hours > 0) {
                timeText = `${hours}h ${minutes}m restantes`;
                className = hours >= 2 ? 'time-remaining-safe' : 'time-remaining-soon';
            } else if (minutes > 0) {
                timeText = `${minutes}m restantes`;
                className = minutes >= 30 ? 'time-remaining-soon' : 'time-remaining-urgent';
            } else {
                timeText = 'Menos de 1m';
                className = 'time-remaining-urgent';
            }
            
            return {
                text: timeText,
                class: className
            };
        }
        
        return null;
    }
    
    setQuickDate(days) {
        const dateInput = document.getElementById('task-date');
        if (dateInput) {
            dateInput.value = this.addDaysToDate(days);
            dateInput.style.background = '#e8f5e8';
            setTimeout(() => dateInput.style.background = '', 300);
        }
    }
    
    setModalQuickDate(days) {
        const dateInput = document.getElementById('modalTaskDate');
        if (dateInput) {
            dateInput.value = this.addDaysToDate(days);
            dateInput.style.background = '#e8f5e8';
            setTimeout(() => dateInput.style.background = '', 300);
        }
    }
    
    // ===== GESTIÓN DE TAREAS =====
    async handleFormSubmit() {
        const name = document.getElementById('task-name').value.trim();
        const description = document.getElementById('task-description').value.trim();
        const projectId = parseInt(document.getElementById('task-project').value) || null;
        const date = document.getElementById('task-date').value;
        const priority = document.getElementById('task-priority').value;
        const repeatType = document.getElementById('task-repeat').value;
        const repeatCount = parseInt(document.getElementById('task-repeat-count').value) || 1;
        
        if (name) {
            // Crear la tarea principal
            const nuevaTarea = {
                id: this.data.taskIdCounter++,
                title: name,
                description: description || '',
                projectId: projectId,
                dueDate: date || null,
                priority,
                labels: [...this.selectedTags],
                subtasks: [...this.selectedSubtasks],
                alerts: this.selectedAlerts ? [...this.selectedAlerts] : [],
                completed: false,
                createdAt: new Date().toISOString(),
                customOrder: this.data.tasks.length,
                repeatType: repeatType || null,
                repeatCount: repeatType ? repeatCount : null,
                isRepeated: false,
                originalTaskId: null
            };
            
            // Programar alertas si existen
            if (this.selectedAlerts && this.selectedAlerts.length > 0) {
                this.selectedAlerts.forEach(alert => {
                    if (alert.active) {
                        const alertDate = new Date(alert.alertDate);
                        const now = new Date();
                        if (alertDate > now) {
                            this.scheduleAlert(alert);
                        }
                    }
                });
            }
            
            this.data.tasks.push(nuevaTarea);
            
            // Crear tareas repetidas si se especificó repetición
            if (repeatType && date) {
                const createdTasks = this.createRepeatedTasks(nuevaTarea, repeatType, repeatCount);
                this.data.tasks.push(...createdTasks);
            }
            
            await this.saveData();
            this.renderTasks();
            this.renderLabels();
            this.updateCounts();
            
            // Limpiar formulario
            this.clearForm();
            
            const projectName = projectId ? this.data.projects.find(p => p.id === projectId)?.name : 'Sin proyecto';
            const alertsCount = this.selectedAlerts ? this.selectedAlerts.length : 0;
            const alertsText = alertsCount > 0 ? ` con ${alertsCount} alerta${alertsCount > 1 ? 's' : ''}` : '';
            const repeatText = repeatType ? ` (${repeatCount} repeticiones ${this.getRepeatTypeText(repeatType)})` : '';
            this.api.showMessage(`✅ Tarea "${name}" añadida en "${projectName}"${alertsText}${repeatText} (ID: ${nuevaTarea.id})`);
        }
    }
    
    clearForm() {
        const form = document.getElementById('task-form');
        if (form) {
            form.reset();
            document.getElementById('task-date').value = this.getCurrentDateTimeString();
            this.selectedTags = [];
            this.selectedSubtasks = [];
            this.selectedAlerts = [];
            this.renderSelectedTags();
            this.renderSelectedSubtasks();
            this.renderSelectedAlerts();
        }
    }
    
    async duplicateTask(taskId) {
        const originalTask = this.data.tasks.find(t => t.id === taskId);
        if (!originalTask) return;
        
        const duplicatedTask = {
            ...originalTask,
            id: this.data.taskIdCounter++,
            title: `${originalTask.title} (Copia)`,
            completed: false,
            completedAt: null,
            createdAt: new Date().toISOString(),
            subtasks: originalTask.subtasks ? originalTask.subtasks.map(sub => ({
                ...sub,
                id: this.data.subtaskIdCounter++,
                completed: false
            })) : []
        };
        
        this.data.tasks.push(duplicatedTask);
        await this.saveData();
        this.renderTasks();
        this.updateCounts();
        
        this.api.showMessage(`✅ Tarea duplicada: "${duplicatedTask.title}" (ID: ${duplicatedTask.id})`);
    }
    
    async toggleTask(taskId) {
        const task = this.data.tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            task.completedAt = task.completed ? new Date().toISOString() : null;
            await this.saveData();
            this.renderTasks();
            this.renderLabels();
            this.updateCounts();
        }
    }
    
    async toggleSubtask(taskId, subtaskId) {
        const task = this.data.tasks.find(t => t.id === taskId);
        if (task && task.subtasks) {
            const subtask = task.subtasks.find(s => s.id === subtaskId);
            if (subtask) {
                subtask.completed = !subtask.completed;
                await this.saveData();
                this.renderTasks();
            }
        }
    }
    
    async deleteTask(taskId) {
        if (confirm('¿Estás seguro de que quieres eliminar esta tarea?')) {
            this.data.tasks = this.data.tasks.filter(task => task.id !== taskId);
            await this.saveData();
            this.renderTasks();
            this.renderLabels();
            this.updateCounts();
            this.api.showMessage('🗑️ Tarea eliminada correctamente');
        }
    }
    
    editTask(taskId) {
        const task = this.data.tasks.find(t => t.id === taskId);
        if (task) {
            this.editingTask = task;
            
            document.getElementById('modalTaskTitle').value = task.title;
            document.getElementById('modalTaskDescription').value = task.description || '';
            document.getElementById('modalTaskProject').value = task.projectId || '';
            document.getElementById('modalTaskDate').value = task.dueDate || '';
            document.getElementById('modalTaskPriority').value = task.priority;
            
            this.loadTaskLabels(task.labels || []);
            this.loadTaskSubtasks(task.subtasks || []);
            this.loadTaskAlerts(task.alerts || []);
            
            this.showTaskModal();
        }
    }
    
    async saveTask() {
        const title = document.getElementById('modalTaskTitle').value.trim();
        if (!title) {
            this.api.showMessage('❌ El título de la tarea es requerido');
            return;
        }
        
        const repeatType = document.getElementById('modalTaskRepeat').value;
        const repeatCount = parseInt(document.getElementById('modalTaskRepeatCount').value) || 1;
        const dueDate = document.getElementById('modalTaskDate').value || null;
        
        const task = {
            id: this.editingTask ? this.editingTask.id : this.data.taskIdCounter++,
            title: title,
            description: document.getElementById('modalTaskDescription').value.trim(),
            completed: this.editingTask ? this.editingTask.completed : false,
            priority: document.getElementById('modalTaskPriority').value,
            dueDate: dueDate,
            projectId: parseInt(document.getElementById('modalTaskProject').value) || null,
            labels: this.getCurrentTaskLabels(),
            subtasks: this.getCurrentSubtasks(),
            alerts: this.currentTaskAlerts || [],
            createdAt: this.editingTask ? this.editingTask.createdAt : new Date().toISOString(),
            completedAt: this.editingTask ? this.editingTask.completedAt : null,
            customOrder: this.editingTask ? this.editingTask.customOrder : this.data.tasks.length,
            repeatType: repeatType || null,
            repeatCount: repeatType ? repeatCount : null,
            isRepeated: false,
            originalTaskId: null
        };
        
        if (this.editingTask) {
            const index = this.data.tasks.findIndex(t => t.id === this.editingTask.id);
            this.data.tasks[index] = task;
            this.api.showMessage('✅ Tarea actualizada correctamente');
        } else {
            this.data.tasks.push(task);
            
            // Crear tareas repetidas si se especificó repetición y es una nueva tarea
            if (repeatType && dueDate) {
                const createdTasks = this.createRepeatedTasks(task, repeatType, repeatCount);
                this.data.tasks.push(...createdTasks);
                
                const repeatText = ` (${repeatCount} repeticiones ${this.getRepeatTypeText(repeatType)})`;
                this.api.showMessage(`✅ Tarea creada correctamente${repeatText}`);
            } else {
                this.api.showMessage('✅ Tarea creada correctamente');
            }
        }
        
        await this.saveData();
        this.hideTaskModal();
        this.renderTasks();
        this.renderLabels();
        this.updateCounts();
    }

    // ===== RENDERIZADO =====
    getFilteredTasks() {
        let filtered = [...this.data.tasks];
        
        switch (this.currentView) {
            case 'today':
                const todayStr = this.getTodayDateString();
                filtered = filtered.filter(task => 
                    !task.completed && (
                        (task.dueDate && task.dueDate.split('T')[0] === todayStr) || 
                        (task.dueDate && this.compareDates(task.dueDate, todayStr) < 0)
                    )
                );
                break;
            case 'upcoming':
                const todayForUpcoming = this.getTodayDateString();
                filtered = filtered.filter(task => 
                    !task.completed && task.dueDate && this.compareDates(task.dueDate, todayForUpcoming) > 0
                );
                break;
            case 'inbox':
                filtered = filtered.filter(task => !task.completed && !task.projectId);
                break;
            case 'important':
                filtered = filtered.filter(task => !task.completed && task.priority === 'alta');
                break;
            case 'all':
                filtered = filtered.filter(task => !task.completed);
                break;
            case 'completed':
                filtered = filtered.filter(task => task.completed);
                break;
            case 'project':
                filtered = filtered.filter(task => task.projectId === this.selectedProject);
                break;
            case 'label':
                filtered = filtered.filter(task => 
                    task.labels && task.labels.includes(this.selectedLabel)
                );
                break;
            case 'search':
                const query = this.searchQuery.toLowerCase();
                filtered = filtered.filter(task => 
                    task.title.toLowerCase().includes(query) ||
                    (task.description && task.description.toLowerCase().includes(query)) ||
                    (task.labels && task.labels.some(label => 
                        label.toLowerCase().includes(query)
                    ))
                );
                break;
            default:
                break;
        }
        
        // Ordenar tareas
        filtered.sort((a, b) => {
            if (a.completed && !b.completed) return 1;
            if (!a.completed && b.completed) return -1;
            
            if (a.customOrder !== undefined && b.customOrder !== undefined) {
                if (a.customOrder !== b.customOrder) return a.customOrder - b.customOrder;
            }
            
            const priorityOrder = { 'alta': 1, 'media': 2, 'baja': 3 };
            const aPriority = priorityOrder[a.priority] || 3;
            const bPriority = priorityOrder[b.priority] || 3;
            
            if (aPriority !== bPriority) return aPriority - bPriority;
            if (a.dueDate && b.dueDate) {
                const comparison = this.compareDates(a.dueDate, b.dueDate);
                if (comparison !== 0) return comparison;
            }
            if (a.dueDate && !b.dueDate) return -1;
            if (!a.dueDate && b.dueDate) return 1;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });
        
        return filtered;
    }
    
    renderTasks() {
        const tasksList = document.getElementById('tasksList');
        if (!tasksList) return;
        
        const filteredTasks = this.getFilteredTasks();
        
        if (filteredTasks.length === 0) {
            tasksList.innerHTML = '';
            const emptyState = document.getElementById('emptyState');
            if (emptyState) emptyState.style.display = 'block';
            if (this.sortableInstance) {
                this.sortableInstance.destroy();
                this.sortableInstance = null;
            }
            return;
        }
        
        const emptyState = document.getElementById('emptyState');
        if (emptyState) emptyState.style.display = 'none';
        
        tasksList.innerHTML = filteredTasks.map(task => {
            const project = this.data.projects.find(p => p.id === task.projectId);
            const dueDateInfo = this.getDueDateInfo(task.dueDate);
            const timeRemainingInfo = this.getTimeRemainingInfo(task.dueDate);
            const daysRemaining = this.getDaysRemaining(task.dueDate);
            const daysRemainingBadge = this.getDaysRemainingBadge(daysRemaining);
            
            return `
                <div class="task-item ${task.completed ? 'completed' : ''}" data-task-id="${task.id}" onclick="window.tasksModule.selectTask(${task.id}, event)">
                    <div class="task-header">
                        <div class="task-checkbox ${task.completed ? 'completed' : ''}" onclick="event.stopPropagation(); window.tasksModule.toggleTask(${task.id})">
                            ${task.completed ? '✓' : ''}
                        </div>
                        <div class="task-content">
                            <div class="task-title ${task.completed ? 'completed' : ''}">${task.title} <span class="task-id-badge">ID: ${task.id}</span></div>
                            ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
                            <div class="task-meta">
                                ${project ? `<div class="task-project">
                                    <div class="project-color" style="background-color: ${project.color}; width: 8px; height: 8px; border-radius: 50%; margin-right: 4px;"></div>
                                    ${project.name}
                                </div>` : ''}
                                ${task.dueDate ? `<div class="task-due-date ${dueDateInfo.class}">
                                    📅 ${dueDateInfo.text}
                                </div>` : ''}
                                ${timeRemainingInfo ? `<div class="time-remaining-badge ${timeRemainingInfo.class}">
                                    ⏱️ ${timeRemainingInfo.text}
                                </div>` : ''}
                                ${daysRemainingBadge ? `<div class="days-remaining-badge ${daysRemainingBadge.className}">
                                    ${daysRemainingBadge.text}
                                </div>` : ''}
                                ${task.priority !== 'baja' ? `<div class="task-priority priority-${task.priority}">
                                    ${task.priority}
                                </div>` : ''}
                                ${task.labels && task.labels.length > 0 ? `<div class="task-labels">
                                    ${task.labels.map(label => `<span class="task-label">#${label}</span>`).join('')}
                                </div>` : ''}
                            </div>
                            ${task.subtasks && task.subtasks.length > 0 ? `
                                <div class="subtasks">
                                    ${task.subtasks.map(subtask => `
                                        <div class="subtask-item">
                                            <div class="subtask-checkbox ${subtask.completed ? 'completed' : ''}" onclick="window.tasksModule.toggleSubtask(${task.id}, ${subtask.id})">
                                                ${subtask.completed ? '✓' : ''}
                                            </div>
                                            <div class="subtask-title ${subtask.completed ? 'completed' : ''}">${subtask.title}</div>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}
                        </div>
                        <div class="task-actions-menu">
                            <button class="action-btn duplicate-btn" onclick="window.tasksModule.duplicateTask(${task.id})" title="Duplicar tarea">
                                📋
                            </button>
                            <button class="action-btn" onclick="window.tasksModule.editTask(${task.id})" title="Editar">
                                ✏️
                            </button>
                            <button class="action-btn delete-btn" onclick="window.tasksModule.deleteTask(${task.id})" title="Eliminar">
                                🗑️
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        setTimeout(() => {
            this.initializeSortable();
        }, 100);
    }
    
    renderProjects() {
        const projectsList = document.getElementById('projectsList');
        if (!projectsList) return;
        
        projectsList.innerHTML = this.data.projects.map(project => {
            const taskCount = this.data.tasks.filter(t => t.projectId === project.id && !t.completed).length;
            return `
                <div class="nav-item" data-project="${project.id}" onclick="window.tasksModule.switchToProject(${project.id})">
                    <div class="project-color" style="background-color: ${project.color}"></div>
                    <div class="nav-item-text">${project.name}</div>
                    <div class="nav-item-count">${taskCount}</div>
                    <div class="project-actions">
                        <button class="project-action-btn" onclick="event.stopPropagation(); window.tasksModule.editProject(${project.id})" title="Editar">
                            ✏️
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        this.updateProjectSelects();
    }
    
    renderLabels() {
        const labelsList = document.getElementById('labelsList');
        if (!labelsList) return;
        
        const allLabels = new Set();
        this.data.tasks.forEach(task => {
            if (task.labels) {
                task.labels.forEach(label => allLabels.add(label));
            }
        });
        
        if (allLabels.size === 0) {
            labelsList.innerHTML = '<div style="padding: 8px 20px; font-size: 12px; color: #888; font-style: italic;">No hay etiquetas</div>';
            return;
        }
        
        labelsList.innerHTML = '';
        Array.from(allLabels).forEach(label => {
            const taskCount = this.data.tasks.filter(t => 
                !t.completed && t.labels && t.labels.includes(label)
            ).length;
            
            const navItem = document.createElement('div');
            navItem.className = 'nav-item';
            navItem.setAttribute('data-label', label);
            
            navItem.addEventListener('click', () => {
                this.switchToLabel(label);
            });
            
            navItem.innerHTML = `
                <div class="nav-item-icon">🏷️</div>
                <div class="nav-item-text">#${label}</div>
                <div class="nav-item-count">${taskCount}</div>
            `;
            
            labelsList.appendChild(navItem);
        });
    }
    
    updateCounts() {
        const todayStr = this.getTodayDateString();
        
        const counts = {
            today: this.data.tasks.filter(t => 
                !t.completed && (
                    (t.dueDate && t.dueDate.split('T')[0] === todayStr) || 
                    (t.dueDate && this.compareDates(t.dueDate, todayStr) < 0)
                )
            ).length,
            upcoming: this.data.tasks.filter(t => 
                !t.completed && t.dueDate && this.compareDates(t.dueDate, todayStr) > 0
            ).length,
            inbox: this.data.tasks.filter(t => !t.completed && !t.projectId).length,
            important: this.data.tasks.filter(t => !t.completed && t.priority === 'alta').length,
            all: this.data.tasks.filter(t => !t.completed).length,
            completed: this.data.tasks.filter(t => t.completed).length
        };
        
        Object.keys(counts).forEach(view => {
            const element = document.getElementById(`${view}Count`);
            if (element) {
                element.textContent = counts[view];
            }
        });
        
        this.renderProjects();
    }
    
    // ===== NAVEGACIÓN =====
    switchView(view) {
        this.currentView = view;
        
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-view="${view}"]`)?.classList.add('active');
        
        const titles = {
            today: 'Hoy',
            upcoming: 'Próximamente',
            inbox: 'Bandeja de entrada',
            important: 'Importante',
            all: 'Todas las tareas',
            completed: 'Completadas'
        };
        
        this.api.updateMainTitle(titles[view] || view);
        this.renderTasks();
    }
    
    switchToLabel(labelName) {
        this.currentView = 'label';
        this.selectedLabel = labelName;
        
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-label="${labelName}"]`)?.classList.add('active');
        
        this.api.updateMainTitle(`#${labelName}`);
        this.renderTasks();
    }
    
    switchToProject(projectId) {
        this.currentView = 'project';
        this.selectedProject = projectId;
        
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-project="${projectId}"]`)?.classList.add('active');
        
        const project = this.data.projects.find(p => p.id === projectId);
        this.api.updateMainTitle(project.name);
        this.renderTasks();
    }
    
    searchTasks() {
        const searchInput = document.getElementById('searchInput');
        if (!searchInput) return;
        
        const query = searchInput.value.trim().toLowerCase();
        this.searchQuery = query;
        
        if (query) {
            this.currentView = 'search';
            this.api.updateMainTitle(`Búsqueda: "${query}"`);
            
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
            });
        } else {
            this.switchView('today');
        }
        
        this.renderTasks();
    }
    
    // ===== FORMULARIO DE TAREAS =====
    toggleTaskForm() {
        const form = document.getElementById('taskForm');
        const btn = document.getElementById('toggleFormBtn');
        
        if (!form || !btn) return;
        
        this.isFormVisible = !this.isFormVisible;
        
        if (this.isFormVisible) {
            form.style.display = 'block';
            btn.innerHTML = '<span>📝</span>Ocultar formulario';
            setTimeout(() => {
                const taskNameInput = document.getElementById('task-name');
                if (taskNameInput) taskNameInput.focus();
            }, 100);
        } else {
            form.style.display = 'none';
            btn.innerHTML = '<span>📝</span>Mostrar formulario';
        }
    }
    
    // ===== DRAG AND DROP =====
    initializeSortable() {
        const tasksList = document.getElementById('tasksList');
        if (!tasksList) return;
        
        if (this.sortableInstance) {
            this.sortableInstance.destroy();
        }
        
        // Verificar si Sortable está disponible
        if (typeof Sortable === 'undefined') {
            console.warn('Sortable.js no está disponible. Drag and drop deshabilitado.');
            return;
        }
        
        this.sortableInstance = new Sortable(tasksList, {
            animation: 200,
            easing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            dragClass: 'sortable-drag',
            handle: '.task-item',
            forceFallback: false,
            fallbackTolerance: 3,
            onStart: (evt) => {
                evt.item.classList.add('dragging');
                // Añadir clase al contenedor para efectos visuales
                tasksList.classList.add('sorting-active');
            },
            onEnd: (evt) => {
                evt.item.classList.remove('dragging');
                tasksList.classList.remove('sorting-active');
                
                if (evt.oldIndex !== evt.newIndex) {
                    this.reorderTasks(evt.oldIndex, evt.newIndex);
                }
            }
        });
    }
    
    async reorderTasks(oldIndex, newIndex) {
        const filteredTasks = this.getFilteredTasks();
        const taskToMove = filteredTasks[oldIndex];
        
        if (!taskToMove) return;
        
        const realOldIndex = this.data.tasks.findIndex(t => t.id === taskToMove.id);
        const [movedTask] = this.data.tasks.splice(realOldIndex, 1);
        
        let realNewIndex;
        if (newIndex === 0) {
            realNewIndex = 0;
        } else if (newIndex >= filteredTasks.length - 1) {
            realNewIndex = this.data.tasks.length;
        } else {
            const taskAfter = filteredTasks[newIndex];
            realNewIndex = this.data.tasks.findIndex(t => t.id === taskAfter.id);
        }
        
        this.data.tasks.splice(realNewIndex, 0, movedTask);
        
        this.data.tasks.forEach((task, index) => {
            task.customOrder = index;
        });
        
        await this.saveData();
        this.renderTasks();
        
        this.api.showMessage(`📋 Tarea "${movedTask.title}" reordenada`);
    }
    
    // ===== GESTIÓN DE PROYECTOS =====
    showProjectModal(projectId = null) {
        const modal = document.getElementById('projectModal');
        const title = document.getElementById('projectModalTitle');
        const deleteBtn = document.getElementById('deleteProjectBtn');
        
        if (!modal || !title || !deleteBtn) return;
        
        if (projectId) {
            this.editingProject = this.data.projects.find(p => p.id === projectId);
            title.textContent = 'Editar proyecto';
            document.getElementById('projectNameInput').value = this.editingProject.name;
            document.getElementById('projectColorInput').value = this.editingProject.color;
            deleteBtn.style.display = 'block';
        } else {
            this.editingProject = null;
            title.textContent = 'Nuevo proyecto';
            document.getElementById('projectNameInput').value = '';
            document.getElementById('projectColorInput').value = '#db4035';
            deleteBtn.style.display = 'none';
        }
        
        modal.classList.add('active');
        const nameInput = document.getElementById('projectNameInput');
        if (nameInput) nameInput.focus();
    }
    
    hideProjectModal() {
        const modal = document.getElementById('projectModal');
        if (modal) modal.classList.remove('active');
        this.editingProject = null;
    }
    
    async saveProject() {
        const name = document.getElementById('projectNameInput').value.trim();
        const color = document.getElementById('projectColorInput').value;
        
        if (!name) {
            this.api.showMessage('❌ El nombre del proyecto es requerido');
            return;
        }
        
        if (this.editingProject) {
            this.editingProject.name = name;
            this.editingProject.color = color;
            this.api.showMessage(`✅ Proyecto "${name}" actualizado correctamente`);
        } else {
            const project = {
                id: this.data.projectIdCounter++,
                name: name,
                color: color
            };
            this.data.projects.push(project);
            this.api.showMessage(`✅ Proyecto "${name}" creado correctamente`);
        }
        
        this.hideProjectModal();
        this.renderProjects();
        this.updateProjectSelects();
        await this.saveData();
    }
    
    async deleteProject() {
        if (!this.editingProject) return;
        
        const projectName = this.editingProject.name;
        const tasksInProject = this.data.tasks.filter(t => t.projectId === this.editingProject.id);
        
        let confirmMessage = `¿Estás seguro de que quieres eliminar el proyecto "${projectName}"?`;
        if (tasksInProject.length > 0) {
            confirmMessage += `\n\nEsto también moverá ${tasksInProject.length} tarea(s) a "Sin proyecto".`;
        }
        
        if (confirm(confirmMessage)) {
            tasksInProject.forEach(task => {
                task.projectId = null;
            });
            
            this.data.projects = this.data.projects.filter(p => p.id !== this.editingProject.id);
            
            this.hideProjectModal();
            this.renderProjects();
            this.renderTasks();
            this.updateProjectSelects();
            this.updateCounts();
            await this.saveData();
            
            this.api.showMessage(`🗑️ Proyecto "${projectName}" eliminado correctamente`);
            
            if (this.currentView === 'project' && this.selectedProject === this.editingProject.id) {
                this.switchView('today');
            }
        }
    }
    
    editProject(projectId) {
        this.showProjectModal(projectId);
    }
    
    updateProjectSelects() {
        const selects = [document.getElementById('task-project'), document.getElementById('modalTaskProject')];
        selects.forEach(select => {
            if (select) {
                const currentValue = select.value;
                select.innerHTML = `
                    <option value="">Sin proyecto</option>
                    ${this.data.projects.map(project => 
                        `<option value="${project.id}">${project.name}</option>`
                    ).join('')}
                `;
                select.value = currentValue;
            }
        });
    }
    
    // ===== ETIQUETAS Y SUBTAREAS =====
    getAllExistingLabels() {
        const labels = new Set();
        this.data.tasks.forEach(task => {
            if (task.labels) {
                task.labels.forEach(label => labels.add(label));
            }
        });
        return Array.from(labels).sort();
    }
    
    handleTagInput() {
        const input = document.getElementById('task-tags');
        if (!input) return;
        
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const tag = input.value.trim();
                if (tag && !this.selectedTags.includes(tag)) {
                    this.selectedTags.push(tag);
                    input.value = '';
                    this.renderSelectedTags();
                }
                const suggestions = document.getElementById('tagsSuggestions');
                if (suggestions) suggestions.classList.remove('show');
            }
        });
        
        input.addEventListener('input', () => {
            this.showTagSuggestions(input, document.getElementById('tagsSuggestions'));
        });
        
        input.addEventListener('blur', () => {
            this.hideTagSuggestions(document.getElementById('tagsSuggestions'));
        });
    }
    
    handleSubtaskInputForm() {
        const input = document.getElementById('task-subtasks');
        if (!input) return;
        
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const subtask = input.value.trim();
                if (subtask) {
                    this.selectedSubtasks.push({
                        id: this.data.subtaskIdCounter++,
                        title: subtask,
                        completed: false
                    });
                    input.value = '';
                    this.renderSelectedSubtasks();
                }
            }
        });
    }
    
    renderSelectedTags() {
        const container = document.getElementById('selected-tags');
        if (!container) return;
        
        container.innerHTML = '';
        
        this.selectedTags.forEach((tag, index) => {
            const labelElement = document.createElement('span');
            labelElement.className = 'selected-label';
            labelElement.innerHTML = `#${tag} `;
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-label-btn';
            removeBtn.type = 'button';
            removeBtn.innerHTML = '×';
            removeBtn.addEventListener('click', () => {
                this.removeTag(index);
            });
            
            labelElement.appendChild(removeBtn);
            container.appendChild(labelElement);
        });
    }
    
    renderSelectedSubtasks() {
        const container = document.getElementById('selected-subtasks');
        if (!container) return;
        
        container.innerHTML = this.selectedSubtasks.map(subtask => `
            <div class="subtask-editor-item" style="margin-bottom: 4px;">
                <div class="subtask-editor-content">
                    <input type="checkbox" ${subtask.completed ? 'checked' : ''} onchange="window.tasksModule.toggleFormSubtask(${subtask.id})">
                    <span style="flex: 1; padding: 4px;">${subtask.title}</span>
                    <button class="remove-subtask-btn" onclick="window.tasksModule.removeFormSubtask(${subtask.id})" type="button">🗑️</button>
                </div>
            </div>
        `).join('');
    }
    
    removeTag(index) {
        this.selectedTags.splice(index, 1);
        this.renderSelectedTags();
    }
    
    removeFormSubtask(id) {
        this.selectedSubtasks = this.selectedSubtasks.filter(s => s.id !== id);
        this.renderSelectedSubtasks();
    }
    
    toggleFormSubtask(id) {
        const subtask = this.selectedSubtasks.find(s => s.id === id);
        if (subtask) {
            subtask.completed = !subtask.completed;
        }
    }
    
    showTagSuggestions(inputElement, suggestionsElement) {
        if (!inputElement || !suggestionsElement) return;
        
        const query = inputElement.value.toLowerCase();
        const existingLabels = this.getAllExistingLabels();
        
        if (query.length === 0) {
            suggestionsElement.classList.remove('show');
            return;
        }
        
        let currentLabels = [];
        if (inputElement.id === 'task-tags') {
            currentLabels = this.selectedTags;
        } else {
            currentLabels = this.getCurrentTaskLabels();
        }
        
        const filteredLabels = existingLabels.filter(label => 
            label.toLowerCase().includes(query) && 
            !currentLabels.includes(label)
        );
        
        if (filteredLabels.length === 0) {
            suggestionsElement.classList.remove('show');
            return;
        }
        
        suggestionsElement.innerHTML = '';
        filteredLabels.forEach((label) => {
            const suggestionDiv = document.createElement('div');
            suggestionDiv.className = 'tag-suggestion';
            suggestionDiv.innerHTML = `
                <span class="tag-suggestion-icon">🏷️</span>
                #${label}
            `;
            
            suggestionDiv.addEventListener('click', () => {
                this.selectTagSuggestion(label, inputElement.id, suggestionsElement.id);
            });
            
            suggestionsElement.appendChild(suggestionDiv);
        });
        
        suggestionsElement.classList.add('show');
    }
    
    selectTagSuggestion(label, inputId, suggestionsId) {
        if (inputId === 'task-tags') {
            if (!this.selectedTags.includes(label)) {
                this.selectedTags.push(label);
                this.renderSelectedTags();
            }
        } else {
            if (!this.getCurrentTaskLabels().includes(label)) {
                this.addTaskLabel(label);
            }
        }
        
        const input = document.getElementById(inputId);
        const suggestions = document.getElementById(suggestionsId);
        if (input) input.value = '';
        if (suggestions) suggestions.classList.remove('show');
    }
    
    hideTagSuggestions(suggestionsElement) {
        if (!suggestionsElement) return;
        
        setTimeout(() => {
            suggestionsElement.classList.remove('show');
        }, 200);
    }
    
    // ===== MODALES =====
    showTaskModal() {
        const modal = document.getElementById('taskModal');
        if (!modal) return;
        
        modal.classList.add('active');
        this.updateProjectSelects();
        
        if (!this.editingTask) {
            // Limpiar campos para nueva tarea
            document.getElementById('modalTaskTitle').value = '';
            document.getElementById('modalTaskDescription').value = '';
            document.getElementById('modalTaskProject').value = '';
            document.getElementById('modalTaskDate').value = this.getCurrentDateTimeString();
            document.getElementById('modalTaskPriority').value = 'baja';
            document.getElementById('selectedLabels').innerHTML = '';
            document.getElementById('modalSubtasksList').innerHTML = '';
            document.getElementById('modalTaskLabels').value = '';
            document.getElementById('newSubtaskInput').value = '';
        }

        setTimeout(() => {
            this.setupModalEventListeners();
        }, 100);
    }
    
    hideTaskModal() {
        const modal = document.getElementById('taskModal');
        if (modal) modal.classList.remove('active');
        this.editingTask = null;
        
        // Limpiar campos
        const selectedLabels = document.getElementById('selectedLabels');
        const modalSubtasksList = document.getElementById('modalSubtasksList');
        const modalTaskLabels = document.getElementById('modalTaskLabels');
        const newSubtaskInput = document.getElementById('newSubtaskInput');
        const modalAlertsList = document.getElementById('modalAlertsList');
        
        if (selectedLabels) selectedLabels.innerHTML = '';
        if (modalSubtasksList) modalSubtasksList.innerHTML = '';
        if (modalTaskLabels) modalTaskLabels.value = '';
        if (newSubtaskInput) newSubtaskInput.value = '';
        if (modalAlertsList) modalAlertsList.innerHTML = '';
        
        // Limpiar alertas del modal
        this.currentTaskAlerts = [];
        
        // Cancelar timeouts de alertas si existen
        if (this.alertTimeouts) {
            Object.values(this.alertTimeouts).forEach(timeout => {
                clearTimeout(timeout);
            });
            this.alertTimeouts = {};
        }
    }
    
    setupModalEventListeners() {
        const subtaskInput = document.getElementById('newSubtaskInput');
        const labelInput = document.getElementById('modalTaskLabels');
        
        if (subtaskInput) {
            subtaskInput.onkeypress = null;
            subtaskInput.addEventListener('keypress', (e) => this.handleSubtaskInput(e));
        }
        
        if (labelInput) {
            labelInput.onkeypress = null;
            labelInput.addEventListener('keypress', (e) => this.handleLabelInput(e));
            labelInput.addEventListener('input', () => {
                this.showTagSuggestions(labelInput, document.getElementById('modalTagsSuggestions'));
            });
            labelInput.addEventListener('blur', () => {
                this.hideTagSuggestions(document.getElementById('modalTagsSuggestions'));
            });
        }
    }
    
    handleLabelInput(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            const input = event.target;
            const label = input.value.trim();
            
            if (label && !this.getCurrentTaskLabels().includes(label)) {
                this.addTaskLabel(label);
                input.value = '';
            }
            
            const suggestionsId = input.id === 'task-tags' ? 'tagsSuggestions' : 'modalTagsSuggestions';
            const suggestions = document.getElementById(suggestionsId);
            if (suggestions) suggestions.classList.remove('show');
        }
    }
    
    addTaskLabel(label) {
        const selectedLabelsContainer = document.getElementById('selectedLabels');
        if (!selectedLabelsContainer) return;
        
        const labelElement = document.createElement('span');
        labelElement.className = 'selected-label';
        labelElement.setAttribute('data-label-name', label);
        labelElement.innerHTML = `#${label} `;
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-label-btn';
        removeBtn.type = 'button';
        removeBtn.innerHTML = '×';
        removeBtn.addEventListener('click', function() {
            labelElement.remove();
        });
        
        labelElement.appendChild(removeBtn);
        selectedLabelsContainer.appendChild(labelElement);
    }
    
    getCurrentTaskLabels() {
        const selectedLabelsContainer = document.getElementById('selectedLabels');
        if (!selectedLabelsContainer) return [];
        
        const labelElements = selectedLabelsContainer.querySelectorAll('.selected-label');
        
        return Array.from(labelElements).map(element => {
            return element.getAttribute('data-label-name');
        });
    }
    
    loadTaskLabels(labels) {
        const selectedLabelsContainer = document.getElementById('selectedLabels');
        if (!selectedLabelsContainer) return;
        
        selectedLabelsContainer.innerHTML = '';
        
        labels.forEach(label => {
            this.addTaskLabel(label);
        });
    }
    
    handleSubtaskInput(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            const input = event.target;
            const subtaskTitle = input.value.trim();
            
            if (subtaskTitle) {
                this.addSubtask(subtaskTitle);
                input.value = '';
            }
        }
    }
    
    addSubtask(title, completed = false, id = null) {
        const subtasksList = document.getElementById('modalSubtasksList');
        if (!subtasksList) return;
        
        const subtaskId = id || this.data.subtaskIdCounter++;
        
        const subtaskElement = document.createElement('div');
        subtaskElement.className = 'subtask-editor-item';
        subtaskElement.setAttribute('data-subtask-id', subtaskId);
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'subtask-editor-checkbox';
        checkbox.checked = completed;
        
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'subtask-editor-input';
        input.value = title;
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-subtask-btn';
        removeBtn.type = 'button';
        removeBtn.innerHTML = '🗑️';
        removeBtn.addEventListener('click', function() {
            subtaskElement.remove();
        });
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'subtask-editor-content';
        contentDiv.appendChild(checkbox);
        contentDiv.appendChild(input);
        contentDiv.appendChild(removeBtn);
        
        subtaskElement.appendChild(contentDiv);
        subtasksList.appendChild(subtaskElement);
    }
    
    getCurrentSubtasks() {
        const subtaskItems = document.querySelectorAll('.subtask-editor-item');
        return Array.from(subtaskItems).map(item => {
            const id = parseInt(item.getAttribute('data-subtask-id'));
            const checkbox = item.querySelector('.subtask-editor-checkbox');
            const input = item.querySelector('.subtask-editor-input');
            
            return {
                id: id,
                title: input.value.trim(),
                completed: checkbox.checked
            };
        }).filter(subtask => subtask.title);
    }
    
    loadTaskSubtasks(subtasks) {
        const subtasksList = document.getElementById('modalSubtasksList');
        if (!subtasksList) return;
        
        subtasksList.innerHTML = '';
        
        subtasks.forEach(subtask => {
            this.addSubtask(subtask.title, subtask.completed, subtask.id);
            if (subtask.id >= this.data.subtaskIdCounter) {
                this.data.subtaskIdCounter = subtask.id + 1;
            }
        });
    }
    
    loadTaskAlerts(alerts) {
        const alertsList = document.getElementById('modalAlertsList');
        if (!alertsList) return;
        
        // Limpiar lista actual
        alertsList.innerHTML = '';
        
        // Inicializar array de alertas de la tarea actual
        this.currentTaskAlerts = [];
        
        // Cargar alertas existentes
        if (alerts && alerts.length > 0) {
            alerts.forEach(alert => {
                // Asegurar que la alerta tenga la propiedad active
                if (alert.active === undefined) {
                    alert.active = true;
                }
                
                this.currentTaskAlerts.push(alert);
                this.addAlertToList(alert);
                
                // Programar la alerta si está activa y es futura
                if (alert.active) {
                    const alertDate = new Date(alert.alertDate);
                    const now = new Date();
                    if (alertDate > now) {
                        this.scheduleAlert(alert);
                    }
                }
            });
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
        if (currentModel) currentModel.textContent = this.aiConfig.model.replace('gpt-', 'GPT-').replace('-turbo', ' Turbo').replace('4.1-nano', '4.1 nano');
        
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
        link.download = `ai-stats-${new Date().toISOString().split('T')[0]}.json`;
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
    
    // ===== GESTIÓN DE ESCENARIOS =====
    createScenario(name, icon = '📋', description = '') {
        const scenarioId = this.data.scenarioIdCounter++;
        
        this.data.scenarios[scenarioId] = {
            id: scenarioId,
            name: name,
            icon: icon,
            description: description,
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
        };
        
        this.saveData();
        this.renderScenarioSelect();
        return scenarioId;
    }
    
    async deleteScenarioById(scenarioId) {
        if (scenarioId === 1) {
            this.api.showMessage('❌ No se puede eliminar el escenario por defecto');
            return false;
        }
        
        if (scenarioId === this.data.currentScenario) {
            await this.switchScenario(1);
        }
        
        delete this.data.scenarios[scenarioId];
        await this.saveData();
        this.renderScenarioSelect();
        return true;
    }
    
    renderScenarioSelect() {
        const select = document.getElementById('scenarioSelect');
        if (!select) return;
        
        select.innerHTML = '';
        
        Object.values(this.data.scenarios).forEach(scenario => {
            const option = document.createElement('option');
            option.value = scenario.id;
            option.textContent = `${scenario.icon} ${scenario.name}`;
            if (scenario.id === this.data.currentScenario) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    }
    
    showScenarioModal() {
        const modal = document.getElementById('scenarioModal');
        if (!modal) return;
        
        modal.classList.add('active');
        this.renderScenariosList();
        this.updateCurrentScenarioInfo();
    }
    
    hideScenarioModal() {
        const modal = document.getElementById('scenarioModal');
        if (modal) modal.classList.remove('active');
    }
    
    showNewScenarioModal(scenarioId = null) {
        const modal = document.getElementById('newScenarioModal');
        const title = document.getElementById('scenarioModalTitle');
        const deleteBtn = document.getElementById('deleteScenarioBtn');
        
        if (!modal || !title || !deleteBtn) return;
        
        if (scenarioId) {
            this.editingScenario = this.data.scenarios[scenarioId];
            title.textContent = '✏️ Editar Escenario';
            document.getElementById('scenarioNameInput').value = this.editingScenario.name;
            document.getElementById('scenarioIconInput').value = this.editingScenario.icon;
            document.getElementById('scenarioDescriptionInput').value = this.editingScenario.description || '';
            deleteBtn.style.display = scenarioId === 1 ? 'none' : 'block';
        } else {
            this.editingScenario = null;
            title.textContent = '➕ Nuevo Escenario';
            document.getElementById('scenarioNameInput').value = '';
            document.getElementById('scenarioIconInput').value = '📋';
            document.getElementById('scenarioDescriptionInput').value = '';
            deleteBtn.style.display = 'none';
        }
        
        modal.classList.add('active');
        const nameInput = document.getElementById('scenarioNameInput');
        if (nameInput) nameInput.focus();
    }
    
    hideNewScenarioModal() {
        const modal = document.getElementById('newScenarioModal');
        if (modal) modal.classList.remove('active');
        this.editingScenario = null;
    }
    
    async saveScenario() {
        const name = document.getElementById('scenarioNameInput').value.trim();
        const icon = document.getElementById('scenarioIconInput').value;
        const description = document.getElementById('scenarioDescriptionInput').value.trim();
        
        if (!name) {
            this.api.showMessage('❌ El nombre del escenario es requerido');
            return;
        }
        
        if (this.editingScenario) {
            this.editingScenario.name = name;
            this.editingScenario.icon = icon;
            this.editingScenario.description = description;
            this.api.showMessage(`✅ Escenario "${name}" actualizado`);
        } else {
            const scenarioId = this.createScenario(name, icon, description);
            this.api.showMessage(`✅ Escenario "${name}" creado`);
            
            if (confirm(`¿Quieres cambiar al escenario "${name}" ahora?`)) {
                await this.switchScenario(scenarioId);
            }
        }
        
        this.hideNewScenarioModal();
        this.renderScenarioSelect();
        this.setupModuleActions(); // Actualizar acciones para mostrar el nuevo escenario
    }
    
    async deleteScenario() {
        if (!this.editingScenario || this.editingScenario.id === 1) {
            this.api.showMessage('❌ No se puede eliminar el escenario por defecto');
            return;
        }
        
        const scenarioName = this.editingScenario.name;
        
        if (confirm(`¿Eliminar "${scenarioName}"? Esta acción no se puede deshacer.`)) {
            if (await this.deleteScenarioById(this.editingScenario.id)) {
                this.hideNewScenarioModal();
                this.api.showMessage(`🗑️ Escenario "${scenarioName}" eliminado`);
                this.setupModuleActions(); // Actualizar acciones
            }
        }
    }
    
    renderScenariosList() {
        const container = document.getElementById('scenariosList');
        if (!container) return;
        
        container.innerHTML = '';
        
        Object.values(this.data.scenarios).forEach(scenario => {
            const scenarioElement = document.createElement('div');
            scenarioElement.className = `scenario-item ${scenario.id === this.data.currentScenario ? 'active' : ''}`;
            
            const tasksCount = scenario.data.tasks?.length || 0;
            const projectsCount = scenario.data.projects?.length || 0;
            const completedTasks = scenario.data.tasks?.filter(t => t.completed).length || 0;
            
            scenarioElement.innerHTML = `
                <div class="scenario-info">
                    <div class="scenario-icon">${scenario.icon}</div>
                    <div class="scenario-details">
                        <div class="scenario-name">${scenario.name}</div>
                        <div class="scenario-stats">${tasksCount} tareas (${completedTasks} completadas), ${projectsCount} proyectos</div>
                    </div>
                </div>
                <div class="scenario-actions">
                    ${scenario.id !== this.data.currentScenario ? `<button class="scenario-action-btn switch" onclick="window.tasksModule.switchScenario('${scenario.id}')" title="Cambiar">🔄</button>` : ''}
                    <button class="scenario-action-btn edit" onclick="window.tasksModule.showNewScenarioModal('${scenario.id}')" title="Editar">✏️</button>
                    ${scenario.id !== 'default' ? `<button class="scenario-action-btn delete" onclick="window.tasksModule.deleteScenarioConfirm('${scenario.id}')" title="Eliminar">🗑️</button>` : ''}
                </div>
            `;
            
            container.appendChild(scenarioElement);
        });
    }
    
    async deleteScenarioConfirm(scenarioId) {
        const scenario = this.data.scenarios[scenarioId];
        if (!scenario || scenario.id === 1) return;
        
        if (confirm(`¿Eliminar "${scenario.name}"? Esta acción no se puede deshacer.`)) {
            if (await this.deleteScenarioById(scenarioId)) {
                this.api.showMessage(`🗑️ Escenario eliminado`);
                this.renderScenariosList();
                this.setupModuleActions();
            }
        }
    }
    
    updateCurrentScenarioInfo() {
        const current = this.data.scenarios[this.data.currentScenario];
        if (!current) return;
        
        const currentScenarioName = document.getElementById('currentScenarioName');
        const currentScenarioTasks = document.getElementById('currentScenarioTasks');
        const currentScenarioProjects = document.getElementById('currentScenarioProjects');
        const currentScenarioCreated = document.getElementById('currentScenarioCreated');
        
        if (currentScenarioName) currentScenarioName.textContent = current.name;
        if (currentScenarioTasks) currentScenarioTasks.textContent = current.data.tasks?.length || 0;
        if (currentScenarioProjects) currentScenarioProjects.textContent = current.data.projects?.length || 0;
        if (currentScenarioCreated) currentScenarioCreated.textContent = new Date(current.createdAt).toLocaleDateString();
    }
    
    // ===== GESTIÓN DE DATOS =====
    showTasksDataManagementModal() {
        const modal = document.getElementById('dataManagementModal');
        if (modal) modal.classList.add('active');
    }
    
    hideTasksDataManagementModal() {
        const modal = document.getElementById('dataManagementModal');
        if (modal) modal.classList.remove('active');
    }
    
    async exportAllData() {
        try {
            // Guardar datos del escenario actual antes de exportar
            this.saveCurrentScenarioData();
            
            const allData = {
                scenarios: this.data.scenarios,
                currentScenario: this.data.currentScenario,
                exportDate: new Date().toISOString(),
                version: '4.0',
                source: 'wordpress'
            };
            
            const dataStr = JSON.stringify(allData, null, 2);
            const dataBlob = new Blob([dataStr], {type: 'application/json'});
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `task-manager-backup-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
            this.api.showMessage('📤 Todos los datos exportados correctamente');
        } catch (error) {
            console.error('Error exportando datos:', error);
            this.api.showMessage('❌ Error al exportar datos');
        }
    }
    
    async exportTasks() {
        this.saveCurrentScenarioData();
        const tasksData = {
            tasks: this.data.tasks,
            scenario: this.data.currentScenario,
            exportDate: new Date().toISOString(),
            type: 'tasks-only',
            source: 'wordpress'
        };
        
        const dataStr = JSON.stringify(tasksData, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `tasks-backup-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        this.api.showMessage('📤 Tareas exportadas correctamente');
    }
    
    async exportProjects() {
        this.saveCurrentScenarioData();
        const projectsData = {
            projects: this.data.projects,
            scenario: this.data.currentScenario,
            exportDate: new Date().toISOString(),
            type: 'projects-only',
            source: 'wordpress'
        };
        
        const dataStr = JSON.stringify(projectsData, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `projects-backup-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        this.api.showMessage('📤 Proyectos exportados correctamente');
    }
    
    async importData() {
        const fileInput = document.getElementById('importFileInput');
        const file = fileInput.files[0];
        
        if (!file) {
            this.api.showMessage('❌ Por favor selecciona un archivo para importar');
            return;
        }

        // Verificar extensión del archivo en lugar de MIME type
        const fileName = file.name.toLowerCase();
        if (!fileName.endsWith('.json')) {
            this.api.showMessage('❌ Por favor selecciona un archivo JSON válido (.json)');
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                
                if (!confirm('⚠️ ¿Estás seguro? Esto reemplazará todos los datos actuales. Esta acción no se puede deshacer.')) {
                    return;
                }

                // Validar estructura de datos
                if (!importedData || typeof importedData !== 'object') {
                    throw new Error('Estructura de datos inválida');
                }

                // Importar escenarios completos
                if (importedData.scenarios && typeof importedData.scenarios === 'object') {
                    this.data.scenarios = importedData.scenarios;
                    this.data.currentScenario = importedData.currentScenario || 'default';
                } else if (importedData.type === 'tasks-only' && importedData.tasks) {
                    // Importar solo tareas al escenario actual
                    if (this.data.scenarios[this.data.currentScenario]) {
                        this.data.scenarios[this.data.currentScenario].data.tasks = importedData.tasks;
                    }
                } else if (importedData.type === 'projects-only' && importedData.projects) {
                    // Importar solo proyectos al escenario actual
                    if (this.data.scenarios[this.data.currentScenario]) {
                        this.data.scenarios[this.data.currentScenario].data.projects = importedData.projects;
                    }
                } else {
                    throw new Error('Formato de archivo no reconocido');
                }
                
                // Cargar datos del escenario actual
                this.loadScenarioData(this.data.currentScenario);
                
                // Guardar todo
                await this.saveData();
                
                // Actualizar interfaz
                this.setupModuleActions();
                this.renderTasks();
                this.renderProjects();
                this.renderLabels();
                this.updateCounts();
                
                this.hideTasksDataManagementModal();
                this.api.showMessage('✅ Datos importados correctamente');
                
                // Limpiar el input de archivo
                fileInput.value = '';
                
            } catch (error) {
                console.error('Error importing data:', error);
                this.api.showMessage(`❌ Error al importar datos: ${error.message}`);
            }
        };
        
        reader.onerror = () => {
            this.api.showMessage('❌ Error al leer el archivo');
        };
        
        reader.readAsText(file);
    }
    
    async clearAllData() {
        if (!confirm('⚠️ ¿Estás COMPLETAMENTE seguro? Esto eliminará TODOS los datos (escenarios, tareas, proyectos, configuración). Esta acción NO se puede deshacer.')) {
            return;
        }
        
        if (!confirm('⚠️ ÚLTIMA CONFIRMACIÓN: Se eliminarán todos tus datos. ¿Continuar?')) {
            return;
        }
        
        try {
            // Reiniciar datos a valores por defecto
            this.data = {
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
                scenarioIdCounter: 2,
                tasks: [],
                projects: [],
                taskIdCounter: 1,
                projectIdCounter: 4,
                subtaskIdCounter: 1000
            };
            
            this.aiConfig = {
                apiKey: '',
                model: 'gpt-4.1-nano',
                maxTokens: 1000,
                temperature: 0.7,
                historyLimit: 10
            };
            
            this.aiStats = {
                todayQueries: 0,
                totalTokens: 0,
                estimatedCost: 0,
                usageHistory: [],
                currentModel: 'GPT-4.1 nano',
                lastResetDate: new Date().toDateString()
            };
            
            // Cargar datos del escenario por defecto
            this.loadScenarioData(1);
            
            // Guardar estado limpio
            await this.saveData();
            
            // Actualizar interfaz
            this.setupModuleActions();
            this.renderTasks();
            this.renderProjects();
            this.renderLabels();
            this.updateCounts();
            
            // Cambiar a vista por defecto
            this.switchView('today');
            
            this.hideTasksDataManagementModal();
            this.api.showMessage('🗑️ Todos los datos han sido eliminados correctamente');
        } catch (error) {
            console.error('Error limpiando datos:', error);
            this.api.showMessage('❌ Error al limpiar datos');
        }
    }
    
    // ===== ASISTENTE DE IA =====
    initializeAssistant() {
        this.assistant = new TasksAssistant(this);
    }
    
    toggleChat() {
        const chatContainer = document.getElementById('chat-container');
        const minimizeBtn = document.getElementById('chatMinimizeBtn');
        
        if (!chatContainer || !minimizeBtn) return;
        
        if (chatContainer.classList.contains('minimized')) {
            chatContainer.classList.remove('minimized');
            minimizeBtn.textContent = '−';
        } else {
            chatContainer.classList.add('minimized');
            minimizeBtn.textContent = '+';
        }
    }
    
    mostrarMensajeChat(mensaje, esUsuario = false) {
        const container = document.getElementById('chat-messages');
        if (!container) return;
        
        const div = document.createElement('div');
        div.className = `chat-message ${esUsuario ? 'user' : 'bot'}`;
        
        if (esUsuario) {
            div.innerHTML = `<strong>Tú:</strong> ${mensaje}`;
        } else {
            // Verificar si marked está disponible
            let html;
            if (typeof marked !== 'undefined') {
                html = marked.parse ? marked.parse(mensaje) : marked(mensaje);
            } else {
                // Fallback simple sin marked.js
                html = mensaje.replace(/\n/g, '<br>');
            }
            div.innerHTML = `<strong>AI:</strong> ${html}`;
        }
        
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
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
            const respuesta = await this.assistant.consultarConFunciones(mensaje);
            
            const loadingElement = document.getElementById('loading-message');
            if (loadingElement) {
                loadingElement.remove();
            }
            
            this.mostrarMensajeChat(respuesta);
            this.renderTasks();
            this.renderLabels();
            this.updateCounts();
        } catch (error) {
            const loadingElement = document.getElementById('loading-message');
            if (loadingElement) {
                loadingElement.remove();
            }
            
            this.mostrarMensajeChat('❌ Error al procesar tu mensaje: ' + error.message);
        }
    }
    
    showWelcomeMessage() {
        let welcomeMessage = '🎭 **¡SISTEMA DE ESCENARIOS ACTIVADO!**\n\n';
        
        welcomeMessage += `✨ **Escenario Actual:** ${this.data.scenarios[this.data.currentScenario].icon} ${this.data.scenarios[this.data.currentScenario].name}\n\n`;
        
        if (!this.aiConfig.apiKey) {
            welcomeMessage += '🔑 **Configura tu API Key:** Ve a "Configurar IA" en el sidebar para habilitar el asistente.\n\n';
        }
        
        welcomeMessage += '🎯 **FUNCIONALIDADES DE ESCENARIOS:**\n';
        welcomeMessage += '- 🏢 **Múltiples espacios de trabajo:** Empresa, Personal, Estudios, etc.\n';
        welcomeMessage += '- 🔄 **Cambio instantáneo:** Cambia entre escenarios sin perder datos\n';
        welcomeMessage += '- 💾 **Datos independientes:** Cada escenario mantiene sus propias tareas y proyectos\n';
        welcomeMessage += '- ⚙️ **Gestión completa:** Crea, edita y elimina escenarios fácilmente\n\n';
        
        welcomeMessage += '📋 **CÓMO USAR LOS ESCENARIOS:**\n';
        welcomeMessage += '1. **Crear:** Botón ➕ junto al selector de escenarios\n';
        welcomeMessage += '2. **Cambiar:** Selecciona otro escenario del dropdown\n';
        welcomeMessage += '3. **Gestionar:** Botón ⚙️ para ver y administrar todos los escenarios\n';
        welcomeMessage += '4. **Organizar:** Cada escenario tiene sus propios proyectos y tareas\n\n';
        
        welcomeMessage += '🚀 **FUNCIONES INCLUIDAS:**\n';
        welcomeMessage += '- 📅 Botones de fecha rápida\n';
        welcomeMessage += '- 🏷️ Badge de días restantes\n';
        welcomeMessage += '- 📋 Duplicación de tareas\n';
        welcomeMessage += '- 🖱️ Drag & Drop para reordenar\n';
        welcomeMessage += '- 🤖 Asistente de IA contextual\n\n';
        
        const totalScenarios = Object.keys(this.data.scenarios).length;
        const totalTasksAllScenarios = Object.values(this.data.scenarios).reduce((sum, scenario) => {
            return sum + (scenario.data.tasks?.length || 0);
        }, 0);
        
        welcomeMessage += `📊 **Estado Actual:**\n`;
        welcomeMessage += `- **Escenarios creados:** ${totalScenarios}\n`;
        welcomeMessage += `- **Tareas en este escenario:** ${this.data.tasks.length}\n`;
        welcomeMessage += `- **Total de tareas:** ${totalTasksAllScenarios}\n\n`;
        
        welcomeMessage += '🎉 **¡Organiza tu vida en contextos separados y mantén todo bajo control!**';
        
        this.mostrarMensajeChat(welcomeMessage);
    }
    
    // ===== GESTIÓN DE ALERTAS =====
    addAlert() {
        const titleInput = document.getElementById('alertTitleInput');
        const messageInput = document.getElementById('alertMessageInput');
        const dateInput = document.getElementById('alertDateInput');
        const webhookInput = document.getElementById('alertWebhookInput');
        
        const title = titleInput.value.trim();
        const message = messageInput.value.trim();
        const alertDate = dateInput.value;
        const webhookUrl = webhookInput.value.trim();
        
        if (!title || !message || !alertDate) {
            this.api.showMessage('❌ Título, mensaje y fecha son requeridos para la alerta');
            return;
        }
        
        // Verificar que la fecha sea en el futuro
        const alertDateTime = new Date(alertDate);
        const now = new Date();
        if (alertDateTime <= now) {
            this.api.showMessage('❌ La fecha de la alerta debe ser en el futuro');
            return;
        }
        
        const alertId = Date.now(); // Usar timestamp como ID único
        const alert = {
            id: alertId,
            title: title,
            message: message,
            alertDate: alertDate,
            webhookUrl: webhookUrl || null,
            active: true,
            created: new Date().toISOString()
        };
        
        // Inicializar array de alertas si no existe
        if (!this.currentTaskAlerts) {
            this.currentTaskAlerts = [];
        }
        
        // Agregar alerta al array temporal
        this.currentTaskAlerts.push(alert);
        
        // Agregar alerta a la lista del modal
        this.addAlertToList(alert);
        
        // Limpiar inputs
        titleInput.value = '';
        messageInput.value = '';
        dateInput.value = '';
        webhookInput.value = '';
        
        // Programar la alerta
        this.scheduleAlert(alert);
        
        this.api.showMessage(`✅ Alerta "${title}" programada para ${new Date(alertDate).toLocaleString()}`);
    }
    
    addAlertToList(alert) {
        const alertsList = document.getElementById('modalAlertsList');
        if (!alertsList) return;
        
        const alertElement = document.createElement('div');
        alertElement.className = `alert-item ${alert.active ? 'alert-active' : 'alert-inactive'}`;
        alertElement.setAttribute('data-alert-id', alert.id);
        
        const alertDate = new Date(alert.alertDate);
        const timeRemaining = this.getTimeRemaining(alertDate);
        
        // Mostrar parte del URL si existe
        let urlDisplay = '';
        if (alert.webhookUrl) {
            try {
                const url = new URL(alert.webhookUrl);
                const domain = url.hostname;
                const path = url.pathname.length > 20 ? url.pathname.substring(0, 20) + '...' : url.pathname;
                urlDisplay = `<div class="alert-webhook">🔗 ${domain}${path}</div>`;
            } catch (e) {
                // Si no es una URL válida, mostrar los primeros caracteres
                const shortUrl = alert.webhookUrl.length > 30 ? alert.webhookUrl.substring(0, 30) + '...' : alert.webhookUrl;
                urlDisplay = `<div class="alert-webhook">🔗 ${shortUrl}</div>`;
            }
        }
        
        alertElement.innerHTML = `
            <div class="alert-content">
                <div class="alert-header">
                    <strong>${alert.title}</strong>
                    <div class="alert-actions">
                        <button class="alert-action-btn edit-alert-btn" onclick="window.tasksModule.editAlert(${alert.id})" title="Editar fecha">✏️</button>
                        <button class="alert-action-btn toggle-alert-btn" onclick="window.tasksModule.toggleAlert(${alert.id})" title="${alert.active ? 'Desactivar' : 'Activar'}">${alert.active ? '⏸️' : '▶️'}</button>
                        <button class="alert-action-btn duplicate-alert-btn" onclick="window.tasksModule.duplicateAlert(${alert.id})" title="Duplicar alerta">📋</button>
                        <button class="alert-action-btn remove-alert-btn" onclick="window.tasksModule.removeAlert(${alert.id})" title="Eliminar alerta">🗑️</button>
                    </div>
                </div>
                <div class="alert-message">${alert.message}</div>
                <div class="alert-date">📅 ${alertDate.toLocaleString()}</div>
                <div class="alert-countdown" id="countdown-${alert.id}">${alert.active ? timeRemaining : '⏸️ Pausada'}</div>
                ${urlDisplay}
                <div class="alert-status ${alert.active ? 'status-active' : 'status-inactive'}">
                    ${alert.active ? '🟢 Activa' : '🔴 Inactiva'}
                </div>
            </div>
        `;
        
        alertsList.appendChild(alertElement);
    }
    
    removeAlert(alertId) {
        const alertElement = document.querySelector(`[data-alert-id="${alertId}"]`);
        if (alertElement) {
            alertElement.remove();
        }
        
        // Cancelar timeout si existe
        if (this.alertTimeouts && this.alertTimeouts[alertId]) {
            clearTimeout(this.alertTimeouts[alertId]);
            delete this.alertTimeouts[alertId];
        }
        
        // Remover de la lista de alertas de la tarea actual
        if (this.currentTaskAlerts) {
            this.currentTaskAlerts = this.currentTaskAlerts.filter(alert => alert.id !== alertId);
        }
        
        this.api.showMessage('🗑️ Alerta eliminada');
    }
    
    editAlert(alertId) {
        const alert = this.currentTaskAlerts?.find(a => a.id === alertId);
        if (!alert) return;
        
        const newDate = prompt('Nueva fecha y hora (YYYY-MM-DDTHH:MM):', alert.alertDate);
        if (!newDate) return;
        
        // Validar fecha
        const alertDateTime = new Date(newDate);
        const now = new Date();
        if (alertDateTime <= now) {
            this.api.showMessage('❌ La fecha debe ser en el futuro');
            return;
        }
        
        // Cancelar timeout anterior
        if (this.alertTimeouts && this.alertTimeouts[alertId]) {
            clearTimeout(this.alertTimeouts[alertId]);
            delete this.alertTimeouts[alertId];
        }
        
        // Actualizar alerta
        alert.alertDate = newDate;
        
        // Reprogramar si está activa
        if (alert.active) {
            this.scheduleAlert(alert);
        }
        
        // Actualizar UI
        this.updateAlertInList(alert);
        
        this.api.showMessage(`✅ Fecha de alerta actualizada a ${alertDateTime.toLocaleString()}`);
    }
    
    toggleAlert(alertId) {
        const alert = this.currentTaskAlerts?.find(a => a.id === alertId);
        if (!alert) return;
        
        alert.active = !alert.active;
        
        if (alert.active) {
            // Activar: programar la alerta
            this.scheduleAlert(alert);
            this.api.showMessage(`▶️ Alerta "${alert.title}" activada`);
        } else {
            // Desactivar: cancelar timeout
            if (this.alertTimeouts && this.alertTimeouts[alertId]) {
                clearTimeout(this.alertTimeouts[alertId]);
                delete this.alertTimeouts[alertId];
            }
            this.api.showMessage(`⏸️ Alerta "${alert.title}" desactivada`);
        }
        
        // Actualizar UI
        this.updateAlertInList(alert);
    }
    
    duplicateAlert(alertId) {
        const originalAlert = this.currentTaskAlerts?.find(a => a.id === alertId);
        if (!originalAlert) return;
        
        // Crear nueva fecha (1 hora después de la original)
        const originalDate = new Date(originalAlert.alertDate);
        const newDate = new Date(originalDate.getTime() + (60 * 60 * 1000)); // +1 hora
        
        const duplicatedAlert = {
            id: Date.now() + Math.random(), // ID único
            title: `${originalAlert.title} (Copia)`,
            message: originalAlert.message,
            alertDate: newDate.toISOString().slice(0, 16), // Formato YYYY-MM-DDTHH:MM
            webhookUrl: originalAlert.webhookUrl,
            active: true,
            created: new Date().toISOString()
        };
        
        // Agregar a la lista
        if (!this.currentTaskAlerts) {
            this.currentTaskAlerts = [];
        }
        this.currentTaskAlerts.push(duplicatedAlert);
        
        // Agregar a la UI
        this.addAlertToList(duplicatedAlert);
        
        // Programar la nueva alerta
        this.scheduleAlert(duplicatedAlert);
        
        this.api.showMessage(`📋 Alerta duplicada: "${duplicatedAlert.title}"`);
    }
    
    updateAlertInList(alert) {
        const alertElement = document.querySelector(`[data-alert-id="${alert.id}"]`);
        if (!alertElement) return;
        
        // Remover elemento actual y agregar actualizado
        alertElement.remove();
        this.addAlertToList(alert);
    }
    
    scheduleAlert(alert) {
        if (!this.alertTimeouts) {
            this.alertTimeouts = {};
        }
        
        const alertDate = new Date(alert.alertDate);
        const now = new Date();
        const timeUntilAlert = alertDate.getTime() - now.getTime();
        
        if (timeUntilAlert > 0) {
            this.alertTimeouts[alert.id] = setTimeout(() => {
                this.executeAlert(alert);
            }, timeUntilAlert);
            
            // Actualizar countdown cada segundo
            this.updateCountdown(alert.id, alertDate);
        }
    }
    
    updateCountdown(alertId, alertDate) {
        const countdownElement = document.getElementById(`countdown-${alertId}`);
        if (!countdownElement) return;
        
        const updateInterval = setInterval(() => {
            const now = new Date();
            const timeRemaining = alertDate.getTime() - now.getTime();
            
            if (timeRemaining <= 0) {
                clearInterval(updateInterval);
                countdownElement.textContent = '⏰ ¡Tiempo cumplido!';
                countdownElement.style.color = '#dc2626';
                countdownElement.style.fontWeight = 'bold';
                return;
            }
            
            const timeString = this.getTimeRemaining(alertDate);
            countdownElement.textContent = timeString;
        }, 1000);
    }
    
    getTimeRemaining(targetDate) {
        const now = new Date();
        const timeRemaining = targetDate.getTime() - now.getTime();
        
        if (timeRemaining <= 0) {
            return '⏰ ¡Tiempo cumplido!';
        }
        
        const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
        
        if (days > 0) {
            return `${days}d ${hours}h ${minutes}m`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m ${seconds}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        } else {
            return `${seconds}s`;
        }
    }
    
    async executeAlert(alert) {
        console.log('🚨 Ejecutando alerta:', alert.title);
        
        // Enviar notificación push
        await this.sendPushNotification(alert);
        
        // Ejecutar webhook si está configurado
        if (alert.webhookUrl) {
            await this.executeWebhook(alert);
        }
        
        // Actualizar UI
        const countdownElement = document.getElementById(`countdown-${alert.id}`);
        if (countdownElement) {
            countdownElement.textContent = '✅ Ejecutada';
            countdownElement.style.color = '#16a34a';
            countdownElement.style.fontWeight = 'bold';
        }
        
        // Limpiar timeout
        if (this.alertTimeouts && this.alertTimeouts[alert.id]) {
            delete this.alertTimeouts[alert.id];
        }
    }
    
    async sendPushNotification(alert) {
        try {
            // Solicitar permisos si no los tenemos
            if (!('Notification' in window)) {
                console.warn('Este navegador no soporta notificaciones');
                return;
            }
            
            let permission = Notification.permission;
            if (permission === 'default') {
                permission = await Notification.requestPermission();
            }
            
            if (permission !== 'granted') {
                console.warn('Permisos de notificación denegados');
                return;
            }
            
            // Registrar service worker si no está registrado
            if ('serviceWorker' in navigator) {
                try {
                    const swCode = `
                        self.addEventListener('install', function(event) {
                            console.log('SW: Instalando...');
                            self.skipWaiting();
                        });
                        
                        self.addEventListener('activate', function(event) {
                            console.log('SW: Activando...');
                            event.waitUntil(self.clients.claim());
                        });
                        
                        self.addEventListener('notificationclick', function(event) {
                            console.log('SW: Notificación clickeada');
                            event.notification.close();
                            
                            event.waitUntil(
                                clients.matchAll().then(function(clientList) {
                                    if (clientList.length > 0) {
                                        return clientList[0].focus();
                                    }
                                    return clients.openWindow('/');
                                })
                            );
                        });
                    `;
                    
                    const swBlob = new Blob([swCode], { type: 'application/javascript' });
                    const swUrl = URL.createObjectURL(swBlob);
                    
                    const registration = await navigator.serviceWorker.register(swUrl, {
                        scope: './'
                    });
                    await navigator.serviceWorker.ready;
                    
                    // Mostrar notificación
                    await registration.showNotification(alert.title, {
                        body: alert.message,
                        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="red" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12,6 12,12 16,14"></polyline></svg>',
                        badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="red" viewBox="0 0 16 16"><circle cx="8" cy="8" r="8"/></svg>',
                        tag: 'task-alert-' + alert.id,
                        requireInteraction: true,
                        vibrate: [200, 100, 200, 100, 200],
                        data: {
                            alertId: alert.id,
                            timestamp: Date.now()
                        }
                    });
                    
                } catch (swError) {
                    console.warn('Error con service worker, usando notificación simple:', swError);
                    // Fallback a notificación simple
                    new Notification(alert.title, {
                        body: alert.message,
                        icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="red" stroke-width="2"%3E%3Ccircle cx="12" cy="12" r="10"%3E%3C/circle%3E%3Cpolyline points="12,6 12,12 16,14"%3E%3C/polyline%3E%3C/svg%3E'
                    });
                }
            } else {
                // Notificación simple si no hay service worker
                new Notification(alert.title, {
                    body: alert.message,
                    icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="red" stroke-width="2"%3E%3Ccircle cx="12" cy="12" r="10"%3E%3C/circle%3E%3Cpolyline points="12,6 12,12 16,14"%3E%3C/polyline%3E%3C/svg%3E'
                });
            }
            
            console.log('✅ Notificación enviada:', alert.title);
            
        } catch (error) {
            console.error('❌ Error enviando notificación:', error);
        }
    }
    
    async executeWebhook(alert) {
        try {
            const webhookData = {
                alert_id: alert.id,
                title: alert.title,
                message: alert.message,
                scheduled_date: alert.alertDate,
                executed_at: new Date().toISOString(),
                status: 'completed',
                source: 'task-manager-alerts'
            };
            
            console.log('🚀 Ejecutando webhook para alerta:', alert.title);
            console.log('🔗 URL del webhook:', alert.webhookUrl);
            console.log('📦 Datos que se enviarán:', webhookData);
            
            const response = await fetch(alert.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'TaskManager-Alerts/1.0',
                    'Accept': 'application/json, text/plain, */*'
                },
                body: JSON.stringify(webhookData),
                mode: 'cors'
            });
            
            console.log('📡 Estado de la respuesta:', response.status, response.statusText);
            
            if (response.ok) {
                const responseData = await response.text();
                console.log('✅ Webhook ejecutado exitosamente');
                console.log('📥 Respuesta del servidor:', responseData);
            } else {
                const errorText = await response.text();
                console.error('❌ Error HTTP:', response.status, response.statusText);
                console.error('❌ Respuesta de error:', errorText);
            }
            
        } catch (error) {
            console.error('❌ Error ejecutando webhook:', error);
        }
    }
    
    // ===== FUNCIONES AUXILIARES PARA BOTONES + =====
    addSubtaskFromInput() {
        const input = document.getElementById('newSubtaskInput');
        if (!input) return;
        
        const subtaskTitle = input.value.trim();
        if (subtaskTitle) {
            this.addSubtask(subtaskTitle);
            input.value = '';
        }
    }
    
    addTagFromInput() {
        const input = document.getElementById('modalTaskLabels');
        if (!input) return;
        
        const label = input.value.trim();
        if (label && !this.getCurrentTaskLabels().includes(label)) {
            this.addTaskLabel(label);
            input.value = '';
        }
    }
    
    addTagFromMainForm() {
        const input = document.getElementById('task-tags');
        if (!input) return;
        
        const tag = input.value.trim();
        if (tag && !this.selectedTags.includes(tag)) {
            this.selectedTags.push(tag);
            input.value = '';
            this.renderSelectedTags();
        }
    }
    
    addSubtaskFromMainForm() {
        const input = document.getElementById('task-subtasks');
        if (!input) return;
        
        const subtask = input.value.trim();
        if (subtask) {
            this.selectedSubtasks.push({
                id: this.data.subtaskIdCounter++,
                title: subtask,
                completed: false
            });
            input.value = '';
            this.renderSelectedSubtasks();
        }
    }
    
    // ===== FUNCIONES PARA ALERTAS EN FORMULARIO PRINCIPAL =====
    addAlertToMainForm() {
        const titleInput = document.getElementById('mainFormAlertTitleInput');
        const messageInput = document.getElementById('mainFormAlertMessageInput');
        const dateInput = document.getElementById('mainFormAlertDateInput');
        const webhookInput = document.getElementById('mainFormAlertWebhookInput');
        
        if (!titleInput || !messageInput || !dateInput || !webhookInput) {
            this.api.showMessage('❌ Error: No se encontraron los campos del formulario');
            return;
        }
        
        const title = titleInput.value.trim();
        const message = messageInput.value.trim();
        const alertDate = dateInput.value;
        const webhookUrl = webhookInput.value.trim();
        
        if (!title || !message || !alertDate) {
            this.api.showMessage('❌ Título, mensaje y fecha son requeridos para la alerta');
            return;
        }
        
        // Verificar que la fecha sea en el futuro
        const alertDateTime = new Date(alertDate);
        const now = new Date();
        if (alertDateTime <= now) {
            this.api.showMessage('❌ La fecha de la alerta debe ser en el futuro');
            return;
        }
        
        const alertId = Date.now() + Math.random(); // ID único
        const alert = {
            id: alertId,
            title: title,
            message: message,
            alertDate: alertDate,
            webhookUrl: webhookUrl || null,
            active: true,
            created: new Date().toISOString()
        };
        
        // Inicializar array de alertas si no existe
        if (!this.selectedAlerts) {
            this.selectedAlerts = [];
        }
        
        // Agregar alerta al array temporal
        this.selectedAlerts.push(alert);
        
        // Limpiar inputs
        titleInput.value = '';
        messageInput.value = '';
        dateInput.value = '';
        webhookInput.value = '';
        
        // Renderizar alertas seleccionadas
        this.renderSelectedAlerts();
        
        this.api.showMessage(`✅ Alerta "${title}" agregada para ${new Date(alertDate).toLocaleString()}`);
    }
    
    renderSelectedAlerts() {
        const container = document.getElementById('selected-alerts');
        if (!container) return;
        
        if (!this.selectedAlerts || this.selectedAlerts.length === 0) {
            container.innerHTML = '';
            return;
        }
        
        container.innerHTML = this.selectedAlerts.map(alert => {
            const alertDate = new Date(alert.alertDate);
            return `
                <div class="alert-item-preview" style="margin-bottom: 8px; padding: 8px; border: 1px solid #ddd; border-radius: 4px; background: #f9f9f9;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong>${alert.title}</strong>
                            <div style="font-size: 12px; color: #666;">${alert.message}</div>
                            <div style="font-size: 12px; color: #888;">📅 ${alertDate.toLocaleString()}</div>
                            ${alert.webhookUrl ? `<div style="font-size: 12px; color: #888;">🔗 Webhook configurado</div>` : ''}
                        </div>
                        <button class="remove-alert-btn" onclick="window.tasksModule.removeMainFormAlert(${alert.id})" type="button" style="background: #dc3545; color: white; border: none; border-radius: 3px; padding: 4px 8px; cursor: pointer;">🗑️</button>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    removeMainFormAlert(alertId) {
        if (!this.selectedAlerts) return;
        
        this.selectedAlerts = this.selectedAlerts.filter(alert => alert.id !== alertId);
        this.renderSelectedAlerts();
        this.api.showMessage('🗑️ Alerta eliminada del formulario');
    }
    
    // ===== FUNCIONES PARA TAREAS REPETIDAS =====
    createRepeatedTasks(originalTask, repeatType, repeatCount) {
        const createdTasks = [];
        const baseDate = new Date(originalTask.dueDate);
        
        for (let i = 1; i < repeatCount; i++) {
            const newDate = new Date(baseDate);
            
            switch (repeatType) {
                case 'daily':
                    newDate.setDate(baseDate.getDate() + i);
                    break;
                case 'weekly':
                    newDate.setDate(baseDate.getDate() + (i * 7));
                    break;
                case 'monthly':
                    newDate.setMonth(baseDate.getMonth() + i);
                    break;
                case 'yearly':
                    newDate.setFullYear(baseDate.getFullYear() + i);
                    break;
                default:
                    continue;
            }
            
            const repeatedTask = {
                ...originalTask,
                id: this.data.taskIdCounter++,
                title: `${originalTask.title} (${i + 1}/${repeatCount})`,
                dueDate: newDate.toISOString().slice(0, 16), // Formato YYYY-MM-DDTHH:MM
                createdAt: new Date().toISOString(),
                customOrder: this.data.tasks.length + i,
                isRepeated: true,
                originalTaskId: originalTask.id,
                repeatSequence: i + 1,
                // Duplicar subtareas con nuevos IDs
                subtasks: originalTask.subtasks ? originalTask.subtasks.map(sub => ({
                    ...sub,
                    id: this.data.subtaskIdCounter++,
                    completed: false
                })) : [],
                // Duplicar alertas con fechas ajustadas
                alerts: originalTask.alerts ? originalTask.alerts.map(alert => ({
                    ...alert,
                    id: Date.now() + Math.random(),
                    alertDate: this.adjustAlertDate(alert.alertDate, baseDate, newDate),
                    created: new Date().toISOString()
                })) : []
            };
            
            createdTasks.push(repeatedTask);
        }
        
        return createdTasks;
    }
    
    adjustAlertDate(originalAlertDate, originalTaskDate, newTaskDate) {
        if (!originalAlertDate) return null;
        
        const originalAlert = new Date(originalAlertDate);
        const originalTask = new Date(originalTaskDate);
        const newTask = new Date(newTaskDate);
        
        // Calcular la diferencia entre la alerta original y la tarea original
        const timeDiff = originalAlert.getTime() - originalTask.getTime();
        
        // Aplicar la misma diferencia a la nueva fecha de tarea
        const newAlertDate = new Date(newTask.getTime() + timeDiff);
        
        return newAlertDate.toISOString().slice(0, 16); // Formato YYYY-MM-DDTHH:MM
    }
    
    getRepeatTypeText(repeatType) {
        const texts = {
            'daily': 'diarias',
            'weekly': 'semanales',
            'monthly': 'mensuales',
            'yearly': 'anuales'
        };
        return texts[repeatType] || '';
    }
    
    // ===== ACTUALIZACIÓN AUTOMÁTICA DE TIEMPO RESTANTE =====
    startTimeRemainingUpdater() {
        // Actualizar cada minuto (60000 ms)
        this.timeRemainingInterval = setInterval(() => {
            this.updateTimeRemainingBadges();
        }, 60000);
        
        console.log('⏰ Actualizador de tiempo restante iniciado');
    }
    
    updateTimeRemainingBadges() {
        // Solo actualizar si hay tareas visibles con badges de tiempo restante
        const timeRemainingBadges = document.querySelectorAll('.time-remaining-badge');
        
        if (timeRemainingBadges.length === 0) return;
        
        // Obtener tareas filtradas actuales
        const filteredTasks = this.getFilteredTasks();
        
        // Actualizar cada badge
        timeRemainingBadges.forEach(badge => {
            const taskItem = badge.closest('.task-item');
            if (!taskItem) return;
            
            const taskId = parseInt(taskItem.getAttribute('data-task-id'));
            const task = filteredTasks.find(t => t.id === taskId);
            
            if (!task || !task.dueDate) return;
            
            // Recalcular información de tiempo restante
            const timeRemainingInfo = this.getTimeRemainingInfo(task.dueDate);
            
            if (timeRemainingInfo) {
                // Actualizar texto y clase
                badge.textContent = `⏱️ ${timeRemainingInfo.text}`;
                badge.className = `time-remaining-badge ${timeRemainingInfo.class}`;
            } else {
                // Si ya no hay tiempo restante, remover el badge
                badge.remove();
                
                // También actualizar el badge de fecha si es necesario
                const dueDateBadge = taskItem.querySelector('.task-due-date');
                if (dueDateBadge) {
                    const dueDateInfo = this.getDueDateInfo(task.dueDate);
                    if (dueDateInfo) {
                        dueDateBadge.textContent = `📅 ${dueDateInfo.text}`;
                        dueDateBadge.className = `task-due-date ${dueDateInfo.class}`;
                    }
                }
            }
        });
        
        console.log('⏰ Badges de tiempo restante actualizados');
    }
    
    // ===== SELECCIÓN MÚLTIPLE =====
    selectTask(taskId, event) {
        // Solo activar selección múltiple con Ctrl+Click o Shift+Click
        if (!event.ctrlKey && !event.metaKey && !event.shiftKey) {
            // Click normal: no hacer nada, permitir comportamiento normal
            return;
        }
        
        event.preventDefault();
        event.stopPropagation();
        
        const taskIdNum = parseInt(taskId);
        
        if (event.ctrlKey || event.metaKey) {
            // Ctrl/Cmd + Click: Alternar selección individual
            if (this.selectedTaskIds.has(taskIdNum)) {
                this.selectedTaskIds.delete(taskIdNum);
            } else {
                this.selectedTaskIds.add(taskIdNum);
            }
            this.lastSelectedTaskId = taskIdNum;
        } else if (event.shiftKey && this.lastSelectedTaskId !== null) {
            // Shift + Click: Seleccionar rango
            const filteredTasks = this.getFilteredTasks();
            const lastIndex = filteredTasks.findIndex(t => t.id === this.lastSelectedTaskId);
            const currentIndex = filteredTasks.findIndex(t => t.id === taskIdNum);
            
            if (lastIndex !== -1 && currentIndex !== -1) {
                const startIndex = Math.min(lastIndex, currentIndex);
                const endIndex = Math.max(lastIndex, currentIndex);
                
                for (let i = startIndex; i <= endIndex; i++) {
                    this.selectedTaskIds.add(filteredTasks[i].id);
                }
            }
        } else if (event.shiftKey && this.lastSelectedTaskId === null) {
            // Shift + Click sin selección previa: seleccionar solo esta tarea
            this.selectedTaskIds.add(taskIdNum);
            this.lastSelectedTaskId = taskIdNum;
        }
        
        this.updateTaskSelection();
        this.updateSelectionUI();
    }
    
    updateTaskSelection() {
        // Actualizar clases CSS de las tareas seleccionadas
        document.querySelectorAll('.task-item').forEach(taskItem => {
            const taskId = parseInt(taskItem.getAttribute('data-task-id'));
            if (this.selectedTaskIds.has(taskId)) {
                taskItem.classList.add('selected');
            } else {
                taskItem.classList.remove('selected');
            }
        });
    }
    
    updateSelectionUI() {
        const selectedCount = this.selectedTaskIds.size;
        
        // Mostrar/ocultar barra de acciones de selección múltiple
        let selectionBar = document.getElementById('multiSelectBar');
        
        if (selectedCount > 0) {
            if (!selectionBar) {
                selectionBar = document.createElement('div');
                selectionBar.id = 'multiSelectBar';
                selectionBar.className = 'multi-select-bar';
                selectionBar.innerHTML = `
                    <div class="multi-select-content">
                        <span class="selected-count">${selectedCount} tarea${selectedCount > 1 ? 's' : ''} seleccionada${selectedCount > 1 ? 's' : ''}</span>
                        <div class="multi-select-actions">
                            <button class="multi-select-btn" onclick="window.tasksModule.deleteSelectedTasks()" title="Eliminar seleccionadas">
                                🗑️ Eliminar
                            </button>
                            <button class="multi-select-btn" onclick="window.tasksModule.clearSelection()" title="Limpiar selección">
                                ✖️ Cancelar
                            </button>
                        </div>
                    </div>
                `;
                
                const tasksContainer = document.querySelector('.tasks-container');
                if (tasksContainer) {
                    tasksContainer.insertBefore(selectionBar, tasksContainer.firstChild);
                }
            } else {
                selectionBar.querySelector('.selected-count').textContent = 
                    `${selectedCount} tarea${selectedCount > 1 ? 's' : ''} seleccionada${selectedCount > 1 ? 's' : ''}`;
            }
            
            this.isMultiSelectMode = true;
        } else {
            if (selectionBar) {
                selectionBar.remove();
            }
            this.isMultiSelectMode = false;
        }
    }
    
    async deleteSelectedTasks() {
        if (this.selectedTaskIds.size === 0) return;
        
        const selectedCount = this.selectedTaskIds.size;
        const taskNames = Array.from(this.selectedTaskIds).map(id => {
            const task = this.data.tasks.find(t => t.id === id);
            return task ? task.title : `ID: ${id}`;
        }).slice(0, 3); // Mostrar solo los primeros 3 nombres
        
        let confirmMessage = `¿Estás seguro de que quieres eliminar ${selectedCount} tarea${selectedCount > 1 ? 's' : ''}?\n\n`;
        confirmMessage += taskNames.join('\n');
        if (selectedCount > 3) {
            confirmMessage += `\n... y ${selectedCount - 3} más`;
        }
        
        if (confirm(confirmMessage)) {
            const deletedTasks = [];
            
            // Eliminar tareas seleccionadas
            Array.from(this.selectedTaskIds).forEach(taskId => {
                const taskIndex = this.data.tasks.findIndex(t => t.id === taskId);
                if (taskIndex !== -1) {
                    const task = this.data.tasks[taskIndex];
                    deletedTasks.push(task.title);
                    this.data.tasks.splice(taskIndex, 1);
                }
            });
            
            // Limpiar selección
            this.clearSelection();
            
            // Guardar y actualizar interfaz
            await this.saveData();
            this.renderTasks();
            this.renderLabels();
            this.updateCounts();
            
            this.api.showMessage(`🗑️ ${deletedTasks.length} tarea${deletedTasks.length > 1 ? 's' : ''} eliminada${deletedTasks.length > 1 ? 's' : ''} correctamente`);
        }
    }
    
    clearSelection() {
        this.selectedTaskIds.clear();
        this.lastSelectedTaskId = null;
        this.updateTaskSelection();
        this.updateSelectionUI();
    }
    
    // ===== DESTRUCTOR =====
    async destroy() {
        // Limpiar interval de actualización de tiempo restante
        if (this.timeRemainingInterval) {
            clearInterval(this.timeRemainingInterval);
            this.timeRemainingInterval = null;
        }
        
        // Limpiar timeouts de alertas
        if (this.alertTimeouts) {
            Object.values(this.alertTimeouts).forEach(timeout => {
                clearTimeout(timeout);
            });
            this.alertTimeouts = {};
        }
        
        // Guardar datos antes de destruir
        this.saveCurrentScenarioData();
        await this.saveData();
        
        // Limpiar event listeners y referencias globales
        if (this.sortableInstance) {
            this.sortableInstance.destroy();
            this.sortableInstance = null;
        }
        
        // Limpiar referencias globales
        if (window.tasksModule) {
            delete window.tasksModule;
        }
        
        console.log('🗑️ Tasks Module destruido correctamente');
    }
}

// ===== ASISTENTE DE IA (WordPress Version) =====
class TasksAssistant {
    constructor(tasksModule) {
        this.tasksModule = tasksModule;
        this.mensajes = [];
        this.loadMessages();
        this.promptBase = "Eres un asistente que ayuda con tareas y notas, gestionándolas en tiempo real. " +
            "Puedes agregar, editar, eliminar múltiples tareas en una sola consulta. " +
            "Cada tarea tiene un ID único. Para editar o eliminar, usa el ID de la tarea específica. " +
            "Cuando muestres las tareas al usuario, siempre incluye su ID para referencia. " +
            "Puedes realizar operaciones en lote como 'eliminar tareas 1, 2, 3' o 'marcar como completadas las tareas 4, 5, 6'. " +
            "IMPORTANTE: Cuando el usuario mencione un proyecto, usa el nombre exacto del proyecto que existe en la lista. " +
            "Sé conciso y directo en tus respuestas para optimizar costos.";
    }

    async loadMessages() {
        try {
            const savedMessages = await this.tasksModule.api.getModuleData('tasksModule_assistantMessages');
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
            await this.tasksModule.api.saveModuleData('tasksModule_assistantMessages', this.mensajes);
        } catch (error) {
            console.error('Error guardando mensajes del asistente:', error);
        }
    }

    cleanHistory() {
        if (this.mensajes.length > this.tasksModule.aiConfig.historyLimit * 2) {
            const keepCount = this.tasksModule.aiConfig.historyLimit;
            this.mensajes = this.mensajes.slice(-keepCount);
            this.saveMessages();
        }
    }

    async obtenerTareas() {
        const tareas = this.tasksModule.data.tasks.map(task => {
            const proyecto = task.projectId ? this.tasksModule.data.projects.find(p => p.id === task.projectId) : null;
            const daysRemaining = this.tasksModule.getDaysRemaining(task.dueDate);
            
            return {
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
                subtareas: task.subtasks
            };
        });

        let respuesta = `## 📋 Tareas del Escenario: ${this.tasksModule.data.scenarios[this.tasksModule.data.currentScenario].name}\n\n`;
        
        if (tareas.length === 0) {
            respuesta += "*Sin tareas.*";
        } else {
            tareas.forEach(tarea => {
                const estado = tarea.completada ? "✅" : "⏳";
                const prioEmoji = tarea.prioridad === 'alta' ? '🔴' : tarea.prioridad === 'media' ? '🟡' : '⚪';
                
                respuesta += `**${tarea.titulo}** (ID: ${tarea.id}) ${estado} ${prioEmoji}\n`;
                
                if (tarea.descripcion) respuesta += `*${tarea.descripcion}*\n`;
                if (tarea.fecha) {
                    const fecha = new Date(tarea.fecha);
                    respuesta += `📅 ${fecha.toLocaleDateString()}`;
                    if (tarea.diasRestantes !== null) {
                        const badge = this.tasksModule.getDaysRemainingBadge(tarea.diasRestantes);
                        if (badge) {
                            respuesta += ` (${badge.text})`;
                        }
                    }
                    respuesta += `\n`;
                }
                if (tarea.proyecto) respuesta += `📁 ${tarea.proyecto}\n`;
                if (tarea.etiquetas?.length) respuesta += `🏷️ ${tarea.etiquetas.map(e => `#${e}`).join(' ')}\n`;
                
                respuesta += "\n";
            });
        }
        
        return respuesta;
    }

    async agregarTareas(tareas) {
        const tareasArray = Array.isArray(tareas) ? tareas : [tareas];
        const resultados = [];
        
        for (const tarea of tareasArray) {
            let projectId = null;
            if (tarea.proyecto || tarea.projectName) {
                const projectName = tarea.proyecto || tarea.projectName;
                const foundProject = this.findProjectByName(projectName);
                if (foundProject) {
                    projectId = foundProject.id;
                } else {
                    resultados.push(`⚠️ Proyecto "${projectName}" no encontrado. Tarea creada sin proyecto.`);
                }
            }
            
            // Procesar subtareas correctamente
            let subtasksProcessed = [];
            if (tarea.subtareas || tarea.subtasks) {
                const subtasksArray = tarea.subtareas || tarea.subtasks;
                subtasksProcessed = subtasksArray.map(sub => {
                    if (typeof sub === 'string') {
                        return {
                            id: this.tasksModule.data.subtaskIdCounter++,
                            title: sub,
                            completed: false
                        };
                    } else if (typeof sub === 'object' && sub !== null) {
                        return {
                            id: this.tasksModule.data.subtaskIdCounter++,
                            title: sub.title || sub.titulo || sub.name || 'Subtarea sin título',
                            completed: sub.completed || sub.completada || false
                        };
                    }
                    return null;
                }).filter(sub => sub !== null);
            }
            
            const nuevaTarea = {
                id: this.tasksModule.data.taskIdCounter++,
                title: tarea.titulo || tarea.name || tarea.title,
                description: tarea.descripcion || tarea.description || '',
                completed: false,
                priority: tarea.prioridad || tarea.priority || 'baja',
                dueDate: tarea.fecha || tarea.date || null,
                projectId: projectId || tarea.proyectoId || tarea.projectId || null,
                labels: tarea.etiquetas || tarea.labels || [],
                subtasks: subtasksProcessed,
                createdAt: new Date().toISOString(),
                customOrder: this.tasksModule.data.tasks.length
            };
            
            this.tasksModule.data.tasks.push(nuevaTarea);
            const projectName = projectId ? this.tasksModule.data.projects.find(p => p.id === projectId)?.name : 'Sin proyecto';
            resultados.push(`✅ Tarea agregada (ID: ${nuevaTarea.id}): "${nuevaTarea.title}" en proyecto "${projectName}"`);
        }
        
        await this.tasksModule.saveData();
        this.tasksModule.renderTasks();
        this.tasksModule.renderLabels();
        this.tasksModule.updateCounts();
        return resultados.join('\n');
    }

    async editarTareas(tareasAEditar) {
        const resultados = [];
        const tareasArray = Array.isArray(tareasAEditar) ? tareasAEditar : [tareasAEditar];
        
        for (const edicion of tareasArray) {
            const taskId = edicion.taskId || edicion.id;
            const cambios = edicion.cambios || edicion;
            
            const taskIndex = this.tasksModule.data.tasks.findIndex(t => t.id === parseInt(taskId));
            if (taskIndex === -1) {
                resultados.push(`❌ No encontré tarea ID ${taskId}`);
                continue;
            }

            const task = this.tasksModule.data.tasks[taskIndex];
            
            if (cambios.titulo || cambios.title) task.title = cambios.titulo || cambios.title;
            if (cambios.descripcion || cambios.description) task.description = cambios.descripcion || cambios.description;
            if (cambios.prioridad || cambios.priority) task.priority = cambios.prioridad || cambios.priority;
            if (cambios.fecha || cambios.date) task.dueDate = cambios.fecha || cambios.date;
            if (cambios.completada !== undefined || cambios.completed !== undefined) {
                task.completed = cambios.completada !== undefined ? cambios.completada : cambios.completed;
                task.completedAt = task.completed ? new Date().toISOString() : null;
            }
            if (cambios.etiquetas || cambios.labels) task.labels = cambios.etiquetas || cambios.labels;
            
            if (cambios.proyecto || cambios.projectName) {
                const projectName = cambios.proyecto || cambios.projectName;
                const foundProject = this.findProjectByName(projectName);
                if (foundProject) {
                    task.projectId = foundProject.id;
                } else {
                    resultados.push(`⚠️ Proyecto "${projectName}" no encontrado para tarea ID ${taskId}`);
                }
            }
            
            resultados.push(`✅ Tarea ID ${taskId} actualizada: "${task.title}"`);
        }
        
        await this.tasksModule.saveData();
        this.tasksModule.renderTasks();
        this.tasksModule.renderLabels();
        this.tasksModule.updateCounts();
        return resultados.join('\n');
    }

    async eliminarTareas(taskIds) {
        const idsArray = Array.isArray(taskIds) ? taskIds : [taskIds];
        const resultados = [];
        
        for (const taskId of idsArray) {
            const taskIndex = this.tasksModule.data.tasks.findIndex(t => t.id === parseInt(taskId));
            if (taskIndex === -1) {
                resultados.push(`❌ No encontré tarea ID ${taskId}`);
                continue;
            }

            const task = this.tasksModule.data.tasks[taskIndex];
            this.tasksModule.data.tasks.splice(taskIndex, 1);
            resultados.push(`🗑️ Eliminada: "${task.title}" (ID: ${taskId})`);
        }
        
        await this.tasksModule.saveData();
        this.tasksModule.renderTasks();
        this.tasksModule.renderLabels();
        this.tasksModule.updateCounts();
        return resultados.join('\n');
    }

    async marcarCompletadas(taskIds) {
        const idsArray = Array.isArray(taskIds) ? taskIds : [taskIds];
        return await this.editarTareas(idsArray.map(id => ({
            taskId: id,
            cambios: { completada: true }
        })));
    }

    async marcarPendientes(taskIds) {
        const idsArray = Array.isArray(taskIds) ? taskIds : [taskIds];
        return await this.editarTareas(idsArray.map(id => ({
            taskId: id,
            cambios: { completada: false }
        })));
    }

    findProjectByName(projectName) {
        if (!projectName) return null;
        return this.tasksModule.data.projects.find(p => 
            p.name.toLowerCase().includes(projectName.toLowerCase()) ||
            projectName.toLowerCase().includes(p.name.toLowerCase())
        );
    }

    getProjectsInfo() {
        return this.tasksModule.data.projects.map(project => ({
            id: project.id,
            name: project.name,
            color: project.color
        }));
    }

    async consultarConFunciones(pregunta) {
        if (!this.tasksModule.aiConfig.apiKey) {
            return '🔑 **Error:** No has configurado tu API Key de OpenAI. Ve a Configurar IA en el sidebar.';
        }

        this.mensajes.push({ role: 'user', content: pregunta });
        this.cleanHistory();

        const projectsInfo = this.getProjectsInfo();
        const updatedPromptBase = "Eres un asistente que ayuda con tareas y notas, gestionándolas en tiempo real. " +
            `Estás trabajando en el escenario "${this.tasksModule.data.scenarios[this.tasksModule.data.currentScenario].name}". ` +
            "Puedes agregar, editar, eliminar múltiples tareas en una sola consulta. " +
            "Cada tarea tiene un ID único. Para editar o eliminar, usa el ID de la tarea específica. " +
            "Cuando muestres las tareas al usuario, siempre incluye su ID para referencia. " +
            "Puedes realizar operaciones en lote como 'eliminar tareas 1, 2, 3' o 'marcar como completadas las tareas 4, 5, 6'. " +
            "IMPORTANTE: Cuando el usuario mencione un proyecto, usa el nombre exacto del proyecto que existe en la lista. " +
            "Los proyectos disponibles son: " + projectsInfo.map(p => `"${p.name}" (ID: ${p.id})`).join(', ') + ". " +
            "Si el usuario menciona un proyecto que no existe exactamente, sugiere crear uno nuevo. " +
            "Sé conciso y directo en tus respuestas para optimizar costos.";

        const mensajesAPI = [
            { role: 'system', content: updatedPromptBase },
            ...this.mensajes
        ];

        try {
            const startTime = Date.now();
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.tasksModule.aiConfig.apiKey}`
                },
                body: JSON.stringify({
                    model: this.tasksModule.aiConfig.model,
                    messages: mensajesAPI,
                    max_tokens: this.tasksModule.aiConfig.maxTokens,
                    temperature: this.tasksModule.aiConfig.temperature,
                    functions: [
                        {
                            name: 'obtenerTareas',
                            description: 'Devuelve la lista de tareas con sus IDs únicos, proyectos asignados y días restantes del escenario actual.',
                            parameters: { type: 'object', properties: {} }
                        },
                        {
                            name: 'agregarTareas',
                            description: 'Agrega una o múltiples tareas nuevas al escenario actual.',
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
                    ],
                })
            });

            const data = await response.json();
            const endTime = Date.now();

            if (!response.ok) {
                console.error('Error en la API:', data);
                return '❌ **Error API:** ' + (data.error ? data.error.message : `Estado ${response.status}`);
            }

            if (data.usage) {
                const { prompt_tokens, completion_tokens, total_tokens } = data.usage;
                const pricing = this.tasksModule.modelPricing[this.tasksModule.aiConfig.model];
                const cost = (prompt_tokens * pricing.input / 1000) + (completion_tokens * pricing.output / 1000);
                
                this.tasksModule.aiStats.todayQueries++;
                this.tasksModule.aiStats.totalTokens += total_tokens;
                this.tasksModule.aiStats.estimatedCost += cost;
                this.tasksModule.aiStats.usageHistory.push({
                    timestamp: new Date().toLocaleTimeString(),
                    model: this.tasksModule.aiConfig.model,
                    tokens: total_tokens,
                    cost: cost,
                    responseTime: endTime - startTime
                });
                
                await this.tasksModule.saveAIConfigData();
            }

            if (data.choices && data.choices.length > 0) {
                const msg = data.choices[0].message;
                if (msg.hasOwnProperty('function_call')) {
                    const nombreFuncion = msg.function_call.name;
                    const args = JSON.parse(msg.function_call.arguments);
                    let resultado;
                    
                    switch(nombreFuncion) {
                        case 'obtenerTareas':
                            resultado = await this.obtenerTareas();
                            break;
                        case 'agregarTareas':
                            resultado = await this.agregarTareas(args.tareas);
                            break;
                        case 'editarTareas':
                            resultado = await this.editarTareas(args.tareasAEditar);
                            break;
                        case 'eliminarTareas':
                            resultado = await this.eliminarTareas(args.taskIds);
                            break;
                        case 'marcarCompletadas':
                            resultado = await this.marcarCompletadas(args.taskIds);
                            break;
                        case 'marcarPendientes':
                            resultado = await this.marcarPendientes(args.taskIds);
                            break;
                        default:
                            resultado = '❌ Función no reconocida.';
                    }

                    this.mensajes.push({ 
                        role: 'function', 
                        name: nombreFuncion, 
                        content: resultado 
                    });
                    
                    const finalResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${this.tasksModule.aiConfig.apiKey}`
                        },
                        body: JSON.stringify({
                            model: this.tasksModule.aiConfig.model,
                            messages: [
                                { role: 'system', content: updatedPromptBase + " Responde de forma muy concisa." },
                                ...this.mensajes.slice(-3),
                                { role: 'user', content: "Resume brevemente lo que acabas de hacer." }
                            ],
                            max_tokens: Math.min(this.tasksModule.aiConfig.maxTokens, 200),
                            temperature: 0.3
                        })
                    });

                    const finalData = await finalResponse.json();
                    if (finalData.choices && finalData.choices.length > 0) {
                        const finalMsg = finalData.choices[0].message.content;
                        this.mensajes.push({ role: 'assistant', content: finalMsg });
                        await this.saveMessages();
                        return finalMsg;
                    }
                    
                    return resultado;
                    
                } else {
                    this.mensajes.push({ role: 'assistant', content: msg.content });
                    await this.saveMessages();
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
}

// ===== EXPORT DEL MÓDULO =====
window.TasksModule = TasksModule;
