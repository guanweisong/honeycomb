"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import LoadingState from "@/components/LoadingState";
import {
  DEFAULT_SCRIPT_ID,
  SCRIPT_URL,
  Turnstile,
  TurnstileInstance,
} from "@marsidev/react-turnstile";
import { clientEnv } from "@/env/client";
import { DynamicForm, DynamicFormRef } from "@/components/DynamicForm";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/auth-client";
import Script from "next/script";
import { providerIcons } from "../../provider-icons";
import { LoginSchema } from "../../login.schema.ts";
import type { LoginValues } from "@/features/user/types";
import { normalizeAdminCallback } from "../../safe-admin-callback";
import type { MultiLang } from "@/lib/i18n/multi-lang";
import { useTurnstileToken } from "@/lib/hooks/use-turnstile-token";

type AuthProvider = { id: string; name: string };

type LoginClientProps = {
  setting: { siteName?: MultiLang | null } | undefined;
  providers: AuthProvider[];
  targetUrl?: string;
};

/**
 * 登录页面组件。
 * 负责后台用户名密码登录、OAuth 登录、Turnstile 校验以及登录后的跳转。
 */
const LoginContent = ({ setting, providers, targetUrl }: LoginClientProps) => {
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const {
    token: captchaToken,
    onSuccess: onTurnstileSuccess,
    reset: resetCaptcha,
  } = useTurnstileToken(turnstileRef);
  const [isPasskeySupported, setIsPasskeySupported] = useState<boolean | null>(
    null,
  );
  const form = useRef<DynamicFormRef<LoginValues>>(null);
  const interactiveLoginInFlight = useRef(false);
  const [interactiveLoginPending, setInteractiveLoginPending] = useState(false);

  const [backgroundMotionAllowed, setBackgroundMotionAllowed] = useState(false);
  const [backgroundPaused, setBackgroundPaused] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-reduced-motion: no-preference)");
    const update = () => setBackgroundMotionAllowed(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const callbackUrl = normalizeAdminCallback(targetUrl);

  useEffect(() => {
    setIsPasskeySupported(
      typeof window !== "undefined" &&
        typeof window.PublicKeyCredential !== "undefined",
    );
  }, []);

  /**
   * 表单提交处理器。
   * 当用户点击登录按钮时，如果验证码已就绪，则调用 Better Auth 的用户名登录接口完成登录。
   */
  const onSubmit = () => {
    if (clientEnv.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !captchaToken) {
      toast.error("验证码加载中，请稍候");
      return Promise.reject("验证码未加载");
    }

    const values = form.current?.getValues();
    if (!values) {
      toast.error("表单未初始化");
      return Promise.reject("表单未初始化");
    }
    const { name, password } = values;
    return authClient.signIn
      .username({
        username: name,
        password,
        fetchOptions: {
          headers: captchaToken
            ? { "x-captcha-response": captchaToken }
            : undefined,
        },
      })
      .then((result) => {
        if (result.error) throw new Error("用户名或密码不正确");
        toast.success("登录成功");
        window.location.href = callbackUrl;
      })
      .catch((e: { message?: string }) => {
        toast.error(e?.message || "登录失败");
      })
      .finally(() => {
        resetCaptcha();
      });
  };

  /**
   * 触发指定 OAuth Provider 的登录流程。
   *
   * @param {string} providerId - Provider 在 Better Auth 中的唯一标识。
   */
  const handleOAuthLogin = async (providerId: string) => {
    if (interactiveLoginInFlight.current) return;
    interactiveLoginInFlight.current = true;
    setInteractiveLoginPending(true);
    try {
      const result = await authClient.signIn.social({
        provider: providerId,
        callbackURL: callbackUrl,
      });
      if (result.error) toast.error(result.error.message || "第三方登录失败");
    } catch {
      toast.error("无法完成第三方登录，请稍后重试");
    } finally {
      interactiveLoginInFlight.current = false;
      setInteractiveLoginPending(false);
    }
  };

  const handlePasskeyLogin = async () => {
    if (interactiveLoginInFlight.current) return;
    interactiveLoginInFlight.current = true;
    setInteractiveLoginPending(true);
    try {
      const result = await authClient.signIn.passkey();
      if (result.error) {
        if (
          "code" in result.error &&
          (result.error.code === "AUTH_CANCELLED" ||
            result.error.code === "ERROR_CEREMONY_ABORTED" ||
            result.error.code === "ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY")
        ) {
          toast.info("Passkey 登录未完成，可重试");
        } else {
          toast.error(result.error.message || "Passkey 登录失败");
        }
        return;
      }
      toast.success("登录成功");
      window.location.href = callbackUrl;
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "name" in error &&
        (error.name === "AbortError" || error.name === "NotAllowedError")
      ) {
        toast.info("Passkey 登录未完成，可重试");
      } else {
        toast.error("无法完成 Passkey 登录，请稍后重试");
      }
    } finally {
      interactiveLoginInFlight.current = false;
      setInteractiveLoginPending(false);
    }
  };

  return (
    <>
      {clientEnv.NEXT_PUBLIC_TURNSTILE_SITE_KEY ? (
        <Script
          id={DEFAULT_SCRIPT_ID}
          src={SCRIPT_URL}
          strategy="afterInteractive"
        />
      ) : null}
      <div className="min-h-dvh box-border flex items-center justify-center px-4 py-8 text-center bg-green-700">
        {backgroundMotionAllowed && !backgroundPaused && (
          <video
            src={`${clientEnv.NEXT_PUBLIC_ASSET_URL}/common/rainAndBird.mp4`}
            className="fixed inset-0 w-full h-full object-cover"
            autoPlay={true}
            muted={true}
            loop={true}
            playsInline
            aria-hidden="true"
          />
        )}
        <div className="relative z-10 w-full max-w-96 my-auto text-white p-6 bg-white/20 backdrop-blur rounded">
          {backgroundMotionAllowed && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mb-4"
              onClick={() => setBackgroundPaused((paused) => !paused)}
            >
              {backgroundPaused ? "播放背景动画" : "暂停背景动画"}
            </Button>
          )}
          <h1 className="text-2xl">{setting?.siteName?.zh}</h1>
          <div className="opacity-80 mb-6">游客账号：guest 123456</div>
          <div className="space-y-4 [&_[data-slot=form-item]]:gap-1.5 [&_input[data-slot=input]]:h-10 [&_input[data-slot=input]]:rounded-md [&_input[data-slot=input]]:border-white/20 [&_input[data-slot=input]]:bg-white/80 [&_input[data-slot=input]]:px-4 [&_input[data-slot=input]]:text-black [&_input[data-slot=input]]:shadow-none [&_input[data-slot=input]]:placeholder:text-black/45 [&_input[data-slot=input]]:focus-visible:border-white [&_input[data-slot=input]]:focus-visible:ring-white/30 [&_[data-slot=form-message]]:text-left [&_[data-slot=form-message]]:text-red-200">
            <DynamicForm
              ref={form}
              schema={LoginSchema}
              fields={[
                {
                  name: "name",
                  type: "text",
                  label: "用户名",
                  placeholder: "用户名",
                  autoComplete: "username",
                },
                {
                  name: "password",
                  type: "password",
                  label: "密码",
                  placeholder: "密码",
                  autoComplete: "current-password",
                },
              ]}
              submitProps={{
                children: "登录",
                variant: "secondary",
                size: "lg",
                className: "w-full bg-white/80 text-black hover:bg-white",
                // Omit the override once ready so DynamicForm retains its
                // own disabled state while a submission is in flight.
                ...(clientEnv.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !captchaToken
                  ? { disabled: true }
                  : {}),
              }}
              onSubmit={onSubmit}
            />
            <div className="min-h-11">
              {isPasskeySupported === null ? (
                <Skeleton className="h-11 w-full bg-white/35" />
              ) : isPasskeySupported ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  className="w-full bg-white/80 text-black hover:bg-white"
                  disabled={interactiveLoginPending}
                  onClick={handlePasskeyLogin}
                >
                  使用 Passkey 登录
                </Button>
              ) : null}
            </div>
            <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-white/70">
              <span className="h-px flex-1 bg-white/20" />
              <span>第三方登录</span>
              <span className="h-px flex-1 bg-white/20" />
            </div>
            {providers.map((provider) => (
              <Button
                key={provider.id}
                type="button"
                variant="secondary"
                size="lg"
                className="w-full justify-center bg-black/80 px-4 text-white hover:bg-black"
                disabled={interactiveLoginPending}
                onClick={() => handleOAuthLogin(provider.id)}
              >
                <span className="inline-flex items-center gap-2">
                  {providerIcons[provider.id]}
                  <span>使用{provider.name}登录</span>
                </span>
              </Button>
            ))}
          </div>
          {clientEnv.NEXT_PUBLIC_TURNSTILE_SITE_KEY ? (
            <div className="mt-4 flex justify-center">
              <Turnstile
                ref={turnstileRef}
                siteKey={clientEnv.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                injectScript={false}
                onSuccess={onTurnstileSuccess}
                onExpire={resetCaptcha}
              />
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
};

export default function LoginClient(props: LoginClientProps) {
  return (
    <Suspense fallback={<LoadingState variant="region" />}>
      <LoginContent {...props} />
    </Suspense>
  );
}
