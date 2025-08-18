"use client";

import React, { useState, useEffect } from 'react';
import { useEthIndexer } from '../../hooks/ethindexer/useEthIndexer';
import { Sidebar } from './Sidebar';
import { Menu } from 'lucide-react';

interface UserFocusedLayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
}

export const UserFocusedLayout: React.FC<UserFocusedLayoutProps> = ({ 
  children, 
  showSidebar = true 
}) => {
  const { jobs, transfers } = useEthIndexer();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Filter jobs to show only user APIs (those with apiUrl)
  const userApis = jobs.filter(job => job.apiUrl && job.jobId);

  // Handle sidebar toggle
  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  // Handle mobile menu toggle
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Close mobile menu on window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile Menu Button - Only show on mobile */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <button
          onClick={toggleMobileMenu}
          className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
        >
          <Menu className="h-6 w-6 text-gray-700 dark:text-gray-300" />
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={toggleMobileMenu}
        />
      )}

      {/* Mobile Sidebar */}
      <div className={`md:hidden fixed left-0 top-0 h-screen z-50 transform transition-transform duration-300 ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <Sidebar 
          isCollapsed={false} 
          onToggle={toggleMobileMenu} 
        />
      </div>

      {/* Desktop Layout */}
      <div className="flex h-screen">
        {/* Desktop Sidebar */}
        {showSidebar && (
          <div className="hidden md:block h-full">
            <Sidebar 
              isCollapsed={isSidebarCollapsed} 
              onToggle={toggleSidebar} 
            />
          </div>
        )}

        {/* Main Content */}
        <div className={`flex-1 transition-all duration-300 overflow-auto ${
          showSidebar ? (isSidebarCollapsed ? 'md:ml-16' : 'md:ml-64') : ''
        }`}>
          {/* Main Content Area */}
          <main className="min-h-full">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};