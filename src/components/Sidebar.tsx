import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckSquare,
  AlertCircle,
  Calendar,
  BarChart3,
  User,
  Settings,
  X,
  Sparkles,
  BookOpen,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  pendingCount: number;
  missedCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  pendingCount,
  missedCount,
}) => {
  // Prevent background scrolling on mobile when sidebar drawer is open
  useEffect(() => {
    if (isOpen && window.innerWidth < 768) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const navItems = [
    {
      to: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      to: '/todays-tasks',
      label: "Today's Tasks",
      icon: CheckSquare,
      badge: pendingCount > 0 ? pendingCount : null,
      badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    },
    {
      to: '/missed-tasks',
      label: 'Missed Tasks',
      icon: AlertCircle,
      badge: missedCount > 0 ? missedCount : null,
      badgeColor: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300',
    },
    {
      to: '/calendar',
      label: 'Calendar',
      icon: Calendar,
    },
    {
      to: '/progress',
      label: 'Progress',
      icon: BarChart3,
    },
    {
      to: '/profile',
      label: 'Profile',
      icon: User,
    },
    {
      to: '/settings',
      label: 'Settings',
      icon: Settings,
    },
  ];

  const linkClasses = ({ isActive }: { isActive: boolean }) =>
    `flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
      isActive
        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-semibold shadow-xs'
        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
    }`;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-200 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Drawer Container */}
      <aside
        className={`fixed md:sticky top-0 md:top-16 left-0 z-50 md:z-20 h-full md:h-[calc(100vh-4rem)] w-72 max-w-[85vw] md:w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-2xl md:shadow-none transition-transform duration-300 ease-in-out flex flex-col justify-between p-4 overflow-y-auto shrink-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="space-y-1">
          {/* Mobile Navigation Header */}
          <div className="flex items-center justify-between md:hidden pb-3 mb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
                <BookOpen size={18} />
              </div>
              <span className="font-extrabold text-lg text-slate-900 dark:text-white tracking-tight">
                Study<span className="text-blue-600 dark:text-blue-400">Track</span>
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
          </div>

          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={linkClasses}
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} className="shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.badge !== null && (
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${item.badgeColor}`}
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Bottom Info Banner */}
        <div className="mt-6 bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3.5 border border-slate-200/60 dark:border-slate-700/60">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 mb-1">
            <Sparkles size={14} className="shrink-0" />
            <span>Target vs Hours</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Focus on completing study targets every day instead of counting passive hours.
          </p>
        </div>
      </aside>
    </>
  );
};
