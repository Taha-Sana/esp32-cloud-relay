import express from "express";
import fetch from "node-fetch";

const app = express();

const ESP_STREAM_URL = process.env.ESP_STREAM_URL;

app.get("/stream", async (req, res) => {
  try {
    const espRes = await fetch(ESP_STREAM_URL);

    res.setHeader("Content-Type", "multipart/x-mixed-replace; boundary=frame");

    espRes.body.pipe(res);
  } catch (e) {
    res.status(500).send("ESP32 stream not reachable");
  }
});

app.listen(10000, () => {
  console.log("Render relay running on port 10000");
});
