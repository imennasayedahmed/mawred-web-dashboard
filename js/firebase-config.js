/* ============================================================
   MAWRED – RFQ Platform | Firebase Configuration
   Loaded via CDN (compat SDK) — no build tools required.
   Must be included AFTER the three Firebase CDN scripts and
   BEFORE auth.js / any other page script.
   ============================================================ */

const firebaseConfig = {
  apiKey: "AIzaSyAFwX5qu9ya3HWg451kh86j2KKAN7-UkG4",
  authDomain: "mawred-aca56.firebaseapp.com",
  projectId: "mawred-aca56",
  storageBucket: "mawred-aca56.firebasestorage.app",
  messagingSenderId: "803833460966",
  appId: "1:803833460966:web:dee5c77aaa46e39c066327",
  measurementId: "G-6YWRT30E8M",
};

// Initialise only once (guard against accidental double-load)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Convenience shorthand used throughout the app
const fbAuth = firebase.auth();
const fbDb   = firebase.firestore();
