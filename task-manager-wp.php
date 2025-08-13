<?php
/**
 * Plugin Name: Framework Modular KLR - Task Manager WP
 * Description: Sistema completo de gestión modular con escenarios, tareas y IA integrado para WordPress
 * Version: 4.0.0
 * Author: Tu Nombre
 * Text Domain: framework-modular-wp
 * Domain Path: /languages
 */

// Evitar acceso directo
if (!defined('ABSPATH')) {
    exit;
}

// Definir constantes del plugin
define('FRAMEWORK_MODULAR_VERSION', '4.0.0');
define('FRAMEWORK_MODULAR_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('FRAMEWORK_MODULAR_PLUGIN_URL', plugin_dir_url(__FILE__));

class FrameworkModularWP {
    
    public function __construct() {
        register_activation_hook(__FILE__, array($this, 'activate_plugin'));
        register_deactivation_hook(__FILE__, array($this, 'deactivate_plugin'));
        
        add_action('init', array($this, 'init_plugin'));
        add_action('wp_enqueue_scripts', array($this, 'enqueue_assets'));
        add_action('rest_api_init', array($this, 'register_rest_routes'));
        add_action('template_redirect', array($this, 'handle_app_route'));
    }
    
    /**
     * Activación del plugin - crear tabla
     */
    public function activate_plugin() {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'framework_modular_data';
        
        $charset_collate = $wpdb->get_charset_collate();
        
        $sql = "CREATE TABLE $table_name (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            user_id bigint(20) NOT NULL,
            data_type varchar(50) NOT NULL,
            data_content longtext NOT NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            INDEX user_type_idx (user_id, data_type)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
        
        // Agregar reglas de reescritura
        add_rewrite_rule('^app/?$', 'index.php?framework_modular_app=1', 'top');
        flush_rewrite_rules();
        
        // Crear datos iniciales si el usuario admin no tiene
        if (is_user_logged_in()) {
            $this->create_initial_user_data();
        }
    }
    
    /**
     * Desactivación del plugin
     */
    public function deactivate_plugin() {
        flush_rewrite_rules();
    }
    
    /**
     * Inicializar plugin
     */
    public function init_plugin() {
        // Agregar query var
        add_filter('query_vars', array($this, 'add_query_vars'));
        
        // Agregar reglas de reescritura
        add_rewrite_rule('^app/?$', 'index.php?framework_modular_app=1', 'top');
    }
    
    /**
     * Agregar variables de consulta
     */
    public function add_query_vars($vars) {
        $vars[] = 'framework_modular_app';
        return $vars;
    }
    
    /**
     * Manejar ruta /app
     */
    public function handle_app_route() {
        if (get_query_var('framework_modular_app')) {
            // Verificar que el usuario esté logueado
            if (!is_user_logged_in()) {
                wp_redirect(wp_login_url(home_url('/app')));
                exit;
            }
            
            // Cargar la plantilla de la app
            $this->load_app_template();
            exit;
        }
    }
    
    /**
     * Cargar plantilla de la aplicación
     */
    private function load_app_template() {
        ?>
        <!DOCTYPE html>
        <html <?php language_attributes(); ?>>
        <head>
            <meta charset="<?php bloginfo('charset'); ?>">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Framework Modular - <?php bloginfo('name'); ?></title>
            <?php wp_head(); ?>
        </head>
        <body class="framework-modular-app">
            <?php include FRAMEWORK_MODULAR_PLUGIN_DIR . 'templates/app-template.php'; ?>
            <?php wp_footer(); ?>
        </body>
        </html>
        <?php
    }
    
    /**
     * Encolar assets
     */
    public function enqueue_assets() {
        if (get_query_var('framework_modular_app')) {
            // CSS
            wp_enqueue_style(
                'framework-modular-styles', 
                FRAMEWORK_MODULAR_PLUGIN_URL . 'assets/css/styles.css', 
                array(), 
                FRAMEWORK_MODULAR_VERSION
            );
            
            // CSS del módulo de tareas
            wp_enqueue_style(
                'framework-modular-tasks-styles', 
                FRAMEWORK_MODULAR_PLUGIN_URL . 'assets/css/tasks.css', 
                array('framework-modular-styles'), 
                FRAMEWORK_MODULAR_VERSION
            );
            
            // CSS del módulo de notas
            wp_enqueue_style(
                'framework-modular-notes-styles', 
                FRAMEWORK_MODULAR_PLUGIN_URL . 'assets/css/notes.css', 
                array('framework-modular-styles'), 
                FRAMEWORK_MODULAR_VERSION
            );
            
            // CSS del módulo de asistente
            wp_enqueue_style(
                'framework-modular-assistant-styles', 
                FRAMEWORK_MODULAR_PLUGIN_URL . 'assets/css/assistant.css', 
                array('framework-modular-styles'), 
                FRAMEWORK_MODULAR_VERSION
            );
            
            // JavaScript externos
            wp_enqueue_script(
                'marked', 
                'https://cdn.jsdelivr.net/npm/marked/marked.min.js', 
                array(), 
                null, 
                true
            );
            
            wp_enqueue_script(
                'sortable', 
                'https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js', 
                array(), 
                null, 
                true
            );
            
            // JavaScript del framework
            wp_enqueue_script(
                'framework-modular-core', 
                FRAMEWORK_MODULAR_PLUGIN_URL . 'assets/js/core.js', 
                array('jquery'), 
                FRAMEWORK_MODULAR_VERSION, 
                true
            );
            
            // JavaScript del módulo de tareas
            wp_enqueue_script(
                'framework-modular-tasks', 
                FRAMEWORK_MODULAR_PLUGIN_URL . 'assets/js/tasks.js', 
                array('framework-modular-core'), 
                FRAMEWORK_MODULAR_VERSION, 
                true
            );
            
            // JavaScript del módulo de asistente
            wp_enqueue_script(
                'framework-modular-assistant', 
                FRAMEWORK_MODULAR_PLUGIN_URL . 'assets/js/assistant.js', 
                array('framework-modular-core'), 
                FRAMEWORK_MODULAR_VERSION, 
                true
            );
            
            // JavaScript del módulo de notas
            wp_enqueue_script(
                'framework-modular-notes', 
                FRAMEWORK_MODULAR_PLUGIN_URL . 'assets/js/notes.js', 
                array('framework-modular-core'), 
                FRAMEWORK_MODULAR_VERSION, 
                true
            );
            
            // Pasar datos de WordPress a JavaScript
            wp_localize_script('framework-modular-core', 'frameworkModularWP', array(
                'restUrl' => rest_url('framework-modular/v1/'),
                'nonce' => wp_create_nonce('wp_rest'),
                'currentUserId' => get_current_user_id(),
                'userName' => wp_get_current_user()->display_name,
                'userEmail' => wp_get_current_user()->user_email,
                'pluginUrl' => FRAMEWORK_MODULAR_PLUGIN_URL,
            ));
        }
    }
    
    /**
     * Registrar rutas REST API
     */
    public function register_rest_routes() {
        // Obtener datos del usuario
        register_rest_route('framework-modular/v1', '/data/(?P<type>[a-zA-Z0-9_-]+)', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_user_data'),
            'permission_callback' => array($this, 'check_user_permission'),
            'args' => array(
                'type' => array(
                    'required' => true,
                    'type' => 'string',
                ),
            ),
        ));
        
        // Guardar datos del usuario
        register_rest_route('framework-modular/v1', '/data/(?P<type>[a-zA-Z0-9_-]+)', array(
            'methods' => 'POST',
            'callback' => array($this, 'save_user_data'),
            'permission_callback' => array($this, 'check_user_permission'),
            'args' => array(
                'type' => array(
                    'required' => true,
                    'type' => 'string',
                ),
                'data' => array(
                    'required' => true,
                ),
            ),
        ));
        
        // Eliminar datos del usuario
        register_rest_route('framework-modular/v1', '/data/(?P<type>[a-zA-Z0-9_-]+)', array(
            'methods' => 'DELETE',
            'callback' => array($this, 'delete_user_data'),
            'permission_callback' => array($this, 'check_user_permission'),
            'args' => array(
                'type' => array(
                    'required' => true,
                    'type' => 'string',
                ),
            ),
        ));
        
        // Eliminar todos los datos del usuario
        register_rest_route('framework-modular/v1', '/data', array(
            'methods' => 'DELETE',
            'callback' => array($this, 'delete_all_user_data'),
            'permission_callback' => array($this, 'check_user_permission'),
        ));
    }
    
    /**
     * Verificar permisos del usuario
     */
    public function check_user_permission() {
        return is_user_logged_in();
    }
    
    /**
     * Obtener datos del usuario
     */
    public function get_user_data($request) {
        global $wpdb;
        
        $user_id = get_current_user_id();
        $data_type = $request['type'];
        
        $table_name = $wpdb->prefix . 'framework_modular_data';
        
        $result = $wpdb->get_var($wpdb->prepare(
            "SELECT data_content FROM $table_name WHERE user_id = %d AND data_type = %s",
            $user_id,
            $data_type
        ));
        
        if ($result) {
            return rest_ensure_response(json_decode($result, true));
        }
        
        // Retornar datos por defecto si no existen
        return rest_ensure_response($this->get_default_data($data_type));
    }
    
    /**
     * Guardar datos del usuario
     */
    public function save_user_data($request) {
        global $wpdb;
        
        $user_id = get_current_user_id();
        $data_type = $request['type'];
        $data = $request['data'];
        
        $table_name = $wpdb->prefix . 'framework_modular_data';
        
        // Verificar si ya existe
        $exists = $wpdb->get_var($wpdb->prepare(
            "SELECT id FROM $table_name WHERE user_id = %d AND data_type = %s",
            $user_id,
            $data_type
        ));
        
        $data_content = json_encode($data);
        
        if ($exists) {
            // Actualizar
            $result = $wpdb->update(
                $table_name,
                array('data_content' => $data_content),
                array('user_id' => $user_id, 'data_type' => $data_type)
            );
        } else {
            // Insertar
            $result = $wpdb->insert(
                $table_name,
                array(
                    'user_id' => $user_id,
                    'data_type' => $data_type,
                    'data_content' => $data_content
                )
            );
        }
        
        if ($result !== false) {
            return rest_ensure_response(array('success' => true));
        }
        
        return new WP_Error('save_failed', 'Error al guardar datos', array('status' => 500));
    }
    
    /**
     * Eliminar datos del usuario
     */
    public function delete_user_data($request) {
        global $wpdb;
        
        $user_id = get_current_user_id();
        $data_type = $request['type'];
        
        $table_name = $wpdb->prefix . 'framework_modular_data';
        
        $result = $wpdb->delete(
            $table_name,
            array('user_id' => $user_id, 'data_type' => $data_type)
        );
        
        if ($result !== false) {
            return rest_ensure_response(array('success' => true));
        }
        
        return new WP_Error('delete_failed', 'Error al eliminar datos', array('status' => 500));
    }
    
    /**
     * Eliminar todos los datos del usuario
     */
    public function delete_all_user_data($request) {
        global $wpdb;
        
        $user_id = get_current_user_id();
        $table_name = $wpdb->prefix . 'framework_modular_data';
        
        $result = $wpdb->delete(
            $table_name,
            array('user_id' => $user_id)
        );
        
        if ($result !== false) {
            return rest_ensure_response(array(
                'success' => true,
                'deleted_records' => $result,
                'message' => 'Todos los datos del usuario han sido eliminados correctamente'
            ));
        }
        
        return new WP_Error('delete_all_failed', 'Error al eliminar todos los datos', array('status' => 500));
    }
    
    /**
     * Obtener datos por defecto según el tipo
     */
    private function get_default_data($type) {
        switch ($type) {
            case 'tasks':
                return array(
                    'scenarios' => array(
                        1 => array(
                            'id' => 1,
                            'name' => 'Personal',
                            'icon' => '🏠',
                            'description' => 'Escenario personal por defecto',
                            'createdAt' => date('c'),
                            'data' => array(
                                'tasks' => array(),
                                'projects' => array(
                                    array('id' => 1, 'name' => 'Trabajo', 'color' => '#db4035'),
                                    array('id' => 2, 'name' => 'Personal', 'color' => '#ff9933'),
                                    array('id' => 3, 'name' => 'Estudio', 'color' => '#299438')
                                ),
                                'taskIdCounter' => 1,
                                'projectIdCounter' => 4,
                                'subtaskIdCounter' => 1000
                            )
                        )
                    ),
                    'currentScenario' => 1,
                    'scenarioIdCounter' => 2
                );
                
            case 'tasksModule_aiConfig':
                return array(
                    'apiKey' => '',
                    'model' => 'gpt-5-mini',
                    'maxTokens' => 1000,
                    'temperature' => 0.7,
                    'historyLimit' => 10
                );
                
            case 'tasksModule_aiStats':
                return array(
                    'todayQueries' => 0,
                    'totalTokens' => 0,
                    'estimatedCost' => 0,
                    'usageHistory' => array(),
                    'currentModel' => 'GPT-5 Mini',
                    'lastResetDate' => date('Y-m-d')
                );
                
            case 'tasksModule_assistantMessages':
                return array();
                
            case 'assistant':
                return array(
                    'contexts' => array(
                        'general' => array(
                            'id' => 'general',
                            'name' => 'General',
                            'icon' => '🤖',
                            'description' => 'Asistente general para cualquier consulta',
                            'systemPrompt' => 'Eres un asistente útil y amigable. Ayuda al usuario con cualquier consulta de manera clara y concisa.'
                        ),
                        'tasks' => array(
                            'id' => 'tasks',
                            'name' => 'Tareas',
                            'icon' => '📋',
                            'description' => 'Especializado en gestión de tareas y productividad',
                            'systemPrompt' => 'Eres un asistente especializado en gestión de tareas y productividad. Ayuda al usuario a organizar, planificar y completar sus tareas de manera eficiente.'
                        ),
                        'notes' => array(
                            'id' => 'notes',
                            'name' => 'Notas',
                            'icon' => '📝',
                            'description' => 'Especializado en organización de notas y conocimiento',
                            'systemPrompt' => 'Eres un asistente especializado en organización de notas y gestión del conocimiento. Ayuda al usuario a estructurar, categorizar y encontrar información.'
                        )
                    ),
                    'currentContext' => 'general'
                );
                
            case 'assistant_aiConfig':
                return array(
                    'apiKey' => '',
                    'model' => 'gpt-5-mini',
                    'maxTokens' => 1000,
                    'temperature' => 0.7,
                    'historyLimit' => 10
                );
                
            case 'assistant_aiStats':
                return array(
                    'todayQueries' => 0,
                    'totalTokens' => 0,
                    'estimatedCost' => 0,
                    'usageHistory' => array(),
                    'currentModel' => 'GPT-5 Mini',
                    'lastResetDate' => date('Y-m-d')
                );
                
            case 'assistant_messages':
                return array();
                
            case 'notes':
                return array(
                    'scenarios' => array(
                        1 => array(
                            'id' => 1,
                            'name' => 'Personal',
                            'icon' => '🏠',
                            'description' => 'Escenario personal por defecto',
                            'createdAt' => date('c'),
                            'data' => array(
                                'notes' => array(),
                                'folders' => array(
                                    array('id' => 1, 'name' => 'General', 'color' => '#a8e6cf'),
                                    array('id' => 2, 'name' => 'Ideas', 'color' => '#ffd3a5'),
                                    array('id' => 3, 'name' => 'Trabajo', 'color' => '#fd9b9b')
                                ),
                                'noteIdCounter' => 1,
                                'folderIdCounter' => 4
                            )
                        )
                    ),
                    'currentScenario' => 1,
                    'scenarioIdCounter' => 2
                );
                
            default:
                return array();
        }
    }
    
    /**
     * Crear datos iniciales para el usuario
     */
    private function create_initial_user_data() {
        if (!is_user_logged_in()) {
            return;
        }
        
        global $wpdb;
        $user_id = get_current_user_id();
        $table_name = $wpdb->prefix . 'framework_modular_data';
        
        // Verificar si el usuario ya tiene datos
        $existing_data = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM $table_name WHERE user_id = %d",
            $user_id
        ));
        
        if ($existing_data == 0) {
            // Crear datos iniciales
            $initial_data = array(
                'tasks' => $this->get_default_data('tasks'),
                'tasksModule_aiConfig' => $this->get_default_data('tasksModule_aiConfig'),
                'tasksModule_aiStats' => $this->get_default_data('tasksModule_aiStats'),
                'tasksModule_assistantMessages' => $this->get_default_data('tasksModule_assistantMessages'),
                'assistant' => $this->get_default_data('assistant'),
                'assistant_aiConfig' => $this->get_default_data('assistant_aiConfig'),
                'assistant_aiStats' => $this->get_default_data('assistant_aiStats'),
                'assistant_messages' => $this->get_default_data('assistant_messages'),
                'notes' => $this->get_default_data('notes')
            );
            
            foreach ($initial_data as $type => $data) {
                $wpdb->insert(
                    $table_name,
                    array(
                        'user_id' => $user_id,
                        'data_type' => $type,
                        'data_content' => json_encode($data)
                    )
                );
            }
        }
    }
}

// Inicializar el plugin
new FrameworkModularWP();
