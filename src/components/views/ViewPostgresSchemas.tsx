import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import { getDatabaseSchemas, DbSchemaInfo } from '../../services/postgres.js';

interface Props {
  onBack: () => void;
}

export const ViewPostgresSchemas: React.FC<Props> = ({ onBack }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DbSchemaInfo[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDatabaseSchemas()
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Error fetching schemas');
        setLoading(false);
      });
  }, []);

  useInput((input, key) => {
    if (key.return || key.escape || input === 'b' || input === 'B') {
      onBack();
    }
  });

  return (
    <Box flexDirection="column">
      <Box borderStyle="round" borderColor="green" paddingX={2} paddingY={1} flexDirection="column">
        <Text bold color="green">
          🐘 PostgreSQL Databases & Schemas
        </Text>

        {loading && (
          <Box marginTop={1}>
            <Text color="yellow">
              <Spinner type="dots" /> Querying PostgreSQL server for database schemas...
            </Text>
          </Box>
        )}

        {error && (
          <Box marginTop={1} flexDirection="column">
            <Text color="red" bold>
              ❌ Error connecting to PostgreSQL:
            </Text>
            <Text color="red">{error}</Text>
            <Box marginTop={1}>
              <Text color="gray">
                Tip: Ensure Docker container is running (`docker compose up -d`) and POSTGRES_HOST/PORT in .env are correct.
              </Text>
            </Box>
          </Box>
        )}

        {!loading && !error && (
          <Box flexDirection="column" marginTop={1}>
            {data.length === 0 ? (
              <Text color="yellow">No databases found.</Text>
            ) : (
              data.map((db, idx) => (
                <Box key={idx} flexDirection="column" marginBottom={1}>
                  <Text color="cyan" bold>
                    📁 Database: <Text color="white">{db.database}</Text>
                  </Text>
                  <Box marginLeft={2} flexDirection="column">
                    <Text color="gray">
                      Schemas ({db.schemas.length}):{' '}
                      {db.schemas.map((s, sIdx) => (
                        <Text key={sIdx} color="green">
                          {s}
                          {sIdx < db.schemas.length - 1 ? ', ' : ''}
                        </Text>
                      ))}
                    </Text>
                  </Box>
                </Box>
              ))
            )}
          </Box>
        )}
      </Box>

      <Box marginTop={1}>
        <Text color="gray" italic>
          Press <Text bold color="white">Enter</Text> or <Text bold color="white">ESC</Text> to return to menu.
        </Text>
      </Box>
    </Box>
  );
};
