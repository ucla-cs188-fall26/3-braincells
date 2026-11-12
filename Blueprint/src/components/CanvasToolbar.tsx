import { useCallback, useState } from "react";
import RuleBoxMenu from "./RuleBoxMenu";

type CanvasToolbarProps = {
  boxes: { id: string; name: string }[]; // the named boxes a rule can be added to
  onAddBox: () => void;
  onPickRuleBox: (boxId: string) => void;
  onCheck: () => void;
  checking: boolean;
  checkError: string | null;
};

const BUTTON_STYLE =
  "rounded-lg border px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";
const PLAIN_BUTTON_STYLE = `${BUTTON_STYLE} border-gray-300 bg-white text-ink hover:bg-gray-50`;

// Checking the plan isn't built yet (the generate-code call moved to "Send plan to AI"); set to false when it is.
const CHECK_COMING_SOON = true;

// The floating container of actions that sits on top of the canvas.
export default function CanvasToolbar({
  boxes,
  onAddBox,
  onPickRuleBox,
  onCheck,
  checking,
  checkError,
}: CanvasToolbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const ruleDisabledReason = boxes.length === 0 ? "Add a box first" : null;

  const closeMenu = useCallback(
    ({ restoreFocus }: { restoreFocus: boolean }) => {
      setMenuOpen(false);
      if (restoreFocus)
        requestAnimationFrame(() =>
          document.querySelector<HTMLElement>("[data-rules-button]")?.focus(),
        );
    },
    [],
  );

  return (
    <div className="absolute left-3 top-3 z-10 flex items-center gap-3">
      <div
        role="toolbar"
        aria-label="Plan actions"
        className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg"
      >
        <button
          type="button"
          onClick={onAddBox}
          className={`${BUTTON_STYLE} border-gray-300 bg-white text-ink hover:border-brand hover:bg-blue-50`}
        >
          + Box
        </button>

        <div className="relative">
          {/* aria-disabled instead of disabled, so the button stays focusable and its tooltip still shows. */}
          <button
            type="button"
            data-rules-trigger
            data-rules-button
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-disabled={ruleDisabledReason !== null}
            title={ruleDisabledReason ?? undefined}
            onClick={
              ruleDisabledReason === null
                ? () => setMenuOpen((open) => !open)
                : undefined
            }
            className={`${BUTTON_STYLE} border-gray-300 bg-white text-ink ${
              ruleDisabledReason === null
                ? "hover:border-[#C9A84C] hover:bg-[#FFF3C9] hover:text-[#6B4A00]"
                : "cursor-not-allowed opacity-50"
            }`}
          >
            + Rule
          </button>

          {menuOpen && (
            <RuleBoxMenu
              boxes={boxes}
              onPick={(boxId) => {
                setMenuOpen(false);
                onPickRuleBox(boxId);
              }}
              onClose={closeMenu}
            />
          )}
        </div>

        <button
          type="button"
          onClick={CHECK_COMING_SOON ? undefined : onCheck}
          disabled={checking}
          // aria-disabled instead of disabled, so the button stays focusable and its tooltip still shows.
          aria-disabled={CHECK_COMING_SOON}
          title={CHECK_COMING_SOON ? "Plan checking is coming soon" : undefined}
          className={`${PLAIN_BUTTON_STYLE} disabled:cursor-wait disabled:opacity-60 ${CHECK_COMING_SOON ? "cursor-not-allowed opacity-60" : ""}`}
        >
          {checking ? "Sending…" : "Check with AI"}
        </button>
      </div>

      {checkError && (
        <span role="alert" className="text-sm text-red-600">
          {checkError}
        </span>
      )}
    </div>
  );
}
