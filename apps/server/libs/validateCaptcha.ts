import { NextRequest } from "next/server";
import axios from "axios";
import ResponseHandler from "@/libs/responseHandler";

/**
 * 验证腾讯防水墙验证码。
 * @param {NextRequest} request - Next.js 请求对象。
 * @param {() => void} onSuccess - 验证成功后的回调函数。
 * @returns {Promise<NextResponse | void>} 验证结果响应或成功回调的返回值。
 */
export const validateCaptcha = async (
  request: NextRequest,
  onSuccess: () => void,
) => {
  const data = await request.clone().json();
  const { captcha } = data;
  if (!captcha) {
    return ResponseHandler.Forbidden({ message: "请输入验证码" });
  }
  const result = await axios.request({
    url: "https://ssl.captcha.qq.com/ticket/verify",
    method: "GET",
    params: {
      aid: process.env.CAPTCHA_AID,
      AppSecretKey: process.env.CAPTCHA_APP_SECRET_KEY,
      Randstr: captcha.randstr,
      Ticket: captcha.ticket,
    },
  });
  // @ts-ignore
  if (result.status === 200 && result.data.response === "1") {
    return onSuccess();
  } else {
    return ResponseHandler.Forbidden({ message: "验证码不正确" });
  }
};
