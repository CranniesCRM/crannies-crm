import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CircleDot, Users, MessageSquare, Zap, Shield, Globe, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const features = [
  {
    icon: CircleDot,
    title: "GitHub-Style Issues",
    description: "Manage deals and contacts as collaborative issues with full activity tracking.",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description: "Bring Sales, Marketing, Design, and everyone together in unified discussions.",
  },
  {
    icon: MessageSquare,
    title: "Client Chat Rooms",
    description: "Publish secure chat areas to collaborate directly with leads and clients.",
  },
  {
    icon: Zap,
    title: "@Mentions",
    description: "Tag team members instantly and keep everyone in the loop with notifications.",
  },
  {
    icon: Shield,
    title: "Secure Access",
    description: "Passcode-protected client portals with enterprise-grade security.",
  },
  {
    icon: Globe,
    title: "Real-time Updates",
    description: "See changes as they happen with live collaboration across your team.",
  },
];

export default function Landing() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        toast({
          title: "Check your email",
          description: "We've sent you a magic link to sign in.",
        });
        setIsDialogOpen(false);
        setEmail("");
      } else {
        toast({
          title: "Error",
          description: "Failed to send login link. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <div className="min-h-screen bg-background">
        <header className="border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <div className="text-2xl font-bold bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-lg px-3 py-1">
                  C
                </div>
                <span className="text-lg font-semibold">Crannies</span>
              </div>
              <DialogTrigger asChild>
                <Button data-testid="button-login">Sign In</Button>
              </DialogTrigger>
            </div>
          </div>
        </header>

        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign in to Crannies</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Sending..." : "Send Magic Link"}
              <Mail className="ml-2 h-4 w-4" />
            </Button>
          </form>
        </DialogContent>

      <main>
        <section className="py-20 sm:py-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
              Your CRM, Reimagined as
              <span className="text-primary block mt-2">Collaborative Issues</span>
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-lg sm:text-xl text-muted-foreground">
              Crannies brings the power of GitHub's collaborative workflow to your CRM. 
              Manage deals, track conversations, and collaborate with your entire team 
              in one unified platform.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <DialogTrigger asChild>
                <Button size="lg" data-testid="button-get-started">Get Started Free</Button>
              </DialogTrigger>
              <Button size="lg" variant="outline" data-testid="button-learn-more">
                Learn More
              </Button>
            </div>
          </div>
        </section>

        <section className="py-20 bg-card/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold">
                Everything Your Team Needs
              </h2>
              <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                Crannies combines CRM functionality with the collaborative power 
                that teams love about GitHub.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature) => (
                <Card key={feature.title} className="hover-elevate">
                  <CardContent className="p-6">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-6">
              Ready to Transform Your CRM?
            </h2>
            <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
              Join teams who have already discovered a better way to manage 
              deals and collaborate with clients.
            </p>
            <DialogTrigger asChild>
              <Button size="lg" data-testid="button-start-free">Start Free Today</Button>
            </DialogTrigger>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="text-lg font-bold bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-lg px-2 py-1">
                C
              </div>
              <span className="font-semibold">Crannies</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Built for teams who want to work better together.
            </p>
          </div>
        </div>
      </footer>
    </div>
  </Dialog>
);
}
