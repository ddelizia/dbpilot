import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import { getTypesenseCollections, CollectionSummary } from '../../services/typesense.js';

interface Props {
  onBack: () => void;
}

export const ViewTypesenseCollections: React.FC<Props> = ({ onBack }) => {
  const [loading, setLoading] = useState(true);
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTypesenseCollections()
      .then((res) => {
        setCollections(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Error fetching collections');
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
      <Box borderStyle="round" borderColor="yellow" paddingX={2} paddingY={1} flexDirection="column">
        <Text bold color="yellow">
          ⚡ Typesense Collections
        </Text>

        {loading && (
          <Box marginTop={1}>
            <Text color="yellow">
              <Spinner type="dots" /> Fetching collections from Typesense server...
            </Text>
          </Box>
        )}

        {error && (
          <Box marginTop={1} flexDirection="column">
            <Text color="red" bold>
              ❌ Error connecting to Typesense:
            </Text>
            <Text color="red">{error}</Text>
            <Box marginTop={1}>
              <Text color="gray">
                Tip: Ensure Docker container is running (`docker compose up -d`) and TYPESENSE_HOST/PORT/API_KEY in .env are correct.
              </Text>
            </Box>
          </Box>
        )}

        {!loading && !error && (
          <Box flexDirection="column" marginTop={1}>
            {collections.length === 0 ? (
              <Text color="gray">No collections found in Typesense cluster.</Text>
            ) : (
              collections.map((col, idx) => (
                <Box key={idx} flexDirection="column" marginBottom={1} borderStyle="single" borderColor="gray" paddingX={1}>
                  <Box justifyContent="space-between">
                    <Text color="yellow" bold>
                      📦 Collection: <Text color="white">{col.name}</Text>
                    </Text>
                    <Text color="cyan">Docs: {col.num_documents}</Text>
                  </Box>
                  <Box marginLeft={1} flexDirection="column" marginTop={0}>
                    <Text color="gray">Fields ({col.fields.length}):</Text>
                    {col.fields.map((f, fIdx) => (
                      <Text key={fIdx} color="white">
                        {'  '}• <Text color="green">{f.name}</Text>: <Text color="magenta">{f.type}</Text>{' '}
                        {f.optional ? <Text color="dim">(optional)</Text> : ''}
                      </Text>
                    ))}
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
