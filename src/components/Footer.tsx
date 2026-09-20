import React from 'react';
import { Box, Text } from 'ink';

interface FooterProps {
  focusedPane: 'sidebar' | 'content';
}

export const Footer: React.FC<FooterProps> = ({ focusedPane }) => {
  return (
    <Box
      borderStyle="single"
      borderColor="gray"
      paddingX={1}
      marginTop={1}
      justifyContent="space-between"
    >
      <Box>
        {focusedPane === 'sidebar' ? (
          <Text color="gray">
            [<Text color="cyan">↑/↓</Text>] Navigate  [<Text color="cyan">Enter/→</Text>] Open View  [<Text color="cyan">0-9/x</Text>] Jump  [<Text color="cyan">Tab</Text>] Focus View  [<Text color="cyan">r</Text>] Refresh  [<Text color="red">q</Text>] Quit
          </Text>
        ) : (
          <Text color="gray">
            [<Text color="yellow">Esc</Text>] Return to Sidebar  [<Text color="yellow">Tab</Text>] Switch Pane  [<Text color="yellow">Enter</Text>] Confirm / Submit
          </Text>
        )}
      </Box>
      <Box>
        <Text color="dim">
          Active Pane: <Text bold color={focusedPane === 'sidebar' ? 'cyan' : 'green'}>{focusedPane.toUpperCase()}</Text>
        </Text>
      </Box>
    </Box>
  );
};
