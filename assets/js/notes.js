// ===== NOTES MODULE (WordPress Version) =====
class NotesModule {
    constructor(framework) {
        this.framework = framework;
        this.api = framework.getFrameworkAPI();
        
        // Datos del módulo
        this.data = {};
        
        // Variables de estado
        this.currentView = 'all';
        this.editingNote = null;
        this.editingFolder = null;
        this.editingScenario = null;
        this.isFormVisible = false;
        this.sortableInstance = null;
        
        // Tags temporales para formularios
        this.selectedTags = [];
        
        // Variables para selección múltiple
        this.selectedNoteIds = new Set();
        this.lastSelectedNoteId = null;
        this.isMultiSelectMode = false;
        
        // Inicializar
        this.init();
    }
    
    // ===== FUNCIONES GLOBALES =====
    exposeGlobalFunctions() {
        // Asegurar que las funciones estén disponibles inmediatamente
        window.notesModule = {
            // Navegación
            switchView: (view) => this.switchView(view),
            switchToFolder: (folderId) => this.switchToFolder(folderId),
            switchToLabel: (labelName) => this.switchToLabel(labelName),
            
            // Notas
            editNote: (noteId) => this.editNote(noteId),
            deleteNote: (noteId) => this.deleteNote(noteId),
            saveNote: () => this.saveNote(),
            duplicateNote: (noteId) => this.duplicateNote(noteId),
            
            // Formulario
            toggleNoteForm: () => this.toggleNoteForm(),
            
            // Carpetas
            showFolderModal: (folderId) => this.showFolderModal(folderId),
            hideFolderModal: () => this.hideFolderModal(),
            saveFolder: () => this.saveFolder(),
            deleteFolder: () => this.deleteFolder(),
            editFolder: (folderId) => this.editFolder(folderId),
            
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
            showNoteModal: () => this.showNoteModal(),
            hideNoteModal: () => this.hideNoteModal(),
            showNotesDataManagementModal: () => this.showNotesDataManagementModal(),
            hideNotesDataManagementModal: () => this.hideNotesDataManagementModal(),
            
            // Datos
            exportAllData: () => this.exportAllData(),
            exportNotes: () => this.exportNotes(),
            exportFolders: () => this.exportFolders(),
            importData: () => this.importData(),
            clearAllData: () => this.clearAllData(),
            
            // Funciones auxiliares para formularios
            removeTag: (index) => this.removeTag(index),
            addTagFromMainForm: () => this.addTagFromMainForm(),
            addTagFromInput: () => this.addTagFromInput(),
            
            // Funciones para selección múltiple
            selectNote: (noteId, event) => this.selectNote(noteId, event),
            deleteSelectedNotes: () => this.deleteSelectedNotes(),
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
        this.renderNotes();
        this.renderFolders();
        this.renderLabels();
        this.updateCounts();
        
        // Mensaje de bienvenida deshabilitado
        // setTimeout(() => {
        //     this.showWelcomeMessage();
        // }, 1000);
    }
    
    async loadData() {
        try {
            const savedData = await this.api.getModuleData('notes');
            
            this.data = {
                scenarios: savedData.scenarios || {
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
                currentScenario: savedData.currentScenario || 1,
                scenarioIdCounter: savedData.scenarioIdCounter || 2,
                // Los datos actuales se cargan del escenario activo
                notes: [],
                folders: [],
                noteIdCounter: 1,
                folderIdCounter: 4
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
                scenarioIdCounter: 2,
                notes: [],
                folders: [],
                noteIdCounter: 1,
                folderIdCounter: 4
            };
        }
    }
    
    async saveData() {
        // Guardar datos del escenario actual
        this.saveCurrentScenarioData();
        
        // Guardar toda la estructura en WordPress
        await this.api.saveModuleData('notes', {
            scenarios: this.data.scenarios,
            currentScenario: this.data.currentScenario,
            scenarioIdCounter: this.data.scenarioIdCounter
        });
    }
    
    // ===== GESTIÓN DE ESCENARIOS =====
    saveCurrentScenarioData() {
        if (this.data.scenarios[this.data.currentScenario]) {
            this.data.scenarios[this.data.currentScenario].data = {
                notes: [...this.data.notes],
                folders: [...this.data.folders],
                noteIdCounter: this.data.noteIdCounter,
                folderIdCounter: this.data.folderIdCounter
            };
        }
    }
    
    loadScenarioData(scenarioId) {
        if (this.data.scenarios[scenarioId] && this.data.scenarios[scenarioId].data) {
            const scenarioData = this.data.scenarios[scenarioId].data;
            
            // Validar que los datos sean arrays antes de usar spread operator
            this.data.notes = Array.isArray(scenarioData.notes) ? [...scenarioData.notes] : [];
            this.data.folders = Array.isArray(scenarioData.folders) ? [...scenarioData.folders] : [
                { id: 1, name: 'General', color: '#a8e6cf' },
                { id: 2, name: 'Ideas', color: '#ffd3a5' },
                { id: 3, name: 'Trabajo', color: '#fd9b9b' }
            ];
            this.data.noteIdCounter = scenarioData.noteIdCounter || 1;
            this.data.folderIdCounter = scenarioData.folderIdCounter || 4;
            
            this.currentView = 'all';
            this.editingNote = null;
            this.editingFolder = null;
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
        this.renderNotes();
        this.renderFolders();
        this.renderLabels();
        this.updateCounts();
        this.updateFolderSelects();
        
        // Cerrar formulario si estaba abierto
        if (this.isFormVisible) {
            this.toggleNoteForm();
        }
        
        this.switchView('all');
        await this.saveData();
        
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
                <input type="text" class="search-input" placeholder="Buscar notas..." id="searchInput" style="width: 100%; padding: 8px 12px 8px 36px; border: 1px solid #e1e1e1; border-radius: 6px; font-size: 14px; background-color: #f8f8f8;">
                <div class="search-icon" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #888;">🔍</div>
            </div>

            <div class="nav-section">
                <div class="nav-item active" data-view="all">
                    <div class="nav-item-icon">📝</div>
                    <div class="nav-item-text">Todas las notas</div>
                    <div class="nav-item-count" id="allCount">0</div>
                </div>
            </div>

            <div class="nav-section">
                <div class="nav-section-title">Carpetas</div>
                <div id="foldersList">
                    <!-- Las carpetas se cargarán dinámicamente -->
                </div>
                <div class="nav-item" id="addFolderBtn">
                    <div class="nav-item-icon">➕</div>
                    <div class="nav-item-text">Añadir carpeta</div>
                </div>
            </div>

            <div class="nav-section">
                <div class="nav-section-title">Etiquetas</div>
                <div id="labelsList">
                    <!-- Las etiquetas se cargarán dinámicamente -->
                </div>
            </div>

            <div class="nav-section">
                <div class="nav-section-title">Gestión</div>
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
        const addFolderBtn = document.getElementById('addFolderBtn');
        if (addFolderBtn) {
            addFolderBtn.addEventListener('click', () => this.showFolderModal());
        }
        
        const dataManagementBtn = document.getElementById('dataManagementBtn');
        if (dataManagementBtn) {
            dataManagementBtn.addEventListener('click', () => this.showNotesDataManagementModal());
        }
        
        // Configurar buscador
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', () => this.searchNotes());
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.searchNotes();
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
            <button class="header-btn" id="addNoteBtn">
                <span>➕</span>
                Añadir nota
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
            toggleFormBtn.addEventListener('click', () => this.toggleNoteForm());
        }
        
        const addNoteBtn = document.getElementById('addNoteBtn');
        if (addNoteBtn) {
            addNoteBtn.addEventListener('click', () => this.showNoteModal());
        }
    }
    
    setupModuleContainer() {
        const containerHTML = `
            <div class="notes-container">
                <div class="note-form" id="noteForm" style="display: none;">
                    <div class="note-form-header">
                        <h3 style="margin: 0; color: #202124; font-size: 18px;">Nueva nota</h3>
                        <button class="close-form-btn" id="closeFormBtn">×</button>
                    </div>
                    <form id="note-form">
                        <div class="form-row">
                            <input type="text" id="note-title" placeholder="Título de la nota" required />
                            <select id="note-color">
                                <option value="#a8e6cf">🟢 Verde pastel</option>
                                <option value="#ffd3a5">🟡 Amarillo pastel</option>
                                <option value="#fd9b9b">🔴 Rosa pastel</option>
                                <option value="#a8d8ea">🔵 Azul pastel</option>
                                <option value="#d4a5ff">🟣 Morado pastel</option>
                                <option value="#ffb3ba">🌸 Rosa claro</option>
                            </select>
                        </div>
                        <div class="form-row">
                            <textarea id="note-content" placeholder="Contenido de la nota"></textarea>
                        </div>
                        <div class="form-row">
                            <select id="note-folder">
                                <option value="">Sin carpeta</option>
                            </select>
                        </div>
                        <div class="form-row">
                            <div class="tags-input-container">
                                <div class="input-with-button">
                                    <input type="text" id="note-tags" placeholder="Etiquetas (presiona Enter para agregar)" />
                                    <button type="button" class="add-item-btn" onclick="window.notesModule.addTagFromMainForm()" title="Agregar etiqueta">+</button>
                                </div>
                                <div class="tags-suggestions" id="tagsSuggestions"></div>
                            </div>
                        </div>
                        <div id="selected-tags" style="margin-bottom: 12px;"></div>
                        <button type="submit" class="add-btn">Añadir nota</button>
                    </form>
                </div>

                <div class="notes-list" id="notesList">
                    <!-- Las notas se cargarán dinámicamente -->
                </div>

                <div class="empty-state" id="emptyState" style="display: none;">
                    <div class="empty-icon">📝</div>
                    <div class="empty-title">Sin notas</div>
                    <div class="empty-description">¡Añade tu primera nota para comenzar!</div>
                </div>
            </div>

            ${this.getModalsHTML()}
        `;
        
        this.api.updateModuleContainer(containerHTML);
    }
    
    getModalsHTML() {
        return `
            <!-- Modal para editar notas -->
            <div class="modal" id="noteModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title">Detalles de la nota</h2>
                        <button class="modal-close" onclick="window.notesModule.hideNoteModal()">×</button>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Título</label>
                        <input type="text" class="form-input" id="modalNoteTitle" placeholder="Título de la nota">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Contenido</label>
                        <textarea class="form-input form-textarea" id="modalNoteContent" placeholder="Contenido de la nota"></textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Carpeta</label>
                        <select class="form-select" id="modalNoteFolder">
                            <option value="">Sin carpeta</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Color</label>
                        <select class="form-select" id="modalNoteColor">
                            <option value="#a8e6cf">🟢 Verde pastel</option>
                            <option value="#ffd3a5">🟡 Amarillo pastel</option>
                            <option value="#fd9b9b">🔴 Rosa pastel</option>
                            <option value="#a8d8ea">🔵 Azul pastel</option>
                            <option value="#d4a5ff">🟣 Morado pastel</option>
                            <option value="#ffb3ba">🌸 Rosa claro</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Etiquetas</label>
                        <div class="tags-input-container">
                            <div class="input-with-button">
                                <input type="text" class="form-input" id="modalNoteLabels" placeholder="Añadir etiqueta y presionar Enter">
                                <button type="button" class="add-item-btn" onclick="window.notesModule.addTagFromInput()" title="Agregar etiqueta">+</button>
                            </div>
                            <div class="tags-suggestions" id="modalTagsSuggestions"></div>
                        </div>
                        <div class="selected-labels" id="selectedLabels"></div>
                    </div>
                    <div class="form-group">
                        <button class="btn btn-primary" onclick="window.notesModule.saveNote()" style="width: 100%;">Guardar</button>
                    </div>
                </div>
            </div>

            <!-- Modal para carpetas -->
            <div class="modal" id="folderModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title" id="folderModalTitle">Nueva carpeta</h2>
                        <button class="modal-close" onclick="window.notesModule.hideFolderModal()">×</button>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Nombre de la carpeta</label>
                        <input type="text" class="form-input" id="folderNameInput" placeholder="Mi carpeta">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Color</label>
                        <select class="form-select" id="folderColorInput">
                            <option value="#a8e6cf">🟢 Verde pastel</option>
                            <option value="#ffd3a5">🟡 Amarillo pastel</option>
                            <option value="#fd9b9b">🔴 Rosa pastel</option>
                            <option value="#a8d8ea">🔵 Azul pastel</option>
                            <option value="#d4a5ff">🟣 Morado pastel</option>
                            <option value="#ffb3ba">🌸 Rosa claro</option>
                        </select>
                    </div>
                    <div class="form-group" style="display: flex; gap: 12px;">
                        <button class="btn btn-primary" onclick="window.notesModule.saveFolder()" style="flex: 1;">Guardar</button>
                        <button class="btn btn-danger" id="deleteFolderBtn" onclick="window.notesModule.deleteFolder()" style="display: none;">Eliminar</button>
                    </div>
                </div>
            </div>

            <!-- Modal de Gestión de Escenarios -->
            <div class="modal" id="scenarioModal">
                <div class="modal-content" style="max-width: 600px;">
                    <div class="modal-header">
                        <h2 class="modal-title">🎭 Gestión de Escenarios</h2>
                        <button class="modal-close" onclick="window.notesModule.hideScenarioModal()">×</button>
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
                                <strong>Notas:</strong> <span id="currentScenarioNotes">0</span>
                            </div>
                            <div class="scenario-info-item">
                                <strong>Carpetas:</strong> <span id="currentScenarioFolders">0</span>
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
                        <button class="modal-close" onclick="window.notesModule.hideNewScenarioModal()">×</button>
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
                            <option value="🎮">🎮 Hobbies</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">📝 Descripción (Opcional)</label>
                        <textarea class="form-input form-textarea" id="scenarioDescriptionInput" placeholder="Describe el propósito de este escenario"></textarea>
                    </div>
                    <div class="form-group" style="display: flex; gap: 12px;">
                        <button class="btn btn-primary" onclick="window.notesModule.saveScenario()" style="flex: 1;">Guardar</button>
                        <button class="btn btn-danger" id="deleteScenarioBtn" onclick="window.notesModule.deleteScenario()" style="display: none;">Eliminar</button>
                    </div>
                </div>
            </div>

            <!-- Modal de Gestión de Datos -->
            <div class="modal" id="notesDataManagementModal">
                <div class="modal-content" style="max-width: 600px;">
                    <div class="modal-header">
                        <h2 class="modal-title">💾 Gestión de Datos</h2>
                        <button class="modal-close" onclick="window.notesModule.hideNotesDataManagementModal()">×</button>
                    </div>

                    <div class="form-group">
                        <h3 style="margin-bottom: 12px;">📤 Exportar Datos</h3>
                        <p style="color: #666; margin-bottom: 16px; font-size: 14px;">
                            Exporta todas tus notas, carpetas y configuración para hacer respaldo o transferir a otro dispositivo.
                        </p>
                        <div class="data-actions">
                            <button class="btn btn-primary" onclick="window.notesModule.exportAllData()">
                                📤 Exportar Todo
                            </button>
                            <button class="btn btn-secondary" onclick="window.notesModule.exportNotes()">
                                📝 Solo Notas
                            </button>
                            <button class="btn btn-secondary" onclick="window.notesModule.exportFolders()">
                                📁 Solo Carpetas
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
                            <button class="btn btn-primary" onclick="window.notesModule.importData()">
                                📥 Importar Datos
                            </button>
                            <button class="btn btn-danger" onclick="window.notesModule.clearAllData()">
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
            this.setupContainerListeners();
        }, 100);
    }
    
    setupContainerListeners() {
        // Event listener para cerrar formulario
        const closeFormBtn = document.getElementById('closeFormBtn');
        if (closeFormBtn) {
            closeFormBtn.addEventListener('click', () => this.toggleNoteForm());
        }
    }
    
    setupFormEventListeners() {
        // Form submit
        const noteForm = document.getElementById('note-form');
        if (noteForm) {
            noteForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFormSubmit();
            });
        }
        
        // Tags input handlers
        this.handleTagInput();
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
    
    // ===== GESTIÓN DE NOTAS =====
    async handleFormSubmit() {
        const title = document.getElementById('note-title').value.trim();
        const content = document.getElementById('note-content').value.trim();
        const folderId = parseInt(document.getElementById('note-folder').value) || null;
        const color = document.getElementById('note-color').value;
        
        if (!title && !content) {
            this.api.showMessage('❌ La nota debe tener al menos un título o contenido');
            return;
        }
        
        const nuevaNota = {
            id: this.data.noteIdCounter++,
            title: title || 'Sin título',
            content: content || '',
            folderId: folderId,
            color: color,
            labels: [...this.selectedTags],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            customOrder: this.data.notes.length
        };
        
        this.data.notes.push(nuevaNota);
        await this.saveData();
        this.renderNotes();
        this.renderLabels();
        this.updateCounts();
        
        // Limpiar formulario
        this.clearForm();
        
        const folderName = folderId ? this.data.folders.find(f => f.id === folderId)?.name : 'Sin carpeta';
        this.api.showMessage(`✅ Nota "${title || 'Sin título'}" añadida en "${folderName}" (ID: ${nuevaNota.id})`);
    }
    
    clearForm() {
        const form = document.getElementById('note-form');
        if (form) {
            form.reset();
            this.selectedTags = [];
            this.renderSelectedTags();
        }
    }
    
    async duplicateNote(noteId) {
        const originalNote = this.data.notes.find(n => n.id === noteId);
        if (!originalNote) return;
        
        const duplicatedNote = {
            ...originalNote,
            id: this.data.noteIdCounter++,
            title: `${originalNote.title} (Copia)`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        this.data.notes.push(duplicatedNote);
        await this.saveData();
        this.renderNotes();
        this.updateCounts();
        
        this.api.showMessage(`✅ Nota duplicada: "${duplicatedNote.title}" (ID: ${duplicatedNote.id})`);
    }
    
    editNote(noteId) {
        const note = this.data.notes.find(n => n.id === noteId);
        if (note) {
            this.editingNote = note;
            
            document.getElementById('modalNoteTitle').value = note.title;
            document.getElementById('modalNoteContent').value = note.content || '';
            document.getElementById('modalNoteFolder').value = note.folderId || '';
            document.getElementById('modalNoteColor').value = note.color;
            
            this.loadNoteLabels(note.labels || []);
            
            this.showNoteModal();
        }
    }
    
    async deleteNote(noteId) {
        if (confirm('¿Estás seguro de que quieres eliminar esta nota?')) {
            this.data.notes = this.data.notes.filter(note => note.id !== noteId);
            await this.saveData();
            this.renderNotes();
            this.renderLabels();
            this.updateCounts();
            this.api.showMessage('🗑️ Nota eliminada correctamente');
        }
    }
    
    async saveNote() {
        const title = document.getElementById('modalNoteTitle').value.trim();
        if (!title) {
            this.api.showMessage('❌ El título de la nota es requerido');
            return;
        }
        
        const note = {
            id: this.editingNote ? this.editingNote.id : this.data.noteIdCounter++,
            title: title,
            content: document.getElementById('modalNoteContent').value.trim(),
            color: document.getElementById('modalNoteColor').value,
            folderId: parseInt(document.getElementById('modalNoteFolder').value) || null,
            labels: this.getCurrentNoteLabels(),
            createdAt: this.editingNote ? this.editingNote.createdAt : new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            customOrder: this.editingNote ? this.editingNote.customOrder : this.data.notes.length
        };
        
        if (this.editingNote) {
            const index = this.data.notes.findIndex(n => n.id === this.editingNote.id);
            this.data.notes[index] = note;
            this.api.showMessage('✅ Nota actualizada correctamente');
        } else {
            this.data.notes.push(note);
            this.api.showMessage('✅ Nota creada correctamente');
        }
        
        await this.saveData();
        this.hideNoteModal();
        this.renderNotes();
        this.renderLabels();
        this.updateCounts();
    }

    // ===== RENDERIZADO =====
    getFilteredNotes() {
        let filtered = [...this.data.notes];
        
        switch (this.currentView) {
            case 'folder':
                filtered = filtered.filter(note => note.folderId === this.selectedFolder);
                break;
            case 'label':
                filtered = filtered.filter(note => 
                    note.labels && note.labels.includes(this.selectedLabel)
                );
                break;
            case 'search':
                const query = this.searchQuery.toLowerCase();
                filtered = filtered.filter(note => 
                    note.title.toLowerCase().includes(query) ||
                    (note.content && note.content.toLowerCase().includes(query)) ||
                    (note.labels && note.labels.some(label => 
                        label.toLowerCase().includes(query)
                    ))
                );
                break;
            default:
                // 'all' - mostrar todas
                break;
        }
        
        // Ordenar notas
        filtered.sort((a, b) => {
            // Si ambas notas tienen customOrder, usar ese orden
            if (a.customOrder !== undefined && b.customOrder !== undefined) {
                if (a.customOrder !== b.customOrder) return a.customOrder - b.customOrder;
            }
            
            // Si no hay customOrder, ordenar por fecha de actualización (más recientes primero)
            return new Date(b.updatedAt) - new Date(a.updatedAt);
        });
        
        return filtered;
    }
    
    renderNotes() {
        const notesList = document.getElementById('notesList');
        if (!notesList) return;
        
        const filteredNotes = this.getFilteredNotes();
        
        if (filteredNotes.length === 0) {
            notesList.innerHTML = '';
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
        
        notesList.innerHTML = filteredNotes.map(note => {
            const folder = this.data.folders.find(f => f.id === note.folderId);
            const createdDate = new Date(note.createdAt).toLocaleDateString();
            const updatedDate = new Date(note.updatedAt).toLocaleDateString();
            const isUpdated = note.createdAt !== note.updatedAt;
            
            // Truncar contenido para la vista previa
            const previewContent = note.content && note.content.length > 100 
                ? note.content.substring(0, 100) + '...' 
                : note.content || '';
            
            return `
                <div class="note-item" data-note-id="${note.id}" style="border-left: 4px solid ${note.color};" onclick="window.notesModule.selectNote(${note.id}, event)">
                    <div class="note-header">
                        <div class="note-content">
                            <div class="note-title">${note.title} <span class="note-id-badge">ID: ${note.id}</span></div>
                            ${previewContent ? `<div class="note-description">${previewContent}</div>` : ''}
                            <div class="note-meta">
                                ${folder ? `<div class="note-folder">
                                    <div class="folder-color" style="background-color: ${folder.color}; width: 8px; height: 8px; border-radius: 50%; margin-right: 4px;"></div>
                                    ${folder.name}
                                </div>` : ''}
                                <div class="note-date">
                                    ${isUpdated ? `Editado: ${updatedDate}` : `Creado: ${createdDate}`}
                                </div>
                                ${note.labels && note.labels.length > 0 ? `<div class="note-labels">
                                    ${note.labels.map(label => `<span class="note-label">#${label}</span>`).join('')}
                                </div>` : ''}
                            </div>
                        </div>
                        <div class="note-actions-menu">
                            <button class="action-btn duplicate-btn" onclick="window.notesModule.duplicateNote(${note.id})" title="Duplicar nota">
                                📋
                            </button>
                            <button class="action-btn" onclick="window.notesModule.editNote(${note.id})" title="Editar">
                                ✏️
                            </button>
                            <button class="action-btn delete-btn" onclick="window.notesModule.deleteNote(${note.id})" title="Eliminar">
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
        
        this.renderFolders();
    }
    
    renderFolders() {
        const foldersList = document.getElementById('foldersList');
        if (!foldersList) return;
        
        foldersList.innerHTML = this.data.folders.map(folder => {
            const noteCount = this.data.notes.filter(n => n.folderId === folder.id).length;
            return `
                <div class="nav-item" data-folder="${folder.id}" onclick="window.notesModule.switchToFolder(${folder.id})">
                    <div class="folder-color" style="background-color: ${folder.color}"></div>
                    <div class="nav-item-text">${folder.name}</div>
                    <div class="nav-item-count">${noteCount}</div>
                    <div class="folder-actions">
                        <button class="folder-action-btn" onclick="event.stopPropagation(); window.notesModule.editFolder(${folder.id})" title="Editar">
                            ✏️
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        this.updateFolderSelects();
    }
    
    renderLabels() {
        const labelsList = document.getElementById('labelsList');
        if (!labelsList) return;
        
        const allLabels = new Set();
        this.data.notes.forEach(note => {
            if (note.labels) {
                note.labels.forEach(label => allLabels.add(label));
            }
        });
        
        if (allLabels.size === 0) {
            labelsList.innerHTML = '<div style="padding: 8px 20px; font-size: 12px; color: #888; font-style: italic;">No hay etiquetas</div>';
            return;
        }
        
        labelsList.innerHTML = '';
        Array.from(allLabels).forEach(label => {
            const noteCount = this.data.notes.filter(n => 
                n.labels && n.labels.includes(label)
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
                <div class="nav-item-count">${noteCount}</div>
            `;
            
            labelsList.appendChild(navItem);
        });
    }
    
    updateCounts() {
        const counts = {
            all: this.data.notes.length
        };
        
        Object.keys(counts).forEach(view => {
            const element = document.getElementById(`${view}Count`);
            if (element) {
                element.textContent = counts[view];
            }
        });
        
        this.renderFolders();
    }
    
    // ===== NAVEGACIÓN =====
    switchView(view) {
        this.currentView = view;
        
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-view="${view}"]`)?.classList.add('active');
        
        const titles = {
            all: 'Todas las notas'
        };
        
        this.api.updateMainTitle(titles[view] || view);
        this.renderNotes();
    }
    
    switchToLabel(labelName) {
        this.currentView = 'label';
        this.selectedLabel = labelName;
        
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-label="${labelName}"]`)?.classList.add('active');
        
        this.api.updateMainTitle(`#${labelName}`);
        this.renderNotes();
    }
    
    switchToFolder(folderId) {
        this.currentView = 'folder';
        this.selectedFolder = folderId;
        
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-folder="${folderId}"]`)?.classList.add('active');
        
        const folder = this.data.folders.find(f => f.id === folderId);
        this.api.updateMainTitle(folder.name);
        this.renderNotes();
    }
    
    searchNotes() {
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
            this.switchView('all');
        }
        
        this.renderNotes();
    }
    
    // ===== DRAG AND DROP =====
    initializeSortable() {
        const notesList = document.getElementById('notesList');
        if (!notesList) return;
        
        if (this.sortableInstance) {
            this.sortableInstance.destroy();
        }
        
        // Verificar si Sortable está disponible
        if (typeof Sortable === 'undefined') {
            console.warn('Sortable.js no está disponible. Drag and drop deshabilitado.');
            return;
        }
        
        this.sortableInstance = new Sortable(notesList, {
            animation: 200,
            easing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            dragClass: 'sortable-drag',
            handle: '.note-item',
            forceFallback: false,
            fallbackTolerance: 3,
            onStart: (evt) => {
                evt.item.classList.add('dragging');
                // Añadir clase al contenedor para efectos visuales
                notesList.classList.add('sorting-active');
            },
            onEnd: (evt) => {
                evt.item.classList.remove('dragging');
                notesList.classList.remove('sorting-active');
                
                if (evt.oldIndex !== evt.newIndex) {
                    this.reorderNotes(evt.oldIndex, evt.newIndex);
                }
            }
        });
    }
    
    async reorderNotes(oldIndex, newIndex) {
        const filteredNotes = this.getFilteredNotes();
        const noteToMove = filteredNotes[oldIndex];
        
        if (!noteToMove) return;
        
        const realOldIndex = this.data.notes.findIndex(n => n.id === noteToMove.id);
        const [movedNote] = this.data.notes.splice(realOldIndex, 1);
        
        let realNewIndex;
        if (newIndex === 0) {
            realNewIndex = 0;
        } else if (newIndex >= filteredNotes.length - 1) {
            realNewIndex = this.data.notes.length;
        } else {
            const noteAfter = filteredNotes[newIndex];
            realNewIndex = this.data.notes.findIndex(n => n.id === noteAfter.id);
        }
        
        this.data.notes.splice(realNewIndex, 0, movedNote);
        
        this.data.notes.forEach((note, index) => {
            note.customOrder = index;
        });
        
        await this.saveData();
        this.renderNotes();
        
        this.api.showMessage(`📋 Nota "${movedNote.title}" reordenada`);
    }
    
    // ===== FORMULARIO DE NOTAS =====
    toggleNoteForm() {
        const form = document.getElementById('noteForm');
        const btn = document.getElementById('toggleFormBtn');
        
        if (!form || !btn) return;
        
        this.isFormVisible = !this.isFormVisible;
        
        if (this.isFormVisible) {
            form.style.display = 'block';
            btn.innerHTML = '<span>📝</span>Ocultar formulario';
            setTimeout(() => {
                const noteTitleInput = document.getElementById('note-title');
                if (noteTitleInput) noteTitleInput.focus();
            }, 100);
        } else {
            form.style.display = 'none';
            btn.innerHTML = '<span>📝</span>Mostrar formulario';
        }
    }
    
    // ===== GESTIÓN DE CARPETAS =====
    showFolderModal(folderId = null) {
        const modal = document.getElementById('folderModal');
        const title = document.getElementById('folderModalTitle');
        const deleteBtn = document.getElementById('deleteFolderBtn');
        
        if (!modal || !title || !deleteBtn) return;
        
        if (folderId) {
            this.editingFolder = this.data.folders.find(f => f.id === folderId);
            title.textContent = 'Editar carpeta';
            document.getElementById('folderNameInput').value = this.editingFolder.name;
            document.getElementById('folderColorInput').value = this.editingFolder.color;
            deleteBtn.style.display = 'block';
        } else {
            this.editingFolder = null;
            title.textContent = 'Nueva carpeta';
            document.getElementById('folderNameInput').value = '';
            document.getElementById('folderColorInput').value = '#a8e6cf';
            deleteBtn.style.display = 'none';
        }
        
        modal.classList.add('active');
        const nameInput = document.getElementById('folderNameInput');
        if (nameInput) nameInput.focus();
    }
    
    hideFolderModal() {
        const modal = document.getElementById('folderModal');
        if (modal) modal.classList.remove('active');
        this.editingFolder = null;
    }
    
    async saveFolder() {
        const name = document.getElementById('folderNameInput').value.trim();
        const color = document.getElementById('folderColorInput').value;
        
        if (!name) {
            this.api.showMessage('❌ El nombre de la carpeta es requerido');
            return;
        }
        
        if (this.editingFolder) {
            this.editingFolder.name = name;
            this.editingFolder.color = color;
            this.api.showMessage(`✅ Carpeta "${name}" actualizada correctamente`);
        } else {
            const folder = {
                id: this.data.folderIdCounter++,
                name: name,
                color: color
            };
            this.data.folders.push(folder);
            this.api.showMessage(`✅ Carpeta "${name}" creada correctamente`);
        }
        
        this.hideFolderModal();
        this.renderFolders();
        this.updateFolderSelects();
        await this.saveData();
    }
    
    async deleteFolder() {
        if (!this.editingFolder) return;
        
        const folderName = this.editingFolder.name;
        const notesInFolder = this.data.notes.filter(n => n.folderId === this.editingFolder.id);
        
        let confirmMessage = `¿Estás seguro de que quieres eliminar la carpeta "${folderName}"?`;
        if (notesInFolder.length > 0) {
            confirmMessage += `\n\nEsto también moverá ${notesInFolder.length} nota(s) a "Sin carpeta".`;
        }
        
        if (confirm(confirmMessage)) {
            notesInFolder.forEach(note => {
                note.folderId = null;
            });
            
            this.data.folders = this.data.folders.filter(f => f.id !== this.editingFolder.id);
            
            this.hideFolderModal();
            this.renderFolders();
            this.renderNotes();
            this.updateFolderSelects();
            this.updateCounts();
            await this.saveData();
            
            this.api.showMessage(`🗑️ Carpeta "${folderName}" eliminada correctamente`);
            
            if (this.currentView === 'folder' && this.selectedFolder === this.editingFolder.id) {
                this.switchView('all');
            }
        }
    }
    
    editFolder(folderId) {
        this.showFolderModal(folderId);
    }
    
    updateFolderSelects() {
        const selects = [document.getElementById('note-folder'), document.getElementById('modalNoteFolder')];
        selects.forEach(select => {
            if (select) {
                const currentValue = select.value;
                select.innerHTML = `
                    <option value="">Sin carpeta</option>
                    ${this.data.folders.map(folder => 
                        `<option value="${folder.id}">${folder.name}</option>`
                    ).join('')}
                `;
                select.value = currentValue;
            }
        });
    }
    
    // ===== ETIQUETAS =====
    getAllExistingLabels() {
        const labels = new Set();
        this.data.notes.forEach(note => {
            if (note.labels) {
                note.labels.forEach(label => labels.add(label));
            }
        });
        return Array.from(labels).sort();
    }
    
    handleTagInput() {
        const input = document.getElementById('note-tags');
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
                if (suggestions) suggestions.style.display = 'none';
            }
        });
        
        input.addEventListener('input', () => {
            this.showTagSuggestions(input, document.getElementById('tagsSuggestions'));
        });
        
        input.addEventListener('blur', () => {
            this.hideTagSuggestions(document.getElementById('tagsSuggestions'));
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
    
    removeTag(index) {
        this.selectedTags.splice(index, 1);
        this.renderSelectedTags();
    }
    
    getCurrentNoteLabels() {
        const selectedLabelsContainer = document.getElementById('selectedLabels');
        if (!selectedLabelsContainer) return [];
        
        const labelElements = selectedLabelsContainer.querySelectorAll('.selected-label');
        
        return Array.from(labelElements).map(element => {
            return element.getAttribute('data-label-name');
        });
    }
    
    loadNoteLabels(labels) {
        const selectedLabelsContainer = document.getElementById('selectedLabels');
        if (!selectedLabelsContainer) return;
        
        selectedLabelsContainer.innerHTML = '';
        
        labels.forEach(label => {
            this.addNoteLabel(label);
        });
    }
    
    addNoteLabel(label) {
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
    
    showTagSuggestions(inputElement, suggestionsElement) {
        if (!inputElement || !suggestionsElement) return;
        
        const query = inputElement.value.toLowerCase();
        const existingLabels = this.getAllExistingLabels();
        
        if (query.length === 0) {
            suggestionsElement.style.display = 'none';
            return;
        }
        
        let currentLabels = [];
        if (inputElement.id === 'note-tags') {
            currentLabels = this.selectedTags;
        } else {
            currentLabels = this.getCurrentNoteLabels();
        }
        
        const filteredLabels = existingLabels.filter(label => 
            label.toLowerCase().includes(query) && 
            !currentLabels.includes(label)
        );
        
        if (filteredLabels.length === 0) {
            suggestionsElement.style.display = 'none';
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
        
        suggestionsElement.style.display = 'block';
    }
    
    selectTagSuggestion(label, inputId, suggestionsId) {
        if (inputId === 'note-tags') {
            if (!this.selectedTags.includes(label)) {
                this.selectedTags.push(label);
                this.renderSelectedTags();
            }
        } else {
            if (!this.getCurrentNoteLabels().includes(label)) {
                this.addNoteLabel(label);
            }
        }
        
        const input = document.getElementById(inputId);
        const suggestions = document.getElementById(suggestionsId);
        if (input) input.value = '';
        if (suggestions) suggestions.style.display = 'none';
    }
    
    hideTagSuggestions(suggestionsElement) {
        if (!suggestionsElement) return;
        
        setTimeout(() => {
            suggestionsElement.style.display = 'none';
        }, 200);
    }
    
    addTagFromMainForm() {
        const input = document.getElementById('note-tags');
        if (!input) return;
        
        const tag = input.value.trim();
        if (tag && !this.selectedTags.includes(tag)) {
            this.selectedTags.push(tag);
            input.value = '';
            this.renderSelectedTags();
        }
    }
    
    addTagFromInput() {
        const input = document.getElementById('modalNoteLabels');
        if (!input) return;
        
        const label = input.value.trim();
        if (label && !this.getCurrentNoteLabels().includes(label)) {
            this.addNoteLabel(label);
            input.value = '';
        }
    }

    // ===== MODALES =====
    showNoteModal() {
        const modal = document.getElementById('noteModal');
        if (!modal) return;
        
        modal.classList.add('active');
        this.updateFolderSelects();
        
        if (!this.editingNote) {
            // Limpiar campos para nueva nota
            document.getElementById('modalNoteTitle').value = '';
            document.getElementById('modalNoteContent').value = '';
            document.getElementById('modalNoteFolder').value = '';
            document.getElementById('modalNoteColor').value = '#a8e6cf';
            document.getElementById('selectedLabels').innerHTML = '';
        }

        setTimeout(() => {
            this.setupModalEventListeners();
        }, 100);
    }
    
    hideNoteModal() {
        const modal = document.getElementById('noteModal');
        if (modal) modal.classList.remove('active');
        this.editingNote = null;
        
        // Limpiar campos
        const selectedLabels = document.getElementById('selectedLabels');
        if (selectedLabels) selectedLabels.innerHTML = '';
    }
    
    setupModalEventListeners() {
        const labelInput = document.getElementById('modalNoteLabels');
        
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
            
            if (label && !this.getCurrentNoteLabels().includes(label)) {
                this.addNoteLabel(label);
                input.value = '';
            }
            
            const suggestionsId = input.id === 'note-tags' ? 'tagsSuggestions' : 'modalTagsSuggestions';
            const suggestions = document.getElementById(suggestionsId);
            if (suggestions) suggestions.style.display = 'none';
        }
    }
    
    // ===== GESTIÓN DE ESCENARIOS =====
    createScenario(name, icon = '📝', description = '') {
        const scenarioId = this.data.scenarioIdCounter++;
        
        this.data.scenarios[scenarioId] = {
            id: scenarioId,
            name: name,
            icon: icon,
            description: description,
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
            document.getElementById('scenarioIconInput').value = '📝';
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
            
            const notesCount = scenario.data.notes?.length || 0;
            const foldersCount = scenario.data.folders?.length || 0;
            
            scenarioElement.innerHTML = `
                <div class="scenario-info">
                    <div class="scenario-icon">${scenario.icon}</div>
                    <div class="scenario-details">
                        <div class="scenario-name">${scenario.name}</div>
                        <div class="scenario-stats">${notesCount} notas, ${foldersCount} carpetas</div>
                    </div>
                </div>
                <div class="scenario-actions">
                    ${scenario.id !== this.data.currentScenario ? `<button class="scenario-action-btn switch" onclick="window.notesModule.switchScenario('${scenario.id}')" title="Cambiar">🔄</button>` : ''}
                    <button class="scenario-action-btn edit" onclick="window.notesModule.showNewScenarioModal('${scenario.id}')" title="Editar">✏️</button>
                    ${scenario.id !== 1 ? `<button class="scenario-action-btn delete" onclick="window.notesModule.deleteScenarioConfirm('${scenario.id}')" title="Eliminar">🗑️</button>` : ''}
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
        const currentScenario = this.data.scenarios[this.data.currentScenario];
        if (!currentScenario) return;
        
        const currentScenarioName = document.getElementById('currentScenarioName');
        const currentScenarioNotes = document.getElementById('currentScenarioNotes');
        const currentScenarioFolders = document.getElementById('currentScenarioFolders');
        const currentScenarioCreated = document.getElementById('currentScenarioCreated');
        
        if (currentScenarioName) currentScenarioName.textContent = `${currentScenario.icon} ${currentScenario.name}`;
        if (currentScenarioNotes) currentScenarioNotes.textContent = this.data.notes.length;
        if (currentScenarioFolders) currentScenarioFolders.textContent = this.data.folders.length;
        if (currentScenarioCreated) {
            const createdDate = new Date(currentScenario.createdAt).toLocaleDateString();
            currentScenarioCreated.textContent = createdDate;
        }
    }
    
    // ===== GESTIÓN DE DATOS =====
    showNotesDataManagementModal() {
        const modal = document.getElementById('notesDataManagementModal');
        if (modal) modal.classList.add('active');
    }
    
    hideNotesDataManagementModal() {
        const modal = document.getElementById('notesDataManagementModal');
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
                version: '1.0',
                source: 'wordpress'
            };
            
            const dataStr = JSON.stringify(allData, null, 2);
            const dataBlob = new Blob([dataStr], {type: 'application/json'});
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `notes-backup-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
            this.api.showMessage('📤 Todos los datos exportados correctamente');
        } catch (error) {
            console.error('Error exportando datos:', error);
            this.api.showMessage('❌ Error al exportar datos');
        }
    }
    
    async exportNotes() {
        this.saveCurrentScenarioData();
        const notesData = {
            notes: this.data.notes,
            scenario: this.data.currentScenario,
            exportDate: new Date().toISOString(),
            type: 'notes-only',
            source: 'wordpress'
        };
        
        const dataStr = JSON.stringify(notesData, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `notes-backup-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        this.api.showMessage('📤 Notas exportadas correctamente');
    }
    
    async exportFolders() {
        this.saveCurrentScenarioData();
        const foldersData = {
            folders: this.data.folders,
            scenario: this.data.currentScenario,
            exportDate: new Date().toISOString(),
            type: 'folders-only',
            source: 'wordpress'
        };
        
        const dataStr = JSON.stringify(foldersData, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `folders-backup-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        this.api.showMessage('📤 Carpetas exportadas correctamente');
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
                } else if (importedData.type === 'notes-only' && importedData.notes) {
                    // Importar solo notas al escenario actual
                    if (this.data.scenarios[this.data.currentScenario]) {
                        this.data.scenarios[this.data.currentScenario].data.notes = importedData.notes;
                    }
                } else if (importedData.type === 'folders-only' && importedData.folders) {
                    // Importar solo carpetas al escenario actual
                    if (this.data.scenarios[this.data.currentScenario]) {
                        this.data.scenarios[this.data.currentScenario].data.folders = importedData.folders;
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
                this.renderNotes();
                this.renderFolders();
                this.renderLabels();
                this.updateCounts();
                
                this.hideNotesDataManagementModal();
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
        if (!confirm('⚠️ ¿Estás COMPLETAMENTE seguro? Esto eliminará TODOS los datos (escenarios, notas, carpetas). Esta acción NO se puede deshacer.')) {
            return;
        }
        
        if (!confirm('⚠️ ÚLTIMA CONFIRMACIÓN: Se eliminarán todos tus datos. ¿Continuar?')) {
            return;
        }
        
        try {
            // Reiniciar datos a valores por defecto
            this.data = {
                scenarios: {
                    default: {
                        id: 'default',
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
                currentScenario: 'default',
                notes: [],
                folders: [],
                noteIdCounter: 1,
                folderIdCounter: 4
            };
            
            // Cargar datos del escenario por defecto
            this.loadScenarioData('default');
            
            // Guardar estado limpio
            await this.saveData();
            
            // Actualizar interfaz
            this.setupModuleActions();
            this.renderNotes();
            this.renderFolders();
            this.renderLabels();
            this.updateCounts();
            
            // Cambiar a vista por defecto
            this.switchView('all');
            
            this.hideNotesDataManagementModal();
            this.api.showMessage('🗑️ Todos los datos han sido eliminados correctamente');
        } catch (error) {
            console.error('Error limpiando datos:', error);
            this.api.showMessage('❌ Error al limpiar datos');
        }
    }
    
    // ===== MENSAJE DE BIENVENIDA =====
    showWelcomeMessage() {
        let welcomeMessage = '🎭 **¡SISTEMA DE ESCENARIOS ACTIVADO!**\n\n';
        
        welcomeMessage += `✨ **Escenario Actual:** ${this.data.scenarios[this.data.currentScenario].icon} ${this.data.scenarios[this.data.currentScenario].name}\n\n`;
        
        welcomeMessage += '🎯 **FUNCIONALIDADES DE ESCENARIOS:**\n';
        welcomeMessage += '- 🏢 **Múltiples espacios de trabajo:** Empresa, Personal, Estudios, etc.\n';
        welcomeMessage += '- 🔄 **Cambio instantáneo:** Cambia entre escenarios sin perder datos\n';
        welcomeMessage += '- 💾 **Datos independientes:** Cada escenario mantiene sus propias notas y carpetas\n';
        welcomeMessage += '- ⚙️ **Gestión completa:** Crea, edita y elimina escenarios fácilmente\n\n';
        
        welcomeMessage += '📝 **CÓMO USAR LOS ESCENARIOS:**\n';
        welcomeMessage += '1. **Crear:** Botón ➕ junto al selector de escenarios\n';
        welcomeMessage += '2. **Cambiar:** Selecciona otro escenario del dropdown\n';
        welcomeMessage += '3. **Gestionar:** Botón ⚙️ para ver y administrar todos los escenarios\n';
        welcomeMessage += '4. **Organizar:** Cada escenario tiene sus propias carpetas y notas\n\n';
        
        welcomeMessage += '🚀 **FUNCIONES INCLUIDAS:**\n';
        welcomeMessage += '- 🎨 Notas con colores personalizables\n';
        welcomeMessage += '- 📁 Sistema de carpetas\n';
        welcomeMessage += '- 🏷️ Etiquetas para organización\n';
        welcomeMessage += '- 📋 Duplicación de notas\n';
        welcomeMessage += '- 🖱️ Drag & Drop para reordenar\n\n';
        
        const totalScenarios = Object.keys(this.data.scenarios).length;
        const totalNotesAllScenarios = Object.values(this.data.scenarios).reduce((sum, scenario) => {
            return sum + (scenario.data.notes?.length || 0);
        }, 0);
        
        welcomeMessage += `📊 **Estado Actual:**\n`;
        welcomeMessage += `- **Escenarios creados:** ${totalScenarios}\n`;
        welcomeMessage += `- **Notas en este escenario:** ${this.data.notes.length}\n`;
        welcomeMessage += `- **Total de notas:** ${totalNotesAllScenarios}\n\n`;
        
        welcomeMessage += '🎉 **¡Organiza tus notas en contextos separados y mantén todo bajo control!**';
        
        this.api.showMessage(welcomeMessage);
    }
    
    // ===== SELECCIÓN MÚLTIPLE =====
    selectNote(noteId, event) {
        // Solo activar selección múltiple con Ctrl+Click o Shift+Click
        if (!event.ctrlKey && !event.metaKey && !event.shiftKey) {
            // Click normal: no hacer nada, permitir comportamiento normal
            return;
        }
        
        event.preventDefault();
        event.stopPropagation();
        
        const noteIdNum = parseInt(noteId);
        
        if (event.ctrlKey || event.metaKey) {
            // Ctrl/Cmd + Click: Alternar selección individual
            if (this.selectedNoteIds.has(noteIdNum)) {
                this.selectedNoteIds.delete(noteIdNum);
            } else {
                this.selectedNoteIds.add(noteIdNum);
            }
            this.lastSelectedNoteId = noteIdNum;
        } else if (event.shiftKey && this.lastSelectedNoteId !== null) {
            // Shift + Click: Seleccionar rango
            const filteredNotes = this.getFilteredNotes();
            const lastIndex = filteredNotes.findIndex(n => n.id === this.lastSelectedNoteId);
            const currentIndex = filteredNotes.findIndex(n => n.id === noteIdNum);
            
            if (lastIndex !== -1 && currentIndex !== -1) {
                const startIndex = Math.min(lastIndex, currentIndex);
                const endIndex = Math.max(lastIndex, currentIndex);
                
                for (let i = startIndex; i <= endIndex; i++) {
                    this.selectedNoteIds.add(filteredNotes[i].id);
                }
            }
        } else if (event.shiftKey && this.lastSelectedNoteId === null) {
            // Shift + Click sin selección previa: seleccionar solo esta nota
            this.selectedNoteIds.add(noteIdNum);
            this.lastSelectedNoteId = noteIdNum;
        }
        
        this.updateNoteSelection();
        this.updateSelectionUI();
    }
    
    updateNoteSelection() {
        // Actualizar clases CSS de las notas seleccionadas
        document.querySelectorAll('.note-item').forEach(noteItem => {
            const noteId = parseInt(noteItem.getAttribute('data-note-id'));
            if (this.selectedNoteIds.has(noteId)) {
                noteItem.classList.add('selected');
            } else {
                noteItem.classList.remove('selected');
            }
        });
    }
    
    updateSelectionUI() {
        const selectedCount = this.selectedNoteIds.size;
        
        // Mostrar/ocultar barra de acciones de selección múltiple
        let selectionBar = document.getElementById('multiSelectBar');
        
        if (selectedCount > 0) {
            if (!selectionBar) {
                selectionBar = document.createElement('div');
                selectionBar.id = 'multiSelectBar';
                selectionBar.className = 'multi-select-bar';
                selectionBar.innerHTML = `
                    <div class="multi-select-content">
                        <span class="selected-count">${selectedCount} nota${selectedCount > 1 ? 's' : ''} seleccionada${selectedCount > 1 ? 's' : ''}</span>
                        <div class="multi-select-actions">
                            <button class="multi-select-btn" onclick="window.notesModule.deleteSelectedNotes()" title="Eliminar seleccionadas">
                                🗑️ Eliminar
                            </button>
                            <button class="multi-select-btn" onclick="window.notesModule.clearSelection()" title="Limpiar selección">
                                ✖️ Cancelar
                            </button>
                        </div>
                    </div>
                `;
                
                const notesContainer = document.querySelector('.notes-container');
                if (notesContainer) {
                    notesContainer.insertBefore(selectionBar, notesContainer.firstChild);
                }
            } else {
                selectionBar.querySelector('.selected-count').textContent = 
                    `${selectedCount} nota${selectedCount > 1 ? 's' : ''} seleccionada${selectedCount > 1 ? 's' : ''}`;
            }
            
            this.isMultiSelectMode = true;
        } else {
            if (selectionBar) {
                selectionBar.remove();
            }
            this.isMultiSelectMode = false;
        }
    }
    
    async deleteSelectedNotes() {
        if (this.selectedNoteIds.size === 0) return;
        
        const selectedCount = this.selectedNoteIds.size;
        const noteNames = Array.from(this.selectedNoteIds).map(id => {
            const note = this.data.notes.find(n => n.id === id);
            return note ? note.title : `ID: ${id}`;
        }).slice(0, 3); // Mostrar solo los primeros 3 nombres
        
        let confirmMessage = `¿Estás seguro de que quieres eliminar ${selectedCount} nota${selectedCount > 1 ? 's' : ''}?\n\n`;
        confirmMessage += noteNames.join('\n');
        if (selectedCount > 3) {
            confirmMessage += `\n... y ${selectedCount - 3} más`;
        }
        
        if (confirm(confirmMessage)) {
            const deletedNotes = [];
            
            // Eliminar notas seleccionadas
            Array.from(this.selectedNoteIds).forEach(noteId => {
                const noteIndex = this.data.notes.findIndex(n => n.id === noteId);
                if (noteIndex !== -1) {
                    const note = this.data.notes[noteIndex];
                    deletedNotes.push(note.title);
                    this.data.notes.splice(noteIndex, 1);
                }
            });
            
            // Limpiar selección
            this.clearSelection();
            
            // Guardar y actualizar interfaz
            await this.saveData();
            this.renderNotes();
            this.renderLabels();
            this.updateCounts();
            
            this.api.showMessage(`🗑️ ${deletedNotes.length} nota${deletedNotes.length > 1 ? 's' : ''} eliminada${deletedNotes.length > 1 ? 's' : ''} correctamente`);
        }
    }
    
    clearSelection() {
        this.selectedNoteIds.clear();
        this.lastSelectedNoteId = null;
        this.updateNoteSelection();
        this.updateSelectionUI();
    }

    // ===== DESTRUCTOR =====
    async destroy() {
        // Guardar datos antes de destruir
        this.saveCurrentScenarioData();
        await this.saveData();
        
        // Limpiar event listeners y referencias globales
        if (this.sortableInstance) {
            this.sortableInstance.destroy();
            this.sortableInstance = null;
        }
        
        // Limpiar referencias globales
        if (window.notesModule) {
            delete window.notesModule;
        }
        
        console.log('🗑️ Notes Module destruido correctamente');
    }
}

// ===== EXPORT DEL MÓDULO =====
window.NotesModule = NotesModule;
