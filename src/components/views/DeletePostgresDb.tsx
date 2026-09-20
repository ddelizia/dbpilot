import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';
import { deleteDatabase, getDatabaseSchemas, DbSchemaInfo } from '../../services/postgres.js';

interface Props {
  onBack: () => void;
  isActive?: boolean;
}

type Step = 'loading' | 'select' | 'confirm' | 'working' | 'result';

export const DeletePostgresDb: React.FC<Props> = ({ onBack, isActive = true }) => {
  const [step, setStep] = useState<Step>('loading');
  const [databases, setDatabases] = useState<DbSchemaInfo[]>([]);
  const [selectedDb, setSelectedDb] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  const load = async () => {
    setStep('loading');
    setError(null);
    try {
      const data = await getDatabaseSchemas();
      setDatabases(data.filter((db) => db.database !== 'template0' && db.database !== 'template1'));
      setStep('select');
    } catch (err: any) {
      setError(err.message || 'Error fetching databases');
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
    setSelectedDb('');
    setResult(null);
    setError(null);
    load();
  };

  const handleConfirm = async (confirmed: boolean) => {
    if (!confirmed) {
      setSelectedDb('');
      setStep('select');
      return;
    }
    setStep('working');
    const res = await deleteDatabase(selectedDb);
    setResult(res);
    setStep('result');

    if (res.success) {
      timerRef.current = setTimeout(() => {
        handleReturn();
      }, 1500);
    }
  };

  useInput(
    (input, key) => {
      if (key.escape) {
        handleReturn();
      } else if (step === 'result' && (key.return || input === ' ')) {
        handleReturn();
      }
    },
    { isActive }
  );

  const items = databases.map((db) => ({
    label: `${db.database}  (${db.schemas.length} schema${db.schemas.length === 1 ? '' : 's'})`,
    value: db.database,
  }));

  const confirmItems = [
    { label: 'Cancel', value: 'no' },
    { label: `Yes, permanently delete "${selectedDb}"`, value: 'yes' },
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
          🗑  Delete PostgreSQL Database
        </Text>

        {(step === 'loading' || step === 'working') && (
          <Box marginTop={1}>
            <Text color="yellow">
              <Spinner type="dots" />{' '}
              {step === 'loading'
                ? 'Loading databases...'
                : `Terminating connections and dropping "${selectedDb}"...`}
            </Text>
          </Box>
        )}

        {step === 'select' && (
          <Box flexDirection="column" marginTop={1}>
            {items.length === 0 ? (
              <Text color="yellow">No databases available to delete.</Text>
            ) : (
              <>
                <Text color="yellow">Select a database to delete:</Text>
                <Box marginTop={1}>
                  <SelectInput
                    items={items}
                    isFocused={isActive}
                    onSelect={(item) => {
                      setSelectedDb(item.value);
                      setStep('confirm');
                    }}
                  />
                </Box>
                <Box marginTop={1}>
                  <Text color="gray" italic>
                    Open connections to the selected database will be terminated.
                  </Text>
                </Box>
              </>
            )}
          </Box>
        )}

        {step === 'confirm' && (
          <Box flexDirection="column" marginTop={1}>
            <Text color="red" bold>
              This will permanently drop database "{selectedDb}" and all of its data.
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
              <Box flexDirection="column">
                <Text color="green" bold>
                  ✅ {result.message}
                </Text>
                <Box marginTop={1}>
                  <Text color="gray" italic>
                    Returning to sidebar... (Press Enter or ESC to return now)
                  </Text>
                </Box>
              </Box>
            ) : (
              <Box flexDirection="column">
                <Text color="red" bold>
                  ❌ Database Deletion Failed
                </Text>
                <Text color="red">{result?.message || error}</Text>
                <Box marginTop={1}>
                  <Text color="gray" italic>
                    Press Enter or ESC to return to sidebar.
                  </Text>
                </Box>
              </Box>
            )}
          </Box>
        )}
      </Box>

      <Box marginTop={1}>
        <Text color="gray" italic>
          {step === 'result'
            ? result?.success
              ? 'Returning to sidebar...'
              : 'Press Enter or ESC to return to sidebar.'
            : 'Press ESC to return to sidebar.'}
        </Text>
      </Box>
    </Box>
  );
};
