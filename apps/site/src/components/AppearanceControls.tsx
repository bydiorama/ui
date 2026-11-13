import { useState, useSyncExternalStore } from "react";
import { ChevronDown, Close } from "griddy-icons";
import { Button } from "@/ui/button";
import { Popover } from "@/ui/popover";
import { Modal } from "@/ui/modal";
import { Radio, RadioGroup } from "@/ui/radio";
import { Switch } from "@/ui/switch";
import { fx } from "@/lib/fx";
import { appearanceOptions, defaultAppearance, resetAppearance, setAppearance, type Appearance } from "../lib/appearance";
import { useAppearance } from "../lib/use-appearance";

const compactQuery = "(max-width: 639px), (max-height: 600px)";
const compactSnapshot = () => window.matchMedia(compactQuery).matches;
const serverCompactSnapshot = () => false;
function subscribeViewport(listener: () => void) {
  const query = window.matchMedia(compactQuery);
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}

export function AppearanceControls() {
  const isCompact = useSyncExternalStore(subscribeViewport, compactSnapshot, serverCompactSnapshot);
  const [isOpen, setIsOpen] = useState(false);
  const [hasTriedPreview, setHasTriedPreview] = useState(false);
  // A replaced popover may report its dismissal after the dialog has opened.
  const onOpenChange = (open: boolean) => { if (isCompact === compactSnapshot()) setIsOpen(open); };
  const Title = isCompact ? Modal.Title : Popover.Title;
  const preferences = useAppearance();
  const isDefault = (Object.keys(defaultAppearance) as (keyof Appearance)[]).every(key => preferences[key] === defaultAppearance[key]);
  const trigger = <Button variant="ghost" size="md" className="appearance-trigger" icon={<span className="brand-dot" aria-hidden="true" />} iconEnd={<ChevronDown />}>Appearance</Button>;
  const content = <>
      <div className="appearance-heading">
        <Title>Appearance</Title>
        <div className="appearance-heading-actions">
          <Button variant="ghost" size="sm" shape="soft" isDisabled={isDefault} onClick={resetAppearance}>Reset</Button>
          {isCompact && <Modal.Close render={<Button variant="ghost" size="sm" shape="soft" isIconOnly icon={<Close />} aria-label="Close appearance" />} />}
        </div>
      </div>
      <RadioGroup label="Scheme" orientation="horizontal" className="appearance-segments" value={preferences.scheme} onValueChange={value => setAppearance("scheme", value as Appearance["scheme"])}>
        {appearanceOptions.scheme.map(item => <Radio key={item.value} value={item.value}>{item.label}</Radio>)}
      </RadioGroup>
      <RadioGroup label="Density" orientation="horizontal" className="appearance-segments" value={preferences.density} onValueChange={value => setAppearance("density", value as Appearance["density"])}>
        {appearanceOptions.density.map(item => <Radio key={item.value} value={item.value}>{item.label}</Radio>)}
      </RadioGroup>
      <RadioGroup label="Brand" orientation="horizontal" className="appearance-brands" value={preferences.brand} onValueChange={value => setAppearance("brand", value as Appearance["brand"])}>
        {appearanceOptions.brand.map(item => <Radio key={item.value} value={item.value}>{item.label}</Radio>)}
      </RadioGroup>
      <div className="appearance-effects">
        <Switch labelPlacement="start" description="Texture and light on examples." isChecked={preferences.effects === "on"} onCheckedChange={isChecked => setAppearance("effects", isChecked ? "on" : "off")}>Effects</Switch>
      </div>
      <div className="appearance-preview" data-ui-density={preferences.density}>
        <span>Live preview</span>
        <Button size="md" className={preferences.effects === "on" ? fx("grain") : undefined} onClick={() => setHasTriedPreview(value => !value)}>{hasTriedPreview ? "Try again" : "Try button"}</Button>
      </div>
  </>;
  return isCompact ? <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
    <Modal.Trigger render={trigger} />
    <Modal.Surface className="appearance-panel appearance-dialog" aria-label="Appearance settings" data-ui-density="default">{content}</Modal.Surface>
  </Modal> : <Popover isOpen={isOpen} onOpenChange={onOpenChange}>
    <Popover.Trigger render={trigger} />
    <Popover.Panel align="end" className="appearance-panel" aria-label="Appearance settings" data-ui-density="default">{content}</Popover.Panel>
  </Popover>;
}
