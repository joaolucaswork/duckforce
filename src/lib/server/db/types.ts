/**
 * Type definitions for database operations
 * 
 * These types extend the auto-generated database types with
 * additional helper types for common operations.
 */

import type { Database } from '../supabase/database.types';

// Organization types
export type Organization = Database['public']['Tables']['organizations']['Row'];
export type OrganizationInsert = Database['public']['Tables']['organizations']['Insert'];
export type OrganizationUpdate = Database['public']['Tables']['organizations']['Update'];

// Active session types
export type ActiveSession = Database['public']['Tables']['active_session']['Row'];
export type ActiveSessionInsert = Database['public']['Tables']['active_session']['Insert'];
export type ActiveSessionUpdate = Database['public']['Tables']['active_session']['Update'];

// Salesforce component types
export type SalesforceComponent = Database['public']['Tables']['salesforce_components']['Row'];
export type ComponentInsert = Database['public']['Tables']['salesforce_components']['Insert'];
export type ComponentUpdate = Database['public']['Tables']['salesforce_components']['Update'];

// Component notes types
export type ComponentNote = Database['public']['Tables']['component_notes']['Row'];
export type ComponentNoteInsert = Database['public']['Tables']['component_notes']['Insert'];
export type ComponentNoteUpdate = Database['public']['Tables']['component_notes']['Update'];

// Kanban boards types
export type KanbanBoard = Database['public']['Tables']['kanban_boards']['Row'];
export type KanbanBoardInsert = Database['public']['Tables']['kanban_boards']['Insert'];
export type KanbanBoardUpdate = Database['public']['Tables']['kanban_boards']['Update'];

// Extended types with relations
export interface ActiveSessionWithOrg extends ActiveSession {
	organization?: Organization | null;
}

// Helper types for API responses
export interface OrganizationResponse {
	id: string;
	org_id: string;
	org_name: string;
	instance_url: string;
	org_type: 'production' | 'sandbox' | 'developer' | 'scratch';
	color: string | null;
	icon: string | null;
	api_version: string;
	last_connected_at: string;
	last_synced_at: string | null;
	is_active?: boolean;
}

export interface ComponentResponse {
	id: string;
	component_id: string;
	api_name: string;
	name: string;
	type: 'lwc' | 'field' | 'object' | 'apex' | 'trigger' | 'visualforce' | 'flow';
	description: string | null;
	namespace: string | null;
	migration_status: 'pending' | 'in-progress' | 'completed' | 'blocked' | 'skipped';
	migration_date: string | null;
	dependencies: any;
	dependents: any;
	metadata: any;
}

export interface ComponentNoteResponse {
	id: string;
	component_id: string;
	content: string;
	is_todo: boolean;
	created_at: string;
	updated_at: string;
	user_email: string;
	user_name: string | null;
}

export interface KanbanBoardResponse {
	id: string;
	columns: Array<{
		columnId: string;
		componentIds: string[];
	}>;
	updated_at: string;
}

