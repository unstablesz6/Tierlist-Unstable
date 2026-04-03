const USER_ID_KEY = "usz6_fixed_user_id";
const USED_IDS_KEY = "usz6_used_ids";
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

function getUsedIds() {
  return JSON.parse(localStorage.getItem(USED_IDS_KEY)) || [];
}

function saveUsedIds(ids) {
  localStorage.setItem(USED_IDS_KEY, JSON.stringify(ids));
}

function getUserId() {
  return localStorage.getItem(USER_ID_KEY);
}

function saveUserId(id) {
  localStorage.setItem(USER_ID_KEY, id);
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
  const id = getUserId();
  return id ? EDITOR_IDS.includes(id.toLowerCase()) : false;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.innerText = text;
  return div.innerHTML;
}

function openIdModal() {
  document.getElementById("idModal").classList.remove("hidden");
}

function closeIdModal() {
  document.getElementById("idModal").classList.add("hidden");
}

function updateUserDisplay() {
  const userId = getUserId();
  const currentUserId = document.getElementById("currentUserId");
  const editorMark = document.getElementById("editorMark");
  const editorPanel = document.getElementById("editorPanel");

  currentUserId.textContent = userId || "Not set";

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

document.getElementById("openIdBtn").addEventListener("click", openIdModal);

document.getElementById("idForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const input = document.getElementById("userIdInput");
  const rawId = input.value.trim();

  if (!rawId) {
    alert("Please enter an ID.");
    return;
  }

  const current = getUserId();
  const usedIds = getUsedIds();
  const normalized = rawId.toLowerCase();

  if (current && current.toLowerCase() !== normalized) {
    alert("This browser already has an ID set.");
    return;
  }

  if (!current && usedIds.includes(normalized)) {
    alert("That ID is already taken.");
    return;
  }

  if (!current) {
    usedIds.push(normalized);
    saveUsedIds(usedIds);
  }

  saveUserId(rawId);
  input.value = "";
  closeIdModal();
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
  document.getElementById("playerForm").reset();
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

if (!getUserId()) {
  openIdModal();
}

updateUserDisplay();
renderPlayers();
