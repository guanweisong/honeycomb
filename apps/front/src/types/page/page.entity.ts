import { PageStatus } from "@/types/page/PageStatus";
import { EnableType } from "@/types/EnableType";
import { MediaEntity } from "@/types/media/media.entity";
import { MultiLang } from "@/types/Language";

export interface PageEntity {
  id: string;
  title?: MultiLang;
  content?: MultiLang;
  author: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
  status: PageStatus;
  commentStatus: EnableType;
  views: number;
  commentCount: number;
  imagesInContent: MediaEntity[];
}
