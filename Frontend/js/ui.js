/**
 * UI Module - Handles all DOM manipulation and user interactions
 */

const UI = {
    // Element cache
    elements: {},

    /**
     * Initialize and cache DOM elements
     */
    init() {
        this.elements = {
            // Tabs
            navBtns: document.querySelectorAll('.nav-btn'),
            tabContents: document.querySelectorAll('.tab-content'),
            
            // Input
            urlInput: document.getElementById('url-input'),
            fetchInfoBtn: document.getElementById('fetch-info-btn'),
            
            // Video info section
            videoInfoSection: document.getElementById('video-info-section'),
            videoThumbnail: document.getElementById('video-thumbnail'),
            videoTitle: document.getElementById('video-title'),
            videoUploader: document.getElementById('video-uploader'),
            videoViews: document.getElementById('video-views'),
            videoDuration: document.getElementById('video-duration'),
            
            // Download options
            downloadTypeBtns: document.querySelectorAll('[data-type]'),
            qualityGroup: document.getElementById('quality-group'),
            qualitySelect: document.getElementById('quality-select'),
            downloadBtn: document.getElementById('download-btn'),
            
            // Progress section
            progressSection: document.getElementById('progress-section'),
            progressStatus: document.getElementById('progress-status'),
            progressFill: document.getElementById('progress-fill'),
            progressPercent: document.getElementById('progress-percent'),
            progressSpeed: document.getElementById('progress-speed'),
            progressEta: document.getElementById('progress-eta'),
            progressDownloaded: document.getElementById('progress-downloaded'),
            cancelBtn: document.getElementById('cancel-btn'),
            
            // Success section
            successSection: document.getElementById('success-section'),
            downloadFileBtn: document.getElementById('download-file-btn'),
            newDownloadBtn: document.getElementById('new-download-btn'),
            
            // Error section
            errorSection: document.getElementById('error-section'),
            errorMessage: document.getElementById('error-message'),
            retryBtn: document.getElementById('retry-btn'),
            
            // History
            historyList: document.getElementById('history-list'),
            refreshHistoryBtn: document.getElementById('refresh-history-btn'),
            
            // Stats
            statTotalFiles: document.getElementById('stat-total-files'),
            statStorage: document.getElementById('stat-storage'),
            statActive: document.getElementById('stat-active'),
            statCompleted: document.getElementById('stat-completed'),
            refreshStatsBtn: document.getElementById('refresh-stats-btn'),
            manualCleanupBtn: document.getElementById('manual-cleanup-btn'),
            
            // Toast
            toast: document.getElementById('toast'),
            toastMessage: document.getElementById('toast-message'),
            
            // Loading overlay
            loadingOverlay: document.getElementById('loading-overlay')
        };
    },

    /**
     * Switch between tabs
     */
    switchTab(tabName) {
        // Update nav buttons
        this.elements.navBtns.forEach(btn => {
            if (btn.dataset.tab === tabName) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Update tab contents
        this.elements.tabContents.forEach(content => {
            if (content.id === `${tabName}-tab`) {
                content.classList.add('active');
            } else {
                content.classList.remove('active');
            }
        });
    },

    /**
     * Show/hide loading overlay
     */
    setLoading(isLoading) {
        if (isLoading) {
            this.elements.loadingOverlay.classList.remove('hidden');
        } else {
            this.elements.loadingOverlay.classList.add('hidden');
        }
    },

    /**
     * Show toast notification
     */
    showToast(message, duration = CONFIG.TOAST_DURATION) {
        this.elements.toastMessage.textContent = message;
        this.elements.toast.classList.remove('hidden');

        setTimeout(() => {
            this.elements.toast.classList.add('hidden');
        }, duration);
    },

    /**
     * Display video information
     */
    showVideoInfo(info) {
        this.elements.videoThumbnail.src = info.thumbnail;
        this.elements.videoTitle.textContent = info.title;
        this.elements.videoUploader.textContent = info.uploader;
        this.elements.videoViews.textContent = this.formatViews(info.view_count);
        this.elements.videoDuration.textContent = this.formatDuration(info.duration);
        
        this.elements.videoInfoSection.classList.remove('hidden');
        
        // Scroll to video info
        this.elements.videoInfoSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },

    /**
     * Hide video info section
     */
    hideVideoInfo() {
        this.elements.videoInfoSection.classList.add('hidden');
    },

    /**
     * Set download type (video/audio)
     */
    setDownloadType(type) {
        this.elements.downloadTypeBtns.forEach(btn => {
            if (btn.dataset.type === type) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Show/hide quality selector
        if (type === CONFIG.DOWNLOAD_TYPES.VIDEO) {
            this.elements.qualityGroup.classList.remove('hidden');
        } else {
            this.elements.qualityGroup.classList.add('hidden');
        }
    },

    /**
     * Show progress section
     */
    showProgress() {
        this.hideAllSections();
        this.elements.progressSection.classList.remove('hidden');
        this.elements.progressSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },

    /**
     * Update progress display
     */
    updateProgress(progress) {
        if (progress.status === 'downloading') {
            this.elements.progressStatus.textContent = 'Downloading...';
            this.elements.progressPercent.textContent = progress.percent;
            this.elements.progressFill.style.width = progress.percent;
            this.elements.progressSpeed.textContent = progress.speed;
            this.elements.progressEta.textContent = progress.eta;
            this.elements.progressDownloaded.textContent = progress.downloaded;
        } else if (progress.status === 'processing') {
            this.elements.progressStatus.textContent = 'Processing file...';
            this.elements.progressPercent.textContent = '100%';
            this.elements.progressFill.style.width = '100%';
        } else if (progress.status === 'starting') {
            this.elements.progressStatus.textContent = 'Starting download...';
            this.elements.progressPercent.textContent = '0%';
            this.elements.progressFill.style.width = '0%';
        }
    },

    /**
     * Show success section
     */
    showSuccess(downloadId, filename) {
        this.hideAllSections();
        this.elements.downloadFileBtn.href = API.getFileUrl(downloadId);
        this.elements.downloadFileBtn.download = filename;
        this.elements.successSection.classList.remove('hidden');
        this.elements.successSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },

    /**
     * Show error section
     */
    showError(errorMsg) {
        this.hideAllSections();
        this.elements.errorMessage.textContent = errorMsg;
        this.elements.errorSection.classList.remove('hidden');
        this.elements.errorSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },

    /**
     * Hide all download sections
     */
    hideAllSections() {
        this.elements.progressSection.classList.add('hidden');
        this.elements.successSection.classList.add('hidden');
        this.elements.errorSection.classList.add('hidden');
    },

    /**
     * Reset to initial state
     */
    resetDownloadUI() {
        this.hideAllSections();
        this.elements.urlInput.value = '';
        this.hideVideoInfo();
        this.elements.urlInput.focus();
    },

    /**
     * Display download history
     */
    showHistory(downloads) {
        if (!downloads || downloads.length === 0) {
            this.elements.historyList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📭</div>
                    <p class="empty-text">No downloads yet</p>
                </div>
            `;
            return;
        }

        this.elements.historyList.innerHTML = downloads.map(download => `
            <div class="history-item">
                <div class="history-info">
                    <div class="history-title">${this.escapeHtml(download.title)}</div>
                    <div class="history-meta">
                        <span>${download.type === 'video' ? '🎥 Video' : '🎵 Audio'}</span>
                        <span class="separator">•</span>
                        <span>${this.formatFileSize(download.filesize)}</span>
                        <span class="separator">•</span>
                        <span>${this.formatDate(download.completed_at)}</span>
                    </div>
                </div>
                <div class="history-actions">
                    <a href="${API.getFileUrl(download.download_id)}" 
                       class="btn btn-primary btn-sm" 
                       download="${this.escapeHtml(download.filename)}">
                        <span class="btn-icon">💾</span>
                        Download
                    </a>
                </div>
            </div>
        `).join('');
    },

    /**
     * Update statistics display
     */
    updateStats(stats) {
        this.elements.statTotalFiles.textContent = stats.total_files;
        this.elements.statStorage.textContent = `${stats.total_size_mb} MB`;
        this.elements.statActive.textContent = stats.active_downloads;
        this.elements.statCompleted.textContent = stats.completed_downloads;
    },

    /**
     * Format file size
     */
    formatFileSize(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    /**
     * Format view count
     */
    formatViews(count) {
        if (!count) return '0 views';
        if (count >= 1000000) {
            return (count / 1000000).toFixed(1) + 'M views';
        }
        if (count >= 1000) {
            return (count / 1000).toFixed(1) + 'K views';
        }
        return count + ' views';
    },

    /**
     * Format duration (seconds to MM:SS or HH:MM:SS)
     */
    formatDuration(seconds) {
        if (!seconds) return '0:00';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    },

    /**
     * Format date
     */
    formatDate(dateString) {
        if (!dateString) return '';
        
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return date.toLocaleDateString();
    },

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * Validate URL
     */
    isValidUrl(url) {
        try {
            new URL(url);
            return url.length <= CONFIG.MAX_URL_LENGTH;
        } catch {
            return false;
        }
    }
};
