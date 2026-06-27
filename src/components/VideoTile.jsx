import { useState, useEffect, useRef } from "react";
import { MicOff, VideoOff, Hand, Mic, Video, PhoneOff, Share } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function VideoTile({ 
  stream, name, isLocal, isAudioEnabled, isVideoEnabled, 
  isRaised, onDoubleClick, isPinned, mini,
  isHost, onMute, onVideoOff, onEject, isActiveSpeaker,
  isScreenSharing, reaction, reactionTimestamp
}) {
  const videoRef = useRef(null);
  const [showReaction, setShowReaction] = useState(false);

  useEffect(() => {
    if (reaction && reactionTimestamp) {
        setShowReaction(true);
        const timer = setTimeout(() => setShowReaction(false), 3000);
        return () => clearTimeout(timer);
    }
  }, [reaction, reactionTimestamp]);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <motion.div 
      layout
      onDoubleClick={onDoubleClick}
      animate={{ 
        borderColor: isActiveSpeaker ? "#10b981" : isRaised ? "#f59e0b" : "rgba(191,219,254,0.5)",
        boxShadow: isActiveSpeaker ? "0 0 30px rgba(16,185,129,0.3)" : "none",
        scale: isActiveSpeaker ? 1.02 : 1
      }}
      transition={{ duration: 0.3 }}
      className={`relative w-full h-full min-h-[120px] bg-white/50 backdrop-blur-md rounded-[2.5rem] overflow-hidden group border transition-all duration-500 shadow-2xl cursor-pointer ${isPinned ? "ring-2 ring-orange-600 ring-offset-4 ring-offset-white" : ""}`}
    >
      {/* Enhanced Raised Hand Overlay */}
      <AnimatePresence>
        {isRaised && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-amber-500/10 backdrop-blur-[2px] flex items-center justify-center z-20 pointer-events-none"
          >
             <motion.div
               animate={{ scale: [1, 1.1, 1], rotate: [0, -5, 5, 0] }}
               transition={{ repeat: Infinity, duration: 2 }}
               className="p-6 bg-white/40 backdrop-blur-xl rounded-full border border-amber-500/30 shadow-2xl"
             >
               <Hand className="w-16 h-16 text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.6)] fill-amber-500" />
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Video Content */}
      <AnimatePresence mode="wait">
        {isVideoEnabled && stream ? (
          <motion.div
            key="video-container"
            className="w-full h-full overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.video
              ref={videoRef}
              autoPlay
              playsInline
              muted={isLocal}
              className={`w-full h-full object-cover shadow-inner ${isLocal ? "-scale-x-100" : ""}`}
              animate={{
                scale: [1, 1.01, 1],
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                ease: "linear"
              }}
            />
          </motion.div>
        ) : (
          <motion.div 
            key="avatar"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full h-full flex flex-col items-center justify-center gap-6 bg-gradient-to-br from-blue-50 to-white overflow-hidden"
          >
            <motion.div 
              className={`rounded-3xl bg-blue-600 flex items-center justify-center font-black text-white shadow-2xl shadow-blue-600/30 border border-blue-500/20 ${mini ? "w-12 h-12 text-lg" : "w-16 h-16 md:w-28 md:h-28 text-2xl md:text-5xl"}`}
              animate={{
                y: [0, -4, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
               {name[0].toUpperCase()}
            </motion.div>
            {!mini && <div className="text-[10px] uppercase font-black tracking-[0.25em] text-blue-300">Wait Sync Connection</div>}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlay Info */}
      <div className={`absolute top-5 left-5 flex flex-col gap-2 z-10 ${mini ? "scale-75 origin-top-left" : ""}`}>
         <div className="bg-white/80 backdrop-blur-xl px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-tight text-blue-950 border border-blue-50 flex items-center gap-3 shadow-lg shadow-blue-900/5">
            <span className="truncate max-w-[150px]">{name}</span>
            {!isAudioEnabled && <MicOff className="w-3 h-3 text-red-500" />}
            {isActiveSpeaker && <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity }} className="w-2 h-2 rounded-full bg-emerald-500" />}
            {isScreenSharing && (
              <div className="flex items-center gap-1.5 text-blue-900 ml-1">
                <Share className="w-3 h-3 text-emerald-600" />
                <span className="text-[8px] font-black">PRESENTING</span>
              </div>
            )}
         </div>
      </div>

      {/* Host Controls */}
      {isHost && !isLocal && !mini && (
        <div className="absolute top-5 right-5 flex gap-2 opacity-0 group-hover:opacity-100 transition-all z-20">
          <button 
            onClick={(e) => { e.stopPropagation(); onMute(); }}
            className={`p-2.5 rounded-2xl backdrop-blur-xl border border-blue-100/50 transition-all shadow-lg ${isAudioEnabled ? "bg-white text-blue-400 hover:bg-orange-600 hover:text-white" : "bg-red-500 text-white shadow-red-500/20"}`}
          >
            {isAudioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onVideoOff(); }}
            className={`p-2.5 rounded-2xl backdrop-blur-xl border border-blue-100/50 transition-all shadow-lg ${isVideoEnabled ? "bg-white text-blue-400 hover:bg-orange-600 hover:text-white" : "bg-red-500 text-white shadow-red-500/20"}`}
          >
            {isVideoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onEject(); }}
            className="p-2.5 rounded-2xl backdrop-blur-xl border border-red-100 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-lg shadow-red-500/10"
          >
            <PhoneOff className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Hand Raise Indicator */}
      <AnimatePresence>
        {isRaised && (
            <motion.div 
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 20, opacity: 0 }}
                className={`absolute bg-orange-600 rounded-2xl shadow-xl shadow-orange-600/20 ring-4 ring-orange-100 z-20 ${isHost && !isLocal ? "top-20 right-5 p-2" : "top-5 right-5 p-2.5"}`}
            >
                <Hand className={`${isHost && !isLocal ? "w-4 h-4" : "w-6 h-6"} text-white fill-white`} />
            </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Reaction */}
      <AnimatePresence>
        {showReaction && (
          <motion.div
            initial={{ y: 0, opacity: 0, scale: 0.5 }}
            animate={{ y: -60, opacity: 1, scale: 1.5 }}
            exit={{ opacity: 0, scale: 2 }}
            className="absolute bottom-12 left-1/2 -translate-x-1/2 text-5xl z-30 pointer-events-none drop-shadow-2xl shadow-accent"
          >
            {reaction}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-blue-50/50 via-transparent h-24 opacity-0 group-hover:opacity-100 transition-all pointer-events-none" />
    </motion.div>
  );
}
