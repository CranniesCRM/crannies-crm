import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Upload, User, Building2, FileSpreadsheet, FileText, Shield, CreditCard, ChevronRight, ChevronLeft, Check, Wallet } from "lucide-react";
import * as csvToJson from "convert-csv-to-json";
import cranniesLogo from "@assets/ChatGPT Image Nov 29, 2025, 05_12_28 AM_1764411187059.png";

const userProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  role: z.string().min(1, "Role is required"),
  teamName: z.string().min(1, "Team is required"),
  profileImageUrl: z.string().optional(),
});

const workspaceSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  billingEmail: z.string().email("Invalid email address"),
  industry: z.string().min(1, "Industry is required"),
  bio: z.string().optional(),
  logoUrl: z.string().optional(),
});

const csvMappingSchema = z.object({
  dealsData: z.array(z.record(z.string())).optional(),
  mappingConfirmed: z.boolean().optional(),
});

const termsSchema = z.object({
  termsAccepted: z.boolean().refine(val => val === true, "You must accept the Terms and Conditions"),
});

const dpaSchema = z.object({
  dpaAccepted: z.boolean().refine(val => val === true, "You must accept the Data Processing Agreement"),
});

const pricingSchema = z.object({
  agreementSigned: z.boolean().refine(val => val === true, "You must accept the payment agreement"),
});

type UserProfileData = z.infer<typeof userProfileSchema>;
type WorkspaceData = z.infer<typeof workspaceSchema>;
type CsvMappingData = z.infer<typeof csvMappingSchema>;
type TermsData = z.infer<typeof termsSchema>;
type DpaData = z.infer<typeof dpaSchema>;
type PricingData = z.infer<typeof pricingSchema>;

const industries = [
  "Technology",
  "Healthcare",
  "Finance",
  "Education",
  "Manufacturing",
  "Retail",
  "Real Estate",
  "Consulting",
  "Marketing",
  "Other",
];

const teams = [
  "Sales",
  "Marketing",
  "Design",
  "Engineering",
  "Customer Success",
  "Operations",
  "Finance",
  "HR",
  "Executive",
  "Other",
];

const roles = [
  "Account Executive",
  "Sales Manager",
  "Marketing Manager",
  "Designer",
  "Product Manager",
  "Customer Success Manager",
  "CEO",
  "CTO",
  "COO",
  "Other",
];

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

interface OnboardingProps {
  isNewWorkspace?: boolean;
  inviteToken?: string;
}

export default function Onboarding({ isNewWorkspace = true, inviteToken }: OnboardingProps) {
  const [step, setStep] = useState(1);
  const [userData, setUserData] = useState<UserProfileData | null>(null);
  const [workspaceData, setWorkspaceData] = useState<WorkspaceData | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [calculatedPrice, setCalculatedPrice] = useState<number>(0);
  const [userEmail, setUserEmail] = useState<string>("");
  const [plaidBankLinked, setPlaidBankLinked] = useState<boolean>(false);
  const { toast } = useToast();
  const totalSteps = isNewWorkspace ? 7 : 1;

  const userForm = useForm<UserProfileData>({
    resolver: zodResolver(userProfileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      role: "",
      teamName: "",
      profileImageUrl: "",
    },
  });

  const workspaceForm = useForm<WorkspaceData>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: {
      companyName: "",
      billingEmail: "",
      industry: "",
      bio: "",
      logoUrl: "",
    },
  });

  const csvForm = useForm<CsvMappingData>({
    resolver: zodResolver(csvMappingSchema),
    defaultValues: {
      dealsData: undefined,
      mappingConfirmed: false,
    },
  });

  const termsForm = useForm<TermsData>({
    resolver: zodResolver(termsSchema),
    defaultValues: {
      termsAccepted: false,
    },
  });

  const dpaForm = useForm<DpaData>({
    resolver: zodResolver(dpaSchema),
    defaultValues: {
      dpaAccepted: false,
    },
  });

  const pricingForm = useForm<PricingData>({
    resolver: zodResolver(pricingSchema),
    defaultValues: {
      agreementSigned: false,
    },
  });



  const completeOnboardingMutation = useMutation({
    mutationFn: async (data: { 
      user: UserProfileData; 
      workspace?: WorkspaceData; 
      dealsData?: any[];
      termsAccepted?: boolean;
      dpaAccepted?: boolean;
      pricingData?: PricingData;
    }) => {
      return await apiRequest("POST", "/api/onboarding/complete", data);
    },
    onSuccess: () => {
      toast({
        title: "Welcome to Crannies!",
        description: "Your account has been set up successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to complete onboarding",
        variant: "destructive",
      });
    },
  });

  const handleUserSubmit = (data: UserProfileData) => {
    setUserData(data);
    setUserEmail(`${data.firstName}.${data.lastName}`.toLowerCase().replace(/\s+/g, '.'));
    if (isNewWorkspace) {
      setStep(2);
    } else {
      completeOnboardingMutation.mutate({ user: data });
    }
  };

  const handleWorkspaceSubmit = (data: WorkspaceData) => {
    setWorkspaceData(data);
    setStep(3);
  };

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

  const handleCsvSkip = () => {
    // Set empty deals data and proceed to next step
    csvForm.setValue('dealsData', []);
    csvForm.setValue('mappingConfirmed', true);
    setCsvData([]); // Also clear the csvData to match
    setCalculatedPrice(29); // Minimum price for no deals
    setStep(5);
  };

  const handleCsvSubmit = (data: CsvMappingData) => {
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
    const mappedDeals = csvData.map(row => {
      const mappedDeal: any = {};
      Object.entries(fieldMapping).forEach(([standardField, csvField]) => {
        if (csvField) {
          // Convert dealValue to integer if it's the dealValue field
          if (standardField === 'dealValue' && row[csvField]) {
            mappedDeal[standardField] = parseInt(row[csvField].toString()) || null;
          }
          // Convert labels to array if it's the labels field
          else if (standardField === 'labels' && row[csvField]) {
            mappedDeal[standardField] = row[csvField].toString().split(',').map((label: string) => label.trim()).filter((label: string) => label);
          } else {
            mappedDeal[standardField] = row[csvField];
          }
        }
      });
      return mappedDeal;
    });

    // Calculate pricing based on number of deals
    const price = Math.max(29, mappedDeals.length * 2); // $2 per deal, minimum $29
    setCalculatedPrice(price);

    csvForm.setValue('dealsData', mappedDeals);
    setStep(5);
  };

  const handleTermsSubmit = (data: TermsData) => {
    setStep(6);
  };

  const handleDpaSubmit = (data: DpaData) => {
    setStep(7);
  };

  const handlePlaidSubmit = () => {
    setStep(4);
  };

  const handlePricingSubmit = (data: PricingData) => {
    const finalData = {
      user: userData!,
      workspace: workspaceData || undefined,
      dealsData: csvForm.getValues('dealsData'),
      termsAccepted: termsForm.getValues('termsAccepted'),
      dpaAccepted: dpaForm.getValues('dpaAccepted'),
      pricingData: data,
    };

    completeOnboardingMutation.mutate(finalData);
  };



  const getStepIndicator = () => {
    return (
      <div className="flex items-center justify-center gap-2 mb-8">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className={`h-2 w-8 rounded-full transition-colors ${
              i + 1 <= step ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>
    );
  };

  const getStepTitle = () => {
    const titles = [
      "Your Profile",
      "Your Workspace", 
      "Connect Bank Account",
      "Import Your Deals",
      "Terms & Conditions",
      "Data Processing Agreement",
      "Pricing & Agreement"
    ];
    return titles[step - 1];
  };

  const getStepIcon = () => {
    const icons = [User, Building2, Wallet, FileSpreadsheet, FileText, Shield, CreditCard];
    const IconComponent = icons[step - 1];
    return <IconComponent className="h-6 w-6 text-primary" />;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-center gap-3 mb-8">
          <img
            src={cranniesLogo}
            alt="Crannies"
            className="h-10 w-10 rounded-md object-cover"
          />
          <span className="text-2xl font-bold">Crannies</span>
        </div>

        {getStepIndicator()}

        {/* Step 1: User Profile */}
        {step === 1 && (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                {getStepIcon()}
              </div>
              <CardTitle className="text-2xl">{getStepTitle()}</CardTitle>
              <CardDescription>
                Tell us a bit about yourself so your team knows who you are
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...userForm}>
                <form onSubmit={userForm.handleSubmit(handleUserSubmit)} className="space-y-6">
                  <div className="flex justify-center mb-6">
                    <div className="relative">
                      <Avatar className="h-24 w-24">
                        <AvatarImage
                          src={userForm.watch("profileImageUrl") || undefined}
                          className="object-cover"
                        />
                        <AvatarFallback className="bg-muted text-2xl">
                          {userForm.watch("firstName")?.[0] || ""}
                          {userForm.watch("lastName")?.[0] || ""}
                        </AvatarFallback>
                      </Avatar>
                      <label
                        htmlFor="profile-upload"
                        className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer hover-elevate"
                      >
                        <Upload className="h-4 w-4" />
                      </label>
                      <input
                        id="profile-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              userForm.setValue("profileImageUrl", reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={userForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={userForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={userForm.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {roles.map((role) => (
                              <SelectItem key={role} value={role}>
                                {role}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={userForm.control}
                    name="teamName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Team</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your team" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {teams.map((team) => (
                              <SelectItem key={team} value={team}>
                                {team}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full">
                    Continue
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Workspace Setup */}
        {step === 2 && (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                {getStepIcon()}
              </div>
              <CardTitle className="text-2xl">{getStepTitle()}</CardTitle>
              <CardDescription>
                Set up your company workspace for your team
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...workspaceForm}>
                <form onSubmit={workspaceForm.handleSubmit(handleWorkspaceSubmit)} className="space-y-6">
                  <div className="flex justify-center mb-6">
                    <div className="relative">
                      <div className="h-24 w-24 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                        {workspaceForm.watch("logoUrl") ? (
                          <img
                            src={workspaceForm.watch("logoUrl")}
                            alt="Company logo"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Building2 className="h-10 w-10 text-muted-foreground" />
                        )}
                      </div>
                      <label
                        htmlFor="logo-upload"
                        className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer hover-elevate"
                      >
                        <Upload className="h-4 w-4" />
                      </label>
                      <input
                        id="logo-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              workspaceForm.setValue("logoUrl", reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </div>
                  </div>

                  <FormField
                    control={workspaceForm.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Acme Inc." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={workspaceForm.control}
                    name="billingEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Billing Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="billing@company.com" {...field} />
                        </FormControl>
                        <FormDescription>
                          This email will receive invoices and billing notifications
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={workspaceForm.control}
                    name="industry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Industry</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your industry" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {industries.map((industry) => (
                              <SelectItem key={industry} value={industry}>
                                {industry}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={workspaceForm.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Bio</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Tell us about your company..."
                            className="min-h-24 resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setStep(1)}
                    >
                      <ChevronLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                    <Button type="submit" className="flex-1">
                      Continue
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Connect Bank Account (Plaid) */}
        {step === 3 && (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                {getStepIcon()}
              </div>
              <CardTitle className="text-2xl">{getStepTitle()}</CardTitle>
              <CardDescription>
                Connect your bank account to enable payment processing and transfers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="text-center space-y-4">
                  <div className="mx-auto h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
                    <Wallet className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Secure Bank Connection</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      Connect your business bank account securely using Plaid. This enables automated payment processing, 
                      invoice payments from customers, and vendor payment transfers.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid gap-3 text-sm">
                    <div className="flex items-center space-x-3">
                      <Check className="h-4 w-4 text-green-600" />
                      <span>Secure bank account verification</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Check className="h-4 w-4 text-green-600" />
                      <span>Automated payment processing</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Check className="h-4 w-4 text-green-600" />
                      <span>Customer payment collection</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Check className="h-4 w-4 text-green-600" />
                      <span>Vendor payment transfers</span>
                    </div>
                  </div>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Privacy & Security</h4>
                  <p className="text-xs text-muted-foreground">
                    Your bank credentials are never stored on our servers. Plaid uses bank-level security 
                    and encryption to protect your financial information. You can disconnect your bank 
                    account at any time from settings.
                  </p>
                </div>

                <div className="space-y-3">
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={async () => {
                      // This would integrate with Plaid Link
                      // For now, we'll simulate the connection
                      try {
                        // TODO: Replace with actual Plaid Link integration
                        // const linkHandler = window.Plaid.create({
                        //   token: await getPlaidLinkToken(),
                        //   onSuccess: async (public_token, metadata) => {
                        //     await exchangePublicToken(public_token);
                        //     setPlaidBankLinked(true);
                        //   },
                        //   onExit: (err, metadata) => {
                        //     console.log('Plaid Link exited', err, metadata);
                        //   }
                        // });
                        // linkHandler.open();

                        // Simulate successful connection for demo
                        setTimeout(() => {
                          setPlaidBankLinked(true);
                          toast({
                            title: "Bank Account Connected",
                            description: "Your bank account has been successfully linked.",
                          });
                        }, 1500);
                      } catch (error) {
                        toast({
                          title: "Connection Failed",
                          description: "Failed to connect bank account. Please try again.",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    {plaidBankLinked ? (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Bank Account Connected
                      </>
                    ) : (
                      <>
                        <Wallet className="mr-2 h-4 w-4" />
                        Connect Bank Account
                      </>
                    )}
                  </Button>

                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => {
                      // Skip for now - can be set up later
                      setPlaidBankLinked(false);
                      setStep(4);
                    }}
                  >
                    Skip for Now (Set Up Later)
                  </Button>
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStep(2)}
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button 
                    type="button" 
                    className="flex-1"
                    disabled={!plaidBankLinked}
                    onClick={handlePlaidSubmit}
                  >
                    Continue
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: CSV Upload and Mapping */}
        {step === 4 && (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                {getStepIcon()}
              </div>
              <CardTitle className="text-2xl">{getStepTitle()}</CardTitle>
              <CardDescription>
                Upload your CSV file with deals and map the columns to Crannies fields
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...csvForm}>
                <form onSubmit={csvForm.handleSubmit(handleCsvSubmit)} className="space-y-6">
                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                      <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Upload your CSV file</p>
                        <p className="text-xs text-muted-foreground">
                          Include columns like deal name, value, stage, close date, owner, etc.
                        </p>
                        <input
                          type="file"
                          accept=".csv"
                          className="hidden"
                          id="csv-upload"
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
                          onClick={() => document.getElementById('csv-upload')?.click()}
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
                          Preview ({csvData.length} deals imported)
                        </p>
                        <div className="text-xs text-muted-foreground max-h-32 overflow-y-auto">
                          Showing first 3 deals:
                          {csvData.slice(0, 3).map((deal, index) => (
                            <div key={index} className="mt-1 p-2 bg-muted rounded">
                              {Object.entries(fieldMapping).map(([standardField, csvField]) => 
                                csvField && deal[csvField] ? (
                                  <div key={standardField}>
                                    <span className="font-medium">{standardField}:</span> {deal[csvField]}
                                  </div>
                                ) : null
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <FormField
                    control={csvForm.control}
                    name="mappingConfirmed"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            I confirm the field mapping is correct
                          </FormLabel>
                          <FormDescription>
                            This will be used to populate your deals in Crannies
                          </FormDescription>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-3">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-4">
                        💡 You can always import deals later from your dashboard
                      </p>
                    </div>
                    
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => setStep(2)}
                      >
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        Back
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="flex-1"
                        onClick={handleCsvSkip}
                      >
                        Skip for Now
                      </Button>
                      <Button 
                        type="button" 
                        className="flex-1" 
                        disabled={csvData.length === 0}
                        onClick={() => {
                          // Manual validation and submission
                          if (csvData.length === 0) {
                            toast({
                              title: "Error",
                              description: "Please upload a CSV file first",
                              variant: "destructive",
                            });
                            return;
                          }

                          // Check required fields
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

                          // Set the checkbox and proceed
                          csvForm.setValue('mappingConfirmed', true);
                          
                          // Map CSV data to standard format
                          const mappedDeals = csvData.map(row => {
                            const mappedDeal: any = {};
                            Object.entries(fieldMapping).forEach(([standardField, csvField]) => {
                              if (csvField) {
                                // Convert dealValue to integer if it's the dealValue field
                                if (standardField === 'dealValue' && row[csvField]) {
                                  mappedDeal[standardField] = parseInt(row[csvField].toString()) || null;
                                } else {
                                  mappedDeal[standardField] = row[csvField];
                                }
                              }
                            });
                            return mappedDeal;
                          });

                          // Calculate pricing
                          const price = Math.max(29, mappedDeals.length * 2);
                          setCalculatedPrice(price);

                          csvForm.setValue('dealsData', mappedDeals);
                          setStep(5);
                        }}
                      >
                        Upload & Continue
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {/* Step 5: Terms & Conditions */}
        {step === 5 && (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                {getStepIcon()}
              </div>
              <CardTitle className="text-2xl">{getStepTitle()}</CardTitle>
              <CardDescription>
                Please review and accept our Terms and Conditions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...termsForm}>
                <form onSubmit={termsForm.handleSubmit(handleTermsSubmit)} className="space-y-6">
                  <div className="space-y-4">
                    <div className="h-64 overflow-y-auto border rounded-lg p-4 bg-muted/50">
                      <h3 className="font-semibold mb-2">Terms and Conditions</h3>
                      <div className="text-sm space-y-2">
                        <p>By using Crannies, you agree to these terms:</p>
                        <p><strong>1. Service Usage:</strong> Crannies provides CRM and deal management services. You are responsible for maintaining the accuracy of your data.</p>
                        <p><strong>2. Data Security:</strong> We implement industry-standard security measures to protect your data, but you are responsible for maintaining proper access controls.</p>
                        <p><strong>3. Billing:</strong> You agree to pay the monthly fees as calculated based on your number of active deals. Invoices are due within 7 days of receipt.</p>
                        <p><strong>4. Data Ownership:</strong> You retain ownership of all data you upload to Crannies.</p>
                        <p><strong>5. Service Availability:</strong> While we strive for 99.9% uptime, we cannot guarantee uninterrupted service.</p>
                        <p><strong>6. Limitation of Liability:</strong> Our liability is limited to the amount you paid in the preceding month.</p>
                        <p><strong>7. Termination:</strong> You may cancel your account at any time. Data export will be available for 30 days after termination.</p>
                        <p><strong>8. Compliance:</strong> You are responsible for ensuring your use of Crannies complies with applicable laws and regulations.</p>
                      </div>
                    </div>
                  </div>

                  <FormField
                    control={termsForm.control}
                    name="termsAccepted"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            I have read and accept the Terms and Conditions
                          </FormLabel>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setStep(3)}
                    >
                      <ChevronLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                    <Button type="submit" className="flex-1">
                      Continue
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {/* Step 6: Data Processing Agreement */}
        {step === 6 && (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                {getStepIcon()}
              </div>
              <CardTitle className="text-2xl">{getStepTitle()}</CardTitle>
              <CardDescription>
                Review our Data Processing Agreement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...dpaForm}>
                <form onSubmit={dpaForm.handleSubmit(handleDpaSubmit)} className="space-y-6">
                  <div className="space-y-4">
                    <div className="h-64 overflow-y-auto border rounded-lg p-4 bg-muted/50">
                      <h3 className="font-semibold mb-2">Data Processing Agreement</h3>
                      <div className="text-sm space-y-2">
                        <p>This Data Processing Agreement ("DPA") governs how Crannies processes personal data on your behalf.</p>
                        <p><strong>Data Controller:</strong> You act as the data controller for personal data processed through Crannies.</p>
                        <p><strong>Data Processor:</strong> Crannies acts as the data processor for this personal data.</p>
                        <p><strong>Subject Matter:</strong> The processing of personal data through the Crannies CRM platform.</p>
                        <p><strong>Duration:</strong> Processing will continue for as long as you use Crannies services.</p>
                        <p><strong>Nature and Purpose:</strong> Processing of personal data for CRM and deal management purposes.</p>
                        <p><strong>Types of Personal Data:</strong> May include names, email addresses, phone numbers, job titles, company information, and deal-related data.</p>
                        <p><strong>Data Subject Categories:</strong> Your contacts, leads, customers, and employees whose data you process.</p>
                        <p><strong>Processor Obligations:</strong> Crannies will:</p>
                        <ul className="list-disc ml-4 space-y-1">
                          <li>Process personal data only on documented instructions</li>
                          <li>Ensure confidentiality of persons authorized to process personal data</li>
                          <li>Implement appropriate technical and organizational security measures</li>
                          <li>Assist with data subject rights requests</li>
                          <li>Delete or return personal data upon termination</li>
                        </ul>
                        <p><strong>Subprocessors:</strong> We may use subprocessors who will be bound by equivalent data protection obligations.</p>
                        <p><strong>International Transfers:</strong> Data may be transferred internationally with appropriate safeguards in place.</p>
                      </div>
                    </div>
                  </div>

                  <FormField
                    control={dpaForm.control}
                    name="dpaAccepted"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            I have read and accept the Data Processing Agreement
                          </FormLabel>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setStep(6)}
                    >
                      <ChevronLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                    <Button type="submit" className="flex-1">
                      Continue
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {/* Step 7: Pricing and Signature */}
        {step === 7 && (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                {getStepIcon()}
              </div>
              <CardTitle className="text-2xl">{getStepTitle()}</CardTitle>
              <CardDescription>
                Review your pricing and sign the payment agreement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...pricingForm}>
                <form onSubmit={pricingForm.handleSubmit(handlePricingSubmit)} className="space-y-6">
                  <div className="space-y-4">
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <h3 className="font-semibold mb-2">Your Pricing</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Active Deals:</span>
                          <span>{csvData.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Rate per Deal:</span>
                          <span>$2.00</span>
                        </div>
                        <div className="border-t pt-2 flex justify-between font-semibold">
                          <span>Monthly Price:</span>
                          <span>${calculatedPrice}.00</span>
                        </div>
                      </div>
                    </div>

                    <div className="border rounded-lg p-4">
                      <h3 className="font-semibold mb-2">Payment Agreement</h3>
                      <div className="text-sm space-y-2 mb-4">
                        <p>By signing below, I agree to:</p>
                        <ul className="list-disc ml-4 space-y-1">
                          <li>Pay the monthly subscription fee of ${calculatedPrice}.00</li>
                          <li>Pay all invoices within 7 days of receipt</li>
                          <li>Allow automatic billing via the provided payment method</li>
                          <li>Notify Crannies of any changes to billing information</li>
                          <li>Understand that pricing may change with 30 days notice</li>
                        </ul>
                        <p className="mt-4">
                          Email for invoices and notices: <strong>{userEmail}{workspaceData?.companyName ? `@${workspaceData.companyName.toLowerCase().replace(/\s+/g, '')}.com` : workspaceData?.billingEmail}</strong>
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signature">Electronic Agreement</Label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg bg-white p-4">
                          <div className="text-sm text-gray-600">
                            By checking the agreement box below, you electronically sign this payment agreement and agree to the terms outlined above.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <FormField
                    control={pricingForm.control}
                    name="agreementSigned"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            I have reviewed my pricing and sign the payment agreement
                          </FormLabel>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setStep(6)}
                    >
                      <ChevronLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                    <Button 
                      type="submit"
                      className="flex-1"
                      disabled={completeOnboardingMutation.isPending}
                    >
                      {completeOnboardingMutation.isPending ? (
                        "Setting up..."
                      ) : (
                        <>
                          Complete Setup
                          <Check className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
