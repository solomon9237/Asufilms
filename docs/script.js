// ---------- Supabase setup ----------
const SUPABASE_URL = "https://kldwzssxwnyrlyzflpcv.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Ez6SQ1Ly5PGSka9xfulwjA_m0OLZjYl";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Change this if your backend runs on a different URL
const API_BASE = "https://asufilms.onrender.com";

// ---------- Elements ----------
const authBox = document.getElementById("authBox");
const tabLogin = document.getElementById("tabLogin");
const tabSignup = document.getElementById("tabSignup");
const authEmail = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");
const authSubmitBtn = document.getElementById("authSubmitBtn");
const googleBtn = document.getElementById("googleBtn");
const authError = document.getElementById("authError");

const userBar = document.getElementById("userBar");
const userEmail = document.getElementById("userEmail");
const logoutBtn = document.getElementById("logoutBtn");
const promptSection = document.getElementById("promptSection");

const promptInput = document.getElementById("promptInput");
const generateBtn = document.getElementById("generateBtn");
const statusBox = document.getElementById("statusBox");
const statusText = document.getElementById("statusText");
const resultBox = document.getElementById("resultBox");
const resultVideo = document.getElementById("resultVideo");
const downloadLink = document.getElementById("downloadLink");
const errorBox = document.getElementById("errorBox");
const errorText = document.getElementById("errorText");

let authMode = "login"; // or "signup"

function show(el) { el.classList.remove("hidden"); }
function hide(el) { el.classList.add("hidden"); }

// ---------- Auth tab switching ----------
tabLogin.addEventListener("click", () => {
  authMode = "login";
  tabLogin.classList.add("active");
  tabSignup.classList.remove("active");
  authSubmitBtn.textContent = "Log In";
  hide(authError);
});

tabSignup.addEventListener("click", () => {
  authMode = "signup";
  tabSignup.classList.add("active");
  tabLogin.classList.remove("active");
  authSubmitBtn.textContent = "Sign Up";
  hide(authError);
});

// ---------- Email/password auth ----------
authSubmitBtn.addEventListener("click", async () => {
  const email = authEmail.value.trim();
  const password = authPassword.value;

  if (!email || !password) {
    showAuthError("Please enter both email and password.");
    return;
  }

  hide(authError);
  authSubmitBtn.disabled = true;

  try {
    let result;
    if (authMode === "signup") {
      result = await supabaseClient.auth.signUp({ email, password });
    } else {
      result = await supabaseClient.auth.signInWithPassword({ email, password });
    }

    if (result.error) throw result.error;

    if (authMode === "signup" && !result.data.session) {
      showAuthError("Check your email to confirm your account, then log in.");
    }
  } catch (err) {
    showAuthError(err.message);
  } finally {
    authSubmitBtn.disabled = false;
  }
});

googleBtn.addEventListener("click", async () => {
  await supabaseClient.auth.signInWithOAuth({ provider: "google" });
});

logoutBtn.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
});

function showAuthError(message) {
  authError.textContent = message;
  show(authError);
}

// ---------- Session handling ----------
supabaseClient.auth.onAuthStateChange((_event, session) => {
  updateUI(session);
});

async function checkSession() {
  const { data } = await supabaseClient.auth.getSession();
  updateUI(data.session);
}

function updateUI(session) {
  if (session) {
    hide(authBox);
    show(userBar);
    show(promptSection);
    userEmail.textContent = session.user.email;
  } else {
    show(authBox);
    hide(userBar);
    hide(promptSection);
  }
}

checkSession();

// ---------- Video generation ----------
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

    await pollForResult(startData.id, prompt);
  } catch (err) {
    showError(err.message);
  } finally {
    generateBtn.disabled = false;
  }
});

async function pollForResult(id, prompt) {
  const maxAttempts = 60;
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
      await saveVideoToHistory(prompt, videoUrl);
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

async function saveVideoToHistory(prompt, videoUrl) {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return;

  await supabaseClient.from("Video").insert({
    user_id: session.user.id,
    prompt,
    video_url: videoUrl,
  });
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
