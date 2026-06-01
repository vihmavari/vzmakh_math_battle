import React, { useEffect } from 'react';
import { useGame } from '../context/GameContext';
import './StartScreen.css';

const StartScreen = () => {
  const { setScreen } = useGame();

  useEffect(() => {
    const handleKeyPress = () => setScreen('DIFFICULTY');
    window.addEventListener('keydown', handleKeyPress);
    window.addEventListener('touchstart', handleKeyPress); // Для планшетов

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('touchstart', handleKeyPress);
    };
  }, [setScreen]);

  return (
    <div className="screen start-bg">
      <div className="blink-text">Нажмите любую кнопку, чтобы продолжить</div>
    </div>
  );
};

export default StartScreen;