import { useState, useEffect, useRef } from "react";
import { auth, db } from "./firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "firebase/auth";
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where, setDoc, getDoc } from "firebase/firestore";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const CATEGORIES = ["Study", "Fitness", "Work", "Personal", "Health", "Finance", "Creative"];
const PRIORITIES = ["Low", "Medium", "High", "Critical"];
const CATEGORY_COLORS = {
  Study: "#6EE7F7", Fitness: "#86EFAC", Work: "#FCD34D",
  Personal: "#F9A8D4", Health: "#FDA4AF", Finance: "#A5B4FC", Creative: "#FDE68A"
};
const BADGES = [
  { id: "first_goal", name: "First Step", icon: "🎯", desc: "Complete your first goal", xp: 50 },
  { id: "streak_3", name: "On Fire", icon: "🔥", desc: "3-day streak", xp: 100 },
  { id: "streak_7", name: "Week Warrior", icon: "⚡", desc: "7-day streak", xp: 200 },
  { id: "streak_30", name: "Monthly Master", icon: "🏆", desc: "30-day streak", xp: 500 },
  { id: "goals_10", name: "Goal Getter", icon: "💪", desc: "Complete 10 goals", xp: 150 },
  { id: "perfect_week", name: "Perfect Week", icon: "🌟", desc: "Complete all goals for 7 days", xp: 300 },
  { id: "early_bird", name: "Early Bird", icon: "🌅", desc: "Complete a goal before 9am", xp: 75 },
  { id: "all_categories", name: "Renaissance", icon: "🎨", desc: "Goals in all categories", xp: 250 },
];

function getLevel(xp) { return Math.floor(xp / 200) + 1; }
function getLevelProgress(xp) { return ((xp % 200) / 200) * 100; }
function getLevelTitle(level) {
  const titles = ["Beginner", "Apprentice", "Practitioner", "Expert", "Master", "Legend", "Mythic", "Transcendent"];
  return titles[Math.min(level - 1, titles.length - 1)];
}
function todayKey() { return new Date().toISOString().split("T")[0]; }

// ─── ICONS ────────────────────────────────────────────────────────────────────
const Icon = ({ name, size = 16, color = "currentColor" }) => {
  const icons = {
    home: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    target: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
    chart: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
    trophy: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="8 21 12 21 16 21"/><line x1="12" y1="17" x2="12" y2="21"/><path d="M7 4H17l-1 7a4 4 0 0 1-8 0L7 4z"/><path d="M5 4h2M17 4h2M5 4a2 2 0 0 0-2 2v1a4 4 0 0 0 4 4h.5M19 4a2 2 0 0 1 2 2v1a4 4 0 0 1-4 4h-.5"/></svg>,
    plus: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    check: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
    flame: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>,
    settings: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
    moon: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
    sun: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
    search: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    edit: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    trash: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
    x: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    user: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    lock: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
    mail: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
    zap: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
    calendar: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    trending: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
    award: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>,
    refresh: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>,
    logout: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  };
  return icons[name] || null;
};

// ─── CIRCULAR PROGRESS ────────────────────────────────────────────────────────
const CircularProgress = ({ pct, size = 80, stroke = 7, color = "#6EE7F7", bg = "rgba(255,255,255,0.08)" }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={bg} strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)" }} />
    </svg>
  );
};

// ─── HEATMAP ──────────────────────────────────────────────────────────────────
const Heatmap = ({ data, dark }) => {
  const weeks = [];
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - 364);
  startDate.setDate(startDate.getDate() - startDate.getDay());
  for (let w = 0; w < 53; w++) {
    const days = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + w * 7 + d);
      const key = date.toISOString().split("T")[0];
      days.push({ key, count: data[key] || 0 });
    }
    weeks.push(days);
  }
  const getColor = (count) => {
    if (count === 0) return dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";
    if (count === 1) return "rgba(110,231,247,0.3)";
    if (count === 2) return "rgba(110,231,247,0.5)";
    if (count === 3) return "rgba(110,231,247,0.7)";
    return "rgba(110,231,247,1)";
  };
  return (
    <div style={{ overflowX: "auto", paddingBottom: 8 }}>
      <div style={{ display: "flex", gap: 3 }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {week.map((day, di) => (
              <div key={di} title={`${day.key}: ${day.count} goals`}
                style={{ width: 12, height: 12, borderRadius: 2, background: getColor(day.count), cursor: "pointer", transition: "transform 0.1s" }}
                onMouseEnter={e => e.target.style.transform = "scale(1.4)"}
                onMouseLeave={e => e.target.style.transform = "scale(1)"} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function GoalTracker() {
  const [dark, setDark] = useState(true);
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [screen, setScreen] = useState("login");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [goals, setGoals] = useState([]);
  const [userData, setUserData] = useState({ xp: 0, streak: 0, longestStreak: 0, unlockedBadges: [], heatmap: {}, lastLogin: "" });
  const [showForm, setShowForm] = useState(false);
  const [editGoal, setEditGoal] = useState(null);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("All");
  const [filterType, setFilterType] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [sortBy, setSortBy] = useState("deadline");
  const [notification, setNotification] = useState(null);
  const [showProgressModal, setShowProgressModal] = useState(null);
  const [progressInput, setProgressInput] = useState("");
  const [authData, setAuthData] = useState({ email: "", password: "", name: "" });
  const [authError, setAuthError] = useState("");
  const [authScreen, setAuthScreen] = useState("login");
  const [pomodoroTime, setPomodoroTime] = useState(25 * 60);
  const [pomodoroRunning, setPomodoroRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const pomodoroRef = useRef(null);

  const C = {
    bg: dark ? "#0A0B0F" : "#F4F5F9",
    surface: dark ? "#13151C" : "#FFFFFF",
    surface2: dark ? "#1C1F2B" : "#F0F1F7",
    border: dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)",
    text: dark ? "#E8EAED" : "#1A1B2E",
    muted: dark ? "rgba(232,234,237,0.45)" : "rgba(26,27,46,0.45)",
    accent: "#6EE7F7", accent2: "#A78BFA", accent3: "#86EFAC",
    danger: "#FF6B6B", warning: "#FCD34D",
  };

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setAuthUser(user);
      setAuthLoading(false);
      if (user) {
        setScreen("app");
        await loadUserData(user.uid);
        await loadGoals(user.uid);
        await updateStreak(user.uid);
      } else {
        setScreen("login");
        setGoals([]);
        setUserData({ xp: 0, streak: 0, longestStreak: 0, unlockedBadges: [], heatmap: {}, lastLogin: "" });
      }
    });
    return () => unsub();
  }, []);

  // Pomodoro
  useEffect(() => {
    if (pomodoroRunning) {
      pomodoroRef.current = setInterval(() => {
        setPomodoroTime(t => {
          if (t <= 1) { clearInterval(pomodoroRef.current); setPomodoroRunning(false); showNotif("🍅 Pomodoro complete! Take a 5-min break."); return 25 * 60; }
          return t - 1;
        });
      }, 1000);
    } else clearInterval(pomodoroRef.current);
    return () => clearInterval(pomodoroRef.current);
  }, [pomodoroRunning]);

  const showNotif = (msg) => { setNotification(msg); setTimeout(() => setNotification(null), 4000); };

  // ── FIRESTORE HELPERS ──────────────────────────────────────────────────────
  const loadUserData = async (uid) => {
    try {
      const ref = doc(db, "users", uid);
      const snap = await getDoc(ref);
      if (snap.exists()) setUserData(snap.data());
      else {
        const init = { xp: 0, streak: 0, longestStreak: 0, unlockedBadges: [], heatmap: {}, lastLogin: todayKey() };
        await setDoc(ref, init);
        setUserData(init);
      }
    } catch (e) { console.error(e); }
  };

  const saveUserData = async (uid, data) => {
    try { await setDoc(doc(db, "users", uid), data, { merge: true }); } catch (e) { console.error(e); }
  };

  const loadGoals = async (uid) => {
    try {
      const q = query(collection(db, "goals"), where("userId", "==", uid));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ ...d.data(), firestoreId: d.id }));
      setGoals(list);
    } catch (e) { console.error(e); }
  };

  const updateStreak = async (uid) => {
    try {
      const ref = doc(db, "users", uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) return;
      const data = snap.data();
      const today = todayKey();
      const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
      const yKey = yesterday.toISOString().split("T")[0];
      if (data.lastLogin === today) return;
      let newStreak = data.streak || 0;
      if (data.lastLogin === yKey) newStreak += 1;
      else if (data.lastLogin !== today) newStreak = 1;
      const newLongest = Math.max(newStreak, data.longestStreak || 0);
      const updated = { ...data, streak: newStreak, longestStreak: newLongest, lastLogin: today };
      await setDoc(ref, updated, { merge: true });
      setUserData(updated);
    } catch (e) { console.error(e); }
  };

  const addXP = async (amount) => {
    if (!authUser) return;
    const newXP = (userData.xp || 0) + amount;
    const updated = { ...userData, xp: newXP };
    setUserData(updated);
    await saveUserData(authUser.uid, { xp: newXP });
  };

  const updateHeatmap = async () => {
    if (!authUser) return;
    const today = todayKey();
    const newHeatmap = { ...(userData.heatmap || {}), [today]: (userData.heatmap?.[today] || 0) + 1 };
    const updated = { ...userData, heatmap: newHeatmap };
    setUserData(updated);
    await saveUserData(authUser.uid, { heatmap: newHeatmap });
  };

  const checkBadges = async (completedCount) => {
    if (!authUser) return;
    const badges = [...(userData.unlockedBadges || [])];
    let earned = false;
    if (completedCount >= 1 && !badges.includes("first_goal")) { badges.push("first_goal"); earned = true; showNotif("🎯 Badge unlocked: First Step! +50 XP"); await addXP(50); }
    if (completedCount >= 10 && !badges.includes("goals_10")) { badges.push("goals_10"); earned = true; showNotif("💪 Badge unlocked: Goal Getter! +150 XP"); await addXP(150); }
    if ((userData.streak || 0) >= 3 && !badges.includes("streak_3")) { badges.push("streak_3"); earned = true; showNotif("🔥 Badge unlocked: On Fire! +100 XP"); await addXP(100); }
    if ((userData.streak || 0) >= 7 && !badges.includes("streak_7")) { badges.push("streak_7"); earned = true; showNotif("⚡ Badge unlocked: Week Warrior! +200 XP"); await addXP(200); }
    if (earned) { const updated = { ...userData, unlockedBadges: badges }; setUserData(updated); await saveUserData(authUser.uid, { unlockedBadges: badges }); }
  };

  // ── AUTH ───────────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!authData.email || !authData.password) { setAuthError("All fields required"); return; }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, authData.email, authData.password);
      setAuthError("");
      showNotif("✅ Welcome back! Let's crush your goals today.");
    } catch (e) {
      setAuthError("Invalid email or password!");
    }
    setLoading(false);
  };

  const handleSignup = async () => {
    if (!authData.name || !authData.email || !authData.password) { setAuthError("All fields required"); return; }
    if (authData.password.length < 6) { setAuthError("Password must be 6+ characters"); return; }
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, authData.email, authData.password);
      await updateProfile(cred.user, { displayName: authData.name });
      setAuthError("");
      showNotif("🎉 Account created! Your journey begins now.");
    } catch (e) {
      if (e.code === "auth/email-already-in-use") setAuthError("Email already registered!");
      else setAuthError("Signup failed. Try again!");
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await signOut(auth);
    setActiveTab("dashboard");
    showNotif("👋 Logged out successfully!");
  };

  // ── GOAL CRUD ──────────────────────────────────────────────────────────────
  const saveGoal = async (goal) => {
    if (!authUser) return;
    if (editGoal) {
      const ref = doc(db, "goals", editGoal.firestoreId);
      await updateDoc(ref, goal);
      setGoals(gs => gs.map(g => g.firestoreId === editGoal.firestoreId ? { ...g, ...goal } : g));
      showNotif("✏️ Goal updated!");
    } else {
      const newG = { ...goal, progress: 0, completed: false, createdAt: new Date().toISOString(), userId: authUser.uid };
      const docRef = await addDoc(collection(db, "goals"), newG);
      setGoals(gs => [...gs, { ...newG, firestoreId: docRef.id }]);
      await addXP(10);
      showNotif("🎯 New goal created! +10 XP");
    }
    setShowForm(false);
    setEditGoal(null);
  };

  const deleteGoal = async (firestoreId) => {
    await deleteDoc(doc(db, "goals", firestoreId));
    setGoals(gs => gs.filter(g => g.firestoreId !== firestoreId));
    showNotif("🗑 Goal removed.");
  };

  const toggleGoal = async (firestoreId) => {
    const goal = goals.find(g => g.firestoreId === firestoreId);
    if (!goal) return;
    const nowDone = !goal.completed;
    const newProgress = nowDone ? goal.target : goal.progress;
    await updateDoc(doc(db, "goals", firestoreId), { completed: nowDone, progress: newProgress });
    setGoals(gs => gs.map(g => g.firestoreId === firestoreId ? { ...g, completed: nowDone, progress: newProgress } : g));
    if (nowDone) {
      await addXP(50);
      await updateHeatmap();
      const totalDone = goals.filter(g => g.completed).length + 1;
      await checkBadges(totalDone);
      showNotif("🎯 Goal completed! +50 XP");
    }
  };

  const updateProgress = async () => {
    const val = parseFloat(progressInput);
    if (isNaN(val) || !showProgressModal) return;
    const goal = showProgressModal;
    const newProg = Math.min(val, goal.target);
    const done = newProg >= goal.target;
    await updateDoc(doc(db, "goals", goal.firestoreId), { progress: newProg, completed: done });
    setGoals(gs => gs.map(g => g.firestoreId === goal.firestoreId ? { ...g, progress: newProg, completed: done } : g));
    if (done && !goal.completed) {
      await addXP(50);
      await updateHeatmap();
      showNotif("🎯 Goal completed! +50 XP");
    }
    setShowProgressModal(null);
    setProgressInput("");
  };

  // ── COMPUTED ───────────────────────────────────────────────────────────────
  const completedCount = goals.filter(g => g.completed).length;
  const totalGoals = goals.length;
  const productivityScore = Math.round((completedCount / Math.max(totalGoals, 1)) * 100);

  const filteredGoals = goals.filter(g => {
    const matchSearch = g.title?.toLowerCase().includes(search.toLowerCase()) || g.desc?.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === "All" || g.category === filterCat;
    const matchType = filterType === "All" || g.type === filterType;
    const matchStatus = filterStatus === "All" || (filterStatus === "completed" ? g.completed : !g.completed);
    return matchSearch && matchCat && matchType && matchStatus;
  }).sort((a, b) => {
    if (sortBy === "deadline") return new Date(a.deadline) - new Date(b.deadline);
    if (sortBy === "priority") return PRIORITIES.indexOf(b.priority) - PRIORITIES.indexOf(a.priority);
    if (sortBy === "progress") return (b.progress / b.target) - (a.progress / a.target);
    return 0;
  });

  // ── LOADING ────────────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0A0B0F", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 50, height: 50, borderRadius: 14, background: "linear-gradient(135deg, #6EE7F7, #A78BFA)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", animation: "spin 1s linear infinite" }}>
            <Icon name="target" size={24} color="#0A0B0F" />
          </div>
          <p style={{ color: "rgba(232,234,237,0.5)", fontFamily: "sans-serif" }}>Loading GoalFlow...</p>
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── AUTH SCREEN ────────────────────────────────────────────────────────────
  if (screen === "login" || screen === "signup" || !authUser) {
    return (
      <div style={{ minHeight: "100vh", background: dark ? "#0A0B0F" : "#F4F5F9", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif", padding: 16 }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          @keyframes fadeIn { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
          @keyframes glow { 0%,100% { box-shadow: 0 0 20px rgba(110,231,247,0.2); } 50% { box-shadow: 0 0 40px rgba(110,231,247,0.4); } }
          @keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.05); } }
          .auth-input { width: 100%; padding: 13px 16px 13px 42px; border-radius: 12px; border: 1.5px solid ${dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)"}; background: ${dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)"}; color: ${dark ? "#E8EAED" : "#1A1B2E"}; font-size: 14px; font-family: 'DM Sans', sans-serif; outline: none; transition: border-color 0.2s; }
          .auth-input:focus { border-color: #6EE7F7; }
          .auth-input::placeholder { color: ${dark ? "rgba(232,234,237,0.3)" : "rgba(26,27,46,0.3)"}; }
          .btn-primary { background: linear-gradient(135deg, #6EE7F7, #A78BFA); border: none; color: #0A0B0F; font-weight: 700; cursor: pointer; border-radius: 12px; padding: 14px; font-size: 15px; width: 100%; transition: all 0.2s; font-family: 'DM Sans', sans-serif; }
          .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(110,231,247,0.35); }
          .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        `}</style>
        <div style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
          <div style={{ position: "absolute", top: "15%", left: "15%", width: 300, height: 300, borderRadius: "50%", background: "rgba(110,231,247,0.06)", filter: "blur(80px)", animation: "pulse 4s ease-in-out infinite" }} />
          <div style={{ position: "absolute", bottom: "20%", right: "15%", width: 250, height: 250, borderRadius: "50%", background: "rgba(167,139,250,0.06)", filter: "blur(80px)", animation: "pulse 6s ease-in-out infinite 1s" }} />
        </div>
        <div style={{ width: "100%", maxWidth: 420, animation: "fadeIn 0.5s ease" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={{ width: 60, height: 60, borderRadius: 18, background: "linear-gradient(135deg, #6EE7F7, #A78BFA)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", animation: "glow 3s ease-in-out infinite" }}>
              <Icon name="target" size={28} color="#0A0B0F" />
            </div>
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, color: dark ? "#E8EAED" : "#1A1B2E", letterSpacing: -0.5 }}>GoalFlow</h1>
            <p style={{ color: dark ? "rgba(232,234,237,0.45)" : "rgba(26,27,46,0.45)", fontSize: 14, marginTop: 6 }}>Turn intentions into achievements</p>
          </div>
          <div style={{ background: dark ? "rgba(19,21,28,0.8)" : "rgba(255,255,255,0.9)", border: `1.5px solid ${dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)"}`, borderRadius: 20, padding: 32, backdropFilter: "blur(20px)" }}>
            <div style={{ display: "flex", background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)", borderRadius: 12, padding: 4, marginBottom: 28, gap: 4 }}>
              {["login", "signup"].map(s => (
                <button key={s} onClick={() => { setAuthScreen(s); setAuthError(""); }}
                  style={{ flex: 1, padding: "9px 0", borderRadius: 9, border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, transition: "all 0.2s", background: authScreen === s ? "linear-gradient(135deg, #6EE7F7, #A78BFA)" : "transparent", color: authScreen === s ? "#0A0B0F" : dark ? "rgba(232,234,237,0.5)" : "rgba(26,27,46,0.5)" }}>
                  {s === "login" ? "Sign In" : "Sign Up"}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {authScreen === "signup" && (
                <div style={{ position: "relative" }}>
                  <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", opacity: 0.4 }}><Icon name="user" size={16} color={dark ? "#E8EAED" : "#1A1B2E"} /></div>
                  <input className="auth-input" placeholder="Full name" value={authData.name} onChange={e => setAuthData(d => ({ ...d, name: e.target.value }))} />
                </div>
              )}
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", opacity: 0.4 }}><Icon name="mail" size={16} color={dark ? "#E8EAED" : "#1A1B2E"} /></div>
                <input className="auth-input" placeholder="Email address" type="email" value={authData.email} onChange={e => setAuthData(d => ({ ...d, email: e.target.value }))} />
              </div>
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", opacity: 0.4 }}><Icon name="lock" size={16} color={dark ? "#E8EAED" : "#1A1B2E"} /></div>
                <input className="auth-input" placeholder="Password (min 6 chars)" type="password" value={authData.password} onChange={e => setAuthData(d => ({ ...d, password: e.target.value }))} onKeyDown={e => e.key === "Enter" && (authScreen === "login" ? handleLogin() : handleSignup())} />
              </div>
              {authError && <p style={{ color: "#FF6B6B", fontSize: 13, textAlign: "center" }}>{authError}</p>}
              <button className="btn-primary" style={{ marginTop: 4 }} disabled={loading} onClick={authScreen === "login" ? handleLogin : handleSignup}>
                {loading ? "Please wait..." : authScreen === "login" ? "Sign In →" : "Create Account →"}
              </button>
            </div>
          </div>
          <p style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: dark ? "rgba(232,234,237,0.25)" : "rgba(26,27,46,0.25)" }}>JWT-secured • End-to-end encrypted • GDPR compliant</p>
        </div>
      </div>
    );
  }

  // ── MAIN APP ───────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans', sans-serif", color: C.text, display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input, textarea, select { font-family: 'DM Sans', sans-serif; }
        input::placeholder, textarea::placeholder { color: ${C.muted}; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(110,231,247,0.2); border-radius: 10px; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes slideDown { from { opacity:0; transform:translateY(-12px); } to { opacity:1; transform:translateY(0); } }
        .card { background: ${C.surface}; border: 1.5px solid ${C.border}; border-radius: 18px; padding: 22px; transition: all 0.2s; }
        .card:hover { border-color: rgba(110,231,247,0.15); }
        .btn { border: none; cursor: pointer; font-family: 'DM Sans', sans-serif; font-weight: 600; border-radius: 10px; transition: all 0.18s; }
        .btn:hover { transform: translateY(-1px); }
        .btn-accent { background: linear-gradient(135deg, #6EE7F7, #A78BFA); color: #0A0B0F; }
        .btn-ghost { background: ${dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}; color: ${C.text}; }
        .btn-ghost:hover { background: ${dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.09)"}; }
        .input { width: 100%; padding: 11px 14px; border-radius: 10px; border: 1.5px solid ${C.border}; background: ${dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)"}; color: ${C.text}; font-size: 14px; outline: none; transition: border-color 0.2s; }
        .input:focus { border-color: #6EE7F7; }
        select option { background: ${dark ? "#13151C" : "#fff"}; }
        .progress-bar { transition: width 0.8s cubic-bezier(0.4,0,0.2,1); }
      `}</style>

      {notification && (
        <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: dark ? "#1C1F2B" : "#fff", border: `1.5px solid ${C.border}`, borderRadius: 14, padding: "14px 22px", zIndex: 9999, fontSize: 14, fontWeight: 500, color: C.text, boxShadow: "0 12px 40px rgba(0,0,0,0.3)", animation: "slideDown 0.3s ease", whiteSpace: "nowrap" }}>
          {notification}
        </div>
      )}

      {/* HEADER */}
      <header style={{ position: "sticky", top: 0, zIndex: 100, background: dark ? "rgba(10,11,15,0.85)" : "rgba(244,245,249,0.85)", backdropFilter: "blur(20px)", borderBottom: `1px solid ${C.border}`, padding: "0 24px", display: "flex", alignItems: "center", height: 64, gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: "auto" }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #6EE7F7, #A78BFA)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="target" size={18} color="#0A0B0F" />
          </div>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 18, letterSpacing: -0.5 }}>GoalFlow</span>
        </div>

        {/* Pomodoro */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.surface2, borderRadius: 10, padding: "7px 14px" }}>
          <span style={{ fontSize: 14 }}>🍅</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: pomodoroRunning ? "#86EFAC" : C.muted, fontVariantNumeric: "tabular-nums" }}>
            {String(Math.floor(pomodoroTime / 60)).padStart(2, "0")}:{String(pomodoroTime % 60).padStart(2, "0")}
          </span>
          <button className="btn" style={{ padding: "3px 9px", fontSize: 11, background: pomodoroRunning ? "rgba(255,107,107,0.15)" : "rgba(134,239,172,0.15)", color: pomodoroRunning ? "#FF6B6B" : "#86EFAC" }}
            onClick={() => setPomodoroRunning(r => !r)}>
            {pomodoroRunning ? "⏸" : "▶"}
          </button>
        </div>

        {/* XP */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.surface2, borderRadius: 10, padding: "7px 14px" }}>
          <Icon name="zap" size={14} color={C.warning} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>Lv.{getLevel(userData.xp)}</span>
          <div style={{ width: 50, height: 5, borderRadius: 3, background: C.border, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${getLevelProgress(userData.xp)}%`, background: "linear-gradient(90deg, #6EE7F7, #A78BFA)", borderRadius: 3 }} />
          </div>
          <span style={{ fontSize: 12, color: C.muted }}>{userData.xp} XP</span>
        </div>

        <button className="btn btn-ghost" style={{ padding: 8, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setDark(d => !d)}>
          <Icon name={dark ? "sun" : "moon"} size={16} />
        </button>
        <button className="btn btn-ghost" style={{ padding: 8, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={handleLogout} title="Logout">
          <Icon name="logout" size={16} />
        </button>
      </header>

      <div style={{ display: "flex", flex: 1 }}>
        {/* SIDEBAR */}
        <nav style={{ width: 220, background: C.surface, borderRight: `1px solid ${C.border}`, padding: "24px 12px", display: "flex", flexDirection: "column", gap: 4, position: "sticky", top: 64, height: "calc(100vh - 64px)" }}>
          {[
            { id: "dashboard", icon: "home", label: "Dashboard" },
            { id: "goals", icon: "target", label: "My Goals" },
            { id: "analytics", icon: "chart", label: "Analytics" },
            { id: "achievements", icon: "trophy", label: "Achievements" },
            { id: "settings", icon: "settings", label: "Settings" },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 12, border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: activeTab === tab.id ? 600 : 400, textAlign: "left", transition: "all 0.18s", background: activeTab === tab.id ? "linear-gradient(135deg, rgba(110,231,247,0.12), rgba(167,139,250,0.08))" : "transparent", color: activeTab === tab.id ? C.accent : C.muted, borderLeft: activeTab === tab.id ? `2px solid ${C.accent}` : "2px solid transparent" }}>
              <Icon name={tab.icon} size={17} color={activeTab === tab.id ? C.accent : C.muted} />
              {tab.label}
            </button>
          ))}

          <div style={{ marginTop: "auto", padding: "16px 14px", borderRadius: 14, background: C.surface2, border: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <Icon name="flame" size={16} color="#FCD34D" />
              <span style={{ fontSize: 13, fontWeight: 700, color: "#FCD34D" }}>{userData.streak || 0}-day streak!</span>
            </div>
            <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.5 }}>Best: {userData.longestStreak || 0} days 🏆</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Hi, {authUser?.displayName || "there"}! 👋</div>
          </div>
        </nav>

        {/* MAIN */}
        <main style={{ flex: 1, padding: 28, overflow: "auto" }}>

          {/* ── DASHBOARD ── */}
          {activeTab === "dashboard" && (
            <div style={{ animation: "fadeIn 0.4s ease" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
                <div>
                  <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, fontWeight: 700, letterSpacing: -0.5 }}>Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}! 👋</h2>
                  <p style={{ color: C.muted, fontSize: 14, marginTop: 4 }}>{new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
                </div>
                <button className="btn btn-accent" style={{ padding: "11px 20px", fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}
                  onClick={() => { setEditGoal(null); setShowForm(true); }}>
                  <Icon name="plus" size={16} color="#0A0B0F" /> New Goal
                </button>
              </div>

              {/* STATS */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 28 }}>
                {[
                  { label: "Today's Goals", value: `${completedCount}/${totalGoals}`, icon: "target", color: C.accent, sub: "completed" },
                  { label: "Productivity", value: `${productivityScore}%`, icon: "trending", color: "#86EFAC", sub: "score today" },
                  { label: "Current Streak", value: `${userData.streak || 0} days`, icon: "flame", color: "#FCD34D", sub: `best: ${userData.longestStreak || 0}` },
                  { label: "Total XP", value: (userData.xp || 0).toLocaleString(), icon: "zap", color: "#A78BFA", sub: `Level ${getLevel(userData.xp)} · ${getLevelTitle(getLevel(userData.xp))}` },
                  { label: "Active Goals", value: goals.filter(g => !g.completed).length, icon: "refresh", color: "#FDA4AF", sub: "in progress" },
                  { label: "Badges", value: (userData.unlockedBadges || []).length, icon: "award", color: "#FCD34D", sub: `of ${BADGES.length}` },
                ].map((stat, i) => (
                  <div key={i} className="card" style={{ position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", top: 16, right: 16, opacity: 0.12 }}><Icon name={stat.icon} size={40} color={stat.color} /></div>
                    <p style={{ fontSize: 12, color: C.muted, fontWeight: 500, marginBottom: 8 }}>{stat.label}</p>
                    <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, color: stat.color, lineHeight: 1 }}>{stat.value}</p>
                    <p style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>{stat.sub}</p>
                  </div>
                ))}
              </div>

              {totalGoals === 0 ? (
                <div className="card" style={{ textAlign: "center", padding: "60px 20px" }}>
                  <div style={{ fontSize: 56, marginBottom: 16 }}>🎯</div>
                  <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>No goals yet!</h3>
                  <p style={{ color: C.muted, fontSize: 14, marginBottom: 20 }}>Create your first goal and start your journey!</p>
                  <button className="btn btn-accent" style={{ padding: "12px 24px", fontSize: 14 }} onClick={() => { setEditGoal(null); setShowForm(true); }}>
                    + Create First Goal
                  </button>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, marginBottom: 24 }}>
                  <div className="card">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                      <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 600 }}>Today's Goals</h3>
                      <span style={{ fontSize: 12, color: C.muted, background: C.surface2, padding: "4px 10px", borderRadius: 20 }}>{goals.filter(g => g.type === "daily").length} daily</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {goals.filter(g => g.type === "daily").slice(0, 5).map(goal => {
                        const pct = Math.round((goal.progress / goal.target) * 100);
                        const color = CATEGORY_COLORS[goal.category] || C.accent;
                        return (
                          <div key={goal.firestoreId} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", borderRadius: 12, background: C.surface2, border: `1px solid ${goal.completed ? "rgba(134,239,172,0.2)" : C.border}` }}>
                            <button onClick={() => toggleGoal(goal.firestoreId)} style={{ width: 24, height: 24, borderRadius: 8, border: `2px solid ${goal.completed ? "#86EFAC" : C.border}`, background: goal.completed ? "#86EFAC" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" }}>
                              {goal.completed && <Icon name="check" size={13} color="#0A0B0F" />}
                            </button>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                                <span style={{ fontSize: 14, fontWeight: 600, color: goal.completed ? C.muted : C.text, textDecoration: goal.completed ? "line-through" : "none" }}>{goal.title}</span>
                                <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: `${color}18`, color, fontWeight: 600 }}>{goal.category}</span>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ flex: 1, height: 5, background: C.border, borderRadius: 3, overflow: "hidden" }}>
                                  <div className="progress-bar" style={{ height: "100%", width: `${pct}%`, background: goal.completed ? "#86EFAC" : `linear-gradient(90deg, ${color}, ${color}99)`, borderRadius: 3 }} />
                                </div>
                                <span style={{ fontSize: 11, color: C.muted, whiteSpace: "nowrap" }}>{goal.progress}/{goal.target} {goal.unit}</span>
                              </div>
                            </div>
                            <CircularProgress pct={pct} size={44} stroke={4} color={goal.completed ? "#86EFAC" : color} bg={C.border} />
                          </div>
                        );
                      })}
                      {goals.filter(g => g.type === "daily").length === 0 && (
                        <p style={{ textAlign: "center", color: C.muted, fontSize: 13, padding: "20px 0" }}>No daily goals yet. Create one!</p>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div className="card">
                      <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Category Breakdown</h3>
                      {CATEGORIES.map(cat => {
                        const cg = goals.filter(g => g.category === cat);
                        const done = cg.filter(g => g.completed).length;
                        const pct = cg.length ? Math.round((done / cg.length) * 100) : 0;
                        const color = CATEGORY_COLORS[cat];
                        return cg.length > 0 && (
                          <div key={cat} style={{ marginBottom: 10 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                              <span style={{ fontSize: 12, fontWeight: 500 }}>{cat}</span>
                              <span style={{ fontSize: 12, color: C.muted }}>{done}/{cg.length}</span>
                            </div>
                            <div style={{ height: 5, background: C.border, borderRadius: 3, overflow: "hidden" }}>
                              <div className="progress-bar" style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3 }} />
                            </div>
                          </div>
                        );
                      })}
                      {goals.length === 0 && <p style={{ color: C.muted, fontSize: 12 }}>No goals yet</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* HEATMAP */}
              <div className="card">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 600 }}>Activity Heatmap</h3>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.muted }}>
                    <span>Less</span>
                    {[0.05, 0.3, 0.5, 0.7, 1].map((o, i) => <div key={i} style={{ width: 12, height: 12, borderRadius: 2, background: `rgba(110,231,247,${o})` }} />)}
                    <span>More</span>
                  </div>
                </div>
                <Heatmap data={userData.heatmap || {}} dark={dark} />
              </div>
            </div>
          )}

          {/* ── GOALS ── */}
          {activeTab === "goals" && (
            <div style={{ animation: "fadeIn 0.4s ease" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                <div>
                  <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, fontWeight: 700, letterSpacing: -0.5 }}>My Goals</h2>
                  <p style={{ color: C.muted, fontSize: 14, marginTop: 4 }}>{totalGoals} total · {completedCount} completed</p>
                </div>
                <button className="btn btn-accent" style={{ padding: "11px 20px", fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}
                  onClick={() => { setEditGoal(null); setShowForm(true); }}>
                  <Icon name="plus" size={16} color="#0A0B0F" /> New Goal
                </button>
              </div>

              <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ position: "relative", flex: "1 1 180px" }}>
                  <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", opacity: 0.4 }}><Icon name="search" size={15} /></div>
                  <input className="input" style={{ paddingLeft: 36, height: 40 }} placeholder="Search goals..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                {[
                  { value: filterCat, setter: setFilterCat, options: ["All", ...CATEGORIES] },
                  { value: filterType, setter: setFilterType, options: ["All", "daily", "weekly", "monthly"] },
                  { value: filterStatus, setter: setFilterStatus, options: ["All", "completed", "active"] },
                  { value: sortBy, setter: setSortBy, options: ["deadline", "priority", "progress"] },
                ].map((f, i) => (
                  <select key={i} className="input" style={{ width: "auto", height: 40, cursor: "pointer" }} value={f.value} onChange={e => f.setter(e.target.value)}>
                    {f.options.map(o => <option key={o} value={o}>{i === 3 ? `Sort: ${o}` : o}</option>)}
                  </select>
                ))}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {filteredGoals.map(goal => {
                  const pct = Math.round((goal.progress / goal.target) * 100);
                  const color = CATEGORY_COLORS[goal.category] || C.accent;
                  const isOverdue = new Date(goal.deadline) < new Date() && !goal.completed;
                  return (
                    <div key={goal.firestoreId} className="card" style={{ borderColor: goal.completed ? "rgba(134,239,172,0.2)" : isOverdue ? "rgba(255,107,107,0.2)" : C.border }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                        <button onClick={() => toggleGoal(goal.firestoreId)} style={{ marginTop: 2, width: 26, height: 26, borderRadius: 8, border: `2px solid ${goal.completed ? "#86EFAC" : C.border}`, background: goal.completed ? "#86EFAC" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" }}>
                          {goal.completed && <Icon name="check" size={14} color="#0A0B0F" />}
                        </button>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 6 }}>
                            <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 600, color: goal.completed ? C.muted : C.text, textDecoration: goal.completed ? "line-through" : "none" }}>{goal.title}</h3>
                            <span style={{ fontSize: 10, padding: "3px 9px", borderRadius: 20, background: `${color}18`, color, fontWeight: 600 }}>{goal.category}</span>
                            <span style={{ fontSize: 10, padding: "3px 9px", borderRadius: 20, background: goal.priority === "Critical" ? "rgba(255,107,107,0.12)" : goal.priority === "High" ? "rgba(252,211,77,0.12)" : "rgba(255,255,255,0.06)", color: goal.priority === "Critical" ? "#FF6B6B" : goal.priority === "High" ? "#FCD34D" : C.muted, fontWeight: 600 }}>{goal.priority}</span>
                            <span style={{ fontSize: 10, padding: "3px 9px", borderRadius: 20, background: "rgba(110,231,247,0.1)", color: C.accent, fontWeight: 600 }}>{goal.type}</span>
                            {isOverdue && <span style={{ fontSize: 10, padding: "3px 9px", borderRadius: 20, background: "rgba(255,107,107,0.12)", color: "#FF6B6B", fontWeight: 600 }}>Overdue</span>}
                            {goal.recurring && <span style={{ fontSize: 10, padding: "3px 9px", borderRadius: 20, background: "rgba(134,239,172,0.1)", color: "#86EFAC", fontWeight: 600 }}>🔁 Recurring</span>}
                          </div>
                          {goal.desc && <p style={{ fontSize: 13, color: C.muted, marginBottom: 12, lineHeight: 1.5 }}>{goal.desc}</p>}
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                            <div style={{ flex: 1, height: 7, background: C.surface2, borderRadius: 4, overflow: "hidden" }}>
                              <div className="progress-bar" style={{ height: "100%", width: `${pct}%`, background: goal.completed ? "#86EFAC" : `linear-gradient(90deg, ${color}, ${color}88)`, borderRadius: 4 }} />
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: goal.completed ? "#86EFAC" : C.text, minWidth: 35 }}>{pct}%</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                            <span style={{ fontSize: 12, color: C.muted }}>{goal.progress}/{goal.target} {goal.unit}</span>
                            <span style={{ fontSize: 12, color: isOverdue ? "#FF6B6B" : C.muted }}>{new Date(goal.deadline).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}</span>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                          <CircularProgress pct={pct} size={56} stroke={5} color={goal.completed ? "#86EFAC" : color} bg={C.surface2} />
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <button className="btn btn-ghost" style={{ padding: 7, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}
                              onClick={() => { setShowProgressModal(goal); setProgressInput(String(goal.progress)); }}>
                              <Icon name="trending" size={14} />
                            </button>
                            <button className="btn btn-ghost" style={{ padding: 7, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}
                              onClick={() => { setEditGoal(goal); setShowForm(true); }}>
                              <Icon name="edit" size={14} />
                            </button>
                            <button className="btn" style={{ padding: 7, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,107,107,0.1)", color: "#FF6B6B" }}
                              onClick={() => deleteGoal(goal.firestoreId)}>
                              <Icon name="trash" size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {filteredGoals.length === 0 && (
                  <div style={{ textAlign: "center", padding: "60px 20px", color: C.muted }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>🎯</div>
                    <p style={{ fontSize: 16, fontWeight: 600 }}>{totalGoals === 0 ? "No goals yet!" : "No goals match filters"}</p>
                    <p style={{ fontSize: 13, marginTop: 6 }}>{totalGoals === 0 ? "Create your first goal to get started!" : "Try adjusting filters"}</p>
                    {totalGoals === 0 && <button className="btn btn-accent" style={{ padding: "12px 24px", fontSize: 14, marginTop: 16 }} onClick={() => { setEditGoal(null); setShowForm(true); }}>+ Create First Goal</button>}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── ANALYTICS ── */}
          {activeTab === "analytics" && (
            <div style={{ animation: "fadeIn 0.4s ease" }}>
              <div style={{ marginBottom: 28 }}>
                <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, fontWeight: 700, letterSpacing: -0.5 }}>Analytics</h2>
                <p style={{ color: C.muted, fontSize: 14, marginTop: 4 }}>Your performance insights</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
                <div className="card">
                  <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Category Performance</h3>
                  {CATEGORIES.map(cat => {
                    const cg = goals.filter(g => g.category === cat);
                    const done = cg.filter(g => g.completed).length;
                    const pct = cg.length ? Math.round((done / cg.length) * 100) : 0;
                    const color = CATEGORY_COLORS[cat];
                    return cg.length > 0 && (
                      <div key={cat} style={{ marginBottom: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 10, height: 10, borderRadius: "50%", background: color }} />
                            <span style={{ fontSize: 13, fontWeight: 500 }}>{cat}</span>
                          </div>
                          <span style={{ fontSize: 13, color: C.muted }}>{pct}%</span>
                        </div>
                        <div style={{ height: 7, background: C.surface2, borderRadius: 4, overflow: "hidden" }}>
                          <div className="progress-bar" style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 4 }} />
                        </div>
                      </div>
                    );
                  })}
                  {goals.length === 0 && <p style={{ color: C.muted, fontSize: 13 }}>No goals yet</p>}
                </div>

                <div className="card">
                  <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Priority Breakdown</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {PRIORITIES.map(p => {
                      const pg = goals.filter(g => g.priority === p);
                      const done = pg.filter(g => g.completed).length;
                      const colors = { Critical: "#FF6B6B", High: "#FCD34D", Medium: "#6EE7F7", Low: "#86EFAC" };
                      return (
                        <div key={p} style={{ textAlign: "center", padding: "16px 10px", background: C.surface2, borderRadius: 12 }}>
                          <div style={{ position: "relative", width: 64, height: 64, margin: "0 auto 10px" }}>
                            <CircularProgress pct={pg.length ? (done / pg.length) * 100 : 0} size={64} stroke={5} color={colors[p]} bg={C.border} />
                            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: colors[p] }}>{pg.length ? Math.round((done / pg.length) * 100) : 0}%</div>
                          </div>
                          <p style={{ fontSize: 12, fontWeight: 600, color: colors[p] }}>{p}</p>
                          <p style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{done}/{pg.length}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="card" style={{ marginBottom: 20 }}>
                <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, fontWeight: 600, marginBottom: 16 }}>365-Day Activity Map</h3>
                <Heatmap data={userData.heatmap || {}} dark={dark} />
                <div style={{ display: "flex", gap: 28, marginTop: 16, flexWrap: "wrap" }}>
                  {[
                    { label: "Total Active Days", val: Object.values(userData.heatmap || {}).filter(v => v > 0).length },
                    { label: "Most Goals in a Day", val: Math.max(0, ...Object.values(userData.heatmap || {})) },
                    { label: "Current Streak", val: `${userData.streak || 0} days` },
                    { label: "Longest Streak", val: `${userData.longestStreak || 0} days` },
                  ].map((s, i) => (
                    <div key={i}>
                      <p style={{ fontSize: 11, color: C.muted }}>{s.label}</p>
                      <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, color: C.accent }}>{s.val}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Goals Overview</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12 }}>
                  {[
                    { label: "Total Goals", val: totalGoals, color: C.accent },
                    { label: "Completed", val: completedCount, color: "#86EFAC" },
                    { label: "Active", val: goals.filter(g => !g.completed).length, color: "#FDA4AF" },
                    { label: "Daily", val: goals.filter(g => g.type === "daily").length, color: "#FCD34D" },
                    { label: "Weekly", val: goals.filter(g => g.type === "weekly").length, color: "#A78BFA" },
                    { label: "Monthly", val: goals.filter(g => g.type === "monthly").length, color: "#6EE7F7" },
                  ].map((s, i) => (
                    <div key={i} style={{ textAlign: "center", padding: "16px 10px", background: C.surface2, borderRadius: 12 }}>
                      <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, color: s.color }}>{s.val}</p>
                      <p style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── ACHIEVEMENTS ── */}
          {activeTab === "achievements" && (
            <div style={{ animation: "fadeIn 0.4s ease" }}>
              <div style={{ marginBottom: 28 }}>
                <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, fontWeight: 700, letterSpacing: -0.5 }}>Achievements</h2>
                <p style={{ color: C.muted, fontSize: 14, marginTop: 4 }}>Your gamification journey</p>
              </div>

              <div className="card" style={{ background: "linear-gradient(135deg, rgba(110,231,247,0.08), rgba(167,139,250,0.08))", border: "1px solid rgba(110,231,247,0.15)", marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                  <div style={{ position: "relative", width: 80, height: 80 }}>
                    <CircularProgress pct={getLevelProgress(userData.xp)} size={80} stroke={6} color="#6EE7F7" />
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700 }}>
                      {getLevel(userData.xp)}
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>Current Level</p>
                    <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 700 }}>{getLevelTitle(getLevel(userData.xp))}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
                      <div style={{ flex: 1, height: 8, background: C.surface2, borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${getLevelProgress(userData.xp)}%`, background: "linear-gradient(90deg, #6EE7F7, #A78BFA)", borderRadius: 4, transition: "width 0.8s ease" }} />
                      </div>
                      <span style={{ fontSize: 12, color: C.muted }}>{(userData.xp || 0) % 200}/200 XP</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 32, fontWeight: 700, color: C.accent }}>{userData.xp || 0}</p>
                    <p style={{ fontSize: 12, color: C.muted }}>Total XP</p>
                  </div>
                </div>
              </div>

              <div className="card" style={{ marginBottom: 24, background: "linear-gradient(135deg, rgba(252,211,77,0.06), rgba(253,164,175,0.06))", border: "1px solid rgba(252,211,77,0.15)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ fontSize: 48 }}>🔥</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 32, fontWeight: 700, color: "#FCD34D" }}>{userData.streak || 0} days</p>
                    <p style={{ fontSize: 14, color: C.muted }}>Current streak · Longest: <strong style={{ color: "#FCD34D" }}>{userData.longestStreak || 0} days</strong></p>
                  </div>
                </div>
              </div>

              <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Badges</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
                {BADGES.map(badge => {
                  const unlocked = (userData.unlockedBadges || []).includes(badge.id);
                  return (
                    <div key={badge.id} className="card" style={{ textAlign: "center", opacity: unlocked ? 1 : 0.45, border: unlocked ? "1.5px solid rgba(110,231,247,0.2)" : C.border, filter: unlocked ? "none" : "grayscale(0.5)" }}>
                      <div style={{ fontSize: 36, marginBottom: 10 }}>{unlocked ? badge.icon : "🔒"}</div>
                      <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 5 }}>{badge.name}</p>
                      <p style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>{badge.desc}</p>
                      <span style={{ fontSize: 11, background: unlocked ? "rgba(110,231,247,0.12)" : C.surface2, color: unlocked ? C.accent : C.muted, padding: "4px 10px", borderRadius: 20, fontWeight: 600 }}>+{badge.xp} XP</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── SETTINGS ── */}
          {activeTab === "settings" && (
            <div style={{ animation: "fadeIn 0.4s ease", maxWidth: 600 }}>
              <div style={{ marginBottom: 28 }}>
                <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, fontWeight: 700, letterSpacing: -0.5 }}>Settings</h2>
                <p style={{ color: C.muted, fontSize: 14, marginTop: 4 }}>Customize your GoalFlow experience</p>
              </div>

              <div className="card" style={{ marginBottom: 16 }}>
                <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600, color: C.accent, marginBottom: 16, textTransform: "uppercase", letterSpacing: 0.8 }}>Account</h3>
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, #6EE7F7, #A78BFA)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name="user" size={20} color="#0A0B0F" />
                  </div>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 600 }}>{authUser?.displayName || "User"}</p>
                    <p style={{ fontSize: 13, color: C.muted }}>{authUser?.email}</p>
                  </div>
                </div>
              </div>

              {[
                { section: "Appearance", items: [{ label: "Dark Mode", desc: "Easy on the eyes", toggle: dark, onToggle: () => setDark(d => !d) }] },
                { section: "Notifications", items: [
                  { label: "Daily Check-in Reminder", desc: "9:00 AM every day", toggle: true, onToggle: () => showNotif("✅ Setting saved!") },
                  { label: "Deadline Alerts", desc: "24h before due date", toggle: true, onToggle: () => showNotif("✅ Setting saved!") },
                  { label: "Streak Breaks", desc: "Alert when streak is at risk", toggle: true, onToggle: () => showNotif("✅ Setting saved!") },
                ]},
                { section: "Advanced", items: [
                  { label: "AI Goal Suggestions", desc: "Smart recommendations", toggle: false, onToggle: () => showNotif("🤖 Coming soon!") },
                  { label: "PWA Offline Mode", desc: "Use without internet", toggle: false, onToggle: () => showNotif("📱 Coming soon!") },
                  { label: "Habit Auto-Repeat", desc: "Auto-create recurring goals", toggle: true, onToggle: () => showNotif("✅ Setting saved!") },
                ]},
              ].map(({ section, items }) => (
                <div key={section} className="card" style={{ marginBottom: 16 }}>
                  <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600, color: C.accent, marginBottom: 16, textTransform: "uppercase", letterSpacing: 0.8 }}>{section}</h3>
                  {items.map((item, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderTop: i > 0 ? `1px solid ${C.border}` : "none" }}>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 500 }}>{item.label}</p>
                        <p style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{item.desc}</p>
                      </div>
                      <div onClick={item.onToggle} style={{ width: 44, height: 24, borderRadius: 12, background: item.toggle ? "linear-gradient(90deg, #6EE7F7, #A78BFA)" : dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)", cursor: "pointer", position: "relative", transition: "all 0.2s" }}>
                        <div style={{ position: "absolute", top: 3, left: item.toggle ? 23 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
                      </div>
                    </div>
                  ))}
                </div>
              ))}

              <div className="card" style={{ background: "rgba(255,107,107,0.05)", border: "1px solid rgba(255,107,107,0.15)" }}>
                <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600, color: "#FF6B6B", marginBottom: 12 }}>DANGER ZONE</h3>
                <button className="btn" style={{ padding: "9px 16px", fontSize: 13, background: "rgba(255,107,107,0.1)", color: "#FF6B6B" }} onClick={handleLogout}>
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── GOAL FORM MODAL ── */}
      {showForm && <GoalFormModal dark={dark} C={C} editGoal={editGoal} onSave={saveGoal} onClose={() => { setShowForm(false); setEditGoal(null); }} />}

      {/* ── PROGRESS MODAL ── */}
      {showProgressModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(8px)", padding: 16 }}>
          <div style={{ background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 20, padding: 28, width: "100%", maxWidth: 360, animation: "fadeIn 0.3s ease" }}>
            <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Update Progress</h3>
            <p style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>{showProgressModal.title}</p>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, color: C.muted, marginBottom: 6, display: "block" }}>Current Value ({showProgressModal.unit})</label>
              <input className="input" type="number" value={progressInput} onChange={e => setProgressInput(e.target.value)} min={0} max={showProgressModal.target} style={{ fontSize: 20, fontWeight: 700, textAlign: "center", height: 54 }} />
            </div>
            <div style={{ height: 8, background: C.surface2, borderRadius: 4, overflow: "hidden", marginBottom: 20 }}>
              <div style={{ height: "100%", width: `${Math.min((parseFloat(progressInput) / showProgressModal.target) * 100, 100) || 0}%`, background: "linear-gradient(90deg, #6EE7F7, #A78BFA)", borderRadius: 4, transition: "width 0.3s" }} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-ghost" style={{ flex: 1, padding: 12 }} onClick={() => setShowProgressModal(null)}>Cancel</button>
              <button className="btn btn-accent" style={{ flex: 1, padding: 12 }} onClick={updateProgress}>Save Progress</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── GOAL FORM MODAL ────────────────────────────────────────────────────────────
function GoalFormModal({ dark, C, editGoal, onSave, onClose }) {
  const [form, setForm] = useState({
    title: editGoal?.title || "",
    desc: editGoal?.desc || "",
    category: editGoal?.category || "Study",
    priority: editGoal?.priority || "Medium",
    target: editGoal?.target || 1,
    unit: editGoal?.unit || "tasks",
    type: editGoal?.type || "daily",
    deadline: editGoal?.deadline ? editGoal.deadline.split("T")[0] : new Date(Date.now() + 86400000).toISOString().split("T")[0],
    recurring: editGoal?.recurring || false,
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const valid = form.title.trim() && form.target > 0;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(8px)", padding: 16 }}>
      <div style={{ background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 22, padding: 30, width: "100%", maxWidth: 500, animation: "fadeIn 0.3s ease", maxHeight: "90vh", overflow: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700 }}>{editGoal ? "Edit Goal" : "New Goal"}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4 }}><Icon name="x" size={20} /></button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: "block", marginBottom: 6 }}>GOAL TITLE *</label>
            <input className="input" placeholder="What do you want to achieve?" value={form.title} onChange={e => set("title", e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: "block", marginBottom: 6 }}>DESCRIPTION</label>
            <textarea className="input" rows={2} placeholder="Describe your goal..." value={form.desc} onChange={e => set("desc", e.target.value)} style={{ resize: "vertical", minHeight: 70 }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: "block", marginBottom: 6 }}>CATEGORY</label>
              <select className="input" value={form.category} onChange={e => set("category", e.target.value)}>
                {["Study", "Fitness", "Work", "Personal", "Health", "Finance", "Creative"].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: "block", marginBottom: 6 }}>PRIORITY</label>
              <select className="input" value={form.priority} onChange={e => set("priority", e.target.value)}>
                {["Low", "Medium", "High", "Critical"].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: "block", marginBottom: 6 }}>TARGET *</label>
              <input className="input" type="number" min={1} value={form.target} onChange={e => set("target", parseFloat(e.target.value))} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: "block", marginBottom: 6 }}>UNIT</label>
              <input className="input" placeholder="pages, km..." value={form.unit} onChange={e => set("unit", e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: "block", marginBottom: 6 }}>TYPE</label>
              <select className="input" value={form.type} onChange={e => set("type", e.target.value)}>
                {["daily", "weekly", "monthly"].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: "block", marginBottom: 6 }}>DEADLINE</label>
            <input className="input" type="date" value={form.deadline} onChange={e => set("deadline", e.target.value)} />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
            <div onClick={() => set("recurring", !form.recurring)} style={{ width: 44, height: 24, borderRadius: 12, background: form.recurring ? "linear-gradient(90deg, #6EE7F7, #A78BFA)" : dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)", cursor: "pointer", position: "relative", transition: "all 0.2s" }}>
              <div style={{ position: "absolute", top: 3, left: form.recurring ? 23 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
            </div>
            <span style={{ fontSize: 14, fontWeight: 500 }}>Recurring Goal 🔁</span>
          </label>
          <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
            <button className="btn btn-ghost" style={{ flex: 1, padding: 13, fontSize: 14 }} onClick={onClose}>Cancel</button>
            <button className="btn btn-accent" style={{ flex: 2, padding: 13, fontSize: 14, opacity: valid ? 1 : 0.5, cursor: valid ? "pointer" : "not-allowed" }}
              disabled={!valid} onClick={() => onSave({ ...form, deadline: new Date(form.deadline).toISOString() })}>
              {editGoal ? "Save Changes" : "Create Goal 🎯"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}