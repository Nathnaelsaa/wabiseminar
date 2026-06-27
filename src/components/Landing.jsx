import { useState, useEffect } from "react";
import { Video, Keyboard, ArrowRight, Shield, Zap, MessageSquare, Clock, Plus, Globe, Cpu, LogOut, CheckCircle2, Users, ShieldAlert, Award, VideoOff, Sparkles, Database } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import logoImg from "../assets/images/wabiseminar-1.png";

export default function Landing({ user, onJoin, onGoToDashboard, onLogout, onAuthRequest }) {
  const [meetingCode, setMeetingCode] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [timeString, setTimeString] = useState("");

  useEffect(() => {
    const updateTime = () => {
      setTimeString(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateMeeting = async () => {
    setIsCreating(true);
    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `${user.name}'s Seminar`, hostId: user.id }),
      });
      const data = await res.json();
      onJoin(data.meetingId);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  const isGuest = user.isGuest;

  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink selection:bg-accent selection:text-white technical-grid overflow-x-hidden">
      {/* Structural Header */}
      <header className="fixed top-0 w-full h-24 border-b border-accent/10 flex items-center justify-between px-6 md:px-12 z-50 bg-paper/90 backdrop-blur-md">
        <div className="flex items-center gap-12 h-full">
          <div className="flex items-center gap-3 select-none cursor-pointer" onClick={onGoToDashboard}>
            <div className="w-12 h-12 border border-accent/20 rounded-xl flex items-center justify-center bg-white p-1.5 shadow-sm hover:scale-105 transition-transform duration-300">
               <img 
                src={logoImg} 
                alt="Wabi Seminar Logo" 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-sans font-black tracking-tighter text-xl uppercase text-accent">
                WABI<span className="text-brand-orange">SEMINAR</span>
              </span>
              <span className="text-[8px] font-black tracking-[0.25em] text-accent/50 uppercase -mt-0.5">
                EXCELLENCE IN LEARNING
              </span>
            </div>
          </div>

          <nav className="hidden lg:flex items-center h-full">
            <button 
              onClick={onGoToDashboard}
              className="px-6 h-full border-x border-accent/10 hover:bg-white hover:text-accent transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2 group"
            >
              <div className="w-2 h-2 rounded-full bg-brand-orange animate-pulse" />
              Lobby Dashboard
            </button>
            <div className="px-6 h-full border-r border-accent/10 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-accent">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              System Status: Active
            </div>
          </nav>
        </div>

        <div className="flex items-center gap-4 md:gap-8 h-full">
            <div className="flex items-center gap-3 md:gap-6 text-[10px] font-black uppercase tracking-widest h-full">
               <div className="h-full hidden md:flex items-center px-6 border-l border-accent/10 font-mono text-accent">
                 <Clock className="w-4 h-4 mr-2 text-brand-orange" />
                 {timeString || "00:00:00"}
               </div>
               
               <button 
                onClick={onGoToDashboard}
                className="h-full px-4 md:px-6 border-l border-accent/10 flex items-center gap-3 hover:bg-white transition-all group"
              >
                <div className="w-7 h-7 rounded-lg border border-accent/20 flex items-center justify-center overflow-hidden bg-accent/5 font-sans font-bold text-xs text-accent">
                  {user.name && user.name.length > 0 ? user.name[0].toUpperCase() : 'U'}
                </div>
                <span className="hidden sm:inline group-hover:text-brand-orange transition-colors max-w-[100px] truncate">{user.name || "Guest"}</span>
              </button>

              <button 
                onClick={user.isGuest ? onAuthRequest : onLogout}
                className={`h-12 px-6 rounded-xl border border-accent/20 flex items-center gap-2.5 transition-all duration-300 font-bold uppercase tracking-wider text-[10px] ${user.isGuest ? 'bg-brand-orange text-white hover:bg-accent border-transparent shadow-lg shadow-brand-orange/20' : 'bg-white text-accent hover:bg-red-500 hover:text-white hover:border-transparent'}`}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{user.isGuest ? "Sign In" : "Logout"}</span>
              </button>
            </div>
        </div>
      </header>

      {/* Hero: Elegant Corporate & Modern Aesthetic */}
      <main className="flex-1 pt-24 flex flex-col">
        <section className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-[85vh]">
           {/* Left Content */}
           <div className="lg:col-span-7 flex flex-col justify-center px-6 md:px-16 lg:px-24 py-12 md:py-20 border-r border-accent/10 bg-gradient-to-br from-paper via-white/40 to-transparent">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="space-y-10 md:space-y-12"
              >
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-3 px-4 py-1.5 border border-accent/15 rounded-full text-[9px] font-black uppercase tracking-[0.2em] bg-white shadow-sm text-accent">
                    <Sparkles className="w-3 h-3 text-brand-orange animate-spin-slow" />
                    Interactive Seminar Suite
                  </div>
                  <h1 className="text-5xl md:text-7xl lg:text-[5.5rem] font-sans font-black uppercase leading-[0.9] tracking-tighter text-accent">
                    Where Knowledge <br />
                    <span className="text-brand-orange font-serif italic normal-case font-medium">Meets Synergy.</span>
                  </h1>
                </div>

                <p className="max-w-lg text-sm md:text-base lg:text-lg font-medium leading-relaxed text-slate-600">
                  Deliver pristine presentations with institutional-grade security, interactive live polling, high-fidelity screen audio, and dual-mode cloud recording buffer.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 max-w-xl">
                  <button
                    onClick={handleCreateMeeting}
                    disabled={isCreating}
                    className="group relative px-8 py-5 bg-accent text-white font-black uppercase tracking-widest text-[10px] rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-accent/30 flex items-center justify-center gap-3 shrink-0"
                  >
                    <span className="relative z-10">{isCreating ? "Starting..." : "Launch Seminar"}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform duration-300" />
                    <div className="absolute inset-0 bg-brand-orange translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                  </button>

                  <div className="relative group flex-1">
                    <input
                      type="text"
                      placeholder="Enter Access Code"
                      value={meetingCode}
                      onChange={(e) => setMeetingCode(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && meetingCode && onJoin(meetingCode)}
                      className="w-full px-6 py-5 bg-white border border-accent/15 focus:border-brand-orange focus:ring-1 focus:ring-brand-orange/20 focus:outline-none transition-all placeholder:text-accent/30 text-xs font-black uppercase tracking-widest rounded-2xl shadow-sm"
                    />
                     {meetingCode && (
                      <button 
                        onClick={() => onJoin(meetingCode)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 bg-brand-orange hover:bg-accent text-white rounded-xl transition-all shadow-md"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Features Badges */}
                <div className="pt-6 border-t border-accent/10 grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent/5 border border-accent/10 flex items-center justify-center text-accent shrink-0">
                      <Shield className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-wider text-accent">Secured Channels</h4>
                      <p className="text-[9px] text-slate-500 font-medium uppercase mt-0.5">Dual-layer token authorization</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent/5 border border-accent/10 flex items-center justify-center text-brand-orange shrink-0">
                      <Database className="w-4 h-4 text-brand-orange" />
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-wider text-accent">Cloud Buffering</h4>
                      <p className="text-[9px] text-slate-500 font-medium uppercase mt-0.5">Lossless session archiving</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent/5 border border-accent/10 flex items-center justify-center text-accent shrink-0">
                      <Users className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-wider text-accent">Audience Control</h4>
                      <p className="text-[9px] text-slate-500 font-medium uppercase mt-0.5">Moderator-enforced permissions</p>
                    </div>
                  </div>
                </div>
              </motion.div>
           </div>

           {/* Right Visual: Elegant Mockup Canvas */}
           <div className="lg:col-span-5 flex flex-col bg-white/30 backdrop-blur-sm relative overflow-hidden p-6 md:p-12 justify-center">
              {/* Decorative backgrounds */}
              <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-accent/5 blur-3xl pointer-events-none" />
              <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-brand-orange/5 blur-3xl pointer-events-none" />

              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 1 }}
                className="w-full max-w-md mx-auto bg-white border border-accent/15 rounded-[2.5rem] shadow-2xl p-6 relative overflow-hidden"
              >
                {/* Mock Window Header */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-accent/5">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                    <span className="text-[8px] font-black tracking-widest text-accent/50 uppercase ml-2">Seminar Node #901</span>
                  </div>
                  <span className="text-[8px] bg-brand-orange/15 text-brand-orange font-black px-2.5 py-0.5 rounded-full uppercase">
                    • Live Broadcast
                  </span>
                </div>

                {/* Main Video Stage Mock */}
                <div className="aspect-video bg-accent/5 border border-accent/10 rounded-2xl relative overflow-hidden flex flex-col items-center justify-center p-6 mb-6 group">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                  
                  {/* Outer circle layout matching the brand */}
                  <div className="w-20 h-20 rounded-2xl bg-white border border-accent/10 p-2 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-500 z-10">
                    <img 
                      src={logoImg} 
                      alt="Wabi Seminar Logo" 
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  {/* Mock presentation overlay */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between z-10 text-white">
                    <div className="bg-accent/80 backdrop-blur-md border border-accent/20 px-3 py-1 rounded-xl text-[8px] font-black uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      Wabi Seminar Room
                    </div>
                    <div className="bg-black/40 backdrop-blur-md px-3 py-1 rounded-xl text-[8px] font-black uppercase tracking-wider">
                      98 Participants
                    </div>
                  </div>
                </div>

                {/* Presenter / Info Strip */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-accent">Seminar Deployment</h4>
                      <p className="text-[9px] text-slate-500 font-bold uppercase mt-0.5">Host: {user.name || "Administrator"}</p>
                    </div>
                    <div className="flex gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                      <span className="w-2 h-2 rounded-full bg-brand-orange animate-pulse delay-150" />
                      <span className="w-2 h-2 rounded-full bg-accent animate-pulse delay-300" />
                    </div>
                  </div>

                  {/* Interactive audio/video status simulation */}
                  <div className="p-3 bg-accent/[0.03] border border-accent/5 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-accent/10 flex items-center justify-center text-accent text-[9px] font-black">
                        M
                      </div>
                      <span className="text-[8px] font-black uppercase tracking-wider text-accent/80">Broadcaster Audio Grid</span>
                    </div>
                    <div className="flex gap-0.5 items-end h-3">
                      <div className="w-0.5 h-2 bg-brand-orange rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-0.5 h-3 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                      <div className="w-0.5 h-1 bg-brand-orange rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      <div className="w-0.5 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0.5s' }} />
                      <div className="w-0.5 h-3 bg-brand-orange rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                    </div>
                  </div>
                </div>
              </motion.div>
           </div>
        </section>

        {/* Corporate Trust Banner */}
        <section className="bg-white border-y border-accent/10 py-8 px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-accent/50">
            Powered by Secure Real-Time Architecture
          </span>
          <div className="flex flex-wrap gap-6 md:gap-12 justify-center items-center text-[10px] font-black uppercase tracking-widest text-accent">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-brand-orange" />
              <span>Full HD Screen Audio</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-brand-orange" />
              <span>Lossless WebRTC Link</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-brand-orange" />
              <span>Durable Cloud Buffer</span>
            </div>
          </div>
        </section>

        {/* Simple Redesigned Brand Footer */}
        <footer className="border-t border-accent/10 p-6 md:p-12 flex flex-col md:flex-row justify-between items-center gap-6 bg-white">
           <div className="flex items-center gap-3">
             <div className="w-8 h-8 border border-accent/15 rounded-lg flex items-center justify-center bg-paper p-1 shadow-sm">
               <img src={logoImg} alt="Wabi Logo" referrerPolicy="no-referrer" className="w-full h-full object-contain" />
             </div>
             <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
               © {new Date().getFullYear()} WABI SEMINAR • INDEPENDENT BROADCAST NETWORK.
             </span>
           </div>
           
           <div className="flex items-center gap-8 text-[9px] font-black uppercase tracking-widest text-accent/60">
             <a href="#" className="hover:text-brand-orange transition-colors">Privacy Charter</a>
             <a href="#" className="hover:text-brand-orange transition-colors">Terms of Service</a>
             <a href="#" className="hover:text-brand-orange transition-colors">Broadcaster Support</a>
             <div className="w-2 h-2 rounded-full bg-emerald-500" />
           </div>
        </footer>
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 40s linear infinite;
        }
      `}} />
    </div>
  );
}
