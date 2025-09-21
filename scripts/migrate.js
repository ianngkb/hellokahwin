const sqlite3 = require('../backend/node_modules/sqlite3').verbose();
const fs = require('fs');
const path = require('path');

class DatabaseMigrator {
    constructor(dbPath) {
        this.dbPath = dbPath;
        this.db = new sqlite3.Database(dbPath);
    }

    async initialize() {
        return new Promise((resolve, reject) => {
            // Create migrations table if it doesn't exist
            const createMigrationsTable = `
                CREATE TABLE IF NOT EXISTS migrations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    version TEXT UNIQUE NOT NULL,
                    filename TEXT NOT NULL,
                    applied_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    checksum TEXT
                )
            `;

            this.db.run(createMigrationsTable, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    async getAppliedMigrations() {
        return new Promise((resolve, reject) => {
            this.db.all("SELECT version FROM migrations ORDER BY version", (err, rows) => {
                if (err) reject(err);
                else resolve(rows.map(row => row.version));
            });
        });
    }

    async runMigration(filename) {
        const migrationPath = path.join(__dirname, '..', 'database', filename);
        const sql = fs.readFileSync(migrationPath, 'utf8');

        return new Promise((resolve, reject) => {
            this.db.exec(sql, (err) => {
                if (err) {
                    console.error(`Error running migration ${filename}:`, err);
                    reject(err);
                } else {
                    // Record migration in migrations table
                    const version = filename.split('_')[0];
                    const insertMigration = `
                        INSERT INTO migrations (version, filename)
                        VALUES (?, ?)
                    `;

                    this.db.run(insertMigration, [version, filename], (err) => {
                        if (err) reject(err);
                        else {
                            console.log(`✓ Applied migration: ${filename}`);
                            resolve();
                        }
                    });
                }
            });
        });
    }

    async migrate() {
        try {
            await this.initialize();

            const appliedMigrations = await this.getAppliedMigrations();
            const migrationFiles = fs.readdirSync(path.join(__dirname, '..', 'database'))
                .filter(file => file.endsWith('.sql') && file.match(/^\d+_/))
                .sort();

            console.log('Starting database migration...');

            for (const filename of migrationFiles) {
                const version = filename.split('_')[0];

                if (!appliedMigrations.includes(version)) {
                    await this.runMigration(filename);
                } else {
                    console.log(`- Skipping already applied migration: ${filename}`);
                }
            }

            console.log('Database migration completed successfully!');
        } catch (error) {
            console.error('Migration failed:', error);
            throw error;
        }
    }

    close() {
        this.db.close();
    }
}

// Run migrations if called directly
if (require.main === module) {
    const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'data', 'hellokahwin.db');

    // Ensure data directory exists
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    const migrator = new DatabaseMigrator(dbPath);

    migrator.migrate()
        .then(() => {
            migrator.close();
            process.exit(0);
        })
        .catch(error => {
            migrator.close();
            process.exit(1);
        });
}

module.exports = DatabaseMigrator;