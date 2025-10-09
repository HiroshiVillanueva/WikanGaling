const home = document.getElementById('page_1');
const create = document.getElementById('page_2');
const library = document.getElementById('page_3');

const backgroundColor = '#0011423e';

function Highlights(status) {
    if(status == 1) {
        home.style.backgroundColor = backgroundColor;
    }else if(status == 2) {
        create.style.backgroundColor = backgroundColor;
    }else if(status == 3) {
        library.style.backgroundColor = backgroundColor;
    }
}