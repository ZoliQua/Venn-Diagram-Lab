import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { copyFileSync, mkdirSync, readdirSync } from 'fs'

function copyModelsPlugin() {
  return {
    name: 'copy-models',
    writeBundle() {
      // Copy models/svg/*.svg
      const svgSrc = resolve(__dirname, 'models/svg')
      const svgDst = resolve(__dirname, 'dist/models/svg')
      mkdirSync(svgDst, { recursive: true })
      for (const file of readdirSync(svgSrc)) {
        if (file.endsWith('.svg')) {
          copyFileSync(resolve(svgSrc, file), resolve(svgDst, file))
        }
      }
      // Copy models/json/*.json
      const jsonSrc = resolve(__dirname, 'models/json')
      const jsonDst = resolve(__dirname, 'dist/models/json')
      mkdirSync(jsonDst, { recursive: true })
      for (const file of readdirSync(jsonSrc)) {
        if (file.endsWith('.json')) {
          copyFileSync(resolve(jsonSrc, file), resolve(jsonDst, file))
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
