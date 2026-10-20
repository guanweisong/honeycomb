export type MediaDeleteResult =
  | { success: true }
  | {
      success: false;
      state: "indeterminate";
      message: string;
    };
