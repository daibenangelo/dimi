let selectedFileContents = ""; // Store contents of selected files as a concatenated string
let defaultSelectedFiles = [
  "!!! Bot Orientation !!!.txt",
  "DMMMSU at a Glance.txt",
  "Academic Programs - MLUC.txt",
  "Admission Requirements.txt",
  "Enrollment Process.txt",
  "Institutional Profile.txt",
];

$(document).ready(function () {
  // Initialize word count and token estimate
  let totalWordCount = 0;

  // Function to update word and token counts
  function updateCounts() {
    $("#total-words").text(`Total number of words: ${totalWordCount}`);
    $("#estimated-tokens").text(
      `Estimated tokens: ~${Math.round(
        totalWordCount * 1.3
      )} (Lower tokens = faster response, better accuracy)`
    );
  }

  // Function to load content for a single file
  function loadFileContent(fileName, addWords) {
    $.ajax({
      url: `/conscious/${fileName}`,
      method: "GET",
      success: function (data) {
        const wordCount = data.split(/\s+/).filter(Boolean).length;
        totalWordCount += addWords ? wordCount : -wordCount;
        updateCounts();

        // Update the concatenated string for the selected files
        if (addWords) {
          selectedFileContents += data + "\n"; // Append the content if added
        } else {
          const contentToRemove = data + "\n";
          selectedFileContents = selectedFileContents.replace(
            contentToRemove,
            ""
          ); // Remove the content if unchecked
        }

        // Display the combined content of all selected files
        displaySelectedFilesContent();
      },
      error: function () {
        console.error(`Error loading file: ${fileName}`);
      },
    });
  }

  async function getRelevantDocuments(userInput) {
    try {
      const response = await $.getJSON(
        `/files?query=${encodeURIComponent(userInput)}`
      );
      selectedFileContents = ""; // Reset selected contents

      for (const doc of response) {
        const fileContent = await fetchFileContent(doc.filename);
        selectedFileContents += fileContent + "\n"; // Append content
      }
    } catch (error) {
      console.error("Error fetching relevant documents:", error);
    }
  }

  async function fetchFileContent(fileName) {
    return $.ajax({
      url: `/conscious/${fileName}`,
      method: "GET",
    });
  }
});
