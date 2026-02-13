# rehype-han

Rehype plugin that wraps punctuation marks in an element with the class `cjk-punc`.

## Install

```sh
npm install rehype-han
```

## Usage

```js
import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeStringify from 'rehype-stringify';
import rehypeHan from 'rehype-han';

const file = await unified()
  .use(rehypeParse, { fragment: true })
  .use(rehypeHan)
  .use(rehypeStringify)
  .process('<p>Mom\'s note——“中文”</p>');

console.log(String(file));
// => <p>Mom's note<span class="cjk-punc adj-l">——</span><span class="cjk-punc">“</span>中文<span class="cjk-punc">”</span></p>
```

## Options

- `className` (string, default: `cjk-punc`): base class applied to punctuation wrappers.
- `tagName` (string, default: `span`): element used for punctuation wrappers.
- `ignoreTags` (string[], default: `['script', 'style', 'noscript', 'code', 'pre', 'kbd', 'samp']`): tags whose descendants are left unchanged.

## Behavior

- Wrapping targets punctuation from Unicode `\p{P}` (including ASCII and full-width/CJK variants).
- Exactly two consecutive em dashes (`——`) are wrapped as one token.
- Single `-`, `–`, and `—` are intentionally excluded and never wrapped.
- In-word Latin apostrophes are excluded when matching `Latin + (' or ’) + Latin` (for example `Mom's`, `I'd`, `we’re`).
- Punctuation already inside an existing configured wrapper is not wrapped again.

## Adjacency Classes

When wrappers are adjacent to default quote/bracket marks, extra classes are added to the neighboring punctuation wrapper:

- `adj-l`: mark immediately to the left of one of `“`, `‘`, `《`, `「`, `『`
- `adj-r`: mark immediately to the right of one of `”`, `’`, `》`, `」`, `』`

These classes are additive on top of `className` (for example `class="cjk-punc adj-l"` or `class="han-punc custom adj-r"`).

Examples:

- `。“` => `。` gets `adj-l`
- `。“‘` => `。` and `“` get `adj-l`
- `“‘文本’”` => outer `“` gets `adj-l`, outer `”` gets `adj-r`
