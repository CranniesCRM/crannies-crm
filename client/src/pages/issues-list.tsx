import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  CircleDot,
  CheckCircle2,
  Plus,
  Search,
  Filter,
  ChevronDown,
  MessageSquare,
  Star,
  Upload,
  FileSpreadsheet,
} from "lucide-react";
import type { IssueWithDetails, User } from "@shared/schema";

type StatusFilter = "all" | "open" | "closed" | "won" | "lost";

type BulkImportData = {
  issues: any[];
  mappingConfirmed: boolean;
};

// Standard fields that Crannies expects (from schema.ts and issue forms)
const standardFields = [
  "title",
  "description", 
  "contactName",
  "contactEmail",
  "contactCompany",
  "dealValue",
  "status",
  "labels"
];

function IssueRow({ issue }: { issue: IssueWithDetails }) {
  const statusConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
    open: { icon: CircleDot, color: "text-green-500", bg: "bg-green-500/10" },
    closed: { icon: CheckCircle2, color: "text-purple-500", bg: "bg-purple-500/10" },
    won: { icon: CheckCircle2, color: "text-blue-500", bg: "bg-blue-500/10" },
    lost: { icon: CheckCircle2, color: "text-red-500", bg: "bg-red-500/10" },
  };

  const config = statusConfig[issue.status] || statusConfig.open;
  const StatusIcon = config.icon;

  const displayedAssignees = issue.assignees?.slice(0, 3) || [];
  const extraAssignees = (issue.assignees?.length || 0) - 3;

  return (
    <Link href={`/issues/${issue.id}`}>
      <div
        className="flex items-center gap-4 p-4 border-b last:border-b-0 hover:bg-muted/50 transition-colors cursor-pointer"
        data-testid={`issue-row-${issue.id}`}
      >
        <StatusIcon className={`h-5 w-5 flex-shrink-0 ${config.color}`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">{issue.title}</span>
            {issue.isPublished && (
              <div className="flex items-center gap-1">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                </span>
              </div>
            )}
            {issue.labels?.map((label) => (
              <Badge key={label} variant="secondary" className="text-xs">
                {label}
              </Badge>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <span>#{issue.issueNumber}</span>
            <span>•</span>
            <span>
              opened by {issue.createdBy?.firstName || "Unknown"}{" "}
              {issue.createdAt &&
                new Date(issue.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
            </span>
            {issue.contactCompany && (
              <>
                <span>•</span>
                <span>{issue.contactCompany}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 flex-shrink-0">
          {displayedAssignees.length > 0 && (
            <div className="flex -space-x-2">
              {displayedAssignees.map(
                (assignee, idx) =>
                  assignee && (
                    <Avatar
                      key={assignee.id || idx}
                      className="h-6 w-6 border-2 border-background"
                    >
                      <AvatarImage
                        src={assignee.profileImageUrl || undefined}
                        className="object-cover"
                      />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {assignee.firstName?.[0] || "?"}
                      </AvatarFallback>
                    </Avatar>
                  )
              )}
              {extraAssignees > 0 && (
                <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium">
                  +{extraAssignees}
                </div>
              )}
            </div>
          )}

          {issue.commentCount !== undefined && issue.commentCount > 0 && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
              <span className="text-sm">{issue.commentCount}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function IssuesList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const { data: issues, isLoading } = useQuery<IssueWithDetails[]>({
    queryKey: statusFilter === "all" ? ["/api/issues"] : ["/api/issues", { status: statusFilter }],
  });

  const bulkImportForm = useForm<BulkImportData>({
    defaultValues: {
      issues: undefined,
      mappingConfirmed: false,
    },
  });

  const bulkImportMutation = useMutation({
    mutationFn: async (data: BulkImportData) => {
      return await apiRequest("POST", "/api/issues/bulk", data);
    },
    onSuccess: (result: any) => {
      toast({
        title: "Import successful",
        description: `Created ${result.created} issues out of ${result.totalRequested} requested`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/issues"] });
      setIsBulkImportOpen(false);
      // Reset form state
      setCsvData([]);
      setCsvHeaders([]);
      setFieldMapping({});
    },
    onError: (error: Error) => {
      toast({
        title: "Import failed",
        description: error.message || "Failed to import issues",
        variant: "destructive",
      });
    },
  });

  const handleCsvUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      
      try {
        // Simple CSV parsing for basic cases
        const lines = text.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const json = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
          const obj: any = {};
          headers.forEach((header, index) => {
            obj[header] = values[index] || '';
          });
          return obj;
        });
        
        setCsvData(json);
        
        if (json.length > 0) {
          setCsvHeaders(headers);
          
          // Auto-map common field names based on actual schema
          const autoMapping: Record<string, string> = {};
          headers.forEach(header => {
            const lowerHeader = header.toLowerCase();
            const standardField = standardFields.find(field => {
              if (field === 'title') {
                return lowerHeader.includes('title') || lowerHeader.includes('name') || lowerHeader.includes('deal');
              }
              if (field === 'description') {
                return lowerHeader.includes('description') || lowerHeader.includes('details') || lowerHeader.includes('notes');
              }
              if (field === 'contactName') {
                return lowerHeader.includes('contact') || lowerHeader.includes('customer') || lowerHeader.includes('person') || 
                       (lowerHeader.includes('name') && !lowerHeader.includes('company'));
              }
              if (field === 'contactEmail') {
                return lowerHeader.includes('email');
              }
              if (field === 'contactCompany') {
                return lowerHeader.includes('company') || lowerHeader.includes('organization') || lowerHeader.includes('account');
              }
              if (field === 'dealValue') {
                return lowerHeader.includes('value') || lowerHeader.includes('amount') || lowerHeader.includes('price') || lowerHeader.includes('revenue');
              }
              if (field === 'status') {
                return lowerHeader.includes('status') || lowerHeader.includes('stage') || lowerHeader.includes('state');
              }
              if (field === 'labels') {
                return lowerHeader.includes('label') || lowerHeader.includes('tag') || lowerHeader.includes('category');
              }
              return false;
            });
            if (standardField) {
              autoMapping[standardField] = header;
            }
          });
          setFieldMapping(autoMapping);
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to parse CSV file. Please check the format.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  const handleBulkImportSubmit = (data: BulkImportData) => {
    if (csvData.length === 0) {
      toast({
        title: "Error",
        description: "Please upload a CSV file first",
        variant: "destructive",
      });
      return;
    }

    // Check if at least the required fields are mapped
    const requiredFields = ['title', 'contactEmail', 'dealValue', 'status'];
    const missingRequiredFields = requiredFields.filter(field => !fieldMapping[field]);
    
    if (missingRequiredFields.length > 0) {
      toast({
        title: "Missing Required Fields",
        description: `Please map these required fields: ${missingRequiredFields.join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    if (!data.mappingConfirmed) {
      toast({
        title: "Confirmation Required",
        description: "Please confirm that the field mapping is correct",
        variant: "destructive",
      });
      return;
    }

    // Map CSV data to standard format
    const mappedIssues = csvData.map(row => {
      const mappedIssue: any = {};
      Object.entries(fieldMapping).forEach(([standardField, csvField]) => {
        if (csvField && row[csvField]) {
          // Convert dealValue to integer if it's the dealValue field
          if (standardField === 'dealValue') {
            mappedIssue[standardField] = parseInt(row[csvField].toString()) || null;
          }
          // Convert labels to array if it's the labels field
          else if (standardField === 'labels') {
            mappedIssue[standardField] = row[csvField].toString().split(',').map((label: string) => label.trim()).filter((label: string) => label);
          }
          else {
            mappedIssue[standardField] = row[csvField];
          }
        }
      });
      return mappedIssue;
    });

    bulkImportMutation.mutate({ issues: mappedIssues, mappingConfirmed: data.mappingConfirmed });
  };

  const filteredIssues = issues?.filter((issue) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      issue.title.toLowerCase().includes(query) ||
      issue.contactName?.toLowerCase().includes(query) ||
      issue.contactCompany?.toLowerCase().includes(query) ||
      issue.issueNumber.toString().includes(query)
    );
  });

  const openCount = issues?.filter((i) => i.status === "open").length || 0;
  const closedCount = issues?.filter((i) => i.status !== "open").length || 0;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold" data-testid="text-issues-title">Issues</h1>
        <div className="flex items-center gap-2">
          <Dialog open={isBulkImportOpen} onOpenChange={setIsBulkImportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-bulk-import">
                <Upload className="mr-2 h-4 w-4" />
                Bulk Import
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Bulk Import Issues</DialogTitle>
                <DialogDescription>
                  Upload a CSV file to import multiple issues at once
                </DialogDescription>
              </DialogHeader>
              
              {/* Bulk Import Modal Content */}
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Upload your CSV file</p>
                      <p className="text-xs text-muted-foreground">
                        Include columns like deal name, value, stage, contact info, etc.
                      </p>
                      <input
                        type="file"
                        accept=".csv"
                        className="hidden"
                        id="bulk-csv-upload"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleCsvUpload(file);
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('bulk-csv-upload')?.click()}
                      >
                        Choose File
                      </Button>
                    </div>
                  </div>

                  {csvHeaders.length > 0 && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium">Field Mapping</h3>
                        <p className="text-xs text-muted-foreground">
                          Map your CSV columns to Crannies fields. Required fields: Title, Contact Email, Deal Value, Status
                        </p>
                      </div>
                      <div className="space-y-3">
                        {standardFields.map((standardField) => (
                          <div key={standardField} className="grid grid-cols-2 gap-2 items-center">
                            <div>
                              <Label className="text-sm font-medium">
                                {standardField === 'contactName' ? 'Contact Name' :
                                 standardField === 'contactEmail' ? 'Contact Email' :
                                 standardField === 'contactCompany' ? 'Company' :
                                 standardField === 'dealValue' ? 'Deal Value ($)' :
                                 standardField.charAt(0).toUpperCase() + standardField.slice(1)}
                              </Label>
                              <p className="text-xs text-muted-foreground">
                                {standardField === 'title' && 'Deal/issue title'}
                                {standardField === 'description' && 'Deal description and details'}
                                {standardField === 'contactName' && 'Primary contact person'}
                                {standardField === 'contactEmail' && 'Contact email address'}
                                {standardField === 'contactCompany' && 'Contact company name'}
                                {standardField === 'dealValue' && 'Deal value in dollars'}
                                {standardField === 'status' && 'Deal status (open/closed/won/lost)'}
                                {standardField === 'labels' && 'Tags or categories'}
                              </p>
                            </div>
                            <Select
                              value={fieldMapping[standardField] || "unmapped"}
                              onValueChange={(value) => 
                                setFieldMapping(prev => ({ 
                                  ...prev, 
                                  [standardField]: value === "unmapped" ? "" : value 
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select field" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unmapped">-- Not mapped --</SelectItem>
                                {csvHeaders.map((header) => (
                                  <SelectItem key={header} value={header}>
                                    {header}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p>Mapped {Object.keys(fieldMapping).length} of {standardFields.length} fields</p>
                      </div>
                    </div>
                  )}

                  {csvData.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">
                        Preview ({csvData.length} issues ready to import)
                      </p>
                      <div className="text-xs text-muted-foreground max-h-32 overflow-y-auto">
                        Showing first 3 rows:
                        {csvData.slice(0, 3).map((row, index) => (
                          <div key={index} className="mt-1 p-2 bg-muted rounded">
                            {Object.entries(fieldMapping).map(([standardField, csvField]) => 
                              csvField && row[csvField] ? (
                                <div key={standardField}>
                                  <span className="font-medium">{standardField}:</span> {row[csvField]}
                                </div>
                              ) : null
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="mapping-confirmed"
                    checked={bulkImportForm.watch('mappingConfirmed')}
                    onCheckedChange={(checked) => 
                      bulkImportForm.setValue('mappingConfirmed', !!checked)
                    }
                  />
                  <Label htmlFor="mapping-confirmed" className="text-sm">
                    I confirm the field mapping is correct
                  </Label>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsBulkImportOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={bulkImportForm.handleSubmit(handleBulkImportSubmit)}
                    disabled={bulkImportMutation.isPending}
                  >
                    {bulkImportMutation.isPending ? "Importing..." : "Import Issues"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button asChild data-testid="button-new-issue">
            <Link href="/issues/new">
              <Plus className="mr-2 h-4 w-4" />
              New Issue
            </Link>
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="p-4 border-b flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search issues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-issues"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" data-testid="button-filter-status">
                <Filter className="mr-2 h-4 w-4" />
                Status
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setStatusFilter("all")}>
                All
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("open")}>
                Open
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("closed")}>
                Closed
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("won")}>
                Won
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("lost")}>
                Lost
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="px-4 py-3 border-b bg-muted/30 flex items-center gap-4">
          <button
            onClick={() => setStatusFilter("open")}
            className={`flex items-center gap-2 text-sm font-medium ${
              statusFilter === "open" || statusFilter === "all"
                ? "text-foreground"
                : "text-muted-foreground"
            }`}
            data-testid="filter-open"
          >
            <CircleDot className="h-4 w-4" />
            <span>{openCount} Open</span>
          </button>
          <button
            onClick={() => setStatusFilter("closed")}
            className={`flex items-center gap-2 text-sm font-medium ${
              statusFilter === "closed"
                ? "text-foreground"
                : "text-muted-foreground"
            }`}
            data-testid="filter-closed"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>{closedCount} Closed</span>
          </button>
        </div>

        <div className="divide-y">
          {isLoading ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <Skeleton className="h-5 w-5 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-64 mb-2" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-6 w-6 rounded-full" />
              </div>
            ))
          ) : filteredIssues && filteredIssues.length > 0 ? (
            filteredIssues.map((issue) => (
              <IssueRow key={issue.id} issue={issue} />
            ))
          ) : (
            <div className="text-center py-16">
              <CircleDot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">
                {searchQuery ? "No matching issues" : "No issues yet"}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery
                  ? "Try adjusting your search terms"
                  : "Create your first issue to start tracking deals and contacts"}
              </p>
              {!searchQuery && (
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <Button asChild>
                    <Link href="/issues/new">
                      <Plus className="mr-2 h-4 w-4" />
                      New Issue
                    </Link>
                  </Button>
                  <Button variant="outline" onClick={() => setIsBulkImportOpen(true)}>
                    <Upload className="mr-2 h-4 w-4" />
                    Bulk Import
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
