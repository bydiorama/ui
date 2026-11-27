import { Fragment, useId, useState } from "react";
import { ChevronDown } from "griddy-icons";
import { Badge } from "@/ui/badge";
import { Presence } from "@/ui/presence";
import { TextSwap } from "@/ui/text-swap";
import { Button } from "@/ui/button";
import type { Item } from "../../lib/catalog";
import { plainDefault, typeChips } from "../../lib/detail";

type Props = Item["docs"]["props"];

/**
 * Every prop with the reason it exists. A union of literals reads as chips,
 * anything else as the type itself; a prop's note opens in its own row.
 * Past the first few rows the rest wait behind one button. Without
 * JavaScript every row shows (the page's noscript style) and the notes
 * are listed instead of disclosed.
 */
export function PropsReference({ title, props, visible = 6 }: { title: string; props: Props; visible?: number }) {
  const id = useId();
  const entries = Object.entries(props);
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const [showAll, setShowAll] = useState(false);
  const hiddenCount = Math.max(0, entries.length - visible);
  const toggle = (name: string) => setOpen(current => {
    const next = new Set(current);
    if (next.has(name)) next.delete(name); else next.add(name);
    return next;
  });
  return (
    <div className="props">
      <table className="props-table">
        <caption className="sr-only">{title} props</caption>
        <thead>
          <tr><th scope="col">Prop</th><th scope="col">Type</th><th scope="col">Default</th><th scope="col"><span className="sr-only">Details</span></th></tr>
        </thead>
        <tbody>
          {entries.map(([name, prop], index) => {
            const isExtra = index >= visible;
            const isHidden = isExtra && !showAll;
            const isOpen = open.has(name);
            const chips = typeChips(prop.type);
            const noteId = `${id}-${index}`;
            return (
              <Fragment key={name}>
                <tr className={isExtra ? "props-row props-extra" : "props-row"} data-collapsed={isHidden || undefined} data-open={isOpen || undefined}>
                  <th scope="row" className="props-name">{name}</th>
                  <td className="props-type" data-label="Type">
                    {chips ? <span className="props-chips">{chips.map(chip => <Badge key={chip} variant="neutral" size="sm" shape="full">{chip}</Badge>)}</span> : <span>{prop.type ?? "—"}</span>}
                  </td>
                  <td className="props-default" data-label="Default">{plainDefault(prop.default)}</td>
                  <td className="props-toggle">
                    {prop.notes && <Button variant="ghost" size="sm" shape="soft" isIconOnly className="prop-disclosure" aria-label={`${name} details`} aria-expanded={isOpen} aria-controls={isOpen ? noteId : undefined} onClick={() => toggle(name)} icon={<ChevronDown aria-hidden="true" />} />}
                  </td>
                </tr>
                <Presence kind="fade">
                  {isOpen && prop.notes && (
                    <tr key={noteId} className={isExtra ? "props-note-row props-extra" : "props-note-row"} data-collapsed={isHidden || undefined}>
                      <td colSpan={4}><p className="props-note" id={noteId}>{prop.notes}</p></td>
                    </tr>
                  )}
                </Presence>
              </Fragment>
            );
          })}
        </tbody>
      </table>
      {hiddenCount > 0 && <div className="props-more"><Button variant="ghost" size="sm" aria-expanded={showAll} iconEnd={<ChevronDown aria-hidden="true" />} onClick={() => setShowAll(value => !value)} data-open={showAll || undefined}><TextSwap>{showAll ? "Show fewer props" : `Show ${hiddenCount} more ${hiddenCount === 1 ? "prop" : "props"}`}</TextSwap></Button></div>}
    </div>
  );
}
