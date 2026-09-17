import { api } from "./api";

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_user_id: string;
  sender_role: "CUSTOMER" | "WORKER";
  sender_name: string;
  message_text: string;
  created_at: string;
  read_at: string | null;
}

export interface ChatConversation {
  id: string;
  job_id: string;
  customer_id: string;
  worker_id: string;
  created_at: string;
  updated_at: string;
  worker?: {
    id: string;
    full_name: string;
    profile_photo_url: string | null;
    primary_trade: string | null;
    phone: string;
  };
  customer?: {
    id: string;
    full_name: string;
    company_name: string | null;
    phone: string;
  };
}

export interface ChatMessagesResponse {
  messages: ChatMessage[];
}

export const chatService = {
  getConversation: (jobId: string) => 
    api.get<{ data: ChatConversation }>(`/api/jobs/${jobId}/conversation`),
  
  getMessages: (jobId: string) => 
    api.get<{ data: ChatMessagesResponse }>(`/api/jobs/${jobId}/messages`),
  
  sendMessage: (jobId: string, messageText: string) => 
    api.post<{ data: ChatMessage }>(`/api/jobs/${jobId}/messages`, { message_text: messageText }),
};
