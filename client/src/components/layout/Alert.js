import React from 'react';
import { useAlert } from '../../context/AlertContext';

const Alert = () => {
  const { alerts, removeAlert } = useAlert();

  return (
    <div className="alert-wrapper">
      {alerts.length > 0 &&
        alerts.map(alert => (
          <div key={alert.id} className={`alert alert-${alert.type}`}>
            <i className="fas fa-info-circle"></i> {alert.msg}
            <button
              className="close-btn"
              onClick={() => removeAlert(alert.id)}
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        ))}
    </div>
  );
};

export default Alert;
