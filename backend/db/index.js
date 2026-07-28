const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'nesiatv',
  waitForConnections: true,
  connectionLimit: 30,
  queueLimit: 100,
  connectTimeout: 10000,
};

const db = mysql.createPool(dbConfig);

// Auto-migration helper for requires_login columns
(async () => {
  try {
    const [animeCols] = await db.execute("SHOW COLUMNS FROM `anime` LIKE 'requires_login'");
    if (animeCols.length === 0) {
      await db.execute("ALTER TABLE `anime` ADD COLUMN `requires_login` TINYINT(1) NOT NULL DEFAULT 0");
      console.log('Migration: Added requires_login column to anime table.');
    }
    const [epCols] = await db.execute("SHOW COLUMNS FROM `episodes` LIKE 'requires_login'");
    if (epCols.length === 0) {
      await db.execute("ALTER TABLE `episodes` ADD COLUMN `requires_login` TINYINT(1) NOT NULL DEFAULT 0");
      console.log('Migration: Added requires_login column to episodes table.');
    }
  } catch (err) {
    console.warn('Auto-migration notice:', err.message);
  }
})();

module.exports = db;


