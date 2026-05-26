import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  BriefcaseIcon,
  FileCheckIcon,
  ShieldCheckIcon,
  ClipboardListIcon,
  TargetIcon,
  BuildingIcon,
  UsersGroupIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  EleosLogoMark,
} from '../icons';
import './Sidebar.css';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path?: string;
  children?: { id: string; label: string; path: string; icon: React.ReactNode }[];
}

function WorkflowIcon({ color = 'white' }: { color?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}

const navItems: NavItem[] = [
  {
    id: 'my-org',
    label: 'My Organization',
    icon: <BriefcaseIcon color="white" />,
    children: [
      { id: 'users', label: 'Users', path: '/users', icon: <UsersGroupIcon color="white" /> },
      { id: 'sites', label: 'Sites', path: '/sites', icon: <BuildingIcon color="white" /> },
    ],
  },
  {
    id: 'workflows',
    label: 'Workflows',
    icon: <WorkflowIcon color="white" />,
    path: '/workflows',
  },
  {
    id: 'leadership',
    label: 'Leadership Report',
    icon: <FileCheckIcon color="white" />,
    path: '/leadership-report',
  },
  {
    id: 'compliance',
    label: 'Compliance Report',
    icon: <ShieldCheckIcon color="white" />,
    path: '/compliance-report',
  },
  {
    id: 'eligibility',
    label: 'Eligibility Report',
    icon: <ClipboardListIcon size={20} color="white" />,
    path: '/eligibility-report',
  },
  {
    id: 'ccbhc',
    label: 'CCBHC Tracker',
    icon: <TargetIcon color="white" />,
    path: '/ccbhc-tracker',
  },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['my-org']));
  const navigate = useNavigate();
  const location = useLocation();

  const COLLAPSED_PREFIXES = ['/leadership-report', '/compliance-report', '/eligibility-report', '/ccbhc-tracker', '/workflows'];

  useEffect(() => {
    if (COLLAPSED_PREFIXES.some(prefix => location.pathname.startsWith(prefix))) {
      setCollapsed(true);
    } else {
      setCollapsed(false);
    }
  }, [location.pathname]);

  function toggleSection(id: string) {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function isActive(path?: string) {
    return path ? location.pathname === path : false;
  }

  function isParentActive(item: NavItem) {
    if (item.path) return isActive(item.path);
    return item.children?.some(c => isActive(c.path)) ?? false;
  }

  return (
    <aside className={`sidebar${collapsed ? ' sidebar--collapsed' : ''}`}>
      <div className="sidebar__top">
        {/* Collapse toggle */}
        <div className="sidebar__collapse-row">
          <button
            className="sidebar__collapse-btn"
            onClick={() => setCollapsed(c => !c)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeftIcon size={20} color="white" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar__nav">
          {navItems.map(item => (
            <div key={item.id} className="sidebar__nav-section">
              <button
                className={`sidebar__nav-item${isParentActive(item) ? ' sidebar__nav-item--active' : ''}`}
                onClick={() => {
                  if (collapsed) {
                    setCollapsed(false);
                  } else if (item.children) {
                    toggleSection(item.id);
                  } else if (item.path) {
                    navigate(item.path);
                  }
                }}
              >
                <span className="sidebar__nav-item__icon">{item.icon}</span>
                <span className="sidebar__nav-item__label">{item.label}</span>
                {item.children && (
                  <span className={`sidebar__nav-item__chevron sidebar__nav-item__chevron--${expandedSections.has(item.id) ? 'up' : 'down'}`}>
                    <ChevronDownIcon color="white" />
                  </span>
                )}
              </button>

              {item.children && (
                <div className={`sidebar__sub-items${expandedSections.has(item.id) ? ' sidebar__sub-items--open' : ''}`}>
                  {item.children.map(child => (
                    <button
                      key={child.id}
                      className={`sidebar__sub-item${isActive(child.path) ? ' sidebar__sub-item--active' : ''}`}
                      onClick={() => navigate(child.path)}
                    >
                      <span className="sidebar__sub-item__icon">{child.icon}</span>
                      <span className="sidebar__sub-item__label">{child.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </div>

      {/* Logo */}
      <div className="sidebar__bottom">
        <div className="sidebar__logo">
          <div className="sidebar__logo-mark">
            <EleosLogoMark size={collapsed ? 28 : 40} />
          </div>
          <span className="sidebar__logo-text">Management Hub</span>
        </div>
      </div>
    </aside>
  );
}
