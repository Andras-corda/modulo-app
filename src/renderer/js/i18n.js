// ── Modulo i18n ──

const TRANSLATIONS = {
  fr: {
    // Nav
    marketplace:  'Marketplace',
    profile:      'Profil',
    settings:     'Paramètres',

    // Marketplace
    marketplace_title:      'Marketplace',
    marketplace_subtitle:   'Installez les modules dont vous avez besoin',
    marketplace_search:     'Rechercher un module…',
    marketplace_all:        'Tous',
    marketplace_core:       'Noyau',
    marketplace_productivity:'Productivité',
    marketplace_time:       'Temps',
    marketplace_install:    'Installer',
    marketplace_remove:     'Retirer',
    marketplace_installed:  'Installé',
    marketplace_builtin:    'Intégré',
    marketplace_loading:    'Chargement du catalogue…',
    marketplace_error:      'Impossible de charger le catalogue.',
    marketplace_retry:      'Réessayer',
    marketplace_refresh:    'Actualiser',
    marketplace_empty:      'Aucun module trouvé',
    marketplace_downloads:  'téléchargements',
    marketplace_version:    'Version',
    marketplace_author:     'Auteur',
    marketplace_changelog:  'Historique des versions',
    marketplace_size:       'Taille',
    marketplace_category:   'Catégorie',

    // Settings
    settings_title:         'Paramètres',
    settings_appearance:    'Apparence',
    settings_general:       'Général',
    settings_modules:       'Modules',
    settings_devlog:        'Dev Log',
    settings_theme:         'Thème',
    settings_theme_dark:    'Sombre',
    settings_theme_light:   'Clair',
    settings_language:      'Langue',
    settings_font_size:     'Taille du texte',
    settings_font_small:    'Petite',
    settings_font_normal:   'Normale',
    settings_font_large:    'Grande',
    settings_date_format:   'Format de date',
    settings_sounds:        'Sons activés',
    settings_startup:       'Lancer au démarrage',
    settings_catalog_url:   'URL du catalogue',
    settings_save:          'Enregistrer',
    settings_saved:         'Enregistré !',

    // Profile
    profile_title:          'Profil',
    profile_pseudo:         'Nom d\'utilisateur',
    profile_password:       'Mot de passe (notes sécurisées)',
    profile_save:           'Enregistrer',
    profile_change_pw:      'Changer le mot de passe',
    profile_no_pw:          'Aucun mot de passe défini',

    // Dev Log
    devlog_title:           'Dev Log',
    devlog_clear:           'Effacer',
    devlog_export:          'Exporter JSON',
    devlog_all:             'Tout',
    devlog_info:            'Info',
    devlog_warn:            'Warn',
    devlog_error:           'Erreur',
    devlog_debug:           'Debug',
    devlog_empty:           'Aucune entrée de log',

    // Common
    save:     'Enregistrer',
    cancel:   'Annuler',
    delete:   'Supprimer',
    confirm:  'Confirmer',
    close:    'Fermer',
    ok:       'OK',
    yes:      'Oui',
    no:       'Non',
    loading:  'Chargement…',
    error:    'Erreur',
    success:  'Succès',
    empty:    'Vide',
    search:   'Rechercher',
    add:      'Ajouter',
    edit:     'Modifier',
    back:     'Retour',
    done:     'Terminé',
    today:    'Aujourd\'hui',
  },

  en: {
    // Nav
    marketplace:  'Marketplace',
    profile:      'Profile',
    settings:     'Settings',

    // Marketplace
    marketplace_title:      'Marketplace',
    marketplace_subtitle:   'Install the modules you need',
    marketplace_search:     'Search modules…',
    marketplace_all:        'All',
    marketplace_core:       'Core',
    marketplace_productivity:'Productivity',
    marketplace_time:       'Time',
    marketplace_install:    'Install',
    marketplace_remove:     'Remove',
    marketplace_installed:  'Installed',
    marketplace_builtin:    'Built-in',
    marketplace_loading:    'Loading catalog…',
    marketplace_error:      'Could not load catalog.',
    marketplace_retry:      'Retry',
    marketplace_refresh:    'Refresh',
    marketplace_empty:      'No modules found',
    marketplace_downloads:  'downloads',
    marketplace_version:    'Version',
    marketplace_author:     'Author',
    marketplace_changelog:  'Changelog',
    marketplace_size:       'Size',
    marketplace_category:   'Category',

    // Settings
    settings_title:         'Settings',
    settings_appearance:    'Appearance',
    settings_general:       'General',
    settings_modules:       'Modules',
    settings_devlog:        'Dev Log',
    settings_theme:         'Theme',
    settings_theme_dark:    'Dark',
    settings_theme_light:   'Light',
    settings_language:      'Language',
    settings_font_size:     'Font size',
    settings_font_small:    'Small',
    settings_font_normal:   'Normal',
    settings_font_large:    'Large',
    settings_date_format:   'Date format',
    settings_sounds:        'Sounds enabled',
    settings_startup:       'Launch at startup',
    settings_catalog_url:   'Catalog URL',
    settings_save:          'Save',
    settings_saved:         'Saved!',

    // Profile
    profile_title:          'Profile',
    profile_pseudo:         'Username',
    profile_password:       'Password (secure notes)',
    profile_save:           'Save',
    profile_change_pw:      'Change password',
    profile_no_pw:          'No password set',

    // Dev Log
    devlog_title:           'Dev Log',
    devlog_clear:           'Clear',
    devlog_export:          'Export JSON',
    devlog_all:             'All',
    devlog_info:            'Info',
    devlog_warn:            'Warn',
    devlog_error:           'Error',
    devlog_debug:           'Debug',
    devlog_empty:           'No log entries',

    // Common
    save:     'Save',
    cancel:   'Cancel',
    delete:   'Delete',
    confirm:  'Confirm',
    close:    'Close',
    ok:       'OK',
    yes:      'Yes',
    no:       'No',
    loading:  'Loading…',
    error:    'Error',
    success:  'Success',
    empty:    'Empty',
    search:   'Search',
    add:      'Add',
    edit:     'Edit',
    back:     'Back',
    done:     'Done',
    today:    'Today',
  },
};

let _lang = 'fr';

function setLang(lang) {
  if (TRANSLATIONS[lang]) _lang = lang;
}

function t(key) {
  return TRANSLATIONS[_lang][key] ?? TRANSLATIONS['fr'][key] ?? key;
}

// Globales
window.t = t;
window.setLang = setLang;
window._i18n = { setLang, t };
