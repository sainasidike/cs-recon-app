import { useState, useRef } from 'react';

export default function CSDocSelectPage({ onCancel, onAddMore, onConfirm, uploadedFiles }) {
  const fileInputRef = useRef(null);

  return (
    <div className="cs-screenshot-page">
      <img src="/cs-docselect.jpg" alt="选择文档" className="cs-screenshot-bg" />

      {/* Cancel button hotzone */}
      <div
        className="cs-hotzone"
        style={{ top: '3.8%', right: '0', width: '20%', height: '3.5%' }}
        onClick={onCancel}
      />

      {/* 合并 button at bottom - overlay with real button showing count */}
      <div className="cs-select-overlay-bottom">
        <button
          className="cs-select-overlay-btn"
          onClick={onConfirm}
        >
          补充文档并开始对账
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".xlsx,.xls,.csv,.pdf,.jpg,.jpeg,.png"
        style={{ display: 'none' }}
        onChange={(e) => {
          const files = Array.from(e.target.files);
          if (files.length > 0 && onAddMore) onAddMore(files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
