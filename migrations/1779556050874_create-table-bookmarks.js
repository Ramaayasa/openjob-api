exports.up = (pgm) => {
    pgm.createTable('bookmarks', {
        id: { type: 'VARCHAR(36)', primaryKey: true },
        user_id: { type: 'VARCHAR(36)', notNull: true, references: '"users"', onDelete: 'CASCADE' },
        job_id: { type: 'VARCHAR(36)', notNull: true, references: '"jobs"', onDelete: 'CASCADE' },
        created_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('NOW()') },
    });

    pgm.createIndex('bookmarks', ['user_id', 'job_id'], { unique: true });
};

exports.down = (pgm) => {
    pgm.dropTable('bookmarks');
};