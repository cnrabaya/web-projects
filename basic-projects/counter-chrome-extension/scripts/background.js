chrome.runtime.onInstalled.addListener(function(){
    console.log("ampogi mo");
    chrome.runtime.onMessage.addListener((message, callback, sendResponse) => {
        console.log(message);
        sendResponse(`Count noted: ${message}`);
    })
});