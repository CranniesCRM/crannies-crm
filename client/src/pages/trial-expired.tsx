import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CreditCard } from "lucide-react";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function TrialExpired() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/create-checkout-session");
      window.location.href = response.url;
    } catch (error) {
      console.error("Error creating checkout session:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start checkout. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Trial Expired</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Your 7-day trial has expired. Upgrade to continue using Crannies CRM.
          </p>
          <div className="space-y-2">
            <Button
              className="w-full"
              size="lg"
              onClick={handleUpgrade}
              disabled={isLoading}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              {isLoading ? "Loading..." : "Upgrade Now"}
            </Button>
            <p className="text-sm text-muted-foreground">
              Contact support if you need assistance
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}