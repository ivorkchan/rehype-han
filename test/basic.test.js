import assert from 'node:assert/strict';
import test from 'node:test';
import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeStringify from 'rehype-stringify';
import rehypeHan from '../index.js';

const FIXTURE_INPUT =
  '用以书写的小幅绢帛，后亦借指纸。《汉书・外戚传下・孝成赵皇后》：「武（籍武）发篋中，有裹药二枚，赫蹏书。」颜师古注：「邓展曰：『赫音兄弟鬩墙之鬩。』应劭曰：『赫蹏，薄小纸也。』」宋赵彦卫《云麓漫钞》卷七：「《赵后传》所谓『赫蹏』者，注云『薄小纸』，然其寔亦縑帛。」';

async function render(html, options) {
  const file = await unified()
    .use(rehypeParse, { fragment: true })
    .use(rehypeHan, options)
    .use(rehypeStringify)
    .process(html);

  return String(file);
}

test('wraps ASCII and CJK/full-width punctuation with the default class', async () => {
  const input = '<p>A,B。C！D「E」F（G）H</p>';
  const expected = '<p>A<span class="cjk-punc">,</span>B<span class="cjk-punc">。</span>C<span class="cjk-punc">！</span>D<span class="cjk-punc">「</span>E<span class="cjk-punc">」</span>F<span class="cjk-punc">（</span>G<span class="cjk-punc">）</span>H</p>';

  const output = await render(input);

  assert.equal(output, expected);
});

test('wraps exactly two em dashes as one token and leaves a third em dash unwrapped', async () => {
  const input = '<p>甲——乙，甲———乙。</p>';
  const expected = '<p>甲<span class="cjk-punc">——</span>乙<span class="cjk-punc">，</span>甲<span class="cjk-punc">——</span>—乙<span class="cjk-punc">。</span></p>';

  const output = await render(input);

  assert.equal(output, expected);
});

test('treats double CJK ellipsis as a single punctuation token', async () => {
  const input = '<p>甲……乙</p>';
  const expected = '<p>甲<span class="cjk-punc">……</span>乙</p>';

  const output = await render(input);

  assert.equal(output, expected);
});

test('keeps percent-like signs unwrapped in decimal examples', async () => {
  const input = '<p>0.5% 0.5％ 0.5﹪ 0.5‰ 0.5‱</p>';
  const expected = '<p>0<span class="cjk-punc">.</span>5% 0<span class="cjk-punc">.</span>5％ 0<span class="cjk-punc">.</span>5﹪ 0<span class="cjk-punc">.</span>5‰ 0<span class="cjk-punc">.</span>5‱</p>';

  const output = await render(input);

  assert.equal(output, expected);
});

test('does not wrap single hyphen-minus, en dash, or em dash', async () => {
  const input = '<p>A-B–C—D,。</p>';
  const expected = '<p>A-B–C—D<span class="cjk-punc">,</span><span class="cjk-punc">。</span></p>';

  const output = await render(input);

  assert.equal(output, expected);
});

test('does not wrap in-word Latin apostrophes', async () => {
  const input = '<p>Mom\'s, I\'d, we’re.</p>';
  const expected = '<p>Mom\'s<span class="cjk-punc">,</span> I\'d<span class="cjk-punc">,</span> we’re<span class="cjk-punc">.</span></p>';

  const output = await render(input);

  assert.equal(output, expected);
});

test('applies adj-l to only the left neighbor in the required `。“` example', async () => {
  const input = '<p>。“</p>';
  const expected = '<p><span class="cjk-punc adj-l">。</span><span class="cjk-punc">“</span></p>';

  const output = await render(input);

  assert.equal(output, expected);
});

test("applies adj-l to the left neighbor in the required quote-right example", async () => {
  const input = "<p>。”</p>";
  const expected = "<p><span class=\"cjk-punc adj-l\">。</span><span class=\"cjk-punc\">”</span></p>";

  const output = await render(input);

  assert.equal(output, expected);
});

test("preserves right-neighbor adj-r in the control quote-right exclamation example", async () => {
  const input = "<p>”！</p>";
  const expected = "<p><span class=\"cjk-punc\">”</span><span class=\"cjk-punc adj-r\">！</span></p>";

  const output = await render(input);

  assert.equal(output, expected);
});

test('normalizes dual-side adjacency to adj-m in the required `”。“` example', async () => {
  const input = '<p>”。“</p>';
  const expected = '<p><span class="cjk-punc">”</span><span class="cjk-punc adj-m">。</span><span class="cjk-punc">“</span></p>';

  const output = await render(input);

  assert.equal(output, expected);
});

test('applies adj-l to both neighboring marks in the required `。“‘` example', async () => {
  const input = '<p>。“‘</p>';
  const expected = '<p><span class="cjk-punc adj-l">。</span><span class="cjk-punc adj-l">“</span><span class="cjk-punc">‘</span></p>';

  const output = await render(input);

  assert.equal(output, expected);
});

test('does not assign adj-l to the inner right quote in the required nested quote example', async () => {
  const input = '<p>“‘文本’”</p>';
  const expected = '<p><span class="cjk-punc adj-l">“</span><span class="cjk-punc">‘</span>文本<span class="cjk-punc">’</span><span class="cjk-punc adj-r">”</span></p>';

  const output = await render(input);

  assert.equal(output, expected);
});

test('locks nested right-mark skipping for 。』」', async () => {
  const input = '<p>。』」</p>';
  const expected = '<p><span class="cjk-punc adj-l">。</span><span class="cjk-punc">』</span><span class="cjk-punc adj-r">」</span></p>';

  const output = await render(input);

  assert.equal(output, expected);
});

test('uses the default left quote/bracket adjacency subset', async () => {
  const input = '<p>。“‘《「『</p>';
  const expected = '<p><span class="cjk-punc adj-l">。</span><span class="cjk-punc adj-l">“</span><span class="cjk-punc adj-l">‘</span><span class="cjk-punc adj-l">《</span><span class="cjk-punc adj-l">「</span><span class="cjk-punc">『</span></p>';

  const output = await render(input);

  assert.equal(output, expected);
});

test('uses the default right quote/bracket adjacency subset with nested-left skipping', async () => {
  const input = '<p>』」》’”，</p>';
  const expected = '<p><span class="cjk-punc">』</span><span class="cjk-punc adj-r">」</span><span class="cjk-punc adj-r">》</span><span class="cjk-punc adj-r">’</span><span class="cjk-punc adj-r">”</span><span class="cjk-punc adj-r">，</span></p>';

  const output = await render(input);

  assert.equal(output, expected);
});

test('adds adjacency classes on top of a custom className', async () => {
  const input = '<p>。“‘</p>';
  const expected = '<p><span class="han-punc custom adj-l">。</span><span class="han-punc custom adj-l">“</span><span class="han-punc custom">‘</span></p>';

  const output = await render(input, { className: 'han-punc custom' });

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
  const expected = '<p><em>A,B。</em>C<span class="cjk-punc">,</span>D<span class="cjk-punc">。</span></p>';

  const output = await render(input, { ignoreTags: ['em'] });

  assert.equal(output, expected);
});

test('does not wrap inside default ignored tags', async () => {
  const input = '<pre><code><span>A,B。</span></code></pre>';
  const expected = '<pre><code><span>A,B。</span></code></pre>';

  const output = await render(input);

  assert.equal(output, expected);
});

test('does not re-wrap punctuation in descendants of existing default wrapper', async () => {
  const input = '<p><span class="cjk-punc"><em>，</em></span></p>';
  const expected = '<p><span class="cjk-punc"><em>，</em></span></p>';

  const output = await render(input);

  assert.equal(output, expected);
});

test('does not re-wrap punctuation in descendants of existing custom wrapper', async () => {
  const input = '<p><span class="han-punc"><em>，</em></span></p>';
  const expected = '<p><span class="han-punc"><em>，</em></span></p>';

  const output = await render(input, { className: 'han-punc' });

  assert.equal(output, expected);
});

test('fixture regression keeps expected wrappers and adjacency around quote/bracket punctuation', async () => {
  const output = await render(`<p>${FIXTURE_INPUT}</p>`);

  assert.ok(
    output.includes(
      '<span class="cjk-punc">》</span><span class="cjk-punc adj-m">：</span><span class="cjk-punc">「</span>'
    )
  );
  assert.ok(
    output.includes(
      '<span class="cjk-punc adj-l">：</span><span class="cjk-punc adj-l">「</span><span class="cjk-punc">《</span>'
    )
  );
  assert.ok(
    output.includes(
      '<span class="cjk-punc">』</span><span class="cjk-punc adj-r">，</span>'
    )
  );
});
