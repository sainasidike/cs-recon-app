import React from 'react';
import ReactDOM from 'react-dom/client';
import ReconApp from './ReconApp';
import './recon.css';

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('REACT_ERROR:', error.message, error.stack); }
  render() {
    if (this.state.error) return <pre style={{padding:20,color:'red',fontSize:12}}>{this.state.error.message}{'\n'}{this.state.error.stack}</pre>;
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ReconApp />
    </ErrorBoundary>
  </React.StrictMode>
);
