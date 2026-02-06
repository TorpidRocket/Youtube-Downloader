/**
 * Main Application File
 * Coordinates between UI and API modules
 */

const App = {
    // Current state
    state: {
        currentUrl: '',
        currentDownloadType: CONFIG.DOWNLOAD_TYPES.VIDEO,
        currentQuality: CONFIG.DEFAULT_VIDEO_QUALITY,
        currentDownloadId: null,
        progressTracker: null,
        videoInfo: null
    },

    /**
     * Initialize the application
     */
    init() {
        console.log('🚀 YouTube Downloader initialized');
        
        // Initialize UI
        UI.init();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Check server health
        this.checkServerHealth();
        
        // Load initial data for history and stats tabs
        this.loadHistory();
        this.loadStats();
    },

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Tab navigation
        UI.elements.navBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                UI.switchTab(tab);
                
                // Load data when switching to specific tabs
                if (tab === 'history') {
                    this.loadHistory();
                } else if (tab === 'stats') {
                    this.loadStats();
                }
            });
        });

        // URL input - auto-detect paste
        UI.elements.urlInput.addEventListener('paste', () => {
            setTimeout(() => {
                const url = UI.elements.urlInput.value.trim();
                if (url && UI.isValidUrl(url)) {
                    UI.showToast('URL detected! Click "Get Info" to continue.');
                }
            }, 100);
        });

        // Fetch video info
        UI.elements.fetchInfoBtn.addEventListener('click', () => {
            this.fetchVideoInfo();
        });

        // Enter key on URL input
        UI.elements.urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.fetchVideoInfo();
            }
        });

        // Download type buttons
        UI.elements.downloadTypeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.type;
                this.state.currentDownloadType = type;
                UI.setDownloadType(type);
            });
        });

        // Quality select
        UI.elements.qualitySelect.addEventListener('change', (e) => {
            this.state.currentQuality = e.target.value;
        });

        // Download button
        UI.elements.downloadBtn.addEventListener('click', () => {
            this.startDownload();
        });

        // New download button
        UI.elements.newDownloadBtn.addEventListener('click', () => {
            UI.resetDownloadUI();
            UI.switchTab('download');
        });

        // Retry button
        UI.elements.retryBtn.addEventListener('click', () => {
            UI.hideAllSections();
            if (this.state.videoInfo) {
                UI.showVideoInfo(this.state.videoInfo);
            } else {
                UI.resetDownloadUI();
            }
        });

        // Download file button (trigger download)
        UI.elements.downloadFileBtn.addEventListener('click', () => {
            UI.showToast('Download started in your browser!');
        });

        // History refresh
        UI.elements.refreshHistoryBtn.addEventListener('click', () => {
            this.loadHistory();
        });

        // Stats refresh
        UI.elements.refreshStatsBtn.addEventListener('click', () => {
            this.loadStats();
        });

        // Manual cleanup
        UI.elements.manualCleanupBtn.addEventListener('click', () => {
            this.manualCleanup();
        });
    },

    /**
     * Check if server is healthy
     */
    async checkServerHealth() {
        try {
            await API.healthCheck();
            console.log('✅ Server is healthy');
        } catch (error) {
            console.error('❌ Server health check failed:', error);
            UI.showToast('⚠️ Cannot connect to server. Please check if backend is running.');
        }
    },

    /**
     * Fetch video information
     */
    async fetchVideoInfo() {
        const url = UI.elements.urlInput.value.trim();

        // Validate URL
        if (!url) {
            UI.showToast('Please enter a URL');
            return;
        }

        if (!UI.isValidUrl(url)) {
            UI.showToast('Please enter a valid URL');
            return;
        }

        this.state.currentUrl = url;
        UI.setLoading(true);

        try {
            const info = await API.getVideoInfo(url);
            this.state.videoInfo = info;
            UI.showVideoInfo(info);
            UI.showToast('Video info loaded successfully!');
        } catch (error) {
            console.error('Error fetching video info:', error);
            UI.showToast(`Error: ${error.message}`);
            UI.showError(error.message);
        } finally {
            UI.setLoading(false);
        }
    },

    /**
     * Start download
     */
    async startDownload() {
        if (!this.state.currentUrl) {
            UI.showToast('Please fetch video info first');
            return;
        }

        UI.setLoading(true);

        try {
            const response = await API.startDownload(
                this.state.currentUrl,
                this.state.currentDownloadType,
                this.state.currentQuality
            );

            this.state.currentDownloadId = response.download_id;
            
            UI.showProgress();
            UI.showToast('Download started!');
            
            // Start tracking progress
            this.trackProgress();
        } catch (error) {
            console.error('Error starting download:', error);
            UI.showToast(`Error: ${error.message}`);
            UI.showError(error.message);
        } finally {
            UI.setLoading(false);
        }
    },

    /**
     * Track download progress
     */
    trackProgress() {
        if (this.state.progressTracker) {
            this.state.progressTracker.stop();
        }

        this.state.progressTracker = new ProgressTracker(
            this.state.currentDownloadId,
            // onUpdate
            (progress) => {
                UI.updateProgress(progress);
            },
            // onComplete
            (progress) => {
                UI.showSuccess(this.state.currentDownloadId, progress.filename);
                UI.showToast('✅ Download complete!');
                
                // Refresh history
                this.loadHistory();
            },
            // onError
            (error) => {
                UI.showError(error);
                UI.showToast(`❌ Download failed: ${error}`);
            }
        );

        this.state.progressTracker.start();
    },

    /**
     * Load download history
     */
    async loadHistory() {
        try {
            const response = await API.getDownloads();
            UI.showHistory(response.downloads);
        } catch (error) {
            console.error('Error loading history:', error);
            UI.showToast('Failed to load history');
        }
    },

    /**
     * Load server statistics
     */
    async loadStats() {
        try {
            const stats = await API.getStats();
            UI.updateStats(stats);
        } catch (error) {
            console.error('Error loading stats:', error);
            UI.showToast('Failed to load statistics');
        }
    },

    /**
     * Trigger manual cleanup
     */
    async manualCleanup() {
        if (!confirm('Are you sure you want to clean up old files? This will keep only the 5 most recent downloads.')) {
            return;
        }

        UI.setLoading(true);

        try {
            const response = await API.cleanup();
            UI.showToast(`Cleanup complete! Deleted ${response.deleted} files.`);
            
            // Refresh stats and history
            this.loadStats();
            this.loadHistory();
        } catch (error) {
            console.error('Error during cleanup:', error);
            UI.showToast(`Cleanup failed: ${error.message}`);
        } finally {
            UI.setLoading(false);
        }
    }
};

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => App.init());
} else {
    App.init();
}

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});
