import type { Root } from 'hast';

export interface RehypeHanOptions {
  /**
   * Base class applied to punctuation wrappers.
   *
   * Accepts several space-separated classes. Elements that already carry all
   * of them are treated as existing wrappers and left alone.
   *
   * @default 'cjk-punc'
   */
  className?: string | undefined;
  /**
   * Element used for punctuation wrappers.
   *
   * @default 'span'
   */
  tagName?: string | undefined;
  /**
   * Tags whose descendants are left unchanged. Replaces the default list
   * rather than extending it.
   *
   * `script`, `style`, `textarea`, `title`, `option`, `svg`, and `math` are
   * always skipped regardless of this option.
   *
   * @default ['script', 'style', 'noscript', 'code', 'pre', 'kbd', 'samp']
   */
  ignoreTags?: readonly string[] | undefined;
}

export type Options = RehypeHanOptions;

declare function rehypeHan(
  options?: Readonly<RehypeHanOptions> | null | undefined
): (tree: Root) => undefined;

export default rehypeHan;
