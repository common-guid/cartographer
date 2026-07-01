export interface SanitizerConfig {
  enabled: boolean;
  useHeuristicNaming: boolean;
}

export interface TransformationResult {
  code: string;
  map?: any; 
}

export interface CodeTransformer {
  name: string;
  transform(code: string, filepath: string): Promise<TransformationResult>;
}
