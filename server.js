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

// Serve static files in the "js" directory at /js
app.use("/js", express.static(path.join(__dirname, "js")));

// Serve the index.html file
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
