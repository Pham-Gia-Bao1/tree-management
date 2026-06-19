
export interface MessageRecord {
    id: string;
    conversationId: string;
    senderId: string;
    senderName?: string;
    content: string;
    isRead: boolean;
    createdAt: string;
}

export interface MessageInput {
    fromId: string;
    toId: string;
    content: string;
}

export interface ConversationThreadResponse {
    conversationId: string | null;
    messages: MessageRecord[];
}
