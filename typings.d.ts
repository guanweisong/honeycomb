declare module "slash2";
declare module "*.css";
declare module "*.less";
declare module "*.scss";
declare module "*.sass";
declare module "*.svg";
declare module "*.png";
declare module "*.jpg";
declare module "*.jpeg";
declare module "*.gif";
declare module "*.bmp";
declare module "*.tiff";
declare module "omit.js";

interface TurnstileRenderOptions {
    sitekey: string;
    callback?: (token: string) => void;
    "expired-callback"?: () => void;
    "error-callback"?: () => void;
    theme?: "light" | "dark" | "auto";
    size?: "normal" | "compact";
}

interface Turnstile {
    ready: (callback: () => void) => void;
    render: (
        container: string | HTMLElement,
        options: TurnstileRenderOptions,
    ) => string;
    reset: (widgetId?: string) => void;
    getResponse: (widgetId?: string) => string | undefined;
    remove: (widgetId?: string) => void;
    isExpired: (widgetId?: string) => boolean;
    execute: (container?: string | HTMLElement, options?: TurnstileRenderOptions) => void;
}

declare const turnstile: Turnstile;
