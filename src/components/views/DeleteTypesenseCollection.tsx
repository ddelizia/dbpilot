import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';
import React, { useEffect, useState } from 'react';
import {
  CollectionSummary,
  deleteCollection,
  getTypesenseCollections,
} from '../../services/typesense.js';

interface Props {
  onBack: () => void;
  isActive?: boolean;
}

type Step = 'loading' | 'select' | 'confirm' | 'working' | 'result';

export const DeleteTypesenseCollection: React.FC<Props> = ({ onBack, isActive = true }) => {
  const [step, setStep] = useState<Step>('loading');
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [selectedName, setSelectedName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  const load = async () => {
    setStep('loading');
    setError(null);
    try {
      const data = await getTypesenseCollections();
      setCollections(data);
      setStep('select');
    } catch (err: any) {
      setError(err.message || 'Error fetching collections');
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
    if (!confirmed) {
      setSelectedName('');
      setStep('select');
      return;
    }
    setStep('working');
    const res = await deleteCollection(selectedName);
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

  const items = collections.map((col) => ({
    label: `${col.name}  (${col.num_documents} doc${col.num_documents === 1 ? '' : 's'})`,
    value: col.name,
  }));

  const confirmItems = [
    { label: 'Cancel', value: 'no' },
    { label: `Yes, permanently delete "${selectedName}"`, value: 'yes' },
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
          🗑  Delete Typesense Collection
        </Text>

        {(step === 'loading' || step === 'working') && (
          <Box marginTop={1}>
            <Text color="yellow">
              <Spinner type="dots" />{' '}
              {step === 'loading'
                ? 'Loading collections...'
                : `Deleting collection "${selectedName}"...`}
            </Text>
          </Box>
        )}

        {step === 'select' && (
          <Box flexDirection="column" marginTop={1}>
            {items.length === 0 ? (
              <Text color="yellow">No collections found.</Text>
            ) : (
              <>
                <Text color="yellow">Select a collection to delete:</Text>
                <Box marginTop={1}>
                  <SelectInput
                    items={items}
                    isFocused={isActive}
                    onSelect={(item) => {
                      setSelectedName(item.value);
                      setStep('confirm');
                    }}
                  />
                </Box>
                <Box marginTop={1}>
                  <Text color="gray" italic>
                    All documents in the collection will be removed. Scoped API keys are not deleted.
                  </Text>
                </Box>
              </>
            )}
          </Box>
        )}

        {step === 'confirm' && (
          <Box flexDirection="column" marginTop={1}>
            <Text color="red" bold>
              This will permanently drop collection "{selectedName}" and all of its documents.
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
                  ❌ Collection Deletion Failed
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
