import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { createDatabaseWithAdmin } from '../../services/postgres.js';

interface Props {
  onBack: () => void;
  isActive?: boolean;
}

export const CreatePostgresDb: React.FC<Props> = ({ onBack, isActive = true }) => {
  const [step, setStep] = useState<number>(0);
  const [dbName, setDbName] = useState('');
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSubmit = async () => {
    if (!dbName.trim() || !adminUser.trim() || !adminPass.trim()) {
      return;
    }
    setLoading(true);
    const res = await createDatabaseWithAdmin(dbName.trim(), adminUser.trim(), adminPass.trim());
    setResult(res);
    setLoading(false);
    setStep(3); // Result step
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
      <Box borderStyle="round" borderColor={isActive ? 'cyan' : 'gray'} paddingX={2} paddingY={1} flexDirection="column">

        <Text bold color="cyan">
          ➕ Create New PostgreSQL Database & Dedicated Admin User
        </Text>

        {step === 0 && (
          <Box flexDirection="column" marginTop={1}>
            <Text color="yellow">Step 1 of 3: Enter Database Name:</Text>
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
            <Text color="dim">Database Name: {dbName}</Text>
            <Box marginTop={1}>
              <Text color="yellow">Step 2 of 3: Enter Admin Username:</Text>
            </Box>
            <Box marginTop={1}>
              <Text color="green">▸ Admin Username: </Text>
              <TextInput
                value={adminUser}
                onChange={setAdminUser}
                focus={isActive && !loading}
                onSubmit={() => {
                  if (adminUser.trim()) setStep(2);
                }}
              />
            </Box>
          </Box>
        )}

        {step === 2 && (
          <Box flexDirection="column" marginTop={1}>
            <Text color="dim">Database: {dbName} | Admin User: {adminUser}</Text>
            <Box marginTop={1}>
              <Text color="yellow">Step 3 of 3: Enter Admin Password:</Text>
            </Box>
            <Box marginTop={1}>
              <Text color="green">▸ Admin Password: </Text>
              <TextInput
                value={adminPass}
                onChange={setAdminPass}
                focus={isActive && !loading}
                mask="*"
                onSubmit={handleSubmit}
              />
            </Box>
            <Box marginTop={1}>
              <Text color="gray" italic>
                Press Enter to submit.
              </Text>
            </Box>
          </Box>
        )}

        {loading && (
          <Box marginTop={1}>
            <Text color="yellow">
              <Spinner type="dots" /> Creating database & granting admin privileges...
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
                    Database <Text color="cyan">{dbName}</Text> is ready. Admin user <Text color="magenta">{adminUser}</Text> was granted full privileges.
                  </Text>
                </Box>
              </Box>
            ) : (
              <Box flexDirection="column">
                <Text color="red" bold>
                  ❌ Database Creation Failed
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
