declare module 'react-native-syntax-highlighter' {
  import type { ComponentType } from 'react';
  import type { ViewProps } from 'react-native';

  export type SyntaxHighlighterProps = {
    language?: string;
    highlighter?: 'prism' | 'highlightjs';
    style?: Record<string, unknown>;
    fontSize?: number;
    fontFamily?: string;
    PreTag?: ComponentType<ViewProps> | string;
    CodeTag?: ComponentType<ViewProps> | string;
    children: string;
  };

  const SyntaxHighlighter: ComponentType<SyntaxHighlighterProps>;
  export default SyntaxHighlighter;
}

declare module 'react-syntax-highlighter/dist/esm/styles/prism/one-dark' {
  const style: Record<string, unknown>;
  export const oneDark: typeof style;
  export default style;
}

declare module 'react-syntax-highlighter/dist/esm/styles/prism/one-light' {
  const style: Record<string, unknown>;
  export const oneLight: typeof style;
  export default style;
}
