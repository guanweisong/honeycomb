import Link from "next/link";
import { PageState } from "@/components/PageState";
import { MultiLangEnum } from "@/lib/i18n/i18n";
import en from "@/app/(blog)/messages/en.json";
import zh from "@/app/(blog)/messages/zh.json";

export function BlogNotFound({ locale }: { locale: MultiLangEnum }) {
  const messages = (locale === MultiLangEnum.Zh ? zh : en).NotFound;
  return (
    <PageState
      title={messages.title}
      description={messages.description}
      actions={
        <Link
          className="underline decoration-teal-500 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4"
          href={`/${locale}/list/category`}
          prefetch={true}
        >
          {messages.home}
        </Link>
      }
    />
  );
}
