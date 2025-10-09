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
// 2. MAIN LIST COMPONENT
// =================================================================

function BareListApp() {
    const [formsList, setFormsList] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [hasSession, setHasSession] = React.useState(false);

    // Function to load the forms list and their attempt counts
    const loadFormsList = async (uid) => {
        try {
            const { data: formsData, error: formsError } = await supabase
                .from(FORMS_TABLE)
                .select('id, title')
                .eq('user_id', uid);

            if (formsError) throw formsError;

            const formsWithCounts = await Promise.all(
                (formsData || []).map(async (form) => {
                    const { count, error: countError } = await supabase
                        .from(ATTEMPTS_TABLE)
                        .select('*', { count: 'exact', head: true }) 
                        .eq('module_id', form.id); 
                    
                    if (countError) console.warn(`RLS or DB error counting attempts for ${form.id}:`, countError);
                    
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
    
    // NEW FUNCTION: Handles the "SHOW ATTEMPTS" button click and displays an alert
    const handleShowAttempts = async (moduleId, moduleTitle) => {
        try {
            // Fetch attempt data, and join to get the student name using the foreign key relationship
            const { data: attemptsData, error } = await supabase
                .from(ATTEMPTS_TABLE)
                // Select the JSON data and the name from the linked students table (assumes 'student_id' is the FK)
                .select(`
                    data,
                    ${STUDENTS_TABLE} ( name ) 
                `)
                .eq('module_id', moduleId); // Filter by the current module ID

            if (error) throw error;

            if (!attemptsData || attemptsData.length === 0) {
                alert(`No attempts found for module: ${moduleTitle}`);
                return;
            }

            let alertMessage = `Attempts for "${moduleTitle}" (${attemptsData.length} total):\n\n`;

            attemptsData.forEach((attempt, index) => {
                // Extract student name from the joined object
                const studentName = attempt.students ? attempt.students.name : 'Unknown Student';
                
                // Extract score details from the JSON 'data' column
                const score = attempt.data?.score || 'N/A';
                const totalCorrect = attempt.data?.total_correct || 0;
                const totalQuestions = attempt.data?.total_questions || 0;
                
                alertMessage += `Attempt ${index + 1}:\n`;
                alertMessage += `  Student: ${studentName}\n`;
                alertMessage += `  Score: ${score}\n`;
                alertMessage += `  Correct: ${totalCorrect} / ${totalQuestions}\n\n`;
            });

            alert(alertMessage);

        } catch (err) {
            console.error("Error fetching attempt details:", err);
            alert(`Failed to load attempts for ${moduleTitle}. Error: ${err.message}`);
        }
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

    // Render only the pure unstyled list (UL)
    return (
        <ul>
            {formsList.map(form => (
                <li key={form.id}>
                    <div>
                        <a href={`https://wikan-galing-student-side.vercel.app?form_id=${form.id}`}>
                            {form.title}
                        </a>
                        {/* Attach the new click handler */}
                        <button onClick={() => handleShowAttempts(form.id, form.title)}> 
                            SHOW ATTEMPTS
                        </button>
                    </div>

                    <p>Attempts: {form.attemptsCount}</p> 
                </li>
            ))}
        </ul>
    );
}

// =================================================================
// 3. INITIAL RENDER
// =================================================================

ReactDOM.render(<BareListApp />, document.getElementById('list'));