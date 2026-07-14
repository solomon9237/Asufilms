// Change this if your backend runs on a different URL
const API_BASE = "http://localhost:3000";

const promptInput = document.getElementById("promptInput");
const generateBtn = document.getElementById("generateBtn");
const statusBox = document.getElementById("statusBox");
const statusText = document.getElementById("statusText");
const resultBox = document.getElementById("resultBox");
const resultVideo = document.getElementById("resultVideo");
const downloadLink = document.getElementById("downloadLink");
const errorBox = document.getElementById("errorBox");
const errorText = document.getElementById("errorText");

function show(el) { el.classList.remove("hidden"); }
function hide(el) { el.classList.add("hidden"); }

generateBtn.addEventListener("click", async () => {
  const prompt = promptInput.value.trim();
  if (!prompt) return;

  hide(resultBox);
  hide(errorBox);
  show(statusBox);
  statusText.textContent = "Starting generation...";
  generateBtn.disabled = true;

  try {
    const startRes = await fetch(`${API_BASE}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    const startData = await startRes.json();

    if (!startRes.ok) {
      throw new Error(startData.error || "Failed to start generation");
    }

    await pollForResult(startData.id);
  } catch (err) {
    showError(err.message);
  } finally {
    generateBtn.disabled = false;
  }
});

async function pollForResult(id) {
  const maxAttempts = 60; // ~5 minutes at 5s intervals
  let attempts = 0;

  while (attempts < maxAttempts) {
    const res = await fetch(`${API_BASE}/api/status/${id}`);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Failed to check status");
    }

    if (data.status === "succeeded") {
      const videoUrl = Array.isArray(data.output) ? data.output[0] : data.output;
      showResult(videoUrl);
      return;
    }

    if (data.status === "failed" || data.status === "canceled") {
      throw new Error(data.error || "Video generation failed");
    }

    statusText.textContent = `Generating video... (${data.status})`;
    await new Promise((resolve) => setTimeout(resolve, 5000));
    attempts++;
  }

  throw new Error("Generation timed out. Try again.");
}

function showResult(videoUrl) {
  hide(statusBox);
  resultVideo.src = videoUrl;
  downloadLink.href = videoUrl;
  show(resultBox);
}

function showError(message) {
  hide(statusBox);
  errorText.textContent = message;
  show(errorBox);
}
