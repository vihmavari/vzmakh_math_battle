import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import './GameScreen.css';

const GameScreen = () => {
  const { settings, setSettings, setScreen } = useGame();
  
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

  const isSessionInitialized = useRef(false);
  const sessionIdRef = useRef(`${settings.name.split(" ")[0]}-${Date.now()}-${Math.floor(Math.random() * 1000)}`);

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

  const logToSheet = async (data) => {
    try {
      await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch (e) { console.error("Log error:", e); }
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
      setTimeLeft(config.time); // Устанавливаем время этапа

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
    if (!isSessionInitialized.current) {
      isSessionInitialized.current = true;
      logToSheet({
        sheet: "Список сессий",
        sessionId: sessionIdRef.current,
        startTime: new Date().toLocaleString(),
        userName: settings.name || "Аноним",
        grade: settings.grade,
        rank: currentEstate
      });
      loadStageData(0);
    }
  }, []);

  useEffect(() => {
    let timer;
    if (isTimerActive && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && isTimerActive) {
      handleFinish("Время вышло");
    }
    return () => clearInterval(timer);
  }, [isTimerActive, timeLeft]);

  const handleStart = () => {
    setIsLocked(false);
    setIsTimerActive(true);
  };

  const handleFinish = async (reason = "Сдано") => {
    setIsTimerActive(false);
    
    let finalScore = 0;
    tasks.forEach((task, i) => {
      if (answers[i]?.toString().toLowerCase() === task.correctAnswer.toLowerCase()) {
        finalScore += stageConfig.score;
      } else {
        finalScore -= stageConfig.penalty;
      }
    });

    await logToSheet({
      sheet: "Журнал",
      sessionId: sessionIdRef.current,
      action: `${reason}: ${currentJob} (Этап ${currentStageIndex + 1})`,
      score: finalScore
    });

    const nextIdx = currentStageIndex + 1;
    if (nextIdx < allStages.length && reason !== "Время вышло") {
      setCurrentStageIndex(nextIdx);
      setIsLocked(true);
      loadStageData(nextIdx);
    } else {
      if (settings.isProgressLocked && reason !== "Время вышло") {
        let newLevel = settings.unlockedLevel;
        if (settings.currentLevel === 2) newLevel = Math.max(newLevel, 4);
        else if (settings.currentLevel === 4) newLevel = 5;
        else newLevel = settings.currentLevel + 1;
        setSettings(prev => ({ ...prev, unlockedLevel: newLevel }));
      }
      alert(reason === "Время вышло" ? "Время истекло! Сессия завершена." : "Все этапы пройдены!");
      setScreen('LEVELS');
    }
  };

  const strokeDashoffset = 100 - (timeLeft / maxTime.time) * 100;

  if (isLoading) return <div className="loading font-main">Загрузка летописей...</div>;

  return (
    <div className="game-screen-wrapper">
      <div className="game-half left-side">
        <div className="block-30 progress-header">
          <div className="stages-icons-row full-height-row">
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
                      className="step-icon-img-large"
                    />
                  </div>
                  <span className="step-reward-label font-main">
                    <br/>{config.reward} б.
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="block-70 main-play-field">
          {isLocked && (
            <div className="fog-overlay">
              <img src='assets/ui/blocker.png' className="pic lower"></img>
              <img src='assets/ui/blocker_upper.png' className="pic upper"></img>
              <button className="start-btn-big font-main" onClick={handleStart}>
                {currentStageIndex === 0 ? "В БОЙ!" : "ПРОДОЛЖИТЬ"}
              </button>
            </div>
          )}
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
          <button 
              className="finish-btn font-main" 
              onClick={() => handleFinish()} 
              disabled={isLocked}
            >
              СДАТЬ
            </button>
        </div>
      </div>

      <div className="game-half right-side">
        <div className="block-70 info-board">
          
          <div className="sub-col-40-new">
            <div className="level-art-container">
              <img 
                src={`assets/levels/${settings.rank}/level_${settings.currentLevel}.png`} 
                className="level-art-image" 
                alt="art" 
              />
            </div>
          </div>

          <div className="sub-col-60-new">
            <div className="shop-scroll font-main">
              <h4>ИНФО</h4>
              <p>Класс: {settings.grade}</p>
              <p>Чин: {currentJob}</p>
            </div>
          </div>
          
        </div>

        <div className="block-30 stats-footer">
          <div className="timer-zone">
            <div className="circular-timer">
              <svg viewBox="0 0 36 36" className="timer-svg">
                <circle className="timer-bg" cx="18" cy="18" r="16" />
                <circle className="timer-bar" cx="18" cy="18" r="16" style={{ strokeDashoffset }} />
              </svg>
              <div className="timer-text">{timeLeft}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameScreen;