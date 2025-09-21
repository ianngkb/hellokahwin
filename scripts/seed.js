const sqlite3 = require('../backend/node_modules/sqlite3').verbose();
const fs = require('fs');
const path = require('path');

class DatabaseSeeder {
    constructor(dbPath) {
        this.dbPath = dbPath;
        this.db = new sqlite3.Database(dbPath);
    }

    async seedDevelopmentData() {
        const seedPath = path.join(__dirname, '..', 'database', 'seeds', 'development.sql');
        const sql = fs.readFileSync(seedPath, 'utf8');

        return new Promise((resolve, reject) => {
            this.db.exec(sql, (err) => {
                if (err) {
                    console.error('Error seeding development data:', err);
                    reject(err);
                } else {
                    console.log('✓ Development data seeded successfully');
                    resolve();
                }
            });
        });
    }

    close() {
        this.db.close();
    }
}

// Run seeding if called directly
if (require.main === module) {
    const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'data', 'hellokahwin.db');
    const seeder = new DatabaseSeeder(dbPath);

    seeder.seedDevelopmentData()
        .then(() => {
            seeder.close();
            console.log('Database seeding completed!');
            process.exit(0);
        })
        .catch(error => {
            seeder.close();
            process.exit(1);
        });
}

module.exports = DatabaseSeeder;