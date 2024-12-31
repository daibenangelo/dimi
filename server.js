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

      Based on the file names, select the documents that would potentially answer the user's query.
      Prioritize documents that directly address the user's query.
      Select the document that is most relevant to the query first, and only include others if absolutely necessary for context or related information.
      Return a JSON object with the following structure:
      {
        "selectedFileNames": ["doc1.txt", "doc3.txt"]
      }
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
