export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          type: 'lab' | 'hospital' | 'clinic';
          settings: {
            default_language: 'en' | 'ur';
            auto_translate: boolean;
          };
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          type?: 'lab' | 'hospital' | 'clinic';
          settings?: {
            default_language: 'en' | 'ur';
            auto_translate: boolean;
          };
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          type?: 'lab' | 'hospital' | 'clinic';
          settings?: {
            default_language: 'en' | 'ur';
            auto_translate: boolean;
          };
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      users: {
        Row: {
          id: string;
          email: string;
          role: 'admin' | 'director' | 'pathologist' | 'technician';
          profile: {
            first_name: string;
            last_name: string;
            title?: string;
            specialization?: string;
          };
          organization_id: string;
          branch: string | null;
          is_active: boolean;
          last_login: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string; // Must match Supabase Auth user ID
          email: string;
          role?: 'admin' | 'director' | 'pathologist' | 'technician';
          profile?: {
            first_name: string;
            last_name: string;
            title?: string;
            specialization?: string;
          };
          organization_id: string;
          branch?: string | null;
          is_active?: boolean;
          last_login?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          role?: 'admin' | 'director' | 'pathologist' | 'technician';
          profile?: {
            first_name: string;
            last_name: string;
            title?: string;
            specialization?: string;
          };
          organization_id?: string;
          branch?: string | null;
          is_active?: boolean;
          last_login?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      reports: {
        Row: {
          id: string;
          organization_id: string;
          uploaded_by: string | null;
          original_file: {
            name: string;
            type: 'pdf' | 'docx';
            size: number;
            path: string;
            bucket: string;
            uploaded_at: string;
          };
          extracted_content: {
            raw_text: string;
            extracted_at: string;
          } | null;
          ai_analysis: {
            status: 'pending' | 'processing' | 'completed' | 'failed';
            started_at?: string;
            completed_at?: string;
            classification?: 'normal' | 'abnormal' | 'critical';
            findings?: Array<{
              category: string;
              description: string;
              severity: 'info' | 'warning' | 'critical';
            }>;
            draft_report?: {
              summary: string;
              details: string;
            };
            error?: string;
          };
          review: {
            status: 'pending' | 'approved' | 'adjustment_required';
            pathologist_findings?: string;
            reviewed_by?: string;
            reviewed_at?: string;
          };
          muaina_interpretation: {
            summary: string;
            medical_condition: {
              name: string;
              description: string;
              severity: 'mild' | 'moderate' | 'severe';
              icd_code?: string;
            };
            precautions: string[];
            diet: string[];
            consultation: {
              follow_up_timing: string;
              booking_info: string;
              urgency: 'routine' | 'soon' | 'urgent';
            };
            medical_recommendations: string[];
            dos: string[];
            donts: string[];
            lifestyle_changes: string[];
            suggested_doctors: Array<{
              name: string;
              specialty: string;
              qualification: string;
              availability: string;
              contact: string;
              location: string;
              consultation_fee?: string;
            }>;
            doctor_recommendations: Array<{
              specialty: string;
              reason: string;
              urgency: 'routine' | 'soon' | 'urgent';
            }>;
            generated_at: string;
          } | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          uploaded_by?: string | null;
          original_file: {
            name: string;
            type: 'pdf' | 'docx';
            size: number;
            path: string;
            bucket: string;
            uploaded_at: string;
          };
          extracted_content?: {
            raw_text: string;
            extracted_at: string;
          } | null;
          ai_analysis?: {
            status: 'pending' | 'processing' | 'completed' | 'failed';
            started_at?: string;
            completed_at?: string;
            classification?: 'normal' | 'abnormal' | 'critical';
            findings?: Array<{
              category: string;
              description: string;
              severity: 'info' | 'warning' | 'critical';
            }>;
            draft_report?: {
              summary: string;
              details: string;
            };
            error?: string;
          };
          review?: {
            status: 'pending' | 'approved' | 'adjustment_required';
            pathologist_findings?: string;
            reviewed_by?: string;
            reviewed_at?: string;
          };
          muaina_interpretation?: {
            summary: string;
            medical_condition: {
              name: string;
              description: string;
              severity: 'mild' | 'moderate' | 'severe';
              icd_code?: string;
            };
            precautions: string[];
            diet: string[];
            consultation: {
              follow_up_timing: string;
              booking_info: string;
              urgency: 'routine' | 'soon' | 'urgent';
            };
            medical_recommendations: string[];
            dos: string[];
            donts: string[];
            lifestyle_changes: string[];
            suggested_doctors: Array<{
              name: string;
              specialty: string;
              qualification: string;
              availability: string;
              contact: string;
              location: string;
              consultation_fee?: string;
            }>;
            doctor_recommendations: Array<{
              specialty: string;
              reason: string;
              urgency: 'routine' | 'soon' | 'urgent';
            }>;
            generated_at: string;
          } | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          uploaded_by?: string | null;
          original_file?: {
            name: string;
            type: 'pdf' | 'docx';
            size: number;
            path: string;
            uploaded_at: string;
          };
          extracted_content?: {
            raw_text: string;
            extracted_at: string;
          } | null;
          ai_analysis?: {
            status: 'pending' | 'processing' | 'completed' | 'failed';
            started_at?: string;
            completed_at?: string;
            classification?: 'normal' | 'abnormal' | 'critical';
            findings?: Array<{
              category: string;
              description: string;
              severity: 'info' | 'warning' | 'critical';
            }>;
            draft_report?: {
              summary: string;
              details: string;
            };
            error?: string;
          };
          review?: {
            status: 'pending' | 'approved' | 'adjustment_required';
            pathologist_findings?: string;
            reviewed_by?: string;
            reviewed_at?: string;
          };
          muaina_interpretation?: {
            summary: string;
            medical_condition: {
              name: string;
              description: string;
              severity: 'mild' | 'moderate' | 'severe';
              icd_code?: string;
            };
            precautions: string[];
            diet: string[];
            consultation: {
              follow_up_timing: string;
              booking_info: string;
              urgency: 'routine' | 'soon' | 'urgent';
            };
            medical_recommendations: string[];
            dos: string[];
            donts: string[];
            lifestyle_changes: string[];
            suggested_doctors: Array<{
              name: string;
              specialty: string;
              qualification: string;
              availability: string;
              contact: string;
              location: string;
              consultation_fee?: string;
            }>;
            doctor_recommendations: Array<{
              specialty: string;
              reason: string;
              urgency: 'routine' | 'soon' | 'urgent';
            }>;
            generated_at: string;
          } | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      doctors: {
        Row: {
          id: string;
          name: string;
          specialty: string;
          qualification: string;
          years_of_practice: number | null;
          appointment_location: string | null;
          is_available_online: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          specialty: string;
          qualification: string;
          years_of_practice?: number | null;
          appointment_location?: string | null;
          is_available_online?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          specialty?: string;
          qualification?: string;
          years_of_practice?: number | null;
          appointment_location?: string | null;
          is_available_online?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}

// Helper types
export type Organization = Database['public']['Tables']['organizations']['Row'];
export type User = Database['public']['Tables']['users']['Row'];
export type Report = Database['public']['Tables']['reports']['Row'];
export type Doctor = Database['public']['Tables']['doctors']['Row'];
