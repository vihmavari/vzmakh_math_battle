import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import './DifficultyScreen.css';

const DifficultyScreen = () => {
  const { settings, setSettings, setScreen } = useGame();
  const [leaderboard, setLeaderboard] = useState([]);
  const [isLoadingLeaders, setIsLoadingLeaders] = useState(true);

  const JOURNAL_SHEET_ID = '1w80OTpqIg6L9gLrMwzhybBJCvTgr9-26V7lwEJUyRYA';
  
  const grades = [1, 2, 3, 4, 5, 6];
  const ranks = [
    { id: 'citizen', label: 'Горожанин' },
    { id: 'knight', label: 'Рыцарь' }
  ];

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const currentEstate = settings.rank === 'knight' ? 'Рыцарь' : 'Горожанин';
  const characterAsset = `assets/chars/${settings.rank}.png`;

  const enterFullscreen = () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if (elem.mozRequestFullScreen) { /* Firefox */
      elem.mozRequestFullScreen();
    } else if (elem.webkitRequestFullscreen) { /* Chrome, Safari, Яндекс */
      elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) { /* IE/Edge */
      elem.msRequestFullscreen();
    }
  };

  useEffect(() => {
    enterFullscreen()
    const fetchLeaderboardData = async () => {
      try {
        const journalUrl = `https://docs.google.com/spreadsheets/d/${JOURNAL_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent("Журнал")}`;
        const journalRes = await fetch(journalUrl);
        const journalCsv = await journalRes.text();
        
        const journalRows = journalCsv.split('\n').slice(1);
        
        const rawLogs = journalRows.map(row => {
          const cols = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c?.replace(/"/g, '').trim());
          return {
            sessionId: cols[0],
            action: cols[1] || "",
            score: parseInt(cols[2]) || 0
          };
        });

        const sessionsUrl = `https://docs.google.com/spreadsheets/d/${JOURNAL_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent("Список сессий")}`;
        const sessionsRes = await fetch(sessionsUrl);
        const sessionsCsv = await sessionsRes.text();
        
        const sessionsRows = sessionsCsv.split('\n').slice(1);
        const sessionsMap = {};
        
        sessionsRows.forEach(row => {
          const cols = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c?.replace(/"/g, '').trim());
          const sId = cols[0];
          if (sId) {
            sessionsMap[sId] = {
              name: cols[2] || "Аноним",
              grade: String(cols[3]),
              estate: cols[4]
            };
          }
        });

        const fullLogs = rawLogs.map(log => {
          const student = sessionsMap[log.sessionId];
          return {
            ...log,
            name: student?.name || "Неизвестный герой",
            grade: student?.grade || "",
            estate: student?.estate || ""
          };
        }).filter(log => log.estate);

        setLeaderboard(fullLogs);
        setIsLoadingLeaders(false);
      } catch (e) {
        console.error("Ошибка загрузки летописи результатов:", e);
        setIsLoadingLeaders(false);
      }
    };

    fetchLeaderboardData();
  }, []);

  const getFilteredLeaderboard = () => {
    const targetGrade = String(settings.grade);
    
    const filtered = leaderboard.filter(log => log.grade === targetGrade && log.estate === currentEstate);
    
    const userScores = {};
    filtered.forEach(log => {
      if (!userScores[log.name]) {
        userScores[log.name] = 0;
      }
      userScores[log.name] += log.score;
    });

    return Object.entries(userScores)
      .map(([name, totalScore]) => ({ name, totalScore }))
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 30);
  };

  const currentLeaders = getFilteredLeaderboard();

  return (
    <div className="screen difficulty-layout">
      {/* ЛЕВАЯ ЧАСТЬ: СЕТКА НАСТРОЕК */}
      <div className="selection-area">
        
        <div className='header-container'>
          <h3>Ваш класс</h3>
          <div className="header-frame"></div>
        </div>
        
        <div className="radio-group">
          {grades.map(g => (
            <div className="radio-container" key={`grade-container-${g}`}>
              <button 
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
            <div className="radio-container" key={`rank-container-${r.id}`}> 
              <button 
                className={`radio-btn ${settings.rank === r.id ? 'active' : ''}`}
                onClick={() => updateSetting('rank', r.id)}
              >
                {r.label}
              </button>
              <div className="button-frame"></div>
            </div>
          ))}
        </div>

        {/* Сброс sessionID в соответствии с контекстом системы */}
        <button 
          className="start-game-btn" 
          onClick={() => { updateSetting('sessionID', ''); setScreen('NAME');}}
        >
          Продолжить
        </button>
      </div>

      {/* ПРАВАЯ ЧАСТЬ: ПРЕВЬЮ И ЛЕТОПИСЬ РЕЗУЛЬТАТОВ */}
      <div className="preview-area">
        
        <div className="character-card">
          <img src={characterAsset} alt={`${settings.grade} класс, ${settings.rank}`} />
        </div>

        {/* Окно таблицы лидеров */}
        <div className="leaderboard-box">
          <div className="leaderboard-header">
            Таблица лидеров ({settings.grade} класс)
          </div>
          
          {isLoadingLeaders ? (
            <div className="leaderboard-status">Разворачиваем свитки результатов...</div>
          ) : currentLeaders.length === 0 ? (
            <div className="leaderboard-status">В этом сословии ещё нет подвигов</div>
          ) : (
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th className="th-position">№</th>
                  <th className="th-name">Имя героя</th>
                  <th className="th-score">Баллы</th>
                </tr>
              </thead>
              <tbody>
                {currentLeaders.map((player, index) => (
                  <tr key={`leader-row-${index}`} className={`row-rank-${index + 1}`}>
                    <td className="td-position">
                      {index === 0 ? "👑" : index + 1}
                    </td>
                    <td className="td-name">{player.name}</td>
                    <td className="td-score">{player.totalScore} б.</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
};

export default DifficultyScreen;
