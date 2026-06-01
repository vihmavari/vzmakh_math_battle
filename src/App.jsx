import React, { useEffect, useState } from 'react';
import { useGame } from './context/GameContext';
import StartScreen from './screens/StartScreen';
import DifficultyScreen from './screens/DifficultyScreen';
import NameScreen from './screens/NameScreen';
import LevelScreen from './screens/LevelScreen';
import GameScreen from './screens/GameScreen';
import './App.css';


const App = () => {
  const { screen } = useGame();
  const [currentVisibleScreen, setCurrentVisibleScreen] = useState(screen);
  const [isBlackout, setIsBlackout] = useState(false);

  useEffect(() => {
    if (screen !== currentVisibleScreen) {
      setIsBlackout(true);

      const timer = setTimeout(() => {
        setCurrentVisibleScreen(screen);
        setIsBlackout(false);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [screen, currentVisibleScreen]);

  return (
    <div className="game-wrapper" style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      
      {currentVisibleScreen === 'START' && <StartScreen />}
      {currentVisibleScreen === 'DIFFICULTY' && <DifficultyScreen />}
      {currentVisibleScreen === 'NAME' && <NameScreen />}
      {currentVisibleScreen === 'LEVELS' && <LevelScreen />}
      {currentVisibleScreen === 'GAME' && <GameScreen />}

      <div 
        className={`fade-overlay ${isBlackout ? 'active' : ''}`} 
      />
    </div>
  );
};

export default App;