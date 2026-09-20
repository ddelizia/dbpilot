import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { addUserToDatabase } from '../../services/postgres.js';

interface Props {
  onBack: () => void;
  isActive?: boolean;
}

export const AddPostgresUser: React.FC<Props> = ({ onBack, isActive = true }) => {
  const [step, setStep] = useState<number>(0);
  const [dbName, setDbName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSubmit = async () => {
    if (!dbName.trim() || !username.trim() || !password.trim()) return;
    setLoading(true);
    const res = await addUserToDatabase(dbName.trim(), username.trim(), password.trim());
    setResult(res);
    setLoading(false);
    setStep(3);
  };

  useInput(
    (input, key) => {
      if (key.escape || (step === 3 && key.return)) {
        onBack();
      }
    },
    { isActive }
  );

  return (
    <Box flexDirection="column">
      <Box borderStyle="round" borderColor={isActive ? 'magenta' : 'gray'} paddingX={2} paddingY={1} flexDirection="column">
        <Text bold color="magenta">
          👤 Add User to PostgreSQL Database (Admin of that DB only)
        </Text>

        {step === 0 && (
          <Box flexDirection="column" marginTop={1}>
            <Text color="yellow">Step 1 of 3: Enter Target Database Name:</Text>
            <Box marginTop={1}>
              <Text color="green">▸ Database Name: </Text>
              <TextInput
                value={dbName}
                onChange={setDbName}
                focus={isActive && !loading}
                onSubmit={() => {
                  if (dbName.trim()) setStep(1);
                }}
              />
            </Box>
          </Box>
        )}

        {step === 1 && (
          <Box flexDirection="column" marginTop={1}>
            <Text color="dim">Database: {dbName}</Text>
            <Box marginTop={1}>
              <Text color="yellow">Step 2 of 3: Enter New Username:</Text>
            </Box>
            <Box marginTop={1}>
              <Text color="green">▸ Username: </Text>
              <TextInput
                value={username}
                onChange={setUsername}
                focus={isActive && !loading}
                onSubmit={() => {
                  if (username.trim()) setStep(2);
                }}
              />
            </Box>
          </Box>
        )}

        {step === 2 && (
          <Box flexDirection="column" marginTop={1}>
            <Text color="dim">Database: {dbName} | Username: {username}</Text>
            <Box marginTop={1}>
              <Text color="yellow">Step 3 of 3: Enter Password:</Text>
            </Box>
            <Box marginTop={1}>
              <Text color="green">▸ Password: </Text>
              <TextInput
                value={password}
                onChange={setPassword}
                focus={isActive && !loading}
                mask="*"
                onSubmit={handleSubmit}
              />
            </Box>
            <Box marginTop={1}>
              <Text color="gray" italic>
                Press Enter to grant admin rights on database "{dbName}".
              </Text>
            </Box>
          </Box>
        )}

        {loading && (
          <Box marginTop={1}>
            <Text color="yellow">
              <Spinner type="dots" /> Granting user rights on database "{dbName}"...
            </Text>
          </Box>
        )}

        {step === 3 && result && (
          <Box flexDirection="column" marginTop={1}>
            {result.success ? (
              <Box flexDirection="column">
                <Text color="green" bold>
                  ✅ {result.message}
                </Text>
                <Box marginTop={1}>
                  <Text color="white">
                    User <Text color="cyan">{username}</Text> has been granted full permissions exclusively on database <Text color="magenta">{dbName}</Text>.
                  </Text>
                </Box>
              </Box>
            ) : (
              <Box flexDirection="column">
                <Text color="red" bold>
                  ❌ User Addition Failed
                </Text>
                <Text color="red">{result.message}</Text>
              </Box>
            )}
          </Box>
        )}
      </Box>

      <Box marginTop={1}>
        <Text color="gray" italic>
          {step === 3 ? 'Press Enter to return to main menu.' : 'Press ESC to cancel.'}
        </Text>
      </Box>
    </Box>
  );
};
