import { MultiLang, MultiLangEnum } from "@/packages/types/multi.lang";
import Image from "next/image";
import { useState } from "react";
import enIcon from "./img/en.svg";
import zhIcon from "./img/zh.svg";

/**
 * 多语言文本组件的属性接口。
 */
export interface MultiLangTextProps {
  /**
   * 包含多语言文本的对象，通常包含 `en` 和 `zh` 属性。
   */
  text: MultiLang;
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
    setActive(
      active === MultiLangEnum.Zh ? MultiLangEnum.En : MultiLangEnum.Zh,
    );
  };

  if (!text?.en && !text?.zh) {
    return "-";
  }

  return (
    <span className="flex items-center">
      {text[active]}
      <Image
        src={active === MultiLangEnum.Zh ? zhIcon : enIcon}
        alt="切换语言"
        className="cursor-pointer ml-1"
        title={
          active === MultiLangEnum.Zh
            ? props.text[MultiLangEnum.En]
            : props.text[MultiLangEnum.Zh]
        }
        width={20}
        onClick={handleSwitch}
      />
    </span>
  );
};

export default MultiLangText;
