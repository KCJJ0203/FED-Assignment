function toggleRentalMenu() {
    const menu = document.getElementById('rentalDropdown');
    if (menu.style.display === "block") {
        menu.style.display = "none";
    } else {
        menu.style.display = "block";
    }
}

function showAgreementDetails() {
    const modal = document.getElementById('agreementModal');
    modal.style.display = 'flex'; 
}

function closeModal() {
    const modal = document.getElementById('agreementModal');
    modal.style.display = 'none';
}

window.onclick = function(event) {
    const modal = document.getElementById('agreementModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
    
    if (!event.target.matches('.fa-ellipsis-h')) {
        const dropdowns = document.getElementsByClassName("menu-dropdown");
        for (let i = 0; i < dropdowns.length; i++) {
            if (dropdowns[i].style.display === "block") {
                dropdowns[i].style.display = "none";
            }
        }
    }
}

function showAllItems() {
    document.getElementById('itemsModal').style.display = 'flex';
}

function closeItemsModal() {
    document.getElementById('itemsModal').style.display = 'none';
}

window.onclick = function(event) {
    const agreementModal = document.getElementById('agreementModal');
    const itemsModal = document.getElementById('itemsModal');
    
    if (event.target === agreementModal) {
        agreementModal.style.display = 'none';
    }
    
    if (event.target === itemsModal) {
        itemsModal.style.display = 'none';
    }
    
    if (!event.target.matches('.fa-ellipsis-h')) {
        const dropdowns = document.getElementsByClassName("menu-dropdown");
        for (let i = 0; i < dropdowns.length; i++) {
            if (dropdowns[i].style.display === "block") {
                dropdowns[i].style.display = "none";
            }
        }
    }
}

function showToast(message, isError = false) {
    const toast = document.getElementById("toast-container");
    const msgSpan = document.getElementById("toast-message");
    
    msgSpan.innerText = message;
    
    if (isError) {
        toast.style.borderLeftColor = "#E74C3C"; // Red
        toast.querySelector('.toast-icon').style.color = "#E74C3C";
        toast.querySelector('.toast-icon').className = "fas fa-exclamation-circle toast-icon";
    } else {
        toast.style.borderLeftColor = "#2ECC71"; // Green
        toast.querySelector('.toast-icon').style.color = "#2ECC71";
        toast.querySelector('.toast-icon').className = "fas fa-check-circle toast-icon";
    }
    
    toast.className = "show";
    
    setTimeout(function(){ 
        toast.className = toast.className.replace("show", ""); 
    }, 3000);
}