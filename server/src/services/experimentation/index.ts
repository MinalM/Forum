import { StatsigAdapter } from './statsig.adapter';
import { ExperimentationService } from './interface';

let _service: ExperimentationService | null = null;

export const getExperimentationService = (): ExperimentationService => {
  if (!_service) {
    throw new Error('ExperimentationService not initialized. Call initExperimentation() first.');
  }
  return _service;
};

export const initExperimentation = async (): Promise<void> => {
  if (_service) return;
  const secretKey = process.env.STATSIG_SERVER_SECRET_KEY;
  if (!secretKey) {
    return;
  }
  const adapter = new StatsigAdapter(secretKey);
  await adapter.initialize();
  _service = adapter;
};

export const shutdownExperimentation = async (): Promise<void> => {
  if (_service) {
    await _service.shutdown();
    _service = null;
  }
};
