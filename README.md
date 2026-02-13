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
- Exactly two consecutive CJK ellipsis characters (`……`) are wrapped as one token.
- Single `-`, `–`, and `—` are intentionally excluded and never wrapped.
- Percent-like signs `%`, `％`, `﹪`, `‰`, and `‱` are excluded from wrapping.
- In-word Latin apostrophes are excluded when matching `Latin + (' or ’) + Latin` (for example `Mom’s`, `I’d`, `we’re`).
- Punctuation already inside an existing configured wrapper is not wrapped again.

Examples:

- `0.5%` => `0<span class="cjk-punc">.</span>5%`
- `甲……乙` => `甲<span class="cjk-punc">……</span>乙`

## Adjacency Classes

When wrappers are adjacent to default quote/bracket marks, extra classes are added only to 点号 targets (`，。？！；：、`):

- Left quote/bracket marks `“`, `‘`, `《`, `「`, `『` assign `adj-l` to the immediate left neighboring wrapper only when that neighbor is a 点号 target.
- Right quote/bracket marks `”`, `’`, `》`, `」`, `』` assign `adj-l` to the first non-quote/bracket wrapper on the left and `adj-r` to the immediate right neighboring wrapper, but only when those neighbors are 点号 targets.
- If both sides apply to the same wrapper, the output is normalized to `adj-m` only.

One-sided classes are additive on top of `className` (for example `class="cjk-punc adj-l"` or `class="han-punc custom adj-r"`).

Examples:

- `。”` => `。` gets `adj-l`
- `”！` => `！` gets `adj-r`
- `”。“` => middle `。` gets `adj-m`
- `……”` => `……` is wrapped, with no `adj-*` class
