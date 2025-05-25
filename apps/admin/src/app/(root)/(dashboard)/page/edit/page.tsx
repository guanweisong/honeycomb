"use client";

import { Button } from "@honeycomb/ui/components/button";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import PageService from "../service";
import { PageStatus } from "../types/PageStatus";
import type { PageEntity } from "../types/page.entity";
import {
  DynamicForm,
  DynamicFormRef,
} from "@honeycomb/ui/extended/DynamicForm";
import { PageCreateSchema } from "@honeycomb/validation/page/schemas/page.create.schema";
import { PageUpdateSchema } from "@honeycomb/validation/page/schemas/page.update.schema";
import { toast } from "sonner";

const Page = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [detail, setDetail] = useState<PageEntity>();
  const formRef = useRef<DynamicFormRef>(null);
  const submitStatusRef = useRef<PageStatus>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const id = searchParams.get("id");

  const queryDetail = async (values: Partial<PageEntity>) => {
    let result;
    if (typeof values.id !== "undefined") {
      result = await PageService.indexPageDetail(values);
      result = result.data;
    }
    setDetail(result);
  };

  useEffect(() => {
    if (id) {
      queryDetail({ id });
    } else {
      setDetail(undefined);
    }
  }, [id]);

  useEffect(() => {
    if (detail) {
      formRef.current?.setValues(detail);
    } else {
      formRef.current?.reset();
    }
  }, [detail]);

  const handleSubmit = async (
    values: Partial<PageEntity>,
    status: PageStatus,
  ) => {
    try {
      const data = { ...values, status };
      setLoading(true);
      if (detail?.id) {
        return PageService.update(detail.id, data)
          .then((result) => {
            if (result?.status === 201) {
              toast.success("更新成功");
              queryDetail({ id: detail.id });
            }
          })
          .finally(() => setLoading(false));
      } else {
        // @ts-ignore
        return PageService.create(data)
          .then((result) => {
            if (result?.status === 201) {
              toast.success("添加成功");
              router.push(`/page/edit?id=${result.data.id}`);
            }
          })
          .finally(() => setLoading(false));
      }
    } catch (e) {
      console.error(e);
      toast.error("提交失败，请检查表单内容");
    }
  };

  const handleBtnClick = (status: PageStatus) => {
    submitStatusRef.current = status;
    formRef.current?.submit();
  };

  const getBtns = () => {
    const btns = [];

    if (detail?.id) {
      if (detail.status === PageStatus.PUBLISHED) {
        btns.push(
          <Button
            key="update"
            disabled={loading}
            onClick={() => handleBtnClick(PageStatus.PUBLISHED)}
          >
            更新
          </Button>,
        );
      }
      if (detail.status === PageStatus.DRAFT) {
        btns.push(
          <Button
            key="publish"
            disabled={loading}
            onClick={() => handleBtnClick(PageStatus.PUBLISHED)}
          >
            发布
          </Button>,
          <Button
            key="save"
            disabled={loading}
            onClick={() => handleBtnClick(PageStatus.DRAFT)}
          >
            保存
          </Button>,
        );
      }
    } else {
      btns.push(
        <Button
          key="draft"
          disabled={loading}
          onClick={() => handleBtnClick(PageStatus.DRAFT)}
          variant="secondary"
        >
          保存草稿
        </Button>,
        <Button
          disabled={loading}
          key="publish"
          onClick={() => handleBtnClick(PageStatus.PUBLISHED)}
        >
          发布
        </Button>,
      );
    }

    return btns;
  };

  return (
    <>
      <DynamicForm
        ref={formRef}
        schema={id ? PageUpdateSchema : PageCreateSchema}
        fields={[
          {
            name: "title",
            placeholder: "在此输入文章标题",
            type: "text",
            multiLang: true,
          },
          {
            name: "content",
            type: "richText",
            multiLang: true,
          },
        ]}
        renderSubmitButton={false}
        onSubmit={(values) => {
          const status = submitStatusRef.current;
          if (!status) {
            toast.error("提交状态未定义");
            return;
          }
          handleSubmit(values, status);
        }}
      />
      <div className="flex gap-1 mt-3">{getBtns()}</div>
    </>
  );
};

export default Page;
