import { useRef, useState, useEffect } from 'react';

export default function CropEditor({ src, box, onChange }) {
  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const [imgRect, setImgRect] = useState(null);
  const dragRef = useRef(null);

  const updateRect = () => {
    if (imgRef.current && containerRef.current) {
      const r = imgRef.current.getBoundingClientRect();
      const cr = containerRef.current.getBoundingClientRect();
      setImgRect({ left: r.left - cr.left, top: r.top - cr.top, width: r.width, height: r.height });
    }
  };

  useEffect(() => { updateRect(); }, [src]);

  const handleStart = (e, type) => {
    e.preventDefault();
    e.stopPropagation();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    dragRef.current = { type, startX: clientX, startY: clientY, startBox: { ...box } };

    const onMove = (ev) => {
      if (!dragRef.current || !imgRect) return;
      const cx = ev.touches ? ev.touches[0].clientX : ev.clientX;
      const cy = ev.touches ? ev.touches[0].clientY : ev.clientY;
      const dx = (cx - dragRef.current.startX) / imgRect.width;
      const dy = (cy - dragRef.current.startY) / imgRect.height;
      const sb = dragRef.current.startBox;
      let nx = sb.x, ny = sb.y, nw = sb.w, nh = sb.h;
      const t = dragRef.current.type;

      if (t === 'move') {
        nx = Math.max(0, Math.min(1 - sb.w, sb.x + dx));
        ny = Math.max(0, Math.min(1 - sb.h, sb.y + dy));
      } else {
        if (t.includes('l')) { nx = Math.max(0, Math.min(sb.x + sb.w - 0.05, sb.x + dx)); nw = sb.w - (nx - sb.x); }
        if (t.includes('r')) { nw = Math.max(0.05, Math.min(1 - sb.x, sb.w + dx)); }
        if (t.includes('t')) { ny = Math.max(0, Math.min(sb.y + sb.h - 0.05, sb.y + dy)); nh = sb.h - (ny - sb.y); }
        if (t.includes('b')) { nh = Math.max(0.05, Math.min(1 - sb.y, sb.h + dy)); }
      }
      onChange({ x: nx, y: ny, w: nw, h: nh });
    };

    const onEnd = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
  };

  const corners = [
    { type: 'tl', x: 0, y: 0 },
    { type: 'tr', x: 1, y: 0 },
    { type: 'bl', x: 0, y: 1 },
    { type: 'br', x: 1, y: 1 },
  ];

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block', maxWidth: '100%', touchAction: 'none' }}>
      <img
        ref={imgRef}
        src={src}
        alt=""
        onLoad={updateRect}
        style={{ maxWidth: '100%', maxHeight: 380, objectFit: 'contain', borderRadius: 8, display: 'block', opacity: 0.5 }}
      />
      {imgRect && (
        <div style={{
          position: 'absolute', left: imgRect.left, top: imgRect.top,
          width: imgRect.width, height: imgRect.height, pointerEvents: 'none',
        }}>
          <div
            style={{
              position: 'absolute',
              left: `${box.x * 100}%`, top: `${box.y * 100}%`,
              width: `${box.w * 100}%`, height: `${box.h * 100}%`,
              border: '2px solid #3DD598',
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)',
              pointerEvents: 'auto', cursor: 'move',
            }}
            onMouseDown={e => handleStart(e, 'move')}
            onTouchStart={e => handleStart(e, 'move')}
          >
            {/* Grid lines */}
            <div style={{ position: 'absolute', left: '33.33%', top: 0, bottom: 0, width: 1, background: 'rgba(61,213,152,0.3)' }} />
            <div style={{ position: 'absolute', left: '66.66%', top: 0, bottom: 0, width: 1, background: 'rgba(61,213,152,0.3)' }} />
            <div style={{ position: 'absolute', top: '33.33%', left: 0, right: 0, height: 1, background: 'rgba(61,213,152,0.3)' }} />
            <div style={{ position: 'absolute', top: '66.66%', left: 0, right: 0, height: 1, background: 'rgba(61,213,152,0.3)' }} />
            {/* Corner handles */}
            {corners.map(c => (
              <div
                key={c.type}
                onMouseDown={e => handleStart(e, c.type)}
                onTouchStart={e => handleStart(e, c.type)}
                style={{
                  position: 'absolute',
                  left: c.x === 0 ? -7 : undefined, right: c.x === 1 ? -7 : undefined,
                  top: c.y === 0 ? -7 : undefined, bottom: c.y === 1 ? -7 : undefined,
                  width: 14, height: 14, background: '#fff', border: '2px solid #3DD598',
                  borderRadius: 3, zIndex: 2, pointerEvents: 'auto',
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
