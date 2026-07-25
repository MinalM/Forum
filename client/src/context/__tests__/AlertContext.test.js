import React from 'react';
import { render, act } from '@testing-library/react';
import { AlertProvider, useAlert } from '../AlertContext';

describe('AlertContext', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const renderProbe = () => {
    const setAlertIdentities = [];
    const removeAlertIdentities = [];

    const Probe = () => {
      const { setAlert, removeAlert } = useAlert();
      setAlertIdentities.push(setAlert);
      removeAlertIdentities.push(removeAlert);
      return null;
    };

    render(
      <AlertProvider>
        <Probe />
      </AlertProvider>
    );

    return { setAlertIdentities, removeAlertIdentities };
  };

  it('keeps setAlert identity stable across alert-triggered re-renders', () => {
    const { setAlertIdentities } = renderProbe();

    act(() => {
      setAlertIdentities[0]('first alert', 'danger');
    });

    // Adding an alert re-renders the provider; the consumer must receive
    // the same setAlert reference or effects depending on it will loop.
    expect(setAlertIdentities.length).toBeGreaterThan(1);
    expect(new Set(setAlertIdentities).size).toBe(1);
  });

  it('keeps removeAlert identity stable across alert-triggered re-renders', () => {
    const { setAlertIdentities, removeAlertIdentities } = renderProbe();

    act(() => {
      setAlertIdentities[0]('first alert', 'danger');
    });

    expect(removeAlertIdentities.length).toBeGreaterThan(1);
    expect(new Set(removeAlertIdentities).size).toBe(1);
  });
});
