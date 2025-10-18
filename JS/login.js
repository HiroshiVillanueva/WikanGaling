// =================================================================
// 1. CONFIGURATION & INITIALIZATION
// =================================================================

// REPLACE WITH YOUR OWN KEYS
const SUPABASE_URL = "https://aliyyqinorqlwmjhbqza.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsaXl5cWlub3JxbHdtamhicXphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxMDY2OTgsImV4cCI6MjA3NDY4MjY5OH0.wqmf23uvtil0BJ0qlk8qm_Wq7LsaD1ClZKwnDr1OxME"; 

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY); 

// =================================================================
// 2. MODAL COMPONENT
// =================================================================

/** Simple Modal component to notify the user to confirm their email. */
function ConfirmationModal({ onClose }) {
    return (
        // The modal overlay
        <div className="modal-overlay">
            {/* The modal content box */}
            <div className="modal-content">
                <h2>CONFIRMATION REQUIRED</h2>
                <p>
                    Thank you for signing up!
                    <br/><br/>
                    PLEASE CHECK YOUR EMAIL AND CONFIRM YOUR ACCOUNT BEFORE LOGGING IN.
                </p>
                <button onClick={onClose}>Understood</button>
            </div>
        </div>
    );
}

// =================================================================
// 3. PASSWORD INPUT COMPONENT (MOVED OUTSIDE)
// =================================================================

/** * Reusable Password Input Field structure with a visibility toggle.
 * NOTE: This component MUST be defined outside of LoginForm to prevent focus issues.
 * The focus issue occurred because defining it inside the parent function causes 
 * React to see it as a new component on every parent re-render.
 * * UPDATED: Added 'placeholderText' prop.
 */
function PasswordInputField({ label, value, onChange, isVisible, onToggleVisibility, placeholderText }) {
    return (
        <>
            <label htmlFor={label}>{label}:</label>
            <div style={{ position: 'relative' }}> 
                <input
                    // Use the visibility state passed from the parent
                    type={isVisible ? 'text' : 'password'}
                    // UPDATED: Use the new placeholderText prop
                    placeholder={placeholderText || label} 
                    value={value}
                    onChange={onChange}
                    required
                />
                <button 
                    type="button" 
                    onClick={onToggleVisibility} // Use the toggle handler passed from the parent
                    // Inline style for positioning and to override default button styles
                    style={{
                        width: '50px',
                        height: '50px',
                        position: 'absolute',
                        right: '20px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0', 
                        boxShadow: 'none',
                        borderRadius: '0',
                        margin: '0',
                        backdropFilter: 'none',
                        color: 'white',
                        zIndex: 10, 
                    }}
                >
                    {isVisible ? 'Hide' : 'Show'}
                </button>
            </div>
        </>
    );
};

// =================================================================
// 4. LOGIN FORM COMPONENT
// =================================================================

/** Component for handling user login and registration with Supabase. */
function LoginForm() {
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [confirmPassword, setConfirmPassword] = React.useState('');
    const [displayName, setDisplayName] = React.useState(''); 
    const [isRegistering, setIsRegistering] = React.useState(false);
    const [error, setError] = React.useState('');
    const [showModal, setShowModal] = React.useState(false); 
    
    // The state and handler for password visibility are kept here (the parent)
    const [isPasswordVisible, setIsPasswordVisible] = React.useState(false);

    const togglePasswordVisibility = () => {
        setIsPasswordVisible(!isPasswordVisible);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setShowModal(false); 
        
        try {
            let response;
            if (isRegistering) {
                if (password !== confirmPassword) {
                    setError("Passwords do not match.");
                    return; 
                }
                
                response = await supabase.auth.signUp({ 
                    email, 
                    password,
                    options: {
                        data: {
                            display_name: displayName, 
                        }
                    }
                });
                
                if (response.error) throw response.error;
                
                setShowModal(true);
                return; 
                
            } else {
                response = await supabase.auth.signInWithPassword({ email, password });
                
                if (response.error) throw response.error;
            }

            if (response.data.user) {
                window.location.href = 'index.html';
            }

        } catch (err) {
            setError(err.message);
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEmail('');
        setPassword('');
        setConfirmPassword(''); 
        setDisplayName(''); 
        setIsRegistering(false); 
    };
    
    const handleToggleRegistering = () => {
        change();
        setIsRegistering(!isRegistering);
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setDisplayName('');
        setError('');
    };
    
    // NEW: Define placeholder text based on the current mode
    const passwordPlaceholder = isRegistering 
        ? 'Minimum 6 characters' 
        : 'Password';

    return (
        <div className="auth-container">
            {showModal && <ConfirmationModal onClose={handleCloseModal} />}
            
            {error && <p className="error">{error}</p>}
            
            <form onSubmit={handleSubmit}>
                <label htmlFor="email">Email:</label>
                <input
                    type="email"
                    // Existing change: Placeholder for Email
                    placeholder={isRegistering ? 'Example@Mail.com' : 'Email'}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />

                {isRegistering && (
                    <>
                        <label htmlFor="displayName">Name:</label>
                        <input
                            type="text"
                            // Existing change: Placeholder for Name
                            placeholder= "John Adams"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            required
                        />
                    </>
                )}

                {/* Password Input - Pass the dynamic password placeholder */}
                <PasswordInputField 
                    label="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    isVisible={isPasswordVisible} 
                    onToggleVisibility={togglePasswordVisibility}
                    placeholderText={passwordPlaceholder} // NEW PROP
                />

                {/* Confirm Password Input - Pass a specific placeholder for confirmation */}
                {isRegistering && (
                    <PasswordInputField 
                        label="Confirm Password" 
                        value={confirmPassword} 
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        isVisible={isPasswordVisible}
                        onToggleVisibility={togglePasswordVisibility}
                        placeholderText="Re-enter password" // NEW PROP
                    />
                )}
                <button id="signing" type="submit">{isRegistering ? 'SIGN UP' : 'SIGN IN'}</button>
            </form>
            <p>
                <i>
                <p>{isRegistering ? " " : "Please Sign Up if you don't have an account!"}</p>
                <button id="registering" onClick={handleToggleRegistering}>
                    {isRegistering ? 'Have an account? Sign in' : "Create Account"}
                </button>
                </i>
            </p>
        </div>
    );
}

// =================================================================
// 5. INITIAL RENDER
// =================================================================

ReactDOM.render(<LoginForm />, document.getElementById('loginForm'));