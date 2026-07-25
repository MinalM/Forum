"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateFlag = void 0;
const experimentation_1 = require("../services/experimentation");
const logger_1 = require("./logger");
const evaluateFlag = async (flagKey, defaultValue, user) => {
    try {
        const service = (0, experimentation_1.getExperimentationService)();
        return await service.evaluateFlag(flagKey, user, defaultValue);
    }
    catch (err) {
        logger_1.logger.warn('evaluateFlag failed — returning default', { flagKey, err });
        return defaultValue;
    }
};
exports.evaluateFlag = evaluateFlag;
//# sourceMappingURL=flags.js.map