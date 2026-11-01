
const input = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const conversation = document.getElementById("conversation");
const welcome = document.getElementById("welcome");
const modelSelect = document.getElementById("modelSelect");
const sidebar = document.getElementById("sidebar");

const newChat = document.getElementById("newChat");
const newChatTop = document.getElementById("newChatTop");
const menuBtn = document.getElementById("menuBtn");
const closeSidebar = document.getElementById("closeSidebar");
const chatHistory = document.getElementById("chatHistory");

let chats = [];

// SEND MESSAGE
function sendMessage() {
  const message = input.value.trim();

  if (!message) return;

  welcome.style.display = "none";

  addMessage(message, "user");

  chats.push(message);

  updateHistory(message);

  input.value = "";
  input.style.height = "auto";

  const selectedModel = modelSelect.value;

  const loading = document.createElement("div");
  loading.className = "ai-message";
  loading.textContent = "Connecting to " + selectedModel + "...";

  conversation.appendChild(loading);

  conversation.scrollTop = conversation.scrollHeight;

  // API connection will be added through backend
  setTimeout(() => {
    loading.remove();

    addMessage(
      "NVP AI is ready for API integration. Your selected model is: " +
      selectedModel +
      ". Backend connection is the next development step.",
      "ai"
    );
  }, 600);
}

// ADD MESSAGE
function addMessage(message, type) {
  const wrapper = document.createElement("div");

  wrapper.className = type === "user"
    ? "user-message"
    : "ai-message";

  const text = document.createElement("div");
  text.textContent = message;

  wrapper.appendChild(text);
  conversation.appendChild(wrapper);

  conversation.scrollTop = conversation.scrollHeight;
}

// CHAT HISTORY
function updateHistory(message) {
  if (chats.length === 1) {
    chatHistory.innerHTML = "";
  }

  const item = document.createElement("p");
  item.textContent = message.slice(0, 30);
  item.style.padding = "10px";
  item.style.cursor = "pointer";

  chatHistory.prepend(item);
}

// SEND BUTTON
sendBtn.addEventListener("click", sendMessage);

// ENTER TO SEND
input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
});

// AUTO RESIZE INPUT
input.addEventListener("input", () => {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 150) + "px";
});

// NEW CHAT
function resetChat() {
  conversation.innerHTML = "";
  welcome.style.display = "block";
  input.value = "";
  input.focus();
  chats = [];
}

newChat.addEventListener("click", resetChat);
newChatTop.addEventListener("click", resetChat);

// MOBILE SIDEBAR
menuBtn.addEventListener("click", () => {
  sidebar.classList.add("open");
});

closeSidebar.addEventListener("click", () => {
  sidebar.classList.remove("open");
});

// SUGGESTION BUTTONS
document.querySelectorAll(".suggestion").forEach(button => {
  button.addEventListener("click", () => {
    input.value = button.dataset.prompt;
    input.focus();
    sendMessage();
  });
});

// ATTACH FILE
document.getElementById("attachBtn").addEventListener("click", () => {
  document.getElementById("fileInput").click();
});

document.getElementById("fileInput").addEventListener("change", event => {
  const file = event.target.files[0];

  if (file) {
    input.value = "Attached: " + file.name + "\n";
    input.focus();
  }
});
