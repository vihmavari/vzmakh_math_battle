import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import './NameScreen.css';

const NameScreen = () => {
  const { settings, setSettings, setScreen } = useGame();
  const [playerName, setPlayerName] = useState('');

  const bgImage = settings.rank === 'knight' 
    ? '{import.meta.env.BASE_URL}assets/bg/knight_bg.png' 
    : '{import.meta.env.BASE_URL}assets/bg/citizen_bg.png';

  const handleNext = () => {
    if (playerName.trim().length >= 2) {
      setSettings(prev => ({ ...prev, name: playerName }));
      setScreen('LEVELS');
    } else {
      alert('Герой, назови себя!');
    }
  };

  // Тексты в зависимости от ранга
  const introText = settings.rank === 'knight' 
    ? "Уважаемый рыцарь, ты являешься участником рыцарского турнира. Чтобы вступить в состязание необходимо зарегистрироваться. Запиши имя и фамилию."
    : "Соискатель звания оруженосца, ты являешься участником турнира. Чтобы вступить в состязание необходимо зарегистрироваться. Запиши имя и фамилию.";

  return (
    <div 
      className="screen difficulty-layout" 
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      <div className="selection-area name-panel">
        {/* <div className='header-container'>
          <h3>Регистрация</h3>
          <div className="header-frame"></div>
        </div> */}

        <div className="grade-badge">{settings.grade} класс</div>

        <p className="intro-lore-text">{introText}</p>

        <div className="radio-group">
          <div className="radio-container">
            <input 
              type="text" 
              className="name-input" 
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Имя и фамилия..."
              maxLength={30}
              autoFocus
            />
            <div className="button-frame"></div>
          </div>
        </div>

        <button className="start-game-btn reg-btn" onClick={handleNext}>
        </button>
      </div>

      <div className="preview-area" style={{ border: 'none', background: 'none' }}>
      </div>
    </div>
  );
};

export default NameScreen;