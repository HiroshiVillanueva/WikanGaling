// =================================================================
// 1. CONFIGURATION & INITIALIZATION
// =================================================================

// REPLACE WITH YOUR OWN KEYS
const SUPABASE_URL = "https://aliyyqinorqlwmjhbqza.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsaXl5cWlub3JxbHdtamhicXphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxMDY2OTgsImV4cCI6MjA3NDY4MjY5OH0.wqmf23uvtil0BJ0qlk8qm_Wq7LsaD1ClZKwnDr1OxME"; 

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY); 

// =================================================================
// 2. LOGIN FORM COMPONENT (ADAPTED FROM APP.JS)
// =================================================================

/** Component for handling user login and registration with Supabase. */
function LoginForm() {
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [isRegistering, setIsRegistering] = React.useState(false);
    const [error, setError] = React.useState('');
    const [success, setSuccess] = React.useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        
        try {
            let response;
            if (isRegistering) {
                // Attempt to sign up a new user
                response = await supabase.auth.signUp({ email, password });
            } else {
                // Attempt to log in an existing user
                response = await supabase.auth.signInWithPassword({ email, password });
            }

            if (response.error) throw response.error;
            
            if (response.data.user) {
                // Successfully logged in - Redirect to the main application
                window.location.href = 'index.html';
            } else {
                // Sign-up success requires email confirmation
                setSuccess("Success! Please check your email to confirm your account before logging in.");
            }

        } catch (err) {
            setError(err.message);
        }
    };
    
    return (
        <div className="auth-container">
            {error && <p className="error">{error}</p>}
            {success && <p className="success">{success}</p>}
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
// 3. INITIAL RENDER
// =================================================================

ReactDOM.render(<LoginForm />, document.getElementById('loginForm'));