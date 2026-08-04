import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Admin from "./pages/Admin";
import Login from "./pages/Login";
import AnimeDetail from "./pages/AnimeDetail";
import EpisodePlayer from "./pages/EpisodePlayer";
import Library from "./pages/Library";
import Content from "./pages/Content";
import Contact from "./pages/Contact";
import Akun from "./pages/Akun";
import Leaderboard from "./pages/Leaderboard";
import Premium from "./pages/Premium";
import ProfileUser from "./pages/ProfileUser";
import JadwalOtaku from "./pages/JadwalOtaku";
import ScrollToTop from "./components/ScrollToTop";
import AdPopup from "./components/AdPopup";
import MbuhRedirectScript from "./components/MbuhRedirectScript";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ToastContainer } from "react-toastify";
import Landing from "./pages/Landing";
import "react-toastify/dist/ReactToastify.css";

function AppContent() {
  const location = useLocation();
  const { user } = useAuth();

  const shouldShowAdPopup =
    !location.pathname.startsWith('/admin') &&
    location.pathname !== '/login' &&
    !user?.membership_active;

  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Landing />} />

      </Routes>

    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
