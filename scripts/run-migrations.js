const fs = require('fs');
const path = require('path');
const { initializeDatabase, run, get } = require('../backend/config/database');

async function runMigrations() {
    try {
        console.log('Initializing database...');
        await initializeDatabase();

        // Create migrations table if it doesn't exist
        await run(`
            CREATE TABLE IF NOT EXISTS migrations (
                version TEXT PRIMARY KEY,
                applied_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);

        const migrationsDir = path.join(__dirname, '..', 'database');
        const migrationFiles = fs.readdirSync(migrationsDir)
            .filter(file => file.endsWith('.sql'))
            .sort();

        console.log(`Found ${migrationFiles.length} migration files`);

        for (const file of migrationFiles) {
            const version = path.parse(file).name;

            // Check if migration already applied
            const applied = await get(
                'SELECT version FROM migrations WHERE version = ?',
                [version]
            );

            if (applied) {
                console.log(`Migration ${version} already applied, skipping...`);
                continue;
            }

            console.log(`Applying migration ${version}...`);

            const migrationPath = path.join(migrationsDir, file);
            const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

            // Split by semicolon and execute each statement
            const statements = migrationSQL
                .split(';')
                .map(stmt => stmt.trim())
                .filter(stmt => stmt.length > 0);

            for (const statement of statements) {
                try {
                    await run(statement);
                } catch (error) {
                    console.error(`Error executing statement: ${statement}`);
                    throw error;
                }
            }

            // Mark migration as applied
            await run(
                'INSERT INTO migrations (version) VALUES (?)',
                [version]
            );

            console.log(`Migration ${version} applied successfully`);
        }

        console.log('All migrations completed successfully!');

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    runMigrations().then(() => {
        console.log('Migration process completed');
        process.exit(0);
    });
}

module.exports = { runMigrations };