exports.up = (pgm) => {
    pgm.createTable('categories', {
        id: { type: 'VARCHAR(36)', primaryKey: true },
        name: { type: 'VARCHAR(255)', notNull: true },
        created_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('NOW()') },
        updated_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('NOW()') },
    });
};

exports.down = (pgm) => {
    pgm.dropTable('categories');
};