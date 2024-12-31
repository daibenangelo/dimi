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

const { selectDocuments } = require("./selectDocuments");

app.use(bodyParser.json());

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

// selectDocuments.js (or wherever you define the function)
const { OpenAI } = require("openai"); // Assuming you are using OpenAI API for document selection

async function selectDocuments(userQuery) {
  // Use OpenAI or any method you prefer to select documents based on userQuery
  // For example, you can match the query to document names or contents

  // Placeholder: Example documents in your knowledge base
  const documents = [
    { name: "course-selection.txt", content: "Content about courses" },
    { name: "enrollment-guide.txt", content: "Content about enrollment" },
    // Add more documents here...
  ];

  // Logic to determine which documents are relevant to the query
  // This is a simplified example, in practice you might use the OpenAI API to match documents
  const selectedDocuments = documents.filter((doc) =>
    doc.content.toLowerCase().includes(userQuery.toLowerCase())
  );

  // Return the selected documents
  return {
    selectedFileNames: selectedDocuments.map((doc) => doc.name),
    selectedFileContents: selectedDocuments.map((doc) => doc.content),
  };
}

module.exports = { selectDocuments };

// Serve static files in the "conscious" directory at /files
app.use("/conscious", express.static(path.join(__dirname, "conscious")));

app.get("/api/env", (req, res) => {
  res.json({
    apiKey: process.env.API_KEY,
  });
});

app.get("/files", (req, res) => {
  const query = req.query.query?.toLowerCase() || "";
  const folderPath = path.join(__dirname, "conscious");

  fs.readdir(folderPath, (err, files) => {
    if (err) {
      return res.status(500).json({ error: "Failed to read directory" });
    }

    // Filter files by relevance using a basic keyword match
    const relevantFiles = files.filter((file) => {
      const fileNameWithoutExtension = file.replace(".txt", "").toLowerCase();
      return query
        .split(" ")
        .some((word) => fileNameWithoutExtension.includes(word));
    });

    // Map each file to the response format
    const documents = relevantFiles.map((file) => ({
      filename: file,
      desc: file.replace(/\.txt$/, "").replace(/_/g, " "),
    }));

    res.json(documents);
  });
});

app.post("/select-documents", express.json(), (req, res) => {
  const { userQuery } = req.body;

  const MAX_WORDS = 1500; // Limit context to approximately 1500 words.
  const folderPath = path.join(__dirname, "conscious");

  fs.readdir(folderPath, (err, files) => {
    if (err) {
      return res.status(500).json({ error: "Failed to read directory" });
    }

    // Filter files based on user query
    const selectedFiles = files.filter((file) =>
      userQuery
        .toLowerCase()
        .split(" ")
        .some((keyword) => file.toLowerCase().includes(keyword))
    );

    // Read and combine the content of the selected files
    let selectedFileContents = [];
    selectedFiles.forEach((file) => {
      const filePath = path.join(folderPath, file);
      const content = fs.readFileSync(filePath, "utf-8");
      selectedFileContents.push(content);
    });

    // Combine and truncate contents to fit within the word limit
    const combinedContent = selectedFileContents.join("\n");
    const words = combinedContent.split(/\s+/).slice(0, MAX_WORDS);
    const truncatedContent = words.join(" ");

    res.json({
      selectedFileNames: selectedFiles, // Include selected file names
      selectedFileContents: truncatedContent,
    });
  });
});

async function selectDocuments(userQuery) {
  const documents = getAllDocuments(); // Fetch all available documents
  const prompt = `
    You are tasked with selecting the most relevant documents based on the user's query.
    User's query: "${userQuery}"

    Here is a list of documents:
    - doc1.txt
    - doc2.txt
    - doc3.txt

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

// Serve static files in the "js" directory at /js
app.use("/js", express.static(path.join(__dirname, "js")));

// Serve the index.html file
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
