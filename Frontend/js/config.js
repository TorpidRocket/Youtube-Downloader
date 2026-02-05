/**
 * Configuration file for YouTube Downloader
 * Update API_BASE_URL to match your backend server
 */

const CONFIG = {
    // Backend API URL - Change this to your server URL
    API_BASE_URL: 'http://localhost:5000',
    
    // API Endpoints
    ENDPOINTS: {
        INFO: '/api/info',
        DOWNLOAD: '/api/download',
        PROGRESS: '/api/progress',
        FILE: '/api/file',
        DOWNLOADS: '/api/downloads',
        CLEANUP: '/api/cleanup',
        STATS: '/api/stats',
        HEALTH: '/health'
    },
    
    // Polling interval for progress updates (milliseconds)
    PROGRESS_POLL_INTERVAL: 1000,
    
    // Toast notification duration (milliseconds)
    TOAST_DURATION: 3000,
    
    // Maximum URL length
    MAX_URL_LENGTH: 2048,
    
    // Supported download types
    DOWNLOAD_TYPES: {
        VIDEO: 'video',
        AUDIO: 'audio'
    },
    
    // Default quality settings
    DEFAULT_VIDEO_QUALITY: 'best',
    DEFAULT_AUDIO_FORMAT: 'mp3',
    
    // Quality options
    VIDEO_QUALITIES: [
        { value: 'best', label: 'Best Quality' },
        { value: '1080', label: '1080p (Full HD)' },
        { value: '720', label: '720p (HD)' },
        { value: '480', label: '480p (SD)' },
        { value: '360', label: '360p' }
    ],
    
    // Feature flags
    FEATURES: {
        AUTO_REFRESH_STATS: true,
        SHOW_THUMBNAILS: true,
        ENABLE_HISTORY: true
    }
};

// Freeze config to prevent modifications
Object.freeze(CONFIG);
