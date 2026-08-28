"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { unsplash } from "@/lib/images";
import { reorderSelectedWorkCards } from "@/app/admin/(panel)/selected-work/actions";
import { Badge, EmptyState, buttonClass } from "@/components/admin/ui";
import { iconButtonClass } from "@/components/admin/projects/RepeatableList";
import type { SelectedWorkCardRow } from "@/lib/supabase/types";
import CardDialog from "./CardDialog";

/**
 * The panels in the rail, in the order they scroll past.
 *
 * REORDERING IS UP/DOWN BUTTONS, not drag and drop. The CRM board needs
 * @dnd-kit because a lead moves in two dimensions — between stages as well as
 * within one — but this is a single short list, and the arrows work on a phone,
 * with a keyboard and with a screen reader for free. Same idiom as the project
 * gallery next door.
 *
 * Every move rewrites the whole order (0..n-1) rather than swapping two rows,
 * so the numbers can never drift into ties.
 */
export default function CardsManager({ cards }: { cards: SelectedWorkCardRow[] }) {
  const [order, setOrder] = useState<SelectedWorkCardRow[]>(cards);
  const [dialog, setDialog] = useState<{ card: SelectedWorkCardRow | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Server truth wins whenever the page revalidates. Adjusting state during
  // render is React's documented way to reset local state from a changed prop.
  const [serverCards, setServerCards] = useState<SelectedWorkCardRow[]>(cards);
  if (serverCards !== cards) {
    setServerCards(cards);
    setOrder(cards);
  }

  const publishedCount = order.filter((card) => card.published).length;

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= order.length) return;

    const previous = order;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];

    setOrder(next);
    setError(null);

    startTransition(async () => {
      try {
        const result = await reorderSelectedWorkCards(next.map((card) => card.id));
        if (!result.ok) {
          setOrder(previous);
          setError(result.message || "That order could not be saved.");
        }
      } catch (caught) {
        setOrder(previous);
        setError(
          caught instanceof Error ? caught.message : "That order could not be saved."
        );
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl text-panel-text">Panels</h2>
          <p className="mt-1 font-body text-xs text-panel-faint">
            They scroll past in this order, left to right, between the intro panel and
            the end cap.
            {pending && <span className="ml-2">Saving…</span>}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDialog({ card: null })}
          className={buttonClass("primary")}
        >
          Add panel
        </button>
      </div>

      {error && (
        <div className="flex items-start justify-between gap-4 border border-danger-line bg-danger-soft px-4 py-3">
          <p className="font-body text-sm text-danger">{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            className="shrink-0 font-body text-xs uppercase tracking-[0.16em] text-danger/70 hover:text-danger"
          >
            Dismiss
          </button>
        </div>
      )}

      {order.length > 0 && publishedCount === 0 && (
        <p className="border border-warning-line bg-warning-soft px-4 py-3 font-body text-sm text-panel-muted">
          None of these panels are published, so the rail has nothing to scroll
          through. Publish at least one, or switch the whole section off above.
        </p>
      )}

      {order.length === 0 ? (
        <EmptyState
          title="No panels yet"
          body="Add the first one — usually a cover panel for the flagship project, then supporting gallery images."
          action={
            <button
              type="button"
              onClick={() => setDialog({ card: null })}
              className={buttonClass("primary")}
            >
              Add panel
            </button>
          }
        />
      ) : (
        <ul className="space-y-2">
          {order.map((card, index) => {
            const link =
              card.href.trim() ||
              (card.project_slug.trim() ? `/projects/${card.project_slug.trim()}` : "");

            return (
              <li
                key={card.id}
                className="flex items-center gap-4 border border-panel-line bg-panel-raised p-3"
              >
                <span className="w-6 shrink-0 text-center font-body text-xs tabular-nums text-panel-faint">
                  {index + 1}
                </span>

                <div className="relative aspect-[4/5] w-14 shrink-0 overflow-hidden bg-panel-high">
                  {card.image && (
                    <Image
                      src={unsplash(card.image)}
                      alt=""
                      fill
                      sizes="3.5rem"
                      className="object-cover"
                    />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-body text-sm text-panel-text">
                      {card.title || card.caption || "Untitled panel"}
                    </p>
                    <Badge tone={card.kind === "cover" ? "accent" : "neutral"}>
                      {card.kind === "cover" ? "Cover" : "Gallery"}
                    </Badge>
                    {card.published ? (
                      <Badge tone="success">Published</Badge>
                    ) : (
                      <Badge tone="muted">Draft</Badge>
                    )}
                  </div>
                  <p className="mt-1 truncate font-body text-xs text-panel-faint">
                    {card.kind === "cover" && card.title && card.caption
                      ? `${card.caption} · `
                      : ""}
                    {link || "No link"}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    className={iconButtonClass}
                    onClick={() => move(index, -1)}
                    disabled={pending || index === 0}
                    aria-label={`Move ${card.title || card.caption || "panel"} earlier`}
                    title="Move earlier"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className={iconButtonClass}
                    onClick={() => move(index, 1)}
                    disabled={pending || index === order.length - 1}
                    aria-label={`Move ${card.title || card.caption || "panel"} later`}
                    title="Move later"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => setDialog({ card })}
                    className={buttonClass("secondary", "ml-2")}
                  >
                    Edit
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {dialog && (
        <CardDialog
          key={dialog.card?.id ?? "new"}
          card={dialog.card}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}
