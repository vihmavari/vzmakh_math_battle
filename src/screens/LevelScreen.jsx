import React from 'react';
import { useGame } from '../context/GameContext';
import './LevelScreen.css';

const LevelScreen = () => {
  const { settings, setScreen, setSettings } = useGame();
  
  const levels = [1, 2, 3, 4, 5];
  const level_names = settings.rank === 'citizen' ? ["Горожанин", "Ремесленник", "Торговец", "Ополченец", "Оруженосец"] : 
                                                    ["Оруженосец", "Рыцарь", "Рыцарь-бароннет", "Командор", "Магистр"];
  const folder = settings.rank === 'knight' ? 'knight' : 'citizen';
  const bgImage = `assets/bg/level_bg.png`;

  // Динамически определяем иконку в зависимости от ранга
  const headerIcon = `assets/levels/${folder}_level.png`;

  const activeLevel = settings.unlockedLevel || 1;

  const handleLevelClick = (level) => {
    if (level === activeLevel) {
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
          const isPassed = lvl < activeLevel;    // Уровень уже позади
          const isCurrent = lvl === activeLevel; // Уровень нужно проходить сейчас
          const isLocked = lvl > activeLevel;    // Уровень еще заблокирован

          let itemClass = "level-item";
          if (isPassed) itemClass += " passed";
          if (isCurrent) itemClass += " available current";
          if (isLocked) itemClass += " locked";

          return (
            <div 
              key={lvl} 
              className={itemClass}
              onClick={() => handleLevelClick(lvl)}
            >
              <div className="level-image-container">
                <img 
                  src={`assets/levels/${folder}/level_${lvl}.png`} 
                  alt={`Этап ${lvl}`} 
                  className="level-img-content"
                />
                
                {/* Если уровень пройден — вешаем декоративную метку */}
                {isPassed && <div className="passed-badge">Выполнено</div>}
              </div>
              <div className="level-label" style={{ fontFamily: "CiryllicHover" }}>
                {level_names[lvl-1]}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LevelScreen;