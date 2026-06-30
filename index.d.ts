export interface RehypeHanOptions {
  className?: string;
  tagName?: string;
  ignoreTags?: string[];
}

declare function rehypeHan(options?: RehypeHanOptions): (tree: unknown) => void;

export default rehypeHan;
