// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}

		interface Env {
			SALESFORCE_CLIENT_ID: string;
			SALESFORCE_CLIENT_SECRET: string;
			SALESFORCE_CALLBACK_URL: string;
			SALESFORCE_LOGIN_URL: string;
		}
	}
}

export {};

