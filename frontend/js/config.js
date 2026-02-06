/**
 * Configuration - Updates automatically based on environment
 */

// Detect if running locally or on Render
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

const CONFIG = {
    // Auto-detect API URL
    API_BASE_URL: isLocal 
        ? 'http://localhost:5000' 
        : 'https://youtube-downloader-api-r0za.onrender.com',  //Url on Render
    
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
    
    PROGRESS_POLL_INTERVAL: 1000,
    TOAST_DURATION: 3000,
    MAX_URL_LENGTH: 2048,
    
    DOWNLOAD_TYPES: {
        VIDEO: 'video',
        AUDIO: 'audio'
    },
    
    DEFAULT_VIDEO_QUALITY: 'best',
    DEFAULT_AUDIO_FORMAT: 'mp3',
    
    VIDEO_QUALITIES: [
        { value: 'best', label: 'Best Quality' },
        { value: '1080', label: '1080p (Full HD)' },
        { value: '720', label: '720p (HD)' },
        { value: '480', label: '480p (SD)' },
        { value: '360', label: '360p' }
    ],
    
    FEATURES: {
        AUTO_REFRESH_STATS: true,
        SHOW_THUMBNAILS: true,
        ENABLE_HISTORY: true
    }
};

Object.freeze(CONFIG);