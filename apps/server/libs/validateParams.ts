import ResponseHandler from "@/libs/responseHandler";
import { ZodType } from "zod";

export const validateParams = <T, R>(
  schema: ZodType<T, any, unknown>,
  params: unknown,
  onSuccess: (data: T) => R,
): R | ReturnType<typeof ResponseHandler.ValidateError> => {
  const result = schema.safeParse(params);
  if (result.success) {
    return onSuccess(result.data);
  } else {
    return ResponseHandler.ValidateError(result.error);
  }
};
