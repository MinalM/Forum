import { useExperiment as useStatsigExperiment } from '@statsig/react-bindings';

export const useExperiment = (experimentKey) => {
  try {
    const experiment = useStatsigExperiment(experimentKey);
    return experiment.groupName ?? 'control';
  } catch {
    return 'control';
  }
};
