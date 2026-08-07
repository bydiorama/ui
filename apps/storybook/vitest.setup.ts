// The real stylesheet, so tests observe the same computed styles a user sees.
import "./styles/index.css";

// React 19 needs this flag for direct render/rerender probes to flush inside
// act(). Playwright interactions cross a provider boundary, however, so React
// cannot observe their async boundary and emits false-positive act warnings
// for Base UI's queued focus and positioning work. Those provider interactions
// are awaited and asserted through the real browser below.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Unexpected browser errors are test failures, not decorative stderr. Tests
// for an intentional warning can temporarily spy on console.error; restoring
// that spy reinstates this guard.
const reportError = console.error.bind(console);
console.error = (...args: unknown[]) => {
  if (String(args[0]).includes("not wrapped in act")) return;
  reportError(...args);
  throw args[0] instanceof Error ? args[0] : new Error(`Unexpected console.error: ${String(args[0])}`);
};
