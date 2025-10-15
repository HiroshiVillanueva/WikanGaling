
const sidebar = document.getElementById("SideBarMenu");
const bttn = document.getElementById("WidthChanger");

const sb_page_Menu = document.getElementById("pageMenu");
const sb_Logo = document.getElementById("imgLogo");
const sb_HR = document.getElementById("sideBarHR");
const sb_save_Menu = document.getElementById("SavesMenu");
const sb_saves_Page = document.getElementById("SavesPage");
const sb_Context = document.getElementById("SidebarContext");
const lnk1 = document.getElementById("pageButtonTitle1");
const lnk2 = document.getElementById("pageButtonTitle2");
const lnk3 = document.getElementById("pageButtonTitle3");
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

    lnk1.style.opacity = '0';
    lnk2.style.opacity = '0';
    lnk3.style.opacity = '0';

    lnk1.style.color = 'white';
    lnk2.style.color = 'white';
    lnk3.style.color = 'white';
     
    lnk1.innerHTML = '‎ ';
    lnk2.innerHTML = '‎ ';
    lnk3.innerHTML = '‎ ';

    sb_Context.style.opacity = '0';
    sb_HR.style.opacity = '0';
    sb_Logo.style.opacity = '0';
    sb_save_Menu.style.opacity = '0';
    sb_save_Menu.style.width = '167.4px';

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

    lnk1.style.opacity = '100%';
    lnk2.style.opacity = '100%';
    lnk3.style.opacity = '100%';

    lnk1.style.color = 'black';
    lnk2.style.color = 'black';
    lnk3.style.color = 'black';
     
    lnk1.innerHTML = 'HOME';
    lnk2.innerHTML = 'EDITOR';
    lnk3.innerHTML = 'DASHBOARD';

    sb_Context.style.opacity = '100%';
    sb_HR.style.opacity = '100%';
    sb_Logo.style.opacity = '100%';
    sb_save_Menu.style.opacity = '100%';
    sb_save_Menu.style.width = '167.4px';
    
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

    lnk1.style.opacity = '0';
    lnk2.style.opacity = '0';
    lnk3.style.opacity = '0';

    lnk1.style.color = 'white';
    lnk2.style.color = 'white';
    lnk3.style.color = 'white';
     
    lnk1.innerHTML = '‎ ';
    lnk2.innerHTML = '‎ ';
    lnk3.innerHTML = '‎ ';

    sb_Context.style.opacity = '0';
    sb_HR.style.opacity = '0';
    sb_Logo.style.opacity = '0';
    sb_save_Menu.style.opacity = '0';
    sb_save_Menu.style.width = '167.4px';

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