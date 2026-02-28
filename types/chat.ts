export interface Message {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: {
    full_name: string;
    avatar_url: string;
  };
}

export interface Room {
  id: string;
  name: string;
  is_private?: boolean;
  user_id_1?: string;
  user_id_2?: string;
}
