import { Transform } from "@buf/broomy_mediocre.community_timostamm-protobuf-ts/mediocre/transform/v1beta/transform_pb";
import { createContext } from "react";

export interface TransformError {
  error: string;
  elapsed: number;
}

export interface TransformImageResult {
  image: string;
  elapsed: number;
}

export interface TransformTextResult {
  text: string;
  elapsed: number;
}

export type TransformResultOrError =
  | TransformImageResult
  | TransformTextResult
  | TransformError;

export interface TransformResultsKey {
  stageId: string;
  zoneId?: string;
  regionId?: string;
  timestamp: number;
  transforms: Transform[];
}

export type TransformResults = Map<
  TransformResultsKey,
  TransformResultOrError[]
>;

export interface TransformResultsContextProps {
  transformResults: TransformResults;
}

export const TransformResultsContext =
  createContext<TransformResultsContextProps | null>(null);
