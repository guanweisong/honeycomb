"use client";
import { useSiteSetting } from "@/app/admin/hooks/useSiteSetting";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Turnstile, TurnstileInstance } from "@marsidev/react-turnstile";
import {
  DynamicForm,
  DynamicFormRef,
} from "@/packages/ui/extended/DynamicForm";
import { toast } from "sonner";
import { Button } from "@/packages/ui/components/button";
import { getProviders, signIn } from "next-auth/react";
import { providerIcons } from "./providerIcons";
import { LoginSchema, type LoginValues } from "./login.schema";

type AuthProviderMap = Awaited<ReturnType<typeof getProviders>>;

/**
 * 登录页面组件。
 * 负责后台用户名密码登录、OAuth 登录、Turnstile 校验以及登录后的跳转。
 */
const Login = () => {
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [providers, setProviders] = useState<AuthProviderMap>(null);
  const form = useRef<DynamicFormRef<LoginValues>>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setting } = useSiteSetting();

  const targetUrl = searchParams.get("targetUrl");
  const callbackUrl = targetUrl || "/admin/dashboard";

  /**
   * 读取当前可用的 Provider 列表。
   * 只有在服务端成功注册的 OAuth Provider 才会在这里显示。
   */
  useEffect(() => {
    getProviders().then(setProviders).catch(() => {
      setProviders(null);
    });
  }, []);

  /**
   * 重置验证码
   */
  const resetCaptcha = () => {
    setCaptchaToken(null);
    turnstileRef.current?.reset();
  };

  /**
   * 表单提交处理器。
   * 当用户点击登录按钮时，如果验证码已就绪，则调用 Credentials Provider 完成登录。
   */
  const onSubmit = () => {
    if (!captchaToken) {
      toast.error("验证码加载中，请稍候");
      return Promise.reject("验证码未加载");
    }

    const values = form.current?.getValues();
    if (!values) {
      toast.error("表单未初始化");
      return Promise.reject("表单未初始化");
    }
    const { name, password } = values;
    return signIn("credentials", {
      redirect: false,
      callbackUrl,
      name,
      password,
      captchaToken,
    })
      .then((result) => {
        if (result?.error) {
          throw new Error("用户名或密码不正确");
        }

        toast.success("登录成功");
        router.refresh();
      })
      .catch((e: { message?: string }) => {
        toast.error(e?.message || "登录失败");
      })
      .finally(() => {
        resetCaptcha();
      });
  };

  const oauthProviders = Object.values(providers ?? {}).filter(
    (provider) => provider.id !== "credentials",
  );

  /**
   * 触发指定 OAuth Provider 的登录流程。
   *
   * @param {string} providerId - Provider 在 NextAuth 中的唯一标识。
   */
  const handleOAuthLogin = async (providerId: string) => {
    await signIn(providerId, { callbackUrl });
  };

  /**
   * 验证码通过后的回调。
   *
   * @param {string} data - Turnstile 返回的验证码 token。
   */
  const onTurnstileSuccess = (data: string) => {
    setCaptchaToken(data);
  };

  return (
    <div className="min-h-screen box-border pt-48 text-center bg-green-700">
      <video
        src="https://static.guanweisong.com/common/rainAndBird.mp4"
        className="fixed inset-0 w-full h-full object-cover"
        autoPlay={true}
        muted={true}
        loop={true}
      />
      <div className="fixed z-10 w-96 mx-auto left-0 right-0 top-[30%] text-white p-6 bg-white/20 backdrop-blur rounded overflow-hidden">
        <h1 className="text-2xl">{setting?.siteName?.zh}</h1>
        <div className="opacity-80 mb-6">游客账号：guest 123456</div>
        <div className="space-y-4 [&_[data-slot=form-item]]:gap-1.5 [&_input[data-slot=input]]:h-10 [&_input[data-slot=input]]:rounded-md [&_input[data-slot=input]]:border-white/20 [&_input[data-slot=input]]:bg-white/80 [&_input[data-slot=input]]:px-4 [&_input[data-slot=input]]:text-black [&_input[data-slot=input]]:shadow-none [&_input[data-slot=input]]:placeholder:text-black/45 [&_input[data-slot=input]]:focus-visible:border-white [&_input[data-slot=input]]:focus-visible:ring-white/30 [&_[data-slot=form-message]]:text-left [&_[data-slot=form-message]]:text-red-200">
          <DynamicForm
            ref={form}
            schema={LoginSchema}
            fields={[
              { name: "name", type: "text", placeholder: "用户名" },
              { name: "password", type: "password", placeholder: "密码" },
            ]}
            submitProps={{
              children: "登录",
              variant: "secondary",
              size: "lg",
              className: "w-full bg-white/80 text-black hover:bg-white",
            }}
            onSubmit={onSubmit}
          />
          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-white/70">
            <span className="h-px flex-1 bg-white/20" />
            <span>第三方登录</span>
            <span className="h-px flex-1 bg-white/20" />
          </div>
          {oauthProviders.map((provider) => (
            <Button
              key={provider.id}
              type="button"
              variant="secondary"
              size="lg"
              className="w-full justify-center bg-black/80 px-4 text-white hover:bg-black"
              onClick={() => handleOAuthLogin(provider.id)}
            >
              <span className="inline-flex items-center gap-2">
                {providerIcons[provider.id]}
                <span>使用{provider.name}登录</span>
              </span>
            </Button>
          ))}
        </div>
        <div className="mt-4 flex justify-center">
          <Turnstile
            ref={turnstileRef}
            siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ""}
            onSuccess={onTurnstileSuccess}
            onExpire={resetCaptcha}
          />
        </div>
      </div>
    </div>
  );
};

export default Login;
