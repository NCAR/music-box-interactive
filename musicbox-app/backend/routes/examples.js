// Examples API Routes
// Provides pre-configured example simulations

import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Candidate roots for example configs.
// Prefer local project configs first, then fall back to installed package examples.
const EXAMPLES_BASE_PATHS = [
    path.join(__dirname, '../../../configs/v1'),
    path.join(__dirname, '../../node_modules/@ncar/music-box/examples'),
];

const TIME_UNIT_SECONDS = {
    s: 1,
    sec: 1,
    min: 60,
    hr: 3600,
    hour: 3600,
    day: 86400,
};

function parseCsvToBlock(csvText) {
    const lines = csvText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

    if (lines.length === 0) {
        return { headers: [], rows: [] };
    }

    const headers = lines[0].split(',').map((header) => header.trim());
    const rows = lines.slice(1).map((line) =>
        line.split(',').map((value) => {
            const parsed = Number(value.trim());
            return Number.isNaN(parsed) ? 0 : parsed;
        })
    );

    return { headers, rows };
}

function extractTimeSeconds(options, key) {
    for (const [unit, multiplier] of Object.entries(TIME_UNIT_SECONDS)) {
        const optionKey = `${key} [${unit}]`;
        if (options[optionKey] !== undefined) {
            return Number(options[optionKey]) * multiplier;
        }
    }
    return null;
}

function blocksToRows(blocks) {
    const rows = [];

    for (const block of blocks) {
        const { headers = [], rows: blockRows = [] } = block;
        for (const values of blockRows) {
            const row = {};
            for (let i = 0; i < headers.length; i++) {
                row[headers[i]] = values[i];
            }
            rows.push(row);
        }
    }

    rows.sort((a, b) => {
        const ta = Number(a['time.s'] ?? 0);
        const tb = Number(b['time.s'] ?? 0);
        return ta - tb;
    });

    return rows;
}

function buildFrontendConditions(config, conditionBlocks) {
    const options = config['box model options'] || {};
    const chemTimeStep = extractTimeSeconds(options, 'chemistry time step') ?? 200;
    const outputTimeStep = extractTimeSeconds(options, 'output time step') ?? chemTimeStep;
    const simulationLength = extractTimeSeconds(options, 'simulation length') ?? 3600;

    const rows = blocksToRows(conditionBlocks);
    const firstRow = rows[0] || {};

    const initialTemperature = Number(firstRow['ENV.temperature.K'] ?? 298.15);
    const initialPressure = Number(firstRow['ENV.pressure.Pa'] ?? 101325);

    const initialConcentrations = {};
    const initialRateConstants = {};

    for (const [key, value] of Object.entries(firstRow)) {
        if (key.startsWith('CONC.')) {
            const match = key.match(/^CONC\.([^.]*)\./);
            if (match && match[1]) {
                initialConcentrations[match[1]] = Number(value);
            }
        }

        if (key.startsWith('PHOTO.') || key.startsWith('USER.')) {
            const normalizedKey = key.replace(/\.[^.]+$/, '');
            initialRateConstants[normalizedKey] = Number(value);
        }
    }

    const evolvingTimes = [];
    const evolvingTemperatures = [];
    const evolvingPressures = [];

    for (const row of rows) {
        if (row['time.s'] === undefined) {
            continue;
        }

        if (row['ENV.temperature.K'] === undefined && row['ENV.pressure.Pa'] === undefined) {
            continue;
        }

        evolvingTimes.push(Number(row['time.s']));
        evolvingTemperatures.push(Number(row['ENV.temperature.K'] ?? initialTemperature));
        evolvingPressures.push(Number(row['ENV.pressure.Pa'] ?? initialPressure));
    }

    const outputFrequency = Math.max(1, Math.round(outputTimeStep / chemTimeStep));
    const hasEvolvingSeries = evolvingTimes.length > 1;

    return {
        basic: {
            duration: simulationLength,
            timeStep: chemTimeStep,
            outputFrequency,
        },
        initial: {
            temperature: initialTemperature,
            pressure: initialPressure,
            concentrations: initialConcentrations,
        },
        evolving: {
            enabled: hasEvolvingSeries,
            times: hasEvolvingSeries ? evolvingTimes : [],
            temperature: hasEvolvingSeries ? evolvingTemperatures : [],
            pressure: hasEvolvingSeries ? evolvingPressures : [],
            interpolationMethod: 'linear',
            rateConstants: {},
        },
        rateConstants: initialRateConstants,
    };
}

function resolveExampleFile(example) {
    const candidateRelPaths = [example.file, ...(example.fallbackFiles || [])];

    for (const basePath of EXAMPLES_BASE_PATHS) {
        for (const relPath of candidateRelPaths) {
            const fullPath = path.join(basePath, relPath);
            if (fs.existsSync(fullPath)) {
                return fullPath;
            }
        }
    }

    return null;
}

function loadConditionBlocks(config, configDir) {
    const inlineBlocks = config?.conditions?.data || [];
    if (inlineBlocks.length > 0) {
        return inlineBlocks;
    }

    const filepaths = config?.conditions?.filepaths || [];
    if (filepaths.length === 0) {
        return [];
    }

    return filepaths.map((relativePath) => {
        const csvPath = path.resolve(configDir, relativePath);
        if (!fs.existsSync(csvPath)) {
            throw new Error(`Condition CSV not found: ${relativePath}`);
        }
        const csvText = fs.readFileSync(csvPath, 'utf8');
        return parseCsvToBlock(csvText);
    });
}

// Available examples metadata
// NOTE: Only v1 format mechanisms are supported
// Examples are now loaded from configs/v1/<mechanism>/example.json
const EXAMPLES = {
    chapman: {
        id: 'chapman',
        name: 'Chapman Mechanism',
        description: 'Stratospheric oxygen chemistry with photolysis',
        mechanism: 'chapman',
        file: 'chapman/example.json',
        fallbackFiles: ['chapman/my_config.json'],
    },
    chapman_evolving: {
        id: 'chapman_evolving',
        name: 'Chapman with Evolving Conditions',
        description: 'Chapman mechanism with time-varying temperature (6 hour day-night cycle)',
        mechanism: 'chapman',
        file: 'chapman/example_evolving.json',
    },
    ts1: {
        id: 'ts1',
        name: 'TS1 Mechanism',
        description: '209 species tropospheric mechanism',
        mechanism: 'ts1',
        file: 'ts1/example.json',
        fallbackFiles: ['ts1/my_config.json'],
    },
    ts1_evolving: {
        id: 'ts1_evolving',
        name: 'TS1 with Diurnal Variation',
        description: 'TS1 with realistic 24-hour temperature and pressure changes',
        mechanism: 'ts1',
        file: 'ts1/example_evolving.json',
    },
    full_configuration: {
        id: 'full_configuration',
        name: 'Full Configuration Test',
        description: 'Comprehensive test with all reaction types (ARRHENIUS, TROE, PHOTOLYSIS, SURFACE, etc.)',
        mechanism: 'full_configuration',
        file: 'full_configuration/example.json',
    },
    /* DISABLED: No v1 version available
    analytical: {
        id: 'analytical',
        name: 'Analytical Mechanism',
        description: 'Simple 3-species test mechanism (A→B→C)',
        mechanism: 'analytical',
        file: 'analytical/example.json',
    },
    */
};

// GET /api/examples - List all available examples
router.get('/', (req, res) => {
    try {
        const examplesList = Object.values(EXAMPLES).map(ex => ({
            id: ex.id,
            name: ex.name,
            description: ex.description,
            mechanism: ex.mechanism,
        }));

        res.json({
            success: true,
            examples: examplesList,
        });
    } catch (error) {
        console.error('Error listing examples:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to list examples',
            message: error.message,
        });
    }
});

// GET /api/examples/:id - Load specific example configuration
router.get('/:id', (req, res) => {
    try {
        const { id } = req.params;
        const example = EXAMPLES[id];

        if (!example) {
            return res.status(404).json({
                success: false,
                error: 'Example not found',
                message: `No example found with id: ${id}`,
            });
        }

        const examplePath = resolveExampleFile(example);

        if (!examplePath) {
            return res.status(404).json({
                success: false,
                error: 'Example file not found',
                message: `Example file does not exist for: ${example.file}`,
            });
        }

        const exampleData = JSON.parse(fs.readFileSync(examplePath, 'utf8'));
        const configDir = path.dirname(examplePath);
        const conditionBlocks = loadConditionBlocks(exampleData, configDir);
        const frontendConditions = buildFrontendConditions(exampleData, conditionBlocks);

        const responseExample = {
            ...exampleData,
            mechanism: example.mechanism,
            name: exampleData.name || example.name,
            description: exampleData.description || example.description,
            conditions: frontendConditions,
            rawConditions: {
                ...(exampleData.conditions || {}),
                data: conditionBlocks,
            },
            solverConfig: {
                ...exampleData,
                conditions: {
                    ...(exampleData.conditions || {}),
                    data: conditionBlocks,
                },
            },
        };

        res.json({
            success: true,
            example: responseExample,
        });
    } catch (error) {
        console.error('Error loading example:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load example',
            message: error.message,
        });
    }
});

export default router;
