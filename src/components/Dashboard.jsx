import { useState, useEffect } from "react";
import { 
  Video, Calendar, History, Settings, ExternalLink, 
  Trash2, User, ChevronRight, Clock, Shield, Plus, Mail, Send, RefreshCw, X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import logoImg from "../assets/images/wabiseminar-1.png";

export default function Dashboard({ user, onJoin, onStartNew, onGoToAdmin, onLogout, onGoToSettings }) {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("meetings");
  const [isNewRoomModalOpen, setIsNewRoomModalOpen] = useState(false);
  const itemsPerPage = 5;

  useEffect(() => {
    fetch(`/api/meetings/history/${user.id}`)
      .then(res => res.json())
      .then(data => {
        setHistory(data);
        setIsLoading(false);
      });
  }, [user.id]);

  const filteredHistory = history.filter(meeting => 
    meeting.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    meeting.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const paginatedHistory = filteredHistory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="flex h-screen bg-paper text-ink technical-grid">
      {/* Side Navigation */}
      <nav className="w-72 border-r border-ink/10 flex flex-col p-8 gap-12 relative z-10 bg-white/50 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 border border-accent/20 bg-white rounded-xl flex items-center justify-center p-1.5 overflow-hidden shadow-sm">
             <img 
              src={logoImg} 
              alt="Wabi Seminar Logo" 
              className="w-full h-full object-contain animate-pulse"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex flex-col">
            <span className="font-sans font-black text-lg leading-none text-accent uppercase tracking-tighter">WABI<span className="text-brand-orange">SEMINAR</span></span>
            <span className="text-[8px] font-black tracking-[0.2em] text-accent/50 uppercase mt-1">Portal Dashboard</span>
          </div>
        </div>

        <div className="flex-1 space-y-2">
            <NavBtn icon={<Video className="w-4 h-4" />} label="Seminar Lobby" active={activeTab === "meetings"} onClick={() => setActiveTab("meetings")} />
            <NavBtn icon={<Mail className="w-4 h-4" />} label="Communication Center" active={activeTab === "gmail"} onClick={() => setActiveTab("gmail")} />
            <NavBtn icon={<Calendar className="w-4 h-4" />} label="Seminar Schedule" active={activeTab === "schedule"} onClick={() => setActiveTab("schedule")} />
            <NavBtn icon={<Settings className="w-4 h-4" />} label="Settings" onClick={onGoToSettings} />
            {user.isAdmin && <NavBtn icon={<Shield className="w-4 h-4 text-accent" />} label="Admin Panel" active={activeTab === "admin"} onClick={onGoToAdmin} />}
        </div>

        <div className="mt-auto space-y-6">
            <div className="p-6 brutal-border bg-white/80 rounded-sm space-y-4">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-paper border border-ink/10 rounded-full flex items-center justify-center text-[10px] font-black">{user.name[0]}</div>
                    <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-black truncate uppercase tracking-widest">{user.name}</div>
                        <div className="text-[8px] text-ink/40 uppercase tracking-[0.2em] font-black leading-none mt-1">
                          Enterprise Resource
                        </div>
                    </div>
                </div>
            </div>

            <button 
              onClick={onLogout}
              className="w-full py-4 brutal-border bg-ink text-paper text-[10px] font-black uppercase tracking-[0.2em] hover:bg-accent transition-all flex items-center justify-center gap-3 group/signout"
            >
              Logout Now
            </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-y-auto p-12 lg:p-20 scrollbar-hide relative z-10">
        <AnimatePresence mode="wait">
        {activeTab === "meetings" && (
          <motion.div key="meetings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-16">
            <header className="flex justify-between items-end border-b border-ink/10 pb-12">
                <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.3em] text-accent">
                       <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" /> Active Sessions
                    </div>
                    <h1 className="text-6xl font-serif italic text-ink tracking-tight">Your <span className="not-italic font-sans font-black uppercase text-ink">Seminars.</span></h1>
                    <p className="text-sm font-medium text-ink/40 max-w-sm">Manage your current and previous teaching sessions.</p>
                </div>
                <button 
                    onClick={() => setIsNewRoomModalOpen(true)}
                    className="px-8 py-4.5 bg-brand-orange text-white font-black uppercase tracking-widest text-[10px] hover:bg-accent rounded-2xl shadow-xl shadow-brand-orange/15 transition-all duration-300 flex items-center gap-2.5 cursor-pointer"
                >
                    <Plus className="w-4 h-4" /> New Seminar
                </button>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StatCard label="Total Meetings" value={history.length} color="text-accent" />
                <StatCard label="Platform Status" value="Active" color="text-brand-orange" />
            </div>

            {/* Recent History */}
            <section className="space-y-8">
                <div className="flex justify-between items-center">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-ink/30 italic font-serif">Seminar History</h2>
                    <div className="relative group">
                        <input 
                            type="text" 
                            placeholder="Search..." 
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-72 bg-white brutal-border px-6 py-3 text-[10px] font-black uppercase tracking-widest focus:border-accent focus:outline-none transition-all placeholder:text-ink/20"
                        />
                    </div>
                </div>

                <div className="grid gap-px bg-ink/10 brutal-border overflow-hidden">
                    {isLoading ? (
                        <div className="p-20 bg-white flex items-center justify-center">
                           <div className="w-6 h-6 brutal-border border-t-accent rounded-full animate-spin" />
                        </div>
                    ) : paginatedHistory.length === 0 ? (
                        <div className="p-20 bg-paper flex flex-col items-center gap-4 text-ink/20 italic font-serif">
                            <History className="w-12 h-12 opacity-10" />
                            <span className="text-sm">No seminar history detected.</span>
                        </div>
                    ) : (
                        paginatedHistory.map(meeting => (
                            <HistoryItem key={meeting.id} meeting={meeting} onJoin={onJoin} />
                        ))
                    )}
                </div>
            </section>
          </motion.div>
        )}

        {activeTab === "schedule" && <ScheduleView user={user} />}
        {activeTab === "gmail" && <CommunicationCenter user={user} />}
        {activeTab === "settings" && <SettingsView user={user} />}
        </AnimatePresence>
      </main>

      {/* New Room Modal */}
      {isNewRoomModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 backdrop-blur-md bg-blue-950/20">
           <motion.div 
             initial={{ opacity: 0, scale: 0.9 }}
             animate={{ opacity: 1, scale: 1 }}
             className="bg-white rounded-[3rem] w-full max-w-lg p-12 shadow-2xl relative border border-blue-100"
           >
              <button 
                onClick={() => setIsNewRoomModalOpen(false)}
                className="absolute top-8 right-8 p-2 hover:bg-blue-50 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-blue-300" />
              </button>

              <div className="text-center space-y-8">
                  <div className="w-24 h-24 flex items-center justify-center mx-auto mb-4">
                    <img 
                      src={logoImg} 
                      alt="Wabiseminar Logo" 
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-3xl font-heading uppercase text-blue-900 tracking-tight">Initiate Seminar</h2>
                    <p className="text-blue-400 font-medium whitespace-pre-line">Select your session deployment method.{"\n"}Instant availability or planned delivery.</p>
                  </div>

                  <div className="grid gap-4 pt-4">
                      <button 
                         onClick={() => {
                           onStartNew();
                           setIsNewRoomModalOpen(false);
                         }}
                         className="flex items-center gap-6 p-6 bg-blue-50 rounded-3xl border border-blue-100 hover:border-orange-600 transition-all text-left group"
                      >
                         <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                            <Clock className="w-6 h-6 text-blue-600" />
                         </div>
                         <div>
                            <div className="font-bold text-blue-950">Immediate Session</div>
                            <div className="text-[10px] uppercase font-black tracking-widest text-blue-400">Start room for now</div>
                         </div>
                         <ChevronRight className="w-5 h-5 ml-auto text-blue-200 group-hover:text-orange-600" />
                      </button>

                      <button 
                         onClick={() => {
                            setActiveTab("schedule");
                            setIsNewRoomModalOpen(false);
                         }}
                         className="flex items-center gap-6 p-6 bg-white border border-blue-100 rounded-3xl hover:border-orange-600 transition-all text-left group"
                      >
                         <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                            <Calendar className="w-6 h-6 text-orange-600" />
                         </div>
                         <div>
                            <div className="font-bold text-blue-950">Schedule for Later</div>
                            <div className="text-[10px] uppercase font-black tracking-widest text-blue-400">Reserve a future slot</div>
                         </div>
                         <ChevronRight className="w-5 h-5 ml-auto text-blue-200 group-hover:text-orange-600" />
                      </button>
                  </div>
              </div>
           </motion.div>
        </div>
      )}
    </div>
  );
}

function HistoryItem({ meeting, onJoin }) {
  const [showParticipants, setShowParticipants] = useState(false);
  const [participants, setParticipants] = useState([]);

  const toggleParticipants = async () => {
    if (!showParticipants) {
      const res = await fetch(`/api/meetings/${meeting.id}/participants`);
      const data = await res.json();
      setParticipants(data);
    }
    setShowParticipants(!showParticipants);
  };

  const isEnded = JSON.parse(meeting.settings || "{}").ended;

  return (
    <div className="bg-white hover:bg-paper transition-all overflow-hidden border-b border-ink/5">
      <div className="p-8 flex items-center gap-12 group">
        <div className="w-16 h-16 brutal-border flex items-center justify-center bg-paper group-hover:bg-white transition-colors">
            <Video className={`w-5 h-5 transition-colors ${isEnded ? "text-ink/5" : "text-ink/20 group-hover:text-accent"}`} />
        </div>
        <div className="flex-1 space-y-2">
            <h3 className={`font-bold text-xl text-ink transition-transform ${!isEnded && "group-hover:translate-x-1"}`}>{meeting.name}</h3>
            <div className="flex items-center gap-6 text-[9px] font-black uppercase tracking-widest text-ink/40">
                <span className="flex items-center gap-1.5"><Clock className="w-3 h-3 opacity-30" /> {new Date(meeting.created_at).toLocaleDateString()}</span>
                <span className="flex items-center gap-1.5">ID: {meeting.id}</span>
                {isEnded && <span className="text-red-500 italic">Concluded</span>}
            </div>
        </div>
        <div className="flex items-center gap-4">
            <button 
                className="px-5 py-2.5 border border-ink/10 text-[9px] font-black uppercase tracking-widest hover:bg-white transition-all flex items-center gap-2"
                onClick={toggleParticipants}
            >
                <User className="w-3 h-3" />
                {showParticipants ? "Hide Participants" : "View Participants"}
            </button>
            {!isEnded && (
              <button 
                  onClick={() => onJoin(meeting.id)}
                  className="h-10 px-6 bg-ink text-paper text-[9px] font-black uppercase tracking-widest hover:bg-accent transition-all"
              >
                  Restore
              </button>
            )}
        </div>
      </div>
      <AnimatePresence>
        {showParticipants && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: "auto", opacity: 1 }} 
            exit={{ height: 0, opacity: 0 }} 
            className="border-t border-ink/5 bg-paper/20"
          >
            <div className="p-8 space-y-4">
              <div className="text-[9px] font-black uppercase tracking-widest text-ink/30">Participant List</div>
              {participants.length === 0 ? (
                <div className="text-xs italic text-ink/20">No participant data recorded.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {participants.map((p, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-white p-4 brutal-border">
                      <div className="w-8 h-8 bg-paper flex items-center justify-center text-[10px] font-black">{p.user_name?.[0] || 'U'}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-black truncate">{p.user_name}</div>
                        <div className="text-[8px] text-ink/40 truncate">{p.email}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CommunicationCenter({ user }) {
  const [emails, setEmails] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const fetchEmails = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/gmail/list", {
        headers: { "x-user-id": user.id }
      });
      const data = await res.json();
      if (res.ok) setEmails(data);
      else throw new Error(data.error);
    } catch (err) {
      console.error(err);
      // alert("Failed to fetch emails. Ensure Google account is linked.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    setIsSending(true);
    try {
      const res = await fetch("/api/gmail/send", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-user-id": user.id 
        },
        body: JSON.stringify({ to, subject, body })
      });
      if (res.ok) {
        alert("Email dispatched successfully!");
        setShowCompose(false);
        setTo(""); setSubject(""); setBody("");
      } else {
        const data = await res.json();
        throw new Error(data.error);
      }
    } catch (err) {
      alert("Transmission failed: " + err.message);
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    if (user.google_refresh_token) {
      fetchEmails();
    }
  }, [user.google_refresh_token]);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-12">
      <header className="flex justify-between items-center">
        <div className="space-y-1">
          <h1 className="text-4xl font-heading uppercase tracking-tight text-blue-950">Email Center</h1>
          <p className="text-blue-400 font-medium font-sans">Secure Gmail integration for seminar coordination.</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={fetchEmails}
            className="p-4 bg-white border border-blue-100 rounded-2xl hover:bg-blue-50 transition-all text-blue-950 shadow-sm"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <button 
            onClick={() => setShowCompose(!showCompose)}
            className="px-8 py-4 bg-orange-600 text-white font-black uppercase tracking-widest text-[10px] flex items-center gap-3 hover:bg-orange-700 hover:-translate-y-1 transition-all shadow-xl shadow-orange-600/20 rounded-2xl"
          >
            <Send className="w-4 h-4" /> {showCompose ? "View Inbox" : "Compose Email"}
          </button>
        </div>
      </header>

      {showCompose ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl bg-white border border-blue-50 rounded-[3rem] p-12 shadow-2xl space-y-8">
          <h2 className="text-2xl font-heading uppercase text-blue-900">New Message</h2>
          <form onSubmit={handleSend} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-blue-400">Recipient Address</label>
              <input 
                required
                type="email"
                value={to}
                onChange={e => setTo(e.target.value)}
                placeholder="operative@domain.com"
                className="w-full bg-blue-50 border border-blue-100 p-4 rounded-2xl text-sm focus:border-orange-600 focus:outline-none transition-all shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-blue-400">Subject Protocol</label>
              <input 
                required
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="SEMINAR UPDATE: REVISED SCHEDULE"
                className="w-full bg-blue-50 border border-blue-100 p-4 rounded-2xl text-sm focus:border-orange-600 focus:outline-none transition-all shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-blue-400">Message Content</label>
              <textarea 
                required
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Enter technical details..."
                className="w-full bg-blue-50 border border-blue-100 p-6 rounded-[2rem] text-sm focus:border-orange-600 focus:outline-none transition-all h-64 resize-none shadow-sm"
              />
            </div>
            <button 
              type="submit"
              disabled={isSending}
              className="w-full py-5 bg-blue-950 text-white font-black uppercase tracking-widest text-[10px] rounded-[2rem] hover:bg-orange-600 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
            >
              <Send className="w-4 h-4" />
              {isSending ? "SENDING..." : "SEND MESSAGE"}
            </button>
          </form>
        </motion.div>
      ) : (
        <div className="grid gap-6">
          {!user.google_refresh_token && (
            <div className="p-8 bg-orange-50 border border-orange-100 rounded-[2.5rem] text-center space-y-4">
              <Shield className="w-12 h-12 text-orange-600 mx-auto" />
              <h3 className="text-xl font-heading uppercase text-blue-950">Identity Linking Required</h3>
              <p className="text-blue-400 font-medium max-w-sm mx-auto text-sm">To access Gmail capabilities, you must link your Professional Google identity via the Account Settings or Security Center.</p>
            </div>
          )}
          
          {isLoading ? (
            <div className="p-20 flex flex-col items-center gap-4 text-blue-300">
              <RefreshCw className="w-10 h-10 animate-spin" />
              <span className="text-[10px] font-black uppercase tracking-widest">Loading Emails...</span>
            </div>
          ) : emails.length === 0 ? (
            <div className="p-20 border-2 border-dashed border-blue-100 rounded-[3rem] flex flex-col items-center gap-4 text-blue-200">
               <Mail className="w-16 h-16" />
               <p className="text-sm font-bold uppercase tracking-widest">No messages found.</p>
            </div>
          ) : (
            emails.map(email => (
              <div 
                key={email.id}
                className="p-8 bg-white border border-blue-50 rounded-[3rem] hover:shadow-2xl transition-all group flex items-start gap-8"
              >
                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100 text-blue-200 font-black text-xl group-hover:bg-orange-600 group-hover:text-white transition-all">
                  {email.from[0]}
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg text-blue-950">{email.subject}</h3>
                      <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mt-1">From: {email.from}</p>
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-blue-300 bg-blue-50 px-3 py-1 rounded-full">{email.date?.split(" ").slice(0, 4).join(" ")}</span>
                  </div>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed line-clamp-2">{email.snippet}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </motion.div>
  );
}

function SettingsView({ user }) {
  const [profile, setProfile] = useState({
    name: user.name,
    email: user.email || "",
    organization: "Global University",
    notifications: true,
    autoRecord: false
  });

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }} 
      animate={{ opacity: 1, x: 0 }} 
      className="max-w-4xl space-y-12"
    >
      <header>
        <h1 className="text-4xl font-heading uppercase tracking-tight text-blue-950 mb-2">Seminar Settings</h1>
        <p className="text-blue-400 font-medium">Fine-tune your professional broadcasting environment.</p>
      </header>

      <div className="grid md:grid-cols-2 gap-12">
        <div className="space-y-8">
           <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-orange-600">Profile Identity</h3>
              <div className="space-y-4">
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-blue-400/80">Broadcaster Name</label>
                    <input 
                      type="text" 
                      value={profile.name}
                      onChange={e => setProfile({...profile, name: e.target.value})}
                      className="w-full bg-white border border-blue-100 p-4 rounded-2xl focus:border-orange-600 focus:outline-none transition-all shadow-sm"
                    />
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-blue-400/80">Organization</label>
                    <input 
                      type="text" 
                      value={profile.organization}
                      onChange={e => setProfile({...profile, organization: e.target.value})}
                      className="w-full bg-white border border-blue-100 p-4 rounded-2xl focus:border-orange-600 focus:outline-none transition-all shadow-sm"
                    />
                 </div>
              </div>
           </div>

           <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-orange-600">Permissions</h3>
              <div className="space-y-3">
                 <Toggle label="Email Notifications" active={profile.notifications} onToggle={() => setProfile({...profile, notifications: !profile.notifications})} />
                 <Toggle label="Auto-Record Sessions" active={profile.autoRecord} onToggle={() => setProfile({...profile, autoRecord: !profile.autoRecord})} />
                 
                 <div className="flex items-center justify-between p-4 bg-white border border-blue-50 rounded-2xl group hover:border-orange-600 transition-all">
                    <span className="text-sm font-bold text-blue-950">Google Account Connection</span>
                    <button 
                      type="button"
                      onClick={async () => {
                        const res = await fetch("/api/auth/google/url");
                        const { url } = await res.json();
                        window.open(url, "google_login", "width=500,height=600");
                      }}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${user.google_refresh_token ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-blue-50 text-blue-600 border border-blue-100 hover:bg-orange-600 hover:text-white"}`}
                    >
                      {user.google_refresh_token ? "Linked & Active" : "Link Google Account"}
                    </button>
                  </div>
              </div>
           </div>
        </div>

        <div className="bg-blue-900 p-8 rounded-[3rem] text-white space-y-8 shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl text-orange-600" />
           <div className="space-y-4 relative">
              <h3 className="text-2xl font-heading uppercase">Broadcaster Access</h3>
              <div className="text-[10px] font-black uppercase tracking-widest text-blue-300">Professional Account Active</div>
           </div>
           
           <div className="space-y-4">
              <div className="flex items-center gap-3 text-xs font-bold">
                 <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-[8px] font-black text-white">✓</div>
                 Unlimited HD Seminars
              </div>
              <div className="flex items-center gap-3 text-xs font-bold">
                 <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-[8px] font-black text-white">✓</div>
                 Enhanced Transcripts Enabled
              </div>
              <div className="flex items-center gap-3 text-xs font-bold">
                 <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-[8px] font-black text-white">✓</div>
                 Global CDN Delivery Active
              </div>
           </div>

           <div className="pt-4">
             <p className="text-[9px] font-black uppercase tracking-widest text-blue-300 opacity-60">Status: Fully Provisioned</p>
           </div>
        </div>
      </div>
    </motion.div>
  );
}

function Toggle({ label, active, onToggle }) {
  return (
    <button 
      onClick={onToggle}
      className="w-full flex items-center justify-between p-4 bg-white border border-blue-50 rounded-2xl group hover:border-orange-600 transition-all"
    >
      <span className="text-sm font-bold text-blue-950">{label}</span>
      <div className={`w-12 h-6 rounded-full p-1 transition-colors ${active ? "bg-orange-600" : "bg-blue-100"}`}>
         <div className={`w-4 h-4 bg-white rounded-full transition-transform ${active ? "translate-x-6" : "translate-x-0"}`} />
      </div>
    </button>
  );
}


function ScheduleView({ user }) {
  const [meetingName, setMeetingName] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [studentsText, setStudentsText] = useState(""); // Comma separated emails
  const [scheduledResult, setScheduledResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  const downloadTemplate = () => {
    const csvContent = "Name,Email\nJohn Doe,john@example.com\nJane Smith,jane@example.com";
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "seminar_invite_template.csv";
    a.click();
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split("\n").slice(1); // Skip header
      const formatted = lines
        .map(line => {
          const [name, email] = line.split(",").map(s => s?.trim());
          if (name && email) return `${name} ${email}`;
          return null;
        })
        .filter(Boolean)
        .join("\n");
      setStudentsText(formatted);
    };
    reader.readAsText(file);
  };

  const handleSchedule = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const password = Math.random().toString(36).substring(2, 8).toUpperCase();
    const scheduledAt = `${date}T${time}:00`;

    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: meetingName,
          hostId: user.id,
          password,
          scheduledAt
        })
      });
      const data = await res.json();
      
      const meetingUrl = `${window.location.origin}/${data.meetingId}`;
      const emailContent = `
        <div style="font-family: sans-serif; padding: 40px; background: #f8fafc; border-radius: 20px;">
          <h2 style="color: #0f172a; margin-bottom: 20px;">WEB-SEMINAR INVITATION</h2>
          <p style="color: #64748b;">You have been invited to a professional seminar session.</p>
          <div style="background: white; padding: 30px; border-radius: 15px; margin: 30px 0; border: 1px solid #e2e8f0;">
            <p><strong>Topic:</strong> ${meetingName}</p>
            <p><strong>Scheduled At:</strong> ${new Date(scheduledAt).toLocaleString()}</p>
            <p><strong>Access Code:</strong> <span style="color: #ea580c; font-weight: bold;">${password}</span></p>
            <a href="${meetingUrl}" style="display: inline-block; background: #0f172a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 10px; margin-top: 20px;">Join Seminar Node</a>
          </div>
          <p style="font-size: 10px; color: #94a3b8; text-transform: uppercase;">Sent via Wabiseminar Core v2.1</p>
        </div>
      `;

      // Save allowlist and Send Emails
      if (studentsText.trim()) {
        const students = studentsText.split(showBulkUpload ? "\n" : ",").map(e => {
            const parts = e.trim().split(" ");
            const email = parts[parts.length - 1];
            const name = parts.slice(0, parts.length - 1).join(" ") || "Student";
            if (email && email.includes("@")) return { name, email };
            return null;
        }).filter(Boolean);

        if (students.length > 0) {
          await fetch(`/api/meetings/${data.meetingId}/allowlist`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ students })
          });

          // If Google integrated, auto-send invitations
          if (user.google_refresh_token) {
            for (const student of students) {
              await fetch("/api/gmail/send", {
                method: "POST",
                headers: { 
                  "Content-Type": "application/json",
                  "x-user-id": user.id 
                },
                body: JSON.stringify({ 
                  to: student.email, 
                  subject: `Invitation: ${meetingName}`, 
                  body: emailContent 
                })
              });
            }
          }
        }
      }

      setScheduledResult({ ...data, password, scheduledAt });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (scheduledResult) {
    const meetingUrl = `${window.location.origin}/${scheduledResult.meetingId}`;
    const emailBody = `Join the WEB-SEMINAR session:%0D%0A%0D%0AName: ${meetingName}%0D%0ATime: ${new Date(scheduledResult.scheduledAt).toLocaleString()}%0D%0ALink: ${meetingUrl}%0D%0APassword: ${scheduledResult.password}`;

    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col items-center justify-center text-center space-y-8">
        <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-[2.5rem] flex items-center justify-center shadow-xl shadow-emerald-500/10 border border-emerald-100">
          <Calendar className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-4xl font-heading uppercase tracking-tight text-blue-950">Seminar Reserved!</h2>
          <p className="text-blue-400 font-medium">Invitation credentials have been generated successfully.</p>
        </div>
        
        <div className="w-full max-w-md bg-white border border-blue-50 rounded-[3rem] p-8 space-y-6 text-left shadow-2xl shadow-blue-950/5">
           <div className="grid grid-cols-2 gap-6">
             <div className="space-y-1">
               <div className="text-[10px] font-black uppercase tracking-widest text-blue-300">Meeting ID</div>
               <div className="text-xl font-bold text-blue-950">{scheduledResult.meetingId}</div>
             </div>
             <div className="space-y-1">
               <div className="text-[10px] font-black uppercase tracking-widest text-blue-300">Access Code</div>
               <div className="text-xl font-bold text-orange-600 font-mono tracking-wider">{scheduledResult.password}</div>
             </div>
           </div>
           <div className="space-y-1">
             <div className="text-[10px] font-black uppercase tracking-widest text-blue-300">Seminar URL</div>
             <div className="text-xs font-mono text-blue-600 break-all bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex items-center justify-between">
                <span>{meetingUrl}</span>
                <button 
                    onClick={() => {
                        navigator.clipboard.writeText(meetingUrl);
                        alert("URL copied to clipboard!");
                    }}
                    className="p-2 hover:bg-white rounded-lg transition-colors"
                >
                    <ExternalLink className="w-3 h-3" />
                </button>
             </div>
           </div>
        </div>

        <div className="flex gap-4">
          <button 
            onClick={() => window.location.href = `mailto:?subject=WEB-SEMINAR invitation: ${meetingName}&body=${emailBody}`}
            className="px-10 py-5 bg-orange-600 text-white font-black uppercase tracking-widest text-xs rounded-full shadow-2xl shadow-orange-600/30 hover:bg-orange-700 transition-all hover:scale-110 active:scale-95"
          >
            Dispatch Invitation Email
          </button>
          <button 
            onClick={() => setScheduledResult(null)}
            className="px-10 py-5 bg-blue-100 text-blue-900 font-black uppercase tracking-widest text-xs rounded-full hover:bg-blue-200 transition-all"
          >
            Schedule Another
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col items-center justify-center space-y-12 max-w-4xl mx-auto">
      <div className="text-center space-y-3">
        <h2 className="text-5xl font-heading uppercase tracking-tight text-blue-950">Schedule Seminar</h2>
        <p className="text-blue-400 font-medium max-w-md mx-auto">Configure professional broadcast settings, timing protocols, and student access for your delivery.</p>
      </div>

      <form onSubmit={handleSchedule} className="w-full grid md:grid-cols-2 gap-12 bg-white/70 backdrop-blur-xl border border-blue-50 rounded-[4rem] p-12 shadow-2xl">
        <div className="space-y-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-orange-600 mb-4">Seminar Details</h3>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-blue-400">Meeting Identification Name</label>
              <input 
                required
                value={meetingName}
                onChange={e => setMeetingName(e.target.value)}
                placeholder="Ex. ADVANCED MACHINE LEARNING WORKSHOP"
                className="w-full bg-blue-50 border border-blue-100 p-4 rounded-2xl text-sm focus:border-orange-600 focus:outline-none transition-all shadow-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-blue-400">Broadcast Date</label>
                <input 
                  required
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full bg-blue-50 border border-blue-100 p-4 rounded-2xl text-sm focus:border-orange-600 focus:outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-blue-400">Launch Time</label>
                <input 
                  required
                  type="time"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  className="w-full bg-blue-50 border border-blue-100 p-4 rounded-2xl text-sm focus:border-orange-600 focus:outline-none transition-all"
                />
              </div>
            </div>
        </div>

        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-widest text-orange-600">Access Protocols</h3>
                <button 
                    type="button"
                    onClick={() => setShowBulkUpload(!showBulkUpload)}
                    className="text-[9px] font-black uppercase tracking-widest text-blue-400 hover:text-blue-900 transition-colors"
                >
                    {showBulkUpload ? "Switch to Manual Mode" : "Switch to Bulk Mode"}
                </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <label className="text-[10px] font-black uppercase tracking-widest text-blue-400">
                  {showBulkUpload ? "Batch Synchronization List" : "Direct Delivery Addresses"}
                </label>
                {showBulkUpload && (
                  <button 
                    type="button"
                    onClick={downloadTemplate}
                    className="text-[8px] font-bold uppercase tracking-widest text-orange-600 hover:underline"
                  >
                    Download Template
                  </button>
                )}
              </div>
              
              {showBulkUpload ? (
                <div className="space-y-4">
                   <div className="relative group">
                      <input 
                        type="file" 
                        accept=".csv,.txt"
                        onChange={handleFileUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="w-full bg-blue-50 border-2 border-dashed border-blue-100 p-8 rounded-[2rem] text-center group-hover:border-orange-600 transition-all">
                        <Plus className="w-6 h-6 text-blue-300 mx-auto mb-2" />
                        <div className="text-[10px] font-black uppercase tracking-widest text-blue-400">Upload CSV Source</div>
                      </div>
                   </div>
                   <textarea 
                    value={studentsText}
                    onChange={e => setStudentsText(e.target.value)}
                    placeholder="Names and Emails detected will appear here..."
                    className="w-full bg-blue-50 border border-blue-100 p-4 rounded-[1rem] text-sm focus:border-orange-600 focus:outline-none transition-all resize-none h-32 shadow-sm"
                  />
                </div>
              ) : (
                <textarea 
                  value={studentsText}
                  onChange={e => setStudentsText(e.target.value)}
                  placeholder="student1@email.com, student2@email.com"
                  className="w-full bg-blue-50 border border-blue-100 p-4 rounded-[2rem] text-sm focus:border-orange-600 focus:outline-none transition-all resize-none h-48 shadow-sm"
                />
              )}
              
              <p className="text-[10px] text-blue-300 font-medium italic leading-relaxed">
                Invited participants will be matched for admission upon entry attempts.
              </p>
            </div>

            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full py-5 bg-blue-950 text-white font-black uppercase tracking-widest text-[10px] rounded-[2rem] shadow-2xl shadow-blue-900/20 hover:bg-orange-600 transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3"
            >
              <Calendar className="w-4 h-4" />
              {isSubmitting ? "SCHEDULING..." : "Schedule Seminar"}
            </button>
        </div>
      </form>
    </motion.div>
  );
}

function PlaceholderView({ icon, title, desc }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 max-w-2xl mx-auto">
      <div className="w-24 h-24 bg-white rounded-[2.5rem] flex items-center justify-center text-slate-300 border border-slate-200 shadow-2xl shadow-slate-200/50">
        {icon && <div className="scale-[2]">{icon}</div>}
      </div>
      <div className="space-y-2">
        <h2 className="text-4xl font-heading uppercase tracking-tight text-slate-900">{title}</h2>
        <p className="text-slate-500 font-medium leading-relaxed">{desc}</p>
      </div>
      <button className="px-8 py-3 bg-slate-100 border border-slate-200 rounded-full text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:border-orange-600 transition-colors">
        Coming Soon in V1.2
      </button>
    </div>
  );
}

function NavBtn({ icon, label, active = false, onClick }) {
    return (
        <button 
          onClick={onClick}
          className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all group cursor-pointer ${active ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-slate-500 hover:bg-accent/5 hover:text-accent"}`}
        >
            <div className="flex items-center gap-2 relative">
                <img 
                  src={logoImg} 
                  alt="" 
                  className={`w-3.5 h-3.5 object-contain transition-opacity ${active ? "opacity-100 brightness-0 invert" : "opacity-40 group-hover:opacity-100"}`}
                  referrerPolicy="no-referrer"
                />
                <span className="w-5 h-5 flex items-center justify-center">{icon}</span>
            </div>
            <span className="text-sm font-bold tracking-tight">{label}</span>
        </button>
    );
}

function StatCard({ label, value, color = "text-slate-900" }) {
    return (
        <div className="p-8 bg-white border border-slate-200 rounded-[2.5rem] space-y-2 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</div>
            <div className={`text-4xl font-display font-black ${color}`}>{value}</div>
        </div>
    );
}
