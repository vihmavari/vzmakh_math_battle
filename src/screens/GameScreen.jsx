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
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastStageScore, setLastStageScore] = useState(0);

  const isDataLoadedRef = useRef(false);

  const [timeBonusKey, setTimeBonusKey] = useState(0);
  const [scoreMinusKey, setScoreMinusKey] = useState(0);

  const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: '', message: '' });
  const [isTimeWarning, setIsTimeWarning] = useState(false);

  const [finishTitle, setFinishTitle] = useState("");
  const [finishBadge, setFinishBadge] = useState("");
  const [isGameFinished, setIsGameFinished] = useState(false);
  const [finishReason, setFinishReason] = useState("");
  
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.code === 'KeyX') {
        e.preventDefault(); 
        if (!isLocked && !isSubmitting && !isGameFinished) {
          console.log("Сессия прервана администратором через горячие клавиши");
          handleFinish("Прервано");
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLocked, isSubmitting, isGameFinished, tasks, answers, stageConfig, settings]);

  const handleAddComponents = async () => {
    if (isLocked || settings.score < 5) return;

    addPoints(-5);
    setTimeLeft(prev => {
      const newTime = prev + 5;
      if (newTime > 10) {
        setIsTimeWarning(false);
      }
      return newTime;
    });

    setTimeBonusKey(Date.now());
    setScoreMinusKey(Date.now());

    await logToSheet({
      sheet: "Журнал",
      sessionId: settings.sessionID,
      action: `Покупка времени (5 сек): ${currentJob} (Этап ${currentStageIndex + 1})`,
      score: -5
    });
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
          tour: cols[2]?.replace(/"/g, '').trim(),
          grade: cols[3]?.replace(/"/g, '').trim(),
          question: cols[4]?.replace(/"/g, '').trim(),
          correctAnswer: cols[5]?.replace(/"/g, '').trim()
        };
      }).filter(t => t.estate === currentEstate && t.job === currentJob && String(t.tour) === String(stageIdx + 1) && String(t.grade) === String(settings.grade));

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

  const renderMathText = (text) => {
    if (!text) return "";

    const powerRegex = /(\(([^)]+)\)|[a-zA-Z0-9])\^(\(([^)]+)\)|[a-zA-Z0-9]+)/g;
    
    const fractionRegex = /(\(([^)]+)\)|[a-zA-Z0-9]+)\/(\(([^)]+)\)|[a-zA-Z0-9]+)/g;

    if (!text.includes('^') && !text.includes('/')) {
      return text;
    }

    let elements = [{ type: 'text', content: text }];

    // --- ЭТАП 1: Выделяем степени ---
    let updatedElements = [];
    elements.forEach(el => {
      if (el.type !== 'text') {
        updatedElements.push(el);
        return;
      }

      let lastIndex = 0;
      let match;
      powerRegex.lastIndex = 0;

      while ((match = powerRegex.exec(el.content)) !== null) {
        if (match.index > lastIndex) {
          updatedElements.push({ type: 'text', content: el.content.substring(lastIndex, match.index) });
        }
        
        const base = match[2] ? match[2] : match[1];
        const exponent = match[4] ? match[4] : match[3];

        updatedElements.push({ type: 'power', base, exponent });
        lastIndex = powerRegex.lastIndex;
      }
      
      if (lastIndex < el.content.length) {
        updatedElements.push({ type: 'text', content: el.content.substring(lastIndex) });
      }
    });
    elements = updatedElements;

    // --- ЭТАП 2: Выделяем дроби ---
    updatedElements = [];
    elements.forEach(el => {
      if (el.type !== 'text') {
        updatedElements.push(el);
        return;
      }

      let lastIndex = 0;
      let match;
      fractionRegex.lastIndex = 0;

      while ((match = fractionRegex.exec(el.content)) !== null) {
        if (match.index > lastIndex) {
          updatedElements.push({ type: 'text', content: el.content.substring(lastIndex, match.index) });
        }
        
        const numerator = match[2] ? match[2] : match[1];
        
        const denominator = match[4] ? match[4] : match[3];

        updatedElements.push({ type: 'fraction', num: numerator, denom: denominator });
        lastIndex = fractionRegex.lastIndex;
      }

      if (lastIndex < el.content.length) {
        updatedElements.push({ type: 'text', content: el.content.substring(lastIndex) });
      }
    });
    elements = updatedElements;

    return (
      <span className="math-row-render">
        {elements.map((el, index) => {
          if (el.type === 'power') {
            return (
              <span key={`pwr-${index}`} className="power-wrapper">
              {renderMathText(el.base)}<sup>{renderMathText(el.exponent)}</sup>
            </span>
          );
        }
        if (el.type === 'fraction') {
          return (
            <span key={`frac-${index}`} className="fraction-wrapper">
              <span className="fraction-numerator">{renderMathText(el.num)}</span>
              <span className="fraction-line"></span>
              <span className="fraction-denominator">{renderMathText(el.denom)}</span>
            </span>
          );
        }
        return <span key={`txt-${index}`}>{el.content}</span>;
      })}
    </span>
  );
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
    const isOutOfPoints = (settings.score + stageScore) < 0;

    // === КРИТИЧЕСКИЙ ВЫЛЕТ (Время вышло или кончились очки) ===
    if (reason === "Время вышло" || isOutOfPoints) {
      setSettings(prev => ({ ...prev, unlockedLevel: settings.unlockedLevel }));

      setFinishTitle(reason === "Время вышло" ? "Время истекло!" : "Неудача!");
      setFinishBadge(reason === "Время вышло" ? "вышло время" : "все очки потрачены");
      setFinishReason(reason === "Время вышло" 
        ? "Ты не уложился в отведенное время. Тренируйся, чтобы молниеносно принимать решения!" 
        : "Эта ступень не покорилась тебе. Тренируйся, чтобы в следующий раз покорить ещё большие преграды!");
      
      setIsGameFinished(true);
      return;
    }

    // === СЕССИЯ ПРЕРВАНА ===
    if (reason === "Прервано") {
      setFinishTitle("Турнир окончен!");
      setFinishBadge("сессия прервана");
      setFinishReason("Рыцарский турнир был завершен досрочно.");
      setIsGameFinished(true);
      return;
    }

    // === ПЕРЕХОД НА СЛЕДУЮЩИЙ ТУР ВНУТРИ ОДНОГО ЭТАПА ===
    if (nextIdx < allStages.length) {
      setCurrentStageIndex(nextIdx);
      setIsLocked(true);
      loadStageData(nextIdx);
    } 
    // === ВСЕ ТУРЫ ЭТАПА ЗАВЕРШЕНЫ ===
    else {
      const currentLevelNum = parseInt(settings.currentLevel, 10) || 1;
      
      // Проверяем, последний ли это этап в игре (допустим, максимум 5)
      const isLastTournamentStage = currentLevelNum >= 5;

      if (!isLastTournamentStage) {
        // А) Это промежуточный Этап -> Переводим на ступень выше
        if (settings.isProgressLocked) {
          setSettings(prev => ({ ...prev, unlockedLevel: Math.min(settings.unlockedLevel + 1, 5) }));
        }
        setAlertConfig({
          isOpen: true,
          title: "Поздравляю!",
          message: "Ты переходишь на ступень выше! Удачи на твоём пути!"
        });
      } else {
        // Б) Это САМЫЙ ПОСЛЕДНИЙ ЭТАП -> Полное руководство турнира пройдено!
        if (settings.isProgressLocked) {
          setSettings(prev => ({ ...prev, unlockedLevel: 5 }));
        }

        setFinishTitle("Турнир окончен!");
        setFinishBadge("все этапы пройдены");
        setFinishReason("Поздравляю! Ты полностью завершил турнир и прошёл все испытания на своём пути!");
        setIsGameFinished(true);
      }
    }
  };

  const timePercentage = Math.min((timeLeft / maxTime.time) * 100, 100);
  const strokeDashoffset = 100 - timePercentage;

  if (isLoading) return <div className="loading font-main">Загрузка заданий...</div>;


  if (isGameFinished) {
    return (
      <div className="game-screen-layout final-screen-bg">
        <div className="final-scroll-container font-main">
          <h1 className="final-title">{finishTitle}</h1>
          <div className="final-reason-badge">{finishBadge}</div>

          <p className="final-motivation-text">{finishReason}</p>

          <div className="final-stats-box">
            <div className="final-stat-item">
              <span className="stat-label">Достигнутая ступень:</span>
              <span className="stat-value text-highlight">{currentJob} ({currentEstate})</span>
            </div>
            <div className="final-stat-item">
              <span className="stat-label">Итоговый счет:</span>
              <span className="stat-value total-score-shimmer">{settings.score} б.</span>
            </div>
          </div>

          <button className="finish-btn final-close-btn" onClick={() => setScreen('START')}>
            Завершить
          </button>
        </div>
      </div>
    );
  }

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
          {settings.score >= 5 ? (
            <>⏱ Время на исходе! Докупи секунды!</>
          ) : (
            <>⏱ Время на исходе! Поторопись!</>
          )}
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
          {scoreMinusKey > 0 && (
            <div key={scoreMinusKey} className="floating-indicator minus-score font-main">-5 б.</div>
          )}
          <div className="score-counter-box font-main">
            <span className="score-label">ОЧКИ</span>
            <span className="score-value">{settings.score}</span>
          </div>
        </div>

        {/* Находится внутри timer-container-wrapper */}
        <div className="timer-container-wrapper">
          {timeBonusKey > 0 && (
            <div key={timeBonusKey} className="floating-indicator plus-time font-main">+5с</div>
          )}
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
            {tasks.map((task, i) => {
              const config = parseStageInfo(allStages[currentStageIndex]);
              const taskType = config?.type?.toLowerCase() || 'примеры';
              const isTextTask = taskType === 'задачи';
              const isEquation = taskType === 'уравнения';

              let itemClass = "task-item";
              if (isTextTask) itemClass += " text-task-mode";
              else if (isEquation) itemClass += " equation-mode";
              else itemClass += " classic-mode";

              return (
                <div key={task.id} className={itemClass}>
                  {isTextTask ? (
                    /* ВЕРСТКА ДЛЯ ТЕКСТОВЫХ ЗАДАЧ: Текст на всю ширину, инпут внизу */
                    <>
                      <div className="task-story-text">{task.question}</div>
                      <div className="task-answer-row">
                        <span className="task-answer-prefix">Ответ: </span>
                        <input 
                          type="text" 
                          className="math-input text-task-input" 
                          disabled={isLocked}
                          value={answers[i]}
                          onChange={(e) => {
                            const newAns = [...answers];
                            newAns[i] = e.target.value;
                            setAnswers(newAns);
                          }}
                        />
                      </div>
                    </>
                  ) : isEquation ? (
                    /* ВЕРСТКА ДЛЯ УРАВНЕНИЙ */
                    <>
                      <div className="equation-text">{renderMathText(task.question)}</div>
                      <div className="equation-answer-row">
                        <span className="equation-prefix">x = </span>
                        <input 
                          type="text" 
                          className="math-input equation-input" 
                          disabled={isLocked}
                          value={answers[i]}
                          onChange={(e) => {
                            const newAns = [...answers];
                            newAns[i] = e.target.value;
                            setAnswers(newAns);
                          }}
                        />
                      </div>
                    </>
                  ) : (
                    /* СТАНДАРТНАЯ ВЕРСТКА ДЛЯ ПРИМЕРА */
                    <>
                      <span className="task-text">{renderMathText(task.question)} = </span>
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
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <button 
          className="finish-btn font-main" 
          onClick={() => handleFinish()} 
          disabled={isLocked || isSubmitting}
        >
          {isSubmitting ? "ОТПРАВКА..." : "ДАЛЬШЕ"}
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
