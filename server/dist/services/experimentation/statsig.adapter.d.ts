import { ExperimentationService } from './interface';
import { ExperimentUser } from '../../types/experimentation';
export declare class StatsigAdapter implements ExperimentationService {
    private secretKey;
    constructor(secretKey: string);
    initialize(): Promise<void>;
    evaluateFlag(key: string, user: ExperimentUser, defaultValue: boolean): Promise<boolean>;
    getVariant(experimentKey: string, user: ExperimentUser): Promise<string>;
    logOutcome(eventName: string, user: ExperimentUser, value?: number): void;
    shutdown(): Promise<void>;
}
