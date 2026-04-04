import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import {
  getFirestore, collection, getDocs, addDoc, deleteDoc, doc
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

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
const auth = getAuth(app);

const EDITOR_EMAILS = [
  "wemmbu@unstablesz6.com",
  "kaiser@unstablesz6.com"
];

let currentCategory = "Overall";
let allPlayers = [];
let currentUser = null;

function escapeHtml(str) {
  const div = document.createElement("div");
  div.innerText = str || "";
  return div.innerHTML;
}

function getPlayerSkin(username) {
  return `https://minotar.net/helm/${username}/150.png`;
}

const tierScores = {
  "HT1": 100, "HT2": 90, "HT3": 80,
  "LT1": 70, "LT2": 60, "LT3": 50,
  "LT4": 40, "LT5": 30,
  "-": 0
};

function getBestTier(tierArray) {
  if (!Array.isArray(tierArray) || tierArray.length === 0) return { score: 0, tag: "-" };

  let bestScore = 0;
  let bestTag = "-";

  tierArray.forEach(t => {
    const score = tierScores[t] || 0;
    if (score > bestScore) {
      bestScore = score;
      bestTag = t;
    }
  });

  return { score: bestScore, tag: bestTag };
}

function isEditor() {
  return currentUser && EDITOR_EMAILS.includes(currentUser.email);
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
  document.getElementById("loginError").classList.add("hidden");
  document.getElementById("signupError").classList.add("hidden");
}

function showSignupTab() {
  document.getElementById("signupSection").classList.remove("hidden");
  document.getElementById("loginSection").classList.add("hidden");
  document.getElementById("signupTab").classList.add("active");
  document.getElementById("loginTab").classList.remove("active");
  document.getElementById("loginError").classList.add("hidden");
  document.getElementById("signupError").classList.add("hidden");
}

function getCategoryIcon(category) {
  const icons = {
    "Cart": "🛒",
    "Vanilla": "💎",
    "UHC": "❤",
    "Pot": "🧪",
    "NethOP": "☠",
    "SMP": "🟢",
    "Sword": "🗡",
    "Axe": "🪓",
    "Mace": "🔨",
    "Overall": "🏆"
  };
  return icons[category] || "🎮";
}

function getTierIcon(category) {
  const icons = {
    "Sword": "🗡",
    "Axe": "🪓",
    "Mace": "🔨",
    "Vanilla": "💎",
    "Pot": "🧪",
    "UHC": "❤",
    "Cart": "🛒",
    "Overall": "🏆"
  };
  return icons[category] || "";
}

function updateUserUI() {
  const logoutBtn = document.getElementById("logoutBtn");
  const editorPanel = document.getElementById("editorPanel");
  const openLoginBtn = document.getElementById("openLoginBtn");
  const openSignupBtn = document.getElementById("openSignupBtn");

  if (currentUser) {
    logoutBtn.classList.remove("hidden");
    openLoginBtn.classList.add("hidden");
    openSignupBtn.classList.add("hidden");
  } else {
    logoutBtn.classList.add("hidden");
    openLoginBtn.classList.remove("hidden");
    openSignupBtn.classList.remove("hidden");
  }

  if (isEditor()) {
    editorPanel.classList.remove("hidden");
  } else {
    editorPanel.classList.add("hidden");
  }
}

function openPlayerModal(playerData) {
  const existing = document.querySelector(".row-modal-overlay");
  if (existing) existing.remove();

  const categoryMap = {};
  allPlayers
    .filter(p => p.name === playerData.rawName)
    .forEach(p => {
      if (!categoryMap[p.category]) categoryMap[p.category] = [];
      if (Array.isArray(p.tiers)) categoryMap[p.category].push(...p.tiers);
    });

  const modalHTML = `
    <div class="row-modal-overlay" id="playerDetailsOverlay">
      <div class="row-modal-box">
        <div class="row-modal-header">
          <img src="${getPlayerSkin(playerData.name)}" class="row-modal-avatar" alt="skin">
          <div>
            <h2>${escapeHtml(playerData.name)}</h2>
            <p style="color:var(--muted);margin:4px 0 0">${escapeHtml(playerData.note || "")}</p>
          </div>
        </div>

        <div class="row-modal-tiers">
          <div class="row-modal-category">
            <h4>🏆 Overall</h4>
            <div class="tier-tags">
              <span class="tier-tag">🏆 ${escapeHtml(playerData.bestTag || "-")}</span>
            </div>
          </div>

          ${Object.keys(categoryMap).map(cat => `
            <div class="row-modal-category">
              <h4>${getCategoryIcon(cat)} ${escapeHtml(cat)}</h4>
              <div class="tier-tags">
                ${[...new Set(categoryMap[cat])].map(t => `
                  <span class="tier-tag">${getTierIcon(cat)} ${escapeHtml(t)}</span>
                `).join("")}
              </div>
            </div>
          `).join("")}
        </div>

        <button id="closePlayerModalBtn" style="margin-top:20px;background:#2a3355;">Close</button>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHTML);

  document.getElementById("closePlayerModalBtn").addEventListener("click", closePlayerModal);
  document.getElementById("playerDetailsOverlay").addEventListener("click", function(e) {
    if (e.target.id === "playerDetailsOverlay") closePlayerModal();
  });
}

function closePlayerModal() {
  const overlay = document.querySelector(".row-modal-overlay");
  if (overlay) overlay.remove();
}

async function loadPlayers() {
  try {
    const snapshot = await getDocs(collection(db, "players"));
    allPlayers = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    renderPlayers();
  } catch (err) {
    console.error("Error loading players:", err);
  }
}

function renderPlayers() {
  const list = document.getElementById("rankingList");
  const search = document.getElementById("searchInput").value.trim().toLowerCase();
  let displayData = [];

  if (currentCategory === "Overall") {
    const playerMap = {};

    allPlayers.forEach(p => {
      if (!p.name) return;
      const key = p.name.trim().toLowerCase();

      if (!playerMap[key]) {
        playerMap[key] = {
          name: p.name,
          rawName: p.name,
          region: p.region || "NA",
          bestTag: "-",
          bestScore: 0,
          note: p.note || "",
          allTiers: []
        };
      }

      const tiers = Array.isArray(p.tiers) ? p.tiers : [];
      const best = getBestTier(tiers);

      if (best.score > playerMap[key].bestScore) {
        playerMap[key].bestScore = best.score;
        playerMap[key].bestTag = best.tag;
        playerMap[key].note = p.note || playerMap[key].note;
        playerMap[key].region = p.region || playerMap[key].region;
      }

      playerMap[key].allTiers.push(...tiers);
    });

    displayData = Object.values(playerMap)
      .filter(p => p.name.toLowerCase().includes(search))
      .sort((a, b) => b.bestScore - a.bestScore);
  } else {
    displayData = allPlayers
      .filter(p => p.category === currentCategory)
      .filter(p => p.name && p.name.toLowerCase().includes(search))
      .map(p => ({
        firebaseId: p.id,
        name: p.name,
        rawName: p.name,
        region: p.region || "NA",
        tiers: Array.isArray(p.tiers) ? p.tiers : [],
        note: p.note || "",
        bestTag: getBestTier(Array.isArray(p.tiers) ? p.tiers : []).tag
      }));
  }

  list.innerHTML = "";

  if (!displayData.length) {
    list.innerHTML = `<div style="padding:20px;text-align:center;color:#aaa">No players found.</div>`;
    return;
  }

  displayData.forEach((p, idx) => {
    const row = document.createElement("div");
    row.className = "rank-row";

    const shownTiers = currentCategory === "Overall"
      ? [p.bestTag]
      : p.tiers;

    row.innerHTML = `
      <div class="rank-pos">${idx + 1}.</div>
      <div>
        <img src="${getPlayerSkin(p.name)}" class="player-skin" alt="skin" onerror="this.src='https://minotar.net/helm/Steve/150.png'">
      </div>
      <div class="player-main">
        <h4>${escapeHtml(p.name)}</h4>
        <p>${escapeHtml(p.note)}</p>
      </div>
      <div>
        <span class="region-badge region-${(p.region || "na").toLowerCase()}">${escapeHtml(p.region)}</span>
      </div>
      <div class="tier-tags">
        ${shownTiers.map(t => `<span class="tier-tag">${getTierIcon(currentCategory)} ${escapeHtml(t)}</span>`).join("")}
      </div>
    `;

    row.addEventListener("click", () => openPlayerModal(p));
    list.appendChild(row);
  });
}

document.getElementById("openLoginBtn").addEventListener("click", () => {
  showLoginTab();
  openAuthModal();
});

document.getElementById("openSignupBtn").addEventListener("click", () => {
  showSignupTab();
  openAuthModal();
});

document.getElementById("loginTab").addEventListener("click", showLoginTab);
document.getElementById("signupTab").addEventListener("click", showSignupTab);

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await signOut(auth);
});

document.getElementById("loginForm").addEventListener("submit", async e => {
  e.preventDefault();

  const email = document.getElementById("loginEmailInput").value.trim();
  const password = document.getElementById("loginPasswordInput").value;
  const errorBox = document.getElementById("loginError");

  try {
    await signInWithEmailAndPassword(auth, email, password);
    errorBox.classList.add("hidden");
    closeAuthModal();
    document.getElementById("loginForm").reset();
  } catch (error) {
    errorBox.textContent = error.message;
    errorBox.classList.remove("hidden");
  }
});

document.getElementById("signupForm").addEventListener("submit", async e => {
  e.preventDefault();

  const email = document.getElementById("signupEmailInput").value.trim();
  const password = document.getElementById("signupPasswordInput").value;
  const errorBox = document.getElementById("signupError");

  try {
    await createUserWithEmailAndPassword(auth, email, password);
    errorBox.classList.add("hidden");
    closeAuthModal();
    document.getElementById("signupForm").reset();
  } catch (error) {
    errorBox.textContent = error.message;
    errorBox.classList.remove("hidden");
  }
});

document.getElementById("playerForm").addEventListener("submit", async e => {
  e.preventDefault();

  if (!isEditor()) {
    alert("No permission");
    return;
  }

  const nm = document.getElementById("playerName").value.trim();
  const cat = document.getElementById("playerCategory").value;
  const reg = document.getElementById("playerRegion").value;
  const tiers = document.getElementById("playerTiers").value.split(",").map(s => s.trim()).filter(Boolean);
  const note = document.getElementById("playerNote").value.trim();

  if (!nm || !cat || !reg || !tiers.length) {
    alert("Fill fields");
    return;
  }

  await addDoc(collection(db, "players"), {
    name: nm,
    category: cat,
    region: reg,
    tiers,
    note
  });

  e.target.reset();
  loadPlayers();
});

document.getElementById("searchInput").addEventListener("input", renderPlayers);

document.querySelectorAll(".cat-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".cat-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentCategory = btn.dataset.category;
    document.getElementById("currentCategoryTitle").textContent = `${currentCategory} Rankings`;
    renderPlayers();
  });
});

onAuthStateChanged(auth, user => {
  currentUser = user;
  updateUserUI();
  renderPlayers();
});

loadPlayers();
setInterval(loadPlayers, 10000);
