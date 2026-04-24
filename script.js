// HUBBE Web App Logic

const mockUsers = [
  {
    id: 1,
    name: "Ana Silva",
    age: 24,
    photo: "👩‍🦰",
    bio: "Amante de café ☕",
    mode: "active"
  },
  {
    id: 2,
    name: "João Santos",
    age: 27,
    photo: "👨",
    bio: "Futebol e música 🎸",
    mode: "view"
  },
  {
    id: 3,
    name: "Maria Oliveira",
    age: 22,
    photo: "👩",
    bio: "Viagens e livros 📚",
    mode: "active"
  },
  {
    id: 4,
    name: "Roro",
    age: 24,
    photo: "👩‍🦰",
    bio: "Amante de café ☕",
    mode: "active"
  },
  {
    id: 5,
    name: "Claudia Silva",
    age: 24,
    photo: "👩‍🦰",
    bio: "Amante de café ☕",
    mode: "active"
  },
  {
    id: 6,
    name: "Rosana Silva",
    age: 24,
    photo: "👩‍🦰",
    bio: "Amante de café ☕",
    mode: "active"
  },
  {
    id: 7,
    name: "Pedro Costa",
    age: 29,
    photo: "🧔",
    bio: "Tech enthusiast 💻",
    mode: "view"
  },
  {
    id: 8,
    name: "Laura Mendes",
    age: 25,
    photo: "👩‍🦳",
    bio: "Dança e yoga 🧘",
    mode: "active"
  }
];

let currentUser = {
  name: "Você",
  matches: [],
  likesSent: [],
  chatSentCount: {},
  activeChatId: null,
  mode: "active",
  muralPostsCount: 0
};

let cameraStream = null;
let selfieTaken = false;
let selfieImage = "";
let chats = {};
let muralPosts = [];

const SUPABASE_URL = "https://ituyoyzxmdphlmcrsszm.supabase.co";
const SUPABASE_KEY = "sb_publishable_HVrQzmFFniCCSXC5QZ5fhA_ky3EgV2E";
const supabaseClient = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

const muralPostLimit = 5;
const chatMessageLimit = 5;
const quickChatMessages = [
  "Oi, tudo bem? 😊",
  "Te achei interessante!",
  "Curtindo a noite? 🎶",
  "Vamos conversar?",
  "Adorei sua foto! 📸",
  "Qual seu drink favorito? 🥃",
  "Posso te mandar um drink?",
  "Vamos dançar? 💃🕺"
];

let activeTab = 0;

const navTabs = [
  "discover-view",
  "chat-view",
  "mural-view",
  "profile-view"
];

document.addEventListener("DOMContentLoaded", init);

// ================= INIT =================

function init() {
  loadData();
  setupOnboarding();

  const navItems = document.querySelectorAll(".nav-item");

  navItems.forEach((item, index) => {
    item.addEventListener("click", () => setActiveTab(index));
  });

  if (hasCompleteProfile()) {
    selfieTaken = true;

    if (!currentUser.mode) {
      showModeSelection();
    } else {
      const nav = document.getElementById("bottom-nav");
      if (nav) nav.classList.remove("hidden");
      setActiveTab(0);
    }
  }

  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }
}

// ================= VIEWS =================

function setActiveTab(index) {
  activeTab = index;

  document.querySelectorAll(".nav-item").forEach((item, i) => {
    item.classList.toggle("active", i === index);
  });

  showView(navTabs[index]);

  if (index === 3) updateProfile();
}

function showView(viewId) {
  const views = [
    "landing-view",
    "mode-selection-view",
    "discover-view",
    "chat-view",
    "mural-view",
    "profile-view"
  ];

  views.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add("hidden");
  });

  const target = document.getElementById(viewId);
  if (target) target.classList.remove("hidden");

  if (viewId === "discover-view") renderUsers();
  if (viewId === "chat-view") renderChats();
  if (viewId === "mural-view") renderMural();
  if (viewId === "profile-view") updateProfile();

  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }
}

// ================= ONBOARDING =================

function setupOnboarding() {
  const selfieBtn = document.getElementById("selfie-btn");
  const retakeBtn = document.getElementById("retake-btn");
  const confirmSelfieBtn = document.getElementById("confirm-selfie-btn");
  const continueBtn = document.getElementById("continue-btn");
  const bioInput = document.getElementById("user-bio");
  const nameInput = document.getElementById("user-name");
  const ageInput = document.getElementById("user-age");

  if (selfieBtn) selfieBtn.addEventListener("click", handleSelfieButton);
  if (retakeBtn) retakeBtn.addEventListener("click", retakeSelfie);
  if (confirmSelfieBtn) confirmSelfieBtn.addEventListener("click", confirmSelfie);

  [nameInput, ageInput, bioInput].forEach(input => {
    if (input) input.addEventListener("input", validateForm);
  });

  if (bioInput) {
    bioInput.addEventListener("input", () => {
      const counter = document.getElementById("bio-counter");
      if (counter) counter.textContent = bioInput.value.length + "/50";
    });
  }

  if (continueBtn) continueBtn.addEventListener("click", completeOnboarding);
}

async function handleSelfieButton() {
  const video = document.getElementById("camera-video");

  if (video.classList.contains("hidden")) {
    await openCamera();
  } else {
    captureSelfie();
  }
}

async function openCamera() {
  try {
    const video = document.getElementById("camera-video");
    const preview = document.getElementById("selfie-preview");
    const placeholder = document.querySelector(".camera-placeholder");
    const btn = document.getElementById("selfie-btn");
    const actions = document.getElementById("selfie-actions");

    if (!cameraStream) {
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" }
      });
    }

    video.srcObject = cameraStream;

    preview.classList.add("hidden");
    video.classList.remove("hidden");
    if (placeholder) placeholder.classList.add("hidden");
    if (actions) actions.classList.add("hidden");

    btn.classList.remove("hidden");
    btn.innerHTML = '<i data-lucide="camera"></i> Tirar foto';

    if (typeof lucide !== "undefined") {
      lucide.createIcons();
    }
  } catch (error) {
    alert("Erro ao abrir câmera.");
    console.error(error);
  }
}

function captureSelfie() {
  const video = document.getElementById("camera-video");
  const canvas = document.getElementById("camera-canvas");
  const preview = document.getElementById("selfie-preview");
  const btn = document.getElementById("selfie-btn");
  const actions = document.getElementById("selfie-actions");

  if (!video.videoWidth || !video.videoHeight) {
    alert("A câmera ainda não carregou. Tente novamente.");
    return;
  }

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext("2d");

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  selfieImage = canvas.toDataURL("image/jpeg", 0.9);

  preview.src = selfieImage;
  preview.classList.remove("hidden");
  video.classList.add("hidden");

  btn.classList.add("hidden");
  if (actions) actions.classList.remove("hidden");
}

function retakeSelfie() {
  const video = document.getElementById("camera-video");
  const preview = document.getElementById("selfie-preview");
  const btn = document.getElementById("selfie-btn");
  const actions = document.getElementById("selfie-actions");

  preview.classList.add("hidden");
  video.classList.remove("hidden");

  if (actions) actions.classList.add("hidden");
  btn.classList.remove("hidden");
  btn.innerHTML = '<i data-lucide="camera"></i> Tirar foto';

  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }
}

function confirmSelfie() {
  const actions = document.getElementById("selfie-actions");
  const btn = document.getElementById("selfie-btn");

  if (!selfieImage) {
    alert("Nenhuma selfie foi tirada.");
    return;
  }

  selfieTaken = true;
  localStorage.setItem("hubbe_selfie", selfieImage);

  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }

  if (actions) actions.classList.add("hidden");
  btn.classList.remove("hidden");
  btn.innerHTML = '<i data-lucide="camera"></i> Nova Selfie';

  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }

  validateForm();
}

function validateForm() {
  const name = document.getElementById("user-name")?.value.trim();
  const age = parseInt(document.getElementById("user-age")?.value);
  const bio = document.getElementById("user-bio")?.value.trim();

  const warning = document.getElementById("age-warning");
  const continueBtn = document.getElementById("continue-btn");

  if (age && age < 18) {
    warning?.classList.remove("hidden");
  } else {
    warning?.classList.add("hidden");
  }

  const valid = name && age >= 18 && bio && selfieTaken;

  if (continueBtn) continueBtn.disabled = !valid;
}

function completeOnboarding() {
  currentUser = {
    ...currentUser,
    name: document.getElementById("user-name").value.trim(),
    age: parseInt(document.getElementById("user-age").value),
    bio: document.getElementById("user-bio").value.trim(),
    selfie: document.getElementById("selfie-preview").src,
    matches: currentUser.matches || [],
    likesSent: currentUser.likesSent || [],
    chatSentCount: currentUser.chatSentCount || {},
    activeChatId: currentUser.activeChatId || null,
    mode: "",
    muralPostsCount: currentUser.muralPostsCount || 0
  };

  saveData();

  const intro = document.getElementById("intro-screen");
  if (intro) intro.classList.remove("hidden");

  setTimeout(() => {
    if (intro) intro.classList.add("hidden");
    showModeSelection();
  }, 2200);
}

function showModeSelection() {
  const nav = document.getElementById("bottom-nav");
  if (nav) nav.classList.add("hidden");

  showView("mode-selection-view");
}

function selectUsageMode(mode) {
  currentUser.mode = mode;
  saveData();

  const nav = document.getElementById("bottom-nav");
  if (nav) nav.classList.remove("hidden");

  setActiveTab(0);
}

function hasCompleteProfile() {
  return (
    currentUser.name &&
    currentUser.age &&
    currentUser.bio &&
    currentUser.selfie
  );
}

// ================= USERS =================

function getBeerIconMarkup(isActive, isDisabled = false) {
  const fillOpacity = isActive ? "1" : "0";
  const strokeOpacity = isDisabled ? "0.28" : "1";

  return `
    <svg class="beer-svg" width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M9 6h3a5 5 0 0 1 5 5v3a4 4 0 0 1-4 4H9z"
        fill="rgba(255, 212, 59, ${fillOpacity})"
        stroke="none"
      ></path>

      <path
        d="M6 5h10v11a4 4 0 0 1-4 4h-2a4 4 0 0 1-4-4V5Z"
        fill="none"
        stroke="rgba(255,255,255,${strokeOpacity})"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      ></path>

      <path
        d="M16 8h1.5a2.5 2.5 0 0 1 0 5H16"
        fill="none"
        stroke="rgba(255,255,255,${strokeOpacity})"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      ></path>

      <path
        d="M8 9h6"
        fill="none"
        stroke="rgba(255,255,255,${strokeOpacity})"
        stroke-width="1.6"
        stroke-linecap="round"
      ></path>

      <path
        d="M8.8 12h5.2"
        fill="none"
        stroke="rgba(255,255,255,${strokeOpacity})"
        stroke-width="1.6"
        stroke-linecap="round"
      ></path>
    </svg>
  `;
}

function renderUsers() {
  const container = document.getElementById("users-list");
  const countEl = document.getElementById("discover-count");

  if (!container) return;

  if (countEl) {
    const total = mockUsers.length;
    countEl.textContent = total === 1 ? "1 pessoa" : `${total} pessoas`;
  }

  container.innerHTML = `
    <div class="people-grid">
      ${mockUsers.map(user => {
        const alreadyLiked = (currentUser.likesSent || []).includes(user.id);

        return `
          <div class="people-card fade-in">
            <div class="people-photo">
              <div class="online-dot ${user.mode === "active" ? "dot-green" : "dot-yellow"}"></div>
              <div class="people-img">${user.photo}</div>
            </div>

            <div class="people-content">
              <h3>${user.name}</h3>
              <p class="people-bio">"${user.bio}"</p>

              <div class="people-actions">
                ${
                  currentUser.mode === "view"
                    ? `
                      <button class="chopp-btn disabled-btn" disabled>
                        <span class="beer-icon-wrap">
                          <span class="beer-bg"></span>
                          <i data-lucide="beer" class="beer-icon"></i>
                        </span>
                      </button>
                    `
                    : `
                      <button 
                        class="chopp-btn ${alreadyLiked ? "active" : ""}" 
                        onclick="toggleChoppLike(${user.id})"
                        aria-label="Dar chopp para ${user.name}"
                        title="Dar chopp"
                      >
                        <span class="beer-icon-wrap">
                          <span class="beer-bg"></span>
                          <i data-lucide="beer" class="beer-icon"></i>
                        </span>
                      </button>
                    `
                }
              </div>
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;

  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }
}

function toggleChoppLike(id) {
  if (currentUser.mode === "view") {
    alert("No modo Só observando você não pode interagir.");
    return;
  }

  if (!currentUser.likesSent) currentUser.likesSent = [];
  if (!currentUser.chatSentCount) currentUser.chatSentCount = {};

  const user = mockUsers.find(u => u.id === id);
  if (!user) return;

  const alreadyLiked = currentUser.likesSent.includes(id);

  // remover chopp
  if (alreadyLiked) {
    currentUser.likesSent = currentUser.likesSent.filter(userId => userId !== id);

    // se quiser remover o chat quando tirar o like, descomente:
    // currentUser.matches = currentUser.matches.filter(match => match.id !== id);
    // delete chats[id];
    // delete currentUser.chatSentCount[id];

    saveData();
    renderUsers();
    renderChats();
    return;
  }

  // enviar chopp
  currentUser.likesSent.push(id);

  // simulação local: chat só nasce se houver reciprocidade
  const theyAlsoLiked = Math.random() > 0.5;

  if (theyAlsoLiked) {
    const alreadyMatched = currentUser.matches.some(match => match.id === user.id);

    if (!alreadyMatched) {
      currentUser.matches.push(user);
    }

    if (!chats[user.id]) {
      chats[user.id] = [
        {
          from: user.name,
          text: "Oi, tudo bem? 😊",
          mine: false
        }
      ];
    }

    if (!currentUser.chatSentCount[user.id]) {
      currentUser.chatSentCount[user.id] = 0;
    }
  }

  saveData();
  renderUsers();
  renderChats();
}

// ================= CHAT =================

function renderChats() {
  const listScreen = document.getElementById("chat-list-screen");
  const roomScreen = document.getElementById("chat-room-screen");
  const listEl = document.getElementById("chat-list");

  if (!listScreen || !roomScreen || !listEl) return;

  if (currentUser.activeChatId) {
    listScreen.classList.add("hidden");
    roomScreen.classList.remove("hidden");
    renderActiveChat();
    return;
  }

  listScreen.classList.remove("hidden");
  roomScreen.classList.add("hidden");

  if (!currentUser.matches || currentUser.matches.length === 0) {
    listEl.innerHTML = `
      <div class="chat-empty">
        Nenhum chat liberado ainda. O chat só aparece quando o chopp é recíproco 🍻
      </div>
    `;

    if (typeof lucide !== "undefined") {
      lucide.createIcons();
    }
    return;
  }

  listEl.innerHTML = currentUser.matches.map(user => {
    const userMessages = chats[user.id] || [];
    const lastMessage = userMessages.length
      ? userMessages[userMessages.length - 1].text
      : user.bio || "Novo match";

    const avatarSrc = user.photo && user.photo.startsWith("data:")
      ? user.photo
      : (user.photoUrl || "");

    return `
      <div class="chat-card" onclick="openChat(${user.id})">
        <div class="chat-card-avatar-wrap">
          ${
            avatarSrc
              ? `<img class="chat-card-avatar" src="${avatarSrc}" alt="${user.name}">`
              : `<div class="chat-card-avatar people-img">${user.photo}</div>`
          }
          <div class="chat-card-status ${user.mode === "active" ? "active" : "view"}"></div>
        </div>

        <div class="chat-card-main">
          <div class="chat-card-name">${user.name}</div>
          <div class="chat-card-preview">"${lastMessage}"</div>
        </div>

        <div class="chat-card-icon">
          <i data-lucide="message-circle"></i>
        </div>
      </div>
    `;
  }).join("");

  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }
}

function openChat(userId) {
  currentUser.activeChatId = userId;
  saveData();
  renderChats();
}

function backToChatList() {
  currentUser.activeChatId = null;
  saveData();
  renderChats();
}

function getActiveChatUser() {
  return currentUser.matches.find(user => user.id === currentUser.activeChatId);
}

function getRemainingChatMessages(userId) {
  const used = currentUser.chatSentCount?.[userId] || 0;
  return chatMessageLimit - used;
}

function updateChatRemainingText(userId) {
  const remainingText = document.getElementById("chat-remaining-text");
  const input = document.getElementById("chat-input");
  const sendBtn = document.getElementById("chat-send-btn");
  const quickContainer = document.getElementById("chat-quick-messages");

  if (!remainingText || !input || !sendBtn || !quickContainer) return;

  const remaining = getRemainingChatMessages(userId);
  const blocked = remaining <= 0;

  input.disabled = blocked;
  sendBtn.disabled = blocked;

  if (remaining > 1) {
    remainingText.textContent = `${remaining} mensagens restantes`;
  } else if (remaining === 1) {
    remainingText.textContent = "Essa é a sua última mensagem";
  } else {
    remainingText.textContent = "Você atingiu o limite de mensagens nesse chat";
  }

  quickContainer.querySelectorAll(".chat-quick-btn").forEach(btn => {
    btn.disabled = blocked;
  });
}

function renderQuickChatMessages(userId) {
  const container = document.getElementById("chat-quick-messages");
  if (!container) return;

  container.innerHTML = quickChatMessages.map(msg => `
    <button class="chat-quick-btn" onclick="sendQuickChatMessage(${userId}, ${JSON.stringify(msg)})">
      ${msg}
    </button>
  `).join("");
}

function renderActiveChat() {
  const user = getActiveChatUser();
  if (!user) {
    backToChatList();
    return;
  }

  const avatar = document.getElementById("chat-room-avatar");
  const name = document.getElementById("chat-room-name");
  const messagesEl = document.getElementById("chat-messages");
  const input = document.getElementById("chat-input");

  const avatarSrc = user.photo && user.photo.startsWith("data:")
    ? user.photo
    : (user.photoUrl || "");

  if (avatar) {
    if (avatarSrc) {
      avatar.src = avatarSrc;
    } else {
      avatar.src = "";
    }
  }

  if (name) name.textContent = user.name;

  if (!chats[user.id]) chats[user.id] = [];
  if (!currentUser.chatSentCount[user.id]) currentUser.chatSentCount[user.id] = 0;

  messagesEl.innerHTML = chats[user.id].length
    ? chats[user.id].map(msg => `
        <div class="chat-bubble-row ${msg.mine ? "mine" : "theirs"}">
          <div class="chat-bubble ${msg.mine ? "mine" : "theirs"}">${msg.text}</div>
        </div>
      `).join("")
    : `
      <div class="chat-bubble-row theirs">
        <div class="chat-bubble theirs">Oi, tudo bem? 😊</div>
      </div>
    `;

  renderQuickChatMessages(user.id);
  updateChatRemainingText(user.id);

  if (input) {
    input.value = "";
    input.onkeypress = e => {
      if (e.key === "Enter") {
        sendTypedChatMessage();
      }
    };
  }

  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }
}

function sendQuickChatMessage(userId, text) {
  const remaining = getRemainingChatMessages(userId);
  if (remaining <= 0) return;

  if (!chats[userId]) chats[userId] = [];

  chats[userId].push({
    from: currentUser.name,
    text,
    mine: true
  });

  currentUser.chatSentCount[userId] = (currentUser.chatSentCount[userId] || 0) + 1;

  saveData();
  renderActiveChat();
}

function sendTypedChatMessage() {
  const user = getActiveChatUser();
  if (!user) return;

  const input = document.getElementById("chat-input");
  if (!input) return;

  const text = input.value.trim();
  const remaining = getRemainingChatMessages(user.id);

  if (!text || remaining <= 0) return;

  if (!chats[user.id]) chats[user.id] = [];

  chats[user.id].push({
    from: currentUser.name,
    text,
    mine: true
  });

  currentUser.chatSentCount[user.id] = (currentUser.chatSentCount[user.id] || 0) + 1;

  input.value = "";
  saveData();
  renderActiveChat();
}
// ================= PROFILE =================

function updateProfile() {
  const name = document.getElementById("profile-name");
  const age = document.getElementById("profile-age");
  const bio = document.getElementById("profile-bio");
  const matchCount = document.getElementById("match-count");
  const photo = document.getElementById("profile-photo");

  if (name) name.textContent = currentUser.name;
  if (age) age.textContent = currentUser.age + " anos";
  if (bio) bio.textContent = currentUser.bio;
  if (matchCount) matchCount.textContent = currentUser.matches.length;
  if (photo) photo.src = currentUser.selfie || "";

  setMode(currentUser.mode || "active");
}

function setMode(mode) {
  currentUser.mode = mode;
  saveData();

  const card = document.getElementById("mode-toggle");
  const title = document.getElementById("mode-title-text");
  const desc = document.getElementById("mode-desc-text");
  const dot = document.getElementById("mode-dot");

  if (card) {
    card.classList.remove("active-green", "active-yellow");
    card.style.borderColor = "";
    card.style.boxShadow = "";
  }

  if (dot) {
    dot.className = "";
    dot.id = "mode-dot";
    dot.style.background = "";
  }

  if (mode === "active") {
    if (card) {
      card.classList.add("active-green");
    }
    if (title) {
      title.textContent = "Novas conexões";
      title.style.color = "var(--green)";
    }
    if (desc) desc.textContent = "Interaja, curta, troque mensagens.";
    if (dot) {
      dot.classList.add("dot-active");
    }
  } else {
    if (card) {
      card.classList.add("active-yellow");
    }
    if (title) {
      title.textContent = "Só observando";
      title.style.color = "var(--yellow)";
    }
    if (desc) desc.textContent = "Apenas visualizar perfis e mural.";
    if (dot) {
      dot.classList.add("dot-yellow");
    }
  }

  renderUsers();
  renderMural();
}

function toggleMode() {
  if (currentUser.mode === "active") {
    setMode("view");
  } else {
    setMode("active");
  }

  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }
}

// ================= MURAL =================

function getRemainingMuralPosts() {
  const used = currentUser.muralPostsCount || 0;
  return muralPostLimit - used;
}

function updateMuralLimitText() {
  const remaining = getRemainingMuralPosts();
  const limitText = document.getElementById("mural-limit-text");
  const postBtn = document.getElementById("mural-post-btn");
  const input = document.getElementById("mural-input");

  if (!limitText || !postBtn || !input) return;

  if (currentUser.mode === "view") {
    limitText.textContent = "Modo Só observando: publicação indisponível";
    postBtn.disabled = true;
    input.disabled = true;
    return;
  }

  input.disabled = remaining <= 0;
  postBtn.disabled = remaining <= 0;

  if (remaining > 1) {
    limitText.textContent = `${remaining} mensagens restantes`;
  } else if (remaining === 1) {
    limitText.textContent = "Essa é a sua última mensagem";
  } else {
    limitText.textContent = "Você atingiu o limite de publicações no mural";
  }
}

function fillSuggestion(text) {
  const input = document.getElementById("mural-input");
  if (!input || input.disabled) return;
  input.value = text;
  input.focus();
}

function publishPost() {
  if (currentUser.mode === "view") {
    alert("No modo Só observando você não pode publicar no mural.");
    return;
  }

  const remaining = getRemainingMuralPosts();
  if (remaining <= 0) {
    alert("Você atingiu o limite de 5 mensagens no mural.");
    return;
  }

  const input = document.getElementById("mural-input");
  if (!input) return;

  const text = input.value.trim();
  if (!text) return;

  const newPost = {
    id: Date.now(),
    author: currentUser.name,
    authorPhoto: currentUser.selfie || "",
    text,
    time: new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    }),
    replies: []
  };

  muralPosts.unshift(newPost);
  currentUser.muralPostsCount = (currentUser.muralPostsCount || 0) + 1;

  input.value = "";
  saveData();
  renderMural();
}

function toggleReplyBox(postId) {
  const box = document.getElementById(`reply-box-${postId}`);
  if (!box) return;
  box.classList.toggle("hidden");
}

function sendReply(postId) {
  if (currentUser.mode === "view") {
    alert("No modo Só observando você só pode visualizar o mural.");
    return;
  }

  const input = document.getElementById(`reply-input-${postId}`);
  if (!input) return;

  const text = input.value.trim();
  if (!text) return;

  const post = muralPosts.find(p => p.id === postId);
  if (!post) return;

  post.replies.push({
    id: Date.now(),
    author: currentUser.name,
    text
  });

  input.value = "";
  saveData();
  renderMural();
}

function renderMural() {
  const compose = document.getElementById("mural-compose");
  const blocked = document.getElementById("mural-blocked");
  const list = document.getElementById("mural-list");

  if (!list) return;

  if (currentUser.mode === "view") {
    compose?.classList.add("hidden");
    blocked?.classList.remove("hidden");
  } else {
    compose?.classList.remove("hidden");
    blocked?.classList.add("hidden");
  }

  updateMuralLimitText();

  if (muralPosts.length === 0) {
    list.innerHTML = `
      <div class="mural-post">
        <div class="mural-post-text">O mural tá quietinho. Solta o verbo.</div>
      </div>
    `;
    return;
  }

  list.innerHTML = muralPosts.map(post => `
    <div class="mural-post">
      <div class="mural-post-header">
        <img class="mural-avatar" src="${post.authorPhoto || ""}" alt="Foto">
        <div>
          <div class="mural-post-name">${post.author}</div>
          <div class="mural-post-time">${post.time}</div>
        </div>
      </div>

      <div class="mural-post-text">${post.text}</div>

      <button class="reply-btn" onclick="toggleReplyBox(${post.id})">Responder</button>

      <div id="reply-box-${post.id}" class="reply-box hidden">
        <input
          id="reply-input-${post.id}"
          class="reply-input"
          type="text"
          placeholder="Escreva uma resposta..."
          maxlength="120"
        >
        <div class="reply-actions">
          <button class="reply-send" onclick="sendReply(${post.id})">Enviar</button>
        </div>
      </div>

      <div class="reply-list">
        ${post.replies.map(reply => `
          <div class="reply-item">
            <div class="reply-name">${reply.author}</div>
            <div class="reply-text">${reply.text}</div>
          </div>
        `).join("")}
      </div>
    </div>
  `).join("");
}

// ================= STORAGE =================

function saveData() {
  localStorage.setItem("hubbeUser", JSON.stringify(currentUser));
  localStorage.setItem("hubbeChats", JSON.stringify(chats));
  localStorage.setItem("hubbeMuralPosts", JSON.stringify(muralPosts));
}

function loadData() {
  const user = localStorage.getItem("hubbeUser");
  const savedChats = localStorage.getItem("hubbeChats");
  const savedPosts = localStorage.getItem("hubbeMuralPosts");

  if (user) currentUser = JSON.parse(user);
  if (savedChats) chats = JSON.parse(savedChats);
  if (savedPosts) muralPosts = JSON.parse(savedPosts);
}

// ================= AUX =================

function goBack() {
  setActiveTab(0);
}
