#!/usr/bin/env node
import React, { useState } from 'react';
import { render, Box, useApp, useInput } from 'ink';
import { initConfig, printHelp, printVersion } from './config.js';
import { Header } from './components/Header.js';
import { Sidebar, ViewId } from './components/Sidebar.js';
import { Footer } from './components/Footer.js';
import { Overview } from './components/views/Overview.js';
import { ViewPostgresSchemas } from './components/views/ViewPostgresSchemas.js';
import { ViewTypesenseCollections } from './components/views/ViewTypesenseCollections.js';
import { CreatePostgresDb } from './components/views/CreatePostgresDb.js';
import { CreateTypesenseCollection } from './components/views/CreateTypesenseCollection.js';
import { AddPostgresUser } from './components/views/AddPostgresUser.js';
import { AddTypesenseUser } from './components/views/AddTypesenseUser.js';
import { DeletePostgresDb } from './components/views/DeletePostgresDb.js';
import { DeletePostgresUser } from './components/views/DeletePostgresUser.js';
import { DeleteTypesenseCollection } from './components/views/DeleteTypesenseCollection.js';
import { DeleteTypesenseKey } from './components/views/DeleteTypesenseKey.js';
import { runCliCommand } from './commands.js';

// Initialize configuration from CLI parameters & .env
const config = initConfig();

if (config.helpRequested) {
  printHelp(config.positionals);
  process.exit(0);
}

if (config.versionRequested) {
  printVersion();
  process.exit(0);
}

const commandHandled = await runCliCommand(config);
if (commandHandled) {
  process.exit(process.exitCode ?? 0);
}

const App: React.FC = () => {
  const { exit } = useApp();
  const [currentView, setCurrentView] = useState<ViewId>('overview');
  const [focusedPane, setFocusedPane] = useState<'sidebar' | 'content'>('sidebar');

  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      exit();
    }
  });

  const handleSelectView = (view: ViewId) => {
    if (view === 'exit') {
      exit();
      return;
    }
    setCurrentView(view);
    setFocusedPane('content');
  };

  const handleToggleFocus = () => {
    setFocusedPane((prev) => (prev === 'sidebar' ? 'content' : 'sidebar'));
  };

  const handleBackToSidebar = () => {
    setFocusedPane('sidebar');
  };

  const getViewTitle = (): string => {
    switch (currentView) {
      case 'overview':
        return 'Overview & Health Dashboard';
      case 'view-pg-schemas':
        return 'View PostgreSQL Schemas';
      case 'view-ts-collections':
        return 'View Typesense Collections';
      case 'create-pg-db':
        return 'Create PostgreSQL Database & Admin User';
      case 'create-ts-collection':
        return 'Create Typesense Collection & Admin Key';
      case 'add-pg-user':
        return 'Add Admin User to PostgreSQL Database';
      case 'delete-pg-db':
        return 'Delete PostgreSQL Database';
      case 'delete-pg-user':
        return 'Delete PostgreSQL User';
      case 'add-ts-user':
        return 'Add Key/User to Typesense Collection';
      case 'delete-ts-collection':
        return 'Delete Typesense Collection';
      case 'delete-ts-key':
        return 'Delete Typesense API Key';
      default:
        return 'Dashboard';
    }
  };

  return (
    <Box flexDirection="column" paddingX={1} paddingY={0}>
      <Header currentViewTitle={getViewTitle()} />

      <Box flexDirection="row" marginTop={0}>
        <Sidebar
          currentView={currentView}
          onSelectView={handleSelectView}
          isFocused={focusedPane === 'sidebar'}
          onToggleFocus={handleToggleFocus}
          onExit={exit}
        />

        <Box flexDirection="column" flexGrow={1} marginLeft={1}>
          {currentView === 'overview' && (
            <Overview
              isActive={focusedPane === 'content'}
              onBack={handleBackToSidebar}
            />
          )}

          {currentView === 'view-pg-schemas' && (
            <ViewPostgresSchemas
              isActive={focusedPane === 'content'}
              onBack={handleBackToSidebar}
            />
          )}

          {currentView === 'view-ts-collections' && (
            <ViewTypesenseCollections
              isActive={focusedPane === 'content'}
              onBack={handleBackToSidebar}
            />
          )}

          {currentView === 'create-pg-db' && (
            <CreatePostgresDb
              isActive={focusedPane === 'content'}
              onBack={handleBackToSidebar}
            />
          )}

          {currentView === 'create-ts-collection' && (
            <CreateTypesenseCollection
              isActive={focusedPane === 'content'}
              onBack={handleBackToSidebar}
            />
          )}

          {currentView === 'add-pg-user' && (
            <AddPostgresUser
              isActive={focusedPane === 'content'}
              onBack={handleBackToSidebar}
            />
          )}

          {currentView === 'add-ts-user' && (
            <AddTypesenseUser
              isActive={focusedPane === 'content'}
              onBack={handleBackToSidebar}
            />
          )}

          {currentView === 'delete-pg-db' && (
            <DeletePostgresDb
              isActive={focusedPane === 'content'}
              onBack={handleBackToSidebar}
            />
          )}

          {currentView === 'delete-pg-user' && (
            <DeletePostgresUser
              isActive={focusedPane === 'content'}
              onBack={handleBackToSidebar}
            />
          )}

          {currentView === 'delete-ts-collection' && (
            <DeleteTypesenseCollection
              isActive={focusedPane === 'content'}
              onBack={handleBackToSidebar}
            />
          )}

          {currentView === 'delete-ts-key' && (
            <DeleteTypesenseKey
              isActive={focusedPane === 'content'}
              onBack={handleBackToSidebar}
            />
          )}
        </Box>
      </Box>

      <Footer focusedPane={focusedPane} />
    </Box>
  );
};

render(<App />);
