/**
 * Test script to sync organization and refresh components
 * 
 * Usage:
 *   node test-sync.js <orgId>
 * 
 * Example:
 *   node test-sync.js 00DHp00000DynwYMAR
 */

const orgId = process.argv[2];

if (!orgId) {
	console.error('Error: Please provide an organization ID');
	console.error('Usage: node test-sync.js <orgId>');
	process.exit(1);
}

const url = `http://localhost:5173/api/orgs/${orgId}/sync?refreshComponents=true`;

console.log(`Syncing organization: ${orgId}`);
console.log(`URL: ${url}`);
console.log('');

fetch(url, {
	method: 'POST',
	headers: {
		'Content-Type': 'application/json'
	}
})
	.then(async (response) => {
		const data = await response.json();
		
		if (!response.ok) {
			console.error('Error:', data);
			process.exit(1);
		}
		
		console.log('Success!');
		console.log(JSON.stringify(data, null, 2));
	})
	.catch((error) => {
		console.error('Request failed:', error.message);
		process.exit(1);
	});

