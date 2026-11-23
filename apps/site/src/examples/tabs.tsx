import { Tabs } from "@/ui/tabs";

export function Example() {
  return <Tabs defaultValue="activity" className="specimen-tabs"><Tabs.List aria-label="Project views"><Tabs.Tab value="overview">Overview</Tabs.Tab><Tabs.Tab value="activity">Activity</Tabs.Tab><Tabs.Tab value="files">Files</Tabs.Tab></Tabs.List><Tabs.Panel value="overview"><span className="sr-only">Project overview</span></Tabs.Panel><Tabs.Panel value="activity"><span className="sr-only">Recent activity</span></Tabs.Panel><Tabs.Panel value="files"><span className="sr-only">Project files</span></Tabs.Panel></Tabs>;
}
