import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import GameAlert from '../components/GameAlert';
import './GameScreen.css';

const GameScreen = () => {
  const { settings, setSettings, setScreen, addPoints } = useGame();
  
  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbypaQ6sm4vXjux-kmGxIYK52vyeK_0bl6xwLAx6IXtj8Qv2IfXyhfZcSuMl15Jrd6aF/exec';
  const SHEET_ID = '1ennOugurxbD3OgqZ-z9tR4rWTmtTs7ih8lsSrOOau_U';

  const [isLocked, setIsLocked] = useState(true);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [allStages, setAllStages] = useState([]);
  const [stageConfig, setStageConfig] = useState({ score: 10, penalty: 0 });
  const [maxTime, setMaxTime] = useState({ time: 120 });
  
  const [totalScore, setTotalScore] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastStageScore, setLastStageScore] = useState(0);

  const isDataLoadedRef = useRef(false);

  const [showTimeBonus, setShowTimeBonus] = useState(false);
  const [showScoreMinus, setShowScoreMinus] = useState(false);

  const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: '', message: '' });
  const [isTimeWarning, setIsTimeWarning] = useState(false);
  

  const handleAddComponents = async () => {
    if (isLocked || settings.score < 5 || timeLeft > maxTime - 6) return;

    addPoints(-5);
    setTimeLeft(prev => {
      const newTime = prev + 5;
      if (newTime > 10) {
        setIsTimeWarning(false);
      }
      return newTime;
    });

    setShowTimeBonus(true);
    setShowScoreMinus(true);

    await logToSheet({
      sheet: "Журнал",
      sessionId: settings.sessionID,
      action: `Покупка времени (5 сек): ${currentJob} (Этап ${currentStageIndex + 1})`,
      score: -5
    });

    setTimeout(() => {
      setShowTimeBonus(false);
      setShowScoreMinus(false);
    }, 1000);
  };

  const getJobName = () => {
    const jobs = {
      "citizen": ["Горожанин", "Ремесленник", "Торговец", "Ополченец", "Оруженосец"],
      "knight": ["Оруженосец", "Рыцарь", "Рыцарь-бароннет", "Командор", "Магистр"]
    };
    return jobs[settings.rank]?.[settings.currentLevel - 1] || "";
  };   
  
  const currentJob = getJobName();
  const currentEstate = settings.rank === "knight" ? "Рыцарь" : "Горожанин";

  const parseStageInfo = (str) => {
    try {
      const regex = /(.+)\s*:\s*(\d+)\s*\((.+)\)/;
      const match = str.match(regex);
      if (!match) return null;

      const type = match[1].trim();
      const count = parseInt(match[2]);
      const params = match[3].split(',').map(p => parseInt(p.trim()));

      return {
        type,
        count,
        reward: params[0] || 10,
        penalty: params[1] || 0,
        time: params[2] || 120
      };
    } catch (e) {
      return null;
    }
  };

  const logToSheet = async (data, attempt = 0) => {
    
    try {
      await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch (e) { 
      console.error("Log error:", e);
      console.error("Attempt:", attempt);
      if (attempt < 5) {
        await logToSheet(data, attempt + 1)
      } else {
        console.log("МЫ НА ЭТОМ МЕСТЕ")
        setAlertConfig({
          isOpen: true,
          title: "Ошибка записи! Подзови преподавателя",
          message: JSON.stringify(data)
        });
      }

    };
  };

  const loadStageData = async (stageIdx, stagesList = []) => {
    setIsLoading(true);
    try {
      let stages = stagesList.length > 0 ? stagesList : allStages;
      
      if (stages.length === 0) {
        const rulesUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent("Правила")}`;
        const res = await fetch(rulesUrl);
        const csv = await res.text();
        const rows = csv.split('\n').slice(1);
        
        const rule = rows.map(row => {
          const cols = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
          return {
            estate: cols[0]?.replace(/"/g, '').trim(),
            job: cols[1]?.replace(/"/g, '').trim(),
            grade: cols[2]?.replace(/"/g, '').trim(),
            stages: cols.slice(3, 9).map(s => s?.replace(/"/g, '').trim()).filter(s => parseStageInfo(s))
          };
        }).find(r => r.estate === currentEstate && r.job === currentJob && String(r.grade) === String(settings.grade));

        if (!rule) throw new Error("Rules not found");
        stages = rule.stages;
        setAllStages(stages);
      }

      const config = parseStageInfo(stages[stageIdx]);
      setStageConfig({ score: config.reward, penalty: config.penalty });
      setMaxTime({ time:config.time });
      setTimeLeft(config.time);
      setIsTimeWarning(false);

      const tasksUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(config.type)}`;
      const tasksRes = await fetch(tasksUrl);
      const tasksCsv = await tasksRes.text();
      
      const filtered = tasksCsv.split('\n').slice(1).map((row, i) => {
        const cols = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        return {
          id: `t-${i}-${stageIdx}`,
          estate: cols[0]?.replace(/"/g, '').trim(),
          job: cols[1]?.replace(/"/g, '').trim(),
          grade: cols[2]?.replace(/"/g, '').trim(),
          question: cols[3]?.replace(/"/g, '').trim(),
          correctAnswer: cols[4]?.replace(/"/g, '').trim()
        };
      }).filter(t => t.estate === currentEstate && t.job === currentJob && String(t.grade) === String(settings.grade));

      setTasks(filtered.sort(() => 0.5 - Math.random()).slice(0, config.count));
      setAnswers(Array(config.count).fill(''));
      setIsLoading(false);
    } catch (e) {
      console.error(e);
      setScreen('LEVELS');
    }
  };

  const rewards = allStages.map(s => parseStageInfo(s)?.reward || 0);
  const minReward = Math.min(...rewards);
  const maxReward = Math.max(...rewards);

  const getStepIcon = (reward) => {
    if (reward === minReward) return 1;
    if (reward === maxReward) return 4;
    
    const range = maxReward - minReward;
    if (range === 0) return 1;
    
    const step = range / 3;
    if (reward < minReward + step) return 1;
    if (reward < minReward + step * 2) return 2;
    if (reward < minReward + step * 3) return 3;
    return 4;
  };

  useEffect(() => {
    if (!isDataLoadedRef.current) {
      isDataLoadedRef.current = true;
      loadStageData(0);
    }
  }, []);

  useEffect(() => {
    let timer;
    if (isTimerActive && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          const nextTime = prev - 1;
          // Если осталось 10 секунд и меньше — включаем мигалку
          if (nextTime <= 10 && nextTime > 0) {
            setIsTimeWarning(true);
          }
          return nextTime;
        });
      }, 1000);
    } else if (timeLeft === 0 && isTimerActive) {
      setIsTimeWarning(false);
      handleFinish("Время вышло");
    }
    return () => clearInterval(timer);
  }, [isTimerActive, timeLeft]);

  const handleStart = async () => {
    setIsLocked(false);
    setIsTimerActive(true);

    let activeSessionID = settings.sessionID; 

    if (!activeSessionID) {
      const generatedID = `${settings.name.split(" ")[0]}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      setSettings(prev => ({
        ...prev,
        sessionID: generatedID
      }));
      
      activeSessionID = generatedID;

      await logToSheet({
        sheet: "Список сессий",
        sessionId: generatedID,
        startTime: new Date().toLocaleString(),
        userName: settings.name || "Аноним",
        grade: settings.grade,
        rank: currentEstate
      });
    }
  };

  const handleFinish = async (reason = "Сдано") => {
    setIsTimerActive(false);
    setIsTimeWarning(false);
    
    let stageScore = 0;
    tasks.forEach((task, i) => {
      if (answers[i]?.toString().toLowerCase() === task.correctAnswer.toLowerCase()) {
        stageScore += stageConfig.score;
      } else {
        stageScore -= stageConfig.penalty;
      }
    });

    setLastStageScore(stageScore);
    setIsSubmitting(true);
    addPoints(stageScore);

    await logToSheet({
      sheet: "Журнал",
      sessionId: settings.sessionID,
      action: `${reason}: ${currentJob} (Этап ${currentStageIndex + 1})`,
      score: stageScore
    });

    setIsSubmitting(false);

    const nextIdx = currentStageIndex + 1;
    
    if (nextIdx < allStages.length && reason !== "Время вышло") {
      setCurrentStageIndex(nextIdx);
      setIsLocked(true);
      loadStageData(nextIdx);
    } else {
      if (reason === "Время вышло" || settings.score + stageScore < 0) {
        // тут выход из игры даже не переходя на LevelScreen, показать экран с результатом
        setSettings(prev => ({ ...prev, unlockedLevel: settings.currentLevel }));
      } else if (settings.isProgressLocked) {
        // let newLevel = Math.min(settings.unlockedLevel + 1, 5);
        // if (settings.currentLevel === 2) newLevel = Math.max(newLevel, 4);
        // else if (settings.currentLevel === 4) newLevel = Math.max(newLevel, 5);
        // else if (newLevel < 5) newLevel = Math.max(newLevel, settings.currentLevel + 1);
        setSettings(prev => ({ ...prev, unlockedLevel: Math.min(settings.unlockedLevel + 1, 5) }));
      }

      // Настройка алертов выхода
      if (settings.score + stageScore < 0 || reason === "Время вышло") {
        setAlertConfig({
          isOpen: true,
          title: reason === "Время вышло" ? "Время истекло!" : "Неудача!",
          message: reason === "Время вышло" ? "Ты не уложился в отведенное время. Попробуй еще раз!" : "Эта ступень не покорилась тебе, попробуй её пройти снова!"
        });
      } else {
        setAlertConfig({
          isOpen: true,
          title: "Поздравляю!",
          message: "Ты переходишь на ступень выше! Удачи в следующем турнире!"
        });
      }
    }
  };

  const timePercentage = Math.min((timeLeft / maxTime.time) * 100, 100);
  const strokeDashoffset = 100 - timePercentage;

  if (isLoading) return <div className="loading font-main">Загрузка заданий...</div>;

  return (
    <div className="game-screen-layout">
      
      {/* МГНОВЕННЫЙ ЭКРАН СОХРАНЕНИЯ */}
      {isSubmitting && (
        <div className="submit-overlay-screen">
          <div className="submit-overlay-content font-main">
            <h2 className="submit-score-title">Этап Завершен!</h2>
            <div className="submit-score-badge">
              Результат: <span className={lastStageScore >= 0 ? "score-positive" : "score-negative"}>
                {lastStageScore >= 0 ? `+${lastStageScore}` : lastStageScore} б.
              </span>
            </div>
            <p className="submit-loader-text">Сохранение прогресса...</p>
            <div className="submit-mini-spinner"></div>
          </div>
        </div>
      )}

      {/* ВСПЛЫВАЮЩЕЕ МИГАЮЩЕЕ ПРЕДУПРЕЖДЕНИЕ */}
      {isTimeWarning && (
        <div className="time-warning-toast font-main">
          ⏱ Время на исходе! Докупи секунды!
        </div>
      )}

      {/* ВЕРХНЯЯ УЗКАЯ ПАНЕЛЬ (ТЕКУЩИЙ ТУР + ТАЙМЕР + ОЧКИ + КНОПКА) */}
      <div className="game-header-panel">
        
        {/* Отображение туров (этапов) */}
        <div className="header-stages-zone">
          <div className="stages-icons-row">
            {allStages.map((stageStr, index) => {
              const config = parseStageInfo(stageStr);
              if (!config) return null;
              
              const iconNum = getStepIcon(config.reward);
              const isActive = index === currentStageIndex;
              
              return (
                <div 
                  key={`stage-step-${index}`} 
                  className={`stage-step-item ${isActive ? 'active' : 'dimmed'}`}
                >
                  <div className="icon-wrapper">
                    <img 
                      src={`assets/ui/step_icon_${iconNum}.png`} 
                      alt={`Stage ${index + 1}`} 
                      className="step-icon-img-header"
                    />
                  </div>
                  <span className="step-reward-label font-main">{config.reward} б.</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="header-status-zone">
          
          {/* Активная кнопка покупки времени (выключается, если очков < 5 или игра на паузе) */}
          <button 
            className="header-extra-btn font-main" 
            onClick={handleAddComponents}
            disabled={isLocked || settings.score < 5}
          >
            Добавить время
          </button>

          {/* Счётчик очков с контейнером для индикации */}
          <div className="score-container-wrapper">
            {showScoreMinus && <div className="floating-indicator minus-score font-main">-5 б.</div>}
            <div className="score-counter-box font-main">
              <span className="score-label">ОЧКИ</span>
              <span className="score-value">{settings.score}</span>
            </div>
          </div>

          {/* Компактный круглый таймер с контейнером для индикации */}
          <div className="timer-container-wrapper">
            {showTimeBonus && <div className="floating-indicator plus-time font-main">+5с</div>}
            <div className={`circular-timer ${timeLeft > maxTime.time ? 'overcharged' : ''} ${isTimeWarning ? 'critical-pulse' : ''}`}>
              <svg viewBox="0 0 36 36" className="timer-svg">
                <circle className="timer-bg" cx="18" cy="18" r="16" />
                <circle className="timer-bar" cx="18" cy="18" r="16" style={{ strokeDashoffset }} />
              </svg>
            <div className="timer-text">{timeLeft}</div>
          </div>
        </div>

      </div>
    </div>

      {/* НИЖНЯЯ ПРОСТОРНАЯ ОБЛАСТЬ С ПРИМЕРАМИ */}
      <div className="game-bottom-field">
        {isLocked && (
          <div className="fog-overlay">
            <img src='assets/ui/blocker.png' className="pic lower" alt="lower blocker"></img>
            <img src='assets/ui/blocker_upper.png' className="pic upper" alt="upper blocker"></img>
            <button className="start-btn-big font-main" onClick={handleStart}>
              {currentStageIndex === 0 ? "В БОЙ!" : "ПРОДОЛЖИТЬ"}
            </button>
          </div>
        )}

        <div className="task-container-scroll">
          <div className="task-list">
            {tasks.map((task, i) => (
              <div key={task.id} className="task-item">
                <span className="task-text">{task.question} = </span>
                <input 
                  type="text" 
                  className="math-input" 
                  disabled={isLocked}
                  value={answers[i]}
                  onChange={(e) => {
                    const newAns = [...answers];
                    newAns[i] = e.target.value;
                    setAnswers(newAns);
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        <button 
          className="finish-btn font-main" 
          onClick={() => handleFinish()} 
          disabled={isLocked || isSubmitting}
        >
          {isSubmitting ? "ОТПРАВКА..." : "СДАТЬ"}
        </button>
      </div>
      <GameAlert 
        isOpen={alertConfig.isOpen}
        title={alertConfig.title}
        message={alertConfig.message}
        onClose={() => {setAlertConfig(prev => ({ ...prev, isOpen: false })); setScreen('LEVELS');}}
      />
    </div>
  );
};

export default GameScreen;
