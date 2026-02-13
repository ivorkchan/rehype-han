# rehype-han

Rehype plugin that wraps punctuation marks in an element with the class `lang-en`.

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
  .process('<p>中文,Hello。「世界」—Done!</p>');

console.log(String(file));
// => <p>中文<span class="lang-en">,</span>Hello<span class="lang-en">。</span><span class="lang-en">「</span>世界<span class="lang-en">」</span>—Done<span class="lang-en">!</span></p>
```

## Options

- `className` (string, default: `lang-en`): class applied to punctuation wrappers.
- `tagName` (string, default: `span`): element used for punctuation wrappers.
- `ignoreTags` (string[], default: `['script', 'style', 'noscript', 'code', 'pre', 'kbd', 'samp']`): tags whose descendants are left unchanged.

## Notes

- Wrapping targets punctuation from Unicode `\p{P}` (including ASCII and full-width/CJK variants).
- `-`, `–`, and `—` are intentionally excluded and are never wrapped.
- Punctuation already inside an existing configured wrapper is not wrapped again.
