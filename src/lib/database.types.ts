export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      history_records: {
        Row: {
          id: string
          type: string
          title: string
          modelName: string
          status: string
          createdAt: string
          updatedAt: string
          tags: string[]
          content: Json
        }
        Insert: {
          id?: string
          type: string
          title: string
          modelName: string
          status?: string
          createdAt?: string
          updatedAt?: string
          tags?: string[]
          content?: Json
        }
        Update: {
          id?: string
          type?: string
          title?: string
          modelName?: string
          status?: string
          updatedAt?: string
          tags?: string[]
          content?: Json
        }
      }
      media_files: {
        Row: {
          id: string
          historyId: string
          fileName: string
          mimeType: string
          size: number
          url: string
          thumbnailUrl?: string
          createdAt: string
        }
        Insert: {
          id?: string
          historyId: string
          fileName: string
          mimeType: string
          size: number
          url: string
          thumbnailUrl?: string
          createdAt?: string
        }
        Update: {
          id?: string
          historyId?: string
          fileName?: string
          mimeType?: string
          size?: number
          url?: string
          thumbnailUrl?: string
        }
      }
      tags: {
        Row: {
          id: string
          name: string
          color: string
          createdAt: string
        }
        Insert: {
          id?: string
          name: string
          color: string
          createdAt?: string
        }
        Update: {
          id?: string
          name?: string
          color?: string
        }
      }
      app_settings: {
        Row: {
          key: string
          value: Json
          updatedAt: string
        }
        Insert: {
          key: string
          value: Json
          updatedAt?: string
        }
        Update: {
          value?: Json
          updatedAt?: string
        }
      }
    }
    Views: {
      // 在这里定义你的视图
    }
    Functions: {
      // 在这里定义你的函数
    }
  }
} 