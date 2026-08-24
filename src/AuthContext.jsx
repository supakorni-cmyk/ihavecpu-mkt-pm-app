/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "./firebase";
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";

const AuthContext = createContext();
const ALLOWED_DOMAIN = "@ihavecpu.com";

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize Google Provider
  const googleProvider = new GoogleAuthProvider();
  googleProvider.addScope('https://www.googleapis.com/auth/gmail.readonly');

  // 🟢 1. ENFORCE DOMAIN RESTRICTION ON SIGNUP
  function signup(email, password) {
    if (!email.toLowerCase().endsWith(ALLOWED_DOMAIN)) {
      return Promise.reject(new Error(`Access denied: Registration is restricted to ${ALLOWED_DOMAIN} email accounts.`));
    }
    return createUserWithEmailAndPassword(auth, email, password);
  }

  // 🟢 2. ENFORCE DOMAIN RESTRICTION ON EMAIL LOGIN
  async function login(email, password) {
    if (!email.toLowerCase().endsWith(ALLOWED_DOMAIN)) {
      throw new Error(`Access denied: Only ${ALLOWED_DOMAIN} email accounts are allowed.`);
    }
    const result = await signInWithEmailAndPassword(auth, email, password);
    if (!result.user.email?.toLowerCase().endsWith(ALLOWED_DOMAIN)) {
      await signOut(auth);
      throw new Error(`Access denied: Only ${ALLOWED_DOMAIN} email accounts are allowed.`);
    }
    return result;
  }

  // 🟢 3. ENFORCE DOMAIN RESTRICTION ON GOOGLE POPUP LOGIN
  async function loginWithGoogle() {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      
      // Verify user's Google email domain
      if (!result.user.email?.toLowerCase().endsWith(ALLOWED_DOMAIN)) {
        await signOut(auth);
        localStorage.removeItem('gmail_token');
        throw new Error(`Access denied: Only ${ALLOWED_DOMAIN} email accounts are allowed.`);
      }

      // Extract & store the Google Access Token if authorized
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      if (token) {
        localStorage.setItem('gmail_token', token);
      }
      
      return result.user;
    } catch (error) {
      console.error("Google Login Error:", error);
      throw error;
    }
  }

  function logout() {
    localStorage.removeItem('gmail_token');
    return signOut(auth);
  }

  // 🟢 4. STATE GUARD: AUTOMATICALLY DISCONNECT UNAUTHORIZED USERS
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && !user.email?.toLowerCase().endsWith(ALLOWED_DOMAIN)) {
        await signOut(auth);
        localStorage.removeItem('gmail_token');
        setCurrentUser(null);
      } else {
        setCurrentUser(user);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = { 
    currentUser, 
    signup, 
    login, 
    loginWithGoogle, 
    logout 
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}