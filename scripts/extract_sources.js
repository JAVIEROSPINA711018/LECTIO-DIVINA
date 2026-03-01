import { MCPClient } from '@modelcontextprotocol/sdk/client/mcp.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import fs from 'fs';
import path from 'path';

// Parsed sources
const sourcesData = JSON.parse(fs.readFileSync('/tmp/parsed_sources.json', 'utf8'));
const outputDir = path.resolve('/Users/javierospina/ANTIGRAVITY APPS/LECTIO DIVINA/src/data/fuentes_teologicas');

async function extractSources() {
    console.log(`Starting extraction of ${sourcesData.length} sources...`);

    // Connect to MCP
    const transport = new StdioClientTransport({
        command: 'npx',
        args: ['-y', '@google/notebooklm-mcp']
    });

    const client = new MCPClient({
        name: 'lectio-extractor',
        version: '1.0.0'
    });

    try {
        await client.connect(transport);
        console.log('Connected to NotebookLM MCP');

        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < sourcesData.length; i++) {
            const source = sourcesData[i];
            console.log(`[${i + 1}/${sourcesData.length}] Extracting: ${source.title}...`);

            try {
                // Sanitize filename
                const safeTitle = source.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                const filename = `${safeTitle.substring(0, 100)}_${source.id.substring(0, 8)}.txt`;
                const filepath = path.join(outputDir, filename);

                // Skip if already exists
                if (fs.existsSync(filepath)) {
                    console.log(`  -> Already extracting, skipping.`);
                    successCount++;
                    continue;
                }

                // Call MCP tool
                const result = await client.callTool({
                    name: 'source_get_content',
                    arguments: {
                        source_id: source.id
                    }
                });

                if (result.isError) {
                    console.error(`  -> ERROR: MCP returned error for ${source.id}`);
                    failCount++;
                    continue;
                }

                if (result.content && result.content[0] && result.content[0].text) {
                    // The text returned is a JSON string from the MCP
                    const contentData = JSON.parse(result.content[0].text);

                    if (contentData.content) {
                        fs.writeFileSync(filepath, contentData.content, 'utf8');
                        console.log(`  -> Saved accurately to ${filename}`);
                        successCount++;
                    } else {
                        console.log(`  -> Warning: No content field in response.`);
                        failCount++;
                    }
                }

            } catch (err) {
                console.error(`  -> Failed to extract ${source.title}:`, err.message);
                failCount++;
            }
        }

        console.log(`\nExtraction Complete!`);
        console.log(`Successfully saved: ${successCount}`);
        console.log(`Failed: ${failCount}`);

    } catch (e) {
        console.error('Fatal error:', e);
    } finally {
        await client.close();
        process.exit(0);
    }
}

extractSources();
