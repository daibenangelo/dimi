let apiKey = ""; // Placeholder for the API Key

const apiUrl = "https://api.openai.com/v1/chat/completions";

function fetchApiKey() {
  return $.getJSON("/api/env", function (data) {
    apiKey = data.apiKey; // Store the API key from the server response
  });
}

function sendMessage(message) {
  // Step 1: Select documents based on the user query
  $.ajax({
    url: "https://dimi-6hqw.onrender.com/select-documents",
    method: "POST",
    contentType: "application/json",
    data: JSON.stringify({ userQuery: message }),
    success: function (response) {
      const { selectedFileNames, selectedFileContents } = response;

      console.log("Selected Files:", selectedFileNames); // Debugging log

      const knowledgeBaseTab = $("#knowledge-base");
      knowledgeBaseTab.empty(); // Clear previous content
      if (selectedFileNames.length > 0) {
        selectedFileNames.forEach((fileName) => {
          knowledgeBaseTab.append(`<li>${fileName}</li>`);
        });
      } else {
        knowledgeBaseTab.append("<li>No documents selected</li>");
      }

      // Limit user message and context size to stay within token limits
      const MAX_WORDS = 1500; // Approximate total token limit for context and user input
      const contextWords = selectedFileContents
        .split(/\s+/)
        .slice(0, MAX_WORDS);
      const truncatedContext = contextWords.join(" ");
      const userMessageWords = message.split(/\s+/).slice(0, MAX_WORDS / 2);
      const truncatedMessage = userMessageWords.join(" ");

      // Step 2: Send the selected context to OpenAI API
      $.ajax({
        url: "https://api.openai.com/v1/chat/completions",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        data: JSON.stringify({
          model: "gpt-4",
          messages: [
            { role: "system", content: truncatedContext }, // Provide knowledge base as the system prompt
            { role: "user", content: truncatedMessage }, // User's question or query
          ],
        }),
        success: function (response) {
          const botMessage = response.choices[0].message.content;
          displayMessage("Dimi", botMessage);
        },
        error: function (xhr, status, error) {
          console.error("Error:", error);
          console.error("Response:", xhr.responseText);
          displayMessage(
            "Dimi",
            "Sorry, there was an error communicating with the AI."
          );
        },
      });
    },
    error: function (xhr, status, error) {
      console.error("Error selecting documents:", error);
      console.error("Response:", xhr.responseText);
      displayMessage(
        "Dimi",
        "Sorry, there was an error selecting the context documents."
      );
    },
  });
}

function displayMessage(sender, message) {
  const messageElement = `<div><strong>${sender}:</strong> ${message}</div>`;
  $("#chat-history").append(messageElement);
  $("#chat-history").scrollTop($("#chat-history")[0].scrollHeight);
}

$(document).ready(function () {
  // Fetch API key once the document is ready
  fetchApiKey().then(function () {
    $("#send-btn").on("click", function () {
      const userInput = $("#user-input").val();
      if (userInput.trim() !== "") {
        displayMessage("You", userInput);
        sendMessage(userInput);
        $("#user-input").val("");
      }
    });

    $("#user-input").on("keypress", function (e) {
      if (e.which === 13) {
        // Enter key
        $("#send-btn").click();
      }
    });
  });
});
