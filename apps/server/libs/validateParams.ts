import ResponseHandler from "@/libs/responseHandler";
import { ZodSchema } from "zod";

export const validateParams = <T>(
  schema: ZodSchema<T>,
  params: unknown,
  onSuccess: (data: T) => void,
) => {
  const validate = schema.safeParse(params);
  if (validate.success) {
    return onSuccess(validate.data);
  } else {
    return ResponseHandler.ValidateError(validate.error);
  }
};
