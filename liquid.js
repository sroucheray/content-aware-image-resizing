var img = document.querySelector('img');
function trigger(){
    var liquidImage = new LiquidImage(img);
}

if (img.complete) {
    trigger();
} else {
    img.addEventListener('load', trigger);
}