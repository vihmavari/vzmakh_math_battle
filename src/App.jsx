import React, { useEffect, useState } from 'react';
import { useGame } from './context/GameContext';
import StartScreen from './screens/StartScreen';
import DifficultyScreen from './screens/DifficultyScreen';
import NameScreen from './screens/NameScreen';
import LevelScreen from './screens/LevelScreen';
import GameScreen from './screens/GameScreen';
import { preloadAllAssets } from './utils/preload';
import assetsManifest from './utils/assets-manifest.json';

import './App.css';

const ASSETS_TO_PRELOAD = assetsManifest.map(path => `${path}`);


const App = () => {
  const { screen } = useGame();
  const [currentVisibleScreen, setCurrentVisibleScreen] = useState(screen);
  const [isBlackout, setIsBlackout] = useState(false);

  const [isAssetsLoaded, setIsAssetsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadAssets() {
      try {
        await preloadAllAssets(ASSETS_TO_PRELOAD);
        if (isMounted) {
          setIsAssetsLoaded(true);
        }
      } catch (error) {
        console.error('Ошибка при предзагрузке ресурсов:', error);
        if (isMounted) {
          setIsAssetsLoaded(true); // Страховка: пускаем в игру при любом раскладе
        }
      }
    }

    loadAssets();
    return () => { isMounted = false; };
  }, []);

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

  if (!isAssetsLoaded) {
    return (
      <div className="preloader-screen">
        <div className="preloader-content">
          <h1 className="font-main loading-text">Загрузка обители...</h1>
          <div className="preloader-spinner"></div>
        </div>
      </div>
    );
  }

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