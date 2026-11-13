import { useEffect, useRef, useState } from "react";
import { Close, Search as SearchIcon } from "griddy-icons";
import { Modal } from "@/ui/modal";
import { Input } from "@/ui/input";
import { Button } from "@/ui/button";

type Entry = { name: string; title: string; lead: string; category: string };
export function Search({ entries }: { entries: Entry[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  useEffect(() => {
    const open = () => setIsOpen(true);
    const shortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); open(); }
    };
    document.addEventListener("keydown", shortcut);
    document.addEventListener("site-search", open);
    return () => { document.removeEventListener("keydown", shortcut); document.removeEventListener("site-search", open); };
  }, []);
  const results = entries.filter(item => `${item.title} ${item.lead} ${item.category}`.toLowerCase().includes(query.toLowerCase().trim()));
  return <Modal isOpen={isOpen} onOpenChange={setIsOpen}><Modal.Trigger render={<Button variant="ghost" size="md">Search <kbd>⌘K</kbd></Button>}>Search <kbd>⌘K</kbd></Modal.Trigger><Modal.Surface initialFocus={inputRef} size="lg" className="search-surface"><div className="search-heading"><Modal.Title>Find a component</Modal.Title><Modal.Close render={<Button variant="ghost" isIconOnly aria-label="Close search" icon={<Close />} />} /></div><Modal.Description>Search by name, purpose or category.</Modal.Description><Input ref={inputRef} label="Search the library" isLabelHidden placeholder="What are you building?" icon={<SearchIcon />} value={query} onChange={event => setQuery(event.target.value)} /><ul className="search-results">{results.map(item => <li key={item.name}><a href={`/components/${item.name}/`}><strong>{item.title}</strong><span>{item.lead}</span></a></li>)}</ul>{results.length === 0 && <p role="status">Nothing here yet. Try a different word or browse the components.</p>}</Modal.Surface></Modal>;
}
