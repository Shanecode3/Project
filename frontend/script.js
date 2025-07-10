// === FIREBASE AUTH ===
const firebaseConfig = {
  apiKey: "AIzaSyDHvbxZ8vwS46KAoUV0MojM86pmSVWANF0",
  authDomain: "tailormyletter.firebaseapp.com",
  projectId: "tailormyletter",
  storageBucket: "tailormyletter.firebasestorage.app",
  messagingSenderId: "937811770956",
  appId: "1:937811770956:web:16392c7432d0d7a0a6bee9",
  measurementId: "G-MVXGR8WEC7"
};

if (typeof firebase !== "undefined") {
  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();

  function signUp() { /* ...same as yours... */ }
  function login() { /* ...same as yours... */ }
  function sendVerification() { /* ...same as yours... */ }
  function signOut() { /* ...same as yours... */ }
  function forgotPassword() { /* ...same as yours... */ }
  auth.onAuthStateChanged((user) => { /* ...same as yours... */ });
  document.addEventListener("DOMContentLoaded", () => { /* ...same as yours... */ });
}

const stripe = (typeof Stripe !== "undefined") ? Stripe("pk_live_51RggwVGaDogLlv84eCRGvr7Xl8ocVtyftXCUm4EQZfSM9RNlKl8P8ui7LHFhcydE1YNQu5vKSeMsC0tizEJvXHkI0001FKpjK0") : null;

let isDemoMode = false;

document.addEventListener("DOMContentLoaded", () => {
  const demoBtn = document.getElementById("demoBtn");
  const generateBtn = document.getElementById("generateBtn");
  const jobDescription = document.getElementById("jobDescription");
  const resumeFile = document.getElementById("resumeFile");
  const tone = document.getElementById("tone");

  if (demoBtn) demoBtn.addEventListener("click", fillDemo);
  if (generateBtn) generateBtn.addEventListener("click", handleGenerateClick);
  if (jobDescription) jobDescription.addEventListener("input", () => isDemoMode = false);
  if (resumeFile) resumeFile.addEventListener("change", () => isDemoMode = false);
  if (tone) tone.addEventListener("change", () => isDemoMode = false);
});

function getCurrency() { /* ...same as yours... */ }

function fillDemo() {
  isDemoMode = true;
  const jobDesc = document.getElementById("jobDescription");
  const resumeEl = document.getElementById("resumeFile");
  const toneEl = document.getElementById("tone");
  if (jobDesc) jobDesc.value = `We're seeking a full-stack developer with experience in React, Node.js, and RESTful services.`;
  if (resumeEl) {
    const blob = new Blob([`John Doe is a developer skilled in React, Node.js, MongoDB, REST APIs.`], { type: "text/plain" });
    const file = new File([blob], "resume.txt", { type: "text/plain" });
    const dt = new DataTransfer();
    dt.items.add(file);
    resumeEl.files = dt.files;
  }
  if (toneEl) toneEl.value = "enthusiastic";
}

// ==== MAIN GENERATE ====
function handleGenerateClick() {
  const jobDescription = document.getElementById("jobDescription");
  const tone = document.getElementById("tone");
  const fileInput = document.getElementById("resumeFile");
  const button = document.getElementById("generateBtn");

  if (!fileInput || !fileInput.files.length || !jobDescription || !jobDescription.value.trim()) {
    alert("Please upload a resume file and paste the job description.");
    return;
  }

  if (isDemoMode) {
    // DEMO MODE: always works, never checks login, DB, or free trial
    processDemoFile(fileInput.files[0], jobDescription.value, tone ? tone.value : "");
    return;
  }

  // === REAL USER GENERATION (Requires login & verified) ===
  const user = typeof firebase !== "undefined" ? firebase.auth().currentUser : null;
  if (!user || !user.emailVerified) {
    alert("You must be signed in and email-verified to use this feature.");
    return;
  }

  user.getIdToken().then(idToken => {
    processRealFile(fileInput.files[0], jobDescription.value, tone ? tone.value : "", idToken, button);
  });
}

// ==== DEMO GENERATION (never checks trial/DB) ====
function processDemoFile(file, jobDescription, tone) {
  const button = document.getElementById("generateBtn");
  if (button) {
    button.disabled = true;
    button.textContent = "Generating (Demo)...";
  }
  const loader = document.createElement("div");
  loader.className = "loader";
  loader.textContent = "Talking to AI (Demo)...";
  const main = document.querySelector("main");
  if (main) main.appendChild(loader);

  const finishDemo = (resume) => {
    // You can call your backend with a demo endpoint or mock a response here
    setTimeout(() => {
      loader.remove();
      if (button) {
        button.disabled = false;
        button.textContent = "Generate Cover Letter & Score Resume";
      }
      // Fake result (or replace with real fetch if you want to hit backend demo endpoint)
      const resultsSection = document.querySelector(".results-section");
      if (resultsSection) resultsSection.style.display = "block";
      document.getElementById("coverLetterOutput").value =
        "Dear Hiring Manager,\n\nI'm excited to apply for the role! (Demo Output)\n\nSincerely,\nJohn Doe";
      document.querySelector(".score-bar-fill").style.width = "85%";
      document.querySelector(".score-bar-fill").textContent = "85%";
      const feedbackList = document.getElementById("atsFeedback");
      if (feedbackList) {
        feedbackList.innerHTML = "";
        ["Demo tip 1: Add more projects.", "Demo tip 2: Show more results."].forEach((tip) => {
          const li = document.createElement("li");
          li.textContent = tip;
          feedbackList.appendChild(li);
        });
      }
    }, 1000); // simulate network
  };

  if (file.type === "application/pdf" && window["pdfjs-dist/build/pdf"]) {
    const pdfjsLib = window["pdfjs-dist/build/pdf"];
    pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.9.359/pdf.worker.min.js";
    const reader = new FileReader();
    reader.onload = function () {
      const typedarray = new Uint8Array(reader.result);
      pdfjsLib.getDocument(typedarray).promise.then(function (pdf) {
        let textContent = "";
        const loadPage = (i) => {
          if (i > pdf.numPages) {
            finishDemo(textContent);
            return;
          }
          pdf.getPage(i).then((page) => {
            page.getTextContent().then((text) => {
              textContent += text.items.map((item) => item.str).join(" ") + "\n";
              loadPage(i + 1);
            });
          });
        };
        loadPage(1);
      });
    };
    reader.readAsArrayBuffer(file);
  } else {
    const reader = new FileReader();
    reader.onload = function (e) {
      finishDemo(e.target.result);
    };
    reader.readAsText(file);
  }
}

// ==== REAL GENERATION (checks backend/free trial) ====
function processRealFile(file, jobDescription, tone, idToken, button) {
  if (button) {
    button.disabled = true;
    button.textContent = "Generating...";
  }
  const loader = document.createElement("div");
  loader.className = "loader";
  loader.textContent = "Talking to AI...";
  const main = document.querySelector("main");
  if (main) main.appendChild(loader);

  const processResumeAndGenerate = async (resume) => {
    try {
      const response = await fetch("https://tailormyletter-backend.onrender.com/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + idToken
        },
        body: JSON.stringify({ resume, jobDescription, tone }),
      });
      const data = await response.json();
      loader.remove();

      if (data.error === "Free trial already used. Please subscribe.") {
        alert("You’ve used your free trial. Please upgrade to generate more cover letters!");
        window.location.href = "pricing.html";
        return;
      }
      if (data.error) {
        alert("AI Error: " + data.error);
        return;
      }
      const resultsSection = document.querySelector(".results-section");
      if (resultsSection) resultsSection.style.display = "block";
      const coverOut = document.getElementById("coverLetterOutput");
      if (coverOut) coverOut.value = data.coverLetter || "No letter generated.";
      const score = data.score || 0;
      const bar = document.querySelector(".score-bar-fill");
      if (bar) {
        bar.style.width = `${score}%`;
        bar.textContent = `${score}%`;
      }
      const feedbackList = document.getElementById("atsFeedback");
      if (feedbackList) {
        feedbackList.innerHTML = "";
        (data.feedback || []).forEach((tip) => {
          const li = document.createElement("li");
          li.textContent = tip;
          feedbackList.appendChild(li);
        });
      }
    } catch (err) {
      loader.remove();
      alert("Something went wrong while generating. Try again.");
    }
    if (button) {
      button.disabled = false;
      button.textContent = "Generate Cover Letter & Score Resume";
    }
  };

  if (file.type === "application/pdf" && window["pdfjs-dist/build/pdf"]) {
    const pdfjsLib = window["pdfjs-dist/build/pdf"];
    pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.9.359/pdf.worker.min.js";
    const reader = new FileReader();
    reader.onload = function () {
      const typedarray = new Uint8Array(reader.result);
      pdfjsLib.getDocument(typedarray).promise.then(function (pdf) {
        let textContent = "";
        const loadPage = (i) => {
          if (i > pdf.numPages) {
            processResumeAndGenerate(textContent);
            return;
          }
          pdf.getPage(i).then((page) => {
            page.getTextContent().then((text) => {
              textContent += text.items.map((item) => item.str).join(" ") + "\n";
              loadPage(i + 1);
            });
          });
        };
        loadPage(1);
      });
    };
    reader.readAsArrayBuffer(file);
  } else {
    const reader = new FileReader();
    reader.onload = function (e) {
      processResumeAndGenerate(e.target.result);
    };
    reader.readAsText(file);
  }
}
