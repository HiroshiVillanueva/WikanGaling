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
    if (!attempts && moduleTitle) {
        // Simple loading state if title is available but data is null (fetching)
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

    // A basic, unstyled modal overlay and content structure
    const modalStyle = {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(72, 76, 81, 0.5)', // Dark overlay
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
        maxHeight: '80%',
        position: 'relative',
        color: 'black',
    };

    const headerStyle = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #ccc',
        paddingBottom: '5px',
        color: 'black',
    };

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

    return (
        <div style={modalStyle}>
            <div style={contentStyle}>
                <div style={headerStyle}>
                    <h2>Attempts for "{moduleTitle}"</h2>
                    <button style={closeButtonStyle} onClick={onClose}>X</button>
                </div>
                <div class="modalAttempts">
                    {attempts.length === 0 ? (
                        <p style={{color: 'black'}}>No attempts found for this module.</p>
                    ) : (
                        <>
                            <p>Total Attempts: {attempts.length}</p>
                            {attempts.map((attempt, index) => (
                                <div key={index} style={attemptItemStyle}>
                                    <strong style={{color: 'black'}}>Attempt {index + 1}</strong>
                                    <ul>
                                        <li style={{color: 'black', backgroundColor: '#ffffffff', margin: '0.5em',}}>Student: {attempt.studentName}</li>
                                        <li style={{color: 'black', backgroundColor: '#ffffffff', margin: '0.5em',}}>Score: {attempt.score}%</li>
                                        <li style={{color: 'black', backgroundColor: '#ffffffff', margin: '0.5em',}}>Correct: {attempt.totalCorrect} / {attempt.totalQuestions}</li>
                                    </ul>
                                </div>
                            ))}
                        </>
                    )}
                </div>
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
                // FIX: Select the 'attempt_data' column directly since it was renamed in the DB.
                .select(`
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
                
                return {
                    studentName,
                    score,
                    totalCorrect,
                    totalQuestions
                };
            });

            // Update state to show the modal with the fetched data
            setModalData({ 
                title: moduleTitle, 
                attempts: structuredAttempts 
            });

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


    // Check for active session and load forms
    React.useEffect(() => {
        supabase.auth.getSession()
            .then(({ data: { session } }) => {
                if (session && session.user) {
                    setHasSession(true);
                    loadFormsList(session.user.id);
                } else {
                    setLoading(false);
                }
            })
            .catch(() => {
                 setLoading(false);
            });
    }, []);

    // --- Render Logic ---

    // Return null if loading or no valid session to fulfill "no other elements"
    if (loading || !hasSession || formsList.length === 0) {
        return null;
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
                            <button onClick={() => handleShowAttempts(form.module_id, form.title)}> 
                                SHOW ATTEMPTS
                            </button>
                        </div>

                        <p>Attempts: {form.attemptsCount}</p> 
                    </li>
                ))}
            </ul>
            
            {/* RENDER THE MODAL IF modalData IS SET */}
            {modalData && (
                <AttemptsModal 
                    moduleTitle={modalData.title}
                    attempts={modalData.attempts}
                    onClose={handleCloseModal}
                />
            )}
        </>
    );
}

// =================================================================
// 3. INITIAL RENDER
// =================================================================

ReactDOM.render(<BareListApp />, document.getElementById('list'));












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
        return <span style={{ color: '#888' }}>Empty</span>;
    }

    // Render only the final unstyled list
    return (
        <ul style={{ padding: 0}}>
            {formsList.map(form => (
                <li key={form.module_id}>
                    <a style={{ color: '#000' }} href={`module.html?form_id=${form.module_id}`}>
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
        fontSize: '14px',
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