import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

// Just return the stream URL
app.get("/stream-url", (req, res) => {
  res.json({
    stream_url: process.env.ESP_STREAM_URL
  });
});

app.listen(PORT, () => {
  console.log("Render server running on port", PORT);
});
