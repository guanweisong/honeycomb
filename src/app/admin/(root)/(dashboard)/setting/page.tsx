import { createServerClient } from "@/packages/trpc/api";
import SettingClient from "./SettingClient";

export default async function SettingPage() {
  const serverClient = await createServerClient();
  const setting = await serverClient.setting.index();
  return <SettingClient setting={setting} />;
}
