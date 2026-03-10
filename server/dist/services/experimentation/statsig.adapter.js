"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatsigAdapter = void 0;
const statsig_node_1 = __importDefault(require("statsig-node"));
const logger_1 = require("../../utils/logger");
class StatsigAdapter {
    constructor(secretKey) {
        this.secretKey = secretKey;
    }
    async initialize() {
        try {
            await statsig_node_1.default.initialize(this.secretKey);
            logger_1.logger.info('Statsig initialized');
        }
        catch (err) {
            logger_1.logger.warn('Statsig initialization failed — flags will return defaults', { err });
        }
    }
    async evaluateFlag(key, user, defaultValue) {
        try {
            return await statsig_node_1.default.checkGate(user, key);
        }
        catch (err) {
            logger_1.logger.warn('Statsig evaluateFlag failed', { key, err });
            return defaultValue;
        }
    }
    async getVariant(experimentKey, user) {
        try {
            const experiment = await statsig_node_1.default.getExperiment(user, experimentKey);
            return experiment.get('variant', 'control');
        }
        catch (err) {
            logger_1.logger.warn('Statsig getVariant failed', { experimentKey, err });
            return 'control';
        }
    }
    logOutcome(eventName, user, value) {
        try {
            statsig_node_1.default.logEvent(user, eventName, value);
        }
        catch (err) {
            logger_1.logger.warn('Statsig logOutcome failed', { eventName, err });
        }
    }
    async shutdown() {
        try {
            await statsig_node_1.default.shutdown();
        }
        catch (err) {
            logger_1.logger.warn('Statsig shutdown failed', { err });
        }
    }
}
exports.StatsigAdapter = StatsigAdapter;
//# sourceMappingURL=statsig.adapter.js.map