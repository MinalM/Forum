import React, { createContext, useContext, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

const AlertContext = createContext();

export const useAlert = () => useContext(AlertContext);

export const AlertProvider = ({ children }) => {
  const [alerts, setAlerts] = useState([]);

  // Set alert
  const setAlert = (msg, type, timeout = 5000) => {
    const id = uuidv4();
    setAlerts(prevAlerts => [...prevAlerts, { id, msg, type }]);

    setTimeout(() => removeAlert(id), timeout);
  };

  // Remove alert
  const removeAlert = (id) => {
    setAlerts(prevAlerts => prevAlerts.filter(alert => alert.id !== id));
  };

  return (
    <AlertContext.Provider
      value={{
        alerts,
        setAlert,
        removeAlert
      }}
    >
      {children}
    </AlertContext.Provider>
  );
};

export default AlertContext;
