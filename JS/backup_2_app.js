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

/** Component for selecting the question type. */
function QuestionTypeSelector({ currentType, qIndex, onTypeChange }) {
    const types = [
        { key: 'multiple_choice', label: 'Multiple Choice' },
        { key: 'connecting_dots', label: 'Connecting Dots' },
        { key: 'fill_in_blanks', label: 'Fill in the Blanks' },
    ];

    return (
        <div className="question-type-selector" style={{ padding: '10px 0', borderTop: '1px solid #ddd', marginTop: '10px' }}>
            <strong>Question Type:</strong>
            {types.map((type) => (
                <button
                    key={type.key}
                    onClick={() => onTypeChange(qIndex, type.key)}
                    style={{ 
                        margin: '0 5px', 
                        padding: '5px 10px',
                        backgroundColor: currentType === type.key ? '#007bff' : '#f0f0f0',
                        color: currentType === type.key ? 'white' : 'black',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    {type.label}
                </button>
            ))}
        </div>
    );
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
    // State for the "Create New Form" input box
    const [newFormTitle, setNewFormTitle] = React.useState(''); 
    
    const [error, setError] = React.useState('');
    const [success, setSuccess] = React.useState('');

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
    
    /** Handles changing the question type. */
    const handleUpdateQuestionType = (qIndex, newType) => {
        setFormDataAndDraft(prevFormData => {
            const newQuestions = [...prevFormData.questions];
            
            // Only update the type if it's new
            if (newQuestions[qIndex].type !== newType) {
                
                // --- Reset Options and Cleanup Images for Old Type ---
                const oldType = newQuestions[qIndex].type;
                if (oldType === 'multiple_choice') {
                     // Delete images associated with options before resetting options array
                    for (const option of newQuestions[qIndex].options) {
                        if (option.image) {
                            fileSystem.deleteUpload(option.image);
                        }
                    }
                }
                
                // Reset common properties and set defaults for new type
                newQuestions[qIndex].options = [];
                // Only relevant for multiple_choice and fill_in_blanks
                newQuestions[qIndex].correct = (newType === 'multiple_choice' || newType === 'fill_in_blanks') ? -1 : undefined; 

                // Ensure question image is removed if switching from MC to a type that doesn't support it
                if (newType !== 'multiple_choice' && newQuestions[qIndex].image) {
                    fileSystem.deleteUpload(newQuestions[qIndex].image);
                    newQuestions[qIndex].image = null;
                }

                newQuestions[qIndex].type = newType;
            }
            
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
                 setLoading(false); 
             }
        };

        // 1. Check session on mount (handles page reload)
        checkSessionAndRedirect();

        // 2. Subscribe to Auth Changes (handles real-time events like manual logout)
        const { data: { subscription } = {} } = supabase.auth.onAuthStateChange(
            (event, session) => {
                setSession(session);
                
                if (!session) {
                    // If session is removed (e.g., manual logout), redirect
                    window.location.href = 'login.html'; 
                }
            }
        );

        // Cleanup: Unsubscribe from the listener when component unmounts
        // Handle case where subscription might be null or undefined
        return () => {
             if (subscription && typeof subscription.unsubscribe === 'function') {
                subscription.unsubscribe();
            }
        };
    }, []); 
    
    /** Effect to load form data when formId changes (triggered by URL param or local state change). */
    React.useEffect(() => {
        if (formId && session) {

            // Clear previous form data immediately for a clean slate
            if (formData.id) {
                setFormData({}); 
            }

            // FALLBACK: LOAD FROM DATABASE 
            loadForm(formId); 

        } else if (!formId) {
            setFormData({});
        }
    }, [formId, session]);


    // --- Core Data Handlers ---
    
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
                // Ensure form_data has a 'type' property, defaulting to multiple_choice and handling correct/image cleanup
                const questionsWithTypes = data.form_data.questions.map(q => {
                    const type = q.type || 'multiple_choice';
                    // Ensure correct property exists if it's a selectable type
                    const correct = (type === 'multiple_choice' || type === 'fill_in_blanks') ? (q.correct === undefined ? -1 : q.correct) : undefined;
                    
                    // Clean up properties not relevant to the new type logic if necessary (Deep cleanup happens on type change, but this protects against old DB structure)
                    let options = q.options || [];

                    if (type === 'fill_in_blanks') {
                         // Ensure options for FITB don't contain image paths from an old MC setup
                        options = options.map(o => ({ text: o.text }));
                    }

                    return {
                        ...q,
                        type,
                        correct,
                        options
                    };
                });

                const loadedFormData = {
                    ...data.form_data,
                    questions: questionsWithTypes
                };
                
                setFormData(loadedFormData);
                setSuccess('Form loaded from Supabase Database!');
                localStorage.removeItem(`form_data_draft_${id}`); 
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

            setNewFormTitle(''); 

            setFormData(newForm);
            setFormId(newFormId);
            setError('');
            setSuccess('Form created and saved to Supabase Database!');
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
    
    // --- Question/Option CRUD Handlers ---

    /** Adds a new question (and optional image) to the form. */
    const handleAddQuestion = async (e) => {
        e.preventDefault();
        // Image upload was removed for initial question creation
        const text = e.target.question_text.value.trim();
        if (!text) return;

        setFormDataAndDraft({
            ...formData,
            questions: [...formData.questions, { 
                text, 
                image: null, 
                type: 'multiple_choice', // Default to multiple choice
                options: [], 
                correct: -1 
            }]
        });
        e.target.reset(); // Clear form inputs
    };

    /** Removes a question and deletes any associated images. */
    const handleRemoveQuestion = async (qIndex) => {
        const questionToRemove = formData.questions[qIndex];
        
        // Delete all images associated with this question
        if (questionToRemove.image) {
            await fileSystem.deleteUpload(questionToRemove.image);
        }
        
        // Delete images associated with options
        if (questionToRemove.type === 'multiple_choice') {
            for (const option of questionToRemove.options) {
                if (option.image) {
                    await fileSystem.deleteUpload(option.image);
                }
            }
        } else if (questionToRemove.type === 'connecting_dots') {
             // For Connecting Dots, options have 'image' property
            for (const option of questionToRemove.options) {
                if (option.image) {
                    await fileSystem.deleteUpload(option.image);
                }
            }
        }

        const newQuestions = formData.questions.filter((_, i) => i !== qIndex);
        setFormDataAndDraft({ ...formData, questions: newQuestions });
    };
    
    /** Handles image upload/replacement for an existing question (only for Multiple Choice). */
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
    
    /** Adds a new option (and optional image) to a specific question for Multiple Choice. */
    const handleAddMultipleChoiceOption = async (e, qIndex) => {
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

    /** Adds a new option for 'Fill in the Blanks'. (Text-only version of MC option) */
    const handleAddFillInTheBlankOption = (e, qIndex) => {
        e.preventDefault();
        const text = e.target.option_text.value.trim();
        if (!text) return;

        setFormDataAndDraft(prevFormData => {
            const newQuestions = [...prevFormData.questions];
            // The structure is simple text options
            newQuestions[qIndex].options.push({ text: text }); 
            // Ensure correct property exists
            if (newQuestions[qIndex].correct === undefined) newQuestions[qIndex].correct = -1;
            return { ...prevFormData, questions: newQuestions };
        });
        e.target.reset();
    };

    /** Adds a new paired option for 'Connecting Dots', assigning unique IDs, and handling images. */
    const handleAddConnectingDotPair = async (e, qIndex) => {
        e.preventDefault();
        const text1 = e.target.text1.value.trim();
        const text2 = e.target.text2.value.trim();
        const file1 = e.target.file1.files[0];
        const file2 = e.target.file2.files[0];

        if (!text1 || !text2) return;

        // Upload images if present
        let imagePath1 = null;
        let imagePath2 = null;
        if (file1 && session && formId) {
            imagePath1 = await fileSystem.saveUpload(session.user.id, formId, file1);
        }
        if (file2 && session && formId) {
            imagePath2 = await fileSystem.saveUpload(session.user.id, formId, file2);
        }

        // Generate unique IDs for the pair
        const id1 = crypto.randomUUID();
        const id2 = crypto.randomUUID();

        // Ensure options are created with a link to their match and images
        const newOptions = [
            { id: id1, text: text1, matchId: id2, image: imagePath1 },
            { id: id2, text: text2, matchId: id1, image: imagePath2 }
        ];

        setFormDataAndDraft(prevFormData => {
            const newQuestions = [...prevFormData.questions];
            newQuestions[qIndex].options = [...newQuestions[qIndex].options, ...newOptions];
            return { ...prevFormData, questions: newQuestions };
        });

        e.target.reset();
    };
    
    /** Handles image/text updates for an existing Multiple Choice option. */
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

    /** Handles image updates for an existing Connecting Dot option. */
    const handleUpdateCDOptionImage = async (e, qIndex, oIndex) => {
        e.preventDefault();
        const questions = [...formData.questions];
        const option = questions[qIndex].options[oIndex];
        const newFile = e.target.option_image.files[0];
        
        if (newFile && session && formId) {
            if (option.image) await fileSystem.deleteUpload(option.image);
            questions[qIndex].options[oIndex].image = await fileSystem.saveUpload(session.user.id, formId, newFile);
            setFormDataAndDraft({ ...formData, questions });
        } else if (newFile) {
            setError('Must be logged in and editing a form to upload images.');
        }

        e.target.reset(); // Clear the file input
    };

    /** Removes an option, handling image deletion for MC/CD and pair removal for CD. */
    const handleRemoveOption = async (qIndex, oIndex) => { 
        const questions = [...formData.questions];
        const question = questions[qIndex];
        const optionToRemove = question.options[oIndex];

        let newOptions = [...question.options];
        let optionsToKeep;

        if (question.type === 'connecting_dots') {
            const matchId = optionToRemove.matchId;
            const optionToMatch = newOptions.find(o => o.id === matchId);
            
            // Delete images for both options in the pair
            if (optionToRemove.image) {
                await fileSystem.deleteUpload(optionToRemove.image);
            }
            if (optionToMatch && optionToMatch.image) {
                await fileSystem.deleteUpload(optionToMatch.image);
            }

            // Filter out both the selected option (by index) and its pair (by ID)
            optionsToKeep = newOptions.filter((option, i) => i !== oIndex && option.id !== matchId);
            
        } else { // Handles multiple_choice and fill_in_blanks
            
            if (question.type === 'multiple_choice' && optionToRemove.image) {
                // Delete image only for multiple choice
                await fileSystem.deleteUpload(optionToRemove.image);
            }
            
            optionsToKeep = newOptions.filter((_, i) => i !== oIndex);
            
            // Update the correct answer index
            if (question.correct === oIndex) {
                questions[qIndex].correct = -1; 
            } else if (question.correct > oIndex) {
                questions[qIndex].correct -= 1; 
            }
        }

        questions[qIndex].options = optionsToKeep;
        setFormDataAndDraft({ ...formData, questions });
    };
    
    /** Sets a specific option as the correct answer for its question (Multiple Choice/Fill in Blanks only). */
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
            <p>Welcome, {user.email}! (You are currently logged in)</p>
            <p>Forms and images are stored securely in your Supabase account.</p>

            {error && <p className="error">{error}</p>}
            {success && <p className="success">{success}</p>}

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
                    
                    {/* Title Input */}
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
                            <div key={qIndex} className="question" style={{ border: '1px solid #ccc', padding: '15px', marginBottom: '20px' }}>
                                
                                {/* Question Text and Image Update Form */}
                                <form onSubmit={(e) => handleUpdateQuestion(e, qIndex)} encType="multipart/form-data">
                                    
                                    {/* Conditional Question Text Input */}
                                    {question.type === 'fill_in_blanks' ? (
                                        <textarea 
                                            name="question_text" 
                                            value={question.text} 
                                            required 
                                            rows="5"
                                            placeholder="Enter the entire paragraph text here."
                                            onChange={(e) => handleUpdateItemText(qIndex, undefined, e.target.value)}
                                        />
                                    ) : (
                                        <input 
                                            type="text" 
                                            name="question_text" 
                                            value={question.text} 
                                            required 
                                            onChange={(e) => handleUpdateItemText(qIndex, undefined, e.target.value)}
                                        />
                                    )}
                                    
                                    {/* Only allow question image upload for multiple choice */}
                                    {question.type === 'multiple_choice' && (
                                        <>
                                            <label htmlFor={`question_image_${qIndex}`}>Question Image (optional):</label>
                                            <input type="file" name="question_image" id={`question_image_${qIndex}`} accept="image/*" />
                                            <button type="submit">Update Question Image</button>
                                        </>
                                    )}
                                </form>

                                {/* Only display question image for multiple choice */}
                                {question.type === 'multiple_choice' && <StorageImage filePath={question.image} />}

                                <button onClick={() => handleRemoveQuestion(qIndex)} style={{ marginBottom: '10px' }}>Remove Question</button>

                                {/* --- Conditional Option Editors (MC and FITB share structure) --- */}
                                
                                {(question.type === 'multiple_choice' || question.type === 'fill_in_blanks') && (
                                    <>
                                        <h4>Options:</h4>
                                        {question.type === 'fill_in_blanks' && <p>Select the correct **answer** that will be placed in a blank. The student will choose the correct answer from these options.</p>}
                                        
                                        {question.options.length === 0 ? (
                                            <p>No options yet. Add one below.</p>
                                        ) : (
                                            <ul>
                                                {question.options.map((option, oIndex) => (
                                                    <li key={oIndex} className="option" style={{ borderBottom: '1px dotted #eee', paddingBottom: '5px' }}>
                                                        {/* Option Text Input (Controlled Component) */}
                                                        <input 
                                                            type="text" 
                                                            name="option_text" 
                                                            value={option.text} 
                                                            style={{ width: '200px' }} 
                                                            onChange={(e) => handleUpdateItemText(qIndex, oIndex, e.target.value)}
                                                        />
                                                        
                                                        {/* Option Image: Only for Multiple Choice */}
                                                        {question.type === 'multiple_choice' && (
                                                            <form style={{ display: 'inline-block', margin: '0 10px' }} onSubmit={(e) => handleUpdateOption(e, qIndex, oIndex)} encType="multipart/form-data">
                                                                <input 
                                                                    type="file" 
                                                                    name="option_image" 
                                                                    accept="image/*" 
                                                                    onChange={(e) => e.target.form.requestSubmit()} 
                                                                />
                                                                <button type="submit">Update Image</button>
                                                            </form>
                                                        )}
                                                        
                                                        {question.type === 'multiple_choice' && <StorageImage filePath={option.image} />}

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

                                        {/* Add Option Form */}
                                        <form 
                                            onSubmit={(e) => question.type === 'multiple_choice' ? handleAddMultipleChoiceOption(e, qIndex) : handleAddFillInTheBlankOption(e, qIndex)} 
                                            encType={question.type === 'multiple_choice' ? "multipart/form-data" : "application/x-www-form-urlencoded"}
                                        >
                                            <input type="text" name="option_text" placeholder="New option text" required />
                                            
                                            {/* Option Image: Only for Multiple Choice */}
                                            {question.type === 'multiple_choice' && (
                                                <>
                                                    <label htmlFor={`option_image_${qIndex}`}>Option Image (optional):</label>
                                                    <input type="file" name="option_image" id={`option_image_${qIndex}`} accept="image/*" />
                                                </>
                                            )}
                                            <button type="submit">Add Option</button>
                                        </form>
                                    </>
                                )}
                                
                                {question.type === 'connecting_dots' && (
                                    <>
                                        <h4>Connecting Pairs:</h4>
                                        <p style={{ margin: '5px 0' }}>**Note:** Options must be added in matched pairs. Deleting one option deletes its pair.</p>

                                        {question.options.length === 0 ? (
                                            <p>No pairs yet. Add a new pair below.</p>
                                        ) : (
                                            <ul>
                                                {question.options.map((option, oIndex) => (
                                                    <li key={option.id} className="option" style={{ borderBottom: '1px dotted #eee', paddingBottom: '5px' }}>
                                                        <form onSubmit={(e) => handleUpdateCDOptionImage(e, qIndex, oIndex)} encType="multipart/form-data">
                                                            {/* Text Input (Handled by onChange, not form submit) */}
                                                            <input 
                                                                type="text" 
                                                                value={option.text} 
                                                                style={{ width: '200px' }} 
                                                                onChange={(e) => handleUpdateItemText(qIndex, oIndex, e.target.value)}
                                                            />
                                                            
                                                            {/* Image Update */}
                                                            <input 
                                                                type="file" 
                                                                name="option_image" 
                                                                accept="image/*" 
                                                                onChange={(e) => e.target.form.requestSubmit()} 
                                                            />
                                                            <button type="submit">Update Image</button>
                                                            <StorageImage filePath={option.image} />
                                                        </form>
                                                        
                                                        <small> (ID: {option.id.substring(0, 4)}... | Match ID: {option.matchId.substring(0, 4)}...)</small>

                                                        <button onClick={() => handleRemoveOption(qIndex, oIndex)}>Remove Pair</button>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                        
                                        {/* Add Pair Form with Images */}
                                        <form onSubmit={(e) => handleAddConnectingDotPair(e, qIndex)} encType="multipart/form-data" style={{ border: '1px dashed #ccc', padding: '10px' }}>
                                            <div style={{ marginBottom: '10px' }}>
                                                <input type="text" name="text1" placeholder="Text for Col. 1" required style={{ display: 'block', marginBottom: '5px' }}/>
                                                <label>Image 1 (optional):</label>
                                                <input type="file" name="file1" accept="image/*" />
                                            </div>
                                            <div style={{ marginBottom: '10px' }}>
                                                <input type="text" name="text2" placeholder="Text for Col. 2" required style={{ display: 'block', marginBottom: '5px' }}/>
                                                <label>Image 2 (optional):</label>
                                                <input type="file" name="file2" accept="image/*" />
                                            </div>
                                            <button type="submit">Add Pair</button>
                                        </form>
                                    </>
                                )}

                                {/* Question Type Selector is now at the very bottom of the question block */}
                                <QuestionTypeSelector 
                                    currentType={question.type} 
                                    qIndex={qIndex} 
                                    onTypeChange={handleUpdateQuestionType} 
                                />
                            </div>
                        ))
                    )}

                    {/* --- Add New Question Input --- */}
                    <h3>Add New Question</h3>
                    <form onSubmit={handleAddQuestion}> 
                        <input type="text" name="question_text" placeholder="Question text" required />
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









// =================================================================
// 7. THE MODULAR COMPONENT
// =================================================================

function UserFormsList() {
    const [formsList, setFormsList] = React.useState(null); 
    const [loading, setLoading] = React.useState(true);
    const [debugError, setDebugError] = React.useState(''); // For displaying fetch errors

    const loadFormsList = async (uid) => {
        try {
            const { data, error } = await supabase
                .from(FORMS_TABLE)
                .select('id, title')
                .eq('user_id', uid); 
            
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
                <li key={form.id}>
                    <a style={{ color: '#000' }} href={`module.html?form_id=${form.id}`}>
                        {form.title}
                    </a>
                </li>
            ))}
        </ul>
    );
}

// =================================================================
// 8. ATTACH THE COMPONENT TO THE DOM
// =================================================================

// Ensure this ID matches the div in your HTML
ReactDOM.render(<UserFormsList />, document.getElementById('forms-list-container'));






const e = React.createElement;

// =================================================================
// 9. THE MODULAR COMPONENT (Login/Logout Toggle)
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
        buttonProps = { disabled: true, style: { ...baseStyle, backgroundColor: '#cccccc01', fontfamily: 'Inknut Antiqua SemiBold' } };
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
// 10. ATTACH THE COMPONENT TO THE DOM
// =================================================================

// This will render the component into the element with the ID 'auth-toggle-container'.
ReactDOM.render(e(AuthToggle), document.getElementById('auth-toggle-container'));