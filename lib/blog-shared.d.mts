export declare const BLOG_STATUSES: string[];
export declare const BLOG_STATUS_TRANSITIONS: Record<string, string[]>;
export declare function canTransition(from: string, to: string): boolean;
export declare type AdminRole = "admin" | "editor";
export declare type StatusAction = {
  to: string;
  label: string;
  roles: AdminRole[];
  confirm: boolean;
  needsDate?: boolean;
};
export declare const STATUS_ACTIONS: Record<string, StatusAction[]>;
export declare function actionsForStatus(status: string, role: AdminRole): StatusAction[];
export declare function slugify(input: string): string;
export declare function validateBlogPatch(input: Record<string, unknown>):
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; errors: string[] };
export declare function seoWarnings(patch: Record<string, unknown>): string[];
