import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const editorGuideAsset = {
  name: 'rsac-editor-guide',
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: 'CMS_USER_GUIDE.md',
      source: readFileSync(resolve('CMS_USER_GUIDE.md'), 'utf8'),
    })
  },
}

export default defineConfig({
  plugins: [react(), tailwindcss(), editorGuideAsset],
  define: {
    __APP_BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
    "import.meta.env.CMS_PROVIDER": JSON.stringify(process.env.CMS_PROVIDER || ""),
  },
})
