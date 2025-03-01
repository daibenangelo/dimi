let apiKey = ""; // Placeholder for the API Key
const apiUrl = "https://api.openai.com/v1/chat/completions";

function fetchApiKey() {
  return $.getJSON("/api/env", function (data) {
    apiKey = data.apiKey;
  });
}

function saveToLocalStorage(key, value) {
  let storedData = JSON.parse(localStorage.getItem(key)) || [];
  storedData.push(value);
  localStorage.setItem(key, JSON.stringify(storedData));
}

function displaySavedData() {
  const userPrompts = JSON.parse(localStorage.getItem("userPrompts")) || [];
  const aiResponses = JSON.parse(localStorage.getItem("aiResponses")) || [];

  $("#user-prompt").html(
    userPrompts.map((prompt) => `<p>${prompt}</p>`).join("")
  );
  $("#ai-results").html(
    aiResponses.map((response) => `<p>${response}</p>`).join("")
  );
}

function sendMessage(message) {
  saveToLocalStorage("userPrompts", message);

  // Remove this line to prevent duplicate messages:
  // displayMessage("You", message);

  // Show typing animation
  const typingAnimation = $(`
    <div class="chat-message bot-message typing">
      <div class="sender">Dimi</div>
      <div class="message">
        <span class="dot"></span><span class="dot"></span><span class="dot"></span>
      </div>
    </div>
  `);
  $("#chat-history").append(typingAnimation);
  $("#chat-history").scrollTop($("#chat-history")[0].scrollHeight);

  $.ajax({
    url: "https://dimi-6hqw.onrender.com/select-documents",
    method: "POST",
    contentType: "application/json",
    data: JSON.stringify({ userQuery: message }),
    success: function (response) {
      typingAnimation.remove(); // Remove animation

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

      // Show typing animation again for AI response
      $("#chat-history").append(typingAnimation);
      $("#chat-history").scrollTop($("#chat-history")[0].scrollHeight);

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
          typingAnimation.remove(); // Remove animation
          const botMessage = response.choices[0].message.content;
          displayMessage("Dimi", botMessage);
          saveToLocalStorage("aiResponses", botMessage);
        },
        error: function () {
          typingAnimation.remove();
          displayMessage(
            "Dimi",
            "Sorry, there was an error communicating with the AI."
          );
        },
      });
    },
    error: function () {
      typingAnimation.remove();
      displayMessage(
        "Dimi",
        "Sorry, there was an error selecting the context documents."
      );
    },
  });
}

function displayMessage(sender, message) {
  const isUser = sender === "You";
  const messageClass = isUser ? "user-message" : "bot-message";
  const messageContainer = $(`
    <div class="chat-message ${messageClass}">
      <div class="sender">${sender}</div>
      <div class="message"></div>
    </div>
  `);

  $("#chat-history").append(messageContainer);
  messageContainer.hide().fadeIn(300);

  const messageElement = messageContainer.find(".message");
  let index = 0;
  function typeText() {
    if (index < message.length) {
      messageElement.append(message[index]);
      index++;
      setTimeout(typeText, 10);
    }
  }
  typeText();

  $("#chat-history").scrollTop($("#chat-history")[0].scrollHeight);
}

$(document).ready(function () {
  displayMessage(
    "Dimi",
    "Hi! I am Dimi, the Don Mariano Marcos Memorial State University (DMMMSU) chatbot. What can I help you with?"
  );
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
        $("#send-btn").click();
      }
    });
  });
  displaySavedData();
});
