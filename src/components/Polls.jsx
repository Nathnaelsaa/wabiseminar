import { useState, useEffect } from "react";
import { BarChart2, X, Plus, Trash2, PieChart as PieIcon } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";

export default function Polls({ meetingId, user, onClose, socket }) {
  const [polls, setPolls] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newOptions, setNewOptions] = useState(["", ""]);

  useEffect(() => {
    fetch(`/api/meetings/${meetingId}/polls`)
      .then(res => res.json())
      .then(setPolls);

    if (socket) {
      socket.on("new-poll", (poll) => setPolls(prev => [poll, ...prev]));
      socket.on("poll-updated", ({ pollId, votes }) => {
        setPolls(prev => prev.map(p => p.id === pollId ? { ...p, votes } : p));
      });
    }
    return () => {
      socket?.off("new-poll");
      socket?.off("poll-updated");
    };
  }, [meetingId, socket]);

  const handleCreate = () => {
    if (!newQuestion.trim() || newOptions.some(o => !o.trim())) return;
    socket.emit("create-poll", {
      meetingId,
      question: newQuestion,
      options: newOptions
    });
    setNewQuestion("");
    setNewOptions(["", ""]);
    setShowCreate(false);
  };

  const handleVote = (pollId, index) => {
    socket.emit("vote", { pollId, userId: user.id, answerIndex: index, meetingId });
  };

  return (
    <div className="flex flex-col h-full bg-[#0d0d0d]">
      <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
        <h2 className="text-xl font-heading font-bold uppercase tracking-widest flex items-center gap-3">
          Seminar Polls <span className="px-2 py-0.5 bg-zinc-800 rounded text-[10px] text-zinc-500 font-black">{polls.length}</span>
        </h2>
        <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
          <X className="w-5 h-5 text-zinc-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
        {showCreate ? (
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl space-y-6">
            <h3 className="text-xs font-display font-black uppercase tracking-widest text-zinc-500">Create New Poll</h3>
            <input 
              value={newQuestion}
              onChange={e => setNewQuestion(e.target.value)}
              placeholder="What's your question?"
              className="w-full bg-black border border-zinc-800 focus:border-white focus:outline-none p-4 rounded-xl text-sm"
            />
            <div className="space-y-3">
              {newOptions.map((opt, i) => (
                <div key={i} className="flex gap-2">
                   <input 
                    value={opt}
                    onChange={e => {
                        const next = [...newOptions];
                        next[i] = e.target.value;
                        setNewOptions(next);
                    }}
                    placeholder={`Option ${i + 1}`}
                    className="flex-1 bg-black border border-zinc-800 p-3 rounded-lg text-xs"
                  />
                  {newOptions.length > 2 && (
                    <button onClick={() => setNewOptions(newOptions.filter((_, idx) => idx !== i))} className="p-2 text-zinc-600 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button 
                onClick={() => setNewOptions([...newOptions, ""])}
                className="w-full py-3 border border-dashed border-zinc-700 rounded-lg text-[10px] uppercase font-black tracking-widest text-zinc-500 hover:bg-white/5"
              >
                + Add Option
              </button>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-white">Cancel</button>
              <button onClick={handleCreate} className="flex-1 py-4 bg-white text-black font-black text-xs uppercase tracking-widest rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-transform">Launch</button>
            </div>
          </div>
        ) : (
          <button 
            onClick={() => setShowCreate(true)} 
            className="w-full p-6 border-2 border-dashed border-zinc-800 rounded-3xl flex flex-col items-center gap-3 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300 transition-all group"
          >
            <Plus className="w-8 h-8 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Start a New Session</span>
          </button>
        )}

        <div className="space-y-6">
          {polls.map(poll => {
            const pollData = poll.options.map((opt, i) => ({
              name: opt,
              votes: poll.votes.filter(v => v.answer_index === i).length
            }));
            const hasVoted = poll.votes.find(v => v.user_id === user.id);
            const totalVotes = poll.votes.length;

            return (
              <div key={poll.id} className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-3xl space-y-6">
                <div className="space-y-2">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-600">Active Poll</div>
                  <h3 className="text-lg font-bold leading-tight">{poll.question}</h3>
                </div>

                {!hasVoted ? (
                  <div className="space-y-2">
                    {poll.options.map((opt, i) => (
                      <button 
                        key={i} 
                        onClick={() => handleVote(poll.id, i)}
                        className="w-full p-4 bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-xl text-left text-sm font-medium transition-colors"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="h-48 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={pollData} layout="vertical">
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 10, fill: '#666' }} />
                          <Tooltip 
                            cursor={{ fill: 'transparent' }}
                            contentStyle={{ backgroundColor: '#000', border: '1px solid #333' }}
                          />
                          <Bar dataKey="votes" radius={[0, 4, 4, 0]}>
                            {pollData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#ea580c' : '#3f3f46'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-zinc-500">
                      <span className="flex items-center gap-2"><PieIcon className="w-3 h-3" /> {totalVotes} Votes</span>
                      <span>{Math.round((pollData[hasVoted.answer_index].votes / totalVotes) * 100)}% Match</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
