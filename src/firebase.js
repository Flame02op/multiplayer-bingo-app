import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCtW5g25X_nau88oHKhn90Y-xFTt6M8pe4",
  authDomain: "multiplayer-ai-bingo.firebaseapp.com",
  databaseURL: "https://multiplayer-ai-bingo-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "multiplayer-ai-bingo",
  storageBucket: "multiplayer-ai-bingo.firebasestorage.app",
  messagingSenderId: "555899079525",
  appId: "1:555899079525:web:e414628457170bfe21af8c",
  measurementId: "G-MT5J2JQ2BS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);