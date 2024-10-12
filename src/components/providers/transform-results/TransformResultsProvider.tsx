import { PropsWithChildren, useEffect, useMemo, useState } from "react";
import {
  TransformResultOrError,
  TransformResults,
  TransformResultsContext,
  TransformResultsKey,
} from "./TransformResultsContext.ts";
import { useGrpcClient } from "../grpc/GrpcContext.ts";
import { useFrames } from "../frame/useFrames.ts";
import { TransformServiceClient } from "@buf/broomy_mediocre.community_timostamm-protobuf-ts/mediocre/transform/v1beta/transform_pb.client";
import { isRpcError } from "../grpc/GrpcHealth.ts";
import { useConfiguration } from "../configuration/useConfiguration.ts";
import {
  BatchTransforms,
  BatchTransformsRequest,
  Transform,
  TransformResponse,
} from "@buf/broomy_mediocre.community_timostamm-protobuf-ts/mediocre/transform/v1beta/transform_pb";
import { Frames } from "../frame/FrameContext.ts";
import { transformResultsFindKey } from "./TransformResults.ts";

export function TransformResultsProvider({ children }: PropsWithChildren) {
  const { frames } = useFrames();
  const { zones, regions } = useConfiguration();
  const [transformResults, setTransformResults] = useState<TransformResults>(
    new Map(),
  );

  const client = useGrpcClient(TransformServiceClient);

  const allTransforms = useMemo(() => {
    const zoneTransforms: TransformResultsKey[] = Array.from(
      zones.values(),
    ).flatMap((zone) =>
      zone.stagePaths.flatMap((stagePath) =>
        zone.tests.map((test) => ({
          ...stagePath,
          zoneId: zone.id,
          timestamp: test.time,
          transforms: zone.transforms.map((transformation) => ({
            transformation: {
              oneofKind: "imageToImage",
              imageToImage: transformation,
            },
          })),
        })),
      ),
    );

    const regionTransforms: TransformResultsKey[] = Array.from(
      regions.values(),
    ).flatMap((region) =>
      region.zonePaths.flatMap((zonePath) =>
        region.tests.map((test) => ({
          ...zonePath,
          regionId: region.id,
          timestamp: test.time,
          transforms: region.transforms,
        })),
      ),
    );

    return [...zoneTransforms, ...regionTransforms];
  }, [regions, zones]);

  useEffect(() => {
    // can't get aborts to work properly
    // const abortController = new AbortController();

    if (!client) {
      console.log("No client");
      return;
    }

    const currentKeys = Array.from(transformResults.keys());
    const transformsWithoutResults = allTransforms.filter(
      (transform) => !transformResultsFindKey(transform, currentKeys),
    );

    const onTransformResponses = (
      key: TransformResultsKey,
      transformResponse: TransformResponse[],
    ) => {
      const results = transformResponse.map(getResultFromResponse);
      setTransformResults((resultsMap) => {
        const keys = Array.from(resultsMap.keys());
        const existingKey = transformResultsFindKey(key, keys);
        if (existingKey) {
          return resultsMap.set(existingKey, results);
        } else {
          return resultsMap.set(key, results);
        }
      });
    };

    getTransformResultsMap(
      transformsWithoutResults,
      frames,
      onTransformResponses,
      client,
    );

    return () => {
      // abortController.abort();
    };
  }, [allTransforms, client, frames, transformResults]);

  return (
    <TransformResultsContext.Provider value={{ transformResults }}>
      {children}
    </TransformResultsContext.Provider>
  );
}

function getResultFromResponse(
  timedResponse: TransformResponse,
): TransformResultOrError {
  const response = timedResponse.response;
  if (response.oneofKind === "error") {
    return { error: response.error, elapsed: timedResponse.elapsed };
  }

  if (response.oneofKind === "transformed") {
    const transformed = response.transformed;
    switch (transformed.value.oneofKind) {
      case "image": {
        const data = transformed.value.image.blob?.data;
        if (data) {
          return {
            image: URL.createObjectURL(new Blob([data])),
            elapsed: timedResponse.elapsed,
          };
        } else {
          return { error: "No data in image", elapsed: timedResponse.elapsed };
        }
      }
      case "characters": {
        return {
          text: transformed.value.characters,
          elapsed: timedResponse.elapsed,
        };
      }
    }
  }

  return { error: "Unknown response", elapsed: timedResponse.elapsed };
}

async function getTransformResultsMap(
  keys: TransformResultsKey[],
  frames: Frames,
  onTransformResponses: (
    key: TransformResultsKey,
    responses: TransformResponse[],
  ) => void,
  client: TransformServiceClient,
  abortController?: AbortController,
) {
  const keysByTimestamp = Map.groupBy(keys, (transform) => transform.timestamp);

  for (const [time, transformKeys] of keysByTimestamp) {
    const frame = frames.get(time);
    if (!frame) {
      console.log("No frame for time", time);
      continue;
    }

    const batch: BatchTransforms[] = transformKeys.flatMap((transformKey) => ({
      id: [transformKey.stageId, transformKey.zoneId, transformKey.regionId]
        .filter((id) => id)
        .join(":"),
      transforms: transformKey.transforms,
    }));

    await transformBatch(
      frame,
      time,
      batch,
      onTransformResponses,
      client,
      abortController,
    );
  }
}

async function transformBatch(
  frame: string,
  time: number,
  batch: BatchTransforms[],
  onTransformResponses: (
    key: TransformResultsKey,
    responses: TransformResponse[],
  ) => void,
  client: TransformServiceClient,
  abortController?: AbortController,
) {
  const imageData = await fetch(frame)
    .then((res) => res.arrayBuffer())
    .then((buffer) => new Uint8Array(buffer));

  const request: BatchTransformsRequest = {
    image: {
      blob: {
        data: imageData,
      },
    },
    batch: batch,
  };

  const transform = client.transformBatch(request, {
    abort: abortController?.signal,
  });

  const getKey = (id: string, transforms: Transform[]): TransformResultsKey => {
    const idParts = id.split(":");
    return {
      stageId: idParts[0],
      zoneId: idParts.at(1),
      regionId: idParts.at(2),
      timestamp: time,
      transforms: transforms,
    };
  };

  try {
    for await (const { id, transforms, responses } of transform.responses) {
      const key = getKey(id, transforms);
      onTransformResponses(key, responses);
    }
  } catch (error) {
    let errorMessage;
    if (isRpcError(error)) {
      errorMessage = error.message || error.code;
    } else {
      errorMessage = "Unknown error";
    }
    throw new Error(errorMessage);
  }
}
