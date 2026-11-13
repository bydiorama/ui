import cli from "../../../../packages/cli/package.json";

export const cliFilename = `bydiorama-ui-${cli.version}.tgz`;
export const cliRun = `npx --package=./${cliFilename} bydiorama-ui`;
export const installCommand = (name: string) => `${cliRun} add ${name}`;
export const shadcnCommand = (name: string) => `npx shadcn@latest add @bydiorama/${name}`;
