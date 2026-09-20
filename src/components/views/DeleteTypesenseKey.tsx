import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';
import React, { useEffect, useState } from 'react';
import { deleteKey, getTypesenseKeys, KeySummary } from '../../services/typesense.js';

interface Props {
  onBack: () => void;
  isActive?: boolean;
}

type Step = 'loading' | 'select' | 'confirm' | 'working' | 'result';

export const DeleteTypesenseKey: React.FC<Props> = ({ onBack, isActive = true }) => {
  const [step, setStep] = useState<Step>('loading');
  const [keys, setKeys] = useState<KeySummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedLabel, setSelectedLabel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  const load = async () => {
    setStep('loading');
    setError(null);
    try {
      const data = await getTypesenseKeys();
      setKeys(data);
      setStep('select');
    } catch (err: any) {
      setError(err.message || 'Error fetching API keys');
      setStep('result');
    }
  };

  useEffect(() => {
    load();
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleReturn = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    onBack();
  };

  const handleConfirm = async (confirmed: boolean) => {
    if (!confirmed || selectedId == null) {
      setSelectedId(null);
      setSelectedLabel('');
      setStep('select');
      return;
    }
    setStep('working');
    const res = await deleteKey(selectedId);
    setResult(res);
    setStep('result');

    if (res.success) {
      timerRef.current = setTimeout(handleReturn, 1500);
    }
  };

  useInput(
    (input, key) => {
      if (key.escape) {
        handleReturn();
      } else if (step === 'result' && key.return) {
        handleReturn();
      }
    },
    { isActive }
  );

  const formatKey = (key: KeySummary) => {
    const desc = key.description || '(no description)';
    const scope = key.collections.join(', ') || '*';
    const actions = key.actions.join(', ') || '*';
    return `#${key.id}  ${desc}  [${scope}]  ${actions}`;
  };

  const items = keys.map((key) => ({
    label: formatKey(key),
    value: String(key.id),
  }));

  const confirmItems = [
    { label: 'Cancel', value: 'no' },
    { label: `Yes, revoke API key #${selectedId}`, value: 'yes' },
  ];

  return (
    <Box flexDirection="column">
      <Box
        borderStyle="round"
        borderColor={isActive ? 'red' : 'gray'}
        paddingX={2}
        paddingY={1}
        flexDirection="column"
      >
        <Text bold color="red">
          🗑  Delete Typesense API Key
        </Text>

        {(step === 'loading' || step === 'working') && (
          <Box marginTop={1}>
            <Text color="yellow">
              <Spinner type="dots" />{' '}
              {step === 'loading' ? 'Loading API keys...' : `Revoking API key #${selectedId}...`}
            </Text>
          </Box>
        )}

        {step === 'select' && (
          <Box flexDirection="column" marginTop={1}>
            {items.length === 0 ? (
              <Text color="yellow">No API keys found.</Text>
            ) : (
              <>
                <Text color="yellow">Select an API key to revoke:</Text>
                <Box marginTop={1}>
                  <SelectInput
                    items={items}
                    isFocused={isActive}
                    onSelect={(item) => {
                      setSelectedId(Number(item.value));
                      setSelectedLabel(item.label);
                      setStep('confirm');
                    }}
                  />
                </Box>
                <Box marginTop={1}>
                  <Text color="gray" italic>
                    The bootstrap admin key is not listed. Key secrets are never shown after creation.
                  </Text>
                </Box>
              </>
            )}
          </Box>
        )}

        {step === 'confirm' && (
          <Box flexDirection="column" marginTop={1}>
            <Text color="red" bold>
              This will permanently revoke {selectedLabel}.
            </Text>
            <Box marginTop={1}>
              <SelectInput
                items={confirmItems}
                isFocused={isActive}
                onSelect={(item) => handleConfirm(item.value === 'yes')}
              />
            </Box>
          </Box>
        )}

        {step === 'result' && (result || error) && (
          <Box flexDirection="column" marginTop={1}>
            {result?.success ? (
              <Text color="green" bold>
                ✅ {result.message}
              </Text>
            ) : (
              <>
                <Text color="red" bold>
                  ❌ Key Deletion Failed
                </Text>
                <Text color="red">{result?.message || error}</Text>
              </>
            )}
          </Box>
        )}
      </Box>

      <Box marginTop={1}>
        <Text color="gray" italic>
          {step === 'result' ? 'Press Enter to return to main menu.' : 'Press ESC to cancel.'}
        </Text>
      </Box>
    </Box>
  );
};
