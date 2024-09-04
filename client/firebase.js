import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBKigUW6kExGlW9aCJ8XI0PsG_lkjEdX6s",
  authDomain: "business-agent-febff.firebaseapp.com",
  projectId: "business-agent-febff",
  storageBucket: "business-agent-febff.appspot.com",
  messagingSenderId: "1041974509399",
  appId: "1:1041974509399:web:bd19282ed567a78bc6c812",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
