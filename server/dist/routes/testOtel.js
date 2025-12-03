"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const testOtel_1 = require("../controllers/testOtel");
const router = express_1.default.Router();
router.get('/otel', testOtel_1.testOtelIntegration);
exports.default = router;
//# sourceMappingURL=testOtel.js.map