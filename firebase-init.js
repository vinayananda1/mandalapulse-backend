// 🔐 MandalaPulse Firebase Invocation — sealed on 2025-10-15 IST

import { initializeApp } from "firebase/app";
import { getDatabase, ref, set } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyC_ZgFPk96jknJHGM23QNbC14utVbpBZzM",
  authDomain: "mandalapulse108.firebaseapp.com",
  projectId: "mandalapulse108",
  storageBucket: "mandalapulse108.appspot.com",
  messagingSenderId: "646421365207",
  appId: "1:646421365207:web:d0efbb1484362bbcae8b92"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// 🧾 Sample invocation
set(ref(db, 'users/vinayananda'), {
  password: "sacred123",
  role: "admin",
  meeting: {
    time: "13:00",
    status: "scheduled"
  }
});