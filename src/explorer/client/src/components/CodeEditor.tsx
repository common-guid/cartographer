import React, { useEffect, useRef } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { useStore } from '../store';

export const CodeEditor: React.FC = () => {
  const { fileContent, selectedFilePath, selectedLineNumber } = useStore();
  const editorRef = useRef<any>(null);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };

  useEffect(() => {
    if (editorRef.current && selectedLineNumber) {
      // Small timeout to ensure the content is fully loaded and layout is calculated
      const timer = setTimeout(() => {
        editorRef.current.revealLineInCenter(selectedLineNumber);
        editorRef.current.setPosition({ lineNumber: selectedLineNumber, column: 1 });
        editorRef.current.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [selectedLineNumber, fileContent]);

  if (!selectedFilePath) {
    return (
      <div className="no-selection">
        <div className="no-selection-icon">📄</div>
        <h3>No File Selected</h3>
        <p>Select a node in the graph visualizer or double-click a file in the sidebar to inspect its source code.</p>
      </div>
    );
  }

  return (
    <div className="right-pane">
      <div className="editor-header">
        <span className="editor-filename">
          📁 {selectedFilePath}
          {selectedLineNumber && <span style={{ color: 'var(--accent)' }}>: line {selectedLineNumber}</span>}
        </span>
      </div>
      <div className="editor-container" id="monaco-editor-pane">
        <MonacoEditor
          height="100%"
          language="javascript"
          theme="vs-dark"
          value={fileContent || ''}
          options={{
            readOnly: true,
            minimap: { enabled: true },
            fontSize: 14,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            fontFamily: 'Fira Code, JetBrains Mono, Courier New, monospace',
          }}
          onMount={handleEditorDidMount}
        />
      </div>
    </div>
  );
};
