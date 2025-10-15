// =================================================================
// 1. DOM ELEMENT SELECTION
// =================================================================
const sidebar = document.getElementById("SideBarMenu");
const bttn = document.getElementById("WidthChanger");
const arrow = document.getElementById("ArrowBtn");
const cont = document.getElementById("content");

// Grouped Sidebar Internal Elements
const sb_Logo = document.getElementById("imgLogo");
const sb_HR = document.getElementById("sideBarHR");
const sb_Context = document.getElementById("SidebarContext");
const sb_save_Menu = document.getElementById("SavesMenu");

// Grouped Link Elements
const lnk1 = document.getElementById("pageButtonTitle1");
const lnk2 = document.getElementById("pageButtonTitle2");
const lnk3 = document.getElementById("pageButtonTitle3");

// Grouped Image Elements
const ig1 = document.getElementById("img1");
const ig2 = document.getElementById("img2");
const ig3 = document.getElementById("img3");


// =================================================================
// 2. CONSTANTS & STATE SETUP
// =================================================================
const rectWidth = "4em";
const extWidth = "15em";
const rectWidthButton = "2.75em";
const extWidthButton = "8.25em";

// KEY for localStorage 
const LOCK_STATE_KEY = "sidebarLocked"; 

// STATE: Tracks if the sidebar is locked open by a button click (starts unlocked)
// The actual state will be loaded in window.onload
let isLocked = false; 

// Timer setup for hover delay
let hoverTimer; 
const HOVER_DELAY_MS = 500; 


// =================================================================
// 3. STATE HELPER FUNCTIONS (Apply Styles)
// =================================================================

/** Applies all styles for the RETRACTED (minimized) state. */
function setRetractedState() {
    // --- Sidebar and Main Content ---
    sidebar.style.width = rectWidth;
    bttn.style.transform = "translateX(" + rectWidthButton + ")";
    arrow.style.rotate = "0deg";
    cont.style.padding = '1em 1em 0em 5em';

    // --- Link Visibility and Text ---
    lnk1.style.opacity = '0';
    lnk2.style.opacity = '0';
    lnk3.style.opacity = '0';
    lnk1.style.color = 'white';
    lnk2.style.color = 'white';
    lnk3.style.color = 'white';
    lnk1.innerHTML = '‎ ';
    lnk2.innerHTML = '‎ ';
    lnk3.innerHTML = '‎ ';

    // --- Internal Content Visibility ---
    sb_Context.style.opacity = '0';
    sb_HR.style.opacity = '0';
    sb_Logo.style.opacity = '0';
    sb_save_Menu.style.opacity = '0';

    // --- Image Alignment ---
    ig1.style.marginLeft = "28%";
    ig2.style.marginLeft = "28%";
    ig3.style.marginLeft = "28%";
}

/** Applies all styles for the EXTENDED (expanded) state. */
function setExtendedState() {
    // --- Sidebar and Main Content ---
    sidebar.style.width = extWidth;
    bttn.style.transform = "translateX(" + extWidthButton +")";
    arrow.style.rotate = "0";
    cont.style.padding = '1em 1em 0em 16em';

    // --- Link Visibility and Text ---
    lnk1.style.opacity = '100%';
    lnk2.style.opacity = '100%';
    lnk3.style.opacity = '100%';
    lnk1.style.color = 'black';
    lnk2.style.color = 'black';
    lnk3.style.color = 'black';
    lnk1.innerHTML = 'HOME';
    lnk2.innerHTML = 'EDITOR';
    lnk3.innerHTML = 'DASHBOARD';

    // --- Internal Content Visibility ---
    sb_Context.style.opacity = '100%';
    sb_HR.style.opacity = '100%';
    sb_Logo.style.opacity = '100%';
    sb_save_Menu.style.opacity = '100%';
    
    // --- Image Alignment ---
    ig1.style.marginLeft = "15%";
    ig2.style.marginLeft = "15%";
    ig3.style.marginLeft = "15%";
}

/** * Sets the sidebar state based on the current 'isLocked' value. 
 * This is used for initial load and after a lock toggle.
 */
function applyLockState(locked) {
    if (locked) {
        // --- LOCKING/LOADING LOCKED ---
        arrow.src = "/Miscellanous/Images/playLock.png";
        setExtendedState();
    } else {
        // --- UNLOCKING/LOADING UNLOCKED ---
        arrow.src = "/Miscellanous/Images/play.png";
        setRetractedState();
    }
}


// =================================================================
// 4. EVENT HANDLERS
// =================================================================

/** Logic to handle mouseover (start timer) */
const handleMouseOver = () => {
    // --- DEBUGGING LOG ---
    console.log("Mouse Over Fired. Locked:", isLocked); 
    // ---------------------
    
    // Only proceed if the sidebar is NOT locked
    if (!isLocked) {
        // Set the state change to happen after the delay
        // NOTE: The original code executed setExtendedState immediately on mouseover. 
        // I've kept it as-is for now, assuming the HOVER_DELAY_MS was placeholder or not fully implemented.
        setExtendedState();
    }
};

/** Logic to handle mouseout (clear timer and retract) */
const handleMouseOut = () => {
    // --- DEBUGGING LOG ---
    console.log("Mouse Out Fired. Locked:", isLocked);
    // ---------------------
    
    // Only proceed if the sidebar is NOT locked
    if (!isLocked) {
        // Retract immediately
        setRetractedState();
    }
};

/** Toggles the permanent lock state of the sidebar and saves it to localStorage. */
function toggleLock() {
    // 1. Invert the lock state
    isLocked = !isLocked; 
    console.log("Toggle Lock Fired. New Locked State:", isLocked);

    // 2. Save the new state to localStorage
    // localStorage only stores strings, so we convert the boolean
    localStorage.setItem(LOCK_STATE_KEY, isLocked.toString());

    // 3. Apply the state (handles style changes)
    applyLockState(isLocked);
}


// =================================================================
// 5. INITIALIZATION
// =================================================================

function loadLockState() {
    // 1. Check localStorage for the saved state
    const savedState = localStorage.getItem(LOCK_STATE_KEY);
    
    // 2. If a state is found, set isLocked based on it
    // 'true' string from localStorage -> true boolean
    // null or other string -> false boolean (default unlocked)
    if (savedState !== null) {
        isLocked = (savedState === 'true');
    } else {
        // If no saved state, default to unlocked
        isLocked = false;
    }
    
    // 3. Apply the initial state (either loaded or default)
    applyLockState(isLocked);
    console.log("Initial State Loaded. isLocked:", isLocked);
}


window.onload = function() {
    // 1. Load and apply the stored lock state from previous session
    loadLockState();
    
    // 2. Set the one-off style
    sb_save_Menu.style.width = '190px'; 
    
    // 3. Attach hover listeners ONCE to the main sidebar element
    // The handlers themselves check the current 'isLocked' state
    sidebar.addEventListener('mouseover', handleMouseOver);
    sidebar.addEventListener('mouseout', handleMouseOut);
    
    // 4. Attach the toggle function to the arrow button
    arrow.addEventListener('click', toggleLock);
}