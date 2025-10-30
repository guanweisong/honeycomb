import config from "../../tailwind.config";
/**
 * 前端应用的 Tailwind CSS 配置文件。
 * 扩展了基础的 Tailwind 配置，并指定了需要扫描 Tailwind 类的文件路径。
 */
export default {
  ...config,
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../packages/ui/**/*.{js,ts,jsx,tsx}",
  ],
};
