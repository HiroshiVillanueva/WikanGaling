// Ensure scripts are loaded for debugging purposes
console.log('App logic script loaded.');

// =================================================================
// 1. CONFIGURATION & INITIALIZATION
// =================================================================

// REPLACE WITH YOUR OWN KEYS
const SUPABASE_URL = "https://aliyyqinorqlwmjhbqza.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsaXl5cWlub3JxbHdtamhicXphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxMDY2OTgsImV4cCI6MjA3NDY4MjY5OH0.wqmf23uvtil0BJ0qlk8qm_Wq7LsaD1ClZKwnDr1OxME"; 

// Initialize Supabase Client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY); 

// --- Constants ---
const FORMS_TABLE = 'forms_metadata';
const FORMS_BUCKET = 'form_images'; 
// Global cache for image URLs to prevent redundant Supabase calls
const imageUrlCache = {};

// =================================================================
// 2. HELPER FUNCTIONS (Outside of App component)
// =================================================================

const fileSystem = {
    /** * Uploads a file to Supabase Storage and returns the file path. */
    saveUpload: async function(uid, formId, file) {
        if (!file || !uid || !formId) return null;
        
        const fileExtension = file.name.split('.').pop();
        const filename = `${formId}/${Date.now()}_${Math.random().toString(36).substr(2, 5)}.${fileExtension}`;
        
        try {
            // Storage path: [BUCKET]/[uid]/[formId]/[filename]
            const { error } = await supabase.storage
                .from(FORMS_BUCKET)
                .upload(`${uid}/${filename}`, file, {
                    cacheControl: '3600',
                    upsert: false
                });
            
            if (error) throw error;
            
            // Return the full storage key/path
            return `${uid}/${filename}`; 
        } catch (error) {
            console.error("Image upload failed:", error);
            return null;
        }
    },
    
    /** Deletes a file from Supabase Storage using its full path. */
    deleteUpload: async function(filePath) {
        if (!filePath) return;
        try {
            const { error } = await supabase.storage
                .from(FORMS_BUCKET)
                .remove([filePath]);
            
            if (error) throw error;
            
            // Remove the URL from the local cache after deletion
            delete imageUrlCache[filePath];
        } catch (error) {
            console.error("Image deletion failed:", error);
        }
    },
    
    /** Gets the public URL for an image path, using a local cache for speed. */
    getDownloadURL: async function(filePath) {
        if (!filePath) return '';
        
        // Return from cache if available
        if (imageUrlCache[filePath]) {
            return imageUrlCache[filePath];
        }
        
        const { data } = supabase.storage
            .from(FORMS_BUCKET)
            .getPublicUrl(filePath);
        
        if (data && data.publicUrl) {
            imageUrlCache[filePath] = data.publicUrl;
            return data.publicUrl;
        }
        
        return ''; 
    }
};

// =================================================================
// 3. REACT COMPONENTS
// =================================================================

// The LoginForm component has been removed and moved to login.js

/** Component to display an image fetched from Supabase Storage. */
function StorageImage({ filePath }) {
    const [url, setUrl] = React.useState('');
    
    React.useEffect(() => {
        let isMounted = true;
        if (filePath) {
            // Fetch URL using the caching helper
            fileSystem.getDownloadURL(filePath).then(fetchedUrl => {
                if (isMounted) setUrl(fetchedUrl);
            });
        } else {
            setUrl('');
        }
        return () => { isMounted = false; }; // Cleanup function
    }, [filePath]);

    if (!url) return null;

    return <img src={url} alt="Question Image" className="image-preview" />;
}


// =================================================================
// 4. MAIN APPLICATION COMPONENT (App)
// =================================================================

function App() {
    // --- State Variables ---
    const [session, setSession] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    // Gets form_id from URL query params on initial load
    const [formId, setFormId] = React.useState(new URLSearchParams(window.location.search).get('form_id') || '');
    // The main object containing all form data (title, questions, options)
    const [formData, setFormData] = React.useState({}); 
    // Cache of all forms created by the user (list for the sidebar)
    const [formsList, setFormsList] = React.useState([]); // Kept for creating the 'View All Forms' link
    const [error, setError] = React.useState('');
    const [success, setSuccess] = React.useState('');
    // State for the "Create New Form" input box
    const [newFormTitle, setNewFormTitle] = React.useState(''); 

    // --- State & Draft Helpers ---
    /** Updates the main formData state and saves the current state to local storage as a draft. */
    const setFormDataAndDraft = (newFormData) => {
        setFormData(newFormData);
        if (newFormData && newFormData.id && Object.keys(newFormData).length > 0) {
            localStorage.setItem(`form_data_draft_${newFormData.id}`, JSON.stringify(newFormData));
        }
    };

    /** Handles text changes for both question text and option text (Controlled Component Logic). */
    const handleUpdateItemText = (qIndex, oIndex, newText) => {
        setFormDataAndDraft(prevFormData => {
            const newQuestions = [...prevFormData.questions];
            
            if (oIndex !== undefined) {
                // Update Option Text (if oIndex is provided)
                newQuestions[qIndex].options[oIndex].text = newText;
            } else {
                // Update Question Text
                newQuestions[qIndex].text = newText;
            }
            
            // Return the updated state object
            return { ...prevFormData, questions: newQuestions };
        });
    };

    // --- Effects (Hooks) ---
    
    /** Effect to clear the "Create New Form" text box when a user switches to editing an existing form. */
    React.useEffect(() => {
        if (formId) {
            setNewFormTitle(''); 
        }
    }, [formId]); 
    
    /** Primary Effect for handling Supabase Authentication State changes (Login/Logout & Redirect). */
    React.useEffect(() => {
        
        // Function to check session, load data, or redirect to login
        const checkSessionAndRedirect = async () => {
             const { data: { session } } = await supabase.auth.getSession();
             setSession(session);
             
             if (!session) {
                 // No session found: Redirect to the dedicated login page
                 window.location.href = 'login.html';
             } else {
                 // Session exists: Proceed to load data
                 loadFormsList(session.user.id)
                        .then(() => {
                            setLoading(false); 
                        })
                        .catch(() => {
                            setLoading(false);
                        });
             }
        };

        // 1. Check session on mount (handles page reload)
        checkSessionAndRedirect();

        // 2. Subscribe to Auth Changes (handles real-time events like manual logout)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                setSession(session);
                
                if (!session) {
                    // If session is removed (e.g., manual logout), redirect
                    window.location.href = 'login.html'; 
                }
            }
        );

        // Cleanup: Unsubscribe from the listener when component unmounts
        return () => subscription.unsubscribe();
    }, []); 
    
    /** Effect to load form data when formId changes (triggered by URL param or local state change). */
    React.useEffect(() => {
        if (formId && session) {

            // Clear previous form data immediately for a clean slate
            if (formData.id) {
                setFormData({}); 
            }

            // 1. CHECK FORMS LIST CACHE (Quickest load path)
            const cachedForm = formsList.find(f => f.id === formId);

            if (cachedForm && cachedForm.formDataCache) {
                setFormData(cachedForm.formDataCache);
                // Clean up any remaining bad drafts
                localStorage.removeItem(`form_data_draft_${formId}`); 
                return; // Stop execution
            }
            
            // 2. FALLBACK: LOAD FROM DATABASE 
            loadForm(formId); 

        } else if (!formId) {
            setFormData({});
        }
    }, [formId, session, formsList]);


    // --- Core Data Handlers ---

    /** Fetches the list of all forms for the current user. (Needed to update cache on save/delete) */
    const loadFormsList = async (uid) => {
        if (!uid) return;
        try {
            // Select ID, Title, and the full JSON object (form_data)
            const { data, error } = await supabase
                .from(FORMS_TABLE)
                .select('id, title, form_data') 
                .eq('user_id', uid);

            if (error) throw error;
            
            const list = data.map(item => ({
                id: item.id,
                title: item.title,
                formDataCache: item.form_data
            }));

            setFormsList(list);
        } catch (err) {
            setError('Error loading forms list: ' + err.message);
        }
    };

    /** Fetches a single form's data from the database. */
    const loadForm = async (id) => {
        setError('');
        try {
            const { data, error } = await supabase
                .from(FORMS_TABLE)
                .select('id, title, form_data')
                .eq('id', id)
                .single();

            if (error) throw error;
            if (data) {
                setFormData(data.form_data);
                setSuccess('Form loaded from Supabase Database!');
            } else {
                throw new Error('Form not found.');
            }
        } catch (err) {
            setError('Error loading form: ' + err.message);
            // Fallback to empty form structure if load fails
            setFormDataAndDraft({ id: id, title: 'Untitled Form', questions: [] });
        }
    };

    /** Creates a brand new form entry in the database. */
    const handleCreateForm = async (e) => {
        e.preventDefault();
        const formTitle = e.target.form_title.value.trim();
        if (!formTitle) {
            setError('Form name cannot be empty.');
            return;
        }
        
        const newFormId = crypto.randomUUID(); 
        const newForm = { id: newFormId, title: formTitle, questions: [] };
        
        try {
            const { error } = await supabase
                .from(FORMS_TABLE)
                .insert({
                    id: newFormId,
                    user_id: session.user.id,
                    title: formTitle,
                    form_data: newForm
                });
            
            if (error) throw error;

            // Clear the input box after successful submission
            setNewFormTitle(''); 

            // Update state and load the new form
            setFormData(newForm);
            loadFormsList(session.user.id);
            setFormId(newFormId);
            setError('');
            setSuccess('Form created and saved to Supabase Database!');
            // Update URL to reflect the new form ID
            window.history.pushState({}, '', `?form_id=${newFormId}`); 
        } catch (err) {
            setError('Error creating form: ' + err.message);
        }
    };

    /** Saves all current form data and triggers a full page refresh. */
    const handleSaveForm = async () => {
        // Use a 50ms timeout to ensure React state updates (from inputs) finalize
        setTimeout(async () => { 
            const latestFormData = formData; 
            
            if (formId && latestFormData && session) {
                try {
                    const { error } = await supabase
                        .from(FORMS_TABLE)
                        .update({
                            title: latestFormData.title,
                            form_data: latestFormData // Save the full JSON object
                        })
                        .eq('id', formId)
                        .select();

                    if (error) throw error;
                    
                    localStorage.removeItem(`form_data_draft_${formId}`);
                    
                    setSuccess('Form saved successfully to Supabase Database!');
                    
                    // Force a full page refresh to reload data cleanly from the database
                    window.location.reload(); 
                    
                } catch (err) {
                    setError('Error saving form: ' + err.message);
                }
            }
        }, 50); 
    };

    /** Deletes the form entry, including all associated files in storage. */
    const handleDeleteForm = async () => {
        if (window.confirm('Are you sure you want to delete this form and all images?')) {
            if (formId && session) {
                try {
                    // 1. Delete all associated images from Storage
                    const { data: listData } = await supabase.storage
                        .from(FORMS_BUCKET)
                        // List files under the user's ID that contain the formId in the path
                        .list(session.user.id, { search: formId, limit: 100 }); 

                    if (listData) {
                        const filesToDelete = listData.map(file => `${session.user.id}/${file.name}`);
                        if (filesToDelete.length > 0) {
                            await supabase.storage.from(FORMS_BUCKET).remove(filesToDelete);
                        }
                    }

                    // 2. Delete JSON entry from Database
                    const { error: dbError } = await supabase
                        .from(FORMS_TABLE)
                        .delete()
                        .eq('id', formId);
                    
                    if (dbError) throw dbError;

                    // 3. Clean up local state
                    loadFormsList(session.user.id);
                    setFormId('');
                    setFormData({});
                    setSuccess('Form and all associated files deleted successfully!');
                    window.history.pushState({}, '', '?'); // Clear form_id from URL
                } catch (err) {
                    setError('Error deleting form: ' + err.message);
                }
            }
        }
    };
    
    /** Logs out the current user and redirects to login. */
    const handleLogout = async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            // The onAuthStateChange listener will catch this and redirect to login.html
            setSuccess('Logged out successfully.'); 
        } catch (err) {
            setError('Logout failed: ' + err.message);
        }
    };


    // --- Question/Option CRUD Handlers ---

    /** Adds a new question (and optional image) to the form. */
    const handleAddQuestion = async (e) => {
        e.preventDefault();
        const text = e.target.question_text.value.trim();
        const file = e.target.question_image.files[0];
        if (!text) return;
        
        let imagePath = null;
        if (file && session && formId) {
            imagePath = await fileSystem.saveUpload(session.user.id, formId, file);
        }

        setFormDataAndDraft({
            ...formData,
            questions: [...formData.questions, { text, image: imagePath, options: [], correct: -1 }]
        });
        e.target.reset(); // Clear form inputs
    };

    /** Removes a question and deletes any associated images. */
    const handleRemoveQuestion = async (qIndex) => {
        const questionToRemove = formData.questions[qIndex];
        
        // Delete all images associated with this question and its options
        if (questionToRemove.image) {
            await fileSystem.deleteUpload(questionToRemove.image);
        }
        for (const option of questionToRemove.options) {
            if (option.image) {
                await fileSystem.deleteUpload(option.image);
            }
        }

        const newQuestions = formData.questions.filter((_, i) => i !== qIndex);
        setFormDataAndDraft({ ...formData, questions: newQuestions });
    };
    
    /** Handles image upload/replacement for an existing question. */
    const handleUpdateQuestion = async (e, qIndex) => { 
        e.preventDefault();
        const questions = [...formData.questions];
        const newFile = e.target.question_image.files[0];
        let currentImage = questions[qIndex].image;
        
        if (newFile && session && formId) {
            // Delete old image if one exists
            if (currentImage) await fileSystem.deleteUpload(currentImage);
            // Upload new image
            currentImage = await fileSystem.saveUpload(session.user.id, formId, newFile);
        } else if (newFile) {
            setError('Must be logged in and editing a form to upload images.');
            return;
        }

        // Only update the image path; the question text is handled by the onChange handler
        questions[qIndex] = { ...questions[qIndex], image: currentImage };
        setFormDataAndDraft({ ...formData, questions });
        e.target.reset(); // Clear the file input
    };
    
    /** Adds a new option (and optional image) to a specific question. */
    const handleAddOption = async (e, qIndex) => {
        e.preventDefault();
        const text = e.target.option_text.value.trim();
        const file = e.target.option_image.files[0];
        if (!text) return;
        
        let imagePath = null;
        if (file && session && formId) {
            imagePath = await fileSystem.saveUpload(session.user.id, formId, file);
        }
        
        const questions = [...formData.questions];
        questions[qIndex].options.push({ text, image: imagePath });
        setFormDataAndDraft({ ...formData, questions });
        e.target.reset();
    };
    
    /** Handles image/text updates for an existing option. */
    const handleUpdateOption = async (e, qIndex, oIndex) => {
        e.preventDefault();
        const questions = [...formData.questions];
        const option = questions[qIndex].options[oIndex];
        const newFile = e.target.option_image.files[0];
        
        // Text is handled by the onChange handler (handleUpdateItemText)
        
        if (newFile && session && formId) {
            if (option.image) await fileSystem.deleteUpload(option.image);
            questions[qIndex].options[oIndex].image = await fileSystem.saveUpload(session.user.id, formId, newFile);
        }
        
        setFormDataAndDraft({ ...formData, questions });
        // Since this is a form submit, you could clear the file input here if needed:
        // e.target.reset();
    };

    /** Removes an option and deletes any associated image. */
    const handleRemoveOption = async (qIndex, oIndex) => { 
        const questions = [...formData.questions];
        const optionToRemove = questions[qIndex].options[oIndex];
        
        if (optionToRemove.image) {
            await fileSystem.deleteUpload(optionToRemove.image);
        }

        // Filter out the option
        questions[qIndex].options = questions[qIndex].options.filter((_, i) => i !== oIndex);
        
        // Update the correct answer index if the removed option was the correct one
        if (questions[qIndex].correct === oIndex) {
            questions[qIndex].correct = -1; 
        } else if (questions[qIndex].correct > oIndex) {
            questions[qIndex].correct -= 1; 
        }

        setFormDataAndDraft({ ...formData, questions });
    };
    
    /** Sets a specific option as the correct answer for its question. */
    const handleSetCorrect = (qIndex, oIndex) => {
        const questions = [...formData.questions];
        questions[qIndex].correct = oIndex;
        setFormDataAndDraft({ ...formData, questions });
    };


    // =================================================================
    // 5. RENDER LOGIC
    // =================================================================

    const user = session ? session.user : null;

    if (loading) {
        // Show a simple loading state while session check/data load happens
        return <h1>Loading Application...</h1>;
    }

    // --- Authentication View (If not logged in) ---
    if (!user) {
        // This state should be momentary before the redirect in useEffect happens
        return (
            <div>
                <h1>Supabase Form Builder</h1>
                <p>Redirecting to <a href="login.html">Login</a>...</p>
            </div>
        );
    }

    // --- Main Application View (If logged in) ---
    return (
        <div>
            <h1>Supabase Form Builder</h1>
            <p>Welcome, {user.email}! <button onClick={handleLogout}>Log Out</button></p>
            <p>Forms and images are stored securely in your Supabase account.</p>

            {error && <p className="error">{error}</p>}
            {success && <p className="success">{success}</p>}

            <h2>Form Management</h2>
            <p>
                {/* Link to the separate forms list/dashboard */}
                <a href="dashboard.html">
                    View All Forms (Dashboard)
                </a>
            </p>

            <h2>Create New Form</h2>
            <form onSubmit={handleCreateForm}>
                <input 
                    type="text" 
                    name="form_title" 
                    placeholder="Form title" 
                    required 
                    // Controlled input ensures this box clears on form switch
                    value={newFormTitle} 
                    onChange={(e) => setNewFormTitle(e.target.value)}
                />
                <button type="submit">Create Form</button>
            </form>

            {/* Form Editor View (only visible when a form is selected) */}
            {formId && formData.id && (
                <div key={formId}> 
                    <h2>Editing Form: {formData.title}</h2>
                    
                    {/* Title Input (resets because of key={formId} and uses onBlur to save local state) */}
                    <input 
                        key={formId}
                        type="text" 
                        name="form_title" 
                        defaultValue={formData.title} 
                        required 
                        onBlur={(e) => {
                            const newTitle = e.target.value.trim();
                            if (newTitle && newTitle !== formData.title) {
                                setFormDataAndDraft({ ...formData, title: newTitle });
                            }
                        }}
                    />

                    <div>
                        <button onClick={handleSaveForm} className="save-button">Save JSON to Database</button>
                        <button onClick={handleDeleteForm} className="delete-button">Delete Form & Images</button>
                    </div>

                    {/* --- Question/Option editing interface --- */}
                    {formData.questions.length === 0 ? (
                        <p>No questions yet. Add one below.</p>
                    ) : (
                        formData.questions.map((question, qIndex) => (
                            <div key={qIndex} className="question">
                                
                                <form onSubmit={(e) => handleUpdateQuestion(e, qIndex)} encType="multipart/form-data">
                                    {/* Question Text Input (Controlled Component) */}
                                    <input 
                                        type="text" 
                                        name="question_text" 
                                        value={question.text} 
                                        required 
                                        onChange={(e) => handleUpdateItemText(qIndex, undefined, e.target.value)}
                                    />
                                    <label htmlFor={`question_image_${qIndex}`}>Question Image (optional):</label>
                                    <input type="file" name="question_image" id={`question_image_${qIndex}`} accept="image/*" />
                                    <button type="submit">Update Question Image</button>
                                </form>

                                <StorageImage filePath={question.image} />

                                <button onClick={() => handleRemoveQuestion(qIndex)}>Remove Question</button>

                                <h4>Options:</h4>
                                {question.options.length === 0 ? (
                                    <p>No options yet.</p>
                                ) : (
                                    <ul>
                                        {question.options.map((option, oIndex) => (
                                            <li key={oIndex} className="option">
                                                <form onSubmit={(e) => handleUpdateOption(e, qIndex, oIndex)} encType="multipart/form-data">
                                                    {/* Option Text Input (Controlled Component) */}
                                                    <input 
                                                        type="text" 
                                                        name="option_text" 
                                                        value={option.text} 
                                                        style={{ width: '200px' }} 
                                                        onChange={(e) => handleUpdateItemText(qIndex, oIndex, e.target.value)}
                                                    />
                                                    {/* File input auto-submits form on change */}
                                                    <input 
                                                        type="file" 
                                                        name="option_image" 
                                                        accept="image/*" 
                                                        onChange={(e) => e.target.form.requestSubmit()} 
                                                    />
                                                    <button type="submit">Update Option</button>
                                                </form>
                                                
                                                <StorageImage filePath={option.image} />

                                                {question.correct === oIndex ? (
                                                    <strong>(Correct)</strong>
                                                ) : (
                                                    <button onClick={() => handleSetCorrect(qIndex, oIndex)}>Set as Correct</button>
                                                )}
                                                <button onClick={() => handleRemoveOption(qIndex, oIndex)}>Remove</button>
                                            </li>
                                        ))}
                                    </ul>
                                )}

                                <form onSubmit={(e) => handleAddOption(e, qIndex)} encType="multipart/form-data">
                                    <input type="text" name="option_text" placeholder="New option text" required />
                                    <label htmlFor={`option_image_${qIndex}`}>Option Image (optional):</label>
                                    <input type="file" name="option_image" id={`option_image_${qIndex}`} accept="image/*" />
                                    <button type="submit">Add Option</button>
                                </form>
                            </div>
                        ))
                    )}

                    <h3>Add New Question</h3>
                    <form onSubmit={handleAddQuestion} encType="multipart/form-data">
                        <input type="text" name="question_text" placeholder="Question text" required />
                        <label htmlFor="new_question_image">Question Image (optional):</label>
                        <input type="file" name="question_image" id="new_question_image" accept="image/*" />
                        <button type="submit">Add Question</button>
                    </form>
                </div>
            )}
        </div>
    );
}

// =================================================================
// 6. INITIAL RENDER
// =================================================================

ReactDOM.render(<App />, document.getElementById('root'));