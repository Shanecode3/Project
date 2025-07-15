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
            if (msg) msg.innerText = "Verification email sent! Please check your inbox (and spam/promotions tab).";
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

  // NEW: Hide/show landing content as well
  function updatePageOnAuth() {
    const authSection = document.getElementById("auth-section");
    const appSection = document.getElementById("app-section");
    const landingMain = document.getElementById("landing-main-content");
    if (authSection && appSection && landingMain) {
      const user = auth.currentUser;
      if (user && user.emailVerified) {
        authSection.style.display = "none";
        appSection.style.display = "block";
        landingMain.style.display = "none";
      } else {
        authSection.style.display = "block";
        appSection.style.display = "none";
        landingMain.style.display = "";
      }
    }
  }

  auth.onAuthStateChanged(() => {
    updatePageOnAuth();
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

    updatePageOnAuth(); // Ensure correct state on first load
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

      let data;
      if (!response.ok) {
        try {
          data = await response.json();
        } catch (e) {
          data = { error: response.statusText || "Error" };
        }
        loader.remove();
        if (data.error && data.error.includes("Free trial already used")) {
          alert("You’ve used your free trial. Please upgrade to generate more cover letters!");
          window.location.href = "pricing.html";
        } else {
          alert("AI Error: " + (data.error || "Unknown error"));
        }
        if (button) {
          button.disabled = false;
          button.textContent = "Generate Cover Letter & Score Resume";
        }
        return;
      }

      data = await response.json();
      loader.remove();

      if (data.error) {
        alert("AI Error: " + data.error);
        if (button) {
          button.disabled = false;
          button.textContent = "Generate Cover Letter & Score Resume";
        }
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
      if (button) {
        button.disabled = false;
        button.textContent = "Generate Cover Letter & Score Resume";
      }
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

  // --- PRICING PAGE STRIPE PAYMENT ---
  const payBtn = document.getElementById("payNowBtn");
  const currencySelect = document.getElementById("currencySelector");

  if (payBtn && stripe) {
    payBtn.addEventListener("click", async () => {
      let currency = getCurrency();
      if (currencySelect && currencySelect.value) {
        currency = currencySelect.value;
      }

      // Require user login for payment
      if (typeof firebase !== "undefined") {
        const user = firebase.auth().currentUser;
        if (!user || !user.emailVerified) {
          alert("Please sign in and verify your email to pay & unlock.");
          return;
        }
        const idToken = await user.getIdToken();

        try {
          const res = await fetch("https://tailormyletter-backend.onrender.com/create-checkout-session", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": "Bearer " + idToken
            },
            body: JSON.stringify({ currency }),
          });
          const session = await res.json();
          if (session.id) {
            await stripe.redirectToCheckout({ sessionId: session.id });
          } else {
            alert("Payment failed. No session ID.");
          }
        } catch (err) {
          alert("Checkout failed. Try again later.");
        }
      }
    });
  }
});

function showToast(msg = "Payment successful! You can now generate your cover letter.") {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 3500);
}

document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("paid") === "1") {
    showToast();
    window.history.replaceState({}, document.title, window.location.pathname);
  }
});

