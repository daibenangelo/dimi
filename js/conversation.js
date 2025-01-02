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
      const { documents } = response;

      // Display selected document names under Knowledge Base tab
      const knowledgeBaseTab = $("#knowledge-base");
      knowledgeBaseTab.empty(); // Clear previous content
      if (documents && documents.length > 0) {
        documents.forEach((doc) => {
          knowledgeBaseTab.append(`<li>${doc.filename}</li>`);
          console.log(doc.filename);
        });
      } else {
        knowledgeBaseTab.append("<li>No documents selected</li>");
      }

      // Prepare the system prompt using document content
      const systemPrompt = `
        The following documents are relevant to the user's query. Use this context to answer the question.
        Documents:
        ${documents
          .map((doc) => `\n${doc.filename}:\n${doc.content}`)
          .join("\n")}
  
        User's query: "${message}"
      `;

      console.log(systemPrompt);

      // Send the user's query and context to OpenAI API
      $.ajax({
        url: apiUrl,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        data: JSON.stringify({
          model: "gpt-4",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message },
          ],
        }),
        success: function (response) {
          console.log("Response from /select-documents:", response);
          const botMessage = response.choices[0].message.content;
          displayMessage("Dimi", botMessage);
        },
        error: function (xhr, status, error) {
          console.error("Error:", error);
          displayMessage(
            "Dimi",
            "Sorry, there was an error communicating with the AI."
          );
        },
      });
    },
    error: function (xhr, status, error) {
      console.error("Error selecting documents:", error);
      displayMessage(
        "Dimi",
        "Sorry, there was an error selecting the context documents."
      );
    },
  });
}

function showLoading() {
  // Add a loading indicator to the chat
  const loadingIndicator = $(`
    <div id="loading-indicator" class="chat-message bot-message">
      <div class="sender">Dimi</div>
      <div class="message">...</div>
    </div>
  `);
  $("#chat-history").append(loadingIndicator);
  $("#chat-history").scrollTop($("#chat-history")[0].scrollHeight);
}

function hideLoading() {
  // Remove the loading indicator
  $("#loading-indicator").remove();
}

function sendMessage(message) {
  // Show the loading indicator
  showLoading();

  $.ajax({
    url: "https://dimi-6hqw.onrender.com/select-documents",
    method: "POST",
    contentType: "application/json",
    data: JSON.stringify({ userQuery: message }),
    success: function (response) {
      const { documents } = response;

      const knowledgeBaseTab = $("#knowledge-base");
      knowledgeBaseTab.empty();
      if (documents && documents.length > 0) {
        documents.forEach((doc) => {
          knowledgeBaseTab.append(`<li>${doc.filename}</li>`);
        });
      } else {
        knowledgeBaseTab.append("<li>No documents selected</li>");
      }

      const systemPrompt = `
        The following documents are relevant to the user's query. Use this context to answer the question.
        Documents:
        ${documents
          .map((doc) => `\n${doc.filename}:\n${doc.content}`)
          .join("\n")}
        User's query: "${message}"
      `;

      $.ajax({
        url: apiUrl,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        data: JSON.stringify({
          model: "gpt-4",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message },
          ],
        }),
        success: function (response) {
          hideLoading(); // Hide the loading indicator
          const botMessage = response.choices[0].message.content;
          displayMessage("Dimi", botMessage);
        },
        error: function (xhr, status, error) {
          hideLoading(); // Hide the loading indicator
          displayMessage(
            "Dimi",
            "Sorry, there was an error communicating with the AI."
          );
        },
      });
    },
    error: function (xhr, status, error) {
      hideLoading(); // Hide the loading indicator
      displayMessage(
        "Dimi",
        "Sorry, there was an error selecting the context documents."
      );
    },
  });
}

$(document).ready(function () {
  displayMessage(
    "Dimi",
    "Hi! I am Dimi, the Don Mariano Marcos Memorial State University (DMMMSU) chatbot. What can I help you with?"
  );
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
