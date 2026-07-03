import type { Node, File } from '@babel/types';

export type NodeClassification = 'boilerplate' | 'app';

export interface ClassifiedNode {
  node: Node;              // The top-level AST node
  classification: NodeClassification;
  reason: string;          // e.g. "babel:regenerator-runtime", "app:user-function"
  nodeIndex: number;       // Position in program.body
}

export interface FilterResult {
  classifiedNodes: ClassifiedNode[];
  appNodeIndices: Set<number>;
  boilerplateNodeIndices: Set<number>;
  /**
   * Ratio of application code to total code (value between 0.0 and 1.0).
   */
  appCodeRatio: number;
  stats: FilterStats;
}

export interface FilterStats {
  totalNodes: number;
  boilerplateNodes: number;
  appNodes: number;
  /**
   * Rough approximation of characters saved divided by 4.
   */
  estimatedTokensSaved: number;
}

export type RenameMap = Map<string, string>;  // original → renamed
