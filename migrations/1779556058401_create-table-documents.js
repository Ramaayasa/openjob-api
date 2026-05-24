exports.up = (pgm) => {
    pgm.createTable('documents', {
        id: { type: 'VARCHAR(36)', primaryKey: true },
        user_id: { type: 'VARCHAR(36)', notNull: true, references: '"users"', onDelete: 'CASCADE' },
        original_name: { type: 'VARCHAR(500)', notNull: true },
        file_name: { type: 'VARCHAR(500)', notNull: true },
        file_size: { type: 'INTEGER' },
        mime_type: { type: 'VARCHAR(100)' },
        created_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('NOW()') },
    });
};

exports.down = (pgm) => {
    pgm.dropTable('documents');
};