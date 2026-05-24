exports.up = (pgm) => {
    pgm.createTable('applications', {
        id: { type: 'VARCHAR(36)', primaryKey: true },
        user_id: { type: 'VARCHAR(36)', notNull: true, references: '"users"', onDelete: 'CASCADE' },
        job_id: { type: 'VARCHAR(36)', notNull: true, references: '"jobs"', onDelete: 'CASCADE' },
        status: { type: 'VARCHAR(50)', notNull: true, default: 'pending' },
        cover_letter: { type: 'TEXT' },
        created_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('NOW()') },
        updated_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('NOW()') },
    });

    pgm.createIndex('applications', 'user_id');
    pgm.createIndex('applications', 'job_id');
};

exports.down = (pgm) => {
    pgm.dropTable('applications');
};