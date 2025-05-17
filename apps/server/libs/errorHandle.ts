import ResponseHandler from "@/libs/responseHandler";

export const errorHandle = async <T>(
  fn: () => Promise<T> | T,
): Promise<T | ReturnType<typeof ResponseHandler.Error>> => {
  try {
    return await fn();
  } catch (e) {
    console.error("errorHandle:", e instanceof Error ? e.message : e);
    return ResponseHandler.Error();
  }
};
