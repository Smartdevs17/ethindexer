"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Briefcase, 
  Database, 
  Activity, 
  User, 
  Blocks,
  Home,
  Menu
} from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

const navigationItems = [
  {
    name: 'Dashboard',
    href: '/app',
    icon: Home,
    description: 'Overview and recent activity'
  },
  {
    name: 'Create API',
    href: '/app/query',
    icon: Plus,
    description: 'Build new data APIs with AI'
  },
  {
    name: 'My APIs',
    href: '/app/apis',
    icon: Database,
    description: 'View your created APIs'
  },
  {
    name: 'Jobs',
    href: '/app/jobs',
    icon: Briefcase,
    description: 'Monitor indexing jobs'
  },
  {
    name: 'Blocks',
    href: '/app/blocks',
    icon: Blocks,
    description: 'Explore blockchain blocks'
  },
  {
    name: 'Live Data',
    href: '/app/data',
    icon: Activity,
    description: 'Real-time blockchain data'
  },
  {
    name: 'Profile',
    href: '/app/profile',
    icon: User,
    description: 'Account settings and info'
  }
];

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggle }) => {
  const pathname = usePathname();

  return (
    <div className={`bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out h-full flex flex-col ${
      isCollapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        {!isCollapsed && (
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Navigation
          </h2>
        )}
        <button
          onClick={onToggle}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`group flex items-center justify-center px-3 py-3 rounded-xl transition-all duration-200 ${
                isCollapsed 
                  ? 'w-10 h-10 mx-auto' // Center the icon when collapsed
                  : 'space-x-3' // Add space between icon and text when expanded
              } ${
                isActive
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Icon className={`h-5 w-5 flex-shrink-0 ${
                isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'
              }`} />
              
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{item.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {item.description}
                  </div>
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      {!isCollapsed && (
        <div className="mt-auto p-4 bg-gray-50 dark:bg-gray-700 rounded-xl mx-4 mb-4">
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">
              Natural Language
            </div>
            <div>Blockchain Explorer</div>
          </div>
        </div>
      )}
    </div>
  );
};
