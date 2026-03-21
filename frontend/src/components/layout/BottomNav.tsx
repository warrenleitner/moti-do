import { useState } from 'react';
import type { ReactNode } from 'react';
import { Box, Text, Transition } from '../../ui';
import {
  IconLayoutDashboard, IconCheckbox, IconDots,
  IconRepeat, IconCalendar, IconLayoutKanban, IconBinaryTree2, IconSettings,
} from '../../ui/icons';

interface BottomNavProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

interface MoreMenuItem {
  text: string;
  icon: ReactNode;
  path: string;
}

const moreMenuItems: MoreMenuItem[] = [
  { text: 'HABITS', icon: <IconRepeat size={20} />, path: '/habits' },
  { text: 'CALENDAR', icon: <IconCalendar size={20} />, path: '/calendar' },
  { text: 'KANBAN', icon: <IconLayoutKanban size={20} />, path: '/kanban' },
  { text: 'GRAPH', icon: <IconBinaryTree2 size={20} />, path: '/graph' },
  { text: 'SETTINGS', icon: <IconSettings size={20} />, path: '/settings' },
];

const moreMenuPaths = moreMenuItems.map((item) => item.path);

/* v8 ignore start */
export function BottomNav({ currentPath, onNavigate }: BottomNavProps) {
  const [moreOpen, setMoreOpen] = useState(false);

  const isHome = currentPath === '/';
  const isTasks = currentPath === '/tasks';
  const isMore = moreMenuPaths.includes(currentPath);

  const handleNavigate = (path: string) => {
    setMoreOpen(false);
    onNavigate(path);
  };

  return (
    <>
      {/* More menu overlay */}
      {moreOpen && (
        <Box
          onClick={() => setMoreOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 299,
          }}
        />
      )}

      {/* More menu panel */}
      <Transition mounted={moreOpen} transition="slide-up" duration={200}>
        {(styles) => (
          <Box
            style={{
              ...styles,
              position: 'fixed',
              bottom: 64,
              left: 0,
              right: 0,
              backgroundColor: '#181B25',
              borderTop: '1px solid rgba(59, 73, 76, 0.15)',
              boxShadow: '0 -4px 0px rgba(0, 0, 0, 0.3)',
              zIndex: 300,
              padding: '8px 0',
            }}
          >
            {moreMenuItems.map((item) => {
              const isActive = currentPath === item.path;
              return (
                <Box
                  key={item.path}
                  component="button"
                  onClick={() => handleNavigate(item.path)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    width: '100%',
                    padding: '12px 20px',
                    border: 'none',
                    borderLeft: isActive ? '3px solid #FF007F' : '3px solid transparent',
                    backgroundColor: isActive ? '#10131C' : 'transparent',
                    color: isActive ? '#E0E0E0' : '#8A8F98',
                    cursor: 'pointer',
                    fontFamily: '"Space Grotesk", sans-serif',
                    fontSize: '0.8125rem',
                    fontWeight: isActive ? 600 : 400,
                    letterSpacing: '0.05em',
                    textAlign: 'left' as const,
                    transition: 'all 0.15s ease',
                  }}
                >
                  {item.icon}
                  {item.text}
                </Box>
              );
            })}
          </Box>
        )}
      </Transition>

      {/* Bottom Nav Bar */}
      <Box
        component="nav"
        data-testid="bottom-nav"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: 64,
          backgroundColor: '#272A34',
          borderTop: '1px solid rgba(59, 73, 76, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          zIndex: 300,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* Tasks */}
        <NavButton
          icon={<IconCheckbox size={24} />}
          label="TASKS"
          isActive={isTasks}
          onClick={() => handleNavigate('/tasks')}
        />

        {/* Home (emphasized) */}
        <Box
          component="button"
          onClick={() => handleNavigate('/')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            padding: '4px 16px',
            border: 'none',
            backgroundColor: isHome ? '#10131C' : 'transparent',
            cursor: 'pointer',
            position: 'relative',
            borderTop: isHome ? '2px solid #FF007F' : '2px solid transparent',
            transition: 'all 0.15s ease',
            marginTop: -8,
          }}
        >
          <Box
            style={{
              width: 44,
              height: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isHome ? '#00E5FF' : '#272A34',
              border: isHome ? 'none' : '1px solid rgba(59, 73, 76, 0.3)',
              color: isHome ? '#00626E' : '#8A8F98',
              boxShadow: isHome ? '0 0 12px rgba(0, 229, 255, 0.5)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <IconLayoutDashboard size={24} />
          </Box>
          <Text
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.5625rem',
              color: isHome ? '#00E5FF' : '#8A8F98',
              textTransform: 'uppercase' as const,
              letterSpacing: '0.1em',
            }}
          >
            HOME
          </Text>
        </Box>

        {/* More */}
        <NavButton
          icon={<IconDots size={24} />}
          label="MORE"
          isActive={isMore || moreOpen}
          onClick={() => setMoreOpen((prev) => !prev)}
        />
      </Box>
    </>
  );
}

function NavButton({
  icon,
  label,
  isActive,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <Box
      component="button"
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        padding: '8px 16px',
        border: 'none',
        borderTop: isActive ? '2px solid #FF007F' : '2px solid transparent',
        backgroundColor: isActive ? '#10131C' : 'transparent',
        color: isActive ? '#E0E0E0' : '#8A8F98',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
    >
      {icon}
      <Text
        style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '0.5625rem',
          color: isActive ? '#FF007F' : '#8A8F98',
          textTransform: 'uppercase' as const,
          letterSpacing: '0.1em',
        }}
      >
        {label}
      </Text>
    </Box>
  );
}
/* v8 ignore stop */
