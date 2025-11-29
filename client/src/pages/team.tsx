import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { UserPlus, Mail, Star, Users } from "lucide-react";
import type { User, Invite } from "@shared/schema";

function TeamMemberCard({ member }: { member: User }) {
  return (
    <Card className="hover-elevate">
      <CardContent className="p-6 text-center">
        <div className="relative inline-block mb-4">
          <Avatar className="h-20 w-20">
            <AvatarImage
              src={member.profileImageUrl || undefined}
              className="object-cover"
            />
            <AvatarFallback className="text-2xl bg-primary/10 text-primary">
              {member.firstName?.[0] || "?"}
              {member.lastName?.[0] || ""}
            </AvatarFallback>
          </Avatar>
          {member.isAdmin && (
            <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-amber-500 flex items-center justify-center">
              <Star className="h-3.5 w-3.5 text-white fill-white" />
            </div>
          )}
        </div>
        <h3 className="font-semibold text-lg">
          {member.firstName} {member.lastName}
        </h3>
        <p className="text-sm text-muted-foreground">{member.role || "Team Member"}</p>
        {member.teamName && (
          <Badge variant="secondary" className="mt-2">
            {member.teamName}
          </Badge>
        )}
        <div className="mt-4">
          <Button variant="outline" size="sm" className="w-full" asChild>
            <a href={`mailto:${member.email}`}>
              <Mail className="mr-2 h-4 w-4" />
              Email
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function InviteDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [email, setEmail] = useState("");
  const { toast } = useToast();

  const inviteMutation = useMutation({
    mutationFn: async (email: string) => {
      return await apiRequest("POST", "/api/invites", { email });
    },
    onSuccess: () => {
      toast({
        title: "Invitation sent",
        description: "An invitation email has been sent to the new team member.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/invites"] });
      onOpenChange(false);
      setEmail("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation",
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Send an invitation to add a new member to your workspace. They'll need
            to complete the onboarding process.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <label className="text-sm font-medium mb-2 block">Email Address</label>
          <Input
            type="email"
            placeholder="colleague@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            data-testid="input-invite-email"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => inviteMutation.mutate(email)}
            disabled={!email || inviteMutation.isPending}
            data-testid="button-send-invite"
          >
            {inviteMutation.isPending ? "Sending..." : "Send Invitation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PendingInviteCard({ invite }: { invite: Invite }) {
  const { toast } = useToast();

  const cancelInviteMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/invites/${invite.id}`);
    },
    onSuccess: () => {
      toast({
        title: "Invitation cancelled",
        description: "The invitation has been cancelled.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/invites"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel invitation",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-muted text-muted-foreground">
            {invite.email[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{invite.email}</p>
          <p className="text-sm text-muted-foreground">
            Invited{" "}
            {invite.createdAt &&
              new Date(invite.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="secondary">Pending</Badge>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => cancelInviteMutation.mutate()}
          disabled={cancelInviteMutation.isPending}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

export default function Team() {
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const { user } = useAuth();

  const { data: teamMembers, isLoading: membersLoading } = useQuery<User[]>({
    queryKey: ["/api/team"],
  });

  const { data: pendingInvites, isLoading: invitesLoading } = useQuery<Invite[]>({
    queryKey: ["/api/invites"],
    enabled: user?.isAdmin || false,
  });

  const groupedMembers = teamMembers?.reduce(
    (acc, member) => {
      const team = member.teamName || "Other";
      if (!acc[team]) acc[team] = [];
      acc[team].push(member);
      return acc;
    },
    {} as Record<string, User[]>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-team-title">Team</h1>
          <p className="text-muted-foreground mt-1">
            Your workspace members and their roles
          </p>
        </div>
        {user?.isAdmin && (
          <Button onClick={() => setInviteDialogOpen(true)} data-testid="button-invite-member">
            <UserPlus className="mr-2 h-4 w-4" />
            Invite Member
          </Button>
        )}
      </div>

      <InviteDialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen} />

      {user?.isAdmin && pendingInvites && pendingInvites.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Pending Invitations</h2>
          <div className="space-y-3">
            {pendingInvites.map((invite) => (
              <PendingInviteCard key={invite.id} invite={invite} />
            ))}
          </div>
        </div>
      )}

      {membersLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6 text-center">
                <Skeleton className="h-20 w-20 rounded-full mx-auto mb-4" />
                <Skeleton className="h-5 w-32 mx-auto mb-2" />
                <Skeleton className="h-4 w-24 mx-auto" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : groupedMembers && Object.keys(groupedMembers).length > 0 ? (
        <div className="space-y-8">
          {Object.entries(groupedMembers).map(([team, members]) => (
            <div key={team}>
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold">{team}</h2>
                <Badge variant="secondary">{members.length}</Badge>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {members.map((member) => (
                  <TeamMemberCard key={member.id} member={member} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold mb-2">No team members yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Start building your team by inviting colleagues
          </p>
          {user?.isAdmin && (
            <Button onClick={() => setInviteDialogOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Invite Member
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
