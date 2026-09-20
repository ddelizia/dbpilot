import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { createCollectionAndAdmin, CreatedKeyResult } from '../../services/typesense.js';

interface Props {
  onBack: () => void;
}

export const CreateTypesenseCollection: React.FC<Props> = ({ onBack }) => {
  const [step, setStep] = useState<number>(0);
  const [colName, setColName] = useState('');
  const [keyDesc, setKeyDesc] = useState('');
  const [fieldsStr, setFieldsStr] = useState('title:string, price:int32');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    apiKey?: CreatedKeyResult;
  } | null>(null);

  const parseFields = (input: string) => {
    if (!input.trim()) return [];
    return input.split(',').map((item) => {
      const parts = item.split(':').map((s) => s.trim());
      const name = parts[0];
      const type = parts[1] || 'string';
      return { name, type };
    });
  };

  const handleSubmit = async () => {
    if (!colName.trim()) return;
    setLoading(true);
    const fields = parseFields(fieldsStr);
    const res = await createCollectionAndAdmin(
      colName.trim(),
      fields,
      keyDesc.trim() || undefined
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
      <Box borderStyle="round" borderColor="yellow" paddingX={2} paddingY={1} flexDirection="column">
        <Text bold color="yellow">
          ⚡ Create New Typesense Collection & Collection Admin Key
        </Text>

        {step === 0 && (
          <Box flexDirection="column" marginTop={1}>
            <Text color="yellow">Step 1 of 3: Enter Collection Name:</Text>
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
            <Text color="dim">Collection Name: {colName}</Text>
            <Box marginTop={1}>
              <Text color="yellow">Step 2 of 3: Key Description / Owner Name:</Text>
            </Box>
            <Box marginTop={1}>
              <Text color="green">▸ Description: </Text>
              <TextInput
                value={keyDesc}
                onChange={setKeyDesc}
                onSubmit={() => setStep(2)}
              />
            </Box>
            <Box marginTop={1}>
              <Text color="gray" italic>
                Press Enter to proceed (optional).
              </Text>
            </Box>
          </Box>
        )}

        {step === 2 && (
          <Box flexDirection="column" marginTop={1}>
            <Text color="dim">Collection: {colName} | Key Desc: {keyDesc || '(default)'}</Text>
            <Box marginTop={1}>
              <Text color="yellow">
                Step 3 of 3: Define Schema Fields (format: field1:type1, field2:type2):
              </Text>
            </Box>
            <Box marginTop={1}>
              <Text color="green">▸ Fields: </Text>
              <TextInput
                value={fieldsStr}
                onChange={setFieldsStr}
                onSubmit={handleSubmit}
              />
            </Box>
            <Box marginTop={1}>
              <Text color="gray" italic>
                Supported types: string, int32, int64, float, bool, string[]. Press Enter to submit.
              </Text>
            </Box>
          </Box>
        )}

        {loading && (
          <Box marginTop={1}>
            <Text color="yellow">
              <Spinner type="dots" /> Creating Typesense collection & generating API key...
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
                      🔑 Generated Admin API Key for {colName}:
                    </Text>
                    <Box marginTop={1}>
                      <Text color="white" bold>
                        {result.apiKey.value}
                      </Text>
                    </Box>
                    <Box marginTop={1}>
                      <Text color="gray">
                        Actions: {result.apiKey.actions.join(', ')} | Scope: {result.apiKey.collections.join(', ')}
                      </Text>
                    </Box>
                  </Box>
                )}
              </Box>
            ) : (
              <Box flexDirection="column">
                <Text color="red" bold>
                  ❌ Collection Creation Failed
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
