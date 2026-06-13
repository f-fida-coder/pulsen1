import { useEffect, useState } from "react";
import { Brain, Radio, Shield } from "lucide-react";

interface Props {
  confidence?: number;
}

export default function AIStatusLayer({ confidence = 94 }: Props) {
  const [displayConf, setDisplayConf] = useState(0);

  useEffect(() => {
    let frame = 0;
    const target = confidence;
    const duration = 40;
    const timer = setInterval(() => {
      frame++;
      const progress = Math.min(frame / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayConf(Math.round(eased * target));
      if (frame >= duration) clearInterval(timer);
    }, 25);
    return () => clearInterval(timer);
  }, [confidence]);

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* LIVE indicator */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25/60">
        <span className="relative flex h-2.5 w-2.5">
          <span className="care-pulse absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
        </span>
        <span className="text-xs font-semibold text-emerald-400 tracking-wide uppercase">Live</span>
      </div>

      {/* AI ACTIVE */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#C4A84C]/20 bg-gradient-to-r from-[#C4A84C]/5 to-[#D4B85C]/8">
        <Brain className="w-3.5 h-3.5 text-[#C4A84C]" />
        <span className="text-xs font-semibold care-gold-text tracking-wide uppercase">AI Active</span>
      </div>

      {/* Confidence */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary border border-border/60">
        <Shield className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">
          Confidence: <span className="font-bold text-foreground">{displayConf}%</span>
        </span>
      </div>

      {/* System status */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/25/60">
        <Radio className="w-3.5 h-3.5 text-sky-500" />
        <span className="text-xs font-medium text-sky-400">Alla system OK</span>
      </div>
    </div>
  );
}
