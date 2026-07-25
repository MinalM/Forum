import { ExperimentUser } from '../types/experimentation';
export declare const evaluateFlag: (flagKey: string, defaultValue: boolean, user: ExperimentUser) => Promise<boolean>;
