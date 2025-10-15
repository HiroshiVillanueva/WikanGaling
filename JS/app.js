// Ensure scripts are loaded for debugging purposes
console.log('App logic script loaded.');

// =================================================================
// 1. CONFIGURATION & INITIALIZATION
// =================================================================

// REPLACE WITH YOUR OWN KEYS
const SUPABASE_URL = "https://aliyyqinorqlwmjhbqza.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsaXl5cWlub3JxbHdtamhicXphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxMDY2OTgsImV4cCI6MjA3NDY4MjY5OH0.wqmf23uvtil0BJ0qlk8qm_Wq7LsaD1ClZKwnDr1OxME"; 

// Initialize Supabase Client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        // 🛑 CRITICAL FIX: Stops the Supabase client from forcing a full page reload on token refresh (tab focus).
        reloadOnAuthChange: false,
    }
}); 

// --- Constants ---
const FORMS_TABLE = 'module';
const FORMS_BUCKET = 'form_images'; 
// Global cache for image URLs to prevent redundant Supabase calls
const imageUrlCache = {};
// Student-side application URL base
const STUDENT_APP_URL_BASE = "https://wikan-galing-student-side.vercel.app/?form_id="; 

// Convenience for non-JSX rendering in modular components
const e = React.createElement; 


// =================================================================
// NEW: LOGIN REQUIRED MODAL COMPONENT
// =================================================================

/**
 * A simple modal component to inform the user they need to log in before redirecting.
 * @param {function} onRedirect - Function to call when the user clicks the login button.
 */
function LoginRequiredModal({ onRedirect }) {
    const modalStyle = {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(72, 76, 81, 0.7)', 
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10000, 
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

    // Use React.createElement for consistency if other modular components do
    return e('div', { style: modalStyle },
        e('div', { style: contentStyle },
            e('h2', null, 'Login Required'),
            e('p', { style: {color: 'black'} }, 'You must be logged in to access the Module Editor.'),
            e('button', { style: buttonStyle, onClick: onRedirect }, 'Go to Login Page')
        )
    );
}

// =================================================================
// 2. HELPER FUNCTIONS (Outside of App component)
// =================================================================

const fileSystem = {
    /** * Uploads a file to Supabase Storage and returns the file path. */
    saveUpload: async function(uid, formId, file) {
        if (!file || !uid || !formId) return null;
        
        // --- START OF MODIFICATION ---
        // 1. Sanitize the original file name
        // a. Replace spaces with underscores
        // b. Use encodeURIComponent to handle special characters (e.g., #, &, %, etc.)
        const sanitizedFilename = encodeURIComponent(file.name.replace(/\s/g, '_'));

        // 2. Construct the file path using the original, sanitized name
        // Storage path: [BUCKET]/[uid]/[formId]/[sanitizedFilename]
        const filename = `${formId}/${sanitizedFilename}`;
        // --- END OF MODIFICATION ---
        
        try {
            // Storage path: [BUCKET]/[uid]/[filename]
            const { error } = await supabase.storage
                .from(FORMS_BUCKET)
                // Use the new filename variable which contains the path: [formId]/[sanitizedFilename]
                .upload(`${uid}/${filename}`, file, { // <-- Path: [uid]/[formId]/[sanitizedFilename]
                    cacheControl: '3600',
                    // **CRITICAL CHANGE**: Set upsert to TRUE. 
                    // This allows overwriting an image if a user imports a new image 
                    // with the same original filename, which is necessary to replace files.
                    upsert: true 
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

/**
 * Extracts the clean filename from the Supabase storage path.
 */
const getFilenameFromPath = (filePath) => {
    if (!filePath) return 'No file chosen';
    const parts = filePath.split('/');
    // Filename is the last part
    return parts[parts.length - 1];
};



// =================================================================
// NEW: SAVING MODAL COMPONENT
// =================================================================

/**
 * A simple non-blocking modal component to indicate saving is in progress.
 */
function SavingModal() {
    const modalStyle = {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.4)', // Slightly transparent background
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10001, // Ensure it's above other modals like LoginRequiredModal (10000)
    };

    const contentStyle = {
        backgroundColor: 'white',
        padding: '20px 40px',
        borderRadius: '8px',
        textAlign: 'center',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
    };
    
    // Use React.createElement for consistency with the LoginRequiredModal
    return e('div', { style: modalStyle },
        e('div', { style: contentStyle },
            e('h2', { style: { color: '#009DFF' } }, 'Saving Module...'),
            e('p', { style: { color: 'black' } }, 'Please wait, your data is being synced.')
        )
    );
}



// =================================================================
// 3. REACT COMPONENTS
// =================================================================

/** Component for displaying the custom non-blocking notification/modal. */
function NotificationModal({ message, isLink, onClose }) {
    const link = isLink ? `${STUDENT_APP_URL_BASE}${message}` : null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
        }}>
            <div style={{
                backgroundColor: 'white',
                padding: '30px',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                maxWidth: '400px',
                width: '90%',
                textAlign: 'center',
            }}>
                <h3 style={{ borderBottom: '2px solid #009DFF', paddingBottom: '10px', marginBottom: '20px', color: '#009DFF' }}>
                    {isLink ? 'Module Published!' : 'Notification'}
                </h3>
                
                {isLink ? (
                    <>
                        <p style={{ marginBottom: '10px' }}>
                            Your module is now published. Share this link with students:
                        </p>
                        <a 
                            href={link} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            style={{ 
                                display: 'block', 
                                wordBreak: 'break-all', 
                                padding: '10px', 
                                backgroundColor: '#f0f0f0', 
                                borderRadius: '4px',
                                textDecoration: 'none',
                                color: '#333'
                            }}
                        >
                            {link}
                        </a>
                        <button
                            onClick={() => {
                                // Logic to copy link to clipboard (using non-navigator method for iFrame compatibility)
                                const tempInput = document.createElement("input");
                                tempInput.value = link;
                                document.body.appendChild(tempInput);
                                tempInput.select();
                                document.execCommand("copy");
                                document.body.removeChild(tempInput);
                                alert("Link copied to clipboard!"); // Use a temporary native alert for copy success
                                onClose();
                            }}
                            style={{
                                marginTop: '20px',
                                backgroundColor: '#009DFF',
                                color: 'white',
                                padding: '10px 15px',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                            }}
                        >
                            Copy Link & Close
                        </button>
                    </>
                ) : (
                    <>
                        <p>{message}</p>
                        <button 
                            onClick={onClose}
                            style={{
                                marginTop: '20px',
                                backgroundColor: '#FF5255',
                                color: 'white',
                                padding: '10px 15px',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                            }}
                        >
                            Close
                        </button>
                    </>
                )}
                
            </div>
        </div>
    );
}


/** Component for selecting the question type. */
function QuestionTypeSelector({ currentType, qIndex, onTypeChange }) {
    const types = [
        { key: 'multiple_choice', label: 'Multiple Choice' },
        { key: 'connecting_dots', label: 'Matching Types' },
        { key: 'fill_in_blanks', label: 'Fill in the Blanks' },
    ];

    return (
        <div className="question-type-selector">
            {types.map((type) => (
                <button // Question Type Selector Button
                    key={type.key}
                    onClick={() => onTypeChange(qIndex, type.key)}
                    style={{ 
                        margin: '0 1em 0.8em 1em', 
                        padding: '0.5em 1.5em',
                        backgroundColor: currentType === type.key ? '#009DFF' : '#81C5EF',
                        color: currentType === type.key ? 'white' : 'black',
                        border: '1px solid #cccccc01',
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
// 3A. COMPONENT ABSTRACTION: Question Text/Image Editor
// =================================================================

function QuestionTextAndImageForm({ question, qIndex, onUpdateItemText, onUpdateQuestion }) {
    const filename = getFilenameFromPath(question.image);
    const uniqueId = `question_image_${qIndex}`;

    return (
        <form class="questionHeader" onSubmit={(e) => onUpdateQuestion(e, qIndex)} encType="multipart/form-data">
            
            {/* Conditional if-else statement to determine Question Text Input */}
            {question.type === 'fill_in_blanks' ? (
                <textarea // Use textarea for Fill in the Blanks for longer text
                    name="question_text" 
                    value={question.text} 
                    required 
                    rows="5"
                    placeholder="Enter the entire paragraph text here. Mark blanks with [BLANK] or by typing the correct answer in brackets."
                    onChange={(e) => onUpdateItemText(qIndex, undefined, e.target.value)}
                />
            ) : (
                <input // Use single-line input for other types
                    type="text" 
                    name="question_text" 
                    placeholder="Enter Question Text Here" 
                    value={question.text} 
                    required 
                    onChange={(e) => onUpdateItemText(qIndex, undefined, e.target.value)}
                />
            )}
        </form>
    );
}


// =================================================================
// 3B. COMPONENT ABSTRACTION: Multiple Choice / Fill-in-the-Blank Options Editor
// =================================================================

function MultipleChoiceOptions({
    question, qIndex, onUpdateItemText, onUpdateOption, onRemoveOption, onSetCorrect, 
    handleAddMultipleChoiceOption, handleAddFillInTheBlankOption
}) {
    const isMultipleChoice = question.type === 'multiple_choice';
    const isFillInTheBlank = question.type === 'fill_in_blanks';
    // Choose the correct handler based on the question type
    const handleAddOption = isMultipleChoice ? handleAddMultipleChoiceOption : handleAddFillInTheBlankOption;

    return (
        <>  <div class="optionBackground">       
                {question.options.length === 0 ? (
                    <p style={{marginLeft: '8px'}}>No options yet. Add one below.</p>
                ) : (
                    <ul>
                        {question.options.map((option, oIndex) => {
                            const uniqueId = `option_image_${qIndex}_${oIndex}`;
                            const filename = getFilenameFromPath(option.image);

                            return (
                                <li key={oIndex} className="option">
                                    <div class="valueOptionGroup">                                       
                                        {/* Option Text Input (Controlled Component) */}
                                        <input 
                                            type="text" 
                                            name="option_text" 
                                            placeholder="Enter Option Text Here" 
                                            value={option.text} 
                                            style={{ width: '200px' }} 
                                            onChange={(e) => onUpdateItemText(qIndex, oIndex, e.target.value)}
                                        />
                                    </div>
                                    {/* Option Image: Only for Multiple Choice */}
                                    {isMultipleChoice && (
                                        <form class="optionImageGroup" onSubmit={(e) => onUpdateOption(e, qIndex, oIndex)} encType="multipart/form-data">
                                            
                                            {/* --- START OF CUSTOM FILE INPUT DISPLAY --- */}
                                            <label htmlFor={uniqueId}
                                            class="optionImage"
                                            style={{ 
                                                margin: '0 1em',
                                                cursor: 'pointer',
                                                fontSize: 'small'
                                            }}>
                                                {filename}
                                                {/* Hidden actual file input */}
                                                <input 
                                                    type="file" 
                                                    name="option_image" 
                                                    id={uniqueId}
                                                    accept="image/*" 
                                                    onChange={(e) => e.target.form.requestSubmit()} 
                                                    style={{
                                                        position: 'absolute',
                                                        padding: '0',
                                                        margin: '-1px',
                                                        overflow: 'hidden',
                                                        clip: 'rect(0, 0, 0, 0)',
                                                    }}
                                                />
                                            </label>
                                            {/* --- END OF CUSTOM FILE INPUT DISPLAY --- */}

                                            <button type="submit">Import Image</button>
                                        </form>
                                    )}

                                    {/* --- BUTTONS MOVED BEFORE INPUT (Previous change) --- */}
                                        {question.correct === oIndex ? (
                                            <button class="optionbuttonGroup setCorrect">CORRECT</button>
                                        ) : (
                                            <button class="optionbuttonGroup" onClick={() => onSetCorrect(qIndex, oIndex)}>CORRECT</button>
                                        )}
                            
                                        <button class="Discard"  onClick={() => onRemoveOption(qIndex, oIndex)}>X</button>
                                        {/* --- END BUTTONS --- */}
                                </li>
                            );
                        })}
                    </ul>
                )}

                {/* Add Option Form */}
                <form style={{borderTop: 'solid 1px #00000050'}}
                    class="addOptiongroup"
                    onSubmit={(e) => handleAddOption(e, qIndex)} 
                    encType={isMultipleChoice ? "multipart/form-data" : "application/x-www-form-urlencoded"}
                >
                        {/* 1. REMOVED 'required' attribute to allow empty submission */}
                        <input type="text" name="option_text" placeholder="Enter New Option Text Here" />
                    
                    {/* Option Image: Only for Multiple Choice (Normal file input for ADD) */}
                    {isMultipleChoice && (
                        <>
                            <input type="file" name="option_image" id={`option_image_add_${qIndex}`} accept="image/*" />
                        </>
                    )}

                    <button type="submit">ADD</button>
                </form>
            </div>   
        </>
    );
}

// =================================================================
// 3C. COMPONENT ABSTRACTION: Connecting Dots Options Editor
// =================================================================

function ConnectingDotsOptions({ question, qIndex, onUpdateItemText, onUpdateCDOptionImage, onRemoveOption, handleAddConnectingDotPair }) {
    
    // 1. Logic to group options into pairs
    const pairs = [];
    const processedIds = new Set();

    question.options.forEach((optionA, indexA) => {
        if (!processedIds.has(optionA.id)) {
            // Find its match
            const optionB = question.options.find(o => o.id === optionA.matchId);
            const indexB = question.options.findIndex(o => o.id === optionA.matchId);

            if (optionB) {
                // Store the pair, ensuring a consistent order (e.g., by original index)
                // This is the core data structure for rendering
                pairs.push({
                    a: { ...optionA, originalIndex: indexA },
                    b: { ...optionB, originalIndex: indexB }
                });

                // Mark both as processed
                processedIds.add(optionA.id);
                processedIds.add(optionB.id);
            }
        }
    });

    // Helper function to render the editor for one side of the pair (Column 1 or 2)
    const renderOptionEditor = (option) => {
        const uniqueId = `cd_option_image_${qIndex}_${option.originalIndex}`;
        const filename = getFilenameFromPath(option.image);

        return (
            <div style={{ border: '1px solid #ccc', padding: '10px', marginBottom: '10px', flex: '1 1 45%', minWidth: '300px' }}>
                <form onSubmit={(e) => onUpdateCDOptionImage(e, qIndex, option.originalIndex)} encType="multipart/form-data">
                    {/* Text Input (Handled by onChange, not form submit) */}
                    <input 
                        type="text" 
                        value={option.text} 
                        placeholder="Enter Option Text Here" 
                        style={{ width: '150px', marginRight: '5px' }} 
                        onChange={(e) => onUpdateItemText(qIndex, option.originalIndex, e.target.value)}
                    />
                    
                    <div>
                        {/* --- START OF CUSTOM FILE INPUT DISPLAY --- */}
                        <label htmlFor={uniqueId} 
                        className="optionImage"
                        style={{ 
                            margin: '0 1em',
                            cursor: 'pointer',
                            fontSize: 'small'
                        }}>
                            {filename}
                            {/* Hidden actual file input */}
                            <input 
                                type="file" 
                                name="option_image" 
                                id={uniqueId}
                                accept="image/*" 
                                onChange={(e) => e.target.form.requestSubmit()} 
                                style={{
                                    position: 'absolute',
                                    margin: '-1px',
                                    overflow: 'hidden',
                                    clip: 'rect(0, 0, 0, 0)',
                                }}
                            />
                        </label>
                        <button class="questionImageButtonConnecterDots" type="submit">Import Image</button>
                    </div>
                </form>
            </div>
        );
    };

    return (
        <>
            <div class="connectingPairOptionBackground">
                {pairs.length === 0 ? (
                    <p style={{marginLeft: '8px'}}>No pairs yet. Add a new pair below.</p>
                ) : (
                    <ul>
                        {pairs.map((pair) => {
                            // Use the original index of option A for the removal handler
                            const removeIndex = pair.a.originalIndex; 

                            return (
                                // Main list item for the PAIR
                                <li key={pair.a.id} className="pair" style={{ padding: '15px', marginBottom: '15px', borderRadius: '5px' }}>
                                    {/* Container for the two columns */}
                                    <div style={{ display: 'grid', justifyContent: '', flexWrap: 'wrap', flexGrow: '1' }}>
                                        {renderOptionEditor(pair.a)}
                                        {renderOptionEditor(pair.b)}
                                    </div>

                                    <div style={{textAlign: 'right' }}>
                                        <button 
                                            onClick={() => onRemoveOption(qIndex, removeIndex)} 
                                            class="removePair"
                                            style={{ backgroundColor: '#CA7B7C'}}
                                        >
                                            X
                                        </button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
                
                {/* Add Pair Form with Images */}
                <form class="addOptionConnectingDots" onSubmit={(e) => handleAddConnectingDotPair(e, qIndex)} encType="multipart/form-data">
                    <div class="addQuestionPair">  
                        <div style={{ margin: '10px' }}>
                            {/* 2. REMOVED 'required' attribute to allow empty submission */}
                            <input type="text" name="text1" placeholder="Enter New Option Text for First Column" style={{ display: 'block'}}/>
                            <input type="file" name="file1" accept="image/*" />
                        </div>
                        <div style={{ margin: '10px' }}>
                            {/* 3. REMOVED 'required' attribute to allow empty submission */}
                            <input type="text" name="text2" placeholder="Enter New Option Text for Second Column" style={{ display: 'block'}}/>
                            <input type="file" name="file2" accept="image/*" />
                        </div>
                    </div> 
                    <button type="submit">ADD</button>
                </form>
            </div>
        </>
    );
}

// =================================================================
// 3D. COMPONENT ABSTRACTION: Question Editor Wrapper
// =================================================================

function QuestionEditor({
    question, qIndex, 
    onUpdateItemText, onUpdateQuestion, onRemoveQuestion, onUpdateQuestionType, onRemoveOption,
    // MC/FITB Handlers
    handleAddMultipleChoiceOption, handleAddFillInTheBlankOption, handleUpdateOption, handleSetCorrect, 
    // CD Handlers
    handleAddConnectingDotPair, onUpdateCDOptionImage
}) {
    
    // Prepare props for the Multiple Choice/FITB Options component
    const mcFitbProps = {
        question, qIndex, onUpdateItemText, onRemoveOption,
        onUpdateOption: handleUpdateOption,
        onSetCorrect: handleSetCorrect,
        handleAddMultipleChoiceOption, 
        handleAddFillInTheBlankOption 
    };

    // Prepare props for the Connecting Dots Options component
    const cdProps = {
        question, qIndex, onUpdateItemText, onRemoveOption,
        onUpdateCDOptionImage,
        handleAddConnectingDotPair 
    };

    return (
        <div className="question" style={{ border: '1px solid #ccc', padding: '15px', marginBottom: '20px' }}>

            {/* 2. The Type Selector */}
            <QuestionTypeSelector 
                currentType={question.type} 
                qIndex={qIndex} 
                onTypeChange={onUpdateQuestionType} 
            />
            
            {/* START: Grouping the Question Form and Remove Button with flex layout */}
            <div style={{ 
                display: 'flex', 
                alignItems: 'flex-start', 
                gap: '20px', 
                marginBottom: '10px',
                // Ensures the content can wrap if the screen is too narrow
                flexWrap: 'wrap' 
            }}>
                
                {/* 1. Question Text and Image Form (Wrapped to allow flex growth) */}
                <div style={{ flexGrow: 1, minWidth: '300px' }}> 
                    <QuestionTextAndImageForm 
                        question={question}
                        qIndex={qIndex}
                        onUpdateItemText={onUpdateItemText}
                        onUpdateQuestion={onUpdateQuestion}
                    />
                </div>

                {/* 2. Remove Question Button */}
                <button onClick={() => onRemoveQuestion(qIndex)} class="removeQuestion" style={{ flexShrink: 0 }}>
                    X
                </button>
            
            </div>
            {/* END: Grouping the Question Form and Remove Button */}

            {/* 3. Render the specific Options Editor based on type */}
            {question.type === 'multiple_choice' || question.type === 'fill_in_blanks' ? (
                <MultipleChoiceOptions {...mcFitbProps} />
            ) : question.type === 'connecting_dots' ? (
                <ConnectingDotsOptions {...cdProps} />
            ) : null}
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
    const [formId, setFormId] => React.useState(new URLSearchParams(window.location.search).get('form_id') || '');
    // The main object containing all form data (title, questions, options)
    const [formData, setFormData] = React.useState({}); 
    // State for the "Create New Form" input box
    const [newFormTitle, setNewFormTitle] = React.useState(''); 
    
    const [error, setError] = React.useState('');
    const [success, setSuccess] = React.useState('');
    
    // NEW STATE: For the custom notification modal
    const [notification, setNotification] = React.useState({ show: false, message: '', isLink: false });
    
    // NEW STATE: For the login required modal
    const [showLoginModal, setShowLoginModal] = React.useState(false);

    // ADD THIS NEW STATE
    const [showSavingModal, setShowSavingModal] = React.useState(false); 
    
    // >>> START OF CHANGES FOR WARNING ALERT <<<
    const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false); // <-- 1. NEW STATE: The boolean flag
    const hasUnsavedChangesRef = React.useRef(false); // <-- NEW REF to track the state for event listener
    // >>> END OF CHANGES FOR WARNING ALERT <<<


    // --- State & Draft Helpers ---
    /** Updates the main formData state and saves the current state to local storage as a draft. */
    const setFormDataAndDraft = (newFormData) => {
        setFormData(newFormData);
        
        // CRITICAL CHANGE: Set the flag to true on any data change (input, button press that modifies content)
        setHasUnsavedChanges(true); 

        // Use module_id for local storage keying
        if (newFormData && newFormData.module_id && Object.keys(newFormData).length > 0) {
            localStorage.setItem(`form_data_draft_${newFormData.module_id}`, JSON.stringify(newFormData));
        }
    };

    /** Handles text changes for both question text and option text (Controlled Component Logic). */
    const handleUpdateItemText = (qIndex, oIndex, newText) => {
        setFormDataAndDraft(prevFormData => {
            const newQuestions = [...(prevFormData.questions || [])];
            
            if (!newQuestions[qIndex]) return prevFormData;

            if (oIndex !== undefined) {
                // Update Option Text (if oIndex is provided)
                if (newQuestions[qIndex].options && newQuestions[qIndex].options[oIndex]) {
                    newQuestions[qIndex].options[oIndex].text = newText;
                }
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
            const newQuestions = [...(prevFormData.questions || [])];
            if (!newQuestions[qIndex] || newQuestions[qIndex].type === newType) return prevFormData;

            // --- Reset Options and Cleanup Images for Old Type ---
            const oldType = newQuestions[qIndex].type;
            if (oldType === 'multiple_choice' || oldType === 'connecting_dots') {
                 // Delete images associated with options before resetting options array
                for (const option of newQuestions[qIndex].options || []) {
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
            
            return { ...prevFormData, questions: newQuestions };
        });
    };
    
    // NEW HANDLER: For the modal's redirect button
    const handleLoginRedirect = () => {
        window.location.href = 'login.html'; 
    };

    // --- Effects (Hooks) ---
    
    // >>> START OF CHANGES FOR WARNING ALERT <<<
    // Side effect to keep the ref updated with the latest state
    React.useEffect(() => {
        hasUnsavedChangesRef.current = hasUnsavedChanges;
    }, [hasUnsavedChanges]);
    // >>> END OF CHANGES FOR WARNING ALERT <<<

    /** Effect to clear the "Create New Form" text box when a user switches to editing an existing form. */
    React.useEffect(() => {
        if (formId) {
            setNewFormTitle(''); 
        }
    }, [formId]); 
    
    /** * Primary Effect for handling Supabase Authentication, Autosave, and Listeners.
     * This effect must be re-run whenever a function it calls changes (e.g., handleSaveForm),
     * so it uses a ref for the save function to stabilize it for the event listeners.
     */
    const saveFormRef = React.useRef(handleSaveForm);
    React.useEffect(() => {
        // Update the ref whenever handleSaveForm changes
        saveFormRef.current = handleSaveForm;
    }, [handleSaveForm]);


    React.useEffect(() => {
        
        // Function to check session, load data, or redirect to login
        const checkSessionAndRedirect = async () => {
             // 1. Get current session
             const { data: { session } } = await supabase.auth.getSession();
             setSession(session); // Set session state based on initial check
             
             if (!session) {
                 // No session found: Set state to show the modal
                 setLoading(false); // Stop loading UI
                 setShowLoginModal(true); // Show the modal
             } else {
                 // Session exists: Proceed to clear loading
                 setLoading(false); 
             }
        };

        // ----------------------------------------------------
        // AUTOSAVE / WARNING HANDLERS
        // ----------------------------------------------------

        // Handler for when the tab/window loses focus
        const handleVisibilityChange = () => {
            // Check if the document is now hidden (user switched tabs or minimized)
            if (document.visibilityState === 'hidden') {
                // Use the ref to call the latest version of handleSaveForm
                saveFormRef.current(); 
                console.log('Autosave triggered on tab switch/loss of focus.');
            }
        };

        // >>> START OF CHANGES FOR WARNING ALERT <<<
        // Handler for when the user attempts to close the window or navigate away
        const handleBeforeUnload = (event) => {
            // CRITICAL CHANGE: Check the flag via the ref. If true, show warning and skip autosave.
            if (hasUnsavedChangesRef.current) {
                // Display the standard browser warning alert
                event.preventDefault(); // For older browsers
                event.returnValue = ''; // Required for the prompt to show in modern browsers
                console.log('Warning alert triggered due to unsaved changes.');
            } else {
                // If no unsaved changes, still perform the final autosave for safety
                saveFormRef.current();
                console.log('Autosave triggered on page close/reload (no warning shown).');
            }
        };
        // >>> END OF CHANGES FOR WARNING ALERT <<<


        // ----------------------------------------------------
        // 1. Initial Check & Session Subscription
        // ----------------------------------------------------
        checkSessionAndRedirect();

        const { data: { subscription } = {} } = supabase.auth.onAuthStateChange(
            (event, session) => {
                // This listener ensures setSession is updated if the user logs in/out 
                // in another tab, which is necessary to trigger form loading/clearing.
                setSession(session); 
                
                if (!session) {
                    setShowLoginModal(true);
                    setFormId(''); // Clear form context
                    setFormData({}); // Clear form data
                }
            }
        );

        // ----------------------------------------------------
        // 2. Add Event Listeners for Autosave
        // ----------------------------------------------------
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', handleBeforeUnload);

        // ----------------------------------------------------
        // 3. Cleanup Function
        // ----------------------------------------------------
        return () => {
            if (subscription && typeof subscription.unsubscribe === 'function') {
                subscription.unsubscribe();
            }
            // Remove listeners when the component unmounts
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [handleSaveForm]); // handleSaveForm is a dependency to update the ref


    /** Effect to load form data when formId changes (triggered by URL param or local state change). 
     * CRITICAL FIX: Dependency is now 'session?.user?.id' to avoid reloading on tab focus/token refresh. 
     */
    React.useEffect(() => {
        // Only proceed if a form is selected AND we have a valid session user ID
        if (formId && session && session.user && session.user.id) {

            // Clear previous form data immediately for a clean slate
            // Check against module_id instead of id
            if (formData.module_id && formData.module_id !== formId) {
                setFormData({}); 
            }

            // FALLBACK: LOAD FROM DATABASE 
            loadForm(formId); 

        } else if (!formId) {
            setFormData({});
        }
    // CRITICAL CHANGE: Using session.user.id as a dependency. When the token refreshes, 
    // the entire 'session' object reference changes, but 'session.user.id' does not. 
    // This stops redundant fetching on tab focus.
    }, [formId, session?.user?.id]);


    // --- Core Data Handlers ---
    
    /** Fetches a single form's data from the database. */
    const loadForm = async (id) => {
        setError('');
        try {
            // 1. Check local draft first
            const draftKey = `form_data_draft_${id}`;
            const draft = localStorage.getItem(draftKey);
            
            if (draft) {
                try {
                    const parsedDraft = JSON.parse(draft);
                    
                    // Add cleanup/default logic for older drafts
                    const questionsWithTypes = (parsedDraft.questions || []).map(q => {
                        const type = q.type || 'multiple_choice';
                        const correct = (type === 'multiple_choice' || type === 'fill_in_blanks') ? (q.correct === undefined ? -1 : q.correct) : undefined;
                        let options = q.options || [];
                        if (type === 'fill_in_blanks') {
                            options = options.map(o => ({ text: o.text }));
                        }
                        return { ...q, type, correct, options };
                    });
                    
                    // Ensure the primary key in state is 'module_id'
                    setFormDataAndDraft({ ...parsedDraft, module_id: id, questions: questionsWithTypes });
                    setSuccess('Loaded local draft.');
                    return;

                } catch (e) {
                    console.error("Error parsing local draft:", e);
                    localStorage.removeItem(draftKey); // Clear bad draft
                }
            }
            
            // 2. Load from Database
            const { data, error } = await supabase
                .from(FORMS_TABLE)
                // Select module_id, title, form_data, and DESCRIPTION
                .select('module_id, title, description, form_data') // <--- ADDED 'description'
                // Filter by module_id (was id)
                .eq('module_id', id)
                .single();

            if (error) throw error;
            if (data) {
                // Ensure form_data has a 'type' property, defaulting to multiple_choice and handling correct/image cleanup
                const questionsWithTypes = (data.form_data.questions || []).map(q => {
                    const type = q.type || 'multiple_choice';
                    // Ensure correct property exists if it's a selectable type
                    const correct = (type === 'multiple_choice' || type === 'fill_in_blanks') ? (q.correct === undefined ? -1 : q.correct) : undefined;
                    
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
                    // Use module_id as the primary key in state
                    module_id: data.module_id,
                    title: data.title,
                    description: data.description || '', // <--- ADDED description with a fallback
                    questions: questionsWithTypes
                };
                
                setFormDataAndDraft(loadedFormData);
                setSuccess('Form loaded from Database!');
                // Remove draft now that database version is loaded
                localStorage.removeItem(`form_data_draft_${id}`); 
            } else {
                throw new Error('Form not found.');
            }
        } catch (err) {
            setError('Error loading form: ' + err.message);
            // Fallback to empty form structure if load fails
            // Use module_id for the ID in the fallback structure
            setFormDataAndDraft({ module_id: id, title: 'Untitled Form', questions: [] });
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
        // Use module_id in the new form structure
        // Include description in the new state structure
        const newForm = { module_id: newFormId, title: formTitle, description: '', questions: [] }; // <--- ADDED description

        try {
            const { error } = await supabase
                .from(FORMS_TABLE)
                .insert({
                    // Use module_id and teacher_id
                    module_id: newFormId,
                    teacher_id: session.user.id, // Renamed from user_id
                    title: formTitle,
                    description: '', // <--- ADDED description to the database insert
                    form_data: { questions: [] } // Store an empty questions array initially
                });
            
            if (error) throw error;

            setNewFormTitle(''); 

            setFormData(newForm);
            setFormId(newFormId);
            setError('');
            setSuccess('Form created and saved to Database!');
            window.history.pushState({}, '', `?form_id=${newFormId}`); 
        } catch (err) {
            setError('Error creating form: ' + err.message);
        }
    };

    /** Saves all current form data. */
    const handleSaveForm = async () => {
        // Use a 50ms timeout to ensure React state updates (from inputs) finalize
        return new Promise((resolve) => {
            // New logic: Show the saving modal immediately
            setShowSavingModal(true); 

            setTimeout(async () => { 
                const latestFormData = formData; 
                
                if (formId && latestFormData && session) {
                    try {
                        // Extract properties to be stored at the top level (use module_id instead of id)
                        // Include description
                        const { module_id, title, description, teacher_id, ...form_data_json } = latestFormData; // <--- ADDED description to destructuring

                        const { error } = await supabase
                            .from(FORMS_TABLE)
                            .update({
                                title: title,
                                description: description, // <--- ADDED description to the database update
                                form_data: form_data_json, // Save the questions, etc.
                            })
                            // Filter by module_id and teacher_id
                            .eq('module_id', module_id || formId)
                            .eq('teacher_id', session.user.id) // Renamed from user_id
                            .select();

                        if (error) throw error;
                        
                        localStorage.removeItem(`form_data_draft_${formId}`);
                        
                        // CRITICAL CHANGE: Reset the flag to false upon successful save
                        setHasUnsavedChanges(false);

                        // New logic: Hide modal and set success message
                        setShowSavingModal(false); 
                        
                        // Only show success message for manual saves, not for silent autosaves
                        if (document.visibilityState === 'visible') {
                            // alert("Form saved successfully!") // <--- REMOVED
                            setSuccess('Form saved successfully to Database!');
                        }
                        resolve(true); // Resolve the promise successfully
                        
                    } catch (err) {
                        // New logic: Hide modal on error
                        setShowSavingModal(false); 
                        setError('Error saving form: ' + err.message);
                        resolve(false); // Resolve the promise with failure
                    }
                } else {
                    // New logic: Hide modal if save conditions not met
                    setShowSavingModal(false); 
                    resolve(false); // Resolve with failure if conditions aren't met
                }
            }, 50);
        });
    };
    
    /** NEW HANDLER: Saves the form and displays the public link. */
    const handlePublishModule = async () => {
        const success = await handleSaveForm(); // Wait for the save operation to complete

        if (success && formId) {
            setNotification({
                show: true,
                message: formId, // Pass the formId as the message for link construction
                isLink: true 
            });
        } else if (!formId) {
            setError("Cannot publish: Please create or load a form first.");
        }
    };

    /** Deletes the form entry, including all associated files in storage. */
    const handleDeleteForm = async () => {
        // Using custom modal instead of window.confirm for consistency, but reusing the window.confirm 
        // prompt since we cannot generate a new component for a simple delete confirmation.
        if (window.confirm('Are you sure you want to delete this form and all images?')) { 
            if (formId && session) {
                try {
                    // 1. Delete all associated images from Storage
                    // Note: Supabase Storage paths are typically bucket/folder/file. Here, the 'folder' is constructed as [user_id]/[formId].
                    const { data: listData } = await supabase.storage
                        .from(FORMS_BUCKET)
                        // List files under the teacher's ID directory (was user_id)
                        .list(`${session.user.id}/${formId}`, { limit: 100 }); 

                    if (listData && listData.length > 0) {
                        // Files are listed with their name relative to the path, so we rebuild the full path
                        const filesToDelete = listData.map(file => `${session.user.id}/${formId}/${file.name}`);
                        if (filesToDelete.length > 0) {
                            // The .remove method expects full paths from the bucket root
                            await supabase.storage.from(FORMS_BUCKET).remove(filesToDelete);
                        }
                    }

                    // 2. Delete JSON entry from Database
                    const { error: dbError } = await supabase
                        .from(FORMS_TABLE)
                        .delete()
                        // Filter by module_id and teacher_id
                        .eq('module_id', formId)
                        .eq('teacher_id', session.user.id); // Ensure user owns the form (was user_id)
                    
                    if (dbError) throw dbError;

                    // 3. Clean up local state
                    localStorage.removeItem(`form_data_draft_${formId}`);
                    setFormId('');
                    setFormData({});
                    // CRITICAL CHANGE: Reset the flag after deletion
                    setHasUnsavedChanges(false);
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
        const text = e.target.question_text.value.trim();
        
        // --- MODIFIED SECTION ---
        // 1. Remove the check that returns early if the text is empty.
        
        // 2. Define default text if the input is empty
        const questionText = text || 'New Question (Click to Edit)'; 
        // --- END MODIFIED SECTION ---

        setFormDataAndDraft(prevFormData => ({
            ...prevFormData,
            questions: [...(prevFormData.questions || []), { 
                id: crypto.randomUUID(), // Unique ID for keying/removal
                text: questionText, // Use the new text variable
                image: null, 
                type: 'multiple_choice', // Default to multiple choice
                options: [], 
                correct: -1 
            }]
        }));
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
        if (questionToRemove.options) {
            for (const option of questionToRemove.options) {
                if (option.image) {
                    await fileSystem.deleteUpload(option.image);
                }
            }
        }

        const newQuestions = (formData.questions || []).filter((_, i) => i !== qIndex);
        setFormDataAndDraft({ ...formData, questions: newQuestions });
    };
    
    /** Handles image upload/replacement for an existing question (only for Multiple Choice). */
    const handleUpdateQuestion = async (e, qIndex) => { 
        e.preventDefault();
        const questions = [...(formData.questions || [])];
        if (!questions[qIndex]) return;
        
        // The actual file input is hidden inside a label now, so we must access it directly:
        const fileInput = document.getElementById(`question_image_${qIndex}`); 
        const newFile = fileInput ? fileInput.files[0] : null;

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
        window.alert('Image has been successfully saved!');
        e.target.reset(); // Clear the file input
    };
    
    /** Adds a new option (and optional image) to a specific question for Multiple Choice. */
    const handleAddMultipleChoiceOption = async (e, qIndex) => {
        e.preventDefault();
        const text = e.target.option_text.value.trim();
        const file = e.target.option_image.files[0];
        // Note: The previous 'if (!text) return;' check was removed in the last update.

        // Define default text if the input is empty
        const optionText = text || 'New Option (Click to Edit)';
        
        let imagePath = null;
        if (file && session && formId) {
            imagePath = await fileSystem.saveUpload(session.user.id, formId, file);
        }
        
        setFormDataAndDraft(prevFormData => {
            const newQuestions = [...(prevFormData.questions || [])];
            if (!newQuestions[qIndex]) return prevFormData;

            // Use optionText instead of text
            newQuestions[qIndex].options = [...(newQuestions[qIndex].options || []), { id: crypto.randomUUID(), text: optionText, image: imagePath }];
            return { ...prevFormData, questions: newQuestions };
        });
        e.target.reset();
    };

    /** Adds a new option for 'Fill in the Blanks'. (Text-only version of MC option) */
    const handleAddFillInTheBlankOption = (e, qIndex) => {
        e.preventDefault();
        const text = e.target.option_text.value.trim();
        // Note: The previous 'if (!text) return;' check was removed in the last update.

        // Define default text if the input is empty
        const optionText = text || 'New Blank Answer (Click to Edit)';

        setFormDataAndDraft(prevFormData => {
            const newQuestions = [...(prevFormData.questions || [])];
            if (!newQuestions[qIndex]) return prevFormData;
            
            // Use optionText instead of text
            newQuestions[qIndex].options = [...(newQuestions[qIndex].options || []), { id: crypto.randomUUID(), text: optionText }]; 
            if (newQuestions[qIndex].correct === undefined) newQuestions[qIndex].correct = -1;
            return { ...prevFormData, questions: newQuestions };
        });
        e.target.reset();
    };

    /** Adds a new paired option for 'Connecting Dots', assigning unique IDs, and handling images. */
    const handleAddConnectingDotPair = async (e, qIndex) => {
        e.preventDefault();
        const input1 = e.target.text1.value.trim();
        const input2 = e.target.text2.value.trim();
        const file1 = e.target.file1.files[0];
        const file2 = e.target.file2.files[0];

        // Note: The previous 'if (!text1 || !text2) return;' check was removed in the last update.
        
        // Define default texts
        const text1 = input1 || 'Column A (Click to Edit)';
        const text2 = input2 || 'Column B (Click to Edit)';

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
            const newQuestions = [...(prevFormData.questions || [])];
            if (!newQuestions[qIndex]) return prevFormData;

            newQuestions[qIndex].options = [...(newQuestions[qIndex].options || []), ...newOptions];
            return { ...prevFormData, questions: newQuestions };
        });

        e.target.reset();
    };
    
    /** Handles image/text updates for an existing Multiple Choice option. */
    const handleUpdateOption = async (e, qIndex, oIndex) => {
        e.preventDefault();
        const questions = [...(formData.questions || [])];
        if (!questions[qIndex] || !questions[qIndex].options || !questions[qIndex].options[oIndex]) return;
        
        const option = questions[qIndex].options[oIndex];

        const fileInput = document.getElementById(`option_image_${qIndex}_${oIndex}`);
        const newFile = fileInput ? fileInput.files[0] : null;
        
        if (newFile && session && formId) {
            if (option.image) await fileSystem.deleteUpload(option.image);
            questions[qIndex].options[oIndex].image = await fileSystem.saveUpload(session.user.id, formId, newFile);
        }
        
        setFormDataAndDraft({ ...formData, questions });
        window.alert('Image has been successfully saved!');
        e.target.reset();
    };

    /** Handles image updates for an existing Connecting Dot option. */
    const handleUpdateCDOptionImage = async (e, qIndex, oIndex) => {
        e.preventDefault();
        const questions = [...(formData.questions || [])];
        if (!questions[qIndex] || !questions[qIndex].options || !questions[qIndex].options[oIndex]) return;
        
        const option = questions[qIndex].options[oIndex];

        const fileInput = document.getElementById(`cd_option_image_${qIndex}_${oIndex}`);
        const newFile = fileInput ? fileInput.files[0] : null;
        
        if (newFile && session && formId) {
            if (option.image) await fileSystem.deleteUpload(option.image);
            questions[qIndex].options[oIndex].image = await fileSystem.saveUpload(session.user.id, formId, newFile);
            setFormDataAndDraft({ ...formData, questions });
            window.alert('Image has been successfully saved!');
        } else if (newFile) {
            setError('Must be logged in and editing a form to upload images.');
        }

        e.target.reset(); // Clear the file input
    };

    /** Removes an option, handling image deletion for MC/CD and pair removal for CD. */
    const handleRemoveOption = async (qIndex, oIndex) => { 
        setFormDataAndDraft(prevFormData => {
            const questions = [...(prevFormData.questions || [])];
            if (!questions[qIndex] || !questions[qIndex].options) return prevFormData;

            const question = questions[qIndex];
            const optionToRemove = question.options[oIndex];

            let newOptions = [...question.options];
            let optionsToKeep;

            if (question.type === 'connecting_dots') {
                const matchId = optionToRemove.matchId;
                const optionToMatch = newOptions.find(o => o.id === matchId);
                
                // Delete images for both options in the pair (async outside of set state)
                if (optionToRemove.image) {
                    fileSystem.deleteUpload(optionToRemove.image);
                }
                if (optionToMatch && optionToMatch.image) {
                    fileSystem.deleteUpload(optionToMatch.image);
                }

                // Filter out both the selected option (by index) and its pair (by ID)
                optionsToKeep = newOptions.filter((option, i) => i !== oIndex && option.id !== matchId);
                
            } else { // Handles multiple_choice and fill_in_blanks
                
                if (question.type === 'multiple_choice' && optionToRemove.image) {
                    // Delete image only for multiple choice (async outside of set state)
                    fileSystem.deleteUpload(optionToRemove.image);
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
            return { ...prevFormData, questions: questions };
        });
    };
    
    /** Sets a specific option as the correct answer for its question (Multiple Choice/Fill in Blanks only). */
    const handleSetCorrect = (qIndex, oIndex) => {
        setFormDataAndDraft(prevFormData => {
            const newQuestions = [...(prevFormData.questions || [])];
            if (!newQuestions[qIndex]) return prevFormData;
            
            newQuestions[qIndex].correct = oIndex;
            return { ...prevFormData, questions: newQuestions };
        });
    };


    // =================================================================
    // 5. RENDER LOGIC (CLEANED UP)
    // =================================================================

    const user = session ? session.user : null;

    // RENDER LOGIN REQUIRED MODAL FIRST IF APPLICABLE
    if (showLoginModal) {
        return e(LoginRequiredModal, { onRedirect: handleLoginRedirect });
    }

    if (loading) {
        // Show a simple loading state while session check/data load happens
        return <h1>Loading Application...</h1>;
    }

    // --- Main Application View (If logged in) ---
    return (
        <div>
            {/* RENDER THE SAVING MODAL HERE */}
            {showSavingModal && e(SavingModal)} 

            <div>
                {/* Custom Notification Modal Render */}
                {notification.show && (
                    <NotificationModal 
                        message={notification.message} 
                        isLink={notification.isLink}
                        onClose={() => setNotification({ show: false, message: '', isLink: false })}
                    />
                )}

                {error && <p className="error">{error}</p>}
                {success && <p className="success">{success}</p>}

                <form onSubmit={handleCreateForm} id="createFormHeader">
                    <input 
                        type="text" 
                        name="form_title" 
                        placeholder="Enter New Module Name Here" 
                        // Controlled input ensures this box clears on form switch
                        value={newFormTitle} 
                        onChange={(e) => setNewFormTitle(e.target.value)}
                    />
                    <button type="submit">CREATE NEW MODULE</button>
                </form>
            </div>

           {/* Form Editor View (only visible when a form is selected) */}
            {formId && formData.module_id && (
                <div id="formPage" key={formId}>                
                        {/* NEW DIV WRAPPING TITLE INPUT AND BUTTONS */}
                        <div id="formEditingHeader">
                            {/* Title Input */}
                            <div id="columnSide">
                                <div>
                                    <input 
                                        key={formId}
                                        style={{ 
                                            margin: '10px 0px 0px 0px', 
                                            fontSize: 'x-large',
                                        }} 
                                        type="text" 
                                        name="form_title" 
                                        placeholder="Questionnaire Name Here" 
                                        defaultValue={formData.title} 
                                        required 
                                        onBlur={(e) => {
                                            const newTitle = e.target.value.trim();
                                            if (newTitle && newTitle !== formData.title) {
                                                setFormDataAndDraft({ ...formData, title: newTitle });
                                            }
                                        }}
                                    />

                                    {/* Renamed button to Save Draft and added handlePublishModule */}
                                    <button id="saveModule" onClick={handleSaveForm} className="save-button">SAVE MODULE</button>
                                    <button id="publishModule" onClick={handleDeleteForm} className="delete-button">DELETE MODULE</button>
                                    <button id="publishModule" onClick={handlePublishModule} className="publish-button">PUBLISH</button>
                                </div>

                                {/* --- NEW DESCRIPTION TEXTAREA --- */}
                                <textarea 
                                    key={`desc-${formId}`} // Key for controlled reset on form switch
                                    name="form_description" 
                                    placeholder="Enter Your Optional Description of the Module Here" 
                                    rows="2"
                                    defaultValue={formData.description} 
                                    style={{ 
                                        width: '100%', 
                                        padding: '10px', 
                                        margin: '5px 0', 
                                        boxSizing: 'border-box',
                                        border: '1px solid #ccc',
                                        borderRadius: '4px',
                                        resize: 'none',
                                        outline: 'none',
                                    }} 
                                    onBlur={(e) => {
                                        // Update description state on blur
                                        const newDescription = e.target.value.trim();
                                        // Only update state if the description has changed
                                        if (newDescription !== formData.description) {
                                            setFormDataAndDraft({ ...formData, description: newDescription });
                                        }
                                    }}
                                />
                                {/* --- END NEW DESCRIPTION TEXTAREA --- */}
                            </div>
                        </div>
                        {/* END NEW DIV */}

                    <div id="formPageSub">     

                        {/* --- Question/Option editing interface (USING NEW COMPONENT) --- */}
                        {(formData.questions && formData.questions.length > 0) ? (
                            formData.questions.map((question, qIndex) => (
                                <QuestionEditor
                                    key={qIndex}
                                    question={question}
                                    qIndex={qIndex}
                                    // Pass all handlers required by the editor and its children
                                    onUpdateItemText={handleUpdateItemText}
                                    onUpdateQuestion={handleUpdateQuestion}
                                    onRemoveQuestion={handleRemoveQuestion}
                                    onUpdateQuestionType={handleUpdateQuestionType}
                                    onRemoveOption={handleRemoveOption}
                                    // MC/FITB Handlers
                                    handleAddMultipleChoiceOption={handleAddMultipleChoiceOption}
                                    handleAddFillInTheBlankOption={handleAddFillInTheBlankOption}
                                    handleUpdateOption={handleUpdateOption}
                                    handleSetCorrect={handleSetCorrect}
                                    // CD Handlers
                                    handleAddConnectingDotPair={handleAddConnectingDotPair}
                                    onUpdateCDOptionImage={handleUpdateCDOptionImage}
                                />
                            ))
                        ) : (
                            <p>No questions yet. Add one below.</p>
                        )}
                    </div>   
                    {/* --- Add New Question Input --- */}
                    <form onSubmit={handleAddQuestion}> 
                        <input id="addQuestionInput" type="text" name="question_text" placeholder="Enter New Question Text Here (optional)" />
                        <button id="addQuestionButton" type="submit">ADD NEW QUESTION</button>
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
// 7. THE MODULAR COMPONENT (UserFormsList)
// =================================================================

function UserFormsList() {
    const [formsList, setFormsList] = React.useState(null); 
    const [loading, setLoading] = React.useState(true);
    const [debugError, setDebugError] = React.useState(''); // For displaying fetch errors

    const loadFormsList = async (uid) => {
        try {
            const { data, error } = await supabase
                .from(FORMS_TABLE)
                // Select module_id (was id)
                .select('module_id, title')
                // Filter by teacher_id (was teacher_id)
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
        const checkSessionAndLoad = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session && session.user) {
                    loadFormsList(session.user.id);
                } else {
                    setFormsList([]); 
                    setLoading(false);
                }
            } catch (err) {
                 console.error("Session Check Error:", err.message);
                 setFormsList([]);
                 setLoading(false);
            }
        };

        checkSessionAndLoad();

        // No need for onAuthStateChange here unless this component is always visible and needs instant update.
        // Keeping it simple for modular component.

    }, []);

    // --- Render Logic ---

    if (loading) {
        return <span style={{ color: '#888' }}>Loading...</span>; 
    }

    if (debugError) {
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
                // Use module_id for key and link
                <li key={form.module_id}> 
                    <a style={{ color: '#000' }} href={`?form_id=${form.module_id}`}>
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


// const e = React.createElement; // Already defined globally/locally above

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
            
            // Reload ensures all modular components update instantly after logout
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
        
        const { data: { subscription } = {} } = supabase.auth.onAuthStateChange(
            (event, session) => {
                // Determine logged-in status based on the session object
                setIsLoggedIn(!!session);
                setLoading(false); 
            }
        );

        // Cleanup: Unsubscribe from the listener when component unmounts
        return () => {
             if (subscription && typeof subscription.unsubscribe === 'function') {
                subscription.unsubscribe();
            }
        };
    }, []);

    // --- Render Logic ---

    const baseStyle = { 
        fontFamily: 'Inknut Antiqua SemiBold',
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
        buttonProps = { disabled: true, style: { ...baseStyle, backgroundColor: '#cccccc01', fontFamily: 'Inknut Antiqua SemiBold' } };
    } else if (isLoggedIn) {
        buttonText = 'LOG OUT';
        buttonProps = { 
            onClick: handleLogout,
            disabled: false,
            style: { ...baseStyle, color: 'white', fontFamily: 'Inknut Antiqua SemiBold' },
            id: 'LOGOUTBUTTON'
        };
    } else {
        buttonText = 'LOG IN';
        buttonProps = { 
            onClick: handleLogin, 
            disabled: false, 
            style: { ...baseStyle, color: 'white', fontFamily: 'Inknut Antiqua SemiBold'},
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