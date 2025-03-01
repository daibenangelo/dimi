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
  const feedbackData = JSON.parse(localStorage.getItem("aiFeedback")) || {};

  $("#testing-tab-content").html(
    userPrompts
      .map((prompt, index) => {
        const response = aiResponses[index] || "No response";
        const feedback = feedbackData[index] || "No feedback";
        return `<p><strong>You:</strong> ${prompt} <br><strong>Dimi:</strong> ${response} <span class="text-muted">(${feedback})</span></p>`;
      })
      .join("")
  );
}

function sendMessage(message) {
  saveToLocalStorage("userPrompts", message);
  updateTestingTab();

  const typingAnimation = $(
    `<div class="chat-message bot-message typing">
      <div class="sender">Dimi</div>
      <div class="message">
        <span class="dot"></span><span class="dot"></span><span class="dot"></span>
      </div>
    </div>`
  );
  $("#chat-history").append(typingAnimation);
  $("#chat-history").scrollTop($("#chat-history")[0].scrollHeight);

  $.ajax({
    url: "https://dimi-6hqw.onrender.com/select-documents",
    method: "POST",
    contentType: "application/json",
    data: JSON.stringify({ userQuery: message }),
    success: function (response) {
      typingAnimation.remove();
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

      const systemPrompt = `The following documents are relevant:\n${documents
        .map((doc) => `\n${doc.filename}:\n${doc.content}`)
        .join("\n")}\n\nUser's query: "${message}"`;

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
          typingAnimation.remove();
          const botMessage = response.choices[0].message.content;
          displayMessage("Dimi", botMessage, true);
          saveToLocalStorage("aiResponses", botMessage);
          updateTestingTab();
        },
        error: function () {
          typingAnimation.remove();
          displayMessage(
            "Dimi",
            "Sorry, there was an error communicating with the AI.",
            true
          );
        },
      });
    },
    error: function () {
      typingAnimation.remove();
      displayMessage(
        "Dimi",
        "Sorry, there was an error selecting the context documents.",
        true
      );
    },
  });
}

function displayMessage(sender, message, isBot = false) {
  const messageClass = sender === "You" ? "user-message" : "bot-message";
  const messageContainer = $(
    `<div class="chat-message ${messageClass}">
      <div class="sender">${sender}</div>
      <div class="message">${message}</div>
    </div>`
  );

  if (isBot) {
    const feedbackContainer = $(
      '<div class="feedback-icons mt-2"></div>'
    ).hide();
    const thumbsUp = $(
      '<button class="btn btn-outline-success btn-sm mx-1"><i class="bi bi-hand-thumbs-up"></i></button>'
    );
    const thumbsDown = $(
      '<button class="btn btn-outline-danger btn-sm mx-1"><i class="bi bi-hand-thumbs-down"></i></button>'
    );

    thumbsUp.on("click", function () {
      saveFeedback(message, "Liked");
      feedbackContainer.html('<span class="text-success">Liked!</span>');
      updateTestingTab();
    });

    thumbsDown.on("click", function () {
      saveFeedback(message, "Disliked");
      feedbackContainer.html('<span class="text-danger">Disliked!</span>');
      updateTestingTab();
    });

    feedbackContainer.append(thumbsUp, thumbsDown);
    messageContainer.append(feedbackContainer);
    messageContainer.hover(
      () => feedbackContainer.fadeIn(),
      () => feedbackContainer.fadeOut()
    );
  }

  $("#chat-history").append(messageContainer);
  messageContainer.hide().fadeIn(300);
  $("#chat-history").scrollTop($("#chat-history")[0].scrollHeight);
}

function saveFeedback(message, feedback) {
  let aiResponses = JSON.parse(localStorage.getItem("aiResponses")) || [];
  let feedbackData = JSON.parse(localStorage.getItem("aiFeedback")) || {};
  let index = aiResponses.indexOf(message);

  if (index !== -1) {
    feedbackData[index] = feedback;
    localStorage.setItem("aiFeedback", JSON.stringify(feedbackData));
  }
}

function updateTestingTab() {
  displaySavedData();
}

$(document).ready(function () {
  displayMessage(
    "Dimi",
    "Hi! I am Dimi, the DMMMSU chatbot. What can I help you with?"
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
