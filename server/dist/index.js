"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const otel_1 = require("./instrumentation/otel");
const ld_observability_1 = require("./instrumentation/ld-observability");
if (!global.__OTEL_INITIALIZED__) {
    (0, otel_1.initTelemetry)();
    global.__OTEL_INITIALIZED__ = true;
}
if (!global.__LD_OBS_INITIALIZED__) {
    (0, ld_observability_1.initLD_Observability)();
    global.__LD_OBS_INITIALIZED__ = true;
}
require("./server");
//# sourceMappingURL=index.js.map