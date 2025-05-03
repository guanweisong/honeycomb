"use client";
import { useSettingStore } from "@/src/stores/useSettingStore";
import { message } from "antd";
import md5 from "md5";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import LoginService from "./service";
import { DynamicForm, DynamicFormRef } from "@ui/extended/DynamicForm";
import { z } from "zod";

const Login = () => {
  const captchaRef = useRef<any>(null);
  const formRef = useRef<DynamicFormRef>(null);
  const searchParams = useSearchParams();
  const settingStore = useSettingStore();
  const [loading, setLoading] = useState(false);

  const { setting } = settingStore;
  const targetUrl = searchParams.get("targetUrl");

  useEffect(() => {
    captchaRef.current = new TencentCaptcha("2090829333", async (res: any) => {
      if (res.ret === 0) {
        const values = formRef.current?.getValues();
        const { name, password } = values;
        setLoading(true);
        LoginService.login({
          name,
          password: md5(password),
          captcha: {
            ticket: res.ticket,
            randstr: res.randstr,
          },
        })
          .then((result) => {
            if (result.status === 200) {
              message.success("登录成功");
              localStorage.setItem("token", result.data.token);
              window.location.href = targetUrl || "/";
            }
          })
          .finally(() => {
            setLoading(false);
          });
      }
    });
    return () => {
      captchaRef.current = null;
    };
  }, []);

  const onSubmit = () => {
    captchaRef.current.show();
  };

  return (
    <div className="min-h-screen box-border pt-48 text-center bg-green-700">
      <video
        src="https://static.guanweisong.com/common/rainAndBird.mp4"
        className="fixed inset-0 object-fill"
        autoPlay={true}
        muted={true}
        loop={true}
        height="100%"
        width="100%"
      />
      <div className="fixed z-10 w-96 mx-auto left-0 right-0 top-[30%] text-white p-6 bg-white/20 backdrop-blur rounded overflow-hidden">
        <h1 className="text-2xl">{setting?.siteName.zh}</h1>
        <div className="opacity-80 mb-6">游客账号：guest 123456</div>
        <DynamicForm
          formRef={formRef}
          schema={z.object({
            name: z
              .string({ required_error: "用户名不能为空" })
              .min(1, { message: "用户名不能为空" }),
            password: z
              .string({ required_error: "密码不能为空" })
              .min(1, { message: "密码不能为空" }),
          })}
          fields={[
            { name: "name", type: "text", placeholder: "用户名" },
            { name: "password", type: "password", placeholder: "密码" },
          ]}
          loading={loading}
          onSubmit={onSubmit}
        />
      </div>
    </div>
  );
};

export default Login;
