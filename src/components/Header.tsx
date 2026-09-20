import React from 'react';
import { Box, Text } from 'ink';

interface HeaderProps {
  currentViewTitle?: string;
}

export const Header: React.FC<HeaderProps> = ({ currentViewTitle }) => {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box
        borderStyle="double"
        borderColor="cyan"
        paddingX={2}
        paddingY={0}
        flexDirection="column"
      >
        <Box justifyContent="space-between">
          <Text color="cyan" bold>
            ⚡ POSTGRES & TYPESENSE TUI MANAGER
          </Text>
          <Text color="gray">v1.0.0</Text>
        </Box>
        <Box marginTop={0}>
          <Text color="dim">
            Isolated Networks: <Text color="magenta">postgres_network</Text> | <Text color="yellow">typesense_network</Text>
          </Text>
        </Box>
      </Box>
      {currentViewTitle && (
        <Box marginLeft={1} marginTop={0}>
          <Text color="yellow" bold>
            ▸ {currentViewTitle}
          </Text>
        </Box>
      )}
    </Box>
  );
};
