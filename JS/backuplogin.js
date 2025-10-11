// =================================================================
// 1. CONFIGURATION & INITIALIZATION
// =================================================================

// REPLACE WITH YOUR OWN KEYS
const SUPABASE_URL = "https://aliyyqinorqlwmjhbqza.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsaXl5cWlub3JxbHdtamhicXphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxMDY2OTgsImV4cCI6MjA3NDY4MjY5OH0.wqmf23uvtil0BJ0qlk8qm_Wq7LsaD1ClZKwnDr1OxME"; 

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY); 

// =================================================================
// 2. MODAL COMPONENT (NEW)
// =================================================================

/** Simple Modal component to notify the user to confirm their email. */
function ConfirmationModal({ onClose }) {
    return (
        // The modal overlay
        <div className="modal-overlay">
            {/* The modal content box */}
            <div className="modal-content">
                <h2>Confirmation Required</h2>
                <p>
                    Thank you for signing up!
                    <br/><br/>
                    Please check your email to **confirm your account** before attempting to log in.
                </p>
                <button onClick={onClose}>Understood</button>
            </div>
        </div>
    );
}


// =================================================================
// 3. LOGIN FORM COMPONENT
// =================================================================

/** Component for handling user login and registration with Supabase. */
function LoginForm() {
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [isRegistering, setIsRegistering] = React.useState(false);
    const [error, setError] = React.useState('');
    
    // State for controlling the modal visibility
    const [showModal, setShowModal] = React.useState(false); 

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        // setShowModal is used instead of setSuccess
        setShowModal(false); 
        
        try {
            let response;
            if (isRegistering) {
                // Attempt to sign up a new user
                response = await supabase.auth.signUp({ email, password });
                
                if (response.error) throw response.error;
                
                // On successful sign-up, show the modal instead of the text notification
                setShowModal(true);
                return; // Stop execution after setting the modal
                
            } else {
                // Attempt to log in an existing user
                response = await supabase.auth.signInWithPassword({ email, password });
                
                if (response.error) throw response.error;
            }

            if (response.data.user) {
                // Successfully logged in - Redirect to the main application
                window.location.href = 'index.html';
            }

        } catch (err) {
            setError(err.message);
        }
    };

    // Handler to close the modal
    const handleCloseModal = () => {
        setShowModal(false);
        // Optional: clear the form fields after successful sign-up
        setEmail('');
        setPassword('');
        // Switch back to sign-in view
        setIsRegistering(false); 
    };
    
    return (
        <div className="auth-container">
            {/* Render the modal if showModal is true */}
            {showModal && <ConfirmationModal onClose={handleCloseModal} />}
            
            {error && <p className="error">{error}</p>}
            
            <form onSubmit={handleSubmit}>
                <label htmlFor="email">Email:</label>
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />

                <label htmlFor="password">Password:</label>
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                <button id="signing" type="submit">{isRegistering ? 'SIGN UP' : 'SIGN IN'}</button>
            </form>
            <p>
                <i>
                <button id="registering" onClick={() => setIsRegistering(!isRegistering)}>
                    {isRegistering ? 'Have an account? Sign in' : 'Need an account? Sign Up'}
                </button>
                </i>
            </p>
        </div>
    );
}

// =================================================================
// 4. INITIAL RENDER
// =================================================================

ReactDOM.render(<LoginForm />, document.getElementById('loginForm'));