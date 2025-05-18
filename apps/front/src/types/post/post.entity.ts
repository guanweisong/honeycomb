import { TagEntity } from "../tag/tag.entity";
import { PostStatus } from "@/types/post/PostStatus";
import { PostType } from "@/types/post/PostType";
import { EnableType } from "@/types/EnableType";
import { MediaEntity } from "@/types/media/media.entity";
import { MultiLang } from "@/types/Language";

export interface PostEntity {
  id: string;
  title?: MultiLang;
  content?: MultiLang;
  excerpt?: MultiLang;
  categoryId: string;
  category: {
    id: string;
    title: string;
  };
  author: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
  status: PostStatus;
  commentStatus: EnableType;
  views: number;
  type: PostType;
  cover?: {
    id: string;
    url: string;
    width?: number;
    height?: number;
  };
  movieTime?: string;
  movieDirectors?: TagEntity[];
  movieActors?: TagEntity[];
  movieStyles?: TagEntity[];
  galleryLocation?: MultiLang;
  galleryTime?: string;
  galleryStyles?: TagEntity[];
  quoteAuthor?: MultiLang;
  quoteContent?: MultiLang;
  commentCount: number;
  imagesInContent: MediaEntity[];
}
