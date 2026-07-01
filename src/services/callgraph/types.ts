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
