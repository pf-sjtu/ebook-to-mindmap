const ZERO_WIDTH_SPACE = '\u200B'
const PUNCTUATION_RANGES = '\u2000-\u206F\u2E00-\u2E7F\u3000-\u303F\uFF00-\uFFEF'
const MARKER_PATTERN = '(?:\\*\\*|__|\\*|_)'

const leadingMarkersRegex = new RegExp(`(${MARKER_PATTERN})(?!${ZERO_WIDTH_SPACE})([${PUNCTUATION_RANGES}])`, 'g')
const trailingMarkersRegex = new RegExp(`([${PUNCTUATION_RANGES}])(?!${ZERO_WIDTH_SPACE})(${MARKER_PATTERN})`, 'g')

export function normalizeMarkdownTypography(input?: string): string {
  if (!input) {
    return ''
  }

  return input
    .replace(leadingMarkersRegex, (_, markers: string, punct: string) => `${markers}${ZERO_WIDTH_SPACE}${punct}`)
    .replace(trailingMarkersRegex, (_, punct: string, markers: string) => `${punct}${ZERO_WIDTH_SPACE}${markers}`)
}
