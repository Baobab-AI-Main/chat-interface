import { Calendar, ExternalLink, FileText, Package, User, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { appConfig } from "../config";

export interface SparklayerOrderDetail {
  orderId: string;
  customer: string;
  date: string;
  link?: string | null;
}

export interface XeroInvoiceDetail {
  invoiceId: string;
  amountDue: number;
  status: "draft" | "submitted" | "authorised" | "paid" | "voided" | "deleted";
  link?: string | null;
}

export interface ConversationDetailEntry {
  messageId: string;
  createdAt: string;
  order?: SparklayerOrderDetail | null;
  invoice?: XeroInvoiceDetail | null;
}

interface RightSidebarProps {
  details: ConversationDetailEntry[];
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const hasTimeComponent = value.includes("T");
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    ...(hasTimeComponent ? { timeStyle: "short" as const } : {}),
  }).format(date);
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function RightSidebar({ details }: RightSidebarProps) {
  const currencySymbol = appConfig.financeCurrencySymbol;

  if (details.length === 0) {
    return <aside className="w-0 overflow-hidden" aria-hidden="true" />;
  }

  return (
    <aside className="w-80 bg-card border-l flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="text-sm font-medium text-muted-foreground">Conversation Details</h2>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {details.length === 0 && (
            <div className="text-sm text-muted-foreground">
              No external order or invoice data yet for this conversation.
            </div>
          )}

          {details.map((entry) => (
            <div key={entry.messageId} className="space-y-3">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {formatDate(entry.createdAt)}
              </div>
              {entry.order && (
                <Card>
                  <CardHeader className="px-4 pt-4 pb-1">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <img
                        src="https://www.sparklayer.io/assets/images/icons/emblem.png"
                        alt="SparkLayer logo"
                        className="w-[30px] h-[30px] object-contain"
                      />
                      Sparklayer Order
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pt-0 pb-4 space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <FileText className="w-4 h-4" />
                      <span className="font-medium text-foreground">{entry.order.orderId}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="w-4 h-4" />
                      <span>{entry.order.customer}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(entry.order.date)}</span>
                    </div>
                    {entry.order.link && (
                      <a
                        href={entry.order.link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" /> View order
                      </a>
                    )}
                  </CardContent>
                </Card>
              )}

              {entry.invoice && (
                <Card>
                  <CardHeader className="px-4 pt-4 pb-1">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <img
                        src="https://upload.wikimedia.org/wikipedia/en/thumb/9/9f/Xero_software_logo.svg/1200px-Xero_software_logo.svg.png"
                        alt="Xero logo"
                        className="w-[30px] h-[30px] object-contain"
                      />
                      Xero Invoice
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pt-0 pb-4 space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <FileText className="w-4 h-4" />
                      <span className="font-medium text-foreground">{entry.invoice.invoiceId}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <DollarSign className="w-4 h-4" />
                      <span>
                        {currencySymbol}
                        {formatAmount(entry.invoice.amountDue)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Badge variant="outline" className="text-xs uppercase">
                        {entry.invoice.status}
                      </Badge>
                    </div>
                    {entry.invoice.link && (
                      <a
                        href={entry.invoice.link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" /> View invoice
                      </a>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </aside>
  );
}
