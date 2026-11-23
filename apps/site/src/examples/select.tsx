import { Select } from "@/ui/select";

export function Example() { return <Select label="Project role" defaultValue="editor" size="md" items={[{value:"editor",label:"Editor"},{value:"reviewer",label:"Reviewer"},{value:"viewer",label:"Viewer"}]} />; }
