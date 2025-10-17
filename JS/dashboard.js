// =================================================================
// 1. CONFIGURATION & INITIALIZATION
// =================================================================

// Use your existing Supabase keys
const SUPABASE_URL = "https://aliyyqinorqlwmjhbqza.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsaXl5cWlub3JxbHdtamhicXphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxMDY2OTgsImV4cCI6MjA3NDY4MjY5OH0.wqmf23uvtil0BJ0qlk8qm_Wq7LsaD1ClZKwnDr1OxME"; 
const FORMS_TABLE = 'module';
const ATTEMPTS_TABLE = 'activity_attempts'; 
// NEW CONSTANT: Table for student names
const STUDENTS_TABLE = 'students'; 

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY); 

// =================================================================
// NEW: ATTEMPTS MODAL COMPONENT (Non-blocking notification)
// =================================================================

/**
 * A simple, unstyled modal component to display the list of attempts.
 */
function AttemptsModal({ moduleTitle, attempts, onClose }) {
    // NEW STATE: To store the search input value
    const [searchTerm, setSearchTerm] = React.useState('');

    if (!attempts && moduleTitle) {
        // Simple loading state
        return (
             <div style={{
                position: 'fixed', top: 0, left: 0, width: '50vw', height: '100%',
                backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center',
                alignItems: 'center', zIndex: 1000
            }}>
                <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '5px', width: '50vw' }}>
                    Loading attempts for "{moduleTitle}"...
                </div>
            </div>
        );
    }

    if (!attempts) return null; // Don't render if no data is passed (closed or initial state)

    // Helper function to format the timestamp (kept from original)
    const formatTimestamp = (timestamp) => {
        if (!timestamp) return 'N/A';
        const options = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return new Date(timestamp).toLocaleDateString(undefined, options);
    };
    
    // NEW LOGIC: Filter the attempts based on the search term
    const filteredAttempts = attempts.filter(attempt => {
        const lowerCaseSearch = searchTerm.toLowerCase();
        // Check if the student name contains the search term
        const nameMatches = attempt.studentName.toLowerCase().includes(lowerCaseSearch);
        // Check if the score (converted to string) contains the search term
        const scoreMatches = String(attempt.score).includes(lowerCaseSearch); 
        
        return nameMatches || scoreMatches;
    });

    // --- Styling (kept from original for context) ---
    const modalStyle = {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(72, 76, 81, 0.5)', 
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        color: 'black',
    };

    const contentStyle = {
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '5px',
        width: '50vw',
        minHeight: '85%',
        maxHeight: '85%',
        position: 'relative',
        color: 'black',
        display: 'flex',
        flexDirection: 'column',
    };

    const headerStyle = {
        display: 'grid', 
        width: '100%',
        borderBottom: '1px solid #ccc',
        paddingBottom: '5px',
        color: 'black',
    };

    const headerButtonStyle = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
    }

    const closeButtonStyle = {
        fontFamily: 'Inknut Antiqua Light',
        backgroundColor: 'rgba(236, 236, 236, 0)', 
        color: 'Black',
        cursor: 'pointer',
        border: 'solid 2px black',
        borderRadius: '8px',
        lineHeight: '1em',
        padding: '0.5em 0.6em',
    };

    const attemptItemStyle = {
        border: '1px solid #eee',
        padding: '10px',
        marginBottom: '10px',
        borderRadius: '8px',
        color: 'black',
        backgroundColor: '#d0ddedff',
        border: 'solid 1px black',
    };

    const searchInputStyle = {
        color: 'black',
        width: '100%',
        padding: '10px',
        margin: '10px 0',
        borderRadius: '5px',
        border: '1px solid #ccc',
        boxSizing: 'border-box', // Ensure padding is included in the width
    };

    return (
        <div style={modalStyle}>
            <div style={contentStyle}>
                <div style={headerStyle}>
                    <div style={headerButtonStyle}>
                        <h2>Attempts for "{moduleTitle}"</h2>
                        <button style={closeButtonStyle} onClick={onClose}>X</button>
                    </div>
                    <input 
                        type="text"
                        placeholder="Search by student name or score..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)} // Update search state on input change
                        style={searchInputStyle}
                    />
                </div>
                
                <div class = "modalAttempts">
                    {attempts.length === 0 ? (
                        <p style={{color: 'black'}}>No attempts found for this module.</p>
                    ) : (
                        <>
                            {filteredAttempts.length === 0 && searchTerm !== '' ? (
                                <p style={{color: 'black'}}>No results found for "{searchTerm}".</p>
                            ) : (
                                filteredAttempts.map((attempt, index) => (
                                    <div key={index} style={attemptItemStyle}>
                                        <strong style={{color: 'black'}}>Attempt {attempts.indexOf(attempt) + 1}</strong>
                                        <ul>
                                            <li style={{color: 'black', backgroundColor: '#ffffffff', margin: '0.5em',}}>Student: {attempt.studentName}</li>
                                            <li style={{color: 'black', backgroundColor: '#ffffffff', margin: '0.5em',}}>Score: {attempt.score}%</li>
                                            <li style={{color: 'black', backgroundColor: '#ffffffff', margin: '0.5em',}}>Correct: {attempt.totalCorrect} / {attempt.totalQuestions}</li>
                                            <li style={{color: 'black', backgroundColor: '#ffffffff', margin: '0.5em',}}>Time: {formatTimestamp(attempt.createdAt)}</li>
                                        </ul>
                                    </div>
                                ))
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// =================================================================
// NEW: LOGIN REQUIRED MODAL COMPONENT
// =================================================================

/**
 * A simple modal component to inform the user they need to log in before redirecting.
 * @param {function} onRedirect - Function to call when the user clicks the login button.
 */
function LoginRequiredModal({ onRedirect }) {
    // Basic styling for the modal overlay and content
    const modalStyle = {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(72, 76, 81, 0.7)', // Darker overlay
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10000, // Higher zIndex to ensure it's on top
        color: 'black',
    };

    const contentStyle = {
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '8px',
        width: '400px',
        textAlign: 'center',
    };
    
    const buttonStyle = {
        fontFamily: 'Inknut Antiqua SemiBold',
        backgroundColor: 'black', 
        color: 'white',
        cursor: 'pointer',
        border: 'none',
        borderRadius: '5px',
        padding: '10px 20px',
        marginTop: '20px',
        fontSize: '16px',
    };

    return (
        <div style={modalStyle}>
            <div style={contentStyle}>
                <h2>Login Required</h2>
                <p style={{color: 'black'}}>You must be logged in to view the dashboard.</p>
                <button style={buttonStyle} onClick={onRedirect}>
                    Go to Login Page
                </button>
            </div>
        </div>
    );
}

// =================================================================
// 2. MAIN LIST COMPONENT (UPDATED)
// =================================================================

function BareListApp() {
    const [formsList, setFormsList] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [hasSession, setHasSession] = React.useState(false);

    // NEW STATE: To control the modal visibility and content
    // Format: { title: string, attempts: array | null }
    const [modalData, setModalData] = React.useState(null); 
    
    // NEW STATE: To control the Login Required modal visibility
    const [showLoginModal, setShowLoginModal] = React.useState(false);

    // Function to load the forms list and their attempt counts
    const loadFormsList = async (uid) => {
        try {
            const { data: formsData, error: formsError } = await supabase
                .from(FORMS_TABLE)
                // RENAMED COLUMN 'id' to 'module_id'
                .select('module_id, title')
                // RENAMED COLUMN 'user_id' to 'teacher_id'
                .eq('teacher_id', uid);

            if (formsError) throw formsError;

            const formsWithCounts = await Promise.all(
                (formsData || []).map(async (form) => {
                    const { count, error: countError } = await supabase
                        .from(ATTEMPTS_TABLE)
                        .select('*', { count: 'exact', head: true }) 
                        // The fetched data object now uses 'module_id'
                        .eq('module_id', form.module_id); 
                    
                    // The fetched data object now uses 'module_id'
                    if (countError) console.warn(`RLS or DB error counting attempts for ${form.module_id}:`, countError);
                    
                    return { ...form, attemptsCount: count || 0 };
                })
            );

            setFormsList(formsWithCounts);
        } catch (err) {
            console.error("Error loading forms or attempts:", err);
            setFormsList([]);
        } finally {
            setLoading(false);
        }
    };
    
    // UPDATED FUNCTION: Handles the "SHOW ATTEMPTS" button click and prepares modal data
    const handleShowAttempts = async (moduleId, moduleTitle) => {
        // Show loading state in modal immediately
        setModalData({ title: moduleTitle, attempts: null }); 
        try {
            // Fetch attempt data, and join to get the student name using the foreign key relationship
            const { data: attemptsData, error } = await supabase
                .from(ATTEMPTS_TABLE)
                // Include 'created_at' and join to get the student name
                .select(`
                    createdAt, 
                    attempt_data,
                    ${STUDENTS_TABLE} ( Display_name ) 
                `)
                .eq('module_id', moduleId); // Filter by the current module ID

            if (error) throw error;

            const structuredAttempts = (attemptsData || []).map((attempt) => {
                // Extract student Display_name from the joined object
                const studentName = attempt.students ? attempt.students.Display_name : 'Unknown Student';
                
                // Extract score details from the JSON 'attempt_data' column
                const score = attempt.attempt_data?.score || 'N/A';
                const totalCorrect = attempt.attempt_data?.total_correct || 0;
                const totalQuestions = attempt.attempt_data?.total_questions || 0;
                
                // FIX: Extract the created_at timestamp directly from the attempt object
                const createdAt = attempt.createdAt; 

                // Include createdAt in the return object
                return { studentName, score, totalCorrect, totalQuestions, createdAt };
            });

            // Update state to show the modal with the fetched data
            setModalData({ title: moduleTitle, attempts: structuredAttempts });
        } catch (err) {
            console.error("Error fetching attempt details:", err);
            // Show error in an alert and close the modal state
            alert(`Failed to load attempts for ${moduleTitle}. Error: ${err.message}`);
            setModalData(null);
        }
    };

    // NEW FUNCTION: Handler to close the modal
    const handleCloseModal = () => {
        setModalData(null);
    };

    // NEW FUNCTION: Handler for the login redirect button (passed to LoginRequiredModal)
    const handleLoginRedirect = () => {
        window.location.href = 'login.html'; 
    };

    // Primary Effect for handling Supabase Authentication State changes (Login/Logout & Redirect).
    React.useEffect(() => {
        
        // Function to check session, load data, or redirect to login
        const checkSessionAndRedirect = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            
            // Set the session state (using hasSession in this component)
            setHasSession(!!session); 

            if (!session) {
                // No session found: Show the modal instead of redirecting immediately
                setLoading(false); // Stop loading UI
                setShowLoginModal(true); // Show the Login Required modal
            } else {
                // Session exists: Proceed to load data
                // loadFormsList handles setLoading(false) in its finally block
                loadFormsList(session.user.id); 
            }
        };

        // 1. Check session on mount (handles page reload)
        checkSessionAndRedirect();

        // 2. Subscribe to Auth Changes (handles real-time events like manual logout)
        const { data: { subscription } = {} } = supabase.auth.onAuthStateChange(
            (event, session) => {
                setHasSession(!!session);
                if (!session) {
                    // If session is removed (e.g., manual logout), show modal
                    setShowLoginModal(true);
                }
            }
        );

        // Cleanup: Unsubscribe from the listener when component unmounts
        return () => {
            if (subscription && typeof subscription.unsubscribe === 'function') {
                subscription.unsubscribe();
            }
        };
    }, []); // Empty dependency array ensures this runs once on mount

    // --- Render Logic ---
    
    // RENDER NEW MODAL FIRST if authentication is required
    if (showLoginModal) {
        return <LoginRequiredModal onRedirect={handleLoginRedirect} />;
    }

    // Return null if loading or no valid session (which means no forms)
    if (loading || formsList.length === 0) {
        return <span style={{marginLeft: "8em", fontFamily: "Inknut Antiqua Regular"}}>No Modules Present in Account.</span>;
    }

    // Render the pure unstyled list (UL) and the modal component
    return (
        <>
            <ul>
                {formsList.map(form => (
                    // RENAMED property access from form.id to form.module_id
                    <li key={form.module_id}>
                        <div>
                            {/* RENAMED property access from form.id to form.module_id */}
                            <a href={`https://wikan-galing-student-side.vercel.app?form_id=${form.module_id}`}>
                                {form.title}
                            </a>
                            {/* Attach the new click handler, RENAMED property access */}
                            <div class="dashboardButtons">
                                <button class="dashButtonsActual" onClick={() => handleShowAttempts(form.module_id, form.title)}> SHOW ATTEMPTS </button>
                                <button class="dashButtonsActualnone"> <a class="dashButtonsActualempty" href={`https://wikan-galing-student-side.vercel.app?form_id=${form.module_id}`}>OPEN MODULE</a> </button>
                                <button class="dashButtonsActualnone"> <a class="dashButtonsActualempty" href={`module.html?form_id=${form.module_id}`}>OPEN EDITOR</a> </button>
                            </div>
                        </div>
                        <p>Attempts: {form.attemptsCount}</p>
                    </li>
                ))}
            </ul>
            {/* RENDER THE ATTEMPTS MODAL IF modalData IS SET */}
            {modalData && (
                <AttemptsModal moduleTitle={modalData.title} attempts={modalData.attempts} onClose={handleCloseModal} />
            )}
        </>
    );
}

// =================================================================
// 3. INITIAL RENDER
// =================================================================
ReactDOM.render(<BareListApp />, document.getElementById('list'));
// =================================================================












/// =================================================================
// 2. THE MODULAR COMPONENT
// =================================================================

function UserFormsList() {
    const [formsList, setFormsList] = React.useState(null); 
    const [loading, setLoading] = React.useState(true);
    const [debugError, setDebugError] = React.useState(''); // For displaying fetch errors

    const loadFormsList = async (uid) => {
        try {
            const { data, error } = await supabase
                .from(FORMS_TABLE)
                .select('module_id, title')
                .eq('teacher_id', uid); 
            
            if (error) throw error;

            setFormsList(data || []);
        } catch (err) {
            console.error("Fetch Error:", err.message);
            setFormsList([]); 
            // Setting a visible error for troubleshooting
            setDebugError("ERROR: Could not fetch forms. Check console for details.");
        } finally {
            setLoading(false);
        }
    };

    // Check for active session and load forms
    React.useEffect(() => {
        supabase.auth.getSession()
            .then(({ data: { session } }) => {
                if (session && session.user) {
                    loadFormsList(session.user.id);
                } else {
                    setFormsList([]); 
                    setLoading(false);
                }
            })
            .catch((err) => {
                 console.error("Session Check Error:", err.message);
                 setFormsList([]);
                 setLoading(false);
            });
    }, []);

    // --- Render Logic ---

    if (loading) {
        return <span style={{ color: '#888' }}>Loading...</span>; 
    }

    if (debugError) {
        // Return null/empty string to avoid showing non-list elements, 
        // but keep the console error for the user to check.
        return null; 
    }
    
    // Check if the user is logged in (formsList will be null only if something went wrong)
    if (!formsList || formsList.length === 0) {
        return <span style={{ color: '#ffffffff !important' }}>Empty</span>;
    }

    // Render only the final unstyled list
    return (
        <ul style={{ margin: '0 0 1em 0', padding: 0}}>
            {formsList.map(form => (
                <li style={{ margin: '1em 0' }} key={form.module_id}>
                    <a style={{ color: '#000', fontSize: 'larger', margin: '1em 0' }} href={`module.html?form_id=${form.module_id}`}>
                        {form.title}
                    </a>
                </li>
            ))}
        </ul>
    );
}

// =================================================================
// 3. ATTACH THE COMPONENT TO THE DOM
// =================================================================

// Ensure this ID matches the div in your HTML
ReactDOM.render(<UserFormsList />, document.getElementById('forms-list-container'));






const e = React.createElement;

// =================================================================
// 2. THE MODULAR COMPONENT (Login/Logout Toggle)
// =================================================================

/**
 * A modular component that toggles between a Login and a Logout button 
 * based on the current Supabase session status. Uses React.createElement (no JSX).
 */
function AuthToggle() {
    const [loading, setLoading] = React.useState(true); // Start loading to check session
    const [isLoggedIn, setIsLoggedIn] = React.useState(false);
    const [error, setError] = React.useState(null); 
    
    // --- Handlers ---
    
    const handleLogout = async () => {
        if (!window.confirm("Are you sure you want to log out?")) return;

        setLoading(true);
        setError(null);
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            
            // On success, the main app.js redirect should handle the rest, but 
            // reloading ensures all modular components update instantly.
            window.location.reload(); 
            
        } catch (err) {
            console.error("Logout failed:", err.message);
            setError("Logout failed.");
            setLoading(false);
        }
    };
    
    const handleLogin = () => {
        // Redirects the user to the dedicated login page
        window.location.href = 'login.html';
    };

    // --- Session Check Effect ---
    
    React.useEffect(() => {
        supabase.auth.getSession()
            .then(({ data: { session } }) => {
                setIsLoggedIn(!!session);
            })
            .catch((err) => {
                console.error("AuthToggle session check failed:", err);
                setIsLoggedIn(false);
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    // --- Render Logic ---

    const baseStyle = { 
        fontfamily: 'Inknut Antiqua SemiBold',
        fontSize: '16px',
        padding: '1em', 
        border: 'none', 
        cursor: 'pointer',
        opacity: loading ? 0.6 : 1,
        transition: 'background-color 0.3s',
        backgroundColor: '#007bff01',
    };

    let buttonProps = {};
    let buttonText = '';

    if (loading) {
        buttonText = 'Checking...';
        buttonProps = { disabled: true, style: { ...baseStyle, backgroundColor: '#cccccc01', fontfamily: 'Inknut Antiqua SemiBold' }, id: 'LOGOUTBUTTON' };
    } else if (isLoggedIn) {
        buttonText = 'LOG OUT';
        buttonProps = { 
            onClick: handleLogout,
            disabled: false,
            style: { ...baseStyle, color: 'white', fontfamily: 'Inknut Antiqua SemiBold' },
            id: 'LOGOUTBUTTON'
        };
    } else {
        buttonText = 'LOG IN';
        buttonProps = { 
            onClick: handleLogin, 
            disabled: false, 
            style: { ...baseStyle, color: 'white', fontfamily: 'Inknut Antiqua SemiBold'},
            id: 'LOGINBUTTON'
        };
    }
    
    // Render the button and the error message using React.createElement
    return e('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center' } },
        e('button', buttonProps, buttonText),
        error && e('span', { style: { color: 'red', marginLeft: '10px' } }, error)
    );
}

// =================================================================
// 3. ATTACH THE COMPONENT TO THE DOM
// =================================================================

// This will render the component into the element with the ID 'auth-toggle-container'.
ReactDOM.render(e(AuthToggle), document.getElementById('auth-toggle-container'));