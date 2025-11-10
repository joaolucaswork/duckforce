/**
 * Database type definitions for Supabase
 * 
 * These types are generated based on the database schema.
 * Update this file when the database schema changes.
 */

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
					user_id: string;
					org_id: string;
					instance_url: string;
					org_name: string;
					org_type: 'production' | 'sandbox' | 'developer' | 'scratch';
					color: string | null;
					icon: string | null;
					access_token: string | null;
					refresh_token: string | null;
					token_expires_at: string | null;
					oauth_client_id: string | null;
					api_version: string;
					last_connected_at: string;
					last_synced_at: string | null;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					user_id: string;
					org_id: string;
					instance_url: string;
					org_name: string;
					org_type: 'production' | 'sandbox' | 'developer' | 'scratch';
					color?: string | null;
					icon?: string | null;
					access_token?: string | null;
					refresh_token?: string | null;
					token_expires_at?: string | null;
					oauth_client_id?: string | null;
					api_version?: string;
					last_connected_at?: string;
					last_synced_at?: string | null;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					user_id?: string;
					org_id?: string;
					instance_url?: string;
					org_name?: string;
					org_type?: 'production' | 'sandbox' | 'developer' | 'scratch';
					color?: string | null;
					icon?: string | null;
					access_token?: string | null;
					refresh_token?: string | null;
					token_expires_at?: string | null;
					oauth_client_id?: string | null;
					api_version?: string;
					last_connected_at?: string;
					last_synced_at?: string | null;
					created_at?: string;
					updated_at?: string;
				};
			};
			salesforce_components: {
				Row: {
					id: string;
					organization_id: string;
					component_id: string;
					api_name: string;
					name: string;
					type: 'lwc' | 'field' | 'object' | 'apex' | 'trigger' | 'visualforce' | 'flow';
					description: string | null;
					namespace: string | null;
					metadata: Json | null;
					dependencies: Json;
					dependents: Json;
					migration_status: 'pending' | 'in-progress' | 'completed' | 'blocked' | 'skipped';
					migration_date: string | null;
					migration_notes: string | null;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					organization_id: string;
					component_id: string;
					api_name: string;
					name: string;
					type: 'lwc' | 'field' | 'object' | 'apex' | 'trigger' | 'visualforce' | 'flow';
					description?: string | null;
					namespace?: string | null;
					metadata?: Json | null;
					dependencies?: Json;
					dependents?: Json;
					migration_status?: 'pending' | 'in-progress' | 'completed' | 'blocked' | 'skipped';
					migration_date?: string | null;
					migration_notes?: string | null;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					organization_id?: string;
					component_id?: string;
					api_name?: string;
					name?: string;
					type?: 'lwc' | 'field' | 'object' | 'apex' | 'trigger' | 'visualforce' | 'flow';
					description?: string | null;
					namespace?: string | null;
					metadata?: Json | null;
					dependencies?: Json;
					dependents?: Json;
					migration_status?: 'pending' | 'in-progress' | 'completed' | 'blocked' | 'skipped';
					migration_date?: string | null;
					migration_notes?: string | null;
					created_at?: string;
					updated_at?: string;
				};
			};
			active_session: {
				Row: {
					user_id: string;
					organization_id: string | null;
					access_token: string | null;
					refresh_token: string | null;
					instance_url: string | null;
					connected_at: string;
					expires_at: string | null;
					updated_at: string;
				};
				Insert: {
					user_id: string;
					organization_id?: string | null;
					access_token?: string | null;
					refresh_token?: string | null;
					instance_url?: string | null;
					connected_at?: string;
					expires_at?: string | null;
					updated_at?: string;
				};
				Update: {
					user_id?: string;
					organization_id?: string | null;
					access_token?: string | null;
					refresh_token?: string | null;
					instance_url?: string | null;
					connected_at?: string;
					expires_at?: string | null;
					updated_at?: string;
				};
			};
			component_notes: {
				Row: {
					id: string;
					user_id: string;
					component_id: string;
					content: string;
					is_todo: boolean;
					is_archived: boolean;
					archived_at: string | null;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					user_id: string;
					component_id: string;
					content: string;
					is_todo?: boolean;
					is_archived?: boolean;
					archived_at?: string | null;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					user_id?: string;
					component_id?: string;
					content?: string;
					is_todo?: boolean;
					is_archived?: boolean;
					archived_at?: string | null;
					created_at?: string;
					updated_at?: string;
				};
			};
		};
		Views: {};
		Functions: {};
		Enums: {};
	};
}

