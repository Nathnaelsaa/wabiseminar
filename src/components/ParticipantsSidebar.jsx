import { useState } from "react";
import { 
  Users, Mic, MicOff, Video, VideoOff, Share, Hand, 
  ChevronLeft, ChevronRight, Search, Crown, X, Volume2, ShieldAlert
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function ParticipantsSidebar({
  participants = {},
  localUser = {},
  isLocalAudio = true,
  isLocalVideo = true,
  isLocalHand = false,
  isLocalScreen = false,
  isHost = false,
  activeSpeakerId = null,
  onHostAction = () => {}
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const participantList = Object.values(participants);
  const totalCount = participantList.length + 1;

  // Filter participants based on search query
  const filteredParticipants = participantList.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.email && p.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Sorted participants: Active speaker, Raised hand, host first, then alphabetical
  const sortedParticipants = [...filteredParticipants].sort((a, b) => {
    if (a.isRaised && !b.isRaised) return -1;
    if (!a.isRaised && b.isRaised) return 1;
    if (a.id === activeSpeakerId && b.id !== activeSpeakerId) return -1;
    if (a.id !== activeSpeakerId && b.id === activeSpeakerId) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="relative flex h-full select-none z-10" id="participants-sidebar">
      {/* Sidebar Container */}
      <motion.div
        animate={{ width: isCollapsed ? "64px" : "320px" }}
        transition={{ type: "spring", damping: 25, stiffness: 220 }}
        className="h-full bg-white border-r border-blue-50/50 flex flex-col shadow-2xl relative overflow-hidden shrink-0"
      >
        {/* Header */}
        <div className="p-4 border-b border-blue-50/50 flex items-center justify-between min-h-[64px]">
          {!isCollapsed ? (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2.5"
            >
              <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-blue-950">Roster Node</h3>
                <p className="text-[9px] font-black uppercase tracking-widest text-accent mt-0.5">
                  {totalCount} {totalCount === 1 ? "Active Peer" : "Active Peers"}
                </p>
              </div>
            </motion.div>
          ) : (
            <div className="mx-auto text-blue-600 font-black text-xs flex flex-col items-center gap-1">
              <Users className="w-5 h-5 text-blue-400" />
              <span className="text-[9px] text-accent font-black">{totalCount}</span>
            </div>
          )}
        </div>

        {/* Search Bar - Hidden when collapsed */}
        {!isCollapsed && (
          <motion.div 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 border-b border-blue-50/30"
          >
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-blue-300" />
              <input
                type="text"
                placeholder="Search peers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-blue-50/30 border border-blue-50/50 rounded-xl py-2 pl-9 pr-3 text-[10px] font-bold text-blue-950 focus:outline-none focus:border-accent placeholder:text-blue-300 transition-colors"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-300 hover:text-blue-950"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* List of Users */}
        <div className="flex-1 overflow-y-auto scrollbar-hide py-2 px-3 space-y-2">
          
          {/* Local User Row */}
          {!isCollapsed ? (
            <div className={`p-3 rounded-2xl border transition-all ${
              activeSpeakerId === localUser.id 
                ? "bg-blue-50/40 border-accent/30 shadow-sm ring-2 ring-accent/10" 
                : "bg-white border-blue-50/30"
            }`}>
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center text-xs font-black text-white shadow-md shadow-blue-600/10">
                    {localUser.name ? localUser.name[0].toUpperCase() : "U"}
                  </div>
                  {activeSpeakerId === localUser.id && (
                    <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full flex items-center justify-center">
                      <Volume2 className="w-1.5 h-1.5 text-white animate-pulse" />
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-blue-950 truncate">{localUser.name}</span>
                    <span className="text-[8px] bg-blue-100 text-blue-700 px-1 py-0.2 rounded-md font-black uppercase tracking-tight scale-90 shrink-0">You</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 text-[10px] text-blue-400">
                    {isHost && (
                      <span className="flex items-center gap-0.5 text-[8px] text-orange-600 font-bold bg-orange-50 border border-orange-100 px-1 py-0.2 rounded scale-90">
                        <Crown className="w-2.5 h-2.5" /> HOST
                      </span>
                    )}
                    {isLocalHand && (
                      <span className="flex items-center gap-0.5 text-[8px] text-orange-500 font-bold bg-orange-50 border border-orange-100 px-1 py-0.2 rounded scale-90">
                        <Hand className="w-2.5 h-2.5 fill-orange-500/20" /> SPEAK
                      </span>
                    )}
                  </div>
                </div>

                {/* Local Status Indicators */}
                <div className="flex items-center gap-1 shrink-0 bg-blue-50/30 p-1.5 rounded-lg border border-blue-50/20">
                  {isLocalAudio ? (
                    <Mic className="w-3.5 h-3.5 text-blue-500" />
                  ) : (
                    <MicOff className="w-3.5 h-3.5 text-red-500" />
                  )}
                  {isLocalVideo ? (
                    <Video className="w-3.5 h-3.5 text-blue-500" />
                  ) : (
                    <VideoOff className="w-3.5 h-3.5 text-red-500" />
                  )}
                  {isLocalScreen && (
                    <Share className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="mx-auto flex flex-col items-center gap-1.5 p-2 bg-blue-50/20 border border-blue-50/10 rounded-xl relative">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center text-[10px] font-black text-white">
                {localUser.name ? localUser.name[0].toUpperCase() : "U"}
              </div>
              <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-green-500 border border-white" />
              <div className="flex flex-col gap-0.5 items-center">
                {isLocalAudio ? <Mic className="w-3 h-3 text-blue-500" /> : <MicOff className="w-3 h-3 text-red-500" />}
                {isLocalVideo ? <Video className="w-3 h-3 text-blue-500" /> : <VideoOff className="w-3 h-3 text-red-500" />}
              </div>
            </div>
          )}

          {/* Divider */}
          {!isCollapsed && (
            <div className="py-2 flex items-center gap-2">
              <div className="h-px bg-blue-50/50 flex-1" />
              <span className="text-[8px] font-black uppercase tracking-widest text-blue-300">Peers</span>
              <div className="h-px bg-blue-50/50 flex-1" />
            </div>
          )}

          {/* Remote Participants */}
          {sortedParticipants.map(p => {
            const isSpeaker = p.id === activeSpeakerId;
            return !isCollapsed ? (
              <motion.div
                layoutId={`sidebar-peer-${p.id}`}
                key={p.id}
                className={`p-3 rounded-2xl border transition-all group ${
                  isSpeaker 
                    ? "bg-emerald-50/20 border-emerald-300/30 shadow-md ring-2 ring-emerald-500/10" 
                    : p.isRaised 
                    ? "bg-orange-50/30 border-orange-200/40"
                    : "bg-white hover:bg-blue-50/10 border-blue-50/30"
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center text-xs font-black text-blue-600 border border-blue-100">
                      {p.name ? p.name[0].toUpperCase() : "P"}
                    </div>
                    {isSpeaker && (
                      <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center animate-bounce">
                        <Volume2 className="w-1.5 h-1.5 text-white" />
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-xs text-blue-950 truncate block max-w-[130px]">{p.name}</span>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-1 mt-1">
                      {p.isRaised && (
                        <span className="flex items-center gap-0.5 text-[7px] text-orange-600 font-black bg-orange-50 border border-orange-100 px-1 py-0.2 rounded scale-90">
                          <Hand className="w-2.5 h-2.5 fill-orange-600/20" /> RAISED
                        </span>
                      )}
                      {p.isScreenSharing && (
                        <span className="flex items-center gap-0.5 text-[7px] text-emerald-600 font-black bg-emerald-50 border border-emerald-100 px-1 py-0.2 rounded scale-90">
                          <Share className="w-2.5 h-2.5" /> SCREEN
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions / Status Indicators */}
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Active indicators or control menu */}
                    <div className="flex items-center gap-1 bg-blue-50/10 p-1 rounded-lg border border-blue-50/10">
                      {p.isAudioEnabled ? (
                        <Mic className="w-3.5 h-3.5 text-blue-500" />
                      ) : (
                        <MicOff className="w-3.5 h-3.5 text-red-400" />
                      )}
                      {p.isVideoEnabled ? (
                        <Video className="w-3.5 h-3.5 text-blue-500" />
                      ) : (
                        <VideoOff className="w-3.5 h-3.5 text-red-400" />
                      )}
                    </div>

                    {/* Host quick controls overlay on hover */}
                    {isHost && (
                      <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 transition-opacity ml-1 pl-1 border-l border-blue-50">
                        <button
                          onClick={() => onHostAction(p.isAudioEnabled ? "mute" : "unmute", p.id, p.name)}
                          title={p.isAudioEnabled ? "Mute" : "Ask to unmute"}
                          className="p-1 text-blue-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          {p.isAudioEnabled ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => onHostAction("eject", p.id, p.name)}
                          title="Eject participant"
                          className="p-1 text-blue-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : (
              <div key={p.id} className="mx-auto flex flex-col items-center gap-1 p-2 bg-white border border-blue-50/20 rounded-xl relative shadow-sm hover:border-accent transition-colors">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-[10px] font-black text-blue-600 border border-blue-100">
                  {p.name ? p.name[0].toUpperCase() : "P"}
                </div>
                {p.isRaised && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full flex items-center justify-center">
                    <Hand className="w-1.5 h-1.5 text-white" />
                  </span>
                )}
                {isSpeaker && (
                  <div className="absolute top-0 left-0 w-2 h-2 rounded-full bg-emerald-500 border border-white" />
                )}
                <div className="flex flex-col gap-0.5 items-center">
                  {p.isAudioEnabled ? <Mic className="w-2.5 h-2.5 text-blue-400" /> : <MicOff className="w-2.5 h-2.5 text-red-400" />}
                  {p.isVideoEnabled ? <Video className="w-2.5 h-2.5 text-blue-400" /> : <VideoOff className="w-2.5 h-2.5 text-red-400" />}
                </div>
              </div>
            );
          })}

          {sortedParticipants.length === 0 && !isCollapsed && (
            <div className="p-8 text-center text-[10px] font-bold text-blue-300 italic uppercase tracking-wider">
              No matching peers
            </div>
          )}
        </div>
      </motion.div>

      {/* Collapse/Expand Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white border border-blue-100 hover:border-accent rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all text-blue-500 hover:text-accent z-20 cursor-pointer"
        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}
