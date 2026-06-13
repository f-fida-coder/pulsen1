import { useState } from "react";
import { Gift, Copy, Users, TrendingUp, Check } from "lucide-react";
import { toast } from "sonner";

export default function ReferralPanel() {
  const [copied, setCopied] = useState(false);
  const referralCode = "CARE-" + Math.random().toString(36).substring(2, 8).toUpperCase();

  // Simulated referral stats
  const stats = {
    invited: 3,
    active: 2,
    earned: 4500,
    target: 10,
  };

  function handleCopy() {
    navigator.clipboard.writeText(`https://solpulsen.se/care?ref=${referralCode}`);
    setCopied(true);
    toast.success("Referral-länk kopierad!");
    setTimeout(() => setCopied(false), 2000);
  }

  const progress = (stats.invited / stats.target) * 100;

  return (
    <div className="care-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/15 to-purple-500/15 flex items-center justify-center">
          <Gift className="w-4 h-4 text-violet-600" />
        </div>
        <div>
          <h3 className="text-base font-bold text-foreground">Referral Program</h3>
          <p className="text-xs text-muted-foreground">Bjud in och tjäna CARE-krediter</p>
        </div>
      </div>

      {/* Referral link */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 bg-secondary rounded-lg px-3 py-2.5 border border-border/60">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Din kod</div>
          <div className="text-sm font-mono font-bold text-[#C4A84C]">{referralCode}</div>
        </div>
        <button
          onClick={handleCopy}
          className="care-btn h-full px-4 py-2.5 rounded-lg bg-gradient-to-r from-[#C4A84C] to-[#D4B85C] text-white font-semibold text-sm shadow-sm hover:shadow-md hover:shadow-[#C4A84C]/20 transition-all"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-2 rounded-lg bg-secondary">
          <Users className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
          <div className="text-lg font-bold text-foreground">{stats.invited}</div>
          <div className="text-[10px] text-muted-foreground">Inbjudna</div>
        </div>
        <div className="text-center p-2 rounded-lg bg-emerald-500/10">
          <Check className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
          <div className="text-lg font-bold text-emerald-400">{stats.active}</div>
          <div className="text-[10px] text-muted-foreground">Aktiva</div>
        </div>
        <div className="text-center p-2 rounded-lg bg-amber-500/10">
          <TrendingUp className="w-4 h-4 text-[#C4A84C] mx-auto mb-1" />
          <div className="text-lg font-bold text-[#C4A84C]">{stats.earned.toLocaleString("sv-SE")} kr</div>
          <div className="text-[10px] text-muted-foreground">Intjänat</div>
        </div>
      </div>

      {/* Progress */}
      <div>
        <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
          <span>Framsteg mot nästa nivå</span>
          <span className="font-semibold text-muted-foreground">{stats.invited}/{stats.target}</span>
        </div>
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#C4A84C] to-[#D4B85C] transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-[10px] text-muted-foreground mt-1">
          {stats.target - stats.invited} inbjudningar kvar till Gold-nivå
        </div>
      </div>
    </div>
  );
}
