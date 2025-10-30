import favicons from 'favicons';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const source = path.join(__dirname, '../static/salesduck.svg');
const outputDir = path.join(__dirname, '../static');

const configuration = {
	path: '/',
	appName: 'Duckforce',
	appShortName: 'Duckforce',
	appDescription: 'Salesforce Migration Tracker',
	developerName: 'Duckforce Team',
	developerURL: null,
	dir: 'auto',
	lang: 'en-US',
	background: '#03565B',
	theme_color: '#03565B',
	appleStatusBarStyle: 'black-translucent',
	display: 'standalone',
	orientation: 'any',
	scope: '/',
	start_url: '/',
	preferRelatedApplications: false,
	relatedApplications: undefined,
	version: '1.0',
	pixel_art: false,
	loadManifestWithCredentials: false,
	manifestMaskable: false,
	icons: {
		android: true,
		appleIcon: true,
		appleStartup: false,
		favicons: true,
		windows: true,
		yandex: false
	}
};

async function generateFavicons() {
	try {
		console.log('🦆 Generating favicons from salesduck.svg...');
		
		const response = await favicons(source, configuration);
		
		// Save images
		console.log(`📦 Saving ${response.images.length} images...`);
		await Promise.all(
			response.images.map(async (image) => {
				const filePath = path.join(outputDir, image.name);
				await fs.writeFile(filePath, image.contents);
				console.log(`  ✓ ${image.name}`);
			})
		);
		
		// Save files (like manifest.json, browserconfig.xml)
		console.log(`📄 Saving ${response.files.length} files...`);
		await Promise.all(
			response.files.map(async (file) => {
				const filePath = path.join(outputDir, file.name);
				await fs.writeFile(filePath, file.contents);
				console.log(`  ✓ ${file.name}`);
			})
		);
		
		// Save HTML snippets to a reference file
		const htmlPath = path.join(outputDir, 'favicon-html.txt');
		await fs.writeFile(htmlPath, response.html.join('\n'));
		console.log(`\n📝 HTML snippets saved to: favicon-html.txt`);
		console.log('\n✨ Favicons generated successfully!');
		console.log('\n📋 Next steps:');
		console.log('1. Copy the HTML snippets from static/favicon-html.txt');
		console.log('2. Add them to src/app.html in the <head> section');
		
	} catch (error) {
		console.error('❌ Error generating favicons:', error);
		process.exit(1);
	}
}

generateFavicons();

