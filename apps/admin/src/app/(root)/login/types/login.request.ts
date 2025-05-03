import type { CaptchaType } from "./CaptchaType";

export interface LoginRequest {
  name: string;
  password: string;
  captcha: CaptchaType;
}
