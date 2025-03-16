import ResponseHandler from "@/libs/responseHandler";

export const errorHandle = async (fn: () => void) => {
  try {
    return await fn();
  } catch (e) {
    console.error("errorHandle", e);
    return ResponseHandler.Error();
  }
};
