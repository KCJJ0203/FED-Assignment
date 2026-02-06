const firebaseConfig = {
  apiKey: "AIzaSyBc5jOMf7hfbWa_65JFcdAMwSKyxtLSCvs",
  authDomain: "fed-assignment-9c219.firebaseapp.com",
  databaseURL: "https://fed-assignment-9c219-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "fed-assignment-9c219",
  storageBucket: "fed-assignment-9c219.firebasestorage.app",
  messagingSenderId: "287410844855",
  appId: "1:287410844855:web:8c15e5cbe42c321b1e0932",
  measurementId: "G-CJBDRY9RQ5"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const MY_STALL_ID = "0tPLvlPufTsDZ3jH6m5E"; 

document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
});

function loadSettings() {
    db.collection("stalls").doc(MY_STALL_ID).get()
      .then((doc) => {
          if (doc.exists) {
              const data = doc.data();
              document.getElementById('inp-stall-name').value = data.stallName || "";
              document.getElementById('inp-banner').value = data.bannerUrl || "";
              
              document.getElementById('inp-uen').value = data.uen || "";
              document.getElementById('inp-takeaway').value = data.takeawayCharge || "0.30";
              document.getElementById('inp-footer').value = data.receiptFooter || "";
              
              if (data.stallName) {
                  document.getElementById('header-stall-name').innerText = data.stallName;
              }
          }
      });
}

function saveSettings() {
    const btn = document.querySelector('.btn-green');
    const originalText = btn.innerHTML;
    btn.innerText = "Saving...";

    const newName = document.getElementById('inp-stall-name').value;
    const newBanner = document.getElementById('inp-banner').value;
    
    const newUen = document.getElementById('inp-uen').value;
    const newTakeaway = document.getElementById('inp-takeaway').value;
    const newFooter = document.getElementById('inp-footer').value;

    db.collection("stalls").doc(MY_STALL_ID).update({
        stallName: newName,
        bannerUrl: newBanner,
        uen: newUen,
        takeawayCharge: newTakeaway,
        receiptFooter: newFooter
    }).then(() => {
        showToast("Settings Saved Successfully!");
        btn.innerHTML = originalText;
        
        document.getElementById('header-stall-name').innerText = newName;
    }).catch((error) => {
        console.error(error);
        showToast("Error Saving Settings", true);
        btn.innerHTML = originalText;
    });
}

function showToast(message, isError = false) {
    const toast = document.getElementById("toast-container");
    const msgSpan = document.getElementById("toast-message");
    
    msgSpan.innerText = message;
    
    if (isError) {
        toast.style.borderLeftColor = "#E74C3C"; 
        toast.querySelector('.toast-icon').style.color = "#E74C3C";
        toast.querySelector('.toast-icon').className = "fas fa-exclamation-circle toast-icon";
    } else {
        toast.style.borderLeftColor = "#2ECC71"; 
        toast.querySelector('.toast-icon').style.color = "#2ECC71";
        toast.querySelector('.toast-icon').className = "fas fa-check-circle toast-icon";
    }
    
    toast.className = "show";
    
    setTimeout(function(){ 
        toast.className = toast.className.replace("show", ""); 
    }, 3000);
}