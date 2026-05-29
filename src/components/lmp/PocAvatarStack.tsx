import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { usePocCapability } from "@/lib/hooks/usePocCapabilityLive";
import type { Requisition } from "@/lib/mockLmpData";

export type PocRoleType = "in-domain" | "cross-domain" | "behavioral";

type StackItem = {
  name: string;
  initials: string;
  color: string;
  roleType: PocRoleType;
};

const ROLE_LABEL: Record<PocRoleType, string> = {
  "in-domain": "In-domain POC",
  "cross-domain": "Cross-domain POC",
  "behavioral": "Support POC",
};

const ROLE_RING: Record<PocRoleType, string> = {
  "in-domain": "ring-2 ring-sage-500/70",
  "cross-domain": "ring-2 ring-orange-500/70",
  "behavioral": "ring-2 ring-plum-400/70",
};

function classifyDomainPoc(matchType: string): PocRoleType {
  if (matchType === "Cross-Domain") return "cross-domain";
  return "in-domain";
}

/**
 * Build a deduped, ordered list of POCs to show as a stacked avatar group.
 * Order: Domain POC → Behavioral POC → (collapsed if same person via Dual Ownership).
 */
export function buildPocStack(req: Requisition): StackItem[] {
  const items: StackItem[] = [];
  items.push({
    name: req.domainPrepPoc.name,
    initials: req.domainPrepPoc.initials,
    color: req.domainPrepPoc.color,
    roleType: classifyDomainPoc(req.domainPrepPoc.matchType),
  });
  if (req.supportPoc && req.supportPoc.name !== req.domainPrepPoc.name) {
    items.push({
      name: req.supportPoc.name,
      initials: req.supportPoc.initials,
      color: req.supportPoc.color,
      roleType: "behavioral",
    });
  }
  return items;
}

const SIZES = {
  sm: { wh: "h-7 w-7", text: "text-[10px]", overlap: "-space-x-2" },
  md: { wh: "h-8 w-8", text: "text-[11px]", overlap: "-space-x-2.5" },
};

export function PocAvatarStack({
  req,
  size = "md",
  max = 3,
  className,
}: {
  req: Requisition;
  size?: "sm" | "md";
  max?: number;
  className?: string;
}) {
  const items = buildPocStack(req);
  const visible = items.slice(0, max);
  const overflow = items.length - visible.length;
  const s = SIZES[size];
  const navigate = useNavigate();

  return (
    <TooltipProvider delayDuration={120}>
      <div className={cn("flex items-center", s.overlap, className)} data-stop-card-click>
        {visible.map((p) => (
          <Tooltip key={p.name}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/poc/${encodeURIComponent(p.name)}`);
                }}
                title={`View ${p.name.split(" ")[0]}'s LMP board`}
                className={cn(
                  "relative rounded-full inline-flex items-center justify-center font-semibold shrink-0 border-2 border-white shadow-sm transition-transform hover:z-10 hover:scale-105 cursor-pointer",
                  s.wh,
                  s.text,
                  p.color,
                  ROLE_RING[p.roleType],
                )}
                aria-label={`${p.name} — ${ROLE_LABEL[p.roleType]}`}
              >
                {p.initials}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="p-0 border border-n200 bg-white text-n900 shadow-lg">
              <PocTooltipBody name={p.name} roleType={p.roleType} />
            </TooltipContent>
          </Tooltip>
        ))}
        {overflow > 0 && (
          <span
            className={cn(
              "rounded-full inline-flex items-center justify-center font-semibold shrink-0 border-2 border-white bg-n100 text-n600",
              s.wh,
              s.text,
            )}
            title={`+${overflow} more`}
          >
            +{overflow}
          </span>
        )}
      </div>
    </TooltipProvider>
  );
}

function PocTooltipBody({ name, roleType }: { name: string; roleType: PocRoleType }) {
  const cap = usePocCapability(name);
  const firstName = name.split(" ")[0].toLowerCase().replace(/[^a-z]/g, "");
  const email = `${firstName}@prepacademy.io`;
  const phone = "+91 98•••• ••42";
  const domain = cap?.domains?.[0];

  const dotColor =
    roleType === "in-domain" ? "bg-sage-500" :
    roleType === "cross-domain" ? "bg-orange-500" : "bg-plum-400";

  return (
    <div className="px-3 py-2.5 min-w-[200px] text-left">
      <div className="text-[13px] font-semibold text-n900">{name}</div>
      <div className="mt-0.5 inline-flex items-center gap-1.5 text-[11px] text-n600">
        <span className={cn("h-1.5 w-1.5 rounded-full", dotColor)} />
        {ROLE_LABEL[roleType]}
        {domain && roleType !== "behavioral" && <span className="text-n400">· {domain}</span>}
      </div>
      <div className="mt-2 pt-2 border-t border-n100 space-y-1 text-[11px] text-n600">
        <div className="flex items-center gap-1.5"><span>📧</span><span>{email}</span></div>
        <div className="flex items-center gap-1.5"><span>📞</span><span>{phone}</span></div>
      </div>
    </div>
  );
}