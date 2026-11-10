import { TagType } from "@/features/tag/types/tag.type";

/** Relation roles share stable detail/form keys and versioned patch keys. */
export const postTagRoles = {
  movieActors: { input: "movieActorIds", type: TagType.ACTOR },
  movieDirectors: { input: "movieDirectorIds", type: TagType.DIRECTOR },
  movieStyles: { input: "movieStyleIds", type: TagType.MOVIE_STYLE },
  galleryStyles: { input: "galleryStyleIds", type: TagType.GALLERY_STYLE },
} as const;

export type PostTagField = keyof typeof postTagRoles;
export const postTagFields = Object.keys(postTagRoles) as PostTagField[];
