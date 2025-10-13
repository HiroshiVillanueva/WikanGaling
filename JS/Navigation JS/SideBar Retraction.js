
const sidebar = document.getElementById("SideBarMenu");
const bttn = document.getElementById("WidthChanger");

const sb_page_Menu = document.getElementById("pageMenu");
const sb_Logo = document.getElementById("imgLogo");
const sb_HR = document.getElementById("sideBarHR");
const sb_save_Menu = document.getElementById("SavesMenu");
const sb_Context = document.getElementById("SidebarContext");
const lnk1 = document.getElementById("link_1");
const lnk2 = document.getElementById("link_2");
const lnk3 = document.getElementById("link_3");
const cont = document.getElementById("content");
const ig1 = document.getElementById("img1");
const ig2 = document.getElementById("img2");
const ig3 = document.getElementById("img3");

const arrow = document.getElementById("ArrowBtn");

let setter;

// window.onload = function() { 
//     if(localStorage.getItem('status') == 'Retracted') {
//         localStorage.setItem('status', 'Extended');
//         setter = localStorage.getItem('status');
//         Ext_Rec();
//     }
// }

window.onload = function() {
    sidebar.style.width = rectWidth;
    bttn.style.transform = "translateX(" + rectWidthButton + ")";
    arrow.style.rotate = "0deg";

    localStorage.setItem('status', 'Retracted');
    setter = localStorage.getItem('status');

    cont.style.padding = '1em 1em 0em 5em';

    lnk1.style.display = 'none';
    lnk2.style.display = 'none';
    lnk3.style.display = 'none';

    sb_Context.style.opacity = '0';
    sb_HR.style.opacity = '0';
    sb_Logo.style.opacity = '0';
    sb_save_Menu.style.opacity = '0';

    ig1.style.marginLeft = "28%";
    ig2.style.marginLeft = "28%";
    ig3.style.marginLeft = "28%";      
}




sidebar.addEventListener('mouseover', () => {
    sidebar.style.width = extWidth;
    bttn.style.transform = "translateX(" + extWidthButton +")";
    arrow.style.rotate = "180deg";

    localStorage.setItem('status', 'Extended');
    setter = localStorage.getItem('status');

    cont.style.padding = '1em 1em 0em 16em';

    lnk1.style.display = 'block';
    lnk2.style.display = 'block';
    lnk3.style.display = 'block';

    sb_Context.style.opacity = '100%';
    sb_HR.style.opacity = '100%';
    sb_Logo.style.opacity = '100%';
    sb_save_Menu.style.opacity = '100%';
    
    ig1.style.marginLeft = "15%";
    ig2.style.marginLeft = "15%";
    ig3.style.marginLeft = "15%"; 
})

sidebar.addEventListener('mouseout', () => {
    sidebar.style.width = rectWidth;
    bttn.style.transform = "translateX(" + rectWidthButton + ")";
    arrow.style.rotate = "0deg";

    localStorage.setItem('status', 'Retracted');
    setter = localStorage.getItem('status');

    cont.style.padding = '1em 1em 0em 5em';

    lnk1.style.display = 'none';
    lnk2.style.display = 'none';
    lnk3.style.display = 'none';

    sb_Context.style.opacity = '0';
    sb_HR.style.opacity = '0';
    sb_Logo.style.opacity = '0';
    sb_save_Menu.style.opacity = '0';

    ig1.style.marginLeft = "28%";
    ig2.style.marginLeft = "28%";
    ig3.style.marginLeft = "28%"; 
})

setter = localStorage.getItem('status');

rectWidth = "4em"
extWidth = "15em"
rectWidthButton = "2.75em"
extWidthButton = "8.25em"

function Ext_Rec() {
    if(setter == "Extended") {
        sidebar.style.width = rectWidth;
        bttn.style.transform = "translateX(" + rectWidthButton + ")";
        arrow.style.rotate = "0deg";

        localStorage.setItem('status', 'Retracted');
        setter = localStorage.getItem('status');

        cont.style.padding = '1em 1em 0em 5em';

        lnk1.style.display = 'none';
        lnk2.style.display = 'none';
        lnk3.style.display = 'none';

        sb_Context.style.opacity = '0';
        sb_HR.style.opacity = '0';
        sb_Logo.style.opacity = '0';
        sb_save_Menu.style.opacity = '0';

        ig1.style.marginLeft = "28%";
        ig2.style.marginLeft = "28%";
        ig3.style.marginLeft = "28%";
    }
    else {
        sidebar.style.width = extWidth;
        bttn.style.transform = "translateX(" + extWidthButton +")";
        arrow.style.rotate = "180deg";

        localStorage.setItem('status', 'Extended');
        setter = localStorage.getItem('status');

        cont.style.padding = '1em 1em 0em 16em';

        lnk1.style.display = 'block';
        lnk2.style.display = 'block';
        lnk3.style.display = 'block';

        sb_Context.style.opacity = '100%';
        sb_HR.style.opacity = '100%';
        sb_Logo.style.opacity = '100%';
        sb_save_Menu.style.opacity = '100%';
        
        ig1.style.marginLeft = "15%";
        ig2.style.marginLeft = "15%";
        ig3.style.marginLeft = "15%";
    }
}