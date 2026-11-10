import React, { useEffect, useRef } from "react";
import { Button as TDSButton } from "@toss/tds-mobile";
export function Button({
  children,
  onClick,
  weak = false,
  disabled = false,
  loading = false,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  weak?: boolean;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}) {
  return (
    <TDSButton
      className={"aimi-button " + (weak ? "weak " : "") + className}
      variant={weak ? "weak" : "fill"}
      size="xlarge"
      display="block"
      onClick={onClick}
      disabled={disabled}
      loading={loading}
    >
      {children}
    </TDSButton>
  );
}
export function Asset({
  id,
  size = 80,
  className = "",
}: {
  id: string;
  size?: number;
  className?: string;
}) {
  return (
    <img
      src={"/content/" + id + ".svg"}
      alt=""
      width={size}
      height={size}
      className={"asset " + className}
    />
  );
}
export function ChallengeArt({
  src,
  className = "",
}: {
  src: string;
  className?: string;
}) {
  return src.includes(".svg#") ? (
    <svg
      className={"challenge-art " + className}
      viewBox="0 0 330 145"
      role="img"
      aria-label="챌린지 예시 이미지"
    >
      <use href={src} />
    </svg>
  ) : (
    <img
      src={src}
      className={"challenge-art " + className}
      alt="챌린지 예시 이미지"
    />
  );
}
export function Icon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    more: <><circle cx="5" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="19" cy="12" r="1.5" fill="currentColor"/></>,
    home: <path d="m3 10 9-7 9 7v10h-6v-7H9v7H3Z" />,
    mission: (
      <>
        <rect x="6" y="4" width="13" height="17" rx="3" />
        <path d="M9 4V2h7v2m-6 8 2 2 4-5" />
      </>
    ),
    garden: (
      <>
        <path d="M12 21V11M12 15C5 15 3 10 4 7c6-1 9 2 8 8ZM12 11c0-6 3-8 8-7 1 4-2 8-8 7Z" />
      </>
    ),
    social: (
      <>
        <circle cx="9" cy="7" r="3" />
        <circle cx="18" cy="8" r="2.5" />
        <path d="M2 21v-4a7 7 0 0 1 14 0v4m1-8c4 0 6 2 6 6" />
      </>
    ),
    edit: <path d="m5 16 11-11 3 3L8 19H4v-4M14 7l3 3" />,
    copy: (
      <>
        <rect x="8" y="8" width="12" height="13" rx="2" />
        <path d="M15 8V3H3v13h5" />
      </>
    ),
    close: <path d="m6 6 12 12M18 6 6 18" />,
    down: <path d="m5 9 7 7 7-7" />,
    back: <path d="m15 5-7 7 7 7" />,
    pause: <path d="M8 5v14M16 5v14" />,
  };
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] ?? <path d="m9 5 7 7-7 7" />}
    </svg>
  );
}
export function Modal({
  title,
  children,
  onClose,
  sheet = false,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  sheet?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    ref.current?.showModal();
    return () => {
      ref.current?.close();
      before?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={"overlay " + (sheet ? "sheet" : "") + " " + className}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dialog-heading">
        <h2>{title}</h2>
        <button className="icon-button" aria-label="닫기" onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>
      <div className="dialog-body">{children}</div>
    </dialog>
  );
}
export function Stats({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <div className="stats">
      {rows.map(([label, value]) => (
        <div className="stat" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}
export function Notice({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="notice">
      <strong>{title}</strong>
      {children && <p>{children}</p>}
    </div>
  );
}
