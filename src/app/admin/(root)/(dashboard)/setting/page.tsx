import { getSiteSetting } from "@/app/lib/server/site-setting";
import { headers } from "next/headers";
import SettingClient from "./SettingClient";

export default async function SettingPage() {
  const setting = await getSiteSetting(await headers());
  return <SettingClient setting={setting} />;
}
