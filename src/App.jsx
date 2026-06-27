/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import Landing from "./components/Landing.jsx";
import MeetingRoom from "./components/MeetingRoom.jsx";
import Dashboard from "./components/Dashboard.jsx";
import Admin from "./components/Admin.jsx";
import Auth from "./components/Auth.jsx";
import Settings from "./components/Settings.jsx";
import { v4 as uuidv4 } from "uuid";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  console.log("App rendering...");
  const [view, setView] = useState("landing"); // landing, dashboard, meeting, auth, settings
  const [meetingId, setMeetingId] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [warning, setWarning] = useState(null);

  useEffect(() => {
    window.alert = (message) => {
      setWarning({
        title: "Transmission Monitor",
        message: message,
        type: "warning"
      });
    };
  }, []);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("wabiseminar-user");
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (e) {
      console.error("Session init error:", e);
    } finally {
      setIsLoading(false);
    }

    const handleMessage = (event) => {
      if (event.data?.type === "OAUTH_AUTH_SUCCESS") {
        const userData = event.data.user;
        localStorage.setItem("wabiseminar-user", JSON.stringify(userData));
        setUser(userData);
        if (view === "auth" || view === "landing") {
          setView("dashboard");
          window.history.pushState({}, "", "/dashboard");
        }
      }
    };
    window.addEventListener("message", handleMessage);

    const path = window.location.pathname.split("/")[1];
    if (path === "dashboard") {
      setView("dashboard");
    } else if (path === "admin") {
      setView("admin");
    } else if (path === "settings") {
      setView("settings");
    } else if (path === "auth") {
      setView("auth");
    } else if (path.startsWith("wabiseminar-")) {
      setMeetingId(path);
      setView("meeting");
    }
    return () => window.removeEventListener("message", handleMessage);
  }, [view]);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setView("dashboard");
    window.history.pushState({}, "", "/dashboard");
  };

  const navigateToAuth = () => {
    setView("auth");
    window.history.pushState({}, "", "/auth");
  };

  const navigateToSettings = () => {
    setView("settings");
    window.history.pushState({}, "", "/settings");
  };

  const handleJoin = (id) => {
    setMeetingId(id);
    setView("meeting");
    window.history.pushState({}, "", `/${id}`);
  };

  const handleLeave = () => {
    setMeetingId(null);
    setView("dashboard");
    window.history.pushState({}, "", "/dashboard");
  };

  const navigateToDashboard = () => {
    setView("dashboard");
    window.history.pushState({}, "", "/dashboard");
  };

  const navigateToLanding = () => {
    setView("landing");
    window.history.pushState({}, "", "/");
  };

  const navigateToAdmin = () => {
    setView("admin");
    window.history.pushState({}, "", "/admin");
  };

  const handleLogout = () => {
    localStorage.removeItem("wabiseminar-user");
    setUser(null);
    window.history.pushState({}, "", "/");
    window.location.reload();
  };

  const handleStartNew = async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
           name: `${user.name}'s Seminar`, 
           hostId: user.id 
        }),
      });
      if (!res.ok) {
        throw new Error("Local database is unreachable or transmission rejected.");
      }
      const data = await res.json();
      if (data.meetingId) {
        handleJoin(data.meetingId);
      }
    } catch (err) {
      console.error("Failed to start meeting:", err);
      alert(`Database Node Alert: ${err.message}. Please verify active connection limits.`);
    }
  };

  if (isLoading) return <div className="h-screen w-screen flex items-center justify-center bg-gray-900 text-white font-mono text-xs uppercase tracking-widest">Initializing Wabiseminar Core...</div>;

  // Protect Dashboard and Admin with Auth
  if (!user && (view === "dashboard" || view === "admin" || view === "settings")) {
    return <Auth onLoginSuccess={handleLoginSuccess} onClose={navigateToLanding} />;
  }

  const effectiveUser = user || { id: "guest_" + uuidv4().substring(0, 4), name: "Standard User", isGuest: true };

  return (
    <div className="h-screen w-screen bg-[#050505] text-white selection:bg-accent selection:text-white font-sans">
      {view === "landing" && (
        <Landing user={effectiveUser} onJoin={handleJoin} onGoToDashboard={navigateToDashboard} onLogout={handleLogout} onAuthRequest={navigateToAuth} />
      )}
      {view === "auth" && (
        <Auth onLoginSuccess={handleLoginSuccess} onClose={navigateToLanding} />
      )}
      {view === "dashboard" && (
        <Dashboard user={user} onJoin={handleJoin} onStartNew={handleStartNew} onGoToAdmin={navigateToAdmin} onLogout={handleLogout} onGoToSettings={navigateToSettings} />
      )}
      {view === "settings" && (
        <Settings user={user} onUpdate={setUser} onBack={navigateToDashboard} onLogout={handleLogout} />
      )}
      {view === "admin" && (
        <Admin onBack={navigateToDashboard} />
      )}
      {view === "meeting" && (
        <MeetingRoom meetingId={meetingId} user={effectiveUser} onLeave={handleLeave} />
      )}

      <AnimatePresence>
        {warning && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-6 z-50 pointer-events-auto"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white border border-brand-orange/30 w-full max-w-md rounded-2xl p-8 space-y-6 text-center shadow-2xl relative overflow-hidden text-ink"
            >
              <div className="absolute top-0 left-0 w-full h-1.5 bg-brand-orange" />
              
              <div className="w-14 h-14 rounded-2xl bg-brand-orange/10 flex items-center justify-center mx-auto text-brand-orange">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-sans font-black tracking-tight text-accent uppercase">
                  {warning.title}
                </h3>
                <p className="text-[12px] text-slate-500 leading-relaxed font-bold uppercase tracking-wider">
                  {warning.message}
                </p>
              </div>

              <button 
                onClick={() => setWarning(null)}
                className="w-full py-3.5 bg-brand-orange text-white font-black uppercase tracking-widest text-[10px] hover:bg-accent rounded-xl shadow-lg shadow-brand-orange/15 hover:shadow-accent/15 transition-all duration-300 cursor-pointer"
              >
                Acknowledge & Continue
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <footer className="fixed bottom-4 left-4 text-[10px] uppercase tracking-widest text-zinc-700 font-medium pointer-events-none z-50">
        Wabiseminar &copy; 2026 • Group 1 Prepared • SQL + WebRTC + Socket.io
      </footer>
    </div>
  );
}

