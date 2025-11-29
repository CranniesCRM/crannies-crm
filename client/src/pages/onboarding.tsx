import { useState } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Upload, User, Building2, Briefcase, ChevronRight, ChevronLeft, Check } from "lucide-react";
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

type UserProfileData = z.infer<typeof userProfileSchema>;
type WorkspaceData = z.infer<typeof workspaceSchema>;

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

interface OnboardingProps {
  isNewWorkspace?: boolean;
  inviteToken?: string;
}

export default function Onboarding({ isNewWorkspace = true, inviteToken }: OnboardingProps) {
  const [step, setStep] = useState(1);
  const [userData, setUserData] = useState<UserProfileData | null>(null);
  const { toast } = useToast();
  const totalSteps = isNewWorkspace ? 2 : 1;

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

  const completeOnboardingMutation = useMutation({
    mutationFn: async (data: { user: UserProfileData; workspace?: WorkspaceData }) => {
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
    if (isNewWorkspace) {
      setStep(2);
    } else {
      completeOnboardingMutation.mutate({ user: data });
    }
  };

  const handleWorkspaceSubmit = (data: WorkspaceData) => {
    if (userData) {
      completeOnboardingMutation.mutate({ user: userData, workspace: data });
    }
  };

  const getStepIndicator = () => {
    return (
      <div className="flex items-center justify-center gap-2 mb-8">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className={`h-2 w-2 rounded-full transition-colors ${
              i + 1 <= step ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>
    );
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

        {step === 1 && (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">Your Profile</CardTitle>
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
                        data-testid="input-profile-image"
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
                            <Input
                              placeholder="John"
                              {...field}
                              data-testid="input-first-name"
                            />
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
                            <Input
                              placeholder="Doe"
                              {...field}
                              data-testid="input-last-name"
                            />
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
                            <SelectTrigger data-testid="select-role">
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
                            <SelectTrigger data-testid="select-team">
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

                  <Button
                    type="submit"
                    className="w-full"
                    data-testid="button-continue"
                  >
                    {isNewWorkspace ? (
                      <>
                        Continue
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </>
                    ) : (
                      <>
                        Complete Setup
                        <Check className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {step === 2 && isNewWorkspace && (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">Your Workspace</CardTitle>
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
                        data-testid="input-company-logo"
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
                          <Input
                            placeholder="Acme Inc."
                            {...field}
                            data-testid="input-company-name"
                          />
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
                          <Input
                            type="email"
                            placeholder="billing@company.com"
                            {...field}
                            data-testid="input-billing-email"
                          />
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
                            <SelectTrigger data-testid="select-industry">
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
                            data-testid="input-company-bio"
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
                      data-testid="button-back"
                    >
                      <ChevronLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={completeOnboardingMutation.isPending}
                      data-testid="button-complete-setup"
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
