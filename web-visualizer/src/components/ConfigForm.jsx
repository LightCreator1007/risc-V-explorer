import React, { useState } from 'react';

function ConfigForm({ onDataReceived, setLoading, setError, loading }) {
  const [useDefaultJson, setUseDefaultJson] = useState(true);
  const [manualOption, setManualOption] = useState('none');
  const [instrDictFile, setInstrDictFile] = useState(null);
  const [adocFiles, setAdocFiles] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const formData = new FormData();
    formData.append('useDefaultJson', useDefaultJson);
    formData.append('manualOption', manualOption);
    
    if (!useDefaultJson && instrDictFile) {
      formData.append('instrDict', instrDictFile);
    }
    
    if (manualOption === 'upload' && adocFiles) {
      for (let i = 0; i < adocFiles.length; i++) {
        formData.append('asciidocs', adocFiles[i]);
        formData.append('asciidocPaths', adocFiles[i].webkitRelativePath || adocFiles[i].name);
      }
    }

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Server error');
      onDataReceived(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card config-section">
      <h2>Configuration</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="label-main">Instruction Dictionary</label>
          <div className="radio-group">
            <label className="radio-label">
              <input type="radio" checked={useDefaultJson} onChange={() => setUseDefaultJson(true)} />
              Use Default
            </label>
            <label className="radio-label">
              <input type="radio" checked={!useDefaultJson} onChange={() => setUseDefaultJson(false)} />
              Upload Custom
            </label>
          </div>
          {!useDefaultJson && (
            <input type="file" accept=".json" onChange={(e) => setInstrDictFile(e.target.files[0])} required />
          )}
        </div>

        <div className="form-group">
          <label className="label-main">ISA Manual Cross-Reference</label>
          <select value={manualOption} onChange={(e) => setManualOption(e.target.value)} className="select-input">
            <option value="none">Skip Cross-Reference</option>
            <option value="clone">Clone from GitHub</option>
            <option value="upload">Upload AsciiDocs (.adoc)</option>
          </select>
          {manualOption === 'upload' && (
            <input type="file" webkitdirectory="true" directory="true" multiple onChange={(e) => setAdocFiles(e.target.files)} required className="file-input" />
          )}
        </div>

        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Analyzing...' : 'Analyze'}
        </button>
      </form>
    </section>
  );
}

export default ConfigForm;
