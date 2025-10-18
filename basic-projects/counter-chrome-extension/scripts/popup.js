const addBtn = document.getElementById("addBtn");
const subtractBtn = document.getElementById("subtractBtn");
const countLabel = document.getElementById("count");

let count = 0;

renderCount();

addBtn.addEventListener("click", function(){
    count++
    storeCount();
    sendMessage(String(count));
});
subtractBtn.addEventListener("click", function(){
    count--
    storeCount();
    sendMessage(String(count));
});

function renderCount(){
    if(localStorage.getItem("count")){
        count = localStorage.getItem("count");
        countLabel.textContent = count;
    }
}

function storeCount(){
    countLabel.textContent = count;
    localStorage.setItem("count", count);
}

function sendMessage(msg){
    chrome.runtime.sendMessage(msg, (response) => {
        console.log(`Current count: ${msg}`, response);
    })
}