import assert from 'node:assert/strict';
import test from 'node:test';
import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeStringify from 'rehype-stringify';
import rehypeHan from '../index.js';

async function render(html, options) {
  const file = await unified()
    .use(rehypeParse, { fragment: true })
    .use(rehypeHan, options)
    .use(rehypeStringify)
    .process(html);

  return String(file);
}

test('wraps ASCII and CJK/full-width punctuation', async () => {
  const input = '<p>A,B。C！D「E」F（G）H</p>';
  const expected = '<p>A<span class="lang-en">,</span>B<span class="lang-en">。</span>C<span class="lang-en">！</span>D<span class="lang-en">「</span>E<span class="lang-en">」</span>F<span class="lang-en">（</span>G<span class="lang-en">）</span>H</p>';

  const output = await render(input);

  assert.equal(output, expected);
});

test('does not wrap hyphen-minus, en dash, or em dash', async () => {
  const input = '<p>A-B,C–D—E!</p>';
  const expected = '<p>A-B<span class="lang-en">,</span>C–D—E<span class="lang-en">!</span></p>';

  const output = await render(input);

  assert.equal(output, expected);
});

test('supports configurable className and tagName options', async () => {
  const input = '<p>A,B。</p>';
  const expected = '<p>A<i class="han-punc custom">,</i>B<i class="han-punc custom">。</i></p>';

  const output = await render(input, {
    className: 'han-punc custom',
    tagName: 'i'
  });

  assert.equal(output, expected);
});

test('respects ignoreTags option', async () => {
  const input = '<p><em>A,B。</em>C,D。</p>';
  const expected = '<p><em>A,B。</em>C<span class="lang-en">,</span>D<span class="lang-en">。</span></p>';

  const output = await render(input, { ignoreTags: ['em'] });

  assert.equal(output, expected);
});

test('does not wrap inside default ignored tags', async () => {
  const input = '<pre><code><span>A,B。</span></code></pre>';
  const expected = '<pre><code><span>A,B。</span></code></pre>';

  const output = await render(input);

  assert.equal(output, expected);
});

test('does not re-wrap punctuation in descendants of existing wrapper', async () => {
  const input = '<p><span class="lang-en"><em>，</em></span></p>';
  const expected = '<p><span class="lang-en"><em>，</em></span></p>';

  const output = await render(input);

  assert.equal(output, expected);
});
