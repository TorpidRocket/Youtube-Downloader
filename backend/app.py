"""
YouTube Downloader - Flask Web API
Production-ready REST API for downloading YouTube videos and audio
"""

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import yt_dlp
import os
import uuid
from pathlib import Path
import threading
import time
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend requests

# Configuration
import os
DOWNLOAD_FOLDER = Path(os.environ.get('DOWNLOAD_FOLDER', 'downloads'))
DOWNLOAD_FOLDER.mkdir(exist_ok=True)
MAX_FILES_TO_KEEP = 5

# Store download progress and metadata
download_progress = {}
download_metadata = {}

class ProgressHook:
    """Custom progress hook for yt-dlp"""
    def __init__(self, download_id):
        self.download_id = download_id
    
    def __call__(self, d):
        if d['status'] == 'downloading':
            progress_data = {
                'status': 'downloading',
                'percent': d.get('_percent_str', '0%').strip(),
                'speed': d.get('_speed_str', 'N/A'),
                'eta': d.get('_eta_str', 'N/A'),
                'downloaded': d.get('_downloaded_bytes_str', '0'),
                'total': d.get('_total_bytes_str', 'Unknown'),
                'timestamp': datetime.now().isoformat()
            }
            download_progress[self.download_id] = progress_data
            logger.info(f"Download {self.download_id}: {progress_data['percent']}")
        
        elif d['status'] == 'finished':
            download_progress[self.download_id] = {
                'status': 'processing',
                'message': 'Processing file...',
                'timestamp': datetime.now().isoformat()
            }
            logger.info(f"Download {self.download_id}: Processing...")


def cleanup_old_files():
    """Keep only the N most recent files, delete the rest"""
    while True:
        time.sleep(300)  # Check every 5 minutes
        try:
            files = [(f, f.stat().st_mtime) for f in DOWNLOAD_FOLDER.glob('*') if f.is_file()]
            files.sort(key=lambda x: x[1], reverse=True)
            
            # Keep first N, delete the rest
            deleted_count = 0
            for file, _ in files[MAX_FILES_TO_KEEP:]:
                try:
                    file.unlink()
                    deleted_count += 1
                    logger.info(f"Cleaned up old file: {file.name}")
                except Exception as e:
                    logger.error(f"Failed to delete {file.name}: {e}")
            
            if deleted_count > 0:
                logger.info(f"Cleanup complete! Deleted {deleted_count} files, kept {min(len(files), MAX_FILES_TO_KEEP)}")
        
        except Exception as e:
            logger.error(f"Cleanup error: {e}")


# Start cleanup thread
cleanup_thread = threading.Thread(target=cleanup_old_files, daemon=True)
cleanup_thread.start()
logger.info("Cleanup thread started - keeping 5 most recent files")


@app.route('/api/info', methods=['POST'])
def get_video_info():
    """Get video information without downloading"""
    data = request.json
    url = data.get('url')
    
    if not url:
        return jsonify({'error': 'URL is required'}), 400
    
    logger.info(f"Fetching info for URL: {url}")
    
    try:
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': False,
            'cookiefile': 'youtube_cookies.txt',
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            
            # Get available formats
            formats = []
            if 'formats' in info:
                seen = set()
                for f in info['formats']:
                    # Only include formats with both video and audio
                    if f.get('vcodec') != 'none' and f.get('acodec') != 'none':
                        resolution = f.get('resolution', 'unknown')
                        ext = f.get('ext', 'unknown')
                        format_key = f"{resolution}_{ext}"
                        if format_key not in seen:
                            formats.append({
                                'resolution': resolution,
                                'ext': ext,
                                'format_id': f.get('format_id'),
                                'filesize': f.get('filesize', 'unknown')
                            })
                            seen.add(format_key)
            
            # Sort formats by resolution
            formats = sorted(formats, key=lambda x: x.get('resolution', ''), reverse=True)
            
            response = {
                'title': info.get('title', 'Unknown'),
                'thumbnail': info.get('thumbnail', ''),
                'duration': info.get('duration', 0),
                'uploader': info.get('uploader', 'Unknown'),
                'view_count': info.get('view_count', 0),
                'upload_date': info.get('upload_date', ''),
                'description': info.get('description', '')[:500] if info.get('description') else '',
                'formats': formats[:15]  # Return top 15 formats
            }
            
            logger.info(f"Successfully fetched info for: {response['title']}")
            return jsonify(response)
    
    except Exception as e:
        logger.error(f"Error fetching video info: {e}")
        return jsonify({'error': str(e)}), 400


@app.route('/api/download', methods=['POST'])
def download_video():
    """Download video or audio"""
    data = request.json
    url = data.get('url')
    download_type = data.get('type', 'video')  # 'video' or 'audio'
    quality = data.get('quality', 'best')
    audio_format = data.get('audio_format', 'mp3')  # For audio downloads
    
    if not url:
        return jsonify({'error': 'URL is required'}), 400
    
    # Generate unique download ID
    download_id = str(uuid.uuid4())
    download_progress[download_id] = {
        'status': 'starting',
        'percent': '0%',
        'timestamp': datetime.now().isoformat()
    }
    
    logger.info(f"Starting {download_type} download - ID: {download_id}, URL: {url}")
    
    try:
        # Configure yt-dlp options
        output_template = str(DOWNLOAD_FOLDER / f'{download_id}_%(title)s.%(ext)s')
        
        if download_type == 'audio':
            ydl_opts = {
                'format': 'bestaudio/best',
                'outtmpl': output_template,
                'progress_hooks': [ProgressHook(download_id)],
                'cookiefile': 'youtube_cookies.txt',
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': audio_format,
                    'preferredquality': '192' if audio_format == 'mp3' else '256',
                }],
                'quiet': False,
                'no_warnings': False,
            }
        else:  # video
            if quality == 'best':
                format_string = 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best'
            else:
                format_string = f'bestvideo[ext=mp4][height<={quality}]+bestaudio[ext=m4a]/best[ext=mp4][height<={quality}]/best'
            
            ydl_opts = {
                'format': format_string,
                'outtmpl': output_template,
                'progress_hooks': [ProgressHook(download_id)],
                'merge_output_format': 'mp4',
                'cookiefile': 'youtube_cookies.txt',
                'postprocessors': [{
                    'key': 'FFmpegVideoConvertor',
                    'preferedformat': 'mp4',
                }],
                'prefer_ffmpeg': True,
                'quiet': False,
                'no_warnings': False,
            }
        
        # Download in background thread
        def download_task():
            try:
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(url, download=True)
                    filename = ydl.prepare_filename(info)
                    
                    # For audio, the filename will have the audio extension after postprocessing
                    if download_type == 'audio':
                        filename = filename.rsplit('.', 1)[0] + f'.{audio_format}'
                    
                    # Get file size
                    file_size = os.path.getsize(filename) if os.path.exists(filename) else 0
                    
                    download_progress[download_id] = {
                        'status': 'completed',
                        'filename': os.path.basename(filename),
                        'filepath': filename,
                        'filesize': file_size,
                        'timestamp': datetime.now().isoformat()
                    }
                    
                    # Store metadata
                    download_metadata[download_id] = {
                        'title': info.get('title', 'Unknown'),
                        'type': download_type,
                        'quality': quality,
                        'url': url,
                        'completed_at': datetime.now().isoformat()
                    }
                    
                    logger.info(f"Download {download_id} completed: {filename}")
            
            except Exception as e:
                download_progress[download_id] = {
                    'status': 'error',
                    'error': str(e),
                    'timestamp': datetime.now().isoformat()
                }
                logger.error(f"Download {download_id} failed: {e}")
        
        thread = threading.Thread(target=download_task)
        thread.start()
        
        return jsonify({
            'download_id': download_id,
            'message': 'Download started',
            'timestamp': datetime.now().isoformat()
        })
    
    except Exception as e:
        logger.error(f"Error starting download: {e}")
        return jsonify({'error': str(e)}), 400


@app.route('/api/progress/<download_id>', methods=['GET'])
def get_progress(download_id):
    """Get download progress"""
    if download_id not in download_progress:
        return jsonify({'error': 'Invalid download ID'}), 404
    
    return jsonify(download_progress[download_id])


@app.route('/api/file/<download_id>', methods=['GET'])
def get_file(download_id):
    """Download the completed file"""
    if download_id not in download_progress:
        return jsonify({'error': 'Invalid download ID'}), 404
    
    progress = download_progress[download_id]
    
    if progress.get('status') != 'completed':
        return jsonify({'error': 'Download not completed'}), 400
    
    filepath = progress.get('filepath')
    if not filepath or not os.path.exists(filepath):
        return jsonify({'error': 'File not found'}), 404
    
    logger.info(f"Sending file for download: {progress.get('filename')}")
    
    return send_file(
        filepath,
        as_attachment=True,
        download_name=progress.get('filename')
    )


@app.route('/api/downloads', methods=['GET'])
def list_downloads():
    """List all completed downloads"""
    completed = []
    
    for download_id, progress in download_progress.items():
        if progress.get('status') == 'completed':
            metadata = download_metadata.get(download_id, {})
            completed.append({
                'download_id': download_id,
                'filename': progress.get('filename'),
                'filesize': progress.get('filesize', 0),
                'title': metadata.get('title', 'Unknown'),
                'type': metadata.get('type', 'unknown'),
                'completed_at': progress.get('timestamp'),
            })
    
    # Sort by timestamp (newest first)
    completed.sort(key=lambda x: x.get('completed_at', ''), reverse=True)
    
    return jsonify({
        'downloads': completed,
        'count': len(completed)
    })


@app.route('/api/cleanup', methods=['POST'])
def manual_cleanup():
    """Manually trigger cleanup to keep only N most recent files"""
    try:
        keep_count = request.json.get('keep', MAX_FILES_TO_KEEP) if request.json else MAX_FILES_TO_KEEP
        
        files = [(f, f.stat().st_mtime) for f in DOWNLOAD_FOLDER.glob('*') if f.is_file()]
        files.sort(key=lambda x: x[1], reverse=True)
        
        deleted_count = 0
        deleted_files = []
        
        for file, _ in files[keep_count:]:
            try:
                deleted_files.append(file.name)
                file.unlink()
                deleted_count += 1
            except Exception as e:
                logger.error(f"Failed to delete {file.name}: {e}")
        
        logger.info(f"Manual cleanup: Deleted {deleted_count} files, kept {min(len(files), keep_count)}")
        
        return jsonify({
            'message': 'Cleanup completed',
            'deleted': deleted_count,
            'deleted_files': deleted_files,
            'remaining': min(len(files), keep_count),
            'timestamp': datetime.now().isoformat()
        })
    
    except Exception as e:
        logger.error(f"Manual cleanup error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get server statistics"""
    try:
        files = list(DOWNLOAD_FOLDER.glob('*'))
        total_size = sum(f.stat().st_size for f in files if f.is_file())
        
        active_downloads = sum(1 for p in download_progress.values() if p.get('status') == 'downloading')
        completed_downloads = sum(1 for p in download_progress.values() if p.get('status') == 'completed')
        
        return jsonify({
            'total_files': len(files),
            'total_size_mb': round(total_size / (1024 * 1024), 2),
            'active_downloads': active_downloads,
            'completed_downloads': completed_downloads,
            'max_files_kept': MAX_FILES_TO_KEEP,
            'timestamp': datetime.now().isoformat()
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'download_folder': str(DOWNLOAD_FOLDER),
        'max_files': MAX_FILES_TO_KEEP
    })


@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Endpoint not found'}), 404


@app.errorhandler(500)
def internal_error(e):
    return jsonify({'error': 'Internal server error'}), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    
    logger.info("=" * 60)
    logger.info("YouTube Downloader API Server Starting...")
    logger.info(f"Download folder: {DOWNLOAD_FOLDER.absolute()}")
    logger.info(f"Max files to keep: {MAX_FILES_TO_KEEP}")
    logger.info(f"Port: {port}")
    logger.info("=" * 60)
    
    app.run(debug=False, host='0.0.0.0', port=port)
