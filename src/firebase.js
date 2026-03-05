import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB-6w7Fb-fRwJtFsA6oGQZGoGcfH0CYSNo",
  authDomain: "goalflow-f3444.firebaseapp.com",
  projectId: "goalflow-f3444",
  storageBucket: "goalflow-f3444.firebasestorage.app",
  messagingSenderId: "128633463123",
  appId: "1:128633463123:web:b6e8f62b266bd56d8e41a6"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;