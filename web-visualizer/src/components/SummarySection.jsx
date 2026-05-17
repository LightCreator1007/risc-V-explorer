import React from 'react';
import { copyToClipboard, downloadText } from '../utils.js';

function SummarySection({ data }) {
  return (
    <section className="card summary-section">
      <div className="card-header">
        <h2>Summary</h2>
        <div className="actions">
          <button onClick={() => copyToClipboard(data.summaryTable.join('\n'))}>Copy</button>
          <button onClick={() => downloadText('summary.txt', data.summaryTable.join('\n'))}>Download</button>
        </div>
      </div>
      <div className="stats-grid">
        <div className="stat-box">
          <span className="stat-value">{data.totalInstructions}</span>
          <span className="stat-label">Instructions</span>
        </div>
        <div className="stat-box">
          <span className="stat-value">{data.totalExtensions}</span>
          <span className="stat-label">Extensions</span>
        </div>
      </div>
      
      <h3 className="section-subtitle">Extension Summary Table</h3>
      <div className="scrollable-panel">
        <pre>{data.summaryTable.join('\n')}</pre>
      </div>
    </section>
  );
}

export default SummarySection;
