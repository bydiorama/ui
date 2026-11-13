import { Accordion } from "@/ui/accordion";

export function Example() {
  return <Accordion headingLevel={3} defaultValue={["source"]} className="example-accordion">
    <Accordion.Item value="source"><Accordion.Trigger>Can I change the source?</Accordion.Trigger><Accordion.Panel>Yes. The components live in your project, ready to read and adapt.</Accordion.Panel></Accordion.Item>
    <Accordion.Item value="brand"><Accordion.Trigger>Can I use my own brand?</Accordion.Trigger><Accordion.Panel>Use the shared tokens to bring your colours, type and shape into the system.</Accordion.Panel></Accordion.Item>
    <Accordion.Item value="agents"><Accordion.Trigger>Can my agent use the library?</Accordion.Trigger><Accordion.Panel>Each component has a Markdown reference with its API and composition guidance.</Accordion.Panel></Accordion.Item>
  </Accordion>;
}
