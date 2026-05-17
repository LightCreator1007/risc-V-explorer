export const copyToClipboard = (text) => {
  navigator.clipboard.writeText(text);
  alert('Copied to clipboard!');
};

export const downloadText = (filename, text) => {
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export const downloadImage = (format, svgNode) => {
  if (!svgNode) return;
  if (!svgNode.getAttribute('xmlns')) {
    svgNode.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  }

  const svgData = new XMLSerializer().serializeToString(svgNode);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const img = new Image();

  const rect = svgNode.getBoundingClientRect();
  const width = rect.width || 800;
  const height = rect.height || 600;
  
  const scale = 3;
  canvas.width = width * scale;
  canvas.height = height * scale;

  img.onload = () => {
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    
    try {
      const imgUrl = canvas.toDataURL(`image/${format}`, 1.0);
      const a = document.createElement('a');
      a.href = imgUrl;
      a.download = `mermaid-graph.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Canvas export error:', err);
      alert('Failed to download image. The graph might contain external resources.');
    }
  };
  
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgData);
};
