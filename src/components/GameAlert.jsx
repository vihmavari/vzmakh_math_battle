import React from 'react';
import './GameAlert.css';

const GameAlert = ({ isOpen, title, message, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="alert-overlay-screen">
      <div className="alert-overlay-content">
        {title && <div className="alert-score-title font-main">{title}</div>}
        <div className="alert-message-badge font-main">
          {message}
        </div>
        <button className="alert-close-btn font-main" onClick={onClose}>
          ОК
        </button>
      </div>
    </div>
  );
};

export default GameAlert;
