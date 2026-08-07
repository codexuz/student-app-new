import Markdown, { type ASTNode, type RenderRules } from 'react-native-markdown-display';
import SyntaxHighlighter from 'react-native-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism/one-dark';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism/one-light';
import { Platform, StyleSheet } from 'react-native';

import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { useColorScheme } from '@/hooks/useColorScheme';
import { BORDER_RADIUS, FONT_SIZE, SPACING } from '@/theme/globals';

const CODE_FONT = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

/** Renders a fenced code block (```lang) with Prism syntax highlighting. */
function CodeFence({ node, cardColor }: { node: ASTNode; cardColor: string }) {
  const theme = useColorScheme() ?? 'light';
  // markdown-it fence tokens carry the info string (language) on `.info`,
  // but react-native-markdown-display's ASTNode type omits it.
  const info = (node as ASTNode & { info?: string }).info;
  const language = info?.trim().split(/\s+/)[0] || undefined;
  let content = node.content;
  if (content.endsWith('\n')) content = content.slice(0, -1);

  return (
    <View style={[styles.codeBlock, { backgroundColor: cardColor }]}>
      <SyntaxHighlighter
        language={language}
        highlighter='prism'
        style={theme === 'dark' ? oneDark : oneLight}
        fontSize={13}
        fontFamily={CODE_FONT}
        PreTag={View}
        CodeTag={View}
      >
        {content}
      </SyntaxHighlighter>
    </View>
  );
}

/**
 * Renders assistant/user message text as markdown (bold, lists, links,
 * headings, tables, etc.), with fenced code blocks syntax-highlighted via
 * Prism. See https://www.assistant-ui.com/docs/ui/markdown and
 * .../docs/ui/syntax-highlighting — those docs target the React (DOM) build
 * of assistant-ui, which relies on react-markdown + shiki. Neither runs on
 * React Native, so this uses the RN-native equivalents instead:
 * react-native-markdown-display for the markdown AST/rendering and
 * react-native-syntax-highlighter (Prism-based) for code fences.
 */
export function MarkdownMessage({ content, textColor }: { content: string; textColor?: string }) {
  const foreground = useColor('foreground');
  const primary = useColor('primary');
  const card = useColor('background');
  const border = useColor('border');
  const resolvedTextColor = textColor ?? foreground;

  const rules: RenderRules = {
    fence: (node) => <CodeFence key={node.key} node={node} cardColor={card} />,
    code_block: (node) => <CodeFence key={node.key} node={node} cardColor={card} />,
  };

  return (
    <Markdown
      rules={rules}
      style={{
        body: { color: resolvedTextColor, fontSize: FONT_SIZE },
        paragraph: { marginTop: 0, marginBottom: SPACING.xs },
        heading1: { color: resolvedTextColor, fontSize: 22, fontWeight: '700', marginBottom: SPACING.xs },
        heading2: { color: resolvedTextColor, fontSize: 19, fontWeight: '700', marginBottom: SPACING.xs },
        heading3: { color: resolvedTextColor, fontSize: 17, fontWeight: '600', marginBottom: SPACING.xs },
        strong: { fontWeight: '700' },
        em: { fontStyle: 'italic' },
        link: { color: primary, textDecorationLine: 'underline' },
        blockquote: {
          borderLeftWidth: 3,
          borderLeftColor: border,
          paddingLeft: SPACING.sm,
          marginLeft: 0,
          opacity: 0.85,
        },
        bullet_list: { marginBottom: SPACING.xs },
        ordered_list: { marginBottom: SPACING.xs },
        list_item: { flexDirection: 'row' },
        code_inline: {
          backgroundColor: card,
          color: resolvedTextColor,
          fontFamily: CODE_FONT,
          fontSize: 14,
          paddingHorizontal: 4,
          borderRadius: 4,
        },
        hr: { backgroundColor: border, height: StyleSheet.hairlineWidth, marginVertical: SPACING.sm },
        table: { borderColor: border, borderWidth: StyleSheet.hairlineWidth, borderRadius: 6 },
        th: { padding: SPACING.xs, color: resolvedTextColor, fontWeight: '600' },
        td: { padding: SPACING.xs, color: resolvedTextColor, borderColor: border },
      }}
    >
      {content}
    </Markdown>
  );
}

const styles = StyleSheet.create({
  codeBlock: {
    borderRadius: BORDER_RADIUS / 2,
    padding: SPACING.sm,
    marginBottom: SPACING.xs,
    overflow: 'hidden',
  },
});
