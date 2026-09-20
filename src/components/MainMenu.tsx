import React from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';

export type MenuOption =
  | 'view-pg-schemas'
  | 'view-ts-collections'
  | 'create-pg-db'
  | 'create-ts-collection'
  | 'add-pg-user'
  | 'add-ts-user'
  | 'exit';

interface MainMenuProps {
  onSelect: (value: MenuOption) => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onSelect }) => {
  const items = [
    {
      label: '🐘 View PostgreSQL Database Schemas',
      value: 'view-pg-schemas' as MenuOption,
    },
    {
      label: '⚡ View Typesense Collections',
      value: 'view-ts-collections' as MenuOption,
    },
    {
      label: '➕ Create New PostgreSQL Database & Admin User',
      value: 'create-pg-db' as MenuOption,
    },
    {
      label: '➕ Create New Typesense Collection & Admin Key',
      value: 'create-ts-collection' as MenuOption,
    },
    {
      label: '👤 Add User to PostgreSQL DB (Admin of that DB only)',
      value: 'add-pg-user' as MenuOption,
    },
    {
      label: '🔑 Add Key/User to Typesense Collection (Admin or Read-Only)',
      value: 'add-ts-user' as MenuOption,
    },
    {
      label: '❌ Exit TUI',
      value: 'exit' as MenuOption,
    },
  ];

  return (
    <Box flexDirection="column" marginTop={1}>
      <Box marginBottom={1}>
        <Text color="gray" italic>
          Use ↑/↓ arrows to navigate and press Enter to select an action:
        </Text>
      </Box>
      <Box borderStyle="round" borderColor="blue" paddingX={2} paddingY={1}>
        <SelectInput
          items={items}
          onSelect={(item) => onSelect(item.value)}
        />
      </Box>
    </Box>
  );
};
