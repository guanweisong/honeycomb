"use client";

import { formItemLayout } from "@/src/constants/formItemLayout";
import { ModalType, ModalTypeName } from "@/src/types/ModalType";
import { PlusOutlined } from "@ant-design/icons";
import type { ActionType } from "@ant-design/pro-components";
import {
  FooterToolbar,
  PageContainer,
  ProTable,
} from "@ant-design/pro-components";
import { Button, Form, Input, Modal, Popconfirm, Radio, message } from "antd";
import type { RuleObject } from "antd/es/form";
import md5 from "md5";
import { useRef, useState } from "react";
import { userTableColumns } from "./constants/userTableColumns";
import UserService from "./service";
import { UserLevel, userLevelOptions } from "./types/UserLevel";
import { UserStatus, userStatusOptions } from "./types/UserStatus";
import type { UserEntity } from "./types/user.entity";
import type { UserIndexRequest } from "./types/user.index.request";

const User = () => {
  const [form] = Form.useForm();
  const actionRef = useRef<ActionType>(null);
  const [selectedRows, setSelectedRows] = useState<UserEntity[]>([]);
  const [modalProps, setModalProps] = useState<{
    type?: ModalType;
    open: boolean;
    record?: UserEntity;
  }>({
    type: ModalType.ADD,
    open: false,
  });

  /**
   * 列表查询方法
   * @param params
   * @param sort
   * @param filter
   */
  const request = async (
    params: {
      pageSize: number;
      current: number;
      name?: string;
      email?: string;
      level?: UserLevel[];
      status?: UserStatus[];
    },
    sort: any = {},
  ) => {
    const { pageSize, current, name, email, level, status } = params;
    const data: UserIndexRequest = {
      name,
      email,
      status,
      level,
      page: current,
      limit: pageSize,
    };
    const sortKeys = Object.keys(sort);
    if (sortKeys.length > 0) {
      data.sortField = sortKeys[0];
      data.sortOrder = sort[sortKeys[0]];
    }
    const result = await UserService.index(data);
    return {
      data: result.data.list,
      success: true,
      total: result.data.total,
    };
  };

  /**
   * 删除事件
   * @param ids
   */
  const handleDeleteItem = async (ids: string[]) => {
    const result = await UserService.destroy(ids);
    if (result.status === 204) {
      actionRef.current?.reload();
      message.success("删除成功");
    }
  };

  /**
   * 批量删除
   */
  const handleDeleteBatch = async () => {
    const ids = selectedRows.map((item) => item.id);
    await handleDeleteItem(ids);
    setSelectedRows([]);
  };

  /**
   * 编辑事件
   * @param record
   */
  const handleEditItem = (record: UserEntity) => {
    form.setFieldsValue(record);
    setModalProps({
      type: ModalType.EDIT,
      open: true,
      record: record,
    });
  };

  /**
   * 新增、修改保存事件
   */
  const handleModalOk = () => {
    form
      .validateFields()
      .then(async (values) => {
        const { password, ...rest } = values;
        const params = rest;
        if (password) {
          params.password = md5(values.password);
        }
        switch (modalProps.type!) {
          case ModalType.ADD:
            const createResult = await UserService.create(params);
            if (createResult.status === 201) {
              actionRef.current?.reload();
              message.success("添加成功");
            }
            break;
          case ModalType.EDIT:
            const updateResult = await UserService.update(
              modalProps.record?.id as string,
              params,
            );
            if (updateResult.status === 201) {
              actionRef.current?.reload();
              message.success("更新成功");
            }
            break;
        }
        setModalProps({ open: false });
      })
      .catch((e) => {
        console.error(e);
      });
  };

  /**
   * 新增事件
   */
  const handleAddNew = () => {
    form.resetFields();
    form.setFieldsValue({ level: UserLevel.EDITOR, status: UserStatus.ENABLE });
    setModalProps({
      type: ModalType.ADD,
      open: true,
      record: undefined,
    });
  };

  /**
   * 查询唯一性
   * @param user_name
   * @param user_email
   */
  const checkExist = async ({
    name,
    email,
  }: {
    name?: string;
    email?: string;
  }) => {
    console.log("users=>model=>checkExist", { name });
    let exist = false;
    const result = await UserService.index({ name, email });
    const currentId = modalProps.record?.id;
    if (result.data.total > 0 && result.data.list[0].id !== currentId) {
      exist = true;
    }
    return exist;
  };

  /**
   * 校验用户名是否唯一
   * @param _rule
   * @param value
   */
  const validateUserName = async (_rule: RuleObject, value: string) => {
    if (value && value.length > 0) {
      const result = await checkExist({ name: value });
      if (result) {
        return Promise.reject("抱歉，用户名已存在，请换一个用户名");
      }
      return Promise.resolve();
    }
    return Promise.resolve();
  };

  /**
   * 校验邮箱地址是否唯一
   * @param _rule
   * @param value
   */
  const validateUserEmail = async (_rule: RuleObject, value: string) => {
    if (value && value.length > 0) {
      const result = await checkExist({ email: value });
      if (result) {
        return Promise.reject("抱歉，用户邮箱已存在，请换一个用户邮箱");
      }
      return Promise.resolve();
    }
    return Promise.resolve();
  };

  return (
    <PageContainer>
      <ProTable<UserEntity, any>
        rowKey="id"
        defaultSize={"middle"}
        form={{ syncToUrl: true }}
        request={request}
        actionRef={actionRef}
        columns={userTableColumns({ handleEditItem, handleDeleteItem })}
        rowSelection={{
          selectedRowKeys: selectedRows.map((item) => item.id),
          onChange: (_, rows) => {
            setSelectedRows(rows);
          },
        }}
        toolBarRender={() => [
          <Button type="primary" key="primary" onClick={handleAddNew}>
            <PlusOutlined /> 添加新用户
          </Button>,
        ]}
      />
      {selectedRows?.length > 0 && (
        <FooterToolbar
          extra={
            <div>
              选择了
              <a style={{ fontWeight: 600 }}>{selectedRows.length}</a>项
              &nbsp;&nbsp;
            </div>
          }
        >
          <Popconfirm title="确定要删除吗？" onConfirm={handleDeleteBatch}>
            <Button type="primary">批量删除</Button>
          </Popconfirm>
        </FooterToolbar>
      )}
      <Modal
        title={`${ModalTypeName[ModalType[modalProps.type!] as keyof typeof ModalTypeName]}用户`}
        open={modalProps.open}
        onOk={handleModalOk}
        onCancel={() => setModalProps({ open: false })}
      >
        <Form form={form} onFinish={handleModalOk}>
          <Form.Item
            {...formItemLayout}
            name="name"
            label="用户名"
            rules={[
              { required: true, message: "请输入用户名" },
              { validator: validateUserName },
            ]}
          >
            <Input maxLength={20} />
          </Form.Item>
          <Form.Item
            {...formItemLayout}
            name="password"
            label="密码"
            rules={[
              {
                required: modalProps.type === ModalType.ADD,
                message: "请输入密码",
              },
            ]}
          >
            <Input
              autoComplete="off"
              type="password"
              maxLength={20}
              minLength={6}
              placeholder={
                modalProps.type === ModalType.EDIT ? "留空则为不修改" : ""
              }
            />
          </Form.Item>
          <Form.Item
            {...formItemLayout}
            label="邮箱"
            name="email"
            rules={[
              { required: true, message: "请输入用户邮箱" },
              { type: "email", message: "请输入正确的邮箱" },
              { validator: validateUserEmail },
            ]}
          >
            <Input.TextArea rows={3} autoComplete="off" maxLength={20} />
          </Form.Item>
          <Form.Item {...formItemLayout} name="level" label="级别">
            <Radio.Group
              buttonStyle="solid"
              disabled={modalProps.record?.level === UserLevel.ADMIN}
              options={userLevelOptions}
            />
          </Form.Item>
          <Form.Item {...formItemLayout} name="status" label="状态">
            <Radio.Group
              buttonStyle="solid"
              disabled={modalProps.record?.level === UserLevel.ADMIN}
              options={userStatusOptions}
            />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default User;
