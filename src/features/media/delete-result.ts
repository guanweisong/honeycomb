export type MediaDeleteResult =
  | { success: true; publicSync?: "completed" | "degraded" }
  | {
      success: false;
      state: "indeterminate";
      message: string;
    };
