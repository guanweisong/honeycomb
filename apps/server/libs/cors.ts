/**
 * Multi purpose CORS lib.
 * Note: Based on the `cors` package in npm but using only
 * web APIs. Feel free to use it in your own projects.
 */
type StaticOrigin = boolean | string | RegExp | (boolean | string | RegExp)[];

/**
 * 来源函数类型。
 * 接收请求来源和请求对象，返回一个静态来源类型。
 */
type OriginFn = (
  origin: string | undefined,
  req: Request,
) => StaticOrigin | Promise<StaticOrigin>;

/**
 * CORS 选项接口。
 * 定义了配置 CORS 行为的各种选项。
 */
interface CorsOptions {
  /**
   * 允许的来源。
   */
  origin?: StaticOrigin | OriginFn;
  /**
   * 允许的 HTTP 方法。
   */
  methods?: string | string[];
  /**
   * 允许的请求头。
   */
  allowedHeaders?: string | string[];
  /**
   * 暴露的响应头。
   */
  exposedHeaders?: string | string[];
  /**
   * 是否支持凭证（如 cookies）。
   */
  credentials?: boolean;
  /**
   * 预检请求的缓存时间（秒）。
   */
  maxAge?: number;
  /**
   * 是否继续处理预检请求。
   */
  preflightContinue?: boolean;
  /**
   * 预检请求成功时的状态码。
   */
  optionsSuccessStatus?: number;
}

/**
 * 默认的 CORS 选项。
 */
/**
 * 默认的 CORS 选项。
 * - `origin`: 默认为 "*"，允许所有来源。
 * - `methods`: 默认为常见的 HTTP 方法。
 * - `preflightContinue`: 默认为 `false`，表示预检请求后不继续处理。
 * - `optionsSuccessStatus`: 默认为 204，表示预检请求成功时的状态码。
 */
const defaultOptions: CorsOptions = {
  origin: "*",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

/**
 * 检查请求来源是否被允许。
 * @param {string} origin - 请求来源。
 * @param {StaticOrigin} allowed - 允许的来源配置。
 * @returns {boolean} 如果来源被允许则返回 `true`，否则返回 `false`。
 */
function isOriginAllowed(origin: string, allowed: StaticOrigin): boolean {
  return Array.isArray(allowed)
    ? allowed.some((o) => isOriginAllowed(origin, o))
    : typeof allowed === "string"
      ? origin === allowed
      : allowed instanceof RegExp
        ? allowed.test(origin)
        : !!allowed;
}

/**
 * 根据请求来源和允许的来源生成 CORS 相关的响应头。
 * @param {string | undefined} reqOrigin - 请求的原始来源。
 * @param {StaticOrigin} origin - 允许的来源配置。
 * @returns {Headers} 包含 CORS 来源头的 Headers 对象。
 */
function getOriginHeaders(reqOrigin: string | undefined, origin: StaticOrigin) {
  const headers = new Headers();

  if (origin === "*") {
    // Allow any origin
    headers.set("Access-Control-Allow-Origin", "*");
  } else if (typeof origin === "string") {
    // Fixed origin
    headers.set("Access-Control-Allow-Origin", origin);
    headers.append("Vary", "Origin");
  } else {
    const allowed = isOriginAllowed(reqOrigin ?? "", origin);

    if (allowed && reqOrigin) {
      headers.set("Access-Control-Allow-Origin", reqOrigin);
    }
    headers.append("Vary", "Origin");
  }

  return headers;
}

// originHeadersFromReq

/**
 * 从请求中获取来源头。
 * @param {Request} req - 请求对象。
 * @param {StaticOrigin | OriginFn} origin - 允许的来源配置或来源函数。
 * @returns {Promise<Headers | undefined>} 包含来源头的 Headers 对象或 undefined。
 */
async function originHeadersFromReq(
  req: Request,
  origin: StaticOrigin | OriginFn,
) {
  const reqOrigin = req.headers.get("Origin") || undefined;
  const value =
    typeof origin === "function" ? await origin(reqOrigin, req) : origin;

  if (!value) return;
  return getOriginHeaders(reqOrigin, value);
}

/**
 * 获取允许的请求头。
 * @param {Request} req - 请求对象。
 * @param {string | string[]} [allowed] - 允许的请求头配置。
 * @returns {Headers} 包含允许请求头的 Headers 对象。
 */
function getAllowedHeaders(req: Request, allowed?: string | string[]) {
  const headers = new Headers();

  if (!allowed) {
    allowed = req.headers.get("Access-Control-Request-Headers")!;
    headers.append("Vary", "Access-Control-Request-Headers");
  } else if (Array.isArray(allowed)) {
    // If the allowed headers is an array, turn it into a string
    allowed = allowed.join(",");
  }
  if (allowed) {
    headers.set("Access-Control-Allow-Headers", allowed);
  }

  return headers;
}

/**
 * 处理 CORS (跨域资源共享) 请求。
 * 根据提供的选项配置响应头，处理预检请求和实际请求。
 * @param {Request} req - 请求对象。
 * @param {Response} res - 响应对象。
 * @param {CorsOptions} [options] - CORS 配置选项。
 * @returns {Promise<Response>} 经过 CORS 处理后的响应对象。
 */
export default async function cors(
  req: Request,
  res: Response,
  options?: CorsOptions,
) {
  const opts = { ...defaultOptions, ...options };
  const { headers } = res;
  const originHeaders = await originHeadersFromReq(req, opts.origin ?? false);
  const mergeHeaders = (v: string, k: string) => {
    if (k === "Vary") headers.append(k, v);
    else headers.set(k, v);
  };
  // If there's no origin we won't touch the response
  if (!originHeaders) return res;

  originHeaders.forEach(mergeHeaders);

  if (opts.credentials) {
    headers.set("Access-Control-Allow-Credentials", "true");
  }

  const exposed = Array.isArray(opts.exposedHeaders)
    ? opts.exposedHeaders.join(",")
    : opts.exposedHeaders;

  if (exposed) {
    headers.set("Access-Control-Expose-Headers", exposed);
  }

  // Handle the preflight request
  if (req.method === "OPTIONS") {
    if (opts.methods) {
      const methods = Array.isArray(opts.methods)
        ? opts.methods.join(",")
        : opts.methods;

      headers.set("Access-Control-Allow-Methods", methods);
    }

    getAllowedHeaders(req, opts.allowedHeaders).forEach(mergeHeaders);

    if (typeof opts.maxAge === "number") {
      headers.set("Access-Control-Max-Age", String(opts.maxAge));
    }
    if (opts.preflightContinue) {
      return res;
    }

    headers.set("Content-Length", "0");
    // 返回预检请求的响应。
    // 注意：这里直接设置了响应头，而不是使用之前构建的 `headers` 对象，
    // 这可能会导致一些配置（如 `Access-Control-Allow-Origin`）被硬编码覆盖。
    // 建议将动态生成的 headers 合并到此响应中，以确保一致性。
    return new Response(null, {
      status: opts.optionsSuccessStatus,
      headers: {
        "Access-Control-Allow-Methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Origin": req.headers.get("origin")!,
        "Access-Control-Allow-Headers":
          "content-type, x-auth-token, x-requested-with",
      },
    });
  }

  // If we got here, it's a normal request
  return res;
}

/**
 * 初始化 CORS 中间件。
 * @param {CorsOptions} [options] - CORS 配置选项。
 * @returns {(req: Request, res: Response) => Promise<Response>} CORS 中间件函数。
 */
export function initCors(options?: CorsOptions) {
  return (req: Request, res: Response) => cors(req, res, options);
}
