import statsig from 'statsig-node';
import { ExperimentationService } from './interface';
import { ExperimentUser } from '../../types/experimentation';
import { logger } from '../../utils/logger';

export class StatsigAdapter implements ExperimentationService {
  private secretKey: string;

  constructor(secretKey: string) {
    this.secretKey = secretKey;
  }

  async initialize(): Promise<void> {
    try {
      await statsig.initialize(this.secretKey);
      logger.info('Statsig initialized');
    } catch (err) {
      logger.warn('Statsig initialization failed — flags will return defaults', { err });
    }
  }

  async evaluateFlag(key: string, user: ExperimentUser, defaultValue: boolean): Promise<boolean> {
    try {
      return await statsig.checkGate(user as any, key);
    } catch (err) {
      logger.warn('Statsig evaluateFlag failed', { key, err });
      return defaultValue;
    }
  }

  async getVariant(experimentKey: string, user: ExperimentUser): Promise<string> {
    try {
      const experiment = await (statsig.getExperiment(user as any, experimentKey) as any);
      return experiment.get('variant', 'control');
    } catch (err) {
      logger.warn('Statsig getVariant failed', { experimentKey, err });
      return 'control';
    }
  }

  logOutcome(eventName: string, user: ExperimentUser, value?: number): void {
    try {
      statsig.logEvent(user as any, eventName, value);
    } catch (err) {
      logger.warn('Statsig logOutcome failed', { eventName, err });
    }
  }

  async shutdown(): Promise<void> {
    try {
      await statsig.shutdown();
    } catch (err) {
      logger.warn('Statsig shutdown failed', { err });
    }
  }
}
