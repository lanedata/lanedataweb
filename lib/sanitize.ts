import sanitizeHtml from 'sanitize-html'

/**
 * Sanitizes admin-provided HTML before storage.
 * Strips scripts and event handlers; preserves layout, tables, images, and custom styles.
 */
export function sanitizeArticleHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'hr',
      'strong', 'b', 'em', 'i', 'u', 's', 'del', 'ins',
      'mark', 'small', 'sub', 'sup', 'code', 'kbd', 'samp',
      'a',
      'ul', 'ol', 'li', 'dl', 'dt', 'dd',
      'blockquote', 'pre',
      'figure', 'figcaption',
      'img', 'picture', 'source',
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
      'caption', 'colgroup', 'col',
      'div', 'span',
      'section', 'article', 'aside', 'main', 'header', 'footer', 'nav',
      'details', 'summary',
      'style',
    ],
    allowedAttributes: {
      '*': ['class', 'id', 'style', 'role', 'aria-label', 'aria-hidden', 'data-*'],
      'a': ['href', 'title', 'target', 'rel', 'name'],
      'img': ['src', 'srcset', 'alt', 'title', 'width', 'height', 'loading', 'decoding'],
      'source': ['src', 'srcset', 'type', 'media', 'sizes'],
      'td': ['colspan', 'rowspan', 'align', 'valign', 'width'],
      'th': ['colspan', 'rowspan', 'scope', 'align', 'valign', 'width'],
      'col': ['span', 'width'],
      'colgroup': ['span'],
      'ol': ['type', 'start', 'reversed'],
      'details': ['open'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesByTag: {
      img: ['http', 'https', 'data'],
      source: ['http', 'https', 'data'],
    },
    // Open external links in new tab automatically
    transformTags: {
      a: (tagName, attribs) => {
        const href = attribs.href ?? ''
        if (href.startsWith('http')) {
          return {
            tagName,
            attribs: { ...attribs, target: '_blank', rel: 'noopener noreferrer' },
          }
        }
        return { tagName, attribs }
      },
    },
  })
}
