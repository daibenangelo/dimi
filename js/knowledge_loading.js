let selectedFileContents = "";  // Store contents of selected files as a concatenated string
let defaultSelectedFiles = [
    "!!! Bot Orientation !!!.txt",
    "DMMMSU at a Glance.txt",
    "Academic Programs - MLUC.txt",
    "Admission Requirements.txt",
    "Enrollment Process.txt",
    "Institutional Profile.txt"];

$(document).ready(function() {
    alert("hey");
    // Initialize word count and token estimate
    let totalWordCount = 0;

    // Function to update word and token counts
    function updateCounts() {
        $('#total-words').text(`Total number of words: ${totalWordCount}`);
        $('#estimated-tokens').text(`Estimated tokens: ${Math.round(totalWordCount * 1.3)} | Lower tokens = better accuracy`);
    }

    // Function to load content for a single file
    function loadFileContent(fileName, addWords) {
        $.ajax({
            url: `/conscious/${fileName}`,
            method: 'GET',
            success: function(data) {
                const wordCount = data.split(/\s+/).filter(Boolean).length;
                totalWordCount += addWords ? wordCount : -wordCount;
                updateCounts();
                
                // Update the concatenated string for the selected files
                if (addWords) {
                    selectedFileContents += data + "\n";  // Append the content if added
                } else {
                    const contentToRemove = data + "\n";
                    selectedFileContents = selectedFileContents.replace(contentToRemove, '');  // Remove the content if unchecked
                }

                // Display the combined content of all selected files
                displaySelectedFilesContent();
            },
            error: function() {
                console.error(`Error loading file: ${fileName}`);
            }
        });
    }

    // Function to display the content of all selected files
    function displaySelectedFilesContent() {
        const contentContainer = $('#file-content');
        contentContainer.empty(); // Clear the previous content
        
        // Display the concatenated content of all selected files
        contentContainer.append('<p>' + selectedFileContents.replace(/\n/g, '<br>') + '</p>');
    }

    // Load the list of checked documents from localStorage, or fall back to the default if none is saved
    const savedCheckedDocuments = JSON.parse(localStorage.getItem('checkedDocuments')) || [];

    // Initialize checkboxes based on the documents JSON
    documents.forEach(function(doc) {
        let isChecked;

        // If there are saved checked documents, use them
        if (savedCheckedDocuments.length > 0) {
            isChecked = savedCheckedDocuments.includes(doc.filename);
        } else {
            // Otherwise, set default checked state for the specific documents
            isChecked = defaultSelectedFiles.includes(doc.filename);
        }

        let checkbox = $('<input />', {
            type: 'checkbox',
            id: doc.filename,
            class: 'file-checkbox',
            value: doc.filename,
            checked: isChecked
        });
        
        let label = $('<label />', {
            for: doc.filename,
            text: doc.desc
        });
        
        $('#checkbox-container').append(checkbox).append(label).append('<br>');

        // Load initial content if checkbox is checked
        if (isChecked) {
            loadFileContent(doc.filename, true);
        }
    });

    // Save the list of checked documents to localStorage
    function saveCheckedDocuments() {
        const checkedDocuments = $('.file-checkbox:checked').map(function() {
            return this.value;
        }).get();
        localStorage.setItem('checkedDocuments', JSON.stringify(checkedDocuments));
    }

    // Handle checkbox change events
    $('.file-checkbox').on('change', function() {
        const fileName = $(this).val();
        const addWords = $(this).is(':checked');
        loadFileContent(fileName, addWords);
        saveCheckedDocuments(); // Save to localStorage whenever a checkbox is changed
    });

    // Load Knowledge Base toggle state from localStorage
    const knowledgeBaseVisible = JSON.parse(localStorage.getItem('knowledgeBaseVisible'));
    if (knowledgeBaseVisible !== null) {
        $('#knowledge-base-section').toggle(knowledgeBaseVisible);
        $('#toggle-knowledge-base').text(knowledgeBaseVisible ? "Hide Knowledge Base" : "Show Knowledge Base");
    }

    // Toggle visibility of Knowledge Base section and save state to localStorage
    $('#toggle-knowledge-base').on('click', function() {
        $('#knowledge-base-section').slideToggle();
        const isVisible = $('#knowledge-base-section').is(':visible');
        localStorage.setItem('knowledgeBaseVisible', JSON.stringify(isVisible));
        
        $(this).text(isVisible ? "Hide Knowledge Base" : "Show Knowledge Base");
    });
});