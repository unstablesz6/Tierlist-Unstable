const ACCOUNTS_KEY = "usz6_accounts";
const SESSION_KEY = "usz6_session_id";
const PLAYERS_KEY = "usz6_players";
const EDITOR_IDS = ["wemmbu", "kaiser"];

let currentCategory = "Overall";

const defaultPlayers = [
  { id: 1, name: "Wemmbu", category: "Overall", tier: "HT1", note: "Combat Master • 330 points" },
  { id: 2, name: "Kaiser", category: "Overall", tier: "HT1", note: "Combat Master • 311 points" },
  { id: 3, name: "ClutchGod", category: "Vanilla", tier: "HT2", note: "Combat Ace • 290 points" },
  { id: 4, name: "SwordMain", category: "Sword", tier: "LT1", note: "Combat Ace • 245 points" },
  { id: 5, name: "AxeLegend", category: "Axe", tier: "LT2", note: "Rising player • 226 points" },
  { id: 6, name: "PotMaster", category: "Pot", tier: "HT3", note: "Mechanics specialist • 201 points" },
  { id: 7, name: "SmpZone", category: "SMP", tier: "LT3", note: "Strong consistency • 184 points" }
];

function getAccounts() {
  return JSON.parse(localStorage.getItem(ACCOUNTS_KEY)) || [];
}

function saveAccounts(accounts) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function getSessionId() {
  return localStorage.getItem(SESSION_KEY);
}

function setSessionId(id) {
  localStorage.setItem(SESSION_KEY, id);
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function getCurrentAccount() {
  const sessionId = getSessionId();
  if (!sessionId) return null;
  return getAccounts().find(account => account.id.toLowerCase() === sessionId.toLowerCase()) || null;
}

function getPlayers() {
  const saved = JSON.parse(localStorage.getItem(PLAYERS_KEY));
  if (saved) return saved;
  localStorage.setItem(PLAYERS_KEY, JSON.stringify(defaultPlayers));
  return defaultPlayers;
}

function savePlayers(players) {
  localStorage.setItem(PLAYERS_KEY, JSON.stringify(players));
}

function isEditor() {
  const account = getCurrentAccount();
  if (!account) return false;
  return EDITOR_IDS.includes(account.id.toLowerCase());
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.innerText = text || "";
  return div.innerHTML;
}

function openAuthModal() {
  document.getElementById("authModal").classList.remove("hidden");
}

function closeAuthModal() {
  document.getElementById("authModal").classList.add("hidden");
}

function showLoginTab() {
  document.getElementById("loginSection").classList.remove("hidden");
  document.getElementById("signupSection").classList.add("hidden");
  document.getElementById("loginTab").classList.add("active");
  document.getElementById("signupTab").classList.remove("active");
}

function showSignupTab() {
  document.getElementById("signupSection").classList.remove("hidden");
  document.getElementById("loginSection").classList.add("hidden");
  document.getElementById("signupTab").classList.add("active");
  document.getElementById("loginTab").classList.remove("active");
}

function updateUserDisplay() {
  const account = getCurrentAccount();
  const currentUserId = document.getElementById("currentUserId");
  const editorMark = document.getElementById("editorMark");
  const editorPanel = document.getElementById("editorPanel");
  const logoutBtn = document.getElementById("logoutBtn");

  currentUserId.textContent = account ? account.id : "Not logged in";

  if (account) {
    logoutBtn.classList.remove("hidden");
  } else {
    logoutBtn.classList.add("hidden");
  }

  if (isEditor()) {
    editorMark.classList.remove("hidden");
    editorPanel.classList.remove("hidden");
  } else {
    editorMark.classList.add("hidden");
    editorPanel.classList.add("hidden");
  }
}

function getTierClass(tier) {
  return tier.startsWith("HT") ? "tier-ht" : "tier-lt";
}

function renderPlayers() {
  const list = document.getElementById("rankingList");
  const search = document.getElementById("searchInput").value.trim().toLowerCase();

  const players = getPlayers()
    .filter(player => player.category === currentCategory)
    .filter(player => player.name.toLowerCase().includes(search));

  list.innerHTML = "";

  if (!players.length) {
    list.innerHTML = `<div class="empty-state">No players found in this category.</div>`;
    return;
  }

  players.forEach((player, index) => {
    const row = document.createElement("div");
    row.className = "rank-row";

    row.innerHTML = `
      <div class="rank-pos">${index + 1}.</div>
      <div class="player-main">
        <h4>${escapeHtml(player.name)}</h4>
        <p>${escapeHtml(player.note || "No details")}</p>
        ${isEditor() ? `<button class="delete-btn" onclick="deletePlayer(${player.id})">Delete</button>` : ""}
      </div>
      <div>
        <span class="category-tag">${escapeHtml(player.category)}</span>
      </div>
      <div>
        <span class="tier-badge ${getTierClass(player.tier)}">${escapeHtml(player.tier)}</span>
      </div>
    `;

    list.appendChild(row);
  });
}

function deletePlayer(id) {
  if (!isEditor()) {
    alert("You do not have permission.");
    return;
  }

  const players = getPlayers().filter(player => player.id !== id);
  savePlayers(players);
  renderPlayers();
}

document.getElementById("openAuthBtn").addEventListener("click", openAuthModal);
document.getElementById("loginTab").addEventListener("click", showLoginTab);
document.getElementById("signupTab").addEventListener("click", showSignupTab);

document.getElementById("logoutBtn").addEventListener("click", function () {
  clearSession();
  updateUserDisplay();
  renderPlayers();
  openAuthModal();
});

document.getElementById("loginForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const id = document.getElementById("loginIdInput").value.trim();
  const password = document.getElementById("loginPasswordInput").value;

  const account = getAccounts().find(acc =>
    acc.id.toLowerCase() === id.toLowerCase() && acc.password === password
  );

  if (!account) {
    alert("Invalid ID or password.");
    return;
  }

  setSessionId(account.id);
  this.reset();
  closeAuthModal();
  updateUserDisplay();
  renderPlayers();
});

document.getElementById("signupForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const id = document.getElementById("signupIdInput").value.trim();
  const password = document.getElementById("signupPasswordInput").value;

  if (!id || !password) {
    alert("Please fill all fields.");
    return;
  }

  const accounts = getAccounts();

  if (accounts.find(acc => acc.id.toLowerCase() === id.toLowerCase())) {
    alert("That ID is already taken.");
    return;
  }

  const newAccount = { id, password };
  accounts.push(newAccount);
  saveAccounts(accounts);
  setSessionId(id);

  this.reset();
  closeAuthModal();
  updateUserDisplay();
  renderPlayers();
});

document.getElementById("playerForm").addEventListener("submit", function (e) {
  e.preventDefault();

  if (!isEditor()) {
    alert("You do not have permission.");
    return;
  }

  const name = document.getElementById("playerName").value.trim();
  const category = document.getElementById("playerCategory").value;
  const tier = document.getElementById("playerTier").value;
  const note = document.getElementById("playerNote").value.trim();

  if (!name || !category || !tier) {
    alert("Please fill all required fields.");
    return;
  }

  const players = getPlayers();
  players.push({
    id: Date.now(),
    name,
    category,
    tier,
    note
  });

  savePlayers(players);
  this.reset();
  renderPlayers();
});

document.getElementById("searchInput").addEventListener("input", renderPlayers);

document.querySelectorAll(".cat-btn").forEach(btn => {
  btn.addEventListener("click", function () {
    document.querySelectorAll(".cat-btn").forEach(b => b.classList.remove("active"));
    this.classList.add("active");
    currentCategory = this.dataset.category;
    document.getElementById("currentCategoryTitle").textContent = `${currentCategory} Rankings`;
    renderPlayers();
  });
});

if (!getCurrentAccount()) {
  openAuthModal();
}

showLoginTab();
updateUserDisplay();
renderPlayers();
