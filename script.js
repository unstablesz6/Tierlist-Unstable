import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB-dYAQnwzpsiiyDqWj3Jaow91b3LOZjF8",
  authDomain: "unstablesz6-tiers.firebaseapp.com",
  projectId: "unstablesz6-tiers",
  storageBucket: "unstablesz6-tiers.firebasestorage.app",
  messagingSenderId: "349051865909",
  appId: "1:349051865909:web:7aecb6bf0058e722485a7c",
  measurementId: "G-G03SM4LGXV"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const ACCOUNTS_KEY = "usz6_accounts";
const SESSION_KEY = "usz6_session_id";
const EDITOR_IDS = ["wemmbu", "kaiser"];

let currentCategory = "Overall";
let allPlayers = [];

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
  return getAccounts().find(acc => acc.id.toLowerCase() === sessionId.toLowerCase()) || null;
}

function isEditor() {
  const account = getCurrentAccount();
  return account ? EDITOR_IDS.includes(account.id.toLowerCase()) : false;
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
  document.getElementById("currentUserId").textContent = account ? account.id : "Not logged in";

  if (account) {
    document.getElementById("logoutBtn").classList.remove("hidden");
  } else {
    document.getElementById("logoutBtn").classList.add("hidden");
  }

  if (isEditor()) {
    document.getElementById("editorMark").classList.remove("hidden");
    document.getElementById("editorPanel").classList.remove("hidden");
  } else {
    document.getElementById("editorMark").classList.add("hidden");
    document.getElementById("editorPanel").classList.add("hidden");
  }
}

function getRegionClass(region) {
  return `region-${(region || "").toLowerCase()}`;
}

async function loadPlayers() {
  const snapshot = await getDocs(collection(db, "players"));
  allPlayers = snapshot.docs.map(docSnap => ({
    firebaseId: docSnap.id,
    ...docSnap.data()
  }));

  renderPlayers();
}

function renderPlayers() {
  const list = document.getElementById("rankingList");
  const search = document.getElementById("searchInput").value.trim().toLowerCase();

  const players = allPlayers
    .filter(player => player.category === currentCategory)
    .filter(player => (player.name || "").toLowerCase().includes(search));

  list.innerHTML = "";

  if (!players.length) {
    list.innerHTML = `<div class="empty-state">No players found in this category.</div>`;
    return;
  }

  players.forEach((player, index) => {
    const tiers = Array.isArray(player.tiers) ? player.tiers : [];

    const row = document.createElement("div");
    row.className = "rank-row";

    row.innerHTML = `
      <div class="rank-pos">${index + 1}.</div>
      <div class="player-main">
        <h4>${escapeHtml(player.name)}</h4>
        <p>${escapeHtml(player.note || "")}</p>
        ${isEditor() ? `<button class="delete-btn" data-id="${player.firebaseId}">Delete</button>` : ""}
      </div>
      <div>
        <span class="region-badge ${getRegionClass(player.region)}">${escapeHtml(player.region || "NA")}</span>
      </div>
      <div class="tier-tags">
        ${tiers.map(tier => `<span class="tier-tag">${escapeHtml(tier)}</span>`).join("")}
      </div>
    `;

    list.appendChild(row);
  });

  if (isEditor()) {
    document.querySelectorAll(".delete-btn").forEach(btn => {
      btn.addEventListener("click", async function () {
        await deletePlayer(this.dataset.id);
      });
    });
  }
}

async function deletePlayer(firebaseId) {
  if (!isEditor()) {
    alert("You do not have permission.");
    return;
  }

  await deleteDoc(doc(db, "players", firebaseId));
  await loadPlayers();
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
    alert("That ID is already taken on this browser.");
    return;
  }

  accounts.push({ id, password });
  saveAccounts(accounts);
  setSessionId(id);

  this.reset();
  closeAuthModal();
  updateUserDisplay();
  renderPlayers();
});

document.getElementById("playerForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  if (!isEditor()) {
    alert("You do not have permission.");
    return;
  }

  const name = document.getElementById("playerName").value.trim();
  const category = document.getElementById("playerCategory").value;
  const region = document.getElementById("playerRegion").value;
  const tiers = document.getElementById("playerTiers").value
    .split(",")
    .map(t => t.trim())
    .filter(Boolean);
  const note = document.getElementById("playerNote").value.trim();

  if (!name || !category || !region || !tiers.length) {
    alert("Please fill all required fields.");
    return;
  }

  await addDoc(collection(db, "players"), {
    name,
    category,
    region,
    tiers,
    note
  });

  this.reset();
  await loadPlayers();
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

async function init() {
  if (!getCurrentAccount()) {
    openAuthModal();
  }

  showLoginTab();
  updateUserDisplay();
  await loadPlayers();

  setInterval(loadPlayers, 10000);
}

init();
