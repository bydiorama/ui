import { useState } from "react";
import { Button } from "@/ui/button";
import { Tabs } from "@/ui/tabs";
import { cliFilename, installCommand, shadcnCommand } from "../lib/install";

export function Install({ name }: { name: string }) {
  const [copied, setCopied] = useState<string | null>(null);
  const filename = cliFilename;
  const commands = { diorama: installCommand(name), shadcn: shadcnCommand(name) };
  async function copy(key: keyof typeof commands) {
    try { await navigator.clipboard.writeText(commands[key]); setCopied(key); } catch { setCopied(null); }
  }
  return <Tabs defaultValue="diorama" variant="ghost" className="installation">
    <Tabs.List aria-label="Installation method"><Tabs.Tab value="diorama">Diorama CLI</Tabs.Tab><Tabs.Tab value="shadcn">shadcn</Tabs.Tab></Tabs.List>
    {(["diorama", "shadcn"] as const).map(key => <Tabs.Panel key={key} value={key} isAlwaysMounted><div className="code-frame"><div className="code-heading"><span>Terminal</span><Button variant="ghost" size="sm" onClick={() => void copy(key)}>{copied === key ? "Copied" : "Copy"}</Button></div><pre><code>{commands[key]}</code></pre></div>{key === "diorama" ? <p className="install-help"><a href={`/downloads/${filename}`} download>Download the CLI preview</a> into your project, then <a href="/docs/#install">initialise it</a>. The npm release is being prepared.</p> : <p className="install-help">For existing shadcn apps. <a href="/docs/#shadcn">Connect the registry</a> first.</p>}</Tabs.Panel>)}
  </Tabs>;
}
