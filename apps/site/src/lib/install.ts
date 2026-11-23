import cli from "../../../../packages/cli/package.json";

/** The command a reader runs: the published package. */
export const npxRun = "npx @bydiorama/ui";
export const installCommand = (name: string) => `${npxRun} add ${name}`;
export const shadcnCommand = (name: string) => `npx shadcn@latest add @bydiorama/${name}`;

/** The same CLI as a file, for a project that cannot reach the registry. */
export const cliFilename = `bydiorama-ui-${cli.version}.tgz`;
export const cliRun = `npx --package=./${cliFilename} bydiorama-ui`;
