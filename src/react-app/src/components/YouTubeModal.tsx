import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import './YouTubeModal.css';

interface YouTubeLink {
  url: string;
  title?: string;
}

interface YouTubeModalProps {
  isOpen: boolean;
  links: YouTubeLink[];
  onSave: (links: YouTubeLink[]) => void;
  onClose: () => void;
}

export default function YouTubeModal({ isOpen, links, onSave, onClose }: YouTubeModalProps) {
  const [youtubeLinks, setYoutubeLinks] = useState<YouTubeLink[]>(links);
  const [newUrl, setNewUrl] = useState('');
  const [error, setError] = useState('');

  const extractVideoId = (url: string): string | null => {
    const patterns = [
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&]+)/,
      /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^?]+)/,
      /^([a-zA-Z0-9_-]{11})$/, // Direct video ID
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  };

  const isValidYouTubeUrl = (url: string): boolean => {
    return extractVideoId(url) !== null;
  };

  const handleAddLink = () => {
    if (!newUrl.trim()) {
      setError('Vui lòng nhập URL YouTube');
      return;
    }

    if (!isValidYouTubeUrl(newUrl)) {
      setError('URL YouTube không hợp lệ. Vui lòng nhập URL YouTube đúng định dạng');
      return;
    }

    const videoId = extractVideoId(newUrl);
    if (!videoId) {
      setError('Không thể trích xuất ID video từ URL');
      return;
    }

    // Create normalized URL
    const normalizedUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // Check if already exists
    if (youtubeLinks.some((link) => extractVideoId(link.url) === videoId)) {
      setError('Link này đã được thêm rồi');
      return;
    }

    setYoutubeLinks([...youtubeLinks, { url: normalizedUrl }]);
    setNewUrl('');
    setError('');
  };

  const handleRemoveLink = (index: number) => {
    setYoutubeLinks(youtubeLinks.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    onSave(youtubeLinks);
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="youtube-modal-overlay" onClick={onClose}>
      <div className="youtube-modal" onClick={(e) => e.stopPropagation()}>
        <div className="youtube-modal-header">
          <h2>YouTube References</h2>
          <button className="youtube-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="youtube-modal-content">
          <div className="youtube-input-section">
            <label>Add YouTube Link:</label>
            <div className="youtube-input-group">
              <input
                type="text"
                value={newUrl}
                onChange={(e) => {
                  setNewUrl(e.target.value);
                  setError('');
                }}
                placeholder="Paste YouTube URL or video ID"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddLink();
                  }
                }}
              />
              <button className="youtube-btn-add" onClick={handleAddLink}>
                Add
              </button>
            </div>
            {error && <div className="youtube-error">{error}</div>}
          </div>

          {youtubeLinks.length > 0 && (
            <div className="youtube-links-list">
              <label>Links ({youtubeLinks.length}):</label>
              {youtubeLinks.map((link, idx) => {
                const videoId = extractVideoId(link.url);
                const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/default.jpg`;

                return (
                  <div key={idx} className="youtube-link-item">
                    <img src={thumbnailUrl} alt="thumbnail" className="youtube-thumbnail" />
                    <div className="youtube-link-info">
                      <a href={link.url} target="_blank" rel="noopener noreferrer" className="youtube-link-url">
                        {videoId}
                      </a>
                    </div>
                    <button className="youtube-btn-remove" onClick={() => handleRemoveLink(idx)}>
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="youtube-modal-footer">
          <button className="youtube-btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="youtube-btn-save" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
