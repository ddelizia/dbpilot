import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';
import { deleteUser, listPostgresUsers, PgUserInfo } from '../../services/postgres.js';
import { getAppConfig } from '../../config.js';

interface Props {
  onBack: () => void;
  isActive?: boolean;
}

type Step = 'loading' | 'select' | 'confirm' | 'working' | 'result';

export const DeletePostgresUser: React.FC<Props> = ({ onBack, isActive = true }) => {
  const connectedUser = getAppConfig().pg.user.value;
  const [step, setStep] = useState<Step>('loading');
  const [users, setUsers] = useState<PgUserInfo[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  const load = async () => {
    setStep('loading');
    setError(null);
    try {
      const data = await listPostgresUsers();
      setUsers(data.filter((u) => u.username !== connectedUser && !u.username.startsWith('pg_')));
      setStep('select');
    } catch (err: any) {
      setError(err.message || 'Error fetching users');
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
    setSelectedUser('');
    setResult(null);
    setError(null);
    load();
  };

  const handleConfirm = async (confirmed: boolean) => {
    if (!confirmed) {
      setSelectedUser('');
      setStep('select');
      return;
    }
    setStep('working');
    const res = await deleteUser(selectedUser);
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

  const items = users.map((user) => ({
    label: user.superuser ? `${user.username}  (superuser)` : user.username,
    value: user.username,
  }));

  const confirmItems = [
    { label: 'Cancel', value: 'no' },
    { label: `Yes, permanently delete user "${selectedUser}"`, value: 'yes' },
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
          🗑  Delete PostgreSQL User
        </Text>

        {(step === 'loading' || step === 'working') && (
          <Box marginTop={1}>
            <Text color="yellow">
              <Spinner type="dots" />{' '}
              {step === 'loading'
                ? 'Loading users...'
                : `Dropping owned objects and role "${selectedUser}"...`}
            </Text>
          </Box>
        )}

        {step === 'select' && (
          <Box flexDirection="column" marginTop={1}>
            {items.length === 0 ? (
              <Text color="yellow">
                No deletable users found. The connected admin user ({connectedUser}) is protected.
              </Text>
            ) : (
              <>
                <Text color="yellow">Select a user to delete:</Text>
                <Box marginTop={1}>
                  <SelectInput
                    items={items}
                    isFocused={isActive}
                    onSelect={(item) => {
                      setSelectedUser(item.value);
                      setStep('confirm');
                    }}
                  />
                </Box>
                <Box marginTop={1}>
                  <Text color="gray" italic>
                    Users that own databases must have those databases deleted first.
                  </Text>
                </Box>
              </>
            )}
          </Box>
        )}

        {step === 'confirm' && (
          <Box flexDirection="column" marginTop={1}>
            <Text color="red" bold>
              This will permanently drop role "{selectedUser}" and revoke its privileges.
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
                  ❌ User Deletion Failed
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
