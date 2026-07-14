import fs from 'node:fs/promises';
import path from 'node:path';

export async function mockProcessFile(inputPath, outputPath, provider) {
  try {
    const rawCode = await fs.readFile(inputPath, 'utf-8');

    // Simulate some simple rename process based on the provider
    let processedCode = rawCode;

    if (provider !== 'heuristic') {
        processedCode = processedCode.replace(/_0x[a-f0-9]+/g, (match) => {
            return `mock_${provider}_${match.substring(3)}`;
        });
    }

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, processedCode, 'utf-8');

    return {
        success: true,
        size: processedCode.length,
        code: processedCode
    };
  } catch (err) {
    console.error(`Mock error processing ${inputPath}:`, err);
    throw err;
  }
}
