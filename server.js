const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all origins
app.use(cors());
app.use(express.json());
app.use("/js", express.static(path.join(__dirname, "js")));
app.use("/conscious", express.static(path.join(__dirname, "conscious")));

// Fetch all document names dynamically
function getAllDocuments() {
  try {
    const directoryPath = path.join(__dirname, "conscious");
    console.log("Reading directory:", directoryPath);
    const files = fs.readdirSync(directoryPath);
    console.log("Documents in the folder:", files);
    return files.filter((file) => file.endsWith(".txt"));
  } catch (error) {
    console.error("Error reading documents:", error);
    throw error; // Re-throw the error for further handling
  }
}

async function selectDocuments(userQuery) {
  try {
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

    // Send query to OpenAI API using axios
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: [{ role: "system", content: prompt }],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Ensure the response structure is valid
    if (
      !response.data ||
      !response.data.choices ||
      response.data.choices.length === 0
    ) {
      throw new Error("Invalid OpenAI response structure");
    }

    // Extract the content from the first choice
    const messageContent = response.data.choices[0].message.content;

    // Parse the JSON object returned by OpenAI or handle as a list
    const parsedResponse = JSON.parse(messageContent);
    const selectedFileNames = parsedResponse.selectedFileNames || [];

    return { selectedFileNames };
  } catch (error) {
    console.error("Error in selectDocuments function:", error);
    throw error; // Re-throw the error to be handled by the route
  }
}

app.post("/select-documents", (req, res) => {
  const userQuery = req.body.userQuery.toLowerCase();
  const folderPath = path.join(__dirname, "conscious");

  fs.readdir(folderPath, (err, files) => {
    if (err) {
      return res.status(500).json({ error: "Failed to read directory" });
    }

    // Filter files by relevance using a basic keyword match
    const relevantFiles = files.filter((file) => {
      const fileNameWithoutExtension = file.replace(".txt", "").toLowerCase();
      return userQuery
        .split(" ")
        .some((word) => fileNameWithoutExtension.includes(word));
    });

    if (relevantFiles.length === 0) {
      return res.status(404).json({ error: "No relevant documents found" });
    }

    // Read the content of each relevant file
    const fileContents = relevantFiles.map((file) => {
      const filePath = path.join(folderPath, file);
      const content = fs.readFileSync(filePath, "utf-8");
      return {
        filename: file,
        content: content.trim(), // Ensure there are no extra newlines or spaces
      };
    });

    res.json({ selectedFileNames: relevantFiles, documents: fileContents });
  });
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

app.get("/api/env", (req, res) => {
  res.json({
    apiKey: process.env.API_KEY,
  });
});

// Serve the index.html file
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
