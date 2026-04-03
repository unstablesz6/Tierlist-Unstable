const USERS_KEY = "usz6_users";
const CURRENT_USER_KEY = "usz6_current_user";
const PLAYERS_KEY = "usz6_players";

/*
  Put editor IDs here.
  Example:
  const allowedEditorIds = ["USZ6-123456", "USZ6-888888"];
*/
const allowedEditorIds = [];

// Default demo players
const defaultPlayers = [
  { id: 1, name: "ExampleS", tier: "S", note: "Top ranked player" },
  { id: 2, name: "ExampleA", tier: "A", note: "Strong overall performance" },
  { id: 3, name: "ExampleB", tier: "B", note: "Solid and improving" },
  { id: 4, name: "ExampleC", tier: "C", note: "Needs more results" }
];

function getUsers() {
  return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getPlayers() {
  const existing = JSON.parse(localStorage.getItem(PLAYERS_KEY));
  if (existing) return existing;
  localStorage.setItem(PLAYERS_KEY, JSON.stringify(defaultPlayers));
  return defaultPlayers;
}

function savePlayers(players) {
  localStorage.setItem(PLAYERS_KEY, JSON.stringify(players));
}

function getCurrentUser() {
  return JSON.parse(localStorage.getItem(CURRENT_USER_KEY)) || null;
}

function saveCurrentUser(user) {
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
}

function logoutCurrentUser() {
  localStorage.removeItem(CURRENT_USER_KEY);
}

function generateUserId() {
  return "USZ6-" + Math.floor(100000 + Math.random() * 900000);
}

function isEditor(user) {
  if (!user) return false;
  return allowedEditorIds.includes(user.id);
}

function renderAccount() {
  const user = getCurrentUser();
  const status = document.getElementById("accountStatus");
  const username = document.getElementById("accountUsername");
  const userId = document.getElementById("accountUserId");
  const canEdit = document.getElementById("accountCanEdit");
  const adminPanel = document.getElementById("adminPanel");

  if (!user) {
    status.textContent = "Not logged in";
    username.textContent = "-";
    userId.textContent = "-";
    canEdit.textContent = "No";
    adminPanel.classList.add("hidden");
    return;
  }

  status.textContent = "Logged in";
  username.textContent = user.username;
  userId.textContent = user.id;
  canEdit.textContent = isEditor(user) ? "Yes" : "No";

  if (isEditor(user)) {
    adminPanel.classList.remove("hidden");
  } else {
    adminPanel.classList.add("hidden");
  }
}

function renderPlayers() {
  const players = getPlayers();

  document.getElementById("tier-S").innerHTML = "";
  document.getElementById("tier-A").innerHTML = "";
  document.getElementById("tier-B").innerHTML = "";
  document.getElementById("tier-C").innerHTML = "";

  const currentUser = getCurrentUser();
  const canEdit = isEditor(currentUser);

  players.forEach((player) => {
    const card = document.createElement("div");
    card.className = "player-card";

    card.innerHTML = `
      <h4>${escapeHtml(player.name)}</h4>
      <p>${escapeHtml(player.note || "No note")}</p>
      ${
        canEdit
          ? `<div class="player-actions">
              <button onclick="deletePlayer(${player.id})">Delete</button>
            </div>`
          : ""
      }
    `;

    const tierContainer = document.getElementById(`tier-${player.tier}`);
    if (tierContainer) tierContainer.appendChild(card);
  });
}

function deletePlayer(id) {
  const user = getCurrentUser();
  if (!isEditor(user)) {
    alert("You do not have permission.");
    return;
  }

  let players = getPlayers();
  players = players.filter((p) => p.id !== id);
  savePlayers(players);
  renderPlayers();
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.innerText = text;
  return div.innerHTML;
}

document.getElementById("signupForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const username = document.getElementById("signupUsername").value.trim();
  const password = document.getElementById("signupPassword").value.trim();

  if (!username || !password) {
    alert("Please fill everything out.");
    return;
  }

  const users = getUsers();

  if (users.find((u) => u.username.toLowerCase() === username.toLowerCase())) {
    alert("Username already exists.");
    return;
  }

  let newId = generateUserId();
  while (users.find((u) => u.id === newId)) {
    newId = generateUserId();
  }

  const newUser = {
    username,
    password,
    id: newId
  };

  users.push(newUser);
  saveUsers(users);
  saveCurrentUser(newUser);

  alert(`Account created. Your ID is ${newId}. Save it.`);
  document.getElementById("signupForm").reset();
  renderAccount();
  renderPlayers();
});

document.getElementById("loginForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  const users = getUsers();
  const foundUser = users.find(
    (u) => u.username === username && u.password === password
  );

  if (!foundUser) {
    alert("Invalid login.");
    return;
  }

  saveCurrentUser(foundUser);
  alert("Logged in successfully.");
  document.getElementById("loginForm").reset();
  renderAccount();
  renderPlayers();
});

document.getElementById("logoutBtn").addEventListener("click", function () {
  logoutCurrentUser();
  renderAccount();
  renderPlayers();
});

document.getElementById("playerForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const user = getCurrentUser();
  if (!isEditor(user)) {
    alert("You do not have permission.");
    return;
  }

  const name = document.getElementById("playerName").value.trim();
  const tier = document.getElementById("playerTier").value;
  const note = document.getElementById("playerNote").value.trim();

  if (!name || !tier) {
    alert("Please fill required fields.");
    return;
  }

  const players = getPlayers();
  players.push({
    id: Date.now(),
    name,
    tier,
    note
  });

  savePlayers(players);
  document.getElementById("playerForm").reset();
  renderPlayers();
});

renderAccount();
renderPlayers();
