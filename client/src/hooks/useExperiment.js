import { useExperiment as useStatsigExperiment } from '@statsig/react-bindings';

export const useExperiment = (experimentKey) => {
  try {
    const experiment = useStatsigExperiment(experimentKey);
    return experiment.get('variant', 'control');
  } catch {
    return 'control';
  }
};
