
import { useState, useEffect, useRef } from 'react';
import {
  Home,
  Search,
  Compass,
  MessageSquare,
  User,
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
  ArrowLeft,
  Cpu,
  Instagram,
  Image as ImageIcon,
  Lock,
  Menu,
  PlusSquare,
  Trash2
} from 'lucide-react';
import './App.css';
import { io } from 'socket.io-client';

// Import local assets
import hackerAvatar from './assets/hacker_avatar.jpg';
import cyberNetwork from './assets/cyber_network.jpg';
import SafeConnectAuthBackground from './SafeConnectAuthBackground.jsx';
import SafeConnectAdminBackground from './SafeConnectAdminBackground.jsx';

// Toggle between standalone client-side simulation (localStorage) and actual live backend APIs.
// Automatically runs in mockup simulation mode locally on localhost/127.0.0.1, and live mode in production!
const USE_LIVE_BACKEND = true;
const API_BASE = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : '');

// Seed local storage with default profiles, posts, chats, and notifications if they do not exist
const seedLocalStorage = () => {
  // Wipe and reseed if the new users are missing or have old passwords
  const currentUsers = JSON.parse(localStorage.getItem('ig_users') || '[]');
  const hasOldPassword = currentUsers.some(u => u.username === 'tharun_sai' && u.password === '325698');
  const hasTharunBattu = currentUsers.some(u => u.username === 'tharun_battu');
  if (currentUsers.length > 0 && (!currentUsers.some(u => u.username === 'akhila_nalajala') || !currentUsers.some(u => u.username === 'tharun_sai') || !hasTharunBattu || hasOldPassword)) {
    localStorage.removeItem('ig_users');
    localStorage.removeItem('ig_posts');
    localStorage.removeItem('ig_comments');
    localStorage.removeItem('ig_likes');
    localStorage.removeItem('ig_follows');
    localStorage.removeItem('ig_messages');
    localStorage.removeItem('ig_notifications');
    sessionStorage.removeItem('ig_current_user');
    sessionStorage.removeItem('ig_jwt_token');
  }

  if (!localStorage.getItem('ig_users')) {
    const defaultUsers = [
      { id: 1, username: 'tharun_sai', password: '325698abc', name: 'Tharun Sai', bio: 'Fusing Artificial Intelligence with Software Design. Crafting modern interfaces and building high-performance systems. VS Code is my canvas.', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150' },
      { id: 2, username: 'tharun_battu', password: '325698abc', name: 'Tharun Battu', bio: 'Software Engineer. Building reliable backend systems and cloud architectures.', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150' },
      { id: 3, username: 'srinivas_bikki', password: '325698abc', name: 'Srinivas Bikki', bio: 'System Specialist. Designing scalable database structures and optimized network layers.', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },
      { id: 4, username: 'srinitha_bathula', password: '325698abc', name: 'Srinitha Bathula', bio: 'Product Manager. Crafting products from ideation to production. Lover of minimalist interfaces.', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150' },
      { id: 5, username: 'chandu_doaddapaneni', password: '325698abc', name: 'Chandu Doaddapaneni', bio: 'Database Engineer. Making data queries run at lightning speed. Space enthusiast.', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150' },
      { id: 6, username: 'madhu_chippala', password: '325698abc', name: 'Madhu Chippala', bio: 'Frontend Developer. Animating the web one transition at a time. JavaScript fan.', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150' },
      { id: 7, username: 'sailu_betha', password: '325698abc', name: 'Sailu Betha', bio: 'UI Designer. Passionate about color harmony, typography, and dark mode layouts.', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150' },

      // Seeded accounts with initial password: 325698abc
      { id: 8, username: 'akhila_nalajala', password: '325698abc', name: 'Akhila Nalajala', bio: 'Developer. Building high-performance visual components.', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150' },
      { id: 9, username: 'gayathri_daggubati', password: '325698abc', name: 'Gayathri Daggubati', bio: 'Designer. Designing elegant, responsive user layouts.', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' },
      { id: 10, username: 'sreehasa_mandalapu', password: '325698abc', name: 'Sreehasa Mandalapu', bio: 'Software Engineer. Writing reliable frontend features.', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150' },
      { id: 11, username: 'venkat_prakash', password: '325698abc', name: 'Venkat Prakash Pulavarthi', bio: 'Database Specialist. Query optimizations and SQL procedures.', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150' },
      { id: 12, username: 'sowmya_jonnalagadda', password: '325698abc', name: 'Sowmya Jonnalagadda', bio: 'Product Analyst. Analyzing user engagement metrics.', avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150' }
    ];
    localStorage.setItem('ig_users', JSON.stringify(defaultUsers));
  }

  if (!localStorage.getItem('ig_posts')) {
    const defaultPosts = [
      { id: 1, user_id: 3, type: 'image', img: 'cyberNetwork', caption: 'Finished the layout optimization checks. System metrics look healthy. All system modules are stable! 💻🛡️', created_at: new Date(Date.now() - 3600000 * 2).toISOString() },
      { id: 2, user_id: 4, type: 'caesar', caption: 'Solved our intercepted cipher string sequence. Comment your decoded plaintext to register authorization key!', created_at: new Date(Date.now() - 3600000 * 5).toISOString() },
      { id: 3, user_id: 5, type: 'code', caption: 'Auditing memory buffers in backend systems. Safe allocations ensure no performance lags!', created_at: new Date(Date.now() - 3600000 * 24).toISOString() },
      { id: 4, user_id: 1, type: 'gradient', title: 'System Layout', content: 'Dark mode tokens integrated.', created_at: new Date(Date.now() - 3600000 * 26).toISOString() },
      { id: 5, user_id: 1, type: 'text', content: 'Fusing clean components in VS Code. React hot reloading runs smoothly!', created_at: new Date(Date.now() - 3600000 * 28).toISOString() },
      { id: 6, user_id: 1, type: 'gradient', title: 'AI Assistant Node', content: 'Configuring script parsers', created_at: new Date(Date.now() - 3600000 * 30).toISOString() },
      { id: 7, user_id: 6, type: 'text', content: 'React layout transitions are fully responsive. Next up, image pickers!', created_at: new Date(Date.now() - 3600000 * 32).toISOString() },
      { id: 8, user_id: 6, type: 'gradient', title: 'CSS Animations', content: 'Smooth easing functions', created_at: new Date(Date.now() - 3600000 * 34).toISOString() },
      { id: 9, user_id: 7, type: 'gradient', title: 'Design Template', content: 'Premium dark UI color guidelines.', created_at: new Date(Date.now() - 3600000 * 36).toISOString() }
    ];
    localStorage.setItem('ig_posts', JSON.stringify(defaultPosts));
  }

  if (!localStorage.getItem('ig_comments')) {
    const defaultComments = [
      { id: 1, post_id: 1, user_id: 5, text: 'Looking clean! System metrics look healthy.', created_at: new Date().toISOString() },
      { id: 2, post_id: 1, user_id: 4, text: 'Tharun Sai is doing great work routing these packages.', created_at: new Date().toISOString() },
      { id: 3, post_id: 2, user_id: 7, text: 'The answer is: "The portal is secure"!', created_at: new Date().toISOString() },
      { id: 4, post_id: 3, user_id: 6, text: 'Excellent audit report. Setting up guards.', created_at: new Date().toISOString() }
    ];
    localStorage.setItem('ig_comments', JSON.stringify(defaultComments));
  }

  if (!localStorage.getItem('ig_likes')) {
    localStorage.setItem('ig_likes', JSON.stringify([]));
  }

  if (!localStorage.getItem('ig_follows')) {
    localStorage.setItem('ig_follows', JSON.stringify([]));
  }

  if (!localStorage.getItem('ig_messages')) {
    const defaultMessages = [
      { id: 1, sender_id: 3, receiver_id: 1, text: 'The new backend modules are running. Did you check the Caesar puzzle?', created_at: new Date(Date.now() - 600000).toISOString() },
      { id: 2, sender_id: 1, receiver_id: 3, text: 'Checking it out now!', created_at: new Date(Date.now() - 500000).toISOString() },
      { id: 3, sender_id: 4, receiver_id: 1, text: 'The performance report is outstanding. Ready to release.', created_at: new Date(Date.now() - 400000).toISOString() },
      { id: 4, sender_id: 5, receiver_id: 1, text: 'Malloc boundary updates completed successfully.', created_at: new Date(Date.now() - 300000).toISOString() },
      { id: 5, sender_id: 6, receiver_id: 1, text: 'UI spacing updates look great. Ready for review.', created_at: new Date(Date.now() - 200000).toISOString() }
    ];
    localStorage.setItem('ig_messages', JSON.stringify(defaultMessages));
  }

  if (!localStorage.getItem('ig_notifications')) {
    localStorage.setItem('ig_notifications', JSON.stringify([]));
  }
};

let visionModule = null;
let faceLandmarkerInstance = null;

async function loadFaceLandmarkerHelper() {
  if (faceLandmarkerInstance) return faceLandmarkerInstance;
  if (!visionModule) {
    visionModule = await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/vision_bundle.mjs");
  }
  const filesetResolver = await visionModule.FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
  );
  faceLandmarkerInstance = await visionModule.FaceLandmarker.createFromOptions(
    filesetResolver,
    {
      baseOptions: {
        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
        delegate: "GPU"
      },
      runningMode: "VIDEO",
      numFaces: 2
    }
  );
  return faceLandmarkerInstance;
}

const SafeConnectLogo = ({ size = 24, style = {} }) => (
  <svg
    viewBox="0 0 100 100"
    width={size}
    height={size}
    style={{
      display: 'inline-block',
      verticalAlign: 'middle',
      flexShrink: 0,
      filter: 'drop-shadow(0 0 8px rgba(168, 85, 247, 0.45))',
      ...style
    }}
  >
    <defs>
      <linearGradient id="scLogoCircleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#251247" />
        <stop offset="100%" stopColor="#120826" />
      </linearGradient>
      <linearGradient id="scLogoPathGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#c084fc" />
        <stop offset="100%" stopColor="#9333ea" />
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="46" fill="url(#scLogoCircleGrad)" stroke="#a855f7" strokeWidth="2.5" />
    <g transform="translate(25.5, 27.5)">
      <path
        fill="url(#scLogoPathGrad)"
        d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z"
      />
    </g>
  </svg>
);

const formatComplaintDateTime = (dateVal) => {
  if (!dateVal) return 'N/A';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

function App() {
  seedLocalStorage();
  const socketRef = useRef(null);

  // Navigation & View tab states
  const [activeTab, setActiveTab] = useState(() => sessionStorage.getItem('ig_active_tab') || 'home');
  const [tabHistory, setTabHistory] = useState(['home']);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);

  // Authentication states
  const [jwtToken, setJwtToken] = useState(() => sessionStorage.getItem('ig_jwt_token') || '');
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const savedUser = sessionStorage.getItem('ig_current_user');
    return !!savedUser;
  });
  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = sessionStorage.getItem('ig_current_user');
    if (savedUser) return JSON.parse(savedUser);
    return null;
  });

  // Admin authentication states
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => !!sessionStorage.getItem('ig_admin_token'));
  const [adminToken, setAdminToken] = useState(() => sessionStorage.getItem('ig_admin_token') || '');
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState(null);
  const [adminSuccess, setAdminSuccess] = useState('');
  const [adminActiveTab, setAdminActiveTab] = useState('users'); // 'users' or 'complaints'
  const [adminComplaints, setAdminComplaints] = useState([]);
  const [adminSelectedComplaint, setAdminSelectedComplaint] = useState(null);
  const [adminFeedbackList, setAdminFeedbackList] = useState([]);
  const [adminFeedbackLoading, setAdminFeedbackLoading] = useState(false);

  const fetchAdminFeedback = async () => {
    if (!USE_LIVE_BACKEND) return;
    setAdminFeedbackLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/abusive-feedback`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('ig_admin_token') || adminToken}`
        }
      });
      if (res.status === 200) {
        const data = await res.json();
        setAdminFeedbackList(data);
      }
    } catch (err) {
      console.error('Error fetching admin feedback:', err);
    } finally {
      setAdminFeedbackLoading(false);
    }
  };

  const [approvingFeedbackId, setApprovingFeedbackId] = useState(null);

  const handleApproveFeedback = async (id) => {
    if (!id || approvingFeedbackId) return;
    setApprovingFeedbackId(id);
    try {
      const res = await fetch(`${API_BASE}/api/admin/abusive-feedback/${id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('ig_admin_token') || adminToken}`
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAdminFeedbackList(prev => prev.map(item => item.id === id ? { ...item, status: 'APPROVED' } : item));
      } else {
        alert(data.error || 'Failed to update abusive dataset.');
      }
    } catch (err) {
      console.error('Error approving feedback:', err);
      alert('Error connecting to server. Please try again.');
    } finally {
      setApprovingFeedbackId(null);
    }
  };

  const fetchAdminComplaints = async () => {
    if (!USE_LIVE_BACKEND) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/complaints`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('ig_admin_token') || adminToken}`
        }
      });
      if (res.status === 200) {
        const data = await res.json();
        setAdminComplaints(data);
      } else {
        const errData = await res.json();
        setAdminError(errData.error || 'Failed to fetch admin complaints.');
      }
    } catch (err) {
      setAdminError('Error fetching complaints: ' + err.message);
    }
  };

  const getReportedUserWarningCount = (complaint) => {
    if (!complaint) return 0;
    const targetId = complaint.reportedUserId;
    const targetUsername = complaint.reportedUserUsername;

    // 1. Look up in adminUsers by id
    if (targetId !== null && targetId !== undefined && Array.isArray(adminUsers) && adminUsers.length > 0) {
      const matched = adminUsers.find(u => u.id === targetId || String(u.id) === String(targetId));
      if (matched && matched.warningCount !== undefined && matched.warningCount !== null) {
        return Number(matched.warningCount) || 0;
      }
    }
    // 2. Look up in adminUsers by username
    if (targetUsername && Array.isArray(adminUsers) && adminUsers.length > 0) {
      const matched = adminUsers.find(u => u.username && u.username.toLowerCase() === targetUsername.toLowerCase());
      if (matched && matched.warningCount !== undefined && matched.warningCount !== null) {
        return Number(matched.warningCount) || 0;
      }
    }
    // 3. Fall back to complaint's own reportedUserWarningCount or warningCount (from backend User table)
    const rawCount = complaint.reportedUserWarningCount !== undefined
      ? complaint.reportedUserWarningCount
      : (complaint.warningCount !== undefined ? complaint.warningCount : (complaint.warningNumber || 0));
    return Number.isFinite(Number(rawCount)) ? Number(rawCount) : 0;
  };

  const handleIssueWarning = async (complaint) => {
    if (!complaint || !complaint.id) return;
    if (USE_LIVE_BACKEND) {
      try {
        const token = sessionStorage.getItem('ig_admin_token') || adminToken;
        const res = await fetch(`${API_BASE}/api/admin/complaints/${complaint.id}/warning`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await res.json();
        if (res.ok && data.success) {
          alert(data.message || `Warning #${data.warningNumber} issued successfully.`);
          const targetUserId = data.reportedUserId || complaint.reportedUserId;
          const targetUsername = complaint.reportedUserUsername;
          const newCount = Number(data.warningCount);

          // Update adminUsers state immediately for the reported user's unique ID
          setAdminUsers(prev => prev.map(u => {
            const isMatch = (targetUserId && (u.id === targetUserId || String(u.id) === String(targetUserId))) ||
              (targetUsername && u.username && u.username.toLowerCase() === targetUsername.toLowerCase());
            return isMatch ? { ...u, warningCount: newCount } : u;
          }));

          // Update ALL complaints in state belonging to this reported user's ID
          setAdminComplaints(prev => prev.map(c => {
            const isMatch = (targetUserId && (c.reportedUserId === targetUserId || String(c.reportedUserId) === String(targetUserId))) ||
              (targetUsername && c.reportedUserUsername && c.reportedUserUsername.toLowerCase() === targetUsername.toLowerCase());
            return isMatch
              ? {
                  ...c,
                  warningCount: newCount,
                  warningNumber: newCount,
                  warningLimit: data.warningLimit || 3,
                  warningStatus: newCount >= 3 ? 'LIMIT_REACHED' : 'ACTIVE',
                  warningIssued: true,
                  reportedUserWarningCount: newCount
                }
              : c;
          }));

          // Update adminSelectedComplaint if it belongs to this reported user
          if (adminSelectedComplaint) {
            const isSelectedMatch = (targetUserId && (adminSelectedComplaint.reportedUserId === targetUserId || String(adminSelectedComplaint.reportedUserId) === String(targetUserId))) ||
              (targetUsername && adminSelectedComplaint.reportedUserUsername && adminSelectedComplaint.reportedUserUsername.toLowerCase() === targetUsername.toLowerCase());
            if (isSelectedMatch) {
              setAdminSelectedComplaint(prev => prev ? {
                ...prev,
                warningCount: newCount,
                warningLimit: data.warningLimit || 3,
                warningStatus: newCount >= 3 ? 'LIMIT_REACHED' : 'ACTIVE',
                warningIssued: true,
                warningNumber: newCount,
                reportedUserWarningCount: newCount
              } : null);
            }
          }

          // Fetch fresh complaints and users from backend to guarantee persistent synchronization
          fetchAdminComplaints();
          fetchAdminUsers();
        } else {
          alert(data.error || 'Failed to issue warning.');
        }
      } catch (err) {
        console.error('Error issuing warning:', err);
        alert('Error issuing warning: ' + err.message);
      }
    } else {
      const complaints = getLocalComplaints();
      const targetUserId = complaint.reportedUserId;
      const targetUsername = complaint.reportedUserUsername;
      const currentCount = getReportedUserWarningCount(complaint);
      if (currentCount >= 3) {
        alert('Maximum warnings reached (3). Account must be deleted.');
        return;
      }
      const nextCount = currentCount + 1;
      const updatedComplaints = complaints.map(c => {
        const isMatch = (targetUserId && (c.reportedUserId === targetUserId || String(c.reportedUserId) === String(targetUserId))) ||
          (targetUsername && c.reportedUserUsername && c.reportedUserUsername.toLowerCase() === targetUsername.toLowerCase());
        if (isMatch) {
          return {
            ...c,
            warningCount: nextCount,
            warningNumber: nextCount,
            warningIssued: true,
            warningStatus: nextCount >= 3 ? 'LIMIT_REACHED' : 'ACTIVE',
            reportedUserWarningCount: nextCount
          };
        }
        return c;
      });
      saveLocalComplaints(updatedComplaints);

      const notifs = getLocalNotifications();
      const warningText = 'We has received a complaint on you on abusing others if neglected this warning you may face legal consequences';
      const warningTitle = `Admin Warning — ${nextCount}/3`;
      const existingWarningIndex = notifs.findIndex(n => n.user_id === complaint.reportedUserId && n.type === 'ADMIN_WARNING');
      if (existingWarningIndex !== -1) {
        notifs[existingWarningIndex] = {
          ...notifs[existingWarningIndex],
          title: warningTitle,
          text: warningText,
          message: warningText,
          warningNumber: nextCount,
          is_read: 0,
          created_at: new Date().toISOString()
        };
      } else {
        notifs.unshift({
          id: notifs.length + 1,
          user_id: complaint.reportedUserId,
          sender_id: 1,
          type: 'ADMIN_WARNING',
          title: warningTitle,
          text: warningText,
          message: warningText,
          warningNumber: nextCount,
          is_read: 0,
          created_at: new Date().toISOString()
        });
      }
      saveLocalNotifications(notifs);

      setAdminComplaints(prev => prev.map(c => {
        const isMatch = (targetUserId && (c.reportedUserId === targetUserId || String(c.reportedUserId) === String(targetUserId))) ||
          (targetUsername && c.reportedUserUsername && c.reportedUserUsername.toLowerCase() === targetUsername.toLowerCase());
        return isMatch ? { ...c, warningCount: nextCount, warningIssued: true, warningNumber: nextCount, reportedUserWarningCount: nextCount, warningStatus: nextCount >= 3 ? 'LIMIT_REACHED' : 'ACTIVE' } : c;
      }));
      if (adminSelectedComplaint) {
        const isSelectedMatch = (targetUserId && (adminSelectedComplaint.reportedUserId === targetUserId || String(adminSelectedComplaint.reportedUserId) === String(targetUserId))) ||
          (targetUsername && adminSelectedComplaint.reportedUserUsername && adminSelectedComplaint.reportedUserUsername.toLowerCase() === targetUsername.toLowerCase());
        if (isSelectedMatch) {
          setAdminSelectedComplaint(prev => prev ? ({ ...prev, warningCount: nextCount, warningIssued: true, warningNumber: nextCount, reportedUserWarningCount: nextCount, warningStatus: nextCount >= 3 ? 'LIMIT_REACHED' : 'ACTIVE' }) : null);
        }
      }
      alert(`Warning #${nextCount} issued successfully (${nextCount}/3).`);
    }
  };

  const [isRegistering, setIsRegistering] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [registerUsername, setRegisterUsername] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [registerAvatar, setRegisterAvatar] = useState(null);
  const [registerName, setRegisterName] = useState('');
  const [registerBio, setRegisterBio] = useState('');
  const [registerGender, setRegisterGender] = useState('');
  const [registerPhoto, setRegisterPhoto] = useState(null);
  const [registerFaceEmbedding, setRegisterFaceEmbedding] = useState(null);
  const [showRegisterCamera, setShowRegisterCamera] = useState(false);
  const [registerCameraStream, setRegisterCameraStream] = useState(null);
  const registerVideoRef = useRef(null);
  const registerCanvasRef = useRef(null);
  const [registerError, setRegisterError] = useState('');
  const [modelLoading, setModelLoading] = useState(false);
  const [cameraFeedback, setCameraFeedback] = useState('');
  const [blinkInstruction, setBlinkInstruction] = useState('Please blink once to capture your photo.');
  const blinkStateRef = useRef('waiting-open');
  const activeLoopRef = useRef(null);

  // Email & Mobile OTP states
  const [registerMobile, setRegisterMobile] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [mobileOtp, setMobileOtp] = useState('');
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [mobileOtpSent, setMobileOtpSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [mobileVerified, setMobileVerified] = useState(false);
  const [emailCooldown, setEmailCooldown] = useState(0);
  const [mobileCooldown, setMobileCooldown] = useState(0);
  const [emailOtpLoading, setEmailOtpLoading] = useState(false);
  const [mobileOtpLoading, setMobileOtpLoading] = useState(false);
  const [emailOtpMsg, setEmailOtpMsg] = useState('');
  const [mobileOtpMsg, setMobileOtpMsg] = useState('');

  // 60-second cooldown timers for OTP resend
  useEffect(() => {
    let timer = null;
    if (emailCooldown > 0) {
      timer = setTimeout(() => setEmailCooldown(c => c - 1), 1000);
    }
    return () => { if (timer) clearTimeout(timer); };
  }, [emailCooldown]);

  useEffect(() => {
    let timer = null;
    if (mobileCooldown > 0) {
      timer = setTimeout(() => setMobileCooldown(c => c - 1), 1000);
    }
    return () => { if (timer) clearTimeout(timer); };
  }, [mobileCooldown]);

  // App feed & post states
  const [feedPosts, setFeedPosts] = useState([]);
  const [newCommentText, setNewCommentText] = useState({});
  const [bookmarkedPosts, setBookmarkedPosts] = useState({});
  const [editingPostId, setEditingPostId] = useState(null);
  const [editingPostCaption, setEditingPostCaption] = useState('');

  // Profile states
  const [viewingProfile, setViewingProfile] = useState(() => sessionStorage.getItem('ig_viewing_profile') || 'tharun_sai');
  const [profileData, setProfileData] = useState(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileNameInput, setProfileNameInput] = useState('');
  const [profileBioInput, setProfileBioInput] = useState('');
  const [profileUsernameInput, setProfileUsernameInput] = useState('');
  const [profileAvatarPreview, setProfileAvatarPreview] = useState(null);
  const [storyUsers, setStoryUsers] = useState([]);

  // Inbox & Chat states
  const [inboxUsers, setInboxUsers] = useState([]);
  const [activeChatUser, setActiveChatUser] = useState(() => sessionStorage.getItem('ig_active_chat_user') || 'srinivas_bikki');
  const [selectedConversationId, setSelectedConversationId] = useState(() => {
    const val = sessionStorage.getItem('ig_selected_conversation_id');
    return val ? Number(val) : null;
  });
  const [selectedChatUserId, setSelectedChatUserId] = useState(() => {
    const val = sessionStorage.getItem('ig_selected_chat_user_id');
    return val ? Number(val) : null;
  });

  useEffect(() => {
    sessionStorage.setItem('ig_active_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    sessionStorage.setItem('ig_viewing_profile', viewingProfile);
  }, [viewingProfile]);

  useEffect(() => {
    if (activeChatUser) {
      sessionStorage.setItem('ig_active_chat_user', activeChatUser);
    } else {
      sessionStorage.removeItem('ig_active_chat_user');
    }
  }, [activeChatUser]);

  useEffect(() => {
    if (selectedConversationId !== null) {
      sessionStorage.setItem('ig_selected_conversation_id', selectedConversationId);
    } else {
      sessionStorage.removeItem('ig_selected_conversation_id');
    }
  }, [selectedConversationId]);

  useEffect(() => {
    if (selectedChatUserId !== null) {
      sessionStorage.setItem('ig_selected_chat_user_id', selectedChatUserId);
    } else {
      sessionStorage.removeItem('ig_selected_chat_user_id');
    }
  }, [selectedChatUserId]);

  const fetchUserComplaints = async () => {
    if (!USE_LIVE_BACKEND) return;
    try {
      const res = await fetch(`${API_BASE}/api/complaints`, {
        headers: getAuthHeaders()
      });
      if (res.status === 200) {
        const data = await res.json();
        setComplaints(data);
        localStorage.setItem('ig_complaints', JSON.stringify(data));
      }
    } catch (e) {
      console.error('Failed to fetch complaints:', e);
    }
  };

  const syncComplaintToDB = async (c) => {
    if (!USE_LIVE_BACKEND) return;
    if (!c || !c.id || (typeof c.id === 'string' && c.id.startsWith('draft_'))) return;
    if (c.status !== 'Submitted') return;
    try {
      await fetch(`${API_BASE}/api/complaints/${c.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          status: c.status,
          additionalDetails: c.additionalDetails,
          screenshots: c.screenshots
        })
      });
    } catch (err) {
      console.error('Failed to sync complaint:', err);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchUserComplaints();
    }
  }, [isLoggedIn]);

  const [complaints, setComplaints] = useState(() => {
    return JSON.parse(localStorage.getItem('ig_complaints') || '[]');
  });

  const handleScreenshotChange = (e, complaintId) => {
    const files = Array.from(e.target.files);
    const promises = files.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
    });
    Promise.all(promises).then(bases => {
      setComplaints(prev => {
        const updated = prev.map(c => {
          if (c.id === complaintId) {
            const updatedC = { ...c, screenshots: [...(c.screenshots || []), ...bases] };
            syncComplaintToDB(updatedC);
            return updatedC;
          }
          return c;
        });
        localStorage.setItem('ig_complaints', JSON.stringify(updated));
        return updated;
      });
    });
  };
  const [selectedComplaintId, setSelectedComplaintId] = useState(() => {
    const val = sessionStorage.getItem('ig_selected_complaint_id');
    return val ? Number(val) : null;
  });

  useEffect(() => {
    if (selectedComplaintId !== null) {
      sessionStorage.setItem('ig_selected_complaint_id', selectedComplaintId);
    } else {
      sessionStorage.removeItem('ig_selected_complaint_id');
    }
  }, [selectedComplaintId]);

  const [chatMessages, setChatMessages] = useState([]);
  const [typedMessage, setTypedMessage] = useState('');
  const [uploadedImageBase64, setUploadedImageBase64] = useState(null);
  const [isAiTyping, setIsAiTyping] = useState(false);

  // Pre-Send Abuse Detection States
  const [showAbuseWarningModal, setShowAbuseWarningModal] = useState(false);
  const [pendingMessageText, setPendingMessageText] = useState('');
  const [pendingMessagePrediction, setPendingMessagePrediction] = useState(null);

  // Image Moderation States (Part 7 & 9)
  const [isImageModerating, setIsImageModerating] = useState(false);
  const isImageSendingRef = useRef(false);
  const [showImageAbuseModal, setShowImageAbuseModal] = useState(false);
  const [imageAbuseWarningText, setImageAbuseWarningText] = useState('');
  const [imageAbuseChatUser, setImageAbuseChatUser] = useState(null);

  const handleClearAbusiveImage = () => {
    isImageSendingRef.current = false;
    setIsImageModerating(false);
    setUploadedImageBase64(null);
    setShowImageAbuseModal(false);
    setImageAbuseWarningText('');
    setImageAbuseChatUser(null);
  };

  // Complaint Submission States
  const [showComplaintSuccessModal, setShowComplaintSuccessModal] = useState(false);
  const [isSubmittingComplaint, setIsSubmittingComplaint] = useState(false);

  // Add to Abusive Dataset Feedback States
  const [showAbusiveFeedbackModal, setShowAbusiveFeedbackModal] = useState(false);
  const [feedbackTargetMessage, setFeedbackTargetMessage] = useState(null);
  const [feedbackCompleteMessage, setFeedbackCompleteMessage] = useState('');
  const [feedbackAbusiveWord, setFeedbackAbusiveWord] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');
  const [feedbackSuccess, setFeedbackSuccess] = useState('');
  const lastTouchTimeRef = useRef({});

  const handleOpenFeedbackModal = (message) => {
    if (!message || !message.text) return;
    if (message.sender_id === currentUser.id) return;
    setFeedbackTargetMessage(message);
    setFeedbackCompleteMessage(message.text || '');
    setFeedbackAbusiveWord('');
    setFeedbackError('');
    setFeedbackSuccess('');
    setShowAbusiveFeedbackModal(true);
  };

  const handleMessageTouchEnd = (e, message) => {
    if (!message || message.sender_id === currentUser.id) return;
    const now = Date.now();
    const prev = lastTouchTimeRef.current[message.id] || 0;
    if (now - prev < 350) {
      e.preventDefault();
      handleOpenFeedbackModal(message);
      lastTouchTimeRef.current[message.id] = 0;
    } else {
      lastTouchTimeRef.current[message.id] = now;
    }
  };

  const handleSubmitAbusiveFeedback = async (e) => {
    if (e) e.preventDefault();
    setFeedbackError('');
    setFeedbackSuccess('');

    const trimmedMsg = (feedbackCompleteMessage || '').trim();
    const trimmedWord = (feedbackAbusiveWord || '').trim();

    if (!trimmedMsg) {
      setFeedbackError('Complete Message cannot be empty.');
      return;
    }
    if (!trimmedWord) {
      setFeedbackError('Abusive Word / Phrase cannot be empty.');
      return;
    }

    setFeedbackSubmitting(true);
    try {
      if (USE_LIVE_BACKEND) {
        const res = await fetch(`${API_BASE}/api/abusive-feedback`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            completeMessage: trimmedMsg,
            abusiveWordOrPhrase: trimmedWord,
            originalMessageId: feedbackTargetMessage ? feedbackTargetMessage.id : null,
            originalSenderId: feedbackTargetMessage ? (feedbackTargetMessage.sender_id || feedbackTargetMessage.senderId) : null,
            originalReceiverId: feedbackTargetMessage ? (feedbackTargetMessage.receiver_id || feedbackTargetMessage.receiverId || currentUser.id) : currentUser.id
          })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setFeedbackSuccess(data.message || 'Added to abusive dataset.');
          setTimeout(() => {
            setShowAbusiveFeedbackModal(false);
            setFeedbackSuccess('');
            setFeedbackError('');
            setFeedbackTargetMessage(null);
          }, 1200);
        } else {
          setFeedbackError(data.message || data.error || 'Failed to add to dataset.');
        }
      } else {
        setFeedbackSuccess('Added to abusive dataset.');
        setTimeout(() => {
          setShowAbusiveFeedbackModal(false);
          setFeedbackSuccess('');
          setFeedbackError('');
          setFeedbackTargetMessage(null);
        }, 1200);
      }
    } catch (err) {
      setFeedbackError('Error submitting feedback: ' + err.message);
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  // States to persist typed text across different active conversations
  const [typedMessagesMap, setTypedMessagesMap] = useState({});
  const lastActiveChatUser = useRef(activeChatUser);
  const typedMessageRef = useRef(typedMessage);

  useEffect(() => {
    typedMessageRef.current = typedMessage;
  }, [typedMessage]);

  useEffect(() => {
    // 1. Save text for the previous user
    if (lastActiveChatUser.current) {
      const prevUser = lastActiveChatUser.current;
      const textToSave = typedMessageRef.current;
      setTypedMessagesMap(prev => ({
        ...prev,
        [prevUser]: textToSave
      }));
    }
    // 2. Load text for the new user
    const saved = typedMessagesMap[activeChatUser] || '';
    setTypedMessage(saved);
    typedMessageRef.current = saved;

    lastActiveChatUser.current = activeChatUser;
  }, [activeChatUser]);

  // More menu popover
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Upload Post Modal states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadType, setUploadType] = useState('image');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadContent, setUploadContent] = useState('');
  const [uploadCaption, setUploadCaption] = useState('');
  const [uploadImage, setUploadImage] = useState(null);

  // Notifications states
  const [notifications, setNotifications] = useState([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  // Auto-scroll chats
  const chatEndRef = useRef(null);
  const registerFileInputRef = useRef(null);

  // --- Local Storage Accessors (Mocks) ---
  const getLocalUsers = () => JSON.parse(localStorage.getItem('ig_users') || '[]');
  const getLocalPosts = () => JSON.parse(localStorage.getItem('ig_posts') || '[]');
  const getLocalComments = () => JSON.parse(localStorage.getItem('ig_comments') || '[]');
  const getLocalLikes = () => JSON.parse(localStorage.getItem('ig_likes') || '[]');
  const getLocalFollows = () => JSON.parse(localStorage.getItem('ig_follows') || '[]');
  const getLocalMessages = () => JSON.parse(localStorage.getItem('ig_messages') || '[]');
  const getLocalNotifications = () => JSON.parse(localStorage.getItem('ig_notifications') || '[]');

  const saveLocalUsers = (users) => localStorage.setItem('ig_users', JSON.stringify(users));
  const saveLocalPosts = (posts) => localStorage.setItem('ig_posts', JSON.stringify(posts));
  const saveLocalComments = (comments) => localStorage.setItem('ig_comments', JSON.stringify(comments));
  const saveLocalLikes = (likes) => localStorage.setItem('ig_likes', JSON.stringify(likes));
  const saveLocalFollows = (follows) => localStorage.setItem('ig_follows', JSON.stringify(follows));
  const saveLocalMessages = (messages) => localStorage.setItem('ig_messages', JSON.stringify(messages));
  const saveLocalNotifications = (notifications) => localStorage.setItem('ig_notifications', JSON.stringify(notifications));

  // --- Helper Authorization Header ---
  const getAuthHeaders = () => {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwtToken}`
    };
  };

  // --- API / Local Storage Unified Fetch Handles ---

  const fetchFeed = async () => {
    if (USE_LIVE_BACKEND) {
      try {
        const res = await fetch(`${API_BASE}/api/posts`, { headers: getAuthHeaders() });
        const data = await res.json();
        if (Array.isArray(data)) setFeedPosts(data);
      } catch (err) {
        console.error('Error fetching feed posts:', err);
      }
    } else {
      const allPosts = getLocalPosts();
      const users = getLocalUsers();
      const likes = getLocalLikes();
      const comments = getLocalComments();
      const follows = getLocalFollows();
      const followedIds = follows
        .filter(f => f.follower_id === currentUser.id)
        .map(f => f.following_id);
      const posts = allPosts.filter(p => p.user_id === currentUser.id || followedIds.includes(p.user_id));

      const enriched = posts.map(post => {
        const author = users.find(u => u.id === post.user_id) || {};
        const likesCount = likes.filter(l => l.post_id === post.id).length;
        const isLiked = likes.some(l => l.post_id === post.id && l.user_id === currentUser.id);
        const postComments = comments
          .filter(c => c.post_id === post.id)
          .map(c => {
            const commenter = users.find(u => u.id === c.user_id) || {};
            return {
              ...c,
              username: commenter.username || 'anonymous'
            };
          });

        return {
          ...post,
          username: author.username || 'unknown',
          user_avatar: author.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
          user_name: author.name || 'Unknown',
          likesCount,
          isLiked,
          comments: postComments
        };
      });

      enriched.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setFeedPosts(enriched);
    }
  };

  const fetchStories = async () => {
    if (!currentUser) return;
    if (USE_LIVE_BACKEND) {
      try {
        const res = await fetch(`${API_BASE}/api/stories`, { headers: getAuthHeaders() });
        const data = await res.json();
        if (Array.isArray(data)) setStoryUsers(data);
      } catch (err) {
        console.error('Error fetching stories:', err);
      }
    } else {
      const follows = getLocalFollows();
      const users = getLocalUsers();
      const followedIds = follows
        .filter(f => f.follower_id === currentUser.id)
        .map(f => f.following_id);
      const filtered = users.filter(u => followedIds.includes(u.id));
      setStoryUsers(filtered);
    }
  };

  const fetchProfile = async (username) => {
    if (USE_LIVE_BACKEND) {
      try {
        const res = await fetch(`${API_BASE}/api/users/${username}`, { headers: getAuthHeaders() });
        const data = await res.json();
        if (data && !data.error) {
          setProfileData(data);
          setProfileNameInput(data.name);
          setProfileBioInput(data.bio || '');
          setProfileUsernameInput(data.username);
          setProfileAvatarPreview(data.avatar);
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      }
    } else {
      const users = getLocalUsers();
      const posts = getLocalPosts();
      const follows = getLocalFollows();

      const user = users.find(u => u.username === username.toLowerCase());
      if (!user) return;

      const userPosts = posts.filter(p => p.user_id === user.id);
      userPosts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      const followersCount = follows.filter(f => f.following_id === user.id).length;
      const followingCount = follows.filter(f => f.follower_id === user.id).length;
      const isFollowing = follows.some(f => f.follower_id === currentUser.id && f.following_id === user.id);

      setProfileData({
        id: user.id,
        username: user.username,
        name: user.name,
        bio: user.bio,
        avatar: user.avatar,
        postsCount: userPosts.length,
        followersCount,
        followingCount,
        isFollowing,
        posts: userPosts
      });
      setProfileNameInput(user.name);
      setProfileBioInput(user.bio || '');
      setProfileUsernameInput(user.username);
      setProfileAvatarPreview(user.avatar);
    }
  };

  const fetchInbox = async () => {
    if (!currentUser) return;
    if (USE_LIVE_BACKEND) {
      try {
        const res = await fetch(`${API_BASE}/api/chats`, { headers: getAuthHeaders() });
        const data = await res.json();
        if (Array.isArray(data)) setInboxUsers(data);
      } catch (err) {
        console.error('Error fetching chat inbox:', err);
      }
    } else {
      const allUsers = getLocalUsers().filter(u => u.id !== currentUser.id);
      const messages = getLocalMessages();

      const partnerIds = messages
        .filter(m => m.sender_id === currentUser.id || m.receiver_id === currentUser.id)
        .reduce((acc, m) => {
          if (m.sender_id !== currentUser.id) acc.add(m.sender_id);
          if (m.receiver_id !== currentUser.id) acc.add(m.receiver_id);
          return acc;
        }, new Set());

      const users = allUsers.filter(u => partnerIds.has(u.id));

      const chatList = users.map(u => {
        const thread = messages.filter(m =>
          (m.sender_id === currentUser.id && m.receiver_id === u.id) ||
          (m.sender_id === u.id && m.receiver_id === currentUser.id)
        );

        let lastMsg = null;
        if (thread.length > 0) {
          thread.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
          lastMsg = thread[thread.length - 1];
        }

        const partnerUnreadCount = messages.filter(m =>
          m.sender_id === u.id &&
          m.receiver_id === currentUser.id &&
          m.status === 'sent'
        ).length;

        return {
          id: u.id,
          username: u.username,
          name: u.name,
          avatar: u.avatar,
          unreadCount: partnerUnreadCount,
          lastMessage: lastMsg ? {
            text: lastMsg.text,
            image: lastMsg.image,
            senderId: lastMsg.sender_id,
            created_at: lastMsg.created_at
          } : null
        };
      });

      chatList.sort((a, b) => {
        const aTime = a.lastMessage ? new Date(a.lastMessage.created_at).getTime() : 0;
        const bTime = b.lastMessage ? new Date(b.lastMessage.created_at).getTime() : 0;
        return bTime - aTime;
      });

      setInboxUsers(chatList);
    }
  };

  const fetchChatThread = async (username, isRefresh = false) => {
    if (!currentUser) return;

    if (!isRefresh) {
      // Clear old data immediately to prevent cached display of previous chats
      setChatMessages([]);
      setSelectedConversationId(null);
      setSelectedChatUserId(null);
    }

    if (USE_LIVE_BACKEND) {
      try {
        const res = await fetch(`${API_BASE}/api/chats/${username}`, { headers: getAuthHeaders() });
        const data = await res.json();
        if (data) {
          setSelectedConversationId(data.conversationId || null);
          setSelectedChatUserId(data.targetUserId || null);
          if (Array.isArray(data.messages)) {
            setChatMessages(data.messages);
          }
          fetchInbox();
        }
      } catch (err) {
        console.error('Error loading chat messages:', err);
      }
    } else {
      const users = getLocalUsers();
      const target = users.find(u => u.username === username.toLowerCase());
      if (!target) return;

      setSelectedChatUserId(target.id);
      const conversationId = Math.min(currentUser.id, target.id) * 1000 + Math.max(currentUser.id, target.id);
      setSelectedConversationId(conversationId);

      const messages = getLocalMessages().filter(m =>
        (m.sender_id === currentUser.id && m.receiver_id === target.id) ||
        (m.sender_id === target.id && m.receiver_id === currentUser.id)
      );
      messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      setChatMessages(messages);

      // Mark mockup messages from partner as read
      const allMessages = getLocalMessages();
      let msgChanged = false;
      allMessages.forEach(m => {
        if (m.sender_id === target.id && m.receiver_id === currentUser.id && m.status !== 'read') {
          m.status = 'read';
          msgChanged = true;
        }
      });
      if (msgChanged) {
        saveLocalMessages(allMessages);
      }

      // Mark temporary notifications from this user as read
      const notifications = getLocalNotifications();
      let changed = false;
      notifications.forEach(n => {
        if (n.user_id === currentUser.id && n.sender_id === target.id && n.type === 'message' && n.is_read === 0) {
          n.is_read = 1;
          n.readStatus = 1;
          changed = true;
        }
      });
      if (changed) {
        saveLocalNotifications(notifications);
        fetchNotifications();
      }

      // Refresh inbox list and unread counts immediately
      fetchInbox();
    }
  };

  const fetchNotifications = async () => {
    if (!currentUser) return;
    if (USE_LIVE_BACKEND) {
      try {
        const res = await fetch(`${API_BASE}/api/notifications`, { headers: getAuthHeaders() });
        const data = await res.json();
        if (data && Array.isArray(data.notifications)) {
          let seenAdminWarning = false;
          const deduped = [];
          for (const n of data.notifications) {
            if (n.type === 'ADMIN_WARNING') {
              if (!seenAdminWarning) {
                seenAdminWarning = true;
                deduped.push(n);
              }
            } else {
              deduped.push(n);
            }
          }
          setNotifications(deduped);
          setUnreadNotificationsCount(data.unreadCount !== undefined ? data.unreadCount : deduped.filter(n => n.is_read === 0).length);
        }
      } catch (err) {
        console.error('Error fetching notifications list:', err);
      }
    } else {
      const allNotifs = getLocalNotifications();
      const users = getLocalUsers();
      const messages = getLocalMessages();
      const allowedTypes = ['like', 'follow', 'AI_FLAGGED_MESSAGE', 'ai_flagged', 'REPORT_SUBMITTED', 'MESSAGE_REPORTED', 'AI_MESSAGE_ALLOWED', 'ADMIN_WARNING'];
      const filtered = allNotifs
        .filter(n => n.user_id === currentUser.id && allowedTypes.includes(n.type))
        .map(n => {
          const sender = users.find(u => u.id === n.sender_id) || {};
          const msg = messages.find(m => m.id === n.message_id) || {};
          return {
            ...n,
            sender_username: sender.username || 'unknown',
            sender_avatar: sender.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
            receiverDecision: msg.receiverDecision || null,
            messageSenderId: msg.sender_id || null
          };
        });
      filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      let seenAdminWarningLocal = false;
      const dedupedLocal = [];
      for (const n of filtered) {
        if (n.type === 'ADMIN_WARNING') {
          if (!seenAdminWarningLocal) {
            seenAdminWarningLocal = true;
            dedupedLocal.push(n);
          }
        } else {
          dedupedLocal.push(n);
        }
      }

      const unreadCount = dedupedLocal.filter(n => n.is_read === 0).length;

      setNotifications(dedupedLocal);
      setUnreadNotificationsCount(unreadCount);
    }
  };

  const markNotificationsAsRead = async () => {
    if (!currentUser) return;
    if (USE_LIVE_BACKEND) {
      try {
        await fetch(`${API_BASE}/api/notifications/read`, {
          method: 'POST',
          headers: getAuthHeaders()
        });
        setUnreadNotificationsCount(0);
      } catch (err) {
        console.error('Error marking notifications as read:', err);
      }
    } else {
      const allNotifs = getLocalNotifications();
      const filtered = allNotifs.filter(n =>
        !(n.user_id === currentUser.id && ['message', 'follow', 'like', 'comment'].includes(n.type))
      );
      const updated = filtered.map(n => {
        if (n.user_id === currentUser.id) {
          return { ...n, is_read: 1 };
        }
        return n;
      });
      saveLocalNotifications(updated);
      setUnreadNotificationsCount(0);
      fetchNotifications();
    }
  };

  const searchProfiles = async (query) => {
    if (USE_LIVE_BACKEND) {
      try {
        const res = await fetch(`${API_BASE}/api/search?query=${query}`, { headers: getAuthHeaders() });
        const data = await res.json();
        if (Array.isArray(data)) setSearchResults(data);
      } catch (err) {
        console.error('Error searching profiles:', err);
      }
    } else {
      const users = getLocalUsers();
      if (!query || !query.trim()) {
        setSearchResults([]);
        return;
      }
      const filtered = users.filter(u =>
        u.username.toLowerCase().includes(query.toLowerCase()) ||
        u.name.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(filtered);
    }
  };

  const fetchSuggestions = async () => {
    if (USE_LIVE_BACKEND) {
      try {
        const res = await fetch(`${API_BASE}/api/suggestions`, { headers: getAuthHeaders() });
        const data = await res.json();
        if (Array.isArray(data)) setSuggestions(data);
      } catch (err) {
        console.error('Error loading suggestions:', err);
      }
    } else {
      const users = getLocalUsers();
      const follows = getLocalFollows();

      // Filter out self and users already followed
      const unjoined = users.filter(u =>
        u.id !== currentUser.id &&
        !follows.some(f => f.follower_id === currentUser.id && f.following_id === u.id)
      );

      // Take a random 3 if available
      const randomThree = unjoined.sort(() => 0.5 - Math.random()).slice(0, 3);
      setSuggestions(randomThree);
    }
  };

  // --- Initial Data Load Hook ---
  useEffect(() => {
    if (isLoggedIn && currentUser) {
      fetchFeed();
      fetchInbox();
      fetchNotifications();
      fetchSuggestions();
      fetchStories();
      searchProfiles('');
    }
  }, [isLoggedIn, currentUser]);

  // Refetch chats on selection
  useEffect(() => {
    if (activeTab === 'messages' && activeChatUser) {
      fetchChatThread(activeChatUser);
    }
  }, [activeTab, activeChatUser]);

  // Refetch profile on selection
  useEffect(() => {
    if (activeTab === 'profile' && viewingProfile) {
      fetchProfile(viewingProfile);
    }
  }, [activeTab, viewingProfile]);

  // Search input query trigger
  useEffect(() => {
    if (activeTab === 'search') {
      searchProfiles(searchQuery);
    }
  }, [activeTab, searchQuery]);

  // Background polling for messages, inbox reloads, notifications count, and feed updates every 3 seconds
  useEffect(() => {
    if (!isLoggedIn || !currentUser) return;

    const interval = setInterval(() => {
      // 1. Inbox & active chat updates (Unconditionally poll inbox to update unread badges globally)
      fetchInbox();
      if (activeTab === 'messages' && activeChatUser) {
        fetchChatThread(activeChatUser, true);
      }
      // 2. Feed updates
      if (activeTab === 'home') {
        fetchFeed();
      }
      // 3. Notifications count & list updates
      if (activeTab === 'notifications') {
        fetchNotifications();
      } else {
        // Just poll the count in background
        if (USE_LIVE_BACKEND) {
          fetch(`${API_BASE}/api/notifications`, { headers: getAuthHeaders() })
            .then(res => res.json())
            .then(data => {
              if (data && typeof data.unreadCount === 'number') {
                setUnreadNotificationsCount(data.unreadCount);
              }
            })
            .catch(() => { });
        } else {
          const allNotifs = getLocalNotifications();
          const allowedTypes = ['like', 'follow', 'AI_FLAGGED_MESSAGE', 'ai_flagged', 'REPORT_SUBMITTED', 'MESSAGE_REPORTED', 'AI_MESSAGE_ALLOWED', 'ADMIN_WARNING'];
          const unreadCount = allNotifs.filter(n => n.user_id === currentUser.id && n.is_read === 0 && allowedTypes.includes(n.type)).length;
          setUnreadNotificationsCount(unreadCount);
        }
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isLoggedIn, currentUser, activeTab, activeChatUser]);

  // Scroll chat messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isAiTyping]);

  // Socket.IO real-time message receiver hook
  useEffect(() => {
    if (isLoggedIn && currentUser && USE_LIVE_BACKEND) {
      const socketUrl = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : window.location.origin);
      const socket = io(socketUrl, {
        auth: {
          token: jwtToken || sessionStorage.getItem('ig_jwt_token')
        }
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('Connected to real-time chat socket server');
      });

      socket.on('receive_message', (msg) => {
        // Refresh inbox users automatically
        fetchInbox();

        // If we are currently in the chat screen with the sender, append it
        if (activeTab === 'messages' && (selectedChatUserId || activeChatUser)) {
          const isMatch = selectedChatUserId
            ? (msg.sender_id === selectedChatUserId || msg.receiver_id === selectedChatUserId)
            : (msg.sender_username === activeChatUser || msg.receiver_username === activeChatUser);

          if (isMatch) {
            setChatMessages(prev => {
              if (prev.some(m => m.id === msg.id)) return prev;
              return [...prev, msg];
            });

            // Mark it as read immediately since conversation is open
            fetch(`${API_BASE}/api/chats/${activeChatUser}`, { headers: getAuthHeaders() }).catch(() => { });
          }
        }
      });

      socket.on('message_read', ({ senderId, receiverId }) => {
        if (activeTab === 'messages' && activeChatUser) {
          setChatMessages(prev =>
            prev.map(m => m.sender_id === currentUser.id ? { ...m, status: 'read' } : m)
          );
        }
      });

      socket.on('messageStatusUpdated', ({ messageId, receiverDecision, status }) => {
        if (activeTab === 'messages' && activeChatUser) {
          setChatMessages(prev =>
            prev.map(m => m.id === messageId ? { ...m, receiverDecision, status } : m)
          );
        }
        fetchNotifications();
        fetchInbox();
      });

      socket.on('notificationCreated', (newNotif) => {
        const allowedTypes = ['like', 'follow', 'AI_FLAGGED_MESSAGE', 'ai_flagged', 'REPORT_SUBMITTED', 'MESSAGE_REPORTED', 'AI_MESSAGE_ALLOWED', 'ADMIN_WARNING'];
        if (!allowedTypes.includes(newNotif.type)) return;

        setNotifications(prev => {
          if (newNotif.type === 'ADMIN_WARNING') {
            const idx = prev.findIndex(n => n.type === 'ADMIN_WARNING' || n.id === newNotif.id);
            if (idx !== -1) {
              const updated = [...prev];
              updated[idx] = newNotif;
              return updated;
            }
            return [newNotif, ...prev];
          }
          if (prev.some(n => n.id === newNotif.id)) return prev;
          return [newNotif, ...prev];
        });
        if (newNotif.is_read === 0) {
          setUnreadNotificationsCount(prev => prev + 1);
        }
      });

      socket.on('unread_notifications', (count) => {
        setUnreadNotificationsCount(count);
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [isLoggedIn, currentUser, activeTab, activeChatUser, jwtToken]);

  // --- Interaction Handles ---

  const pushTabHistory = (nextTab) => {
    setTabHistory(prev => {
      if (prev[prev.length - 1] === nextTab) return prev;
      return [...prev, nextTab];
    });
  };

  const handleTabClick = (tab) => {
    pushTabHistory(tab);
    setActiveTab(tab);
    setShowMoreMenu(false);
    if (tab === 'home') fetchFeed();
    if (tab === 'messages') fetchInbox();
    if (tab === 'notifications') {
      fetchNotifications();
      markNotificationsAsRead();
    }
  };

  const handleProfileView = (username) => {
    pushTabHistory('profile');
    setViewingProfile(username);
    fetchProfile(username);
    setActiveTab('profile');
  };

  const handleBack = () => {
    setTabHistory(prev => {
      if (prev.length <= 1) {
        setActiveTab('home');
        return ['home'];
      }
      const newHistory = [...prev];
      newHistory.pop();
      const lastTab = newHistory[newHistory.length - 1];
      setActiveTab(lastTab);
      return newHistory;
    });
  };

  // Auth Operations
  const handleLogin = async (e) => {
    e.preventDefault();
    if (USE_LIVE_BACKEND) {
      try {
        const res = await fetch(`${API_BASE}/api/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: loginUsername, password: loginPassword, rememberMe })
        });
        const data = await res.json();
        if (data.error) {
          setLoginError(data.error);
        } else {
          setJwtToken(data.token);
          setCurrentUser(data.user);
          setIsLoggedIn(true);

          sessionStorage.setItem('ig_jwt_token', data.token);
          sessionStorage.setItem('ig_current_user', JSON.stringify(data.user));

          setLoginError('');
          setLoginUsername('');
          setLoginPassword('');
          setActiveTab('home');
        }
      } catch (err) {
        setLoginError('Error establishing login session.');
      }
    } else {
      const users = getLocalUsers();
      const user = users.find(u => u.username === loginUsername.toLowerCase() && u.password === loginPassword);
      if (!user) {
        setLoginError('Invalid username or password.');
        return;
      }
      setCurrentUser(user);
      setIsLoggedIn(true);

      sessionStorage.setItem('ig_current_user', JSON.stringify(user));

      setLoginError('');
      setLoginUsername('');
      setLoginPassword('');
      setActiveTab('home');
    }
  };

  const startRegisterCamera = async () => {
    if (activeLoopRef.current) {
      cancelAnimationFrame(activeLoopRef.current);
      activeLoopRef.current = null;
    }
    if (registerCameraStream) {
      registerCameraStream.getTracks().forEach(track => track.stop());
      setRegisterCameraStream(null);
    }

    try {
      setRegisterError('');
      setCameraFeedback('');
      setBlinkInstruction('Please blink once to capture your photo.');
      blinkStateRef.current = 'waiting-open';

      setShowRegisterCamera(true);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: "user" },
        audio: false
      });

      setRegisterCameraStream(stream);

      const video = registerVideoRef.current;
      if (!video) {
        throw new Error("Video element is not available");
      }

      video.srcObject = stream;
      video.muted = true;
      video.autoplay = true;
      video.playsInline = true;

      video.onloadedmetadata = async () => {
        try {
          await video.play();
        } catch (error) {
          console.error("Video playback failed:", error);
        }
      };

      if (video.readyState >= 1) {
        try {
          await video.play();
        } catch (error) {
          console.error("Video play failed:", error);
        }
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setRegisterError("Camera access is required to complete account creation.");
      } else {
        setRegisterError("Could not access camera. Please verify device permissions.");
      }
      setShowRegisterCamera(false);
    }
  };

  const stopRegisterCamera = () => {
    if (activeLoopRef.current) {
      cancelAnimationFrame(activeLoopRef.current);
      activeLoopRef.current = null;
    }
    if (registerCameraStream) {
      registerCameraStream.getTracks().forEach(track => track.stop());
      setRegisterCameraStream(null);
    }
    setShowRegisterCamera(false);
    setCameraFeedback("");
    setBlinkInstruction("Please blink once to capture your photo.");
  };

  const captureRegisterPhoto = (landmarks = null) => {
    if (registerVideoRef.current && registerCanvasRef.current) {
      const video = registerVideoRef.current;
      const canvas = registerCanvasRef.current;
      const context = canvas.getContext('2d');
      canvas.width = video.videoWidth || 320;
      canvas.height = video.videoHeight || 240;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg');
      setRegisterPhoto(dataUrl);

      if (landmarks) {
        const nose = landmarks[4];
        const leftEye = landmarks[33];
        const rightEye = landmarks[263];
        if (nose && leftEye && rightEye) {
          const eyeDist = Math.hypot(leftEye.x - rightEye.x, leftEye.y - rightEye.y, leftEye.z - rightEye.z);
          if (eyeDist > 0) {
            const embedding = [];
            for (let i = 0; i < landmarks.length; i++) {
              const pt = landmarks[i];
              const dx = (pt.x - nose.x) / eyeDist;
              const dy = (pt.y - nose.y) / eyeDist;
              const dz = (pt.z - nose.z) / eyeDist;
              embedding.push(parseFloat(dx.toFixed(5)), parseFloat(dy.toFixed(5)), parseFloat(dz.toFixed(5)));
            }
            setRegisterFaceEmbedding(embedding);
          }
        }
      }
      stopRegisterCamera();
    }
  };

  const runDetectionLoop = async (landmarker, videoEl) => {
    if (!videoEl || videoEl.paused || videoEl.ended) return;

    let lastVideoTime = -1;

    const detectFrame = async () => {
      if (!videoEl || videoEl.paused || videoEl.ended) {
        activeLoopRef.current = null;
        return;
      }

      if (videoEl.currentTime !== lastVideoTime) {
        lastVideoTime = videoEl.currentTime;
        try {
          const results = landmarker.detectForVideo(videoEl, performance.now());
          if (results && results.faceLandmarks) {
            const numFaces = results.faceLandmarks.length;
            if (numFaces === 0) {
              setCameraFeedback("Please position your face clearly in front of the camera.");
              blinkStateRef.current = 'waiting-open';
            } else if (numFaces > 1) {
              setCameraFeedback("Only one person should be visible in the camera.");
              blinkStateRef.current = 'waiting-open';
            } else {
              setCameraFeedback("");
              const landmarks = results.faceLandmarks[0];

              const calculateEAR = (top, bottom, left, right) => {
                const vertical = Math.hypot(top.x - bottom.x, top.y - bottom.y);
                const horizontal = Math.hypot(left.x - right.x, left.y - right.y);
                return vertical / horizontal;
              };

              const leftEAR = calculateEAR(landmarks[159], landmarks[145], landmarks[33], landmarks[133]);
              const rightEAR = calculateEAR(landmarks[386], landmarks[374], landmarks[362], landmarks[263]);
              const ear = (leftEAR + rightEAR) / 2;

              if (blinkStateRef.current === 'waiting-open') {
                if (ear > 0.20) {
                  blinkStateRef.current = 'waiting-closed';
                  setBlinkInstruction("Please blink once to capture your photo.");
                } else {
                  setBlinkInstruction("Please blink once while looking at the camera.");
                }
              } else if (blinkStateRef.current === 'waiting-closed') {
                if (ear < 0.12) {
                  blinkStateRef.current = 'waiting-open-again';
                }
              } else if (blinkStateRef.current === 'waiting-open-again') {
                if (ear > 0.20) {
                  blinkStateRef.current = 'confirmed';
                  setBlinkInstruction("Blink detected! Capturing...");
                  captureRegisterPhoto(landmarks);
                  return; // Stop animation loop
                }
              }
            }
          }
        } catch (err) {
          console.error("Landmarker detection error:", err);
        }
      }
      activeLoopRef.current = requestAnimationFrame(detectFrame);
    };

    activeLoopRef.current = requestAnimationFrame(detectFrame);
  };

  const handleVideoPlay = (e) => {
    const video = e.target;
    const checkReady = () => {
      if (!registerCameraStream || !showRegisterCamera) return;

      if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
        setModelLoading(true);
        loadFaceLandmarkerHelper()
          .then((landmarker) => {
            setModelLoading(false);
            runDetectionLoop(landmarker, video);
          })
          .catch((err) => {
            console.error("Model loading error:", err);
            setModelLoading(false);
          });
      } else {
        setTimeout(checkReady, 100);
      }
    };
    checkReady();
  };

  useEffect(() => {
    if (showRegisterCamera && registerCameraStream && registerVideoRef.current) {
      registerVideoRef.current.srcObject = registerCameraStream;
    }
  }, [showRegisterCamera, registerCameraStream]);

  useEffect(() => {
    return () => {
      if (activeLoopRef.current) {
        cancelAnimationFrame(activeLoopRef.current);
      }
      if (registerCameraStream) {
        registerCameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [registerCameraStream]);

  const handleSendEmailOtp = async () => {
    if (!registerEmail.trim()) {
      setRegisterError('Please enter an email address first.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(registerEmail.trim())) {
      setRegisterError('Please enter a valid email address.');
      return;
    }
    setEmailOtpLoading(true);
    setRegisterError('');
    setEmailOtpMsg('');
    try {
      const res = await fetch(`${API_BASE}/api/auth/send-email-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: registerEmail.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        setRegisterError(data.error || 'Failed to send email verification code.');
        if (data.retryAfter) {
          setEmailCooldown(data.retryAfter);
        }
      } else {
        setEmailOtpSent(true);
        setEmailCooldown(60);
        setEmailOtpMsg('Verification code sent to your email.');
      }
    } catch (err) {
      setRegisterError('Error contacting authentication service.');
    } finally {
      setEmailOtpLoading(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    if (!emailOtp.trim() || !/^\d{6}$/.test(emailOtp.trim())) {
      setRegisterError('Please enter the 6-digit code sent to your email.');
      return;
    }
    setEmailOtpLoading(true);
    setRegisterError('');
    setEmailOtpMsg('');
    try {
      const res = await fetch(`${API_BASE}/api/auth/verify-email-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: registerEmail.trim(), otp: emailOtp.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        setRegisterError(data.error || 'Invalid email verification code.');
      } else {
        setEmailVerified(true);
        setEmailOtpSent(false);
        setEmailOtp('');
        setEmailOtpMsg('');
        setRegisterError('');
      }
    } catch (err) {
      setRegisterError('Error verifying email OTP.');
    } finally {
      setEmailOtpLoading(false);
    }
  };

  const formatIndianPhoneNumber = (phone) => {
    if (!phone) return '';
    const clean = phone.trim().replace(/[\s\-()]/g, '');
    if (clean.startsWith('+')) {
      return clean;
    }
    if (clean.startsWith('0')) {
      return `+91${clean.substring(1)}`;
    }
    if (clean.length === 12 && clean.startsWith('91')) {
      return `+${clean}`;
    }
    if (clean.length === 10) {
      return `+91${clean}`;
    }
    return `+91${clean}`;
  };

  const handleSendMobileOtp = async () => {
    if (!registerMobile.trim()) {
      setRegisterError('Please enter a mobile number first.');
      return;
    }
    const formattedPhone = formatIndianPhoneNumber(registerMobile);
    if (!/^\+91[0-9]{10}$/.test(formattedPhone)) {
      setRegisterError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    setMobileOtpLoading(true);
    setRegisterError('');
    setMobileOtpMsg('');

    try {
      const res = await fetch(`${API_BASE}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: formattedPhone })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setRegisterError(data.message || 'Failed to send mobile verification code.');
        if (data.retryAfter) {
          setMobileCooldown(data.retryAfter);
        }
      } else {
        setMobileOtpSent(true);
        setMobileCooldown(60);
        setMobileOtpMsg('OTP sent to your mobile number via SMS.');
      }
    } catch (err) {
      setRegisterError('Error contacting verification service.');
    } finally {
      setMobileOtpLoading(false);
    }
  };

  const handleVerifyMobileOtp = async () => {
    if (!mobileOtp.trim() || !/^\d{6}$/.test(mobileOtp.trim())) {
      setRegisterError('Please enter the 6-digit code sent to your mobile.');
      return;
    }

    const formattedPhone = formatIndianPhoneNumber(registerMobile);
    setMobileOtpLoading(true);
    setRegisterError('');
    setMobileOtpMsg('');

    try {
      const res = await fetch(`${API_BASE}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile: formattedPhone,
          otp: mobileOtp.trim()
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.verified) {
        setRegisterError(data.message || 'Invalid or expired OTP');
      } else {
        setMobileVerified(true);
        setMobileOtpSent(false);
        setMobileOtp('');
        setMobileOtpMsg('Mobile number verified successfully ✓');
        setRegisterError('');
      }
    } catch (err) {
      setRegisterError('Invalid or expired OTP');
    } finally {
      setMobileOtpLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    // Validations
    if (!registerName.trim() || !registerUsername.trim() || !registerEmail.trim() || !registerPassword || !registerConfirmPassword) {
      setRegisterError('All fields are required.');
      return;
    }

    if (!registerGender) {
      setRegisterError('Gender selection is required.');
      return;
    }

    if (!registerPhoto) {
      setRegisterError('Please complete the camera verification by blinking once.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(registerEmail.trim())) {
      setRegisterError('Please enter a valid email address.');
      return;
    }

    if (registerPassword !== registerConfirmPassword) {
      setRegisterError('Passwords do not match.');
      return;
    }

    if (registerPassword.length < 6) {
      setRegisterError('Password must be at least 6 characters long.');
      return;
    }

    // Require letters and numbers
    const hasLetter = /[a-zA-Z]/.test(registerPassword);
    const hasNumber = /[0-9]/.test(registerPassword);
    if (!hasLetter || !hasNumber) {
      setRegisterError('Password must contain both letters and numbers.');
      return;
    }

    // Strict Mobile OTP check
    if (!mobileVerified) {
      setRegisterError('Please verify your mobile number with OTP.');
      return;
    }

    if (USE_LIVE_BACKEND) {
      try {
        const res = await fetch(`${API_BASE}/api/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: registerUsername,
            email: registerEmail,
            mobile: formatIndianPhoneNumber(registerMobile),
            password: registerPassword,
            name: registerName,
            bio: registerBio,
            avatar: registerAvatar,
            gender: registerGender,
            registrationPhoto: registerPhoto,
            faceEmbedding: registerFaceEmbedding ? JSON.stringify(registerFaceEmbedding) : null
          })
        });
        const data = await res.json();
        if (data.error) {
          setRegisterError(data.error);
        } else {
          // Auto-login
          try {
            const loginRes = await fetch(`${API_BASE}/api/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username: registerUsername, password: registerPassword, rememberMe: true })
            });
            const loginData = await loginRes.json();
            if (loginData.success) {
              setJwtToken(loginData.token);
              sessionStorage.setItem('ig_jwt_token', loginData.token);
              setCurrentUser(loginData.user);
              sessionStorage.setItem('ig_current_user', JSON.stringify(loginData.user));
              setIsLoggedIn(true);

              // Clear fields
              setRegisterUsername('');
              setRegisterEmail('');
              setRegisterMobile('');
              setEmailOtp('');
              setMobileOtp('');
              setEmailVerified(false);
              setMobileVerified(false);
              setEmailOtpSent(false);
              setMobileOtpSent(false);
              setEmailOtpMsg('');
              setMobileOtpMsg('');
              setRegisterPassword('');
              setRegisterConfirmPassword('');
              setRegisterAvatar(null);
              setRegisterName('');
              setRegisterBio('');
              setRegisterGender('');
              setRegisterPhoto(null);
              setRegisterFaceEmbedding(null);
              setRegisterError('');
            } else {
              setRegisterError('Registration successful! Please login manually.');
            }
          } catch (e) {
            setRegisterError('Registration successful! Please login manually.');
          }
        }
      } catch (err) {
        setRegisterError('Error establishing registration portal.');
      }
    } else {
      const users = getLocalUsers();
      const normUsername = registerUsername.trim().toLowerCase();
      const normEmail = registerEmail.trim().toLowerCase();

      const existing = users.find(u => u.username === normUsername || (u.email && u.email.trim().toLowerCase() === normEmail));
      if (existing) {
        setRegisterError('Username or email already exists.');
        return;
      }
      const newId = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;
      const newUser = {
        id: newId,
        username: normUsername,
        email: normEmail,
        password: registerPassword,
        name: registerName,
        bio: registerBio,
        avatar: registerAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        gender: registerGender,
        registrationPhoto: registerPhoto
      };
      users.push(newUser);
      saveLocalUsers(users);

      // Auto-login locally
      setCurrentUser(newUser);
      sessionStorage.setItem('ig_current_user', JSON.stringify(newUser));
      setIsLoggedIn(true);

      setRegisterUsername('');
      setRegisterEmail('');
      setRegisterPassword('');
      setRegisterConfirmPassword('');
      setRegisterAvatar(null);
      setRegisterName('');
      setRegisterBio('');
      setRegisterGender('');
      setRegisterPhoto(null);
      setRegisterError('');
    }
  };

  const handleLogout = () => {
    setJwtToken('');
    setCurrentUser(null);
    setIsLoggedIn(false);
    setShowMoreMenu(false);
    sessionStorage.removeItem('ig_jwt_token');
    sessionStorage.removeItem('ig_current_user');
    sessionStorage.removeItem('ig_active_tab');
    sessionStorage.removeItem('ig_viewing_profile');
    sessionStorage.removeItem('ig_active_chat_user');
    sessionStorage.removeItem('ig_selected_conversation_id');
    sessionStorage.removeItem('ig_selected_chat_user_id');
    sessionStorage.removeItem('ig_selected_complaint_id');
    setActiveTab('home');
  };

  // Avatar Image upload helper
  const handleAvatarSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfileAvatarPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    if (!currentUser) return;
    if (USE_LIVE_BACKEND) {
      try {
        const res = await fetch(`${API_BASE}/api/users/profile`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            name: profileNameInput,
            bio: profileBioInput,
            avatar: profileAvatarPreview,
            username: profileUsernameInput
          })
        });
        const data = await res.json();
        if (data.error) {
          alert(data.error);
          return;
        }
        if (data.success) {
          // If username changed, update token in session
          if (data.token) {
            setJwtToken(data.token);
            sessionStorage.setItem('ig_jwt_token', data.token);
          }
          const updatedUser = {
            ...currentUser,
            username: data.user.username,
            name: data.user.name,
            bio: data.user.bio,
            avatar: data.user.avatar
          };
          setCurrentUser(updatedUser);
          sessionStorage.setItem('ig_current_user', JSON.stringify(updatedUser));
          setViewingProfile(data.user.username);
          setIsEditingProfile(false);
          fetchProfile(data.user.username);
        }
      } catch (err) {
        console.error('Error saving profile modifications:', err);
      }
    } else {
      const users = getLocalUsers();
      const normUsername = profileUsernameInput.trim().toLowerCase();
      if (normUsername !== currentUser.username && users.some(u => u.username === normUsername)) {
        alert('Username is already taken.');
        return;
      }
      const updatedUsers = users.map(u => {
        if (u.id === currentUser.id) {
          return {
            ...u,
            username: normUsername,
            name: profileNameInput,
            bio: profileBioInput,
            avatar: profileAvatarPreview || u.avatar
          };
        }
        return u;
      });
      saveLocalUsers(updatedUsers);

      const newCurr = {
        ...currentUser,
        username: normUsername,
        name: profileNameInput,
        bio: profileBioInput,
        avatar: profileAvatarPreview || currentUser.avatar
      };
      setCurrentUser(newCurr);
      sessionStorage.setItem('ig_current_user', JSON.stringify(newCurr));
      setViewingProfile(normUsername);
      setIsEditingProfile(false);
      fetchProfile(normUsername);
    }
  };

  const handleDeleteNotification = async (notifId) => {
    if (USE_LIVE_BACKEND) {
      try {
        const res = await fetch(`${API_BASE}/api/notifications/${notifId}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });
        const data = await res.json();
        if (data.success) {
          fetchNotifications();
        }
      } catch (err) {
        console.error('Error deleting notification:', err);
      }
    } else {
      const notifs = getLocalNotifications();
      const filtered = notifs.filter(n => n.id !== notifId);
      saveLocalNotifications(filtered);
      fetchNotifications();
    }
  };

  const handleClearNotifications = async () => {
    if (USE_LIVE_BACKEND) {
      try {
        const res = await fetch(`${API_BASE}/api/notifications`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });
        const data = await res.json();
        if (data.success) {
          fetchNotifications();
        }
      } catch (err) {
        console.error('Error clearing notifications:', err);
      }
    } else {
      const notifs = getLocalNotifications();
      const preserved = notifs.filter(n => n.type === 'ai_flagged' || n.type === 'AI_FLAGGED_MESSAGE');
      saveLocalNotifications(preserved);
      fetchNotifications();
    }
  };

  const handleLike = async (postId) => {
    if (!currentUser) return;
    if (USE_LIVE_BACKEND) {
      try {
        const res = await fetch(`${API_BASE}/api/posts/${postId}/like`, {
          method: 'POST',
          headers: getAuthHeaders()
        });
        const data = await res.json();
        if (data.success) {
          fetchFeed();
          if (profileData) fetchProfile(profileData.username);
        }
      } catch (err) {
        console.error('Error liking post:', err);
      }
    } else {
      const likes = getLocalLikes();
      const existingIndex = likes.findIndex(l => l.post_id === postId && l.user_id === currentUser.id);

      if (existingIndex > -1) {
        likes.splice(existingIndex, 1);

        // Delete notification
        const posts = getLocalPosts();
        const post = posts.find(p => p.id === postId);
        if (post) {
          const notifications = getLocalNotifications();
          const nIdx = notifications.findIndex(n => n.user_id === post.user_id && n.sender_id === currentUser.id && n.type === 'like' && n.post_id === postId);
          if (nIdx > -1) {
            notifications.splice(nIdx, 1);
            saveLocalNotifications(notifications);
          }
        }
      } else {
        likes.push({ post_id: postId, user_id: currentUser.id });

        const posts = getLocalPosts();
        const post = posts.find(p => p.id === postId);
        if (post && post.user_id !== currentUser.id) {
          const notifications = getLocalNotifications();
          notifications.push({
            id: notifications.length + 1,
            user_id: post.user_id,
            sender_id: currentUser.id,
            type: 'like',
            post_id: postId,
            text: 'liked your post.',
            is_read: 0,
            created_at: new Date().toISOString()
          });
          saveLocalNotifications(notifications);
        }
      }
      saveLocalLikes(likes);
      fetchFeed();
      if (profileData) fetchProfile(profileData.username);
    }
  };

  const handleBookmark = (postId) => {
    setBookmarkedPosts(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  const handleAddComment = async (postId) => {
    const text = newCommentText[postId]?.trim();
    if (!text || !currentUser) return;

    if (USE_LIVE_BACKEND) {
      try {
        const res = await fetch(`${API_BASE}/api/posts/${postId}/comment`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ text })
        });
        const data = await res.json();
        if (data.success) {
          setNewCommentText(prev => ({ ...prev, [postId]: '' }));
          fetchFeed();
          if (profileData) fetchProfile(profileData.username);
        }
      } catch (err) {
        console.error('Error adding comment:', err);
      }
    } else {
      const comments = getLocalComments();
      const newId = comments.length > 0 ? Math.max(...comments.map(c => c.id)) + 1 : 1;
      comments.push({
        id: newId,
        post_id: postId,
        user_id: currentUser.id,
        text,
        created_at: new Date().toISOString()
      });
      saveLocalComments(comments);

      const posts = getLocalPosts();
      const post = posts.find(p => p.id === postId);
      if (post && post.user_id !== currentUser.id) {
        const notifications = getLocalNotifications();
        notifications.push({
          id: notifications.length + 1,
          user_id: post.user_id,
          sender_id: currentUser.id,
          type: 'comment',
          post_id: postId,
          text: `commented: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`,
          is_read: 0,
          created_at: new Date().toISOString()
        });
        saveLocalNotifications(notifications);
      }

      setNewCommentText(prev => ({ ...prev, [postId]: '' }));
      fetchFeed();
      if (profileData) fetchProfile(profileData.username);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (USE_LIVE_BACKEND) {
      try {
        const res = await fetch(`${API_BASE}/api/comments/${commentId}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });
        const data = await res.json();
        if (data.success) {
          fetchFeed();
          if (profileData) fetchProfile(profileData.username);
        }
      } catch (err) {
        console.error('Error deleting comment:', err);
      }
    } else {
      const comments = getLocalComments();
      const idx = comments.findIndex(c => c.id === commentId);
      if (idx > -1 && comments[idx].user_id === currentUser.id) {
        comments.splice(idx, 1);
        saveLocalComments(comments);
        fetchFeed();
        if (profileData) fetchProfile(profileData.username);
      }
    }
  };

  const handleSavePostCaption = async (postId) => {
    if (USE_LIVE_BACKEND) {
      try {
        const res = await fetch(`${API_BASE}/api/posts/${postId}/caption`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({ caption: editingPostCaption })
        });
        const data = await res.json();
        if (data.success) {
          setEditingPostId(null);
          fetchFeed();
          if (profileData) fetchProfile(profileData.username);
        }
      } catch (err) {
        console.error('Error editing caption:', err);
      }
    } else {
      const posts = getLocalPosts();
      const updated = posts.map(p => {
        if (p.id === postId && p.user_id === currentUser.id) {
          return { ...p, caption: editingPostCaption };
        }
        return p;
      });
      saveLocalPosts(updated);
      setEditingPostId(null);
      fetchFeed();
      if (profileData) fetchProfile(profileData.username);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Delete this post permanently?')) return;
    if (USE_LIVE_BACKEND) {
      try {
        const res = await fetch(`${API_BASE}/api/posts/${postId}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });
        const data = await res.json();
        if (data.success) {
          fetchFeed();
          if (profileData) fetchProfile(profileData.username);
        }
      } catch (err) {
        console.error('Error deleting post:', err);
      }
    } else {
      const posts = getLocalPosts();
      const idx = posts.findIndex(p => p.id === postId);
      if (idx > -1 && posts[idx].user_id === currentUser.id) {
        posts.splice(idx, 1);
        saveLocalPosts(posts);
        fetchFeed();
        if (profileData) fetchProfile(profileData.username);
      }
    }
  };

  const handleFollowToggle = async (targetUserId) => {
    if (!currentUser) return;
    if (USE_LIVE_BACKEND) {
      try {
        const res = await fetch(`${API_BASE}/api/follow`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ followingId: targetUserId })
        });
        const data = await res.json();
        if (data.success) {
          if (profileData && profileData.id === targetUserId) fetchProfile(profileData.username);
          fetchFeed();
          fetchSuggestions();
          fetchInbox();
          fetchStories();
        }
      } catch (err) {
        console.error('Error toggling follow:', err);
      }
    } else {
      const follows = getLocalFollows();
      const existingIndex = follows.findIndex(f => f.follower_id === currentUser.id && f.following_id === targetUserId);

      if (existingIndex > -1) {
        follows.splice(existingIndex, 1);

        // Remove follow notification
        const notifications = getLocalNotifications();
        const nIdx = notifications.findIndex(n => n.user_id === targetUserId && n.sender_id === currentUser.id && n.type === 'follow');
        if (nIdx > -1) {
          notifications.splice(nIdx, 1);
          saveLocalNotifications(notifications);
        }
      } else {
        follows.push({ follower_id: currentUser.id, following_id: targetUserId });

        const notifications = getLocalNotifications();
        notifications.push({
          id: notifications.length + 1,
          user_id: targetUserId,
          sender_id: currentUser.id,
          type: 'follow',
          text: 'started following you.',
          is_read: 0,
          created_at: new Date().toISOString()
        });
        saveLocalNotifications(notifications);
      }
      saveLocalFollows(follows);
      if (profileData && profileData.id === targetUserId) fetchProfile(profileData.username);
      fetchFeed();
      fetchSuggestions();
      fetchInbox();
      fetchStories();
    }
  };

  const handleSendMessage = async (forcedPayload = null) => {
    if (isImageSendingRef.current || isImageModerating) return; // Prevent duplicate send clicks during moderation
    const payload = (forcedPayload && typeof forcedPayload === 'object' && 'text' in forcedPayload) ? forcedPayload : null;
    const text = payload ? payload.text : typedMessage.trim();
    if ((!text && !uploadedImageBase64) || !currentUser || !activeChatUser) return;

    const users = getLocalUsers();
    const receiver = users.find(u => u.username === activeChatUser);
    if (!receiver) return;

    // Pre-Send abuse check if we haven't already forced it
    if (!payload && text) {
      if (USE_LIVE_BACKEND) {
        try {
          const checkRes = await fetch(`${API_BASE}/api/chats/pre-check`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ text, receiverId: selectedChatUserId || receiver.id })
          });

          if (checkRes.status === 503) {
            alert('Abuse detection service is temporarily unavailable. Please try again.');
            return; // Block message!
          } else {
            const checkData = await checkRes.json();
            if (checkData && checkData.unavailable) {
              alert('Abuse detection service is temporarily unavailable. Please try again.');
              return; // Block message!
            } else if (checkData && !checkData.safe) {
              setPendingMessageText(text);
              setPendingMessagePrediction(checkData);
              setShowAbuseWarningModal(true);
              return; // Intercept send!
            }
          }
        } catch (err) {
          console.error('Error pre-checking message for abuse:', err);
          alert('Abuse detection service is temporarily unavailable. Please try again.');
          return; // Block message!
        }
      } else {
        // Mockup mode keyword check
        const lowercase = text.toLowerCase();
        const badWords = ['toxic', 'idiot', 'abuse', 'cyberbullying', 'hate', 'bully', 'threat', 'stupid', 'kill', 'harassment', 'fuck', 'bitch'];
        const isToxic = badWords.some(w => lowercase.includes(w));
        if (isToxic) {
          setPendingMessageText(text);
          setPendingMessagePrediction({
            safe: false,
            label: 'toxic',
            confidence: 0.96,
            severity: 'High'
          });
          setShowAbuseWarningModal(true);
          return; // Intercept send!
        }
      }
    }

    // Image Abuse Moderation Check (Part 7 & 9)
    if (uploadedImageBase64 && USE_LIVE_BACKEND) {
      isImageSendingRef.current = true;
      setIsImageModerating(true);
      try {
        const imgCheckRes = await fetch(`${API_BASE}/api/chats/image-check`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            image: uploadedImageBase64,
            receiverId: selectedChatUserId || receiver.id
          })
        });

        if (imgCheckRes.status === 503) {
          isImageSendingRef.current = false;
          setIsImageModerating(false);
          setImageAbuseWarningText('Image could not be checked. Please try again.');
          setImageAbuseChatUser(activeChatUser);
          setShowImageAbuseModal(true);
          return;
        }

        const imgCheckData = await imgCheckRes.json();
        if (imgCheckRes.status !== 200 || !imgCheckData.allowed || imgCheckData.isAbusive || imgCheckData.status === 'ABUSIVE') {
          isImageSendingRef.current = false;
          setIsImageModerating(false);
          const isErrorState = imgCheckData.status === 'MODERATION_ERROR' || imgCheckRes.status === 503 || imgCheckRes.status === 500;
          const warningMsg = isErrorState
            ? (imgCheckData.error || 'Image moderation service is temporarily unavailable. Please try again.')
            : (imgCheckData.error || imgCheckData.message || 'Image cannot be sent because it was detected as potentially harmful.');
          setImageAbuseWarningText(warningMsg);
          setImageAbuseChatUser(activeChatUser);
          setShowImageAbuseModal(true);
          return;
        }
      } catch (imgCheckErr) {
        console.error('Error moderating image:', imgCheckErr);
        isImageSendingRef.current = false;
        setIsImageModerating(false);
        setImageAbuseWarningText('Image could not be checked. Please try again.');
        setImageAbuseChatUser(activeChatUser);
        setShowImageAbuseModal(true);
        return;
      }
    }

    if (USE_LIVE_BACKEND) {
      try {
        const bodyPayload = {
          receiverId: selectedChatUserId || receiver.id,
          text,
          image: uploadedImageBase64 || '',
          isFlagged: payload ? true : false,
          aiLabel: payload ? payload.label : null,
          aiConfidence: payload ? payload.confidence : null,
          aiSeverity: payload ? payload.severity : null,
          senderDecision: payload ? 'FORCE_SEND' : null
        };

        const res = await fetch(`${API_BASE}/api/chats/message`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(bodyPayload)
        });
        const data = await res.json();
        if (res.status === 503 || (data && data.status === 503)) {
          isImageSendingRef.current = false;
          setIsImageModerating(false);
          setImageAbuseWarningText('Image could not be checked. Please try again.');
          setImageAbuseChatUser(activeChatUser);
          setShowImageAbuseModal(true);
          return;
        }
        if (data && (data.blocked || !data.allowed) && (data.moderationType === 'IMAGE' || data.status === 'ABUSIVE' || data.status === 'MODERATION_ERROR')) {
          isImageSendingRef.current = false;
          setIsImageModerating(false);
          const isErrorState = data.status === 'MODERATION_ERROR' || res.status === 503;
          const warningMsg = isErrorState
            ? (data.error || 'Image moderation service is temporarily unavailable. Please try again.')
            : (data.message || data.error || 'Image cannot be sent because it was detected as potentially harmful.');
          setImageAbuseWarningText(warningMsg);
          setImageAbuseChatUser(activeChatUser);
          setShowImageAbuseModal(true);
          return;
        }
        if (data.success) {
          isImageSendingRef.current = false;
          setIsImageModerating(false);
          setTypedMessage('');
          setUploadedImageBase64(null);
          fetchChatThread(activeChatUser, true);
        }
      } catch (err) {
        console.error('Error sending message:', err);
      } finally {
        setIsImageModerating(false);
      }
    } else {
      const messages = getLocalMessages();
      const newId = messages.length > 0 ? Math.max(...messages.map(m => m.id)) + 1 : 1;

      const newMsg = {
        id: newId,
        sender_id: currentUser.id,
        receiver_id: receiver.id,
        text,
        image: uploadedImageBase64 || '',
        created_at: new Date().toISOString(),
        isFlagged: payload ? true : false,
        aiLabel: payload ? payload.label : null,
        aiConfidence: payload ? payload.confidence : null,
        aiSeverity: payload ? payload.severity : null,
        receiverDecision: payload ? 'PENDING' : null,
        senderDecision: payload ? 'FORCE_SEND' : null
      };

      messages.push(newMsg);
      saveLocalMessages(messages);

      if (payload) {
        // Log mockup flagged message
        const flagged = JSON.parse(localStorage.getItem('ig_flagged_messages') || '[]');
        flagged.push({
          id: flagged.length + 1,
          senderId: currentUser.id,
          receiverId: receiver.id,
          message: text,
          aiLabel: payload.label,
          confidence: payload.confidence,
          severity: payload.severity,
          timestamp: new Date().toISOString(),
          senderDecision: 'FORCE_SEND',
          receiverDecision: 'PENDING'
        });
        localStorage.setItem('ig_flagged_messages', JSON.stringify(flagged));

        // Create mock flagged notifications
        const notifications = getLocalNotifications();
        notifications.push({
          id: notifications.length + 1,
          user_id: currentUser.id,
          sender_id: 1, // Admin bot
          type: 'AI_FLAGGED_MESSAGE',
          text: 'Your message was flagged by AI.',
          message_id: newId,
          is_read: 0,
          created_at: new Date().toISOString()
        });
        notifications.push({
          id: notifications.length + 2,
          user_id: receiver.id,
          sender_id: 1,
          type: 'AI_FLAGGED_MESSAGE',
          text: 'AI detected a potentially abusive message.',
          message_id: newId,
          is_read: 0,
          created_at: new Date().toISOString()
        });
        saveLocalNotifications(notifications);
        fetchNotifications();
      }



      setTypedMessage('');
      setUploadedImageBase64(null);
      fetchChatThread(activeChatUser, true);
    }
  };

  const handleUnsendMessage = async (messageId) => {
    if (USE_LIVE_BACKEND) {
      try {
        const res = await fetch(`${API_BASE}/api/chats/unsend/${messageId}`, {
          method: 'POST',
          headers: getAuthHeaders()
        });
        const data = await res.json();
        if (data.success) {
          fetchChatThread(activeChatUser, true);
        }
      } catch (err) {
        console.error('Error unsending message:', err);
      }
    } else {
      const messages = getLocalMessages();
      const idx = messages.findIndex(m => m.id === messageId);
      if (idx > -1 && messages[idx].sender_id === currentUser.id) {
        messages.splice(idx, 1);
        saveLocalMessages(messages);
        fetchChatThread(activeChatUser, true);
      }
    }
  };

  const handleDeleteChat = async (targetUsername) => {
    if (!window.confirm(`Are you sure you want to delete the entire chat history with @${targetUsername}?`)) return;

    if (USE_LIVE_BACKEND) {
      try {
        const res = await fetch(`${API_BASE}/api/chats/${targetUsername}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });
        const data = await res.json();
        if (data.success) {
          setActiveChatUser(null);
          setChatMessages([]);
          fetchInbox();
        }
      } catch (err) {
        console.error('Error deleting chat:', err);
      }
    } else {
      const users = getLocalUsers();
      const targetUser = users.find(u => u.username === targetUsername);
      if (!targetUser) return;

      const messages = getLocalMessages();
      const filtered = messages.filter(m =>
        !((m.sender_id === currentUser.id && m.receiver_id === targetUser.id) ||
          (m.sender_id === targetUser.id && m.receiver_id === currentUser.id))
      );
      saveLocalMessages(filtered);

      setActiveChatUser(null);
      setChatMessages([]);
      fetchInbox();
    }
  };

  const handleAllowMessage = async (messageId) => {
    if (USE_LIVE_BACKEND) {
      try {
        const res = await fetch(`${API_BASE}/api/messages/${messageId}/allow`, {
          method: 'POST',
          headers: getAuthHeaders()
        });
        const data = await res.json();
        if (data.success) {
          if (data.notification) {
            setNotifications(prev => {
              if (prev.some(n => n.id === data.notification.id)) return prev;
              return [data.notification, ...prev];
            });
          }
          fetchChatThread(activeChatUser, true);
          fetchNotifications();
        }
      } catch (err) {
        console.error('Error allowing message:', err);
      }
    } else {
      const messages = getLocalMessages();
      const msg = messages.find(m => m.id === messageId);
      if (msg) {
        msg.receiverDecision = 'ALLOWED';
        saveLocalMessages(messages);

        const flagged = JSON.parse(localStorage.getItem('ig_flagged_messages') || '[]');
        const fl = flagged.find(f => f.senderId === msg.sender_id && f.receiverId === msg.receiver_id && f.message === msg.text);
        if (fl) {
          fl.receiverDecision = 'ALLOWED';
          fl.decisionTimestamp = new Date().toISOString();
          fl.status = 'ALLOWED';
        }
        localStorage.setItem('ig_flagged_messages', JSON.stringify(flagged));

        const notifications = getLocalNotifications();
        const senderUser = getLocalUsers().find(u => u.id === msg.sender_id);
        notifications.push({
          id: notifications.length + 1,
          user_id: currentUser.id,
          sender_id: msg.sender_id,
          type: 'AI_MESSAGE_ALLOWED',
          title: 'Flagged Message Allowed',
          text: `You allowed an AI-flagged message from ${senderUser ? senderUser.name : 'User'}.`,
          message: `You allowed an AI-flagged message from ${senderUser ? senderUser.name : 'User'}.`,
          readStatus: 0,
          is_read: 0,
          created_at: new Date().toISOString()
        });
        saveLocalNotifications(notifications);

        fetchChatThread(activeChatUser, true);
        fetchNotifications();
      }
    }
  };

  const handleReportMessage = async (messageId) => {
    if (USE_LIVE_BACKEND) {
      try {
        const res = await fetch(`${API_BASE}/api/messages/${messageId}/prepare-report`, {
          method: 'POST',
          headers: getAuthHeaders()
        });
        const data = await res.json();
        if (data.success) {
          if (data.alreadySubmitted && data.complaint) {
            setComplaints(prev => {
              const updated = [data.complaint, ...prev.filter(c => c.id !== data.complaint.id && c.messageId !== messageId)];
              localStorage.setItem('ig_complaints', JSON.stringify(updated));
              return updated;
            });
            setSelectedComplaintId(data.complaint.id);
            setActiveTab('complaint-details');
            return;
          }

          const draft = data.complaintData;
          setComplaints(prev => {
            const updated = [draft, ...prev.filter(c => c.id !== draft.id && c.messageId !== draft.messageId)];
            localStorage.setItem('ig_complaints', JSON.stringify(updated));
            return updated;
          });
          setSelectedComplaintId(draft.id);
          setActiveTab('complaint-details');
        } else {
          console.error('Failed to prepare report:', data.error);
        }
      } catch (err) {
        console.error('Error preparing report:', err);
      }
    } else {
      const messages = getLocalMessages();
      const msg = messages.find(m => m.id === messageId);
      if (msg) {
        const senderUser = getLocalUsers().find(u => u.id === msg.sender_id) || { username: activeChatUser };
        const draftComplaint = {
          id: `draft_${msg.id}`,
          messageId: msg.id,
          senderId: msg.sender_id,
          senderUsername: senderUser.username || senderUser.name || activeChatUser,
          reportedMessage: msg.text || msg.image || 'Flagged Message',
          messageTimestamp: msg.created_at || msg.createdAt || new Date().toISOString(),
          status: 'Draft',
          additionalDetails: '',
          screenshots: []
        };

        setComplaints(prev => {
          const updated = [draftComplaint, ...prev.filter(c => c.id !== draftComplaint.id && c.messageId !== msg.id)];
          localStorage.setItem('ig_complaints', JSON.stringify(updated));
          return updated;
        });
        setSelectedComplaintId(draftComplaint.id);
        setActiveTab('complaint-details');
      }
    }
  };

  const handleUploadPostSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    if (USE_LIVE_BACKEND) {
      try {
        const res = await fetch(`${API_BASE}/api/posts`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            type: uploadType,
            img: uploadImage,
            content: uploadContent,
            title: uploadTitle,
            caption: uploadCaption
          })
        });
        const data = await res.json();
        if (data.success) {
          setShowUploadModal(false);
          setUploadType('image');
          setUploadTitle('');
          setUploadContent('');
          setUploadCaption('');
          setUploadImage(null);
          fetchFeed();
          setActiveTab('home');
        }
      } catch (err) {
        console.error('Error creating post:', err);
      }
    } else {
      const posts = getLocalPosts();
      const newId = posts.length > 0 ? Math.max(...posts.map(p => p.id)) + 1 : 1;
      const newPost = {
        id: newId,
        user_id: currentUser.id,
        type: uploadType,
        img: uploadImage || '',
        content: uploadContent || '',
        title: uploadTitle || '',
        caption: uploadCaption || '',
        created_at: new Date().toISOString()
      };
      posts.push(newPost);
      saveLocalPosts(posts);

      setShowUploadModal(false);
      setUploadType('image');
      setUploadTitle('');
      setUploadContent('');
      setUploadCaption('');
      setUploadImage(null);
      fetchFeed();
      setActiveTab('home');
    }
  };

  // --- Simulated Automations (Persisted to localStorage) ---

  const triggerAiAssistantReply = (msgText) => {
    setIsAiTyping(true);
    setTimeout(() => {
      setIsAiTyping(false);
      let botReply = '';
      const lowercaseMsg = msgText.toLowerCase();

      if (lowercaseMsg === 'help') {
        botReply = '⚡ Available Bot Commands:\n• "scan <url>" - Audit performance rating of a site.\n• "decrypt <text>" - Caesar decrypt (Shift 7).\n• "status" - Review system diagnostics.';
      } else if (lowercaseMsg.startsWith('scan ')) {
        const url = msgText.substring(5).trim();
        const isBad = url.includes('bad') || url.includes('error') || url.includes('slow');
        botReply = `🔍 Site Audit: ${url}\n• SSL Certificate: VALID\n• Speed Index: ${isBad ? '0.96 (CRITICAL LAG)' : '0.02 (Fast)'}\n• Recommendation: ${isBad ? 'OPTIMIZE RESOURCES' : 'HEALTHY STATUS'}`;
      } else if (lowercaseMsg.startsWith('decrypt ')) {
        const cipherText = msgText.substring(8).trim();
        const s = (26 - 7) % 26;
        let out = '';
        for (let i = 0; i < cipherText.length; i++) {
          let code = cipherText.charCodeAt(i);
          if (code >= 65 && code <= 90) out += String.fromCharCode(((code - 65 + s) % 26) + 65);
          else if (code >= 97 && code <= 122) out += String.fromCharCode(((code - 97 + s) % 26) + 97);
          else out += cipherText.charAt(i);
        }
        botReply = `🔑 Caesar Decrypted Output:\n"${out}"`;
      } else if (lowercaseMsg === 'status') {
        botReply = '🛡️ System Firewall Status:\n• Port Sensors: ACTIVE\n• Inbound Filtering: ENABLED\n• Matrix Guard: Nominal.';
      } else {
        botReply = `Received telemetry scan. Type "help" to view diagnostic commands. Code length: ${msgText.length} characters.`;
      }

      const messages = getLocalMessages();
      const newId = messages.length > 0 ? Math.max(...messages.map(m => m.id)) + 1 : 1;
      messages.push({
        id: newId,
        sender_id: 1,
        receiver_id: currentUser.id,
        text: botReply,
        created_at: new Date().toISOString()
      });
      saveLocalMessages(messages);
      fetchChatThread(activeChatUser, true);


    }, 1000);
  };

  // Encoders
  const handleImageAttachment = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadedImageBase64(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handlePostImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // --- Admin Route Handlers ---
  const fetchAdminUsers = async () => {
    setAdminLoading(true);
    setAdminError('');
    try {
      const res = await fetch(`${API_BASE}/api/admin/users`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('ig_admin_token') || adminToken}`
        }
      });
      if (res.status === 403) {
        setAdminError('Access denied. Administrators only.');
        setAdminUsers([]);
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setAdminUsers(data);
      } else {
        setAdminError(data.error || 'Failed to fetch admin users.');
      }
    } catch (err) {
      setAdminError('Error fetching accounts: ' + err.message);
    } finally {
      setAdminLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminLoggedIn) {
      fetchAdminUsers();
      fetchAdminComplaints();
      fetchAdminFeedback();
    }
  }, [isAdminLoggedIn]);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setAdminError('');
    if (!adminUsername || !adminPassword) {
      setAdminError('Username and password are required.');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: adminUsername, password: adminPassword })
      });
      const data = await res.json();
      if (res.status === 200 && data.success) {
        sessionStorage.setItem('ig_admin_token', data.token);
        setAdminToken(data.token);
        setIsAdminLoggedIn(true);
        setAdminUsername('');
        setAdminPassword('');
      } else {
        setAdminError(data.error || 'Invalid admin credentials.');
      }
    } catch (err) {
      setAdminError('Login failed: ' + err.message);
    }
  };

  const handleAdminLogout = () => {
    sessionStorage.removeItem('ig_admin_token');
    setAdminToken('');
    setIsAdminLoggedIn(false);
    setAdminUsers([]);
  };

  const handleAdminBack = () => {
    if (adminSelectedComplaint) {
      setAdminSelectedComplaint(null);
    } else if (adminActiveTab === 'complaints' || adminActiveTab === 'feedback') {
      setAdminActiveTab('users');
      setAdminSelectedComplaint(null);
      fetchAdminUsers();
    } else {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = '/';
      }
    }
  };

  const handleConfirmDelete = async (userId) => {
    setAdminError('');
    setAdminSuccess('');
    setDeleteConfirmUser(null);
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('ig_admin_token') || adminToken}`
        }
      });
      const data = await res.json();
      if (res.status === 200 && data.success) {
        setAdminSuccess('Account deleted successfully.');
        setAdminUsers(prev => prev.filter(u => u.id !== userId));
        fetchAdminComplaints();
        if (adminSelectedComplaint && adminSelectedComplaint.reportedUserId === userId) {
          setAdminSelectedComplaint(null);
        }
      } else {
        setAdminError(data.error || 'Failed to delete account.');
      }
    } catch (err) {
      setAdminError('Error deleting user: ' + err.message);
    }
  };

  const resolveImage = (imgSrc) => {
    if (imgSrc === 'cyberNetwork') return cyberNetwork;
    if (imgSrc === 'hackerAvatar') return hackerAvatar;
    return imgSrc;
  };

  // --- Rendering UI Panels ---

  // --- Admin Page Routing ---
  const isAdminRoute = window.location.pathname === '/admin';
  if (isAdminRoute) {
    if (!isAdminLoggedIn) {
      return (
        <div className="login-page-container">
          <SafeConnectAdminBackground />
          <div style={{ background: '#120c24', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: '8px', padding: '40px', width: '350px', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 24px rgba(139, 92, 246, 0.08)' }}>

            <h1 className="logo-text" style={{ fontSize: '28px', marginBottom: '24px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <SafeConnectLogo size={32} />
              <span>SafeConnect Admin</span>
            </h1>
            <p style={{ color: 'var(--ig-text-secondary)', fontSize: '13px', textAlign: 'center', marginBottom: '20px' }}>Sign in to access administrative tools.</p>
            <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Username (ADMIN)"
                value={adminUsername}
                onChange={e => setAdminUsername(e.target.value)}
                style={{ width: '100%', background: '#0d081a', border: '1px solid rgba(139, 92, 246, 0.25)', borderRadius: '4px', padding: '9px 10px', color: '#ffffff', fontSize: '12px', boxSizing: 'border-box' }}
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={adminPassword}
                onChange={e => setAdminPassword(e.target.value)}
                style={{ width: '100%', background: '#0d081a', border: '1px solid rgba(139, 92, 246, 0.25)', borderRadius: '4px', padding: '9px 10px', color: '#ffffff', fontSize: '12px', boxSizing: 'border-box' }}
                required
              />
              {adminError && (
                <p style={{ color: '#ed4956', fontSize: '12px', margin: '4px 0 0 0', textAlign: 'center' }}>{adminError}</p>
              )}
              <button
                type="submit"
                style={{ width: '100%', background: '#8b5cf6', border: 'none', borderRadius: '8px', padding: '10px', color: '#ffffff', fontSize: '14px', fontWeight: '600', cursor: 'pointer', marginTop: '12px' }}
              >
                Log In
              </button>
            </form>
          </div>
        </div>
      );
    } else {
      return (
        <div style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -10%, #1c0f33 0%, #0c0817 60%, #07040e 100%)', backgroundColor: '#0c0817', color: '#ffffff', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
          <header style={{ borderBottom: '1px solid rgba(139, 92, 246, 0.16)', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0e091b' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              {(adminActiveTab !== 'users' || adminSelectedComplaint) && (
                <button
                  onClick={handleAdminBack}
                  className="admin-header-back-btn"
                  title="Go Back"
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(139, 92, 246, 0.25)',
                    color: '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '7px 9px',
                    borderRadius: '6px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <ArrowLeft size={18} />
                </button>
              )}
              <h1 className="logo-text" style={{ fontSize: '24px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <SafeConnectLogo size={24} />
                <span>SafeConnect</span>
              </h1>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button
                onClick={() => {
                  setAdminActiveTab('users');
                  setAdminSelectedComplaint(null);
                  fetchAdminUsers();
                }}
                style={{ background: adminActiveTab === 'users' ? '#0095f6' : '#262626', border: '1px solid #363636', borderRadius: '4px', padding: '6px 12px', color: '#ffffff', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
              >
                Accounts
              </button>
              <button
                onClick={() => {
                  setAdminActiveTab('complaints');
                  setAdminSelectedComplaint(null);
                  fetchAdminComplaints();
                }}
                style={{ background: adminActiveTab === 'complaints' ? '#0095f6' : '#262626', border: '1px solid #363636', borderRadius: '4px', padding: '6px 12px', color: '#ffffff', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
              >
                Complaints
              </button>
              <button
                onClick={() => {
                  setAdminActiveTab('feedback');
                  setAdminSelectedComplaint(null);
                  fetchAdminFeedback();
                }}
                style={{ background: adminActiveTab === 'feedback' ? '#0095f6' : '#262626', border: '1px solid #363636', borderRadius: '4px', padding: '6px 12px', color: '#ffffff', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
              >
                Dataset Feedback
              </button>
              <button
                onClick={() => {
                  if (adminActiveTab === 'complaints') fetchAdminComplaints();
                  else if (adminActiveTab === 'feedback') fetchAdminFeedback();
                  else fetchAdminUsers();
                }}
                disabled={adminLoading || adminFeedbackLoading}
                style={{ background: '#262626', border: '1px solid #363636', borderRadius: '4px', padding: '6px 12px', color: '#ffffff', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
              >
                {(adminLoading || adminFeedbackLoading) ? 'Refreshing...' : 'Refresh'}
              </button>
              <button
                onClick={handleAdminLogout}
                style={{ background: '#ed4956', border: 'none', borderRadius: '4px', padding: '6px 12px', color: '#ffffff', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
              >
                Logout
              </button>
            </div>
          </header>

          <main style={{ padding: '28px 24px', maxWidth: '1120px', width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
            {adminError && (
              <div style={{ backgroundColor: '#2b1014', border: '1px solid #ed4956', color: '#ed4956', padding: '12px', borderRadius: '6px', marginBottom: '20px', fontSize: '14px' }}>
                {adminError}
              </div>
            )}

            {adminSuccess && (
              <div style={{ backgroundColor: 'rgba(57, 255, 20, 0.1)', border: '1px solid rgba(57, 255, 20, 0.3)', color: '#39FF14', padding: '12px', borderRadius: '6px', marginBottom: '20px', fontSize: '14px', textAlign: 'center' }}>
                {adminSuccess}
              </div>
            )}

            {adminActiveTab === 'complaints' ? (
              adminSelectedComplaint ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', gap: '12px' }}>
                    <button
                      onClick={() => setAdminSelectedComplaint(null)}
                      className="admin-header-back-btn"
                      style={{
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(139, 92, 246, 0.25)',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        color: '#ffffff',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <ArrowLeft size={14} />
                      <span>Back to Complaints</span>
                    </button>
                    <h2 style={{ fontSize: '20px', margin: 0 }}>
                      Complaint received from {adminSelectedComplaint.reporterName || adminSelectedComplaint.reporterUsername}
                    </h2>
                  </div>

                  <div style={{ background: '#120c22', border: '1px solid rgba(139, 92, 246, 0.22)', borderRadius: '10px', padding: '28px 32px', minHeight: '520px', display: 'flex', flexDirection: 'column', gap: '20px', boxSizing: 'border-box', width: '100%', maxWidth: '100%', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                    <div>
                      <span style={{ fontSize: '12px', color: '#a8a8a8', fontWeight: '600', textTransform: 'uppercase' }}>Reporter</span>
                      <div style={{ fontSize: '15px', fontWeight: '700', marginTop: '4px', wordBreak: 'break-word' }}>
                        {adminSelectedComplaint.reporterName || adminSelectedComplaint.reporterUsername}
                      </div>
                    </div>

                    <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(139, 92, 246, 0.12)', borderRadius: '8px', padding: '16px 20px', boxSizing: 'border-box', width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', boxSizing: 'border-box', minHeight: '44px' }}>
                        <div style={{ minWidth: '180px' }}>
                          <span style={{ fontSize: '12px', color: '#a8a8a8', fontWeight: '600', textTransform: 'uppercase', display: 'block' }}>Reported User</span>
                          <div style={{ fontSize: '16px', fontWeight: '700', marginTop: '4px', wordBreak: 'break-word' }}>
                            {adminSelectedComplaint.reportedUserName || adminSelectedComplaint.reportedUserUsername}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', boxSizing: 'border-box' }}>
                          {(() => {
                            const isDeleted = adminSelectedComplaint.actionTaken || !adminSelectedComplaint.reportedUserId;
                            if (isDeleted) {
                              return (
                                <span style={{
                                  padding: '6px 14px',
                                  borderRadius: '6px',
                                  background: 'rgba(239, 68, 68, 0.15)',
                                  border: '1px solid rgba(239, 68, 68, 0.35)',
                                  color: '#ef4444',
                                  fontSize: '13px',
                                  fontWeight: '600',
                                  display: 'inline-block',
                                  boxSizing: 'border-box',
                                  wordBreak: 'break-word',
                                  overflowWrap: 'break-word',
                                  whiteSpace: 'normal',
                                  maxWidth: '100%',
                                  lineHeight: '1.4'
                                }}>
                                  Action Taken (Account Deleted)
                                </span>
                              );
                            }
                            const reportedUsername = adminSelectedComplaint.reportedUserUsername || '';
                            if (reportedUsername.toUpperCase() === 'ADMIN') return null;

                            const reportedUserWarningCount = getReportedUserWarningCount(adminSelectedComplaint);
                            const currentCount = reportedUserWarningCount;

                            return (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', boxSizing: 'border-box' }}>
                                <div style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  fontSize: '13px',
                                  fontWeight: '700',
                                  color: currentCount >= 3 ? '#ef4444' : '#fbbf24',
                                  background: currentCount >= 3 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                  border: `1px solid ${currentCount >= 3 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
                                  padding: '6px 14px',
                                  borderRadius: '6px',
                                  whiteSpace: 'nowrap',
                                  boxSizing: 'border-box'
                                }}>
                                  <span>Warning Count:</span>
                                  <span style={{ fontSize: '14px' }}>{currentCount}/3</span>
                                </div>

                                {currentCount < 3 ? (
                                  <button
                                    onClick={() => handleIssueWarning(adminSelectedComplaint)}
                                    style={{
                                      background: '#f59e0b',
                                      border: 'none',
                                      borderRadius: '6px',
                                      padding: '8px 18px',
                                      color: '#ffffff',
                                      fontSize: '13px',
                                      fontWeight: '600',
                                      cursor: 'pointer',
                                      whiteSpace: 'nowrap',
                                      flexShrink: 0,
                                      boxSizing: 'border-box',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      minHeight: '36px',
                                      boxShadow: '0 2px 8px rgba(245, 158, 11, 0.25)',
                                      transition: 'background 0.2s ease, transform 0.1s ease'
                                    }}
                                  >
                                    Give Warning ({currentCount}/3)
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => {
                                      const offenderUser = {
                                        id: adminSelectedComplaint.reportedUserId,
                                        username: adminSelectedComplaint.reportedUserUsername
                                      };
                                      setDeleteConfirmUser(offenderUser);
                                    }}
                                    className="admin-delete-account-btn"
                                    style={{
                                      fontSize: '13px',
                                      padding: '8px 18px',
                                      whiteSpace: 'nowrap',
                                      flexShrink: 0,
                                      boxSizing: 'border-box',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      minHeight: '36px',
                                      borderRadius: '6px'
                                    }}
                                  >
                                    <Trash2 size={14} style={{ flexShrink: 0 }} />
                                    <span>Delete Account</span>
                                  </button>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    {adminSelectedComplaint.reportedUserPhoto && (
                      <div>
                        <span style={{ fontSize: '12px', color: '#a8a8a8', fontWeight: '600', textTransform: 'uppercase' }}>Registration Photo</span>
                        <div style={{ marginTop: '8px', border: '1px solid #262626', borderRadius: '6px', overflow: 'hidden', width: '120px', height: '120px', background: '#000' }}>
                          <img
                            src={adminSelectedComplaint.reportedUserPhoto}
                            alt="Reported User Registration"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <span style={{ fontSize: '12px', color: '#a8a8a8', fontWeight: '600', textTransform: 'uppercase' }}>Reported Message</span>
                      <div style={{ fontSize: '14px', background: 'rgba(255, 0, 0, 0.05)', border: '1px dashed rgba(255, 0, 0, 0.2)', padding: '12px', borderRadius: '6px', color: '#ff4d4d', marginTop: '4px', wordBreak: 'break-all' }}>
                        {adminSelectedComplaint.reportedMessage}
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: '12px', color: '#a8a8a8', fontWeight: '600', textTransform: 'uppercase' }}>Date & Time</span>
                      <div style={{ fontSize: '14px', marginTop: '4px', color: '#f3f4f6' }}>{formatComplaintDateTime(adminSelectedComplaint.createdAt || adminSelectedComplaint.messageTimestamp)}</div>
                    </div>

                    <div>
                      <span style={{ fontSize: '12px', color: '#a8a8a8', fontWeight: '600', textTransform: 'uppercase' }}>AI Prediction</span>
                      <div style={{ fontSize: '14px', marginTop: '4px', color: '#ff4d4d', fontWeight: '600' }}>{adminSelectedComplaint.aiLabel}</div>
                    </div>

                    <div>
                      <span style={{ fontSize: '12px', color: '#a8a8a8', fontWeight: '600', textTransform: 'uppercase' }}>Severity</span>
                      <div style={{ fontSize: '14px', marginTop: '4px', color: '#ff9f0a' }}>{adminSelectedComplaint.severity}</div>
                    </div>

                    <div>
                      <span style={{ fontSize: '12px', color: '#a8a8a8', fontWeight: '600', textTransform: 'uppercase' }}>Warning Status</span>
                      <div style={{ fontSize: '14px', marginTop: '4px', fontWeight: '600', color: (getReportedUserWarningCount(adminSelectedComplaint) >= 3) ? '#ef4444' : '#fbbf24', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span>Warning Count: {getReportedUserWarningCount(adminSelectedComplaint)}/3</span>
                        {(getReportedUserWarningCount(adminSelectedComplaint) >= 3) && (
                          <span style={{ fontSize: '12px', color: '#ef4444', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '2px 8px', borderRadius: '4px' }}>
                            (Maximum Warnings Reached — Eligible for Account Deletion)
                          </span>
                        )}
                      </div>
                    </div>



                    {adminSelectedComplaint.additionalDetails && (
                      <div>
                        <span style={{ fontSize: '12px', color: '#a8a8a8', fontWeight: '600', textTransform: 'uppercase' }}>Additional Details</span>
                        <div style={{ fontSize: '14px', padding: '8px 0', borderTop: '1px solid #1c1c1c', marginTop: '4px', whiteSpace: 'pre-wrap' }}>
                          {adminSelectedComplaint.additionalDetails}
                        </div>
                      </div>
                    )}

                    {adminSelectedComplaint.screenshots && adminSelectedComplaint.screenshots.length > 0 && (
                      <div>
                        <span style={{ fontSize: '12px', color: '#a8a8a8', fontWeight: '600', textTransform: 'uppercase' }}>User Uploaded Screenshot(s)</span>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px', marginTop: '8px' }}>
                          {adminSelectedComplaint.screenshots.map((src, idx) => (
                            <a key={idx} href={src} target="_blank" rel="noopener noreferrer" style={{ border: '1px solid #262626', borderRadius: '6px', overflow: 'hidden', display: 'block', height: '120px', background: '#000' }}>
                              <img src={src} alt={`Uploaded screenshot ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>Active User Complaints</h2>
                  <div style={{ background: '#120c22', border: '1px solid rgba(139, 92, 246, 0.16)', borderRadius: '8px', overflowX: 'auto', boxSizing: 'border-box', width: '100%', maxWidth: '100%' }}>
                    <table style={{ width: '100%', minWidth: '920px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px', boxSizing: 'border-box' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(139, 92, 246, 0.16)', background: '#18102b' }}>
                          <th style={{ padding: '12px 16px', color: '#a8a8a8', fontWeight: '600', width: '60px' }}>ID</th>
                          <th style={{ padding: '12px 16px', color: '#a8a8a8', fontWeight: '600', width: '140px' }}>Date & Time</th>
                          <th style={{ padding: '12px 16px', color: '#a8a8a8', fontWeight: '600', width: '120px' }}>Reporter</th>
                          <th style={{ padding: '12px 16px', color: '#a8a8a8', fontWeight: '600', width: '120px' }}>Offender</th>
                          <th style={{ padding: '12px 16px', color: '#a8a8a8', fontWeight: '600' }}>Reported Message</th>
                          <th style={{ padding: '12px 16px', color: '#a8a8a8', fontWeight: '600', minWidth: '320px' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminComplaints.length === 0 ? (
                          <tr>
                            <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: '#a8a8a8' }}>
                              No complaints submitted yet.
                            </td>
                          </tr>
                        ) : (
                          adminComplaints.map(c => (
                            <tr key={c.id} style={{ borderBottom: '1px solid #262626' }}>
                              <td style={{ padding: '12px 16px', fontWeight: '600' }}>C{c.id}</td>
                              <td style={{ padding: '12px 16px', color: '#cbd5e1', fontSize: '13px', whiteSpace: 'nowrap' }}>
                                {formatComplaintDateTime(c.createdAt || c.messageTimestamp)}
                              </td>
                              <td style={{ padding: '12px 16px' }}>@{c.reporterUsername}</td>
                              <td style={{ padding: '12px 16px' }}>@{c.reportedUserUsername}</td>
                              <td style={{ padding: '12px 16px', color: '#a8a8a8', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {c.reportedMessage}
                              </td>

                              <td style={{ padding: '14px 18px', minWidth: '320px', boxSizing: 'border-box' }}>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', boxSizing: 'border-box' }}>
                                  <button
                                    onClick={() => setAdminSelectedComplaint(c)}
                                    style={{ background: '#262626', border: '1px solid #363636', borderRadius: '4px', padding: '6px 12px', color: '#ffffff', fontSize: '12px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                                  >
                                    Review
                                  </button>
                                  {(() => {
                                    const isDeleted = c.actionTaken || !c.reportedUserId;
                                    if (isDeleted) {
                                      return (
                                        <span style={{
                                          padding: '5px 10px',
                                          borderRadius: '4px',
                                          background: 'rgba(239, 68, 68, 0.15)',
                                          border: '1px solid rgba(239, 68, 68, 0.3)',
                                          color: '#ef4444',
                                          fontSize: '12px',
                                          fontWeight: '600',
                                          display: 'inline-block',
                                          wordBreak: 'break-word',
                                          overflowWrap: 'break-word',
                                          whiteSpace: 'normal',
                                          lineHeight: '1.3',
                                          boxSizing: 'border-box'
                                        }}>
                                          Action Taken (Account Deleted)
                                        </span>
                                      );
                                    }
                                    const reportedUsername = c.reportedUserUsername || '';
                                    if (reportedUsername.toUpperCase() === 'ADMIN') return null;

                                    const reportedUserWarningCount = getReportedUserWarningCount(c);
                                    const currentCount = reportedUserWarningCount;

                                    return (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', boxSizing: 'border-box' }}>
                                        <span style={{
                                          fontSize: '12px',
                                          fontWeight: '700',
                                          color: currentCount >= 3 ? '#ef4444' : '#fbbf24',
                                          background: currentCount >= 3 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                          border: `1px solid ${currentCount >= 3 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                                          padding: '4px 8px',
                                          borderRadius: '4px',
                                          whiteSpace: 'nowrap',
                                          boxSizing: 'border-box'
                                        }}>
                                          Warning: {currentCount}/3
                                        </span>

                                        {currentCount < 3 ? (
                                          <button
                                            onClick={() => handleIssueWarning(c)}
                                            style={{ background: '#f59e0b', border: 'none', borderRadius: '4px', padding: '6px 12px', color: '#ffffff', fontSize: '12px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, boxSizing: 'border-box', display: 'inline-flex', alignItems: 'center' }}
                                          >
                                            Give Warning ({currentCount}/3)
                                          </button>
                                        ) : (
                                          <button
                                            onClick={() => {
                                              const offenderUser = {
                                                id: c.reportedUserId,
                                                username: c.reportedUserUsername
                                              };
                                              setDeleteConfirmUser(offenderUser);
                                            }}
                                            className="admin-delete-account-btn"
                                            style={{ fontSize: '12px', padding: '6px 12px', whiteSpace: 'nowrap', flexShrink: 0, boxSizing: 'border-box', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                          >
                                            <Trash2 size={13} style={{ flexShrink: 0 }} />
                                            <span>Delete Account</span>
                                          </button>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            ) : adminActiveTab === 'feedback' ? (
              <div>
                <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>User Submitted Abusive Dataset Feedback</h2>
                <div style={{ background: '#120c22', border: '1px solid rgba(139, 92, 246, 0.16)', borderRadius: '8px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(139, 92, 246, 0.16)', background: '#18102b' }}>
                        <th style={{ padding: '12px 16px', color: '#a8a8a8', fontWeight: '600' }}>ID</th>
                        <th style={{ padding: '12px 16px', color: '#a8a8a8', fontWeight: '600' }}>Complete Message</th>
                        <th style={{ padding: '12px 16px', color: '#a8a8a8', fontWeight: '600' }}>Abusive Word / Phrase</th>
                        <th style={{ padding: '12px 16px', color: '#a8a8a8', fontWeight: '600' }}>Submitted By</th>
                        <th style={{ padding: '12px 16px', color: '#a8a8a8', fontWeight: '600' }}>Date & Time</th>
                        <th style={{ padding: '12px 16px', color: '#a8a8a8', fontWeight: '600' }}>Source</th>
                        <th style={{ padding: '12px 16px', color: '#a8a8a8', fontWeight: '600' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminFeedbackList.length === 0 ? (
                        <tr>
                          <td colSpan="7" style={{ padding: '24px', textAlign: 'center', color: '#a8a8a8' }}>
                            {adminFeedbackLoading ? 'Loading dataset feedback...' : 'No abusive dataset feedback submitted yet.'}
                          </td>
                        </tr>
                      ) : (
                        adminFeedbackList.map(item => {
                          const isApproved = item.status === 'APPROVED' || item.status === 'ADDED_TO_MAIN_DATASET';
                          return (
                            <tr key={item.id} style={{ borderBottom: '1px solid #262626' }}>
                              <td style={{ padding: '12px 16px', color: '#a8a8a8' }}>
                                <div>#{item.id}</div>
                                {item.originalMessageId && (
                                  <div style={{ fontSize: '11px', color: '#6b7280' }}>Msg #{item.originalMessageId}</div>
                                )}
                              </td>
                              <td style={{ padding: '12px 16px', maxWidth: '280px', wordBreak: 'break-word' }}>{item.completeMessage}</td>
                              <td style={{ padding: '12px 16px', fontWeight: '700', color: '#ef4444' }}>{item.abusiveWordOrPhrase}</td>
                              <td style={{ padding: '12px 16px' }}>
                                <div>@{item.submittedByUsername || 'user'}</div>
                                {(item.originalSenderUsername || item.originalReceiverUsername) && (
                                  <div style={{ fontSize: '11px', color: '#8b5cf6' }}>
                                    @{item.originalSenderUsername || item.originalSenderId || '?'} → @{item.originalReceiverUsername || item.originalReceiverId || '?'}
                                  </div>
                                )}
                              </td>
                              <td style={{ padding: '12px 16px', color: '#a8a8a8' }}>{formatComplaintDateTime(item.createdAt)}</td>
                              <td style={{ padding: '12px 16px', color: '#a8a8a8' }}>{item.source}</td>
                              <td style={{ padding: '12px 16px' }}>
                                {isApproved ? (
                                  <span style={{ padding: '4px 10px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontSize: '11px', fontWeight: '600', display: 'inline-block' }}>
                                    Approved
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleApproveFeedback(item.id)}
                                    disabled={approvingFeedbackId === item.id}
                                    style={{
                                      padding: '6px 14px',
                                      background: '#8b5cf6',
                                      color: '#ffffff',
                                      border: 'none',
                                      borderRadius: '4px',
                                      fontSize: '12px',
                                      fontWeight: '600',
                                      cursor: approvingFeedbackId === item.id ? 'not-allowed' : 'pointer',
                                      opacity: approvingFeedbackId === item.id ? 0.7 : 1,
                                      transition: 'background 0.2s'
                                    }}
                                  >
                                    {approvingFeedbackId === item.id ? 'Updating...' : 'Update'}
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <>
                <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>Registered Accounts</h2>
                <div style={{ background: '#120c22', border: '1px solid rgba(139, 92, 246, 0.16)', borderRadius: '8px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(139, 92, 246, 0.16)', background: '#18102b' }}>
                        <th style={{ padding: '12px 16px', color: '#a8a8a8', fontWeight: '600' }}>Photo</th>
                        <th style={{ padding: '12px 16px', color: '#a8a8a8', fontWeight: '600' }}>Username</th>
                        <th style={{ padding: '12px 16px', color: '#a8a8a8', fontWeight: '600' }}>Name</th>
                        <th style={{ padding: '12px 16px', color: '#a8a8a8', fontWeight: '600' }}>Gender</th>
                        <th style={{ padding: '12px 16px', color: '#a8a8a8', fontWeight: '600' }}>Email Address</th>
                        <th style={{ padding: '12px 16px', color: '#a8a8a8', fontWeight: '600' }}>Mobile Number</th>
                        <th style={{ padding: '12px 16px', color: '#a8a8a8', fontWeight: '600' }}>Date Created</th>
                        <th style={{ padding: '12px 16px', color: '#a8a8a8', fontWeight: '600' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminUsers.length === 0 ? (
                        <tr>
                          <td colSpan="8" style={{ padding: '24px', textAlign: 'center', color: '#a8a8a8' }}>
                            {adminLoading ? 'Loading user registry...' : 'No accounts registered yet.'}
                          </td>
                        </tr>
                      ) : (
                        adminUsers.map(user => (
                          <tr key={user.id} style={{ borderBottom: '1px solid #262626' }}>
                            <td style={{ padding: '12px 16px' }}>
                              {user.registrationPhoto ? (
                                <img
                                  src={user.registrationPhoto}
                                  alt={`${user.username} registration`}
                                  style={{ width: '48px', height: '36px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #262626', cursor: 'pointer' }}
                                  onClick={() => {
                                    const win = window.open();
                                    win.document.write(`<div style="display:flex;justify-content:center;align-items:center;min-height:100vh;background:#000;"><img src="${user.registrationPhoto}" style="max-width:100%;max-height:100vh;border:1px solid #222;" /></div>`);
                                  }}
                                  title="Click to Zoom"
                                />
                              ) : (
                                <span style={{ fontSize: '11px', color: '#555' }}>N/A</span>
                              )}
                            </td>
                            <td style={{ padding: '12px 16px', fontWeight: '600' }}>{user.username}</td>
                            <td style={{ padding: '12px 16px' }}>{user.name}</td>
                            <td style={{ padding: '12px 16px', color: '#ffffff' }}>{user.gender || 'Not specified'}</td>
                            <td style={{ padding: '12px 16px', color: '#a8a8a8' }}>{user.email || 'Not provided'}</td>
                            <td style={{ padding: '12px 16px', color: '#a8a8a8' }}>{user.mobile || 'Not provided'}</td>
                            <td style={{ padding: '12px 16px', color: '#a8a8a8' }}>
                              {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              {user.username.toUpperCase() !== 'ADMIN' && (
                                <button
                                  onClick={() => {
                                    setAdminError('');
                                    setAdminSuccess('');
                                    setDeleteConfirmUser(user);
                                  }}
                                  style={{ background: '#ed4956', border: 'none', borderRadius: '4px', padding: '6px 12px', color: '#ffffff', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                                >
                                  Delete
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </main>

          {/* CONFIRMATION MODAL OVERLAY */}
          {deleteConfirmUser && (
            <div className="modal-overlay" style={{ zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)' }}>
              <div className="modal-content" style={{ background: '#121212', border: '1px solid #262626', borderRadius: '8px', maxWidth: '400px', padding: '24px', textAlign: 'center', width: '90%' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '12px', color: '#ffffff' }}>Confirm Delete</h3>
                <p style={{ fontSize: '14px', color: '#a8a8a8', lineHeight: '1.5', marginBottom: '24px' }}>
                  Are you sure you want to permanently delete this account?
                </p>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => setDeleteConfirmUser(null)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1px solid #262626',
                      backgroundColor: 'transparent',
                      color: '#ffffff',
                      fontWeight: '600',
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleConfirmDelete(deleteConfirmUser.id)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: '#ed4956',
                      color: '#ffffff',
                      fontWeight: '600',
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    Delete Permanently
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }
  }

  if (!isLoggedIn) {
    return (
      <div className="login-page-container">
        <SafeConnectAuthBackground />
        {isRegistering ? (
          // Registration Form
          <div style={{ background: '#120c24', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: '8px', padding: '40px', width: '350px', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 24px rgba(139, 92, 246, 0.08)' }}>
            <h1 className="logo-text" style={{ fontSize: '30px', marginBottom: '24px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <SafeConnectLogo size={32} />
              <span>SafeConnect</span>
            </h1>
            <p style={{ color: 'var(--ig-text-secondary)', fontSize: '13px', textAlign: 'center', marginBottom: '20px' }}>Register to view developer logs and connect in real-time.</p>
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', alignItems: 'center' }}>
              {/* Circular profile avatar uploader */}
              <div
                onClick={() => registerFileInputRef.current.click()}
                style={{
                  width: '86px',
                  height: '86px',
                  borderRadius: '50%',
                  background: '#121212',
                  border: '2px dashed #262626',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  position: 'relative',
                  marginBottom: '10px'
                }}
                title="Upload Profile Picture"
              >
                {registerAvatar ? (
                  <img
                    src={registerAvatar}
                    alt="Preview"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#0095f6' }}>
                    <PlusSquare size={24} />
                    <span style={{ fontSize: '10px', marginTop: '4px', fontWeight: '600' }}>Photo</span>
                  </div>
                )}
              </div>
              <input
                type="file"
                ref={registerFileInputRef}
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => setRegisterAvatar(reader.result);
                    reader.readAsDataURL(file);
                  }
                }}
                style={{ display: 'none' }}
              />

              <input
                type="text"
                placeholder="Username (e.g. srinitha_b)"
                value={registerUsername}
                onChange={e => setRegisterUsername(e.target.value)}
                style={{ background: '#121212', border: '1px solid #262626', borderRadius: '3px', padding: '9px 11px', color: '#ffffff', fontSize: '12px', outline: 'none', width: '100%' }}
                required
              />
              {/* Email Address */}
              <input
                type="email"
                placeholder="Email Address"
                value={registerEmail}
                onChange={e => setRegisterEmail(e.target.value)}
                style={{ background: '#121212', border: '1px solid #262626', borderRadius: '3px', padding: '9px 11px', color: '#ffffff', fontSize: '12px', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                required
              />

              {/* Mobile Number with OTP Verification */}
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <input
                  type="tel"
                  placeholder="Mobile Number (e.g. 9876543210)"
                  value={registerMobile}
                  onChange={e => {
                    setRegisterMobile(e.target.value);
                    if (mobileVerified || mobileOtpSent) {
                      setMobileVerified(false);
                      setMobileOtpSent(false);
                      setMobileOtp('');
                      setMobileOtpMsg('');
                    }
                  }}
                  style={{ background: '#121212', border: '1px solid #262626', borderRadius: '3px', padding: '9px 11px', color: '#ffffff', fontSize: '12px', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                  required
                />
                {mobileVerified ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#4ade80', fontSize: '12px', fontWeight: '600', padding: '2px 4px' }}>
                    Mobile number verified ✓
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={handleSendMobileOtp}
                        disabled={mobileOtpLoading || mobileCooldown > 0 || !registerMobile.trim()}
                        style={{
                          background: mobileCooldown > 0 || !registerMobile.trim() ? '#262626' : '#0095f6',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '7px 12px',
                          color: '#ffffff',
                          fontSize: '11px',
                          fontWeight: '600',
                          cursor: mobileCooldown > 0 || !registerMobile.trim() ? 'not-allowed' : 'pointer',
                          opacity: mobileCooldown > 0 || !registerMobile.trim() ? 0.7 : 1,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {mobileOtpLoading ? 'Sending...' : mobileCooldown > 0 ? `Resend OTP in ${mobileCooldown}s` : mobileOtpSent ? 'Resend OTP' : 'Send Mobile OTP'}
                      </button>
                    </div>
                    {mobileOtpSent && (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="Enter 6-digit Mobile OTP"
                          value={mobileOtp}
                          onChange={e => setMobileOtp(e.target.value.replace(/\D/g, ''))}
                          style={{ background: '#121212', border: '1px solid #262626', borderRadius: '3px', padding: '7px 11px', color: '#ffffff', fontSize: '12px', outline: 'none', flex: 1, letterSpacing: '2px' }}
                        />
                        <button
                          type="button"
                          onClick={handleVerifyMobileOtp}
                          disabled={mobileOtpLoading || mobileOtp.length !== 6}
                          style={{
                            background: mobileOtp.length === 6 ? '#0095f6' : '#262626',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '7px 14px',
                            color: '#ffffff',
                            fontSize: '11px',
                            fontWeight: '600',
                            cursor: mobileOtp.length === 6 ? 'pointer' : 'not-allowed',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          Verify Mobile OTP
                        </button>
                      </div>
                    )}
                    {mobileOtpMsg && (
                      <div style={{ fontSize: '11px', color: '#0095f6', padding: '0 2px' }}>{mobileOtpMsg}</div>
                    )}
                  </div>
                )}
              </div>
              <input
                type="password"
                placeholder="Password"
                value={registerPassword}
                onChange={e => setRegisterPassword(e.target.value)}
                style={{ background: '#121212', border: '1px solid #262626', borderRadius: '3px', padding: '9px 11px', color: '#ffffff', fontSize: '12px', outline: 'none', width: '100%' }}
                required
              />
              <input
                type="password"
                placeholder="Confirm Password"
                value={registerConfirmPassword}
                onChange={e => setRegisterConfirmPassword(e.target.value)}
                style={{ background: '#121212', border: '1px solid #262626', borderRadius: '3px', padding: '9px 11px', color: '#ffffff', fontSize: '12px', outline: 'none', width: '100%' }}
                required
              />
              <input
                type="text"
                placeholder="Full Name"
                value={registerName}
                onChange={e => setRegisterName(e.target.value)}
                style={{ background: '#121212', border: '1px solid #262626', borderRadius: '3px', padding: '9px 11px', color: '#ffffff', fontSize: '12px', outline: 'none', width: '100%' }}
                required
              />
              <input
                type="text"
                placeholder="Bio Details"
                value={registerBio}
                onChange={e => setRegisterBio(e.target.value)}
                style={{ background: '#121212', border: '1px solid #262626', borderRadius: '3px', padding: '9px 11px', color: '#ffffff', fontSize: '12px', outline: 'none', width: '100%' }}
              />

              {/* Gender selector dropdown */}
              <select
                value={registerGender}
                onChange={e => setRegisterGender(e.target.value)}
                style={{ background: '#121212', border: '1px solid #262626', borderRadius: '3px', padding: '9px 11px', color: registerGender ? '#ffffff' : '#a8a8a8', fontSize: '12px', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                required
              >
                <option value="" disabled style={{ color: '#a8a8a8' }}>Select Gender</option>
                <option value="Male" style={{ color: '#ffffff' }}>Male</option>
                <option value="Female" style={{ color: '#ffffff' }}>Female</option>
                <option value="Other" style={{ color: '#ffffff' }}>Other</option>
                <option value="Prefer not to say" style={{ color: '#ffffff' }}>Prefer not to say</option>
              </select>

              {/* Webcam photo capture container */}
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', border: '1px solid #262626', borderRadius: '4px', padding: '12px', background: '#0a0a0a', boxSizing: 'border-box', gap: '8px' }}>
                <div style={{ fontSize: '11px', color: '#a8a8a8', alignSelf: 'flex-start', fontWeight: '600' }}>
                  Face Image Capture (Mandatory):
                </div>
                {registerPhoto ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%' }}>
                    <img src={registerPhoto} alt="Captured preview" style={{ width: '100%', maxHeight: '140px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #262626' }} />
                    <button
                      type="button"
                      onClick={() => { setRegisterPhoto(null); setRegisterFaceEmbedding(null); startRegisterCamera(); }}
                      style={{ background: 'transparent', border: '1px solid #ed4956', borderRadius: '4px', padding: '5px 12px', color: '#ed4956', fontSize: '11px', fontWeight: '600', cursor: 'pointer', width: '100%' }}
                    >
                      Delete & Retake Photo
                    </button>
                  </div>
                ) : (
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: showRegisterCamera ? 'flex' : 'none', flexDirection: 'column', gap: '8px', width: '100%', alignItems: 'center' }}>
                      <style>{`
                        @keyframes camera-spin {
                          0% { transform: rotate(0deg); }
                          100% { transform: rotate(360deg); }
                        }
                      `}</style>
                      {modelLoading && (
                        <div style={{ padding: '8px', color: '#0095f6', fontSize: '11px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%' }}>
                          <div style={{ border: '2px solid #262626', borderTop: '2px solid #0095f6', borderRadius: '50%', width: '14px', height: '14px', animation: 'camera-spin 1s linear infinite' }} />
                          <span>Initializing security parameters...</span>
                        </div>
                      )}

                      <video
                        ref={registerVideoRef}
                        autoPlay
                        playsInline
                        muted
                        onPlay={handleVideoPlay}
                        style={{ width: '100%', maxHeight: '140px', borderRadius: '4px', border: '1px solid #262626', background: '#000', objectFit: 'cover' }}
                      />

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', padding: '0 4px', minHeight: '16px' }}>
                        {cameraFeedback ? (
                          <div style={{ fontSize: '11px', color: '#ff4d4d', fontWeight: '500', textAlign: 'center' }}>
                            {cameraFeedback}
                          </div>
                        ) : (
                          <div style={{ fontSize: '11px', color: '#0095f6', fontWeight: '500', textAlign: 'center' }}>
                            {blinkInstruction}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                        <button
                          type="button"
                          onClick={stopRegisterCamera}
                          style={{ flex: 1, background: '#262626', border: '1px solid #363636', borderRadius: '4px', padding: '6px', color: '#a8a8a8', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}
                        >
                          Turn Off
                        </button>
                      </div>
                    </div>

                    {!showRegisterCamera && (
                      <button
                        type="button"
                        onClick={startRegisterCamera}
                        style={{ width: '100%', background: '#262626', border: '1px solid #363636', borderRadius: '4px', padding: '8px 10px', color: '#ffffff', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                      >
                        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#0095f6' }}>
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                          <circle cx="12" cy="13" r="4"></circle>
                        </svg>
                        Activate Camera
                      </button>
                    )}
                  </div>
                )}
                <canvas ref={registerCanvasRef} style={{ display: 'none' }} />
              </div>

              <button
                type="submit"
                style={{ background: '#0095f6', border: 'none', borderRadius: '8px', padding: '7px', color: '#ffffff', fontSize: '14px', fontWeight: '600', cursor: 'pointer', marginTop: '10px', width: '100%' }}
              >
                Sign Up
              </button>
            </form>
            {registerError && (
              <p style={{ color: '#ed4956', fontSize: '12px', marginTop: '16px', textAlign: 'center' }}>{registerError}</p>
            )}
          </div>
        ) : (
          // Login Form
          <div style={{ background: '#120c24', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: '8px', padding: '40px', width: '350px', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 24px rgba(139, 92, 246, 0.08)' }}>
            <h1 className="logo-text" style={{ fontSize: '30px', marginBottom: '30px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <SafeConnectLogo size={32} />
              <span>SafeConnect</span>
            </h1>
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '100%' }}>
              <input
                type="text"
                placeholder="Username or Email"
                value={loginUsername}
                onChange={e => setLoginUsername(e.target.value)}
                style={{ background: '#0d081a', border: '1px solid rgba(139, 92, 246, 0.25)', borderRadius: '4px', padding: '9px 11px', color: '#ffffff', fontSize: '12px', outline: 'none' }}
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                style={{ background: '#0d081a', border: '1px solid rgba(139, 92, 246, 0.25)', borderRadius: '4px', padding: '9px 11px', color: '#ffffff', fontSize: '12px', outline: 'none' }}
                required
              />

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#a8a8a8', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                />
                Remember Me
              </label>

              <button
                type="submit"
                style={{ background: '#0095f6', border: 'none', borderRadius: '8px', padding: '7px', color: '#ffffff', fontSize: '14px', fontWeight: '600', cursor: 'pointer', marginTop: '5px' }}
              >
                Log in
              </button>
            </form>
            {loginError && (
              <p style={{ color: '#ed4956', fontSize: '12px', marginTop: '20px', textAlign: 'center' }}>{loginError}</p>
            )}
          </div>
        )}

        <div style={{ background: '#120c24', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: '8px', padding: '20px', width: '350px', marginTop: '10px', textAlign: 'center', fontSize: '14px', color: '#a8a8a8', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)' }}>
          {isRegistering ? (
            <>
              Have an account? <span onClick={() => { setIsRegistering(false); setRegisterError(''); }} style={{ color: '#0095f6', fontWeight: '600', cursor: 'pointer' }}>Log in</span>
            </>
          ) : (
            <>
              Don't have an account? <span onClick={() => { setIsRegistering(true); setLoginError(''); }} style={{ color: '#0095f6', fontWeight: '600', cursor: 'pointer' }}>Sign up</span>
            </>
          )}
        </div>
      </div>
    );
  }

  const showBackButton = activeTab !== 'home';

  return (
    <div className="app-container">
      {/* MOBILE HEADER */}
      <header className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {showBackButton && (
            <button className="back-btn" onClick={handleBack}>
              <ArrowLeft size={22} />
            </button>
          )}
          <span
            className="mobile-header-logo"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
            onClick={() => handleTabClick('home')}
          >
            <SafeConnectLogo size={22} />
            <span>SafeConnect</span>
          </span>
        </div>
      </header>

      {/* LEFT SIDEBAR NAVIGATION */}
      <nav className="sidebar">
        <div
          className="logo-container"
          style={{ gap: '8px', cursor: 'pointer' }}
          onClick={() => handleTabClick('home')}
          title="SafeConnect Home"
        >
          {showBackButton && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleBack();
              }}
              className="sidebar-back-btn"
              title="Go Back"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <SafeConnectLogo size={24} />
          <span className="logo-text">SafeConnect</span>
        </div>

        <ul className="nav-menu">
          <li
            className={`nav-item ${activeTab === 'home' ? 'active' : ''}`}
            onClick={() => handleTabClick('home')}
            id="nav-home-btn"
          >
            <Home size={24} strokeWidth={activeTab === 'home' ? 3 : 2} />
            <span className="nav-label">Home</span>
          </li>

          <li
            className={`nav-item ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => handleTabClick('search')}
            id="nav-search-btn"
          >
            <Search size={24} strokeWidth={activeTab === 'search' ? 3 : 2} />
            <span className="nav-label">Search</span>
          </li>

          <li
            className={`nav-item ${activeTab === 'explore' ? 'active' : ''}`}
            onClick={() => handleTabClick('explore')}
            id="nav-explore-btn"
          >
            <Compass size={24} strokeWidth={activeTab === 'explore' ? 3 : 2} />
            <span className="nav-label">Explore</span>
          </li>

          <li
            className={`nav-item ${activeTab === 'messages' ? 'active' : ''}`}
            onClick={() => handleTabClick('messages')}
            id="nav-chat-btn"
            style={{ position: 'relative' }}
          >
            <MessageSquare size={24} strokeWidth={activeTab === 'messages' ? 3 : 2} />
            {inboxUsers.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0) > 0 && (
              <span style={{ position: 'absolute', top: '10px', left: '26px', background: '#ff3040', color: 'white', fontSize: '10px', fontWeight: 'bold', padding: '1px 5px', borderRadius: '10px', border: '2px solid black' }}>
                {inboxUsers.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0)}
              </span>
            )}
            <span className="nav-label">Messages</span>
          </li>

          <li
            className={`nav-item ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => handleTabClick('notifications')}
            id="nav-notifications-btn"
            style={{ position: 'relative' }}
          >
            <Heart size={24} strokeWidth={activeTab === 'notifications' ? 3 : 2} />
            {unreadNotificationsCount > 0 && (
              <span style={{ position: 'absolute', top: '10px', left: '26px', background: '#ff3040', color: 'white', fontSize: '10px', fontWeight: 'bold', padding: '1px 5px', borderRadius: '10px', border: '2px solid black' }}>
                {unreadNotificationsCount}
              </span>
            )}
            <span className="nav-label">Notifications</span>
          </li>

          <li
            className="nav-item"
            onClick={() => setShowUploadModal(true)}
            id="nav-upload-btn"
          >
            <PlusSquare size={24} />
            <span className="nav-label">Create</span>
          </li>

          <li
            className={`nav-item ${activeTab === 'profile' && viewingProfile === currentUser.username ? 'active' : ''}`}
            onClick={() => { handleTabClick('profile'); setViewingProfile(currentUser.username); }}
            id="nav-profile-btn"
          >
            <User size={24} strokeWidth={activeTab === 'profile' && viewingProfile === currentUser.username ? 3 : 2} />
            <span className="nav-label">Profile</span>
          </li>
        </ul>

        {/* Sidebar Footer Menu */}
        <div className="sidebar-footer" style={{ position: 'relative', marginTop: 'auto' }}>
          {showMoreMenu && (
            <div className="more-menu-popover" style={{
              position: 'absolute',
              bottom: '55px',
              left: '0',
              width: '220px',
              background: '#121212',
              border: '1px solid #262626',
              borderRadius: '16px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              zIndex: '1000',
              padding: '8px'
            }}>
              <div
                className="more-menu-item"
                style={{ padding: '12px 16px', cursor: 'pointer', borderRadius: '8px', fontSize: '14px', transition: 'background 0.15s', color: 'white' }}
                onClick={() => { alert('Settings - Local Storage Database Active'); setShowMoreMenu(false); }}
                onMouseEnter={(e) => e.target.style.background = '#262626'}
                onMouseLeave={(e) => e.target.style.background = 'transparent'}
              >
                Settings
              </div>
              <div
                className="more-menu-item"
                style={{ padding: '12px 16px', cursor: 'pointer', borderRadius: '8px', fontSize: '14px', transition: 'background 0.15s', color: 'white' }}
                onClick={() => { setActiveTab('complaints'); fetchUserComplaints(); setShowMoreMenu(false); }}
                onMouseEnter={(e) => e.target.style.background = '#262626'}
                onMouseLeave={(e) => e.target.style.background = 'transparent'}
              >
                Complaints
              </div>
              <div style={{ height: '1px', background: '#262626', margin: '4px 0' }} />
              <div
                className="more-menu-item"
                style={{ padding: '12px 16px', cursor: 'pointer', borderRadius: '8px', fontSize: '14px', color: '#ed4956', transition: 'background 0.15s' }}
                onClick={handleLogout}
                onMouseEnter={(e) => e.target.style.background = '#262626'}
                onMouseLeave={(e) => e.target.style.background = 'transparent'}
              >
                Log out
              </div>
            </div>
          )}
          <div
            className="nav-item"
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px', borderRadius: '8px', cursor: 'pointer' }}
          >
            <Menu size={24} />
            <span className="nav-label">More</span>
          </div>
        </div>
      </nav>

      {/* MAIN CONTENT SPACE */}
      <main className="main-content">
        <div className="content-wrapper">

          {/* HOME TAB VIEW */}
          {activeTab === 'home' && (
            <>
              {/* Centered post feed */}
              <div className="feed-container">
                {/* Stories panel */}
                <div className="stories-bar">
                  <div className="story-item" onClick={() => handleProfileView(currentUser.username)}>
                    <div className="story-avatar-container">
                      <img src={currentUser.avatar} alt={currentUser.name} />
                    </div>
                    <span className="story-username">Your Story</span>
                  </div>

                  {storyUsers.map(u => (
                    <div key={u.id} className="story-item" onClick={() => handleProfileView(u.username)}>
                      <div className="story-avatar-container">
                        <img src={u.avatar} alt={u.username} />
                      </div>
                      <span className="story-username" style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '74px' }}>
                        {u.username}
                      </span>
                    </div>
                  ))}
                </div>

                {/* POST FEED LIST */}
                {feedPosts.length === 0 ? (
                  <p style={{ color: 'var(--ig-text-secondary)', textAlign: 'center', marginTop: '40px' }}>No posts available.</p>
                ) : (
                  feedPosts.map(post => (
                    <div key={post.id} className="post-card">
                      <div className="post-header">
                        <div className="post-author-info" onClick={() => handleProfileView(post.username)}>
                          <img className="post-author-avatar" src={post.user_avatar} alt={post.username} />
                          <span className="post-author-name">{post.username}</span>
                          <span style={{ color: 'var(--ig-text-secondary)' }}>•</span>
                          <span className="post-time">
                            {new Date(post.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {post.username === currentUser.username && (
                            <>
                              <button
                                onClick={() => { setEditingPostId(post.id); setEditingPostCaption(post.caption || ''); }}
                                style={{ background: 'none', border: 'none', color: '#0095f6', fontSize: '12px', cursor: 'pointer' }}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeletePost(post.id)}
                                style={{ background: 'none', border: 'none', color: '#ff3040', fontSize: '12px', cursor: 'pointer' }}
                              >
                                Delete
                              </button>
                            </>
                          )}
                          <button className="post-dots"><MoreHorizontal size={18} /></button>
                        </div>
                      </div>

                      {/* Display Post Content based on type */}
                      {post.type === 'image' && (
                        <div className="post-image-container">
                          <img className="post-image" src={resolveImage(post.img)} alt="Post Visual" />
                        </div>
                      )}

                      {post.type === 'caesar' && (
                        <div style={{ padding: '24px', background: '#1c1c1e', border: '1px solid var(--ig-border)', borderRadius: '4px', textAlign: 'center', fontFamily: 'monospace', fontSize: '18px', color: '#0095f6' }}>
                          "Teb ilso zliwha lz zljbyl"<br />
                          <span style={{ fontSize: '12px', color: 'var(--ig-text-secondary)' }}>(Caesar Shift: 7)</span>
                        </div>
                      )}

                      {post.type === 'code' && (
                        <div style={{ padding: '20px', background: '#090d16', border: '1px solid #1f2937', borderRadius: '4px', fontFamily: 'monospace', fontSize: '13px', color: '#10b981', lineHeight: '1.5' }}>
                          # MEMORY BUFFER SYSTEM DIAGNOSTIC<br />
                          ptr = malloc(payload_size);<br />
                          if (ptr == NULL) return ERROR_OOM;<br />
                          memcpy(ptr, user_input, payload_size); // Bounds checked
                        </div>
                      )}

                      {post.type === 'text' && (
                        <div style={{ padding: '20px', background: '#121212', border: '1px solid var(--ig-border)', borderRadius: '4px', fontSize: '15px', color: 'white', lineHeight: '1.5' }}>
                          {post.content}
                        </div>
                      )}

                      {post.type === 'gradient' && (
                        <div style={{ background: 'linear-gradient(135deg, #121026, #2d0b3a)', padding: '24px', borderRadius: '4px', border: '1px solid var(--ig-border)', minHeight: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                          <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>{post.title}</h4>
                          <p style={{ fontSize: '14px', color: 'var(--ig-text-primary)' }}>{post.content}</p>
                        </div>
                      )}

                      <div className="post-actions-row">
                        <div className="post-actions-left">
                          <button
                            className={`post-action-btn ${post.isLiked ? 'liked' : ''}`}
                            onClick={() => handleLike(post.id)}
                          >
                            <Heart size={24} fill={post.isLiked ? '#ed4956' : 'none'} stroke={post.isLiked ? '#ed4956' : 'currentColor'} />
                          </button>
                          <button className="post-action-btn" onClick={() => { setActiveChatUser(post.username); handleTabClick('messages'); }}>
                            <MessageCircle size={24} />
                          </button>
                          <button className="post-action-btn"><Send size={24} /></button>
                        </div>
                        <button
                          className="post-action-btn"
                          onClick={() => handleBookmark(post.id)}
                          style={{ color: bookmarkedPosts[post.id] ? 'white' : 'inherit' }}
                        >
                          <Bookmark size={24} fill={bookmarkedPosts[post.id] ? 'white' : 'none'} />
                        </button>
                      </div>

                      <div className="post-likes-count">{post.likesCount || 0} likes</div>

                      {editingPostId === post.id ? (
                        <div style={{ padding: '8px 12px', display: 'flex', gap: '8px' }}>
                          <input
                            type="text"
                            value={editingPostCaption}
                            onChange={e => setEditingPostCaption(e.target.value)}
                            style={{ background: '#121212', border: '1px solid #262626', borderRadius: '4px', padding: '6px', color: 'white', flex: 1, fontSize: '13px' }}
                          />
                          <button onClick={() => handleSavePostCaption(post.id)} style={{ background: '#0095f6', border: 'none', borderRadius: '4px', padding: '6px 12px', color: 'white', cursor: 'pointer', fontSize: '12px' }}>Save</button>
                          <button onClick={() => setEditingPostId(null)} style={{ background: '#262626', border: 'none', borderRadius: '4px', padding: '6px 12px', color: 'white', cursor: 'pointer', fontSize: '12px' }}>Cancel</button>
                        </div>
                      ) : (
                        post.caption && (
                          <div className="post-caption">
                            <span className="post-caption-author" onClick={() => handleProfileView(post.username)}>{post.username}</span>
                            {post.caption}
                          </div>
                        )
                      )}

                      {post.comments && post.comments.map(c => (
                        <div key={c.id} className="post-comment-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span className="post-comment-author" onClick={() => handleProfileView(c.username)}>@{c.username}</span>
                            <span style={{ color: 'var(--ig-text-primary)' }}>{c.text}</span>
                          </div>
                          {c.username === currentUser.username && (
                            <button
                              onClick={() => handleDeleteComment(c.id)}
                              style={{ background: 'none', border: 'none', color: '#ff3040', fontSize: '11px', cursor: 'pointer', marginLeft: 'auto' }}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      ))}

                      <div className="post-comment-input-bar">
                        <input
                          type="text"
                          placeholder="Add a comment..."
                          className="post-comment-input"
                          value={newCommentText[post.id] || ''}
                          onChange={e => setNewCommentText({ ...newCommentText, [post.id]: e.target.value })}
                          onKeyDown={e => e.key === 'Enter' && handleAddComment(post.id)}
                        />
                        <button
                          className="post-comment-submit-btn"
                          disabled={!newCommentText[post.id]?.trim()}
                          onClick={() => handleAddComment(post.id)}
                        >
                          Post
                        </button>
                      </div>
                    </div>
                  ))
                )}

              </div>

              {/* RIGHT SIDEBAR SUGGESTIONS (desktop-only) */}
              <div className="sidebar-suggestions">
                <div className="suggestions-section-header">
                  <span className="suggestions-title">Suggestions for you</span>
                  <button className="see-all-btn">See All</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {suggestions.length === 0 ? (
                    <p style={{ color: 'var(--ig-text-secondary)', fontSize: '12px' }}>No new suggestions.</p>
                  ) : (
                    suggestions.map(sug => (
                      <div key={sug.id} className="suggestion-item-card" onClick={() => handleProfileView(sug.username)} style={{ cursor: 'pointer' }}>
                        <div className="suggestion-item-info">
                          <img className="suggestion-item-avatar" src={sug.avatar} alt={sug.username} />
                          <div className="suggestion-item-details">
                            <span className="suggestion-item-username">{sug.username}</span>
                            <span className="suggestion-item-reason">{sug.name}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="footer-copyright">
                  About • Help • Press • API • Jobs • Privacy • Terms • Locations • Language<br /><br />
                  © 2026 INSTAGRAM CLONE BY ANTIGRAVITY
                </div>
              </div>
            </>
          )}

          {/* SEARCH TAB VIEW */}
          {activeTab === 'search' && (
            <div style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="explore-search-bar" style={{ maxWidth: '100%' }}>
                <Search size={18} color="var(--ig-text-secondary)" style={{ alignSelf: 'center' }} />
                <input
                  type="text"
                  placeholder="Search user profiles..."
                  className="explore-search-input"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {searchResults.length === 0 ? (
                  <p style={{ color: 'var(--ig-text-secondary)', fontSize: '14px', textAlign: 'center', marginTop: '20px' }}>No users match search.</p>
                ) : (
                  searchResults.map(user => (
                    <div key={user.id} className="suggestion-item-card" style={{ padding: '8px 4px' }} onClick={() => handleProfileView(user.username)}>
                      <div className="suggestion-item-info">
                        <img className="suggestion-item-avatar" src={user.avatar} alt={user.name} />
                        <div className="suggestion-item-details">
                          <span className="suggestion-item-username">{user.username}</span>
                          <span className="suggestion-item-reason">{user.name}</span>
                        </div>
                      </div>
                      <button
                        className="profile-edit-btn"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        onClick={(e) => { e.stopPropagation(); setActiveChatUser(user.username); handleTabClick('messages'); }}
                      >
                        Message
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* EXPLORE TAB VIEW */}
          {activeTab === 'explore' && (
            <div className="explore-container">
              <div className="explore-header-row">
                <span className="explore-title">Explore</span>
              </div>
              <div className="explore-grid">
                {feedPosts.map(p => (
                  <div key={p.id} className="explore-grid-item" onClick={() => handleProfileView(p.username)}>
                    {p.type === 'image' && <img src={resolveImage(p.img)} alt={p.caption} />}
                    {p.type === 'caesar' && (
                      <div style={{ background: '#1c1c1e', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '12px', textAlign: 'center' }}>
                        <span style={{ fontSize: '13px', color: '#0095f6', fontFamily: 'monospace' }}>"Teb ilso zliwha..."</span>
                      </div>
                    )}
                    {p.type === 'code' && (
                      <div style={{ background: '#090d16', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justify: 'center', padding: '12px', textAlign: 'center' }}>
                        <span style={{ fontSize: '11px', color: '#10b981', fontFamily: 'monospace' }}>ptr = malloc(...)</span>
                      </div>
                    )}
                    {p.type === 'text' && (
                      <div style={{ background: '#1c1c1e', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px', fontSize: '11px', textAlign: 'center' }}>
                        {p.content}
                      </div>
                    )}
                    {p.type === 'gradient' && (
                      <div style={{ background: 'linear-gradient(135deg, #121026, #2d0b3a)', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '14px', fontSize: '11px', textAlign: 'center' }}>
                        <strong>{p.title}</strong>
                      </div>
                    )}
                    <div className="explore-item-overlay">
                      <span className="overlay-stat"><Heart size={18} fill="white" /> {p.likesCount || 0}</span>
                      <span className="overlay-stat"><MessageCircle size={18} fill="white" /> {p.comments?.length || 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MESSAGES TAB VIEW */}
          {activeTab === 'messages' && (
            <div className="inbox-container">

              {/* Inbox lists */}
              <div className="inbox-list">
                <div className="inbox-list-header">
                  <span className="inbox-title-text">{currentUser.name}</span>
                </div>
                <div className="inbox-users-scroller">
                  {inboxUsers.map(chat => (
                    <div
                      key={chat.id}
                      className={`inbox-user-card ${activeChatUser === chat.username ? 'active' : ''} ${chat.unreadCount > 0 ? 'unread' : ''}`}
                      style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 20px',
                        borderLeft: chat.unreadCount > 0 ? '4px solid var(--ig-primary-button)' : 'none',
                        background: chat.unreadCount > 0 ? 'rgba(0, 149, 246, 0.05)' : ''
                      }}
                      onClick={() => setActiveChatUser(chat.username)}
                      onDoubleClick={() => handleDeleteChat(chat.username)}
                      title="Double-click to delete conversation"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                        <img className="inbox-user-avatar" src={chat.avatar} alt={chat.name} />
                        <div className="inbox-user-info" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                          <span className="inbox-user-username" style={{ fontWeight: chat.unreadCount > 0 ? 'bold' : 'normal' }}>{chat.name}</span>
                          <span className="inbox-user-preview-text" style={{
                            fontWeight: chat.unreadCount > 0 ? '600' : 'normal',
                            color: chat.unreadCount > 0 ? 'var(--ig-text-primary)' : 'var(--ig-text-secondary)'
                          }}>
                            {chat.unreadCount > 0 ? (
                              chat.unreadCount === 1 ? 'sent message' : '1+ messages'
                            ) : chat.lastMessage ? (
                              chat.lastMessage.image ? 'Attachment image' : chat.lastMessage.text
                            ) : 'No messages yet'}
                          </span>
                        </div>
                      </div>
                      {chat.unreadCount > 0 && (
                        <div style={{
                          background: 'var(--ig-primary-button)',
                          color: '#fff',
                          borderRadius: '12px',
                          padding: '2px 8px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          minWidth: '20px',
                          textAlign: 'center',
                          marginLeft: '8px'
                        }}>
                          {chat.unreadCount} New
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Message thread details */}
              <div className="chat-pane">
                {activeChatUser ? (
                  <>
                    {/* Chat Pane Header showing recipient avatar */}
                    <div
                      className="chat-pane-header"
                      onClick={() => handleProfileView(activeChatUser)}
                      style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 24px', borderBottom: '1px solid var(--ig-border)', cursor: 'pointer' }}
                    >
                      <img
                        src={inboxUsers.find(u => u.username === activeChatUser)?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                        alt={activeChatUser}
                        style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <span className="chat-header-username" style={{ fontWeight: '600' }}>{activeChatUser}</span>
                    </div>

                    <div className="chat-messages-container">
                      {chatMessages.length === 0 ? (
                        <p style={{ color: 'var(--ig-text-secondary)', textAlign: 'center', margin: 'auto' }}>No messages in thread yet. Start the conversation!</p>
                      ) : (
                        chatMessages.map(m => (
                          <div
                            key={m.id}
                            className={`message-wrapper ${m.sender_id === currentUser.id ? 'sent' : 'received'}`}
                            style={{
                              display: 'flex',
                              flexDirection: 'row',
                              alignItems: 'flex-end',
                              gap: '8px',
                              maxWidth: '70%',
                              alignSelf: m.sender_id === currentUser.id ? 'flex-end' : 'flex-start',
                              position: 'relative'
                            }}
                          >
                            {/* Render sender avatar next to bubble */}
                            {m.sender_id !== currentUser.id && (
                              <img
                                src={inboxUsers.find(u => u.id === m.sender_id)?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                                alt="avatar"
                                style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', marginBottom: '2px' }}
                              />
                            )}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: m.sender_id === currentUser.id ? 'flex-end' : 'flex-start' }}>
                              <div
                                className={`ig-message-bubble ${m.sender_id === currentUser.id ? 'sent' : 'received'}`}
                                onDoubleClick={() => {
                                  if (m.sender_id !== currentUser.id) {
                                    handleOpenFeedbackModal(m);
                                  }
                                }}
                                onTouchEnd={(e) => handleMessageTouchEnd(e, m)}
                                style={{ cursor: m.sender_id !== currentUser.id ? 'pointer' : 'default' }}
                                title={m.sender_id !== currentUser.id ? "Double-click to add to abusive dataset" : undefined}
                              >
                                {m.text}
                                {m.image && (
                                  <img
                                    src={m.image}
                                    alt="Sent attachment"
                                    style={{
                                      maxWidth: '240px',
                                      maxHeight: '240px',
                                      borderRadius: '12px',
                                      display: 'block',
                                      marginTop: '6px'
                                    }}
                                  />
                                )}
                              </div>
                              {m.isFlagged && m.sender_id !== currentUser.id && m.receiverDecision === 'PENDING' && (
                                <div className="abuse-receiver-banner" style={{
                                  marginTop: '6px',
                                  padding: '8px 12px',
                                  borderRadius: '8px',
                                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                  border: '1px solid rgba(239, 68, 68, 0.2)',
                                  fontSize: '11px',
                                  color: 'var(--ig-primary-button)',
                                  maxWidth: '280px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '6px',
                                  alignSelf: 'flex-start'
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
                                    <span>⚠️</span>
                                    <span>This message has been identified as potentially abusive.</span>
                                  </div>
                                  <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
                                    <button
                                      onClick={() => handleAllowMessage(m.id)}
                                      style={{
                                        padding: '4px 10px',
                                        fontSize: '10px',
                                        backgroundColor: 'var(--ig-primary-button)',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        margin: 0
                                      }}
                                    >
                                      Allow
                                    </button>
                                    <button
                                      onClick={() => handleReportMessage(m.id)}
                                      style={{
                                        padding: '4px 10px',
                                        fontSize: '10px',
                                        backgroundColor: 'transparent',
                                        color: 'var(--ig-text-primary)',
                                        border: '1px solid var(--ig-border)',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        margin: 0
                                      }}
                                    >
                                      Report
                                    </button>
                                  </div>
                                </div>
                              )}
                              {m.isFlagged && m.sender_id === currentUser.id && (
                                <span style={{ fontSize: '9px', color: '#ef4444', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  ⚠️ AI Flagged {m.receiverDecision ? `(${m.receiverDecision})` : ''}
                                </span>
                              )}
                              {m.sender_id === currentUser.id && (
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px' }}>
                                  <span style={{ fontSize: '10px', color: 'var(--ig-text-secondary)', cursor: 'default' }}>
                                    {m.status === 'read' ? 'Read' : 'Sent'}
                                  </span>
                                  <button
                                    className="unsend-btn"
                                    onClick={() => handleUnsendMessage(m.id)}
                                    style={{ margin: 0, opacity: 1 }}
                                  >
                                    Unsend
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}

                      {isAiTyping && (
                        <div className="message-wrapper received" style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-end', gap: '8px' }}>
                          <img
                            src={inboxUsers.find(u => u.username === activeChatUser)?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                            alt="avatar"
                            style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', marginBottom: '2px' }}
                          />
                          <div className="ig-message-bubble received" style={{ color: 'var(--ig-text-secondary)', fontStyle: 'italic' }}>
                            typing...
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>

                    <div className="chat-input-row">
                      <div className="chat-input-container">
                        {/* Send Image Attachment Button */}
                        <label className="post-action-btn" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                          <ImageIcon size={22} color="var(--ig-text-primary)" />
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={handleImageAttachment}
                          />
                        </label>

                        <input
                          type="text"
                          placeholder={activeChatUser === currentUser.username ? 'Type "help" or ask notes...' : 'Message...'}
                          className="chat-input-field"
                          value={typedMessage}
                          onChange={e => setTypedMessage(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && !isImageModerating && handleSendMessage()}
                        />
                        <button
                          className="chat-send-btn"
                          disabled={(!typedMessage.trim() && !uploadedImageBase64) || isImageModerating}
                          onClick={handleSendMessage}
                        >
                          {isImageModerating ? 'Checking...' : 'Send'}
                        </button>
                      </div>
                      {uploadedImageBase64 && (
                        <div style={{ position: 'relative', marginTop: '8px', width: 'fit-content' }}>
                          <img src={uploadedImageBase64} alt="upload preview" style={{ height: '50px', borderRadius: '4px', border: '1px solid var(--ig-border)' }} />
                          <button onClick={() => setUploadedImageBase64(null)} style={{ position: 'absolute', top: '-6px', right: '-6px', background: 'red', color: 'white', border: 'none', borderRadius: '50%', width: '16px', height: '16px', fontSize: '9px', cursor: 'pointer' }}>X</button>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--ig-text-secondary)' }}>
                    Select a conversation to start chatting.
                  </div>
                )}

              </div>

            </div>
          )}

          {/* NOTIFICATIONS TAB VIEW */}
          {activeTab === 'notifications' && (
            <div style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>Notifications</h2>
                {notifications.some(n => !(n.type === 'ai_flagged' || n.type === 'AI_FLAGGED_MESSAGE' || n.type === 'ADMIN_WARNING')) && (
                  <button
                    onClick={handleClearNotifications}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ed4956',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Trash2 size={16} /> Delete All
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: '#000000', border: '1px solid #262626', borderRadius: '8px', padding: '16px' }}>
                {notifications.length === 0 ? (
                  <p style={{ color: 'var(--ig-text-secondary)', textAlign: 'center', padding: '20px 0' }}>No notifications yet.</p>
                ) : (
                  notifications.map(n => {
                    const decision = n.receiverDecision?.toUpperCase();
                    const isAiAbuseAlert = n.type === 'ai_flagged' || n.type === 'AI_FLAGGED_MESSAGE';
                    const isAdminWarning = n.type === 'ADMIN_WARNING';
                    return (
                      <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0', borderBottom: '1px solid #121212' }}>
                        <img src={n.sender_avatar} alt={n.sender_username} style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', cursor: 'pointer' }} onClick={() => handleProfileView(n.sender_username)} />
                        <div style={{ flex: '1', fontSize: '14px' }}>
                          {isAdminWarning ? (
                            <div className="admin-warning-notification-card">
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', fontSize: '14px', color: '#f59e0b', marginBottom: '4px' }}>
                                <span>⚠️</span>
                                <span>{n.title || 'Official Warning'}</span>
                              </div>
                              <div style={{ color: '#f3f4f6', fontSize: '13px', lineHeight: '1.4' }}>
                                {n.message || n.text}
                              </div>
                            </div>
                          ) : n.title ? (
                            <>
                              <div style={{ fontWeight: '600', color: 'var(--ig-text-primary)', fontSize: '14px' }}>{n.title}</div>
                              <div style={{ color: 'var(--ig-text-secondary)', fontSize: '13px', marginTop: '2px' }}>{n.text}</div>
                            </>
                          ) : (
                            <>
                              <span style={{ fontWeight: '600', cursor: 'pointer' }} onClick={() => handleProfileView(n.sender_username)}>
                                {n.sender_username}
                              </span>{' '}
                              <span style={{ color: 'var(--ig-text-primary)' }}>{n.text}</span>
                            </>
                          )}
                          <div style={{ fontSize: '12px', color: 'var(--ig-text-secondary)', marginTop: '4px' }}>
                            {new Date(n.created_at).toLocaleDateString()}
                          </div>
                          {isAiAbuseAlert && n.messageSenderId !== currentUser.id && (
                            (!decision || decision === 'PENDING' || decision === 'ALLOWED') ? (
                              <div className="abuse-notification-warning" style={{
                                marginTop: '8px',
                                padding: '10px 12px',
                                borderRadius: '8px',
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                fontSize: '12px',
                                color: 'var(--ig-text-primary)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
                                  <span>⚠️</span>
                                  <span>This message has been identified as potentially abusive.</span>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
                                  <button
                                    onClick={() => handleAllowMessage(n.message_id)}
                                    style={{
                                      padding: '4px 12px',
                                      fontSize: '11px',
                                      backgroundColor: 'var(--ig-primary-button)',
                                      color: '#fff',
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      margin: 0
                                    }}
                                  >
                                    Allow
                                  </button>
                                  <button
                                    onClick={() => handleReportMessage(n.message_id)}
                                    style={{
                                      padding: '4px 12px',
                                      fontSize: '11px',
                                      backgroundColor: 'transparent',
                                      color: 'var(--ig-text-primary)',
                                      border: '1px solid var(--ig-border)',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      margin: 0
                                    }}
                                  >
                                    Report
                                  </button>
                                </div>
                              </div>
                            ) : decision === 'REPORTED' ? (
                              <div style={{ marginTop: '8px', color: '#ef4444', fontWeight: '600', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span>✔ Reported</span>
                              </div>
                            ) : null
                          )}
                        </div>
                        {!isAiAbuseAlert && !isAdminWarning ? (
                          <button
                            onClick={() => handleDeleteNotification(n.id)}
                            style={{ background: 'none', border: 'none', padding: '6px', color: '#ed4956', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', outline: 'none' }}
                            className="delete-notif-btn"
                            title="Delete notification"
                          >
                            <Trash2 size={16} />
                          </button>
                        ) : (
                          <div style={{ width: '28px' }} />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* PROFILE TAB VIEW */}
          {activeTab === 'profile' && profileData && (
            <div className="profile-container">

              <div className="profile-header-section">
                <div className="profile-avatar-wrapper">
                  <img className="profile-avatar-img" src={profileData.avatar} alt={profileData.name} />
                </div>

                <div className="profile-details-wrapper">
                  <div className="profile-row-1">
                    <span className="profile-title-username">{profileData.username}</span>
                    {profileData.username === currentUser.username ? (
                      <button
                        className="profile-edit-btn"
                        onClick={() => {
                          setIsEditingProfile(!isEditingProfile);
                          setProfileAvatarPreview(currentUser.avatar);
                        }}
                      >
                        {isEditingProfile ? 'Cancel Edit' : 'Edit Profile'}
                      </button>
                    ) : (
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          className="profile-edit-btn"
                          style={{ background: profileData.isFollowing ? '#262626' : '#0095f6', color: 'white' }}
                          onClick={() => handleFollowToggle(profileData.id)}
                        >
                          {profileData.isFollowing ? 'Followed' : 'Follow'}
                        </button>
                        <button
                          className="profile-edit-btn"
                          onClick={() => { setActiveChatUser(profileData.username); handleTabClick('messages'); }}
                        >
                          Message
                        </button>
                      </div>
                    )}
                  </div>

                  <ul className="profile-row-2">
                    <li><span className="profile-stat-number">{profileData.postsCount}</span> posts</li>
                    <li><span className="profile-stat-number">{profileData.followersCount}</span> followers</li>
                    <li><span className="profile-stat-number">{profileData.followingCount}</span> following</li>
                  </ul>

                  <div className="profile-row-3">
                    <div className="profile-fullname">{profileData.name}</div>
                    <p style={{ whiteSpace: 'pre-wrap', color: 'var(--ig-text-secondary)' }}>{profileData.bio}</p>
                  </div>

                  {isEditingProfile && profileData.username === currentUser.username && (
                    <div className="profile-edit-form" style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <label style={{ fontSize: '12px', color: 'var(--ig-text-secondary)' }}>Update Profile Picture</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarSelect}
                        style={{ fontSize: '12px' }}
                      />
                      {profileAvatarPreview && (
                        <img
                          src={profileAvatarPreview}
                          alt="Avatar Preview"
                          style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover', marginTop: '4px' }}
                        />
                      )}

                      <label style={{ fontSize: '12px', color: 'var(--ig-text-secondary)' }}>Username</label>
                      <input
                        type="text"
                        value={profileUsernameInput}
                        onChange={e => setProfileUsernameInput(e.target.value)}
                        className="edit-input-field"
                      />

                      <label style={{ fontSize: '12px', color: 'var(--ig-text-secondary)' }}>Full Name</label>
                      <input
                        type="text"
                        value={profileNameInput}
                        onChange={e => setProfileNameInput(e.target.value)}
                        className="edit-input-field"
                      />
                      <label style={{ fontSize: '12px', color: 'var(--ig-text-secondary)' }}>Bio Details</label>
                      <textarea
                        rows={3}
                        value={profileBioInput}
                        onChange={e => setProfileBioInput(e.target.value)}
                        className="edit-input-field"
                        style={{ resize: 'vertical' }}
                      />
                      <button
                        className="profile-edit-btn"
                        style={{ background: '#0095f6', width: 'fit-content' }}
                        onClick={handleSaveProfile}
                      >
                        Save
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Square posts grid layout / Private Account Lock */}
              {profileData.username === currentUser.username || profileData.isFollowing === true ? (
                <div>
                  {/* Grid categories tabs */}
                  <div className="profile-tabs-header">
                    <span className="profile-tab-item active">Posts</span>
                    <span className="profile-tab-item">Reels</span>
                    <span className="profile-tab-item">Saved</span>
                    <span className="profile-tab-item">Tagged</span>
                  </div>
                  <div className="profile-posts-grid">
                    {profileData.posts.map(p => (
                      <div key={p.id} className="profile-post-item" onClick={() => handleTabClick('home')}>
                        {p.type === 'image' && <img src={resolveImage(p.img)} alt={p.caption} />}
                        {p.type === 'caesar' && (
                          <div style={{ background: '#1c1c1e', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '12px', textAlign: 'center' }}>
                            <span style={{ fontSize: '13px', color: '#0095f6', fontFamily: 'monospace' }}>"Teb ilso zliwha..."</span>
                          </div>
                        )}
                        {p.type === 'code' && (
                          <div style={{ background: '#090d16', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justify: 'center', padding: '12px', textAlign: 'center' }}>
                            <span style={{ fontSize: '11px', color: '#10b981', fontFamily: 'monospace' }}>ptr = malloc(...)</span>
                          </div>
                        )}
                        {p.type === 'text' && (
                          <div style={{ background: '#1c1c1e', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px', fontSize: '11px', textAlign: 'center' }}>
                            {p.content}
                          </div>
                        )}
                        {p.type === 'gradient' && (
                          <div style={{ background: 'linear-gradient(135deg, #121026, #2d0b3a)', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '14px', fontSize: '11px', textAlign: 'center' }}>
                            <strong>{p.title}</strong>
                          </div>
                        )}
                        <div className="explore-item-overlay">
                          <span className="overlay-stat"><Heart size={18} fill="white" /> 124</span>
                          <span className="overlay-stat"><MessageCircle size={18} fill="white" /> 4</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', borderTop: '1px solid var(--ig-border)', marginTop: '20px', gap: '12px' }}>
                  <div style={{ border: '2px solid var(--ig-text-primary)', borderRadius: '50%', padding: '16px', display: 'flex', alignItems: 'center', justify: 'center' }}>
                    <Lock size={32} />
                  </div>
                  <h3 style={{ fontSize: '16px', fontWeight: '600' }}>This Account is Private</h3>
                  <p style={{ fontSize: '14px', color: 'var(--ig-text-secondary)', textAlign: 'center' }}>Follow this account to see their photos and videos.</p>
                </div>
              )}

            </div>
          )}

          {/* COMPLAINTS TAB VIEW */}
          {activeTab === 'complaints' && (
            <div className="profile-container" style={{ padding: '24px', maxWidth: '600px', margin: '0 auto', color: 'white' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #262626', paddingBottom: '16px' }}>
                <h2 style={{ fontSize: '22px', fontWeight: '700', margin: 0 }}>Complaints</h2>
                <button
                  onClick={fetchUserComplaints}
                  style={{
                    background: '#262626',
                    border: '1px solid #363636',
                    borderRadius: '4px',
                    padding: '6px 12px',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Refresh
                </button>
              </div>

              {(() => {
                const submittedComplaints = complaints.filter(c => c.status === 'Submitted' || (!c.status && !c.id.toString().startsWith('draft_')) || c.actionTaken);
                return submittedComplaints.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '40vh', color: '#8e8e8e', textAlign: 'center' }}>
                    <div style={{ background: '#121212', border: '1px solid #262626', borderRadius: '50%', padding: '16px', marginBottom: '16px' }}>
                      <svg viewBox="0 0 24 24" width="36" height="36" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#8e8e8e' }}>
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                      </svg>
                    </div>
                    <p style={{ fontSize: '15px', fontWeight: '500' }}>No complaints submitted yet.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {submittedComplaints.map(c => (
                      <div
                        key={c.id}
                        onClick={() => {
                          setSelectedComplaintId(c.id);
                          setActiveTab('complaint-details');
                        }}
                        style={{
                          background: '#121212',
                          border: '1px solid #262626',
                          borderRadius: '12px',
                          padding: '16px',
                          cursor: 'pointer',
                          transition: 'border-color 0.2s, background-color 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#363636';
                          e.currentTarget.style.backgroundColor = '#1a1a1a';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#262626';
                          e.currentTarget.style.backgroundColor = '#121212';
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <span style={{ fontWeight: '600', fontSize: '15px' }}>Offender: @{c.senderUsername}</span>
                          <span style={{
                            fontSize: '12px',
                            fontWeight: '600',
                            padding: '4px 8px',
                            borderRadius: '12px',
                            backgroundColor: c.actionTaken ? 'rgba(57, 255, 20, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                            color: c.actionTaken ? '#39FF14' : '#a8a8a8',
                            border: c.actionTaken ? '1px solid rgba(57, 255, 20, 0.2)' : '1px solid #262626'
                          }}>
                            {c.actionTaken ? '✅ Action Has Been Taken' : 'Complaint Submitted'}
                          </span>
                        </div>
                        <p style={{ fontSize: '13px', color: '#8e8e8e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '8px' }}>
                          Message: {c.reportedMessage}
                        </p>
                        <span style={{ fontSize: '11px', color: '#555' }}>
                          {new Date(c.messageTimestamp).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}

          {/* COMPLAINT DETAILS VIEW */}
          {activeTab === 'complaint-details' && (() => {
            const complaint = complaints.find(c => c.id === selectedComplaintId);
            if (!complaint) return (
              <div style={{ padding: '24px', color: 'white', textAlign: 'center' }}>
                <p>Complaint not found.</p>
                <button className="profile-edit-btn" onClick={() => setActiveTab('complaints')}>Back to Complaints</button>
              </div>
            );

            const handleTextChange = (e) => {
              const text = e.target.value;
              setComplaints(prev => {
                const updated = prev.map(c => {
                  if (c.id === complaint.id) {
                    const updatedC = { ...c, additionalDetails: text };
                    syncComplaintToDB(updatedC);
                    return updatedC;
                  }
                  return c;
                });
                localStorage.setItem('ig_complaints', JSON.stringify(updated));
                return updated;
              });
            };

            const handleSubmit = async () => {
              if (isSubmittingComplaint) return;
              setIsSubmittingComplaint(true);

              if (USE_LIVE_BACKEND) {
                try {
                  const res = await fetch(`${API_BASE}/api/complaints/submit`, {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({
                      messageId: complaint.messageId,
                      additionalDetails: complaint.additionalDetails || '',
                      screenshots: complaint.screenshots || []
                    })
                  });
                  const data = await res.json();
                  if (data.success) {
                    const finalId = data.reportId || complaint.id;
                    const submittedComplaint = {
                      ...complaint,
                      id: finalId,
                      reportId: finalId,
                      status: 'Submitted'
                    };
                    setComplaints(prev => {
                      const updated = [submittedComplaint, ...prev.filter(c => c.id !== complaint.id && c.id !== finalId && c.messageId !== complaint.messageId)];
                      localStorage.setItem('ig_complaints', JSON.stringify(updated));
                      return updated;
                    });
                    setSelectedComplaintId(finalId);
                    setShowComplaintSuccessModal(true);
                    fetchUserComplaints();
                    fetchNotifications();
                    if (activeChatUser) fetchChatThread(activeChatUser, true);
                  } else {
                    alert(data.error || 'Failed to submit complaint.');
                  }
                } catch (err) {
                  console.error('Error submitting complaint:', err);
                  alert('Error submitting complaint. Please try again.');
                } finally {
                  setIsSubmittingComplaint(false);
                }
              } else {
                const finalId = Date.now();
                const submittedComplaint = {
                  ...complaint,
                  id: finalId,
                  status: 'Submitted'
                };
                setComplaints(prev => {
                  const updated = [submittedComplaint, ...prev.filter(c => c.id !== complaint.id)];
                  localStorage.setItem('ig_complaints', JSON.stringify(updated));
                  return updated;
                });
                setSelectedComplaintId(finalId);
                setShowComplaintSuccessModal(true);
                setIsSubmittingComplaint(false);
              }
            };

            return (
              <div className="profile-container" style={{ padding: '24px', maxWidth: '600px', margin: '0 auto', color: 'white' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #262626', paddingBottom: '16px', gap: '12px' }}>
                  <button
                    onClick={() => { setActiveTab('complaints'); fetchUserComplaints(); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      padding: 0
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="19" y1="12" x2="5" y2="12"></line>
                      <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                  </button>
                  <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>Complaint Details</h2>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ padding: '16px', background: '#121212', border: '1px solid #262626', borderRadius: '12px' }}>
                    <div style={{ marginBottom: '12px' }}>
                      <span style={{ fontSize: '12px', color: '#8e8e8e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sender Account Name</span>
                      <div style={{ fontSize: '15px', fontWeight: '600', marginTop: '2px' }}>@{complaint.senderUsername}</div>
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <span style={{ fontSize: '12px', color: '#8e8e8e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Reported Message</span>
                      <div style={{
                        fontSize: '14px',
                        background: 'rgba(255, 0, 0, 0.05)',
                        border: '1px dashed rgba(255, 0, 0, 0.2)',
                        padding: '12px',
                        borderRadius: '8px',
                        marginTop: '4px',
                        color: '#ff4d4d',
                        wordBreak: 'break-word'
                      }}>
                        {complaint.reportedMessage}
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: '12px', color: '#8e8e8e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Original Message Timestamp</span>
                      <div style={{ fontSize: '14px', marginTop: '2px' }}>{new Date(complaint.messageTimestamp).toLocaleString()}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#dbdbdb' }}>
                        Additional Details (Optional)
                      </label>
                      <textarea
                        value={complaint.additionalDetails || ''}
                        onChange={handleTextChange}
                        disabled={complaint.status === 'Submitted'}
                        placeholder="Provide any additional context or details about this incident..."
                        style={{
                          width: '100%',
                          minHeight: '100px',
                          background: '#121212',
                          border: '1px solid #262626',
                          borderRadius: '8px',
                          padding: '12px',
                          color: 'white',
                          fontFamily: 'inherit',
                          fontSize: '14px',
                          resize: 'vertical',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#dbdbdb' }}>
                        Upload Screenshot(s)
                      </label>
                      {complaint.status !== 'Submitted' ? (
                        <div style={{
                          border: '1px dashed #262626',
                          borderRadius: '8px',
                          padding: '20px',
                          textAlign: 'center',
                          cursor: 'pointer',
                          position: 'relative',
                          background: '#121212'
                        }}>
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={(e) => handleScreenshotChange(e, complaint.id)}
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              opacity: 0,
                              cursor: 'pointer'
                            }}
                          />
                          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#8e8e8e', marginBottom: '8px' }}>
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                            <polyline points="21 15 16 10 5 21"></polyline>
                          </svg>
                          <div style={{ fontSize: '13px', color: '#8e8e8e' }}>Click or Drag image file(s) to upload</div>
                        </div>
                      ) : null}

                      {complaint.screenshots && complaint.screenshots.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '10px', marginTop: '12px' }}>
                          {complaint.screenshots.map((s, index) => (
                            <div key={index} style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #262626', background: '#121212' }}>
                              <img src={s} alt={`screenshot-${index}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              {complaint.status !== 'Submitted' && (
                                <button
                                  onClick={() => {
                                    setComplaints(prev => {
                                      const updated = prev.map(c => {
                                        if (c.id === complaint.id) {
                                          return { ...c, screenshots: c.screenshots.filter((_, idx) => idx !== index) };
                                        }
                                        return c;
                                      });
                                      localStorage.setItem('ig_complaints', JSON.stringify(updated));
                                      return updated;
                                    });
                                  }}
                                  style={{
                                    position: 'absolute',
                                    top: '2px',
                                    right: '2px',
                                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '18px',
                                    height: '18px',
                                    fontSize: '10px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: 0
                                  }}
                                >
                                  X
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {complaint.status !== 'Submitted' ? (
                      <button
                        onClick={handleSubmit}
                        disabled={isSubmittingComplaint}
                        style={{
                          width: '100%',
                          background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                          border: 'none',
                          color: 'white',
                          padding: '12px',
                          borderRadius: '8px',
                          fontWeight: '600',
                          fontSize: '14px',
                          cursor: isSubmittingComplaint ? 'not-allowed' : 'pointer',
                          marginTop: '8px',
                          boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                          opacity: isSubmittingComplaint ? 0.7 : 1
                        }}
                      >
                        {isSubmittingComplaint ? 'Submitting...' : 'Submit Complaint'}
                      </button>
                    ) : (
                      <div style={{
                        width: '100%',
                        backgroundColor: 'rgba(57, 255, 20, 0.1)',
                        border: '1px solid rgba(57, 255, 20, 0.3)',
                        color: '#39FF14',
                        padding: '12px',
                        borderRadius: '8px',
                        fontWeight: '600',
                        fontSize: '14px',
                        textAlign: 'center',
                        marginTop: '8px',
                        boxSizing: 'border-box'
                      }}>
                        Complaint submitted successfully.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </main >

      {/* UPLOAD POST MODAL DIALOG */}
      {
        showUploadModal && (
          <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Create new post</h3>
                <button className="modal-close-btn" onClick={() => setShowUploadModal(false)}>X</button>
              </div>

              <form onSubmit={handleUploadPostSubmit} className="modal-form">
                <label style={{ fontSize: '12px', color: '#a8a8a8' }}>Post Type</label>
                <select className="modal-select" value={uploadType} onChange={e => setUploadType(e.target.value)}>
                  <option value="image">Image Attachment</option>
                  <option value="text">Text post</option>
                  <option value="code">Diagnostic code block</option>
                  <option value="gradient">Gradient theme box</option>
                  <option value="caesar">Caesar encrypted box</option>
                </select>

                {uploadType === 'image' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '12px', color: '#a8a8a8' }}>Select Image File</label>
                    <input type="file" accept="image/*" onChange={handlePostImageSelect} required />
                    {uploadImage && (
                      <img src={uploadImage} alt="preview" style={{ maxHeight: '150px', borderRadius: '4px', objectFit: 'cover', marginTop: '6px' }} />
                    )}
                  </div>
                )}

                {uploadType === 'gradient' && (
                  <input
                    type="text"
                    placeholder="Gradient Box Title"
                    value={uploadTitle}
                    onChange={e => setUploadTitle(e.target.value)}
                    className="modal-input"
                    required
                  />
                )}

                {(uploadType === 'text' || uploadType === 'code' || uploadType === 'gradient') && (
                  <textarea
                    placeholder="Post content..."
                    value={uploadContent}
                    onChange={e => setUploadContent(e.target.value)}
                    className="modal-input"
                    rows={4}
                    required
                  />
                )}

                <input
                  type="text"
                  placeholder="Write a caption..."
                  value={uploadCaption}
                  onChange={e => setUploadCaption(e.target.value)}
                  className="modal-input"
                />

                <button
                  type="submit"
                  style={{ background: '#0095f6', border: 'none', borderRadius: '8px', padding: '10px', color: '#ffffff', fontSize: '14px', fontWeight: '600', cursor: 'pointer', marginTop: '12px' }}
                >
                  Share
                </button>
              </form>
            </div>
          </div>
        )
      }

      {/* SENDER ABUSE WARNING MODAL */}
      {
        showAbuseWarningModal && (
          <div className="modal-overlay" style={{ zIndex: 10000 }}>
            <div className="modal-content" style={{ maxWidth: '400px', padding: '24px', textAlign: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ef4444',
                  fontSize: '28px'
                }}>
                  ⚠️
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '700', margin: '8px 0 0 0', color: 'var(--ig-text-primary)' }}>Warning</h3>
                <p style={{ fontSize: '14px', color: 'var(--ig-text-secondary)', lineHeight: '1.5', margin: '4px 0 16px 0' }}>
                  The content you are sending may hurt the receiver. Please review your message before sending.
                </p>

                <div style={{ display: 'flex', width: '100%', gap: '12px' }}>
                  <button
                    onClick={() => {
                      setShowAbuseWarningModal(false);
                      setTypedMessage('');
                      setPendingMessageText('');
                      setPendingMessagePrediction(null);
                    }}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid var(--ig-border)',
                      backgroundColor: 'transparent',
                      color: 'var(--ig-text-primary)',
                      fontWeight: '600',
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => {
                      handleSendMessage({
                        text: pendingMessageText,
                        label: pendingMessagePrediction.label,
                        confidence: pendingMessagePrediction.confidence,
                        severity: pendingMessagePrediction.severity
                      });
                      setShowAbuseWarningModal(false);
                      setTypedMessage('');
                      setPendingMessageText('');
                      setPendingMessagePrediction(null);
                    }}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#ef4444',
                      color: '#ffffff',
                      fontWeight: '600',
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    Force Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* SENDER IMAGE ABUSE WARNING MODAL (Part 7) */}
      {
        showImageAbuseModal && (!imageAbuseChatUser || imageAbuseChatUser === activeChatUser) && (
          <div className="modal-overlay" style={{ zIndex: 10000 }}>
            <div className="modal-content" style={{ maxWidth: '400px', padding: '24px', textAlign: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ef4444',
                  fontSize: '28px'
                }}>
                  ⚠️
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '700', margin: '8px 0 0 0', color: 'var(--ig-text-primary)' }}>Warning</h3>
                <p style={{ fontSize: '14px', color: 'var(--ig-text-secondary)', lineHeight: '1.5', margin: '4px 0 16px 0' }}>
                  {imageAbuseWarningText || 'Image cannot be sent because it was detected as potentially harmful.'}
                </p>

                <div style={{ display: 'flex', width: '100%', gap: '12px' }}>
                  <button
                    onClick={handleClearAbusiveImage}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid var(--ig-border)',
                      backgroundColor: 'transparent',
                      color: 'var(--ig-text-primary)',
                      fontWeight: '600',
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* COMPLAINT SUBMISSION SUCCESS CONFIRMATION MODAL */}
      {showComplaintSuccessModal && (
        <div className="modal-overlay" style={{ zIndex: 10000 }} onClick={() => setShowComplaintSuccessModal(false)}>
          <div className="modal-content" style={{ maxWidth: '380px', padding: '24px', textAlign: 'center', background: '#121212', border: '1px solid #262626', borderRadius: '12px' }} onClick={e => e.stopPropagation()}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              backgroundColor: 'rgba(57, 255, 20, 0.1)',
              border: '1px solid rgba(57, 255, 20, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: '#39FF14',
              fontSize: '26px'
            }}>
              ✓
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#ffffff', margin: '0 0 8px 0' }}>
              Complaint submitted successfully.
            </h3>
            <p style={{ fontSize: '13px', color: '#8e8e8e', lineHeight: '1.5', margin: '0 0 20px 0' }}>
              Your complaint has been submitted to SafeConnect administration for review.
            </p>
            <button
              onClick={() => setShowComplaintSuccessModal(false)}
              style={{
                width: '100%',
                padding: '11px',
                background: '#0095f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* ADD TO ABUSIVE DATASET MODAL */}
      {showAbusiveFeedbackModal && (
        <div
          className="modal-overlay"
          style={{
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)'
          }}
          onClick={() => {
            setShowAbusiveFeedbackModal(false);
            setFeedbackError('');
            setFeedbackSuccess('');
          }}
        >
          <div
            className="modal-content"
            style={{
              background: '#121212',
              border: '1px solid #262626',
              borderRadius: '12px',
              maxWidth: '440px',
              padding: '24px',
              width: '90%',
              boxSizing: 'border-box'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0, color: '#ffffff' }}>
                Add to Abusive Dataset
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowAbusiveFeedbackModal(false);
                  setFeedbackError('');
                  setFeedbackSuccess('');
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#a8a8a8',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                ✕
              </button>
            </div>

            {feedbackError && (
              <div style={{ backgroundColor: 'rgba(237, 73, 86, 0.15)', border: '1px solid #ed4956', color: '#ed4956', padding: '10px 12px', borderRadius: '6px', marginBottom: '14px', fontSize: '13px' }}>
                {feedbackError}
              </div>
            )}

            {feedbackSuccess && (
              <div style={{ backgroundColor: 'rgba(57, 255, 20, 0.15)', border: '1px solid #39FF14', color: '#39FF14', padding: '10px 12px', borderRadius: '6px', marginBottom: '14px', fontSize: '13px' }}>
                {feedbackSuccess}
              </div>
            )}

            <form onSubmit={handleSubmitAbusiveFeedback}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#a8a8a8', fontWeight: '600', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Complete Message
                </label>
                <textarea
                  value={feedbackCompleteMessage}
                  onChange={(e) => setFeedbackCompleteMessage(e.target.value)}
                  rows={3}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: '#000000',
                    border: '1px solid #363636',
                    borderRadius: '6px',
                    padding: '10px 12px',
                    color: '#ffffff',
                    fontSize: '13px',
                    resize: 'vertical',
                    outline: 'none',
                    fontFamily: 'inherit'
                  }}
                  placeholder="Original received message"
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#a8a8a8', fontWeight: '600', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Abusive Word / Phrase
                </label>
                <input
                  type="text"
                  value={feedbackAbusiveWord}
                  onChange={(e) => setFeedbackAbusiveWord(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: '#000000',
                    border: '1px solid #363636',
                    borderRadius: '6px',
                    padding: '10px 12px',
                    color: '#ffffff',
                    fontSize: '13px',
                    outline: 'none',
                    fontFamily: 'inherit'
                  }}
                  placeholder="e.g. idiot"
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowAbusiveFeedbackModal(false);
                    setFeedbackError('');
                    setFeedbackSuccess('');
                  }}
                  disabled={feedbackSubmitting}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '6px',
                    border: '1px solid #363636',
                    backgroundColor: 'transparent',
                    color: '#ffffff',
                    fontWeight: '600',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={feedbackSubmitting}
                  style={{
                    padding: '9px 22px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#0095f6',
                    color: '#ffffff',
                    fontWeight: '600',
                    fontSize: '13px',
                    cursor: feedbackSubmitting ? 'not-allowed' : 'pointer'
                  }}
                >
                  {feedbackSubmitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div >
  );
}

export default App;
