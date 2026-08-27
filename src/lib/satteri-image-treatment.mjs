/**
 * Gives an image an explicit layout treatment, written as its title, and an
 * optional caption, written on the line under it:
 *
 *     ![A photo of the thing](./thing.jpg "aside")
 *     The thing, in the summer it was still standing.
 *
 * - `inline` — in the column, at the measure. The default; needs no marker.
 * - `aside`  — breaks out into the empty right-hand side of a longform post.
 * - `wide`   — stays in the column's flow but runs past the measure, out to
 *              where an `aside` ends.
 * - `small`  — stays in the column but is held well inside the measure, so a
 *              picture with more pixels than it needs spends them on sharpness
 *              rather than on size.
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
 * The caption is the rest of the paragraph, so it stays ordinary Markdown and
 * can carry a link. It can't share the title with the treatment, and it can't
 * be the alt either: the two say different things to different people. The alt
 * describes the picture for someone who can't see it; the caption tells
 * everyone what it has to do with the paragraph above it. A captioned image
 * becomes a `<figure>`; an uncaptioned one stays the paragraph it was.
 *
 * Both halves have to happen here, on the Markdown AST. Astro tags each image
 * for `vite-plugin-markdown`, which replaces the element's attributes wholesale
 * with the processed image's — so a title cleared any later comes back as
 * `title=""`. Rebuilding the image node is what drops it: `setProperty` does
 * not take `title`.
 *
 * @typedef {NonNullable<
 *   import('@astrojs/markdown-satteri').SatteriProcessorOptions['mdastPlugins']
 * >[number]} MdastPlugin
 * @typedef {import('mdast').PhrasingContent} PhrasingContent
 */

/** The default carries no attribute, so only the three that change layout are listed. */
const TREATMENTS = new Set(['aside', 'wide', 'small'])
const DEFAULT_TREATMENT = 'inline'

/**
 * The caption trailing an image, or `null` when what trails it isn't one.
 *
 * The line break between the two arrives as a newline on the front of the next
 * text node, or as a `break` node if the line was ended with two spaces. Text
 * carrying on from the image on the same line is neither, and means the
 * paragraph is prose that happens to open with an image — left alone.
 *
 * @param {readonly PhrasingContent[]} nodes
 * @returns {PhrasingContent[] | null}
 */
function captionFrom(nodes) {
  const [first, ...rest] = nodes
  if (!first) return []
  if (first.type === 'break') return rest
  if (first.type !== 'text' || !first.value.startsWith('\n')) return null

  const value = first.value.slice(1)
  return value ? [{ type: 'text', value }, ...rest] : rest
}

/** @type {MdastPlugin} */
export const satteriImageTreatment = {
  name: 'image-treatment',

  paragraph(node, ctx) {
    const [image, ...rest] = node.children
    if (image?.type !== 'image') return

    const treatment = image.title
    if (treatment && treatment !== DEFAULT_TREATMENT && !TREATMENTS.has(treatment)) return

    const caption = captionFrom(rest)
    if (!caption || (!caption.length && !treatment)) return

    ctx.setProperty(node, 'children', [
      { type: 'image', url: image.url, alt: image.alt },
      ...(caption.length
        ? [{ type: 'emphasis', data: { hName: 'figcaption' }, children: caption }]
        : []),
    ])

    /** @type {Record<string, unknown>} */
    const data = {}
    if (caption.length) data.hName = 'figure'
    if (TREATMENTS.has(treatment)) data.hProperties = { 'data-treatment': treatment }
    ctx.setProperty(node, 'data', data)
  },
}
