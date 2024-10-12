import { useContext } from "react";
import {
  TransformResultsContext,
  TransformResultsKey,
} from "./TransformResultsContext.ts";
import { transformResultsFindKey } from "./TransformResults.ts";

export function useTransformResults(key: TransformResultsKey) {
  const transformResultsContext = useContext(TransformResultsContext);
  if (!transformResultsContext) {
    throw new Error("No transform results context");
  }

  const { transformResults } = transformResultsContext;

  const keys = Array.from(transformResults.keys());
  const existingKey = transformResultsFindKey(key, keys);

  return {
    transformResults: existingKey
      ? (transformResults.get(existingKey) ?? [])
      : [],
  };
}
