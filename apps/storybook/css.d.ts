// Vite resolves `import "./index.css"` as a side effect; tsc needs to be told
// the module exists. Nothing imports a value from it.
declare module "*.css";
