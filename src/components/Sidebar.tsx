import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { testPgConnection } from '../services/postgres.js';
import { testTypesenseConnection } from '../services/typesense.js';
import { getAppConfig } from '../config.js';

export type ViewId =
  | 'overview'
  | 'view-pg-schemas'
  | 'create-pg-db'
  | 'add-pg-user'
  | 'delete-pg-db'
  | 'delete-pg-user'
  | 'view-ts-collections'
  | 'create-ts-collection'
  | 'add-ts-user'
  | 'delete-ts-collection'
  | 'delete-ts-key'
  | 'exit';

export interface SidebarItem {
  id: ViewId;
  label: string;
  shortcut: string;
  category: 'overview' | 'postgres' | 'typesense' | 'system';
}

export const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: 'overview', label: 'Overview & Status', shortcut: '0', category: 'overview' },
  { id: 'view-pg-schemas', label: 'View Schemas', shortcut: '1', category: 'postgres' },
  { id: 'create-pg-db', label: 'Create DB & Admin', shortcut: '2', category: 'postgres' },
  { id: 'add-pg-user', label: 'Add DB User', shortcut: '3', category: 'postgres' },
  { id: 'delete-pg-db', label: 'Delete DB', shortcut: '4', category: 'postgres' },
  { id: 'delete-pg-user', label: 'Delete User', shortcut: '5', category: 'postgres' },
  { id: 'view-ts-collections', label: 'View Collections', shortcut: '6', category: 'typesense' },
  { id: 'create-ts-collection', label: 'Create Col & Key', shortcut: '7', category: 'typesense' },
  { id: 'add-ts-user', label: 'Add Col Key', shortcut: '8', category: 'typesense' },
  { id: 'delete-ts-collection', label: 'Delete Collection', shortcut: '9', category: 'typesense' },
  { id: 'delete-ts-key', label: 'Delete Key', shortcut: 'x', category: 'typesense' },
  { id: 'exit', label: 'Exit Application', shortcut: 'q', category: 'system' },
];

interface SidebarProps {
  currentView: ViewId;
  onSelectView: (view: ViewId) => void;
  isFocused: boolean;
  onToggleFocus: () => void;
  onExit: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  isFocused,
  onToggleFocus,
  onExit,
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [pgStatus, setPgStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [tsStatus, setTsStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  const config = getAppConfig();

  const checkHealth = async () => {
    setPgStatus('checking');
    setTsStatus('checking');

    testPgConnection()
      .then((res) => setPgStatus(res.success ? 'online' : 'offline'))
      .catch(() => setPgStatus('offline'));

    testTypesenseConnection()
      .then((res) => setTsStatus(res.success ? 'online' : 'offline'))
      .catch(() => setTsStatus('offline'));
  };

  useEffect(() => {
    checkHealth();
  }, []);

  // Sync selected index when currentView changes externally
  useEffect(() => {
    const idx = SIDEBAR_ITEMS.findIndex((it) => it.id === currentView);
    if (idx !== -1) {
      setSelectedIndex(idx);
    }
  }, [currentView]);

  useInput(
    (input, key) => {
      if (key.upArrow || input === 'k') {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : SIDEBAR_ITEMS.length - 1));
      } else if (key.downArrow || input === 'j') {
        setSelectedIndex((prev) => (prev < SIDEBAR_ITEMS.length - 1 ? prev + 1 : 0));
      } else if (key.return || key.rightArrow) {
        const item = SIDEBAR_ITEMS[selectedIndex];
        if (item.id === 'exit') {
          onExit();
        } else {
          onSelectView(item.id);
        }
      } else if (key.tab) {
        onToggleFocus();
      } else if (input === 'r' || input === 'R') {
        checkHealth();
      } else if (input === 'q' || input === 'Q') {
        onExit();
      } else {
        const idx = SIDEBAR_ITEMS.findIndex((it) => it.shortcut === input);
        if (idx !== -1) {
          const item = SIDEBAR_ITEMS[idx];
          setSelectedIndex(idx);
          if (item.id === 'exit') {
            onExit();
          } else {
            onSelectView(item.id);
          }
        }
      }
    },
    { isActive: isFocused }
  );

  const renderItem = (item: SidebarItem, idx: number) => {
    const isSelected = selectedIndex === idx;
    const isActive = currentView === item.id;

    let prefix = '  ';
    if (isSelected && isFocused) {
      prefix = '▸ ';
    } else if (isActive) {
      prefix = '● ';
    }

    return (
      <Box key={item.id} paddingX={1} justifyContent="space-between">
        <Box>
          <Text
            color={
              isSelected && isFocused
                ? 'cyan'
                : isActive
                ? 'green'
                : 'white'
            }
            bold={isSelected || isActive}
            underline={isSelected && isFocused}
          >
            {prefix}
            <Text color="gray">[{item.shortcut}] </Text>
            {item.label}
          </Text>
        </Box>
        {isActive && !isSelected && (
          <Text color="green" dimColor>
            active
          </Text>
        )}
      </Box>
    );
  };

  return (
    <Box
      flexDirection="column"
      width={36}
      borderStyle="round"
      borderColor={isFocused ? 'cyan' : 'gray'}
      paddingX={1}
      paddingY={0}
    >
      <Box justifyContent="space-between" marginBottom={1}>
        <Text bold color={isFocused ? 'cyan' : 'white'}>
          📋 NAVIGATION
        </Text>
        <Text color={isFocused ? 'cyan' : 'gray'} dimColor>
          {isFocused ? '[FOCUS: SIDEBAR]' : '[Tab: Focus]'}
        </Text>
      </Box>

      {/* Overview */}
      {SIDEBAR_ITEMS.filter((it) => it.category === 'overview').map((it) =>
        renderItem(it, SIDEBAR_ITEMS.indexOf(it))
      )}

      {/* PostgreSQL Section */}
      <Box marginTop={1} paddingX={1}>
        <Text color="blue" bold>
          🐘 PostgreSQL
        </Text>
      </Box>
      {SIDEBAR_ITEMS.filter((it) => it.category === 'postgres').map((it) =>
        renderItem(it, SIDEBAR_ITEMS.indexOf(it))
      )}

      {/* Typesense Section */}
      <Box marginTop={1} paddingX={1}>
        <Text color="yellow" bold>
          ⚡ Typesense
        </Text>
      </Box>
      {SIDEBAR_ITEMS.filter((it) => it.category === 'typesense').map((it) =>
        renderItem(it, SIDEBAR_ITEMS.indexOf(it))
      )}

      {/* System Section */}
      <Box marginTop={1} paddingX={1}>
        <Text color="gray" dimColor>
          ── System ──────────
        </Text>
      </Box>
      {SIDEBAR_ITEMS.filter((it) => it.category === 'system').map((it) =>
        renderItem(it, SIDEBAR_ITEMS.indexOf(it))
      )}

      {/* Health Monitor */}
      <Box
        marginTop={1}
        borderStyle="single"
        borderColor="gray"
        flexDirection="column"
        paddingX={1}
      >
        <Box justifyContent="space-between">
          <Text color="dim" bold>
            LIVE STATUS
          </Text>
          <Text color="gray" dimColor>
            [r] refresh
          </Text>
        </Box>
        <Box justifyContent="space-between" marginTop={0}>
          <Text color="white">🐘 PG: {config.pg.port.value}</Text>
          {pgStatus === 'online' && <Text color="green">● Online</Text>}
          {pgStatus === 'offline' && <Text color="red">● Offline</Text>}
          {pgStatus === 'checking' && <Text color="yellow">○ Checking...</Text>}
        </Box>
        <Box justifyContent="space-between">
          <Text color="white">⚡ TS: {config.ts.port.value}</Text>
          {tsStatus === 'online' && <Text color="green">● Online</Text>}
          {tsStatus === 'offline' && <Text color="red">● Offline</Text>}
          {tsStatus === 'checking' && <Text color="yellow">○ Checking...</Text>}
        </Box>
      </Box>
    </Box>
  );
};
