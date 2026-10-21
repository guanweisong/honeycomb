import type { ComponentProps } from "react";
import { PhotoSwipeClient } from "../../../src/components/PhotoSwipe";

const childrenOnly: ComponentProps<typeof PhotoSwipeClient> = {
  children: "Image",
};
const unusedSelector: ComponentProps<typeof PhotoSwipeClient> = {
  // @ts-expect-error Gallery scope is controlled by the container ref, not an ID.
  galleryId: "gallery",
};
void childrenOnly;
void unusedSelector;
