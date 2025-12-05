export interface ConversationAuthor {
  type: "internal" | "vendor" | "contact";
  name: string;
  email?: string | null;
  avatarUrl?: string | null;
  company?: string | null;
  companyLogo?: string | null;
}

export interface ConversationMessage {
  id: string;
  content: string;
  parentMessageId: string | null;
  rootMessageId: string | null;
  createdAt: string;
  updatedAt: string;
  author: ConversationAuthor;
}

export interface ConversationResponse<TContext = Record<string, unknown>> {
  context: TContext;
  viewer: ConversationAuthor;
  messages: ConversationMessage[];
}
