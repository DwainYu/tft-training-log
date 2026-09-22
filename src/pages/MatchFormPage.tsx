import { PageHeader } from "../components/ui/Panel";
import { Stub } from "./Stub";

export function MatchFormPage({ mode }: { mode: "create" | "edit" }) {
  return (
    <>
      <PageHeader title={mode === "create" ? "新增对局" : "编辑对局"} />
      <Stub title="对局表单" />
    </>
  );
}
