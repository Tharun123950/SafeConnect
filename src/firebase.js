import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDQseLhhaTVcNOjTEmf4-AZ0u-0jX5XMgg",
  authDomain: "safeconnect-d7600.firebaseapp.com",
  projectId: "safeconnect-d7600",
  storageBucket: "safeconnect-d7600.firebasestorage.app",
  messagingSenderId: "377244298033",
  appId: "1:377244298033:web:56f8cc13ddfedad5c1de10",
  measurementId: "G-1RY0072EF9"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { app, auth };
