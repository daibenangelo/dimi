const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const openai = require("openai");

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all origins
app.use(cors());

// Fetch all document names dynamically
function getAllDocuments() {
  const directoryPath = path.join(__dirname, "documents"); // Path to the documents folder
  const files = fs.readdirSync(directoryPath);
  return files.filter((file) => file.endsWith(".txt")); // Filter for .txt files
}

// Use OpenAI API for selecting relevant documents
async function selectDocuments(userQuery) {
  const documents = getAllDocuments(); // Fetch all available documents
  const prompt = `
    You are tasked with selecting the most relevant documents based on the user's query.
    User's query: "${userQuery}"

    Here is a list of documents:
    ${documents.map((doc) => `- ${doc}`).join("\n")}

    Select the documents that are most relevant to the user's query. 
    Return a JSON object with the following structure:
    {
      "selectedFileNames": ["doc1.txt", "doc3.txt"]
    }
  `;

  // Send query to OpenAI to process and select documents
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "system", content: prompt }],
  });

  const selectedFileNames = response.choices[0].message.content
    .split("\n")
    .filter((name) => name.startsWith("-"))
    .map((name) => name.trim().slice(2)); // Extract file names from response

  return {
    selectedFileNames,
  };
}

// Serve static files in the "conscious" directory at /files
app.use("/conscious", express.static(path.join(__dirname, "conscious")));

app.use(express.json());

app.post("/select-documents", async (req, res) => {
  const userQuery = req.body.userQuery;

  try {
    // Call the selectDocuments function to get the selected documents based on the query
    const selectedDocuments = await selectDocuments(userQuery);

    // Send the selected documents back as JSON response
    res.json(selectedDocuments);
  } catch (error) {
    console.error("Error selecting documents:", error);
    res.status(500).json({ error: "Failed to select documents" });
  }
});

// Serve the index.html file
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
