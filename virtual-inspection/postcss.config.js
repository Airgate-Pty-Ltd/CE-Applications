import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

// Tailwind searches for its config relative to the working directory. Pointing
// it at the file explicitly means the theme resolves the same way regardless of
// where the process was started from.
const here = dirname(fileURLToPath(import.meta.url))

export default {
  plugins: [tailwindcss({ config: join(here, 'tailwind.config.js') }), autoprefixer()],
}
