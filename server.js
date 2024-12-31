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

  const folderPath = path.join(__dirname, "conscious");
  fs.readdir(folderPath, (err, files) => {
    if (err) {
      return res.status(500).json({ error: "Failed to read directory" });
    }

    // Use AI to select files based on user query (for now, just matching keywords in filenames)
    const selectedFiles = files.filter((file) =>
      userQuery
        .toLowerCase()
        .split(" ")
        .some((keyword) => file.toLowerCase().includes(keyword))
    );

    // Read the content of the selected files
    const selectedFileContents = selectedFiles.map((file) => {
      const filePath = path.join(folderPath, file);
      return fs.readFileSync(filePath, "utf-8");
    });

    res.json({ selectedFileContents: selectedFileContents.join("\n") });
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
