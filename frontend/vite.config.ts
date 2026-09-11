import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import mkcert from 'vite-plugin-mkcert'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), mkcert()],
  server: {
    host: true,
    // Frontend HTTPS (mkcert, kamera erişimi için gerekli) + backend'in düz HTTP olması
    // "mixed content" engeline yol açıyordu: localhost tarayıcılarca güvenli sayıldığı için
    // PC'de sorun görünmüyordu, ama telefon LAN IP'sinden bağlanınca tarayıcı insecure
    // http:// isteğini sessizce engelliyordu. Çözüm: backend'i doğrudan çağırmak yerine
    // aynı origin üzerinden (/api) proxy'lemek — tarayıcı artık tamamen same-origin bir
    // istek görüyor, TLS uyuşmazlığı da CORS de devreye girmiyor. Proxy isteği Vite'ın kendi
    // Node sürecinden (tarayıcıdan değil) gittiği için düz HTTP backend'e sorunsuz ulaşır.
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
