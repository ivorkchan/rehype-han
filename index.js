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
const EXCLUDED_PUNCTUATION = new Set(['-', '–', '—']);

function isWrappablePunctuation(ch) {
  return PUNCTUATION_REGEX.test(ch) && !EXCLUDED_PUNCTUATION.has(ch);
}

function splitPunctuationChunks(value) {
  const parts = [];
  let textBuffer = '';

  for (const ch of value) {
    if (isWrappablePunctuation(ch)) {
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

export default function rehypeLangEn(options = {}) {
  const className =
    typeof options.className === 'string' && options.className.trim()
      ? options.className.trim()
      : 'lang-en';

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

      if (parent.tagName === tagName && hasClassName(parent.properties, className)) {
        return;
      }

      if (!node.value || typeof node.value !== 'string') {
        return;
      }

      const parts = splitPunctuationChunks(node.value);

      if (parts.length === 1 && parts[0].type === 'text') {
        return;
      }

      const replacement = parts.map((part) => {
        if (part.type === 'text') {
          return { type: 'text', value: part.value };
        }

        return {
          type: 'element',
          tagName,
          properties: { className: classList.slice() },
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
