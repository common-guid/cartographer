import React, { useEffect, useState } from 'react';
import { useStore } from './store';
import { GraphVisualizer } from './components/GraphVisualizer';
import { CodeEditor } from './components/CodeEditor';
import './App.css';

const App: React.FC = () => {
  const {
    graphType,
    setGraphType,
    selectedNodeId,
    graphsData,
    filesList,
    selectedFilePath,
    error,
    showBoilerplate,
    setShowBoilerplate,
    fetchGraphs,
    fetchFilesList,
    selectNode
  } = useStore();

  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchGraphs();
    fetchFilesList();
  }, [fetchGraphs, fetchFilesList]);

  // Filtered files list based on search term
  const filteredFiles = filesList.filter((file) =>
    file.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Determine metadata for the currently selected node
  const nodeMetadata = React.useMemo(() => {
    if (!selectedNodeId || !graphsData) return null;

    if (graphType === 'module') {
      const fileData = graphsData.moduleGraph.files[selectedNodeId];
      if (fileData) {
        return {
          id: fileData.id,
          name: fileData.id.split('/').pop() || fileData.id,
          type: 'File Module',
          importsCount: fileData.imports?.length || 0,
          exportsCount: fileData.exports?.length || 0,
        };
      }
    } else {
      const node = graphsData.callGraph.nodes[selectedNodeId];
      if (node) {
        return {
          id: node.id,
          name: node.name,
          type: 'Function',
          filePath: node.file,
          lineNumber: node.line,
        };
      }
      // If external call node
      if (selectedNodeId.startsWith('external:')) {
        return {
          id: selectedNodeId,
          name: selectedNodeId.replace('external:', ''),
          type: 'External Dependency',
        };
      }
    }
    return null;
  }, [selectedNodeId, graphType, graphsData]);

  return (
    <div id="root">
      <header className="header">
        <div className="logo-section">
          <div className="logo-icon">C</div>
          <div className="logo-text">
            JS Cartographer <span>Explorer</span>
          </div>
        </div>

        <div className="controls">
          <div className="toggle-group" id="graph-type-toggle">
            <button
              className={`toggle-btn ${graphType === 'module' ? 'active' : ''}`}
              onClick={() => setGraphType('module')}
            >
              Module Graph
            </button>
            <button
              className={`toggle-btn ${graphType === 'call' ? 'active' : ''}`}
              onClick={() => setGraphType('call')}
            >
              Call Graph
            </button>
          </div>

          {graphType === 'call' && (
            <div className="toggle-group" style={{ marginLeft: '1rem' }}>
              <label 
                className="toggle-label" 
                id="hide-boilerplate-toggle"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#f3f4f6', fontSize: '0.85rem' }}
              >
                <input 
                  type="checkbox" 
                  checked={!showBoilerplate}
                  onChange={(e) => setShowBoilerplate(!e.target.checked)}
                />
                Hide Boilerplate
              </label>
            </div>
          )}
        </div>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <main className="dashboard">
        {/* Left Side: Sidebar + Canvas */}
        <div className="left-pane">
          {/* File Browser Sidebar */}
          <aside className="sidebar" id="sidebar-pane">
            <div className="sidebar-title">Deobfuscated Files</div>
            <div className="sidebar-search">
              <input
                type="text"
                placeholder="Search files..."
                className="search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <ul className="sidebar-list">
              {filteredFiles.map((file) => (
                <li
                  key={file}
                  className={`sidebar-item ${selectedFilePath === file ? 'active' : ''}`}
                  onClick={() => selectNode(file)}
                >
                  📄 {file}
                </li>
              ))}
              {filteredFiles.length === 0 && (
                <li className="sidebar-item" style={{ textAlign: 'center', opacity: 0.5 }}>
                  No files found
                </li>
              )}
            </ul>
          </aside>

          {/* Sigma.js Graph Visualizer */}
          <GraphVisualizer />

          {/* Bottom Floating Metadata Card */}
          {nodeMetadata && (
            <div className="context-panel" id="context-metadata-panel">
              <div className="context-row">
                <span className="context-label">Type</span>
                <span className="context-value" style={{ color: 'var(--accent)' }}>
                  {nodeMetadata.type}
                </span>
              </div>
              <div className="context-row">
                <span className="context-label">Name</span>
                <span className="context-value" style={{ color: 'var(--primary-hover)', fontWeight: 'bold' }}>
                  {nodeMetadata.name}
                </span>
              </div>
              {'filePath' in nodeMetadata && (
                <div className="context-row">
                  <span className="context-label">Defined In</span>
                  <span className="context-value">{nodeMetadata.filePath}:{nodeMetadata.lineNumber}</span>
                </div>
              )}
              {'importsCount' in nodeMetadata && (
                <div className="context-row">
                  <span className="context-label">Imports / Exports</span>
                  <span className="context-value">
                    {nodeMetadata.importsCount} / {nodeMetadata.exportsCount}
                  </span>
                </div>
              )}
              <div className="context-row">
                <span className="context-label">Node Identifier</span>
                <span className="context-value" style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                  {nodeMetadata.id}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Monaco Code Editor */}
        <CodeEditor />
      </main>
    </div>
  );
};

export default App;
