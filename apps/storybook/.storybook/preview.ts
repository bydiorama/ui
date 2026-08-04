import type { Preview } from "@storybook/react-vite";

import "../styles/index.css";

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
};

export default preview;
