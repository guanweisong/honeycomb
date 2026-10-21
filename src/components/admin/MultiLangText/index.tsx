import { MultiLang, MultiLangEnum } from "@/lib/i18n/multi-lang";
import Image from "next/image";
import { useState } from "react";
import enIcon from "./img/en.svg";
import zhIcon from "./img/zh.svg";
import { parseStaticImage } from "../../../lib/ui/static-image";

/**
 * 多语言文本组件的属性接口。
 */
export interface MultiLangTextProps {
  /**
   * 包含多语言文本的对象，通常包含 `en` 和 `zh` 属性。
   */
  text?: MultiLang | null;
}

/**
 * 多语言文本显示组件。
 * 根据当前激活的语言显示对应的文本，并提供切换语言的功能。
 * @param {MultiLangTextProps} props - 组件属性。
 * @returns {JSX.Element | string} 多语言文本或 "-"。
 */
const MultiLangText = (props: MultiLangTextProps) => {
  const { text } = props;
  /**
   * 当前激活的语言。
   */
  const [active, setActive] = useState(MultiLangEnum.Zh);
  /**
   * 切换显示语言。
   * 在中文和英文之间切换 `active` 状态。
   */
  const handleSwitch = () => {
    setActive((previous) =>
      previous === MultiLangEnum.Zh ? MultiLangEnum.En : MultiLangEnum.Zh,
    );
  };

  if (!text?.en && !text?.zh) {
    return "-";
  }

  return (
    <span className="flex items-center">
      {text[active]}
      <button
        type="button"
        aria-label={active === MultiLangEnum.Zh ? "切换到英文" : "切换到中文"}
        onClick={handleSwitch}
      >
        <Image
          src={parseStaticImage(active === MultiLangEnum.Zh ? zhIcon : enIcon)}
          alt=""
          className="cursor-pointer ml-1"
          title={
            active === MultiLangEnum.Zh
              ? text[MultiLangEnum.En]
              : text[MultiLangEnum.Zh]
          }
          width={20}
        />
      </button>
    </span>
  );
};

export default MultiLangText;
