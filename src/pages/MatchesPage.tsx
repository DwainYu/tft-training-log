import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { allMatches, knownCompositions, listMatches } from "../services/match-service";
import { EMPTY_MATCH_QUERY, type MatchQuery } from "../domain/match/query";
import { MatchFilters } from "../components/matches/MatchFilters";
import { MatchList } from "../components/matches/MatchList";
import { AddMatchButton } from "../components/matches/AddMatchButton";
import { EmptyState } from "../components/ui/Badge";
import { Panel, PageHeader } from "../components/ui/Panel";
import { Pagination } from "../components/ui/Pagination";
import { Spinner } from "../components/ui/Spinner";

const PAGE_SIZE = 20;

export function MatchesPage() {
  const [params] = useSearchParams();
  const [query, setQuery] = useState<MatchQuery>({
    ...EMPTY_MATCH_QUERY,
    // /matches?reviewed=unreviewed is the link from the Dashboard todo card
    reviewed: params.get("reviewed") === "unreviewed" ? "unreviewed" : "all",
  });
  const [page, setPage] = useState(1);

  const matches = useLiveQuery(() => listMatches(query), [JSON.stringify(query)]);
  const totalLogged = useLiveQuery(() => allMatches(), []);
  const compositions = useLiveQuery(() => knownCompositions(), [], []);

  useEffect(() => setPage(1), [query]);

  const shown = useMemo(() => {
    const list = matches ?? [];
    const start = (page - 1) * PAGE_SIZE;
    return list.slice(start, start + PAGE_SIZE);
  }, [matches, page]);

  return (
    <>
      <PageHeader
        title="对局"
        subtitle={`${totalLogged?.length ?? "…"} 场对局记录 · 支持搜索、筛选与排序`}
        action={<AddMatchButton />}
      />

      <div className="flex flex-col gap-4">
        <Panel>
          <MatchFilters
            query={query}
            compositions={compositions}
            onChange={(patch) => setQuery((q) => ({ ...q, ...patch }))}
            onReset={() => setQuery(EMPTY_MATCH_QUERY)}
          />
        </Panel>

        <Panel>
          {matches === undefined ? (
            <Spinner />
          ) : matches.length === 0 ? (
            <EmptyState
              title="没有符合条件的对局"
              description={
                (totalLogged?.length ?? 0) === 0
                  ? "打完一局用「快速记录一局」记录名次和阵容，两分钟之内就能完成。"
                  : "试着放宽筛选条件，或清空筛选。"
              }
            />
          ) : (
            <>
              <MatchList matches={shown} />
              <Pagination
                page={page}
                pageSize={PAGE_SIZE}
                total={matches.length}
                onPage={setPage}
              />
            </>
          )}
        </Panel>
      </div>
    </>
  );
}
