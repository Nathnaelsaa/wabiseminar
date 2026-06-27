import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mail, Lock, User, ArrowRight, ShieldCheck, Zap, Orbit, X } from "lucide-react";

import logoImg from "../assets/images/wabiseminar-1.png";

export default function Auth({ onLoginSuccess, onClose }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Message listener moved to App.jsx for global OAuth handling
  }, [onLoginSuccess]);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/google/url");
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to initialize Google Login");
      }
      
      window.open(data.url, "google_login", "width=500,height=600");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Authentication failed");

      localStorage.setItem("wabiseminar-user", JSON.stringify(data));
      onLoginSuccess(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-paper flex items-center justify-center p-6 relative overflow-hidden technical-grid">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-1/3 h-full border-l border-ink/5 flex flex-col items-center justify-center pointer-events-none opacity-20">
         <span className="text-[20vh] font-black vertical-rl uppercase tracking-tighter text-ink opacity-10">PORTAL</span>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white brutal-border p-12 shadow-2xl relative"
      >
        <button 
          onClick={onClose}
          className="absolute -top-4 -right-4 w-8 h-8 brutal-border bg-ink text-paper flex items-center justify-center hover:bg-accent transition-all z-20 group"
          title="Close Auth"
        >
          <X className="w-4 h-4 group-hover:rotate-90 transition-transform" />
        </button>

        <div className="absolute -top-12 -left-12 w-24 h-24 border border-accent/15 rounded-2xl flex items-center justify-center bg-white p-4 shadow-xl">
           <img src={logoImg} alt="Wabi Seminar Logo" referrerPolicy="no-referrer" className="w-full h-full object-contain animate-pulse" />
        </div>

        <div className="mb-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-accent text-white text-[8px] font-black uppercase tracking-widest rounded-lg shadow-sm">
            {isLogin ? "Login Portal" : "Sign Up Portal"}
          </div>
          <div>
            <h1 className="text-4xl font-sans font-black uppercase text-accent tracking-tighter">
              {isLogin ? "Welcome Back" : "Create Account"}
            </h1>
            <p className="text-accent/60 text-[10px] font-black uppercase tracking-widest mt-2">
              WABI<span className="text-brand-orange">SEMINAR</span> Platform Node
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <AnimatePresence mode="wait">
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-1.5"
              >
                <label className="text-[9px] uppercase font-black tracking-widest text-accent/50">Full Name</label>
                <input
                  required={!isLogin}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-paper/30 border border-accent/10 py-4 px-6 text-sm text-ink placeholder:text-accent/20 focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange/10 transition-all font-medium rounded-2xl"
                  placeholder="Your Name"
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-1.5">
            <label className="text-[9px] uppercase font-black tracking-widest text-accent/50">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-paper/30 border border-accent/10 py-4 px-6 text-sm text-ink placeholder:text-accent/20 focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange/10 transition-all font-medium rounded-2xl"
              placeholder="name@example.com"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] uppercase font-black tracking-widest text-accent/50">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-paper/30 border border-accent/10 py-4 px-6 text-sm text-ink placeholder:text-accent/20 focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange/10 transition-all font-medium rounded-2xl"
              placeholder="Enter password"
            />
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-150 text-red-600 text-[9px] font-black uppercase tracking-widest leading-relaxed rounded-2xl">
              Alert: {error}
            </div>
          )}

          <button
            disabled={isLoading}
            className="w-full py-5 bg-brand-orange text-white text-[10px] font-black uppercase tracking-widest hover:bg-accent rounded-2xl shadow-lg shadow-brand-orange/15 hover:shadow-accent/15 transition-all duration-300 flex items-center justify-center gap-3 group/btn disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? "Signing in..." : isLogin ? "Sign In" : "Sign Up"}
            <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
          </button>

          <div className="flex items-center gap-4 py-2">
            <div className="h-px bg-accent/10 flex-1" />
            <span className="text-[8px] font-black text-accent/30 uppercase tracking-widest">External Access</span>
            <div className="h-px bg-accent/10 flex-1" />
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full py-4 bg-white border border-accent/15 text-accent text-[9px] font-black uppercase tracking-widest hover:bg-paper rounded-2xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer"
          >
            <svg className="w-4 h-4 text-brand-orange" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Secure Google Auth
          </button>
        </form>

        <div className="mt-12 pt-8 border-t border-ink/5 text-center flex flex-col gap-4">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-ink/40 text-[9px] font-black uppercase tracking-widest hover:text-accent transition-colors"
          >
            {isLogin ? "Need an account? Sign Up" : "Already have an account? Sign In"}
          </button>
          
          <div className="flex items-center justify-center gap-2 text-ink/20">
             <ShieldCheck className="w-3 h-3" />
             <span className="text-[8px] font-bold uppercase tracking-widest">Secure Connection</span>
          </div>
        </div>
      </motion.div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 10s linear infinite;
        }
        .vertical-rl {
          writing-mode: vertical-rl;
          transform: rotate(180deg);
        }
      `}} />
    </div>
  );
}
