const { initializeDatabase, run, get } = require('../backend/config/database');

async function addTranslationTables() {
    try {
        console.log('Initializing database...');
        await initializeDatabase();

        console.log('Adding source_language column to translation_jobs...');
        try {
            await run('ALTER TABLE translation_jobs ADD COLUMN source_language TEXT NOT NULL DEFAULT \'en\'');
            console.log('✓ Added source_language column');
        } catch (error) {
            if (error.message.includes('duplicate column name')) {
                console.log('✓ source_language column already exists');
            } else {
                throw error;
            }
        }

        console.log('Creating translation_errors table...');
        await run(`
            CREATE TABLE IF NOT EXISTS translation_errors (
                id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
                translation_job_id TEXT NOT NULL,
                post_id TEXT NOT NULL,
                error_message TEXT NOT NULL,
                error_code TEXT,
                retry_count INTEGER DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (translation_job_id) REFERENCES translation_jobs(id) ON DELETE CASCADE,
                FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
            )
        `);
        console.log('✓ Created translation_errors table');

        console.log('Creating performance indexes...');

        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_posts_source_site_post ON posts(source_site_id, source_post_id)',
            'CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status)',
            'CREATE INDEX IF NOT EXISTS idx_post_translations_post_lang ON post_translations(post_id, target_language)',
            'CREATE INDEX IF NOT EXISTS idx_translation_jobs_status ON translation_jobs(status)',
            'CREATE INDEX IF NOT EXISTS idx_translation_errors_job ON translation_errors(translation_job_id)'
        ];

        for (const indexSQL of indexes) {
            await run(indexSQL);
        }
        console.log('✓ Created all indexes');

        console.log('All translation tables and indexes added successfully!');

    } catch (error) {
        console.error('Failed to add translation tables:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    addTranslationTables().then(() => {
        console.log('Database update completed');
        process.exit(0);
    });
}

module.exports = { addTranslationTables };