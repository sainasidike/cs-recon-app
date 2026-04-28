import { SCENARIOS } from '../utils/scenarios';
import NavBar from '../components/NavBar';

export default function ScenarioPage({ onSelect }) {
  return (
    <div className="cs-mobile-frame">
      <NavBar title="智能对账" />
      <div className="page">
        <p className="page-desc" style={{ textAlign: 'center', marginTop: 4 }}>
          请选择对账场景
        </p>
        <div className="scenario-grid">
          {SCENARIOS.map(s => (
            <div key={s.id} className="scenario-card" onClick={() => onSelect(s.id)}>
              <div className="scenario-icon">{s.icon}</div>
              <div className="scenario-info">
                <div className="scenario-name">{s.name}</div>
                <div className="scenario-desc">{s.desc}</div>
              </div>
              <div className="scenario-arrow">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
