import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import {
  getFirestore, collection, getDocs, addDoc, deleteDoc, doc
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

// --- Helper Functions ---
function getAccounts() { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY)) || []; }
function saveAccounts(accounts) { localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts)); }
function getSessionId() { return localStorage.getItem(SESSION_KEY); }
function setSessionId(id) { localStorage.setItem(SESSION_KEY, id); }
function clearSession() { localStorage.removeItem(SESSION_KEY); }

function getCurrentAccount() {
  const id = getSessionId();
  if (!id) return null;
  return getAccounts().find(a => a.id.toLowerCase() === id.toLowerCase()) || null;
}

function isEditor() {
  const acc = getCurrentAccount();
  return acc ? EDITOR_IDS.includes(acc.id.toLowerCase()) : false;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.innerText = str || "";
  return div.innerHTML;
}

// --- Skin & Tier Logic ---

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

// --- Auth UI ---
function openAuth() { document.getElementById("authModal").classList.remove("hidden"); }
function closeAuth() { document.getElementById("authModal").classList.add("hidden"); }
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

function updateUserUI() {
  const acc = getCurrentAccount();
  document.getElementById("currentUserId").textContent = acc ? acc.id : "Not logged in";
  document.getElementById("logoutBtn").style.display = acc ? "" : "none";
  
  if (isEditor()) {
    document.getElementById("editorMark").classList.remove("hidden");
    document.getElementById("editorPanel").classList.remove("hidden");
  } else {
    document.getElementById("editorMark").classList.add("hidden");
    document.getElementById("editorPanel").classList.add("hidden");
  }
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
    // AUTO-CALCULATE OVERALL LOGIC
    // 1. Group players by Name
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
      
      // Update best score if this entry is better
      if (tierObj.score > playerMap[name].bestScore) {
        playerMap[name].bestScore = tierObj.score;
        playerMap[name].bestTag = tierObj.tag;
        playerMap[name].tiers = tiers; // Store current best tiers list
      }

      // Collect tiers from all categories to show below
      playerMap[name].tiers.push(...tiers); 

      playerMap[name].docs.push({id: p.id, score: tierObj.score});
      // Keep highest score note
      if(playerMap[name].note === undefined && p.note) playerMap[name].note = p.note;
    });

    // 2. Convert map to array and sort
    displayData = Object.values(playerMap).sort((a, b) => {
      // Search Filter
      if (!a.displayName.toLowerCase().includes(search)) return 1;
      
      // Sort by Best Score (Desc)
      return b.bestScore - a.bestScore;
    }).filter(a => a.displayName.toLowerCase().includes(search));

    // 3. Add fake fields for rendering consistency
    displayData = displayData.map(p => ({
      firebaseId: p.docs[0].id, // Just use first ID for deleting purposes (will delete one)
      name: p.displayName,
      region: p.region || "NA",
      tiers: [...new Set(p.tiers)].slice(0, 6), // Top 6 unique tags
      note: `${p.bestTag} (${p.note || "Calculated"})`,
      rawBestTag: p.bestTag
    }));

  } else {
    // NORMAL CATEGORY LOGIC
    displayData = allPlayers
      .filter(p => p.category === currentCategory)
      .filter(p => p.name && p.name.toLowerCase().includes(search))
      .map(p => ({
        firebaseId: p.id,
        name: p.name,
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
    
    const isOverAll = (currentCategory === "Overall");
    const displayNote = isOverAll ? (p.rawBestTag || "") : (p.note || "");

    row.innerHTML = `
      <div class="rank-pos">${idx + 1}.</div>
      <div>
        <img src="${getPlayerSkin(p.name)}" class="player-skin" alt="skin" onerror="this.src='https://minotar.net/helm/MHF/150.png'">
      </div>
      <div class="player-main">
        <h4>${escapeHtml(p.name)}</h4>
        <p>${escapeHtml(displayNote)}</p>
        ${isEditor() && currentCategory !== "Overall" ? `<button class="delete-btn" onclick="deleteFn('${p.firebaseId}')">Delete</button>` : ""}
      </div>
      <div>
        <span class="region-badge region-${(p.region||"na").toLowerCase()}">${escapeHtml(p.region || "NA")}</span>
      </div>
      <div class="tier-tags">
        ${(isOverAll ? [p.rawBestTag] : p.tiers).map(t => `<span class="tier-tag">${t}</span>`).join("")}
      </div>
    `;
    list.appendChild(row);
  });
}

// --- Actions ---

window.deleteFn = async function(fid) {
  if (!isEditor()) return alert("No permission.");
  try {
    await deleteDoc(doc(db, "players", fid));
    loadPlayers();
  } catch(e) { console.error(e); }
};

document.getElementById("loginForm").onsubmit = e => {
  e.preventDefault();
  const u = document.getElementById("loginIdInput").value.trim();
  const p = document.getElementById("loginPasswordInput").value;
  const ac = getAccounts().find(x => x.id===u && x.password===p);
  if(ac){ setSessionId(u); closeAuth(); updateUserUI(); renderPlayers(); }
  else alert("Invalid login");
};

document.getElementById("signupForm").onsubmit = e => {
  e.preventDefault();
  const u = document.getElementById("signupIdInput").value.trim();
  const p = document.getElementById("signupPasswordInput").value;
  if(getAccounts().some(x => x.id===u)) return alert("Taken");
  getAccounts().push({id:u, password:p});
  saveAccounts(getAccounts());
  setSessionId(u); closeAuth(); updateUserUI(); renderPlayers();
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

document.querySelectorAll(".cat-btn").forEach(b => b.onclick = () => {
  document.querySelectorAll(".cat-btn").forEach(x => x.classList.remove("active"));
  b.classList.add("active");
  currentCategory = b.dataset.category;
  document.getElementById("currentCategoryTitle").innerText = `${currentCategory} Rankings`;
  renderPlayers();
});

// Init
if(!getCurrentAccount()) openAuth(); else updateUserUI();
showLoginTab();
loadPlayers();
setInterval(loadPlayers, 10000); // Refresh every 10s
