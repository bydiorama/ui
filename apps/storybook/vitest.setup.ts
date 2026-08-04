// The real stylesheet, so tests observe the same computed styles a user sees.
import "./styles/index.css";

// React 19 needs this flag for act() to flush synchronously; without it React
// warns and effects can settle after the assertion reads the DOM.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
