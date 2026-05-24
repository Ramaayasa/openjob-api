exports.up = (pgm) => {
    pgm.createTable('authentications', {
        id: { type: 'VARCHAR(36)', primaryKey: true },
        user_id: { type: 'VARCHAR(36)', notNull: true, references: '"users"', onDelete: 'CASCADE' },
        refresh_token: { type: 'TEXT', notNull: true },
        created_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('NOW()') },
    });
};

exports.down = (pgm) => {
    pgm.dropTable('authentications');
};