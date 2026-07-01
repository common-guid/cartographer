import { create } from 'zustand';

export interface FunctionNode {
  id: string;
  file: string;
  name: string;
  line: number;
}

export interface CallEdge {
  from: string;
  to: string;
  type: 'internal' | 'external';
}

export interface CallGraphData {
  nodes: Record<string, FunctionNode>;
  edges: CallEdge[];
}

export interface ModuleNode {
  id: string;
  imports: string[];
  exports: string[];
}

export interface ModuleGraph {
  files: Record<string, ModuleNode>;
  entryPoint?: string;
}

export interface ApiSurface {
  baseUrl: string;
  endpoints: {
    method: string;
    urlPattern: string;
  }[];
}

interface ExplorerState {
  graphType: 'module' | 'call';
  selectedNodeId: string | null;
  graphsData: {
    moduleGraph: ModuleGraph;
    callGraph: CallGraphData;
    apiSurface: ApiSurface;
  } | null;
  filesList: string[];
  fileContent: string | null;
  selectedFilePath: string | null;
  selectedLineNumber: number | null;
  loading: boolean;
  error: string | null;

  setGraphType: (type: 'module' | 'call') => void;
  selectNode: (nodeId: string | null) => Promise<void>;
  fetchGraphs: () => Promise<void>;
  fetchFilesList: () => Promise<void>;
  fetchFile: (filePath: string) => Promise<void>;
}

export const useStore = create<ExplorerState>((set, get) => ({
  graphType: 'module',
  selectedNodeId: null,
  graphsData: null,
  filesList: [],
  fileContent: null,
  selectedFilePath: null,
  selectedLineNumber: null,
  loading: false,
  error: null,

  setGraphType: (graphType) => {
    set({ graphType, selectedNodeId: null, fileContent: null, selectedFilePath: null, selectedLineNumber: null });
  },

  selectNode: async (nodeId) => {
    if (!nodeId) {
      set({ selectedNodeId: null, fileContent: null, selectedFilePath: null, selectedLineNumber: null });
      return;
    }

    set({ selectedNodeId: nodeId });

    const state = get();
    let filePath: string | null = null;
    let lineNumber: number | null = null;

    if (state.graphType === 'module') {
      filePath = nodeId;
    } else if (state.graphType === 'call' && state.graphsData?.callGraph) {
      const node = state.graphsData.callGraph.nodes[nodeId];
      if (node) {
        filePath = node.file;
        lineNumber = node.line;
      }
    }

    if (filePath) {
      set({ selectedFilePath: filePath, selectedLineNumber: lineNumber });
      await state.fetchFile(filePath);
    }
  },

  fetchGraphs: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch('/api/graphs');
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      set({ graphsData: data, loading: false });
    } catch (err: any) {
      set({ error: `Failed to fetch graph data: ${err.message}`, loading: false });
    }
  },

  fetchFilesList: async () => {
    try {
      const res = await fetch('/api/files');
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      set({ filesList: data });
    } catch (err: any) {
      console.error('Failed to fetch files list:', err);
    }
  },

  fetchFile: async (filePath) => {
    try {
      const res = await fetch(`/api/file?path=${encodeURIComponent(filePath)}`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const content = await res.text();
      set({ fileContent: content });
    } catch (err: any) {
      console.error(`Failed to fetch file ${filePath}:`, err);
      set({ fileContent: `// Failed to load file: ${filePath}\n// Error: ${err.message}` });
    }
  }
}));
