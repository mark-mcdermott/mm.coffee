/**
 * Gives an image an explicit layout treatment, written as its title:
 *
 *     ![A photo of the thing](./thing.jpg "aside")
 *
 * - `inline` — in the column, at the measure. The default; needs no marker.
 * - `aside`  — breaks out into the empty right-hand side of a longform post.
 * - `wide`   — stays in the column's flow but runs past the measure, out to
 *              where an `aside` ends.
 *
 * Which treatment an image gets is always a decision written down here, never
 * inferred from the image itself. Portrait and landscape are equally free to be
 * inline, aside or wide; nothing reads the aspect ratio.
 *
 * The title is the only slot Markdown offers. The alt text is not free to
 * borrow — it gets read aloud — and directives (`:::aside`) would have been the
 * honest syntax, but turning them on makes Sätteri parse `:1` as a text
 * directive, which silently eats the `:1` off every contrast ratio this site
 * writes. A title that names no treatment is left alone and still renders as a
 * title.
 *
 * Both halves have to happen here, on the Markdown AST. Astro tags each image
 * for `vite-plugin-markdown`, which replaces the element's attributes wholesale
 * with the processed image's — so a title cleared any later comes back as
 * `title=""`. Replacing the node is what drops it: `setProperty` does not take
 * `title`.
 *
 * @typedef {NonNullable<
 *   import('@astrojs/markdown-satteri').SatteriProcessorOptions['mdastPlugins']
 * >[number]} MdastPlugin
 */

/** The default carries no attribute, so only the two that change layout are listed. */
const TREATMENTS = new Set(['aside', 'wide'])
const DEFAULT_TREATMENT = 'inline'

/** @type {MdastPlugin} */
export const satteriImageTreatment = {
  name: 'image-treatment',

  paragraph(node, ctx) {
    const [image, ...rest] = node.children
    if (rest.length || image?.type !== 'image' || !image.title) return

    const treatment = image.title
    if (treatment !== DEFAULT_TREATMENT && !TREATMENTS.has(treatment)) return

    ctx.replaceNode(image, { type: 'image', url: image.url, alt: image.alt })
    if (TREATMENTS.has(treatment)) {
      ctx.setProperty(node, 'data', { hProperties: { 'data-treatment': treatment } })
    }
  },
}
