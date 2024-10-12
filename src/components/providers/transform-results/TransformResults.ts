import { Transform } from "@buf/broomy_mediocre.community_timostamm-protobuf-ts/mediocre/transform/v1beta/transform_pb";
import { TransformResultsKey } from "./TransformResultsContext.ts";

export function transformResultsFindKey(
  key: TransformResultsKey,
  keys: TransformResultsKey[],
) {
  return keys.find((existingKey) =>
    transformResultsKeyEquals(existingKey, key),
  );
}

function transformResultsKeyEquals(
  a: TransformResultsKey,
  b: TransformResultsKey,
) {
  return (
    a.stageId === b.stageId &&
    a.zoneId === b.zoneId &&
    a.regionId === b.regionId &&
    a.timestamp === b.timestamp &&
    a.transforms.length === b.transforms.length &&
    a.transforms.every((transform, index) =>
      Transform.equals(transform, b.transforms[index]),
    )
  );
}
