const continueAsGuestButton = document.getElementById("continueAsGuest");
continueAsGuestButton.addEventListener("click", () => {
  localStorage.setItem("userType", "guest");
  window.location.href = "customer-guest/index.html";
});

const signInButton = document.getElementById("signInButton");
signInButton.addEventListener("click", () => {
  window.location.href = "login.html";
});
