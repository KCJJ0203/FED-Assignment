/* ------------- RUN COUNT UPDATE ------------- */
document.addEventListener('DOMContentLoaded', () => {
    updateColumnCounts();
});

/* ------------- MOVE LOGIC ------------- */
function moveOrder(cardId, targetColumnId) {
    const card = document.getElementById(cardId);
    const targetColumn = document.getElementById(targetColumnId);

    if (card && targetColumn) {
        targetColumn.appendChild(card);

        const badge = card.querySelector('.badge-new');
        if (badge) badge.remove();

        updateCardButtons(card, cardId, targetColumnId);
        
        updateColumnCounts();
    }
}

function updateCardButtons(card, cardId, targetColumnId) {
    const actionArea = card.querySelector('.action-area');
    if (actionArea) actionArea.innerHTML = ''; 

    if (targetColumnId === 'col-cooking') {
        actionArea.className = 'action-area btn-group'; 
        actionArea.innerHTML = `
            <button class="btn-outline" onclick="alert('Edit Order Function')">EDIT</button>
            <button class="btn-green" onclick="moveOrder('${cardId}', 'col-ready')">
                <i class="fas fa-check"></i> Ready
            </button>
        `;
    } 
    else if (targetColumnId === 'col-ready') {
        actionArea.className = 'action-area'; 
        actionArea.innerHTML = `
            <button class="btn-grey" onclick="this.closest('.order-card').remove(); updateColumnCounts();">
                COMPLETE
            </button>
        `;
        
        const timer = card.querySelector('.timer');
        if(timer) {
            timer.innerHTML = 'COLLECTION';
            timer.style.color = '#2ECC71';
            timer.style.fontWeight = 'bold';
            timer.className = 'timer'; 
        }
    }
}

function updateColumnCounts() {
    const ids = ['col-new', 'col-cooking', 'col-ready'];
    ids.forEach(id => {
        const count = document.getElementById(id).querySelectorAll('.order-card').length;
        document.querySelector(`#${id} .count-badge`).innerText = count;
    });
}