let apiKey = ""; // Placeholder for the API Key

const apiUrl = "https://api.openai.com/v1/chat/completions";

function fetchApiKey() {
  return $.getJSON("/api/env", function (data) {
    apiKey = data.apiKey; // Store the API key from the server response
  });
}

function sendMessage(message) {
  $.ajax({
    url: "/select-documents",
    method: "POST",
    contentType: "application/json",
    data: JSON.stringify({ question: message }),
    success: function (response) {
      const { context } = response;
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
            { role: "system", content: context },
            { role: "user", content: message },
          ],
        }),
        success: function (response) {
          const botMessage = response.choices[0].message.content;
          displayMessage("Dimi", botMessage);
        },
        error: function (xhr, status, error) {
          console.error("Error:", error);
          displayMessage(
            "Dimi",
            "Sorry, there was an error. Please try again."
          );
        },
      });
    },
    error: function (xhr, status, error) {
      console.error("Error fetching documents:", error);
      displayMessage("Dimi", "Sorry, there was an error selecting documents.");
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
