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
      // Copy data/*.csv
      const dataSrc = resolve(__dirname, 'data')
      const dataDst = resolve(__dirname, 'dist/data')
      mkdirSync(dataDst, { recursive: true })
      for (const file of readdirSync(dataSrc)) {
        if (file.endsWith('.csv')) {
          copyFileSync(resolve(dataSrc, file), resolve(dataDst, file))
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
      // Copy publications/*.pdf
      const publicationsSrc = resolve(__dirname, 'publications')
      const publicationsDst = resolve(__dirname, 'dist/publications')
      mkdirSync(publicationsDst, { recursive: true })
      for (const file of readdirSync(publicationsSrc)) {
        if (file.endsWith('.pdf')) {
          copyFileSync(resolve(publicationsSrc, file), resolve(publicationsDst, file))
        }
      }
      // Copy credits/*.{jpg,jpeg,png} (author portraits referenced by WelcomeDialog).
      // In dev, the server allows fs reads from the project root so the images
      // resolve directly. In production, the dist/ tree must contain them.
      const creditsSrc = resolve(__dirname, 'credits')
      const creditsDst = resolve(__dirname, 'dist/credits')
      mkdirSync(creditsDst, { recursive: true })
      for (const file of readdirSync(creditsSrc)) {
        if (/\.(jpe?g|png)$/i.test(file)) {
          copyFileSync(resolve(creditsSrc, file), resolve(creditsDst, file))
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
