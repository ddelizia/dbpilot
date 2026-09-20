import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';
import { addUserKeyToCollection, CreatedKeyResult } from '../../services/typesense.js';

interface Props {
  onBack: () => void;
}

export const AddTypesenseUser: React.FC<Props> = ({ onBack }) => {
  const [step, setStep] = useState<number>(0);
  const [colName, setColName] = useState('');
  const [description, setDescription] = useState('');
  const [role, setRole] = useState<'admin' | 'read-only'>('read-only');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    apiKey?: CreatedKeyResult;
  } | null>(null);

  const roleItems = [
    { label: '🔍 Read-Only Access (documents:search)', value: 'read-only' as const },
    { label: '⚡ Admin Access (full collection control)', value: 'admin' as const },
  ];

  const handleRoleSelect = async (selectedRole: 'admin' | 'read-only') => {
    setRole(selectedRole);
    setLoading(true);
    const res = await addUserKeyToCollection(
      colName.trim(),
      description.trim() || `${selectedRole.toUpperCase()} Key for ${colName.trim()}`,
      selectedRole
    );
    setResult(res);
    setLoading(false);
    setStep(3);
  };

  useInput((input, key) => {
    if (key.escape || (step === 3 && key.return)) {
      onBack();
    }
  });

  return (
    <Box flexDirection="column">
      <Box borderStyle="round" borderColor="cyan" paddingX={2} paddingY={1} flexDirection="column">
        <Text bold color="cyan">
          🔑 Add User/Key to Typesense Collection (Admin or Read-Only)
        </Text>

        {step === 0 && (
          <Box flexDirection="column" marginTop={1}>
            <Text color="yellow">Step 1 of 3: Enter Target Collection Name:</Text>
            <Box marginTop={1}>
              <Text color="green">▸ Collection Name: </Text>
              <TextInput
                value={colName}
                onChange={setColName}
                onSubmit={() => {
                  if (colName.trim()) setStep(1);
                }}
              />
            </Box>
          </Box>
        )}

        {step === 1 && (
          <Box flexDirection="column" marginTop={1}>
            <Text color="dim">Collection: {colName}</Text>
            <Box marginTop={1}>
              <Text color="yellow">Step 2 of 3: User/Key Description:</Text>
            </Box>
            <Box marginTop={1}>
              <Text color="green">▸ Description: </Text>
              <TextInput
                value={description}
                onChange={setDescription}
                onSubmit={() => setStep(2)}
              />
            </Box>
            <Box marginTop={1}>
              <Text color="gray" italic>
                Press Enter to proceed.
              </Text>
            </Box>
          </Box>
        )}

        {step === 2 && (
          <Box flexDirection="column" marginTop={1}>
            <Text color="dim">Collection: {colName} | Description: {description || '(default)'}</Text>
            <Box marginTop={1}>
              <Text color="yellow">Step 3 of 3: Select Access Role:</Text>
            </Box>
            <Box marginTop={1}>
              <SelectInput items={roleItems} onSelect={(item) => handleRoleSelect(item.value)} />
            </Box>
          </Box>
        )}

        {loading && (
          <Box marginTop={1}>
            <Text color="yellow">
              <Spinner type="dots" /> Generating API key for collection "{colName}"...
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
                {result.apiKey && (
                  <Box
                    borderStyle="single"
                    borderColor="cyan"
                    marginTop={1}
                    paddingX={2}
                    flexDirection="column"
                  >
                    <Text color="cyan" bold>
                      🔑 Generated {role.toUpperCase()} API Key:
                    </Text>
                    <Box marginTop={1}>
                      <Text color="white" bold>
                        {result.apiKey.value}
                      </Text>
                    </Box>
                    <Box marginTop={1}>
                      <Text color="gray">
                        Permissions: {result.apiKey.actions.join(', ')} | Scope: {result.apiKey.collections.join(', ')}
                      </Text>
                    </Box>
                  </Box>
                )}
              </Box>
            ) : (
              <Box flexDirection="column">
                <Text color="red" bold>
                  ❌ Key Generation Failed
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
