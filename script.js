import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  query,
  where,
  deleteDoc,
  doc
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

/*
Correct order:
HT1
LT1
HT2
LT2
HT3
LT3
HT4
LT4
HT5
LT5
*/
const tierScores = {
  HT1: 100,
  LT1: 95,
  HT2: 90,
  LT2: 85,
  HT3: 80,
  LT3: 75,
  HT4: 70,
  LT4: 65,
  HT5: 60,
  LT5: 55,
  "-": 0
};

function escapeHtml(str) {
  const div = document.createElement("div");
  div.innerText = str || "";
  return div.innerHTML;
}

function getPlayerSkin(username) {
  return `https://minotar.net/helm/${username}/150.png`;
}

function normalizeTier(tier) {
  return String(tier || "").trim().toUpperCase();
}

function getBestTier(tierArray) {
  if (!Array.isArray(tierArray) || tierArray.length === 0) {
    return { score: 0, tag: "-" };
  }

  let bestTag = "-";
  let bestScore = 0;

  tierArray.forEach(t => {
    const clean = normalizeTier(t);
    const score = tierScores[clean] || 0;
    if (score > bestScore) {
      bestScore = score;
      bestTag = clean;
    }
  });

  return { score: bestScore, tag: bestTag };
}

function sortTiersBestFirst(tiers) {
  return [...tiers].sort((a, b) => {
    const scoreA = tierScores[normalizeTier(a)] || 0;
    const scoreB = tierScores[normalizeTier(b)] || 0;
    return scoreB - scoreA;
  });
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

function getCategoryIconPath(category) {
  const icons = {
    Overall: "icons/overall.png",
    Cart: "icons/cart.png",
    Vanilla: "icons/vanilla.png",
    UHC: "icons/uhc.png",
    Pot: "icons/pot.png",
    NethOP: "icons/nethop.png",
    SMP: "icons/smp.png",
    Sword: "icons/sword.png",
    Axe: "icons/axe.png",
    Mace: "icons/mace.png"
  };
  return icons[category] || "icons/overall.png";
}

function getTierIcon(category) {
  return `<img src="${getCategoryIconPath(category)}" class="tier-icon" alt="${category}">`;
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

function closePlayerModal() {
  const overlay = document.querySelector(".row-modal-overlay");
  if (overlay) overlay.remove();
}

function openPlayerModal(playerData) {
  closePlayerModal();

  const categoryMap = {};
  allPlayers
    .filter(p => p.name && p.name.toLowerCase() === playerData.rawName.toLowerCase())
    .forEach(p => {
      if (!categoryMap[p.category]) categoryMap[p.category] = [];
      if (Array.isArray(p.tiers)) categoryMap[p.category].push(...p.tiers.map(normalizeTier));
    });

  Object.keys(categoryMap).forEach(cat => {
    categoryMap[cat] = [...new Set(sortTiersBestFirst(categoryMap[cat]))];
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
            <h4>${getTierIcon("Overall")} Overall</h4>
            <div class="tier-tags">
              <span class="tier-tag">${getTierIcon("Overall")} ${escapeHtml(playerData.bestTag || "-")}</span>
            </div>
          </div>

          ${Object.keys(categoryMap).map(cat => `
            <div class="row-modal-category">
              <h4><img src="${getCategoryIconPath(cat)}" alt="${cat}"> ${escapeHtml(cat)}</h4>
              <div class="tier-tags">
                ${categoryMap[cat].map(t => `
                  <span class="tier-tag">${getTierIcon(cat)} ${escapeHtml(t)}</span>
                `).join("")}
              </div>
            </div>
          `).join("")}
        </div>

        <button id="closePlayerModalBtn" class="ghost-btn" style="margin-top:20px;">Close</button>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHTML);

  document.getElementById("closePlayerModalBtn").addEventListener("click", closePlayerModal);
  document.getElementById("playerDetailsOverlay").addEventListener("click", function (e) {
    if (e.target.id === "playerDetailsOverlay") closePlayerModal();
  });
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
          note: p.note || ""
        };
      }

      const tiers = Array.isArray(p.tiers) ? p.tiers.map(normalizeTier) : [];
      const best = getBestTier(tiers);

      if (best.score > playerMap[key].bestScore) {
        playerMap[key].bestScore = best.score;
        playerMap[key].bestTag = best.tag;
        playerMap[key].note = p.note || playerMap[key].note;
        playerMap[key].region = p.region || playerMap[key].region;
      }
    });

    displayData = Object.values(playerMap)
      .filter(p => p.name.toLowerCase().includes(search))
      .sort((a, b) => b.bestScore - a.bestScore);
  } else {
    displayData = allPlayers
      .filter(p => p.category === currentCategory)
      .filter(p => p.name && p.name.toLowerCase().includes(search))
      .map(p => {
        const normalizedTiers = Array.isArray(p.tiers) ? p.tiers.map(normalizeTier) : [];
        return {
          firebaseId: p.id,
          name: p.name,
          rawName: p.name,
          region: p.region || "NA",
          tiers: sortTiersBestFirst(normalizedTiers),
          note: p.note || "",
          bestTag: getBestTier(normalizedTiers).tag
        };
      })
      .sort((a, b) => getBestTier(b.tiers).score - getBestTier(a.tiers).score);
  }

  list.innerHTML = "";

  if (!displayData.length) {
    list.innerHTML = `<div style="padding:20px;text-align:center;color:#aaa">No players found.</div>`;
    return;
  }

  displayData.forEach((p, idx) => {
    const row = document.createElement("div");
    row.className = "rank-row";

    const shownTiers = currentCategory === "Overall" ? [p.bestTag] : p.tiers;

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
  const tiers = document.getElementById("playerTiers").value
    .split(",")
    .map(normalizeTier)
    .filter(Boolean);
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

document.getElementById("removeRankForm").addEventListener("submit", async e => {
  e.preventDefault();

  if (!isEditor()) {
    alert("No permission");
    return;
  }

  const name = document.getElementById("removePlayerName").value.trim().toLowerCase();
  const category = document.getElementById("removePlayerCategory").value;

  if (!name || !category) {
    alert("Fill fields");
    return;
  }

  try {
    const q = query(
      collection(db, "players"),
      where("category", "==", category),
      where("name", "==", document.getElementById("removePlayerName").value.trim())
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      alert("No matching player rank found.");
      return;
    }

    for (const playerDoc of snapshot.docs) {
      await deleteDoc(doc(db, "players", playerDoc.id));
    }

    document.getElementById("removeRankForm").reset();
    await loadPlayers();
    alert("Player rank removed.");
  } catch (error) {
    console.error(error);
    alert("Error removing rank.");
  }
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
