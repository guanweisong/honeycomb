import React from "react";

/**
 * 卡片组件的属性接口。
 */
export interface BlockProps {
  /**
   * 卡片的标题。
   */
  title: string;
  /**
   * 卡片的内容。
   */
  children: React.ReactElement;
}

/**
 * 卡片组件。
 * 用于展示带有标题和内容的卡片。
 * @param {BlockProps} props - 组件属性。
 * @returns {JSX.Element} 卡片组件。
 */
const Card = (props: BlockProps) => {
  const { title, children } = props;

  return (
    <div className="my-5 lg:my-10">
      <h2 className="text-lg border-b-2 py-2 border-auto-front-gray/20 text-auto-front-gray/50">
        {title}
      </h2>
      <div>{children}</div>
    </div>
  );
};

export default Card;
