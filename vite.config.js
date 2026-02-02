import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // 🟢 Load env variables manually to debug them
  const env = loadEnv(mode, process.cwd(), '');
  
  // 🟢 PRINT TO TERMINAL
  console.log("========================================");
  console.log("🔍 TERMINAL DEBUG: VITE_GOOGLE_SCRIPT_URL is:", env.VITE_GOOGLE_SCRIPT_URL);
  console.log("========================================");

  return {
    plugins: [react()],
  }
})