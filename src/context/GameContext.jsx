import React, { createContext, useState, useContext } from 'react';

const GameContext = createContext();

export const GameProvider = ({ children }) => {
  const [screen, setScreen] = useState('START');
  const [settings, setSettings] = useState({
    grade: 3,
    rank: 'citizen',
    name: '',
    unlockedLevel: 1,
    isProgressLocked: false,
    currentLevel: 1,
    sessionID: '',
    score: 0,
  });

  const addPoints = (points) => {
    setSettings(prev => ({
      ...prev,
      score: prev.score + points
    }));
  };

  return (
    <GameContext.Provider value={{ screen, setScreen, settings, setSettings, addPoints }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => useContext(GameContext);
