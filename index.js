import { SKIP, visitParents } from 'unist-util-visit-parents';

const DEFAULT_IGNORE_TAGS = [
  'script',
  'style',
  'noscript',
  'code',
  'pre',
  'kbd',
  'samp',
];

// Elements whose text content cannot hold markup (or is not HTML at all).
// Wrapping there would leak literal tags into the rendered output, so they are
// skipped regardless of the `ignoreTags` option.
const HARD_IGNORE_TAGS = new Set([
  'script',
  'style',
  'textarea',
  'title',
  'option',
  'svg',
  'math',
]);

const PUNCTUATION_REGEX = /\p{P}/u;
const LATIN_LETTER_REGEX = /\p{Script=Latin}/u;
const WHITESPACE_REGEX = /\s/u;
const SYMBOL_REGEX = /\p{S}/u;
const EXCLUDED_PUNCTUATION = new Set([
  '-',
  '–',
  '—',
  '•',
  '%',
  '％',
  '﹪',
  '‰',
  '‱',
]);
const OPENING_SINGLE_QUOTE = '‘';
const CLOSING_SINGLE_QUOTE = '’';
const ENGLISH_IN_WORD_APOSTROPHES = new Set(["'", CLOSING_SINGLE_QUOTE]);
// Marks that only ever appear doubled in Han typography. The doubled form is
// one token; a lone occurrence keeps whatever the general rules decide.
const DOUBLED_MARKS = new Set(['—', '…', '⋯']);
const LEFT_COMPRESSION_MARKS = new Set([
  '“',
  '‘',
  '《',
  '〈',
  '「',
  '『',
  '（',
  '【',
  '〔',
  '〖',
  '［',
  '｛',
]);
const RIGHT_COMPRESSION_MARKS = new Set([
  '”',
  '’',
  '》',
  '〉',
  '」',
  '』',
  '）',
  '】',
  '〕',
  '〗',
  '］',
  '｝',
]);
const ADJACENCY_TARGET_MARKS = new Set([
  '，',
  '。',
  '？',
  '！',
  '；',
  '：',
  '、',
]);
const ADJ_LEFT_CLASS = 'adj-l';
const ADJ_RIGHT_CLASS = 'adj-r';
const ADJ_MIDDLE_CLASS = 'adj-m';

function isHalfWidthAsciiPunctuation(ch) {
  return Boolean(ch) && ch.charCodeAt(0) <= 0x7f;
}

// Full-width symbol forms such as ～＋＝＜＞｜＄￥ live in Unicode's
// Halfwidth and Fullwidth Forms block but are categorized as `S`, not `P`.
// They still occupy a full em and belong to the Han punctuation font.
function isFullWidthSymbol(ch) {
  const codePoint = ch.codePointAt(0);

  return (
    ((codePoint >= 0xff01 && codePoint <= 0xff60) ||
      (codePoint >= 0xffe0 && codePoint <= 0xffe6)) &&
    SYMBOL_REGEX.test(ch)
  );
}

function isWrappablePunctuation(ch) {
  if (isHalfWidthAsciiPunctuation(ch) || EXCLUDED_PUNCTUATION.has(ch)) {
    return false;
  }

  return PUNCTUATION_REGEX.test(ch) || isFullWidthSymbol(ch);
}

function isLatinLetter(ch) {
  return Boolean(ch) && LATIN_LETTER_REGEX.test(ch);
}

// `strong`: Latin + apostrophe + Latin, which is never a quotation mark.
// `weak`: a trailing possessive, which is indistinguishable from a closing
// single quote without knowing whether one is open.
function classifyApostrophe(chars, index) {
  const ch = chars[index];

  if (!ENGLISH_IN_WORD_APOSTROPHES.has(ch)) {
    return 'none';
  }

  if (!isLatinLetter(chars[index - 1])) {
    return 'none';
  }

  const nextChar = chars[index + 1];

  if (isLatinLetter(nextChar)) {
    return 'strong';
  }

  if (
    !nextChar ||
    WHITESPACE_REGEX.test(nextChar) ||
    PUNCTUATION_REGEX.test(nextChar)
  ) {
    return 'weak';
  }

  return 'none';
}

function splitPunctuationChunks(value) {
  const chars = Array.from(value);
  const parts = [];
  let textBuffer = '';
  let openSingleQuotes = 0;

  function flushText() {
    if (textBuffer) {
      parts.push({ type: 'text', value: textBuffer });
      textBuffer = '';
    }
  }

  for (let index = 0; index < chars.length; index += 1) {
    const ch = chars[index];

    if (DOUBLED_MARKS.has(ch) && chars[index + 1] === ch) {
      flushText();
      parts.push({ type: 'punctuation', value: ch + ch });
      index += 1;
      continue;
    }

    if (isWrappablePunctuation(ch)) {
      const isClosingQuote =
        ch === CLOSING_SINGLE_QUOTE && openSingleQuotes > 0;
      const apostrophe = classifyApostrophe(chars, index);
      const isApostrophe =
        apostrophe === 'strong' || (apostrophe === 'weak' && !isClosingQuote);

      if (!isApostrophe) {
        if (ch === OPENING_SINGLE_QUOTE) {
          openSingleQuotes += 1;
        } else if (isClosingQuote) {
          openSingleQuotes -= 1;
        }

        flushText();
        parts.push({ type: 'punctuation', value: ch });
        continue;
      }
    }

    textBuffer += ch;
  }

  flushText();

  return parts;
}

function getAdjacencyClasses(parts) {
  const adjacencyClasses = new Map();

  function addAdjacencyClass(index, className) {
    const classes = adjacencyClasses.get(index);

    if (classes) {
      classes.add(className);
      return;
    }

    adjacencyClasses.set(index, new Set([className]));
  }

  function isQuoteBracketWrapper(value) {
    return (
      LEFT_COMPRESSION_MARKS.has(value) || RIGHT_COMPRESSION_MARKS.has(value)
    );
  }

  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];

    if (part.type !== 'punctuation') {
      continue;
    }

    if (LEFT_COMPRESSION_MARKS.has(part.value)) {
      const leftNeighbor = parts[index - 1];

      if (
        leftNeighbor &&
        leftNeighbor.type === 'punctuation' &&
        ADJACENCY_TARGET_MARKS.has(leftNeighbor.value)
      ) {
        addAdjacencyClass(index - 1, ADJ_LEFT_CLASS);
      }
    }

    if (RIGHT_COMPRESSION_MARKS.has(part.value)) {
      const rightNeighbor = parts[index + 1];
      let leftNeighborIndex = index - 1;

      while (leftNeighborIndex >= 0) {
        const leftNeighbor = parts[leftNeighborIndex];

        if (leftNeighbor.type !== 'punctuation') {
          break;
        }

        if (isQuoteBracketWrapper(leftNeighbor.value)) {
          leftNeighborIndex -= 1;
          continue;
        }

        if (ADJACENCY_TARGET_MARKS.has(leftNeighbor.value)) {
          addAdjacencyClass(leftNeighborIndex, ADJ_LEFT_CLASS);
        }

        break;
      }

      if (
        rightNeighbor &&
        rightNeighbor.type === 'punctuation' &&
        ADJACENCY_TARGET_MARKS.has(rightNeighbor.value)
      ) {
        addAdjacencyClass(index + 1, ADJ_RIGHT_CLASS);
      }
    }
  }

  for (const [index, classes] of adjacencyClasses) {
    if (classes.has(ADJ_LEFT_CLASS) && classes.has(ADJ_RIGHT_CLASS)) {
      adjacencyClasses.set(index, new Set([ADJ_MIDDLE_CLASS]));
    }
  }

  return adjacencyClasses;
}

function toClassList(className) {
  return className
    .split(/\s+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function hasClassNames(properties, expectedClassNames) {
  if (!properties || !properties.className) {
    return false;
  }

  const classList = Array.isArray(properties.className)
    ? properties.className
    : String(properties.className).split(/\s+/);

  return expectedClassNames.every((entry) => classList.includes(entry));
}

function isSkippedElement(node, ignoreTags, tagName, classList) {
  return (
    HARD_IGNORE_TAGS.has(node.tagName) ||
    ignoreTags.has(node.tagName) ||
    (node.tagName === tagName && hasClassNames(node.properties, classList))
  );
}

export default function rehypeHan(options) {
  const settings = options || {};

  const className =
    typeof settings.className === 'string' && settings.className.trim()
      ? settings.className.trim()
      : 'cjk-punc';

  const tagName =
    typeof settings.tagName === 'string' && settings.tagName.trim()
      ? settings.tagName.trim()
      : 'span';

  const ignoreTags = new Set(
    Array.isArray(settings.ignoreTags) && settings.ignoreTags.length > 0
      ? settings.ignoreTags.map((tag) => String(tag))
      : DEFAULT_IGNORE_TAGS
  );

  const classList = toClassList(className);

  return (tree) => {
    visitParents(tree, (node, ancestors) => {
      // Pruning at the element level keeps the whole subtree out of the walk,
      // instead of re-scanning the ancestor chain for every text node in it.
      if (node.type === 'element') {
        return isSkippedElement(node, ignoreTags, tagName, classList)
          ? SKIP
          : undefined;
      }

      if (node.type !== 'text') {
        return;
      }

      const parent = ancestors[ancestors.length - 1];

      // Any parent holding a children array works, including the tree root and
      // MDX JSX nodes, whose inline content is plain text rather than a `p`.
      if (!parent || !Array.isArray(parent.children)) {
        return;
      }

      if (!node.value || typeof node.value !== 'string') {
        return;
      }

      const parts = splitPunctuationChunks(node.value);

      if (parts.length === 1 && parts[0].type === 'text') {
        return;
      }

      const adjacencyClasses = getAdjacencyClasses(parts);

      const replacement = parts.map((part, partIndex) => {
        if (part.type === 'text') {
          return { type: 'text', value: part.value };
        }

        const markClassList = classList.slice();
        const extraClasses = adjacencyClasses.get(partIndex);

        if (extraClasses) {
          for (const entry of extraClasses) {
            if (!markClassList.includes(entry)) {
              markClassList.push(entry);
            }
          }
        }

        return {
          type: 'element',
          tagName,
          properties: { className: markClassList },
          children: [{ type: 'text', value: part.value }],
        };
      });

      const nodeIndex = parent.children.indexOf(node);

      if (nodeIndex === -1) {
        return;
      }

      parent.children.splice(nodeIndex, 1, ...replacement);

      // Resume after the inserted nodes: they are already final, and
      // re-entering them would re-scan every wrapper that was just created.
      return [SKIP, nodeIndex + replacement.length];
    });
  };
}
