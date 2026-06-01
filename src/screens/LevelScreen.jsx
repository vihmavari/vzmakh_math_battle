import React from 'react';
import { useGame } from '../context/GameContext';
import './LevelScreen.css';

const LevelScreen = () => {
  const { settings, setScreen, setSettings } = useGame();
  
  const levels = [1, 2, 3, 4, 5];
  const level_names = settings.rank === 'citizen' ? ["Горожанин", "Ремесленник", "Торговец", "Ополченец", "Оруженосец"] : 
                                                    ["Оруженосец", "Рыцарь", "Рыцарь-бароннет", "Командор", "Магистр"];
  const folder = settings.rank === 'knight' ? 'knight' : 'citizen';
  const bgImage = `{import.meta.env.BASE_URL}assets/bg/level_bg.png`;

  // Динамически определяем иконку в зависимости от ранга
  const headerIcon = `{import.meta.env.BASE_URL}assets/levels/${folder}_level.png`;

  const handleLevelClick = (level) => {
    if (level <= settings.unlockedLevel) {
      if (!settings.isProgressLocked) {
        setSettings(prev => ({ 
          ...prev, 
          isProgressLocked: true, 
          unlockedLevel: level,
          currentLevel: level 
        }));
      } else {
        setSettings(prev => ({ ...prev, currentLevel: level }));
      }

      setScreen('GAME');
    }
  };

  return (
    <div 
      className="screen level-layout" 
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      <button className="back-btn" onClick={() => setScreen('NAME')}>
        Назад
      </button>

      {/* НОВЫЙ БЛОК: Шапка по центру сверху */}
      <div className="level-screen-header">
        <img 
          src={headerIcon} 
          alt="Ранг" 
          className="header-rank-icon" 
        />
        <h1 className="header-title" style={{ fontFamily: "CiryllicHover" }}>
          Выбор уровня сложности боя
        </h1>
      </div>

      <div className="level-row">
        {levels.map((lvl) => {
          const isLocked = lvl > settings.unlockedLevel;
          return (
            <div 
              key={lvl} 
              className={`level-item ${isLocked ? 'locked' : 'available'}`}
              onClick={() => handleLevelClick(lvl)}
            >
              <div className="level-image-container">
                <img 
                  src={`{import.meta.env.BASE_URL}assets/levels/${folder}/level_${lvl}.png`} 
                  alt={`Этап ${lvl}`} 
                  className="level-img-content"
                />
              </div>
              <div className="level-label" style={{ fontFamily: "CiryllicHover" }}>{level_names[lvl-1]}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LevelScreen;