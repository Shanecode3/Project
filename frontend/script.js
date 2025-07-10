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

  function signUp() {
    const emailEl = document.getElementById("auth-email");
    const passEl = document.getElementById("auth-password");
    if (!emailEl || !passEl) return;
    const email = emailEl.value;
    const password = passEl.value;
    auth.createUserWithEmailAndPassword(email, password)
      .then(userCredential => {
        userCredential.user.sendEmailVerification()
          .then(() => {
            const msg = document.getElementById("auth-message");
            if (msg) msg.innerText = "Verification email sent! Please check your inbox.";
          });
      })
      .catch(err => {
        const msg = document.getElementById("auth-message");
        if (msg) msg.innerText = err.message;
      });
  }

  function login() {
    const emailEl = document.getElementById("auth-email");
    const passEl = document.getElementById("auth-password");
    if (!emailEl || !passEl) return;
    const email = emailEl.value;
    const password = passEl.value;
    auth.signInWithEmailAndPassword(email, password)
      .then(userCredential => {
        const msg = document.getElementById("auth-message");
        if (!userCredential.user.emailVerified) {
          if (msg) msg.innerText = "Please verify your email first (check your inbox).";
          auth.signOut();
        } else {
          if (msg) msg.innerText = "Login successful!";
          userCredential.user.getIdToken().then(idToken => {
            fetch("https://tailormyletter-backend.onrender.com/register", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + idToken
              },
              body: JSON.stringify({})
            });
          });
        }
      })
      .catch(err => {
        const msg = document.getElementById("auth-message");
        if (msg) msg.innerText = err.message;
      });
  }

  function sendVerification() {
    const user = auth.currentUser;
    const msg = document.getElementById("auth-message");
    if (user && !user.emailVerified) {
      user.sendEmailVerification().then(() => {
        if (msg) msg.innerText = "Verification email sent!";
      });
    } else {
      if (msg) msg.innerText = "Log in first or already verified.";
    }
  }

  function signOut() {
    auth.signOut().then(() => {
      const msg = document.getElementById("auth-message");
      if (msg) msg.innerText = "Signed out!";
    });
  }

  function forgotPassword() {
    const emailEl = document.getElementById("auth-email");
    const msg = document.getElementById("auth-message");
    if (!emailEl) return;
    const email = emailEl.value;
    if (!email) {
      if (msg) msg.innerText = "Please enter your email above to reset your password.";
      return;
    }
    auth.sendPasswordResetEmail(email)
      .then(() => {
        if (msg) msg.innerText = "Password reset email sent! Please check your inbox.";
      })
      .catch((error) => {
        if (msg) msg.innerText = error.message;
      });
  }

  auth.onAuthStateChanged((user) => {
    const authSection = document.getElementById("auth-section");
    const appSection = document.getElementById("app-section");
    if (authSection && appSection) {
      if (user && user.emailVerified) {
        authSection.style.display = "none";
        appSection.style.display = "block";
      } else {
        authSection.style.display = "block";
        appSection.style.display = "none";
      }
    }
  });

  document.addEventListener("DOMContentLoaded", () => {
    const signupBtn = document.querySelector('[onclick="signUp()"]');
    const loginBtn = document.querySelector('[onclick="login()"]');
    const resendBtn = document.querySelector('[onclick="sendVerification()"]');
    const signoutBtn = document.querySelector('[onclick="signOut()"]');
    const forgotLink = document.getElementById("forgot-password-link");
    if (signupBtn) signupBtn.onclick = signUp;
    if (loginBtn) loginBtn.onclick = login;
    if (resendBtn) resendBtn.onclick = sendVerification;
    if (signoutBtn) signoutBtn.onclick = signOut;
    if (forgotLink) forgotLink.onclick = function(e){ e.preventDefault(); forgotPassword(); return false; };
  });
}

// === STRIPE (for pricing) ===
const stripe = (typeof Stripe !== "undefined") ? Stripe("pk_live_51RggwVGaDogLlv84eCRGvr7Xl8ocVtyftXCUm4EQZfSM9RNlKl8P8ui7LHFhcydE1YNQu5vKSeMsC0tizEJvXHkI0001FKpjK0") : null;

// === GENERATE ===
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

function getCurrency() {
  const region = Intl.DateTimeFormat().resolvedOptions().locale;
  if (region.includes("IN")) return "INR";
  if (region.includes("CA")) return "CAD";
  return "USD";
}

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

// ==== MAIN GENERATE FUNCTION ====
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
    processDemoFile(fileInput.files[0], jobDescription.value, tone ? tone.value : "");
    return;
  }

  // ==== ONLY ALLOW LOGGED-IN AND VERIFIED USERS ====
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
    setTimeout(() => {
      loader.remove();
      if (button) {
        button.disabled = false;
        button.textContent = "Generate Cover Letter & Score Resume";
      }
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

document.addEventListener("DOMContentLoaded", () => {
  const scrollArrow = document.getElementById("scroll-to-auth");
  if (scrollArrow) {
    scrollArrow.addEventListener("click", () => {
      const authSec = document.getElementById("auth-section");
      if (authSec) {
        authSec.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }
});

function hideLandingIfLoggedIn() {
  const user = typeof firebase !== "undefined" ? firebase.auth().currentUser : null;
  const landingSection = document.getElementById("landing-section");
  const authSection = document.getElementById("auth-section");
  const appSection = document.getElementById("app-section");
  if (user && user.emailVerified) {
    if (landingSection) landingSection.style.display = "none";
    if (authSection) authSection.style.display = "none";
    if (appSection) appSection.style.display = "block";
  } else {
    if (landingSection) landingSection.style.display = "";
    if (authSection) authSection.style.display = "";
    if (appSection) appSection.style.display = "none";
  }
}

if (typeof firebase !== "undefined") {
  firebase.auth().onAuthStateChanged(hideLandingIfLoggedIn);
}
