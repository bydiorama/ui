import { useSyncExternalStore } from "react";
import { defaultAppearance, readAppearance, subscribeAppearance } from "./appearance";

const serverSnapshot = () => defaultAppearance;
export function useAppearance() {
  return useSyncExternalStore(subscribeAppearance, readAppearance, serverSnapshot);
}
