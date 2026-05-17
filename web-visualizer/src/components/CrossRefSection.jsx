import React from 'react';

function CrossRefSection({ crossRefResult }) {
  if (!crossRefResult) return null;
  return (
    <section className="card crossref-section">
      <h2>Cross-Reference Results</h2>
      <div className="stats-grid">
        <div className="stat-box"><span className="stat-value">{crossRefResult.matched.length}</span><span className="stat-label">Matched</span></div>
        <div className="stat-box"><span className="stat-value">{crossRefResult.jsonOnly.length}</span><span className="stat-label">JSON Only</span></div>
        <div className="stat-box"><span className="stat-value">{crossRefResult.manualOnly.length}</span><span className="stat-label">Manual Only</span></div>
        <div className="stat-box"><span className="stat-value">{crossRefResult.compoundMatched.length}</span><span className="stat-label">Compound</span></div>
        <div className="stat-box"><span className="stat-value">{crossRefResult.prefixMatched.length}</span><span className="stat-label">Prefix</span></div>
      </div>
    </section>
  );
}

export default CrossRefSection;
