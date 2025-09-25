"use client";
import { useSettingStore } from "@/stores/useSettingStore";
import md5 from "md5";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { trpc } from "@honeycomb/trpc/client/trpc";
import {
  DynamicForm,
  DynamicFormRef,
} from "@honeycomb/ui/extended/DynamicForm";
import { toast } from "sonner";
import { UserInsertSchema } from "@honeycomb/validation/user/schemas/user.insert.schema";

const Login = () => {
  const captchaRef = useRef<any>(null);
  const form = useRef<DynamicFormRef>(null);
  const searchParams = useSearchParams();
  const settingStore = useSettingStore();
  const loginMutation = trpc.auth.login.useMutation();

  const { setting } = settingStore;
  const targetUrl = searchParams.get("targetUrl");

  useEffect(() => {
    setTimeout(() => {
      captchaRef.current = new TencentCaptcha(
        "2090829333",
        async (res: any) => {
          if (res.ret === 0) {
            const values = form.current?.getValues();
            const { name, password } = values;
            loginMutation
              .mutateAsync({
                name,
                password: md5(password),
                captcha: {
                  ticket: res.ticket,
                  randstr: res.randstr,
                },
              })
              .then((result) => {
                toast.success("登录成功");
                localStorage.setItem("token", (result as any).token);
                window.location.href = targetUrl || "/";
              })
              .catch((e) => {
                toast.error(e?.message || "登录失败");
              });
          }
        },
      );
    }, 1000);
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
          ref={form}
          schema={UserInsertSchema.pick({ name: true, password: true })}
          fields={[
            { name: "name", type: "text", placeholder: "用户名" },
            { name: "password", type: "password", placeholder: "密码" },
          ]}
          onSubmit={onSubmit}
        />
      </div>
    </div>
  );
};

export default Login;
