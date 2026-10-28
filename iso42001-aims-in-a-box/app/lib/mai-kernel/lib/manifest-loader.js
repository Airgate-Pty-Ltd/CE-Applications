/**
 * Manifest Loader (lib/mai-kernel/lib/manifest-loader.js)
 *
 * Loads DIM (Domain Intelligence Module) manifests + rule JSON files from
 * disk. Design Law 11: manifest-driven dispatch — the manifest's
 * subscribesTo array is the only thing that determines which events a DIM's
 * rules react to; never a hardcoded name/prefix mapping.
 *
 * ADAPTED FROM the reference kernel: the reference loader only loaded/
 * validated a single manifest object already containing an embedded `rules`
 * array. This host stores each DIM as `dims/<dim-id>/manifest.json` plus
 * `dims/<dim-id>/rules/*.json`, so this loader walks that directory shape,
 * injects dimId onto each rule (in case a rule file omits it), and returns
 * one manifest object per DIM with `rules` populated from the rule files.
 */

const fs = require('fs');
const path = require('path');

class ManifestLoader {
  /**
   * Load one DIM: dimDir/manifest.json + dimDir/rules/*.json
   * @param {string} dimDir - absolute path to the DIM folder
   * @returns {Object} manifest with `rules` populated
   */
  static loadDim(dimDir) {
    const manifestPath = path.join(dimDir, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

    const rulesDir = path.join(dimDir, 'rules');
    const rules = [];
    if (fs.existsSync(rulesDir)) {
      const files = fs.readdirSync(rulesDir).filter((f) => f.endsWith('.json')).sort();
      for (const file of files) {
        const rule = JSON.parse(fs.readFileSync(path.join(rulesDir, file), 'utf-8'));
        if (!rule.dimId) rule.dimId = manifest.dimId;
        rules.push(rule);
      }
    }

    return { ...manifest, rules };
  }

  /**
   * Load every DIM under a `dims/` root directory (one subfolder per DIM).
   * @param {string} dimsRoot - absolute path to the `dims` folder
   * @returns {Array} array of manifest objects, each with `rules` populated
   */
  static loadAllDims(dimsRoot) {
    if (!fs.existsSync(dimsRoot)) return [];
    const dimIds = fs.readdirSync(dimsRoot).filter((f) => {
      return fs.statSync(path.join(dimsRoot, f)).isDirectory();
    });
    return dimIds.map((id) => ManifestLoader.loadDim(path.join(dimsRoot, id)));
  }
}

module.exports = ManifestLoader;
