"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { hardhat } from "viem/chains";
import { Bars3Icon, BugAntIcon } from "@heroicons/react/24/outline";
import { Database, Bug, Settings, MessageSquare, Link as LinkIcon, BarChart3, User, ChevronRight, Hash } from "lucide-react";
import { FaucetButton, RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { useOutsideClick, useTargetNetwork } from "~~/hooks/scaffold-eth";
import { useEthIndexer } from "~~/hooks/ethindexer/useEthIndexer";
import { ConnectionStatus } from "~~/components/app/ConnectionStatus";

type HeaderMenuLink = {
  label: string;
  href: string;
  icon?: React.ReactNode;
};

export const menuLinks: HeaderMenuLink[] = [
  {
    label: "Home",
    href: "/",
  },
];

export const HeaderMenuLinks = () => {
  const pathname = usePathname();

  return (
    <>
      {menuLinks.map(({ label, href, icon }) => {
        const isActive = pathname === href;
        return (
          <li key={href}>
            <Link
              href={href}
              passHref
              className={`${
                isActive ? "bg-secondary shadow-md" : ""
              } hover:bg-secondary hover:shadow-md focus:!bg-secondary active:!text-neutral py-1.5 px-3 text-sm rounded-full gap-2 grid grid-flow-col`}
            >
              {icon}
              <span>{label}</span>
            </Link>
          </li>
        );
      })}
    </>
  );
};



/**
 * Site header with unified functionality for both Scaffold-ETH and EthIndexer
 */
export const Header = () => {
  const { targetNetwork } = useTargetNetwork();
  const isLocalNetwork = targetNetwork.id === hardhat.id;
  const pathname = usePathname();
  
  // EthIndexer specific state
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const { 
    isConnected, 
    connectedClients,
    systemStatus,
    jobs,
    transfers,
    debugInfo
  } = useEthIndexer();

  const burgerMenuRef = useRef<HTMLDetailsElement>(null);
  useOutsideClick(burgerMenuRef, () => {
    burgerMenuRef?.current?.removeAttribute("open");
  });

  // Check if we're in the EthIndexer app section
  const isInEthIndexerApp = pathname.startsWith('/app');
  


  return (
    <>
      <div className="sticky lg:static top-0 navbar bg-base-100 min-h-0 shrink-0 justify-between z-20 shadow-md shadow-secondary px-0 sm:px-2">
        <div className="navbar-start w-auto lg:w-1/2">
          <details className="dropdown" ref={burgerMenuRef}>
            <summary className="ml-1 btn btn-ghost lg:hidden hover:bg-transparent">
              <Bars3Icon className="h-1/2" />
            </summary>
            <ul
              className="menu menu-compact dropdown-content mt-3 p-2 shadow-sm bg-base-100 rounded-box w-52"
              onClick={() => {
                burgerMenuRef?.current?.removeAttribute("open");
              }}
            >
              <HeaderMenuLinks />
            </ul>
          </details>
          
          {/* Logo and Brand */}
          <Link href="/" passHref className="hidden lg:flex items-center gap-2 ml-4 mr-6 shrink-0">
            <div className="flex items-center space-x-2">
              <Database className="h-8 w-8 text-blue-600" />
              <div className="flex flex-col">
                <span className="font-bold leading-tight">EthIndexer</span>
                {/* <span className="text-xs">AI-Powered Blockchain APIs</span> */}
              </div>
            </div>
          </Link>
          
          {/* EthIndexer Brand when in app section */}
          {/* {isInEthIndexerApp && (
            <div className="flex items-center space-x-2 ml-4">
              <Database className="h-6 w-6 text-blue-600" />
              <div className="flex flex-col">
                <span className="font-bold leading-tight text-sm">App</span>
                <span className="text-xs">Application</span>
              </div>
            </div>
          )} */}
          
          {/* Navigation Links */}
          {/* <ul className="hidden lg:flex lg:flex-nowrap menu menu-horizontal px-1 gap-2">
            <HeaderMenuLinks />
          </ul> */}
        </div>
        
        <div className="navbar-end flex items-center justify-end w-full">
          {/* EthIndexer Status when in app section */}
          {isInEthIndexerApp && (
            <div className="flex items-center gap-2 mr-4">
              {/* <ConnectionStatus className="hidden sm:flex" /> */}
              {/* <button
                onClick={() => setShowDebugPanel(!showDebugPanel)}
                className={`p-2 rounded-lg transition-colors ${
                  showDebugPanel 
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                title="Toggle Debug Panel"
              >
                <Bug className="h-4 w-4" />
              </button> */}
            </div>
          )}
          
          <div className="flex items-center gap-1 ml-auto">
            <RainbowKitCustomConnectButton />
            {isLocalNetwork && <FaucetButton />}
          </div>
        </div>
      </div>



      {/* Status Bar (if system status exists) */}
      {isInEthIndexerApp && systemStatus && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 px-6 py-2">
          <div className="flex items-center space-x-2 text-sm text-blue-800 dark:text-blue-200">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span>{systemStatus}</span>
          </div>
        </div>
      )}

      {/* Debug Panel */}
      {isInEthIndexerApp && showDebugPanel && (
        <div className="fixed right-0 top-0 h-full w-80 bg-gray-900 text-white shadow-xl z-50 overflow-y-auto">
          <div className="p-4 border-b border-gray-700">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Debug Panel</h3>
              <button
                onClick={() => setShowDebugPanel(false)}
                className="text-gray-400 hover:text-white"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          <div className="p-4 space-y-4">
            {/* WebSocket Status */}
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-2">WebSocket Status</h4>
              <div className={`text-xs ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                {isConnected ? 'Connected' : 'Disconnected'} • {connectedClients} clients
              </div>
            </div>
            
            {/* Recent Jobs */}
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-2">Recent Jobs ({jobs.length})</h4>
              <div className="space-y-2 text-xs max-h-40 overflow-y-auto">
                {jobs.slice(0, 5).map((job) => (
                  <div key={job.jobId || `job-${Math.random()}`} className="bg-gray-800 p-2 rounded">
                    <div>Job: {job.jobId?.slice(0, 8) || 'Unknown'}... ({job.status})</div>
                    <div className="text-gray-400">Progress: {job.progress}%</div>
                    {job.apiUrl && (
                      <div className="text-green-400">API: {job.apiUrl}</div>
                    )}
                  </div>
                ))}
                {jobs.length === 0 && (
                  <div className="text-gray-500">No jobs yet</div>
                )}
              </div>
            </div>
            
            {/* Recent Transfers */}
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-2">Recent Transfers ({transfers.length})</h4>
              <div className="space-y-1 text-xs max-h-32 overflow-y-auto">
                {transfers.slice(0, 3).map((transfer, index) => (
                  <div key={index} className="bg-gray-800 p-2 rounded">
                    <div>{transfer.token?.symbol || 'Token'}: {transfer.value}</div>
                    <div className="text-gray-400">{transfer.from?.slice(0, 8) || 'Unknown'}... → {transfer.to?.slice(0, 8) || 'Unknown'}...</div>
                  </div>
                ))}
                {transfers.length === 0 && (
                  <div className="text-gray-500">No transfers yet</div>
                )}
              </div>
            </div>

            {/* Debug Info */}
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-2">Debug Log</h4>
              <div className="space-y-1 text-xs max-h-40 overflow-y-auto">
                {debugInfo.slice(0, 10).map((info, index) => (
                  <div key={index} className="text-gray-400 font-mono">
                    {info}
                  </div>
                ))}
                {debugInfo.length === 0 && (
                  <div className="text-gray-500">No debug info</div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-2">Quick Actions</h4>
              <div className="space-y-2">
                <button 
                  onClick={() => window.location.href = '/dashboard'}
                  className="w-full text-left px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded text-xs"
                >
                  Open Full Technical Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
