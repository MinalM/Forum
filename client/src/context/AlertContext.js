import React, { createContext, useContext, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

const AlertContext = createContext();

export const useAlert = () => useContext(AlertContext);

export const AlertProvider = ({ children }) => {
  const [alerts, setAlerts] = useState([]);

  // Stable identities: consumers use these in effect dependency arrays,
  // so recreating them on each render would re-trigger those effects.
  const removeAlert = useCallback((id) => {
    setAlerts(prevAlerts => prevAlerts.filter(alert => alert.id !== id));
  }, []);

  const setAlert = useCallback((msg, type, timeout = 5000) => {
    const id = uuidv4();
    setAlerts(prevAlerts => [...prevAlerts, { id, msg, type }]);

    setTimeout(() => removeAlert(id), timeout);
  }, [removeAlert]);

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
