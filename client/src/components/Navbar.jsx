import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  Code2,
  LogOut,
  Plus,
  Menu,
  X
} from 'lucide-react';
import { CreateRoomModal } from './CreateRoomModal';

export const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNewRoomClick = () => {
    if (!isAuthenticated) {
      navigate('/login?redirect=create');
      return;
    }
    setIsCreateOpen(true);
  };

  const handleLogout = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (socket) {
      socket.emit('room:leave', {});
    }
    logout();
    navigate('/', { replace: true });
  };

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Rooms', path: '/rooms' },
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Docs', path: '/docs' }
  ];

  return (
    <>
      <header className={`premium-navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="navbar-inner">
          <div className="navbar-left">
            {/* Minimalist Logo Mark */}
            <Link to="/" className="navbar-brand">
              <div className="brand-icon-box">
                <Code2 size={15} strokeWidth={2.2} />
              </div>
              <span className="brand-title">SyncPad</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="desktop-nav">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`nav-link-item ${isActive(link.path) ? 'active' : ''}`}
                >
                  <span>{link.name}</span>
                </Link>
              ))}
            </nav>
          </div>

          <div className="navbar-right">
            {/* Minimalist New Room Trigger */}
            <button
              onClick={handleNewRoomClick}
              className="btn-create-room"
              title="Create a new collaborative room"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>New Room</span>
            </button>

            <span className="nav-separator" />

            {isAuthenticated && user ? (
              <div className="user-control-cluster">
                <div className="user-profile-badge">
                  <div
                    className="user-avatar-disc"
                    style={{ backgroundColor: user.avatar || '#27272a' }}
                  >
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="user-username-text font-code">{user.username}</span>
                </div>

                <button
                  onClick={handleLogout}
                  className="btn-signout"
                  title="Sign Out"
                >
                  <span>Sign out</span>
                  <LogOut size={12} strokeWidth={2} />
                </button>
              </div>
            ) : (
              <div className="auth-actions-group">
                <Link to="/login" className="btn-auth-signin">Sign In</Link>
                <Link to="/register" className="btn-auth-signup">Sign Up</Link>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button 
              className="mobile-nav-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="mobile-nav-overlay">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className={`mobile-nav-anchor ${isActive(link.path) ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <span>{link.name}</span>
              </Link>
            ))}
          </div>
        )}

        <style>{`
          /* Minimalist Precision Navbar */
          .premium-navbar {
            position: sticky;
            top: 0;
            z-index: 100;
            width: 100%;
            background: #0d0e12;
            border-bottom: 1px solid rgba(255, 255, 255, 0.07);
            transition: background 0.15s ease, border-color 0.15s ease;
          }

          .premium-navbar.scrolled {
            background: #090a0f;
            border-bottom-color: rgba(255, 255, 255, 0.1);
          }

          .navbar-inner {
            max-width: 1160px;
            margin: 0 auto;
            padding: 0 24px;
            height: 54px;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }

          .navbar-left, .navbar-right {
            display: flex;
            align-items: center;
          }

          .navbar-left {
            gap: 36px;
          }

          .navbar-right {
            gap: 12px;
          }

          /* Brand Mark */
          .navbar-brand {
            display: inline-flex;
            align-items: center;
            gap: 9px;
            text-decoration: none;
            outline: none;
          }

          .brand-icon-box {
            width: 26px;
            height: 26px;
            border-radius: 4px;
            background: #14161f;
            border: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #f9fafb;
          }

          .brand-title {
            font-size: 15px;
            font-weight: 600;
            color: #f9fafb;
            letter-spacing: -0.02em;
          }

          /* Desktop Navigation Links */
          .desktop-nav {
            display: flex;
            align-items: center;
            gap: 4px;
          }

          .nav-link-item {
            color: #9ca3af;
            text-decoration: none;
            font-size: 13.5px;
            font-weight: 500;
            padding: 6px 12px;
            border-radius: 4px;
            transition: color 0.15s ease, background 0.15s ease;
          }

          .nav-link-item:hover {
            color: #f9fafb;
            background: rgba(255, 255, 255, 0.04);
          }

          .nav-link-item.active {
            color: #f9fafb;
            background: #14161e;
            font-weight: 500;
          }

          /* New Room Action */
          .btn-create-room {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: #14161f;
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: #e5e7eb;
            font-size: 13px;
            font-weight: 500;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
          }

          .btn-create-room:hover {
            background: #1a1d28;
            border-color: rgba(255, 255, 255, 0.2);
            color: #ffffff;
          }

          .nav-separator {
            width: 1px;
            height: 18px;
            background: rgba(255, 255, 255, 0.08);
            margin: 0 4px;
          }

          /* User Widget */
          .user-control-cluster {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .user-profile-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: #11131a;
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 4px;
            padding: 3px 8px 3px 4px;
          }

          .user-avatar-disc {
            width: 20px;
            height: 20px;
            border-radius: 3px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #f9fafb;
            font-size: 11px;
            font-weight: 600;
          }

          .user-username-text {
            font-size: 12px;
            color: #cbd5e1;
            max-width: 110px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .btn-signout {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: #14161f;
            border: 1px solid rgba(255, 255, 255, 0.08);
            color: #9ca3af;
            font-size: 12px;
            font-weight: 500;
            padding: 4px 9px;
            border-radius: 4px;
            cursor: pointer;
            line-height: 1;
            transition: color 0.15s ease, background 0.15s ease, border-color 0.15s ease;
          }

          .btn-signout:hover {
            color: #f3f4f6;
            background: #1b1d28;
            border-color: rgba(255, 255, 255, 0.16);
          }

          .btn-signout:active {
            background: #12131a;
          }

          /* Auth Group */
          .auth-actions-group {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .btn-auth-signin {
            color: #9ca3af;
            text-decoration: none;
            font-size: 13px;
            font-weight: 500;
            padding: 6px 10px;
            border-radius: 4px;
            transition: color 0.15s ease;
          }

          .btn-auth-signin:hover {
            color: #f9fafb;
          }

          .btn-auth-signup {
            background: #f9fafb;
            color: #0b0c10;
            text-decoration: none;
            font-size: 13px;
            font-weight: 600;
            padding: 6px 13px;
            border-radius: 4px;
            border: 1px solid #ffffff;
            transition: background 0.15s ease;
          }

          .btn-auth-signup:hover {
            background: #e5e7eb;
          }

          /* Mobile Navigation */
          .mobile-nav-toggle {
            display: none;
            background: #14161f;
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 4px;
            color: #9ca3af;
            cursor: pointer;
            padding: 5px;
            align-items: center;
            justify-content: center;
          }

          .mobile-nav-toggle:hover {
            color: #f9fafb;
          }

          .mobile-nav-overlay {
            display: none;
            flex-direction: column;
            background: #0d0e12;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            padding: 8px 16px 12px;
            position: absolute;
            top: 100%;
            left: 0;
            width: 100%;
            box-sizing: border-box;
          }

          .mobile-nav-anchor {
            padding: 10px 12px;
            color: #9ca3af;
            text-decoration: none;
            font-size: 14px;
            font-weight: 500;
            border-radius: 4px;
            transition: background 0.15s ease, color 0.15s ease;
          }

          .mobile-nav-anchor.active {
            color: #f9fafb;
            background: #14161e;
          }

          @media (max-width: 850px) {
            .desktop-nav {
              display: none;
            }
            .mobile-nav-toggle {
              display: inline-flex;
            }
            .mobile-nav-overlay {
              display: flex;
            }
          }

          @media (max-width: 600px) {
            .navbar-inner {
              padding: 0 16px;
            }
            .btn-create-room span {
              display: none;
            }
            .user-username-text {
              display: none;
            }
            .nav-separator {
              display: none;
            }
            .btn-signout span {
              display: none;
            }
            .btn-signout {
              padding: 5px 6px;
            }
          }
        `}</style>
      </header>

      {/* Creation Modal for New Room */}
      <CreateRoomModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />
    </>
  );
};
