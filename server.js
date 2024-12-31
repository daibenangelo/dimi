const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const openai = require("openai");

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all origins
app.use(cors());
app.use("/js", express.static(path.join(__dirname, "js")));

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

app.post("/select-documents", async (req, res) => {
  try {
    const { userQuery } = req.body;
    if (!userQuery) {
      return res.status(400).json({ error: "userQuery is required" });
    }

    const result = await selectDocuments(userQuery);
    res.json(result);
  } catch (error) {
    console.error("Error in /select-documents endpoint:", error);
    res.status(500).json({ error: "Failed to select documents" });
  }
});

// Serve static files in the "conscious" directory at /files
app.get("/files", (req, res) => {
  const query = req.query.query?.toLowerCase() || "";
  const folderPath = path.join(__dirname, "conscious"); // Assuming you want to fetch files from "conscious"

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

app.use("/conscious", express.static(path.join(__dirname, "conscious")));

app.use(express.json());

app.get("/api/env", (req, res) => {
  res.json({
    apiKey: process.env.API_KEY,
  });
});

async function selectDocuments(userQuery) {
  try {
    const documents = getAllDocuments(); // Ensure this is working correctly
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

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "system", content: prompt }],
    });

    const selectedFileNames = response.choices[0].message.content
      .split("\n")
      .filter((name) => name.startsWith("-"))
      .map((name) => name.trim().slice(2));

    return { selectedFileNames };
  } catch (error) {
    console.error("Error in selectDocuments:", error);
    throw new Error("Failed to select documents.");
  }
}

// Serve the index.html file
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
