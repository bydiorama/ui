import { Tooltip } from "@/ui/tooltip";
import { Button } from "@/ui/button";
import { Bookmark } from "griddy-icons";

export function Example() {
  return (
    <Tooltip.Provider>
      <Tooltip>
        <Tooltip.Trigger
          render={
            <Button
              variant="outline"
              icon={<Bookmark />}
              isIconOnly
              aria-label="Save to collection"
            />
          }
        />
        <Tooltip.Content>Save to collection</Tooltip.Content>
      </Tooltip>
    </Tooltip.Provider>
  );
}
