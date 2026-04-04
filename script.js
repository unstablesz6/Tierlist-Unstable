import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import {
  getFirestore, collection, getDocs, addDoc, deleteDoc, doc
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, updateProfile
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

// Approved editor emails
const EDITOR_EMAILS = [
  "wemmbu@unstablesz6.com",
  "kaiser@unstablesz6.com"
];

let currentCategory = "Overall";
let allPlayers = [];
let currentUser = null;

// --- Helper Functions ---
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
  "LT1": 70,  "LT2": 60, "LT3": 50,
  "LT4": 40,  "LT5": 30,
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

// --- Modal Functions ---
function openAuthModal() { document.getElementById("authModal").classList.remove("hidden"); }
function closeAuthModal() { document.getElementById("authModal").classList.add("hidden"); }

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

// --- Player Detail Modal ---
function openPlayerModal(playerData) {
  const overlay = document.querySelector(".row-modal-overlay");
  if (overlay) overlay.remove();

  // Gather all tiers for this player across categories
  const categoryMap = {};
  allPlayers.filter(p => p.name === playerData.rawName).forEach(p => {
    const cat = p.category;
    if (!categoryMap[cat]) categoryMap[cat] = [];
    if (p.tiers && Array.isArray(p.tiers)) {
      categoryMap[cat].push(...p.tiers);
    }
  });

  const uniqueCategories = Object.keys(categoryMap).sort((a, b) => {
    const scoreA = Math.max(...(categoryMap[a].map(t => tierScores[t] || 0)));
    const scoreB = Math.max(...(categoryMap[b].map(t => tierScores[t] || 0)));
    return scoreB - scoreA;
  });

  const modalHTML = `
    <div class="row-modal-overlay">
      <div class="row-modal-box">
        <div class="row-modal-header">
          <img src="${getPlayerSkin(playerData.name)}" class="row-modal-avatar" alt="skin">
          <div>
            <h2>${escapeHtml(playerData.name)}</h2>
            <p style="color:var(--muted);margin:4px 0 0">${escapeHtml(playerData.note || "")}</p>
          </div>
        </div>
        <div class="row-modal-tiers">
          ${uniqueCategories.map(cat => `
            <div class="row-modal-category">
              <h4>${getCategoryIcon(cat)} ${escapeHtml(cat)}</h4>
              <div class="tier-tags">
                ${[...new Set(categoryMap[cat])].slice(0, 6).map(t => `<span class="tier-tag">${getTierIcon(cat)}${t}</span>`).join("")}
              </div>
            </div>
          `).join("")}
        </div>
        <button onclick="closePlayerModal()" style="margin-top:20px;background:#2a3355">Close</button>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHTML);
}

function closePlayerModal() {
  const overlay = document.querySelector(".row-modal-overlay");
  if (overlay) overlay.remove();
}

function getCategoryIcon(category) {
  const icons = {
    "Cart": "🛒",
    "Vanilla": "🛡",
    "UHC": "❤",
    "Pot": "🧪",
    "NethOP": "☠",
    "SMP": "🟢",
    "Sword": "🗡",
    "Axe": "🔨",
    "Mace": "🔩",
    "Overall": "🏆"
  };
  return icons[category] || "🎮";
}

function getTierIcon(category) {
  const icons = {
    "Sword": "🗡",
    "Axe": "🔨",
    "Mace": "🔩",
    "Vanilla": "💎",
    "Pot": "⚗️",
    "UHC": "🐑",
    "Cart": "🛒"
  };
  return icons[category] || "";
}

// --- Data Loading ---
async function loadPlayers() {
  try {
    const snapshot = await getDocs(collection(db, "players"));
    allPlayers = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    renderPlayers();
  } catch (err) {
    console.error("Error loading:", err);
  }
}

// --- Rendering ---
function renderPlayers() {
  const list = document.getElementById("rankingList");
  const search = document.getElementById("searchInput").value.trim().toLowerCase();
  let displayData = [];

  if (currentCategory === "Overall") {
    const playerMap = {};
    
    allPlayers.forEach(p => {
      if (!p.name) return;
      const name = p.name.trim().toLowerCase();
      
      if (!playerMap[name]) {
        playerMap[name] = { 
          displayName: p.name, 
          rawName: p.name,
          bestScore: 0, 
          bestTag: "-", 
          region: p.region,
          tiers: [],
          note: p.note,
          docs: [] 
        };
      }
      
      const tiers = Array.isArray(p.tiers) ? p.tiers : [];
      const tierObj = getBestTier(tiers);
      
      if (tierObj.score > playerMap[name].bestScore) {
        playerMap[name].bestScore = tierObj.score;
        playerMap[name].bestTag = tierObj.tag;
      }

      playerMap[name].tiers.push(...tiers); 

      playerMap[name].docs.push({id: p.id, score: tierObj.score});
      if(playerMap[name].note === undefined && p.note) playerMap[name].note = p.note;
    });

    displayData = Object.values(playerMap).sort((a, b) => {
      if (!a.displayName.toLowerCase().includes(search)) return 1;
      return b.bestScore - a.bestScore;
    }).filter(a => a.displayName.toLowerCase().includes(search));

    displayData = displayData.map(p => ({
      firebaseId: p.docs[0].id,
      name: p.displayName,
      rawName: p.displayName,
      region: p.region || "NA",
      tiers: [...new Set(p.tiers)].slice(0, 6),
      note: `${p.bestTag} (${p.note || "Calculated"})`,
      bestTag: p.bestTag
    }));

  } else {
    displayData = allPlayers
      .filter(p => p.category === currentCategory)
      .filter(p => p.name && p.name.toLowerCase().includes(search))
      .map(p => ({
        firebaseId: p.id,
        name: p.name,
        rawName: p.name,
        region: p.region,
        tiers: Array.isArray(p.tiers) ? p.tiers : [],
        note: p.note
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
    
    row.innerHTML = `
      <div class="rank-pos">${idx + 1}.</div>
      <div>
        <img src="${getPlayerSkin(p.name)}" class="player-skin" alt="skin" onerror="this.src='https://minotar.net/helm/MHF/150.png'">
      </div>
      <div class="player-main">
        <h4>${escapeHtml(p.name)}</h4>
        <p>${escapeHtml(p.note || "")}</p>
      </div>
      <div>
        <span class="region-badge region-${(p.region||"na").toLowerCase()}">${escapeHtml(p.region || "NA")}</span>
      </div>
      <div class="tier-tags">
        ${(currentCategory === "Overall" ? [p.bestTag] : p.tiers).map(t => `<span class="tier-tag">${getTierIcon(currentCategory)}${t}</span>`).join("")}
      </div>
    `;
    
    row.onclick = () => openPlayerModal(p);
    
    list.appendChild(row);
  });
}

// --- Actions ---
window.closePlayerModal = closePlayerModal;

document.getElementById("loginForm").onsubmit = async e => {
  e.preventDefault();
  const email = document.getElementById("loginEmailInput").value.trim();
  const password = document.getElementById("loginPasswordInput").value;
  
  try {
    await signInWithEmailAndPassword(auth, email, password);
    closeAuthModal();
    document.getElementById("logoutBtn").classList.remove("hidden");
    updateUserUI();
    loadPlayers();
  } catch (error) {
    document.getElementById("loginError").textContent = error.message;
    document.getElementById("loginError").classList.remove("hidden");
  }
};

document.getElementById("signupForm").onsubmit = async e => {
  e.preventDefault();
  const email = document.getElementById("signupEmailInput").value.trim();
  const password = document.getElementById("signupPasswordInput").value;
  
  try {
    await createUserWithEmailAndPassword(auth, email, password);
    closeAuthModal();
    document.getElementById("logoutBtn").classList.remove("hidden");
    updateUserUI();
    loadPlayers();
  } catch (error) {
    document.getElementById("signupError").textContent = error.message;
    document.getElementById("signupError").classList.remove("hidden");
  }
};

document.getElementById("logoutBtn").onclick = () => {
  signOut(auth);
  document.getElementById("logoutBtn").classList.add("hidden");
  updateUserUI();
};

document.getElementById("playerForm").onsubmit = async e => {
  e.preventDefault();
  if(!isEditor()) return alert("No permission");
  
  const nm = document.getElementById("playerName").value.trim();
  const cat = document.getElementById("playerCategory").value;
  const reg = document.getElementById("playerRegion").value;
  const tiers = document.getElementById("playerTiers").value.split(",").map(s=>s.trim()).filter(Boolean);
  const note = document.getElementById("playerNote").value.trim();
  
  if(!nm || !cat || !reg || !tiers.length) return alert("Fill fields");
  
  await addDoc(collection(db,"players"), {name:nm, category:cat, region:reg, tiers:tiers, note:note});
  e.target.reset();
  loadPlayers();
};

window.deleteFn = async function(fid) {
  if (!isEditor()) return alert("No permission");
  try {
    await deleteDoc(doc(db, "players", fid));
    loadPlayers();
  } catch(e) { console.error(e); }
};

document.querySelectorAll(".cat-btn").forEach(b => {
  b.onclick = () => {
    document.querySelectorAll(".cat-btn").forEach(x => x.classList.remove("active"));
    b.classList.add("active");
    currentCategory = b.dataset.category;
    document.getElementById("currentCategoryTitle").innerText = `${currentCategory} Rankings`;
    renderPlayers();
  };
});

// --- Auth State Observer ---
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  
  if (user) {
    document.getElementById("logoutBtn").classList.remove("hidden");
  } else {
    document.getElementById("logoutBtn").classList.add("hidden");
    openAuthModal();
  }
  
  updateUserUI();
  renderPlayers();
});

function updateUserUI() {
  const acc = currentUser;
  document.getElementById("logoutBtn").style.display = acc ? "" : "none";
  
  if (isEditor()) {
    document.getElementById("editorPanel").classList.remove("hidden");
  } else {
    document.getElementById("editorPanel").classList.add("hidden");
  }
}

// --- Init ---
if(!currentUser) openAuthModal();
updateUserUI();
loadPlayers();
setInterval(loadPlayers, 10000);
