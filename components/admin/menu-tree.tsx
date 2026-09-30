"use client";
import { useState } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  useDroppable,
  type DragEndEvent,
  type KeyboardCoordinateGetter,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Plus,
  ChevronDown,
  EyeOff,
  Archive,
  FolderPlus,
} from "lucide-react";
import type { Config, Item, Section } from "@/lib/sidebar/schema";
import { moveItem } from "@/lib/sidebar/engine";
import { newItem } from "@/lib/sidebar/defaults";
import { SidebarIcon } from "@/lib/sidebar/icons";

export function MenuTree({
  config,
  onChange,
  selected,
  onSelect,
  onError,
}: {
  config: Config;
  onChange: (c: Config) => void;
  selected: string | null;
  onSelect: (id: string) => void;
  onError: (s: string) => void;
}) {
  const keyboardCoordinates: KeyboardCoordinateGetter = (event, args) => {
    if (!["ArrowUp", "ArrowDown"].includes(event.code)) return;
    event.preventDefault();
    const { active, over, collisionRect, droppableRects } = args.context;
    if (!active || !collisionRect) return;
    const source = config.items.find((i) => i.id === active.id);
    const ids = String(active.id).startsWith("section:")
      ? config.sections
          .toSorted((a, b) => a.order - b.order)
          .map((s) => "section:" + s.id)
      : config.items
          .filter(
            (i) =>
              i.parentId === source?.parentId &&
              i.sectionId === source?.sectionId,
          )
          .toSorted((a, b) => a.order - b.order)
          .map((i) => i.id);
    const index = ids.indexOf(String(over?.id ?? active.id));
    const next = ids[index + (event.code === "ArrowDown" ? 1 : -1)];
    const target = next ? droppableRects.get(next) : undefined;
    if (target)
      return {
        x: args.currentCoordinates.x + target.left - collisionRect.left,
        y: args.currentCoordinates.y + target.top - collisionRect.top,
      };
  };
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: keyboardCoordinates,
    }),
  );
  const [archive, setArchive] = useState(false);
  const [dragging, setDragging] = useState(false);
  const ordered = config.sections.toSorted((a, b) => a.order - b.order);
  const drop = (event: DragEndEvent) => {
    setDragging(false);
    if (!event.over || event.active.id === event.over.id) return;
    try {
      const id = String(event.active.id),
        target = String(event.over.id);
      if (id.startsWith("section:")) {
        if (!target.startsWith("section:")) return;
        const next = arrayMove(
          ordered,
          ordered.findIndex((s) => "section:" + s.id === id),
          ordered.findIndex((s) => "section:" + s.id === target),
        );
        onChange({
          ...config,
          sections: next.map((s, order) => ({ ...s, order })),
        });
        return;
      }
      const item = config.items.find((i) => i.id === id);
      if (!item) return;
      if (target.startsWith("root:"))
        onChange(
          moveItem(config, id, target.slice(5), null, config.items.length),
        );
      else if (target.startsWith("inside:")) {
        const parent = config.items.find((i) => i.id === target.slice(7))!;
        onChange(
          moveItem(
            config,
            id,
            parent.sectionId,
            parent.id,
            config.items.length,
          ),
        );
      } else {
        const over = config.items.find((i) => i.id === target);
        if (over) {
          const siblings = config.items
            .filter(
              (i) =>
                i.sectionId === over.sectionId && i.parentId === over.parentId,
            )
            .toSorted((a, b) => a.order - b.order);
          onChange(
            moveItem(
              config,
              id,
              over.sectionId,
              over.parentId,
              siblings.findIndex((i) => i.id === over.id),
            ),
          );
        }
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : "Cannot move this item");
    }
  };
  const add = (sectionId: string) => {
    const item = newItem(sectionId);
    item.order = config.items.length;
    onChange({ ...config, items: [...config.items, item] });
    onSelect(item.id);
  };
  return (
    <div className="tree-panel">
      <div className="panel-heading">
        <div>
          <h2>Menu structure</h2>
          <p>Build a place for everything.</p>
        </div>
        <button
          className="icon-button"
          title="Show archived items"
          aria-label="Show archived items"
          aria-pressed={archive}
          onClick={() => setArchive(!archive)}
        >
          <Archive size={16} />
        </button>
      </div>
      <div className="tree-hint">
        Drag to reorder. Drop on “Nest inside” to create children.
      </div>
      <DndContext
        id="menu-builder"
        sensors={sensors}
        collisionDetection={(args) =>
          closestCenter({
            ...args,
            droppableContainers: args.droppableContainers.filter((c) =>
              String(args.active.id).startsWith("section:")
                ? String(c.id).startsWith("section:")
                : !String(c.id).startsWith("section:"),
            ),
          })
        }
        onDragStart={(event) =>
          setDragging(
            event.activatorEvent.type.startsWith("pointer") &&
              !String(event.active.id).startsWith("section:"),
          )
        }
        onDragCancel={() => setDragging(false)}
        onDragEnd={drop}
      >
        <SortableContext
          items={ordered.map((s) => "section:" + s.id)}
          strategy={verticalListSortingStrategy}
        >
          {ordered.map((section) => (
            <TreeSection
              key={section.id}
              section={section}
              config={config}
              selected={selected}
              onSelect={onSelect}
              add={add}
              showArchived={archive}
              dragging={dragging}
            />
          ))}
        </SortableContext>
      </DndContext>
      <button
        className="add-section"
        onClick={() => {
          const id = crypto.randomUUID();
          onChange({
            ...config,
            sections: [
              ...config.sections,
              {
                id,
                name: "new-section",
                label: "New section",
                order: config.sections.length,
                hideLabel: false,
                enabled: true,
                collapsible: false,
                defaultExpanded: true,
                footer: false,
                roles: [],
              },
            ],
          });
          onSelect("section:" + id);
        }}
      >
        <FolderPlus size={16} /> Add section
      </button>
      <div className="tree-bottom">
        <span>{config.items.filter((i) => !i.archived).length} items</span>
        <span>{config.sections.length} sections</span>
        <span>8 levels deep</span>
      </div>
    </div>
  );
}
function TreeSection({
  section,
  config,
  selected,
  onSelect,
  add,
  showArchived,
  dragging,
}: {
  section: Section;
  config: Config;
  selected: string | null;
  onSelect: (id: string) => void;
  add: (s: string) => void;
  showArchived: boolean;
  dragging: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: "section:" + section.id });
  const items = config.items.filter(
    (i) => i.sectionId === section.id && (showArchived || !i.archived),
  );
  return (
    <div
      ref={setNodeRef}
      className="tree-section"
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <div
        className={`tree-section-title ${selected === "section:" + section.id ? "selected" : ""}`}
      >
        <button
          className="drag-handle"
          aria-label={`Move section ${section.label}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical size={13} />
        </button>
        <button onClick={() => onSelect("section:" + section.id)}>
          {section.label}
          <span>{section.footer ? "FOOTER" : items.length}</span>
        </button>
        <button
          className="icon-button"
          aria-label={`Add item to ${section.label}`}
          onClick={() => add(section.id)}
        >
          <Plus size={14} />
        </button>
      </div>
      <TreeLevel
        items={items}
        parentId={null}
        selected={selected}
        onSelect={onSelect}
        dragging={dragging}
        depth={0}
      />
      <DropTarget
        id={"root:" + section.id}
        label="Move to section root"
        visible={dragging}
      />
    </div>
  );
}
function TreeLevel({
  items,
  parentId,
  selected,
  onSelect,
  dragging,
  depth,
}: {
  items: Item[];
  parentId: string | null;
  selected: string | null;
  onSelect: (id: string) => void;
  dragging: boolean;
  depth: number;
}) {
  const rows = items
    .filter((i) => i.parentId === parentId)
    .toSorted((a, b) => a.order - b.order);
  return (
    <SortableContext
      items={rows.map((i) => i.id)}
      strategy={verticalListSortingStrategy}
    >
      <div>
        {rows.map((item) => (
          <TreeItem
            key={item.id}
            item={item}
            items={items}
            selected={selected}
            onSelect={onSelect}
            dragging={dragging}
            depth={depth}
          />
        ))}
      </div>
    </SortableContext>
  );
}
function TreeItem({
  item,
  items,
  selected,
  onSelect,
  dragging,
  depth,
}: {
  item: Item;
  items: Item[];
  selected: string | null;
  onSelect: (id: string) => void;
  dragging: boolean;
  depth: number;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.35 : 1,
      }}
    >
      <div
        className={`tree-item ${selected === item.id ? "selected" : ""} ${!item.visible || item.archived ? "dimmed" : ""}`}
        style={{ paddingLeft: 8 + depth * 13 }}
      >
        <button
          className="drag-handle"
          aria-label={`Move ${item.label}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical size={14} />
        </button>
        <button className="tree-item-select" onClick={() => onSelect(item.id)}>
          <SidebarIcon name={item.icon} size={16} />
          <span>{item.label}</span>
          {item.badge && <small>{item.badge}</small>}
          {!item.visible && <EyeOff size={12} />}
          <ChevronDown size={12} />
        </button>
      </div>
      <DropTarget
        id={"inside:" + item.id}
        label={`Nest inside ${item.label}`}
        visible={dragging}
      />
      <TreeLevel
        items={items}
        parentId={item.id}
        selected={selected}
        onSelect={onSelect}
        dragging={dragging}
        depth={depth + 1}
      />
    </div>
  );
}
function DropTarget({
  id,
  label,
  visible,
}: {
  id: string;
  label: string;
  visible: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled: !visible });
  return (
    <div
      ref={setNodeRef}
      className={`drop-target ${visible ? "visible" : ""} ${isOver ? "over" : ""}`}
    >
      {label}
    </div>
  );
}
