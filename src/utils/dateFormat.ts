// src/utils/dateFormat.ts
/**
 * The single blog-date formatter.
 *
 * `BlogCard`, `BlogReels` and `blog/[slug]` each used to carry a byte-identical
 * local copy of this and had already drifted apart on two axes, so the one
 * implementation lives here. Every option is load-bearing: the rendered strings
 * are part of the page, and the three call sites are NOT interchangeable.
 */
export function formatDate(
  iso: string | null,
  options: { empty?: string; month?: 'long' | 'short' } = {},
): string {
  // `empty` defaults to 'DRAFT' because the list/card surfaces (BlogCard,
  // BlogReels) render a DRAFT badge for an unpublished post. The article page
  // is the deliberate exception and passes `empty: ''` so a missing date
  // renders nothing instead of a badge mid-paragraph — that difference is
  // intentional, so do not collapse [slug].tsx onto the defaults.
  //
  // `month` defaults to 'short' ('MAR') to suit the compact HUD/mono chrome the
  // cards put it in; [slug].tsx passes 'long' ('MARCH') for its wider measure.
  const { empty = 'DRAFT', month = 'short' } = options;
  if (!iso) return empty;
  return new Date(iso)
    .toLocaleDateString('en-US', {
      day: '2-digit',
      month,
      year: 'numeric',
    })
    .toUpperCase();
}
