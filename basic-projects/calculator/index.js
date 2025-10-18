const display = document.getElementById("display");

function appendToDisplay(input){
    if(display.value == "ERROR"){
        clearDisplay();
    }
    display.value += input;
}

function clearDisplay(){
    display.value = "";
}

function calculate(){
    try{
        if(display.value == "" || display.value == "ERROR"){
            display.value = "";
        }
        else{
            display.value = eval(display.value);
        }
    }
    catch(error){
        display.value = "ERROR";
        console.error(error)
    }
}