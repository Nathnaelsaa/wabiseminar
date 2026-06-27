# Wabiseminar

Wabiseminar is a professional, institutional-grade video conferencing and virtual seminar platform designed with elegant typography, smooth user experiences, and a focus on security, collaboration, and robust host controls.

---

## 🌟 Key Features

- **Pristine Presentation & Screen Share**: High-fidelity screen and audio sharing with built-in presenter permissions managed dynamically by the host.
- **Collaborative Live Polling**: Real-time polling with visual distribution charts, allowing hosts to gather instant feedback during sessions.
- **Dynamic Meeting Roster & Admission Queue**: Restrict entry to allowed academic email streams or handle guest admissions manually from the host controls.
- **Interactive Hand Raise**: Integrated, ordered queue for speaking requests with visible indicators across the participant grid.
- **Real-Time Video Tiles**: WebRTC-powered high-performance stream rendering with custom fallback layouts, video/audio toggles, and participant focus.
- **AI-Powered Portrait Background Blur**: Integrated with MediaPipe's Selfie Segmentation to provide real-time portrait background blur directly in the browser.
- **Multi-User Real-Time Chat**: Fluid messaging thread with support for rich text logs, announcement pins, and separate question boards.
- **Dual-Mode Seminar Recording**: High-performance local media recording (webm format) with direct cloud buffer uploads to the hosting server.
- **Robust Database Engine**: Seamless auto-fallback architecture; uses a local SQLite database (`wabiseminar.sqlite`) by default, with native plug-and-play support for remote MySQL/MariaDB backends.

---

## 🏗️ Codebase Structure

The project is structured following clean React guidelines paired with an Express/Node.js backend.

```text
├── database.js            # Database engine (Knex configuration & migration helper)
├── server.js              # Express backend, WebSockets (Socket.io) handlers, and API router
├── vite.config.js         # Vite compiler, esbuild loaders, and proxy settings
├── package.json           # Node dependencies and build scripts
├── metadata.json          # Application capabilities and system-level permissions
├── .env.example           # Template for custom environment credentials
│
└── src/
    ├── main.jsx           # Application entry point mounting React
    ├── App.jsx            # Main app router directing Landing, Auth, Dashboard, and Meeting Room views
    ├── index.css          # Tailwind CSS global stylesheet with custom theme layers
    │
    └── components/
        ├── Landing.jsx             # Beautiful showcase homepage introducing the platform
        ├── Auth.jsx                # High-contrast credential entry page (Sign In / Sign Up)
        ├── Dashboard.jsx           # Personal scheduler, seminar catalog, and host panel
        ├── Admin.jsx               # Institutional administrative console for global controls
        ├── Settings.jsx            # User profile, verified academic email, and audio/video input preferences
        ├── MeetingRoom.jsx         # Immersive virtual seminar suite (Core socket-WebRTC logic)
        ├── Chat.jsx                # Responsive real-time panel with rich messaging
        ├── Polls.jsx               # Interactive audience polling interface and live graphs
        ├── ParticipantsSidebar.jsx # Roster list, host permission toggles, and guest queue
        └── VideoTile.jsx           # Fluid video viewport component with participant state badges
```

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Tailwind CSS, [Motion](https://motion.dev/) (f.k.a Framer Motion) for fluid UI micro-animations, Lucide React icons.
- **Video & Real-Time Streams**: PeerJS (WebRTC wrappers) and standard Web MediaDevices API.
- **Background Processing**: MediaPipe Selfie Segmentation + Camera Utils.
- **Backend & WebSockets**: Node.js, Express, Socket.io for ultra-low latency real-time event sync.
- **Database Layer**: Knex.js, SQLite3 (local fallback) / MariaDB & MySQL (production).
- **Authentication**: Custom security flow using JWT tokens and secure password hashing.

---

## 🚀 Getting Started

### 1. Configure Environment Variables
Copy `.env.example` to `.env` and fill in the optional configurations:
```bash
cp .env.example .env
```
*Note: If DB variables are left blank, Wabiseminar automatically instantiates and uses its internal SQLite database.*

### 2. Install Dependencies
Install all required node packages:
```bash
npm install
```

### 3. Run Development Server
Boot up the full-stack server (Vite middleware proxy + Express backend):
```bash
npm run dev
```
The application will be accessible at [http://localhost:3000](http://localhost:3000).

### 4. Build for Production
To bundle the frontend and compile the backend into a CJS production target:
```bash
npm run build
```
Start the compiled production node:
```bash
npm start
```

---

## 📖 How to Use

1. **Host a Seminar**: Sign in, click "Start Instant Seminar" or "Schedule Seminar" on your dashboard.
2. **Invite Peers**: Use the "Invite Peers" button to copy the direct join link containing the dynamic access code.
3. **Control Room Options**:
   - Access the **Participants List** to toggle screenshare/camera permissions, admit pending guests, or mute audio.
   - Initiate **Polls** to gather feedback or start **Recording** to download the session's stream on finish.
   - Adjust camera backgrounds to **Portrait Blur** in the video control bar.
