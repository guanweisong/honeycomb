"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Dialog } from "@/components/Dialog";
import { PageInsertSchema } from "@/features/page/schemas/page.insert.schema";
import type { PageInsert } from "@/features/page/types/page.insert";
import type { PageRecord } from "@/features/page/types/page.read-model";
import { PageStatus } from "@/features/page/types/page.status";
import { PageTemplate } from "@/features/page/types/page.template";
import {
  useAdminLayoutActions,
  useAdminLayoutPageTitle,
} from "@/components/admin/layout-context";
import { EditorLoadError } from "@/components/admin/editor-load-error";
import { PageEditorActionButtons } from "../PageEditorActionButtons";
import { PageEditorForm } from "../PageEditorForm";
import { usePageEditorActions } from "../../page-editor-actions";
import { trpc } from "@/lib/trpc/client/trpc";
import {
  getPageEditorId,
  toPageEditorFormValues,
} from "../../transforms/page-editor-transforms";
import {
  useLocalDraft,
  LocalDraftPrompt,
} from "@/components/admin/local-draft";
import { useCurrentUser } from "@/features/user/admin/use-current-user";
import { can, Permission } from "@/lib/auth/permissions";
import {
  PageEditorSchema,
  type PageEditorValues,
  type PageDraft,
  parsePageDraft,
  readPageCreationAttempt,
  writePageCreationAttempt,
  clearPageCreationAttempt,
  preservePageDraft,
} from "../../page-draft";

export function PageEditorPage() {
  const id = getPageEditorId(useSearchParams());
  const { user } = useCurrentUser();
  const actorId = user?.id;
  const router = useRouter();
  const [navigating, startNavigation] = useTransition();
  const [baseVersion, setBaseVersion] = useState<number>();
  const [baseStatus, setBaseStatus] = useState<PageRecord["status"]>();
  const [problem, setProblem] = useState<"conflict" | "unknown" | null>(null);
  const [attempt, setAttempt] = useState<PageInsert | null>(null);
  const [preserved, setPreserved] = useState<PageDraft | null>(null);
  const [checking, setChecking] = useState(false);
  const foundCreation = useRef(false);
  const generation = useRef(0);
  const identity = `${actorId ?? ""}:${id ?? "new"}`;
  const currentIdentity = useRef(identity);
  useLayoutEffect(() => {
    currentIdentity.current = identity;
    return () => {
      generation.current += 1;
    };
  }, [identity]);
  const form = useForm<PageEditorValues>({
    resolver: zodResolver(PageEditorSchema),
    defaultValues: { template: PageTemplate.DEFAULT },
  });
  const query = trpc.page.adminDetail.useQuery(
    { id: id ?? "" },
    { enabled: !!id },
  );
  const detail = query.data;
  const actions = usePageEditorActions({
    pageId: id ?? undefined,
    actorId,
    expectedVersion: baseVersion,
    refetch: query.refetch,
  });
  const creationResult = trpc.page.creationResult.useQuery(
    { creationToken: attempt?.creationToken ?? "" },
    { enabled: Boolean(actorId && !id && attempt), retry: false },
  );
  useEffect(() => {
    if (creationResult.data) foundCreation.current = true;
  }, [creationResult.data]);
  const isLoadingDetail = Boolean(id && detail?.id !== id);
  const loadError = isLoadingDetail
    ? (query.error ??
      (detail === null ? { data: { code: "NOT_FOUND" } } : null))
    : null;
  const loading =
    actions.loading ||
    navigating ||
    checking ||
    (isLoadingDetail && !loadError);
  const { isDirty } = form.formState;
  const draftValues =
    parsePageDraft({ ...useWatch({ control: form.control }), baseVersion }) ??
    {};
  const previous = useRef<{ identity: string; detail: typeof detail } | null>(
    null,
  );
  const busy = useRef(false);
  const consumed = useRef<typeof detail>(undefined);
  useEffect(() => {
    const old = previous.current;
    previous.current = { identity, detail };
    if (old?.identity === identity) {
      if (
        old.detail === detail ||
        consumed.current === detail ||
        ((isDirty || busy.current) && old.detail?.id === id)
      )
        return;
    } else {
      consumed.current = undefined;
      setAttempt(!id && actorId ? readPageCreationAttempt(actorId) : null);
      setProblem(null);
      setPreserved(null);
      setChecking(false);
      busy.current = false;
      foundCreation.current = false;
    }
    const record = id && detail?.id === id ? detail : undefined;
    setBaseVersion(record?.version);
    setBaseStatus(record?.status);
    form.reset(
      toPageEditorFormValues(record) ?? { template: PageTemplate.DEFAULT },
    );
  }, [identity, id, actorId, detail, isDirty, form]);
  const applyDraft = (values: PageDraft) => {
    setBaseVersion(values.baseVersion);
    const { baseVersion: savedVersion, ...fields } = values;
    void savedVersion;
    form.reset(
      { ...fields, status: form.getValues("status") },
      { keepDefaultValues: true },
    );
  };
  const draft = useLocalDraft({
    storageKey:
      user &&
      can(user.level, id ? Permission.pageUpdate : Permission.pageCreate)
        ? `honeycomb:draft:page:${encodeURIComponent(user.id)}:${id ?? "new"}`
        : null,
    values: draftValues,
    dirty: isDirty,
    ready: !isLoadingDetail,
    parse: parsePageDraft,
    onRestore: (values) => {
      applyDraft(values);
      if (id && values.baseVersion === undefined) setProblem("conflict");
    },
  });
  const finishCreation = (
    result: Pick<PageRecord, "id" | "version">,
    input: PageInsert,
    submitted?: string,
  ) => {
    if (!actorId) return;
    if (
      submitted
        ? JSON.stringify(form.getValues()) !== submitted
        : form.formState.isDirty
    ) {
      const local = parsePageDraft({
        ...form.getValues(),
        baseVersion: submitted ? result.version : 0,
      });
      if (local && !preservePageDraft(actorId, result.id, local)) {
        setPreserved(local);
        toast.warning(
          "页面已创建，但后续编辑无法备份。请保留当前页面并复制内容后打开页面",
        );
        return;
      }
    }
    clearPageCreationAttempt(actorId, input.creationToken);
    setAttempt(null);
    startNavigation(() => router.push(`/admin/page/edit?id=${result.id}`));
  };
  const submit = async (status: PageStatus): Promise<boolean> => {
    if (loading || busy.current || problem || isLoadingDetail) return false;
    const started = generation.current;
    const active = () =>
      started === generation.current && currentIdentity.current === identity;
    busy.current = true;
    let saved = false;
    try {
      await form.handleSubmit(async (values) => {
        if (!active()) return;
        const snapshot = JSON.stringify(form.getValues());
        const submittedDraft =
          parsePageDraft({ ...form.getValues(), baseVersion }) ?? {};
        let input: Partial<PageInsert> = values;
        if (!id) {
          if (!actorId || attempt) {
            toast.error("上次创建结果尚待核对，请先核对");
            return;
          }
          const frozen = PageInsertSchema.parse({
            ...values,
            status,
            creationToken: crypto.randomUUID(),
          });
          if (!writePageCreationAttempt(actorId, frozen)) {
            toast.error("无法保存创建凭据，请允许浏览器本地存储后重试");
            return;
          }
          setAttempt(frozen);
          input = frozen;
        } else if (baseVersion === undefined) {
          setProblem("conflict");
          toast.error("缺少编辑版本，请先加载最新版本");
          return;
        }
        const result = await actions.submit(input, status);
        if (!active() || result.state === "stale") return;
        if (result.state === "conflict" || result.state === "unknown") {
          setProblem(result.state);
          setPreserved(submittedDraft);
          return;
        }
        if (result.state === "error") {
          if (!id && actorId && input.creationToken) {
            clearPageCreationAttempt(actorId, input.creationToken);
            setAttempt(null);
          }
          return;
        }
        saved = true;
        if (result.state === "created") {
          const frozen = PageInsertSchema.parse(input);
          finishCreation(result, frozen, snapshot);
          draft.clearSaved(submittedDraft);
          return;
        }
        if (result.state !== "updated") return;
        setBaseVersion(result.version);
        setBaseStatus(status);
        setProblem(null);
        draft.clearSaved(submittedDraft);
        const current = form.getValues();
        form.reset({ ...values, status });
        if (JSON.stringify(current) !== snapshot)
          form.reset({ ...current, status }, { keepDefaultValues: true });
      })();
      return saved;
    } finally {
      if (active()) busy.current = false;
    }
  };
  const loadLatest = async () => {
    if (!actorId || !id || busy.current) return;
    const local = parsePageDraft({ ...form.getValues(), baseVersion });
    if (!local || !preservePageDraft(actorId, id, local)) {
      toast.error("无法保留本地内容，暂未替换表单");
      return;
    }
    setPreserved(local);
    const snapshot = JSON.stringify(form.getValues());
    const started = generation.current;
    busy.current = true;
    setChecking(true);
    try {
      const latest = await query.refetch();
      if (started !== generation.current) return;
      if (!latest.isSuccess || !latest.data) {
        toast.error("加载最新版本失败，本地内容已保留");
        return;
      }
      consumed.current = latest.data;
      if (JSON.stringify(form.getValues()) !== snapshot) {
        toast.warning("加载期间有新的本地编辑，未替换表单，请核对后再次加载");
        return;
      }
      setBaseVersion(latest.data.version);
      setBaseStatus(latest.data.status);
      form.reset(toPageEditorFormValues(latest.data));
      setProblem(null);
    } catch {
      if (started === generation.current)
        toast.error("加载最新版本失败，本地内容已保留");
    } finally {
      if (started === generation.current) {
        busy.current = false;
        setChecking(false);
      }
    }
  };
  const recoverCreation = async (retry: boolean) => {
    if (!attempt || !actorId || busy.current) return;
    const started = generation.current;
    busy.current = true;
    setChecking(true);
    try {
      const checked = await creationResult.refetch();
      if (started !== generation.current) return;
      if (!checked.isSuccess) {
        toast.error("无法核对上次创建，请稍后重试");
        return;
      }
      if (checked.data) {
        foundCreation.current = true;
        finishCreation(checked.data, attempt);
        return;
      }
      if (!retry) {
        toast.warning("查无结果不代表从未创建，请先人工核对页面列表");
        return;
      }
      if (foundCreation.current) {
        toast.error("此前页面已无法确认，不能重试原始创建，请先核对页面列表");
        return;
      }
      const result = await actions.submit(
        attempt,
        attempt.status ?? PageStatus.DRAFT,
      );
      if (started !== generation.current) return;
      if (result.state === "created") finishCreation(result, attempt);
    } catch {
      if (started === generation.current)
        toast.error("上次创建结果仍无法确认，原始内容和凭据已保留");
    } finally {
      if (started === generation.current) {
        busy.current = false;
        setChecking(false);
      }
    }
  };
  useAdminLayoutPageTitle(
    id ? "修改页面" : "添加新页面",
    `${id ?? "new"}:${actions.loading}`,
  );
  useAdminLayoutActions(
    loadError ? null : (
      <div className="flex flex-wrap gap-3">
        <PageEditorActionButtons
          isEdit={!!id}
          loading={loading || !!problem || !!attempt}
          status={baseStatus}
          onSubmit={submit}
        />
      </div>
    ),
    `${identity}:${user?.level}:${baseStatus}:${loading}:${Boolean(loadError)}:${baseVersion}:${problem}:${attempt?.creationToken}`,
  );
  if (loadError)
    return (
      <EditorLoadError
        kind="页面"
        notFound={loadError.data?.code === "NOT_FOUND"}
        listHref="/admin/page"
        onRetry={query.refetch}
      />
    );
  return (
    <div inert={isLoadingDetail} aria-busy={isLoadingDetail}>
      {problem && (
        <div role="status">
          <p>
            {problem === "conflict"
              ? "服务器版本已改变，本地编辑仍保留。"
              : "保存结果暂时无法确认，本地编辑仍保留。内容一致也不能证明历史请求已执行。"}
          </p>
          {id && (
            <button
              type="button"
              disabled={loading}
              onClick={() => void loadLatest()}
            >
              保留本地内容并加载最新版本
            </button>
          )}
        </div>
      )}
      {preserved && (
        <div role="status">
          已保留加载前的本地内容。
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              applyDraft(preserved);
              setProblem("conflict");
            }}
          >
            恢复本地内容以核对
          </button>
        </div>
      )}
      {attempt && (
        <div role="status">
          <p>
            存在尚未确认的创建请求。重试只使用原始内容，不包含之后的编辑。查无结果不代表从未创建，已删除的页面可能被重新创建；时间较久或有删除迹象时请先人工核对列表，不要重试。
          </p>
          <a href="/admin/page" target="_blank" rel="noreferrer">
            核对页面列表
          </a>
          <button
            type="button"
            disabled={loading}
            onClick={() => void recoverCreation(false)}
          >
            核对上次结果并打开
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => void recoverCreation(true)}
          >
            已核对，重试原始创建
          </button>
          <Dialog
            trigger={
              <button type="button" disabled={loading}>
                已核对列表，开始新的创建
              </button>
            }
            title="确认开始新的创建？"
            description="请先核对页面列表和上次结果。新建意图不会复用原凭据，可能产生重复页面；当前输入会保留，不会立即提交。"
            onOK={() => {
              if (
                !actorId ||
                !clearPageCreationAttempt(actorId, attempt.creationToken)
              ) {
                toast.error("无法清除原创建凭据，请保留当前页面并稍后重试");
                return false;
              }
              setAttempt(null);
              setProblem(null);
              foundCreation.current = false;
              return true;
            }}
          />
        </div>
      )}
      <LocalDraftPrompt {...draft} />
      <PageEditorForm form={form} />
    </div>
  );
}
