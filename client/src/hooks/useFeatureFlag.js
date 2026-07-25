import { useGateValue } from '@statsig/react-bindings';

export const useFeatureFlag = (flagKey, defaultValue = false) => {
  try {
    return useGateValue(flagKey);
  } catch {
    return defaultValue;
  }
};
