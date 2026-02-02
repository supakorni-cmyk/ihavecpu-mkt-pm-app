import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from "firebase/firestore";

// REPLACE THIS WITH YOUR ACTUAL FIREBASE CONFIG FROM THE CONSOLE
const firebaseConfig = {
  apiKey: "AIzaSyCcIWiaMO8T-K4EQQHN6kOmyDxmSRv_ShI",
  authDomain: "ihavecpu-marketing.firebaseapp.com",
  projectId: "ihavecpu-marketing",
  storageBucket: "ihavecpu-marketing.firebasestorage.app",
  messagingSenderId: "935871713420",
  appId: "1:935871713420:web:702382d6e5a33657df6ba9"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// 🟢 FIX: Use initializeFirestore with Long Polling to stop the RPC Stream error
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true, // Forces stable HTTP connection
  localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
  })
});