import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Replicate from "replicate";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Swap this model string to use a different video model.
// Cheap/fast default: Wan 2.5 T2V Fast
const VIDEO_MODEL = "wan-video/wan-2.5-t2v-fast";

// Start a video generation. Returns a prediction id immediately.
app.post("/api/generate", async (req, res) => {
  const { prompt } = req.body;

  if (!prompt || !prompt.trim()) {
    return res.status(400).json({ error: "Prompt is required" });
  }

  try {
    const prediction = await replicate.predictions.create({
      model: VIDEO_MODEL,
      input: { prompt },
    });

    res.json({ id: prediction.id, status: prediction.status });
  } catch (err) {
    console.error("Generate error:", err);
    res.status(500).json({ error: "Failed to start video generation" });
  }
});

// Poll this with the prediction id to check progress / get the final video URL.
app.get("/api/status/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const prediction = await replicate.predictions.get(id);

    res.json({
      status: prediction.status, // starting | processing | succeeded | failed | canceled
      output: prediction.output || null,
      error: prediction.error || null,
    });
  } catch (err) {
    console.error("Status check error:", err);
    res.status(500).json({ error: "Failed to check status" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
