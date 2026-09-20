import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import { getAppConfig, ConfigSource } from '../../config.js';
import { testPgConnection } from '../../services/postgres.js';
import { testTypesenseConnection } from '../../services/typesense.js';

interface Props {
  onBack: () => void;
  isActive?: boolean;
}

export const Overview: React.FC<Props> = ({ onBack, isActive = false }) => {
  const config = getAppConfig();
  const [loading, setLoading] = useState(true);
  const [pgResult, setPgResult] = useState<{ success: boolean; message: string }>({
    success: false,
    message: 'Testing...',
  });
  const [tsResult, setTsResult] = useState<{ success: boolean; message: string }>({
    success: false,
    message: 'Testing...',
  });

  const checkConnections = async () => {
    setLoading(true);
    const [pg, ts] = await Promise.all([
      testPgConnection().catch((err) => ({ success: false, message: err.message })),
      testTypesenseConnection().catch((err) => ({ success: false, message: err.message })),
    ]);
    setPgResult(pg);
    setTsResult(ts);
    setLoading(false);
  };

  useEffect(() => {
    checkConnections();
  }, []);

  useInput(
    (input, key) => {
      if (key.escape || key.tab || input === 'b' || input === 'B') {
        onBack();
      } else if (input === 'r' || input === 'R') {
        checkConnections();
      }
    },
    { isActive }
  );

  const maskSecret = (secret: string) => {
    if (secret.length <= 8) return '********';
    return `${secret.slice(0, 4)}...${secret.slice(-4)}`;
  };

  const renderSourceBadge = (source: ConfigSource) => {
    switch (source) {
      case 'cli':
        return <Text color="magenta" bold>[CLI Flag]</Text>;
      case 'env':
        return <Text color="cyan">[.env]</Text>;
      case 'default':
        return <Text color="gray">[default]</Text>;
    }
  };

  return (
    <Box flexDirection="column">
      <Box
        borderStyle="round"
        borderColor={isActive ? 'cyan' : 'gray'}
        paddingX={2}
        paddingY={1}
        flexDirection="column"
      >
        <Box justifyContent="space-between" marginBottom={1}>
          <Text bold color="cyan">
            🏠 Overview & System Health
          </Text>
          {loading && (
            <Text color="yellow">
              <Spinner type="dots" /> Verifying connections...
            </Text>
          )}
        </Box>

        {/* PostgreSQL Card */}
        <Box
          flexDirection="column"
          borderStyle="single"
          borderColor="blue"
          paddingX={1}
          marginBottom={1}
        >
          <Box justifyContent="space-between">
            <Text color="blue" bold>
              🐘 PostgreSQL Connection:
            </Text>
            {pgResult.success ? (
              <Text color="green" bold>
                ● Connected
              </Text>
            ) : (
              <Text color="red" bold>
                ● Disconnected
              </Text>
            )}
          </Box>
          <Box marginTop={0} flexDirection="column">
            <Text color="gray">
              Target: <Text color="white">{config.pg.host.value}:{config.pg.port.value}</Text>{' '}
              {renderSourceBadge(config.pg.host.source)}
            </Text>
            <Text color="gray">
              Database: <Text color="white">{config.pg.database.value}</Text>{' '}
              {renderSourceBadge(config.pg.database.source)} | User:{' '}
              <Text color="white">{config.pg.user.value}</Text>{' '}
              {renderSourceBadge(config.pg.user.source)}
            </Text>
            {!pgResult.success && (
              <Text color="red" dimColor>
                Status: {pgResult.message}
              </Text>
            )}
          </Box>
        </Box>

        {/* Typesense Card */}
        <Box
          flexDirection="column"
          borderStyle="single"
          borderColor="yellow"
          paddingX={1}
          marginBottom={1}
        >
          <Box justifyContent="space-between">
            <Text color="yellow" bold>
              ⚡ Typesense Cluster Connection:
            </Text>
            {tsResult.success ? (
              <Text color="green" bold>
                ● Connected
              </Text>
            ) : (
              <Text color="red" bold>
                ● Disconnected
              </Text>
            )}
          </Box>
          <Box marginTop={0} flexDirection="column">
            <Text color="gray">
              Endpoint: <Text color="white">{config.ts.protocol.value}://{config.ts.host.value}:{config.ts.port.value}</Text>{' '}
              {renderSourceBadge(config.ts.host.source)}
            </Text>
            <Text color="gray">
              Admin Key: <Text color="white">{maskSecret(config.ts.apiKey.value)}</Text>{' '}
              {renderSourceBadge(config.ts.apiKey.source)}
            </Text>
            {!tsResult.success && (
              <Text color="red" dimColor>
                Status: {tsResult.message}
              </Text>
            )}
          </Box>
        </Box>

        {/* Quick Instructions */}
        <Box flexDirection="column" marginTop={0}>
          <Text color="dim" bold>
            💡 Quick Guide:
          </Text>
          <Text color="white">
            • Use <Text color="yellow">↑ / ↓</Text> or keys <Text color="yellow">[0-9/x]</Text> in the sidebar to switch views.
          </Text>
          <Text color="white">
            • Press <Text color="yellow">Enter</Text> or <Text color="yellow">Tab</Text> to focus into forms or lists.
          </Text>
          <Text color="white">
            • Press <Text color="yellow">Esc</Text> to return focus to the sidebar at any time.
          </Text>
        </Box>
      </Box>

      <Box marginTop={1}>
        <Text color="gray" italic>
          {isActive ? 'Press ESC or Tab to return to sidebar.' : 'Press Tab or Enter to focus.'}
        </Text>
      </Box>
    </Box>
  );
};
