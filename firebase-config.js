// firebase-config.js
console.log("🔥 Firebase লোড হচ্ছে...");

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCDrb8fC3-nmDWAj85T9bqSaMKB9otnRgQ",
  authDomain: "reyrtyreyrty.firebaseapp.com",
  projectId: "reyrtyreyrty",
  storageBucket: "reyrtyreyrty.firebasestorage.app",
  messagingSenderId: "125368788252",
  appId: "1:125368788252:web:2bc2907576ff2239d5c6d9",
  measurementId: "G-ZYXG4GS7XE"
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