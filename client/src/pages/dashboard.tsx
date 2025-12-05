import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Receipt, Clock, TrendingUp, DollarSign, ArrowRight, Users } from "lucide-react";
import type { PurchaseInvoice, Vendor } from "@shared/schema";

interface ApStats {
  totalInvoices: number;
  outstandingAmount: number;
  overdueCount: number;
  dueSoonCount: number;
  paidThisMonth: number;
}

interface ArStats {
  totalCustomers: number;
  pendingInvoices: number;
  overdueAmount: number;
  monthlyRevenue: number;
  avgCollectionTime: number;
  recurringRevenue: number;
  totalReceivable: number;
  totalCollected: number;
}

interface PurchaseInvoicesResponse {
  invoices: (PurchaseInvoice & { vendor: Vendor | null })[];
  stats: ApStats;
}

function formatCurrency(value?: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format((value || 0) / 100);
}

function StatCard({
  title,
  value,
  icon: Icon,
  meta,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  meta?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold" data-testid={`stat-${title.toLowerCase().replace(/\s+/g, "-")}`}>
          {value}
        </div>
        {meta && <p className="text-xs text-muted-foreground mt-1">{meta}</p>}
      </CardContent>
    </Card>
  );
}

const statusPills: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-sky-100 text-sky-700",
  paid: "bg-emerald-100 text-emerald-700",
  overdue: "bg-red-100 text-red-700",
};

function InvoiceRow({ invoice }: { invoice: PurchaseInvoice & { vendor: Vendor | null } }) {
  const dueDateLabel = invoice.dueDate
    ? new Date(invoice.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "No due date";
  return (
    <div className="flex flex-col gap-2 p-4 rounded-lg border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold truncate">{invoice.invoiceNumber || invoice.title}</p>
        <Badge
          variant="secondary"
          className={`${statusPills[invoice.status] || "bg-slate-100 text-slate-700"} capitalize`}
        >
          {invoice.status}
        </Badge>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <div>{invoice.vendor?.name || "Unknown vendor"}</div>
        <span className="font-semibold">{formatCurrency(invoice.totalAmount)}</span>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Due {dueDateLabel}</span>
        <span>
          {new Date(invoice.invoiceDate).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      </div>
    </div>
  );
}


export default function Dashboard() {
  const { data: apData, isLoading: apLoading } = useQuery<PurchaseInvoicesResponse>({
    queryKey: ["/api/payables/purchase-invoices"],
  });
  const { data: arStats, isLoading: arLoading } = useQuery<ArStats>({
    queryKey: ["/api/receivables/dashboard/stats"],
  });

  const apStats = apData?.stats;
  const recentInvoices = apData?.invoices.slice(0, 4) || [];

  const heroMetrics = [
    {
      label: "Outstanding AP",
      value: formatCurrency(apStats?.outstandingAmount),
      icon: Receipt,
    },
    {
      label: "Overdue AP",
      value: apStats?.overdueCount ?? 0,
      icon: Clock,
    },
    {
      label: "Receivable balance",
      value: formatCurrency(arStats?.totalReceivable),
      icon: DollarSign,
    },
  ];

  const apCards = [
    {
      title: "Outstanding AP",
      value: formatCurrency(apStats?.outstandingAmount),
      icon: Receipt,
      meta: `${apStats?.totalInvoices ?? 0} invoices open`,
    },
    {
      title: "Overdue invoices",
      value: apStats?.overdueCount ?? 0,
      icon: Clock,
      meta: `${apStats?.dueSoonCount ?? 0} due soon`,
    },
    {
      title: "Due soon",
      value: apStats?.dueSoonCount ?? 0,
      icon: Receipt,
      meta: `${apStats?.overdueCount ?? 0} already overdue`,
    },
    {
      title: "Paid this month",
      value: formatCurrency(apStats?.paidThisMonth),
      icon: DollarSign,
      meta: "Captured through purchase invoices",
    },
  ];

  const arCards = [
    {
      title: "Monthly revenue",
      value: formatCurrency(arStats?.monthlyRevenue),
      icon: TrendingUp,
      meta: `${arStats?.pendingInvoices ?? 0} invoices pending`,
    },
    {
      title: "Overdue receivables",
      value: formatCurrency(arStats?.overdueAmount),
      icon: Clock,
      meta: `${arStats?.totalReceivable ?? 0} total receivable amount`,
    },
    {
      title: "Pending invoices",
      value: arStats?.pendingInvoices ?? 0,
      icon: Receipt,
      meta: `${arStats?.totalCustomers ?? 0} customers`,
    },
    {
      title: "Total customers",
      value: arStats?.totalCustomers ?? 0,
      icon: Users,
      meta: `${arStats?.totalCollected ?? 0} collected`,
    },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <section>
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground">
            Stay on top of purchase invoices and receivable balances from a single screen.
          </p>
        </div>
      </section>


      <section className="grid gap-4 lg:grid-cols-4">
        {apLoading
          ? [...Array(4)].map((_, index) => (
              <Card key={index}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))
          : apCards.map((card) => (
              <StatCard key={card.title} {...card} />
            ))}
      </section>

      <section>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-3">
            <Card>
              <CardHeader className="flex items-center justify-between gap-4">
                <CardTitle>Recent purchase invoices</CardTitle>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/payables">
                    View invoices
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {apLoading ? (
                  [...Array(3)].map((_, index) => (
                    <div key={index} className="animate-pulse rounded-lg border bg-card p-4">
                      <Skeleton className="h-4 w-40 mb-2" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  ))
                ) : recentInvoices.length > 0 ? (
                  recentInvoices.map((invoice) => (
                    <InvoiceRow key={invoice.id} invoice={invoice} />
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">No purchase invoices yet.</p>
                    <p className="text-sm text-muted-foreground">
                      Create one through the Accounts Payable workflow.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

        <div className="space-y-3">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Receivable pulse
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {arLoading ? (
                [...Array(3)].map((_, index) => (
                  <Skeleton key={index} className="h-5 w-full" />
                ))
              ) : (
                <>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Total receivable</span>
                    <span>{formatCurrency(arStats?.totalReceivable)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Collected this period</span>
                    <span>{formatCurrency(arStats?.totalCollected)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Recurring revenue</span>
                    <span>{formatCurrency(arStats?.recurringRevenue)}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
        </div>
      </section>
    </div>
  );
}
