const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all origins
app.use(cors());

// Serve static files in the "conscious" directory at /files
app.use("/conscious", express.static(path.join(__dirname, "conscious")));

app.get("/api/env", (req, res) => {
  res.json({
    apiKey: process.env.API_KEY,
  });
});

// Endpoint to retrieve the list of documents in "conscious" folder
app.get("/files", (req, res) => {
  const folderPath = path.join(__dirname, "conscious");

  // Read files in the "conscious" folder
  fs.readdir(folderPath, (err, files) => {
    if (err) {
      return res.status(500).json({ error: "Failed to read directory" });
    }

    // Map each file to an object with filename, description, and default status
    const documents = files.map((file) => ({
      filename: file,
      desc: file.replace(/\.txt$/, "").replace(/_/g, " "), // Remove ".txt" and replace underscores with spaces
      def: true,
    }));

    res.json(documents); // Send the array of documents as JSON
  });
});

app.post("/select-documents", express.json(), async (req, res) => {
  const { question } = req.body;

  const folderPath = path.join(__dirname, "conscious");
  const files = fs.readdirSync(folderPath);
  const documents = files.map((file) => ({
    filename: file,
    content: fs.readFileSync(path.join(folderPath, file), "utf-8"),
  }));

  const summaries = documents.map((doc) => ({
    filename: doc.filename,
    summary: doc.content.slice(0, 300), // First 300 characters for brevity
  }));

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "Select relevant documents based on the user's query.",
        },
        {
          role: "user",
          content: `Question: ${question}\nDocuments:\n${JSON.stringify(
            summaries
          )}`,
        },
      ],
    }),
  });

  const data = await response.json();
  const selectedFilenames = JSON.parse(data.choices[0].message.content);

  const selectedDocuments = documents
    .filter((doc) => selectedFilenames.includes(doc.filename))
    .map((doc) => doc.content);

  res.json({ context: selectedDocuments.join("\n") });
});

// Serve static files in the "js" directory at /js
app.use("/js", express.static(path.join(__dirname, "js")));

// Serve the index.html file
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
