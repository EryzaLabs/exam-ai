import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Linking,
  TextStyle,
  StyleProp,
} from 'react-native';
import { useTheme } from '@/context/theme-context';

export interface MarkdownTextProps {
  content: string;
  role?: 'user' | 'assistant' | 'system';
  baseStyle?: StyleProp<TextStyle>;
}

interface InlineToken {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  strikethrough?: boolean;
  link?: boolean;
  url?: string;
}

type Block =
  | { type: 'heading'; level: number; text: string }
  | { type: 'code'; language?: string; code: string }
  | { type: 'quote'; text: string }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'number'; number: string; text: string; indent: number }
  | { type: 'bullet'; text: string; indent: number }
  | { type: 'hr' }
  | { type: 'paragraph'; text: string };

const INLINE_REGEX = /(\*\*\*[^*]+?\*\*\*|\*\*[^*]+?\*\*|\*[^*]+?\*|`[^`]+?`|~~[^~]+?~~|\[[^\]]+\]\([^)]+\))/g;

function parseInlineTokens(text: string): InlineToken[] {
  if (!text) return [];
  const parts = text.split(INLINE_REGEX);
  const tokens: InlineToken[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;

    if (part.startsWith('***') && part.endsWith('***') && part.length >= 6) {
      tokens.push({ text: part.slice(3, -3), bold: true, italic: true });
    } else if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      tokens.push({ text: part.slice(2, -2), bold: true });
    } else if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      tokens.push({ text: part.slice(1, -1), italic: true });
    } else if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      tokens.push({ text: part.slice(1, -1), code: true });
    } else if (part.startsWith('~~') && part.endsWith('~~') && part.length >= 4) {
      tokens.push({ text: part.slice(2, -2), strikethrough: true });
    } else if (part.startsWith('[') && part.endsWith(')')) {
      const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        tokens.push({
          text: linkMatch[1].replace(/\*\*/g, '').replace(/\*/g, ''),
          url: linkMatch[2],
          link: true,
        });
      } else {
        tokens.push({ text: part });
      }
    } else {
      tokens.push({ text: part });
    }
  }

  return tokens;
}

function parseBlocks(markdown: string): Block[] {
  if (!markdown) return [];
  const lines = markdown.split(/\r?\n/);
  const blocks: Block[] = [];

  let currentParagraph: string[] = [];
  let inCodeBlock = false;
  let codeLang = '';
  let codeLines: string[] = [];
  let inTable = false;
  let tableLines: string[] = [];

  function flushParagraph() {
    if (currentParagraph.length > 0) {
      blocks.push({
        type: 'paragraph',
        text: currentParagraph.join('\n'),
      });
      currentParagraph = [];
    }
  }

  function flushCode() {
    if (inCodeBlock) {
      blocks.push({
        type: 'code',
        language: codeLang,
        code: codeLines.join('\n'),
      });
      inCodeBlock = false;
      codeLang = '';
      codeLines = [];
    }
  }

  function flushTable() {
    if (inTable && tableLines.length > 0) {
      const rows = tableLines.map((line) =>
        line
          .trim()
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          .split('|')
          .map((cell) => cell.trim())
      );
      const cleanRows = rows.filter((row) => !row.every((cell) => /^:?-+:?$/.test(cell)));
      if (cleanRows.length > 0) {
        blocks.push({
          type: 'table',
          headers: cleanRows[0],
          rows: cleanRows.slice(1),
        });
      }
      inTable = false;
      tableLines = [];
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Check code fence
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        flushCode();
      } else {
        flushParagraph();
        flushTable();
        inCodeBlock = true;
        codeLang = trimmed.slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(rawLine);
      continue;
    }

    // Check table row
    if (/^\|.+\|$/.test(trimmed)) {
      flushParagraph();
      inTable = true;
      tableLines.push(trimmed);
      continue;
    } else if (inTable) {
      flushTable();
    }

    // Blank line
    if (trimmed === '') {
      flushParagraph();
      continue;
    }

    // Horizontal rule: ---, ***, ___
    if (/^(\-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flushParagraph();
      blocks.push({ type: 'hr' });
      continue;
    }

    // Headings: #, ##, ###, ####, #####, ######
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        text: headingMatch[2].trim(),
      });
      continue;
    }

    // Blockquote: >
    const quoteMatch = trimmed.match(/^>\s?(.*)$/);
    if (quoteMatch) {
      flushParagraph();
      blocks.push({
        type: 'quote',
        text: quoteMatch[1],
      });
      continue;
    }

    // Numbered list item: e.g. 1. or 2)
    const numberMatch = rawLine.match(/^(\s*)(\d+)[\.\)]\s+(.+)$/);
    if (numberMatch) {
      flushParagraph();
      const indent = Math.floor(numberMatch[1].length / 2);
      blocks.push({
        type: 'number',
        number: numberMatch[2] + '.',
        text: numberMatch[3].trim(),
        indent,
      });
      continue;
    }

    // Bullet list item: e.g. - or * or •
    const bulletMatch = rawLine.match(/^(\s*)[-*•]\s+(.+)$/);
    if (bulletMatch) {
      flushParagraph();
      const indent = Math.floor(bulletMatch[1].length / 2);
      blocks.push({
        type: 'bullet',
        text: bulletMatch[2].trim(),
        indent,
      });
      continue;
    }

    // Indented continuation of bullet or number
    if (rawLine.startsWith('  ') && blocks.length > 0) {
      const lastBlock = blocks[blocks.length - 1];
      if (lastBlock.type === 'bullet' || lastBlock.type === 'number') {
        lastBlock.text += '\n' + trimmed;
        continue;
      }
    }

    // Regular line in paragraph
    currentParagraph.push(rawLine);
  }

  flushParagraph();
  flushCode();
  flushTable();

  return blocks;
}

export default function MarkdownText({ content, role = 'assistant', baseStyle }: MarkdownTextProps) {
  const { isDark, colors } = useTheme();
  const isUser = role === 'user';

  const defaultTextColor = isUser ? '#FFFFFF' : isDark ? colors.textPrimary : '#334155';
  const boldColor = isUser ? '#FFFFFF' : isDark ? '#FFFFFF' : '#0F172A';
  const headingColor = isUser ? '#FFFFFF' : isDark ? '#FFFFFF' : '#0F172A';
  const accentColor = isUser ? '#E0E7FF' : isDark ? '#818CF8' : '#6366F1';
  const inlineCodeBg = isUser
    ? 'rgba(255, 255, 255, 0.2)'
    : isDark
    ? '#334155'
    : '#F1F5F9';
  const inlineCodeColor = isUser ? '#FFFFFF' : isDark ? '#93C5FD' : '#2563EB';
  const quoteBg = isUser ? 'rgba(255,255,255,0.1)' : isDark ? '#1E293B' : '#F8FAFC';
  const borderColor = isUser ? 'rgba(255,255,255,0.2)' : isDark ? '#334155' : '#E2E8F0';

  const renderInline = (text: string) => {
    const tokens = parseInlineTokens(text);

    return tokens.map((token, index) => {
      if (token.code) {
        return (
          <Text
            key={index}
            style={[
              styles.inlineCode,
              {
                backgroundColor: inlineCodeBg,
                color: inlineCodeColor,
              },
            ]}
          >
            {` ${token.text} `}
          </Text>
        );
      }

      if (token.link && token.url) {
        return (
          <Text
            key={index}
            style={[styles.link, { color: accentColor }]}
            onPress={() => token.url && Linking.openURL(token.url).catch(() => {})}
          >
            {token.text}
          </Text>
        );
      }

      const inlineStyles: TextStyle[] = [];
      if (token.bold) {
        inlineStyles.push(styles.boldText, { color: boldColor });
      }
      if (token.italic) {
        inlineStyles.push(styles.italicText);
      }
      if (token.strikethrough) {
        inlineStyles.push(styles.strikeText);
      }

      return (
        <Text key={index} style={inlineStyles}>
          {token.text}
        </Text>
      );
    });
  };

  const blocks = parseBlocks(content);

  return (
    <View style={styles.container}>
      {blocks.map((block, index) => {
        const isFirst = index === 0;
        const isLast = index === blocks.length - 1;

        switch (block.type) {
          case 'heading': {
            const headingStyles = [
              styles.headingBase,
              { color: headingColor },
              block.level === 1 && styles.h1,
              block.level === 2 && styles.h2,
              block.level === 3 && styles.h3,
              block.level >= 4 && styles.h4,
              isFirst && styles.firstHeading,
            ];
            return (
              <Text key={index} style={headingStyles}>
                {renderInline(block.text)}
              </Text>
            );
          }

          case 'number': {
            return (
              <View
                key={index}
                style={[
                  styles.listRow,
                  block.indent > 0 && { marginLeft: block.indent * 16 },
                  isLast && styles.lastBlock,
                ]}
              >
                <View style={styles.numberCol}>
                  <Text style={[styles.numberText, { color: accentColor }]}>
                    {block.number}
                  </Text>
                </View>
                <View style={styles.listTextCol}>
                  <Text style={[styles.bodyText, { color: defaultTextColor }, baseStyle]}>
                    {renderInline(block.text)}
                  </Text>
                </View>
              </View>
            );
          }

          case 'bullet': {
            return (
              <View
                key={index}
                style={[
                  styles.listRow,
                  block.indent > 0 && { marginLeft: block.indent * 16 },
                  isLast && styles.lastBlock,
                ]}
              >
                <View style={styles.bulletCol}>
                  <View style={[styles.bulletDot, { backgroundColor: accentColor }]} />
                </View>
                <View style={styles.listTextCol}>
                  <Text style={[styles.bodyText, { color: defaultTextColor }, baseStyle]}>
                    {renderInline(block.text)}
                  </Text>
                </View>
              </View>
            );
          }

          case 'quote': {
            return (
              <View
                key={index}
                style={[
                  styles.quoteBox,
                  { borderLeftColor: accentColor, backgroundColor: quoteBg },
                  isLast && styles.lastBlock,
                ]}
              >
                <Text style={[styles.quoteText, { color: defaultTextColor }]}>
                  {renderInline(block.text)}
                </Text>
              </View>
            );
          }

          case 'code': {
            return (
              <View
                key={index}
                style={[
                  styles.codeBlock,
                  { backgroundColor: isDark ? '#020617' : '#0F172A' },
                  isLast && styles.lastBlock,
                ]}
              >
                {block.language ? (
                  <View style={styles.codeHeader}>
                    <Text style={styles.codeLang}>{block.language}</Text>
                  </View>
                ) : null}
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <Text style={styles.codeText} selectable>
                    {block.code}
                  </Text>
                </ScrollView>
              </View>
            );
          }

          case 'table': {
            return (
              <ScrollView
                key={index}
                horizontal
                showsHorizontalScrollIndicator={true}
                style={[styles.tableScroll, isLast && styles.lastBlock]}
              >
                <View style={[styles.tableContainer, { borderColor }]}>
                  <View style={[styles.tableRow, styles.tableHeaderRow, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                    {block.headers.map((h, hi) => (
                      <View key={hi} style={[styles.tableCell, { borderColor }]}>
                        <Text style={[styles.tableHeaderText, { color: boldColor }]}>
                          {renderInline(h)}
                        </Text>
                      </View>
                    ))}
                  </View>
                  {block.rows.map((row, ri) => (
                    <View
                      key={ri}
                      style={[
                        styles.tableRow,
                        ri % 2 === 1 && { backgroundColor: isDark ? '#0F172A' : '#FAFAFA' },
                      ]}
                    >
                      {row.map((cell, ci) => (
                        <View key={ci} style={[styles.tableCell, { borderColor }]}>
                          <Text style={[styles.tableCellText, { color: defaultTextColor }]}>
                            {renderInline(cell)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              </ScrollView>
            );
          }

          case 'hr': {
            return <View key={index} style={[styles.hr, { backgroundColor: borderColor }]} />;
          }

          case 'paragraph':
          default: {
            return (
              <Text
                key={index}
                style={[
                  styles.bodyText,
                  { color: defaultTextColor },
                  baseStyle,
                  isLast && styles.lastBlock,
                ]}
              >
                {renderInline(block.text)}
              </Text>
            );
          }
        }
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  bodyText: {
    fontSize: 15,
    lineHeight: 23,
    marginBottom: 8,
  },
  boldText: {
    fontWeight: '700',
  },
  italicText: {
    fontStyle: 'italic',
  },
  strikeText: {
    textDecorationLine: 'line-through',
  },
  link: {
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  inlineCode: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 13,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  headingBase: {
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 6,
  },
  firstHeading: {
    marginTop: 0,
  },
  h1: {
    fontSize: 20,
    lineHeight: 26,
  },
  h2: {
    fontSize: 18,
    lineHeight: 24,
  },
  h3: {
    fontSize: 16,
    lineHeight: 22,
  },
  h4: {
    fontSize: 15,
    lineHeight: 21,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  numberCol: {
    minWidth: 24,
    paddingTop: 1,
  },
  numberText: {
    fontWeight: '700',
    fontSize: 14,
    lineHeight: 22,
  },
  bulletCol: {
    width: 16,
    paddingTop: 8,
    alignItems: 'flex-start',
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  listTextCol: {
    flex: 1,
  },
  quoteBox: {
    borderLeftWidth: 3.5,
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginVertical: 6,
  },
  quoteText: {
    fontSize: 14.5,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  codeBlock: {
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
  },
  codeHeader: {
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingBottom: 4,
  },
  codeLang: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  codeText: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 13,
    lineHeight: 19,
    color: '#E2E8F0',
  },
  tableScroll: {
    marginVertical: 8,
  },
  tableContainer: {
    borderWidth: 1,
    borderRadius: 6,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableHeaderRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tableCell: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRightWidth: 1,
    minWidth: 80,
  },
  tableHeaderText: {
    fontSize: 13,
    fontWeight: '700',
  },
  tableCellText: {
    fontSize: 13,
    lineHeight: 18,
  },
  hr: {
    height: 1,
    marginVertical: 10,
  },
  lastBlock: {
    marginBottom: 0,
  },
});
