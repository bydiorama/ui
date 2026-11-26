import type { Preview } from "@storybook/react-vite";

import "../styles/index.css";
import { typeRoleViolations } from "./type-roles.ts";

const preview: Preview = {
  parameters: {
    controls: { expanded: true },
    /**
     * a11y runs on every story and *fails* rather than warns. The addon was
     * installed-but-unused in the previous generation; an accessibility check
     * nobody is required to pass is decoration.
     */
    a11y: { test: "error" },
    backgrounds: { disable: true },
  },
  tags: ["autodocs"],
  /**
   * The motion level (ADR 0028), switchable from the toolbar. "OS" sets no
   * attribute, so the stories follow the machine's own setting, as an app
   * with no motion setting does. Set on <html> rather than on the story's
   * wrapper so portalled surfaces — a Sheet, a Popover, a Toast — are inside
   * it too.
   */
  globalTypes: {
    motion: {
      description: "Motion level (ADR 0028)",
      toolbar: {
        title: "Motion",
        icon: "play",
        items: [
          { value: "os", title: "Follow the OS" },
          { value: "full", title: "Full" },
          { value: "reduced", title: "Reduced" },
          { value: "off", title: "Off" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { motion: "os" },
  decorators: [
    (Story, context) => {
      const level = context.globals["motion"] as string | undefined;
      if (level && level !== "os") document.documentElement.setAttribute("data-ui-motion", level);
      else document.documentElement.removeAttribute("data-ui-motion");
      return Story();
    },
  ],
  /**
   * Type roles are composites (ADR 0020 §3): an element that names one
   * renders its weight, leading and tracking, or the story fails. Portalled
   * surfaces live outside the canvas, so the whole document is read. See
   * `type-roles.ts` for why this is measured rather than scanned.
   */
  afterEach: () => {
    const violations = typeRoleViolations(document.body);
    if (violations.length) {
      throw new Error(`Type roles drifted from TYPE_ROLES (ADR 0020 §3):\n  ${violations.join("\n  ")}`);
    }
  },
};

export default preview;
