"use client";
import { useSettingStore } from "@/app/admin/stores/useSettingStore";
import md5 from "md5";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { trpc } from "@/packages/trpc/client/trpc";
import {
  DynamicForm,
  DynamicFormRef,
} from "@/packages/ui/extended/DynamicForm";
import { toast } from "sonner";
import { UserInsertSchema } from "@/packages/validation/schemas/user/user.insert.schema";

/**
 * 登录页面组件。
 * 负责用户登录认证，包括表单输入、腾讯防水墙验证码集成以及登录成功后的重定向。
 */
const Login = () => {
  const captchaRef = useRef<any>(null);
  const form = useRef<DynamicFormRef>(null);
  const searchParams = useSearchParams();
  const settingStore = useSettingStore();
  const loginMutation = trpc.auth.login.useMutation();

  const { setting } = settingStore;
  const targetUrl = searchParams.get("targetUrl");

  /**
   * 副作用钩子，用于初始化腾讯防水墙验证码和处理登录逻辑。
   * 在组件挂载后，会延迟 1 秒初始化腾讯防水墙验证码。
   * 当验证码验证成功后，会获取表单值，调用 `loginMutation` 进行登录，并处理登录结果。
   * 登录成功后，会将 token 存储到 localStorage 并重定向到目标页面或首页。
   * 在组件卸载时，会清除 `captchaRef.current`。
   */
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
              .then((result: any) => {
                toast.success("登录成功");
                localStorage.setItem("token", result.token);
                window.location.href = targetUrl || "/admin";
              })
              .catch((e: any) => {
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

  /**
   * 表单提交处理器。
   * 当用户点击登录按钮时，显示腾讯防水墙验证码。
   */
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
        <h1 className="text-2xl">{setting?.siteName?.zh}</h1>
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
