import config from "../../tailwind.config";
export default {
  ...config,
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../packages/ui/**/*.{js,ts,jsx,tsx}",
  ],
};
