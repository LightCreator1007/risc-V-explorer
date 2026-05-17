import React from 'react';
import { copyToClipboard, downloadText } from '../utils.js';

function TextGraphSection({ textGraph }) {
  return (
    <section className="card graph-section">
      <div className="card-header">
        <h2>Shared Instruction Text Graph</h2>
        <div className="actions">
          <button onClick={() => copyToClipboard(textGraph.join('\n'))}>Copy</button>
          <button onClick={() => downloadText('graph.txt', textGraph.join('\n'))}>Download</button>
        </div>
      </div>
      <div className="scrollable-panel">
        <pre>{textGraph.join('\n')}</pre>
      </div>
    </section>
  );
}

export default TextGraphSection;
