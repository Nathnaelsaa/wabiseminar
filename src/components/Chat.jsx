import { useState, useEffect, useRef } from "react";
import { Send, X, Bot } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function Chat({ meetingId, user, onClose, socket }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const endRef = useRef(null);

  useEffect(() => {
    fetch(`/api/meetings/${meetingId}/messages`)
      .then(res => res.json())
      .then(setMessages);

    if (socket) {
      socket.on("new-message", (msg) => {
        setMessages(prev => [...prev, msg]);
      });
    }
    return () => socket?.off("new-message");
  }, [meetingId, socket]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || !socket) return;
    socket.emit("send-message", {
      meetingId,
      userId: user.id,
      userName: user.name,
      content: input
    });
    setInput("");
  };

  return (
    <div className="flex flex-col h-full bg-[#0d0d0d] relative">
      <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
        <h2 className="text-xl font-heading font-bold uppercase tracking-widest flex items-center gap-3">
          Seminar Chat <span className="px-2 py-0.5 bg-zinc-800 rounded text-[10px] text-zinc-500 font-black">{messages.length}</span>
        </h2>
        <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
          <X className="w-5 h-5 text-zinc-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
        {messages.map((m, i) => (
          <div key={m.id} className={`flex flex-col ${m.user_id === user.id ? "items-end" : "items-start"}`}>
            <span className="text-[10px] font-display uppercase font-bold text-zinc-600 mb-1 tracking-widest">{m.user_name}</span>
            <div className={`p-4 rounded-2xl max-w-[85%] text-sm leading-relaxed ${
              m.user_id === user.id 
                ? "bg-orange-600 text-white rounded-tr-none" 
                : "bg-zinc-800 text-zinc-300 rounded-tl-none border border-zinc-700"
            }`}>
              <ReactMarkdown>{m.content}</ReactMarkdown>
            </div>
            <span className="text-[9px] text-zinc-700 mt-1">{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="p-6 pt-2 bg-gradient-to-t from-[#0d0d0d] via-[#0d0d0d] to-transparent">
        <div className="relative group">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
            placeholder="Type a message..."
            className="w-full bg-zinc-900 border border-zinc-800 focus:border-orange-600 focus:ring-1 focus:ring-orange-600/20 focus:outline-none rounded-2xl p-4 pr-12 text-sm resize-none h-24 transition-all"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim()}
            className="absolute bottom-4 right-4 p-2 bg-orange-600 text-white rounded-lg hover:from-orange-500 hover:to-orange-700 disabled:opacity-50 transition-all shadow-lg"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
