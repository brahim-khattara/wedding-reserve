// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database"; // ✅ Correct import for Realtime Database

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCfbmcnyu_xhdBTdPtlPQ8PlI_mNvQNe8Y",
  authDomain: "reservation-e5a0f.firebaseapp.com",
  projectId: "reservation-e5a0f",
  storageBucket: "reservation-e5a0f.appspot.com", // ✅ Fixed storageBucket URL
  messagingSenderId: "170864320099",
  appId: "1:170864320099:web:ba8259358f2ab223d4a256",
  databaseURL: "https://reservation-e5a0f-default-rtdb.firebaseio.com/" // ✅ Added database URL
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app); // ✅ Correct function for Realtime Database

export { db };
