import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { User, Bell, Shield, Palette, ArrowLeft, Save, Trash2, LogOut } from "lucide-react";

import logoImg from "../assets/images/wabiseminar-1.png";

export default function Settings({ user, onUpdate, onBack, onLogout }) {
  const [name, setName] = useState(user.name);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      localStorage.setItem("wabiseminar-user", JSON.stringify(data));
      onUpdate(data);
      alert("Settings updated successfully");
    } catch (err) {
      console.error(err);
      alert("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: "profile", icon: User, label: "Profile" },
    { id: "notifications", icon: Bell, label: "Notifications" },
    { id: "privacy", icon: Shield, label: "Security" },
    { id: "appearance", icon: Palette, label: "Interface" },
  ];

  return (
    <div className="flex h-screen bg-paper text-ink technical-grid">
      {/* Side Profile Info */}
      <aside className="w-80 border-r border-ink/10 flex flex-col p-12 gap-12 bg-white/50 backdrop-blur-xl relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 border border-accent/20 bg-white rounded-xl flex items-center justify-center p-1.5 overflow-hidden shadow-sm">
             <img 
              src={logoImg} 
              alt="Wabi Seminar Logo" 
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex flex-col">
            <span className="font-sans font-black text-lg leading-none text-accent uppercase tracking-tighter">WABI<span className="text-brand-orange">SEMINAR</span></span>
            <span className="text-[8px] font-black tracking-[0.2em] text-accent/50 uppercase mt-1">Parameters</span>
          </div>
        </div>

        <div className="space-y-6">
            <div className="w-32 h-32 brutal-border bg-white rounded-full p-2 mx-auto relative group">
                <div className="w-full h-full bg-paper rounded-full flex items-center justify-center text-4xl font-serif italic text-ink/20 group-hover:text-accent transition-colors overflow-hidden">
                    {user.name[0]}
                </div>
                <button className="absolute bottom-1 right-1 w-8 h-8 bg-ink text-paper rounded-full flex items-center justify-center hover:bg-accent transition-all shadow-xl">
                    <Save className="w-4 h-4" />
                </button>
            </div>
            <div className="text-center space-y-2">
                <h2 className="text-2xl font-serif italic text-ink">{user.name}</h2>
                <div className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-ink/40">
                   <Shield className="w-3 h-3 text-accent" /> Operative Status: Active
                </div>
            </div>
        </div>

        <nav className="flex-1 space-y-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center justify-between px-6 py-4 transition-all group ${
                  activeTab === tab.id 
                    ? "bg-ink text-paper" 
                    : "text-ink/40 hover:bg-ink/5"
                }`}
              >
                <div className="flex items-center gap-4">
                  <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? "text-accent" : ""}`} />
                  <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
                </div>
                <div className={`w-1.5 h-1.5 rounded-full transition-all ${activeTab === tab.id ? "bg-accent scale-100" : "bg-transparent scale-0"}`} />
              </button>
            ))}
        </nav>

        <div className="space-y-4">
            <button 
                onClick={onLogout}
                className="w-full py-4 brutal-border bg-ink text-paper text-[10px] font-black uppercase tracking-widest hover:bg-red-500 transition-all flex items-center justify-center gap-3 group"
            >
                Terminate Session
            </button>
            <button 
                onClick={onBack}
                className="w-full text-[9px] font-black uppercase tracking-[0.2em] text-ink/40 hover:text-ink transition-colors flex items-center justify-center gap-2"
            >
                <ArrowLeft className="w-4 h-4" /> Return to Bridge
            </button>
        </div>
      </aside>

      {/* Main Settings Content */}
      <main className="flex-1 overflow-y-auto p-12 lg:p-24 scrollbar-hide relative z-10 bg-paper/30">
        <AnimatePresence mode="wait">
            {activeTab === "profile" && (
                <motion.div key="profile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-xl space-y-12">
                    <div className="space-y-4">
                        <span className="text-accent font-mono text-[10px] uppercase font-black tracking-[0.4em]">Section 01</span>
                        <h1 className="text-6xl font-serif italic text-ink tracking-tight">Identity <span className="not-italic font-sans font-black uppercase">Nodes.</span></h1>
                        <p className="text-sm font-medium text-ink/40 leading-relaxed">Modify your synchronization credentials and public-facing identity markers.</p>
                    </div>

                    <div className="space-y-10">
                        <div className="space-y-3">
                           <label className="text-[9px] font-black uppercase tracking-[0.3em] text-ink/30 ml-1">Identity Display Name</label>
                           <input 
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              placeholder="Full legal or operative name" 
                              className="w-full bg-white brutal-border p-5 text-xs font-black uppercase tracking-widest focus:border-accent focus:outline-none transition-all"
                           />
                        </div>
                        
                        <div className="space-y-3">
                           <label className="text-[9px] font-black uppercase tracking-[0.3em] text-ink/30 ml-1">Authorized Email Stream</label>
                           <input 
                              disabled
                              value={user.email || "guest@node.io"}
                              className="w-full bg-ink/5 brutal-border p-5 text-xs font-black uppercase tracking-widest text-ink/20 cursor-not-allowed italic"
                           />
                        </div>

                        <div className="p-10 brutal-border bg-ink text-paper space-y-8">
                            <div className="space-y-2">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] font-serif italic text-accent">Security Protocols</h3>
                                <p className="text-[10px] text-paper/40 font-medium leading-relaxed">Manage your account security and authentication methods.</p>
                            </div>
                            <div className="grid grid-cols-2 gap-px bg-paper/10 overflow-hidden brutal-border border-paper/10">
                                <button className="p-6 bg-white/5 hover:bg-white/10 transition-all text-left space-y-2 group">
                                    <div className="text-[9px] font-black uppercase tracking-widest text-white group-hover:text-accent transition-colors">Security Key</div>
                                    <div className="text-[8px] text-white/30 uppercase tracking-widest font-black">Configure Mapped Keys</div>
                                </button>
                                <button className="p-6 bg-white/5 hover:bg-white/10 transition-all text-left space-y-2 group">
                                    <div className="text-[9px] font-black uppercase tracking-widest text-white group-hover:text-accent transition-colors">Privacy Shield</div>
                                    <div className="text-[8px] text-white/30 uppercase tracking-widest font-black">Active Protection</div>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="pt-12 border-t border-ink/10 flex justify-between items-center">
                        <button className="flex items-center gap-2 text-red-500/40 hover:text-red-500 transition-all text-[9px] font-black uppercase tracking-widest">
                           <Trash2 className="w-4 h-4" /> Purge Account Node
                        </button>
                        <div className="flex gap-4">
                            <button onClick={onBack} className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-ink/40 hover:text-ink transition-colors">Discard</button>
                            <button 
                                onClick={handleSave}
                                disabled={isSaving}
                                className="px-12 py-5 bg-ink text-paper text-[10px] font-black uppercase tracking-widest hover:bg-accent transition-all shadow-2xl disabled:opacity-50"
                            >
                                {isSaving ? "Syncing..." : "Commit Update"}
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}

            {activeTab === "notifications" && (
              <motion.div key="notifications" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-xl space-y-12">
                   <div className="space-y-4">
                        <span className="text-accent font-mono text-[10px] uppercase font-black tracking-[0.4em]">Section 02</span>
                        <h1 className="text-6xl font-serif italic text-ink tracking-tight">Signal <span className="not-italic font-sans font-black uppercase">Alerts.</span></h1>
                        <p className="text-sm font-medium text-ink/40 leading-relaxed">Configure how the system notifies you of incoming seminar arrivals and coordination updates.</p>
                    </div>
                    <div className="space-y-6">
                       <SettingToggle label="Incoming Seminar Pings" desc="Get notified when a scheduled seminar is about to go live." />
                       <SettingToggle label="Attendee Join Requests" desc="Sound alert when participants request admission to your nodes." />
                       <SettingToggle label="System Update Pulses" desc="Periodic synchronization messages from the core buffer." />
                    </div>
              </motion.div>
            )}

            {activeTab === "privacy" && (
              <motion.div key="privacy" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-xl space-y-12">
                   <div className="space-y-4">
                        <span className="text-accent font-mono text-[10px] uppercase font-black tracking-[0.4em]">Section 03</span>
                        <h1 className="text-6xl font-serif italic text-ink tracking-tight">Security <span className="not-italic font-sans font-black uppercase">Center.</span></h1>
                        <p className="text-sm font-medium text-ink/40 leading-relaxed">Manage your account security and professional visibility parameters.</p>
                    </div>
                    <div className="space-y-6">
                       <SettingToggle label="Private Profile" desc="Prevent your name from appearing in global searches." />
                       <SettingToggle label="Secure Communication" desc="Force all communication through encrypted streams." />
                       <SettingToggle label="Auto-Lock Nodes" desc="Automatically restrict entry to nodes after the seminar begins." />
                    </div>
              </motion.div>
            )}

            {activeTab === "appearance" && (
              <motion.div key="appearance" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-xl space-y-12">
                   <div className="space-y-4">
                        <span className="text-accent font-mono text-[10px] uppercase font-black tracking-[0.4em]">Section 04</span>
                        <h1 className="text-6xl font-serif italic text-ink tracking-tight">Visual <span className="not-italic font-sans font-black uppercase">Mapping.</span></h1>
                        <p className="text-sm font-medium text-ink/40 leading-relaxed">Customize the aesthetic resonance of your interface to match your operational environment.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <button className="p-8 brutal-border bg-white text-ink text-left space-y-2 group">
                          <div className="text-[10px] font-black uppercase tracking-widest text-accent">Modern Technical</div>
                          <div className="text-[8px] text-ink/40 uppercase tracking-widest font-black">Active Schema</div>
                       </button>
                       <button className="p-8 brutal-border bg-ink text-paper text-left space-y-2 group opacity-40">
                          <div className="text-[10px] font-black uppercase tracking-widest text-accent">Deep Buffer</div>
                          <div className="text-[8px] text-paper/40 uppercase tracking-widest font-black">Requires Premium</div>
                       </button>
                    </div>
              </motion.div>
            )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function SettingToggle({ label, desc }) {
  const [active, setActive] = useState(true);
  return (
    <button 
      onClick={() => setActive(!active)}
      className="w-full flex items-center justify-between p-6 bg-white brutal-border group hover:border-accent transition-all text-left"
    >
      <div className="space-y-1">
        <div className="text-[11px] font-black uppercase tracking-widest text-ink">{label}</div>
        <div className="text-[9px] font-medium text-ink/40 uppercase tracking-wider">{desc}</div>
      </div>
      <div className={`w-10 h-5 brutal-border p-1 ${active ? "bg-accent" : "bg-ink/5"}`}>
        <div className={`w-2 h-full bg-white transition-all ${active ? "ml-auto" : "mr-auto"}`} />
      </div>
    </button>
  );
}
