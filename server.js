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
    apiKey: "PRETEND THIS IS THE KEY",
  });
});

// Endpoint to retrieve the list of documents in "conscious" folder
app.get("/files/", (req, res) => {
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

// Serve static files in the "js" directory at /js
app.use("/js", express.static(path.join(__dirname, "js")));

// Serve the index.html file
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
