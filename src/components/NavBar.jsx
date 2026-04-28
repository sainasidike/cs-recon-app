export default function NavBar({ title, onBack, rightText, onRight }) {
  return (
    <div className="nav-bar">
      {onBack ? (
        <button className="nav-back" onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      ) : (
        <div style={{ width: 36 }} />
      )}
      <div className="nav-title">{title}</div>
      {rightText ? (
        <button className="nav-action" onClick={onRight}>{rightText}</button>
      ) : (
        <div style={{ width: 36 }} />
      )}
    </div>
  );
}
