const USER_ID_KEY = "usz6_fixed_user_id";
const USED_IDS_KEY = "usz6_used_ids";
const PLAYERS_KEY = "usz6_players";
const EDITOR_IDS = ["wemmbu", "kaiser"];

let currentCategory = "Overall";

const defaultPlayers = [
  { id: 1, name: "Wemmbu", tier: "S", category: "Overall", note: "Top placement" },
  { id: 2, name: "Kaiser", tier: "S", category: "Sword", note: "Strong sword player" },
  { id: 3, name: "ClutchGod", tier: "A", category: "Vanilla", note: "Consistent results" },
  { id: 4, name: "PotMaster", tier: "B", category: "Pot", note: "Good mechanics" },
  { id: 5, name: "NetherAce", tier: "C", category: "NethOP", note: "Improving player" }
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
  const players = JSON.parse(localStorage.getItem(PLAYERS_KEY));
  if (players) return players;
  localStorage.setItem(PLAYERS_KEY, JSON.stringify(defaultPlayers));
  return defaultPlayers;
}

function savePlayers(players) {
  localStorage.setItem(PLAYERS_KEY, JSON.stringify(players));
}

function isEditor() {
  const userId = getUserId();
  if (!userId) return false;
  return EDITOR_IDS.includes(userId.toLowerCase());
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.innerText = text;
  return div.innerHTML;
}

function setupUserUI() {
  const overlay = document.getElementById("idSetupOverlay");
  const displayUserId = document.getElementById("displayUserId");
  const editorBadge = document.getElementById("editorBadge");
  const adminPanel = document.getElementById("adminPanel");

  const userId = getUserId();

  if (!userId) {
    overlay.classList.remove("hidden");
    displayUserId.textContent = "Not set";
    editorBadge.classList.add("hidden");
    adminPanel.classList.add("hidden");
    return;
  }

  overlay.classList.add("hidden");
  displayUserId.textContent = userId;

  if (isEditor()) {
    editorBadge.classList.remove("hidden");
    adminPanel.classList.remove("hidden");
  } else {
    editorBadge.classList.add("hidden");
    adminPanel.classList.add("hidden");
  }
}

function renderPlayers() {
  const players = getPlayers();
  const search = document.getElementById("searchInput").value.trim().toLowerCase();

  document.getElementById("tier-S").innerHTML = "";
  document.getElementById("tier-A").innerHTML = "";
  document.getElementById("tier-B").innerHTML = "";
  document.getElementById("tier-C").innerHTML = "";

  const filtered = players.filter((player) => {
    const matchesCategory = player.category === currentCategory;
    const matchesSearch = player.name.toLowerCase().includes(search);
    return matchesCategory && matchesSearch;
  });

  filtered.forEach((player) => {
    const card = document.createElement("div");
    card.className = "player-card";

    card.innerHTML = `
      <h4>${escapeHtml(player.name)}</h4>
      <p>${escapeHtml(player.note || "No note")}</p>
      <div class="player-meta">${escapeHtml(player.category)}</div>
      ${isEditor() ? `<button class="delete-btn" onclick="deletePlayer(${player.id})">Delete</button>` : ""}
    `;

    const tierContainer = document.getElementById(`tier-${player.tier}`);
    if (tierContainer) {
      tierContainer.appendChild(card);
    }
  });
}

function deletePlayer(id) {
  if (!isEditor()) {
    alert("You do not have permission.");
    return;
  }

  const players = getPlayers().filter((player) => player.id !== id);
  savePlayers(players);
  renderPlayers();
}

document.getElementById("idForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const input = document.getElementById("userIdInput");
  const rawId = input.value.trim();

  if (!rawId) {
    alert("Enter an ID.");
    return;
  }

  const normalized = rawId.toLowerCase();
  const currentSaved = getUserId();

  if (currentSaved) {
    alert("You already set your ID on this browser.");
    return;
  }

  const usedIds = getUsedIds();

  if (usedIds.includes(normalized)) {
    alert("That ID is already taken.");
    return;
  }

  usedIds.push(normalized);
  saveUsedIds(usedIds);
  saveUserId(rawId);

  input.value = "";
  setupUserUI();
  renderPlayers();
});

document.getElementById("playerForm").addEventListener("submit", function (e) {
  e.preventDefault();

  if (!isEditor()) {
    alert("You do not have permission.");
    return;
  }

  const name = document.getElementById("playerName").value.trim();
  const tier = document.getElementById("playerTier").value;
  const category = document.getElementById("playerCategory").value;
  const note = document.getElementById("playerNote").value.trim();

  if (!name || !tier || !category) {
    alert("Fill out all required fields.");
    return;
  }

  const players = getPlayers();
  players.push({
    id: Date.now(),
    name,
    tier,
    category,
    note
  });

  savePlayers(players);
  document.getElementById("playerForm").reset();

  if (category === currentCategory) {
    renderPlayers();
  } else {
    renderPlayers();
  }
});

document.getElementById("searchInput").addEventListener("input", function () {
  renderPlayers();
});

document.querySelectorAll(".category-btn").forEach((btn) => {
  btn.addEventListener("click", function () {
    document.querySelectorAll(".category-btn").forEach((b) => b.classList.remove("active"));
    this.classList.add("active");

    currentCategory = this.dataset.category;
    document.getElementById("currentCategoryText").textContent = currentCategory;
    document.getElementById("selectedCategoryBox").textContent = currentCategory;

    renderPlayers();
  });
});

setupUserUI();
renderPlayers();
