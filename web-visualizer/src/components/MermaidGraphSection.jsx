import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { copyToClipboard, downloadText, downloadImage } from '../utils.js';

function MermaidGraphSection({ mermaidGraph }) {
  const mermaidRef = useRef(null);

  useEffect(() => {
    if (mermaidGraph && mermaidRef.current) {
      mermaidRef.current.innerHTML = '';
      mermaid.render('mermaid-graph-svg', mermaidGraph).then(result => {
        if (mermaidRef.current) mermaidRef.current.innerHTML = result.svg;
      }).catch(err => {
        console.error('Mermaid render error:', err);
      });
    }
  }, [mermaidGraph]);

  return (
    <section className="card mermaid-section">
      <div className="card-header">
        <h2>Shared Instruction Network</h2>
        <div className="actions">
          <button onClick={() => copyToClipboard(mermaidGraph)}>Copy Source</button>
          <button onClick={() => downloadText('graph.mmd', mermaidGraph)}>Download Source</button>
          <button onClick={() => downloadImage('png', mermaidRef.current?.querySelector('svg'))}>Download PNG</button>
          <button onClick={() => downloadImage('jpeg', mermaidRef.current?.querySelector('svg'))}>Download JPEG</button>
        </div>
      </div>
      <div className="mermaid-container">
        <TransformWrapper
          initialScale={1}
          minScale={0.1}
          maxScale={10}
          centerOnInit={true}
          wheel={{ step: 0.1 }}
        >
          {({ zoomIn, zoomOut, resetTransform }) => (
            <React.Fragment>
              <div className="zoom-controls actions" style={{ marginBottom: '10px', justifyContent: 'center' }}>
                <button onClick={() => zoomIn()}>Zoom In (+)</button>
                <button onClick={() => zoomOut()}>Zoom Out (-)</button>
                <button onClick={() => resetTransform()}>Reset</button>
              </div>
              <div className="scrollable-panel zoomable-panel">
                <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }}>
                  <div ref={mermaidRef} className="mermaid-content"></div>
                </TransformComponent>
              </div>
            </React.Fragment>
          )}
        </TransformWrapper>
      </div>
    </section>
  );
}

export default MermaidGraphSection;
