import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
 plugins: [
 react(),
 VitePWA({
 registerType: 'autoUpdate',
 includeAssets: ['favicon.ico', 'icon-192.svg', 'vite.svg'],
 manifest: {
 name: 'Wellness Check',
 short_name: 'Wellness',
 description: 'Sharing wellness, not surveillance - Monitor elderly loved ones with their consent',
 theme_color: '#4f46e5',
 background_color: '#ffffff',
 display: 'standalone',
 orientation: 'portrait-primary',
 icons: [
 {
 src: '/icon-192.svg',
 sizes: '192x192',
 type: 'image/svg+xml',
 purpose: 'any maskable'
 },
 {
 src: '/icon-192.svg',
 sizes: '512x512',
 type: 'image/svg+xml',
 purpose: 'any maskable'
 }
 ]
 },
 workbox: {
 globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
 runtimeCaching: [
 {
 urlPattern: /^https:\/\/api\./i,
 handler: 'NetworkFirst',
 options: {
 cacheName: 'api-cache',
 expiration: {
 maxEntries: 100,
 maxAgeSeconds: 60 * 60 * 24
 }
 }
 }
 ]
 }
 })
 ],
})
