/**
 * 多语言文本接口。
 * 定义了包含中文和英文文本的结构。
 */
export interface MultiLang {
  /**
   * 中文文本。
   */
  zh?: string;
  /**
   * 英文文本。
   */
  en?: string;
}

/**
 * 多语言枚举。
 * 定义了支持的语言类型。
 */
export enum MultiLangEnum {
  /**
   * 中文。
   */
  Zh = "zh",
  /**
   * 英文。
   */
  En = "en",
}
