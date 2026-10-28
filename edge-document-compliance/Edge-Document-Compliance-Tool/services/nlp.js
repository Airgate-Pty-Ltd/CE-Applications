/**
 * RequirementExtractor
 *
 * Simple keyword-based extraction suitable for Hour 2.
 */
export default class RequirementExtractor {
  constructor() {
    this.keywords = ['shall', 'must', 'should', 'will'];
  }

  extract(text) {
    const lines = text.split(/\r?\n/);
    const results = [];

    lines.forEach((line, index) => {
      const lower = line.toLowerCase();
      if (this.keywords.some((word) => lower.includes(word))) {
        results.push({
          lineNumber: index + 1,
          content: line.trim()
        });
      }
    });

    return results;
  }
}
