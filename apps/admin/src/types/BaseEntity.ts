/**
 * 基础实体接口。
 * 定义了所有实体共有的时间戳属性。
 */
export interface BaseEntity {
  /**
   * 实体最后更新的时间。
   */
  updatedAt: Date;
  /**
   * 实体创建的时间。
   */
  createdAt: Date;
}
