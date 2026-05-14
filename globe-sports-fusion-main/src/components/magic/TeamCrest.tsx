import { useState } from "react";

interface TeamCrestProps {
  src?: string;
  name: string;
  size?: number;
  noBorder?: boolean;
}

/**
 * Football club crest with graceful fallback to initials medallion.
 */
export const TeamCrest = ({ src, name, size = 28 }: TeamCrestProps) => {
  const [errored, setErrored] = useState(false);
  const px = `${size}px`;

  if (!src || errored) {
    return (
      <div
        className="flex items-center justify-center shrink-0"
        style={{ width: px, height: px }}
        aria-label={name}
      >
        <span className="text-[10px] font-black text-white/20 uppercase tracking-tighter">
          {name.substring(0, 2)}
        </span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-center shrink-0"
      style={{ width: px, height: px }}
    >
      <img
        src={src}
        alt={name}
        loading="lazy"
        onError={() => setErrored(true)}
        className="w-full h-full object-contain select-none"
        referrerPolicy="no-referrer"
      />
    </div>
  );
};

interface CountryFlagProps {
  code?: string;
  src?: string;
  size?: number;
}

/**
 * Country flag fetched from flagcdn.com (free, no auth).
 * Pass ISO 3166-1 alpha-2 code lowercase. Falls back to nothing.
 */
export const CountryFlag = ({ code, src, size = 14 }: CountryFlagProps) => {
  const [errored, setErrored] = useState(false);
  if ((!code && !src) || errored) return null;
  const url = src || `https://flagcdn.com/w40/${code!.toLowerCase()}.png`;
  return (
    <img
      src={url}
      alt={code || "Pays"}
      loading="lazy"
      onError={() => setErrored(true)}
      className="inline-block rounded-sm shrink-0"
      style={{
        width: size,
        height: size * 0.7,
        objectFit: "cover",
        boxShadow: "0 0 4px oklch(from var(--primary) l c h / 0.5)",
      }}
    />
  );
};

interface TeamKitProps {
  src?: string;
  name: string;
  size?: number;
}

/**
 * Jersey / kit visual for a club. Falls back to a stylized shirt silhouette
 * when no kit image is available.
 */
export const TeamKit = ({ src, name, size = 64 }: TeamKitProps) => {
  const [errored, setErrored] = useState(false);
  const px = `${size}px`;
  if (src && !errored) {
    return (
      <div
        className="flex items-center justify-center shrink-0"
        style={{ width: px, height: px }}
      >
        <img
          src={src}
          alt={`Maillot ${name}`}
          loading="lazy"
          onError={() => setErrored(true)}
          className="w-full h-full object-contain select-none"
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }
  return (
    <div
      className="flex items-center justify-center"
      style={{ width: px, height: px }}
      aria-label={`Maillot ${name}`}
    >
      <svg viewBox="0 0 64 64" width={size * 0.7} height={size * 0.7} className="text-white/20">
        <path
          fill="currentColor"
          d="M20 8l-12 6 4 12 8-3v33h28V23l8 3 4-12-12-6-6 4a10 10 0 0 1-16 0z"
        />
      </svg>
    </div>
  );
};
