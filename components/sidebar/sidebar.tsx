"use client";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  UserRound,
  Menu,
  X,
} from "lucide-react";
import { SidebarIcon } from "@/lib/sidebar/icons";
import { activeIds } from "@/lib/sidebar/engine";
import { appearanceFor, cssTokens } from "@/lib/sidebar/tokens";
import type { Config, Item, Section } from "@/lib/sidebar/schema";
import "./sidebar.css";

const mediaSubscribe = (callback: () => void) => {
  window.addEventListener("resize", callback);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", callback);
  return () => {
    window.removeEventListener("resize", callback);
    media.removeEventListener("change", callback);
  };
};
const viewport = () => window.innerWidth;
const darkSnapshot = () =>
  window.matchMedia("(prefers-color-scheme: dark)").matches;
type Props = {
  config: Config;
  path: string;
  preview?: boolean;
  mode?: "expanded" | "collapsed" | "tablet" | "mobile";
  onNavigate?: (path: string) => void;
  storageKey?: string;
};
export function Sidebar({
  config,
  path,
  preview = false,
  mode,
  onNavigate,
  storageKey = "reference",
}: Props) {
  const width = useSyncExternalStore(mediaSubscribe, viewport, () => 1440);
  const systemDark = useSyncExternalStore(
    mediaSubscribe,
    darkSnapshot,
    () => true,
  );
  const theme =
    config.behavior.themeMode === "system"
      ? systemDark
        ? "dark"
        : "light"
      : config.behavior.themeMode;
  const a = appearanceFor(config, theme);
  const b = config.behavior;
  const animations = config.animations;
  const reduced = useReducedMotion();
  const [expanded, setExpanded] = useState(
    mode === "collapsed"
      ? false
      : mode === "expanded"
        ? true
        : b.defaultExpanded,
  );
  const [hover, setHover] = useState(false);
  const [query, setQuery] = useState("");
  const [drawer, setDrawer] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStart = useRef(0);
  const mobile = mode === "mobile" || (!preview && width < b.mobileBreakpoint);
  const tablet =
    mode === "tablet" ||
    (!preview && width >= b.mobileBreakpoint && width < b.tabletBreakpoint);
  const overlay =
    mobile ||
    (!preview && b.layout === "overlay") ||
    (tablet && b.tablet === "overlay");

  const isExpanded = overlay
    ? true
    : hover || ((!tablet || b.tablet === "expanded") && expanded);
  useEffect(() => {
    if (!b.remember || preview) return;
    const saved = localStorage.getItem(`sidebar:${storageKey}`);
    if (saved !== null) {
      const frame = requestAnimationFrame(() => setExpanded(saved === "true"));
      return () => cancelAnimationFrame(frame);
    }
  }, [b.remember, preview, storageKey]);
  useEffect(() => {
    if (!overlay || !drawer) {
      if (dialog.current?.open) dialog.current.close();
      return;
    }
    dialog.current?.showModal();
  }, [drawer, overlay]);
  useEffect(
    () => () => {
      if (autoTimer.current) clearTimeout(autoTimer.current);
    },
    [],
  );
  const active = useMemo(
    () => activeIds(config.items, path),
    [config.items, path],
  );
  const toggle = () => {
    const value = !isExpanded;
    setExpanded(value);
    setHover(false);
    if (b.remember && !preview)
      localStorage.setItem(`sidebar:${storageKey}`, String(value));
  };
  const navigate = async (item: Item) => {
    if (!item.enabled) return;
    if (item.action === "logout") {
      if (preview) return;
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.assign(new URL("/login", window.location.origin).href);
      return;
    }
    onNavigate?.(item.url);
    if (overlay && b.closeOnSelect) setDrawer(false);
  };
  const visible = config.items.filter((i) => i.visible && !i.archived);
  const matches = (item: Item): boolean =>
    !query ||
    item.label.toLowerCase().includes(query.toLowerCase()) ||
    visible.some((child) => child.parentId === item.id && matches(child));
  const filtered = visible.filter(matches);
  const onKeys = (event: KeyboardEvent<HTMLElement>) => {
    if (
      !["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key) ||
      (event.target as HTMLElement).tagName === "INPUT"
    )
      return;
    const elements = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        "a[href],button:not([disabled]),input",
      ),
    ).filter((el) => el.getClientRects().length > 0 && !el.closest("[inert]"));
    const i = elements.indexOf(document.activeElement as HTMLElement);
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? elements.length - 1
          : (i + (event.key === "ArrowDown" ? 1 : -1) + elements.length) %
            elements.length;
    elements[next]?.focus();
    event.preventDefault();
  };
  const transition = reduced
    ? { duration: 0 }
    : animations.easing === "spring"
      ? {
          type: "spring" as const,
          stiffness: animations.stiffness,
          damping: animations.damping,
          mass: animations.mass,
        }
      : {
          duration:
            (isExpanded ? animations.openDuration : animations.closeDuration) /
            1000,
          ease:
            animations.easing === "ease"
              ? ("easeInOut" as const)
              : animations.easing === "ease-in"
                ? ("easeIn" as const)
                : animations.easing === "ease-out"
                  ? ("easeOut" as const)
                  : animations.easing === "ease-in-out"
                    ? ("easeInOut" as const)
                    : ("linear" as const),
        };
  const content = (
    <motion.aside
      aria-label={config.name}
      data-expanded={isExpanded}
      data-preview={preview}
      data-scrollbar={b.scrollbar}
      data-hover={animations.hoverAnimation}
      data-icon-animation={animations.iconAnimation}
      className={`dynamic-sidebar ${isExpanded ? "is-expanded" : "is-collapsed"} position-${b.position}`}
      style={
        {
          ...cssTokens(config, theme),
          fontFamily: a.fontFamily + ", Arial, sans-serif",
        } as CSSProperties
      }
      animate={{ width: overlay ? Math.min(a.expandedWidth,width-36) : isExpanded ? a.expandedWidth : a.collapsedWidth }}
      initial={false}
      transition={transition}
      onKeyDown={onKeys}
      onMouseEnter={() => {
        if (autoTimer.current) clearTimeout(autoTimer.current);
        if (b.desktop === "hover" || b.desktop === "auto") setHover(true);
      }}
      onMouseLeave={() => {
        if (b.desktop === "hover") setHover(false);
        if (b.desktop === "auto")
          autoTimer.current = setTimeout(() => {
            setHover(false);
            setExpanded(false);
          }, b.autoCollapseDelay);
      }}
    >
      <header
        className="sidebar-brand"
        style={{ height: a.headerHeight, textAlign: config.branding.alignment }}
      >
        {b.showWindowDots && (
          <div className="window-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
        )}
        <a
          href={preview ? "#" : config.branding.url || "#"}
          className="brand-link"
          onClick={(e) => {
            if (preview) e.preventDefault();
          }}
          style={{
            justifyContent:
              config.branding.alignment === "center" ? "center" : undefined,
          }}
        >
          {(
            isExpanded
              ? config.branding.logo
              : config.branding.compactLogo || config.branding.logo
          ) ? (
            <img
              src={
                isExpanded
                  ? config.branding.logo
                  : config.branding.compactLogo || config.branding.logo
              }
              width={config.branding.logoSize}
              height={config.branding.logoSize}
              alt=""
            />
          ) : (
            !isExpanded && <strong>{config.branding.name.charAt(0)}</strong>
          )}
          {config.branding.showName && (
            <span className="sidebar-label">
              <strong>{config.branding.name}</strong>
              {config.branding.subtitle && (
                <small>{config.branding.subtitle}</small>
              )}
            </span>
          )}
        </a>
        {b.showNotifications && isExpanded && (
          <button
            className="notification-button"
            aria-label="Open notifications"
            onClick={() => onNavigate?.("/app/notifications")}
          >
            <Bell size={15} />
            <i />
          </button>
        )}
        <button
          className="collapse-button"
          aria-label={
            overlay
              ? "Close navigation"
              : isExpanded
                ? "Collapse sidebar"
                : "Expand sidebar"
          }
          aria-expanded={isExpanded}
          onClick={() => (overlay ? setDrawer(false) : toggle())}
        >
          {overlay ? (
            <X size={12} />
          ) : isExpanded ? (
            <ChevronLeft size={12} />
          ) : (
            <ChevronRight size={12} />
          )}
        </button>
      </header>
      {b.showProfile && (
        <div className="sidebar-profile">
          <span className="profile-avatar">
            {config.branding.profileImage ? (
              <img src={config.branding.profileImage} alt="" />
            ) : (
              <UserRound size={19} />
            )}
          </span>
          <span className="sidebar-label">
            <strong>{config.branding.profileName}</strong>
            <small>{config.branding.profileSubtitle}</small>
          </span>
          <ChevronRight className="sidebar-label profile-chevron" size={13} />
        </div>
      )}
      {b.showSearch && (
        <label className="sidebar-search">
          <Search size={13} />
          <input
            aria-label="Search navigation"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="SEARCH"
            tabIndex={isExpanded ? 0 : -1}
          />
        </label>
      )}
      <nav aria-label="Main navigation" className="sidebar-nav">
        {config.sections
          .filter((s) => s.enabled && !s.footer)
          .sort((x, y) => x.order - y.order)
          .map((section) => (
            <SectionView
              key={section.id}
              section={section}
              items={filtered}
              expanded={isExpanded}
              active={active}
              navigate={navigate}
              preview={preview}
              behavior={b}
            />
          ))}
        {query && !filtered.length && isExpanded && (
          <p className="sidebar-empty">No matching items</p>
        )}
      </nav>
      <footer className="sidebar-footer">
        {config.sections
          .filter((s) => s.enabled && s.footer)
          .sort((x, y) => x.order - y.order)
          .map((section) => (
            <SectionView
              key={section.id}
              section={section}
              items={filtered}
              expanded={isExpanded}
              active={active}
              navigate={navigate}
              preview={preview}
              behavior={b}
            />
          ))}
      </footer>
    </motion.aside>
  );
  if (overlay)
    return (
      <div className="drawer-host" style={cssTokens(config, theme)}>
        <button
          className="drawer-trigger"
          onClick={() => setDrawer(true)}
          aria-label="Open navigation"
        >
          <Menu size={20} /> Navigation
        </button>
        <dialog
          ref={dialog}
          className={`sidebar-dialog ${b.position}`}
          onCancel={(e) => {
            if (!b.closeOnEscape) e.preventDefault();
            else setDrawer(false);
          }}
          onClose={() => setDrawer(false)}
          onClick={(e) => {
            if (e.target === e.currentTarget && b.closeOnOutside)
              setDrawer(false);
          }}
          onTouchStart={(e) => {
            touchStart.current = e.touches[0].clientX;
          }}
          onTouchEnd={(e) => {
            const diff = e.changedTouches[0].clientX - touchStart.current;
            if (
              (b.position === "left" && diff < -70) ||
              (b.position === "right" && diff > 70)
            )
              setDrawer(false);
          }}
        >
          {content}
        </dialog>
      </div>
    );
  return (
    <div
      className={`sidebar-host layout-${preview ? "preview" : b.layout} position-${b.position}`}
      style={{
        ...cssTokens(config, theme),
        width: isExpanded ? a.expandedWidth : a.collapsedWidth,
        transition: reduced
          ? "none"
          : `width ${isExpanded ? animations.openDuration : animations.closeDuration}ms`,
      }}
    >
      {content}
    </div>
  );
}
function SectionView({
  section,
  items,
  expanded,
  active,
  navigate,
  preview,
  behavior,
}: {
  section: Section;
  items: Item[];
  expanded: boolean;
  active: Set<string>;
  navigate: (i: Item) => Promise<void>;
  preview: boolean;
  behavior: Config["behavior"];
}) {
  const [open, setOpen] = useState(section.defaultExpanded);
  const [single, setSingle] = useState<string | null>(null);
  const forced = items.some(
    (i) => i.sectionId === section.id && active.has(i.id),
  );
  return (
    <section className="sidebar-section">
      <div className="section-heading">
        {!section.hideLabel &&
          (section.collapsible ? (
            <button
              onClick={() => setOpen(!open)}
              aria-expanded={open || forced}
            >
              <span className="sidebar-label">{section.label}</span>
              {expanded && <ChevronDown size={10} />}
            </button>
          ) : (
            <span className="sidebar-label">{section.label}</span>
          ))}
      </div>
      {(!section.collapsible || open || forced) && (
        <ul>
          {items
            .filter((i) => i.sectionId === section.id && !i.parentId)
            .sort((a, b) => a.order - b.order)
            .map((item) => (
              <ItemView
                key={item.id}
                item={item}
                items={items}
                active={active}
                expanded={expanded}
                depth={0}
                navigate={navigate}
                preview={preview}
                single={single}
                setSingle={setSingle}
                behavior={behavior}
              />
            ))}
        </ul>
      )}
    </section>
  );
}
function ItemView({
  item,
  items,
  active,
  expanded,
  depth,
  navigate,
  preview,
  single,
  setSingle,
  behavior,
}: {
  item: Item;
  items: Item[];
  active: Set<string>;
  expanded: boolean;
  depth: number;
  navigate: (i: Item) => Promise<void>;
  preview: boolean;
  single: string | null;
  setSingle: (id: string | null) => void;
  behavior: Config["behavior"];
}) {
  const children = items
    .filter((i) => i.parentId === item.id)
    .sort((a, b) => a.order - b.order);
  const [open, setOpen] = useState(false);
  const isActive = active.has(item.id);
  const isOpen =
    (behavior.submenu === "single" ? single === item.id : open) ||
    children.some((i) => active.has(i.id));
  const row = (
    <>
      <span className="sidebar-icon">
        <SidebarIcon name={item.icon} />
      </span>
      <span className="sidebar-label item-label">{item.label}</span>
      {item.badge && (
        <span className="sidebar-badge" style={{ background: item.badgeColor }}>
          {item.badge}
        </span>
      )}
      {children.length > 0 && expanded && (
        <ChevronDown
          size={12}
          className={`submenu-chevron ${isOpen ? "open" : ""}`}
        />
      )}
    </>
  );
  return (
    <li
      className={`sidebar-item ${isActive ? "active" : ""} ${item.className}`}
      style={{ "--depth": depth } as CSSProperties}
    >
      {children.length || item.action === "logout" || !item.enabled ? (
        <button
          className="sidebar-row"
          disabled={!item.enabled}
          aria-label={item.tooltip || item.label}
          aria-expanded={children.length ? isOpen : undefined}
          onClick={() => {
            if (children.length) {
              setOpen(!isOpen);
              setSingle(isOpen ? null : item.id);
            } else void navigate(item);
          }}
        >
          {row}
        </button>
      ) : (
        <a
          className="sidebar-row"
          href={item.url || "#"}
          target={item.newTab ? "_blank" : undefined}
          rel={item.newTab ? "noopener noreferrer" : undefined}
          aria-label={item.tooltip || item.label}
          aria-current={isActive ? "page" : undefined}
          onClick={(e) => {
            if (preview) {
              e.preventDefault();
            }
            void navigate(item);
          }}
        >
          {row}
        </a>
      )}
      {!expanded && (
        <span role="tooltip" className="sidebar-tooltip">
          {item.tooltip || item.label}
        </span>
      )}
      {children.length > 0 && (
        <div
          className="submenu"
          data-open={isOpen}
          aria-hidden={!isOpen}
          inert={!isOpen}
        >
          <ul>
            {children.map((child) => (
              <ItemView
                key={child.id}
                item={child}
                items={items}
                active={active}
                expanded={expanded}
                depth={depth + 1}
                navigate={navigate}
                preview={preview}
                single={single}
                setSingle={setSingle}
                behavior={behavior}
              />
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}
