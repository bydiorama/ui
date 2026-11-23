import { Accordion } from "@/ui/accordion";

export const faq = [
  { value: "package", question: "Is this a package I install?", answer: "No. The CLI copies components into your app as source, and you own them from then on." },
  { value: "shadcn", question: "Does it work with the shadcn CLI?", answer: "Yes. Every item follows the open shadcn registry schema, so the shadcn CLI can install it. It drops each file's leading comments, and it has no lockfile. Our own CLI keeps both and never overwrites your edits." },
  { value: "brand", question: "Can I use my own brand colours and typeface?", answer: "Yes. Give the theme command seven colours and it writes a full light and dark theme, with the contrast checked. Your body and display typefaces go in the same seed." },
  { value: "updates", question: "How do I get updates after I have changed a component?", answer: "Run sync. It compares what you installed with the registry and lists what changed since. A component you changed is recorded as a fork, and nothing overwrites it." },
  { value: "agents", question: "What does my coding agent get?", answer: "A typed doc beside every component, a record of every change, and skills that teach it the library's rules." },
  { value: "production", question: "Is it ready for production?", answer: "Diorama's own products are built with it. The CLI is at 0.1.0, so expect changes, each one recorded in the changelog." },
];

/** Every question starts closed, so the six read as one scannable list; a
 *  reader opens the ones they came for. */
export function Faq() {
  return (
    <Accordion headingLevel={3} className="faq-list">
      {faq.map(item => (
        <Accordion.Item key={item.value} value={item.value}>
          <Accordion.Trigger>{item.question}</Accordion.Trigger>
          <Accordion.Panel>{item.answer}</Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  );
}
