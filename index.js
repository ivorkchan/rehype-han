import { visitParents } from 'unist-util-visit-parents';

const DEFAULT_IGNORE_TAGS = [
  'script',
  'style',
  'noscript',
  'code',
  'pre',
  'kbd',
  'samp'
];

const PUNCTUATION_REGEX = /\p{P}/u;
const LATIN_LETTER_REGEX = /\p{Script=Latin}/u;
const EXCLUDED_PUNCTUATION = new Set(['-', '–', '—']);
const ENGLISH_IN_WORD_APOSTROPHES = new Set(["'", '’']);
const EM_DASH = '—';
const DOUBLE_EM_DASH = '——';
const LEFT_COMPRESSION_MARKS = new Set(['“', '‘', '《', '「', '『']);
const RIGHT_COMPRESSION_MARKS = new Set(['”', '’', '》', '」', '』']);
const ADJ_LEFT_CLASS = 'adj-l';
const ADJ_RIGHT_CLASS = 'adj-r';

function isWrappablePunctuation(ch) {
  return PUNCTUATION_REGEX.test(ch) && !EXCLUDED_PUNCTUATION.has(ch);
}

function isLatinLetter(ch) {
  return Boolean(ch) && LATIN_LETTER_REGEX.test(ch);
}

function isEnglishInWordApostrophe(chars, index) {
  const ch = chars[index];

  if (!ENGLISH_IN_WORD_APOSTROPHES.has(ch)) {
    return false;
  }

  return isLatinLetter(chars[index - 1]) && isLatinLetter(chars[index + 1]);
}

function splitPunctuationChunks(value) {
  const chars = Array.from(value);
  const parts = [];
  let textBuffer = '';

  for (let index = 0; index < chars.length; index += 1) {
    const ch = chars[index];

    if (ch === EM_DASH && chars[index + 1] === EM_DASH) {
      if (textBuffer) {
        parts.push({ type: 'text', value: textBuffer });
        textBuffer = '';
      }

      parts.push({ type: 'punctuation', value: DOUBLE_EM_DASH });
      index += 1;
      continue;
    }

    if (
      isWrappablePunctuation(ch) &&
      !isEnglishInWordApostrophe(chars, index)
    ) {
      if (textBuffer) {
        parts.push({ type: 'text', value: textBuffer });
        textBuffer = '';
      }

      parts.push({ type: 'punctuation', value: ch });
      continue;
    }

    textBuffer += ch;
  }

  if (textBuffer) {
    parts.push({ type: 'text', value: textBuffer });
  }

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

  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];

    if (part.type !== 'punctuation') {
      continue;
    }

    if (LEFT_COMPRESSION_MARKS.has(part.value)) {
      const leftNeighbor = parts[index - 1];

      if (leftNeighbor && leftNeighbor.type === 'punctuation') {
        addAdjacencyClass(index - 1, ADJ_LEFT_CLASS);
      }
    }

    if (RIGHT_COMPRESSION_MARKS.has(part.value)) {
      const leftNeighbor = parts[index - 1];
      const rightNeighbor = parts[index + 1];

      if (leftNeighbor && leftNeighbor.type === 'punctuation') {
        addAdjacencyClass(index - 1, ADJ_LEFT_CLASS);
      }

      if (rightNeighbor && rightNeighbor.type === 'punctuation') {
        addAdjacencyClass(index + 1, ADJ_RIGHT_CLASS);
      }
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

function hasClassName(properties, className) {
  if (!properties || !properties.className) {
    return false;
  }

  const expectedClassNames = toClassList(className);
  const classList = Array.isArray(properties.className)
    ? properties.className
    : String(properties.className).split(/\s+/);

  return expectedClassNames.every((entry) => classList.includes(entry));
}

function hasIgnoredAncestor(ancestors, ignoreTags) {
  return ancestors.some(
    (node) => node.type === 'element' && ignoreTags.has(node.tagName)
  );
}

function hasWrapperAncestor(ancestors, tagName, className) {
  return ancestors.some(
    (node) =>
      node.type === 'element' &&
      node.tagName === tagName &&
      hasClassName(node.properties, className)
  );
}

export default function rehypeLangEn(options = {}) {
  const className =
    typeof options.className === 'string' && options.className.trim()
      ? options.className.trim()
      : 'cjk-punc';

  const tagName =
    typeof options.tagName === 'string' && options.tagName.trim()
      ? options.tagName.trim()
      : 'span';

  const ignoreTags = new Set(
    Array.isArray(options.ignoreTags) && options.ignoreTags.length > 0
      ? options.ignoreTags.map((tag) => String(tag))
      : DEFAULT_IGNORE_TAGS
  );

  const classList = toClassList(className);

  return (tree) => {
    visitParents(tree, 'text', (node, ancestors) => {
      const parent = ancestors[ancestors.length - 1];

      if (!parent || parent.type !== 'element') {
        return;
      }

      if (hasIgnoredAncestor(ancestors, ignoreTags)) {
        return;
      }

      if (hasWrapperAncestor(ancestors, tagName, className)) {
        return;
      }

      if (!node.value || typeof node.value !== 'string') {
        return;
      }

      const parts = splitPunctuationChunks(node.value);
      const adjacencyClasses = getAdjacencyClasses(parts);

      if (parts.length === 1 && parts[0].type === 'text') {
        return;
      }

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
          children: [{ type: 'text', value: part.value }]
        };
      });

      const nodeIndex = parent.children.indexOf(node);
      if (nodeIndex === -1) {
        return;
      }

      parent.children.splice(nodeIndex, 1, ...replacement);
    });
  };
}
