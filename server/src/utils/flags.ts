import { getExperimentationService } from '../services/experimentation';
import { ExperimentUser } from '../types/experimentation';
import { logger } from './logger';

export const evaluateFlag = async (
  flagKey: string,
  defaultValue: boolean,
  user: ExperimentUser
): Promise<boolean> => {
  try {
    const service = getExperimentationService();
    return await service.evaluateFlag(flagKey, user, defaultValue);
  } catch (err) {
    logger.warn('evaluateFlag failed — returning default', { flagKey, err });
    return defaultValue;
  }
};
