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
  .process("<p>Mom's note——“中文”</p>");

console.log(String(file));
// => <p>Mom's note——<span class="cjk-punc">“</span>中文<span class="cjk-punc">”</span></p>
```

## Options

- `className` (string, default: `cjk-punc`): base class applied to punctuation wrappers.
- `tagName` (string, default: `span`): element used for punctuation wrappers.
- `ignoreTags` (string[], default: `['script', 'style', 'noscript', 'code', 'pre', 'kbd', 'samp']`): tags whose descendants are left unchanged.

## Behavior

- Wrapping targets non-ASCII punctuation from Unicode `\p{P}` (full-width/CJK marks); ASCII punctuation is ignored.
- Exactly two consecutive em dashes (`——`) are wrapped as one token.
- Exactly two consecutive CJK ellipsis characters (`……`) are wrapped as one token.
- Single `-`, `–`, and `—` are intentionally excluded and never wrapped.
- Percent-like signs `%`, `％`, `﹪`, `‰`, and `‱` are excluded from wrapping.
- Latin-word apostrophes are excluded for `Latin + (' or ’) + Latin` and trailing possessives `Latin + (' or ’) + (space, punctuation, or end)` (for example `Mom’s`, `I’d`, `we’re`, `students' work`).
- Punctuation already inside an existing configured wrapper is not wrapped again.
