export const STRUCTURAL_RULES: string[] = [
  'un-async-await',
  'un-jsx',
  'un-es6-class',
  'un-optional-chaining',
  'un-nullish-coalescing',
  'un-template-literals',
  'un-sequence-expression',
  'un-variable-merging',
  'un-curly-braces',
  'un-flip-comparisons',
];

export const HEURISTIC_RULES: string[] = [
  'un-undefined',       // void 0 -> undefined
  'un-infinity',        // 1/0 -> Infinity
  'un-numeric-literal', // 0x123 -> 291 (Normalizes numbers)
  'smart-rename'        // Renames variables based on DOM/Node usage
];
