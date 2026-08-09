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
- `ignoreTags` (string[], default: `['script', 'style', 'noscript', 'code', 'pre', 'kbd', 'samp']`): tags whose descendants are left unchanged. Replaces the default list rather than extending it.

## Behavior

### What gets wrapped

- Non-ASCII punctuation from Unicode `\p{P}` (full-width/CJK marks); ASCII punctuation is ignored.
- Full-width symbol forms such as `～`, `＋`, `＝`, `＜`, `＞`, `｜`, `＄`, and `￥`, which are categorized as `\p{S}` but still occupy a full em. Full-width letters and digits (`Ａ`, `１`) and half-width katakana are untouched.
- Exactly two consecutive em dashes (`——`), CJK ellipses (`……`), or midline ellipses (`⋯⋯`) are wrapped as one token. A third consecutive mark starts over, so `———` yields `——` plus a bare `—`.

### What is left alone

- Single `-`, `–`, and `—` are intentionally excluded and never wrapped. A lone `⋯` is likewise left bare; only the doubled form is a Han punctuation token.
- Percent-like signs `%`, `％`, `﹪`, `‰`, `‱`, and the Latin bullet `•`.
- Latin-word apostrophes: `Latin + (' or ’) + Latin` (for example `Mom’s`, `I’d`, `we’re`) and trailing possessives `Latin + (' or ’) + (space, punctuation, or end)` (for example `students' work`). A trailing `’` is treated as a closing quote instead when an unmatched `‘` is open earlier in the same text node, so `‘fine’` and `‘Mom’s note’` both come out right.
- Punctuation already inside an existing configured wrapper.
- Descendants of `ignoreTags`, plus `script`, `style`, `textarea`, `title`, `option`, `svg`, and `math`, which are always skipped because wrapping there would leak literal markup into the output.

### Adjacency classes

Full-width punctuation carries an em of advance width even where the glyph is half empty, so a 点号 next to a quote or bracket needs negative margin. The plugin marks those spots and leaves the amount to CSS:

- `adj-l` — a 点号 (`，。？！；：、`) directly followed by an opening mark (`“‘《〈「『（【〔〖［｛`). Compress on its right.
- `adj-r` — a 点号 directly preceded by a closing mark (`”’》〉」』）】〕〗］｝`). Compress on its left.
- `adj-m` — both of the above. Compress on both sides.

Nested closing marks are skipped when looking left, so `。』」` puts `adj-l` on the `。`.

```css
.cjk-punc.adj-l {
  margin-right: -0.5em;
}
.cjk-punc.adj-r {
  margin-left: -0.5em;
}
.cjk-punc.adj-m {
  margin-inline: -0.25em;
}
```

### Limitations

- Tokenizing and adjacency both run per text node. Punctuation split across an inline element boundary — `<strong>加粗。</strong>「引用」` — is wrapped correctly but gets no adjacency class, because the two marks never appear in the same text node.
- Text is wrapped under any parent that holds children, so MDX JSX nodes such as `<Callout>甲，乙</Callout>` are covered. `ignoreTags` matches HTML tag names only, not MDX component names.
- Running the plugin twice is a no-op: wrappers created on the first pass are recognized and skipped.
