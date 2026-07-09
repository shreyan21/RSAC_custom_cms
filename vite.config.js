import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __APP_BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
    "import.meta.env.CMS_PROVIDER": JSON.stringify(process.env.CMS_PROVIDER || ""),
  },
})
