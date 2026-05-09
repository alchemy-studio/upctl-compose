export interface HtyUser {
  hty_id: string
  real_name?: string
  union_id?: string
  enabled: boolean
  infos?: HtyUserApp[]
  meta?: { nickName?: string; avatarUrl?: string }
  tags?: HtyTag[]
  unread_tongzhi_count?: number
  avatar_url?: string
  is_registered?: boolean
  reject_reason?: string
  login?: string
}

export interface HtyUserApp {
  id: string
  app_id?: string
  hty_id: string
  is_registered: boolean
  username?: string
  roles: HtyRole[]
}

export interface HtyRole {
  hty_role_id: string
  role_key: string
  role_name?: string
  role_desc?: string
  role_status?: string
}

export interface HtyTag {
  tag_id: string
  tag_name: string
}

export interface HtyApp {
  app_id: string
  app_key: string
  app_name: string
}
