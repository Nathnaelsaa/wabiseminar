import { useState, useEffect } from "react";
import { 
  Users, Plus, Trash2, Mail, Shield, ChevronLeft, Search, AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function Admin({ onBack }) {
  const [allowlist, setAllowlist] = useState([]);
  const [emailInput, setEmailInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAllowlist();
  }, []);

  const fetchAllowlist = async () => {
    try {
      const res = await fetch("/api/admin/allowlist");
      const data = await res.json();
      setAllowlist(data);
      setIsLoading(false);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch register emails");
      setIsLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!emailInput) return;

    try {
      const res = await fetch("/api/admin/allowlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailInput, name: nameInput })
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to add email");
      }

      setEmailInput("");
      setNameInput("");
      setError(null);
      fetchAllowlist();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await fetch(`/api/admin/allowlist/${id}`, { method: "DELETE" });
      fetchAllowlist();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredList = allowlist.filter(item => 
    item.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (item.name && item.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans">
      {/* Header */}
      <header className="p-8 border-b border-white/5 bg-white/[0.02] backdrop-blur-xl flex items-center justify-between z-10">
        <div className="flex items-center gap-6">
          <button 
            onClick={onBack}
            className="p-3 bg-white/5 hover:bg-orange-600 rounded-2xl transition-all group"
          >
            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-600/20">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-white font-heading">Super-Admin Console</h1>
              <p className="text-[10px] font-black uppercase tracking-widest text-orange-500">Global Registry Management</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Add Section */}
          <div className="lg:col-span-4 space-y-6">
            <div className="p-8 bg-white/[0.03] border border-white/5 rounded-[2.5rem] space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-600/10 rounded-full">
                <Plus className="w-3 h-3 text-orange-500" />
                <span className="text-[9px] font-black uppercase tracking-widest text-orange-500">Register New Entity</span>
              </div>
              
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 px-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                    <input 
                      type="email"
                      required
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="e.g. academic@peer.org"
                      className="w-full bg-white/[0.05] border border-white/10 p-4 pl-12 rounded-2xl text-xs focus:border-orange-600 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 px-1">Display Name (Optional)</label>
                  <div className="relative">
                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                    <input 
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="e.g. Dr. John Doe"
                      className="w-full bg-white/[0.05] border border-white/10 p-4 pl-12 rounded-2xl text-xs focus:border-orange-600 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <p className="text-[10px] font-bold uppercase">{error}</p>
                  </div>
                )}

                <button 
                  type="submit"
                  className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-orange-600/20 transition-all active:scale-95"
                >
                  Register Email
                </button>
              </form>
            </div>
            
            <div className="p-6 bg-blue-600/5 border border-blue-600/10 rounded-[2rem]">
               <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-2">Control Log</h4>
               <p className="text-[11px] text-blue-200/60 leading-relaxed font-medium"> Registering an email grants global access to the Wabiseminar platform. These users bypass standard gatekeeping protocols. </p>
            </div>
          </div>

          {/* List Section */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            <div className="flex items-center justify-between bg-white/[0.03] border border-white/5 px-6 py-4 rounded-[2rem]">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                <input 
                  type="text"
                  placeholder="Search registered peers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent p-2 pl-12 rounded-xl text-xs focus:outline-none placeholder:text-zinc-600 font-bold"
                />
              </div>
              <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 bg-white/5 py-2 px-4 rounded-full">
                {filteredList.length} Entities Found
              </div>
            </div>

            <div className="bg-white/[0.03] border border-white/5 rounded-[2.5rem] overflow-hidden flex flex-col h-[calc(100vh-25rem)]">
              <div className="grid grid-cols-12 px-8 py-5 border-b border-white/5 text-[9px] font-black uppercase tracking-widest text-zinc-500">
                <div className="col-span-5">Identity / Email</div>
                <div className="col-span-4">Registration Date</div>
                <div className="col-span-3 text-right">Actions</div>
              </div>
              
              <div className="flex-1 overflow-y-auto scrollbar-hide">
                <AnimatePresence initial={false}>
                  {filteredList.map((item) => (
                    <motion.div 
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="grid grid-cols-12 px-8 py-5 border-b border-white/[0.02] hover:bg-white/[0.01] transition-colors items-center group"
                    >
                      <div className="col-span-5 flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-white group-hover:text-orange-500 transition-colors">{item.name}</span>
                        <span className="text-[10px] text-zinc-500 font-medium">{item.email}</span>
                      </div>
                      <div className="col-span-4 text-[10px] text-zinc-400 font-mono">
                        {new Date(item.created_at).toLocaleDateString()}
                      </div>
                      <div className="col-span-3 flex justify-end">
                        <button 
                          onClick={() => handleDelete(item.id)}
                          className="p-2.5 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {filteredList.length === 0 && !isLoading && (
                  <div className="h-full flex flex-col items-center justify-center p-12 text-center opacity-40">
                    <Mail className="w-12 h-12 mb-4 text-zinc-500" />
                    <p className="text-xs font-bold uppercase tracking-widest">No matching records</p>
                  </div>
                )}

                {isLoading && (
                   <div className="h-full flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
                   </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
