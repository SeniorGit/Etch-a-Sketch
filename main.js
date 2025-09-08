const divs = document.querySelector("#container");

let mouseDown = false;
let eraseMode = false;


document.body.addEventListener('mousedown', () => {
    mouseDown = true;
})

document.body.addEventListener('mouseup', () => {
    mouseDown = false;
})

function CreateSketch(size){
    divs.innerHTML = "";
    const Container = divs.clientWidth;
    const sketchSize = Container / size;

    for(let i = 0; i < size * size; i++){
        const square = document.createElement('div');
        square.classList.add('square');
        square.style.width = `${sketchSize}px`;
        square.style.height = `${sketchSize}px`;

        square.addEventListener("mousedown", ()=>{
            if (eraseMode){
                square.classList.remove("colored");
            } else {
                square.classList.add("colored");
            }
        });

        square.addEventListener("mouseover", ()=>{
            if(mouseDown){
                if(eraseMode){
                    square.classList.remove("colored");
                } else {
                    square.classList.add("colored");
                }
            }
        });

        divs.appendChild(square);
    }
}


const drawBtn = document.querySelector('#drawBtn');  
const eraseBtn = document.querySelector('#eraseBtn');

eraseBtn.addEventListener("click", ()=>{
    eraseMode = true;
    eraseBtn.classList.add('active');
    drawBtn.classList.remove('active'); 
})

drawBtn.addEventListener('click', ()=>{
    eraseMode = false;
    drawBtn.classList.add('active');
    eraseBtn.classList.remove('active');
})

const gridSizeSlider = document.querySelector("#gridSize");
const gridSizeValue = document.querySelector("#gridSizeValue");

gridSizeSlider.addEventListener("input", () => {
  const size = gridSizeSlider.value;
  gridSizeValue.textContent = `${size} x ${size}`;
  CreateSketch(size);  
});


CreateSketch(16);
