
const stripe = Stripe("pk_live_51RggwVGaDogLlv84eCRGvr7Xl8ocVtyftXCUm4EQZfSM9RNlKl8P8ui7LHFhcydE1YNQu5vKSeMsC0tizEJvXHkI0001FKpjK0");

function getCurrency() {
  const currencySelector = document.getElementById("currencySelector");
  return currencySelector ? currencySelector.value : "USD";
}

async function handleGenerateClick() {
  const fileInput = document.getElementById("resume");
  const jobDesc = document.getElementById("jobDescription").value.trim();
  const tone = document.getElementById("tone").value.trim();

  if (!fileInput.files.length || !jobDesc || !tone) {
    alert("Please fill in all fields and upload your resume.");
    return;
  }

  const formData = new FormData();
  formData.append("resume", fileInput.files[0]);
  formData.append("jobDescription", jobDesc);
  formData.append("tone", tone);

  try {
    const res = await fetch("/generate", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (data.error) {
      alert("Error: " + data.error);
      return;
    }

    // Do something with the response (like showing the result)
    console.log(data);
  } catch (err) {
    console.error("Request failed:", err);
  }
}

async function handlePayAndGenerateClick() {
  const currency = getCurrency();
  try {
    const response = await fetch("/create-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ currency }),
    });

    const session = await response.json();

    if (session.id) {
      await stripe.redirectToCheckout({ sessionId: session.id });
    } else {
      console.error("Invalid session response:", session);
    }
  } catch (error) {
    console.error("Error creating checkout session:", error);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("generateBtn")?.addEventListener("click", handleGenerateClick);
  document.getElementById("payAndGenerateBtn")?.addEventListener("click", handlePayAndGenerateClick);

  document.getElementById("demoBtn")?.addEventListener("click", async () => {
    const response = await fetch("/demo");
    const data = await response.json();
    console.log("Demo data:", data);
  });
});
