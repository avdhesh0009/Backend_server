import firebase from 'firebase/compat/app'
const firebaseConfig = {
  apiKey: "AIzaSyBLPfs1eh1eFFgaH-cuBXafqccaCx0Xhyg",
  authDomain: "backend-check-6f53b.firebaseapp.com",
  projectId: "backend-check-6f53b",
  storageBucket: "backend-check-6f53b.appspot.com",
  messagingSenderId: "645583837160",
  appId: "1:645583837160:web:9b79056dad4c60ee14b65d"
};

export const app = firebase.initializeApp(firebaseConfig);