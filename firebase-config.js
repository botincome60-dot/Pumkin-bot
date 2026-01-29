// firebase-config.js
console.log("🔥 Firebase লোড হচ্ছে...");

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyABdp9WK7eGLwE5nY19jp-nlDlyTuTyMR0",
  authDomain: "sohojincome-36f1f.firebaseapp.com",
  projectId: "sohojincome-36f1f",
  storageBucket: "sohojincome-36f1f.firebasestorage.app",
  messagingSenderId: "398153090805",
  appId: "1:398153090805:web:fc8d68130afbc2239be7bc",
  measurementId: "G-VZ47961SJV"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();

// Initialize Firebase Analytics (optional)
if (firebase.analytics) {
  firebase.analytics();
}

console.log("✅ Firebase ইনিশিয়ালাইজড হয়েছে");