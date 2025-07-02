document.getElementById("generateBtn").addEventListener("click", async () => {
  const jobDescription = document.getElementById("jobDescription").value.trim();
  const tone = document.getElementById("tone").value;
  const fileInput = document.getElementById("resumeFile");

  if (!fileInput.files.length || !jobDescription) {
    alert("Please upload a resume file and paste the job description.");
    return;
  }

  const reader = new FileReader();
  reader.onload = async function (e) {
    const resume = e.target.result;

    const button = document.getElementById("generateBtn");
    button.disabled = true;
    button.textContent = "Generating...";
    const loader = document.createElement("div");
    loader.className = "loader";
    loader.textContent = "Talking to AI...";
    document.querySelector("main").appendChild(loader);

    try {
      const response = await fetch("/generate", {
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
      document.getElementById("score").textContent = `Score: ${score}%`;

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
      alert("Something went wrong. Check console.");
      console.error(err);
    }

    button.disabled = false;
    button.textContent = "Generate Cover Letter & Score Resume";
  };

  const file = fileInput.files[0];
  if (file.type === "application/pdf") {
    const pdfjsLib = window["pdfjs-dist/build/pdf"];
    pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.9.359/pdf.worker.min.js";
    const reader = new FileReader();
    reader.onload = function () {
      const typedarray = new Uint8Array(reader.result);
      pdfjsLib.getDocument(typedarray).promise.then(function (pdf) {
        let textContent = "";
        const maxPages = pdf.numPages;
        const loadPage = (i) => {
          if (i > maxPages) {
            reader.result = textContent;
            reader.onload({ target: { result: textContent } });
            return;
          }
          pdf.getPage(i).then(function (page) {
            page.getTextContent().then(function (text) {
              textContent += text.items.map(item => item.str).join(" ") + "\n";
              loadPage(i + 1);
            });
          });
        };
        loadPage(1);
      });
    };
    reader.readAsArrayBuffer(file);
  } else {
    reader.readAsText(file);
  }
});

function copyCoverLetter() {
  const output = document.getElementById("coverLetterOutput");
  output.select();
  document.execCommand("copy");
  alert("Cover letter copied to clipboard!");
}

function fillDemo() {
  document.getElementById("jobDescription").value = `We're seeking a full-stack developer with experience in React, Node.js, and RESTful services to join our product development team.`;
  const blob = new Blob(
    [`John Doe is a full-stack developer with experience in React, Node.js, MongoDB, and REST APIs.`],
    { type: "text/plain" }
  );
  const file = new File([blob], "resume.txt", { type: "text/plain" });
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);
  document.getElementById("resumeFile").files = dataTransfer.files;

  document.getElementById("tone").value = "enthusiastic";
}
