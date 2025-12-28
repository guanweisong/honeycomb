import React from "react";

/**
 * 签名组件的属性接口。
 */
interface IProps {
  /**
   * 显示的文本内容。
   */
  text: string;
}

/**
 * 签名组件。
 * 在文本两侧显示横线，用于分隔内容或作为装饰。
 * @param {IProps} props - 组件属性。
 * @returns {JSX.Element} 签名组件。
 */
const Signature = (props: IProps) => {
  /**
   * 渲染分隔线。
   * @returns {JSX.Element} 分隔线元素。
   */
  const renderLine = () => {
    return <span className="h-px flex-1 mt-2.5 bg-auto-back-gray/30" />;
  };

  return (
    <div className="flex my-4">
      {renderLine()}
      <span className="px-4 text-auto-front-gray/50">{props.text}</span>
      {renderLine()}
    </div>
  );
};

export default Signature;
