/**
 * API Module - Handles all backend communication
 */

const API = {
    /**
     * Make a GET request to the API
     */
    async get(endpoint) {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`);
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Request failed');
            }
            
            return await response.json();
        } catch (error) {
            console.error('API GET Error:', error);
            throw error;
        }
    },

    /**
     * Make a POST request to the API
     */
    async post(endpoint, data) {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Request failed');
            }
            
            return await response.json();
        } catch (error) {
            console.error('API POST Error:', error);
            throw error;
        }
    },

    /**
     * Get video information
     */
    async getVideoInfo(url) {
        return await this.post(CONFIG.ENDPOINTS.INFO, { url });
    },

    /**
     * Start a download
     */
    async startDownload(url, type, quality) {
        const data = {
            url,
            type,
            quality: type === CONFIG.DOWNLOAD_TYPES.VIDEO ? quality : undefined,
            audio_format: type === CONFIG.DOWNLOAD_TYPES.AUDIO ? CONFIG.DEFAULT_AUDIO_FORMAT : undefined
        };
        
        return await this.post(CONFIG.ENDPOINTS.DOWNLOAD, data);
    },

    /**
     * Get download progress
     */
    async getProgress(downloadId) {
        return await this.get(`${CONFIG.ENDPOINTS.PROGRESS}/${downloadId}`);
    },

    /**
     * Get download file URL
     */
    getFileUrl(downloadId) {
        return `${CONFIG.API_BASE_URL}${CONFIG.ENDPOINTS.FILE}/${downloadId}`;
    },

    /**
     * Get download history
     */
    async getDownloads() {
        return await this.get(CONFIG.ENDPOINTS.DOWNLOADS);
    },

    /**
     * Trigger manual cleanup
     */
    async cleanup(keepCount = 5) {
        return await this.post(CONFIG.ENDPOINTS.CLEANUP, { keep: keepCount });
    },

    /**
     * Get server statistics
     */
    async getStats() {
        return await this.get(CONFIG.ENDPOINTS.STATS);
    },

    /**
     * Check server health
     */
    async healthCheck() {
        return await this.get(CONFIG.ENDPOINTS.HEALTH);
    }
};

/**
 * Progress Tracker - Polls for download progress
 */
class ProgressTracker {
    constructor(downloadId, onUpdate, onComplete, onError) {
        this.downloadId = downloadId;
        this.onUpdate = onUpdate;
        this.onComplete = onComplete;
        this.onError = onError;
        this.interval = null;
        this.isTracking = false;
    }

    start() {
        if (this.isTracking) return;
        
        this.isTracking = true;
        this.checkProgress();
        
        this.interval = setInterval(() => {
            this.checkProgress();
        }, CONFIG.PROGRESS_POLL_INTERVAL);
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.isTracking = false;
    }

    async checkProgress() {
        try {
            const progress = await API.getProgress(this.downloadId);
            
            if (progress.status === 'completed') {
                this.stop();
                this.onComplete(progress);
            } else if (progress.status === 'error') {
                this.stop();
                this.onError(progress.error || 'Download failed');
            } else {
                this.onUpdate(progress);
            }
        } catch (error) {
            this.stop();
            this.onError(error.message);
        }
    }
}
