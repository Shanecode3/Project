document.getElementById("generateBtn").addEventListener("click", async () => {
  const resume = document.getElementById("resume").value.trim();
  const jobDescription = document.getElementById("jobDescription").value.trim();
  const tone = document.getElementById("tone").value;

  if (!resume || !jobDescription) {
    alert("Please enter both resume and job description.");
    return;
  }

  // Show loading status
  const button = document.getElementById("generateBtn");
  button.disabled = true;
  button.textContent = "Generating...";

  try {
    const response = await fetch("/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ resume, jobDescription, tone }),
    });

    const data = await response.json();

    // Show results
    document.querySelector(".results-section").style.display = "block";
    document.getElementById("coverLetterOutput").value = data.coverLetter || "No letter generated.";
    document.getElementById("score").textContent = `Score: ${data.score || '--'}%`;
    document.getElementById("atsFeedback").innerHTML = "";

    (data.feedback || []).forEach(tip => {
      const li = document.createElement("li");
      li.textContent = tip;
      document.getElementById("atsFeedback").appendChild(li);
    });
  } catch (err) {
    alert("Something went wrong. Please try again.");
    console.error(err);
  }

  button.disabled = false;
  button.textContent = "Generate Cover Letter & Score Resume";
});

function copyCoverLetter() {
  const output = document.getElementById("coverLetterOutput");
  output.select();
  document.execCommand("copy");
  alert("Cover letter copied to clipboard!");
}
