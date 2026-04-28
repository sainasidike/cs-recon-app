import { useRef } from 'react';

export default function CSHomePage({ onOpenDocument, onUploadFiles }) {
  const fileInputRef = useRef(null);

  const handleFiles = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0 && onUploadFiles) {
      onUploadFiles(files);
    }
    e.target.value = '';
  };

  return (
    <div className="cs-screenshot-page">
      <img src="/cs-home.jpg" alt="CamScanner首页" className="cs-screenshot-bg" />

      {/* Clickable: first doc row → open doc view */}
      <div
        className="cs-hotzone"
        style={{ top: '36.5%', left: '3%', width: '94%', height: '7.5%' }}
        onClick={() => onOpenDocument({ id: 'doc1', name: '扫描全能王 2026-4-10 12.11' })}
      />

      {/* Clickable: camera button → upload files */}
      <div
        className="cs-hotzone cs-hotzone-round"
        style={{ bottom: '2.2%', left: '50%', transform: 'translateX(-50%)', width: '58px', height: '58px' }}
        onClick={() => fileInputRef.current?.click()}
      />

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".xlsx,.xls,.csv,.pdf,.jpg,.jpeg,.png"
        style={{ display: 'none' }}
        onChange={handleFiles}
      />
    </div>
  );
}
