import { ExperimentUser } from '../../types/experimentation';

export interface ExperimentationService {
  evaluateFlag(key: string, user: ExperimentUser, defaultValue: boolean): Promise<boolean>;
  getVariant(experimentKey: string, user: ExperimentUser): Promise<string>;
  logOutcome(eventName: string, user: ExperimentUser, value?: number): void;
  shutdown(): Promise<void>;
}
