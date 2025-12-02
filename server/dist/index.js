"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const otel_1 = require("./instrumentation/otel");
if (!global.__OTEL_INITIALIZED__) {
    (0, otel_1.initTelemetry)();
    global.__OTEL_INITIALIZED__ = true;
}
require("./server");
//# sourceMappingURL=index.js.map