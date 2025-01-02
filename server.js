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
app.use("/css", express.static(path.join(__dirname, "css")));

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

// Updated selectDocuments function to be used in the route
async function selectDocuments(userQuery) {
  try {
    const documents = getAllDocuments(); // Fetch all available documents

    // Always include the bot orientation document
    const mandatoryFile = "!!! Bot Orientation !!!.txt";

    // Ensure the mandatory file is included in the document list
    if (!documents.includes(mandatoryFile)) {
      documents.unshift(mandatoryFile); // Add it to the beginning of the list
    }

    const prompt = `
      You are tasked with selecting the most relevant documents based on the user's query.
      User's query: "${userQuery}"

      Here is a list of documents:
      ${documents.map((doc) => `- ${doc}`).join("\n")}

      Note: Always include the document "!!! Bot Orientation !!!.txt" as part of the selected documents, regardless of the query.
      Based on the file names, select the documents that would potentially answer the user's query.
      Prioritize documents that directly address the user's query.
      Select the document that is most relevant to the query first, and only include others if absolutely necessary for context or related information.
      Return a JSON object with the following structure:
      {
        "selectedFileNames": ["doc1.txt", "doc3.txt"]
      }
      Always return a JSON object with no exceptions. Do not include any other text. Return an empty JSON object if there are no results.
      Sort the entries by relevance. The most relevant document would be first.
    `;

    // Send query to OpenAI API using axios
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
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

    // Parse the JSON object returned by OpenAI
    const parsedResponse = JSON.parse(messageContent);
    const selectedFileNames = parsedResponse.selectedFileNames || [];

    return { selectedFileNames };
  } catch (error) {
    console.error("Error in selectDocuments function:", error);
    throw error; // Re-throw the error to be handled by the route
  }
}

app.post("/select-documents", async (req, res) => {
  const userQuery = req.body.userQuery.toLowerCase();

  try {
    const { selectedFileNames } = await selectDocuments(userQuery);

    if (selectedFileNames.length === 0) {
      // Provide a fallback if no relevant documents are found
      return res.json({
        selectedFileNames: [],
        documents: [
          {
            filename: "Fallback.txt",
            content: "Sorry, no relevant documents were found for your query.",
          },
        ],
      });
    }

    // Read content of selected documents
    const documents = selectedFileNames.map((file) => {
      const filePath = path.join(__dirname, "conscious", file);
      const content = fs.readFileSync(filePath, "utf-8");
      return { filename: file, content };
    });

    res.json({ selectedFileNames, documents });
  } catch (error) {
    console.error("Error in /select-documents route:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
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
