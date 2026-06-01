import React from 'react';
import { useGame } from '../context/GameContext';
import './DifficultyScreen.css';

const DifficultyScreen = () => {
  const { settings, setSettings, setScreen } = useGame();

  const grades = [3, 4, 5, 6];
  const ranks = [
    { id: 'citizen', label: 'Горожанин' },
    { id: 'knight', label: 'Рыцарь' }
  ];

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const characterAsset = `{import.meta.env.BASE_URL}assets/chars/${settings.rank}.png`;

  return (
    <div className="screen difficulty-layout">
      <div className="selection-area">
        <div className='header-container'>
          <h3>Ваш класс</h3>
          <div className="header-frame"></div>
        </div>
        <div className="radio-group">
          {grades.map(g => (
            <div className="radio-container" key={g}>
              <button 
                key={g} 
                className={`radio-btn ${settings.grade === g ? 'active' : ''}`}
                onClick={() => updateSetting('grade', g)}
              >
                {g} класс
              </button> 
              <div className="button-frame"></div>
            </div>
          ))}
        </div>
        
        <div className='header-container'>
          <h3>Ваш ранг</h3>
          <div className="header-frame"></div>
        </div>
        
        <div className="radio-group">
          {ranks.map(r => (
            <div className="radio-container" key={r}> 
              <button 
                key={r.id} 
                className={`radio-btn ${settings.rank === r.id ? 'active' : ''}`}
                onClick={() => updateSetting('rank', r.id)}
              >
                {r.label}
              </button>
              <div className="button-frame"></div>
            </div>
          ))}
        </div>

        <button className="start-game-btn" onClick={() => {updateSetting('sessionId', false);setScreen('NAME'); }}>
          Продолжить
        </button>
      </div>

      <div className="preview-area">
        <div className="character-card">
          <img src={characterAsset} alt={`${settings.grade} класс, ${settings.rank} (${characterAsset})`} />
        </div>
      </div>
    </div>
  );
};

export default DifficultyScreen;