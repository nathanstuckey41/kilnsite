let mode = "login";

const form = document.getElementById("auth-form");
const title = document.getElementById("auth-title");
const submitButton = document.getElementById("submit-button");
const toggle = document.getElementById("toggle");
const message = document.getElementById("message");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

toggle.addEventListener("click", function (event) {
  event.preventDefault();
  mode = mode === "login" ? "signup" : "login";

  title.textContent = mode === "login" ? "Log in" : "Sign up";
  submitButton.textContent = title.textContent;
  toggle.textContent =
    mode === "login"
      ? "Need an account? Sign up"
      : "Already have an account? Log in";
  message.textContent = "";
});

form.addEventListener("submit", async function (event) {
  event.preventDefault();
  message.textContent = "Working...";

  const email = emailInput.value;
  const password = passwordInput.value;

  if (mode === "signup") {
    const { error } = await db.auth.signUp({
      email: email,
      password: password,
      options: {
        emailRedirectTo: new URL("index.html", window.location.href).href
      }
    });

    if (error) {
      message.textContent = error.message;
    } else {
      message.textContent = "Check your email for a confirmation link.";
      form.reset();
    }
  } else {
    const { error } = await db.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) {
      message.textContent = error.message;
    } else {
      window.location.href = "index.html";
    }
  }
});