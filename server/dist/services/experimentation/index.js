"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shutdownExperimentation = exports.initExperimentation = exports.getExperimentationService = void 0;
const statsig_adapter_1 = require("./statsig.adapter");
let _service = null;
const getExperimentationService = () => {
    if (!_service) {
        throw new Error('ExperimentationService not initialized. Call initExperimentation() first.');
    }
    return _service;
};
exports.getExperimentationService = getExperimentationService;
const initExperimentation = async () => {
    if (_service)
        return;
    const secretKey = process.env.STATSIG_SERVER_SECRET_KEY;
    if (!secretKey) {
        return;
    }
    const adapter = new statsig_adapter_1.StatsigAdapter(secretKey);
    await adapter.initialize();
    _service = adapter;
};
exports.initExperimentation = initExperimentation;
const shutdownExperimentation = async () => {
    if (_service) {
        await _service.shutdown();
        _service = null;
    }
};
exports.shutdownExperimentation = shutdownExperimentation;
//# sourceMappingURL=index.js.map