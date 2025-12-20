import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { copyFileSync, mkdirSync, readdirSync } from 'fs'

function copyModelsPlugin() {
  return {
    name: 'copy-models',
    writeBundle() {
      const srcDir = resolve(__dirname, 'models')
      const destDir = resolve(__dirname, 'dist/models')
      mkdirSync(destDir, { recursive: true })
      for (const file of readdirSync(srcDir)) {
        if (file.endsWith('.svg')) {
          copyFileSync(resolve(srcDir, file), resolve(destDir, file))
        }
      }
    }
  }
}

export default defineConfig({
  plugins: [react(), copyModelsPlugin()],
  base: './',
  server: {
    fs: {
      allow: ['.']
    }
  }
})
