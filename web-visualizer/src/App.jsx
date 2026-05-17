import React, { useState, useEffect } from 'react';
import mermaid from 'mermaid';
import './index.css';

import ConfigForm from './components/ConfigForm';
import SummarySection from './components/SummarySection';
import CrossRefSection from './components/CrossRefSection';
import TextGraphSection from './components/TextGraphSection';
import MermaidGraphSection from './components/MermaidGraphSection';

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    mermaid.initialize({ 
      startOnLoad: false, 
      theme: 'base',
      themeVariables: {
        primaryColor: '#2a2a2a',
        primaryTextColor: '#ffffff',
        primaryBorderColor: '#aaaaaa',
        lineColor: '#ffffff',
        secondaryColor: '#333333',
        tertiaryColor: '#1e1e1e',
        nodeBorder: '#aaaaaa',
        clusterBkg: '#1e1e1e',
        clusterBorder: '#aaaaaa',
      }
    });
  }, []);

  return (
    <div className="container">
      <header>
        <h1>RISC-V Explorer</h1>
        <p className="subtitle">Visualize instruction dictionaries and cross-references</p>
      </header>

      <ConfigForm 
        onDataReceived={setData} 
        setLoading={setLoading} 
        setError={setError} 
        loading={loading} 
      />
      
      {error && <div className="error">{error}</div>}

      {data && (
        <div className="results">
          <SummarySection data={data} />
          {data.crossRefResult && <CrossRefSection crossRefResult={data.crossRefResult} />}
          <TextGraphSection textGraph={data.textGraph} />
          {data.mermaidGraph && <MermaidGraphSection mermaidGraph={data.mermaidGraph} />}
        </div>
      )}
    </div>
  );
}

export default App;
