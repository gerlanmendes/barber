import { useEffect, useState } from "react";
import { Scissors } from "lucide-react";

type Props = {
  url: string | null;
  name: string;
  size?: number;
  className?: string;
};

/** Logo da barbearia com fallback: se a URL falhar, mostra o ícone da tesoura. */
export function ShopLogo({ url, name, size = 48, className = "" }: Props) {
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
  }, [url]);

  const box = { width: size, height: size };

  if (!url || broken) {
    return (
      <span
        style={box}
        className={`flex shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary ${className}`}
        aria-hidden="true"
      >
        <Scissors style={{ width: size * 0.5, height: size * 0.5 }} />
      </span>
    );
  }

  return (
    <img
      src={url}
      alt={`Logo ${name}`}
      width={size}
      height={size}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
      style={box}
      className={`shrink-0 rounded-full object-cover ${className}`}
    />
  );
}
