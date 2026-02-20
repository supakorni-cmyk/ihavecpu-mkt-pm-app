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

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize Google Provider
  const googleProvider = new GoogleAuthProvider();
  
  // 🟢 1. ADD THE GMAIL PERMISSION SCOPE
  googleProvider.addScope('https://www.googleapis.com/auth/gmail.readonly');

  function signup(email, password) {
    return createUserWithEmailAndPassword(auth, email, password);
  }

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  // 🟢 2. UPDATE TO AWAIT THE POPUP AND EXTRACT THE TOKEN
  async function loginWithGoogle() {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      
      // Extract the Google Access Token
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      
      // Save it to localStorage so your email component can find it
      if (token) {
        localStorage.setItem('gmail_token', token);
      }
      
      return result.user;
    } catch (error) {
      console.error("Google Login Error:", error);
      throw error;
    }
  }

  // 🟢 3. CLEAR THE TOKEN WHEN LOGGING OUT
  function logout() {
    localStorage.removeItem('gmail_token');
    return signOut(auth);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Add loginWithGoogle to the value object
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