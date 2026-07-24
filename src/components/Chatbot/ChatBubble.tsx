'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import ChatModal from './ChatModal';

export default function ChatBubble() {
  const { isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Remember the collapsed preference across navigation.
  useEffect(() => {
    try {
      if (localStorage.getItem('chat-collapsed') === '1') setCollapsed(true);
    } catch {}
  }, []);

  const setCollapsedPersist = (v: boolean) => {
    setCollapsed(v);
    try { localStorage.setItem('chat-collapsed', v ? '1' : '0'); } catch {}
  };

  if (!isAuthenticated) return null;

  return (
    <>
      {/* Collapsed: slim edge tab so it never covers content */}
      {!isOpen && collapsed && (
        <button
          onClick={() => setCollapsedPersist(false)}
          className="fixed bottom-6 right-0 z-[100] flex h-12 w-7 items-center justify-center bg-[#FFE600] shadow-xl transition-all hover:w-9 focus:outline-none focus:ring-2 focus:ring-[#FFE600]"
          aria-label="Show chat assistant"
          title="Show assistant"
          type="button"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2E2E38" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}

      {/* Expanded bubble with a minimize control */}
      {!isOpen && !collapsed && (
        <div className="fixed bottom-6 right-6 z-[100]">
          <button
            onClick={() => setIsOpen(true)}
            className="flex h-16 w-16 items-center justify-center bg-[#FFE600] shadow-xl transition-all duration-300 hover:scale-110 hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-[#FFE600] focus:ring-opacity-50 md:h-14 md:w-14"
            aria-label="Open chat assistant"
            type="button"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="#2E2E38"
              className="h-7 w-7 md:h-6 md:w-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
              />
            </svg>
          </button>
          {/* Minimize to edge tab */}
          <button
            onClick={() => setCollapsedPersist(true)}
            className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center bg-[#1A1A24] text-white shadow-md transition-colors hover:text-[#FFE600] focus:outline-none focus:ring-2 focus:ring-[#FFE600]"
            aria-label="Hide chat assistant"
            title="Hide assistant"
            type="button"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
              <line x1="6" y1="12" x2="18" y2="12" />
            </svg>
          </button>
        </div>
      )}

      {/* Chat Modal */}
      <ChatModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
