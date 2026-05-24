exports.up = (pgm) => {
    pgm.createTable('companies', {
        id: { type: 'VARCHAR(36)', primaryKey: true },
        name: { type: 'VARCHAR(255)', notNull: true },
        location: { type: 'VARCHAR(255)', notNull: true },
        description: { type: 'TEXT' },
        website: { type: 'VARCHAR(500)' },
        logo_url: { type: 'VARCHAR(500)' },
        created_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('NOW()') },
        updated_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('NOW()') },
    });
};

exports.down = (pgm) => {
    pgm.dropTable('companies');
};