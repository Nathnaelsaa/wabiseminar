import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import Peer from "peerjs";
import { 
  Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, 
  MessageSquare, Users, BarChart2, Share, Hand, Smile,
  ChevronRight, ChevronLeft, MoreVertical, Shield, X,
  Clock, Timer, Volume2, Plus, Search, Loader2, Database, Check, AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Chat from "./Chat.jsx";
import Polls from "./Polls.jsx";
import VideoTile from "./VideoTile.jsx";
import ParticipantsSidebar from "./ParticipantsSidebar.jsx";
import { SelfieSegmentation } from "@mediapipe/selfie_segmentation";
import { Camera } from "@mediapipe/camera_utils";

import logoImg from "../assets/images/wabiseminar-1.png";

export default function MeetingRoom({ meetingId, user, onLeave }) {
  const [meetingData, setMeetingData] = useState(null);
  const isHost = meetingData ? meetingData.host_id === user.id : false;
  const [participants, setParticipants] = useState({});
  const [localStream, setLocalStream] = useState(null);
  const [processedStream, setProcessedStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [backgroundEffect, setBackgroundEffect] = useState("none"); // none, blur, virtual
  const [virtualBackgroundImg, setVirtualBackgroundImg] = useState(null); // URL or string
  const [userReactions, setUserReactions] = useState({}); // { userId: { emoji, timestamp } }
  const [screenSharePermissions, setScreenSharePermissions] = useState({}); // { userId: boolean }
  const [activeSidebar, setActiveSidebar] = useState(null);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [showTimerMenu, setShowTimerMenu] = useState(false);
  const [screenSharePermission, setScreenSharePermission] = useState(true); 
  const [screenShareRequests, setScreenShareRequests] = useState([]);
  const [reactions, setReactions] = useState([]);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [pinnedUserId, setPinnedUserId] = useState(null);
  const [meetingDuration, setMeetingDuration] = useState(0);
  const [presentationTimer, setPresentationTimer] = useState(null);
  const [showTimerSettings, setShowTimerSettings] = useState(false);
  const [recorder, setRecorder] = useState(null);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [recordingApprovalStatus, setRecordingApprovalStatus] = useState("idle"); // idle, pending, approved, rejected
  const [recordingRequests, setRecordingRequests] = useState([]); // Array of { userId, userName }
  const [serverRecordings, setServerRecordings] = useState([]);
  const chunksRef = useRef([]);
  
  const [admissionStatus, setAdmissionStatus] = useState("checking"); // checking, approved, pending, rejected, unauthorized
  const [notifications, setNotifications] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [studentDetails, setStudentDetails] = useState({ name: user.name, email: user.email || "" });
  const [activeSpeakerId, setActiveSpeakerId] = useState(null);
  const [allowlistInput, setAllowlistInput] = useState("");
  const [allowlist, setAllowlist] = useState([]);
  const [isUpdatingAllowlist, setIsUpdatingAllowlist] = useState(false);
  const [participantsSearchQuery, setParticipantsSearchQuery] = useState("");
  const [activityLog, setActivityLog] = useState([]);
  const [confirmAction, setConfirmAction] = useState(null); // { action, targetUserId, targetName }

  const socketRef = useRef(null);
  const peerRef = useRef(null);
  const peersRef = useRef({});
  const speakerTimeoutRef = useRef(null);

  const [isLocked, setIsLocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);

  const canvasRef = useRef(document.createElement("canvas"));
  const inputVideoRef = useRef(document.createElement("video"));

  useEffect(() => {
    if (!localStream || backgroundEffect === "none") {
      setProcessedStream(null);
      return;
    }

    const selfieSegmentation = new SelfieSegmentation({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
    });

    selfieSegmentation.setOptions({
      modelSelection: 1,
    });

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const video = inputVideoRef.current;
    
    video.srcObject = localStream;
    video.play();

    selfieSegmentation.onResults((results) => {
      canvas.width = results.image.width;
      canvas.height = results.image.height;

      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(results.segmentationMask, 0, 0, canvas.width, canvas.height);

      // Only keep the person
      ctx.globalCompositeOperation = "source-in";
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

      // Draw background
      ctx.globalCompositeOperation = "destination-over";
      if (backgroundEffect === "blur") {
        ctx.filter = "blur(10px)";
        ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
      } else if (backgroundEffect === "virtual" && virtualBackgroundImg) {
        // Handle virtual background image
        const img = new Image();
        img.src = virtualBackgroundImg;
        // Basic cover implementation
        const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
        const x = (canvas.width / 2) - (img.width / 2) * scale;
        const y = (canvas.height / 2) - (img.height / 2) * scale;
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
      } else if (backgroundEffect === "virtual") {
        ctx.fillStyle = "#0f172a"; // Deep space fallback
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.restore();
    });

    const camera = new Camera(video, {
      onFrame: async () => {
        await selfieSegmentation.send({ image: video });
      },
      width: 640,
      height: 480,
    });
    camera.start();

    const stream = canvas.captureStream();
    setProcessedStream(stream);

    return () => {
      camera.stop();
      selfieSegmentation.close();
    };
  }, [localStream, backgroundEffect]);

  useEffect(() => {
    // Fetch meeting info
    fetch(`/api/meetings/${meetingId}`)
      .then(res => {
        if (!res.ok) throw new Error("Seminar not found");
        return res.json();
      })
      .then(data => {
        setMeetingData(data);
        const host = data.host_id === user.id;
        if (data.password && !host) {
          setIsLocked(true);
        }
        if (host) {
          setScreenSharePermission(true);
        }
        checkAccess(data);
        fetchRecordings();
        
        // Fetch allowlist if host
        if (host) {
          fetchAllowlist();
        }
      })
      .catch(err => {
        console.error(err);
        setAdmissionStatus("error");
      });

    const streamRef = { current: null };
    const initMedia = async () => {
      if (!navigator?.mediaDevices?.getUserMedia) {
        initializeCommunication(null);
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        streamRef.current = stream;
        setLocalStream(stream);
        initializeCommunication(stream);
      } catch (err) {
        try {
          const audio = await navigator.mediaDevices.getUserMedia({ audio: true });
          streamRef.current = audio;
          setLocalStream(audio);
          setIsVideoEnabled(false);
          initializeCommunication(audio);
        } catch (e) {
          initializeCommunication(null);
        }
      }
    };
    initMedia();

    return () => {
      socketRef.current?.disconnect();
      peerRef.current?.destroy();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const checkAccess = async (data) => {
    if (data.host_id === user.id) {
        setAdmissionStatus("approved");
        // Host should fetch existing pending requests
        fetch(`/api/meetings/${meetingId}/join-requests`)
          .then(res => res.json())
          .then(setPendingRequests);
        return;
    }

    const res = await fetch(`/api/meetings/${meetingId}/check-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email || "", userId: user.id })
    });
    const { status } = await res.json();
    
    if (status === "approved") {
        setAdmissionStatus("approved");
    } else if (status === "pending") {
        setAdmissionStatus("pending");
    } else {
        setAdmissionStatus("unauthorized");
    }
  };

  const dismissNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const addNotification = (text, type = "info") => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
        dismissNotification(id);
    }, 6000); // Slightly longer duration for toasts
  };

  const handleAdmissionRequest = async () => {
    // 1. Re-check if details match allowlist now
    const res = await fetch(`/api/meetings/${meetingId}/check-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: studentDetails.email, userId: user.id })
    });
    const { status } = await res.json();
    
    if (status === "approved") {
        setAdmissionStatus("approved");
        addNotification("Access verified! Joining seminar...");
        return;
    }

    // 2. If still not in allowlist, send "knock" request
    socketRef.current?.emit("ask-to-join", { 
        meetingId, 
        userId: user.id, 
        userName: studentDetails.name, 
        email: studentDetails.email 
    });
    setAdmissionStatus("pending");
  };

  const initializeCommunication = (stream) => {
    // 2. Initialize Socket
    const socket = io();
    socketRef.current = socket;

    // 3. Initialize PeerJS
    const peer = new Peer(user.id);
    peerRef.current = peer;

    peer.on("open", (id) => {
      console.log("My peer ID is: " + id);
      socket.emit("join-meeting", { 
        meetingId, 
        userId: user.id, 
        userName: user.name,
        email: user.email 
      });
    });

    // Handle incoming calls
    peer.on("call", (call) => {
      if (stream) call.answer(stream);
      else call.answer();
      
      call.on("stream", (remoteStream) => {
        addRemoteStream(call.peer, remoteStream);
      });
    });

    // 4. Socket Listeners
    socket.on("user-connected", ({ userId, userName, email, socketId }) => {
      console.log("User connected:", userName);
      addNotification(`${userName} joined the seminar`, "join");
      if (stream) {
        const call = peer.call(userId, stream);
        call.on("stream", (remoteStream) => {
          addRemoteStream(userId, remoteStream, userName, socketId);
        });
        peersRef.current[userId] = call;
      }
      
      setParticipants(prev => ({
        ...prev,
        [userId]: { 
          id: userId, 
          name: userName, 
          email: email,
          socketId, 
          isAudioEnabled: true, 
          isVideoEnabled: true, 
          isRaised: false 
        }
      }));
    });

    socket.on("user-disconnected", (socketId) => {
      setParticipants(prev => {
        const next = { ...prev };
        let discName = "Someone";
        Object.keys(next).forEach(uid => {
          if (next[uid].socketId === socketId) {
             discName = next[uid].name;
             peersRef.current[uid]?.close();
             delete peersRef.current[uid];
             delete next[uid];
          }
        });
        addNotification(`${discName} left the seminar`, "leave");
        return next;
      });
    });

    socket.on("notification", ({ text, type }) => {
      addNotification(text, type);
    });

    socket.on("join-request-received", (request) => {
      if (user.id === meetingData?.host_id) {
          setPendingRequests(prev => [...prev, request]);
          addNotification(`Action Required: Admission request from ${request.userName}`, "host");
          // Play a small sound or trigger a more prominent UI
          playAlarm();
      }
    });

    socket.on("join-request-approved", ({ userId }) => {
      if (userId === user.id) {
          setAdmissionStatus("approved");
          addNotification("Admission approved by host");
      }
    });

    socket.on("active-speaker", ({ userId }) => {
      setActiveSpeakerId(userId);
      if (speakerTimeoutRef.current) clearTimeout(speakerTimeoutRef.current);
      speakerTimeoutRef.current = setTimeout(() => {
        setActiveSpeakerId(null);
      }, 3000);
    });

    socket.on("join-request-rejected", ({ userId }) => {
      if (userId === user.id) {
          setAdmissionStatus("rejected");
          addNotification("Admission request was rejected", "error");
      }
    });

    socket.on("new-reaction", ({ userId, emoji }) => {
      setReactions(prev => [...prev.slice(-10), { userId, emoji, id: Date.now() }]);
      setUserReactions(prev => ({ ...prev, [userId]: { emoji, timestamp: Date.now() } }));
    });

    socket.on("hand-raised", ({ userId, raised, timestamp }) => {
      setParticipants(prev => {
        if (!prev[userId]) return prev;
        return { ...prev, [userId]: { ...prev[userId], isRaised: raised, raisedAt: raised ? timestamp : null } };
      });
    });

    socket.on("screen-share-request-received", ({ userId, userName }) => {
      if (isHost) {
        setScreenShareRequests(prev => [...prev.filter(r => r.userId !== userId), { userId, userName, id: Date.now() }]);
        addNotification(`Presentation Request: ${userName} wants to share screen`, "host");
        playAlarm();
      }
    });

    socket.on("screen-share-approved", ({ userId }) => {
      if (userId === user.id) {
        setScreenSharePermission(true);
        addNotification("Presentation Allowed! You can now share your screen.", "success");
      }
    });

    socket.on("screen-shared", ({ userId, sharing }) => {
      setParticipants(prev => {
        if (!prev[userId]) return prev;
        return { ...prev, [userId]: { ...prev[userId], isScreenSharing: sharing } };
      });
    });

    socket.on("recording-request-received", ({ userId, userName }) => {
      // Check host state dynamically or let the listener handle it
      setRecordingRequests(prev => [...prev.filter(r => r.userId !== userId), { userId, userName, id: Date.now() }]);
      addNotification(`Recording Request: ${userName} wants to record the session`, "host");
      playAlarm();
    });

    socket.on("recording-approved", ({ userId }) => {
      if (userId === user.id) {
        setRecordingApprovalStatus("approved");
        addNotification("Recording authorization GRANTED by host!", "success");
      }
    });

    socket.on("recording-rejected", ({ userId }) => {
      if (userId === user.id) {
        setRecordingApprovalStatus("rejected");
        addNotification("Your request to record was declined.", "error");
      }
    });

    socket.on("recording-state-updated", ({ userId, userName, isRecording }) => {
      if (isRecording) {
        addNotification(`Roster Alert: ${userName} has initiated recording`, "info");
      } else {
        addNotification(`Roster Alert: ${userName} stopped recording`, "info");
      }
    });

    socket.on("timer-sync", ({ seconds }) => {
      setPresentationTimer(seconds);
    });

    socket.on("permission-granted", ({ type, granted }) => {
      if (type === "screen-share") {
        setScreenSharePermission(granted);
        addNotification(granted ? "Screen sharing access GRANTED" : "Screen sharing access REVOKED", granted ? "success" : "host");
      }
    });

    socket.on("host-action-received", ({ action, targetUserId, payload, fromName, fromUserId }) => {
      if (targetUserId === user.id || targetUserId === "all") {
        if (action === "mute" || (action === "mute-all" && targetUserId === "all" && user.id !== fromUserId)) {
            setIsAudioEnabled(false);
            addNotification(`Moderator ${fromName} muted you`, "host");
        }
        if (action === "unmute" && targetUserId === user.id) {
            setIsAudioEnabled(true);
            addNotification(`Moderator ${fromName} unmuted you`, "host");
        }
        if (action === "video-off" || (action === "video-off-all" && targetUserId === "all" && user.id !== fromUserId)) {
            setIsVideoEnabled(false);
            addNotification(`Moderator ${fromName} disabled your video`, "host");
        }
        if (action === "video-on" && targetUserId === user.id) {
            setIsVideoEnabled(true);
            addNotification(`Moderator ${fromName} enabled your video`, "host");
        }
        if (action === "eject" && targetUserId === user.id) {
            alert(`You have been terminated from the seminar by ${fromName}`);
            onLeave();
        }
        if (action === "meeting-ended" || action === "end") {
            addNotification("The host has ended this seminar. Redirecting...", "host");
            setTimeout(onLeave, 2000);
        }
        if ((action === "request-unmute" || action === "request-video-on") && targetUserId === user.id) {
            setConfirmAction({
                action: "be-unmuted",
                type: action === "request-unmute" ? "audio" : "video",
                fromName,
                isRequest: true
            });
        }
        if (action === "hand-raise" && (targetUserId === user.id || targetUserId === "all")) {
            setIsHandRaised(payload.raised);
            socketRef.current?.emit("hand-raise", { meetingId, userId: user.id, raised: payload.raised });
        }
      }
      
      // Update participants list visually for everyone
      if (action === "mute" || action === "unmute" || action === "video-off" || action === "video-on" || action === "mute-all" || action === "video-off-all" || action === "hand-raise") {
          setParticipants(prev => {
              const next = { ...prev };
              Object.keys(next).forEach(uid => {
                  if (targetUserId === "all" || uid === targetUserId) {
                      if (action === "mute" || action === "mute-all") next[uid].isAudioEnabled = false;
                      if (action === "unmute") next[uid].isAudioEnabled = true;
                      if (action === "video-off" || action === "video-off-all") next[uid].isVideoEnabled = false;
                      if (action === "video-on") next[uid].isVideoEnabled = true;
                      if (action === "hand-raise") {
                        next[uid].isRaised = payload.raised;
                        next[uid].raisedAt = payload.raised ? Date.now() : null;
                      }
                  }
              });
              return next;
          });
      }

      const targetDisplayName = targetUserId === "all" ? "Everyone" : (targetUserId === user.id ? "You" : (participants[targetUserId]?.name || "User"));
      addToLog(action, fromName, targetDisplayName);

      if (action === "start-timer") {
        setPresentationTimer(payload.duration);
      }
      if (action === "stop-timer") {
        setPresentationTimer(null);
      }
    });
  };

  const addToLog = (action, fromName, targetName) => {
    const entry = {
        id: Date.now(),
        timestamp: new Date(),
        action,
        fromName,
        targetName
    };
    setActivityLog(prev => [entry, ...prev].slice(0, 50));
  };

  // Duration Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setMeetingDuration(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Presentation Timer logic
  useEffect(() => {
    let interval;
    if (presentationTimer !== null && presentationTimer > 0) {
      interval = setInterval(() => {
        setPresentationTimer(prev => {
          if (prev <= 1) {
            playAlarm();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [presentationTimer]);

  const playAlarm = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5);
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.error("Audio failed", e);
    }
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [
      h > 0 ? h : null,
      m.toString().padStart(2, '0'),
      s.toString().padStart(2, '0')
    ].filter(Boolean).join(':');
  };

  const startPresentationTimer = (mins) => {
    const duration = mins * 60;
    performHostAction("start-timer", "all", { duration });
    setShowTimerSettings(false);
  };

  const addRemoteStream = (userId, remoteStream, name, socketId) => {
    setParticipants(prev => {
      const existing = prev[userId] || { id: userId, name: name || "User", socketId: socketId || "", isAudioEnabled: true, isVideoEnabled: true, isRaised: false };
      return { ...prev, [userId]: { ...existing, stream: remoteStream } };
    });
  };

  // Media Track Synchronization
  useEffect(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach(t => t.enabled = isAudioEnabled);
      socketRef.current?.emit("toggle-media", { meetingId, userId: user.id, type: "audio", enabled: isAudioEnabled });
    }
  }, [isAudioEnabled, localStream, meetingId, user.id]);

  useEffect(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach(t => t.enabled = isVideoEnabled);
      socketRef.current?.emit("toggle-media", { meetingId, userId: user.id, type: "video", enabled: isVideoEnabled });
    }
  }, [isVideoEnabled, localStream, meetingId, user.id]);

  const toggleAudio = () => {
    setIsAudioEnabled(prev => !prev);
  };

  const toggleVideo = () => {
    setIsVideoEnabled(prev => !prev);
  };

  const toggleHand = () => {
    const next = !isHandRaised;
    setIsHandRaised(next);
    socketRef.current?.emit("hand-raise", { meetingId, userId: user.id, raised: next });
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
        setIsScreenSharing(false);
        screenStream?.getTracks().forEach(t => t.stop());
        setScreenStream(null);
        socketRef.current?.emit("screen-share", { meetingId, userId: user.id, sharing: false });
        return;
    }

    if (!screenSharePermission) {
      socketRef.current?.emit("screen-share-request", { meetingId, userId: user.id, userName: user.name });
      addNotification("Presentation request sent to host...");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      setIsScreenSharing(true);
      setScreenStream(stream);
      socketRef.current?.emit("screen-share", { meetingId, userId: user.id, sharing: true });
      
      // Update all active calls with the new stream
      Object.keys(peersRef.current).forEach(userId => {
          const call = peerRef.current.call(userId, stream);
          call.on("stream", (remoteStream) => {
              addRemoteStream(userId, remoteStream);
          });
          peersRef.current[userId] = call;
      });

      stream.getVideoTracks()[0].onended = () => {
        setIsScreenSharing(false);
        setScreenStream(null);
        socketRef.current?.emit("screen-share", { meetingId, userId: user.id, sharing: false });
        
        // Restore original stream to all peers
        const originalStream = localStream;
        Object.keys(peersRef.current).forEach(userId => {
            const call = peerRef.current.call(userId, originalStream);
            call.on("stream", (remoteStream) => {
                addRemoteStream(userId, remoteStream);
            });
            peersRef.current[userId] = call;
        });
      };
    } catch (err) {
      console.error("Screen share failed", err);
    }
  };

  const fetchRecordings = () => {
    fetch(`/api/meetings/${meetingId}/recordings`)
      .then(res => res.json())
      .then(data => setServerRecordings(data))
      .catch(err => console.error("Error fetching recordings", err));
  };

  const requestRecordingPermission = () => {
    if (recordingApprovalStatus === "pending") return;
    setRecordingApprovalStatus("pending");
    addNotification("Recording authorization requested from moderator...", "info");
    socketRef.current?.emit("recording-request", {
      meetingId,
      userId: user.id,
      userName: user.name
    });
  };

  const approveRecordingRequest = (targetUserId) => {
    setRecordingRequests(prev => prev.filter(r => r.userId !== targetUserId));
    socketRef.current?.emit("recording-approve", {
      meetingId,
      userId: targetUserId
    });
    addNotification("Approved recording authorization request", "success");
  };

  const rejectRecordingRequest = (targetUserId) => {
    setRecordingRequests(prev => prev.filter(r => r.userId !== targetUserId));
    socketRef.current?.emit("recording-reject", {
      meetingId,
      userId: targetUserId
    });
    addNotification("Declined recording authorization request", "host");
  };

  const startRecording = () => {
    if (!localStream) {
      addNotification("No active stream found to record.", "error");
      return;
    }
    
    chunksRef.current = []; // Reset chunks ref
    
    let streamToRecord = localStream;
    // If screen-sharing, try to record the composite stream or screenStream
    if (isScreenSharing && screenStream) {
      streamToRecord = screenStream;
    }

    try {
      const mediaRecorder = new MediaRecorder(streamToRecord, {
        mimeType: 'video/webm;codecs=vp8,opus'
      });
      
      setRecorder(mediaRecorder);
      setIsRecording(true);
      
      // Notify peers about recording
      socketRef.current?.emit("recording-state-change", {
        meetingId,
        userId: user.id,
        userName: user.name,
        isRecording: true
      });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        
        // 1. Download file locally
        const a = document.createElement("a");
        a.href = url;
        a.download = `wabiseminar-recording-${meetingId}-${Date.now()}.webm`;
        a.click();
        
        // 2. Upload file to hosting server-side buffer storage
        const formData = new FormData();
        formData.append("recording", blob, `recording-${meetingId}-${Date.now()}.webm`);
        formData.append("meetingId", meetingId);
        formData.append("userId", user.id);
        formData.append("userName", user.name);

        addNotification("Uploading seminar recording to hosting side server buffer...", "info");

        fetch("/api/recordings/upload", {
          method: "POST",
          body: formData
        })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            addNotification("Success: Seminar recording saved to hosting server-side storage!", "success");
            fetchRecordings();
          } else {
            addNotification("Warning: Could not save recording to server.", "error");
          }
        })
        .catch(err => {
          console.error("Server upload failed", err);
          addNotification("Connection issue while uploading recording to hosting side.", "error");
        });
      };

      mediaRecorder.start(1000); // Collect data slice every 1 second
      addNotification("Seminar recording initiated locally and streaming to cache buffer", "success");
    } catch (err) {
      console.error("MediaRecorder initiation failed, falling back to basic stream", err);
      try {
        const mediaRecorder = new MediaRecorder(streamToRecord);
        setRecorder(mediaRecorder);
        setIsRecording(true);
        
        socketRef.current?.emit("recording-state-change", {
          meetingId,
          userId: user.id,
          userName: user.name,
          isRecording: true
        });

        mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            chunksRef.current.push(e.data);
          }
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: "video/webm" });
          const url = URL.createObjectURL(blob);
          
          const a = document.createElement("a");
          a.href = url;
          a.download = `wabiseminar-recording-${meetingId}.webm`;
          a.click();

          const formData = new FormData();
          formData.append("recording", blob, `recording-${meetingId}-${Date.now()}.webm`);
          formData.append("meetingId", meetingId);
          formData.append("userId", user.id);
          formData.append("userName", user.name);

          fetch("/api/recordings/upload", {
            method: "POST",
            body: formData
          })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              addNotification("Recording successfully uploaded to hosting buffer storage!", "success");
              fetchRecordings();
            }
          })
          .catch(e => console.error(e));
        };

        mediaRecorder.start(1000);
      } catch (fallbackErr) {
        addNotification("Browser media recording stream is not supported in this iframe context.", "error");
      }
    }
  };

  const stopRecording = () => {
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    setIsRecording(false);
    socketRef.current?.emit("recording-state-change", {
      meetingId,
      userId: user.id,
      userName: user.name,
      isRecording: false
    });
  };

  const performHostAction = (action, targetUserId, payload = {}) => {
    socketRef.current?.emit("host-action", { 
        meetingId, 
        action, 
        targetUserId, 
        payload,
        fromName: user.name,
        fromUserId: user.id
    });
    setConfirmAction(null);
  };

  const endMeeting = () => {
    socketRef.current?.emit("end-meeting", { meetingId });
    performHostAction("end", "all", { ended: true });
  };

  const sendReaction = (emoji) => {
    socketRef.current?.emit("reaction", { meetingId, userId: user.id, emoji });
    setReactions(prev => [...prev.slice(-10), { userId: user.id, emoji, id: Date.now() }]);
    setUserReactions(prev => ({ ...prev, [user.id]: { emoji, timestamp: Date.now() } }));
  };

  const manageTimer = (seconds) => {
    socketRef.current?.emit("update-timer", { meetingId, seconds });
    setPresentationTimer(seconds);
    addNotification(seconds ? `Sychronized ${seconds/60}m timer for everyone` : "Timer stopped for all participants", "host");
  };

  const grantPermission = (targetUserId, type, granted) => {
    if (!isHost) return;
    socketRef.current?.emit("grant-permission", { meetingId, targetUserId, type, granted });
    if (type === "screen-share") {
       setScreenSharePermissions(prev => ({ ...prev, [targetUserId]: granted }));
       setScreenShareRequests(prev => prev.filter(r => r.userId !== targetUserId));
    }
  };

  useEffect(() => {
    if (admissionStatus === "approved" && isHost) {
      const timer = setTimeout(() => {
        setIsInviteModalOpen(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [admissionStatus, isHost]);

  const getGridLayout = () => {
    if (pinnedUserId) return "grid-cols-1";
    const count = Object.keys(participants).length + 1;
    if (count === 1) return "grid-cols-1 max-w-[85vw] lg:max-w-3xl mx-auto h-[70vh]";
    if (count === 2) return "grid-cols-1 md:grid-cols-2 gap-8 max-w-[95vw] lg:max-w-6xl mx-auto h-[70vh]";
    if (count === 3) return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-[95vw] mx-auto auto-rows-fr";
    if (count <= 4) return "grid-cols-2 gap-6 max-w-[90vw] mx-auto auto-rows-fr";
    if (count <= 6) return "grid-cols-2 md:grid-cols-3 gap-4 auto-rows-fr";
    if (count <= 9) return "grid-cols-3 gap-4 auto-rows-fr";
    return "grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 auto-rows-fr";
  };

  const handleTogglePin = (id) => {
    setPinnedUserId(prev => prev === id ? null : id);
  };

  // Active Speaker Detection (Local)
  useEffect(() => {
    if (!localStream || !isAudioEnabled) {
      if (activeSpeakerId === user.id) setActiveSpeakerId(null);
      return;
    }

    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(localStream);
    source.connect(analyser);
    analyser.fftSize = 512;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const checkVolume = () => {
      analyser.getByteFrequencyData(dataArray);
      let values = 0;
      for (let i = 0; i < bufferLength; i++) {
        values += dataArray[i];
      }
      const average = values / bufferLength;
      if (average > 30) { // Threshold
        socketRef.current?.emit("speaker-active", { meetingId, userId: user.id });
        setActiveSpeakerId(user.id);
      }
      requestAnimationFrame(checkVolume);
    };

    const timeoutId = setTimeout(checkVolume, 1000);
    return () => {
      clearTimeout(timeoutId);
      audioContext.close();
    };
  }, [localStream, isAudioEnabled]);

  const fetchAllowlist = async () => {
    try {
      const res = await fetch(`/api/meetings/${meetingId}/allowlist`);
      const data = await res.json();
      setAllowlist(data);
    } catch (err) {
      console.error("Failed to fetch allowlist", err);
    }
  };

  const updateAllowlist = async () => {
    if (!allowlistInput.trim()) return;
    setIsUpdatingAllowlist(true);
    try {
      const newEmails = allowlistInput.split(",").map(e => e.trim()).filter(e => e);
      const currentEmails = allowlist.map(a => a.email);
      const uniqueNewEmails = newEmails.filter(e => !currentEmails.includes(e));
      
      if (uniqueNewEmails.length === 0) {
        setAllowlistInput("");
        return;
      }

      const updatedStudents = [
        ...allowlist.map(a => ({ name: a.name, email: a.email })),
        ...uniqueNewEmails.map(e => ({ name: "Student", email: e }))
      ];

      await fetch(`/api/meetings/${meetingId}/allowlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ students: updatedStudents })
      });
      addNotification("Seminar allowlist updated successfully");
      setAllowlistInput("");
      fetchAllowlist();
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingAllowlist(false);
    }
  };

  const removeFromAllowlist = async (email) => {
    try {
      const updatedStudents = allowlist
        .filter(a => a.email !== email)
        .map(a => ({ name: a.name, email: a.email }));

      await fetch(`/api/meetings/${meetingId}/allowlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ students: updatedStudents })
      });
      addNotification("Entry removed from allowlist");
      fetchAllowlist();
    } catch (err) {
      console.error("Failed to remove from allowlist", err);
    }
  };

  if (admissionStatus === "error") {
    return (
        <div className="h-screen w-screen bg-paper flex items-center justify-center p-8 technical-grid">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white brutal-border w-full max-w-md p-12 space-y-8 text-center shadow-2xl relative"
            >
                <div className="w-20 h-20 brutal-border flex items-center justify-center mx-auto mb-4 bg-ink text-paper">
                  <X className="w-10 h-10" />
                </div>
                <div className="space-y-4">
                    <h2 className="text-3xl font-serif italic text-ink">Seminar Access <span className="not-italic font-sans font-black uppercase">Error.</span></h2>
                    <p className="text-[10px] font-black uppercase tracking-widest text-ink/40 leading-relaxed">The requested seminar session does not exist, has ended, or your access was declined. Please verify the link or contact the host.</p>
                </div>
                <button 
                    onClick={onLeave}
                    className="w-full py-5 bg-ink text-paper font-black uppercase tracking-[0.2em] text-[10px] hover:bg-accent transition-all shadow-2xl shadow-ink/10"
                >
                    Return to Dashboard
                </button>
            </motion.div>
        </div>
    );
  }

  if (admissionStatus === "checking") {
    return (
        <div className="h-screen w-screen bg-paper flex items-center justify-center p-8 technical-grid">
            <div className="text-ink/30 font-mono text-[10px] font-black uppercase tracking-[0.4em] animate-pulse">Verifying seminar access...</div>
        </div>
    );
  }

  if (admissionStatus !== "approved") {
      return (
          <div className="h-screen w-screen bg-paper flex items-center justify-center p-8 technical-grid">
              <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white brutal-border w-full max-w-md p-12 space-y-12 text-center relative overflow-hidden shadow-2xl"
              >
                  <div className="absolute top-0 left-0 w-full h-1 bg-accent" />
                  
                  <div className="w-20 h-20 border border-accent/20 bg-white rounded-2xl p-3 flex items-center justify-center mx-auto shadow-sm">
                    <img 
                      src={logoImg} 
                      alt="Wabi Seminar Logo" 
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  <div className="space-y-4">
                      <h2 className="text-4xl font-serif italic text-ink">Seminar <span className="not-italic font-sans font-black uppercase">Admission.</span></h2>
                      <p className="text-[10px] font-black uppercase tracking-widest text-ink/40 leading-relaxed">
                        {admissionStatus === "pending" ? "Waiting for the host to approve your admission..." : 
                         admissionStatus === "rejected" ? "Your admission request was rejected by the moderator." :
                         "Authorized participants only. Please verify your identity details."}
                      </p>
                  </div>

                  {admissionStatus === "unauthorized" && (
                      <div className="space-y-4">
                          <input 
                              type="text"
                              value={studentDetails.name}
                              onChange={e => setStudentDetails(prev => ({ ...prev, name: e.target.value }))}
                              placeholder="Your Name"
                              className="w-full bg-paper brutal-border p-5 text-center font-black uppercase tracking-widest text-ink text-[10px] focus:border-accent focus:outline-none transition-all placeholder:text-ink/20"
                          />
                          <input 
                              type="email"
                              value={studentDetails.email}
                              onChange={e => setStudentDetails(prev => ({ ...prev, email: e.target.value }))}
                              placeholder="Academic Email Address"
                              className="w-full bg-paper brutal-border p-5 text-center font-black uppercase tracking-widest text-ink text-[10px] focus:border-accent focus:outline-none transition-all placeholder:text-ink/20"
                          />
                          <button 
                              onClick={handleAdmissionRequest}
                              disabled={!studentDetails.email || !studentDetails.name}
                              className="w-full py-5 bg-ink text-paper font-black uppercase tracking-[0.2em] text-[10px] hover:bg-accent active:scale-95 transition-all disabled:opacity-30 shadow-2xl"
                          >
                              Request Access
                          </button>
                      </div>
                  )}

                  {admissionStatus === "pending" && (
                      <div className="flex flex-col items-center gap-4">
                          <div className="flex gap-3">
                              {[1,2,3].map(i => <motion.div key={i} animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, delay: i * 0.2, duration: 1.5 }} className="w-1.5 h-1.5 bg-accent rounded-full" />)}
                          </div>
                      </div>
                  )}

                  <button 
                      onClick={onLeave}
                      className="w-full py-4 text-ink/20 font-black uppercase tracking-[0.3em] text-[8px] hover:text-ink transition-colors"
                  >
                      Cancel & Return to Dashboard
                  </button>
              </motion.div>
          </div>
      );
  }

  if (isLocked) {
      return (
          <div className="h-screen w-screen meeting-bg flex items-center justify-center p-8 text-ink">
              <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white brutal-border w-full max-w-md p-12 space-y-12 text-center relative overflow-hidden shadow-2xl"
              >
                  <div className="absolute top-0 left-0 w-full h-1 bg-accent" />
                  <div className="w-20 h-20 brutal-border bg-paper flex items-center justify-center mx-auto text-accent">
                      <Shield className="w-10 h-10" />
                  </div>
                  <div className="space-y-4">
                      <h2 className="text-4xl font-serif italic text-ink">Secure <span className="not-italic font-sans font-black uppercase">Lock.</span></h2>
                      <p className="text-[10px] font-black uppercase tracking-widest text-ink/40 leading-relaxed">This seminar requires a digital credential for entry.</p>
                  </div>
                  <div className="space-y-4">
                      <input 
                          type="password"
                          value={passwordInput}
                          onChange={e => { setPasswordInput(e.target.value); setPasswordError(false); }}
                          placeholder="Security Code"
                          className={`w-full bg-paper brutal-border p-5 text-center font-black uppercase tracking-widest text-ink text-[10px] focus:border-accent focus:outline-none transition-all placeholder:text-ink/20 ${passwordError ? "border-red-500" : ""}`}
                      />
                      {passwordError && <p className="text-[8px] text-red-500 font-black uppercase tracking-widest">Authentication Failed</p>}
                  </div>
                  <div className="flex flex-col gap-3">
                      <button 
                          onClick={() => {
                              if (passwordInput === meetingData.password) {
                                  setIsLocked(false);
                              } else {
                                  setPasswordError(true);
                              }
                          }}
                          className="w-full py-5 bg-ink text-paper font-black uppercase tracking-[0.2em] text-[10px] hover:bg-accent active:scale-95 transition-all shadow-2xl"
                      >
                          Verify Code
                      </button>
                      <button 
                          onClick={onLeave}
                          className="w-full py-4 text-ink/20 font-black uppercase tracking-[0.3em] text-[8px] hover:text-ink transition-colors"
                      >
                          Return to Dashboard
                      </button>
                  </div>
              </motion.div>
          </div>
      );
  }



  return (
    <div className="flex h-screen overflow-hidden bg-paper text-ink technical-grid selection:bg-accent selection:text-paper font-sans">
      {/* Sidebar Toggle - Left */}
      <div className="flex-1 flex flex-col relative transition-all duration-300">
        {/* Main Header / Info */}
        <div className="absolute top-0 left-0 right-0 p-8 z-20 flex justify-between items-start pointer-events-none">
          <div className="flex items-center gap-3 bg-white/80 backdrop-blur-3xl px-6 py-3 brutal-border pointer-events-auto shadow-2xl">
            <button 
              onClick={() => {
                const url = window.location.href;
                navigator.clipboard.writeText(url);
                addNotification("Seminar link copied to clipboard");
              }}
              className="hover:text-accent transition-colors flex items-center gap-4 group"
            >
              <div className="w-7 h-7 border border-accent/20 bg-white rounded-lg p-1 flex items-center justify-center transition-all shadow-sm">
                <img 
                    src={logoImg} 
                    alt="Wabi Seminar Logo" 
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                />
              </div>
              <span className="font-mono font-black text-[9px] tracking-[0.2em] uppercase text-ink/30 group-hover:text-ink transition-colors">{meetingId}</span>
              <Share className="w-3 h-3 text-ink/20 group-hover:text-accent" />
            </button>
            <div className="w-px h-4 bg-ink/10 mx-2" />
            <div className="flex items-center gap-2 text-accent text-[9px] font-black uppercase tracking-widest">
              <Clock className="w-3 h-3" />
              <span>{formatTime(meetingDuration)}</span>
            </div>
            <div className="w-px h-4 bg-ink/10 mx-2" />
            <button 
              onClick={() => setIsInviteModalOpen(true)}
              className="text-[9px] font-black uppercase tracking-widest text-ink/40 hover:text-ink transition-colors px-2"
            >
              Invite
            </button>
            <div className="w-px h-4 bg-ink/10 mx-2" />
            <div className="flex items-center gap-2 text-ink text-[9px] font-black uppercase tracking-widest pr-1">
              <span className="text-ink/20">Nodes</span>
              <span className="bg-ink text-paper px-2 py-0.5 rounded-sm shadow-sm">{Object.keys(participants).length + 1}</span>
              <Users className="w-3 h-3 text-ink/20" />
            </div>
            {presentationTimer !== null && (
              <>
                <div className="w-px h-4 bg-ink/10 mx-2" />
                <motion.div 
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`flex items-center gap-2 text-[9px] font-black uppercase tracking-widest ${presentationTimer === 0 ? "text-accent animate-pulse" : "text-accent"}`}
                >
                  <Timer className={`w-3 h-3 ${presentationTimer > 0 && presentationTimer < 60 ? "animate-spin-slow" : ""}`} />
                  <span>{formatTime(presentationTimer)}</span>
                  {presentationTimer === 0 && <span className="ml-1 italic font-serif">TERMINATED</span>}
                </motion.div>
              </>
            )}
          </div>

          <div className="flex items-center gap-3 pointer-events-auto">
            {isHost && (
              <div className="relative">
                <button 
                  onClick={() => setShowTimerSettings(!showTimerSettings)}
                  className="bg-white/80 border border-blue-100 p-2.5 rounded-2xl text-blue-400 hover:text-blue-950 transition-all shadow-sm"
                  title="Presentation Timer"
                >
                  <Timer className="w-4 h-4" />
                </button>
                <AnimatePresence>
                  {showTimerSettings && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full right-0 mt-3 bg-white border border-blue-50 p-5 rounded-[2rem] shadow-2xl w-56 z-50 overflow-hidden"
                    >
                      <h3 className="text-[10px] font-black uppercase tracking-widest mb-4 text-blue-400">Broadcast Clock</h3>
                      <div className="grid grid-cols-2 gap-3">
                        {[1, 5, 10, 15].map(m => (
                          <button key={m} onClick={() => startPresentationTimer(m)} className="p-3 bg-blue-50 text-blue-900 rounded-xl text-[10px] font-bold hover:bg-orange-600 hover:text-white transition-colors">{m} Min</button>
                        ))}
                      </div>
                      <button onClick={() => setPresentationTimer(null)} className="w-full mt-4 p-3 bg-red-50 text-red-500 rounded-xl text-[10px] font-bold hover:bg-red-500 hover:text-white transition-colors">Abort Timer</button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            
            {/* Dual Mode Recording Action */}
            {isHost || recordingApprovalStatus === "approved" ? (
              <button 
                onClick={isRecording ? stopRecording : startRecording}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all shadow-sm cursor-pointer ${isRecording ? "bg-red-500 border-red-400 text-white animate-pulse" : "bg-white/80 border-blue-100 text-blue-400 hover:text-blue-950 hover:bg-blue-50"}`}
              >
                <div className={`w-2 h-2 rounded-full ${isRecording ? "bg-white animate-ping" : "bg-red-500"}`} />
                {isRecording ? "STOP RECORDING" : "START CAPTURE"}
              </button>
            ) : recordingApprovalStatus === "pending" ? (
              <button 
                disabled
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl border border-orange-100 bg-orange-50/80 text-orange-600 text-[10px] font-black uppercase tracking-widest cursor-not-allowed shadow-sm"
              >
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                WAITING FOR HOST...
              </button>
            ) : recordingApprovalStatus === "rejected" ? (
              <button 
                onClick={requestRecordingPermission}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl border border-red-100 bg-red-50/80 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-100 hover:text-red-600 transition-all shadow-sm cursor-pointer"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                DECLINED - REQUEST AGAIN
              </button>
            ) : (
              <button 
                onClick={requestRecordingPermission}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl border border-blue-100 bg-white/80 text-blue-500 text-[10px] font-black uppercase tracking-widest hover:bg-blue-50 hover:text-blue-950 transition-all shadow-sm cursor-pointer"
              >
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                REQUEST RECORDING
              </button>
            )}

            {/* Recordings List Dropdown */}
            <div className="relative group">
              <button 
                onClick={fetchRecordings}
                className="flex items-center justify-center p-3 bg-white/80 border border-blue-100 text-blue-400 hover:text-blue-950 rounded-2xl shadow-sm hover:bg-blue-50 transition-all cursor-pointer"
                title="View Cloud Server Recordings"
              >
                <Database className="w-3.5 h-3.5" />
              </button>
              
              <div className="hidden group-hover:block hover:block absolute bottom-full right-0 mb-3 bg-white border border-blue-50 p-5 rounded-[2rem] shadow-2xl w-80 z-50 overflow-hidden text-left animate-fade-in">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-blue-50/50">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-accent" />
                    <div>
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-950">Cloud Buffer Storage</h3>
                      <p className="text-[8px] text-blue-400 uppercase font-black tracking-widest mt-0.5">Saved seminar recording blocks</p>
                    </div>
                  </div>
                  <span className="text-[8px] bg-blue-100 text-blue-700 font-black px-2.5 py-0.5 rounded-full uppercase">
                    {serverRecordings.length} BLOCKS
                  </span>
                </div>
                
                <div className="max-h-60 overflow-y-auto space-y-2 scrollbar-hide">
                  {serverRecordings.length === 0 ? (
                    <div className="text-center py-8 text-[10px] font-black text-blue-300 italic uppercase tracking-wider">
                      No cloud buffer records
                    </div>
                  ) : (
                    serverRecordings.map(rec => (
                      <div key={rec.id} className="p-3 bg-blue-50/20 hover:bg-blue-50/40 border border-blue-50/50 rounded-2xl flex flex-col gap-1.5 transition-colors">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold text-blue-950 truncate max-w-[150px]" title={rec.file_name}>
                            {rec.file_name}
                          </span>
                          <a 
                            href={rec.file_path} 
                            download 
                            referrerPolicy="no-referrer"
                            className="text-[9px] text-accent font-black hover:underline uppercase shrink-0 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100"
                          >
                            GET FILE
                          </a>
                        </div>
                        <div className="flex items-center justify-between text-[8px] font-bold text-blue-400">
                          <span>By {rec.user_name}</span>
                          <span>{new Date(rec.created_at).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            <div className="bg-blue-600/10 text-blue-600 px-5 py-2.5 rounded-2xl border border-blue-200/50 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 backdrop-blur-md shadow-sm">
               <Shield className="w-3 h-3 text-orange-600" /> ENCRYPTED STREAM
            </div>
          </div>
        </div>


        {/* Video Grid */}
        <div className="flex-1 flex flex-col md:flex-row p-4 pt-20 gap-4 overflow-hidden animate-fade-in">
          <ParticipantsSidebar 
            participants={participants} 
            localUser={user} 
            isLocalAudio={isAudioEnabled} 
            isLocalVideo={isVideoEnabled} 
            isLocalHand={isHandRaised}
            isLocalScreen={isScreenSharing}
            isHost={isHost}
            activeSpeakerId={activeSpeakerId}
            onHostAction={(action, targetId, targetName) => setConfirmAction({ action, targetUserId: targetId, targetName })}
          />

          <motion.div 
            layout
            className={`flex-1 transition-all duration-500 grid gap-4 place-items-center auto-rows-fr ${getGridLayout()}`}
          >
            <AnimatePresence mode="popLayout">
                {/* Main Content Area */}
                {(!pinnedUserId || pinnedUserId === user.id) && (
                  <motion.div 
                    key="local-video" 
                    layout 
                    initial={{ opacity: 0, scale: 0.9 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="w-full h-full"
                  >
                    <VideoTile 
                        stream={screenStream || processedStream || localStream} 
                        name={`${user.name} (You)`} 
                        isLocal 
                        isAudioEnabled={isAudioEnabled} 
                        isVideoEnabled={isVideoEnabled}
                        isRaised={isHandRaised}
                        isScreenSharing={isScreenSharing}
                        isPinned={pinnedUserId === user.id}
                        isActiveSpeaker={activeSpeakerId === user.id}
                        reaction={userReactions[user.id]?.emoji}
                        reactionTimestamp={userReactions[user.id]?.timestamp}
                        onDoubleClick={() => handleTogglePin(user.id)}
                    />
                  </motion.div>
                )}

                {/* Remote Videos */}
                {Object.values(participants)
                  .sort((a, b) => {
                    if (a.isScreenSharing && !b.isScreenSharing) return -1;
                    if (!a.isScreenSharing && b.isScreenSharing) return 1;
                    if (a.isRaised && !b.isRaised) return -1;
                    if (!a.isRaised && b.isRaised) return 1;
                    if (activeSpeakerId === a.id) return -1;
                    if (activeSpeakerId === b.id) return 1;
                    return a.name.localeCompare(b.name);
                  })
                  .map(p => (
                    (pinnedUserId === p.id || !pinnedUserId) && (
                      <motion.div 
                        key={p.id} 
                        layout 
                        initial={{ opacity: 0, scale: 0.8 }} 
                        animate={{ opacity: 1, scale: 1 }} 
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="relative w-full h-full group"
                      >
                        <VideoTile 
                            stream={p.stream} 
                            name={p.name} 
                            isAudioEnabled={p.isAudioEnabled} 
                            isVideoEnabled={p.isVideoEnabled}
                            isRaised={p.isRaised}
                            isScreenSharing={p.isScreenSharing}
                            isPinned={pinnedUserId === p.id}
                            isActiveSpeaker={activeSpeakerId === p.id}
                            reaction={userReactions[p.id]?.emoji}
                            reactionTimestamp={userReactions[p.id]?.timestamp}
                            onDoubleClick={() => handleTogglePin(p.id)}
                            isHost={isHost}
                            onMute={() => setConfirmAction({ action: p.isAudioEnabled ? "mute" : "unmute", targetUserId: p.id, targetName: p.name })}
                            onVideoOff={() => setConfirmAction({ action: p.isVideoEnabled ? "video-off" : "video-on", targetUserId: p.id, targetName: p.name })}
                            onEject={() => setConfirmAction({ action: "eject", targetUserId: p.id, targetName: p.name })}
                        />
                      </motion.div>
                    )
                ))}
            </AnimatePresence>
          </motion.div>

          {/* Sidebar for other participants when someone is pinned */}
          {pinnedUserId && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="w-full md:w-64 flex flex-row md:flex-col gap-3 overflow-x-auto md:overflow-y-auto p-2 scrollbar-hide"
            >
              {pinnedUserId !== user.id && (
                <div className="w-48 md:w-full aspect-video shrink-0">
                  <VideoTile 
                    stream={screenStream || processedStream || localStream} 
                    name={`${user.name} (You)`} 
                    isLocal 
                    isAudioEnabled={isAudioEnabled} 
                    isVideoEnabled={isVideoEnabled}
                    isRaised={isHandRaised}
                    isScreenSharing={isScreenSharing}
                    onDoubleClick={() => handleTogglePin(user.id)}
                    mini
                  />
                </div>
              )}
              {Object.values(participants).map(p => (
                pinnedUserId !== p.id && (
                  <div key={p.id} className="w-48 md:w-full aspect-video shrink-0">
                    <VideoTile 
                        stream={p.stream} 
                        name={p.name} 
                        isAudioEnabled={p.isAudioEnabled} 
                        isVideoEnabled={p.isVideoEnabled}
                        isRaised={p.isRaised}
                        onDoubleClick={() => handleTogglePin(p.id)}
                        mini
                    />
                  </div>
                )
              ))}
            </motion.div>
          )}
        </div>

        {/* Reaction Layer */}
        <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
            <AnimatePresence>
                {reactions.map(r => (
                    <motion.div
                        key={r.id}
                        initial={{ 
                          opacity: 0, 
                          y: "80vh", 
                          x: `${20 + Math.random() * 60}vw`,
                          scale: 0 
                        }}
                        animate={{ 
                          opacity: [0, 1, 1, 0], 
                          y: ["80vh", "20vh"], 
                          x: [`${20 + Math.random() * 60}vw`, `${15 + Math.random() * 70}vw`],
                          scale: [0.5, 2.5, 2, 1],
                          rotate: [0, -20, 20, 0]
                        }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 4, ease: "easeOut" }}
                        className="absolute text-4xl"
                    >
                        <div className="relative">
                          {r.emoji}
                          <motion.div 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1.5, opacity: 0 }}
                            transition={{ duration: 0.5 }}
                            className="absolute inset-0 bg-accent/20 rounded-full blur-xl"
                          />
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>

        {/* Bottom Bar */}
        <div className="p-8 pb-12 flex justify-center items-center gap-8 z-40 relative">
           <div className="absolute inset-0 bg-gradient-to-t from-paper/80 to-transparent pointer-events-none" />
            <div className="flex items-center gap-4 relative z-10">
              <ControlBtn onClick={toggleAudio} active={isAudioEnabled} icon={isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />} />
              <div className="relative group/video">
                <ControlBtn onClick={toggleVideo} active={isVideoEnabled} icon={isVideoEnabled ? <VideoIcon className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />} />
                <button 
                  onClick={() => setActiveSidebar(activeSidebar === "video-settings" ? null : "video-settings")}
                  className="absolute -top-1 -right-1 bg-ink text-paper brutal-border rounded-none p-1.5 shadow-xl hover:scale-110 active:scale-95 transition-all hover:bg-accent"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>

           <div className="flex items-center gap-4 bg-white/80 backdrop-blur-3xl px-8 py-3 brutal-border shadow-2xl relative z-10">
             <button onClick={toggleHand} className={`p-3.5 transition-all ${isHandRaised ? "bg-accent text-paper shadow-xl" : "hover:bg-paper text-ink/30 hover:text-ink"}`}>
               <Hand className="w-5 h-5" />
             </button>
             <button 
               onClick={toggleScreenShare} 
               className={`p-3.5 transition-all relative group/share ${
                 !screenSharePermission && !isHost ? "text-ink/10" : isScreenSharing ? "bg-accent text-paper" : "hover:bg-paper text-ink/30 hover:text-ink"
               }`}
             >
               <Share className="w-5 h-5" />
               {!screenSharePermission && !isHost && (
                 <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-ink text-paper text-[8px] font-black uppercase tracking-widest whitespace-nowrap opacity-0 group-hover/share:opacity-100 transition-opacity">
                   Request Access
                 </div>
               )}
             </button>
            <EmojiPicker onPick={sendReaction} />
             <div className="w-px h-8 bg-ink/5 mx-2" />
             {isHost && (
               <div className="relative group/more">
                 <button className="p-3.5 hover:bg-paper text-ink/30 hover:text-ink transition-all">
                   <MoreVertical className="w-5 h-5" />
                 </button>
                 <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-56 bg-white border border-blue-50 rounded-2xl overflow-hidden shadow-2xl opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all z-50">
                    <div className="px-4 py-2 border-b border-blue-50 bg-blue-50/30">
                        <p className="text-[8px] font-black uppercase tracking-widest text-blue-400">Host Protocol Menu</p>
                    </div>
                    <button 
                      onClick={() => setConfirmAction({ action: "mute-all", targetUserId: "all", targetName: "Everyone" })}
                      className="w-full text-left px-4 py-3 text-[10px] font-bold uppercase tracking-tight hover:bg-blue-50 text-blue-900 flex items-center gap-3 transition-colors"
                    >
                      <MicOff className="w-4 h-4 text-red-500" /> Mute Everyone
                    </button>
                    <button 
                      onClick={() => setConfirmAction({ action: "video-off-all", targetUserId: "all", targetName: "Everyone" })}
                      className="w-full text-left px-4 py-3 text-[10px] font-bold uppercase tracking-tight hover:bg-blue-50 text-blue-900 flex items-center gap-3 transition-colors"
                    >
                      <VideoOff className="w-4 h-4 text-red-500" /> Disable All Video
                    </button>
                    <div className="h-px bg-blue-50" />
                    <div className="px-4 py-2 bg-blue-50/20">
                        <p className="text-[8px] font-black uppercase tracking-widest text-blue-400">Broadcast Clock Control</p>
                    </div>
                    <div className="grid grid-cols-3 gap-px bg-blue-50 border-y border-blue-50">
                        {[300, 600, 1800].map(s => (
                           <button 
                             key={s}
                             onClick={() => manageTimer(s)}
                             className="py-3 text-[9px] font-black hover:bg-white transition-all text-blue-900"
                           >
                             {s/60}m
                           </button>
                        ))}
                    </div>
                    <button 
                      onClick={() => manageTimer(null)}
                      className="w-full text-left px-4 py-3 text-[10px] font-bold uppercase tracking-tight hover:bg-red-50 text-red-500 flex items-center gap-3 transition-colors border-b border-blue-50"
                    >
                      <Timer className="w-4 h-4" /> Reset/Stop Timer
                    </button>
                    <button 
                      onClick={() => setIsInviteModalOpen(true)}
                      className="w-full text-left px-4 py-3 text-[10px] font-bold uppercase tracking-tight hover:bg-blue-50 text-accent flex items-center gap-3 transition-colors"
                    >
                      <Plus className="w-4 h-4" /> Invite Peers
                    </button>
                    <button 
                      onClick={() => setConfirmAction({ action: "end", targetUserId: "all", targetName: "Seminar Session" })}
                      className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-tight hover:bg-red-600 hover:text-white text-red-500 flex items-center gap-3 transition-colors border-t border-blue-50"
                    >
                      <PhoneOff className="w-4 h-4" /> End Seminar for All
                    </button>
                 </div>
               </div>
             )}
             <button onClick={() => setActiveSidebar(activeSidebar === "chat" ? null : "chat")} className={`p-3.5 transition-all ${activeSidebar === "chat" ? "bg-ink text-paper" : "hover:bg-paper text-ink/30 hover:text-ink"}`}>
               <MessageSquare className="w-5 h-5" />
             </button>
             <button onClick={() => setActiveSidebar(activeSidebar === "users" ? null : "users")} className={`p-3.5 transition-all ${activeSidebar === "users" ? "bg-ink text-paper" : "hover:bg-paper text-ink/30 hover:text-ink"}`}>
               <Users className="w-5 h-5" />
             </button>
             <button onClick={() => setActiveSidebar(activeSidebar === "logs" ? null : "logs")} className={`p-3.5 transition-all ${activeSidebar === "logs" ? "bg-ink text-paper" : "hover:bg-paper text-ink/30 hover:text-ink"}`}>
               <Clock className="w-5 h-5" />
             </button>
             <button onClick={() => setActiveSidebar(activeSidebar === "polls" ? null : "polls")} className={`p-3.5 transition-all ${activeSidebar === "polls" ? "bg-ink text-paper" : "hover:bg-paper text-ink/30 hover:text-ink"}`}>
               <BarChart2 className="w-5 h-5" />
             </button>
           </div>
           
           <button 
             onClick={onLeave}
             className="bg-ink hover:bg-accent text-paper p-6 brutal-border shadow-2xl transition-all group scale-110 relative z-10"
           >
             <PhoneOff className="w-8 h-8 group-hover:scale-110 transition-transform" />
           </button>
        </div>
      </div>

        {/* Sidebars */}
      <AnimatePresence>
        {activeSidebar && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="w-96 bg-white/90 backdrop-blur-3xl border-l border-blue-50 flex flex-col shadow-2xl"
          >
            {activeSidebar === "chat" && <Chat meetingId={meetingId} user={user} onClose={() => setActiveSidebar(null)} socket={socketRef.current} />}
            {activeSidebar === "video-settings" && (
                <div className="p-8 flex-1 flex flex-col h-full overflow-hidden">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-2xl font-heading font-bold uppercase tracking-tight text-blue-950">Broadcast Visuals</h2>
                            <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mt-1">Background Processing</p>
                        </div>
                        <button onClick={() => setActiveSidebar(null)} className="p-2 hover:bg-blue-50 rounded-xl text-blue-300 transition-colors"><X className="w-5 h-5" /></button>
                    </div>

                    <div className="space-y-6">
                        <div className="p-6 bg-blue-50/50 border border-blue-100 rounded-[2rem] space-y-4">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-900 px-1">Active Effect</h3>
                            <div className="grid grid-cols-1 gap-2">
                                <EffectOption 
                                    active={backgroundEffect === "none"} 
                                    onClick={() => setBackgroundEffect("none")} 
                                    label="None (Direct Stream)" 
                                    description="Zero processing latency"
                                />
                                <EffectOption 
                                    active={backgroundEffect === "blur"} 
                                    onClick={() => setBackgroundEffect("blur")} 
                                    label="Portrait Blur" 
                                    description="Cinematic depth of field"
                                />
                                <EffectOption 
                                    active={backgroundEffect === "virtual"} 
                                    onClick={() => setBackgroundEffect("virtual")} 
                                    label="Virtual World" 
                                    description="Escape to a custom environment"
                                />
                                {backgroundEffect === "virtual" && (
                                    <div className="grid grid-cols-2 gap-2 mt-4 animate-in fade-in slide-in-from-top-2">
                                        {[
                                            { id: "office", url: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=400", label: "Office" },
                                            { id: "studio", url: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&q=80&w=400", label: "Studio" },
                                            { id: "nature", url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&q=80&w=400", label: "Nature" },
                                            { id: "minimal", url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=400", label: "Modern" }
                                        ].map(bg => (
                                            <button 
                                                key={bg.id}
                                                onClick={() => setVirtualBackgroundImg(bg.url)}
                                                className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all group ${virtualBackgroundImg === bg.url ? "border-orange-600 ring-2 ring-orange-600/20" : "border-transparent opacity-80 hover:opacity-100"}`}
                                            >
                                                <img src={bg.url} alt={bg.label} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
                                                <span className="absolute bottom-1 left-2 text-[8px] font-black uppercase text-white drop-shadow-md">{bg.label}</span>
                                            </button>
                                        ))}
                                        <label className="relative aspect-video rounded-xl overflow-hidden border-2 border-dashed border-blue-200 flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-blue-50 transition-all opacity-80 hover:opacity-100">
                                            <Plus className="w-4 h-4 text-blue-400" />
                                            <span className="text-[8px] font-black uppercase text-blue-400">Custom</span>
                                            <input 
                                                type="file" 
                                                hidden 
                                                accept="image/*"
                                                onChange={(e) => {
                                                    const file = e.target.files[0];
                                                    if (file) {
                                                        const reader = new FileReader();
                                                        reader.onload = (ev) => setVirtualBackgroundImg(ev.target.result);
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                            />
                                        </label>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-6 bg-orange-50/50 border border-orange-100 rounded-[2.5rem]">
                            <div className="flex items-center gap-3 mb-2 text-orange-600">
                                <Shield className="w-4 h-4" />
                                <h4 className="text-[10px] font-black uppercase tracking-widest">Processing Note</h4>
                            </div>
                            <p className="text-[10px] text-orange-900/60 leading-relaxed font-medium">
                                Visual effects are rendered locally using your device's compute engine. This may increase CPU usage during broadcast.
                            </p>
                        </div>
                    </div>
                </div>
            )}
            {activeSidebar === "polls" && <Polls meetingId={meetingId} user={user} onClose={() => setActiveSidebar(null)} socket={socketRef.current} />}
            {activeSidebar === "logs" && (
                <div className="p-8 flex-1 flex flex-col h-full overflow-hidden">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-2xl font-heading font-bold uppercase tracking-tight text-blue-950">Activity Log</h2>
                        <button onClick={() => setActivityLog([])} className="text-[10px] text-red-500 font-black uppercase tracking-widest hover:underline">Clear</button>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-hide">
                        {activityLog.length === 0 ? (
                            <div className="text-center py-20 text-blue-300 text-xs font-bold uppercase">No records found</div>
                        ) : (
                            activityLog.map(log => (
                                <div key={log.id} className="p-5 bg-blue-50/50 border border-blue-50 rounded-3xl space-y-2">
                                    <div className="flex justify-between items-center">
                                        <div className="text-[9px] font-black tracking-widest text-blue-400 uppercase">
                                            {log.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${
                                            log.action === "mute" ? "bg-red-100 text-red-600" :
                                            log.action === "eject" ? "bg-red-600 text-white" :
                                            "bg-blue-100 text-blue-600"
                                        }`}>
                                            {log.action}
                                        </div>
                                    </div>
                                    <div className="text-xs font-medium text-blue-950">
                                        <span className="font-bold">{log.fromName}</span> performed <span className="italic">{log.action}</span> on <span className="font-bold">{log.targetName}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
            {activeSidebar === "users" && (
                <div className="p-8 flex-1 flex flex-col h-full overflow-hidden">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-heading font-bold uppercase tracking-tight text-blue-950">Participants</h2>
                        <div className="text-[10px] text-blue-400 font-black uppercase tracking-widest">
                            {Object.keys(participants).length + 1} ACTIVE
                        </div>
                    </div>

                    <div className="relative mb-6">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                            <Search className="w-4 h-4 text-blue-300" />
                        </div>
                        <input 
                            type="text"
                            value={participantsSearchQuery}
                            onChange={(e) => setParticipantsSearchQuery(e.target.value)}
                            placeholder="Search participants..."
                            className="w-full bg-blue-50/50 border border-blue-50 py-3 pl-10 pr-4 rounded-2xl text-[10px] focus:border-orange-600 focus:outline-none transition-all font-bold placeholder:text-blue-300"
                        />
                    </div>
                    
                    {/* Admission Queue for Host */}
                    {isHost && (
                        <div className="mb-6 space-y-6">
                            {/* Presentation Requests */}
                            {screenShareRequests.length > 0 && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between px-2">
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Screen Share Requests</h3>
                                        <span className="bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full text-[8px] font-black">{screenShareRequests.length}</span>
                                    </div>
                                    <div className="space-y-2">
                                        {screenShareRequests.map(req => (
                                            <div key={req.id} className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-3xl flex items-center justify-between">
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <Share className="w-3 h-3 text-emerald-600 shrink-0" />
                                                    <span className="text-xs font-bold truncate text-blue-950">{req.userName}</span>
                                                </div>
                                                <div className="flex gap-1.5">
                                                    <button 
                                                        onClick={() => {
                                                            grantPermission(req.userId, "screen-share", true);
                                                            addNotification(`Approved screen share for ${req.userName}`, "success");
                                                        }}
                                                        className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase hover:bg-emerald-700 transition-colors shadow-sm"
                                                    >
                                                        Approve
                                                    </button>
                                                    <button 
                                                        onClick={() => setScreenShareRequests(prev => prev.filter(r => r.id !== req.id))}
                                                        className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded-xl transition-colors"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Hand Raise Queue (Speak Requests) */}
                            {Object.values(participants).filter(p => p.isRaised).length > 0 && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between px-2">
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-orange-600">Speaking Queue</h3>
                                        <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full text-[8px] font-black">
                                            {Object.values(participants).filter(p => p.isRaised).length}
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        {Object.values(participants)
                                            .filter(p => p.isRaised)
                                            .sort((a, b) => (a.raisedAt || 0) - (b.raisedAt || 0))
                                            .map((p, index) => (
                                                <div key={p.id} className="p-4 bg-orange-50/50 border border-orange-100 rounded-3xl flex items-center justify-between group">
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <div className="w-6 h-6 flex items-center justify-center bg-orange-100 text-orange-600 rounded-lg text-[10px] font-black shrink-0">
                                                            {index + 1}
                                                        </div>
                                                        <span className="text-xs font-bold truncate text-blue-950">{p.name}</span>
                                                    </div>
                                                    <div className="flex gap-1.5">
                                                        {!p.isAudioEnabled && (
                                                            <button 
                                                                onClick={() => performHostAction("request-unmute", p.id)}
                                                                className="px-3 py-1.5 bg-blue-950 text-white rounded-xl text-[9px] font-black uppercase hover:bg-orange-600 transition-colors shadow-sm"
                                                            >
                                                                Give Chance
                                                            </button>
                                                        )}
                                                        <button 
                                                            onClick={() => performHostAction("hand-raise", p.id, { raised: false })}
                                                            className="p-1.5 text-orange-400 hover:text-red-500 rounded-xl transition-colors opacity-0 group-hover:opacity-100"
                                                            title="Clear hand"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        }
                                    </div>
                                </div>
                            )}

                            {/* Global Moderation */}
                            <div className="p-4 bg-orange-50 border border-orange-100 rounded-[2rem] space-y-3">
                              <h3 className="text-[10px] font-black uppercase tracking-widest text-orange-600 px-2">Global Command</h3>
                              <div className="grid grid-cols-2 gap-2">
                                <button 
                                  onClick={() => setConfirmAction({ action: "mute-all", targetUserId: "all", targetName: "Everyone" })}
                                  className="flex items-center justify-center gap-2 py-3 bg-white border border-orange-200 rounded-xl text-[10px] font-bold text-orange-600 hover:bg-orange-600 hover:text-white transition-all"
                                >
                                  <MicOff className="w-3 h-3" /> Mute All
                                </button>
                                <button 
                                  onClick={() => setConfirmAction({ action: "video-off-all", targetUserId: "all", targetName: "Everyone" })}
                                  className="flex items-center justify-center gap-2 py-3 bg-white border border-orange-200 rounded-xl text-[10px] font-bold text-orange-600 hover:bg-orange-600 hover:text-white transition-all"
                                >
                                  <VideoOff className="w-3 h-3" /> Disable All Video
                                </button>
                              </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-blue-400">Manage Access Allowlist</label>
                                    <div className="flex gap-2">
                                        <input 
                                            type="text"
                                            value={allowlistInput}
                                            onChange={e => setAllowlistInput(e.target.value)}
                                            placeholder="Broadcast emails..."
                                            className="flex-1 bg-blue-50 border border-blue-100 p-3 rounded-2xl text-[10px] focus:border-orange-600 focus:outline-none"
                                        />
                                        <button 
                                            onClick={updateAllowlist}
                                            disabled={isUpdatingAllowlist || !allowlistInput}
                                            className="px-4 bg-blue-950 text-white rounded-2xl hover:bg-orange-600 transition-colors disabled:opacity-50"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="max-h-40 overflow-y-auto pr-1 space-y-1.5 scrollbar-hide">
                                  {allowlist.map((allowed) => (
                                    <div key={allowed.id || allowed.email} className="flex items-center justify-between p-3 bg-blue-50/50 rounded-xl border border-blue-50 ring-1 ring-blue-100/20 group">
                                      <div className="truncate text-[10px] font-bold text-blue-900 pr-2">{allowed.email}</div>
                                      <button 
                                        onClick={() => removeFromAllowlist(allowed.email)}
                                        className="p-1.5 text-blue-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ))}
                                  {allowlist.length === 0 && (
                                    <div className="text-[9px] text-center py-4 text-blue-300 italic">Allowlist is empty</div>
                                  )}
                                </div>
                            </div>

                            {pendingRequests.length > 0 && (
                                <div className="space-y-3">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-orange-600">Admission Queue ({pendingRequests.length})</h3>
                                    <div className="space-y-2">
                                        {pendingRequests.map(req => (
                                            <div key={req.id} className="p-5 bg-blue-50 border border-blue-100 rounded-3xl flex items-center justify-between">
                                                <div className="min-w-0">
                                                    <div className="text-sm font-bold truncate text-blue-950">{req.userName}</div>
                                                    <div className="text-[10px] text-blue-400 truncate">{req.email}</div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={() => {
                                                            socketRef.current?.emit("approve-join", { requestId: req.id, meetingId, userId: req.userId });
                                                            setPendingRequests(prev => prev.filter(r => r.id !== req.id));
                                                        }}
                                                        className="p-2.5 bg-blue-950 text-white rounded-xl hover:scale-110 active:scale-95 transition-all shadow-lg shadow-blue-950/20"
                                                    >
                                                        <ChevronRight className="w-4 h-4" />
                                                    </button>
                                                    <button 
                                                        onClick={() => {
                                                            socketRef.current?.emit("reject-join", { requestId: req.id, meetingId, userId: req.userId });
                                                            setPendingRequests(prev => prev.filter(r => r.id !== req.id));
                                                        }}
                                                        className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:scale-110 active:scale-95 transition-all"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="space-y-4 flex-1 overflow-y-auto pr-2 scrollbar-hide">
                        {/* Local User */}
                        <div className="flex items-center gap-3 p-5 bg-white border border-blue-100 rounded-[2rem] shadow-sm ring-1 ring-blue-50">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl flex items-center justify-center text-sm font-black text-white shadow-lg shadow-blue-600/20">{user.name[0]}</div>
                            <div className="flex-1">
                               <div className="font-bold text-sm tracking-tight text-blue-950">{user.name} (Lead)</div>
                               <div className="flex items-center gap-2 mt-0.5">
                                  {isHost && <div className="text-[8px] text-orange-600 uppercase font-black tracking-widest border border-orange-200 px-1.5 py-0.5 rounded-lg bg-orange-50">Seminar Moderator</div>}
                                  {!isAudioEnabled && <MicOff className="w-3 h-3 text-red-500" />}
                                  {!isVideoEnabled && <VideoOff className="w-3 h-3 text-red-500" />}
                                  {isScreenSharing && (
                                    <div className="flex items-center gap-1.5 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100 ring-1 ring-emerald-500/10">
                                        <Share className="w-2.5 h-2.5 text-emerald-600" />
                                        <span className="text-[7px] font-black text-emerald-600 uppercase tracking-tighter">Broadcasting Screen</span>
                                    </div>
                                  )}
                                  {isHandRaised && <Hand className="w-3 h-3 text-orange-500 fill-orange-500" />}
                               </div>
                            </div>
                        </div>

                        {/* Sorted Participants */}
                        {Object.values(participants)
                          .filter(p => 
                            p.name.toLowerCase().includes(participantsSearchQuery.toLowerCase()) || 
                            (p.email && p.email.toLowerCase().includes(participantsSearchQuery.toLowerCase()))
                          )
                          .sort((a, b) => {
                            if (a.isRaised && !b.isRaised) return -1;
                            if (!a.isRaised && b.isRaised) return 1;
                            return a.name.localeCompare(b.name);
                          })
                          .map(p => (
                             <div key={p.id} className="flex items-center gap-3 p-5 hover:bg-blue-50/50 border border-transparent hover:border-blue-50 rounded-[2rem] transition-all group">
                                <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center text-sm font-black text-blue-600">{p.name[0]}</div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-sm tracking-tight text-blue-900 truncate">{p.name}</div>
                                    {p.email && <div className="text-[9px] text-blue-400 truncate">{p.email}</div>}
                                    <div className="flex items-center gap-2 mt-1">
                                        {p.isAudioEnabled ? <Mic className="w-3 h-3 text-blue-300" /> : <MicOff className="w-3 h-3 text-red-400" />}
                                        {p.isVideoEnabled ? <VideoIcon className="w-3 h-3 text-blue-300" /> : <VideoOff className="w-3 h-3 text-red-400" />}
                                        {p.isScreenSharing && (
                                            <div className="flex items-center gap-1 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-100">
                                                <Share className="w-2 h-2 text-emerald-600" />
                                                <span className="text-[6px] font-black text-emerald-600 uppercase">Screen</span>
                                            </div>
                                        )}
                                        {p.isRaised && (
                                            <div className="flex items-center gap-1 bg-orange-50 px-1.5 py-0.5 rounded-md border border-orange-100">
                                                <Hand className="w-2 h-2 text-orange-600 fill-orange-600/30" />
                                                <span className="text-[6px] font-black text-orange-600 uppercase">Raised</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                 <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity items-center">
                                    {isHost && (
                                       <HostControlMenu 
                                         participant={p}
                                         onAction={(action) => setConfirmAction({ action, targetUserId: p.id, targetName: p.name })}
                                       />
                                    )}
                                </div>
                             </div>
                        ))}
                    </div>
                </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <InviteModal 
        isOpen={isInviteModalOpen} 
        onClose={() => setIsInviteModalOpen(false)} 
        meetingId={meetingId} 
      />

      <AnimatePresence>
          {confirmAction && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-blue-950/20 backdrop-blur-xl z-[300] flex items-center justify-center p-8"
              >
                  <motion.div 
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    className="bg-white border border-blue-50 w-full max-w-sm rounded-[3rem] p-10 space-y-8 shadow-2xl text-center"
                  >
                      <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center ${
                          confirmAction.action === "eject" || confirmAction.action === "mute" || confirmAction.action === "video-off" 
                            ? "bg-red-50 text-red-500" 
                            : "bg-orange-50 text-orange-600"
                      }`}>
                          {confirmAction.action === "eject" && <PhoneOff className="w-8 h-8" />}
                          {(confirmAction.action === "mute" || confirmAction.action === "unmute") && <Mic className="w-8 h-8" />}
                          {(confirmAction.action === "video-off" || confirmAction.action === "video-on") && <VideoIcon className="w-8 h-8" />}
                          {confirmAction.action === "be-unmuted" && (confirmAction.type === "audio" ? <Mic className="w-8 h-8" /> : <VideoIcon className="w-8 h-8" />)}
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-xl font-heading uppercase text-blue-950">
                            {confirmAction.isRequest ? "Host Request" : "Protocol Confirmation"}
                        </h3>
                        <p className="text-sm text-blue-400 font-medium leading-relaxed">
                            {confirmAction.action === "eject" && `Are you sure you want to terminate the connection for ${confirmAction.targetName}?`}
                            {confirmAction.action === "mute" && `Restrict audio broadcast for ${confirmAction.targetName}?`}
                            {confirmAction.action === "mute-all" && `Restrict audio broadcast for all active participants?`}
                            {confirmAction.action === "unmute" && `Grant microphone access to ${confirmAction.targetName}?`}
                            {confirmAction.action === "video-off" && `Disable video feed for ${confirmAction.targetName}?`}
                            {confirmAction.action === "video-off-all" && `Disable video feed for all active participants?`}
                            {confirmAction.action === "video-on" && `Grant camera access to ${confirmAction.targetName}?`}
                            {confirmAction.action === "be-unmuted" && `${confirmAction.fromName} has requested to enable your ${confirmAction.type}. Permit this sync?`}
                            {confirmAction.action === "end" && "Are you certain you want to terminate the entire seminar for all participants? This node will be locked post-event."}
                        </p>
                      </div>

                      <div className="flex flex-col gap-3">
                          <button 
                            onClick={() => {
                                if (confirmAction.action === "be-unmuted") {
                                    if (confirmAction.type === "audio") setIsAudioEnabled(true);
                                    if (confirmAction.type === "video") setIsVideoEnabled(true);
                                    setConfirmAction(null);
                                } else if (confirmAction.action === "end") {
                                    endMeeting();
                                } else {
                                    performHostAction(confirmAction.action, confirmAction.targetUserId);
                                }
                            }}
                            className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-lg ${
                                confirmAction.action === "eject" || confirmAction.action === "end" ? "bg-red-500 text-white shadow-red-500/20" : "bg-blue-950 text-white shadow-blue-950/20"
                            }`}
                          >
                            {confirmAction.action === "be-unmuted" ? "Grant Authorization" : confirmAction.action === "end" ? "TERMINATE ALL" : "Execute Protocol"}
                          </button>
                          <button onClick={() => setConfirmAction(null)} className="w-full py-4 text-blue-400 font-black uppercase tracking-widest text-[10px] hover:text-blue-950">
                            Abort
                          </button>
                      </div>
                  </motion.div>
              </motion.div>
          )}
      </AnimatePresence>

      {/* Notifications Portal - Modern Toast System */}
      <div className={`fixed bottom-32 ${activeSidebar ? "right-[416px]" : "right-8"} z-[200] pointer-events-none flex flex-col items-end gap-3 w-80 transition-all duration-500`}>
          <AnimatePresence mode="popLayout">
              {notifications.map(n => (
                  <motion.div
                      key={n.id}
                      layout
                      initial={{ opacity: 0, x: 50, scale: 0.9 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: 20, scale: 0.9 }}
                      className="bg-white/90 backdrop-blur-3xl border border-blue-50 py-4 px-6 rounded-[2rem] shadow-2xl flex items-center justify-between gap-4 pointer-events-auto ring-1 ring-blue-900/5 group w-full"
                  >
                      <div className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full shadow-sm shrink-0 ${
                            n.type === "join" ? "bg-emerald-500 shadow-emerald-500/20" :
                            n.type === "leave" ? "bg-red-500 shadow-red-500/20" :
                            n.type === "host" ? "bg-orange-500 shadow-orange-500/20" :
                            "bg-blue-500 shadow-blue-500/20"
                        }`} />
                        <span className="text-[11px] font-bold tracking-tight text-blue-950 leading-tight">{n.text}</span>
                      </div>
                      <button 
                        onClick={() => dismissNotification(n.id)}
                        className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-300 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <X className="w-3 h-3" />
                      </button>
                  </motion.div>
              ))}
          </AnimatePresence>
      </div>

      {/* Prominent Admission Request Overlay for Host */}
      {isHost && pendingRequests.length > 0 && (
          <div className="fixed top-24 right-8 z-[201] w-80 space-y-3">
              <AnimatePresence>
                  {pendingRequests.map(req => (
                      <motion.div 
                        key={req.id}
                        initial={{ x: 100, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 100, opacity: 0 }}
                        className="bg-white/90 backdrop-blur-3xl border border-blue-100 p-6 rounded-[2.5rem] shadow-2xl space-y-4 ring-1 ring-blue-900/5"
                      >
                          <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center text-white font-black text-xs shadow-lg shadow-orange-600/20">
                                  {req.userName[0]}
                              </div>
                              <div className="flex-1 min-w-0">
                                  <p className="text-[10px] font-black uppercase tracking-widest text-orange-600">Pending Admission</p>
                                  <p className="text-sm font-bold text-blue-950 truncate">{req.userName}</p>
                              </div>
                          </div>
                          <div className="flex gap-2">
                              <button 
                                onClick={() => {
                                    socketRef.current?.emit("approve-join", { requestId: req.id, meetingId, userId: req.userId });
                                    setPendingRequests(prev => prev.filter(r => r.id !== req.id));
                                }}
                                className="flex-1 py-3 bg-blue-950 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 transition-colors"
                              >
                                Approve
                              </button>
                              <button 
                                onClick={() => {
                                    socketRef.current?.emit("reject-join", { requestId: req.id, meetingId, userId: req.userId });
                                    setPendingRequests(prev => prev.filter(r => r.id !== req.id));
                                }}
                                className="px-4 py-3 bg-red-50 text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-colors"
                              >
                                Reject
                              </button>
                          </div>
                      </motion.div>
                  ))}
              </AnimatePresence>
          </div>
      )}

      {/* Prominent Recording Request Overlay for Host */}
      {isHost && recordingRequests.length > 0 && (
          <div className="fixed top-24 left-8 z-[201] w-80 space-y-3">
              <AnimatePresence>
                  {recordingRequests.map(req => (
                      <motion.div 
                        key={req.id}
                        initial={{ x: -100, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -100, opacity: 0 }}
                        className="bg-white/90 backdrop-blur-3xl border border-blue-100 p-6 rounded-[2.5rem] shadow-2xl space-y-4 ring-1 ring-blue-900/5"
                      >
                          <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-xs shadow-lg shadow-blue-600/20">
                                  {req.userName[0]}
                              </div>
                              <div className="flex-1 min-w-0">
                                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Recording Authorization</p>
                                  <p className="text-sm font-bold text-blue-950 truncate">{req.userName}</p>
                              </div>
                          </div>
                          <div className="flex gap-2">
                              <button 
                                onClick={() => approveRecordingRequest(req.userId)}
                                className="flex-1 py-3 bg-blue-950 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-600 transition-colors cursor-pointer"
                              >
                                Approve
                              </button>
                              <button 
                                onClick={() => rejectRecordingRequest(req.userId)}
                                className="px-4 py-3 bg-red-50 text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
                              >
                                Decline
                              </button>
                          </div>
                      </motion.div>
                  ))}
              </AnimatePresence>
          </div>
      )}
    </div>
  );
}

function InviteModal({ isOpen, onClose, meetingId }) {
    const [emails, setEmails] = useState("");
    const [message, setMessage] = useState("Join our technical broadcast on the WEB-SEMINAR platform.");
    const url = window.location.href;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-blue-950/20 backdrop-blur-md z-[100] flex items-center justify-center p-8">
            <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white border border-blue-50 w-full max-w-lg rounded-[3rem] overflow-hidden shadow-2xl"
            >
                <div className="p-10 space-y-10">
                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <h2 className="text-3xl font-heading font-black uppercase tracking-tight text-blue-950">Invite Peers</h2>
                            <p className="text-xs text-blue-400 font-medium">Secure invitation protocol for technical seminars.</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-blue-50 rounded-full transition-colors"><X className="w-6 h-6 text-blue-200" /></button>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-display font-black uppercase tracking-[0.2em] text-blue-400">Target Recipients</label>
                            <input 
                                value={emails}
                                onChange={e => setEmails(e.target.value)}
                                placeholder="Enter academic emails..."
                                className="w-full bg-blue-50 border border-blue-100 p-5 rounded-[2rem] text-sm focus:border-orange-600 focus:outline-none transition-all shadow-sm"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-display font-black uppercase tracking-[0.2em] text-blue-400">Seminar Description</label>
                            <textarea 
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                className="w-full bg-blue-50 border border-blue-100 p-5 rounded-[2rem] text-sm h-32 focus:border-orange-600 focus:outline-none transition-all resize-none shadow-sm"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-4">
                        <button 
                          onClick={() => {
                              const mailtoUrl = `mailto:${emails}?subject=WEB-SEMINAR invitation&body=${encodeURIComponent(message)}%0D%0A%0D%0ASync Link: ${url}%0D%0A%0D%0AAccess Code: ${meetingId}`;
                              window.location.href = mailtoUrl;
                              onClose();
                          }}
                          className="w-full py-5 bg-blue-950 text-white font-black uppercase tracking-widest text-xs rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-blue-950/20 hover:bg-orange-600"
                        >
                            Dispatch Email Invitations
                        </button>

                        <div className="grid grid-cols-2 gap-3">
                           <button 
                              onClick={() => {
                                  navigator.clipboard.writeText(url);
                                  alert("Link copied to clipboard");
                              }}
                              className="py-4 brutal-border bg-paper text-[9px] font-black uppercase tracking-widest hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                           >
                              <Share className="w-3 h-3" /> Copy Link
                           </button>
                           <button 
                              onClick={() => {
                                  navigator.clipboard.writeText(meetingId);
                                  alert("Access Code copied to clipboard");
                              }}
                              className="py-4 brutal-border bg-paper text-[9px] font-black uppercase tracking-widest hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                           >
                              <Shield className="w-3 h-3" /> Copy ID
                           </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

function HostControlMenu({ participant, onAction }) {
    const [open, setOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={menuRef}>
            <button 
                onClick={() => setOpen(!open)} 
                className="p-2 hover:bg-blue-100 text-blue-400 rounded-xl transition-colors"
                title="Moderate Participant"
            >
                <MoreVertical className="w-4 h-4" />
            </button>
            {open && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-blue-50 rounded-2xl overflow-hidden shadow-2xl z-[100] ring-1 ring-blue-900/5">
                    <div className="px-4 py-2 border-b border-blue-50 bg-blue-50/30">
                        <p className="text-[8px] font-black uppercase tracking-widest text-blue-400">Moderation Menu</p>
                    </div>
                    
                    {participant.isAudioEnabled ? (
                        <button 
                            onClick={() => { onAction("mute"); setOpen(false); }} 
                            className="w-full text-left px-4 py-3 text-[10px] font-bold uppercase tracking-tight hover:bg-blue-50 text-blue-900 flex items-center gap-3 transition-colors"
                        >
                            <MicOff className="w-4 h-4 text-red-500" /> Mute Participant
                        </button>
                    ) : (
                        <button 
                            onClick={() => { onAction("request-unmute"); setOpen(false); }} 
                            className="w-full text-left px-4 py-3 text-[10px] font-bold uppercase tracking-tight hover:bg-blue-50 text-emerald-600 flex items-center gap-3 transition-colors"
                        >
                            <Mic className="w-4 h-4" /> Request Unmute
                        </button>
                    )}

                    {participant.isVideoEnabled ? (
                        <button 
                            onClick={() => { onAction("video-off"); setOpen(false); }} 
                            className="w-full text-left px-4 py-3 text-[10px] font-bold uppercase tracking-tight hover:bg-blue-50 text-blue-900 flex items-center gap-3 transition-colors"
                        >
                            <VideoOff className="w-4 h-4 text-red-500" /> Disable Video
                        </button>
                    ) : (
                        <button 
                            onClick={() => { onAction("request-video-on"); setOpen(false); }} 
                            className="w-full text-left px-4 py-3 text-[10px] font-bold uppercase tracking-tight hover:bg-blue-50 text-emerald-600 flex items-center gap-3 transition-colors"
                        >
                            <VideoIcon className="w-4 h-4" /> Request Video
                        </button>
                    )}

                    <div className="h-px bg-blue-50" />
                    
                    <button 
                        onClick={() => { onAction("eject"); setOpen(false); }} 
                        className="w-full text-left px-4 py-3 text-[10px] font-bold uppercase tracking-tight hover:bg-red-50 text-red-600 flex items-center gap-3 transition-colors"
                    >
                        <PhoneOff className="w-4 h-4" /> Eject from Seminar
                    </button>
                </div>
            )}
        </div>
    );
}

function EffectOption({ active, onClick, label, description }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full text-left p-4 rounded-2xl border transition-all ${
        active 
          ? "bg-white border-blue-200 shadow-lg ring-1 ring-blue-50" 
          : "bg-transparent border-transparent hover:bg-blue-100/50"
      }`}
    >
      <div className="text-xs font-bold text-blue-950 uppercase tracking-tight">{label}</div>
      <div className="text-[10px] text-blue-400 font-medium mt-0.5">{description}</div>
    </button>
  );
}

function ControlBtn({ onClick, active, icon }) {
  return (
    <button 
      onClick={onClick}
      className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-xl ${
        active 
          ? "bg-white text-blue-900 hover:bg-blue-50 border border-blue-50/50" 
          : "bg-red-50 text-red-500 border border-red-50 hover:bg-red-100"
      }`}
    >
      {icon}
    </button>
  );
}

function EmojiPicker({ onPick }) {
  const emojis = ["❤️", "👏", "🎉", "🔥", "😂", "😮"];
  return (
    <div className="flex gap-2">
      {emojis.map(e => (
        <button key={e} onClick={() => onPick(e)} className="p-2.5 hover:bg-blue-50 rounded-xl text-xl transition-all hover:scale-125">
          {e}
        </button>
      ))}
    </div>
  );
}
