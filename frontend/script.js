// Global Stripe instance
const stripe = Stripe("pk_live_51RggwVGaDogLlv84eCRGvr7Xl8ocVtyftXCUm4EQZfSM9RNlKl8P8ui7LHFhcydE1YNQu5vKSeMsC0tizEJvXHkI0001FKpjK0");

// Flag to track demo mode
let isDemoMode = false;

document.addEventListener("DOMContentLoaded", () => {
  applyTheme();

  document.getElementById("themeToggle")?.addEventListener("click", toggleTheme);
  document.getElementById("demoBtn")?.addEventListener("click", fillDemo);
  document.getElementById("generateBtn")?.addEventListener("click", handleGenerateClick);

  // Reset demo mode if user manually edits any input
  document.getElementById("jobDescription").addEventListener("input", () => isDemoMode = false);
  document.getElementById("resumeFile").addEventListener("change", () => isDemoMode = false);
  document.getElementById("tone").addEventListener("change", () => isDemoMode = false);
});

// Detect currency for payment
function getCurrency() {
  const region = Intl.DateTimeFormat().resolvedOptions().locale;
  if (region.includes("IN")) return "INR";
  if (region.includes("CA")) return "CAD";
  return "USD";
}

function toggleTheme() {
  const darkNow = !document.body.classList.contains("dark");
  localStorage.setItem("darkMode", darkNow);
  applyTheme();
}

// Fill demo inputs
function fillDemo() {
  isDemoMode = true;

  document.getElementById("jobDescription").value = `We're seeking a full-stack developer with experience in React, Node.js, and RESTful services.`;

  const blob = new Blob([`John Doe is a developer skilled in React, Node.js, MongoDB, REST APIs.`], { type: "text/plain" });
  const file = new File([blob], "resume.txt", { type: "text/plain" });
  const dt = new DataTransfer();
  dt.items.add(file);
  document.getElementById("resumeFile").files = dt.files;

  document.getElementById("tone").value = "enthusiastic";
}

// Generate button click
function handleGenerateClick() {
  const jobDescription = document.getElementById("jobDescription").value.trim();
  const tone = document.getElementById("tone").value;
  const fileInput = document.getElementById("resumeFile");

  if (!fileInput.files.length || !jobDescription) {
    alert("Please upload a resume file and paste the job description.");
    return;
  }

  // Skip payment check if demo is used
  if (isDemoMode) {
    processFile(fileInput.files[0], jobDescription, tone);
    return;
  }

  const alreadyUsedFree = localStorage.getItem("usedFree") === "true";

  if (alreadyUsedFree) {
    // Show popup, then redirect to pricing
    alert("You’ve used your free trial. Please upgrade to generate more cover letters!");
    window.location.href = "pricing.html";
    return;
  }

  // First-time real generation
  localStorage.setItem("usedFree", "true");
  processFile(fileInput.files[0], jobDescription, tone);
}

// Resume parsing and AI generation
function processFile(file, jobDescription, tone) {
  const button = document.getElementById("generateBtn");
  button.disabled = true;
  button.textContent = "Generating...";

  const loader = document.createElement("div");
  loader.className = "loader";
  loader.textContent = "Talking to AI...";
  document.querySelector("main").appendChild(loader);

  const processResumeAndGenerate = async (resume) => {
    try {
      const response = await fetch("https://tailormyletter-backend.onrender.com/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume, jobDescription, tone }),
      });

      const data = await response.json();
      loader.remove();

      if (data.error) {
        alert("AI Error: " + data.error);
        return;
      }

      document.querySelector(".results-section").style.display = "block";
      document.getElementById("coverLetterOutput").value = data.coverLetter || "No letter generated.";

      const score = data.score || 0;
      const bar = document.querySelector(".score-bar-fill");
      bar.style.width = `${score}%`;
      bar.textContent = `${score}%`;

      const feedbackList = document.getElementById("atsFeedback");
      feedbackList.innerHTML = "";
      (data.feedback || []).forEach((tip) => {
        const li = document.createElement("li");
        li.textContent = tip;
        feedbackList.appendChild(li);
      });
    } catch (err) {
      loader.remove();
      console.error("AI Generation Error:", err);
      alert("Something went wrong while generating. Try again.");
    }

    button.disabled = false;
    button.textContent = "Generate Cover Letter & Score Resume";
  };

  if (file.type === "application/pdf") {
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
