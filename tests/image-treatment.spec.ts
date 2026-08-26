import { test, expect } from '@playwright/test'
import { createSatteriMarkdownProcessor } from '@astrojs/markdown-satteri'
import { satteriImageTreatment } from '../src/lib/satteri-image-treatment.mjs'

/**
 * The plugin's contract, checked against the Markdown processor rather than a
 * rendered page. `press.spec.ts` covers what the article actually looks like;
 * these cover the cases the article doesn't happen to contain — an image with
 * no caption, a title that names no treatment, a paragraph that merely opens
 * with an image — which is where a change to the plugin would quietly go wrong.
 */
const render = async (markdown: string) => {
  const processor = await createSatteriMarkdownProcessor({
    mdastPlugins: [satteriImageTreatment],
  })
  return (await processor.render(markdown)).code
}

test.describe('the image treatment plugin', () => {
  test('turns a captioned image into a figure and leaves an uncaptioned one alone', async () => {
    const html = await render('![alt](./a.jpg)\n\n![alt](./b.jpg)\nA caption.\n')

    expect(html).toMatch(/<p><img[^>]*><\/p>/)
    expect(html).toMatch(/<figure><img[^>]*><figcaption>A caption\.<\/figcaption><\/figure>/)
  })

  test('keeps the caption as Markdown', async () => {
    const html = await render('![alt](./a.jpg)\nSee [the site](https://example.com).\n')

    expect(html).toContain('<a href="https://example.com">the site</a>')
  })

  test('carries the treatment onto the figure and drops the marker', async () => {
    const html = await render('![alt](./a.jpg "aside")\nA caption.\n')

    expect(html).toContain('<figure data-treatment="aside">')
    expect(html).not.toContain('title')
  })

  test('still strips the marker from an image with no caption', async () => {
    const html = await render('![alt](./a.jpg "wide")\n\n![alt](./b.jpg "inline")\n')

    expect(html).toContain('<p data-treatment="wide">')
    // `inline` is the default, so it names a treatment without adding an attribute.
    expect(html).not.toContain('data-treatment="inline"')
    expect(html).not.toContain('title')
  })

  test('leaves a title that names no treatment as a title', async () => {
    const html = await render('![alt](./a.jpg "Not a treatment")\nA caption.\n')

    expect(html).toContain('Not a treatment')
    expect(html).not.toContain('<figure')
  })

  test('does not caption a paragraph that merely opens with an image', async () => {
    const html = await render('![alt](./a.jpg) and then the sentence carries on.\n')

    expect(html).not.toContain('<figure')
    expect(html).toContain('and then the sentence carries on.')
  })
})
