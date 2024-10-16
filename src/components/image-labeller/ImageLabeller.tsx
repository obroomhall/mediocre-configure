import { Rectangle, Rectangles } from "../shapes/Rectangle.tsx";
import useImage from "use-image";
import useImageContainer from "./UseImageContainer.ts";
import { Dimensions } from "../shapes/Dimensions.ts";
import ImageLabellerWindow from "./ImageLabellerWindow.tsx";
import { Alert, Box } from "@mui/material";
import { SkeletonBox } from "../skeleton/SkeletonBox.tsx";

function getScaledRectangle(rectangle: Rectangle, scale: number) {
  return {
    x: Math.round(rectangle.x * scale),
    y: Math.round(rectangle.y * scale),
    width: Math.round(rectangle.width * scale),
    height: Math.round(rectangle.height * scale),
  };
}

function getScaledRectangles(rectangles: Rectangles, scale: number) {
  return Object.fromEntries(
    Object.entries(rectangles).map(([id, rectangle]) => [
      id,
      getScaledRectangle(rectangle, scale),
    ]),
  );
}

interface ScaledImageLabellerWindowProps {
  image: HTMLImageElement;
  dimensions: Dimensions;
  scale: number;
  rectangles: Rectangles;
  setRectangles: (rectangles: Rectangles) => void;
  onSelectRectangle: (id: string | null) => void;
}

function ScaledImageLabellerWindow({
  image,
  dimensions,
  scale,
  rectangles,
  setRectangles,
  onSelectRectangle,
}: ScaledImageLabellerWindowProps) {
  const scaledRectangles = getScaledRectangles(rectangles, scale);
  const setScaledRectangles = (scaledRectangles: Rectangles) => {
    const downscaledRectangles = getScaledRectangles(
      scaledRectangles,
      1 / scale,
    );
    setRectangles(downscaledRectangles);
  };

  return (
    <ImageLabellerWindow
      image={image}
      dimensions={dimensions}
      rectangles={scaledRectangles}
      setRectangles={setScaledRectangles}
      onSelectRectangle={onSelectRectangle}
    />
  );
}

interface ScaledImageLabellerWindowContainerProps {
  image: HTMLImageElement;
  rectangles: Rectangles;
  setRectangles: (rectangles: Rectangles) => void;
  onSelectRectangle: (id: string | null) => void;
}

function ScaledImageLabellerWindowContainer({
  image,
  rectangles,
  setRectangles,
  onSelectRectangle,
}: ScaledImageLabellerWindowContainerProps) {
  const { ref, dimensions, scale: scale } = useImageContainer(image);

  return (
    // always render the stage container, otherwise we can't dynamically resize the image
    <Box
      width={1}
      height={1}
      ref={ref}
      display={"flex"}
      justifyContent={"center"}
      alignItems={"center"}
    >
      {dimensions && scale && (
        <ScaledImageLabellerWindow
          image={image}
          dimensions={dimensions}
          scale={scale}
          rectangles={rectangles}
          setRectangles={setRectangles}
          onSelectRectangle={onSelectRectangle}
        />
      )}
    </Box>
  );
}

interface CanvasImageLabellerProps extends ImageLabellerProps {
  image: string;
}

function CanvasImageLabeller({
  image,
  rectangles,
  setRectangles,
  onSelectRectangle,
}: CanvasImageLabellerProps) {
  const [canvasImage, canvasImageStatus] = useImage(image);

  return (
    <SkeletonBox
      showSkeleton={
        canvasImage === undefined || canvasImageStatus === "loading"
      }
    >
      {canvasImage ? (
        <ScaledImageLabellerWindowContainer
          image={canvasImage}
          rectangles={rectangles}
          setRectangles={setRectangles}
          onSelectRectangle={onSelectRectangle ? onSelectRectangle : () => {}}
        />
      ) : (
        <Alert severity="error">Failed to load image</Alert>
      )}
    </SkeletonBox>
  );
}

interface ImageLabellerProps {
  image: string | null;
  rectangles: Rectangles;
  setRectangles: (rectangles: Rectangles) => void;
  onSelectRectangle?: (id: string | null) => void;
}

export default function ImageLabeller({
  image,
  rectangles,
  setRectangles,
  onSelectRectangle,
}: ImageLabellerProps) {
  return (
    <Box width={1} sx={{ aspectRatio: "16/9" }}>
      <SkeletonBox showSkeleton={!image}>
        {image && (
          <CanvasImageLabeller
            image={image}
            rectangles={rectangles}
            setRectangles={setRectangles}
            onSelectRectangle={onSelectRectangle ? onSelectRectangle : () => {}}
          />
        )}
      </SkeletonBox>
    </Box>
  );
}
