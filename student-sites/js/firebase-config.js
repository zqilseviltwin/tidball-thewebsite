// Your web app's Firebase configuration
// src/student-sites/js/firebase-config
const firebaseConfig = {
  apiKey: "AIzaSyAdKs2k6y4kkTIWMnk5pLcFOhwWWHaVM3U",
  authDomain: "mr-rama-ibcwebsite.firebaseapp.com",
  projectId: "mr-rama-ibcwebsite",
  storageBucket: "mr-rama-ibcwebsite.firebasestorage.app",
  messagingSenderId: "198928651411",
  appId: "1:198928651411:web:fd6b01e54a27bd6a922966",
  measurementId: "G-8RV80WLM4E"
};
// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();