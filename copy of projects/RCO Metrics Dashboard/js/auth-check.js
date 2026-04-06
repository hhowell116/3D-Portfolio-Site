import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut as firebaseSignOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

const firebaseConfig = {
  apiKey: "AIzaSyDEn7ooJJ1zATM5oEnx3ByDiOFTFxr_JiA",
  authDomain: "rco-metrics-d0f3b.firebaseapp.com",
  projectId: "rco-metrics-d0f3b",
  storageBucket: "rco-metrics-d0f3b.firebasestorage.app",
  messagingSenderId: "1021645263850",
  appId: "1:1021645263850:web:dfd5c7cd0bd99762679893",
  measurementId: "G-DR5MLDL5BG"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

let hasCheckedAuth = false;

onAuthStateChanged(auth, (user) => {
  if (hasCheckedAuth) return;
  hasCheckedAuth = true;

  if (!user) {
    window.location.replace('../html/login.html');
  } else {
    const userAvatar = document.getElementById('userAvatar');
    if (userAvatar && user.photoURL) {
      userAvatar.src = user.photoURL;
    }
  }
});

window.signOutUser = async function() {
  try {
    hasCheckedAuth = false;
    await firebaseSignOut(auth);
    window.location.replace('../html/login.html');
  } catch (error) {
    console.error('Sign out error:', error);
    alert('Failed to sign out. Please try again.');
  }
};
