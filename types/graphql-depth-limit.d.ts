declare module 'graphql-depth-limit' {
  import { ValidationRule } from 'graphql';

  export default function depthLimit(
    depthLimit: number,
    options?: {
      ignore?: (string | RegExp | ((queryDepths: Record<string, number>) => boolean))[];
    },
    callback?: (depths: Record<string, number>) => void
  ): ValidationRule;
}
