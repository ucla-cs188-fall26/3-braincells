import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import {
  ConnectionMode,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Viewport,
  type XYPosition,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { checkPlan } from "../lib/api";
import {
  cleanIssues,
  loadPlanCheck,
  removeIssuesForBoxes,
  savePlanCheck,
  type PlanCheck,
} from "../lib/planCheck";
import { DEFAULT_PLAN_ID, loadPlan, savePlan } from "../lib/planStorage";
import {
  addRule,
  deleteRule,
  removeRulesForBoxes,
  rulesForBox,
  updateRule,
  type Rule,
} from "../lib/rules";
import { suggestionsToElements } from "../lib/suggestions";
import BlockNode, { type BlockNodeType } from "./BlockNode";
import CanvasEmptyState from "./CanvasEmptyState";
import CanvasToolbar from "./CanvasToolbar";
import LabeledEdge, { type LabeledEdgeType } from "./LabeledEdge";
import RuleContextMenu from "./RuleContextMenu";
import RulesCard from "./RulesCard";
import { RulesContext } from "./RulesContext";

const nodeTypes = { block: BlockNode };
const edgeTypes = { labeled: LabeledEdge };

const EDGE_COLOR = "var(--color-edge)";
const SELECTED_EDGE_COLOR = "var(--color-brand)";
const defaultEdgeOptions = {
  type: "labeled",
  markerEnd: { type: MarkerType.ArrowClosed, color: EDGE_COLOR },
  style: { strokeWidth: 2, stroke: EDGE_COLOR },
};

const SAVE_DELAY_MS = 400;

function Canvas({ planId }: { planId: string }) {
  // Read storage once, on first render.
  const [saved] = useState(() => loadPlan(planId));
  const [nodes, setNodes, onNodesChange] = useNodesState<BlockNodeType>(
    saved?.nodes ?? [],
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<LabeledEdgeType>(
    saved?.edges ?? [],
  );
  // Rules sit next to nodes and edges as part of the plan; they are not stored in node data.
  const [rules, setRules] = useState<Rule[]>(saved?.rules ?? []);
  // The open rules card (one at a time) and where it sits on screen; local UI state, not saved.
  const [ruleCard, setRuleCard] = useState<{
    boxId: string;
    centerX: number;
    top: number;
  } | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    boxId: string;
    x: number;
    y: number;
  } | null>(null);
  // The latest AI check (summary and issues), saved separately from the plan itself.
  const [planCheck, setPlanCheck] = useState<PlanCheck | null>(() =>
    loadPlanCheck(planId, new Set(saved?.nodes.map((node) => node.id))),
  );
  useEffect(() => savePlanCheck(planId, planCheck), [planId, planCheck]);
  const { screenToFlowPosition, getNodes } = useReactFlow();
  const viewportRef = useRef<Viewport>(
    saved?.viewport ?? { x: 0, y: 0, zoom: 1 },
  );

  // Autosave shortly after the last change, so a drag doesn't write on every pixel.
  const save = useCallback(
    () =>
      savePlan(planId, { nodes, edges, rules, viewport: viewportRef.current }),
    [planId, nodes, edges, rules],
  );
  useEffect(() => {
    const timer = setTimeout(save, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [save]);

  const handleMoveEnd = (_event: unknown, viewport: Viewport) => {
    viewportRef.current = viewport;
    save();
  };

  // Selected edges turn blue; every other edge gets the grey look back explicitly.
  const displayedEdges = useMemo(
    () =>
      edges.map((edge) => {
        const color = edge.selected ? SELECTED_EDGE_COLOR : EDGE_COLOR;
        return {
          ...edge,
          markerEnd: { type: MarkerType.ArrowClosed, color },
          style: { strokeWidth: 2, stroke: color },
        };
      }),
    [edges],
  );

  const addNodeAt = (position: XYPosition) => {
    setNodes((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        type: "block",
        position,
        origin: [0.5, 0.5], // position the node by its center
        // Approximate size so the node is visible (and can take focus) before React Flow measures it
        initialWidth: 128,
        initialHeight: 24,
        data: { title: "", description: "", editing: true },
      },
    ]);
  };

  const addNodeAtCursor = (event: MouseEvent) => {
    addNodeAt(screenToFlowPosition({ x: event.clientX, y: event.clientY }));
  };

  // "+ Box" drops a box in the middle of what is visible, nudged down past any box already there.
  const frameRef = useRef<HTMLDivElement>(null);
  const addNodeInView = () => {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect) return;
    const center = screenToFlowPosition({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
    let y = center.y;
    while (
      nodes.some(
        (node) => node.position.x === center.x && node.position.y === y,
      )
    )
      y += 48;
    addNodeAt({ x: center.x, y });
  };

  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);

  // Saves right away first, so the AI sees the latest edits rather than the last autosave.
  // The AI's suggestions are added as boxes (with arrows) marked "suggested"; suggestions from an
  // earlier check that weren't kept are replaced.
  const checkWithAI = async () => {
    save();
    setChecking(true);
    setCheckError(null);
    try {
      const review = await checkPlan(planId);
      // Read the boxes now, not from before the request: the user may have edited while waiting.
      const current = getNodes() as BlockNodeType[];
      const kept = current.filter((node) => !node.data.suggested);
      const replaced = new Set(
        current.filter((node) => node.data.suggested).map((node) => node.id),
      );
      const added = suggestionsToElements(review.suggestions, kept);

      setNodes([...kept, ...added.nodes]);
      setEdges((existing) => [
        ...existing.filter(
          (edge) => !replaced.has(edge.source) && !replaced.has(edge.target),
        ),
        ...added.edges,
      ]);
      setRules((existing) => removeRulesForBoxes(existing, [...replaced]));
      setRuleCard((card) => (card && replaced.has(card.boxId) ? null : card));
      setPlanCheck({
        checkedAt: Date.now(),
        summary: review.summary,
        issues: cleanIssues(review.issues, new Set(kept.map((node) => node.id))),
      });
    } catch (err) {
      setCheckError(
        err instanceof Error ? err.message : "Something went wrong.",
      );
    } finally {
      setChecking(false);
    }
  };

  // Deleting a box (toolbar button or keyboard) also deletes its rules and the issues about it.
  const handleNodesDelete = (deleted: BlockNodeType[]) => {
    setPlanCheck((check) =>
      check
        ? removeIssuesForBoxes(
            check,
            deleted.map((node) => node.id),
          )
        : check,
    );
    setRuleCard((current) =>
      current && deleted.some((node) => node.id === current.boxId)
        ? null
        : current,
    );
    setRules((current) =>
      removeRulesForBoxes(
        current,
        deleted.map((node) => node.id),
      ),
    );
  };

  // The card opens just below the box, centered on it, from the box's on-screen rect.
  const openRuleCard = useCallback((boxId: string) => {
    const element = frameRef.current?.querySelector(
      `.react-flow__node[data-id="${CSS.escape(boxId)}"]`,
    );
    const rect = element?.getBoundingClientRect();
    if (!rect) return;
    setContextMenu(null);
    setRuleCard({
      boxId,
      centerX: rect.left + rect.width / 2,
      top: rect.bottom + 8,
    });
  }, []);

  const closeRuleCard = useCallback(
    ({ restoreFocus }: { restoreFocus: boolean }) => {
      const boxId = ruleCard?.boxId;
      setRuleCard(null);
      if (!restoreFocus || !boxId) return;
      requestAnimationFrame(() =>
        frameRef.current
          ?.querySelector<HTMLElement>(
            `[data-rules-corner="${CSS.escape(boxId)}"]`,
          )
          ?.focus(),
      );
    },
    [ruleCard?.boxId],
  );

  const toggleRuleCard = (boxId: string) => {
    if (ruleCard?.boxId === boxId) closeRuleCard({ restoreFocus: false });
    else openRuleCard(boxId);
  };

  const deleteRuleFromCard = (ruleId: string) => {
    if (!ruleCard) return;
    const remaining = deleteRule(rules, ruleId);
    setRules(remaining);
    // Deleting a box's last rule removes its corner, so the card closes with it.
    if (rulesForBox(remaining, ruleCard.boxId).length === 0) setRuleCard(null);
  };

  // "+ Rule" lists the boxes that already have a name, so the user picks which one the rule is for.
  const namedBoxes = nodes
    .filter((node) => node.data.title.trim() !== "")
    .map((node) => ({ id: node.id, name: node.data.title }));

  // A new edge opens its description field right away, like a new block does.
  const connect = (connection: Connection) => {
    const edge: LabeledEdgeType = {
      ...connection,
      id: crypto.randomUUID(),
      data: { label: "", editing: true },
    };
    setEdges((current) => addEdge(edge, current));
  };

  return (
    <div className="size-full">
      <div
        ref={frameRef}
        className="bg-dot-grid relative size-full overflow-hidden rounded-xl border border-gray-200"
      >
        <CanvasToolbar
          boxes={namedBoxes}
          onPickRuleBox={openRuleCard}
          onAddBox={addNodeInView}
          onCheck={checkWithAI}
          checking={checking}
          checkError={checkError}
        />

        <RulesContext.Provider value={{ rules, openRuleCard, toggleRuleCard }}>
          <ReactFlow
            nodes={nodes}
            edges={displayedEdges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            connectionMode={ConnectionMode.Loose} // every handle can start or end a connection
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={connect}
            onNodesDelete={handleNodesDelete}
            onPaneClick={addNodeAtCursor}
            defaultViewport={saved?.viewport}
            onMoveEnd={handleMoveEnd}
            // Panning, zooming or dragging a box would leave the card or menu behind, so close them.
            onMoveStart={() => {
              setRuleCard(null);
              setContextMenu(null);
            }}
            onNodeDragStart={() => setRuleCard(null)}
            onNodeContextMenu={(event, node) => {
              event.preventDefault();
              if (node.data.title.trim() === "") return;
              setRuleCard(null);
              setContextMenu({
                boxId: node.id,
                x: event.clientX,
                y: event.clientY,
              });
            }}
          />
        </RulesContext.Provider>

        {contextMenu && (
          <RuleContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onAddRule={() => openRuleCard(contextMenu.boxId)}
            onClose={() => setContextMenu(null)}
          />
        )}

        {ruleCard && (
          <RulesCard
            key={ruleCard.boxId}
            boxName={
              nodes.find((node) => node.id === ruleCard.boxId)?.data.title ?? ""
            }
            rules={rulesForBox(rules, ruleCard.boxId)}
            centerX={ruleCard.centerX}
            top={ruleCard.top}
            onAdd={(text) =>
              setRules((current) => addRule(current, ruleCard.boxId, text))
            }
            onUpdate={(ruleId, text) =>
              setRules((current) => updateRule(current, ruleId, text))
            }
            onDelete={deleteRuleFromCard}
            onClose={closeRuleCard}
          />
        )}

        {nodes.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <CanvasEmptyState />
          </div>
        )}
      </div>
    </div>
  );
}

export default function BlueprintCanvas({
  planId = DEFAULT_PLAN_ID,
}: {
  planId?: string;
}) {
  return (
    <ReactFlowProvider>
      <Canvas planId={planId} />
    </ReactFlowProvider>
  );
}
