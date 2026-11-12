/**
 * Network's force layout off the main thread, for graphs above the worker
 * threshold (default 500 nodes). The function is the same one Network runs
 * synchronously below it, so the picture is the same either way — a worker
 * only moves the cost.
 */
import { forceLayout, type ForceOptions, type Point } from "@/lib/graph";

export interface NetworkLayoutRequest {
  id: number;
  nodes: { id: string }[];
  edges: { source: string; target: string }[];
  options: Omit<ForceOptions, "fixed" | "initial"> & {
    fixed?: [string, Point][];
    initial?: [string, Point][];
  };
}

export interface NetworkLayoutResponse {
  id: number;
  positions: [string, Point][];
}

const scope = self as unknown as {
  onmessage: ((e: MessageEvent<NetworkLayoutRequest>) => void) | null;
  postMessage: (message: NetworkLayoutResponse) => void;
};

scope.onmessage = (e) => {
  const { id, nodes, edges, options } = e.data;
  const { fixed, initial, ...rest } = options;
  const out = forceLayout(nodes, edges, {
    ...rest,
    ...(fixed ? { fixed: new Map(fixed) } : {}),
    ...(initial ? { initial: new Map(initial) } : {}),
  });
  scope.postMessage({ id, positions: [...out] });
};
