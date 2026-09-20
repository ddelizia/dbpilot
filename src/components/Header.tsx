import React from 'react';
import { Box, Text } from 'ink';
import { getAppConfig } from '../config.js';

interface HeaderProps {
  currentViewTitle?: string;
}

export const Header: React.FC<HeaderProps> = ({ currentViewTitle }) => {
  const config = getAppConfig();

  return (
    <Box flexDirection="column" marginBottom={0}>
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
        <Box marginTop={0} justifyContent="space-between">
          <Text color="dim">
            🐘 PG: <Text color="blue">{config.pg.host.value}:{config.pg.port.value}</Text> ({config.pg.database.value}) | ⚡ TS: <Text color="yellow">{config.ts.protocol.value}://{config.ts.host.value}:{config.ts.port.value}</Text>
          </Text>
          <Text color="dim">
            Networks: <Text color="magenta">pg_net</Text> / <Text color="yellow">ts_net</Text>
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

