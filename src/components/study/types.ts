export type ResourceType = "YOUTUBE" | "LINK";

export type ResourceData = {
  id: string;
  type: ResourceType;
  url: string;
  videoId: string | null;
  title: string | null;
  thumbnailUrl: string | null;
  embeddable: boolean;
  orderIndex: number;
};

export type StudyTask = {
  id: string;
  title: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  notes: string | null;
  studyLayout: { splitPct?: number } | null;
  resources: ResourceData[];
};

export type YoutubeSearchResult = {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl?: string;
};
