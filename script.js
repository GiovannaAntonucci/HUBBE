const mockUsers = [
  {
    id: 1,
    name: "João Santos",
    age: 27,
    photo: "👨",
    bio: "Futebol e música 🎸",
    mode: "view"
  },
  {
    id: 2,
    name: "Pedro Costa",
    age: 29,
    photo: "🧔",
    bio: "Tech enthusiast 💻",
    mode: "view"
  },
  {
    id: 3,
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
  async function setUserOnline() {
    if (!supabaseClient || !currentUser.id) return;
    await supabaseClient
      .from("users")
      .update({
        is_online: true,
        last_seen: new Date().toISOString()
      })
      .eq("id", currentUser.id);
  }
  async function setUserOffline() {
    if (!supabaseClient || !currentUser.id) return;
    await supabaseClient
      .from("users")
      .update({
        is_online: false,
        last_seen: new Date().toISOString()
      })
      .eq("id", currentUser.id);
  }
  let realUsers = [];
  let realMatches = [];
  let activeMatch = null;

  let unreadChatUsers = new Set(
    JSON.parse(localStorage.getItem("hubbeUnreadChatUsers") || "[]")
  );
  
  let chatPreviewMap = JSON.parse(
    localStorage.getItem("hubbeChatPreviewMap") || "{}"
  );
  
  function saveChatStatus() {
    localStorage.setItem(
      "hubbeUnreadChatUsers",
      JSON.stringify([...unreadChatUsers])
    );
  
    localStorage.setItem(
      "hubbeChatPreviewMap",
      JSON.stringify(chatPreviewMap)
    );
  }
  
  function markChatUnread(userId, previewText) {
    unreadChatUsers.add(userId);
    chatPreviewMap[userId] = previewText;
    saveChatStatus();
    showChatBadge();
    renderChats();
  }
  
  function clearChatUnread(userId) {
    unreadChatUsers.delete(userId);
  
    if (chatPreviewMap[userId] === '"Novo brinde 🍻"') {
      chatPreviewMap[userId] = "Conversa liberada";
    }
  
    saveChatStatus();
  }

  function ensureCurrentUserId() {
    let savedId = localStorage.getItem("hubbeUserId");
    if (!savedId) {
      savedId = crypto.randomUUID();
      localStorage.setItem("hubbeUserId", savedId);
    }
    currentUser.id = savedId;
  }
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

let faceModelReady = false;

async function loadFaceDetection() {
  try {
    if (typeof faceapi === "undefined") {
      console.error("face-api não carregou.");
      faceModelReady = false;
      return;
    }

    const MODEL_URL = "https://justadudewhohacks.github.io/face-api.js/models";

    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);

    faceModelReady = true;
    console.log("Detector de rosto carregado com sucesso.");
  } catch (error) {
    faceModelReady = false;
    console.error("Erro ao carregar detector de rosto:", error);
  }
}

// ================= INIT =================

async function init() {
  // 🔍 AGORA ESPERA carregar
  await loadFaceDetection();

  loadData();
  ensureCurrentUserId();
  requestBrowserNotificationPermission();
  listenToMyNotifications();
  listenUsersRealtime();
  setUserOnline();

  setInterval(setUserOnline, 30000);

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

  setupHorizontalFade("mural-suggestions");
}

// ================= VIEWS =================
function setActiveTab(index) {
  activeTab = index;

  if (index === 1) hideChatBadge();
  if (index === 2) hideMuralBadge();

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
  validateSelfieAutomatically();
  preview.classList.remove("hidden");
  video.classList.add("hidden");
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

async function validateSelfieAutomatically() {
  const btn = document.getElementById("selfie-btn");

  if (!selfieImage) return;

  // mostra loading no botão
  btn.disabled = true;
  btn.textContent = "Verificando rosto...";

  const faceDetected = await hasFace(selfieImage);

  if (!faceDetected) {
    alert("Nenhum rosto detectado. Tente novamente.");

    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="camera"></i> Tirar foto';

    if (typeof lucide !== "undefined") lucide.createIcons();

    return;
  }

  // sucesso
  selfieTaken = true;
  localStorage.setItem("hubbe_selfie", selfieImage);

  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }

  btn.disabled = false;
  btn.innerHTML = '<i data-lucide="camera"></i> Tirar outra';

  if (typeof lucide !== "undefined") lucide.createIcons();

  validateForm();
}

async function confirmSelfie() {
  const actions = document.getElementById("selfie-actions");
  const btn = document.getElementById("selfie-btn");
  const confirmBtn = document.getElementById("confirm-selfie-btn");

  if (!selfieImage) {
    alert("Nenhuma selfie foi tirada.");
    return;
  }

  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.textContent = "Verificando rosto...";
  }

  const faceDetected = await hasFace(selfieImage);

  if (!faceDetected) {
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.textContent = "Ficou boa";
    }

    alert("Nenhum rosto detectado. Tire uma selfie válida.");
    return;
  }

  selfieTaken = true;
  localStorage.setItem("hubbe_selfie", selfieImage);

  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }

  if (actions) actions.classList.add("hidden");

  if (btn) {
    btn.classList.remove("hidden");
    btn.innerHTML = '<i data-lucide="camera"></i> Nova Selfie';
  }

  if (confirmBtn) {
    confirmBtn.disabled = false;
    confirmBtn.textContent = "Ficou boa";
  }

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
async function completeOnboarding() {
  ensureCurrentUserId();
  currentUser = {
    ...currentUser,
    id: currentUser.id,
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
  if (supabaseClient) {
    await supabaseClient.from("users").upsert({
      id: currentUser.id,
      name: currentUser.name,
      age: currentUser.age,
      bio: currentUser.bio,
      photo: currentUser.selfie,
      mode: "active"
    });
  }
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
async function selectUsageMode(mode) {
  currentUser.mode = mode;
  saveData();
  if (supabaseClient) {
    await supabaseClient
      .from("users")
      .update({ mode })
      .eq("id", currentUser.id);
  }
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
async function loadRealUsers() {
  if (!supabaseClient) return;
  const { data, error } = await supabaseClient
    .from("users")
    .select("*")
    .neq("id", currentUser.id)
    .eq("is_online", true);
  if (error) {
    console.error("Erro ao carregar usuários:", error);
    realUsers = [];
    return;
  }
  realUsers = data || [];
}
async function renderUsers() {
  const container = document.getElementById("users-list");
  const countEl = document.getElementById("discover-count");
  if (!container) return;
  await loadRealUsers();
  const matchedUserIds = await getMatchedUserIds();
  const usersToShow = realUsers.filter(user => user.id !== currentUser.id);
  if (countEl) {
    const total = usersToShow.length + 1; // +1 = você
    countEl.textContent = total === 1 
      ? "1 pessoa" 
      : `${total} pessoas`;
  }
  container.innerHTML = `
    <div class="people-grid">
      ${usersToShow.map(user => {
        const alreadyLiked = (currentUser.likesSent || []).includes(user.id);
        const alreadyMatched = matchedUserIds.has(user.id);
        return `
          <div class="people-card fade-in">
            <div class="people-photo">
              ${
                user.photo
                  ? `<img class="people-photo-img" src="${user.photo}" alt="${user.name}" onclick="openImageModal('${user.photo}')">`
                  : `<div class="people-img">👤</div>`
              }
              <span class="online-dot ${user.mode === "active" ? "dot-green" : "dot-yellow"}"></span>
            </div>
            <div class="people-content">
              <h3>${user.name}</h3>
              <p class="people-bio">"${user.bio || ""}"</p>
              <div class="people-actions">
                <div class="left-actions">
                  ${
                    alreadyMatched
                      ? `
                        <button 
                          class="user-chat-btn" 
                          onclick="openChatWithUser('${user.id}')"
                          title="Abrir chat">
                          <i data-lucide="message-circle"></i>
                        </button>`
                      : ""
                  }
                </div>
                <div class="right-actions">
                  ${
                    currentUser.mode === "view"
                      ? `
                        <button class="chopp-btn disabled-btn" disabled title="Só observando">
                          <span class="beer-icon-wrap">
                            <span class="beer-bg"></span>
                            <i data-lucide="beer" class="beer-icon"></i>
                          </span>
                        </button>
                      `
                      : `
                        <button 
                          class="chopp-btn ${alreadyLiked ? "active" : ""}" 
                          onclick="toggleChoppLike('${user.id}')"
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
          </div>
        `;
      }).join("")}
    </div>
  `;
  if (window.lucide) lucide.createIcons();
}
async function toggleChoppLike(toUserId) {
  if (currentUser.mode === "view") {
    alert("No modo Só observando você não pode interagir.");
    return;
  }
  if (!supabaseClient) {
    alert("Supabase não conectado.");
    return;
  }
  const fromUserId = currentUser.id;
  if (!fromUserId || !toUserId) return;
  if (!currentUser.likesSent) currentUser.likesSent = [];
  const alreadyLiked = currentUser.likesSent.includes(toUserId);
  if (alreadyLiked) {
    await supabaseClient
      .from("likes")
      .delete()
      .eq("from_user", fromUserId)
      .eq("to_user", toUserId);
    currentUser.likesSent = currentUser.likesSent.filter(id => id !== toUserId);
    saveData();
    renderUsers();
    return;
  }
  await supabaseClient.from("likes").insert({
    from_user: fromUserId,
    to_user: toUserId
  });
  currentUser.likesSent.push(toUserId);
  const { data: reverseLike } = await supabaseClient
    .from("likes")
    .select("*")
    .eq("from_user", toUserId)
    .eq("to_user", fromUserId);
  if (reverseLike && reverseLike.length > 0) {
    const { data: existingMatch } = await supabaseClient
      .from("matches")
      .select("*")
      .or(`and(user1.eq.${fromUserId},user2.eq.${toUserId}),and(user1.eq.${toUserId},user2.eq.${fromUserId})`);
    if (!existingMatch || existingMatch.length === 0) {
      await supabaseClient.from("matches").insert({
        user1: fromUserId,
        user2: toUserId
      });
      const user = realUsers.find(u => u.id === toUserId);
      // 🔔 cria notificação para o OUTRO usuário
      await createNotification(
        toUserId,
        currentUser.id,
        "brinde",
        "Novo brinde 🍻",
        `Você e ${currentUser.name} deram um brinde 🍻`
      );
      // 🔔 mostra pra você (app)
      showAppNotification(`Você e ${user?.name || "alguém"} deram um brinde 🍻`);
      // 🔔 notificação real (opcional aqui também)
      showBrowserNotification(
        "Novo brinde 🍻",
        `Você e ${user?.name || "alguém"} deram um brinde 🍻`
      );
    }
  }
  saveData();
  renderUsers();
  renderChats();
}
// ================= CHAT =================
async function loadRealMatches() {
  if (!supabaseClient || !currentUser.id) return [];
  const { data: matchesData, error } = await supabaseClient
    .from("matches")
    .select("*")
    .or(`user1.eq.${currentUser.id},user2.eq.${currentUser.id}`);
  if (error) {
    console.error("Erro ao carregar matches:", error);
    return [];
  }
  const enrichedMatches = [];
  for (const match of matchesData || []) {
    const otherUserId = match.user1 === currentUser.id ? match.user2 : match.user1;
    const { data: userData, error: userError } = await supabaseClient
      .from("users")
      .select("*")
      .eq("id", otherUserId)
      .single();
    if (!userError && userData) {
      enrichedMatches.push({
        ...match,
        otherUser: userData
      });
    }
  }
  realMatches = enrichedMatches;
  return enrichedMatches;
}

async function renderChats() {
  const listScreen = document.getElementById("chat-list-screen");
  const roomScreen = document.getElementById("chat-room-screen");
  const listEl = document.getElementById("chat-list");

  if (!listScreen || !roomScreen || !listEl) return;

  if (currentUser.activeChatId) {
    listScreen.classList.add("hidden");
    roomScreen.classList.remove("hidden");
    await renderActiveChat();
    return;
  }

  listScreen.classList.remove("hidden");
  roomScreen.classList.add("hidden");

  const matches = await loadRealMatches();

  if (!matches || matches.length === 0) {
    listEl.innerHTML = `
      <div class="chat-empty">
        Nenhum chat liberado ainda. O chat só aparece quando o brinde é recíproco 🍻
      </div>
    `;
    if (typeof lucide !== "undefined") lucide.createIcons();
    return;
  }

  listEl.innerHTML = matches.map(match => {
    const user = match.otherUser;
    if (!user) return "";

    const hasUnread = unreadChatUsers.has(user.id);
    const preview = chatPreviewMap[user.id] || "Novo brinde 🍻";

    return `
      <div class="chat-card" onclick="openChat('${match.id}')">
        <div class="chat-card-avatar-wrap">
          ${
            user.photo
              ? `<img class="chat-card-avatar" src="${user.photo}" alt="${user.name}">`
              : `<div class="chat-card-avatar people-img">👤</div>`
          }
          <div class="chat-card-status ${user.mode === "active" ? "active" : "view"}"></div>
        </div>

        <div class="chat-card-main">
          <div class="chat-card-name">${user.name}</div>
          <div class="chat-card-preview">${preview}</div>
        </div>

        <div class="chat-card-icon">
          ${hasUnread ? `<span class="chat-card-badge"></span>` : ""}
          <i data-lucide="message-circle"></i>
        </div>
      </div>
    `;
  }).join("");

  if (typeof lucide !== "undefined") lucide.createIcons();
}

function openChat(matchId) {
  const match = realMatches.find(m => m.id === matchId);

  if (match) {
    const otherUserId =
      match.user1 === currentUser.id ? match.user2 : match.user1;

    clearChatUnread(otherUserId);
  }

  currentUser.activeChatId = matchId;
  saveData();
  hideChatBadge();
  renderChats();
}

function backToChatList() {
  currentUser.activeChatId = null;
  activeMatch = null;
  saveData();
  renderChats();
}

async function getActiveMatch() {
  if (!currentUser.activeChatId) return null;

  if (!realMatches || realMatches.length === 0) {
    await loadRealMatches();
  }

  activeMatch = realMatches.find(match => match.id === currentUser.activeChatId);
  return activeMatch;
}

async function getRemainingChatMessages(matchId) {
  const { data, error } = await supabaseClient
    .from("messages")
    .select("id")
    .eq("match_id", matchId)
    .eq("sender_id", currentUser.id);

  if (error) {
    console.error("Erro ao contar mensagens:", error);
    return 0;
  }

  return chatMessageLimit - (data?.length || 0);
}

async function updateChatRemainingText(matchId) {
  const remainingText = document.getElementById("chat-remaining-text");
  const input = document.getElementById("chat-input");
  const sendBtn = document.getElementById("chat-send-btn");
  const quickContainer = document.getElementById("chat-quick-messages");

  if (!remainingText || !input || !sendBtn || !quickContainer) return;

  const remaining = await getRemainingChatMessages(matchId);
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
function renderQuickChatMessages(matchId) {
  const container = document.getElementById("chat-quick-messages");
  if (!container) return;

  container.innerHTML = `
    <div class="quick-messages-row">
      ${quickChatMessages.map(msg => `
        <button 
          type="button"
          class="chat-quick-btn"
          data-match-id="${matchId}"
          data-message="${msg.replace(/"/g, "&quot;")}"
        >
          ${msg}
        </button>
      `).join("")}
    </div>
  `;

  container.querySelectorAll(".chat-quick-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.matchId;
      const text = btn.dataset.message;
      sendQuickChatMessage(id, text);
    });
  });
}

async function renderActiveChat() {
  const match = await getActiveMatch();

  if (!match) {
    backToChatList();
    return;
  }

  const user = match.otherUser;

  const avatar = document.getElementById("chat-room-avatar");
  const name = document.getElementById("chat-room-name");
  const messagesEl = document.getElementById("chat-messages");
  const input = document.getElementById("chat-input");

  if (avatar) avatar.src = user.photo || "";
  if (name) name.textContent = user.name;

  const { data: messagesData, error } = await supabaseClient
    .from("messages")
    .select("*")
    .eq("match_id", match.id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Erro ao carregar mensagens:", error);
    messagesEl.innerHTML = `<div class="chat-empty">Erro ao carregar mensagens.</div>`;
    return;
  }

  messagesEl.innerHTML = messagesData && messagesData.length
    ? messagesData.map(msg => {
        const mine = msg.sender_id === currentUser.id;

        return `
          <div class="chat-bubble-row ${mine ? "mine" : "theirs"}">
            <div class="chat-bubble ${mine ? "mine" : "theirs"}">${msg.text}</div>
          </div>
        `;
      }).join("")
    : `
      <div class="chat-bubble-row theirs">
        <div class="chat-bubble theirs">Vocês deram um brinde 🍻</div>
      </div>
    `;

  renderQuickChatMessages(match.id);
  await updateChatRemainingText(match.id);

  if (input) {
    input.value = "";
    input.onkeypress = e => {
      if (e.key === "Enter") sendTypedChatMessage();
    };
  }

  if (typeof lucide !== "undefined") lucide.createIcons();
}

async function sendQuickChatMessage(matchId, text) {
  const remaining = await getRemainingChatMessages(matchId);
  if (remaining <= 0) return;

  await supabaseClient.from("messages").insert({
    match_id: matchId,
    sender_id: currentUser.id,
    text
  });

  await renderActiveChat();
}

async function sendTypedChatMessage() {
  const match = await getActiveMatch();
  if (!match) return;

  const input = document.getElementById("chat-input");
  if (!input) return;

  const text = input.value.trim();
  const remaining = await getRemainingChatMessages(match.id);

  if (!text || remaining <= 0) return;

  // 🔹 envia mensagem
  await supabaseClient.from("messages").insert({
    match_id: match.id,
    sender_id: currentUser.id,
    text
  });

  // 🔹 identifica outro usuário
  const otherUserId =
    match.user1 === currentUser.id ? match.user2 : match.user1;

  // 🔹 atualiza preview do chat
  chatPreviewMap[otherUserId] = text;
  saveChatStatus();

  // 🔹 envia notificação para o outro usuário
  await createNotification(
    otherUserId,
    currentUser.id,
    "message",
    "Nova mensagem 💬",
    `${currentUser.name}: ${text}`
  );

  // 🔹 limpa input
  input.value = "";

  // 🔹 atualiza chat aberto
  await renderActiveChat();
}
// ================= PROFILE =================
async function getReceivedLikesCount() {
  if (!supabaseClient || !currentUser.id) return 0;

  const { data, error } = await supabaseClient
    .from("likes")
    .select("id")
    .eq("to_user", currentUser.id);

  if (error) {
    console.error("Erro ao contar choppadas:", error);
    return 0;
  }

  return data.length;
}

function updateProfile() {
  const name = document.getElementById("profile-name");
  const age = document.getElementById("profile-age");
  const bio = document.getElementById("profile-bio");
  const matchCount = document.getElementById("match-count");
  const photo = document.getElementById("profile-photo");

  if (name) name.textContent = currentUser.name;
  if (age) age.textContent = currentUser.age + " anos";
  if (bio) bio.textContent = currentUser.bio;

  getReceivedLikesCount().then(count => {
    if (matchCount) matchCount.textContent = count;
  });

  if (photo) photo.src = currentUser.selfie || "";

  setMode(currentUser.mode || "active");
}

function setMode(mode) {
  currentUser.mode = mode;
  saveData();

  const card = document.getElementById("mode-toggle");
  const title = document.getElementById("mode-title-text");
  const desc = document.getElementById("mode-desc-text");
  const switchEl = document.getElementById("mode-switch");

  // RESET VISUAL
  if (card) {
    card.classList.remove("active-green", "active-yellow");
    card.style.borderColor = "";
    card.style.boxShadow = "";
  }

  if (switchEl) {
    switchEl.classList.remove("active", "view");
  }

  // MODO ATIVO (verde)
  if (mode === "active") {
    if (card) card.classList.add("active-green");

    if (title) {
      title.textContent = "Novas conexões";
      title.style.color = "var(--green)";
    }

    if (desc) {
      desc.textContent = "Interaja com as pessoas que estão aqui.";
    }

    if (switchEl) {
      switchEl.classList.add("active");
    }

  } else {
    // MODO VIEW (amarelo)
    if (card) card.classList.add("active-yellow");

    if (title) {
      title.textContent = "Só observando";
      title.style.color = "var(--yellow)";
    }

    if (desc) {
      desc.textContent = "Você só podera vizualizar, sem interação.";
    }

    if (switchEl) {
      switchEl.classList.add("view");
    }
  }

  // Atualiza telas
  if (activeTab === 0) {
    renderUsers();
  }

  if (activeTab === 2) {
    renderMural();
  }
}

async function toggleMode() {
  const newMode = currentUser.mode === "active" ? "view" : "active";

  setMode(newMode);

  if (supabaseClient && currentUser.id) {
    await supabaseClient
      .from("users")
      .update({ mode: newMode })
      .eq("id", currentUser.id);
  }

  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }
}

// ================= MURAL =================

async function getRemainingMuralPosts() {
  if (!supabaseClient || !currentUser.id) return muralPostLimit;

  const { data, error } = await supabaseClient
    .from("mural_posts")
    .select("id")
    .eq("author_id", currentUser.id);

  if (error) {
    console.error("Erro ao contar posts do mural:", error);
    return muralPostLimit;
  }

  return muralPostLimit - (data?.length || 0);
}

async function updateMuralLimitText() {
  const remaining = await getRemainingMuralPosts();
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

async function publishPost() {
  if (currentUser.mode === "view") {
    alert("No modo Só observando você não pode publicar no mural.");
    return;
  }

  const remaining = await getRemainingMuralPosts();
  if (remaining <= 0) {
    alert("Você atingiu o limite de 5 mensagens no mural.");
    return;
  }

  const input = document.getElementById("mural-input");
  if (!input) return;

  const text = input.value.trim();
  if (!text) return;

  await supabaseClient.from("mural_posts").insert({
    author_id: currentUser.id,
    author_name: currentUser.name,
    author_photo: currentUser.selfie || "",
    text
  });

  input.value = "";
  await renderMural();
}

async function renderMural() {
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

  await updateMuralLimitText();

  const { data: posts, error } = await supabaseClient
    .from("mural_posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao carregar mural:", error);
    list.innerHTML = `
      <div class="mural-post">
        <div class="mural-post-text">Erro ao carregar o mural.</div>
      </div>
    `;
    return;
  }

  if (!posts || posts.length === 0) {
    list.innerHTML = `
      <div class="mural-post">
        <div class="mural-post-text">O mural tá quietinho. Solta o verbo.</div>
      </div>
    `;
    return;
  }

  const postsHtml = await Promise.all(posts.map(async post => {
    const time = new Date(post.created_at).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });
  
    const { data: replies, error: repliesError } = await supabaseClient
      .from("mural_replies")
      .select("*")
      .eq("post_id", post.id)
      .order("created_at", { ascending: true });
  
    if (repliesError) {
      console.error("Erro ao carregar respostas:", repliesError);
    }
  
    return `
      <div class="mural-post">
        <div class="mural-post-header">
          <img class="mural-avatar" src="${post.author_photo || ""}" alt="Foto">
          <div>
            <div class="mural-post-name">${post.author_name}</div>
            <div class="mural-post-time">${time}</div>
          </div>
        </div>
  
        <div class="mural-post-text">${post.text}</div>
  
        <button class="reply-btn" onclick="toggleReplyBox('${post.id}')">
          Responder
        </button>
  
        <div id="reply-box-${post.id}" class="reply-box hidden">
          <input
            id="reply-input-${post.id}"
            class="reply-input"
            type="text"
            placeholder="Escreva uma resposta..."
            maxlength="120"
          >
  
          <div class="reply-actions">
            <button class="reply-send" onclick="sendReply('${post.id}')">
              Enviar
            </button>
          </div>
        </div>
  
        <div class="reply-list">
          ${(replies || []).map(reply => `
            <div class="reply-item">
              <div class="reply-name">${reply.author_name}</div>
              <div class="reply-text">${reply.text}</div>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }));
  
  list.innerHTML = postsHtml.join("");
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

// ================= EDITAR =================

async function handleEditPhotoButton() {
  const video = document.getElementById("edit-camera-video");
  const btn = document.getElementById("edit-take-photo-btn");

  if (video.classList.contains("hidden")) {
    await startEditCamera();
    btn.textContent = "Tirar foto";
  } else {
    captureEditPhoto();
  }
}

async function startEditCamera() {
  const video = document.getElementById("edit-camera-video");
  const preview = document.getElementById("edit-selfie-preview");
  const saveBtn = document.getElementById("save-edit-photo-btn");

  editCameraStream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user" }
  });

  video.srcObject = editCameraStream;

  preview.classList.add("hidden");
  video.classList.remove("hidden");
  saveBtn.classList.add("hidden");
}

async function captureEditPhoto() {
  const video = document.getElementById("edit-camera-video");
  const canvas = document.getElementById("edit-camera-canvas");
  const preview = document.getElementById("edit-selfie-preview");
  const takeBtn = document.getElementById("edit-take-photo-btn");

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

  editSelfieImage = canvas.toDataURL("image/jpeg", 0.9);

  preview.src = editSelfieImage;
  preview.classList.remove("hidden");
  video.classList.add("hidden");

  if (takeBtn) {
    takeBtn.disabled = true;
    takeBtn.textContent = "Verificando rosto...";
  }

  const faceDetected = await hasFace(editSelfieImage);

  if (!faceDetected) {
    alert("Nenhum rosto detectado. Tire uma selfie válida.");

    editSelfieImage = "";
    preview.classList.add("hidden");
    video.classList.remove("hidden");

    if (takeBtn) {
      takeBtn.disabled = false;
      takeBtn.textContent = "Tirar foto";
    }

    return;
  }

  if (editCameraStream) {
    editCameraStream.getTracks().forEach(track => track.stop());
    editCameraStream = null;
  }

  if (takeBtn) {
    takeBtn.disabled = false;
    takeBtn.textContent = "Tirar outra foto";
  }
}

async function confirmEditPhoto() {
  if (!editSelfieImage) {
    alert("Tire uma foto antes de usar.");
    return;
  }

  const saveBtn = document.getElementById("save-edit-photo-btn");

  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = "Verificando rosto...";
  }

  const faceDetected = await hasFace(editSelfieImage);

  if (!faceDetected) {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = "Usar essa foto";
    }

    alert("Nenhum rosto detectado. Tire uma selfie válida.");
    editSelfieImage = "";
    return;
  }

  if (saveBtn) {
    saveBtn.disabled = false;
    saveBtn.textContent = "Foto selecionada ✅";
  }

  setTimeout(() => {
    if (saveBtn) saveBtn.textContent = "Usar essa foto";
  }, 1200);
}
async function saveProfileEdit() {
  currentUser.name = document.getElementById("edit-name").value.trim();
  currentUser.age = parseInt(document.getElementById("edit-age").value);
  currentUser.bio = document.getElementById("edit-bio").value.trim();

  if (editSelfieImage) {
    currentUser.selfie = editSelfieImage;
  }

  saveData();

  if (supabaseClient) {
    await supabaseClient
      .from("users")
      .update({
        name: currentUser.name,
        age: currentUser.age,
        bio: currentUser.bio,
        photo: currentUser.selfie
      })
      .eq("id", currentUser.id);

    await supabaseClient
      .from("mural_posts")
      .update({
        author_name: currentUser.name,
        author_photo: currentUser.selfie
      })
      .eq("author_id", currentUser.id);

    await supabaseClient
      .from("mural_replies")
      .update({
        author_name: currentUser.name
      })
      .eq("author_id", currentUser.id);
  }

  updateProfile();
  renderUsers();
  renderMural();
  closeEditProfile();
}

// =======================================
function closeEditProfile() {
  const panel = document.getElementById("edit-profile-panel");
  const video = document.getElementById("edit-camera-video");
  const preview = document.getElementById("edit-selfie-preview");
  const saveBtn = document.getElementById("save-edit-photo-btn");
  const takeBtn = document.getElementById("edit-take-photo-btn");

  if (panel) panel.classList.add("hidden");

  if (video) video.classList.add("hidden");
  if (preview) preview.classList.remove("hidden");
  if (saveBtn) saveBtn.classList.add("hidden");
  if (takeBtn) takeBtn.textContent = "Tirar outra foto";

  // volta para a foto atual do usuário
  editSelfieImage = currentUser.selfie || "";

  if (editCameraStream) {
    editCameraStream.getTracks().forEach(track => track.stop());
    editCameraStream = null;
  }
}

function openEditProfile() {
  const panel = document.getElementById("edit-profile-panel");

  if (!panel) {
    console.error("Painel não encontrado");
    return;
  }

  document.getElementById("edit-name").value = currentUser.name || "";
  document.getElementById("edit-age").value = currentUser.age || "";
  document.getElementById("edit-bio").value = currentUser.bio || "";

  editSelfieImage = currentUser.selfie || "";

  const preview = document.getElementById("edit-selfie-preview");
  const video = document.getElementById("edit-camera-video");
  const saveBtn = document.getElementById("save-edit-photo-btn");
  const takeBtn = document.getElementById("edit-take-photo-btn");

  if (preview) {
    preview.src = editSelfieImage;
    preview.classList.remove("hidden");
  }

  if (video) video.classList.add("hidden");
  if (saveBtn) saveBtn.classList.add("hidden");
  if (takeBtn) takeBtn.textContent = "Tirar outra foto";

  panel.classList.remove("hidden");
}
// =======================================
function toggleReplyBox(postId) {
  const box = document.getElementById(`reply-box-${postId}`);
  if (box) box.classList.toggle("hidden");
}

async function sendReply(postId) {
  if (currentUser.mode === "view") {
    alert("No modo Só observando você só pode visualizar o mural.");
    return;
  }

  const input = document.getElementById(`reply-input-${postId}`);
  if (!input) return;

  const text = input.value.trim();
  if (!text) return;

  await supabaseClient.from("mural_replies").insert({
    post_id: postId,
    author_id: currentUser.id,
    author_name: currentUser.name,
    text
  });

  input.value = "";
  const { data: post } = await supabaseClient
  .from("mural_posts")
  .select("author_id, author_name")
  .eq("id", postId)
  .single();

if (post && post.author_id !== currentUser.id) {
  await createNotification(
    post.author_id,
    currentUser.id,
    "mural_reply",
    "Nova resposta no mural 💬",
    `${currentUser.name} respondeu sua publicação no mural`
  );
}
  await renderMural();
}

function updateHorizontalFade(scrollerId) {
  const scroller = document.getElementById(scrollerId);
  if (!scroller) return;

  const wrapper = scroller.closest(".scroll-fade-wrap");
  if (!wrapper) return;

  const maxScroll = scroller.scrollWidth - scroller.clientWidth;
  const currentScroll = scroller.scrollLeft;

  wrapper.classList.toggle("has-left-fade", currentScroll > 2);
  wrapper.classList.toggle("has-right-fade", currentScroll < maxScroll - 2);
}

function setupHorizontalFade(scrollerId) {
  const scroller = document.getElementById(scrollerId);
  if (!scroller) return;

  updateHorizontalFade(scrollerId);

  scroller.addEventListener("scroll", () => {
    updateHorizontalFade(scrollerId);
  });

  window.addEventListener("resize", () => {
    updateHorizontalFade(scrollerId);
  });
}

// ================= NOTIFICAÇÕES ==================

async function requestBrowserNotificationPermission() {
  if (!("Notification" in window)) return;

  if (Notification.permission === "default") {
    await Notification.requestPermission();
  }
}

function showAppNotification(message) {
  const notification = document.createElement("div");
  notification.className = "hubbe-notification";
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => notification.classList.add("show"), 100);

  setTimeout(() => {
    notification.classList.remove("show");
    setTimeout(() => notification.remove(), 300);
  }, 3500);
}

function showBrowserNotification(title, message) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  new Notification(title, {
    body: message,
    icon: "icon.png"
  });
}

async function createNotification(userId, fromUserId, type, title, message) {
  if (!supabaseClient) return;

  await supabaseClient.from("notifications").insert({
    user_id: userId,
    from_user_id: fromUserId,
    type,
    title,
    message,
    is_read: false
  });
}

function listenToMyNotifications() {
  if (!supabaseClient || !currentUser.id) return;

  supabaseClient
    .channel("my-notifications-" + currentUser.id)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${currentUser.id}`
      },
      payload => {
        const notification = payload.new;

        showAppNotification(notification.message);
        showBrowserNotification(notification.title, notification.message);
        
        if (notification.type === "brinde") {
          markChatUnread(notification.from_user_id, '"Novo brinde 🍻"');
        }
        
        if (notification.type === "message") {
          markChatUnread(notification.from_user_id, notification.message);
        }
        
        if (notification.type === "mural_reply") {
          if (activeTab !== 2) showMuralBadge();
        }
      }
    )
    .subscribe();
}

async function getMatchedUserIds() {
  const matchedIds = new Set();

  if (!supabaseClient || !currentUser.id) return matchedIds;

  const { data: matches } = await supabaseClient
    .from("matches")
    .select("*")
    .or(`user1.eq.${currentUser.id},user2.eq.${currentUser.id}`);

  (matches || []).forEach(match => {
    matchedIds.add(match.user1 === currentUser.id ? match.user2 : match.user1);
  });

  return matchedIds;
}

async function openChatWithUser(userId) {
  if (!supabaseClient || !currentUser.id) return;

  await loadRealMatches();

  const match = realMatches.find(match =>
    match.user1 === userId || match.user2 === userId
  );

  if (!match) {
    alert("Chat ainda não liberado.");
    return;
  }
  currentUser.activeChatId = match.id;
  saveData();
  setActiveTab(1);
}

// ================= ZOOM =================

function openImageModal(src) {
  const modal = document.getElementById("image-modal");
  const img = document.getElementById("image-modal-img");
  img.src = src;
  modal.classList.remove("hidden");
}
function closeImageModal() {
  const modal = document.getElementById("image-modal");
  modal.classList.add("hidden");
}
async function logoutUser() {
  if (!currentUser.id) {
    localStorage.clear();
    location.reload();
    return;
  }
  const userId = currentUser.id;
  if (supabaseClient) {
// marca offline antes de remover tudo
    await setUserOffline();
// 1. Busca brindes/chats da pessoa
    const { data: userMatches } = await supabaseClient
      .from("matches")
      .select("id")
      .or(`user1.eq.${userId},user2.eq.${userId}`);
    const matchIds = (userMatches || []).map(match => match.id);
// 2. Apaga mensagens dos chats dela
    if (matchIds.length > 0) {
      await supabaseClient
        .from("messages")
        .delete()
        .in("match_id", matchIds);
    }
// 3. Apaga brindes/chats dela
    await supabaseClient
      .from("matches")
      .delete()
      .or(`user1.eq.${userId},user2.eq.${userId}`);
//4. Apaga choppadas enviadas e recebidas
    await supabaseClient
      .from("likes")
      .delete()
      .or(`from_user.eq.${userId},to_user.eq.${userId}`);
// 5. Apaga respostas do mural feitas por ela
    await supabaseClient
      .from("mural_replies")
      .delete()
      .eq("author_id", userId);
// 6. Busca posts dela no mural
    const { data: posts } = await supabaseClient
      .from("mural_posts")
      .select("id")
      .eq("author_id", userId);
    const postIds = (posts || []).map(post => post.id);
// 7. Apaga respostas nos posts dela
    if (postIds.length > 0) {
      await supabaseClient
        .from("mural_replies")
        .delete()
        .in("post_id", postIds);
    }
// 8. Apaga posts dela
    await supabaseClient
      .from("mural_posts")
      .delete()
      .eq("author_id", userId);
// 9. Apaga notificações dela
    await supabaseClient
      .from("notifications")
      .delete()
      .or(`user_id.eq.${userId},from_user_id.eq.${userId}`);
// 10. Apaga perfil dela
    await supabaseClient
      .from("users")
      .delete()
      .eq("id", userId);
  }
  localStorage.clear();
  location.reload();
}
function listenUsersRealtime() {
  if (!supabaseClient) return;
  supabaseClient
    .channel("users-realtime")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "users"
      },
      () => {
        renderUsers();
      }
    )
    .subscribe();
}

function showChatBadge() {
  document.getElementById("chat-badge")?.classList.remove("hidden");
}

function hideChatBadge() {
  document.getElementById("chat-badge")?.classList.add("hidden");
}

function showMuralBadge() {
  document.getElementById("mural-badge")?.classList.remove("hidden");
}

function hideMuralBadge() {
  document.getElementById("mural-badge")?.classList.add("hidden");
}

async function hasFace(imageSrc) {
  if (!faceModelReady || typeof faceapi === "undefined") {
    alert("Detector de rosto ainda não carregou. Aguarde alguns segundos e tente novamente.");
    return false;
  }

  const img = new Image();
  img.src = imageSrc;

  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
  });

  const detection = await faceapi.detectSingleFace(
    img,
    new faceapi.TinyFaceDetectorOptions({
      inputSize: 320,
      scoreThreshold: 0.15
    })
  );

  console.log("Resultado da detecção:", detection);

  return !!detection;
}

// ================= AUX =================
function goBack() {
  setActiveTab(0);
}
window.addEventListener("beforeunload", setUserOffline);
