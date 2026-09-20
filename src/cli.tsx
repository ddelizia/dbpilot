#!/usr/bin/env node
import React, { useState } from 'react';
import { render, Box, useApp, useInput } from 'ink';
import { Header } from './components/Header.js';
import { MainMenu, MenuOption } from './components/MainMenu.js';
import { ViewPostgresSchemas } from './components/views/ViewPostgresSchemas.js';
import { ViewTypesenseCollections } from './components/views/ViewTypesenseCollections.js';
import { CreatePostgresDb } from './components/views/CreatePostgresDb.js';
import { CreateTypesenseCollection } from './components/views/CreateTypesenseCollection.js';
import { AddPostgresUser } from './components/views/AddPostgresUser.js';
import { AddTypesenseUser } from './components/views/AddTypesenseUser.js';

const App: React.FC = () => {
  const { exit } = useApp();
  const [currentView, setCurrentView] = useState<MenuOption | 'menu'>('menu');

  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      exit();
    }
  });

  const handleMenuSelect = (selected: MenuOption) => {
    if (selected === 'exit') {
      exit();
    } else {
      setCurrentView(selected);
    }
  };

  const handleBackToMenu = () => {
    setCurrentView('menu');
  };

  const getViewTitle = (): string => {
    switch (currentView) {
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
      case 'add-ts-user':
        return 'Add Key/User to Typesense Collection';
      default:
        return 'Main Menu';
    }
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Header currentViewTitle={getViewTitle()} />

      {currentView === 'menu' && <MainMenu onSelect={handleMenuSelect} />}

      {currentView === 'view-pg-schemas' && (
        <ViewPostgresSchemas onBack={handleBackToMenu} />
      )}

      {currentView === 'view-ts-collections' && (
        <ViewTypesenseCollections onBack={handleBackToMenu} />
      )}

      {currentView === 'create-pg-db' && (
        <CreatePostgresDb onBack={handleBackToMenu} />
      )}

      {currentView === 'create-ts-collection' && (
        <CreateTypesenseCollection onBack={handleBackToMenu} />
      )}

      {currentView === 'add-pg-user' && (
        <AddPostgresUser onBack={handleBackToMenu} />
      )}

      {currentView === 'add-ts-user' && (
        <AddTypesenseUser onBack={handleBackToMenu} />
      )}
    </Box>
  );
};

render(<App />);
