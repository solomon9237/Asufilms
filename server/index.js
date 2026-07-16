import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const FAL_KEY = process.env.FAL_KEY;
const MODEL = "fal-ai/wan-t2v";

// Start a video generation. Returns a request id immediately.
app.post("/api/generate", async (req, res) => {
  const { prompt } = req.body;

  if (!prompt || !prompt.trim()) {
    return res.status(400).json({ error: "Prompt is required" });
  }

  try {
    const falRes = await fetch(`https://queue.fal.run/${MODEL}`, {
      method: "POST",
      headers: {
        Authorization: `Key ${FAL_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
    });

    const data = await falRes.json();

    if (!falRes.ok) {
      throw new Error(data.detail || "Failed to start video generation");
    }

    res.json({ id: data.request_id });
  } catch (err) {
    console.error("Generate error:", err);
    res.status(500).json({ error: err.message || "Failed to start video generation" });
  }
});

// Poll this with the request id to check progress / get the final video URL.
app.get("/api/status/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const statusRes = await fetch(
      `https://queue.fal.run/${MODEL}/requests/${id}/status`,
      { headers: { Authorization: `Key ${FAL_KEY}` } }
    );
    const statusData = await statusRes.json();

    if (statusData.status !== "COMPLETED") {
      return res.json({ status: statusData.status.toLowerCase(), output: null });
    }

    const resultRes = await fetch(
      `https://queue.fal.run/${MODEL}/requests/${id}`,
      { headers: { Authorization: `Key ${FAL_KEY}` } }
    );
    const resultData = await resultRes.json();

    res.json({
      status: "succeeded",
      output: resultData.video?.url || null,
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
